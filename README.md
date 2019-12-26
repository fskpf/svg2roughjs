# svg2rough.js

Utilizes [Rough.js](https://github.com/pshihn/rough) to convert an SVG to a hand-drawn visualization.

Try the sample application [here](https://fskpf.github.io/).

Note: Labels are currently not supported.

## Usage
It's an ES6 module, so you can run `npm pack` and depend on the tar ball to import `Svg2Roughjs`.

```
  "dependencies": {
    "svg2roughjs": "<path-to>/svg2roughjs-<version>.tgz"
  },
```

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
The `roughConfig` property may be used to pass additional Rough.js style properties , e.g. to change the fill-style, roughness or bowing, as shown in the `sample-application`. 

## Sample Images
These images are taken from the [sample application](https://fskpf.github.io/) which contains the original input SVG files (created with [yEd Live](https://www.yworks.com/yed-live)).
<img src="./sample-images/hierarchical-sample.png" width="600">
<img src="./sample-images/bpmn-sample.png" width="600">
<img src="./sample-images/movies-sample.png" width="600">
<img src="./sample-images/organic-sample.png" width="600">

## Credits
* [Rough.js](https://github.com/pshihn/rough) - Draws the hand-drawn elements
* [svg-pathdata](https://github.com/nfroidure/svg-pathdata) - Parses SVGPathElements
* [TinyColor](https://github.com/bgrins/TinyColor) - Help with color manipulation

## License
[MIT License](https://github.com/fskpf/svg2roughjs/blob/master/LICENSE.md) (c) Fabian Schwarzkopf