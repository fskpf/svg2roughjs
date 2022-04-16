import { RenderContext, UseContext } from '../types'

/**
 * Returns the attribute value of an element under consideration
 * of inherited attributes from the `parentNode`.
 * @param attributeName Name of the attribute to look up
 * @param currentUseCtx Consider different DOM hierarchy for use elements
 * @return attribute value if it exists
 */

export function getEffectiveAttribute(
  context: RenderContext,
  element: SVGElement,
  attributeName: string,
  currentUseCtx?: UseContext | null
): string | undefined {
  // getComputedStyle doesn't work for, e.g. <svg fill='rgba(...)'>
  let attr
  if (!currentUseCtx) {
    attr =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getComputedStyle(element) as any)[attributeName] || element.getAttribute(attributeName)
  } else {
    // use elements traverse a different parent-hierarchy, thus we cannot use getComputedStyle here
    attr = element.getAttribute(attributeName)
  }

  if (!attr) {
    let parent: Node | null = element.parentNode

    const useCtx = currentUseCtx
    let nextCtx = useCtx

    if (useCtx && useCtx.referenced === element) {
      // switch context and traverse the use-element parent now
      parent = useCtx.root
      nextCtx = useCtx.parentContext
    }

    if (!parent || parent === context.sourceSvg) {
      return
    }
    return getEffectiveAttribute(context, parent as SVGElement, attributeName, nextCtx)
  }
  return attr
}

/**
 * Traverses the given elements hierarchy bottom-up to determine its effective
 * opacity attribute.
 * @param currentUseCtx Consider different DOM hierarchy for use elements
 */
export function getEffectiveElementOpacity(
  context: RenderContext,
  element: SVGElement,
  currentOpacity: number,
  currentUseCtx?: UseContext | null
): number {
  let attr
  if (!currentUseCtx) {
    attr = getComputedStyle(element)['opacity'] || element.getAttribute('opacity')
  } else {
    // use elements traverse a different parent-hierarchy, thus we cannot use getComputedStyle here
    attr = element.getAttribute('opacity')
  }
  if (attr) {
    let elementOpacity = 1
    if (attr.indexOf('%') !== -1) {
      elementOpacity = Math.min(
        1,
        Math.max(0, parseFloat(attr.substring(0, attr.length - 1)) / 100)
      )
    } else {
      elementOpacity = Math.min(1, Math.max(0, parseFloat(attr)))
    }
    // combine opacities
    currentOpacity *= elementOpacity
  }
  // traverse upwards to combine parent opacities as well
  let parent: Node | null = element.parentNode

  const useCtx = currentUseCtx
  let nextUseCtx = useCtx

  if (useCtx && useCtx.referenced === element) {
    // switch context and traverse the use-element parent now
    parent = useCtx.root
    nextUseCtx = useCtx.parentContext
  }

  if (!parent || parent === context.sourceSvg) {
    return currentOpacity
  }

  return getEffectiveElementOpacity(context, parent as SVGElement, currentOpacity, nextUseCtx)
}
