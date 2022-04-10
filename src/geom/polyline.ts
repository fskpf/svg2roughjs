import { Point } from 'roughjs/bin/geometry'
import { appendPatternPaint } from '../styles/pattern'
import { parseStyleConfig } from '../styles/styles'
import { RenderContext, getPointsArray, applyMatrix, postProcessElement } from '../utils'
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

  appendPatternPaint(context, polyline, () => {
    const proxy = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    proxy.setAttribute('points', transformed.join(' '))
    return proxy
  })

  if (style.fill && style.fill !== 'none') {
    const fillStyle = { ...style, stroke: 'none' }
    postProcessElement(context, polyline, context.rc.polygon(transformed, fillStyle))
  }
  postProcessElement(context, polyline, context.rc.linearPath(transformed, style))

  drawMarkers(context, polyline, points, svgTransform)
}
