<script setup lang="ts">
import { ref, watch } from 'vue';
import { Graphics } from 'pixi.js';
import { useCanvasRenderer } from '@/composables/useCanvasRenderer';
import { useCanvasStore } from '@/stores/canvasStore';

const canvasContainer = ref<HTMLDivElement | null>(null);
const canvasStore = useCanvasStore();

// Initialize the PixiJS renderer
const { app } = useCanvasRenderer(canvasContainer);

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
</script>

<template>
  <div class="board-wrapper">
    <div class="toolbar">
      <button @click="addRandomRect">Add Random Rect</button>
    </div>
    <div ref="canvasContainer" class="canvas-board"></div>
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
