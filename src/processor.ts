import { applyClipPath } from './clipping'
import { getNodeChildren } from './dom-helpers'
import { drawCircle } from './geom/circle'
import { drawEllipse } from './geom/ellipse'
import { drawForeignObject } from './geom/foreign-object'
import { drawImage } from './geom/image'
import { drawLine } from './geom/line'
import { drawPath } from './geom/path'
import { drawPolygon } from './geom/polygon'
import { drawPolyline } from './geom/polyline'
import { Rectangle } from './geom/primitives'
import { drawRect } from './geom/rect'
import { drawText } from './geom/text'
import { drawUse } from './geom/use'
import { isHidden } from './styles/styles'
import { getCombinedTransform } from './transformation'
import { RenderContext } from './types'

/**
 * Traverses the SVG in DFS and draws each element to the canvas.
 * @param root either an SVG- or g-element
 * @param width Use elements can overwrite width
 * @param height Use elements can overwrite height
 */
export function processRoot(
  context: RenderContext,
  root: SVGSVGElement | SVGGElement | SVGSymbolElement | SVGMarkerElement | SVGElement,
  svgTransform: SVGTransform | null,
  width?: number,
  height?: number
): void {
  // traverse svg in DFS
  const stack: { element: SVGElement; transform: SVGTransform | null; viewBox: Rectangle }[] = []

  const currentViewBox: Rectangle = { x: 0, y: 0, w: width ?? 0, h: height ?? 0 }

  if (
    root instanceof SVGSVGElement ||
    root instanceof SVGSymbolElement ||
    root instanceof SVGMarkerElement
  ) {
    let rootX = 0
    let rootY = 0
    if (root instanceof SVGSymbolElement) {
      rootX = parseFloat(root.getAttribute('x') ?? '') || 0
      rootY = parseFloat(root.getAttribute('y') ?? '') || 0
      width = width ?? (parseFloat(root.getAttribute('width')!) || void 0)
      height = height ?? (parseFloat(root.getAttribute('height')!) || void 0)
    } else if (root instanceof SVGMarkerElement) {
      // markers use refX / refY which is applied after user-space transformation
      const mw = root.getAttribute('markerWidth')
      const mh = root.getAttribute('markerHeight')
      width = mw !== null ? parseFloat(mw) : 3 // marker-size is 3 by SVG spec
      height = mh !== null ? parseFloat(mh) : 3
    } else if (root !== context.sourceSvg) {
      // apply translation of nested elements
      rootX = root.x.baseVal.value
      rootY = root.y.baseVal.value
    }

    let rootTransform = context.sourceSvg.createSVGMatrix()

    if (root.getAttribute('viewBox')) {
      const {
        x: viewBoxX,
        y: viewBoxY,
        width: viewBoxWidth,
        height: viewBoxHeight
      } = root.viewBox.baseVal

      currentViewBox.x = viewBoxX
      currentViewBox.y = viewBoxY
      currentViewBox.w = viewBoxWidth
      currentViewBox.h = viewBoxHeight

      if (typeof width !== 'undefined' && typeof height !== 'undefined') {
        // viewBox values might scale the SVGs content
        const sx = width / viewBoxWidth
        const sy = height / viewBoxHeight
        const centerviewportX = rootX + width * 0.5
        const centerviewportY = rootY + height * 0.5
        const centerViewBoxX = viewBoxX + viewBoxWidth * 0.5
        const centerViewBoxY = viewBoxY + viewBoxHeight * 0.5
        // only support scaling from the center, e.g. xMidYMid
        rootTransform = rootTransform.translate(centerviewportX, centerviewportY)
        if (root.getAttribute('preserveAspectRatio') === 'none') {
          rootTransform = rootTransform.scaleNonUniform(sx, sy)
        } else {
          rootTransform = rootTransform.scale(Math.min(sx, sy))
        }
        rootTransform = rootTransform.translate(-centerViewBoxX, -centerViewBoxY)
      }
    } else {
      rootTransform = rootTransform.translate(rootX, rootY)
    }

    if (root instanceof SVGMarkerElement) {
      // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/refX#symbol
      // ref coordinates are interpreted as being in the coordinate system of the element contents,
      // after application of the viewBox and preserveAspectRatio attributes.
      rootTransform = rootTransform.translate(-root.refX.baseVal.value, -root.refY.baseVal.value)
    }

    const combinedMatrix = svgTransform
      ? svgTransform.matrix.multiply(rootTransform)
      : rootTransform
    svgTransform = context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix)

    // don't put the SVG itself into the stack, so start with the children of it
    const children = getNodeChildren(root)
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i] as SVGGraphicsElement
      if (child instanceof SVGSymbolElement || child instanceof SVGMarkerElement) {
        // symbols and marker can only be instantiated by specific elements
        continue
      }
      const childTransform = getCombinedTransform(context, child, svgTransform)
      stack.push({ element: child, transform: childTransform, viewBox: currentViewBox })
    }
  } else {
    stack.push({ element: root, transform: svgTransform, viewBox: currentViewBox })
  }

  while (stack.length > 0) {
    const { element, transform, viewBox } = stack.pop()!

    // maybe draw the element
    try {
      context.viewBox = viewBox
      drawElement(context, element, transform)
    } catch (e) {
      console.error(e)
    }

    if (
      element.tagName === 'defs' ||
      element.tagName === 'symbol' ||
      element.tagName === 'marker' ||
      element.tagName === 'svg' ||
      element.tagName === 'clipPath'
    ) {
      // Defs are prepocessed separately.
      // Symbols and marker can only be instantiated by specific elements.
      // Don't traverse the SVG element itself. This is done by drawElement -> processRoot.
      // ClipPaths are not drawn and processed separately.
      continue
    }
    // process children
    const children = getNodeChildren(element)
    for (let i = children.length - 1; i >= 0; i--) {
      const childElement = children[i] as SVGGraphicsElement
      const newTransform = getCombinedTransform(context, childElement, transform)
      stack.push({ element: childElement, transform: newTransform, viewBox })
    }
  }
}

export function drawRoot(
  context: RenderContext,
  element: SVGSVGElement | SVGSymbolElement,
  svgTransform: SVGTransform | null
): void {
  let width: number | undefined = parseFloat(element.getAttribute('width')!)
  let height: number | undefined = parseFloat(element.getAttribute('height')!)
  if (isNaN(width) || isNaN(height)) {
    // use only if both are set
    width = height = undefined
  }
  processRoot(context, element, svgTransform, width, height)
}

/**
 * The main switch to delegate drawing of `SVGElement`s
 * to different subroutines.
 */
function drawElement(
  context: RenderContext,
  element: SVGElement,
  svgTransform: SVGTransform | null
): void {
  if (isHidden(element)) {
    // just skip hidden elements
    return
  }

  // possibly apply a clip on the canvas before drawing on it
  const clipPath = element.getAttribute('clip-path')
  if (clipPath) {
    applyClipPath(context, element, clipPath, svgTransform)
  }

  switch (element.tagName) {
    case 'svg':
    case 'symbol':
      drawRoot(context, element as SVGSVGElement | SVGSymbolElement, svgTransform)
      break
    case 'rect':
      drawRect(context, element as SVGRectElement, svgTransform)
      break
    case 'path':
      drawPath(context, element as SVGPathElement, svgTransform)
      break
    case 'use':
      drawUse(context, element as SVGUseElement, svgTransform)
      break
    case 'line':
      drawLine(context, element as SVGLineElement, svgTransform)
      break
    case 'circle':
      drawCircle(context, element as SVGCircleElement, svgTransform)
      break
    case 'ellipse':
      drawEllipse(context, element as SVGEllipseElement, svgTransform)
      break
    case 'polyline':
      drawPolyline(context, element as SVGPolylineElement, svgTransform)
      break
    case 'polygon':
      drawPolygon(context, element as SVGPolygonElement, svgTransform)
      break
    case 'text':
      drawText(context, element as SVGTextElement, svgTransform)
      break
    case 'image':
      drawImage(context, element as SVGImageElement, svgTransform)
      break
    case 'foreignObject':
      drawForeignObject(context, element as SVGForeignObjectElement, svgTransform)
      break
  }
}
