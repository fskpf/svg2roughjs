import { applyMatrix, postProcessElement, RenderContext } from '../utils'
import { drawMarkers } from './marker'
import { parseStyleConfig } from '../styles/styles'
import { appendPatternPaint } from '../styles/pattern'

export function drawLine(
  context: RenderContext,
  line: SVGLineElement,
  svgTransform: SVGTransform | null
): void {
  const p1 = { x: line.x1.baseVal.value, y: line.y1.baseVal.value }
  const p2 = { x: line.x2.baseVal.value, y: line.y2.baseVal.value }
  const { x: tp1x, y: tp1y } = applyMatrix(p1, svgTransform)
  const { x: tp2x, y: tp2y } = applyMatrix(p2, svgTransform)

  if (tp1x === tp2x && tp1y === tp2y) {
    // zero-length line is not rendered
    return
  }

  const lineSketch = context.rc.line(
    tp1x,
    tp1y,
    tp2x,
    tp2y,
    parseStyleConfig(context, line, svgTransform)
  )

  appendPatternPaint(context, line, () => {
    const proxy = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    proxy.x1.baseVal.value = tp1x
    proxy.y1.baseVal.value = tp1y
    proxy.x2.baseVal.value = tp2x
    proxy.y2.baseVal.value = tp2y
    return proxy
  })

  postProcessElement(context, line, lineSketch)

  drawMarkers(context, line, [p1, p2], svgTransform)
}
