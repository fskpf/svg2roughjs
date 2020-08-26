import tinycolor from 'tinycolor2';
import { SVGPathData, SVGPathDataTransformer, encodeSVGPath } from 'svg-pathdata';
import rough from 'roughjs/bundled/rough.esm';

/**
 * A small helper class that represents a point.
 */
var Point = /** @class */ (function () {
    function Point(x, y) {
        this.$x = x || 0;
        this.$y = y || 0;
    }
    Object.defineProperty(Point.prototype, "x", {
        get: function () {
            return this.$x;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Point.prototype, "y", {
        get: function () {
            return this.$y;
        },
        enumerable: false,
        configurable: true
    });
    Point.prototype.toString = function () {
        return this.x + "," + this.y;
    };
    return Point;
}());

var RenderMode;
(function (RenderMode) {
    RenderMode[RenderMode["SVG"] = 0] = "SVG";
    RenderMode[RenderMode["CANVAS"] = 1] = "CANVAS";
})(RenderMode || (RenderMode = {}));

var SvgTextures = /** @class */ (function () {
    function SvgTextures() {
    }
    Object.defineProperty(SvgTextures, "pencilTextureFilter", {
        get: function () {
            var filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
            filter.setAttribute('id', 'pencilTextureFilter');
            filter.setAttribute('x', '0%');
            filter.setAttribute('y', '0%');
            filter.setAttribute('width', '100%');
            filter.setAttribute('height', '100%');
            filter.setAttribute('filterUnits', 'objectBoundingBox');
            var feTurbulence = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
            feTurbulence.setAttribute('type', 'fractalNoise');
            feTurbulence.setAttribute('baseFrequency', '2');
            feTurbulence.setAttribute('numOctaves', '5');
            feTurbulence.setAttribute('stitchTiles', 'stitch');
            feTurbulence.setAttribute('result', 'f1');
            filter.appendChild(feTurbulence);
            var feColorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
            feColorMatrix.setAttribute('type', 'matrix');
            feColorMatrix.setAttribute('values', '0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1.5 1.5');
            feColorMatrix.setAttribute('result', 'f2');
            filter.appendChild(feColorMatrix);
            var feComposite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
            feComposite.setAttribute('operator', 'in');
            feComposite.setAttribute('in', 'SourceGraphic');
            feComposite.setAttribute('in2', 'f2');
            feComposite.setAttribute('result', 'f3');
            filter.appendChild(feComposite);
            return filter;
        },
        enumerable: false,
        configurable: true
    });
    return SvgTextures;
}());

var units = require('units-css');
/**
 * Svg2Roughjs parses a given SVG and draws it with Rough.js
 * in a canvas.
 */
var Svg2Roughjs = /** @class */ (function () {
    /**
     * Creates a new instance of Svg2roughjs.
     * @param target Either a selector for the container to which a canvas should be added
     * or an `HTMLCanvasElement` or `SVGSVGElement` that should be used as output target.
     * @param renderMode Whether the output should be an SVG or drawn to an HTML canvas.
     * Defaults to SVG or CANVAS depending if the given target is of type `HTMLCanvasElement` or `SVGSVGElement`,
     * otherwise it defaults to SVG.
     * @param roughConfig Config object this passed to the Rough.js ctor and
     * also used while parsing the styles for `SVGElement`s.
     */
    function Svg2Roughjs(target, renderMode, roughConfig) {
        if (renderMode === void 0) { renderMode = RenderMode.SVG; }
        if (roughConfig === void 0) { roughConfig = {}; }
        this.width = 0;
        this.height = 0;
        this.$renderMode = RenderMode.CANVAS;
        this.ctx = null;
        this.$pencilFilter = false;
        this.idElements = {};
        if (!target) {
            throw new Error('No target provided');
        }
        if (typeof target === 'object') {
            if (target.tagName === 'canvas' || target.tagName === 'svg') {
                this.canvas = target;
                this.$renderMode = target.tagName === 'canvas' ? RenderMode.CANVAS : RenderMode.SVG;
            }
            else {
                throw new Error('Target object is not of type HMTLCanvaseElement or SVGSVGElement');
            }
        }
        else if (typeof target === 'string') {
            // create a new HTMLCanvasElement as child of the given element
            var container = document.querySelector(target);
            if (!container) {
                throw new Error("No element found with " + target);
            }
            if (renderMode === RenderMode.CANVAS) {
                this.canvas = document.createElement('canvas');
                this.canvas.width = container.clientWidth;
                this.canvas.height = container.clientHeight;
            }
            else {
                this.canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                this.canvas.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                this.canvas.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
            }
            this.$renderMode = renderMode;
            container.appendChild(this.canvas);
        }
        // the Rough.js instance to draw the SVG elements
        if (this.renderMode === RenderMode.CANVAS && this.ctx) {
            var canvas = this.canvas;
            this.rc = rough.canvas(canvas, roughConfig);
            // canvas context for convenient access
            this.ctx = canvas.getContext('2d');
        }
        else {
            this.rc = rough.svg(this.canvas, roughConfig);
        }
        this.$roughConfig = roughConfig;
        // default font family
        this.$fontFamily = 'Comic Sans MS, cursive';
        // we randomize the visualization per element by default
        this.$randomize = true;
    }
    Object.defineProperty(Svg2Roughjs, "CONTAINS_UNIT_REGEXP", {
        /**
         * A simple regexp which is used to test whether a given string value
         * contains unit identifiers, e.g. "1px", "1em", "1%", ...
         */
        get: function () {
            return /[a-z%]/;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Svg2Roughjs.prototype, "svg", {
        get: function () {
            return this.$svg;
        },
        /**
         * The SVG that should be converted.
         * Changing this property triggers drawing of the SVG into
         * the canvas or container element with which Svg2Roughjs
         * was initialized.
         */
        set: function (svg) {
            if (this.$svg !== svg) {
                this.$svg = svg;
                if (svg.hasAttribute('width')) {
                    this.width = svg.width.baseVal.value;
                }
                else if (svg.hasAttribute('viewBox')) {
                    this.width = svg.viewBox.baseVal.width;
                }
                else {
                    this.width = 300;
                }
                if (svg.hasAttribute('height')) {
                    this.height = svg.height.baseVal.value;
                }
                else if (svg.hasAttribute('viewBox')) {
                    this.height = svg.viewBox.baseVal.height;
                }
                else {
                    this.height = 150;
                }
                if (this.renderMode === RenderMode.CANVAS && this.ctx) {
                    var canvas = this.canvas;
                    canvas.width = this.width;
                    canvas.height = this.height;
                }
                else {
                    var svg_1 = this.canvas;
                    svg_1.setAttribute('width', this.width.toString());
                    svg_1.setAttribute('height', this.height.toString());
                }
                // pre-process defs for subsequent references
                this.collectElementsWithID();
                this.redraw();
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Svg2Roughjs.prototype, "roughConfig", {
        get: function () {
            return this.$roughConfig;
        },
        /**
         * Rough.js config object that is provided to Rough.js for drawing
         * any SVG element.
         * Changing this property triggers a repaint.
         */
        set: function (config) {
            this.$roughConfig = config;
            if (this.renderMode === RenderMode.CANVAS && this.ctx) {
                this.rc = rough.canvas(this.canvas, this.$roughConfig);
            }
            else {
                this.rc = rough.svg(this.canvas, this.$roughConfig);
            }
            this.redraw();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Svg2Roughjs.prototype, "fontFamily", {
        get: function () {
            return this.$fontFamily;
        },
        /**
         * Set a font-family for the rendering of text elements.
         * If set to `null`, then the font-family of the SVGTextElement is used.
         * By default, 'Comic Sans MS, cursive' is used.
         * Changing this property triggers a repaint.
         */
        set: function (fontFamily) {
            if (this.$fontFamily !== fontFamily) {
                this.$fontFamily = fontFamily;
                this.redraw();
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Svg2Roughjs.prototype, "randomize", {
        get: function () {
            return this.$randomize;
        },
        /**
         * Whether to randomize Rough.js' fillWeight, hachureAngle and hachureGap.
         * Also randomizes the disableMultiStroke option of Rough.js.
         * By default true.
         * Changing this property triggers a repaint.
         */
        set: function (randomize) {
            this.$randomize = randomize;
            this.redraw();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Svg2Roughjs.prototype, "backgroundColor", {
        get: function () {
            return this.$backgroundColor;
        },
        /**
         * Optional solid background color with which
         * the canvas should be initialized.
         * It is drawn on a transparent canvas by default.
         */
        set: function (color) {
            this.$backgroundColor = color;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Svg2Roughjs.prototype, "renderMode", {
        get: function () {
            return this.$renderMode;
        },
        /**
         * Changes the output format of the converted SVG.
         * Changing this property will replace the current output
         * element with either a new HTML canvas or new SVG element.
         */
        set: function (mode) {
            if (this.$renderMode === mode) {
                return;
            }
            this.$renderMode = mode;
            var parent = this.canvas.parentElement;
            parent.removeChild(this.canvas);
            var target;
            if (mode === RenderMode.CANVAS) {
                target = document.createElement('canvas');
                target.width = this.width;
                target.height = this.height;
                this.ctx = target.getContext('2d');
            }
            else {
                this.ctx = null;
                target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                target.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                target.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
                target.setAttribute('width', this.width.toString());
                target.setAttribute('height', this.height.toString());
            }
            parent.appendChild(target);
            this.canvas = target;
            if (mode === RenderMode.CANVAS) {
                this.rc = rough.canvas(this.canvas, this.$roughConfig);
            }
            else {
                this.rc = rough.svg(this.canvas, this.$roughConfig);
            }
            this.redraw();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Svg2Roughjs.prototype, "pencilFilter", {
        get: function () {
            return this.$pencilFilter;
        },
        /**
         * Whether to apply a pencil filter.
         * Only works for SVG render mode.
         */
        set: function (value) {
            if (this.$pencilFilter !== value) {
                this.$pencilFilter = value;
                this.redraw();
            }
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Triggers an entire redraw of the SVG which also
     * processes it anew.
     */
    Svg2Roughjs.prototype.redraw = function () {
        if (!this.svg) {
            return;
        }
        // reset target element
        if (this.renderMode === RenderMode.CANVAS && this.ctx) {
            this.initializeCanvas(this.canvas);
        }
        else {
            this.initializeSvg(this.canvas);
        }
        this.processRoot(this.svg, null, this.width, this.height);
    };
    /**
     * Prepares the given canvas element depending on the set properties.
     */
    Svg2Roughjs.prototype.initializeCanvas = function (canvas) {
        this.ctx = canvas.getContext('2d');
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.width, this.height);
            if (this.backgroundColor) {
                this.ctx.fillStyle = this.backgroundColor;
                this.ctx.fillRect(0, 0, this.width, this.height);
            }
        }
    };
    /**
     * Prepares the given SVG element depending on the set properties.
     */
    Svg2Roughjs.prototype.initializeSvg = function (svgElement) {
        // maybe canvas rendering was used before
        this.ctx = null;
        // clear SVG element
        while (svgElement.firstChild) {
            svgElement.removeChild(svgElement.firstChild);
        }
        // apply backgroundColor
        var backgroundElement;
        if (this.backgroundColor) {
            backgroundElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            backgroundElement.width.baseVal.value = this.width;
            backgroundElement.height.baseVal.value = this.height;
            backgroundElement.setAttribute('fill', this.backgroundColor);
            svgElement.appendChild(backgroundElement);
        }
        // prepare filter effects
        if (this.pencilFilter) {
            var defs = this.getDefsElement(svgElement);
            defs.appendChild(SvgTextures.pencilTextureFilter);
        }
    };
    /**
     * Traverses the SVG in DFS and draws each element to the canvas.
     * @param root either an SVG- or g-element
     * @param width Use elements can overwrite width
     * @param height Use elements can overwrite height
     */
    Svg2Roughjs.prototype.processRoot = function (root, svgTransform, width, height) {
        var _a, _b;
        // traverse svg in DFS
        var stack = [];
        if (root instanceof SVGSVGElement ||
            root instanceof SVGSymbolElement ||
            root instanceof SVGMarkerElement) {
            var rootX = 0;
            var rootY = 0;
            if (root instanceof SVGSymbolElement) {
                rootX = parseFloat((_a = root.getAttribute('x')) !== null && _a !== void 0 ? _a : '') || 0;
                rootY = parseFloat((_b = root.getAttribute('y')) !== null && _b !== void 0 ? _b : '') || 0;
                width = width || parseFloat(root.getAttribute('width')) || void 0;
                height = height || parseFloat(root.getAttribute('height')) || void 0;
            }
            else if (root instanceof SVGMarkerElement) {
                rootX = -root.refX.baseVal.value;
                rootY = -root.refY.baseVal.value;
                width = width || parseFloat(root.getAttribute('markerWidth')) || void 0;
                height = height || parseFloat(root.getAttribute('markerHeight')) || void 0;
            }
            else {
                rootX = root.x.baseVal.value;
                rootY = root.y.baseVal.value;
            }
            var rootTransform = this.svg.createSVGMatrix();
            if (typeof width !== 'undefined' &&
                typeof height !== 'undefined' &&
                root.getAttribute('viewBox')) {
                var _c = root.viewBox.baseVal, viewBoxX = _c.x, viewBoxY = _c.y, viewBoxWidth = _c.width, viewBoxHeight = _c.height;
                // viewBox values might scale the SVGs content
                if (root.tagName === 'marker') {
                    // refX / refY works differently on markers than the x / y attribute
                    rootTransform = rootTransform
                        .translate(-viewBoxX * (width / viewBoxWidth), -viewBoxY * (height / viewBoxHeight))
                        .scaleNonUniform(width / viewBoxWidth, height / viewBoxHeight)
                        .translate(rootX, rootY);
                }
                else {
                    rootTransform = rootTransform
                        .translate(-viewBoxX * (width / viewBoxWidth), -viewBoxY * (height / viewBoxHeight))
                        .translate(rootX, rootY)
                        .scaleNonUniform(width / viewBoxWidth, height / viewBoxHeight);
                }
            }
            else {
                rootTransform = rootTransform.translate(rootX, rootY);
            }
            var combinedMatrix = svgTransform
                ? svgTransform.matrix.multiply(rootTransform)
                : rootTransform;
            svgTransform = this.svg.createSVGTransformFromMatrix(combinedMatrix);
            // don't put the SVG itself into the stack, so start with the children of it
            var children = this.getNodeChildren(root);
            for (var i = children.length - 1; i >= 0; i--) {
                var child = children[i];
                if (child instanceof SVGSymbolElement || child instanceof SVGMarkerElement) {
                    // symbols and marker can only be instantiated by specific elements
                    continue;
                }
                var childTransform = svgTransform
                    ? this.getCombinedTransform(child, svgTransform)
                    : this.getSvgTransform(child);
                stack.push({ element: child, transform: childTransform });
            }
        }
        else {
            stack.push({ element: root, transform: svgTransform });
        }
        while (stack.length > 0) {
            var _d = stack.pop(), element = _d.element, transform = _d.transform;
            // maybe draw the element
            this.drawElement(element, transform);
            if (element.tagName === 'defs' ||
                element.tagName === 'symbol' ||
                element.tagName === 'marker' ||
                element.tagName === 'svg' ||
                element.tagName === 'clipPath') {
                // Defs are prepocessed separately.
                // Symbols and marker can only be instantiated by specific elements.
                // Don't traverse the SVG element itself. This is done by drawElement -> processRoot.
                // ClipPaths are not drawn and processed separately.
                continue;
            }
            // process childs
            var children = this.getNodeChildren(element);
            for (var i = children.length - 1; i >= 0; i--) {
                var childElement = children[i];
                var newTransform = transform
                    ? this.getCombinedTransform(childElement, transform)
                    : this.getSvgTransform(childElement);
                stack.push({ element: childElement, transform: newTransform });
            }
        }
    };
    /**
     * Helper method to append the returned `SVGGElement` from
     * Rough.js when drawing in SVG mode.
     */
    Svg2Roughjs.prototype.postProcessElement = function (element, sketchElement) {
        if (this.renderMode === RenderMode.SVG && sketchElement) {
            // maybe apply a clip-path
            var sketchClipPathId = element.getAttribute('data-sketchy-clip-path');
            if (sketchClipPathId) {
                sketchElement.setAttribute('clip-path', "url(#" + sketchClipPathId + ")");
            }
            if (this.pencilFilter && element.tagName !== 'text') {
                sketchElement.setAttribute('filter', 'url(#pencilTextureFilter)');
            }
            this.canvas.appendChild(sketchElement);
        }
    };
    /**
     * Combines the given transform with the element's transform.
     */
    Svg2Roughjs.prototype.getCombinedTransform = function (element, transform) {
        var elementTransform = this.getSvgTransform(element);
        if (elementTransform) {
            var elementTransformMatrix = elementTransform.matrix;
            var combinedMatrix = transform.matrix.multiply(elementTransformMatrix);
            return this.svg.createSVGTransformFromMatrix(combinedMatrix);
        }
        return transform;
    };
    /**
     * Returns the consolidated of the given element.
     */
    Svg2Roughjs.prototype.getSvgTransform = function (element) {
        if (element.transform && element.transform.baseVal.numberOfItems > 0) {
            return element.transform.baseVal.consolidate();
        }
        return null;
    };
    /**
     * Applies the given svgTransform to the canvas context.
     * @param element The element to which the transform should be applied
     * when in SVG mode.
     */
    Svg2Roughjs.prototype.applyGlobalTransform = function (svgTransform, element) {
        if (svgTransform && svgTransform.matrix) {
            var matrix = svgTransform.matrix;
            if (this.renderMode === RenderMode.CANVAS && this.ctx) {
                // IE11 doesn't support SVGMatrix as parameter for setTransform
                this.ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
            }
            else if (this.renderMode === RenderMode.SVG && element) {
                if (element.transform.baseVal.numberOfItems > 0) {
                    element.transform.baseVal.getItem(0).setMatrix(matrix);
                }
                else {
                    element.transform.baseVal.appendItem(svgTransform);
                }
            }
        }
    };
    /**
     * Whether the given SVGTransform resembles an identity transform.
     * @returns Whether the transform is an identity transform.
     *  Returns true if transform is undefined.
     */
    Svg2Roughjs.prototype.isIdentityTransform = function (svgTransform) {
        if (!svgTransform) {
            return true;
        }
        var matrix = svgTransform.matrix;
        return (!matrix ||
            (matrix.a === 1 &&
                matrix.b === 0 &&
                matrix.c === 0 &&
                matrix.d === 1 &&
                matrix.e === 0 &&
                matrix.f === 0));
    };
    /**
     * Whether the given SVGTransform does not scale nor skew.
     * @returns Whether the given SVGTransform does not scale nor skew.
     *  Returns true if transform is undefined.
     */
    Svg2Roughjs.prototype.isTranslationTransform = function (svgTransform) {
        if (!svgTransform) {
            return true;
        }
        var matrix = svgTransform.matrix;
        return !matrix || (matrix.a === 1 && matrix.b === 0 && matrix.c === 0 && matrix.d === 1);
    };
    /**
     * Stores elements with IDs for later use.
     */
    Svg2Roughjs.prototype.collectElementsWithID = function () {
        this.idElements = {};
        var elementsWithID = Array.prototype.slice.apply(this.svg.querySelectorAll('*[id]'));
        for (var _i = 0, elementsWithID_1 = elementsWithID; _i < elementsWithID_1.length; _i++) {
            var elt = elementsWithID_1[_i];
            var id = elt.getAttribute('id');
            if (id) {
                this.idElements[id] = elt;
            }
        }
    };
    /**
     * Applies a given `SVGTransform` to the point.
     *
     * [a c e] [x] = (a*x + c*y + e)
     * [b d f] [y] = (b*x + d*y + f)
     * [0 0 1] [1] = (0 + 0 + 1)
     */
    Svg2Roughjs.prototype.applyMatrix = function (point, svgTransform) {
        if (!svgTransform) {
            return point;
        }
        var matrix = svgTransform.matrix;
        var x = matrix.a * point.x + matrix.c * point.y + matrix.e;
        var y = matrix.b * point.x + matrix.d * point.y + matrix.f;
        return new Point(x, y);
    };
    /**
     * Returns a random number in the given range.
     */
    Svg2Roughjs.prototype.getRandomNumber = function (min, max) {
        return Math.random() * (max - min) + min;
    };
    /**
     * Returns the `offset` of an `SVGStopElement`.
     * @return stop percentage
     */
    Svg2Roughjs.prototype.getStopOffset = function (stop) {
        var offset = stop.getAttribute('offset');
        if (!offset) {
            return 0;
        }
        if (offset.indexOf('%')) {
            return parseFloat(offset.substring(0, offset.length - 1));
        }
        else {
            return parseFloat(offset) * 100;
        }
    };
    /**
     * Returns the `stop-color` of an `SVGStopElement`.
     */
    Svg2Roughjs.prototype.getStopColor = function (stop) {
        var _a;
        var stopColorStr = stop.getAttribute('stop-color');
        if (!stopColorStr) {
            var style = (_a = stop.getAttribute('style')) !== null && _a !== void 0 ? _a : '';
            var match = /stop-color:\s?(.*);?/.exec(style);
            if (match && match.length > 1) {
                stopColorStr = match[1];
            }
        }
        return stopColorStr ? tinycolor(stopColorStr) : tinycolor('white');
    };
    /**
     * Converts an SVG gradient to a color by mixing all stop colors
     * with `tinycolor.mix`.
     */
    Svg2Roughjs.prototype.gradientToColor = function (gradient, opacity) {
        var stops = Array.prototype.slice.apply(gradient.querySelectorAll('stop'));
        if (stops.length === 0) {
            return 'transparent';
        }
        else if (stops.length === 1) {
            var color = this.getStopColor(stops[0]);
            color.setAlpha(opacity);
            return color.toString();
        }
        else {
            // Because roughjs can only deal with solid colors, we try to calculate
            // the average color of the gradient here.
            // The idea is to create an array of discrete (average) colors that represents the
            // gradient under consideration of the stop's offset. Thus, larger offsets
            // result in more entries of the same mixed color (of the two adjacent color stops).
            // At the end, this array is averaged again, to create a single solid color.
            var resolution = 10;
            var discreteColors = [];
            var lastColor = null;
            for (var i = 0; i < stops.length; i++) {
                var currentColor = this.getStopColor(stops[i]);
                var currentOffset = this.getStopOffset(stops[i]);
                // combine the adjacent colors
                var combinedColor = lastColor
                    ? this.averageColor([lastColor, currentColor])
                    : currentColor;
                // fill the discrete color array depending on the offset size
                var entries = Math.max(1, (currentOffset / resolution) | 0);
                while (entries > 0) {
                    discreteColors.push(combinedColor);
                    entries--;
                }
                lastColor = currentColor;
            }
            // average the discrete colors again for the final result
            var mixedColor = this.averageColor(discreteColors);
            mixedColor.setAlpha(opacity);
            return mixedColor.toString();
        }
    };
    /**
     * Returns the id from the url string
     */
    Svg2Roughjs.prototype.getIdFromUrl = function (url) {
        if (url === null) {
            return null;
        }
        var result = /url\('#?(.*?)'\)/.exec(url) || /url\("#?(.*?)"\)/.exec(url) || /url\(#?(.*?)\)/.exec(url);
        if (result && result.length > 1) {
            return result[1];
        }
        return null;
    };
    /**
     * Parses a `fill` url by looking in the SVG `defs` element.
     * When a gradient is found, it is converted to a color and stored
     * in the internal defs store for this url.
     */
    Svg2Roughjs.prototype.parseFillUrl = function (url, opacity) {
        var id = this.getIdFromUrl(url);
        if (!id) {
            return 'transparent';
        }
        var fill = this.idElements[id];
        if (fill) {
            if (typeof fill === 'string') {
                // maybe it was already parsed and replaced with a color
                return fill;
            }
            else {
                if (fill instanceof SVGLinearGradientElement || fill instanceof SVGRadialGradientElement) {
                    var color = this.gradientToColor(fill, opacity);
                    this.idElements[id] = color;
                    return color;
                }
            }
        }
        return undefined;
    };
    /**
     * Converts SVG opacity attributes to a [0, 1] range.
     */
    Svg2Roughjs.prototype.getOpacity = function (element, attribute) {
        //@ts-ignore
        var attr = getComputedStyle(element)[attribute] || element.getAttribute(attribute);
        if (attr) {
            if (attr.indexOf('%') !== -1) {
                return Math.min(1, Math.max(0, parseFloat(attr.substring(0, attr.length - 1)) / 100));
            }
            return Math.min(1, Math.max(0, parseFloat(attr)));
        }
        return 1;
    };
    /**
     * Traverses the given elements hierarchy bottom-up to determine its effective
     * opacity attribute.
     * @param currentUseCtx Consider different DOM hierarchy for use elements
     */
    Svg2Roughjs.prototype.getEffectiveElementOpacity = function (element, currentOpacity, currentUseCtx) {
        var attr;
        if (!currentUseCtx) {
            attr = getComputedStyle(element)['opacity'] || element.getAttribute('opacity');
        }
        else {
            // use elements traverse a different parent-hierarchy, thus we cannot use getComputedStyle here
            attr = element.getAttribute('opacity');
        }
        if (attr) {
            var elementOpacity = 1;
            if (attr.indexOf('%') !== -1) {
                elementOpacity = Math.min(1, Math.max(0, parseFloat(attr.substring(0, attr.length - 1)) / 100));
            }
            else {
                elementOpacity = Math.min(1, Math.max(0, parseFloat(attr)));
            }
            // combine opacities
            currentOpacity *= elementOpacity;
        }
        // traverse upwards to combine parent opacities as well
        var parent = element.parentElement;
        var useCtx = currentUseCtx;
        var nextCtx = useCtx;
        if (useCtx && useCtx.referenced === element) {
            // switch context and traverse the use-element parent now
            parent = useCtx.root;
            nextCtx = useCtx.parentContext;
        }
        if (!parent || parent === this.$svg) {
            return currentOpacity;
        }
        return this.getEffectiveElementOpacity(parent, currentOpacity, nextCtx);
    };
    /**
     * Returns the attribute value of an element under consideration
     * of inherited attributes from the `parentElement`.
     * @param attributeName Name of the attribute to look up
     * @param currentUseCtx Consider different DOM hierarchy for use elements
     * @return attribute value if it exists
     */
    Svg2Roughjs.prototype.getEffectiveAttribute = function (element, attributeName, currentUseCtx) {
        // getComputedStyle doesn't work for, e.g. <svg fill='rgba(...)'>
        var attr;
        if (!currentUseCtx) {
            // @ts-ignore
            attr = getComputedStyle(element)[attributeName] || element.getAttribute(attributeName);
        }
        else {
            // use elements traverse a different parent-hierarchy, thus we cannot use getComputedStyle here
            attr = element.getAttribute(attributeName);
        }
        if (!attr) {
            var parent_1 = element.parentElement;
            var useCtx = currentUseCtx;
            var nextCtx = useCtx;
            if (useCtx && useCtx.referenced === element) {
                // switch context and traverse the use-element parent now
                parent_1 = useCtx.root;
                nextCtx = useCtx.parentContext;
            }
            if (!parent_1 || parent_1 === this.$svg) {
                return null;
            }
            return this.getEffectiveAttribute(parent_1, attributeName, nextCtx);
        }
        return attr;
    };
    /**
     * Converts the given string to px unit. May be either a <length>
     * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Length)
     * or a <percentage>
     * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Percentage).
     * @returns The value in px unit
     */
    Svg2Roughjs.prototype.convertToPixelUnit = function (value) {
        // css-units fails for converting from unit-less to 'px' in IE11,
        // thus we only apply it to non-px values
        if (value.match(Svg2Roughjs.CONTAINS_UNIT_REGEXP) !== null) {
            return units.convert('px', value, this.$svg);
        }
        return parseFloat(value);
    };
    /**
     * Converts the effective style attributes of the given `SVGElement`
     * to a Rough.js config object that is used to draw the element with
     * Rough.js.
     * @return config for Rough.js drawing
     */
    Svg2Roughjs.prototype.parseStyleConfig = function (element, svgTransform) {
        var _this = this;
        var config = Object.assign({}, this.$roughConfig);
        // Scalefactor for certain style attributes. For lack of a better option here, use the determinant
        var scaleFactor = 1;
        if (!this.isIdentityTransform(svgTransform)) {
            var m = svgTransform.matrix;
            var det = m.a * m.d - m.c * m.b;
            scaleFactor = Math.sqrt(det);
        }
        // incorporate the elements base opacity
        var elementOpacity = this.getEffectiveElementOpacity(element, 1, this.$useElementContext);
        var fill = this.getEffectiveAttribute(element, 'fill', this.$useElementContext) || 'black';
        var fillOpacity = elementOpacity * this.getOpacity(element, 'fill-opacity');
        if (fill) {
            if (fill.indexOf('url') !== -1) {
                config.fill = this.parseFillUrl(fill, fillOpacity);
            }
            else if (fill === 'none') {
                delete config.fill;
            }
            else {
                var color = tinycolor(fill);
                color.setAlpha(fillOpacity);
                config.fill = color.toString();
            }
        }
        var stroke = this.getEffectiveAttribute(element, 'stroke', this.$useElementContext);
        var strokeOpacity = elementOpacity * this.getOpacity(element, 'stroke-opacity');
        if (stroke) {
            if (stroke.indexOf('url') !== -1) {
                config.stroke = this.parseFillUrl(fill, strokeOpacity);
            }
            else if (stroke === 'none') {
                config.stroke = 'none';
            }
            else {
                var color = tinycolor(stroke);
                color.setAlpha(strokeOpacity);
                config.stroke = color.toString();
            }
        }
        else {
            config.stroke = 'none';
        }
        var strokeWidth = this.getEffectiveAttribute(element, 'stroke-width', this.$useElementContext);
        if (strokeWidth) {
            // Convert to user space units (px)
            config.strokeWidth = this.convertToPixelUnit(strokeWidth) * scaleFactor;
        }
        else {
            config.strokeWidth = 0;
        }
        var strokeDashArray = this.getEffectiveAttribute(element, 'stroke-dasharray', this.$useElementContext);
        if (strokeDashArray && strokeDashArray !== 'none') {
            config.strokeLineDash = strokeDashArray
                .split(/[\s,]+/)
                .filter(function (entry) { return entry.length > 0; })
                // make sure that dashes/dots are at least somewhat visible
                .map(function (dash) { return Math.max(0.5, _this.convertToPixelUnit(dash) * scaleFactor); });
        }
        var strokeDashOffset = this.getEffectiveAttribute(element, 'stroke-dashoffset', this.$useElementContext);
        if (strokeDashOffset) {
            config.strokeLineDashOffset = this.convertToPixelUnit(strokeDashOffset) * scaleFactor;
        }
        // unstroked but filled shapes look weird, so always apply a stroke if we fill something
        if (config.fill && config.stroke === 'none') {
            config.stroke = config.fill;
            config.strokeWidth = 1;
        }
        // nested paths should be filled twice, see
        // https://github.com/rough-stuff/rough/issues/158
        // however, fill-rule is still problematic, see
        // https://github.com/rough-stuff/rough/issues/131
        if (typeof config.combineNestedSvgPaths === 'undefined') {
            config.combineNestedSvgPaths = true;
        }
        if (this.randomize) {
            // Rough.js default is 0.5 * strokeWidth
            config.fillWeight = this.getRandomNumber(0.5, 3);
            // Rough.js default is -41deg
            config.hachureAngle = this.getRandomNumber(-30, -50);
            // Rough.js default is 4 * strokeWidth
            config.hachureGap = this.getRandomNumber(3, 5);
            // randomize double stroke effect if not explicitly set through user config
            if (typeof config.disableMultiStroke === 'undefined') {
                config.disableMultiStroke = Math.random() > 0.3;
            }
        }
        return config;
    };
    Svg2Roughjs.prototype.getDefsElement = function (svgElement) {
        var outputDefs = svgElement.querySelector('defs');
        if (!outputDefs) {
            outputDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            if (svgElement.childElementCount > 0) {
                svgElement.insertBefore(outputDefs, svgElement.firstElementChild);
            }
            else {
                svgElement.appendChild(outputDefs);
            }
        }
        return outputDefs;
    };
    /**
     * Applies the clip-path to the CanvasContext.
     */
    Svg2Roughjs.prototype.applyClipPath = function (owner, clipPathAttr, svgTransform) {
        var id = this.getIdFromUrl(clipPathAttr);
        if (!id) {
            return;
        }
        var clipPath = this.idElements[id];
        if (!clipPath) {
            return;
        }
        // TODO clipPath: consider clipPathUnits
        var clipContainer;
        if (this.renderMode === RenderMode.CANVAS && this.ctx) {
            // for a canvas, we just apply a 'ctx.clip()' path
            this.ctx.beginPath();
        }
        else {
            // for SVG output we create clipPath defs
            var targetDefs = this.getDefsElement(this.canvas);
            // unfortunately, we cannot reuse clip-paths due to the 'global transform' approach
            var sketchClipPathId = id + "_" + targetDefs.childElementCount;
            clipContainer = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            clipContainer.id = sketchClipPathId;
            // remember the new id by storing it on the owner element
            owner.setAttribute('data-sketchy-clip-path', sketchClipPathId);
            targetDefs.appendChild(clipContainer);
        }
        // traverse clip-path elements in DFS
        var stack = [];
        var children = this.getNodeChildren(clipPath);
        for (var i = children.length - 1; i >= 0; i--) {
            var childElement = children[i];
            var childTransform = svgTransform
                ? this.getCombinedTransform(childElement, svgTransform)
                : this.getSvgTransform(childElement);
            stack.push({ element: childElement, transform: childTransform });
        }
        while (stack.length > 0) {
            var _a = stack.pop(), element = _a.element, transform = _a.transform;
            this.applyElementClip(element, clipContainer, transform);
            if (element.tagName === 'defs' ||
                element.tagName === 'svg' ||
                element.tagName === 'clipPath' ||
                element.tagName === 'text') {
                // some elements are ignored on clippaths
                continue;
            }
            // process childs
            var children_1 = this.getNodeChildren(element);
            for (var i = children_1.length - 1; i >= 0; i--) {
                var childElement = children_1[i];
                var childTransform = transform
                    ? this.getCombinedTransform(childElement, transform)
                    : this.getSvgTransform(childElement);
                stack.push({ element: childElement, transform: childTransform });
            }
        }
        if (this.renderMode === RenderMode.CANVAS && this.ctx) {
            this.ctx.clip();
        }
    };
    /**
     * Applies the element as clip to the CanvasContext.
     */
    Svg2Roughjs.prototype.applyElementClip = function (element, container, svgTransform) {
        switch (element.tagName) {
            case 'rect':
                this.applyRectClip(element, container, svgTransform);
                break;
            case 'circle':
                this.applyCircleClip(element, container, svgTransform);
                break;
            case 'ellipse':
                this.applyEllipseClip(element, container, svgTransform);
                break;
            case 'polygon':
                this.applyPolygonClip(element, container, svgTransform);
                break;
            // TODO clipPath: more elements
        }
    };
    Svg2Roughjs.prototype.isHidden = function (element) {
        var style = element.style;
        if (!style) {
            return false;
        }
        return style.display === 'none' || style.visibility === 'hidden';
    };
    /**
     * The main switch to delegate drawing of `SVGElement`s
     * to different subroutines.
     */
    Svg2Roughjs.prototype.drawElement = function (element, svgTransform) {
        if (this.isHidden(element)) {
            // just skip hidden elements
            return;
        }
        // possibly apply a clip on the canvas before drawing on it
        var clipPath = element.getAttribute('clip-path');
        if (clipPath) {
            if (this.renderMode === RenderMode.CANVAS && this.ctx) {
                this.ctx.save();
            }
            this.applyClipPath(element, clipPath, svgTransform);
        }
        switch (element.tagName) {
            case 'svg':
            case 'symbol':
                this.drawRoot(element, svgTransform);
                break;
            case 'rect':
                this.drawRect(element, svgTransform);
                break;
            case 'path':
                this.drawPath(element, svgTransform);
                break;
            case 'use':
                this.drawUse(element, svgTransform);
                break;
            case 'line':
                this.drawLine(element, svgTransform);
                break;
            case 'circle':
                this.drawCircle(element, svgTransform);
                break;
            case 'ellipse':
                this.drawEllipse(element, svgTransform);
                break;
            case 'polyline':
                this.drawPolyline(element, svgTransform);
                break;
            case 'polygon':
                this.drawPolygon(element, svgTransform);
                break;
            case 'text':
                this.drawText(element, svgTransform);
                break;
            case 'image':
                this.drawImage(element, svgTransform);
                break;
        }
        // re-set the clip for the next element
        if (clipPath) {
            if (this.renderMode === RenderMode.CANVAS && this.ctx) {
                this.ctx.restore();
            }
        }
    };
    Svg2Roughjs.prototype.drawMarkers = function (element, points, svgTransform) {
        if (points.length === 0) {
            return;
        }
        // consider scaled coordinate system for markerWidth/markerHeight
        var markerUnits = element.getAttribute('markerUnits');
        var scaleFactor = 1;
        if (!markerUnits || markerUnits === 'strokeWidth') {
            var strokeWidth = this.getEffectiveAttribute(element, 'stroke-width');
            if (strokeWidth) {
                scaleFactor = this.convertToPixelUnit(strokeWidth);
            }
        }
        // start marker
        var markerStartId = this.getIdFromUrl(element.getAttribute('marker-start'));
        var markerStartElement = markerStartId
            ? this.idElements[markerStartId]
            : null;
        if (markerStartElement) {
            var angle = markerStartElement.orientAngle.baseVal.value;
            if (points.length > 1) {
                var orientAttr = markerStartElement.getAttribute('orient');
                if (orientAttr === 'auto' || orientAttr === 'auto-start-reverse') {
                    var autoAngle = this.getAngle(points[0], points[1]);
                    angle = orientAttr === 'auto' ? autoAngle : autoAngle + 180;
                }
            }
            var location_1 = points[0];
            var matrix = this.svg
                .createSVGMatrix()
                .translate(location_1.x, location_1.y)
                .rotate(angle)
                .scale(scaleFactor);
            var combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
            var markerTransform = this.svg.createSVGTransformFromMatrix(combinedMatrix);
            this.processRoot(markerStartElement, markerTransform);
        }
        // end marker
        var markerEndId = this.getIdFromUrl(element.getAttribute('marker-end'));
        var markerEndElement = markerEndId ? this.idElements[markerEndId] : null;
        if (markerEndElement) {
            var angle = markerEndElement.orientAngle.baseVal.value;
            if (points.length > 1) {
                var orientAttr = markerEndElement.getAttribute('orient');
                if (orientAttr === 'auto' || orientAttr === 'auto-start-reverse') {
                    angle = this.getAngle(points[points.length - 2], points[points.length - 1]);
                }
            }
            var location_2 = points[points.length - 1];
            var matrix = this.svg
                .createSVGMatrix()
                .translate(location_2.x, location_2.y)
                .rotate(angle)
                .scale(scaleFactor);
            var combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
            var markerTransform = this.svg.createSVGTransformFromMatrix(combinedMatrix);
            this.processRoot(markerEndElement, markerTransform);
        }
        // mid marker(s)
        var markerMidId = this.getIdFromUrl(element.getAttribute('marker-mid'));
        var markerMidElement = markerMidId ? this.idElements[markerMidId] : null;
        if (markerMidElement && points.length > 2) {
            for (var i = 0; i < points.length; i++) {
                var loc = points[i];
                if (i === 0 || i === points.length - 1) {
                    // mid markers are not drawn on first or last point
                    continue;
                }
                var angle = markerMidElement.orientAngle.baseVal.value;
                var orientAttr = markerMidElement.getAttribute('orient');
                if (orientAttr === 'auto' || orientAttr === 'auto-start-reverse') {
                    var prevPt = points[i - 1];
                    var nextPt = points[i + 1];
                    // https://www.w3.org/TR/SVG11/painting.html#OrientAttribute
                    // use angle bisector of incoming and outgoing angle
                    var inAngle = this.getAngle(prevPt, loc);
                    var outAngle = this.getAngle(loc, nextPt);
                    var reverse = nextPt.x < loc.x ? 180 : 0;
                    angle = (inAngle + outAngle) / 2 + reverse;
                }
                var matrix = this.svg
                    .createSVGMatrix()
                    .translate(loc.x, loc.y)
                    .rotate(angle)
                    .scale(scaleFactor);
                var combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
                var markerTransform = this.svg.createSVGTransformFromMatrix(combinedMatrix);
                this.processRoot(markerMidElement, markerTransform);
            }
        }
    };
    /**
     * The angle in degree of the line defined by the given points.
     */
    Svg2Roughjs.prototype.getAngle = function (p0, p1) {
        return Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);
    };
    Svg2Roughjs.prototype.drawPolyline = function (polyline, svgTransform) {
        var _this = this;
        var points = this.getPointsArray(polyline);
        var transformed = points.map(function (p) {
            var pt = _this.applyMatrix(p, svgTransform);
            return [pt.x, pt.y];
        });
        var style = this.parseStyleConfig(polyline, svgTransform);
        if (style.fill && style.fill !== 'none') {
            var fillStyle = Object.assign({}, style);
            fillStyle.stroke = 'none';
            this.postProcessElement(polyline, this.rc.polygon(transformed, fillStyle));
        }
        this.postProcessElement(polyline, this.rc.linearPath(transformed, style));
        this.drawMarkers(polyline, points, svgTransform);
    };
    Svg2Roughjs.prototype.getPointsArray = function (element) {
        var pointsAttr = element.getAttribute('points');
        if (!pointsAttr) {
            return [];
        }
        var coordinateRegexp;
        if (pointsAttr.indexOf(' ') > 0) {
            // just assume that the coordinates (or pairs) are separated with space
            coordinateRegexp = /\s+/g;
        }
        else {
            // there are no spaces, so assume comma separators
            coordinateRegexp = /,/g;
        }
        var pointList = pointsAttr.split(coordinateRegexp);
        var points = [];
        for (var i = 0; i < pointList.length; i++) {
            var currentEntry = pointList[i];
            var coordinates = currentEntry.split(',');
            if (coordinates.length === 2) {
                points.push(new Point(parseFloat(coordinates[0]), parseFloat(coordinates[1])));
            }
            else {
                // space as separators, take next entry as y coordinate
                var next = i + 1;
                if (next < pointList.length) {
                    points.push(new Point(parseFloat(currentEntry), parseFloat(pointList[next])));
                    // skip the next entry
                    i = next;
                }
            }
        }
        return points;
    };
    Svg2Roughjs.prototype.applyPolygonClip = function (polygon, container, svgTransform) {
        if (this.renderMode === RenderMode.CANVAS && this.ctx) {
            var points = this.getPointsArray(polygon);
            // in the clip case, we can actually transform the entire
            // canvas without distorting the hand-drawn style
            if (points.length > 0) {
                this.ctx.save();
                this.applyGlobalTransform(svgTransform);
                var startPt = points[0];
                this.ctx.moveTo(startPt.x, startPt.y);
                for (var i = 1; i < points.length; i++) {
                    var pt = points[i];
                    this.ctx.lineTo(pt.x, pt.y);
                }
                this.ctx.closePath();
                this.ctx.restore();
            }
        }
        else {
            var clip = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            clip.setAttribute('points', polygon.getAttribute('points'));
            this.applyGlobalTransform(svgTransform, clip);
            container.appendChild(clip);
        }
    };
    Svg2Roughjs.prototype.drawPolygon = function (polygon, svgTransform) {
        var _this = this;
        var points = this.getPointsArray(polygon);
        var transformed = points.map(function (p) {
            var pt = _this.applyMatrix(p, svgTransform);
            return [pt.x, pt.y];
        });
        this.postProcessElement(polygon, this.rc.polygon(transformed, this.parseStyleConfig(polygon, svgTransform)));
        // https://www.w3.org/TR/SVG11/painting.html#MarkerProperties
        // Note that for a ‘path’ element which ends with a closed sub-path,
        // the last vertex is the same as the initial vertex on the given
        // sub-path (same applies to polygon).
        if (points.length > 0) {
            points.push(points[0]);
            this.drawMarkers(polygon, points, svgTransform);
        }
    };
    Svg2Roughjs.prototype.applyEllipseClip = function (ellipse, container, svgTransform) {
        var cx = ellipse.cx.baseVal.value;
        var cy = ellipse.cy.baseVal.value;
        var rx = ellipse.rx.baseVal.value;
        var ry = ellipse.ry.baseVal.value;
        if (rx === 0 || ry === 0) {
            // zero-radius ellipse is not rendered
            return;
        }
        if (this.renderMode === RenderMode.CANVAS && this.ctx) {
            // in the clip case, we can actually transform the entire
            // canvas without distorting the hand-drawn style
            this.ctx.save();
            this.applyGlobalTransform(svgTransform);
            this.ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
            this.ctx.restore();
        }
        else {
            var clip = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            clip.cx.baseVal.value = cx;
            clip.cy.baseVal.value = cy;
            clip.rx.baseVal.value = rx;
            clip.ry.baseVal.value = ry;
            this.applyGlobalTransform(svgTransform, clip);
            container.appendChild(clip);
        }
    };
    Svg2Roughjs.prototype.drawEllipse = function (ellipse, svgTransform) {
        var cx = ellipse.cx.baseVal.value;
        var cy = ellipse.cy.baseVal.value;
        var rx = ellipse.rx.baseVal.value;
        var ry = ellipse.ry.baseVal.value;
        if (rx === 0 || ry === 0) {
            // zero-radius ellipse is not rendered
            return;
        }
        var result;
        if (this.isIdentityTransform(svgTransform) || this.isTranslationTransform(svgTransform)) {
            // Simple case, there's no transform and we can use the ellipse command
            var center = this.applyMatrix(new Point(cx, cy), svgTransform);
            // transform a point on the ellipse to get the transformed radius
            var radiusPoint = this.applyMatrix(new Point(cx + rx, cy + ry), svgTransform);
            var transformedWidth = 2 * (radiusPoint.x - center.x);
            var transformedHeight = 2 * (radiusPoint.y - center.y);
            result = this.rc.ellipse(center.x, center.y, transformedWidth, transformedHeight, this.parseStyleConfig(ellipse, svgTransform));
        }
        else {
            // in other cases we need to construct the path manually.
            var factor = (4 / 3) * (Math.sqrt(2) - 1);
            var p1 = this.applyMatrix(new Point(cx + rx, cy), svgTransform);
            var p2 = this.applyMatrix(new Point(cx, cy + ry), svgTransform);
            var p3 = this.applyMatrix(new Point(cx - rx, cy), svgTransform);
            var p4 = this.applyMatrix(new Point(cx, cy - ry), svgTransform);
            var c1 = this.applyMatrix(new Point(cx + rx, cy + factor * ry), svgTransform);
            var c2 = this.applyMatrix(new Point(cx + factor * rx, cy + ry), svgTransform);
            var c4 = this.applyMatrix(new Point(cx - rx, cy + factor * ry), svgTransform);
            var c6 = this.applyMatrix(new Point(cx - factor * rx, cy - ry), svgTransform);
            var c8 = this.applyMatrix(new Point(cx + rx, cy - factor * ry), svgTransform);
            var path = "M " + p1 + " C " + c1 + " " + c2 + " " + p2 + " S " + c4 + " " + p3 + " S " + c6 + " " + p4 + " S " + c8 + " " + p1 + "z";
            result = this.rc.path(path, this.parseStyleConfig(ellipse, svgTransform));
        }
        this.postProcessElement(ellipse, result);
    };
    Svg2Roughjs.prototype.applyCircleClip = function (circle, container, svgTransform) {
        var cx = circle.cx.baseVal.value;
        var cy = circle.cy.baseVal.value;
        var r = circle.r.baseVal.value;
        if (r === 0) {
            // zero-radius circle is not rendered
            return;
        }
        if (this.renderMode === RenderMode.CANVAS && this.ctx) {
            // in the clip case, we can actually transform the entire
            // canvas without distorting the hand-drawn style
            this.ctx.save();
            this.applyGlobalTransform(svgTransform);
            this.ctx.ellipse(cx, cy, r, r, 0, 0, 2 * Math.PI);
            this.ctx.restore();
        }
        else {
            var clip = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            clip.cx.baseVal.value = cx;
            clip.cy.baseVal.value = cy;
            clip.r.baseVal.value = r;
            this.applyGlobalTransform(svgTransform, clip);
            container.appendChild(clip);
        }
    };
    Svg2Roughjs.prototype.drawCircle = function (circle, svgTransform) {
        var cx = circle.cx.baseVal.value;
        var cy = circle.cy.baseVal.value;
        var r = circle.r.baseVal.value;
        if (r === 0) {
            // zero-radius circle is not rendered
            return;
        }
        var center = this.applyMatrix(new Point(cx, cy), svgTransform);
        var result;
        if (this.isIdentityTransform(svgTransform) || this.isTranslationTransform(svgTransform)) {
            // transform a point on the ellipse to get the transformed radius
            var radiusPoint = this.applyMatrix(new Point(cx + r, cy + r), svgTransform);
            var transformedWidth = 2 * (radiusPoint.x - center.x);
            result = this.rc.circle(center.x, center.y, transformedWidth, this.parseStyleConfig(circle, svgTransform));
        }
        else {
            // in other cases we need to construct the path manually.
            var factor = (4 / 3) * (Math.sqrt(2) - 1);
            var p1 = this.applyMatrix(new Point(cx + r, cy), svgTransform);
            var p2 = this.applyMatrix(new Point(cx, cy + r), svgTransform);
            var p3 = this.applyMatrix(new Point(cx - r, cy), svgTransform);
            var p4 = this.applyMatrix(new Point(cx, cy - r), svgTransform);
            var c1 = this.applyMatrix(new Point(cx + r, cy + factor * r), svgTransform);
            var c2 = this.applyMatrix(new Point(cx + factor * r, cy + r), svgTransform);
            var c4 = this.applyMatrix(new Point(cx - r, cy + factor * r), svgTransform);
            var c6 = this.applyMatrix(new Point(cx - factor * r, cy - r), svgTransform);
            var c8 = this.applyMatrix(new Point(cx + r, cy - factor * r), svgTransform);
            var path = "M " + p1 + " C " + c1 + " " + c2 + " " + p2 + " S " + c4 + " " + p3 + " S " + c6 + " " + p4 + " S " + c8 + " " + p1 + "z";
            result = this.rc.path(path, this.parseStyleConfig(circle, svgTransform));
        }
        this.postProcessElement(circle, result);
    };
    Svg2Roughjs.prototype.drawLine = function (line, svgTransform) {
        var p1 = new Point(line.x1.baseVal.value, line.y1.baseVal.value);
        var tp1 = this.applyMatrix(p1, svgTransform);
        var p2 = new Point(line.x2.baseVal.value, line.y2.baseVal.value);
        var tp2 = this.applyMatrix(p2, svgTransform);
        if (tp1.x === tp2.x && tp1.y === tp2.y) {
            // zero-length line is not rendered
            return;
        }
        this.postProcessElement(line, this.rc.line(tp1.x, tp1.y, tp2.x, tp2.y, this.parseStyleConfig(line, svgTransform)));
        this.drawMarkers(line, [p1, p2], svgTransform);
    };
    Svg2Roughjs.prototype.drawRoot = function (element, svgTransform) {
        var width = parseFloat(element.getAttribute('width'));
        var height = parseFloat(element.getAttribute('height'));
        if (isNaN(width) || isNaN(height)) {
            // use only if both are set
            width = height = null;
        }
        this.processRoot(element, svgTransform, width, height);
    };
    Svg2Roughjs.prototype.drawUse = function (use, svgTransform) {
        var href = use.href.baseVal;
        if (href.startsWith('#')) {
            href = href.substring(1);
        }
        var defElement = this.idElements[href];
        if (defElement) {
            var useWidth = void 0, useHeight = void 0;
            if (use.getAttribute('width') && use.getAttribute('height')) {
                // Use elements can overwrite the width which is important if it is a nested SVG
                useWidth = use.width.baseVal.value;
                useHeight = use.height.baseVal.value;
            }
            // We need to account for x and y attributes as well. Those change where the element is drawn.
            // We can simply change the transform to include that.
            var x = use.x.baseVal.value;
            var y = use.y.baseVal.value;
            var matrix = this.svg.createSVGMatrix().translate(x, y);
            matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
            // the defsElement itself might have a transform that needs to be incorporated
            var elementTransform = this.svg.createSVGTransformFromMatrix(matrix);
            // use elements must be processed in their context, particularly regarding
            // the styling of them
            if (!this.$useElementContext) {
                this.$useElementContext = { root: use, referenced: defElement };
            }
            else {
                var newContext = {
                    root: use,
                    referenced: defElement,
                    parentContext: Object.assign({}, this.$useElementContext)
                };
                this.$useElementContext = newContext;
            }
            // draw the referenced element
            this.processRoot(
            // @ts-ignore
            defElement, this.getCombinedTransform(defElement, elementTransform), useWidth, useHeight);
            // restore default context
            if (this.$useElementContext.parentContext) {
                this.$useElementContext = this.$useElementContext.parentContext;
            }
            else {
                this.$useElementContext = undefined;
            }
        }
    };
    Svg2Roughjs.prototype.drawPath = function (path, svgTransform) {
        var dataAttrs = path.getAttribute('d');
        var pathData = 
        // Parse path data and convert to absolute coordinates
        new SVGPathData(dataAttrs)
            .toAbs()
            // Normalize H and V to L commands - those cannot work with how we draw transformed paths otherwise
            .transform(SVGPathDataTransformer.NORMALIZE_HVZ())
            // Normalize S and T to Q and C commands - Rough.js has a bug with T where it expects 4 parameters instead of 2
            .transform(SVGPathDataTransformer.NORMALIZE_ST());
        // If there's a transform, transform the whole path accordingly
        var transformedPathData = new SVGPathData(
        // clone the commands, we might need them untransformed for markers
        pathData.commands.map(function (cmd) { return Object.assign({}, cmd); }));
        if (svgTransform) {
            transformedPathData.transform(SVGPathDataTransformer.MATRIX(svgTransform.matrix.a, svgTransform.matrix.b, svgTransform.matrix.c, svgTransform.matrix.d, svgTransform.matrix.e, svgTransform.matrix.f));
        }
        var encodedPathData = encodeSVGPath(transformedPathData.commands);
        if (encodedPathData.indexOf('undefined') !== -1) {
            // DEBUG STUFF
            console.error('broken path data');
            debugger;
            return;
        }
        this.postProcessElement(path, this.rc.path(encodedPathData, this.parseStyleConfig(path, svgTransform)));
        // https://www.w3.org/TR/SVG11/painting.html#MarkerProperties
        // Note that for a ‘path’ element which ends with a closed sub-path,
        // the last vertex is the same as the initial vertex on the given
        // sub-path (same applies to polygon).
        var points = [];
        var currentSubPathBegin;
        pathData.commands.forEach(function (cmd) {
            switch (cmd.type) {
                case SVGPathData.MOVE_TO:
                    var p = new Point(cmd.x, cmd.y);
                    points.push(p);
                    // each moveto starts a new subpath
                    currentSubPathBegin = p;
                    break;
                case SVGPathData.LINE_TO:
                case SVGPathData.QUAD_TO:
                case SVGPathData.SMOOTH_QUAD_TO:
                case SVGPathData.CURVE_TO:
                case SVGPathData.SMOOTH_CURVE_TO:
                case SVGPathData.ARC:
                    points.push(new Point(cmd.x, cmd.y));
                    break;
                case SVGPathData.HORIZ_LINE_TO:
                    points.push(new Point(cmd.x, 0));
                    break;
                case SVGPathData.VERT_LINE_TO:
                    points.push(new Point(0, cmd.y));
                    break;
                case SVGPathData.CLOSE_PATH:
                    if (currentSubPathBegin) {
                        points.push(currentSubPathBegin);
                    }
                    break;
            }
        });
        this.drawMarkers(path, points, svgTransform);
    };
    Svg2Roughjs.prototype.applyRectClip = function (rect, container, svgTransform) {
        var x = rect.x.baseVal.value;
        var y = rect.y.baseVal.value;
        var width = rect.width.baseVal.value;
        var height = rect.height.baseVal.value;
        if (width === 0 || height === 0) {
            // zero-width or zero-height rect will not be rendered
            return;
        }
        var rx = rect.hasAttribute('rx') ? rect.rx.baseVal.value : 0;
        var ry = rect.hasAttribute('ry') ? rect.ry.baseVal.value : 0;
        // in the clip case, we can actually transform the entire
        // canvas without distorting the hand-drawn style
        if (this.renderMode === RenderMode.CANVAS && this.ctx) {
            this.ctx.save();
            this.applyGlobalTransform(svgTransform);
            if (!rx && !ry) {
                this.ctx.rect(x, y, width, height);
            }
            else {
                // Construct path for the rounded rectangle
                var factor = (4 / 3) * (Math.sqrt(2) - 1);
                this.ctx.moveTo(x + rx, y);
                this.ctx.lineTo(x + width - rx, y);
                this.ctx.bezierCurveTo(x + width - rx + factor * rx, y, x + width, y + factor * ry, x + width, y + ry);
                this.ctx.lineTo(x + width, y + height - ry);
                this.ctx.bezierCurveTo(x + width, y + height - ry + factor * ry, x + width - factor * rx, y + height, x + width - rx, y + height);
                this.ctx.lineTo(x + rx, y + height);
                this.ctx.bezierCurveTo(x + rx - factor * rx, y + height, x, y + height - factor * ry, x, y + height - ry);
                this.ctx.lineTo(x, y + ry);
                this.ctx.bezierCurveTo(x, y + factor * ry, x + factor * rx, y, x + rx, y);
                this.ctx.closePath();
            }
            this.ctx.restore();
        }
        else {
            var clip = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            clip.x.baseVal.value = x;
            clip.y.baseVal.value = y;
            clip.width.baseVal.value = width;
            clip.height.baseVal.value = height;
            if (rx) {
                clip.rx.baseVal.value = rx;
            }
            if (ry) {
                clip.ry.baseVal.value = ry;
            }
            this.applyGlobalTransform(svgTransform, clip);
            container.appendChild(clip);
        }
    };
    Svg2Roughjs.prototype.drawRect = function (rect, svgTransform) {
        var x = rect.x.baseVal.value;
        var y = rect.y.baseVal.value;
        var width = rect.width.baseVal.value;
        var height = rect.height.baseVal.value;
        if (width === 0 || height === 0) {
            // zero-width or zero-height rect will not be rendered
            return;
        }
        var rx = rect.hasAttribute('rx') ? rect.rx.baseVal.value : 0;
        var ry = rect.hasAttribute('ry') ? rect.ry.baseVal.value : 0;
        if (rx || ry) {
            // Negative values are an error and result in the default value
            rx = rx < 0 ? 0 : rx;
            ry = ry < 0 ? 0 : ry;
            // If only one of the two values is specified, the other has the same value
            rx = rx === null ? ry : rx;
            ry = ry === null ? rx : ry;
            // Clamp both values to half their sides' lengths
            rx = Math.min(rx, width / 2);
            ry = Math.min(ry, height / 2);
        }
        if ((this.isIdentityTransform(svgTransform) || this.isTranslationTransform(svgTransform)) &&
            !rx &&
            !ry) {
            // Simple case; just a rectangle
            var p1 = this.applyMatrix(new Point(x, y), svgTransform);
            var p2 = this.applyMatrix(new Point(x + width, y + height), svgTransform);
            var transformedWidth = p2.x - p1.x;
            var transformedHeight = p2.y - p1.y;
            this.postProcessElement(rect, this.rc.rectangle(p1.x, p1.y, transformedWidth, transformedHeight, this.parseStyleConfig(rect, svgTransform)));
        }
        else {
            var path = '';
            if (!rx && !ry) {
                var p1 = this.applyMatrix(new Point(x, y), svgTransform);
                var p2 = this.applyMatrix(new Point(x + width, y), svgTransform);
                var p3 = this.applyMatrix(new Point(x + width, y + height), svgTransform);
                var p4 = this.applyMatrix(new Point(x, y + height), svgTransform);
                // No rounding, so just construct the respective path as a simple polygon
                path += "M " + p1;
                path += "L " + p2;
                path += "L " + p3;
                path += "L " + p4;
                path += "z";
            }
            else {
                var factor = (4 / 3) * (Math.sqrt(2) - 1);
                // Construct path for the rounded rectangle
                // perform an absolute moveto operation to location (x+rx,y), where x is the value of the ‘rect’ element's ‘x’ attribute converted to user space, rx is the effective value of the ‘rx’ attribute converted to user space and y is the value of the ‘y’ attribute converted to user space
                var p1 = this.applyMatrix(new Point(x + rx, y), svgTransform);
                path += "M " + p1;
                // perform an absolute horizontal lineto operation to location (x+width-rx,y), where width is the ‘rect’ element's ‘width’ attribute converted to user space
                var p2 = this.applyMatrix(new Point(x + width - rx, y), svgTransform);
                path += "L " + p2;
                // perform an absolute elliptical arc operation to coordinate (x+width,y+ry), where the effective values for the ‘rx’ and ‘ry’ attributes on the ‘rect’ element converted to user space are used as the rx and ry attributes on the elliptical arc command, respectively, the x-axis-rotation is set to zero, the large-arc-flag is set to zero, and the sweep-flag is set to one
                var p3c1 = this.applyMatrix(new Point(x + width - rx + factor * rx, y), svgTransform);
                var p3c2 = this.applyMatrix(new Point(x + width, y + factor * ry), svgTransform);
                var p3 = this.applyMatrix(new Point(x + width, y + ry), svgTransform);
                path += "C " + p3c1 + " " + p3c2 + " " + p3; // We cannot use the arc command, since we no longer draw in the expected coordinates. So approximate everything with lines and béziers
                // perform a absolute vertical lineto to location (x+width,y+height-ry), where height is the ‘rect’ element's ‘height’ attribute converted to user space
                var p4 = this.applyMatrix(new Point(x + width, y + height - ry), svgTransform);
                path += "L " + p4;
                // perform an absolute elliptical arc operation to coordinate (x+width-rx,y+height)
                var p5c1 = this.applyMatrix(new Point(x + width, y + height - ry + factor * ry), svgTransform);
                var p5c2 = this.applyMatrix(new Point(x + width - factor * rx, y + height), svgTransform);
                var p5 = this.applyMatrix(new Point(x + width - rx, y + height), svgTransform);
                path += "C " + p5c1 + " " + p5c2 + " " + p5;
                // perform an absolute horizontal lineto to location (x+rx,y+height)
                var p6 = this.applyMatrix(new Point(x + rx, y + height), svgTransform);
                path += "L " + p6;
                // perform an absolute elliptical arc operation to coordinate (x,y+height-ry)
                var p7c1 = this.applyMatrix(new Point(x + rx - factor * rx, y + height), svgTransform);
                var p7c2 = this.applyMatrix(new Point(x, y + height - factor * ry), svgTransform);
                var p7 = this.applyMatrix(new Point(x, y + height - ry), svgTransform);
                path += "C " + p7c1 + " " + p7c2 + " " + p7;
                // perform an absolute absolute vertical lineto to location (x,y+ry)
                var p8 = this.applyMatrix(new Point(x, y + ry), svgTransform);
                path += "L " + p8;
                // perform an absolute elliptical arc operation to coordinate (x+rx,y)
                var p9c1 = this.applyMatrix(new Point(x, y + factor * ry), svgTransform);
                var p9c2 = this.applyMatrix(new Point(x + factor * rx, y), svgTransform);
                path += "C " + p9c1 + " " + p9c2 + " " + p1;
                path += 'z';
            }
            // must use square line cap here so it looks like a rectangle. Default seems to be butt.
            if (this.renderMode === RenderMode.CANVAS && this.ctx) {
                this.ctx.save();
                this.ctx.lineCap = 'square';
            }
            var result = this.rc.path(path, this.parseStyleConfig(rect, svgTransform));
            if (this.renderMode === RenderMode.SVG && result) {
                // same as for the canvas context, use square line-cap instead of default butt here
                result.setAttribute('stroke-linecap', 'square');
            }
            this.postProcessElement(rect, result);
            if (this.renderMode === RenderMode.CANVAS && this.ctx) {
                this.ctx.restore();
            }
        }
    };
    Svg2Roughjs.prototype.drawImage = function (svgImage, svgTransform) {
        var _this = this;
        var href = svgImage.href.baseVal;
        var x = svgImage.x.baseVal.value;
        var y = svgImage.y.baseVal.value;
        var width, height;
        if (svgImage.getAttribute('width') && svgImage.getAttribute('height')) {
            width = svgImage.width.baseVal.value;
            height = svgImage.height.baseVal.value;
        }
        if (href.startsWith('data:') && href.indexOf('image/svg+xml') !== -1) {
            // data:[<media type>][;charset=<character set>][;base64],<data>
            var dataUrlRegex = /^data:([^,]*),(.*)/;
            var match = dataUrlRegex.exec(href);
            if (match && match.length > 2) {
                var meta = match[1];
                var svgString = match[2];
                var isBase64 = meta.indexOf('base64') !== -1;
                var isUtf8 = meta.indexOf('utf8') !== -1;
                if (isBase64) {
                    svgString = btoa(svgString);
                }
                if (!isUtf8) {
                    svgString = decodeURIComponent(svgString);
                }
                var parser = new DOMParser();
                var doc = parser.parseFromString(svgString, 'image/svg+xml');
                var svg = doc.firstElementChild;
                var matrix = this.svg.createSVGMatrix().translate(x, y);
                matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
                this.processRoot(svg, this.svg.createSVGTransformFromMatrix(matrix), width, height);
                return;
            }
        }
        else {
            var matrix = this.svg.createSVGMatrix().translate(x, y);
            matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
            if (this.renderMode === RenderMode.CANVAS) {
                // we just draw the image 'as is' into the canvas
                var dx_1 = matrix.e;
                var dy_1 = matrix.f;
                var img_1 = new Image();
                img_1.onload = function () {
                    if (_this.ctx) {
                        _this.ctx.drawImage(img_1, dx_1, dy_1);
                    }
                };
                img_1.src = href;
            }
            else {
                var imageClone = svgImage.cloneNode();
                var container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                this.applyGlobalTransform(svgTransform, container);
                container.appendChild(imageClone);
                this.postProcessElement(svgImage, container);
            }
        }
    };
    Svg2Roughjs.prototype.drawText = function (text, svgTransform) {
        if (this.renderMode === RenderMode.SVG) {
            var container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            container.setAttribute('class', 'text-container');
            this.applyGlobalTransform(svgTransform, container);
            var textClone = text.cloneNode(true);
            if (textClone.transform.baseVal.numberOfItems > 0) {
                // remove transformation, since it is transformed globally by its parent container
                textClone.transform.baseVal.clear();
            }
            var style_1 = textClone.getAttribute('style');
            var cssFont = this.getCssFont(text, true);
            textClone.setAttribute('style', style_1 ? cssFont + style_1 : cssFont);
            container.appendChild(textClone);
            this.postProcessElement(text, container);
            return;
        }
        if (!this.ctx) {
            return;
        }
        this.ctx.save();
        var textLocation = new Point(this.getLengthInPx(text.x), this.getLengthInPx(text.y));
        // text style
        this.ctx.font = this.getCssFont(text);
        var style = this.parseStyleConfig(text, svgTransform);
        if (style.fill) {
            this.ctx.fillStyle = style.fill;
        }
        var stroke = this.getEffectiveAttribute(text, 'stroke');
        var hasStroke = stroke && stroke != 'none';
        if (hasStroke) {
            this.ctx.strokeStyle = stroke;
            this.ctx.lineWidth = this.convertToPixelUnit(this.getEffectiveAttribute(text, 'stroke-width'));
        }
        var textAnchor = this.getEffectiveAttribute(text, 'text-anchor', this.$useElementContext);
        if (textAnchor) {
            this.ctx.textAlign = textAnchor !== 'middle' ? textAnchor : 'center';
        }
        // apply the global transform
        this.applyGlobalTransform(svgTransform);
        // consider dx/dy of the text element
        var dx = this.getLengthInPx(text.dx);
        var dy = this.getLengthInPx(text.dy);
        this.ctx.translate(dx, dy);
        if (text.childElementCount === 0) {
            this.ctx.fillText(this.getTextContent(text), textLocation.x, textLocation.y, text.getComputedTextLength());
            if (hasStroke) {
                this.ctx.strokeText(this.getTextContent(text), textLocation.x, textLocation.y, text.getComputedTextLength());
            }
        }
        else {
            var children = this.getNodeChildren(text);
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (child instanceof SVGTSpanElement) {
                    textLocation = new Point(this.getLengthInPx(child.x), this.getLengthInPx(child.y));
                    var dx_2 = this.getLengthInPx(child.dx);
                    var dy_2 = this.getLengthInPx(child.dy);
                    this.ctx.translate(dx_2, dy_2);
                    this.ctx.fillText(this.getTextContent(child), textLocation.x, textLocation.y);
                    if (hasStroke) {
                        this.ctx.strokeText(this.getTextContent(child), textLocation.x, textLocation.y);
                    }
                }
            }
        }
        this.ctx.restore();
    };
    /**
     * Retrieves the text content from a text content element (text, tspan, ...)
     */
    Svg2Roughjs.prototype.getTextContent = function (element) {
        var _a;
        var content = (_a = element.textContent) !== null && _a !== void 0 ? _a : '';
        if (this.shouldNormalizeWhitespace(element)) {
            content = content.replace(/[\n\r\t ]+/g, ' ').trim();
        }
        else {
            content = content.replace(/\r\n|[\n\r\t]/g, ' ');
        }
        return content;
    };
    /**
     * Determines whether the given element has default white-space handling, i.e. normalization.
     * Returns false if the element (or an ancestor) has xml:space='preserve'
     */
    Svg2Roughjs.prototype.shouldNormalizeWhitespace = function (element) {
        var xmlSpaceAttribute = null;
        while (element !== null && element !== this.$svg && xmlSpaceAttribute === null) {
            xmlSpaceAttribute = element.getAttribute('xml:space');
            if (xmlSpaceAttribute === null) {
                element = element.parentNode;
            }
        }
        return xmlSpaceAttribute !== 'preserve'; // no attribute is also default handling
    };
    /**
     * @return length in pixels
     */
    Svg2Roughjs.prototype.getLengthInPx = function (svgLengthList) {
        if (svgLengthList && svgLengthList.baseVal.numberOfItems > 0) {
            return svgLengthList.baseVal.getItem(0).value;
        }
        return 0;
    };
    /**
     * @param asStyleString Formats the return value as inline style string
     */
    Svg2Roughjs.prototype.getCssFont = function (text, asStyleString) {
        if (asStyleString === void 0) { asStyleString = false; }
        var cssFont = '';
        var fontStyle = this.getEffectiveAttribute(text, 'font-style', this.$useElementContext);
        if (fontStyle) {
            cssFont += asStyleString ? "font-style: " + fontStyle + ";" : fontStyle;
        }
        var fontWeight = this.getEffectiveAttribute(text, 'font-weight', this.$useElementContext);
        if (fontWeight) {
            cssFont += asStyleString ? "font-weight: " + fontWeight + ";" : " " + fontWeight;
        }
        var fontSize = this.getEffectiveAttribute(text, 'font-size', this.$useElementContext);
        if (fontSize) {
            cssFont += asStyleString ? "font-size: " + fontSize + ";" : " " + fontSize;
        }
        if (this.fontFamily) {
            cssFont += asStyleString ? "font-family: " + this.fontFamily + ";" : " " + this.fontFamily;
        }
        else {
            var fontFamily = this.getEffectiveAttribute(text, 'font-family', this.$useElementContext);
            if (fontFamily) {
                cssFont += asStyleString ? "font-family: " + fontFamily + ";" : " " + fontFamily;
            }
        }
        cssFont = cssFont.trim();
        return cssFont;
    };
    /**
     * Returns the Node's children, since Node.prototype.children is not available on all browsers.
     * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/children
     */
    Svg2Roughjs.prototype.getNodeChildren = function (element) {
        if (typeof element.children !== 'undefined') {
            return element.children;
        }
        var i = 0;
        var node;
        var nodes = element.childNodes;
        var children = [];
        while ((node = nodes[i++])) {
            if (node.nodeType === 1) {
                children.push(node);
            }
        }
        return children;
    };
    /**
     * Calculates the average color of the colors in the given array.
     * @returns The average color
     */
    Svg2Roughjs.prototype.averageColor = function (colorArray) {
        var count = colorArray.length;
        var r = 0;
        var g = 0;
        var b = 0;
        var a = 0;
        colorArray.forEach(function (tinycolor) {
            var color = tinycolor.toRgb();
            r += color.r * color.r;
            g += color.g * color.g;
            b += color.b * color.b;
            a += color.a;
        });
        return tinycolor({
            r: Math.sqrt(r / count),
            g: Math.sqrt(g / count),
            b: Math.sqrt(b / count),
            a: a / count
        });
    };
    return Svg2Roughjs;
}());

export { RenderMode, Svg2Roughjs };
//# sourceMappingURL=index.js.map
