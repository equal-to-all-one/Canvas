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
  transform: 'translate(16px, -50%)', // Shift right by 16px, center vertically relative to point
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
  <div class="floating-panel" :style="style" @mousedown.stop @pointerdown.stop>
    
    <!-- Shape Tools -->
    <div v-if="isShape" class="panel-section">
      <div class="control-item">
        <div class="color-preview" :style="{ backgroundColor: shapeElement.fillColor }">
          <input type="color" :value="shapeElement.fillColor" @input="(e) => updateShape('fillColor', (e.target as HTMLInputElement).value)" />
        </div>
        <span class="label">Fill</span>
      </div>
      
      <div class="divider"></div>

      <div class="control-item">
        <div class="color-preview border-preview" :style="{ borderColor: shapeElement.strokeColor }">
          <input type="color" :value="shapeElement.strokeColor" @input="(e) => updateShape('strokeColor', (e.target as HTMLInputElement).value)" />
        </div>
        <input 
          type="number" 
          class="mini-input" 
          :value="shapeElement.strokeWidth" 
          @input="(e) => updateShape('strokeWidth', parseFloat((e.target as HTMLInputElement).value))" 
          min="0" 
        />
      </div>

      <template v-if="element.type === 'rounded-rectangle'">
        <div class="divider"></div>
        <div class="control-item">
          <span class="icon">R</span>
          <input 
            type="number" 
            class="mini-input" 
            :value="(element as RoundedRectangleElement).borderRadius" 
            @input="(e) => updateShape('borderRadius', parseFloat((e.target as HTMLInputElement).value))" 
            min="0" 
          />
        </div>
      </template>
    </div>

    <!-- Text Tools -->
    <div v-if="isText" class="panel-section vertical">
      <div class="row">
        <select 
          class="font-select"
          :value="textElement.fontFamily"
          @change="(e) => updateText('fontFamily', (e.target as HTMLSelectElement).value)"
        >
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Inter">Inter</option>
        </select>
      </div>
      <div class="row">
        <input 
          type="number" 
          class="mini-input" 
          :value="textElement.fontSize" 
          @input="(e) => updateText('fontSize', parseFloat((e.target as HTMLInputElement).value))" 
          min="8" 
        />
        <div class="color-group">
          <div class="color-preview" :style="{ backgroundColor: textElement.color }" title="Text Color">
            <input type="color" :value="textElement.color" @input="(e) => updateText('color', (e.target as HTMLInputElement).value)" />
          </div>
          <div class="color-preview" :style="{ backgroundColor: textElement.backgroundColor === 'transparent' ? '#fff' : textElement.backgroundColor, backgroundImage: textElement.backgroundColor === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }" title="Background Color">
            <input type="color" :value="textElement.backgroundColor === 'transparent' ? '#ffffff' : textElement.backgroundColor" @input="(e) => updateText('backgroundColor', (e.target as HTMLInputElement).value)" />
          </div>
        </div>
      </div>
      
      <div class="row button-group">
        <button :class="{ active: textElement.content.some(s => s.bold) }" @click="toggleFormat('bold')" title="Bold">B</button>
        <button :class="{ active: textElement.content.some(s => s.italic) }" @click="toggleFormat('italic')" title="Italic">I</button>
        <button :class="{ active: textElement.content.some(s => s.underline) }" @click="toggleFormat('underline')" title="Underline">U</button>
        <button :class="{ active: textElement.content.some(s => s.strikethrough) }" @click="toggleFormat('strikethrough')" title="Strikethrough" style="text-decoration: line-through;">S</button>
      </div>
    </div>

    <!-- Image Tools -->
    <div v-if="isImage" class="panel-section vertical">
      <div class="control-row">
        <span class="label">Blur</span>
        <input type="range" :value="imageElement.filters.blur" @input="(e) => updateImageFilters('blur', parseFloat((e.target as HTMLInputElement).value))" min="0" max="20" step="1" />
      </div>
      <div class="control-row">
        <span class="label">Bright</span>
        <input type="range" :value="imageElement.filters.brightness" @input="(e) => updateImageFilters('brightness', parseFloat((e.target as HTMLInputElement).value))" min="0" max="2" step="0.1" />
      </div>
      <div class="control-row">
        <label class="checkbox-label">
          <input type="checkbox" :checked="imageElement.filters.grayscale" @change="(e) => updateImageFilters('grayscale', (e.target as HTMLInputElement).checked)" />
          Grayscale
        </label>
      </div>
    </div>

  </div>
</template>

<style scoped>
.floating-panel {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 140px;
}

.panel-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-section.vertical {
  flex-direction: column;
  align-items: stretch;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.divider {
  width: 1px;
  height: 20px;
  background-color: var(--color-border);
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.color-preview.border-preview {
  background-color: transparent;
  border-width: 2px;
}

.color-preview input[type="color"] {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  opacity: 0;
  cursor: pointer;
}

.mini-input {
  width: 40px;
  height: 24px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0 4px;
  font-size: 12px;
  text-align: center;
  background-color: var(--color-bg);
  color: var(--color-text);
}

.mini-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.font-select {
  width: 100%;
  height: 24px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0 4px;
  font-size: 12px;
  background-color: var(--color-bg);
  color: var(--color-text);
  outline: none;
}

.font-select:focus {
  border-color: var(--color-primary);
}

.color-group {
  display: flex;
  gap: 4px;
}

.label {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.icon {
  font-size: 12px;
  font-weight: bold;
  color: var(--color-text-secondary);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.button-group {
  background-color: var(--color-bg);
  border-radius: 4px;
  padding: 2px;
  display: flex;
  justify-content: space-between;
}

.button-group button {
  flex: 1;
  border: none;
  background: transparent;
  border-radius: 3px;
  padding: 4px;
  font-size: 12px;
  font-weight: bold;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.button-group button:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.button-group button.active {
  background-color: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text);
  cursor: pointer;
}

input[type="range"] {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
  outline: none;
}
</style>
