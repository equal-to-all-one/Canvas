<script setup lang="ts">
import { ref, watch, watchEffect, computed } from 'vue';
import { Graphics, Sprite, Texture, ColorMatrixFilter, BlurFilter, Filter, Assets, Container, Text, TextStyle, Rectangle } from 'pixi.js';
import { useCanvasRenderer } from '@/composables/useCanvasRenderer';
import { useCanvasStore } from '@/stores/canvasStore';
import { screenToWorld, worldToScreen } from '@/utils/coordinates';
import TextEditor from './TextEditor.vue';
import Transformer from './Transformer.vue';
import FloatingToolbar from './FloatingToolbar.vue';
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
const dragStartWorldPoint = ref({ x: 0, y: 0 });
const dragStartElementStates = ref<Map<string, { x: number, y: number }>>(new Map());

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

const cursorTooltipPosition = ref({ x: 0, y: 0 });

const floatingToolbarPosition = ref({ top: 0, left: 0 });

const singleSelectedElement = computed(() => {
  if (canvasStore.selectedElements.length === 1) {
    return canvasStore.selectedElements[0];
  }
  return null;
});

watchEffect(() => {
  // Depend on store zoom/pan to trigger update on viewport change
  void canvasStore.zoom;
  void canvasStore.pan;
  const selection = canvasStore.selectedElements;

  if (selection.length === 1 && app.value && app.value.stage) {
    const el = selection[0];
    if (!el) return;

    // Depend on element properties
    void el.x;
    void el.y;
    void el.width;

    const screenPos = worldToScreen({ x: el.x, y: el.y }, app.value.stage);
    const width = el.width * app.value.stage.scale.x;
    
    floatingToolbarPosition.value = {
      top: screenPos.y,
      left: screenPos.x + width
    };
  }
});

// Selection-box (marquee) state
const isDraggingSelectionBox = ref(false);
const selectionStartScreen = ref({ x: 0, y: 0 });
let selectionGraphic: Graphics | null = null;
const tempSelectionIds = ref(new Set<string>());
const pendingDeselectId = ref<string | null>(null);

// Watch active tool to update cursor
watch(
  () => canvasStore.activeTool,
  (newTool) => {
    if (!app.value) return;
    if (['rectangle', 'circle', 'rounded-rectangle', 'triangle'].includes(newTool)) {
      app.value.canvas.style.cursor = 'crosshair';
    } else if (newTool === 'text') {
      app.value.canvas.style.cursor = 'text';
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
    if (canvasStore.activeTool === 'text') {
      e.stopPropagation();
      if (app.value) {
        const worldPos = screenToWorld({ x: e.global.x, y: e.global.y }, app.value.stage);
        canvasStore.addTextElement(worldPos.x, worldPos.y);
        canvasStore.setActiveTool('select');
      }
      return;
    }

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
  // Optimization: Use a Map to cache Pixi objects and update them instead of recreating
  // For now, we clear and redraw which is simple but less efficient.
  // To meet the < 3s requirement for 100 elements, this is sufficient.
  // However, to support smooth dragging without store updates, we need to access these objects.
  // Let's attach the ID to the display object so we can find it later.
  
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
      
      // Use a Container to wrap the sprite, allowing for consistent hitArea and selection highlight
      const container = new Container();
      container.position.set(element.x, element.y);
      container.rotation = element.rotation;

      const sprite = new Sprite(texture);
      
      // Set sprite dimensions (this applies scale to the sprite)
      sprite.width = element.width;
      sprite.height = element.height;
      
      // Apply filters to the sprite
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
      container.addChild(sprite);

      // Ensure hitArea covers the whole image (Container is unscaled, so we use element dimensions)
      container.hitArea = new Rectangle(0, 0, element.width, element.height);

      // Selection highlight
      const isEffectivelySelected = element.isSelected || tempSelectionIds.value.has(element.id);
      if (isEffectivelySelected) {
        const selectionHighlight = new Graphics();
        const padding = 4;
        selectionHighlight.rect(-padding, -padding, element.width + padding * 2, element.height + padding * 2);
        selectionHighlight.stroke({ width: 1, color: '#00FFFF' });
        container.addChild(selectionHighlight);
      }

      displayObject = container;
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
      
      // Ensure hitArea covers the whole text block (even transparent areas)
      container.hitArea = new Rectangle(0, 0, currentX, maxHeight);

      // Selection highlight (supports temporary marquee selection)
      const isEffectivelySelected = element.isSelected || tempSelectionIds.value.has(element.id);
      if (isEffectivelySelected) {
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
        // Draw ellipse centered in the bounding box
        // Use ellipse to support non-uniform scaling (e.g. dragging top/bottom handles)
        const rx = element.width / 2;
        const ry = element.height / 2;
        graphics.ellipse(rx, ry, rx, ry);
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
        
      // Selection highlight (supports temporary marquee selection)
      const isEffectivelySelected = element.isSelected || tempSelectionIds.value.has(element.id);
      
      // Always draw the element's actual stroke
      graphics.stroke({ width: element.strokeWidth, color: element.strokeColor });

      // Ensure hitArea covers the bounding box
      graphics.hitArea = new Rectangle(0, 0, element.width, element.height);

      if (isEffectivelySelected) {
        // Draw selection highlight as a separate child to avoid overwriting the element's stroke
        const selectionHighlight = new Graphics();
        const padding = 4;
        
        // Draw a bounding box around the element
        // Note: For circles/triangles, a rect bounding box is standard for selection
        selectionHighlight.rect(-padding, -padding, element.width + padding * 2, element.height + padding * 2);
        selectionHighlight.stroke({ width: 1, color: '#00FFFF' });
        
        graphics.addChild(selectionHighlight);
      }
      displayObject = graphics;
    }

    // Make interactive
    displayObject.eventMode = 'static'; // Replaces interactive = true in v7/v8
    displayObject.cursor = 'pointer';
    displayObject.label = element.id; // Store ID for retrieval during drag
      
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
        
      // Select element (support Shift to add/remove from selection)
      const originalEvent = (e.originalEvent as unknown as MouseEvent) || (e as unknown as MouseEvent);
      if (originalEvent && originalEvent.shiftKey) {
        // If already selected, don't remove immediately (to allow dragging group).
        // Mark for potential deselection on mouse up.
        if (canvasStore.selectedElementIds.includes(element.id)) {
          pendingDeselectId.value = element.id;
        } else {
          canvasStore.addToSelection([element.id]);
          pendingDeselectId.value = null;
        }
      } else {
        // If not already selected, select it.
        // If already selected, keep selection to allow group drag.
        // We will handle "deselect others on click" in pointerup if no drag occurred.
        if (!canvasStore.selectedElementIds.includes(element.id)) {
          canvasStore.setSelectedElements([element.id]);
        }
        pendingDeselectId.value = null;
      }
        
      // Start dragging
      if (app.value) {
        isDraggingElement.value = true;
        draggedElementId.value = element.id;
          
        const worldPos = screenToWorld({ x: e.global.x, y: e.global.y }, app.value.stage);
        dragStartWorldPoint.value = worldPos;
        
        // Snapshot all selected elements positions
        dragStartElementStates.value.clear();
        
        // If the clicked element is NOT in the selection (shouldn't happen due to logic above, but safe guard)
        // we treat it as a single drag. But logic above ensures it's selected.
        // If user clicked an unselected element without shift, it became the only selection.
        // If user clicked a selected element, we drag all selected elements.
        
        canvasStore.selectedElements.forEach(el => {
          dragStartElementStates.value.set(el.id, { x: el.x, y: el.y });
        });
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



const handleWheel = (event: WheelEvent) => {
  if (!app.value) return;
  event.preventDefault();

  if (event.ctrlKey || event.metaKey) {
    // Zoom
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
  } else {
    // Pan (Scroll)
    app.value.stage.position.x -= event.deltaX;
    app.value.stage.position.y -= event.deltaY;
    
    // Sync to store
    canvasStore.setPan({ x: app.value.stage.position.x, y: app.value.stage.position.y });
  }
};

const handlePointerDown = (event: PointerEvent) => {
  if (event.button === 1) { // Middle mouse button
    // Optional: Keep middle mouse pan as alternative? Or remove?
    // User asked to change to Left Click Empty.
    // Let's keep it as a secondary option or remove if strict.
    // Let's remove to be clean and follow "Refactor" instruction.
    // Actually, keeping it doesn't hurt, but let's focus on the requested change.
    isPanning.value = true;
    lastPanPoint.value = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  } else if (event.button === 0) {
    // If we are editing text, clicking outside should close the editor (handled by TextEditor blur)
    // But we also want to deselect if we click on empty space.
    // If we just entered edit mode (isEditingText is true), we should NOT deselect.
    if (isEditingText.value) return;

    if (app.value) {
       // If we are NOT dragging an element (which means we didn't hit an element)
       if (!isDraggingElement.value) {
         if (canvasStore.activeTool === 'select') {
            // Logic:
            // 1. If Shift is pressed -> Marquee Selection
            // 2. If No Modifier -> Pan Canvas
            
            if (event.shiftKey) {
                // Begin selection-box drag
                isDraggingSelectionBox.value = true;
                selectionStartScreen.value = { x: event.clientX, y: event.clientY };
                tempSelectionIds.value = new Set();

                // Create graphics overlay in world coordinates
                selectionGraphic = new Graphics();
                // Add to stage so it's visible above elements
                app.value.stage.addChild(selectionGraphic);
            } else {
                // Pan Canvas
                isPanning.value = true;
                lastPanPoint.value = { x: event.clientX, y: event.clientY };
                
                // Also clear selection on empty click
                canvasStore.clearSelection();
            }
         } else {
             // Creating shape... handled by stage.on('pointerdown')?
             // Wait, stage.on('pointerdown') handles creation.
             // This DOM handler runs AFTER Pixi handlers.
             // If we are creating, we shouldn't be here?
             // Actually, creation logic is in stage.on('pointerdown').
             // If activeTool is NOT select, we probably don't want to pan with left click?
             // Or maybe we do? Usually creation tools don't pan on drag.
         }
       }
    }
  }
};

const handlePointerMove = (event: PointerEvent) => {
  cursorTooltipPosition.value = { x: event.clientX, y: event.clientY };

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
  } else if (isDraggingElement.value && app.value) {
    const worldPos = screenToWorld({ x: event.clientX, y: event.clientY }, app.value.stage);
    
    const dx = worldPos.x - dragStartWorldPoint.value.x;
    const dy = worldPos.y - dragStartWorldPoint.value.y;
    
    // Update all dragged elements visually (without committing to store yet if possible, 
    // but our render loop relies on store. So we update store for now. 
    // Optimization: We could update Pixi objects directly and only commit on pointer up.
    // Let's try direct Pixi update for smoothness if we can map IDs to Pixi objects, 
    // but currently we rebuild scene on store change.
    // To support "batch drag" efficiently as requested:
    // "mousemove 阶段应只负责计算位移和更新视觉表现，禁止在此阶段频繁提交 store 更新"
    
    // We need to access the Pixi objects. Since we clear stage on render, we don't have a persistent map.
    // Let's iterate stage children.
    
    app.value.stage.children.forEach(() => {
       // We need a way to link child to element ID. 
       // We didn't attach ID to displayObject. Let's assume we can't easily do it without refactor.
       // Wait, we can attach ID to displayObject in renderElements.
    });
    
    // For now, to meet the requirement of "smooth drag without store update", 
    // we need to refactor renderElements to attach ID to the graphics/sprite.
    // Let's do a quick hack: we will update store for now because refactoring render loop is risky in this step.
    // Wait, the requirement says "禁止在此阶段频繁提交 store 更新".
    // So I MUST implement direct Pixi manipulation.
    
    // Let's modify renderElements to attach ID.
    // Since I can't modify renderElements in this tool call easily without reading it all again,
    // I will assume I can find the child by some means or just update store for this iteration 
    // AND THEN refactor in next step if needed? 
    // No, I should do it right.
    
    // Actually, I can just update the store. Vue 3 + Pinia + Pixi is usually fast enough for < 100 elements.
    // But to strictly follow "Instruction 2", I need to update Pixi objects directly.
    
    // Let's assume I can't easily find Pixi objects without a map.
    // I will update the store for now, but use `updateElementTransform` which is granular.
    // To do "batch update" on mouse up, I need to track final positions.
    
    // REVISION: I will update store for now to ensure it works, 
    // as "Direct Pixi manipulation" requires a `Map<id, DisplayObject>` which I don't have yet.
    // Adding that map requires changing `renderElements`.
    
    // Let's try to update store. If it's slow, we optimize.
    // Actually, the prompt explicitly asked for "Direct Pixi manipulation".
    // I will add `name` property to DisplayObject in `renderElements` in a separate edit 
    // so I can find them here.
    
    // For this specific edit, I will implement the logic assuming `child.name === element.id`.
    
    app.value.stage.children.forEach((child) => {
        if (dragStartElementStates.value.has(child.label)) {
            const startState = dragStartElementStates.value.get(child.label)!;
            child.position.set(startState.x + dx, startState.y + dy);
        }
    });
  }
  // Handle marquee selection drag
  if (isDraggingSelectionBox.value && app.value) {
    if (!selectionGraphic) return;
    const start = selectionStartScreen.value;
    const current = { x: event.clientX, y: event.clientY };

    // Draw rectangle in world coords
    const worldStart = screenToWorld({ x: start.x, y: start.y }, app.value.stage);
    const worldCurrent = screenToWorld({ x: current.x, y: current.y }, app.value.stage);

    const x = Math.min(worldStart.x, worldCurrent.x);
    const y = Math.min(worldStart.y, worldCurrent.y);
    const w = Math.abs(worldCurrent.x - worldStart.x);
    const h = Math.abs(worldCurrent.y - worldStart.y);

    selectionGraphic.clear();
    selectionGraphic.rect(x, y, w, h);
    selectionGraphic.fill({ color: 0x3399FF, alpha: 0.08 });
    selectionGraphic.stroke({ width: 1, color: 0x3399FF, alpha: 0.6 });

    // Collision detection (axis-aligned bounding boxes)
    const newlySelected = new Set<string>();
    canvasStore.elements.forEach(el => {
      const ex = el.x;
      const ey = el.y;
      const ew = el.width ?? 0;
      const eh = el.height ?? 0;

      const intersects = !(ex + ew < x || ex > x + w || ey + eh < y || ey > y + h);
      if (intersects) newlySelected.add(el.id);
    });

    tempSelectionIds.value = newlySelected;
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
  
  if (isDraggingElement.value && app.value) {
    // Commit final positions to store
    const worldPos = screenToWorld({ x: event.clientX, y: event.clientY }, app.value.stage);
    const dx = worldPos.x - dragStartWorldPoint.value.x;
    const dy = worldPos.y - dragStartWorldPoint.value.y;

    // Use a small threshold to distinguish click from drag
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      const updates: { id: string, x: number, y: number }[] = [];
      dragStartElementStates.value.forEach((startState, id) => {
        updates.push({
          id,
          x: startState.x + dx,
          y: startState.y + dy
        });
      });
      canvasStore.updateElementsPositions(updates);
      
      // Drag occurred, so cancel any pending deselect
      pendingDeselectId.value = null;
    } else {
      // It was a click (no significant drag)
      
      if (event.shiftKey) {
        // If Shift was held and we have a pending deselect, execute it now
        if (pendingDeselectId.value && pendingDeselectId.value === draggedElementId.value) {
          canvasStore.removeFromSelection([pendingDeselectId.value]);
        }
      } else {
        // If we clicked a selected element without Shift, we should now select ONLY that element
        // (This handles the "Click selected element to isolate it" behavior)
        if (draggedElementId.value) {
           canvasStore.setSelectedElements([draggedElementId.value]);
        }
      }
    }
  }

  isDraggingElement.value = false;
  pendingDeselectId.value = null; // Reset pending deselect
  draggedElementId.value = null;
  dragStartElementStates.value.clear();

  // Commit marquee selection if active
  if (isDraggingSelectionBox.value) {
    isDraggingSelectionBox.value = false;

    if (selectionGraphic && app.value) {
      app.value.stage.removeChild(selectionGraphic);
      selectionGraphic.destroy();
      selectionGraphic = null;
    }

    // Determine if it was a click (small movement) or a drag
    const dx = event.clientX - selectionStartScreen.value.x;
    const dy = event.clientY - selectionStartScreen.value.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < 25) {
      // Considered click on empty space
      canvasStore.clearSelection();
    } else {
      // Commit the temporary selection
      canvasStore.setSelectedElements(Array.from(tempSelectionIds.value));
    }

    // Clear temp selection
    tempSelectionIds.value = new Set();
  }
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
    
    // Deselect the element after editing
    canvasStore.clearSelection();

    isEditingText.value = false;
    editingElementId.value = null;
    editingElement.value = null;
  }
};
</script>

<template>
  <div class="board-wrapper">
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
    
    <FloatingToolbar
      v-if="singleSelectedElement && !isDraggingElement"
      :element="singleSelectedElement"
      :position="floatingToolbarPosition"
    />
    
    <div 
      v-if="canvasStore.activeTool === 'text'"
      class="cursor-tooltip"
      :style="{ top: cursorTooltipPosition.y + 15 + 'px', left: cursorTooltipPosition.x + 15 + 'px' }"
    >
      点击插入文本框
    </div>

    <Transformer />
  </div>
</template>

<style scoped>
.board-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.cursor-tooltip {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 2000;
  white-space: nowrap;
}

.canvas-board {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1a1a1a;
}
</style>
