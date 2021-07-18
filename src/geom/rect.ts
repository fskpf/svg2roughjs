import { Point } from './point'
import { RenderMode } from '../RenderMode'
import {
  applyGlobalTransform,
  applyMatrix,
  isIdentityTransform,
  isTranslationTransform,
  parseStyleConfig,
  postProcessElement,
  RenderContext,
  sketchPath
} from '../utils'

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

  if ((isIdentityTransform(svgTransform) || isTranslationTransform(svgTransform)) && !rx && !ry) {
    // Simple case; just a rectangle
    const p1 = applyMatrix(new Point(x, y), svgTransform)
    const p2 = applyMatrix(new Point(x + width, y + height), svgTransform)
    const transformedWidth = p2.x - p1.x
    const transformedHeight = p2.y - p1.y
    const sketchRect = context.rc.rectangle(
      p1.x,
      p1.y,
      transformedWidth,
      transformedHeight,
      parseStyleConfig(context, rect, svgTransform)
    )
    postProcessElement(context, rect, sketchRect)
  } else {
    let path = ''
    if (rx !== null && ry !== null) {
      const factor = (4 / 3) * (Math.sqrt(2) - 1)

      // Construct path for the rounded rectangle
      // perform an absolute moveto operation to location (x+rx,y), where x is the value of the ‘rect’ element's ‘x’ attribute converted to user space, rx is the effective value of the ‘rx’ attribute converted to user space and y is the value of the ‘y’ attribute converted to user space
      const p1 = applyMatrix(new Point(x + rx, y), svgTransform)
      path += `M ${p1}`
      // perform an absolute horizontal lineto operation to location (x+width-rx,y), where width is the ‘rect’ element's ‘width’ attribute converted to user space
      const p2 = applyMatrix(new Point(x + width - rx, y), svgTransform)
      path += `L ${p2}`
      // perform an absolute elliptical arc operation to coordinate (x+width,y+ry), where the effective values for the ‘rx’ and ‘ry’ attributes on the ‘rect’ element converted to user space are used as the rx and ry attributes on the elliptical arc command, respectively, the x-axis-rotation is set to zero, the large-arc-flag is set to zero, and the sweep-flag is set to one
      const p3c1 = applyMatrix(new Point(x + width - rx + factor * rx, y), svgTransform)
      const p3c2 = applyMatrix(new Point(x + width, y + factor * ry), svgTransform)
      const p3 = applyMatrix(new Point(x + width, y + ry), svgTransform)
      path += `C ${p3c1} ${p3c2} ${p3}` // We cannot use the arc command, since we no longer draw in the expected coordinates. So approximate everything with lines and béziers

      // perform a absolute vertical lineto to location (x+width,y+height-ry), where height is the ‘rect’ element's ‘height’ attribute converted to user space
      const p4 = applyMatrix(new Point(x + width, y + height - ry), svgTransform)
      path += `L ${p4}`
      // perform an absolute elliptical arc operation to coordinate (x+width-rx,y+height)
      const p5c1 = applyMatrix(new Point(x + width, y + height - ry + factor * ry), svgTransform)
      const p5c2 = applyMatrix(new Point(x + width - factor * rx, y + height), svgTransform)
      const p5 = applyMatrix(new Point(x + width - rx, y + height), svgTransform)
      path += `C ${p5c1} ${p5c2} ${p5}`
      // perform an absolute horizontal lineto to location (x+rx,y+height)
      const p6 = applyMatrix(new Point(x + rx, y + height), svgTransform)
      path += `L ${p6}`
      // perform an absolute elliptical arc operation to coordinate (x,y+height-ry)
      const p7c1 = applyMatrix(new Point(x + rx - factor * rx, y + height), svgTransform)
      const p7c2 = applyMatrix(new Point(x, y + height - factor * ry), svgTransform)
      const p7 = applyMatrix(new Point(x, y + height - ry), svgTransform)
      path += `C ${p7c1} ${p7c2} ${p7}`
      // perform an absolute absolute vertical lineto to location (x,y+ry)
      const p8 = applyMatrix(new Point(x, y + ry), svgTransform)
      path += `L ${p8}`
      // perform an absolute elliptical arc operation to coordinate (x+rx,y)
      const p9c1 = applyMatrix(new Point(x, y + factor * ry), svgTransform)
      const p9c2 = applyMatrix(new Point(x + factor * rx, y), svgTransform)
      path += `C ${p9c1} ${p9c2} ${p1}`
      path += 'z'
    } else {
      // No rounding, so just construct the respective path as a simple polygon
      const p1 = applyMatrix(new Point(x, y), svgTransform)
      const p2 = applyMatrix(new Point(x + width, y), svgTransform)
      const p3 = applyMatrix(new Point(x + width, y + height), svgTransform)
      const p4 = applyMatrix(new Point(x, y + height), svgTransform)
      path += `M ${p1}`
      path += `L ${p2}`
      path += `L ${p3}`
      path += `L ${p4}`
      path += `z`
    }

    const result = sketchPath(context, path, parseStyleConfig(context, rect, svgTransform))
    postProcessElement(context, rect, result)

    const canvasCtx = context.targetCanvasContext
    if (context.renderMode === RenderMode.CANVAS && canvasCtx) {
      canvasCtx.restore()
    }
  }
}

export function applyRectClip(
  context: RenderContext,
  rect: SVGRectElement,
  container: SVGClipPathElement | null,
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

  // in the clip case, we can actually transform the entire
  // canvas without distorting the hand-drawn style
  const targetCtx = context.targetCanvasContext
  if (context.renderMode === RenderMode.CANVAS && targetCtx) {
    targetCtx.save()
    applyGlobalTransform(context, svgTransform)
    if (rx !== null && ry !== null) {
      // Construct path for the rounded rectangle
      const factor = (4 / 3) * (Math.sqrt(2) - 1)
      targetCtx.moveTo(x + rx, y)
      targetCtx.lineTo(x + width - rx, y)
      targetCtx.bezierCurveTo(
        x + width - rx + factor * rx,
        y,
        x + width,
        y + factor * ry,
        x + width,
        y + ry
      )
      targetCtx.lineTo(x + width, y + height - ry)
      targetCtx.bezierCurveTo(
        x + width,
        y + height - ry + factor * ry,
        x + width - factor * rx,
        y + height,
        x + width - rx,
        y + height
      )
      targetCtx.lineTo(x + rx, y + height)
      targetCtx.bezierCurveTo(
        x + rx - factor * rx,
        y + height,
        x,
        y + height - factor * ry,
        x,
        y + height - ry
      )
      targetCtx.lineTo(x, y + ry)
      targetCtx.bezierCurveTo(x, y + factor * ry, x + factor * rx, y, x + rx, y)
      targetCtx.closePath()
    } else {
      targetCtx.rect(x, y, width, height)
    }
    targetCtx.restore()
  } else {
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
    container!.appendChild(clip)
  }
}
