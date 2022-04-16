# svg2rough.js

[![npm version](https://badge.fury.io/js/svg2roughjs.svg)](https://badge.fury.io/js/svg2roughjs)

Utilizes [Rough.js](https://github.com/pshihn/rough) to convert an SVG to a hand-drawn visualization.

Try the sample application [here](https://fskpf.github.io/).

## Installation

Just install it from the NPM registry with

```shell
npm install --save svg2roughjs
```

or pack it yourself with `npm pack` and depend on the tar ball to import `Svg2Roughjs`.

```json
"dependencies": {
  "svg2roughjs": "<path-to>/svg2roughjs-<version>.tgz"
},
```

## Usage

For example see `/sample-application/` which is a simple web application with controls to load some sample SVG files and change some of Rough.js parameters.

Then you can import it as usual

```javascript
import Svg2Roughjs from 'svg2roughjs'
```

and instantiate it with an output div in which the canvas should be created. Calling `sketch()` outputs the current `svg` to the given element as hand-drawn sketch.

```javascript
const svg2roughjs = new Svg2Roughjs('#output')
const svg = document.getElementById('some-svg-element')
svg2roughjs.svg = svg // or maybe use the DOMParser to load an SVG file instead
svg2roughs.sketch()
```

## API

### Exports

- `Svg2Roughjs`: The main class for the conversion.
- `OutputType`: An enum that is used to switch between `SVG` and `CANVAS` output when targetting an `HTMLDivElement` as output container.

### Methods

- `constructor(target, outputType?, roughConfig?)`

  Creates a new Svg2Rough.js instance.

  `target` may either be a selector for a parent HTML element into which a new canvas or SVG should be created, or directly an `SVGSVGElement` or `HTMLCanvasElement` that should be used for the output.

  The optional `outputType` defaults to the respective mode if `target` is either `SVGSVGElement` or `HTMLCanvasElement`. If targetting an HTML container element, then `OutputType.SVG` is used by default.

- `async sketch()`

  Clears the targetted output `SVGSVGElement` or `HTMLCanvasElement` and converts the set `svg` to a hand-drawn sketch.

### Properties

| Property          | Description                                                                                                          | Default                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `svg`             | The input SVG that should be converted.                                                                              | `undefined`                |
| `outputType`      | Switch between canvas or SVG output.                                                                                 | `OutputType.SVG`           |
| `roughConfig`     | Rough.js style properties, e.g. to change the fill-style, roughness or bowing.                                       | `{}`                       |
| `fontFamily`      | Font with which text elements should be drawn.<br>If set to `null`, the text element's original font-family is used. | `'Comic Sans MS, cursive'` |
| `backgroundColor` | Sets a background color onto which the sketch is drawn.                                                              | `transparent`              |
| `randomize`       | Randomize Rough.js' fillWeight, hachureAngle and hachureGap.                                                         | `true`                     |
| `sketchPatterns`  | Whether to sketch pattern fills/strokes or just copy them to the output                                              | `true`                     |
| `pencilFilter`    | Applies a pencil effect on the SVG rendering.                                                                        | `false`                    |

## Sample Images

Some sample images with different Svg2rough.js settings. Try it yourself [here](https://fskpf.github.io/).

| SVG                                                                                                                                                         | Sketch                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| <img src="https://fskpf.github.io/static/sample-images/bpmn1.svg" width="400px"><br>(created with [yEd Live](https://www.yworks.com/yed-live))              | <img src="https://fskpf.github.io/static/sample-images/bpmn1_sketch.png" width="400px"><br>&nbsp;              |
| &nbsp;                                                                                                                                                      | &nbsp;                                                                                                         |
| <img src="https://fskpf.github.io/static/sample-images/hierarchic_diagram.svg" width="400px"><br>(created with [yEd Live](https://www.yworks.com/yed-live)) | <img src="https://fskpf.github.io/static/sample-images/hierarchic_diagram_sketch.png" width="400px"><br>&nbsp; |
| &nbsp;                                                                                                                                                      | &nbsp;                                                                                                         |
| <img src="https://fskpf.github.io/static/sample-images/flowchart.svg" width="400px"><br>(created with [yEd Live](https://www.yworks.com/yed-live))          | <img src="https://fskpf.github.io/static/sample-images/flowchart_sketch.png" width="400px"><br>&nbsp;          |
| &nbsp;                                                                                                                                                      | &nbsp;                                                                                                         |
| <img src="https://fskpf.github.io/static/sample-images/chirality.svg" width="400px">                                                                        | <img src="https://fskpf.github.io/static/sample-images/chirality_sketch.png" width="400px">                    |
| &nbsp;                                                                                                                                                      | &nbsp;                                                                                                         |
| <img src="https://fskpf.github.io/static/sample-images/comic_boy.svg" width="400px">                                                                        | <img src="https://fskpf.github.io/static/sample-images/comic_boy_sketch.png" width="400px">                    |
| &nbsp;                                                                                                                                                      | &nbsp;                                                                                                         |
| <img src="https://fskpf.github.io/static/sample-images/mars_rover_blueprint.svg" width="400px">                                                             | <img src="https://fskpf.github.io/static/sample-images/mars_rover_sketch.png" width="400px">                   |

## Credits

- [Rough.js](https://github.com/pshihn/rough) – Draws the hand-drawn elements
- [svg-pathdata](https://github.com/nfroidure/svg-pathdata) – Parses SVGPathElements
- [TinyColor](https://github.com/bgrins/TinyColor) – Color manipulation

## License

[MIT License](https://github.com/fskpf/svg2roughjs/blob/master/LICENSE.md) © Fabian Schwarzkopf and Johannes Rössel
