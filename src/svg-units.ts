import { Size } from './geom/primitives'
import { getEffectiveAttribute } from './styles/effective-attributes'
import { RenderContext } from './types'

/**
 * Dimension parsing regexp.
 *
 * https://www.w3.org/TR/css3-values/#numbers
 * "a number is either an integer, or zero or more decimal digits
 * followed by a dot (.) followed by one or more decimal digits and
 * optionally an exponent composed of "e" or "E" and an integer."
 *
 * Don't forget the signs though...
 * => ([+-]?(?:\d+|\d*\.\d+(?:[eE][+-]?\d+)?))
 *
 * To get the unit, itself, just allow any alphabetic sequence and the '%' char.
 * => ([a-z]*|%)
 */
const DIMENSION_REGEX = /^([+-]?(?:\d+|\d*\.\d+(?:[eE][+-]?\d+)?))([a-z]*|%)$/

/**
 * Commonly used dpi for unit conversion.
 */
const DPI = 96

/**
 * Conversion factors for absolute units.
 * https://developer.mozilla.org/en-US/docs/web/css/length
 */
const ABSOLUTE_UNITS: Record<string, number> = {
  in: DPI,
  cm: DPI / 2.54,
  mm: DPI / 25.4,
  pt: DPI / 72,
  pc: DPI / 6,
  px: 1
}

// pre-calculated factor for % conversion
const SQRT2 = Math.sqrt(2)

/**
 * https://www.w3.org/TR/css3-values/#dimensions
 */
type Dimension = { value: number; unit: string }

/**
 * Converts the given string to px unit. May be either a
 * [length](https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Length)
 * or a [percentage](https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Percentage).
 * @returns The value in px unit
 */
export function convertToPixelUnit(
  context: RenderContext,
  element: SVGElement,
  dimensionValue: string,
  attribute: string
): number {
  const { value, unit } = parseDimension(dimensionValue)
  if (isAbsoluteUnit(unit)) {
    return absToPixel(value, unit)
  }
  return relToPixel(context, element, attribute, value, unit)
}

/**
 * Parses the given string and returns a dimension, which is a
 * [number](https://www.w3.org/TR/css3-values/#numbers) followed
 * by a unit identifier.
 */
function parseDimension(dimension: string): Dimension {
  const match = dimension.match(DIMENSION_REGEX)
  if (match === null || match.length !== 3) {
    throw new Error(`Cannot parse dimension: ${dimension}`)
  }
  return { value: parseFloat(match[1]), unit: match[2].toLowerCase() || 'px' }
}

/**
 * unit-css converts per HTML spec, which is differently for percentages in SVG
 * https://www.w3.org/TR/SVG/coords.html#Units
 * https://oreillymedia.github.io/Using_SVG/guide/units.html
 * @param percentage [0, 100]
 * @param viewBox The coordinate system to evaluate the percentage against
 */
function percentageToPixel(
  attribute: string,
  percentage: number,
  { w: width, h: height }: Size = { w: 0, h: 0 }
): number {
  const fraction = percentage / 100

  // x and y are relative to the coordinate system's width or height
  if (attribute === 'x') {
    return fraction * width
  }
  if (attribute === 'y') {
    return fraction * height
  }

  return fraction * (Math.sqrt(width * width + height * height) / SQRT2)
}

/**
 * Converts an absolute unit to pixels.
 */
function absToPixel(value: number, unit: string): number {
  const conversion = ABSOLUTE_UNITS[unit] ?? 1
  return value * conversion
}

/**
 * Converts a relative unit to pixels.
 */
function relToPixel(
  context: RenderContext,
  element: SVGElement,
  attribute: string,
  value: number,
  unit: string
): number {
  const coordinateSystemSize = context.viewBox ?? { w: 0, h: 0 }

  if (unit === '%') {
    return percentageToPixel(attribute, value, coordinateSystemSize)
  }

  if (unit === 'vw' || unit === 'vh' || unit === 'vmin' || unit === 'vmax') {
    return viewportLengthToPixel(value, unit, coordinateSystemSize)
  }

  if (unit === 'em' || unit === 'ex' || unit === 'ch' || unit === 'rem') {
    return fontRelativeToPixel(context, element, value, unit)
  }

  throw new Error(`Unsupported relative length unit: ${unit}`)
}

/**
 * https://oreillymedia.github.io/Using_SVG/guide/units.html#units-viewport-reference
 */
function viewportLengthToPixel(
  value: number,
  unit: string,
  { w: width, h: height }: Size = { w: 0, h: 0 }
): number {
  const fraction = value / 100
  const refWidth = window.innerWidth ?? width
  const refHeight = window.innerHeight ?? height

  if (unit === 'vw') {
    return fraction * refWidth
  }

  if (unit === 'vh') {
    return fraction * refHeight
  }

  if (unit === 'vmin') {
    return fraction * Math.min(refWidth, refHeight)
  }

  if (unit === 'vmax') {
    return fraction * Math.max(refWidth, refHeight)
  }

  throw new Error(`Not a viewport length unit: ${unit}`)
}

/**
 * https://oreillymedia.github.io/Using_SVG/guide/units.html#units-relative-reference
 */
function fontRelativeToPixel(
  context: RenderContext,
  element: SVGElement,
  value: number,
  unit: string
): number {
  if (unit === 'rem') {
    const rootElement = document.documentElement
    const fontSizeDimension = parseDimension(getComputedStyle(rootElement).fontSize)
    const fontSizePx = fontSizeDimension.unit === 'px' ? fontSizeDimension.value : 16
    return value * fontSizePx
  }

  if (unit === 'ch') {
    const zeroCharWidth = measureZeroCharacter(element)
    return value * zeroCharWidth
  }

  // this should return a px font-size due to the getComputedStyle, otherwise use 16px as default fallback
  const effectiveFontSize =
    getEffectiveAttribute(context, element, 'font-size', context.useElementContext) ?? '16px'
  const fontSizeDimension = parseDimension(effectiveFontSize)
  const fontSizePx = fontSizeDimension.unit === 'px' ? fontSizeDimension.value : 16

  if (unit === 'em') {
    return value * fontSizePx
  }

  if (unit === 'ex') {
    return value * fontSizePx * 0.5
  }

  throw new Error(`Not a font relative unit: ${unit}`)
}

/**
 * Whether the given unit is an absolute unit.
 */
function isAbsoluteUnit(unit: string): boolean {
  return !!ABSOLUTE_UNITS[unit]
}

/**
 * Returns the width of the '0' character in the context of the element.
 */
function measureZeroCharacter(element: SVGElement): number {
  const parent = element.parentElement
  if (!parent) {
    return 1
  }
  const measureContainer = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  measureContainer.style.visibility = 'hidden'
  measureContainer.appendChild(document.createTextNode('0'))
  parent.appendChild(measureContainer)
  const bbox = measureContainer.getBBox()
  parent.removeChild(measureContainer)
  return bbox.width
}
