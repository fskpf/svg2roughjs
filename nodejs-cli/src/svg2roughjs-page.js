/**
 * @param {string} inputSvg The SVG that should be converted
 * @param {Record<string,unknown>} svg2roughjsArgs The SVG that should be converted
 * @returns {string} HTML content of the converter page
 */
export function svg2roughjsPage(inputSvg, svg2roughjsArgs) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>svg2roughjs</title>
  <script src="https://unpkg.com/svg2roughjs/dist/svg2roughjs.umd.min.js"></script>
</head>
<body>
  <div id="input-svg-container">${inputSvg}</div>
  <div id="output-container"></div>
  <script type="module">
    const { Svg2Roughjs, OutputType } = svg2roughjs
    ${createSvg2RoughjsInstance(svg2roughjsArgs)}
    svgConverter.svg = document.querySelector('#input-svg-container > svg')
    await svgConverter.sketch()
  </script>
</body>
</html>
`
}

/**
 * @param {Record<string, unknown>} args
 * @returns {string}
 */
function createSvg2RoughjsInstance(args) {
  let instance = "const svgConverter = new Svg2Roughjs('#output-container', OutputType.SVG)"
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string') {
      instance += `\nsvgConverter.${key} = '${value}'`
    } else if (typeof value === 'object') {
      instance += `\nsvgConverter.${key} = ${JSON.stringify(value)}`
    } else {
      instance += `\nsvgConverter.${key} = ${value}`
    }
  }
  return instance
}
