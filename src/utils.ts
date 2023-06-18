import { Options } from 'roughjs/bin/core'
import { reparentNodes } from './dom-helpers'
import { Point, Size } from './geom/primitives'
import { RenderContext } from './types'

/**
 * Attribute for storing the new clip-path IDs for the sketch output.
 */
export const SKETCH_CLIP_ATTRIBUTE = 'data-sketchy-clip-path'

/**
 * Regexp that detects curved commands in path data.
 */
const PATH_CURVES_REGEX = /[acsqt]/i

/**
 * Returns the <defs> element of the output SVG sketch.
 */
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
 * Helper method to append the returned `SVGGElement` from Rough.js which
 * also post processes the result e.g. by applying the clip.
 */
export function appendSketchElement(
  context: RenderContext,
  element: SVGElement,
  sketchElement: SVGElement
): void {
  let sketch = sketchElement

  // original element may have a clip-path
  const sketchClipPathId = element.getAttribute(SKETCH_CLIP_ATTRIBUTE)
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
    element.removeAttribute(SKETCH_CLIP_ATTRIBUTE)
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
 * Measures the text in the context of the sketchSvg to account for inherited text
 * attributes.
 * The given text element must be a child of the svgSketch.
 */
export function measureText({ svgSketch }: RenderContext, text: SVGTextElement): Size {
  const hiddenElementStyle = 'visibility:hidden;position:absolute;left:-100%;top-100%;'
  const origStyle = svgSketch.getAttribute('style')
  if (origStyle) {
    svgSketch.setAttribute('style', `${origStyle};${hiddenElementStyle}`)
  } else {
    svgSketch.setAttribute('style', hiddenElementStyle)
  }

  const body = document.body
  body.appendChild(svgSketch)
  const { width, height } = text.getBBox()
  body.removeChild(svgSketch)

  if (origStyle) {
    svgSketch.setAttribute('style', origStyle)
  } else {
    svgSketch.removeAttribute('style')
  }

  return { w: width, h: height }
}
