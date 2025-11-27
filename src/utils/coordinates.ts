import { Container } from 'pixi.js';

/**
 * Converts a screen point to a world point.
 * @param screenPoint The point on the screen {x, y}.
 * @param stage The PixiJS Container (stage) acting as the world.
 * @returns The corresponding point in the world {x, y}.
 */
export function screenToWorld(screenPoint: { x: number; y: number }, stage: Container): { x: number; y: number } {
  return {
    x: (screenPoint.x - stage.x) / stage.scale.x,
    y: (screenPoint.y - stage.y) / stage.scale.y,
  };
}

/**
 * Converts a world point to a screen point.
 * @param worldPoint The point in the world {x, y}.
 * @param stage The PixiJS Container (stage) acting as the world.
 * @returns The corresponding point on the screen {x, y}.
 */
export function worldToScreen(worldPoint: { x: number; y: number }, stage: Container): { x: number; y: number } {
  return {
    x: (worldPoint.x * stage.scale.x) + stage.x,
    y: (worldPoint.y * stage.scale.y) + stage.y,
  };
}
