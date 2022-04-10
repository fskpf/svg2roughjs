import {
  applyGlobalTransform,
  applyMatrix,
  isIdentityTransform,
  isTranslationTransform,
  postProcessElement,
  RenderContext,
  sketchPath
} from '../utils'
import { parseStyleConfig } from '../styles/styles'
import { appendPatternPaint } from '../styles/pattern'
import { Rectangle, str } from './primitives'

export function drawRect(
  context: RenderContext,
  rect: SVGRectElement,
  svgTransform: SVGTransform | null
): void {
  const x = rect.x.baseVal.value
  const y = rect.y.baseVal.value
  const width = rect.width.baseVal.value
  const height = rect.height.baseVal.value

  if (width === 0 || height === 0) {
    // zero-width or zero-height rect will not be rendered
    return
  }

  // Negative values are an error and result in the default value, and clamp both values to half their sides' lengths
  let rx = rect.hasAttribute('rx') ? Math.min(Math.max(0, rect.rx.baseVal.value), width / 2) : null
  let ry = rect.hasAttribute('ry') ? Math.min(Math.max(0, rect.ry.baseVal.value), height / 2) : null
  if (rx !== null || ry !== null) {
    // If only one of the two values is specified, the other has the same value
    rx = rx === null ? ry : rx
    ry = ry === null ? rx : ry
  }

  // the transformed, rectangular bounds
  const p1 = applyMatrix({ x, y }, svgTransform)
  const p2 = applyMatrix({ x: x + width, y: y + height }, svgTransform)
  const transformedWidth = p2.x - p1.x
  const transformedHeight = p2.y - p1.y
  const transformedBounds = { x: p1.x, y: p1.y, w: transformedWidth, h: transformedHeight }

  if ((isIdentityTransform(svgTransform) || isTranslationTransform(svgTransform)) && !rx && !ry) {
    // Simple case; just a rectangle
    const sketchRect = context.rc.rectangle(
      transformedBounds.x,
      transformedBounds.y,
      transformedBounds.w,
      transformedBounds.h,
      parseStyleConfig(context, rect, svgTransform)
    )

    applyPatternPaint(context, rect, transformedBounds)
    postProcessElement(context, rect, sketchRect)
  } else {
    let path = ''
    if (rx !== null && ry !== null) {
      const factor = (4 / 3) * (Math.sqrt(2) - 1)

      // Construct path for the rounded rectangle
      // perform an absolute moveto operation to location (x+rx,y), where x is the value of the ‘rect’ element's ‘x’ attribute converted to user space, rx is the effective value of the ‘rx’ attribute converted to user space and y is the value of the ‘y’ attribute converted to user space
      const p1 = applyMatrix({ x: x + rx, y }, svgTransform)
      path += `M ${str(p1)}`
      // perform an absolute horizontal lineto operation to location (x+width-rx,y), where width is the ‘rect’ element's ‘width’ attribute converted to user space
      const p2 = applyMatrix({ x: x + width - rx, y }, svgTransform)
      path += `L ${str(p2)}`
      // perform an absolute elliptical arc operation to coordinate (x+width,y+ry), where the effective values for the ‘rx’ and ‘ry’ attributes on the ‘rect’ element converted to user space are used as the rx and ry attributes on the elliptical arc command, respectively, the x-axis-rotation is set to zero, the large-arc-flag is set to zero, and the sweep-flag is set to one
      const p3c1 = applyMatrix({ x: x + width - rx + factor * rx, y }, svgTransform)
      const p3c2 = applyMatrix({ x: x + width, y: y + factor * ry }, svgTransform)
      const p3 = applyMatrix({ x: x + width, y: y + ry }, svgTransform)
      path += `C ${str(p3c1)} ${str(p3c2)} ${str(p3)}` // We cannot use the arc command, since we no longer draw in the expected coordinates. So approximate everything with lines and béziers

      // perform a absolute vertical lineto to location (x+width,y+height-ry), where height is the ‘rect’ element's ‘height’ attribute converted to user space
      const p4 = applyMatrix({ x: x + width, y: y + height - ry }, svgTransform)
      path += `L ${str(p4)}`
      // perform an absolute elliptical arc operation to coordinate (x+width-rx,y+height)
      const p5c1 = applyMatrix({ x: x + width, y: y + height - ry + factor * ry }, svgTransform)
      const p5c2 = applyMatrix({ x: x + width - factor * rx, y: y + height }, svgTransform)
      const p5 = applyMatrix({ x: x + width - rx, y: y + height }, svgTransform)
      path += `C ${str(p5c1)} ${str(p5c2)} ${str(p5)}`
      // perform an absolute horizontal lineto to location (x+rx,y+height)
      const p6 = applyMatrix({ x: x + rx, y: y + height }, svgTransform)
      path += `L ${str(p6)}`
      // perform an absolute elliptical arc operation to coordinate (x,y+height-ry)
      const p7c1 = applyMatrix({ x: x + rx - factor * rx, y: y + height }, svgTransform)
      const p7c2 = applyMatrix({ x, y: y + height - factor * ry }, svgTransform)
      const p7 = applyMatrix({ x, y: y + height - ry }, svgTransform)
      path += `C ${str(p7c1)} ${str(p7c2)} ${str(p7)}`
      // perform an absolute absolute vertical lineto to location (x,y+ry)
      const p8 = applyMatrix({ x, y: y + ry }, svgTransform)
      path += `L ${str(p8)}`
      // perform an absolute elliptical arc operation to coordinate (x+rx,y)
      const p9c1 = applyMatrix({ x, y: y + factor * ry }, svgTransform)
      const p9c2 = applyMatrix({ x: x + factor * rx, y }, svgTransform)
      path += `C ${str(p9c1)} ${str(p9c2)} ${str(p1)}`
      path += 'z'
    } else {
      // No rounding, so just construct the respective path as a simple polygon
      const p1 = applyMatrix({ x, y }, svgTransform)
      const p2 = applyMatrix({ x: x + width, y }, svgTransform)
      const p3 = applyMatrix({ x: x + width, y: y + height }, svgTransform)
      const p4 = applyMatrix({ x, y: y + height }, svgTransform)
      path += `M ${str(p1)}`
      path += `L ${str(p2)}`
      path += `L ${str(p3)}`
      path += `L ${str(p4)}`
      path += `z`
    }

    const result = sketchPath(context, path, parseStyleConfig(context, rect, svgTransform))

    applyPatternPaint(context, rect, transformedBounds)
    postProcessElement(context, rect, result)
  }
}

function applyPatternPaint(
  context: RenderContext,
  rect: SVGRectElement,
  { x, y, w, h }: Rectangle
): void {
  appendPatternPaint(context, rect, () => {
    const proxy = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    proxy.x.baseVal.value = x
    proxy.y.baseVal.value = y
    proxy.width.baseVal.value = w
    proxy.height.baseVal.value = h
    return proxy
  })
}

export function applyRectClip(
  context: RenderContext,
  rect: SVGRectElement,
  container: SVGClipPathElement,
  svgTransform: SVGTransform | null
): void {
  const x = rect.x.baseVal.value
  const y = rect.y.baseVal.value
  const width = rect.width.baseVal.value
  const height = rect.height.baseVal.value

  if (width === 0 || height === 0) {
    // zero-width or zero-height rect will not be rendered
    return
  }

  const rx = rect.hasAttribute('rx') ? rect.rx.baseVal.value : null
  const ry = rect.hasAttribute('ry') ? rect.ry.baseVal.value : null

  const clip = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  clip.x.baseVal.value = x
  clip.y.baseVal.value = y
  clip.width.baseVal.value = width
  clip.height.baseVal.value = height
  if (rx) {
    clip.rx.baseVal.value = rx
  }
  if (ry) {
    clip.ry.baseVal.value = ry
  }
  applyGlobalTransform(context, svgTransform, clip)
  container.appendChild(clip)
}
