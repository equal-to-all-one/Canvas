// e:\vue\Canvas\src\stores\canvasStore.ts
/**
 * @file Manages the state of the canvas, including elements, selection, and viewport.
 * This is the single source of truth for the canvas application.
 */
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement, DistributiveOmit } from '@/types/element';

// 定义 Store 中 state 的数据结构
interface CanvasState {
  elements: CanvasElement[];
  selectedElementIds: string[];
  zoom: number;
  pan: { x: number; y: number };
  activeTool: 'select' | 'rectangle' | 'circle' | 'rounded-rectangle' | 'triangle';
}

export const useCanvasStore = defineStore('canvas', {
  state: (): CanvasState => ({
    elements: [],
    selectedElementIds: [],
    zoom: 1,
    pan: { x: 0, y: 0 },
    activeTool: 'select',
  }),

  actions: {
    setActiveTool(tool: 'select' | 'rectangle' | 'circle' | 'rounded-rectangle' | 'triangle') {
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
      this.selectedElementIds = ids;
    },

    clearSelection() {
      this.selectedElementIds = [];
    },

    setZoom(newZoom: number) {
      // Add constraints if necessary
      this.zoom = newZoom;
    },

    setPan(newPan: { x: number; y: number }) {
      this.pan = newPan;
    },

    selectElement(id: string) {
      this.elements.forEach((el) => {
        el.isSelected = el.id === id;
      });
      this.selectedElementIds = [id];
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
  },

  getters: {
    selectedElements: (state): CanvasElement[] => {
      const selectedSet = new Set(state.selectedElementIds);
      return state.elements.filter((el: CanvasElement) => selectedSet.has(el.id));
    },
    getElement: (state) => {
      return (id: string) => state.elements.find((el: CanvasElement) => el.id === id);
    },
  },
});
