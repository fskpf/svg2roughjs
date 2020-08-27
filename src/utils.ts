import tinycolor from 'tinycolor2'
import { Point } from './point'

type Color = tinycolor.Instance

/**
 * A simple regexp which is used to test whether a given string value
 * contains unit identifiers, e.g. "1px", "1em", "1%", ...
 */
export const CONTAINS_UNIT_REGEXP = /[a-z%]/

/**
 * Calculates the average color of the colors in the given array.
 * @returns The average color
 */
export function averageColor(colorArray: Color[]): Color {
  const count = colorArray.length
  let r = 0
  let g = 0
  let b = 0
  let a = 0
  colorArray.forEach(tinycolor => {
    const color = tinycolor.toRgb()
    r += color.r * color.r
    g += color.g * color.g
    b += color.b * color.b
    a += color.a
  })
  return tinycolor({
    r: Math.sqrt(r / count),
    g: Math.sqrt(g / count),
    b: Math.sqrt(b / count),
    a: a / count
  })
}

/**
 * Returns the Node's children, since Node.prototype.children is not available on all browsers.
 * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/children
 */
export function getNodeChildren(element: Element): Element[] {
  if (typeof element.children !== 'undefined') {
    return (element.children as unknown) as Element[]
  }
  let i = 0
  let node
  const nodes = element.childNodes
  const children = []
  while ((node = nodes[i++])) {
    if (node.nodeType === 1) {
      children.push(node)
    }
  }
  return children as Element[]
}

/**
 * @return length in pixels
 */
export function getLengthInPx(svgLengthList: SVGAnimatedLengthList): number {
  if (svgLengthList && svgLengthList.baseVal.numberOfItems > 0) {
    return svgLengthList.baseVal.getItem(0).value
  }
  return 0
}

/**
 * Whether the given SVGTransform resembles an identity transform.
 * @returns Whether the transform is an identity transform.
 *  Returns true if transform is undefined.
 */
export function isIdentityTransform(svgTransform: SVGTransform | null | undefined): boolean {
  if (!svgTransform) {
    return true
  }
  const matrix = svgTransform.matrix
  return (
    !matrix ||
    (matrix.a === 1 &&
      matrix.b === 0 &&
      matrix.c === 0 &&
      matrix.d === 1 &&
      matrix.e === 0 &&
      matrix.f === 0)
  )
}

/**
 * Whether the given SVGTransform does not scale nor skew.
 * @returns Whether the given SVGTransform does not scale nor skew.
 *  Returns true if transform is undefined.
 */
export function isTranslationTransform(svgTransform: SVGTransform | null): boolean {
  if (!svgTransform) {
    return true
  }
  const matrix = svgTransform.matrix
  return !matrix || (matrix.a === 1 && matrix.b === 0 && matrix.c === 0 && matrix.d === 1)
}

/**
 * Applies a given `SVGTransform` to the point.
 *
 * [a c e] [x] = (a*x + c*y + e)
 * [b d f] [y] = (b*x + d*y + f)
 * [0 0 1] [1] = (0 + 0 + 1)
 */
export function applyMatrix(point: Point, svgTransform: SVGTransform | null): Point {
  if (!svgTransform) {
    return point
  }
  const matrix = svgTransform.matrix
  const x = matrix.a * point.x + matrix.c * point.y + matrix.e
  const y = matrix.b * point.x + matrix.d * point.y + matrix.f
  return new Point(x, y)
}

/**
 * Returns a random number in the given range.
 */
export function getRandomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * Returns the `offset` of an `SVGStopElement`.
 * @return stop percentage
 */
export function getStopOffset(stop: SVGStopElement): number {
  const offset = stop.getAttribute('offset')
  if (!offset) {
    return 0
  }
  if (offset.indexOf('%')) {
    return parseFloat(offset.substring(0, offset.length - 1))
  } else {
    return parseFloat(offset) * 100
  }
}

/**
 * Returns the `stop-color` of an `SVGStopElement`.
 */
export function getStopColor(stop: SVGStopElement): Color {
  let stopColorStr = stop.getAttribute('stop-color')
  if (!stopColorStr) {
    const style = stop.getAttribute('style') ?? ''
    const match = /stop-color:\s?(.*);?/.exec(style)
    if (match && match.length > 1) {
      stopColorStr = match[1]
    }
  }
  return stopColorStr ? tinycolor(stopColorStr) : tinycolor('white')
}

/**
 * Converts an SVG gradient to a color by mixing all stop colors
 * with `tinycolor.mix`.
 */
export function gradientToColor(
  gradient: SVGLinearGradientElement | SVGRadialGradientElement,
  opacity: number
): string {
  const stops = Array.prototype.slice.apply(gradient.querySelectorAll('stop'))
  if (stops.length === 0) {
    return 'transparent'
  } else if (stops.length === 1) {
    const color = getStopColor(stops[0])
    color.setAlpha(opacity)
    return color.toString()
  } else {
    // Because roughjs can only deal with solid colors, we try to calculate
    // the average color of the gradient here.
    // The idea is to create an array of discrete (average) colors that represents the
    // gradient under consideration of the stop's offset. Thus, larger offsets
    // result in more entries of the same mixed color (of the two adjacent color stops).
    // At the end, this array is averaged again, to create a single solid color.
    const resolution = 10
    const discreteColors = []

    let lastColor = null
    for (let i = 0; i < stops.length; i++) {
      const currentColor = getStopColor(stops[i])
      const currentOffset = getStopOffset(stops[i])

      // combine the adjacent colors
      const combinedColor = lastColor ? averageColor([lastColor, currentColor]) : currentColor

      // fill the discrete color array depending on the offset size
      let entries = Math.max(1, (currentOffset / resolution) | 0)
      while (entries > 0) {
        discreteColors.push(combinedColor)
        entries--
      }

      lastColor = currentColor
    }

    // average the discrete colors again for the final result
    const mixedColor = averageColor(discreteColors)
    mixedColor.setAlpha(opacity)
    return mixedColor.toString()
  }
}

/**
 * Returns the id from the url string
 */
export function getIdFromUrl(url: string | null): string | null {
  if (url === null) {
    return null
  }
  const result =
    /url\('#?(.*?)'\)/.exec(url) || /url\("#?(.*?)"\)/.exec(url) || /url\(#?(.*?)\)/.exec(url)
  if (result && result.length > 1) {
    return result[1]
  }
  return null
}

/**
 * Converts SVG opacity attributes to a [0, 1] range.
 */
export function getOpacity(element: SVGElement, attribute: string) {
  //@ts-ignore
  const attr = getComputedStyle(element)[attribute] || element.getAttribute(attribute)
  if (attr) {
    if (attr.indexOf('%') !== -1) {
      return Math.min(1, Math.max(0, parseFloat(attr.substring(0, attr.length - 1)) / 100))
    }
    return Math.min(1, Math.max(0, parseFloat(attr)))
  }
  return 1
}

/**
 * Returns the consolidated transform of the given element.
 */
export function getSvgTransform(element: SVGGraphicsElement): SVGTransform | null {
  if (element.transform && element.transform.baseVal.numberOfItems > 0) {
    return element.transform.baseVal.consolidate()
  }
  return null
}

export function getDefsElement(svgElement: SVGSVGElement): SVGDefsElement {
  let outputDefs = svgElement.querySelector('defs')
  if (!outputDefs) {
    outputDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    if (svgElement.childElementCount > 0) {
      svgElement.insertBefore(outputDefs, svgElement.firstElementChild)
    } else {
      svgElement.appendChild(outputDefs)
    }
  }
  return outputDefs
}

export function isHidden(element: SVGElement) {
  const style = element.style
  if (!style) {
    return false
  }
  return style.display === 'none' || style.visibility === 'hidden'
}

/**
 * The angle in degree of the line defined by the given points.
 */
export function getAngle(p0: Point, p1: Point): number {
  return Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI)
}

export function getPointsArray(element: SVGPolygonElement | SVGPolylineElement): Array<Point> {
  const pointsAttr = element.getAttribute('points')
  if (!pointsAttr) {
    return []
  }

  let coordinateRegexp
  if (pointsAttr.indexOf(' ') > 0) {
    // just assume that the coordinates (or pairs) are separated with space
    coordinateRegexp = /\s+/g
  } else {
    // there are no spaces, so assume comma separators
    coordinateRegexp = /,/g
  }

  const pointList = pointsAttr.split(coordinateRegexp)
  const points = []
  for (let i = 0; i < pointList.length; i++) {
    const currentEntry = pointList[i]
    const coordinates = currentEntry.split(',')
    if (coordinates.length === 2) {
      points.push(new Point(parseFloat(coordinates[0]), parseFloat(coordinates[1])))
    } else {
      // space as separators, take next entry as y coordinate
      const next = i + 1
      if (next < pointList.length) {
        points.push(new Point(parseFloat(currentEntry), parseFloat(pointList[next])))
        // skip the next entry
        i = next
      }
    }
  }
  return points
}
