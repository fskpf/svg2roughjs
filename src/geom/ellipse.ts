import { Point } from './point'
import {
  RenderContext,
  isIdentityTransform,
  isTranslationTransform,
  applyMatrix,
  sketchPath,
  postProcessElement,
  applyGlobalTransform
} from '../utils'
import { parseStyleConfig } from '../styles/styles'

export function drawEllipse(
  context: RenderContext,
  ellipse: SVGEllipseElement,
  svgTransform: SVGTransform | null
): void {
  const cx = ellipse.cx.baseVal.value
  const cy = ellipse.cy.baseVal.value
  const rx = ellipse.rx.baseVal.value
  const ry = ellipse.ry.baseVal.value

  if (rx === 0 || ry === 0) {
    // zero-radius ellipse is not rendered
    return
  }

  let result
  if (isIdentityTransform(svgTransform) || isTranslationTransform(svgTransform)) {
    // Simple case, there's no transform and we can use the ellipse command
    const center = applyMatrix(new Point(cx, cy), svgTransform)
    // transform a point on the ellipse to get the transformed radius
    const radiusPoint = applyMatrix(new Point(cx + rx, cy + ry), svgTransform)
    const transformedWidth = 2 * (radiusPoint.x - center.x)
    const transformedHeight = 2 * (radiusPoint.y - center.y)
    result = context.rc.ellipse(center.x, center.y, transformedWidth, transformedHeight, {
      ...parseStyleConfig(context, ellipse, svgTransform),
      preserveVertices: true
    })
  } else {
    // in other cases we need to construct the path manually.
    const factor = (4 / 3) * (Math.sqrt(2) - 1)
    const p1 = applyMatrix(new Point(cx + rx, cy), svgTransform)
    const p2 = applyMatrix(new Point(cx, cy + ry), svgTransform)
    const p3 = applyMatrix(new Point(cx - rx, cy), svgTransform)
    const p4 = applyMatrix(new Point(cx, cy - ry), svgTransform)
    const c1 = applyMatrix(new Point(cx + rx, cy + factor * ry), svgTransform)
    const c2 = applyMatrix(new Point(cx + factor * rx, cy + ry), svgTransform)
    const c4 = applyMatrix(new Point(cx - rx, cy + factor * ry), svgTransform)
    const c6 = applyMatrix(new Point(cx - factor * rx, cy - ry), svgTransform)
    const c8 = applyMatrix(new Point(cx + rx, cy - factor * ry), svgTransform)
    const path = `M ${p1} C ${c1} ${c2} ${p2} S ${c4} ${p3} S ${c6} ${p4} S ${c8} ${p1}z`
    result = sketchPath(context, path, parseStyleConfig(context, ellipse, svgTransform))
  }

  postProcessElement(context, ellipse, result)
}

export function applyEllipseClip(
  context: RenderContext,
  ellipse: SVGEllipseElement,
  container: SVGClipPathElement | null,
  svgTransform: SVGTransform | null
): void {
  const cx = ellipse.cx.baseVal.value
  const cy = ellipse.cy.baseVal.value
  const rx = ellipse.rx.baseVal.value
  const ry = ellipse.ry.baseVal.value

  if (rx === 0 || ry === 0) {
    // zero-radius ellipse is not rendered
    return
  }

  const clip = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
  clip.cx.baseVal.value = cx
  clip.cy.baseVal.value = cy
  clip.rx.baseVal.value = rx
  clip.ry.baseVal.value = ry
  applyGlobalTransform(context, svgTransform, clip)
  container!.appendChild(clip)
}
