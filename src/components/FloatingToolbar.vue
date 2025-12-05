<script setup lang="ts">
import { computed } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';
import type { RectangleElement, CircleElement, RoundedRectangleElement, TriangleElement, TextElement, ImageElement, CanvasElement } from '@/types/element';

const props = defineProps<{
  element: CanvasElement;
  position: { top: number; left: number };
}>();

const store = useCanvasStore();

const style = computed(() => ({
  top: `${props.position.top}px`,
  left: `${props.position.left}px`,
  position: 'absolute' as const,
  zIndex: 100,
  transform: 'translate(10px, 0)', // Shift right by 10px
}));

// Shape Helpers
const isShape = computed(() => ['rectangle', 'circle', 'rounded-rectangle', 'triangle'].includes(props.element.type));
const shapeElement = computed(() => props.element as RectangleElement | CircleElement | RoundedRectangleElement | TriangleElement);

const updateShape = (key: string, value: any) => {
  store.updateElementTransform(props.element.id, { [key]: value });
};

// Text Helpers
const isText = computed(() => props.element.type === 'text');
const textElement = computed(() => props.element as TextElement);

const updateText = (key: string, value: any) => {
  store.updateTextElement(props.element.id, { [key]: value });
};

const toggleFormat = (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
  store.toggleTextFormatting(props.element.id, format);
};

// Image Helpers
const isImage = computed(() => props.element.type === 'image');
const imageElement = computed(() => props.element as ImageElement);

const updateImageFilters = (key: string, value: any) => {
  store.updateImageFilters(props.element.id, { [key]: value });
};
</script>

<template>
  <div class="floating-toolbar" :style="style" @mousedown.stop @pointerdown.stop>
    
    <!-- Shape Tools -->
    <div v-if="isShape" class="toolbar-section">
      <div class="control-group">
        <label>Fill</label>
        <div class="color-picker-wrapper">
          <input type="color" :value="shapeElement.fillColor" @input="(e) => updateShape('fillColor', (e.target as HTMLInputElement).value)" />
        </div>
      </div>
      <div class="control-group">
        <label>Stroke</label>
        <div class="color-picker-wrapper">
          <input type="color" :value="shapeElement.strokeColor" @input="(e) => updateShape('strokeColor', (e.target as HTMLInputElement).value)" />
        </div>
      </div>
      <div class="control-group">
        <label>Width</label>
        <input type="number" class="number-input" :value="shapeElement.strokeWidth" @input="(e) => updateShape('strokeWidth', parseFloat((e.target as HTMLInputElement).value))" min="0" />
      </div>
      <div v-if="element.type === 'rounded-rectangle'" class="control-group">
        <label>Radius</label>
        <input type="number" class="number-input" :value="(element as RoundedRectangleElement).borderRadius" @input="(e) => updateShape('borderRadius', parseFloat((e.target as HTMLInputElement).value))" min="0" />
      </div>
    </div>

    <!-- Text Tools -->
    <div v-if="isText" class="toolbar-section vertical">
      <div class="row">
        <div class="control-group">
          <label>Size</label>
          <input type="number" class="number-input" :value="textElement.fontSize" @input="(e) => updateText('fontSize', parseFloat((e.target as HTMLInputElement).value))" min="8" />
        </div>
        <div class="control-group">
          <label>Color</label>
          <div class="color-picker-wrapper">
            <input type="color" :value="textElement.color" @input="(e) => updateText('color', (e.target as HTMLInputElement).value)" />
          </div>
        </div>
        <div class="control-group">
          <label>Bg</label>
          <div class="color-picker-wrapper">
            <input type="color" :value="textElement.backgroundColor === 'transparent' ? '#ffffff' : textElement.backgroundColor" @input="(e) => updateText('backgroundColor', (e.target as HTMLInputElement).value)" />
          </div>
        </div>
      </div>
      <div class="row style-buttons">
        <button :class="{ active: textElement.content.some(s => s.bold) }" @click="toggleFormat('bold')" title="Bold">B</button>
        <button :class="{ active: textElement.content.some(s => s.italic) }" @click="toggleFormat('italic')" title="Italic">I</button>
        <button :class="{ active: textElement.content.some(s => s.underline) }" @click="toggleFormat('underline')" title="Underline">U</button>
        <button :class="{ active: textElement.content.some(s => s.strikethrough) }" @click="toggleFormat('strikethrough')" title="Strike">S</button>
      </div>
    </div>

    <!-- Image Tools -->
    <div v-if="isImage" class="toolbar-section vertical">
      <div class="control-row">
        <label>Blur</label>
        <input type="range" :value="imageElement.filters.blur" @input="(e) => updateImageFilters('blur', parseFloat((e.target as HTMLInputElement).value))" min="0" max="20" step="1" />
      </div>
      <div class="control-row">
        <label>Bright</label>
        <input type="range" :value="imageElement.filters.brightness" @input="(e) => updateImageFilters('brightness', parseFloat((e.target as HTMLInputElement).value))" min="0" max="2" step="0.1" />
      </div>
      <div class="control-row checkbox-row">
        <label>Grayscale</label>
        <input type="checkbox" :checked="imageElement.filters.grayscale" @change="(e) => updateImageFilters('grayscale', (e.target as HTMLInputElement).checked)" />
      </div>
    </div>

  </div>
</template>

<style scoped>
.floating-toolbar {
  position: absolute;
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  font-family: 'Segoe UI', sans-serif;
  font-size: 14px;
  color: #333;
  pointer-events: auto;
  /* Removed min-width to allow shrinking */
}

.toolbar-section {
  display: flex;
  gap: 16px;
  align-items: center;
}

.toolbar-section.vertical {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.row {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.checkbox-row {
  justify-content: flex-start;
}

label {
  font-size: 12px;
  color: #666;
  font-weight: 600;
}

.number-input {
  width: 50px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
}

.color-picker-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #ddd;
  cursor: pointer;
}

input[type="color"] {
  width: 150%;
  height: 150%;
  margin: -25%;
  padding: 0;
  border: none;
  cursor: pointer;
}

input[type="range"] {
  width: 100px;
}

.style-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 4px;
}

.style-buttons button {
  border: none;
  background: transparent;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-weight: bold;
  color: #555;
}

.style-buttons button:hover {
  background: #e0e0e0;
}

.style-buttons button.active {
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  color: #000;
}
</style>
