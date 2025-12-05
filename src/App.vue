<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import CanvasBoard from '@/components/CanvasBoard.vue';
import Toolbar from '@/components/Toolbar.vue';
import { useCanvasStore } from '@/stores/canvasStore';

const store = useCanvasStore();

const handleKeyDown = (event: KeyboardEvent) => {
  // Check if we are editing text or using an input
  const activeElement = document.activeElement;
  const isInputActive = activeElement instanceof HTMLInputElement || 
                        activeElement instanceof HTMLTextAreaElement || 
                        activeElement?.getAttribute('contenteditable') === 'true';
  
  if (isInputActive) return;

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    store.deleteSelectedElements();
  }

  // Copy
  if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
    event.preventDefault();
    store.copyToClipboard();
  }

  // Paste
  if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
    event.preventDefault();
    store.pasteFromClipboard();
  }
};

// Persistence: Auto-save to localStorage
store.$subscribe((_mutation, state) => {
  // We only care about elements for persistence
  localStorage.setItem('canvas-data', JSON.stringify(state.elements));
});

onMounted(() => {
  // Load data from localStorage
  const savedData = localStorage.getItem('canvas-data');
  if (savedData) {
    try {
      const elements = JSON.parse(savedData);
      if (Array.isArray(elements)) {
        store.setElements(elements);
      }
    } catch (e) {
      console.error('Failed to load canvas data', e);
    }
  }

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
