import { getIdFromUrl } from '../dom-helpers'
import { getEffectiveAttribute } from '../styles/styles'
import { RenderContext } from '../types'
import { convertToPixelUnit } from '../utils'
import { equals, Point } from './primitives'

export function drawMarkers(
  context: RenderContext,
  element: SVGPathElement | SVGLineElement | SVGPolylineElement | SVGPolygonElement,
  points: Point[],
  svgTransform: SVGTransform | null
): void {
  if (points.length === 0) {
    return
  }

  const startPt = points[0]
  const endPt = points[points.length - 1]

  // start marker
  const markerStartId = getIdFromUrl(element.getAttribute('marker-start'))
  const markerStartElement = markerStartId
    ? (context.idElements[markerStartId] as SVGMarkerElement)
    : null

  // marker-start is only rendered when there are at least two points
  if (markerStartElement && points.length > 1) {
    let angle = markerStartElement.orientAngle.baseVal.value

    const nextPt = points[1]
    const orientAttr = markerStartElement.getAttribute('orient')
    if (orientAttr === 'auto' || orientAttr === 'auto-start-reverse') {
      const reverse = orientAttr === 'auto' ? 0 : 180
      const prevPt = points[points.length - 2]
      if (isClosedPath(points)) {
        // https://www.w3.org/TR/SVG11/painting.html#OrientAttribute
        // use angle bisector of incoming and outgoing angle
        angle = getBisectingAngle(prevPt, endPt, nextPt) - reverse
      } else {
        const vOut = { x: nextPt.x - startPt.x, y: nextPt.y - startPt.y }
        angle = getAngle({ x: 1, y: 0 }, vOut) - reverse
      }
    }

    const matrix = context.sourceSvg
      .createSVGMatrix()
      .translate(startPt.x, startPt.y)
      .rotate(angle)
      .scale(getScaleFactor(context, markerStartElement, element))

    const combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix
    const markerTransform = context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix)

    context.processElement(context, markerStartElement, markerTransform)
  }

  // end marker
  const markerEndId = getIdFromUrl(element.getAttribute('marker-end'))
  const markerEndElement = markerEndId
    ? (context.idElements[markerEndId] as SVGMarkerElement)
    : null

  // marker-end is also rendered if the path has only one point
  if (markerEndElement) {
    let angle = markerEndElement.orientAngle.baseVal.value

    if (points.length > 1) {
      const orientAttr = markerEndElement.getAttribute('orient')
      if (orientAttr === 'auto' || orientAttr === 'auto-start-reverse') {
        // by spec, "auto-start-reverse" has no effect on marker end
        const prevPt = points[points.length - 2]
        if (isClosedPath(points)) {
          // https://www.w3.org/TR/SVG11/painting.html#OrientAttribute
          // use angle bisector of incoming and outgoing angle
          const nextPt = points[1] // start and end points are equal, take second point
          angle = getBisectingAngle(prevPt, endPt, nextPt)
        } else {
          const vIn = { x: endPt.x - prevPt.x, y: endPt.y - prevPt.y }
          angle = getAngle({ x: 1, y: 0 }, vIn)
        }
      }
    }

    const matrix = context.sourceSvg
      .createSVGMatrix()
      .translate(endPt.x, endPt.y)
      .rotate(angle)
      .scale(getScaleFactor(context, markerEndElement, element))

    const combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix
    const markerTransform = context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix)

    context.processElement(context, markerEndElement, markerTransform)
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
        // by spec, "auto-start-reverse" has no effect on marker mid
        const prevPt = points[i - 1]
        const nextPt = points[i + 1]
        // https://www.w3.org/TR/SVG11/painting.html#OrientAttribute
        // use angle bisector of incoming and outgoing angle
        angle = getBisectingAngle(prevPt, loc, nextPt)
      }

      const matrix = context.sourceSvg
        .createSVGMatrix()
        .translate(loc.x, loc.y)
        .rotate(angle)
        .scale(getScaleFactor(context, markerMidElement, element))

      const combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix
      const markerTransform = context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix)

      context.processElement(context, markerMidElement, markerTransform)
    }
  }
}

/**
 * Consider scaled coordinate system for markerWidth/markerHeight.
 */
function getScaleFactor(
  context: RenderContext,
  marker: SVGMarkerElement,
  referrer: SVGElement
): number {
  const markerUnits = marker.getAttribute('markerUnits')
  let scaleFactor = 1
  if (!markerUnits || markerUnits === 'strokeWidth') {
    // default is strokeWidth by SVG spec
    const strokeWidth = getEffectiveAttribute(context, referrer, 'stroke-width')
    if (strokeWidth) {
      scaleFactor = convertToPixelUnit(context, strokeWidth)
    }
  }
  return scaleFactor
}

/**
 * Whether the path is closed, i.e. the start and end points are identical
 */
function isClosedPath(points: Point[]): boolean {
  return equals(points[0], points[points.length - 1])
}

/**
 * Returns the bisection angle of the angle that is spanned by the given points.
 * @param prevPt The point from which the incoming flank is pointing
 * @param crossingPt The anchor point of the angle
 * @param nextPt Th point to which the outgoing flank is pointing
 * @returns The bisecting angle
 */
function getBisectingAngle(prevPt: Point, crossingPt: Point, nextPt: Point): number {
  const vIn = { x: nextPt.x - crossingPt.x, y: nextPt.y - crossingPt.y }
  const vOut = { x: prevPt.x - crossingPt.x, y: prevPt.y - crossingPt.y }

  const refPoint = { x: crossingPt.x + 1, y: crossingPt.y }
  const refVector = { x: refPoint.x - crossingPt.x, y: refPoint.y - crossingPt.y }
  const refAngle = getAngle(vIn, refVector)

  const vectorAngle = getAngle(vIn, vOut)

  return getOppositeAngle(vectorAngle) / 2 - refAngle
}

/**
 * Returns the opposite angle of the line. Considers the direction of the angle
 * (i.e. positive for clockwise, negative for counter-clickwise).
 */
function getOppositeAngle(angle: number): number {
  return angle - Math.sign(angle) * 180
}

/**
 * Returns the signed angle between the vectors (i.e. positive for clockwise,
 * negative for counter-clickwise).
 * @param v1 2-dimensional vector
 * @param v2 2-dimensional vector
 * @returns The signed angle between the vectors
 */
function getAngle(v1: Point, v2: Point): number {
  const a1 = Math.atan2(v1.y, v1.x)
  const a2 = Math.atan2(v2.y, v2.x)
  const angle = a2 - a1
  const K = -Math.sign(angle) * Math.PI * 2
  const a = Math.abs(K + angle) < Math.abs(angle) ? K + angle : angle
  return Math.round((360 * a) / (Math.PI * 2))
}
