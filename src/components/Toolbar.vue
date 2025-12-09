<script setup lang="ts">
import { ref } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';

const store = useCanvasStore();
const fileInput = ref<HTMLInputElement | null>(null);

const handleAddImage = () => {
  fileInput.value?.click();
};

const handleAddText = () => {
  store.setActiveTool('text');
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        const img = new Image();
        img.onload = () => {
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            const maxSize = 400;
            let width = naturalWidth;
            let height = naturalHeight;
            
            if (width > maxSize || height > maxSize) {
                const ratio = width / height;
                if (width > height) {
                    width = maxSize;
                    height = width / ratio;
                } else {
                    height = maxSize;
                    width = height * ratio;
                }
            }

            const newImageElement = {
                type: 'image' as const,
                src: dataUrl,
                x: 100,
                y: 100,
                width: width,
                height: height,
                rotation: 0,
                isSelected: false,
                filters: { grayscale: false, blur: 0, brightness: 1 }
            };
            // Use addImageElement action if available or addElement
            // But addElement expects DistributiveOmit<CanvasElement, 'id'>
            // Let's use store.addElement which handles ID generation
            store.addElement(newImageElement);
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  }
  // Reset value to allow selecting the same file again
  if (target) target.value = '';
};
</script>

<template>
  <div class="toolbar-dock">
    <div class="toolbar-group">
      <button 
        class="tool-btn" 
        :class="{ active: store.activeTool === 'select' }"
        @click="store.setActiveTool('select')"
        title="Select (V)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
        </svg>
      </button>
    </div>

    <div class="divider"></div>

    <div class="toolbar-group">
      <button 
        class="tool-btn" 
        :class="{ active: store.activeTool === 'rectangle' }"
        @click="store.setActiveTool('rectangle')"
        title="Rectangle (R)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        </svg>
      </button>
      <button 
        class="tool-btn" 
        :class="{ active: store.activeTool === 'circle' }"
        @click="store.setActiveTool('circle')"
        title="Circle (O)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </button>
      <button 
        class="tool-btn" 
        :class="{ active: store.activeTool === 'rounded-rectangle' }"
        @click="store.setActiveTool('rounded-rectangle')"
        title="Rounded Rectangle"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="5" ry="5"/>
        </svg>
      </button>
      <button 
        class="tool-btn" 
        :class="{ active: store.activeTool === 'triangle' }"
        @click="store.setActiveTool('triangle')"
        title="Triangle"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3l10 18H2L12 3z"/>
        </svg>
      </button>
    </div>

    <div class="divider"></div>

    <div class="toolbar-group">
      <button 
        class="tool-btn" 
        :class="{ active: store.activeTool === 'text' }"
        @click="handleAddText" 
        title="Text (T)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
        </svg>
      </button>
      <button class="tool-btn" @click="handleAddImage" title="Image">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </button>
    </div>

    <input 
      ref="fileInput"
      type="file" 
      accept="image/png, image/jpeg" 
      style="display: none" 
      @change="handleFileChange"
    >
  </div>
</template>

<style scoped>
.toolbar-dock {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--shadow-md);
  z-index: 1000;
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.tool-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--color-text);
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.tool-btn.active {
  background-color: var(--color-primary);
  color: white;
}

.divider {
  width: 1px;
  height: 24px;
  background-color: var(--color-border);
  margin: 0 4px;
}
</style>
