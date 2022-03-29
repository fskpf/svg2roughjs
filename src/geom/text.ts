import { Point } from './point'
import { RenderMode } from '../RenderMode'
import {
  RenderContext,
  getLengthInPx,
  getNodeChildren,
  postProcessElement,
  getEffectiveAttribute,
  applyGlobalTransform,
  convertToPixelUnit,
  concatStyleStrings
} from '../utils'

export function drawText(
  context: RenderContext,
  text: SVGTextElement,
  svgTransform: SVGTransform | null
): void {
  if (context.renderMode === RenderMode.SVG) {
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
    return
  }

  const targetCtx = context.targetCanvasContext
  if (!targetCtx) {
    return
  }

  targetCtx.save()

  const textLocation = new Point(getLengthInPx(text.x), getLengthInPx(text.y))

  // text style
  targetCtx.font = getCssFont(context, text)
  const { stroke } = applyTextStyleAttributes(context, text, targetCtx)

  // apply the global transform
  applyGlobalTransform(context, svgTransform)

  if (text.childElementCount === 0) {
    targetCtx.translate(textLocation.x, textLocation.y)
    const dx = getLengthInPx(text.dx)
    const dy = getLengthInPx(text.dy)
    const textContent = getTextContent(context, text)
    const textLength = text.getComputedTextLength()
    targetCtx.fillText(textContent, dx, dy, textLength)
    if (hasStroke(stroke)) {
      targetCtx.strokeText(textContent, dx, dy, textLength)
    }
  } else {
    // TODO: This is still just an approximation of proper text-rendering with many missing cases...
    const children = getNodeChildren(text)
    let lastLocation = [0, 0]
    let lastTextWidth = 0
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child instanceof SVGTSpanElement) {
        const textContent = getTextContent(context, child)
        const dx = getLengthInPx(child.dx)
        const dy = getLengthInPx(child.dy)
        const [lastX, lastY] = lastLocation

        // tspan x/y location is global for the given container, i.e.
        // it *overwrites* any x,y location of the parent text element
        let spanX = 0
        if (child.x.baseVal.length > 0) {
          // tspan x/y location is global for the given container
          spanX = getLengthInPx(child.x) + dx
        } else if (i === 0) {
          spanX = textLocation.x + dx
        } else {
          // tspans block each other on the same line if not placed with x/y
          spanX = lastX + lastTextWidth + dx
        }

        let spanY = 0
        if (child.y.baseVal.length > 0) {
          // tspan x/y location is global for the given container
          spanY = getLengthInPx(child.y) + dy
        } else if (i === 0) {
          // tspans block each other on the same line if not placed with x/y
          spanY = textLocation.y + lastY + dy
        } else {
          spanY = lastY + dy
        }

        // consider styles on sibling tspans
        targetCtx.save()
        const { stroke } = applyTextStyleAttributes(context, child, targetCtx)
        targetCtx.fillText(textContent, spanX, spanY)
        if (hasStroke(stroke)) {
          targetCtx.strokeText(textContent, spanX, spanY)
        }
        targetCtx.restore()

        lastLocation = [spanX, spanY]
        lastTextWidth = child.getComputedTextLength()
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

function hasStroke(stroke: string | null): boolean {
  return !!stroke && stroke !== 'none'
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

function applyTextStyleAttributes(
  context: RenderContext,
  srcElement: SVGTextElement | SVGTSpanElement,
  tgtCanvasCtx: CanvasRenderingContext2D
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
  if (fill) {
    tgtCanvasCtx.fillStyle = fill
  }
  if (stroke) {
    tgtCanvasCtx.strokeStyle = stroke === 'none' ? 'transparent' : stroke
  }
  if (strokeWidth) {
    tgtCanvasCtx.lineWidth = convertToPixelUnit(context, strokeWidth)
  }
  if (textAnchor) {
    tgtCanvasCtx.textAlign = textAnchor !== 'middle' ? (textAnchor as CanvasTextAlign) : 'center'
  }

  tgtCanvasCtx.textBaseline = svgBaselineToCanvasBaseline(
    dominantBaseline as SvgDominantBaseline | null
  )

  return { fill, stroke, strokeWidth, textAnchor, dominantBaseline }
}

type SvgDominantBaseline =
  | 'auto'
  | 'text-bottom'
  | 'alphabetic'
  | 'ideographic'
  | 'middle'
  | 'central'
  | 'mathematical'
  | 'hanging'
  | 'text-top'
function svgBaselineToCanvasBaseline(value: SvgDominantBaseline | null): CanvasTextBaseline {
  if (!value) {
    // default is auto
    return svgBaselineToCanvasBaseline('auto')
  }
  switch (value) {
    case 'auto':
      return 'alphabetic'
    case 'central':
      return 'middle'
    case 'text-bottom':
      return 'bottom'
    case 'mathematical':
    case 'text-top':
      return 'top'
    case 'ideographic':
    case 'alphabetic':
    case 'hanging':
    case 'middle':
      return value
  }
}
