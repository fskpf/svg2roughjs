import { expect } from '@open-wc/testing'

export function loadSvg(url) {
  const request = new XMLHttpRequest()
  request.open('GET', url, false)
  request.overrideMimeType('text/plain; charset=utf-8')
  request.send()
  if (request.status !== 200) {
    throw new Error(`Unable to fetch ${url}, status code: ${request.status}`)
  }
  return request.responseText
}

export function loadConfig(url) {
  const request = new XMLHttpRequest()
  request.open('GET', url, false)
  request.send()
  if (request.status !== 200) {
    throw new Error(`Unable to fetch ${url}, status code: ${request.status}`)
  }
  return JSON.parse(request.responseText)
}

/**
 * Moves all children of the given SVG into a div to workaround
 * https://github.com/open-wc/open-wc/issues/1229
 * @param {SVGSVGElement} svg
 * @returns {HTMLDivElement}
 */
export function repackage(svg) {
  const newParent = document.createElement('div')
  newParent.className = 'svg-surrogate'
  while (svg.childNodes.length > 0) {
    newParent.appendChild(svg.childNodes[0])
  }
  return newParent
}

/**
 * Compares the attributes of the svg root elements
 * @param {SVGSVGElement} result
 * @param {SVGSVGElement} expected
 */
export function compareRootElements(result, expected) {
  const checkAttributes = ['width', 'height', 'viewBox', 'stroke-linecap']
  for (const attr of checkAttributes) {
    expect(result.getAttribute(attr)).to.equal(
      expected.getAttribute(attr),
      `<svg> attribute ${attr} not matching`
    )
  }
}
