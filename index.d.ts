declare class RenderMode {
    static get SVG(): string;
    static get CANVAS(): string;
}
/**
 * Svg2Roughjs parses a given SVG and draws it with Rough.js
 * in a canvas.
 */
declare class Svg2Roughjs {
    /**
     * A simple regexp which is used to test whether a given string value
     * contains unit identifiers, e.g. "1px", "1em", "1%", ...
     * @private
     * @returns {RegExp}
     */
    private static CONTAINS_UNIT_REGEXP;
    /**
     * Creates a new instance of Svg2roughjs.
     * @param {string | HTMLCanvasElement | SVGSVGElement} target Either a selector for the container to which a canvas should be added
     * or an `HTMLCanvasElement` or `SVGSVGElement` that should be used as output target.
     * @param {RenderMode?} renderMode Whether the output should be an SVG or drawn to an HTML canvas.
     * Defaults to SVG or CANVAS depending if the given target is of type `HTMLCanvasElement` or `SVGSVGElement`,
     * otherwise it defaults to SVG.
     * @param {object?} roughConfig Config object this passed to the Rough.js ctor and
     * also used while parsing the styles for `SVGElement`s.
     */
    constructor(target: string | HTMLCanvasElement | SVGSVGElement, renderMode?: RenderMode | null, roughConfig?: object | null);
    /**
     * The SVG that should be converted.
     * Changing this property triggers drawing of the SVG into
     * the canvas or container element with which Svg2Roughjs
     * was initialized.
     * @param {SVGSVGElement} svg
     */
    set svg(arg: SVGSVGElement);
    /**
     * @return {SVGSVGElement}
     */
    get svg(): SVGSVGElement;
    /** @type {SVGSVGElement} */
    $svg: SVGSVGElement | undefined;
    width: number | undefined;
    height: number | undefined;
    /**
     * Rough.js config object that is provided to Rough.js for drawing
     * any SVG element.
     * Changing this property triggers a repaint.
     * @param {object}
     */
    set roughConfig(arg: object);
    /**
     * @return {object}
     */
    get roughConfig(): object;
    $roughConfig: object | null;
    rc: any;
    /**
     * Set a font-family for the rendering of text elements.
     * If set to `null`, then the font-family of the SVGTextElement is used.
     * By default, 'Comic Sans MS, cursive' is used.
     * Changing this property triggers a repaint.
     * @param {string | null}
     */
    set fontFamily(arg: string);
    /**
     * @returns {string}
     */
    get fontFamily(): string;
    $fontFamily: string;
    /**
     * Whether to randomize Rough.js' fillWeight, hachureAngle and hachureGap.
     * Also randomizes the disableMultiStroke option of Rough.js.
     * By default true.
     * Changing this property triggers a repaint.
     * @param {boolean}
     */
    set randomize(arg: boolean);
    /**
     * @returns {boolean}
     */
    get randomize(): boolean;
    $randomize: boolean;
    /**
     * Optional solid background color with which
     * the canvas should be initialized.
     * It is drawn on a transparent canvas by default.
     * @param {string}
     */
    set backgroundColor(arg: string);
    /**
     * @returns {string}
     */
    get backgroundColor(): string;
    $backgroundColor: string | undefined;
    /**
     * Changes the output format of the converted SVG.
     * Changing this property, will replace the current output
     * element with either a new HTML canvas or new SVG element.
     * @param {RenderMode} mode
     */
    set renderMode(arg: RenderMode);
    /**
     * @returns {RenderMode}
     */
    get renderMode(): RenderMode;
    $renderMode: RenderMode | null | undefined;
    ctx: any;
    canvas: HTMLCanvasElement | SVGSVGElement | undefined;
    /**
     * Whether to apply a pencil filter.
     * Only works for SVG render mode.
     * @param {boolean}
     */
    set pencilFilter(arg: boolean);
    /**
     * @returns {boolean}
     */
    get pencilFilter(): boolean;
    $pencilFilter: any;
    /**
     * Triggers an entire redraw of the SVG which also
     * processes it anew.
     */
    redraw(): void;
    /**
     * Prepares the given canvas element depending on the set properties.
     * @private
     * @param {HTMLCanvasElement} canvas
     */
    private initializeCanvas;
    /**
     * Prepares the given SVG element depending on the set properties.
     * @private
     * @param {SVGSVGElement} svgElement
     */
    private initializeSvg;
    /**
     * Traverses the SVG in DFS and draws each element to the canvas.
     * @private
     * @param {SVGSVGElement | SVGGElement} root either an SVG- or g-element
     * @param {SVGTransform?} svgTransform
     * @param {number?} width Use elements can overwrite width
     * @param {number?} height Use elements can overwrite height
     */
    private processRoot;
    /**
     * Helper method to append the returned `SVGGElement` from
     * Rough.js when drawing in SVG mode.
     * @private
     * @param {SVGElement} element
     * @param {SVGElement} sketchElement
     */
    private postProcessElement;
    /**
     * Combines the given transform with the element's transform.
     * @param {SVGElement} element
     * @param {SVGTransform} transform
     * @returns {SVGTransform}
     */
    getCombinedTransform(element: SVGElement, transform: SVGTransform): SVGTransform;
    /**
     * Returns the consolidated of the given element.
     * @private
     * @param {SVGElement} element
     * @returns {SVGTransform|null}
     */
    private getSvgTransform;
    /**
     * Applies the given svgTransform to the canvas context.
     * @private
     * @param {SVGTransform?} svgTransform
     * @param {SVGElement?} element The element to which the transform should be applied
     * when in SVG mode.
     */
    private applyGlobalTransform;
    /**
     * Whether the given SVGTransform resembles an identity transform.
     * @private
     * @param {SVGTransform?} svgTransform
     * @returns {boolean} Whether the transform is an identity transform.
     *  Returns true if transform is undefined.
     */
    private isIdentityTransform;
    /**
     * Whether the given SVGTransform does not scale nor skew.
     * @private
     * @param {SVGTransform?} svgTransform
     * @returns {boolean} Whether the given SVGTransform does not scale nor skew.
     *  Returns true if transform is undefined.
     */
    private isTranslationTransform;
    /**
     * Stores elements with IDs for later use.
     * @private
     */
    private collectElementsWithID;
    idElements: {} | undefined;
    /**
     * Applies a given `SVGTransform` to the point.
     *
     * [a c e] [x] = (a*x + c*y + e)
     * [b d f] [y] = (b*x + d*y + f)
     * [0 0 1] [1] = (0 + 0 + 1)
     *
     * @private
     * @param {Point} point
     * @param {SVGTransform?} svgTransform
     * @return {Point}
     */
    private applyMatrix;
    /**
     * Returns a random number in the given rande.
     * @private
     * @param {number} min
     * @param {number} max
     * @return {number}
     */
    private getRandomNumber;
    /**
     * Returns the `offset` of an `SVGStopElement`.
     * @private
     * @param {SVGStopElement} stop
     * @return {number} stop percentage
     */
    private getStopOffset;
    /**
     * Returns the `stop-color`of an `SVGStopElement`.
     * @private
     * @param {SVGStopElement} stop
     * @return {tinycolor}
     */
    private getStopColor;
    /**
     * Converts an SVG gradient to a color by mixing all stop colors
     * with `tinycolor.mix`.
     * @private
     * @param {SVGLinearGradientElement | SVGRadialGradientElement} gradient
     * @param {number} opacity
     * @return {string}
     */
    private gradientToColor;
    /**
     * Returns the id from the url string
     * @private
     * @param {string} url
     * @returns {string}
     */
    private getIdFromUrl;
    /**
     * Parses a `fill` url by looking in the SVG `defs` element.
     * When a gradient is found, it is converted to a color and stored
     * in the internal defs store for this url.
     * @private
     * @param {string} url
     * @param {number} opacity
     * @return {string}
     */
    private parseFillUrl;
    /**
     * Converts SVG opacity attributes to a [0, 1] range.
     * @private
     * @param {SVGElement} element
     * @param {string} attribute
     */
    private getOpacity;
    /**
     * Traverses the given elements hierarchy bottom-up to determine its effective
     * opacity attribute.
     * @private
     * @param {SVGElement} element
     * @param {number} currentOpacity
     * @param {object?} currentUseCtx Consider different DOM hierarchy for use elements
     * @returns {number}
     */
    private getEffectiveElementOpacity;
    /**
     * Returns the attribute value of an element under consideration
     * of inherited attributes from the `parentElement`.
     * @private
     * @param {SVGElement} element
     * @param {string} attributeName Name of the attribute to look up
     * @param {object?} currentUseCtx Consider different DOM hierarchy for use elements
     * @return {string|null} attribute value if it exists
     */
    private getEffectiveAttribute;
    /**
     * Converts the given string to px unit. May be either a <length>
     * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Length)
     * or a <percentage>
     * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Percentage).
     * @private
     * @param {string} value
     * @returns {number} THe value in px unit
     */
    private convertToPixelUnit;
    /**
     * Converts the effective style attributes of the given `SVGElement`
     * to a Rough.js config object that is used to draw the element with
     * Rough.js.
     * @private
     * @param {SVGElement} element
     * @param {SVGTransform?} svgTransform
     * @return {object} config for Rough.js drawing
     */
    private parseStyleConfig;
    /**
     * @private
     * @param {SVGSVGElement}
     * @returns {SVGDefsElement}
     */
    private getDefsElement;
    /**
     * Applies the clip-path to the CanvasContext.
     * @private
     * @param {SVGElement} owner
     * @param {string} clipPathAttr
     * @param {SVGTransform?} svgTransform
     */
    private applyClipPath;
    /**
     * Applies the element as clip to the CanvasContext.
     * @private
     * @param {SVGElement} element
     * @param {SVGClipPathElement} container
     * @param {SVGTransform?} svgTransform
     */
    private applyElementClip;
    /**
     * @private
     * @param {SVGElement} element
     */
    private isHidden;
    /**
     * The main switch to delegate drawing of `SVGElement`s
     * to different subroutines.
     * @private
     * @param {SVGElement} element
     * @param {SVGTransform} svgTransform
     */
    private drawElement;
    /**
     * @private
     * @param {SVGPathElement|SVGLineElement|SVGPolylineElement|SVGPolygonElement} element
     * @param {Point[]} points Array of coordinates
     * @param {SVGTransform?}
     */
    private drawMarkers;
    /**
     * The angle in degree of the line defined by the given points.
     * @private
     * @param {Point} p0
     * @param {Point} p1
     * @returns {number}
     */
    private getAngle;
    /**
     * @private
     * @param {SVGPolylineElement} polyline
     * @param {SVGTransform?} svgTransform
     */
    private drawPolyline;
    /**
     * @private
     * @param {SVGPolygonElement | SVGPolylineElement} element
     * @returns {Array<Point>}
     */
    private getPointsArray;
    /**
     * @private
     * @param {SVGPolygonElement} polygon
     * @param {SVGClipPathElement?} container
     * @param {SVGTransform?} svgTransform
     */
    private applyPolygonClip;
    /**
     * @private
     * @param {SVGPolygonElement} polygon
     * @param {SVGTransform?} svgTransform
     */
    private drawPolygon;
    /**
     * @private
     * @param {SVGEllipseElement} ellipse
     * @param {SVGClipPathElement} container
     * @param {SVGTransform?} svgTransform
     */
    private applyEllipseClip;
    /**
     * @private
     * @param {SVGEllipseElement} ellipse
     * @param {SVGTransform?} svgTransform
     */
    private drawEllipse;
    /**
     * @private
     * @param {SVGCircleElement} circle
     * @param {SVGClipPathElement} container
     * @param {SVGTransform?} svgTransform
     */
    private applyCircleClip;
    /**
     * @private
     * @param {SVGCircleElement} circle
     * @param {SVGTransform?} svgTransform
     */
    private drawCircle;
    /**
     * @private
     * @param {SVGLineElement} line
     * @param {SVGTransform?} svgTransform
     */
    private drawLine;
    /**
     * @private
     * @param {SVGSVGElement | SVGSymbolElement} element
     * @param {SVGTransform?} svgTransform
     */
    private drawRoot;
    /**
     * @private
     * @param {SVGUseElement} use
     * @param {SVGTransform?} svgTransform
     */
    private drawUse;
    $useElementContext: any;
    /**
     * @private
     * @param {SVGPathElement} path
     * @param {SVGTransform?} svgTransform
     */
    private drawPath;
    /**
     * @private
     * @param {SVGRectElement} rect
     * @param {SVGClipPathElement} container
     * @param {SVGTransform?} svgTransform
     */
    private applyRectClip;
    /**
     * @private
     * @param {SVGRectElement} rect
     * @param {SVGTransform?} svgTransform
     */
    private drawRect;
    /**
     * @private
     * @param {SVGImageElement} svgImage
     * @param {SVGTransform?} svgTransform
     */
    private drawImage;
    /**
     * @private
     * @param {SVGTextElement} text
     * @param {SVGTransform?} svgTransform
     */
    private drawText;
    /**
     * Retrieves the text content from a text content element (text, tspan, ...)
     * @private
     * @param {SVGTextContentElement} element
     * @returns {string}
     */
    private getTextContent;
    /**
     * Determines whether the given element has default white-space handling, i.e. normalization.
     * Returns false if the element (or an ancestor) has xml:space='preserve'
     * @private
     * @param {SVGElement} element
     * @returns {boolean}
     */
    private shouldNormalizeWhitespace;
    /**
     * @private
     * @param {SVGAnimatedLengthList} svgLengthList
     * @return {number} length in pixels
     */
    private getLengthInPx;
    /**
     * @private
     * @param {SVGTextElement} text
     * @param {boolean?} asStyleString Formats the return value as inline style string
     * @return {string}
     */
    private getCssFont;
    /**
     * Returns the Node's children, since Node.prototype.children is not available on all browsers.
     * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/children
     * @private
     * @param {Node} element
     * @returns {Array}
     */
    private getNodeChildren;
    /**
     * Calculates the average color of the colors in the given array.
     * @param {tinycolor[]} colorArray
     * @returns {tinycolor} The average color
     */
    averageColor(colorArray: any[]): any;
}

export { RenderMode, Svg2Roughjs };
