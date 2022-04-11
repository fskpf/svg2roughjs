import { RenderContext } from '../utils'

type Range = [number, number]
type AngleConfig = { normal: Range; horizontal: Range; vertical: Range }
type WeightConfig = { normal: Range; small: Range }
type GapConfig = { normal: Range; small: Range }
type PenConfiguration = { angle: AngleConfig; weight: WeightConfig; gap: GapConfig }
export type Pen = { angle: number; weight: number; gap: number }

function getPenConfiguration(fillStyle?: string): PenConfiguration {
  // the svg2roughjs v2 config
  const legacyConfig: PenConfiguration = {
    angle: {
      normal: [-30, -50],
      horizontal: [-30, -50],
      vertical: [-30, -50]
    },
    weight: {
      normal: [0.5, 3],
      small: [0.5, 3]
    },
    gap: {
      normal: [3, 5],
      small: [3, 5]
    }
  }

  // adjusted config for more variation
  const defaultConfig: PenConfiguration = {
    angle: {
      // just lean more into the direction of the aspect ratio
      normal: [-30, -50],
      horizontal: [-50, -75],
      vertical: [-30, -15]
    },
    weight: {
      normal: [1, 3],
      small: [0.5, 1.7]
    },
    gap: {
      normal: [2, 5],
      small: [1.5, 2]
    }
  }

  // fine-tune configs depending on fill-style
  switch (fillStyle) {
    default:
      return defaultConfig
    case 'zigzag':
    case 'zigzag-line':
      return {
        ...defaultConfig,
        weight: { normal: [0.5, 3], small: [0.5, 2] },
        gap: { normal: [3.5, 6], small: [2.5, 4.5] }
      }
    case 'cross-hatch':
      return {
        ...defaultConfig,
        weight: { normal: [1, 3], small: [0.5, 1.3] },
        gap: { normal: [4, 8], small: [2, 5] }
      }
    case 'dots':
      return legacyConfig
  }
}

/**
 * Creates a random rendering configuration for the given element.
 * The returned pen is specific of the `config.fillStyle` and the element's shape.
 */
export function createPen(context: RenderContext, element: SVGElement): Pen {
  if (context.roughConfig.fillStyle === 'solid') {
    // config doesn't affect drawing
    return { angle: 0, gap: 0, weight: 0 }
  }

  // Only works when the element is in the DOM, but no need to check it here,
  // since the related methods can cope with non-finite or zero cases.
  const { width, height } = element.getBoundingClientRect()
  const aspectRatio = width / height
  const sideLength = Math.sqrt(width * height)

  const { angle, gap, weight } = getPenConfiguration(context.roughConfig.fillStyle)
  return {
    angle: getHachureAngle(angle, aspectRatio),
    gap: getHachureGap(gap, sideLength),
    weight: getFillWeight(weight, sideLength)
  }
}

/**
 * Returns a random hachure angle in the range of the given config.
 *
 * Rough.js default is -41deg
 */
function getHachureAngle(
  { normal, horizontal, vertical }: AngleConfig,
  aspectRatio: number
): number {
  if (isFinite(aspectRatio)) {
    // sketch elements along the smaller side
    if (aspectRatio < 0.25) {
      return getRandomNumber(horizontal[0], horizontal[1])
    } else if (aspectRatio > 6) {
      return getRandomNumber(vertical[0], vertical[1])
    }
  }
  return getRandomNumber(normal[0], normal[1])
}

/**
 * Returns a random hachure gap in the range of the given config.
 *
 * Rough.js default is 4 * strokeWidth
 */
function getHachureGap({ normal, small }: GapConfig, sideLength: number): number {
  return sideLength < 45
    ? getRandomNumber(small[0], small[1])
    : getRandomNumber(normal[0], normal[1])
}

/**
 * Returns a random fill weight in the range of the given config.
 *
 * Rough.js default is 0.5 * strokeWidth
 */
function getFillWeight({ normal, small }: WeightConfig, sideLength: number): number {
  return sideLength < 45
    ? getRandomNumber(small[0], small[1])
    : getRandomNumber(normal[0], normal[1])
}

/**
 * Returns a random number in the given range.
 */
function getRandomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min
}
