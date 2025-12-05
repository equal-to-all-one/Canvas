<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';
import type { ImageElement, TextElement } from '@/types/element';

const store = useCanvasStore();
const fileInput = ref<HTMLInputElement | null>(null);

const handleAddImage = () => {
  fileInput.value?.click();
};

const handleAddText = () => {
  store.addTextElement();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        console.log('[DEBUG-2] FileReader 完成...', dataUrl.substring(0, 100));

        // Create an image object to get dimensions
        const img = new Image();
        img.onload = () => {
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            
            // Calculate dimensions preserving aspect ratio
            // Default max size of 400px
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

            console.log('[DEBUG-3] 准备添加到 store 的新图片元素:', newImageElement);
            store.addElement(newImageElement);
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  }
  
  // Reset input so the same file can be selected again
  if (target) {
    target.value = '';
  }
};
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
    <button 
      :class="{ active: store.activeTool === 'circle' }"
      @click="store.setActiveTool('circle')"
    >
      圆形
    </button>
    <button 
      :class="{ active: store.activeTool === 'rounded-rectangle' }"
      @click="store.setActiveTool('rounded-rectangle')"
    >
      圆角矩形
    </button>
    <button 
      :class="{ active: store.activeTool === 'triangle' }"
      @click="store.setActiveTool('triangle')"
    >
      三角形
    </button>
    <button @click="handleAddText">
      添加文本
    </button>
    <button @click="handleAddImage">
      添加图片
    </button>
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
