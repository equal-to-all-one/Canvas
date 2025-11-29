<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Graphics, Sprite, Texture, ColorMatrixFilter, BlurFilter, Filter, Assets, Container, Text, TextStyle } from 'pixi.js';
import { useCanvasRenderer } from '@/composables/useCanvasRenderer';
import { useCanvasStore } from '@/stores/canvasStore';
import { screenToWorld, worldToScreen } from '@/utils/coordinates';
import TextEditor from './TextEditor.vue';
import type { TextElement, TextSpan } from '@/types/element';

const canvasContainer = ref<HTMLDivElement | null>(null);
const canvasStore = useCanvasStore();

// Initialize the PixiJS renderer
const { app } = useCanvasRenderer(canvasContainer);

// Panning state
const isPanning = ref(false);
const lastPanPoint = ref({ x: 0, y: 0 });

// Dragging state
const isDraggingElement = ref(false);
const draggedElementId = ref<string | null>(null);
const dragStartWorldPointOffset = ref({ x: 0, y: 0 });

// Creation state
const isCreating = ref(false);
const creationStartPoint = ref({ x: 0, y: 0 });
let ghostGraphic: Graphics | null = null;

// Click state for double-click detection
const lastClickMap = new Map<string, number>();

// Text Editing state
const isEditingText = ref(false);
const editingElementId = ref<string | null>(null);
const editingElement = ref<TextElement | null>(null);
const editorPosition = ref({ top: 0, left: 0, width: 0, height: 0, fontSize: 16, fontFamily: 'Arial', color: '#000000' });

// Watch active tool to update cursor
watch(
  () => canvasStore.activeTool,
  (newTool) => {
    if (!app.value) return;
    if (['rectangle', 'circle', 'rounded-rectangle', 'triangle'].includes(newTool)) {
      app.value.canvas.style.cursor = 'crosshair';
    } else {
      app.value.canvas.style.cursor = 'default';
    }
  }
);

const renderElements = () => {
  if (!app.value) return;

  // Clear the stage
  app.value.stage.removeChildren();
  
  // Add a transparent hit area for the stage to handle background clicks if needed
  // But for now, we handle background clicks in the DOM handler with isDraggingElement check.
  // To make sure Pixi events fire before DOM events, we rely on standard event propagation.
  // Pixi attaches listeners to the canvas.
  
  // Ensure stage is interactive for hit testing if we wanted to use stage.on('pointerdown')
  app.value.stage.eventMode = 'static';
  app.value.stage.hitArea = app.value.screen; // Make the whole screen interactive

  // Handle stage pointer down for creation
  app.value.stage.off('pointerdown'); // Remove previous listeners to avoid duplicates if re-rendering
  app.value.stage.on('pointerdown', (e) => {
    if (['rectangle', 'circle', 'rounded-rectangle', 'triangle'].includes(canvasStore.activeTool)) {
      e.stopPropagation();
      isCreating.value = true;
      
      if (app.value) {
        const worldPos = screenToWorld({ x: e.global.x, y: e.global.y }, app.value.stage);
        creationStartPoint.value = worldPos;

        ghostGraphic = new Graphics();
        app.value.stage.addChild(ghostGraphic);
      }
      return;
    }
  });

  // Re-draw all elements
  canvasStore.elements.forEach((element) => {
    // Skip rendering if this element is currently being edited
    if (element.id === editingElementId.value) return;

    let displayObject: Graphics | Sprite | Container;

    if (element.type === 'image') {
      if (!element.src) return;

      // Check if asset is loaded
      if (!Assets.cache.has(element.src)) {
        console.log(`[DEBUG] Asset not in cache, loading: ${element.src.substring(0, 30)}...`);
        Assets.load(element.src).then(() => {
            console.log("[DEBUG] Asset loaded, triggering re-render");
            renderElements();
        }).catch(err => console.error("Failed to load texture:", err));
        return; // Skip rendering this frame
      }

      const texture = Texture.from(element.src);
      const sprite = new Sprite(texture);
      
      // console.log(`[DEBUG] Rendering image. Width: ${texture.width}`);

      sprite.position.set(element.x, element.y);
      sprite.rotation = element.rotation;

      // Since we ensure asset is loaded, texture should have correct dimensions
      sprite.width = element.width;
      sprite.height = element.height;

      // Apply filters
      const pixiFilters: Filter[] = [];
      
      if (element.filters.brightness !== 1 || element.filters.grayscale) {
        const colorMatrix = new ColorMatrixFilter();
        if (element.filters.brightness !== 1) {
          colorMatrix.brightness(element.filters.brightness, false);
        }
        if (element.filters.grayscale) {
          colorMatrix.grayscale(1, false);
        }
        pixiFilters.push(colorMatrix);
      }

      if (element.filters.blur > 0) {
        const blurFilter = new BlurFilter();
        blurFilter.blur = element.filters.blur;
        pixiFilters.push(blurFilter);
      }

      sprite.filters = pixiFilters;
      displayObject = sprite;
    } else if (element.type === 'text') {
      const container = new Container();
      container.position.set(element.x, element.y);
      container.rotation = element.rotation;

      // Background
      const bgGraphics = new Graphics();
      container.addChild(bgGraphics);

      let currentX = 0;
      let maxHeight = 0;

      element.content.forEach((span) => {
        const style = new TextStyle({
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fill: element.color,
          fontWeight: span.bold ? 'bold' : 'normal',
          fontStyle: span.italic ? 'italic' : 'normal',
          lineHeight: element.fontSize * 1.4, // Match editor line-height
        });

        const textObject = new Text({ text: span.text, style });
        textObject.x = currentX;
        container.addChild(textObject);

        // Underline / Strikethrough
        if (span.underline || span.strikethrough) {
          const line = new Graphics();
          const lineColor = element.color; 
          
          if (span.underline) {
             line.moveTo(currentX, textObject.height);
             line.lineTo(currentX + textObject.width, textObject.height);
             line.stroke({ width: 2, color: lineColor });
          }
          
          if (span.strikethrough) {
             line.moveTo(currentX, textObject.height / 2);
             line.lineTo(currentX + textObject.width, textObject.height / 2);
             line.stroke({ width: 2, color: lineColor });
          }
          container.addChild(line);
        }

        currentX += textObject.width;
        maxHeight = Math.max(maxHeight, textObject.height);
      });

      // Draw background if needed
      if (element.backgroundColor !== 'transparent') {
        bgGraphics.rect(0, 0, currentX, maxHeight);
        bgGraphics.fill({ color: element.backgroundColor });
        container.setChildIndex(bgGraphics, 0);
      }

      // Update element dimensions in store if changed
      if (Math.abs(element.width - currentX) > 1 || Math.abs(element.height - maxHeight) > 1) {
         setTimeout(() => {
             canvasStore.updateTextElement(element.id, { width: currentX, height: maxHeight });
         }, 0);
      }

      // Selection highlight
      if (element.isSelected) {
        const highlight = new Graphics();
        highlight.rect(0, 0, currentX, maxHeight);
        highlight.stroke({ width: 2, color: '#00FFFF' });
        container.addChild(highlight);
      }

      displayObject = container;
    } else {
      const graphics = new Graphics();
      
      // Set transform
      // Note: In PixiJS, it's often better to draw at (0,0) and move the graphics object
      graphics.position.set(element.x, element.y);
      graphics.rotation = element.rotation;

      // Draw shape based on type
      if (element.type === 'rectangle') {
        graphics.rect(0, 0, element.width, element.height);
        graphics.fill({ color: element.fillColor, alpha: element.opacity });
      } else if (element.type === 'circle') {
        // Draw circle centered in the bounding box
        const radius = element.width / 2;
        graphics.circle(radius, radius, radius);
        graphics.fill({ color: element.fillColor, alpha: element.opacity });
      } else if (element.type === 'rounded-rectangle') {
        graphics.roundRect(0, 0, element.width, element.height, element.borderRadius);
        graphics.fill({ color: element.fillColor, alpha: element.opacity });
      } else if (element.type === 'triangle') {
        // Draw triangle
        // Top center, Bottom left, Bottom right
        const p1 = { x: element.width / 2, y: 0 };
        const p2 = { x: 0, y: element.height };
        const p3 = { x: element.width, y: element.height };
        
        graphics.poly([p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]);
        graphics.fill({ color: element.fillColor, alpha: element.opacity });
      }
        
      // Selection highlight
      if (element.isSelected) {
        graphics.stroke({ width: 4, color: '#00FFFF' }); // Cyan highlight
      } else {
        graphics.stroke({ width: element.strokeWidth, color: element.strokeColor });
      }
      displayObject = graphics;
    }

    // Make interactive
    displayObject.eventMode = 'static'; // Replaces interactive = true in v7/v8
    displayObject.cursor = 'pointer';
      
    displayObject.on('pointerdown', (e) => {
      if (['rectangle', 'circle', 'rounded-rectangle', 'triangle'].includes(canvasStore.activeTool)) return; // Do not select when creating

      e.stopPropagation(); // Prevent stage pan
      
      // Double click detection for text
      const now = Date.now();
      const lastClickTime = lastClickMap.get(element.id) || 0;
      
      if (element.type === 'text' && now - lastClickTime < 300) {
          // Stop DOM propagation to prevent the canvas container from receiving the click
          // and potentially deselecting or stealing focus.
          if (e.originalEvent) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
          }

          if (app.value) {
              const screenPos = worldToScreen({ x: element.x, y: element.y }, app.value.stage);
              const scale = app.value.stage.scale.x;
              
              editingElementId.value = element.id;
              editingElement.value = element as TextElement;
              editorPosition.value = {
                  top: screenPos.y,
                  left: screenPos.x,
                  width: element.width * scale,
                  height: element.height * scale,
                  fontSize: (element as TextElement).fontSize * scale,
                  fontFamily: (element as TextElement).fontFamily,
                  color: (element as TextElement).color
              };
              isEditingText.value = true;
          }
          // Reset click time to prevent triple-click triggering again immediately
          lastClickMap.set(element.id, 0);
          return;
      }
      lastClickMap.set(element.id, now);
        
      // Select element
      canvasStore.selectElement(element.id);
        
      // Start dragging
      if (app.value) {
        isDraggingElement.value = true;
        draggedElementId.value = element.id;
          
        const worldPos = screenToWorld({ x: e.global.x, y: e.global.y }, app.value.stage);
        dragStartWorldPointOffset.value = {
          x: worldPos.x - element.x,
          y: worldPos.y - element.y
        };
      }
    });

    app.value?.stage.addChild(displayObject);
  });
};

// Watch for changes in elements
watch(
  () => canvasStore.elements,
  () => {
    renderElements();
  },
  { deep: true }
);

// Watch editing state to hide/show the underlying Pixi element
watch(
  () => editingElementId.value,
  () => {
    renderElements();
  }
);

// Also watch for app initialization to render initial state
watch(
  () => app.value,
  (newApp) => {
    if (newApp) {
      renderElements();
    }
  }
);

const addRandomRect = () => {
  const x = Math.random() * (window.innerWidth - 100);
  const y = Math.random() * (window.innerHeight - 100);
  const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

  canvasStore.addElement({
    type: 'rectangle',
    x,
    y,
    width: 100 + Math.random() * 100,
    height: 80 + Math.random() * 80,
    rotation: 0,
    fillColor: color,
    strokeColor: '#ffffff',
    strokeWidth: 2,
    opacity: 1,
    isSelected: false,
  });
};

const handleWheel = (event: WheelEvent) => {
  if (!app.value) return;
  event.preventDefault();

  const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
  let newScale = app.value.stage.scale.x * scaleFactor;

  // Clamp scale
  newScale = Math.max(0.1, Math.min(newScale, 5));

  // Calculate the world position of the mouse before scaling
  const worldPos = screenToWorld({ x: event.clientX, y: event.clientY }, app.value.stage);

  // Update scale
  app.value.stage.scale.set(newScale);

  // Adjust position to keep the world point under the mouse
  const newStageX = event.clientX - worldPos.x * newScale;
  const newStageY = event.clientY - worldPos.y * newScale;

  app.value.stage.position.set(newStageX, newStageY);

  // Sync to store
  canvasStore.setZoom(newScale);
  canvasStore.setPan({ x: newStageX, y: newStageY });
};

const handlePointerDown = (event: PointerEvent) => {
  if (event.button === 1) { // Middle mouse button
    isPanning.value = true;
    lastPanPoint.value = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  } else if (event.button === 0) {
    // If we are editing text, clicking outside should close the editor (handled by TextEditor blur)
    // But we also want to deselect if we click on empty space.
    // If we just entered edit mode (isEditingText is true), we should NOT deselect.
    if (isEditingText.value) return;

    if (app.value) {
       // If we are NOT dragging an element (which means we didn't hit an element), deselect.
       // Note: Pixi event handlers run before this DOM handler.
       // If an element was clicked, isDraggingElement would be true.
       if (!isDraggingElement.value) {
         canvasStore.deselectAllElements();
       }
    }
  }
};

const handlePointerMove = (event: PointerEvent) => {
  if (isCreating.value && app.value && ghostGraphic) {
    const currentWorldPoint = screenToWorld({ x: event.clientX, y: event.clientY }, app.value.stage);
    
    const rectX = Math.min(creationStartPoint.value.x, currentWorldPoint.x);
    const rectY = Math.min(creationStartPoint.value.y, currentWorldPoint.y);
    const rectW = Math.abs(currentWorldPoint.x - creationStartPoint.value.x);
    const rectH = Math.abs(currentWorldPoint.y - creationStartPoint.value.y);

    ghostGraphic.clear();
    
    if (canvasStore.activeTool === 'rectangle') {
      ghostGraphic.rect(rectX, rectY, rectW, rectH);
    } else if (canvasStore.activeTool === 'circle') {
      // Force circle to fit in the dragged area (using max dimension for diameter)
      const diameter = Math.max(rectW, rectH);
      // Draw circle centered in the bounding box defined by rectX, rectY and diameter
      // Note: We are drawing a circle with top-left at rectX, rectY
      const radius = diameter / 2;
      ghostGraphic.circle(rectX + radius, rectY + radius, radius);
    } else if (canvasStore.activeTool === 'rounded-rectangle') {
      ghostGraphic.roundRect(rectX, rectY, rectW, rectH, 10); // Default radius 10
    } else if (canvasStore.activeTool === 'triangle') {
      // Draw triangle
      // Top center, Bottom left, Bottom right
      // Coordinates are relative to the bounding box top-left (rectX, rectY)
      const p1 = { x: rectX + rectW / 2, y: rectY };
      const p2 = { x: rectX, y: rectY + rectH };
      const p3 = { x: rectX + rectW, y: rectY + rectH };
      
      ghostGraphic.poly([p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]);
    }

    ghostGraphic.fill({ color: 0x0000FF, alpha: 0.1 });
    ghostGraphic.stroke({ width: 1, color: 0x0000FF, alpha: 0.5 });

  } else if (isPanning.value && app.value) {
    const dx = event.clientX - lastPanPoint.value.x;
    const dy = event.clientY - lastPanPoint.value.y;

    app.value.stage.position.x += dx;
    app.value.stage.position.y += dy;

    lastPanPoint.value = { x: event.clientX, y: event.clientY };

    // Sync to store
    canvasStore.setPan({ x: app.value.stage.position.x, y: app.value.stage.position.y });
  } else if (isDraggingElement.value && draggedElementId.value && app.value) {
    const worldPos = screenToWorld({ x: event.clientX, y: event.clientY }, app.value.stage);
    
    const newX = worldPos.x - dragStartWorldPointOffset.value.x;
    const newY = worldPos.y - dragStartWorldPointOffset.value.y;
    
    canvasStore.updateElementTransform(draggedElementId.value, { x: newX, y: newY });
  }
};

const handlePointerUp = (event: PointerEvent) => {
  if (isCreating.value && app.value && ghostGraphic) {
    isCreating.value = false;
    
    const currentWorldPoint = screenToWorld({ x: event.clientX, y: event.clientY }, app.value.stage);
    
    const rectX = Math.min(creationStartPoint.value.x, currentWorldPoint.x);
    const rectY = Math.min(creationStartPoint.value.y, currentWorldPoint.y);
    const rectW = Math.abs(currentWorldPoint.x - creationStartPoint.value.x);
    const rectH = Math.abs(currentWorldPoint.y - creationStartPoint.value.y);

    if (rectW > 5 && rectH > 5) {
      if (canvasStore.activeTool === 'rectangle') {
        canvasStore.addElement({
          type: 'rectangle',
          x: rectX,
          y: rectY,
          width: rectW,
          height: rectH,
          rotation: 0,
          fillColor: '#0000FF', // Default blue for new rects
          strokeColor: '#000000',
          strokeWidth: 2,
          opacity: 1,
          isSelected: false,
        });
      } else if (canvasStore.activeTool === 'circle') {
        const diameter = Math.max(rectW, rectH);
        canvasStore.addElement({
          type: 'circle',
          x: rectX,
          y: rectY,
          width: diameter,
          height: diameter,
          rotation: 0,
          fillColor: '#00FF00', // Default green for new circles
          strokeColor: '#000000',
          strokeWidth: 2,
          opacity: 1,
          isSelected: false,
        });
      } else if (canvasStore.activeTool === 'rounded-rectangle') {
        canvasStore.addElement({
          type: 'rounded-rectangle',
          x: rectX,
          y: rectY,
          width: rectW,
          height: rectH,
          rotation: 0,
          fillColor: '#FFA500', // Orange
          strokeColor: '#000000',
          strokeWidth: 2,
          opacity: 1,
          borderRadius: 10,
          isSelected: false,
        });
      } else if (canvasStore.activeTool === 'triangle') {
        canvasStore.addElement({
          type: 'triangle',
          x: rectX,
          y: rectY,
          width: rectW,
          height: rectH,
          rotation: 0,
          fillColor: '#800080', // Purple
          strokeColor: '#000000',
          strokeWidth: 2,
          opacity: 1,
          isSelected: false,
        });
      }
    }

    app.value.stage.removeChild(ghostGraphic);
    ghostGraphic.destroy();
    ghostGraphic = null;
    
    canvasStore.setActiveTool('select');
  }

  isPanning.value = false;
  isDraggingElement.value = false;
  draggedElementId.value = null;
};

const handleTextUpdate = (content: TextSpan[]) => {
  if (editingElementId.value) {
    // Check if content is empty
    const isEmpty = content.every(span => span.text.trim() === '');
    
    if (isEmpty) {
      canvasStore.removeElement(editingElementId.value);
    } else {
      canvasStore.updateTextElement(editingElementId.value, { content });
    }
    
    isEditingText.value = false;
    editingElementId.value = null;
    editingElement.value = null;
  }
};
</script>

<template>
  <div class="board-wrapper">
    <div class="toolbar">
      <button @click="addRandomRect">Add Random Rect</button>
    </div>
    <div 
      ref="canvasContainer" 
      class="canvas-board"
      @wheel="handleWheel"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
    ></div>
    
    <TextEditor
      v-if="isEditingText && editingElement"
      :visible="isEditingText"
      :element="editingElement"
      :position="editorPosition"
      @update="handleTextUpdate"
      @close="isEditingText = false"
    />
  </div>
</template>

<style scoped>
.board-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px;
  border-radius: 8px;
}

.canvas-board {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1a1a1a;
}
</style>
