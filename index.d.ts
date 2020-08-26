import tinycolor from 'tinycolor2';

declare enum RenderMode {
    SVG = 0,
    CANVAS = 1
}

declare type RoughConfig = {
    roughness?: number;
    bowing?: number;
    seed?: number;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    fillStyle?: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots' | 'dashed' | 'zigzag-line';
    fillWeight?: number;
    hachureAngle?: number;
    hachureGap?: number;
    curveStepCount?: number;
    curveFitting?: number;
    strokeLineDash?: number[];
    strokeLineDashOffset?: number;
    fillLineDash?: number[];
    fillLineDashOffset?: number;
    disableMultiStroke?: boolean;
    disableMultiStrokeFill?: boolean;
    simplification?: number;
    dashOffset?: number;
    dashGap?: number;
    zigzagOffset?: number;
    combineNestedSvgPaths?: boolean;
};
/**
 * Svg2Roughjs parses a given SVG and draws it with Rough.js
 * in a canvas.
 */
declare class Svg2Roughjs {
    private $svg?;
    private width;
    private height;
    private canvas?;
    private $roughConfig;
    private rc;
    private $fontFamily;
    private $randomize;
    private $backgroundColor?;
    private $renderMode;
    private ctx?;
    private $pencilFilter?;
    private idElements;
    private $useElementContext?;
    /**
     * A simple regexp which is used to test whether a given string value
     * contains unit identifiers, e.g. "1px", "1em", "1%", ...
     */
    private static get CONTAINS_UNIT_REGEXP();
    /**
     * The SVG that should be converted.
     * Changing this property triggers drawing of the SVG into
     * the canvas or container element with which Svg2Roughjs
     * was initialized.
     */
    set svg(svg: SVGSVGElement);
    get svg(): SVGSVGElement;
    /**
     * Rough.js config object that is provided to Rough.js for drawing
     * any SVG element.
     * Changing this property triggers a repaint.
     */
    set roughConfig(config: RoughConfig | null);
    get roughConfig(): RoughConfig | null;
    /**
     * Set a font-family for the rendering of text elements.
     * If set to `null`, then the font-family of the SVGTextElement is used.
     * By default, 'Comic Sans MS, cursive' is used.
     * Changing this property triggers a repaint.
     */
    set fontFamily(fontFamily: string | null);
    get fontFamily(): string | null;
    /**
     * Whether to randomize Rough.js' fillWeight, hachureAngle and hachureGap.
     * Also randomizes the disableMultiStroke option of Rough.js.
     * By default true.
     * Changing this property triggers a repaint.
     */
    set randomize(randomize: boolean);
    get randomize(): boolean;
    /**
     * Optional solid background color with which
     * the canvas should be initialized.
     * It is drawn on a transparent canvas by default.
     */
    set backgroundColor(color: string | undefined);
    get backgroundColor(): string | undefined;
    /**
     * Changes the output format of the converted SVG.
     * Changing this property will replace the current output
     * element with either a new HTML canvas or new SVG element.
     */
    set renderMode(mode: RenderMode | null);
    get renderMode(): RenderMode | null;
    /**
     * Whether to apply a pencil filter.
     * Only works for SVG render mode.
     */
    set pencilFilter(value: boolean | undefined);
    get pencilFilter(): boolean | undefined;
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
    constructor(target: string | HTMLCanvasElement | SVGSVGElement, renderMode?: RenderMode | null, roughConfig?: RoughConfig | null);
    /**
     * Triggers an entire redraw of the SVG which also
     * processes it anew.
     */
    redraw(): void;
    /**
     * Prepares the given canvas element depending on the set properties.
     */
    private initializeCanvas;
    /**
     * Prepares the given SVG element depending on the set properties.
     */
    private initializeSvg;
    /**
     * Traverses the SVG in DFS and draws each element to the canvas.
     * @param root either an SVG- or g-element
     * @param width Use elements can overwrite width
     * @param height Use elements can overwrite height
     */
    private processRoot;
    /**
     * Helper method to append the returned `SVGGElement` from
     * Rough.js when drawing in SVG mode.
     */
    private postProcessElement;
    /**
     * Combines the given transform with the element's transform.
     */
    getCombinedTransform(element: SVGGraphicsElement, transform: SVGTransform): SVGTransform;
    /**
     * Returns the consolidated of the given element.
     */
    private getSvgTransform;
    /**
     * Applies the given svgTransform to the canvas context.
     * @param element The element to which the transform should be applied
     * when in SVG mode.
     */
    private applyGlobalTransform;
    /**
     * Whether the given SVGTransform resembles an identity transform.
     * @returns Whether the transform is an identity transform.
     *  Returns true if transform is undefined.
     */
    private isIdentityTransform;
    /**
     * Whether the given SVGTransform does not scale nor skew.
     * @returns Whether the given SVGTransform does not scale nor skew.
     *  Returns true if transform is undefined.
     */
    private isTranslationTransform;
    /**
     * Stores elements with IDs for later use.
     */
    private collectElementsWithID;
    /**
     * Applies a given `SVGTransform` to the point.
     *
     * [a c e] [x] = (a*x + c*y + e)
     * [b d f] [y] = (b*x + d*y + f)
     * [0 0 1] [1] = (0 + 0 + 1)
     */
    private applyMatrix;
    /**
     * Returns a random number in the given range.
     */
    private getRandomNumber;
    /**
     * Returns the `offset` of an `SVGStopElement`.
     * @return stop percentage
     */
    private getStopOffset;
    /**
     * Returns the `stop-color` of an `SVGStopElement`.
     */
    private getStopColor;
    /**
     * Converts an SVG gradient to a color by mixing all stop colors
     * with `tinycolor.mix`.
     */
    private gradientToColor;
    /**
     * Returns the id from the url string
     */
    private getIdFromUrl;
    /**
     * Parses a `fill` url by looking in the SVG `defs` element.
     * When a gradient is found, it is converted to a color and stored
     * in the internal defs store for this url.
     */
    private parseFillUrl;
    /**
     * Converts SVG opacity attributes to a [0, 1] range.
     */
    private getOpacity;
    /**
     * Traverses the given elements hierarchy bottom-up to determine its effective
     * opacity attribute.
     * @param currentUseCtx Consider different DOM hierarchy for use elements
     */
    private getEffectiveElementOpacity;
    /**
     * Returns the attribute value of an element under consideration
     * of inherited attributes from the `parentElement`.
     * @param attributeName Name of the attribute to look up
     * @param currentUseCtx Consider different DOM hierarchy for use elements
     * @return attribute value if it exists
     */
    private getEffectiveAttribute;
    /**
     * Converts the given string to px unit. May be either a <length>
     * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Length)
     * or a <percentage>
     * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Percentage).
     * @returns The value in px unit
     */
    private convertToPixelUnit;
    /**
     * Converts the effective style attributes of the given `SVGElement`
     * to a Rough.js config object that is used to draw the element with
     * Rough.js.
     * @return config for Rough.js drawing
     */
    private parseStyleConfig;
    private getDefsElement;
    /**
     * Applies the clip-path to the CanvasContext.
     */
    private applyClipPath;
    /**
     * Applies the element as clip to the CanvasContext.
     */
    private applyElementClip;
    private isHidden;
    /**
     * The main switch to delegate drawing of `SVGElement`s
     * to different subroutines.
     */
    private drawElement;
    private drawMarkers;
    /**
     * The angle in degree of the line defined by the given points.
     */
    private getAngle;
    private drawPolyline;
    private getPointsArray;
    private applyPolygonClip;
    private drawPolygon;
    private applyEllipseClip;
    private drawEllipse;
    private applyCircleClip;
    private drawCircle;
    private drawLine;
    private drawRoot;
    private drawUse;
    private drawPath;
    private applyRectClip;
    private drawRect;
    private drawImage;
    private drawText;
    /**
     * Retrieves the text content from a text content element (text, tspan, ...)
     */
    private getTextContent;
    /**
     * Determines whether the given element has default white-space handling, i.e. normalization.
     * Returns false if the element (or an ancestor) has xml:space='preserve'
     */
    private shouldNormalizeWhitespace;
    /**
     * @return length in pixels
     */
    private getLengthInPx;
    /**
     * @param asStyleString Formats the return value as inline style string
     */
    private getCssFont;
    /**
     * Returns the Node's children, since Node.prototype.children is not available on all browsers.
     * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/children
     */
    private getNodeChildren;
    /**
     * Calculates the average color of the colors in the given array.
     * @returns The average color
     */
    averageColor(colorArray: tinycolor.Instance[]): tinycolor.Instance;
}

export { RenderMode, Svg2Roughjs };
