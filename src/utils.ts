import tinycolor from 'tinycolor2'

type Color = tinycolor.Instance

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
 * Returns the Node's children, since Node.prototype.children is not available on all browsers.
 * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/children
 */
export function getNodeChildren(element: Element): Element[] {
  if (typeof element.children !== 'undefined') {
    return (element.children as unknown) as Element[]
  }
  let i = 0
  let node
  const nodes = element.childNodes
  const children = []
  while ((node = nodes[i++])) {
    if (node.nodeType === 1) {
      children.push(node)
    }
  }
  return children as Element[]
}

/**
 * @return length in pixels
 */
export function getLengthInPx(svgLengthList: SVGAnimatedLengthList): number {
  if (svgLengthList && svgLengthList.baseVal.numberOfItems > 0) {
    return svgLengthList.baseVal.getItem(0).value
  }
  return 0
}
