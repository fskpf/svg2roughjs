import { applyCircleClip } from './geom/circle'
import { applyEllipseClip } from './geom/ellipse'
import { applyPolygonClip } from './geom/polygon'
import { applyRectClip } from './geom/rect'
import { RenderMode } from './RenderMode'
import {
  getCombinedTransform,
  getDefsElement,
  getIdFromUrl,
  getNodeChildren,
  RenderContext
} from './utils'

/**
 * Applies the clip-path to the CanvasContext.
 */
export function applyClipPath(
  context: RenderContext,
  owner: SVGElement,
  clipPathAttr: string,
  svgTransform: SVGTransform | null
): void {
  const id = getIdFromUrl(clipPathAttr)
  if (!id) {
    return
  }

  const clipPath = context.idElements[id] as SVGElement
  if (!clipPath) {
    return
  }

  // TODO clipPath: consider clipPathUnits
  let clipContainer: SVGClipPathElement | null = null
  // for canvas rendering, we just apply the clip to the CanvasContext
  const targetCtx = context.targetCanvasContext
  // for SVG output, we create clipPath defs
  const targetDefs = context.targetSvg ? getDefsElement(context.targetSvg) : null
  if (context.renderMode === RenderMode.CANVAS && targetCtx) {
    // for a canvas, we just apply a 'ctx.clip()' path
    targetCtx.beginPath()
  } else if (targetDefs) {
    // unfortunately, we cannot reuse clip-paths due to the 'global transform' approach
    const sketchClipPathId = `${id}_${targetDefs.childElementCount}`
    clipContainer = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
    clipContainer.id = sketchClipPathId
    // remember the new id by storing it on the owner element
    owner.setAttribute('data-sketchy-clip-path', sketchClipPathId)
  }

  // traverse clip-path elements in DFS
  const stack: { element: SVGElement; transform: SVGTransform | null }[] = []
  const children = getNodeChildren(clipPath)
  for (let i = children.length - 1; i >= 0; i--) {
    const childElement = children[i] as SVGGraphicsElement
    const childTransform = getCombinedTransform(context, childElement, svgTransform)
    stack.push({ element: childElement, transform: childTransform })
  }

  while (stack.length > 0) {
    const { element, transform } = stack.pop()!

    try {
      applyElementClip(context, element, clipContainer, transform)
    } catch (e) {
      console.error(e)
    }

    if (
      element.tagName === 'defs' ||
      element.tagName === 'svg' ||
      element.tagName === 'clipPath' ||
      element.tagName === 'text'
    ) {
      // some elements are ignored on clippaths
      continue
    }
    // process children
    const children = getNodeChildren(element)
    for (let i = children.length - 1; i >= 0; i--) {
      const childElement = children[i] as SVGGraphicsElement
      const childTransform = getCombinedTransform(context, childElement, transform)
      stack.push({ element: childElement, transform: childTransform })
    }
  }

  if (context.renderMode === RenderMode.CANVAS && targetCtx) {
    targetCtx.clip()
  } else if (targetDefs && clipContainer) {
    if (clipContainer.childNodes.length > 0) {
      // add the clip-path only if it contains converted elements
      // some elements are not yet supported
      targetDefs.appendChild(clipContainer)
    }
  }
}

/**
 * Applies the element as clip to the CanvasContext.
 */
function applyElementClip(
  context: RenderContext,
  element: SVGElement,
  container: SVGClipPathElement | null,
  svgTransform: SVGTransform | null
) {
  switch (element.tagName) {
    case 'rect':
      applyRectClip(context, element as SVGRectElement, container, svgTransform)
      break
    case 'circle':
      applyCircleClip(context, element as SVGCircleElement, container, svgTransform)
      break
    case 'ellipse':
      applyEllipseClip(context, element as SVGEllipseElement, container, svgTransform)
      break
    case 'polygon':
      applyPolygonClip(context, element as SVGPolygonElement, container, svgTransform)
      break
    // TODO clipPath: more elements
  }
}
