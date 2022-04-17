import { encodeSVGPath, SVGPathData, SVGPathDataTransformer } from 'svg-pathdata'
import { appendPatternPaint } from '../styles/pattern'
import { parseStyleConfig } from '../styles/styles'
import { applyTransform } from '../transformation'
import { RenderContext } from '../types'
import { appendSketchElement, sketchPath } from '../utils'
import { drawMarkers } from './marker'
import { Point } from './primitives'

export function drawPath(
  context: RenderContext,
  path: SVGPathElement,
  svgTransform: SVGTransform | null
): void {
  const dataAttrs = path.getAttribute('d')
  const pathData =
    // Parse path data and convert to absolute coordinates
    new SVGPathData(dataAttrs!)
      .toAbs()
      // Normalize H and V to L commands - those cannot work with how we draw transformed paths otherwise
      .transform(SVGPathDataTransformer.NORMALIZE_HVZ())
      // Normalize S and T to Q and C commands - Rough.js has a bug with T where it expects 4 parameters instead of 2
      .transform(SVGPathDataTransformer.NORMALIZE_ST())

  // If there's a transform, transform the whole path accordingly
  const transformedPathData = new SVGPathData(
    // clone the commands, we might need them untransformed for markers
    pathData.commands.map(cmd => Object.assign({}, cmd))
  )
  if (svgTransform) {
    transformedPathData.transform(
      SVGPathDataTransformer.MATRIX(
        svgTransform.matrix.a,
        svgTransform.matrix.b,
        svgTransform.matrix.c,
        svgTransform.matrix.d,
        svgTransform.matrix.e,
        svgTransform.matrix.f
      )
    )
  }

  const encodedPathData = encodeSVGPath(transformedPathData.commands)
  if (encodedPathData.indexOf('undefined') !== -1) {
    // DEBUG STUFF
    console.error('broken path data')
    return
  }

  const pathSketch = sketchPath(
    context,
    encodedPathData,
    parseStyleConfig(context, path, svgTransform)
  )

  appendPatternPaint(context, path, () => {
    const proxy = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    proxy.setAttribute('d', encodedPathData)
    return proxy
  })

  appendSketchElement(context, path, pathSketch)

  // https://www.w3.org/TR/SVG11/painting.html#MarkerProperties
  // Note that for a ‘path’ element which ends with a closed sub-path,
  // the last vertex is the same as the initial vertex on the given
  // sub-path (same applies to polygon).
  const points: Point[] = []
  let currentSubPathBegin: Point
  pathData.commands.forEach(cmd => {
    switch (cmd.type) {
      case SVGPathData.MOVE_TO: {
        const p = { x: cmd.x, y: cmd.y }
        points.push(p)
        // each moveto starts a new subpath
        currentSubPathBegin = p
        break
      }
      case SVGPathData.LINE_TO:
      case SVGPathData.QUAD_TO:
      case SVGPathData.SMOOTH_QUAD_TO:
      case SVGPathData.CURVE_TO:
      case SVGPathData.SMOOTH_CURVE_TO:
      case SVGPathData.ARC:
        points.push({ x: cmd.x, y: cmd.y })
        break
      case SVGPathData.HORIZ_LINE_TO:
        points.push({ x: cmd.x, y: 0 })
        break
      case SVGPathData.VERT_LINE_TO:
        points.push({ x: 0, y: cmd.y })
        break
      case SVGPathData.CLOSE_PATH:
        if (currentSubPathBegin) {
          points.push(currentSubPathBegin)
        }
        break
    }
  })
  drawMarkers(context, path, points, svgTransform)
}

export function applyPathClip(
  context: RenderContext,
  path: SVGPathElement,
  container: SVGClipPathElement,
  svgTransform: SVGTransform | null
): void {
  const clip = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  clip.setAttribute('d', path.getAttribute('d')!)
  applyTransform(context, svgTransform, clip)
  container.appendChild(clip)
}
