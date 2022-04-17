import { Point } from 'roughjs/bin/geometry'
import { appendPatternPaint } from '../styles/pattern'
import { parseStyleConfig } from '../styles/styles'
import { applyTransform, applyMatrix } from '../transformation'
import { RenderContext } from '../types'
import { appendSketchElement, getPointsArray } from '../utils'
import { drawMarkers } from './marker'

export function drawPolygon(
  context: RenderContext,
  polygon: SVGPolygonElement,
  svgTransform: SVGTransform | null
): void {
  const points = getPointsArray(polygon)

  const transformed = points.map(p => {
    const pt = applyMatrix(p, svgTransform)
    return [pt.x, pt.y] as Point
  })

  const polygonSketch = context.rc.polygon(
    transformed,
    parseStyleConfig(context, polygon, svgTransform)
  )

  appendPatternPaint(context, polygon, () => {
    const proxy = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    proxy.setAttribute('points', transformed.join(' '))
    return proxy
  })

  appendSketchElement(context, polygon, polygonSketch)

  // https://www.w3.org/TR/SVG11/painting.html#MarkerProperties
  // Note that for a ‘path’ element which ends with a closed sub-path,
  // the last vertex is the same as the initial vertex on the given
  // sub-path (same applies to polygon).
  if (points.length > 0) {
    points.push(points[0])
    drawMarkers(context, polygon, points, svgTransform)
  }
}

export function applyPolygonClip(
  context: RenderContext,
  polygon: SVGPolygonElement,
  container: SVGClipPathElement,
  svgTransform: SVGTransform | null
): void {
  const clip = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  clip.setAttribute('points', polygon.getAttribute('points')!)
  applyTransform(context, svgTransform, clip)
  container.appendChild(clip)
}
