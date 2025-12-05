<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';

const store = useCanvasStore();

// State for resizing
const isResizing = ref(false);
const resizeHandle = ref<string | null>(null);
const startMousePos = ref({ x: 0, y: 0 });
const startBounds = ref({ x: 0, y: 0, width: 0, height: 0 });
const startElementsState = ref<Map<string, { x: number, y: number, width: number, height: number }>>(new Map());

const screenBounds = computed(() => {
  const getBounds = store.selectionBoundingBox; // Access the getter
  if (!getBounds) return null;
  
  const bounds = getBounds(); // Call the function returned by the getter
  if (!bounds) return null;

  const { x, y, width, height } = bounds;
  const zoom = store.zoom;
  const pan = store.pan;

  return {
    left: x * zoom + pan.x,
    top: y * zoom + pan.y,
    width: width * zoom,
    height: height * zoom,
    rotation: 0 // Bounding box is axis-aligned for now
  };
});

const isResizable = computed(() => {
  // If any selected element is text, disable resizing
  // Or if you want to be more specific: if selection contains ONLY text, disable.
  // The user said "text box should not be scalable".
  // If we have a mixed selection (Rect + Text), scaling the Rect is fine, but what about Text?
  // Usually mixed selection scaling is allowed, but Text just moves.
  // But our current implementation scales EVERYTHING.
  // So to be safe and follow "text box should not be scalable", let's disable if ANY text is selected.
  // Or better: check if ALL are text.
  
  // Let's check if the selection contains any text element.
  const hasText = store.selectedElements.some(el => el.type === 'text');
  return !hasText;
});

const startResize = (handle: string, event: MouseEvent) => {
  if (!isResizable.value) return;

  event.preventDefault();
  event.stopPropagation();

  const bounds = store.selectionBoundingBox();
  if (!bounds) return;

  isResizing.value = true;
  resizeHandle.value = handle;
  startMousePos.value = { x: event.clientX, y: event.clientY };
  startBounds.value = { ...bounds };

  // Snapshot element states
  startElementsState.value.clear();
  store.selectedElements.forEach(el => {
    startElementsState.value.set(el.id, {
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height
    });
  });

  window.addEventListener('mousemove', handleResizeMove);
  window.addEventListener('mouseup', handleResizeUp);
};

const handleResizeMove = (event: MouseEvent) => {
  if (!isResizing.value || !resizeHandle.value) return;

  const dx = (event.clientX - startMousePos.value.x) / store.zoom;
  const dy = (event.clientY - startMousePos.value.y) / store.zoom;

  let newBounds = { ...startBounds.value };

  // Calculate new bounds based on handle
  // This is a simplified logic; for perfect aspect ratio or rotation it gets complex
  switch (resizeHandle.value) {
    case 'se': // Bottom-Right
      newBounds.width = Math.max(1, startBounds.value.width + dx);
      newBounds.height = Math.max(1, startBounds.value.height + dy);
      break;
    case 'sw': // Bottom-Left
      newBounds.width = Math.max(1, startBounds.value.width - dx);
      newBounds.x = startBounds.value.x + (startBounds.value.width - newBounds.width);
      newBounds.height = Math.max(1, startBounds.value.height + dy);
      break;
    case 'ne': // Top-Right
      newBounds.width = Math.max(1, startBounds.value.width + dx);
      newBounds.height = Math.max(1, startBounds.value.height - dy);
      newBounds.y = startBounds.value.y + (startBounds.value.height - newBounds.height);
      break;
    case 'nw': // Top-Left
      newBounds.width = Math.max(1, startBounds.value.width - dx);
      newBounds.x = startBounds.value.x + (startBounds.value.width - newBounds.width);
      newBounds.height = Math.max(1, startBounds.value.height - dy);
      newBounds.y = startBounds.value.y + (startBounds.value.height - newBounds.height);
      break;
    case 'e': // Right
      newBounds.width = Math.max(1, startBounds.value.width + dx);
      break;
    case 's': // Bottom
      newBounds.height = Math.max(1, startBounds.value.height + dy);
      break;
    case 'w': // Left
      newBounds.width = Math.max(1, startBounds.value.width - dx);
      newBounds.x = startBounds.value.x + (startBounds.value.width - newBounds.width);
      break;
    case 'n': // Top
      newBounds.height = Math.max(1, startBounds.value.height - dy);
      newBounds.y = startBounds.value.y + (startBounds.value.height - newBounds.height);
      break;
  }

  // Apply scaling to all elements
  const scaleX = newBounds.width / startBounds.value.width;
  const scaleY = newBounds.height / startBounds.value.height;

  startElementsState.value.forEach((startState, id) => {
    // Relative position in the original bounding box
    const relX = startState.x - startBounds.value.x;
    const relY = startState.y - startBounds.value.y;

    const newX = newBounds.x + relX * scaleX;
    const newY = newBounds.y + relY * scaleY;
    const newW = startState.width * scaleX;
    const newH = startState.height * scaleY;

    store.updateElementTransform(id, {
      x: newX,
      y: newY,
      width: newW,
      height: newH
    });
  });
};

const handleResizeUp = () => {
  isResizing.value = false;
  resizeHandle.value = null;
  window.removeEventListener('mousemove', handleResizeMove);
  window.removeEventListener('mouseup', handleResizeUp);
};

onUnmounted(() => {
  window.removeEventListener('mousemove', handleResizeMove);
  window.removeEventListener('mouseup', handleResizeUp);
});
</script>

<template>
  <div 
    v-if="screenBounds" 
    class="transformer-overlay"
    :style="{
      transform: `translate(${screenBounds.left}px, ${screenBounds.top}px)`,
      width: `${screenBounds.width}px`,
      height: `${screenBounds.height}px`
    }"
  >
    <div class="border"></div>
    
    <!-- Corners -->
    <div v-if="isResizable" class="handle nw" @mousedown="startResize('nw', $event)"></div>
    <div v-if="isResizable" class="handle ne" @mousedown="startResize('ne', $event)"></div>
    <div v-if="isResizable" class="handle sw" @mousedown="startResize('sw', $event)"></div>
    <div v-if="isResizable" class="handle se" @mousedown="startResize('se', $event)"></div>
    
    <!-- Edges -->
    <div v-if="isResizable" class="handle n" @mousedown="startResize('n', $event)"></div>
    <div v-if="isResizable" class="handle s" @mousedown="startResize('s', $event)"></div>
    <div v-if="isResizable" class="handle w" @mousedown="startResize('w', $event)"></div>
    <div v-if="isResizable" class="handle e" @mousedown="startResize('e', $event)"></div>
  </div>
</template>

<style scoped>
.transformer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none; /* Allow clicks to pass through the empty area */
  z-index: 50; /* Above canvas, below UI */
  box-sizing: border-box;
}

.border {
  width: 100%;
  height: 100%;
  border: 1px solid #00FFFF;
  pointer-events: none;
}

.handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #fff;
  border: 1px solid #00FFFF;
  border-radius: 50%;
  pointer-events: auto; /* Re-enable pointer events for handles */
  transform: translate(-50%, -50%);
}

/* Handle positions */
.nw { top: 0; left: 0; cursor: nwse-resize; }
.ne { top: 0; left: 100%; cursor: nesw-resize; }
.sw { top: 100%; left: 0; cursor: nesw-resize; }
.se { top: 100%; left: 100%; cursor: nwse-resize; }
.n  { top: 0; left: 50%; cursor: ns-resize; }
.s  { top: 100%; left: 50%; cursor: ns-resize; }
.w  { top: 50%; left: 0; cursor: ew-resize; }
.e  { top: 50%; left: 100%; cursor: ew-resize; }
</style>
