<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import CanvasBoard from '@/components/CanvasBoard.vue';
import Toolbar from '@/components/Toolbar.vue';
import { useCanvasStore } from '@/stores/canvasStore';

const store = useCanvasStore();

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    // Check if we are editing text, if so, don't delete elements
    const activeElement = document.activeElement;
    const isInputActive = activeElement instanceof HTMLInputElement || 
                          activeElement instanceof HTMLTextAreaElement || 
                          activeElement?.getAttribute('contenteditable') === 'true';
    
    if (!isInputActive) {
      event.preventDefault();
      store.deleteSelectedElements();
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <Toolbar />
  <CanvasBoard />
</template>

<style scoped>
</style>
