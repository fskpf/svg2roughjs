import { Point } from 'roughjs/bin/geometry'
import { parseStyleConfig } from '../styles/styles'
import {
  RenderContext,
  getPointsArray,
  applyMatrix,
  postProcessElement,
  applyGlobalTransform
} from '../utils'
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
  postProcessElement(context, polygon, polygonSketch)

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
  container: SVGClipPathElement | null,
  svgTransform: SVGTransform | null
): void {
  const clip = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  clip.setAttribute('points', polygon.getAttribute('points')!)
  applyGlobalTransform(context, svgTransform, clip)
  container!.appendChild(clip)
}
