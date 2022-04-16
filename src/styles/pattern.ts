import { getIdFromUrl, reparentNodes } from '../dom-helpers'
import { RenderContext } from '../types'
import { appendSketchElement, getDefsElement, sketchFragment } from '../utils'
import { getEffectiveAttribute } from './effective-attributes'

/**
 * If the input element has a pattern stroke/fill, an additional element is added to the result,
 * which just provides the pattern storke/fill.
 * @param patternProxyCreator Should return the transformed `SVGElement` that holds the stroke/fill pattern.
 */
export function appendPatternPaint(
  context: RenderContext,
  sourceElement: SVGElement,
  patternProxyCreator: () => SVGElement
): void {
  const { fillId, strokeId } = getPatternPaintIds(context, sourceElement)
  if (fillId !== null || strokeId !== null) {
    // the additional element that should provide the pattern
    const patternProxy = patternProxyCreator()
    patternProxy.setAttribute('fill', fillId !== null ? `url(#${fillId})` : 'none')
    patternProxy.setAttribute('stroke', strokeId !== null ? `url(#${strokeId})` : 'none')

    const strokeWidth = getEffectiveAttribute(
      context,
      sourceElement,
      'stroke-width',
      context.useElementContext
    )
    patternProxy.setAttribute('stroke-width', strokeWidth ?? '0')

    // append the proxy
    appendSketchElement(context, sourceElement, patternProxy)

    // add the pattern defs
    appendPatternDefsElement(context, fillId)
    appendPatternDefsElement(context, strokeId)
  }
}

/**
 * Returns the element's referenced fill and stroke pattern ids if there are any.
 */
function getPatternPaintIds(
  context: RenderContext,
  element: SVGElement
): { fillId: string | null; strokeId: string | null } {
  function getPatternId(attributeName: string): string | null {
    const attr = element.getAttribute(attributeName)
    if (attr && attr.indexOf('url') !== -1) {
      const id = getIdFromUrl(attr)
      if (id) {
        const paint = context.idElements[id]
        if (paint instanceof SVGPatternElement) {
          return id
        }
      }
    }
    return null
  }
  return { fillId: getPatternId('fill'), strokeId: getPatternId('stroke') }
}

/**
 * Obtains the pattern fill element from the source SVG and provides it as defs element
 * in the output sketch element if missing.
 */
function appendPatternDefsElement(context: RenderContext, patternId: string | null): void {
  if (patternId === null) {
    return
  }

  const sketchDefs = getDefsElement(context)
  const defId = `#${patternId}`
  if (!sketchDefs.querySelector(defId)) {
    const sourceDefElement = context.sourceSvg.querySelector(defId) as SVGPatternElement
    if (sourceDefElement) {
      if (!context.sketchPatterns) {
        // just copy the pattern to the output
        sketchDefs.appendChild(sourceDefElement.cloneNode(true))
        return
      }

      // create a proxy for the pattern element to be sketched separately
      const patternElement = reparentNodes(
        document.createElementNS('http://www.w3.org/2000/svg', 'g'),
        sourceDefElement.cloneNode(true) as SVGPatternElement
      )

      // sketch the pattern separately from the main processor loop
      const sketchPattern = sketchFragment(context, patternElement, {
        // patterns usually don't benefit from too crazy sketch values due to their base-size
        fillStyle: 'solid',
        roughness: 0.5 // TODO ideally this should scale with the pattern's size
      })

      // move the result into an copy of the original def element
      const defElementRoot = sourceDefElement.cloneNode() as SVGPatternElement
      sketchDefs.appendChild(reparentNodes(defElementRoot, sketchPattern))
    }
  }
}
