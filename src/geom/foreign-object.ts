import { RenderMode } from '../RenderMode'
import { applyGlobalTransform, postProcessElement, RenderContext } from '../utils'

export function drawForeignObject(
  context: RenderContext,
  foreignObject: SVGForeignObjectElement,
  svgTransform: SVGTransform | null
): void {
  if (context.renderMode === RenderMode.CANVAS) {
    // TODO Support foreignObject in canvas rendering
    // Guess it should work to create an surrogate SVG for the foreignObject (with x,y,width,height)
    // and create an image-element from it, then use drawImage on the canvas.
    // To implement this, we'd need to make the draw methods async and await them, such that
    // we can wait for the image-element's 'load' event before processing subsequent nodes.
  } else {
    const foreignObjectClone = foreignObject.cloneNode(true) as SVGForeignObjectElement
    const container = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // foreignObject often relies on CSS styling, and just copying the <style> element
    // won't do the trick, because sketching the SVG rebuilds the entire element tree, thus
    // existing CSS rules don't apply anymore in most cases.
    //
    // To to make the MOST SIMPLE cases of foreignObject text elements work better,
    // try to apply the computed style on the new SVG container.
    // To properly fix it, we'd need to inline all computed styles recursively on the
    // foreignObject tree.

    const copyStyleProperties = [
      'color',
      'font-family',
      'font-size',
      'font-style',
      'font-variant',
      'font-weight'
    ]
    const style = getComputedStyle(foreignObject)
    for (const prop of copyStyleProperties) {
      container.style.setProperty(prop, style.getPropertyValue(prop))
    }

    // transform the foreignObject to its destination location
    applyGlobalTransform(context, svgTransform, container)
    container.appendChild(foreignObjectClone)
    postProcessElement(context, foreignObjectClone, container)
  }
}