import { Point } from './point'
import { processRoot } from '../processor'
import {
  convertToPixelUnit,
  getAngle,
  getEffectiveAttribute,
  getIdFromUrl,
  RenderContext
} from '../utils'

export function drawMarkers(
  context: RenderContext,
  element: SVGPathElement | SVGLineElement | SVGPolylineElement | SVGPolygonElement,
  points: Point[],
  svgTransform: SVGTransform | null
): void {
  if (points.length === 0) {
    return
  }

  // consider scaled coordinate system for markerWidth/markerHeight
  const markerUnits = element.getAttribute('markerUnits')
  let scaleFactor = 1
  if (!markerUnits || markerUnits === 'strokeWidth') {
    const strokeWidth = getEffectiveAttribute(context, element, 'stroke-width')
    if (strokeWidth) {
      scaleFactor = convertToPixelUnit(context, strokeWidth)
    }
  }

  // start marker
  const markerStartId = getIdFromUrl(element.getAttribute('marker-start'))
  const markerStartElement = markerStartId
    ? (context.idElements[markerStartId] as SVGMarkerElement)
    : null
  if (markerStartElement) {
    let angle = markerStartElement.orientAngle.baseVal.value
    if (points.length > 1) {
      const orientAttr = markerStartElement.getAttribute('orient')
      if (orientAttr === 'auto' || orientAttr === 'auto-start-reverse') {
        const autoAngle = getAngle(points[0], points[1])
        angle = orientAttr === 'auto' ? autoAngle : autoAngle + 180
      }
    }

    const location = points[0]
    const matrix = context.sourceSvg
      .createSVGMatrix()
      .translate(location.x, location.y)
      .rotate(angle)
      .scale(scaleFactor)

    const combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix
    const markerTransform = context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix)

    processRoot(context, markerStartElement, markerTransform)
  }

  // end marker
  const markerEndId = getIdFromUrl(element.getAttribute('marker-end'))
  const markerEndElement = markerEndId
    ? (context.idElements[markerEndId] as SVGMarkerElement)
    : null
  if (markerEndElement) {
    let angle = markerEndElement.orientAngle.baseVal.value
    if (points.length > 1) {
      const orientAttr = markerEndElement.getAttribute('orient')
      if (orientAttr === 'auto' || orientAttr === 'auto-start-reverse') {
        angle = getAngle(points[points.length - 2], points[points.length - 1])
      }
    }

    const location = points[points.length - 1]
    const matrix = context.sourceSvg
      .createSVGMatrix()
      .translate(location.x, location.y)
      .rotate(angle)
      .scale(scaleFactor)

    const combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix
    const markerTransform = context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix)

    processRoot(context, markerEndElement, markerTransform)
  }

  // mid marker(s)
  const markerMidId = getIdFromUrl(element.getAttribute('marker-mid'))
  const markerMidElement = markerMidId
    ? (context.idElements[markerMidId] as SVGMarkerElement)
    : null
  if (markerMidElement && points.length > 2) {
    for (let i = 0; i < points.length; i++) {
      const loc = points[i]
      if (i === 0 || i === points.length - 1) {
        // mid markers are not drawn on first or last point
        continue
      }

      let angle = markerMidElement.orientAngle.baseVal.value
      const orientAttr = markerMidElement.getAttribute('orient')
      if (orientAttr === 'auto' || orientAttr === 'auto-start-reverse') {
        const prevPt = points[i - 1]
        const nextPt = points[i + 1]
        // https://www.w3.org/TR/SVG11/painting.html#OrientAttribute
        // use angle bisector of incoming and outgoing angle
        const inAngle = getAngle(prevPt, loc)
        const outAngle = getAngle(loc, nextPt)
        const reverse = nextPt.x < loc.x ? 180 : 0
        angle = (inAngle + outAngle) / 2 + reverse
      }

      const matrix = context.sourceSvg
        .createSVGMatrix()
        .translate(loc.x, loc.y)
        .rotate(angle)
        .scale(scaleFactor)

      const combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix
      const markerTransform = context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix)

      processRoot(context, markerMidElement, markerTransform)
    }
  }
}
