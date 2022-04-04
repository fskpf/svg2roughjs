// import { OutputType, Svg2Roughjs } from '../../out-tsc/index'
// import { OutputType, Svg2Roughjs } from '../../src/index'
import { OutputType, Svg2Roughjs } from '../lib/dist/svg2roughjs.es'

import { fixture, expect } from '@open-wc/testing'

describe('please work', () => {
  it('why is this so hard?', async () => {
    const el = await fixture(`<div><!-- comment --><h1>${'Hey'}  </h1>  </div>`)
    expect(el).dom.to.equal('<div><h1>Hey</h1></div>')
    // assert.equal(1, 2)
    // expect(1).to.be(1)
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
