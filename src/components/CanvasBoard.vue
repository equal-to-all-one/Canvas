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

const renderElements = () => {
  if (!app.value) return;

  // Clear the stage
  app.value.stage.removeChildren();

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
      graphics.stroke({ width: element.strokeWidth, color: element.strokeColor });

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
  }
};

const handlePointerUp = () => {
  isPanning.value = false;
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
