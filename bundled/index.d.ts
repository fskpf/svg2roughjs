import { Options } from 'roughjs/bin/core';
import { RoughCanvas } from 'roughjs/bin/canvas';
import { RoughSVG } from 'roughjs/bin/svg';

declare enum RenderMode {
    SVG = 0,
    CANVAS = 1
}

/**
 * A context that represents the current state of the rendering,
 * which is used in the rendering functions.
 */
declare type RenderContext = {
    rc: RoughCanvas | RoughSVG;
    roughConfig: Options;
    renderMode: RenderMode;
    fontFamily: string | null;
    pencilFilter: boolean;
    randomize: boolean;
    idElements: Record<string, SVGElement | string>;
    sourceSvg: SVGSVGElement;
    targetCanvas?: HTMLCanvasElement;
    targetCanvasContext?: CanvasRenderingContext2D;
    targetSvg?: SVGSVGElement;
    useElementContext?: UseContext | null;
};
/**
 * The context for rendering use elements.
 */
declare type UseContext = {
    referenced: SVGElement;
    root: Element | null;
    parentContext: UseContext | null;
};

/**
 * Svg2Roughjs parses a given SVG and draws it with Rough.js
 * in a canvas.
 */
declare class Svg2Roughjs {
    private $svg?;
    private width;
    private height;
    private canvas;
    private $roughConfig;
    private rc;
    private $fontFamily;
    private $randomize;
    private $backgroundColor;
    private $renderMode;
    private ctx;
    private $pencilFilter;
    private idElements;
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
    set roughConfig(config: Options);
    get roughConfig(): Options;
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
    set backgroundColor(color: string | null);
    get backgroundColor(): string | null;
    /**
     * Changes the output format of the converted SVG.
     * Changing this property will replace the current output
     * element with either a new HTML canvas or new SVG element.
     */
    set renderMode(mode: RenderMode);
    get renderMode(): RenderMode;
    /**
     * Whether to apply a pencil filter.
     * Only works for SVG render mode.
     */
    set pencilFilter(value: boolean);
    get pencilFilter(): boolean;
    /**
     * Creates a new context which contains the current state of the
     * Svg2Roughs instance for rendering.
     * @returns A new context.
     */
    createRenderContext(): RenderContext;
    /**
     * Creates a new instance of Svg2roughjs.
     * @param target Either a selector for the container to which a canvas should be added
     * or an `HTMLCanvasElement` or `SVGSVGElement` that should be used as output target.
     * @param renderMode Whether the output should be an SVG or drawn to an HTML canvas.
     * Defaults to SVG or CANVAS depending if the given target is of type `HTMLCanvasElement` or `SVGSVGElement`,
     * otherwise it defaults to SVG.
     * @param roughjsOptions Config object this passed to the Rough.js ctor and
     * also used while parsing the styles for `SVGElement`s.
     */
    constructor(target: string | HTMLCanvasElement | SVGSVGElement, renderMode?: RenderMode, roughjsOptions?: Options);
    /**
     * Triggers an entire redraw of the SVG which
     * processes the input element anew.
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
     * Stores elements with IDs for later use.
     */
    private collectElementsWithID;
}

export { RenderMode, Svg2Roughjs };
