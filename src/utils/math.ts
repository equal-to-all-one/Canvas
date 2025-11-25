// e:\vue\Canvas\src\utils\math.ts
/**
 * @file Contains mathematical utility functions for coordinate transformations and geometry.
 */

import { useCanvasStore } from '@/stores/canvasStore';

/**
 * Converts screen coordinates (e.g., mouse position) to world coordinates.
 * @param screenX - The x-coordinate on the screen.
 * @param screenY - The y-coordinate on the screen.
 * @returns The corresponding world coordinates { x, y }.
 */
export function screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
  const store = useCanvasStore();
  const pan = store.pan;
  const zoom = store.zoom;

  const worldX = (screenX - pan.x) / zoom;
  const worldY = (screenY - pan.y) / zoom;

  return { x: worldX, y: worldY };
}

/**
 * Converts world coordinates to screen coordinates.
 * @param worldX - The x-coordinate in the world.
 * @param worldY - The y-coordinate in the world.
 * @returns The corresponding screen coordinates { x, y }.
 */
export function worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
  const store = useCanvasStore();
  const pan = store.pan;
  const zoom = store.zoom;

  const screenX = worldX * zoom + pan.x;
  const screenY = worldY * zoom + pan.y;

  return { x: screenX, y: screenY };
}

/**
 * Checks if a point is inside a rectangle.
 * This basic implementation does not account for rotation.
 * @param point - The point to check { x, y }.
 * @param rect - The rectangle { x, y, width, height }.
 * @returns True if the point is inside the rectangle, false otherwise.
 */
export function isPointInRectangle(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}
