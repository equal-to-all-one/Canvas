// e:\vue\Canvas\src\composables\useCanvasRenderer.ts
/**
 * @file Composable for initializing and managing the PixiJS application.
 */
import { onMounted, onUnmounted, shallowRef, type Ref } from 'vue';
import { Application, Graphics } from 'pixi.js';
import { useCanvasStore } from '@/stores/canvasStore';

export function useCanvasRenderer(canvasContainer: Ref<HTMLDivElement | null>): { app: Ref<Application | null> } {
  const app = shallowRef<Application | null>(null);
  const canvasStore = useCanvasStore();

  let unwatch: () => void;

  onMounted(async () => {
    if (canvasContainer.value) {
      // The application will create a renderer using WebGL, if possible,
      // with a fallback to a canvas render. It will also setup the ticker
      // and the root stage PIXI.Container
      app.value = new Application();
      
      // Wait for the app to be created
      await app.value.init({
        background: '#1099bb',
        resizeTo: canvasContainer.value,
      });

      // The application will create a canvas element for you that you
      // can then insert into the DOM
      canvasContainer.value.appendChild(app.value.canvas);

      // Watch for state changes
      unwatch = canvasStore.$subscribe(() => {
        renderCanvas();
      });

      renderCanvas(); // Initial render
    }
  });

  onUnmounted(() => {
    if (unwatch) {
      unwatch();
    }
    app.value?.destroy(true, { children: true, texture: true });
  });

  const renderCanvas = () => {
    if (!app.value) return;

    // Clear the stage
    app.value.stage.removeChildren();

    // Update stage transform from store
    app.value.stage.scale.set(canvasStore.zoom);
    app.value.stage.position.set(canvasStore.pan.x, canvasStore.pan.y);

    // Re-draw all elements
    // This is inefficient. A cache should be used as per the guidelines.
    // This is just a skeleton.
    canvasStore.elements.forEach(element => {
      const graphics = new Graphics();
      // Set transform
      graphics.position.set(element.x, element.y);
      graphics.rotation = element.rotation;
      
      if (element.type === 'rectangle') {
        graphics.rect(0, 0, element.width, element.height);
      } else if (element.type === 'circle') {
        graphics.circle(0, 0, element.width / 2);
      }

      // Set style
      graphics.fill({ color: element.fillColor, alpha: element.opacity });
      graphics.stroke({ width: element.strokeWidth, color: element.strokeColor });

      app.value?.stage.addChild(graphics);
    });
  };

  return { app };
}
