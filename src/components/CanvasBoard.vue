<script setup lang="ts">
import { ref, watch } from 'vue';
import { Graphics } from 'pixi.js';
import { useCanvasRenderer } from '@/composables/useCanvasRenderer';
import { useCanvasStore } from '@/stores/canvasStore';
import { screenToWorld } from '@/utils/coordinates';

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

  // Re-draw all elements
  canvasStore.elements.forEach((element) => {
    if (element.type === 'rectangle') {
      const graphics = new Graphics();
      
      // Set transform
      // Note: In PixiJS, it's often better to draw at (0,0) and move the graphics object
      graphics.position.set(element.x, element.y);
      graphics.rotation = element.rotation;

      // Draw rect
      // PixiJS v8 syntax: rect -> fill -> stroke
      graphics.rect(0, 0, element.width, element.height);
      graphics.fill({ color: element.fillColor, alpha: element.opacity });
      
      // Selection highlight
      if (element.isSelected) {
        graphics.stroke({ width: 4, color: '#00FFFF' }); // Cyan highlight
      } else {
        graphics.stroke({ width: element.strokeWidth, color: element.strokeColor });
      }

      // Make interactive
      graphics.eventMode = 'static'; // Replaces interactive = true in v7/v8
      graphics.cursor = 'pointer';
      
      graphics.on('pointerdown', (e) => {
        e.stopPropagation(); // Prevent stage pan
        
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

      app.value?.stage.addChild(graphics);
    }
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
    // Left click on empty space deselects
    // Note: If an element was clicked, stopPropagation in the element handler prevents this
    // However, since this is on the container div, we need to be careful.
    // Actually, Pixi events are handled inside the canvas.
    // The div @pointerdown captures events that bubble up or are on the div itself.
    // But since the canvas covers the div, we rely on Pixi's hit testing.
    // If we are here, it means we clicked on the canvas (which is inside the div).
    
    // A better approach for "click on empty space":
    // We can listen to 'pointerdown' on the stage in Pixi.
    // But here we are using DOM events for panning.
    
    // Let's use a simple flag or check if we are dragging an element.
    // But element drag starts in the element handler.
    
    // If we click on the background, we want to deselect.
    // We can use the fact that if an element was clicked, isDraggingElement would be true (synchronously set in element handler?)
    // Wait, Pixi event handlers run before DOM handlers if using Pixi's interaction manager?
    // Actually, we are binding DOM events to the container div.
    // Pixi's internal events (on the graphics) might not stop propagation to the DOM element in the way we expect unless we configure it.
    
    // To keep it simple and robust:
    // We will add a stage hit area and listen to pointerdown on the stage to clear selection.
    if (app.value) {
       // If we are NOT dragging an element (which means we didn't hit an element), deselect.
       // But we need to know if we hit an element.
       // Let's use the store state. If we just selected an element, we shouldn't deselect it.
       // This is tricky with mixed DOM/Pixi events.
       
       // Alternative: Check if the event target is the canvas and we are not in a "hit" state.
       // Let's rely on the fact that we set isDraggingElement = true in the element handler.
       // If we use a small timeout or check the state?
       
       // Actually, let's just add a background hit area to the stage in renderElements or setup.
       // For now, let's implement a simple check:
       // If we are here, and we are not dragging an element, we might want to deselect.
       // But isDraggingElement is set in the Pixi event handler.
       // Does the Pixi event handler fire before this DOM handler?
       // Yes, Pixi listens to pointer events on the canvas.
       
       // Let's try:
       if (!isDraggingElement.value) {
         canvasStore.deselectAllElements();
       }
    }
  }
};

const handlePointerMove = (event: PointerEvent) => {
  if (isPanning.value && app.value) {
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

const handlePointerUp = () => {
  isPanning.value = false;
  isDraggingElement.value = false;
  draggedElementId.value = null;
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
