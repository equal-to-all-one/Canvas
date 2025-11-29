// e:\vue\Canvas\src\composables\useCanvasRenderer.ts
/**
 * @file Composable for initializing and managing the PixiJS application.
 */
import { onMounted, onUnmounted, shallowRef, type Ref } from 'vue';
import { Application } from 'pixi.js';

export function useCanvasRenderer(canvasContainer: Ref<HTMLDivElement | null>): { app: Ref<Application | null> } {
  const app = shallowRef<Application | null>(null);

  onMounted(async () => {
    if (canvasContainer.value) {
      // The application will create a renderer using WebGL, if possible,
      // with a fallback to a canvas render. It will also setup the ticker
      // and the root stage PIXI.Container
      const pixiApp = new Application();
      
      // Wait for the app to be created
      await pixiApp.init({
        background: '#1a1a1a',
        resizeTo: window,
      });

      // The application will create a canvas element for you that you
      // can then insert into the DOM
      canvasContainer.value.appendChild(pixiApp.canvas);
      
      app.value = pixiApp;
    }
  });

  onUnmounted(() => {
    app.value?.destroy(true, { children: true, texture: true });
  });

  return { app };
}
