import puppeteer from 'puppeteer'
import minimist from 'minimist'
import fs from 'fs'
import { svg2roughjsPage } from './svg2roughjs-page.js'
;(async () => {
  const argv = minimist(process.argv.slice(2), {
    string: ['backgroundColor', 'fontFamily'],
    boolean: ['randomize', 'sketchPatterns', 'pencilFilter'],
    alias: {
      o: 'output'
    }
  })

  const inputSvg = loadInputSvg(argv)

  const browser = await puppeteer.launch({ headless: 'new' })
  const page = await browser.newPage()

  // load the input SVG as part of the HTML file and run svg2roughjs on the input
  const svg2roughjsArgs = getSvg2RoughjsArgs(argv)
  await page.setContent(svg2roughjsPage(inputSvg, svg2roughjsArgs))

  // get the sketch from the DOM
  const sketch = await page.$eval('#output-container > svg', el => el.outerHTML)

  const outputFilePath = argv.output
  saveSketch(sketch, outputFilePath)

  // for debugging, disable close and use headless: false
  await browser.close()
})()

/**
 * Loads the input SVG from the CLI.
 * @param {object} argv The CLI arguments
 * @returns {string} The content of the input file
 */
function loadInputSvg(argv) {
  const inputFile = argv._[0]
  if (!inputFile) {
    throw new Error('No input file provided. Please pass the input SVG as first parameter.')
  }

  if (!fs.existsSync(inputFile)) {
    throw new Error(`File "${inputFile}" does not exist.`)
  }

  const content = fs.readFileSync(inputFile, 'utf8')

  // TODO validate as SVG?

  return content
}

/**
 * Downloads the sketch as file.
 * @param {string} content The SVG string of the sketch
 * @param {string?} outputFilePath The file path to save the output to.
 */
function saveSketch(content, outputFilePath) {
  if (!content) {
    throw new Error('Could not save file, no sketch given.')
  }
  // TODO validate SVG?

  fs.writeFileSync(outputFilePath ?? './sketch.svg', content)
}

function getSvg2RoughjsArgs(argv) {
  const args = { ...argv }
  // remove arguments for the CLI
  delete args._
  delete args.o
  delete args.output

  return Object.fromEntries(
    Object.entries(args).map(([key, value]) => {
      // replace null arguments with the actual null value
      if (value === 'null') {
        return [key, null]
      }
      return [key, value]
    })
  )
}
