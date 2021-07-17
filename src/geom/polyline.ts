import { Point } from 'roughjs/bin/geometry'
import {
  RenderContext,
  getPointsArray,
  applyMatrix,
  parseStyleConfig,
  postProcessElement
} from '../utils'
import { drawMarkers } from './marker'

export function drawPolyline(
  context: RenderContext,
  polyline: SVGPolylineElement,
  svgTransform: SVGTransform | null
): void {
  const points = getPointsArray(polyline)
  const transformed = points.map(p => {
    const pt = applyMatrix(p, svgTransform)
    return [pt.x, pt.y] as Point
  })
  const style = parseStyleConfig(context, polyline, svgTransform)
  if (style.fill && style.fill !== 'none') {
    const fillStyle = Object.assign({}, style)
    fillStyle.stroke = 'none'
    postProcessElement(context, polyline, context.rc.polygon(transformed, fillStyle))
  }
  postProcessElement(context, polyline, context.rc.linearPath(transformed, style))

  drawMarkers(context, polyline, points, svgTransform)
}
