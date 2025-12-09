<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import CanvasBoard from '@/components/CanvasBoard.vue';
import Toolbar from '@/components/Toolbar.vue';
import { useCanvasStore } from '@/stores/canvasStore';
import { saveCanvasData, loadCanvasData, clearCanvasData } from '@/utils/storage';

const store = useCanvasStore();
const showRestoreDialog = ref(false);
const savedDataCache = ref<any | null>(null);
const mousePosition = ref({ x: 0, y: 0 });

const updateMousePosition = (e: MouseEvent) => {
  mousePosition.value = { x: e.clientX, y: e.clientY };
};

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
    console.log('Ctrl+V detected', mousePosition.value);
    store.pasteFromClipboard(mousePosition.value);
  }
};

const handlePaste = () => {
  // Only handle if not in an input
  const activeElement = document.activeElement;
  const isInputActive = activeElement instanceof HTMLInputElement || 
                        activeElement instanceof HTMLTextAreaElement || 
                        activeElement?.getAttribute('contenteditable') === 'true';
  
  if (isInputActive) return;

  console.log('Paste event detected', mousePosition.value);
  store.pasteFromClipboard(mousePosition.value);
};

// Persistence: Auto-save to IndexedDB
store.$subscribe((_mutation, state) => {
  // We only care about elements for persistence
  saveCanvasData(state.elements).catch(e => {
    console.error('Failed to save canvas data to IndexedDB', e);
  });
});

const handleRestore = () => {
  if (savedDataCache.value) {
    if (Array.isArray(savedDataCache.value)) {
      store.setElements(savedDataCache.value);
    }
  }
  showRestoreDialog.value = false;
};

const handleNewCanvas = () => {
  clearCanvasData();
  showRestoreDialog.value = false;
};

onMounted(async () => {
  // Check for saved data
  const elements = await loadCanvasData();
  if (elements && Array.isArray(elements) && elements.length > 0) {
    savedDataCache.value = elements;
    showRestoreDialog.value = true;
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('mousemove', updateMousePosition);
  window.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('mousemove', updateMousePosition);
  window.removeEventListener('paste', handlePaste);
});
</script>

<template>
  <div class="app-header">
    <div class="title-container">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="app-icon">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <h1 class="project-title">Gevas</h1>
    </div>
  </div>
  
  <Toolbar />
  <CanvasBoard />

  <!-- Restore Dialog -->
  <div v-if="showRestoreDialog" class="dialog-overlay">
    <div class="dialog-content">
      <h2>Unsaved Changes Found</h2>
      <p>Do you want to restore your previous session?</p>
      <div class="dialog-actions">
        <button class="btn-secondary" @click="handleNewCanvas">Start New</button>
        <button class="btn-primary" @click="handleRestore">Restore</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-header {
  position: fixed;
  top: 24px;
  left: 24px;
  z-index: 900;
  pointer-events: none;
}

.title-container {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: var(--color-surface);
  padding: 10px 16px;
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border);
  pointer-events: auto;
  transition: box-shadow 0.2s ease;
}

.title-container:hover {
  box-shadow: var(--shadow-lg);
}

.app-icon {
  color: var(--color-primary);
  width: 20px;
  height: 20px;
}

.project-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

/* Dialog Styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.dialog-content {
  background-color: var(--color-surface);
  padding: 24px;
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
  width: 320px;
  text-align: center;
  border: 1px solid var(--color-border);
}

.dialog-content h2 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.dialog-content p {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb; /* Darker blue */
}

.btn-secondary {
  background-color: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background-color: var(--color-surface-hover);
}
</style>


