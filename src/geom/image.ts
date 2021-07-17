import { processRoot } from '../processor'
import { RenderMode } from '../RenderMode'
import { applyGlobalTransform, postProcessElement, RenderContext } from '../utils'

export function drawImage(
  context: RenderContext,
  svgImage: SVGImageElement,
  svgTransform: SVGTransform | null
): void {
  const href = svgImage.href.baseVal
  const x = svgImage.x.baseVal.value
  const y = svgImage.y.baseVal.value
  let width, height
  if (svgImage.getAttribute('width') && svgImage.getAttribute('height')) {
    width = svgImage.width.baseVal.value
    height = svgImage.height.baseVal.value
  }
  if (href.startsWith('data:') && href.indexOf('image/svg+xml') !== -1) {
    // data:[<media type>][;charset=<character set>][;base64],<data>
    const dataUrlRegex = /^data:([^,]*),(.*)/
    const match = dataUrlRegex.exec(href)
    if (match && match.length > 2) {
      const meta = match[1]
      let svgString = match[2]
      const isBase64 = meta.indexOf('base64') !== -1
      const isUtf8 = meta.indexOf('utf8') !== -1
      if (isBase64) {
        svgString = btoa(svgString)
      }
      if (!isUtf8) {
        svgString = decodeURIComponent(svgString)
      }
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgString, 'image/svg+xml')
      const svg = doc.firstElementChild as SVGSVGElement

      let matrix = context.sourceSvg.createSVGMatrix().translate(x, y)
      matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix

      processRoot(
        context,
        svg,
        context.sourceSvg.createSVGTransformFromMatrix(matrix),
        width,
        height
      )
      return
    }
  } else {
    let matrix = context.sourceSvg.createSVGMatrix().translate(x, y)
    matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix
    if (context.renderMode === RenderMode.CANVAS) {
      // we just draw the image 'as is' into the canvas
      const dx = matrix.e
      const dy = matrix.f
      const img = new Image()
      img.onload = () => {
        if (context.targetCanvasContext) {
          context.targetCanvasContext.drawImage(img, dx, dy)
        }
      }
      img.src = href
    } else {
      const imageClone = svgImage.cloneNode()
      const container = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      applyGlobalTransform(context, svgTransform, container)
      container.appendChild(imageClone)
      postProcessElement(context, svgImage, container)
    }
  }
}
