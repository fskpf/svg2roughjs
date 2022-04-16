import { appendPatternPaint } from '../styles/pattern'
import { parseStyleConfig } from '../styles/styles'
import {
  applyGlobalTransform,
  applyMatrix,
  isIdentityTransform,
  isTranslationTransform
} from '../transformation'
import { RenderContext } from '../types'
import { appendSketchElement, sketchPath } from '../utils'
import { str } from './primitives'

export function drawCircle(
  context: RenderContext,
  circle: SVGCircleElement,
  svgTransform: SVGTransform | null
): void {
  const cx = circle.cx.baseVal.value
  const cy = circle.cy.baseVal.value
  const r = circle.r.baseVal.value

  if (r === 0) {
    // zero-radius circle is not rendered
    return
  }

  const center = applyMatrix({ x: cx, y: cy }, svgTransform)
  const radiusPoint = applyMatrix({ x: cx + r, y: cy + r }, svgTransform)
  const transformedRadius = radiusPoint.x - center.x

  let result
  if (isIdentityTransform(svgTransform) || isTranslationTransform(svgTransform)) {
    // transform a point on the ellipse to get the transformed radius
    result = context.rc.circle(center.x, center.y, 2 * transformedRadius, {
      ...parseStyleConfig(context, circle, svgTransform),
      preserveVertices: true
    })
  } else {
    // in other cases we need to construct the path manually.
    const factor = (4 / 3) * (Math.sqrt(2) - 1)
    const p1 = applyMatrix({ x: cx + r, y: cy }, svgTransform)
    const p2 = applyMatrix({ x: cx, y: cy + r }, svgTransform)
    const p3 = applyMatrix({ x: cx - r, y: cy }, svgTransform)
    const p4 = applyMatrix({ x: cx, y: cy - r }, svgTransform)
    const c1 = applyMatrix({ x: cx + r, y: cy + factor * r }, svgTransform)
    const c2 = applyMatrix({ x: cx + factor * r, y: cy + r }, svgTransform)
    const c4 = applyMatrix({ x: cx - r, y: cy + factor * r }, svgTransform)
    const c6 = applyMatrix({ x: cx - factor * r, y: cy - r }, svgTransform)
    const c8 = applyMatrix({ x: cx + r, y: cy - factor * r }, svgTransform)
    const path = `M ${str(p1)} C ${str(c1)} ${str(c2)} ${str(p2)} S ${str(c4)} ${str(p3)} S ${str(
      c6
    )} ${str(p4)} S ${str(c8)} ${str(p1)}z`
    result = sketchPath(context, path, parseStyleConfig(context, circle, svgTransform))
  }

  appendPatternPaint(context, circle, () => {
    const proxy = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    proxy.cx.baseVal.value = center.x
    proxy.cy.baseVal.value = center.y
    proxy.r.baseVal.value = transformedRadius
    return proxy
  })
  appendSketchElement(context, circle, result)
}

export function applyCircleClip(
  context: RenderContext,
  circle: SVGCircleElement,
  container: SVGClipPathElement,
  svgTransform: SVGTransform | null
): void {
  const cx = circle.cx.baseVal.value
  const cy = circle.cy.baseVal.value
  const r = circle.r.baseVal.value

  if (r === 0) {
    // zero-radius circle is not rendered
    return
  }

  const clip = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  clip.cx.baseVal.value = cx
  clip.cy.baseVal.value = cy
  clip.r.baseVal.value = r
  applyGlobalTransform(context, svgTransform, clip)
  container.appendChild(clip)
}
