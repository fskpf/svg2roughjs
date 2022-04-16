import tinycolor from 'tinycolor2'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Color = any // type alias for tinycolor

/**
 * Converts an SVG gradient to a color by mixing all stop colors
 * with `tinycolor.mix`.
 */
export function gradientToColor(
  gradient: SVGLinearGradientElement | SVGRadialGradientElement,
  opacity: number
): string {
  const stops = Array.prototype.slice.apply(gradient.querySelectorAll('stop'))
  if (stops.length === 0) {
    return 'transparent'
  } else if (stops.length === 1) {
    const color = getStopColor(stops[0])
    color.setAlpha(opacity)
    return color.toString()
  } else {
    // Because roughjs can only deal with solid colors, we try to calculate
    // the average color of the gradient here.
    // The idea is to create an array of discrete (average) colors that represents the
    // gradient under consideration of the stop's offset. Thus, larger offsets
    // result in more entries of the same mixed color (of the two adjacent color stops).
    // At the end, this array is averaged again, to create a single solid color.
    const resolution = 10
    const discreteColors = []

    let lastColor = null
    for (let i = 0; i < stops.length; i++) {
      const currentColor = getStopColor(stops[i])
      const currentOffset = getStopOffset(stops[i])

      // combine the adjacent colors
      const combinedColor = lastColor ? averageColor([lastColor, currentColor]) : currentColor

      // fill the discrete color array depending on the offset size
      let entries = Math.max(1, (currentOffset / resolution) | 0)
      while (entries > 0) {
        discreteColors.push(combinedColor)
        entries--
      }

      lastColor = currentColor
    }

    // average the discrete colors again for the final result
    const mixedColor = averageColor(discreteColors)
    mixedColor.setAlpha(opacity)
    return mixedColor.toString()
  }
}

/**
 * Returns the `stop-color` of an `SVGStopElement`.
 */
export function getStopColor(stop: SVGStopElement): Color {
  let stopColorStr = stop.getAttribute('stop-color')
  if (!stopColorStr) {
    const style = stop.getAttribute('style') ?? ''
    const match = /stop-color:\s?(.*);?/.exec(style)
    if (match && match.length > 1) {
      stopColorStr = match[1]
    }
  }
  return stopColorStr ? tinycolor(stopColorStr) : tinycolor('white')
}

/**
 * Calculates the average color of the colors in the given array.
 * @returns The average color
 */
export function averageColor(colorArray: Color[]): Color {
  const count = colorArray.length
  let r = 0
  let g = 0
  let b = 0
  let a = 0
  colorArray.forEach(tinycolor => {
    const color = tinycolor.toRgb()
    r += color.r * color.r
    g += color.g * color.g
    b += color.b * color.b
    a += color.a
  })
  return tinycolor({
    r: Math.sqrt(r / count),
    g: Math.sqrt(g / count),
    b: Math.sqrt(b / count),
    a: a / count
  })
}

/**
 * Returns the `offset` of an `SVGStopElement`.
 * @return stop percentage
 */
export function getStopOffset(stop: SVGStopElement): number {
  const offset = stop.getAttribute('offset')
  if (!offset) {
    return 0
  }
  if (offset.indexOf('%')) {
    return parseFloat(offset.substring(0, offset.length - 1))
  } else {
    return parseFloat(offset) * 100
  }
}
