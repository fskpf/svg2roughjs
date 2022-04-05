import { OutputType, Svg2Roughjs } from '../../out-tsc/index'
import { fixture, expect } from '@open-wc/testing'

function loadSvg(url) {
  const request = new XMLHttpRequest()
  request.open('GET', url, false)
  request.overrideMimeType('text/plain; charset=utf-8')
  request.send()
  if (request.status !== 200) {
    throw new Error(`Unable to fetch ${url}, status code: ${request.status}`)
  }
  return request.responseText
}

function loadConfig(url) {
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
function repackage(svg) {
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
function compareRootElements(result, expected) {
  const checkAttributes = ['width', 'height', 'viewBox', 'stroke-linecap']
  for (const attr of checkAttributes) {
    expect(result.getAttribute(attr)).to.equal(
      expected.getAttribute(attr),
      `<svg> attribute ${attr} not matching`
    )
  }
}

describe('please work', () => {
  it('why is this so hard?', async () => {
    const name = 'ellipse-transform'

    const svgTestText = loadSvg(`/test/specs/${name}/test.svg`)
    const svgExpectedText = loadSvg(`/test/specs/${name}/expect.svg`)
    const testConfig = loadConfig(`/test/specs/${name}/config.json`)

    const svgTestElement = await fixture(svgTestText)
    const svgExpectedElement = await fixture(svgExpectedText)

    const svgSketchResult = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const svg2roughjs = new Svg2Roughjs(svgSketchResult, OutputType.SVG, testConfig.roughConfig)
    svg2roughjs.randomize = false
    svg2roughjs.pencilFilter = false
    svg2roughjs.backgroundColor = testConfig.backgroundColor
    svg2roughjs.svg = svgTestElement
    await svg2roughjs.sketch()

    // diff the <svg> attributes
    compareRootElements(svgSketchResult, svgExpectedElement)

    // <svg> tags are not supported and ignore entirely, so move children into a div
    // https://github.com/open-wc/open-wc/issues/1229
    const sketchElement = repackage(svgSketchResult)
    const expectElement = repackage(svgExpectedElement)

    // diff the children
    expect(sketchElement).dom.to.equal(expectElement)
  })
})

// for (const test of window.tests) {
//   const name = test

//   describe(name, function () {
//     this.timeout(5000)
//     const svgTestText = window.loadSvg(`/base/test/specs/${name}/test.svg`)
//     const svgExpectText = window.loadSvg(`/base/test/specs/${name}/expect.svg`)
//     const config = window.loadConfig(`/base/test/specs/${name}/config.json`)

//     const parser = new DOMParser()
//     const svgTestElement = parser.parseFromString(svgTestText, 'image/svg+xml').firstElementChild
//     const svgExpectElement = parser.parseFromString(
//       svgExpectText,
//       'image/svg+xml'
//     ).firstElementChild

//     document.body.appendChild(svgTestElement)

//     it(`testing ${name}`, async function () {
//       const svgSketch = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
//       const svg2roughjs = new Svg2Roughjs(svgSketch, OutputType.SVG, config.roughConfig)
//       svg2roughjs.randomize = false
//       svg2roughjs.pencilFilter = false
//       svg2roughjs.backgroundColor = config.backgroundColor
//       svg2roughjs.svg = svgTestElement
//       await svg2roughjs.sketch()

//       const serializer = new XMLSerializer()
//       let result = serializer.serializeToString(svgSketch)
//       // result = '<?xml version="1.0" standalone="no"?>\r\n' + result

//       console.log(result)

//       // assert.equal(result, svgExpectText)

//       // const el = await fixture(html` result `)

//       expect(el).dom.to.equal(svgExpectText)
//     })
//   })
// }
