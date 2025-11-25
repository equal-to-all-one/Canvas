// e:\vue\Canvas\src\types\element.ts
/**
 * @file Defines the core data structures for canvas elements.
 * All elements on the canvas must conform to these types.
 */

export type ElementType = 'rectangle' | 'circle' | 'text' | 'image';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // Absolute world coordinate
  y: number; // Absolute world coordinate
  width: number;
  height: number;
  rotation: number; // In radians
  isSelected?: boolean; // UI state, managed by store or component
}

export interface ShapeStyle {
  fillColor: string; // Hex format, e.g., #FF0000
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface TextStyle {
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
}

// The unified type for any element on the canvas
// Using Partial for TextStyle and a potential src for images
export type CanvasElement = BaseElement & ShapeStyle & Partial<TextStyle> & { src?: string };
