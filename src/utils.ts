import { Options } from 'roughjs/bin/core'
import { RoughSVG } from 'roughjs/bin/svg'
import { Point } from './geom/primitives'
// @ts-ignore
import units from 'units-css'

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
  return { x: x, y }
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
 * Returns the consolidated transform of the given element.
 */
export function getSvgTransform(element: SVGGraphicsElement): SVGTransform | null {
  if (element.transform && element.transform.baseVal.numberOfItems > 0) {
    return element.transform.baseVal.consolidate()
  }
  return null
}

export function getDefsElement(context: RenderContext): SVGDefsElement {
  if (context.svgSketchDefs) {
    return context.svgSketchDefs
  }

  const parent = context.svgSketch
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  if (parent.childElementCount > 0) {
    parent.insertBefore(defs, parent.firstElementChild)
  } else {
    parent.appendChild(defs)
  }

  context.svgSketchDefs = defs

  return defs
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
  const points: Point[] = []
  for (let i = 0; i < pointList.length; i++) {
    const currentEntry = pointList[i]
    const coordinates = currentEntry.split(',')
    if (coordinates.length === 2) {
      points.push({ x: parseFloat(coordinates[0]), y: parseFloat(coordinates[1]) })
    } else {
      // space as separators, take next entry as y coordinate
      const next = i + 1
      if (next < pointList.length) {
        points.push({ x: parseFloat(currentEntry), y: parseFloat(pointList[next]) })
        // skip the next entry
        i = next
      }
    }
  }
  return points
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
 * A context that represents the current state of the rendering,
 * which is used in the rendering functions.
 */
export type RenderContext = {
  rc: RoughSVG
  roughConfig: Options
  fontFamily: string | null
  pencilFilter: boolean
  randomize: boolean
  sketchPatterns: boolean
  idElements: Record<string, SVGElement | string>
  sourceSvg: SVGSVGElement
  svgSketch: SVGSVGElement
  svgSketchDefs?: SVGDefsElement
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
  sketchElement: SVGElement
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
 * @returns Returns the sketched SVGElement
 */
export function sketchPath(context: RenderContext, path: string, options?: Options): SVGElement {
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

/**
 * Helper funtion to sketch a DOM fragment.
 * Wraps the given element in an SVG and runs the processor on it to sketch the fragment.
 * The result is then unpacked and returned.
 */
export function sketchFragment(
  context: RenderContext,
  g: SVGGElement,
  roughOverwrites?: Options
): SVGGElement {
  const proxySource = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  proxySource.appendChild(g)
  const proxyContext: RenderContext = {
    ...context,
    sourceSvg: proxySource,
    svgSketch: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
    roughConfig: { ...context.roughConfig, ...roughOverwrites }
  }
  proxyContext.processElement(proxyContext, g, null)
  return reparentNodes(
    document.createElementNS('http://www.w3.org/2000/svg', 'g'),
    proxyContext.svgSketch
  )
}

/**
 * Moves the child-nodes from the source to a new parent.
 */
export function reparentNodes<T extends SVGElement>(newParent: T, source: SVGElement): T {
  while (source.firstChild) {
    newParent.append(source.firstChild)
  }
  return newParent
}
