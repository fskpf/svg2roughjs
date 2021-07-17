import { processRoot } from '../processor'
import { getCombinedTransform, RenderContext } from '../utils'

export function drawUse(
  context: RenderContext,
  use: SVGUseElement,
  svgTransform: SVGTransform | null
): void {
  let href = use.href.baseVal
  if (href.startsWith('#')) {
    href = href.substring(1)
  }
  const defElement = context.idElements[href] as SVGElement
  if (defElement) {
    let useWidth, useHeight
    if (use.getAttribute('width') && use.getAttribute('height')) {
      // Use elements can overwrite the width which is important if it is a nested SVG
      useWidth = use.width.baseVal.value
      useHeight = use.height.baseVal.value
    }
    // We need to account for x and y attributes as well. Those change where the element is drawn.
    // We can simply change the transform to include that.
    const x = use.x.baseVal.value
    const y = use.y.baseVal.value
    let matrix = context.sourceSvg.createSVGMatrix().translate(x, y)
    matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix

    // the defsElement itself might have a transform that needs to be incorporated
    const elementTransform = context.sourceSvg.createSVGTransformFromMatrix(matrix)

    // use elements must be processed in their context, particularly regarding
    // the styling of them
    if (!context.useElementContext) {
      context.useElementContext = { root: use, referenced: defElement, parentContext: null }
    } else {
      const newContext = {
        root: use,
        referenced: defElement,
        parentContext: Object.assign({}, context.useElementContext)
      }
      context.useElementContext = newContext
    }

    // draw the referenced element
    processRoot(
      context,
      defElement,
      getCombinedTransform(context, defElement as SVGGraphicsElement, elementTransform),
      useWidth,
      useHeight
    )

    // restore default context
    if (context.useElementContext.parentContext) {
      context.useElementContext = context.useElementContext.parentContext
    } else {
      context.useElementContext = null
    }
  }
}
