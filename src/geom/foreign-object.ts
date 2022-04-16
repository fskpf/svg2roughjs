import { applyGlobalTransform } from '../transformation'
import { RenderContext } from '../types'
import { appendSketchElement } from '../utils'

export function drawForeignObject(
  context: RenderContext,
  foreignObject: SVGForeignObjectElement,
  svgTransform: SVGTransform | null
): void {
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

  // transform is already considered in svgTransform
  foreignObjectClone.transform.baseVal.clear()

  // transform the foreignObject to its destination location
  applyGlobalTransform(context, svgTransform, container)
  container.appendChild(foreignObjectClone)
  appendSketchElement(context, foreignObjectClone, container)
}
