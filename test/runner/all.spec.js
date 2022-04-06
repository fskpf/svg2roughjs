import { expect, fixture, html } from '@open-wc/testing'
import { OutputType, Svg2Roughjs } from '../../out-tsc/index'
import { compareRootElements, loadConfig, loadSvg, repackage } from './utils'
import { rendererTests } from '../tests'

for (const test of rendererTests) {
  const name = test

  describe(name, () => {
    it(`testing ${name}`, async () => {
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

      // Diff the DOMs
      // Ensure that the expected element is provided as string, otherwise the internal
      // 'getDiffableHTML' results in different casing from the expect element (which is
      // provided as string internally as well).
      expect(sketchElement).dom.to.equal(expectElement.outerHTML)
    })
  })
}
