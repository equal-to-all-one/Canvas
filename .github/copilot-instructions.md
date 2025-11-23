# Development Guide for AI Assistants

This document provides essential guidelines for contributing to this project. Following these rules is crucial for maintaining code quality and architectural integrity.

## 1. Project Overview & Architecture

The goal is to build a web-based canvas application, similar to a simplified Figma or Excalidraw. The architecture emphasizes a clean separation of concerns:

-   **Core Framework**: Vue 3 (Composition API) with TypeScript.
-   **Rendering Engine**: PixiJS (v7/v8) is used *exclusively* for low-level graphics rendering.
    -   **Constraint**: Do not use high-level graphics libraries like `fabric.js` or `konva`. Interaction logic, such as viewport manipulation (zoom/pan), must be implemented manually without plugins like `pixi-viewport`.
-   **State Management**: Pinia manages all application state, including the list of canvas elements and UI state (e.g., selected items, zoom level).
-   **Build Tool**: Vite.

The codebase is structured as follows:
-   `src/components/`: Vue components for the UI. These should only display data and emit user events. **No business logic here.**
-   `src/stores/`: Pinia stores that hold the application state. This is the single source of truth.
-   `src/utils/` or `src/composables/`: Pure TypeScript functions for core logic, such as geometric calculations, coordinate transformations, and hit detection.

## 2. Core Data Structures

All canvas elements must conform to the established data structures. When creating or modifying elements, use these types. The central type is `CanvasElement`.

```typescript
// Located in types/element.ts (or a similar path)
export type ElementType = 'rectangle' | 'circle' | 'text' | 'image';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // Absolute world coordinate
  y: number; // Absolute world coordinate
  width: number;
  height: number;
  rotation: number;
}

export interface ShapeStyle {
  fillColor: string; // Hex format, e.g., #FF0000
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

// ... other style interfaces

// The unified type for any element on the canvas
export type CanvasElement = BaseElement & ShapeStyle & /* ...other styles */ ;
```

## 3. Key Implementation Patterns

### Infinite Canvas
-   **Technique**: Manipulate the `scale` and `position` of the root PixiJS `Container` (the stage) to implement zooming and panning.
-   **Coordinate System**: All element positions (`x`, `y`) are stored in **world coordinates**. You must use helper functions to convert between screen (mouse) coordinates and world coordinates.
    -   `screenToWorld(screenX, screenY)`: Converts mouse position to a point on the canvas.
    -   `worldToScreen(worldX, worldY)`: Converts a point on the canvas to its position on the screen.

### Rendering and Interaction
-   **Rendering Loop**: The rendering logic should be driven by changes in the Pinia store. When the `elements` array in the store changes, the PixiJS stage should be re-rendered to reflect the new state.
-   **Performance**: To avoid re-creating PixiJS objects on every render, use a `Map<elementId, PixiObject>` to cache and update existing graphics instances.
-   **Hit Detection**: Element selection is handled by listening to a `pointerdown` event on the main canvas. Your logic should then iterate through the elements in the store to determine which one was clicked, using a function like `isPointInRectangle()`.

## 4. Coding and Style Rules

-   **TypeScript First**: **Strictly no `any` types.** Define interfaces for all data structures. Vue component `props` and `emits` must be fully typed.
-   **Clarity**: Prefer explicit and clear code over overly clever shortcuts.
-   **Comments**:
    -   Add a header comment to each file explaining its purpose.
    -   Document complex functions, especially those involving mathematical calculations (e.g., coordinate transformations).
-   **File Paths**: When providing code, always include the full, correct file path (e.g., `src/stores/canvasStore.ts`).
