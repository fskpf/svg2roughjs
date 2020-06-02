[![npm version](https://badge.fury.io/js/svg2roughjs.svg)](https://badge.fury.io/js/svg2roughjs)

# svg2rough.js

Utilizes [Rough.js](https://github.com/pshihn/rough) to convert an SVG to a hand-drawn visualization.

Try the sample application [here](https://fskpf.github.io/).

## Installation
Just install it from the NPM registry with

```
npm install --save svg2roughjs
```

or pack it yourself with `npm pack` and depend on the tar ball to import `Svg2Roughjs`.

```
  "dependencies": {
    "svg2roughjs": "<path-to>/svg2roughjs-<version>.tgz"
  },
```

## Usage
For example see `/sample-application/` which is a simple web application with controls to load some sample SVG files and change some of Rough.js parameters.

Then you can import it as usual
```
import Svg2Roughjs from 'svg2roughjs'
```
and instantiate it with an output div in which the canvas should be created. Setting an `SVGSVGElement` as `svg` triggers the drawing.
```
const svg2roughjs = new Svg2Roughjs('#output')
const svg = document.getElementById('some-svg-element')
svg2roughjs.svg = svg // or maybe use the DOMParser to load an SVG file instead
```
The `roughConfig` property may be used to pass additional Rough.js style properties, e.g. to change the fill-style, roughness or bowing, as shown in the `sample-application`.

`fontFamily` can be used to define a custom font with which text elements should be drawn. By default, 'Comic Sans MS, cursive' is used. If set to `null`, the text element's original font-family is used.

`backgroundColor` can be used to set a base color for the canvas on which the sketch is created. By default, it is drawn on a transparent canvas.

`randomize` can be used to randomize Rough.js' fillWeight, hachureAngle and hachureGap. Enabled by default.

## Sample Images

Some sample images with different Svg2rough.js settings. Try it yourself [here](https://fskpf.github.io/).

SVG | Sketch
--- | ---
<img src="https://fskpf.github.io/static/sample-images/bpmn1.svg" width="400px"><br>(created with [yEd Live](https://www.yworks.com/yed-live)) | <img src="https://fskpf.github.io/static/sample-images/bpmn1_sketch.png" width="400px"><br>&nbsp;
&nbsp; | &nbsp;
<img src="https://fskpf.github.io/static/sample-images/hierarchic_diagram.svg" width="400px"><br>(created with [yEd Live](https://www.yworks.com/yed-live)) | <img src="https://fskpf.github.io/static/sample-images/hierarchic_diagram_sketch.png" width="400px"><br>&nbsp;
&nbsp; | &nbsp;
<img src="https://fskpf.github.io/static/sample-images/flowchart.svg" width="400px"><br>(created with [yEd Live](https://www.yworks.com/yed-live)) | <img src="https://fskpf.github.io/static/sample-images/flowchart_sketch.png" width="400px"><br>&nbsp;
&nbsp; | &nbsp;
<img src="https://fskpf.github.io/static/sample-images/chirality.svg" width="400px"> | <img src="https://fskpf.github.io/static/sample-images/chirality_sketch.png" width="400px">
&nbsp; | &nbsp;
<img src="https://fskpf.github.io/static/sample-images/comic_boy.svg" width="400px"> | <img src="https://fskpf.github.io/static/sample-images/comic_boy_sketch.png" width="400px">
&nbsp; | &nbsp;
<img src="https://fskpf.github.io/static/sample-images/mars_rover_blueprint.svg" width="400px"> | <img src="https://fskpf.github.io/static/sample-images/mars_rover_sketch.png" width="400px">

## Credits
* [Rough.js](https://github.com/pshihn/rough) - Draws the hand-drawn elements
* [svg-pathdata](https://github.com/nfroidure/svg-pathdata) - Parses SVGPathElements
* [TinyColor](https://github.com/bgrins/TinyColor) - Color manipulation
* [units-css](https://github.com/alexdunphy/units) - CSS units parsing

## License
[MIT License](https://github.com/fskpf/svg2roughjs/blob/master/LICENSE.md) © Fabian Schwarzkopf and Johannes Rössel
