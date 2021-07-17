import { Point } from './point'
import { RenderMode } from '../RenderMode'
import {
  applyGlobalTransform,
  applyMatrix,
  isIdentityTransform,
  isTranslationTransform,
  parseStyleConfig,
  postProcessElement,
  RenderContext,
  sketchPath
} from '../utils'

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

  const center = applyMatrix(new Point(cx, cy), svgTransform)

  let result
  if (isIdentityTransform(svgTransform) || isTranslationTransform(svgTransform)) {
    // transform a point on the ellipse to get the transformed radius
    const radiusPoint = applyMatrix(new Point(cx + r, cy + r), svgTransform)
    const transformedWidth = 2 * (radiusPoint.x - center.x)
    result = context.rc.circle(center.x, center.y, transformedWidth, {
      ...parseStyleConfig(context, circle, svgTransform),
      preserveVertices: true
    })
  } else {
    // in other cases we need to construct the path manually.
    const factor = (4 / 3) * (Math.sqrt(2) - 1)
    const p1 = applyMatrix(new Point(cx + r, cy), svgTransform)
    const p2 = applyMatrix(new Point(cx, cy + r), svgTransform)
    const p3 = applyMatrix(new Point(cx - r, cy), svgTransform)
    const p4 = applyMatrix(new Point(cx, cy - r), svgTransform)
    const c1 = applyMatrix(new Point(cx + r, cy + factor * r), svgTransform)
    const c2 = applyMatrix(new Point(cx + factor * r, cy + r), svgTransform)
    const c4 = applyMatrix(new Point(cx - r, cy + factor * r), svgTransform)
    const c6 = applyMatrix(new Point(cx - factor * r, cy - r), svgTransform)
    const c8 = applyMatrix(new Point(cx + r, cy - factor * r), svgTransform)
    const path = `M ${p1} C ${c1} ${c2} ${p2} S ${c4} ${p3} S ${c6} ${p4} S ${c8} ${p1}z`
    result = sketchPath(context, path, parseStyleConfig(context, circle, svgTransform))
  }

  postProcessElement(context, circle, result)
}

export function applyCircleClip(
  context: RenderContext,
  circle: SVGCircleElement,
  container: SVGClipPathElement | null,
  svgTransform: SVGTransform | null
): void {
  const cx = circle.cx.baseVal.value
  const cy = circle.cy.baseVal.value
  const r = circle.r.baseVal.value

  if (r === 0) {
    // zero-radius circle is not rendered
    return
  }

  const targetCtx = context.targetCanvasContext
  if (context.renderMode === RenderMode.CANVAS && targetCtx) {
    // in the clip case, we can actually transform the entire
    // canvas without distorting the hand-drawn style
    targetCtx.save()
    applyGlobalTransform(context, svgTransform)
    targetCtx.ellipse(cx, cy, r, r, 0, 0, 2 * Math.PI)
    targetCtx.restore()
  } else {
    const clip = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    clip.cx.baseVal.value = cx
    clip.cy.baseVal.value = cy
    clip.r.baseVal.value = r
    applyGlobalTransform(context, svgTransform, clip)
    container!.appendChild(clip)
  }
}
