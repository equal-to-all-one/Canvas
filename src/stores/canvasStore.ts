// e:\vue\Canvas\src\stores\canvasStore.ts
/**
 * @file Manages the state of the canvas, including elements, selection, and viewport.
 * This is the single source of truth for the canvas application.
 */
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement, DistributiveOmit, TextElement, TextSpan } from '@/types/element';

// 定义 Store 中 state 的数据结构
interface CanvasState {
  elements: CanvasElement[];
  selectedElementIds: string[];
  zoom: number;
  pan: { x: number; y: number };
  activeTool: 'select' | 'rectangle' | 'circle' | 'rounded-rectangle' | 'triangle' | 'text';
  pasteCount: number;
}

export const useCanvasStore = defineStore('canvas', {
  state: (): CanvasState => ({
    elements: [],
    selectedElementIds: [],
    zoom: 1,
    pan: { x: 0, y: 0 },
    activeTool: 'select',
    pasteCount: 1,
  }),

  actions: {
    setActiveTool(tool: 'select' | 'rectangle' | 'circle' | 'rounded-rectangle' | 'triangle' | 'text') {
      this.activeTool = tool;
    },

    /**
     * Adds a new element to the canvas.
     * Generates a unique ID for the element.
     * @param element - The element to add, without an ID.
     */
    addElement(element: DistributiveOmit<CanvasElement, 'id'>) {
      // @ts-ignore - TS doesn't like spreading a union type, but it's safe here
      const newElement: CanvasElement = {
        ...element,
        id: uuidv4(),
        isSelected: false,
      } as CanvasElement;
      this.elements.push(newElement);
    },

    removeElement(elementId: string) {
      this.elements = this.elements.filter((el: CanvasElement) => el.id !== elementId);
    },

    setSelectedElements(ids: string[]) {
      // Atomically replace the selection and update element.isSelected flags
      this.selectedElementIds = ids.slice();
      // Ensure element.isSelected reflects current selection
      this.elements.forEach((el) => {
        el.isSelected = this.selectedElementIds.includes(el.id);
      });
    },

    clearSelection() {
      this.setSelectedElements([]);
    },

    // Optional helpers for shift-select behavior
    addToSelection(ids: string[]) {
      const set = new Set(this.selectedElementIds);
      ids.forEach(id => set.add(id));
      this.setSelectedElements(Array.from(set));
    },

    removeFromSelection(ids: string[]) {
      const removeSet = new Set(ids);
      const remaining = this.selectedElementIds.filter(id => !removeSet.has(id));
      this.setSelectedElements(remaining);
    },

    setZoom(newZoom: number) {
      // Add constraints if necessary
      this.zoom = newZoom;
    },

    setPan(newPan: { x: number; y: number }) {
      this.pan = newPan;
    },

    selectElement(id: string) {
      // Backwards-compatible helper: select a single element
      this.setSelectedElements([id]);
    },

    deselectAllElements() {
      this.elements.forEach((el) => {
        el.isSelected = false;
      });
      this.selectedElementIds = [];
    },

    updateElementTransform(id: string, updates: Partial<CanvasElement>) {
      const element = this.elements.find((el) => el.id === id);
      if (element) {
        Object.assign(element, updates);
      }
    },

    addImageElement(src: string) {
      const newElement: CanvasElement = {
        id: uuidv4(),
        type: 'image',
        x: 100,
        y: 100,
        width: 200, // Default width, will be updated after load if needed or kept as is
        height: 200, // Default height
        rotation: 0,
        isSelected: false,
        src,
        filters: {
          grayscale: false,
          blur: 0,
          brightness: 1,
        },
      };
      this.elements.push(newElement);
    },

    updateImageFilters(id: string, filters: Partial<{ grayscale: boolean; blur: number; brightness: number }>) {
      const element = this.elements.find((el) => el.id === id);
      if (element && element.type === 'image') {
        Object.assign(element.filters, filters);
      }
    },

    addTextElement(x?: number, y?: number) {
      // Add a random offset to prevent stacking if no position provided
      const offset = Math.random() * 100 - 50; // -50 to +50
      console.log('Adding text element with offset:', offset);
      
      const newElement: CanvasElement = {
        id: uuidv4(),
        type: 'text',
        x: x ?? (400 + offset),
        y: y ?? (300 + offset),
        width: 200,
        height: 30,
        rotation: 0,
        isSelected: false,
        content: [{ text: 'Double click to edit' }],
        fontFamily: 'Arial',
        fontSize: 24,
        color: '#000000',
        backgroundColor: 'transparent',
      };
      this.elements.push(newElement);
    },

    updateTextElement(id: string, updates: Partial<TextElement>) {
      const element = this.elements.find((el) => el.id === id);
      if (element && element.type === 'text') {
        Object.assign(element, updates);
      }
    },

    deleteSelectedElements() {
      if (this.selectedElementIds.length === 0) return;
      
      // Filter out selected elements
      this.elements = this.elements.filter(el => !this.selectedElementIds.includes(el.id));
      
      // Clear selection
      this.clearSelection();
    },

    updateElementsPositions(positions: { id: string, x: number, y: number }[]) {
      const elementMap = new Map(this.elements.map(el => [el.id, el]));
      
      positions.forEach(pos => {
        const element = elementMap.get(pos.id);
        if (element) {
          element.x = pos.x;
          element.y = pos.y;
        }
      });
    },

    toggleTextFormatting(id: string, format: 'bold' | 'italic' | 'underline' | 'strikethrough') {
      const element = this.elements.find((el) => el.id === id);
      if (element && element.type === 'text') {
        const textElement = element as TextElement;
        // Check if all spans currently have this format enabled
        const allTrue = textElement.content.every(span => span[format]);
        const newValue = !allTrue;
        
        // Apply to all spans
        textElement.content = textElement.content.map(span => ({
          ...span,
          [format]: newValue
        }));
      }
    },

    setElements(elements: CanvasElement[]) {
      this.elements = elements;
    },

    copyToClipboard() {
      const selected = this.selectedElements;
      if (selected.length === 0) return;
      localStorage.setItem('canvas-clipboard', JSON.stringify(selected));
      // Reset paste count on new copy
      this.pasteCount = 1;
    },

    pasteFromClipboard(cursorPosition?: { x: number, y: number }) {
      const clipboardData = localStorage.getItem('canvas-clipboard');
      if (!clipboardData) return;

      try {
        const elements = JSON.parse(clipboardData) as CanvasElement[];
        console.log('Pasting elements:', elements.length, 'Cursor:', cursorPosition);
        if (!Array.isArray(elements) || elements.length === 0) return;

        let dx = 0;
        let dy = 0;

        if (cursorPosition) {
          // Calculate bounding box of copied elements
          let minX = Infinity, minY = Infinity;
          let maxX = -Infinity, maxY = -Infinity;
          
          elements.forEach(el => {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x + el.width);
            maxY = Math.max(maxY, el.y + el.height);
          });

          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;

          // Convert screen cursor position to world coordinates
          const worldX = (cursorPosition.x - this.pan.x) / this.zoom;
          const worldY = (cursorPosition.y - this.pan.y) / this.zoom;

          console.log('Paste World Pos:', worldX, worldY, 'Center:', centerX, centerY);

          dx = worldX - centerX;
          dy = worldY - centerY;
        } else {
          // Default offset behavior
          dx = 20 * this.pasteCount;
          dy = 20 * this.pasteCount;
        }

        const newElements = elements.map(el => {
          // @ts-ignore
          const newEl: CanvasElement = {
            ...el,
            id: uuidv4(),
            x: el.x + dx,
            y: el.y + dy,
            isSelected: true // Select the new elements
          };
          return newEl;
        });

        // Deselect current
        this.clearSelection();

        // Add new elements
        this.elements.push(...newElements);

        // Select new elements
        this.selectedElementIds = newElements.map(el => el.id);
        
        // Increment paste count for next paste (only if not using cursor position)
        if (!cursorPosition) {
          this.pasteCount++;
        }

      } catch (e) {
        console.error('Failed to paste from clipboard', e);
      }
    },
  },

  getters: {
    selectedElements: (state): CanvasElement[] => {
      const selectedSet = new Set(state.selectedElementIds);
      return state.elements.filter((el: CanvasElement) => selectedSet.has(el.id));
    },
    selectionBoundingBox: (state) => {
      return () => {
        if (!state.selectedElementIds || state.selectedElementIds.length === 0) return null;

        const selected = state.elements.filter(el => state.selectedElementIds.includes(el.id));
        if (selected.length === 0) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        selected.forEach(el => {
          const x1 = el.x;
          const y1 = el.y;
          const x2 = el.x + (el.width ?? 0);
          const y2 = el.y + (el.height ?? 0);

          minX = Math.min(minX, x1);
          minY = Math.min(minY, y1);
          maxX = Math.max(maxX, x2);
          maxY = Math.max(maxY, y2);
        });

        return {
          x: minX,
          y: minY,
          width: Math.max(0, maxX - minX),
          height: Math.max(0, maxY - minY),
        };
      };
    },
    getElement: (state) => {
      return (id: string) => state.elements.find((el: CanvasElement) => el.id === id);
    },
  },
});
