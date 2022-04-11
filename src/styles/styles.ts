import { Options } from 'roughjs/bin/core'
import tinycolor from 'tinycolor2'
import { getIdFromUrl } from '../dom-helpers'
import { isIdentityTransform } from '../transformation'
import { RenderContext, UseContext } from '../types'
import { convertToPixelUnit } from '../utils'
import { gradientToColor } from './colors'
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
    config.strokeWidth = convertToPixelUnit(context, strokeWidth) * scaleFactor
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
      .map(dash => Math.max(0.5, convertToPixelUnit(context, dash) * scaleFactor))
  }

  const strokeDashOffset = getEffectiveAttribute(
    context,
    element,
    'stroke-dashoffset',
    context.useElementContext
  )
  if (strokeDashOffset) {
    config.strokeLineDashOffset = convertToPixelUnit(context, strokeDashOffset) * scaleFactor
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
    config.fillWeight = weight
    // randomize double stroke effect if not explicitly set through user config
    if (typeof config.disableMultiStroke === 'undefined') {
      config.disableMultiStroke = Math.random() > 0.3
    }
  }

  return config
}

/**
 * Traverses the given elements hierarchy bottom-up to determine its effective
 * opacity attribute.
 * @param currentUseCtx Consider different DOM hierarchy for use elements
 */
export function getEffectiveElementOpacity(
  context: RenderContext,
  element: SVGElement,
  currentOpacity: number,
  currentUseCtx?: UseContext | null
): number {
  let attr
  if (!currentUseCtx) {
    attr = getComputedStyle(element)['opacity'] || element.getAttribute('opacity')
  } else {
    // use elements traverse a different parent-hierarchy, thus we cannot use getComputedStyle here
    attr = element.getAttribute('opacity')
  }
  if (attr) {
    let elementOpacity = 1
    if (attr.indexOf('%') !== -1) {
      elementOpacity = Math.min(
        1,
        Math.max(0, parseFloat(attr.substring(0, attr.length - 1)) / 100)
      )
    } else {
      elementOpacity = Math.min(1, Math.max(0, parseFloat(attr)))
    }
    // combine opacities
    currentOpacity *= elementOpacity
  }
  // traverse upwards to combine parent opacities as well
  let parent: Element | null = element.parentElement

  const useCtx = currentUseCtx
  let nextUseCtx = useCtx

  if (useCtx && useCtx.referenced === element) {
    // switch context and traverse the use-element parent now
    parent = useCtx.root
    nextUseCtx = useCtx.parentContext
  }

  if (!parent || parent === context.sourceSvg) {
    return currentOpacity
  }

  return getEffectiveElementOpacity(context, parent as SVGElement, currentOpacity, nextUseCtx)
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

/**
 * Returns the attribute value of an element under consideration
 * of inherited attributes from the `parentElement`.
 * @param attributeName Name of the attribute to look up
 * @param currentUseCtx Consider different DOM hierarchy for use elements
 * @return attribute value if it exists
 */
export function getEffectiveAttribute(
  context: RenderContext,
  element: SVGElement,
  attributeName: string,
  currentUseCtx?: UseContext | null
): string | undefined {
  // getComputedStyle doesn't work for, e.g. <svg fill='rgba(...)'>
  let attr
  if (!currentUseCtx) {
    attr =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getComputedStyle(element) as any)[attributeName] || element.getAttribute(attributeName)
  } else {
    // use elements traverse a different parent-hierarchy, thus we cannot use getComputedStyle here
    attr = element.getAttribute(attributeName)
  }

  if (!attr) {
    let parent: Element | null = element.parentElement

    const useCtx = currentUseCtx
    let nextCtx = useCtx

    if (useCtx && useCtx.referenced === element) {
      // switch context and traverse the use-element parent now
      parent = useCtx.root
      nextCtx = useCtx.parentContext
    }

    if (!parent || parent === context.sourceSvg) {
      return
    }
    return getEffectiveAttribute(context, parent as SVGElement, attributeName, nextCtx)
  }
  return attr
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
