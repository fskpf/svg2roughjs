import { RoughCanvas } from 'roughjs/bin/canvas'
import { Options } from 'roughjs/bin/core'
import rough from 'roughjs/bin/rough'
import { RoughSVG } from 'roughjs/bin/svg'
import { processRoot } from './processor'
import { RenderMode } from './RenderMode'
import { SvgTextures } from './SvgTextures'
import { getDefsElement, RenderContext } from './utils'

/**
 * Svg2Roughjs parses a given SVG and draws it with Rough.js
 * in a canvas.
 */
export class Svg2Roughjs {
  private $svg?: SVGSVGElement
  private width: number = 0
  private height: number = 0
  private canvas: HTMLCanvasElement | SVGSVGElement
  private $roughConfig: Options
  private rc: RoughCanvas | RoughSVG
  private $fontFamily: string | null
  private $randomize: boolean
  private $backgroundColor: string | null = null
  private $renderMode: RenderMode
  private ctx: CanvasRenderingContext2D | null = null
  private $pencilFilter: boolean = false
  private idElements: Record<string, SVGElement | string> = {}

  /**
   * The SVG that should be converted.
   * Changing this property triggers drawing of the SVG into
   * the canvas or container element with which Svg2Roughjs
   * was initialized.
   */
  set svg(svg: SVGSVGElement) {
    if (this.$svg !== svg) {
      this.$svg = svg

      this.width = this.coerceSize(svg, 'width', 300)
      this.height = this.coerceSize(svg, 'height', 150)

      if (this.renderMode === RenderMode.CANVAS && this.ctx) {
        const canvas = this.canvas as HTMLCanvasElement
        canvas.width = this.width
        canvas.height = this.height
      } else {
        const svg = this.canvas as SVGSVGElement
        svg.setAttribute('width', this.width.toString())
        svg.setAttribute('height', this.height.toString())
      }

      // pre-process defs for subsequent references
      this.collectElementsWithID()

      this.redraw()
    }
  }

  get svg(): SVGSVGElement {
    return this.$svg as SVGSVGElement
  }

  /**
   * Rough.js config object that is provided to Rough.js for drawing
   * any SVG element.
   * Changing this property triggers a repaint.
   */
  set roughConfig(config: Options) {
    this.$roughConfig = config
    if (this.renderMode === RenderMode.CANVAS && this.ctx) {
      this.rc = rough.canvas(this.canvas as HTMLCanvasElement, { options: this.roughConfig })
    } else {
      this.rc = rough.svg(this.canvas as SVGSVGElement, { options: this.roughConfig })
    }
    this.redraw()
  }

  get roughConfig(): Options {
    return this.$roughConfig
  }

  /**
   * Set a font-family for the rendering of text elements.
   * If set to `null`, then the font-family of the SVGTextElement is used.
   * By default, 'Comic Sans MS, cursive' is used.
   * Changing this property triggers a repaint.
   */
  set fontFamily(fontFamily: string | null) {
    if (this.$fontFamily !== fontFamily) {
      this.$fontFamily = fontFamily
      this.redraw()
    }
  }

  get fontFamily(): string | null {
    return this.$fontFamily
  }

  /**
   * Whether to randomize Rough.js' fillWeight, hachureAngle and hachureGap.
   * Also randomizes the disableMultiStroke option of Rough.js.
   * By default true.
   * Changing this property triggers a repaint.
   */
  set randomize(randomize: boolean) {
    this.$randomize = randomize
    this.redraw()
  }

  get randomize(): boolean {
    return this.$randomize
  }

  /**
   * Optional solid background color with which
   * the canvas should be initialized.
   * It is drawn on a transparent canvas by default.
   */
  set backgroundColor(color: string | null) {
    this.$backgroundColor = color
  }

  get backgroundColor(): string | null {
    return this.$backgroundColor
  }

  /**
   * Changes the output format of the converted SVG.
   * Changing this property will replace the current output
   * element with either a new HTML canvas or new SVG element.
   */
  set renderMode(mode: RenderMode) {
    if (this.$renderMode === mode) {
      return
    }
    this.$renderMode = mode

    const parent = this.canvas!.parentElement as HTMLElement
    parent.removeChild(this.canvas!)

    let target: HTMLCanvasElement | SVGSVGElement
    if (mode === RenderMode.CANVAS) {
      target = document.createElement('canvas')
      target.width = this.width
      target.height = this.height
      this.ctx = target.getContext('2d')
    } else {
      this.ctx = null
      target = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      target.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      target.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      target.setAttribute('width', this.width.toString())
      target.setAttribute('height', this.height.toString())
    }
    parent!.appendChild(target)
    this.canvas = target

    if (mode === RenderMode.CANVAS) {
      this.rc = rough.canvas(this.canvas as HTMLCanvasElement, { options: this.roughConfig })
    } else {
      this.rc = rough.svg(this.canvas as SVGSVGElement, { options: this.roughConfig })
    }

    this.redraw()
  }

  get renderMode(): RenderMode {
    return this.$renderMode
  }

  /**
   * Whether to apply a pencil filter.
   * Only works for SVG render mode.
   */
  set pencilFilter(value: boolean) {
    if (this.$pencilFilter !== value) {
      this.$pencilFilter = value
      this.redraw()
    }
  }

  get pencilFilter(): boolean {
    return this.$pencilFilter
  }

  /**
   * Creates a new context which contains the current state of the
   * Svg2Roughs instance for rendering.
   * @returns A new context.
   */
  createRenderContext(): RenderContext {
    if (!this.$svg) {
      throw new Error('No source SVG set yet.')
    }
    const ctx: RenderContext = {
      rc: this.rc,
      roughConfig: this.roughConfig,
      renderMode: this.renderMode,
      fontFamily: this.fontFamily,
      pencilFilter: this.pencilFilter,
      randomize: this.randomize,
      idElements: this.idElements,
      sourceSvg: this.$svg,
      styleSheets: Array.from(this.$svg.querySelectorAll('style'))
        .map(s => s.sheet)
        .filter(s => s !== null) as CSSStyleSheet[],
      processElement: processRoot
    }

    if (this.renderMode === RenderMode.CANVAS && this.ctx) {
      ctx.targetCanvas = this.canvas as HTMLCanvasElement
      ctx.targetCanvasContext = this.ctx
    } else {
      ctx.targetSvg = this.canvas as SVGSVGElement
    }

    return ctx
  }

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
  constructor(
    target: string | HTMLCanvasElement | SVGSVGElement,
    renderMode: RenderMode = RenderMode.SVG,
    roughjsOptions: Options = {}
  ) {
    if (!target) {
      throw new Error('No target provided')
    }
    if (target instanceof HTMLCanvasElement || target instanceof SVGSVGElement) {
      if (target.tagName === 'canvas' || target.tagName === 'svg') {
        this.canvas = target
        this.$renderMode = target.tagName === 'canvas' ? RenderMode.CANVAS : RenderMode.SVG
      } else {
        throw new Error('Target object is not of type HTMLCanvasElement or SVGSVGElement')
      }
    } else {
      // create a new HTMLCanvasElement or SVGSVGElement as child of the given element
      const container = document.querySelector(target)
      if (!container) {
        throw new Error(`No element found with ${target}`)
      }
      if (renderMode === RenderMode.CANVAS) {
        this.canvas = document.createElement('canvas')
        this.canvas.width = container.clientWidth
        this.canvas.height = container.clientHeight
      } else {
        this.canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        this.canvas.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        this.canvas.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      }
      this.$renderMode = renderMode
      container.appendChild(this.canvas)
    }

    this.$roughConfig = roughjsOptions

    // the Rough.js instance to draw the SVG elements
    if (this.renderMode === RenderMode.CANVAS) {
      const canvas = this.canvas as HTMLCanvasElement
      this.rc = rough.canvas(canvas, { options: this.roughConfig })
      // canvas context for convenient access
      this.ctx = canvas.getContext('2d')
    } else {
      this.rc = rough.svg(this.canvas as SVGSVGElement, { options: this.roughConfig })
    }

    // default font family
    this.$fontFamily = 'Comic Sans MS, cursive'

    // we randomize the visualization per element by default
    this.$randomize = true
  }

  /**
   * Triggers an entire redraw of the SVG which
   * processes the input element anew.
   */
  redraw(): void {
    if (!this.svg) {
      return
    }

    // reset target element
    if (this.renderMode === RenderMode.CANVAS) {
      this.initializeCanvas(this.canvas as HTMLCanvasElement)
    } else {
      this.initializeSvg(this.canvas as SVGSVGElement)
    }

    const renderContext = this.createRenderContext()
    renderContext.processElement(renderContext, this.svg, null, this.width, this.height)
  }

  /**
   * Prepares the given canvas element depending on the set properties.
   */
  private initializeCanvas(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height)
      if (this.backgroundColor) {
        this.ctx.fillStyle = this.backgroundColor
        this.ctx.fillRect(0, 0, this.width, this.height)
      }
      // use round linecap to emphasize a ballpoint pen like drawing
      this.ctx.lineCap = 'round'
    }
  }

  /**
   * Prepares the given SVG element depending on the set properties.
   */
  private initializeSvg(svgElement: SVGSVGElement) {
    // maybe canvas rendering was used before
    this.ctx = null

    // clear SVG element
    while (svgElement.firstChild) {
      svgElement.removeChild(svgElement.firstChild)
    }

    // apply backgroundColor
    let backgroundElement
    if (this.backgroundColor) {
      backgroundElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      backgroundElement.width.baseVal.value = this.width
      backgroundElement.height.baseVal.value = this.height
      backgroundElement.setAttribute('fill', this.backgroundColor)
      svgElement.appendChild(backgroundElement)
    }

    // prepare filter effects
    if (this.pencilFilter) {
      const defs = getDefsElement(svgElement)
      defs.appendChild(SvgTextures.pencilTextureFilter)
    }

    // use round linecap to emphasize a ballpoint pen like drawing
    svgElement.setAttribute('stroke-linecap', 'round')
  }

  /**
   * Stores elements with IDs for later use.
   */
  private collectElementsWithID() {
    this.idElements = {}
    const elementsWithID: SVGElement[] = Array.prototype.slice.apply(
      this.svg.querySelectorAll('*[id]')
    )
    for (const elt of elementsWithID) {
      const id = elt.getAttribute('id')
      if (id) {
        this.idElements[id] = elt
      }
    }
  }

  /**
   * Helper to handle percentage values for width / height of the input SVG.
   */
  private coerceSize(svg: SVGSVGElement, property: 'width' | 'height', fallback: number): number {
    let size = fallback
    const hasViewbox = svg.hasAttribute('viewBox')
    if (svg.hasAttribute(property)) {
      // percentage sizes for the root SVG are unclear, thus use viewBox if available
      if (svg[property].baseVal.unitType === SVGLength.SVG_LENGTHTYPE_PERCENTAGE && hasViewbox) {
        size = svg.viewBox.baseVal[property]
      } else {
        size = svg[property].baseVal.value
      }
    } else if (hasViewbox) {
      size = svg.viewBox.baseVal[property]
    }
    return size
  }
}
