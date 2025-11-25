<script setup lang="ts">
import { ref } from 'vue';
import { useCanvasRenderer } from '@/composables/useCanvasRenderer';

const canvasContainer = ref<HTMLDivElement | null>(null);

// Initialize the PixiJS renderer
useCanvasRenderer(canvasContainer);
</script>

<template>
  <div ref="canvasContainer" class="canvas-container"></div>
</template>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f0f0f0;
}
</style>
