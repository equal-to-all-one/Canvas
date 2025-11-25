<script setup lang="ts">
import { ref } from 'vue';
import { useCanvasRenderer } from '@/composables/useCanvasRenderer';

const canvasContainer = ref<HTMLDivElement | null>(null);

// Initialize the PixiJS renderer
// The logic is encapsulated in the composable to follow the project rules
useCanvasRenderer(canvasContainer);
</script>

<template>
  <div ref="canvasContainer" class="canvas-board"></div>
</template>

<style scoped>
.canvas-board {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #1a1a1a; /* Fallback background */
}
</style>
