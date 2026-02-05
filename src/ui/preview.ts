import { Renderer } from '../renderer';

/**
 * Initializes the WebGL preview in the container.
 * Returns the renderer instance.
 */
export function createPreview(container: HTMLElement): Renderer {
  return new Renderer(container);
}
