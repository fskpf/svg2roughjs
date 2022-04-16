import { Options } from 'roughjs/bin/core'
import tinycolor from 'tinycolor2'
import { getIdFromUrl } from '../dom-helpers'
import { convertToPixelUnit } from '../svg-units'
import { isIdentityTransform } from '../transformation'
import { RenderContext } from '../types'
import { gradientToColor } from './colors'
import { getEffectiveAttribute, getEffectiveElementOpacity } from './effective-attributes'
import { createPen } from './pens'

/**
 * Converts the effective style attributes of the given `SVGElement`
 * to a Rough.js config object that is used to draw the element with
 * Rough.js.
 * @return config for Rough.js drawing
 */
export function parseStyleConfig(
  context: RenderContext,
  element: SVGElement,
  svgTransform: SVGTransform | null
): Options {
  const precision = context.roughConfig.fixedDecimalPlaceDigits ?? 15
  const config = Object.assign({}, context.roughConfig)

  // Scalefactor for certain style attributes. For lack of a better option here, use the determinant
  let scaleFactor = 1
  if (!isIdentityTransform(svgTransform)) {
    const m = svgTransform!.matrix
    const det = m.a * m.d - m.c * m.b
    scaleFactor = Math.sqrt(Math.abs(det))
  }

  // incorporate the elements base opacity
  const elementOpacity = getEffectiveElementOpacity(context, element, 1, context.useElementContext)

  const fill = getEffectiveAttribute(context, element, 'fill', context.useElementContext) || 'black'
  const fillOpacity = elementOpacity * getOpacity(element, 'fill-opacity')
  if (fill) {
    if (fill.indexOf('url') !== -1) {
      const gradientColor = convertGradient(context, fill, fillOpacity)
      if (gradientColor !== 'none') {
        config.fill = gradientColor
      } else {
        // delete fill, otherwise it may create an invisible 'hachure' element
        delete config.fill
      }
    } else if (fill === 'none') {
      // delete fill, otherwise it may create an invisible 'hachure' element
      delete config.fill
    } else {
      const color = tinycolor(fill)
      color.setAlpha(fillOpacity)
      config.fill = color.toString()
    }
  }

  const stroke = getEffectiveAttribute(context, element, 'stroke', context.useElementContext)
  const strokeOpacity = elementOpacity * getOpacity(element, 'stroke-opacity')
  if (stroke) {
    if (stroke.indexOf('url') !== -1) {
      config.stroke = convertGradient(context, stroke, strokeOpacity)
    } else if (stroke === 'none') {
      config.stroke = 'none'
    } else {
      const color = tinycolor(stroke)
      color.setAlpha(strokeOpacity)
      config.stroke = color.toString()
    }
  } else {
    config.stroke = 'none'
  }

  const strokeWidth = getEffectiveAttribute(
    context,
    element,
    'stroke-width',
    context.useElementContext
  )
  if (strokeWidth) {
    // Convert to user space units (px)
    const scaledWidth =
      convertToPixelUnit(context, element, strokeWidth, 'stroke-width') * scaleFactor
    config.strokeWidth = parseFloat(scaledWidth.toFixed(precision))
  } else {
    // default stroke-width is 1
    config.strokeWidth = 1
  }

  const strokeDashArray = getEffectiveAttribute(
    context,
    element,
    'stroke-dasharray',
    context.useElementContext
  )
  if (strokeDashArray && strokeDashArray !== 'none') {
    config.strokeLineDash = strokeDashArray
      .split(/[\s,]+/)
      .filter(entry => entry.length > 0)
      // make sure that dashes/dots are at least somewhat visible
      .map(dash => {
        const scaledLineDash =
          convertToPixelUnit(context, element, dash, 'stroke-dasharray') * scaleFactor
        return Math.max(0.5, parseFloat(scaledLineDash.toFixed(precision)))
      })
  }

  const strokeDashOffset = getEffectiveAttribute(
    context,
    element,
    'stroke-dashoffset',
    context.useElementContext
  )
  if (strokeDashOffset) {
    const scaledOffset =
      convertToPixelUnit(context, element, strokeDashOffset, 'stroke-dashoffset') * scaleFactor
    config.strokeLineDashOffset = parseFloat(scaledOffset.toFixed(precision))
  }

  // unstroked but filled shapes look weird, so always apply a stroke if we fill something
  if (config.fill && config.stroke === 'none') {
    config.stroke = config.fill
    config.strokeWidth = 1
  }

  if (context.randomize) {
    const { angle, gap, weight } = createPen(context, element)
    config.hachureAngle = angle
    config.hachureGap = gap
    config.fillWeight = parseFloat(weight.toFixed(precision)) // value is used in the sketched output as-is
    // randomize double stroke effect if not explicitly set through user config
    if (typeof config.disableMultiStroke === 'undefined') {
      config.disableMultiStroke = Math.random() > 0.3
    }
  }

  return config
}

/**
 * Converts SVG opacity attributes to a [0, 1] range.
 */
export function getOpacity(element: SVGElement, attribute: string): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attr = (getComputedStyle(element) as any)[attribute] || element.getAttribute(attribute)
  if (attr) {
    if (attr.indexOf('%') !== -1) {
      return Math.min(1, Math.max(0, parseFloat(attr.substring(0, attr.length - 1)) / 100))
    }
    return Math.min(1, Math.max(0, parseFloat(attr)))
  }
  return 1
}

/**
 * Parses a `fill` url by looking in the SVG `defs` element.
 * When a gradient is found, it is converted to a color and stored
 * in the internal defs store for this url.
 *
 * Patterns are ignored and returned with 'none'.
 *
 * @returns The parsed color
 */
export function convertGradient(context: RenderContext, url: string, opacity: number): string {
  const id = getIdFromUrl(url)
  if (!id) {
    return 'none'
  }

  const paint = context.idElements[id]
  if (!paint) {
    return 'none'
  }

  if (typeof paint === 'string') {
    // maybe it was already parsed and replaced with a color
    return paint
  } else if (
    paint instanceof SVGLinearGradientElement ||
    paint instanceof SVGRadialGradientElement
  ) {
    const color = gradientToColor(paint, opacity)
    context.idElements[id] = color
    return color
  } else {
    // pattern or something else that cannot be directly used in the roughjs config
    return 'none'
  }
}

export function isHidden(element: SVGElement): boolean {
  const style = element.style
  if (!style) {
    return false
  }
  return style.display === 'none' || style.visibility === 'hidden'
}

export function concatStyleStrings(...args: (string | null)[]): string {
  let ret = ''
  args = args.filter(s => s !== null)
  for (const style of args) {
    if (ret.length > 0 && ret[ret.length - 1] !== ';') {
      ret += ';'
    }
    ret += style
  }
  return ret
}
