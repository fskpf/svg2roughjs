import { Point } from './point'
import { RenderMode } from '../RenderMode'
import {
  RenderContext,
  getLengthInPx,
  getNodeChildren,
  postProcessElement,
  parseStyleConfig,
  getEffectiveAttribute,
  applyGlobalTransform,
  convertToPixelUnit
} from '../utils'

export function drawText(
  context: RenderContext,
  text: SVGTextElement,
  svgTransform: SVGTransform | null
): void {
  const stroke = getEffectiveAttribute(context, text, 'stroke')
  const strokeWidth = hasStroke(stroke)
    ? getEffectiveAttribute(context, text, 'stroke-width')
    : null
  const textAnchor = getEffectiveAttribute(context, text, 'text-anchor', context.useElementContext)

  if (context.renderMode === RenderMode.SVG) {
    const container = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    container.setAttribute('class', 'text-container')
    applyGlobalTransform(context, svgTransform, container)
    const textClone = text.cloneNode(true) as SVGTextElement
    if (textClone.transform.baseVal.numberOfItems > 0) {
      // remove transformation, since it is transformed globally by its parent container
      textClone.transform.baseVal.clear()
    }

    const style = textClone.getAttribute('style')
    const cssFont = getCssFont(context, text, true)
    textClone.setAttribute('style', style ? cssFont + style : cssFont)

    if (hasStroke(stroke)) {
      textClone.setAttribute('stroke', stroke)
    }
    if (strokeWidth) {
      textClone.setAttribute('stroke-width', strokeWidth)
    }
    if (textAnchor) {
      textClone.setAttribute('text-anchor', textAnchor)
    }

    container.appendChild(textClone)
    postProcessElement(context, text, container)
    return
  }

  const targetCtx = context.targetCanvasContext
  if (!targetCtx) {
    return
  }

  targetCtx.save()

  let textLocation = new Point(getLengthInPx(text.x), getLengthInPx(text.y))

  // text style
  targetCtx.font = getCssFont(context, text)
  const style = parseStyleConfig(context, text, svgTransform)
  if (style.fill) {
    targetCtx.fillStyle = style.fill
  }
  if (hasStroke(stroke)) {
    targetCtx.strokeStyle = stroke
  }
  if (strokeWidth) {
    targetCtx.lineWidth = convertToPixelUnit(context, strokeWidth)
  }
  if (textAnchor) {
    targetCtx.textAlign = textAnchor !== 'middle' ? (textAnchor as CanvasTextAlign) : 'center'
  }

  // apply the global transform
  applyGlobalTransform(context, svgTransform)

  // consider dx/dy of the text element
  const dx = getLengthInPx(text.dx)
  const dy = getLengthInPx(text.dy)
  targetCtx.translate(dx, dy)

  if (text.childElementCount === 0) {
    targetCtx.fillText(
      getTextContent(context, text),
      textLocation.x,
      textLocation.y,
      text.getComputedTextLength()
    )
    if (hasStroke(stroke)) {
      targetCtx.strokeText(
        getTextContent(context, text),
        textLocation.x,
        textLocation.y,
        text.getComputedTextLength()
      )
    }
  } else {
    const children = getNodeChildren(text)
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child instanceof SVGTSpanElement) {
        textLocation = new Point(getLengthInPx(child.x), getLengthInPx(child.y))
        const dx = getLengthInPx(child.dx)
        const dy = getLengthInPx(child.dy)
        targetCtx.translate(dx, dy)
        targetCtx.fillText(getTextContent(context, child), textLocation.x, textLocation.y)
        if (hasStroke(stroke)) {
          targetCtx.strokeText(getTextContent(context, child), textLocation.x, textLocation.y)
        }
      }
    }
  }

  targetCtx.restore()
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

/**
 * Retrieves the text content from a text content element (text, tspan, ...)
 */
function getTextContent(context: RenderContext, element: SVGTextContentElement): string {
  let content = element.textContent ?? ''
  if (shouldNormalizeWhitespace(context, element)) {
    content = content.replace(/[\n\r\t ]+/g, ' ').trim()
  } else {
    content = content.replace(/\r\n|[\n\r\t]/g, ' ')
  }
  return content
}

/**
 * Determines whether the given element has default white-space handling, i.e. normalization.
 * Returns false if the element (or an ancestor) has xml:space='preserve'
 */
function shouldNormalizeWhitespace(context: RenderContext, element: SVGElement): boolean {
  let xmlSpaceAttribute = null
  while (element !== null && element !== context.sourceSvg && xmlSpaceAttribute === null) {
    xmlSpaceAttribute = element.getAttribute('xml:space')
    if (xmlSpaceAttribute === null) {
      element = element.parentNode as SVGElement
    }
  }
  return xmlSpaceAttribute !== 'preserve' // no attribute is also default handling
}

function hasStroke(stroke: string | null): stroke is string {
  return stroke !== null && stroke !== ''
}
