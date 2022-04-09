import { Drawable, Options } from 'roughjs/bin/core'
import { RoughSVG } from 'roughjs/bin/svg'
import { Point } from './geom/point'
import tinycolor from 'tinycolor2'
// @ts-ignore
import units from 'units-css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Color = any // type alias for tinycolor

/**
 * Regexp that detects curved commands in path data.
 */
export const PATH_CURVES_REGEX = /[acsqt]/i

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
    return element.children as unknown as Element[]
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
export function isIdentityTransform(svgTransform: SVGTransform | null): boolean {
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

export function isHidden(element: SVGElement): boolean {
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
): string | null {
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
      return null
    }
    return getEffectiveAttribute(context, parent as SVGElement, attributeName, nextCtx)
  }
  return attr
}

/**
 * Parses a `fill` url by looking in the SVG `defs` element.
 * When a gradient is found, it is converted to a color and stored
 * in the internal defs store for this url.
 * @returns The parsed color
 */
export function parseFillUrl(
  context: RenderContext,
  url: string,
  opacity: number
): string | undefined {
  const id = getIdFromUrl(url)
  if (!id) {
    return 'transparent'
  }
  const fill = context.idElements[id]
  if (fill) {
    if (typeof fill === 'string') {
      // maybe it was already parsed and replaced with a color
      return fill
    } else {
      if (fill instanceof SVGLinearGradientElement || fill instanceof SVGRadialGradientElement) {
        const color = gradientToColor(fill, opacity)
        context.idElements[id] = color
        return color
      }
    }
  }
}

/**
 * Converts the given string to px unit. May be either a <length>
 * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Length)
 * or a <percentage>
 * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Percentage).
 * @returns The value in px unit
 */
export function convertToPixelUnit(context: RenderContext, value: string): number {
  // css-units fails for converting from unit-less to 'px' in IE11,
  // thus we only apply it to non-px values
  if (value.match(CONTAINS_UNIT_REGEXP) !== null) {
    return units.convert('px', value, context.sourceSvg)
  }
  return parseFloat(value)
}

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
      config.fill = parseFillUrl(context, fill, fillOpacity)
    } else if (fill === 'none') {
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
      config.stroke = parseFillUrl(context, fill, strokeOpacity)
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
    config.strokeWidth = 0
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
    // Rough.js default is 0.5 * strokeWidth
    config.fillWeight = getRandomNumber(0.5, 3)
    // Rough.js default is -41deg
    config.hachureAngle = getRandomNumber(-30, -50)
    // Rough.js default is 4 * strokeWidth
    config.hachureGap = getRandomNumber(3, 5)
    // randomize double stroke effect if not explicitly set through user config
    if (typeof config.disableMultiStroke === 'undefined') {
      config.disableMultiStroke = Math.random() > 0.3
    }
  }

  return config
}

/**
 * A context that represents the current state of the rendering,
 * which is used in the rendering functions.
 */
export type RenderContext = {
  rc: RoughSVG
  roughConfig: Options
  fontFamily: string | null
  pencilFilter: boolean
  randomize: boolean
  idElements: Record<string, SVGElement | string>
  sourceSvg: SVGSVGElement
  svgSketch: SVGSVGElement
  useElementContext?: UseContext | null
  styleSheets: CSSStyleSheet[]
  processElement: (
    context: RenderContext,
    root: SVGSVGElement | SVGGElement | SVGSymbolElement | SVGMarkerElement | SVGElement,
    svgTransform: SVGTransform | null,
    width?: number,
    height?: number
  ) => void
}

/**
 * The context for rendering use elements.
 */
export type UseContext = {
  referenced: SVGElement
  root: Element | null
  parentContext: UseContext | null
}

/**
 * Helper method to append the returned `SVGGElement` from
 * Rough.js when drawing in SVG mode.
 */
export function postProcessElement(
  context: RenderContext,
  element: SVGElement,
  sketchElement: Drawable | SVGElement
): void {
  let sketch = sketchElement as SVGElement

  // original element may have a clip-path
  const sketchClipPathId = element.getAttribute('data-sketchy-clip-path')
  const applyPencilFilter = context.pencilFilter && element.tagName !== 'text'

  // wrap it in another container to safely apply post-processing attributes,
  // though avoid no-op <g> containers
  const isPlainContainer = sketch.tagName === 'g' && sketch.attributes.length === 0
  if (!isPlainContainer && (sketchClipPathId || applyPencilFilter)) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.appendChild(sketch)
    sketch = g
  }

  if (sketchClipPathId) {
    sketch.setAttribute('clip-path', `url(#${sketchClipPathId})`)
  }

  if (applyPencilFilter) {
    sketch.setAttribute('filter', 'url(#pencilTextureFilter)')
  }

  context.svgSketch.appendChild(sketch)
}

/**
 * Helper method to sketch a path.
 * Paths with curves should utilize the preserverVertices option to avoid line disjoints.
 * For non-curved paths it looks nicer to actually allow these diskoints.
 * @returns Returns the SVGElement for the SVG render mode, or undefined otherwise
 */
export function sketchPath(
  context: RenderContext,
  path: string,
  options?: Options
): Drawable | SVGElement {
  if (PATH_CURVES_REGEX.test(path)) {
    options = options ? { ...options, preserveVertices: true } : { preserveVertices: true }
  }
  return context.rc.path(path, options)
}

/**
 * Combines the given transform with the element's transform.
 * If no transform is given, it returns the SVGTransform of the element.
 */
export function getCombinedTransform(
  context: RenderContext,
  element: SVGGraphicsElement,
  transform: SVGTransform | null
): SVGTransform | null {
  if (!transform) {
    return getSvgTransform(element)
  }

  const elementTransform = getSvgTransform(element)
  if (elementTransform) {
    const elementTransformMatrix = elementTransform.matrix
    const combinedMatrix = transform.matrix.multiply(elementTransformMatrix)
    return context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix)
  }
  return transform
}

/**
 * Applies the given svgTransform to the canvas context or the given element when in SVG mode.
 * @param element The element to which the transform should be applied
 * when in SVG mode.
 */
export function applyGlobalTransform(
  context: RenderContext,
  svgTransform: SVGTransform | null,
  element?: SVGGraphicsElement | null
): void {
  if (svgTransform && svgTransform.matrix) {
    const matrix = svgTransform.matrix
    if (element) {
      if (element.transform.baseVal.numberOfItems > 0) {
        element.transform.baseVal.getItem(0).setMatrix(matrix)
      } else {
        element.transform.baseVal.appendItem(svgTransform)
      }
    }
  }
}

/**
 * Returns the CSS rules that apply to the given element (ignoring inheritance).
 *
 * Based on https://stackoverflow.com/a/22638396
 */
export function getMatchedCssRules(context: RenderContext, el: Element): CSSStyleRule[] {
  const ret: CSSStyleRule[] = []
  el.matches =
    el.matches ||
    el.webkitMatchesSelector ||
    // @ts-ignore
    el.mozMatchesSelector ||
    // @ts-ignore
    el.msMatchesSelector ||
    // @ts-ignore
    el.oMatchesSelector

  context.styleSheets.forEach(sheet => {
    const rules = sheet.rules || sheet.cssRules
    for (const r in rules) {
      const rule = rules[r] as CSSStyleRule
      if (el.matches(rule.selectorText)) {
        ret.push(rule)
      }
    }
  })
  return ret
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
