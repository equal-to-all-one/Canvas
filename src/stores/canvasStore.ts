// e:\vue\Canvas\src\stores\canvasStore.ts
/**
 * @file Manages the state of the canvas, including elements, selection, and viewport.
 * This is the single source of truth for the canvas application.
 */
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement } from '@/types/element';

// 定义 Store 中 state 的数据结构
interface CanvasState {
  elements: CanvasElement[];
  selectedElementIds: string[];
  zoom: number;
  pan: { x: number; y: number };
}

export const useCanvasStore = defineStore('canvas', {
  state: (): CanvasState => ({
    elements: [],
    selectedElementIds: [],
    zoom: 1,
    pan: { x: 0, y: 0 },
  }),

  actions: {
    /**
     * Adds a new element to the canvas.
     * Generates a unique ID for the element.
     * @param element - The element to add, without an ID.
     */
    addElement(element: Omit<CanvasElement, 'id'>) {
      const newElement: CanvasElement = {
        ...element,
        id: uuidv4(),
      };
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
