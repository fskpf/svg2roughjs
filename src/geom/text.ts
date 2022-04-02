import {
  RenderContext,
  getNodeChildren,
  postProcessElement,
  getEffectiveAttribute,
  applyGlobalTransform,
  concatStyleStrings
} from '../utils'

export function drawText(
  context: RenderContext,
  text: SVGTextElement,
  svgTransform: SVGTransform | null
): void {
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  container.setAttribute('class', 'text-container')
  applyGlobalTransform(context, svgTransform, container)
  const textClone = text.cloneNode(true) as SVGTextElement
  if (textClone.transform.baseVal.numberOfItems > 0) {
    // remove transformation, since it is transformed globally by its parent container
    textClone.transform.baseVal.clear()
  }

  const cssFont = getCssFont(context, text, true)
  textClone.setAttribute('style', concatStyleStrings(textClone.getAttribute('style'), cssFont))
  copyTextStyleAttributes(context, text, textClone)

  // apply styling to any tspan
  if (textClone.childElementCount > 0) {
    const children = getNodeChildren(textClone)
    const origChildren = getNodeChildren(text) as SVGElement[]
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child instanceof SVGTSpanElement) {
        copyTextStyleAttributes(context, origChildren[i] as SVGTSpanElement, child)
      }
    }
  }

  container.appendChild(textClone)
  postProcessElement(context, text, container)
}

/**
 * @param asStyleString Formats the return value as inline style string
 */
function getCssFont(
  context: RenderContext,
  text: SVGTextElement,
  asStyleString: boolean = false
): string {
  let cssFont = ''
  const fontStyle = getEffectiveAttribute(context, text, 'font-style', context.useElementContext)
  if (fontStyle) {
    cssFont += asStyleString ? `font-style: ${fontStyle};` : fontStyle
  }
  const fontWeight = getEffectiveAttribute(context, text, 'font-weight', context.useElementContext)
  if (fontWeight) {
    cssFont += asStyleString ? `font-weight: ${fontWeight};` : ` ${fontWeight}`
  }
  const fontSize = getEffectiveAttribute(context, text, 'font-size', context.useElementContext)
  if (fontSize) {
    cssFont += asStyleString ? `font-size: ${fontSize};` : ` ${fontSize}`
  }
  if (context.fontFamily) {
    cssFont += asStyleString ? `font-family: ${context.fontFamily};` : ` ${context.fontFamily}`
  } else {
    const fontFamily = getEffectiveAttribute(
      context,
      text,
      'font-family',
      context.useElementContext
    )
    if (fontFamily) {
      cssFont += asStyleString ? `font-family: ${fontFamily};` : ` ${fontFamily}`
    }
  }

  cssFont = cssFont.trim()
  return cssFont
}

function copyTextStyleAttributes(
  context: RenderContext,
  srcElement: SVGTextElement | SVGTSpanElement,
  tgtElement: SVGTextElement | SVGTSpanElement
): {
  fill: string | null
  stroke: string | null
  strokeWidth: string | null
  textAnchor: string | null
  dominantBaseline: string | null
} {
  const stroke = getEffectiveAttribute(context, srcElement, 'stroke')
  const strokeWidth = stroke ? getEffectiveAttribute(context, srcElement, 'stroke-width') : null
  const fill = getEffectiveAttribute(context, srcElement, 'fill')
  const dominantBaseline = getEffectiveAttribute(context, srcElement, 'dominant-baseline')
  const textAnchor = getEffectiveAttribute(
    context,
    srcElement,
    'text-anchor',
    context.useElementContext
  )

  if (stroke) {
    tgtElement.setAttribute('stroke', stroke)
  }
  if (strokeWidth) {
    tgtElement.setAttribute('stroke-width', strokeWidth)
  }
  if (fill) {
    tgtElement.setAttribute('fill', fill)
  }
  if (textAnchor) {
    tgtElement.setAttribute('text-anchor', textAnchor)
  }
  if (dominantBaseline) {
    tgtElement.setAttribute('dominant-baseline', dominantBaseline)
  }
  return { fill, stroke, strokeWidth, textAnchor, dominantBaseline }
}
