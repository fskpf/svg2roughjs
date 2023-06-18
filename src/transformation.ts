import { Point } from './geom/primitives'
import { RenderContext } from './types'

/**
 * Whether the given SVGTransform resembles an identity transform.
 * @returns Whether the transform is an identity transform.
 *  Returns true if transform is undefined.
 */
export function isIdentityTransform(svgTransform: SVGTransform | null): boolean {
  if (!svgTransform) {
    return true
  }
  const matrix = svgTransform.matrix
  return (
    !matrix ||
    (matrix.a === 1 &&
      matrix.b === 0 &&
      matrix.c === 0 &&
      matrix.d === 1 &&
      matrix.e === 0 &&
      matrix.f === 0)
  )
}

/**
 * Whether the given SVGTransform does not scale nor skew.
 * @returns Whether the given SVGTransform does not scale nor skew.
 *  Returns true if transform is undefined.
 */
export function isTranslationTransform(svgTransform: SVGTransform | null): boolean {
  if (!svgTransform) {
    return true
  }
  const matrix = svgTransform.matrix
  return !matrix || (matrix.a === 1 && matrix.b === 0 && matrix.c === 0 && matrix.d === 1)
}

/**
 * Applies a given `SVGTransform` to the point.
 *
 * [a c e] [x] = (a*x + c*y + e)
 * [b d f] [y] = (b*x + d*y + f)
 * [0 0 1] [1] = (0 + 0 + 1)
 */
export function applyMatrix(point: Point, svgTransform: SVGTransform | null): Point {
  if (!svgTransform) {
    return point
  }
  const matrix = svgTransform.matrix
  const x = matrix.a * point.x + matrix.c * point.y + matrix.e
  const y = matrix.b * point.x + matrix.d * point.y + matrix.f
  return { x, y }
}

/**
 * Returns the consolidated transform of the given element.
 */
export function getSvgTransform(element: SVGGraphicsElement): SVGTransform | null {
  if (element.transform && element.transform.baseVal.numberOfItems > 0) {
    return element.transform.baseVal.consolidate()
  }
  return null
}

/**
 * Combines the given transform with the element's transform.
 * If no transform is given, it returns the SVGTransform of the element.
 */
export function getCombinedTransform(
  context: RenderContext,
  element: SVGGraphicsElement,
  transform: SVGTransform | null
): SVGTransform | null {
  if (!transform) {
    return getSvgTransform(element)
  }

  const elementTransform = getSvgTransform(element)
  if (elementTransform) {
    const elementTransformMatrix = elementTransform.matrix
    const combinedMatrix = transform.matrix.multiply(elementTransformMatrix)
    return context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix)
  }
  return transform
}

/**
 * Applies the given svgTransform to the given element.
 * @param element The element to which the transform should be applied.
 */
export function applyTransform(
  context: RenderContext,
  svgTransform: SVGTransform | null,
  element: SVGGraphicsElement
): void {
  if (svgTransform && svgTransform.matrix && !isIdentityTransform(svgTransform)) {
    const matrix = svgTransform.matrix
    if (element.transform.baseVal.numberOfItems > 0) {
      element.transform.baseVal.getItem(0).setMatrix(matrix)
    } else {
      element.transform.baseVal.appendItem(svgTransform)
    }
  }
}
