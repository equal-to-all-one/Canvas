<script setup lang="ts">
import { useCanvasStore } from '@/stores/canvasStore';

const store = useCanvasStore();
</script>

<template>
  <div class="toolbar">
    <button 
      :class="{ active: store.activeTool === 'select' }"
      @click="store.setActiveTool('select')"
    >
      选择
    </button>
    <button 
      :class="{ active: store.activeTool === 'rectangle' }"
      @click="store.setActiveTool('rectangle')"
    >
      矩形
    </button>
  </div>
</template>

<style scoped>
.toolbar {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  padding: 8px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  display: flex;
  gap: 8px;
  z-index: 1000;
}

button {
  padding: 6px 12px;
  border: 1px solid #ccc;
  background: #f9f9f9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

button:hover {
  background: #eee;
}

button.active {
  background-color: #e0e0e0;
  border-color: #999;
  font-weight: bold;
}
</style>
