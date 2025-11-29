// e:\vue\Canvas\src\types\element.ts
/**
 * @file Defines the core data structures for canvas elements.
 * All elements on the canvas must conform to these types.
 */

export type ElementType = 'rectangle' | 'circle' | 'rounded-rectangle' | 'triangle' | 'image' | 'text';

export interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isSelected: boolean;
}

export interface TextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: TextSpan[];
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface RoundedRectangleElement extends BaseElement {
  type: 'rounded-rectangle';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  borderRadius: number;
}

export interface TriangleElement extends BaseElement {
  type: 'triangle';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  filters: {
    grayscale: boolean;
    blur: number;
    brightness: number;
  };
}

export type CanvasElement = RectangleElement | CircleElement | RoundedRectangleElement | TriangleElement | ImageElement | TextElement;

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

