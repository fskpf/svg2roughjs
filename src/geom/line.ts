import { Point } from './point'
import { applyMatrix, postProcessElement, RenderContext } from '../utils'
import { drawMarkers } from './marker'
import { parseStyleConfig } from '../styles/styles'

export function drawLine(
  context: RenderContext,
  line: SVGLineElement,
  svgTransform: SVGTransform | null
): void {
  const p1 = new Point(line.x1.baseVal.value, line.y1.baseVal.value)
  const tp1 = applyMatrix(p1, svgTransform)
  const p2 = new Point(line.x2.baseVal.value, line.y2.baseVal.value)
  const tp2 = applyMatrix(p2, svgTransform)

  if (tp1.x === tp2.x && tp1.y === tp2.y) {
    // zero-length line is not rendered
    return
  }

  const lineSketch = context.rc.line(
    tp1.x,
    tp1.y,
    tp2.x,
    tp2.y,
    parseStyleConfig(context, line, svgTransform)
  )
  postProcessElement(context, line, lineSketch)

  drawMarkers(context, line, [p1, p2], svgTransform)
}
