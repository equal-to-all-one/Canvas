<script setup lang="ts">
import CanvasView from '@/components/canvas/CanvasView.vue';
import { useCanvasStore } from '@/stores/canvasStore';
import { onMounted } from 'vue';

const canvasStore = useCanvasStore();

onMounted(() => {
  // Add some test elements
  canvasStore.addElement({
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    rotation: 0,
    fillColor: '#FF0000',
    strokeColor: '#000000',
    strokeWidth: 2,
    opacity: 1,
  });

  canvasStore.addElement({
    type: 'circle',
    x: 400,
    y: 300,
    width: 100, // Diameter for circle in our simple model, or radius * 2
    height: 100,
    rotation: 0,
    fillColor: '#00FF00',
    strokeColor: '#000000',
    strokeWidth: 2,
    opacity: 0.8,
  });
});
</script>

<template>
  <div class="app-container">
    <CanvasView />
    <div class="ui-overlay">
      <h1>Canvas App</h1>
      <p>Use mouse wheel to zoom (not implemented yet), drag to pan (not implemented yet).</p>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.ui-overlay {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 8px;
  pointer-events: none; /* Let clicks pass through to canvas */
}
</style>
