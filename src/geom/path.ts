import { encodeSVGPath, SVGPathData, SVGPathDataTransformer } from 'svg-pathdata'
import { Point } from './point'
import { postProcessElement, RenderContext, sketchPath } from '../utils'
import { drawMarkers } from './marker'
import { parseStyleConfig } from '../styles/styles'

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

  postProcessElement(
    context,
    path,
    sketchPath(context, encodedPathData, parseStyleConfig(context, path, svgTransform))
  )

  // https://www.w3.org/TR/SVG11/painting.html#MarkerProperties
  // Note that for a ‘path’ element which ends with a closed sub-path,
  // the last vertex is the same as the initial vertex on the given
  // sub-path (same applies to polygon).
  const points: Point[] = []
  let currentSubPathBegin: Point
  pathData.commands.forEach(cmd => {
    switch (cmd.type) {
      case SVGPathData.MOVE_TO: {
        const p = new Point(cmd.x, cmd.y)
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
        points.push(new Point(cmd.x, cmd.y))
        break
      case SVGPathData.HORIZ_LINE_TO:
        points.push(new Point(cmd.x, 0))
        break
      case SVGPathData.VERT_LINE_TO:
        points.push(new Point(0, cmd.y))
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
