import { RenderContext } from './types'

/**
 * Returns the Node's children, since Node.prototype.children is not available on all browsers.
 * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/children
 */
export function getNodeChildren(element: Element): Element[] {
  if (typeof element.children !== 'undefined') {
    return element.children as unknown as Element[]
  }
  let i = 0
  let node
  const nodes = element.childNodes
  const children: Element[] = []
  while ((node = nodes[i++])) {
    if (node.nodeType === 1) {
      children.push(node as Element)
    }
  }
  return children
}

/**
 * IE doesn't support `element.parentElement` in SVG documents.
 * This helper utilizes `parentNode` and checks for the `nodeType`.
 */
export function getParentElement(node: Node): Element | null {
  const parentNode = node.parentNode
  if (parentNode && parentNode.nodeType === Node.ELEMENT_NODE) {
    return parentNode as Element
  }
  return null
}

/**
 * Returns the CSS rules that apply to the given element (ignoring inheritance).
 *
 * Based on https://stackoverflow.com/a/22638396
 */
export function getMatchedCssRules(context: RenderContext, el: Element): CSSStyleRule[] {
  const ret: CSSStyleRule[] = []
  el.matches =
    el.matches ||
    el.webkitMatchesSelector ||
    // @ts-expect-error: legacy browser support
    el.mozMatchesSelector ||
    // @ts-expect-error: legacy browser support
    el.msMatchesSelector ||
    // @ts-expect-error: legacy browser support
    el.oMatchesSelector

  context.styleSheets.forEach(sheet => {
    const rules = sheet.rules || sheet.cssRules
    for (const r in rules) {
      const rule = rules[r] as CSSStyleRule
      if (el.matches(rule.selectorText)) {
        ret.push(rule)
      }
    }
  })
  return ret
}

/**
 * Moves the child-nodes from the source to a new parent.
 */
export function reparentNodes<T extends SVGElement>(newParent: T, source: SVGElement): T {
  while (source.firstChild) {
    newParent.append(source.firstChild)
  }
  return newParent
}

/**
 * Returns the id from the url string
 */
export function getIdFromUrl(url: string | null): string | null {
  if (url === null) {
    return null
  }
  const result =
    /url\('#?(.*?)'\)/.exec(url) || /url\("#?(.*?)"\)/.exec(url) || /url\(#?(.*?)\)/.exec(url)
  if (result && result.length > 1) {
    return result[1]
  }
  return null
}
