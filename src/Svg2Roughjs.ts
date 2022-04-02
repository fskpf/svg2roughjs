import { Options } from 'roughjs/bin/core'
import rough from 'roughjs/bin/rough'
import { processRoot } from './processor'
import { OutputType } from './OutputType'
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
  private $roughConfig: Options
  private $fontFamily: string | null
  private $randomize: boolean
  private $backgroundColor: string | null = null
  private $outputType: OutputType
  private $pencilFilter: boolean = false
  private idElements: Record<string, SVGElement | string> = {}

  private outputElement: Element
  private lastResult: SVGSVGElement | HTMLCanvasElement | null = null

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
   */
  set outputType(type: OutputType) {
    if (this.$outputType === type) {
      return
    }

    const incompatible =
      (type === OutputType.CANVAS && this.outputElement instanceof SVGSVGElement) ||
      (type === OutputType.SVG && this.outputElement instanceof HTMLCanvasElement)
    if (incompatible) {
      throw new Error(
        `Output format ${type} incompatible with given output element ${this.outputElement.tagName}`
      )
    }

    this.$outputType = type
    this.redraw()
  }

  get outputType(): OutputType {
    return this.$outputType
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
  createRenderContext(sketchContainer: SVGSVGElement): RenderContext {
    if (!this.svg) {
      throw new Error('No source SVG set yet.')
    }
    const ctx: RenderContext = {
      rc: rough.svg(sketchContainer, { options: this.roughConfig }),
      roughConfig: this.roughConfig,
      fontFamily: this.fontFamily,
      pencilFilter: this.pencilFilter,
      randomize: this.randomize,
      idElements: this.idElements,
      sourceSvg: this.svg,
      svgSketch: sketchContainer,
      styleSheets: Array.from(this.svg.querySelectorAll('style'))
        .map(s => s.sheet)
        .filter(s => s !== null) as CSSStyleSheet[],
      processElement: processRoot
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
    renderMode: OutputType = OutputType.SVG,
    roughjsOptions: Options = {}
  ) {
    if (!target) {
      throw new Error('No target provided')
    }

    const targetElement = typeof target === 'string' ? document.querySelector(target) : target
    if (!targetElement) {
      throw new Error('Could not find target in document')
    }

    this.outputElement = targetElement
    if (targetElement instanceof HTMLCanvasElement) {
      this.$outputType = OutputType.CANVAS
    } else if (targetElement instanceof SVGSVGElement) {
      this.$outputType = OutputType.SVG
    } else {
      this.$outputType = renderMode // TODO rename to something like 'output type' and make it optional as rendering is always in sVG
    }

    // the Rough.js instance to draw the SVG elements
    this.$roughConfig = roughjsOptions

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

    const sketchContainer = this.prepareRenderContainer()
    const renderContext = this.createRenderContext(sketchContainer)

    // sketchify the SVG
    renderContext.processElement(renderContext, this.svg, null, this.width, this.height)

    if (this.outputElement instanceof SVGSVGElement) {
      // sketch already in the outputElement
      return
    } else if (this.outputElement instanceof HTMLCanvasElement) {
      // TODO render sketch containter to given canvas element
    } else {
      // remove the previous attached result
      this.lastResult?.parentElement?.removeChild(this.lastResult)
      // assume that the given output element is a container, thus append the sketch to it
      if (this.outputType === OutputType.SVG) {
        this.outputElement.appendChild(renderContext.svgSketch)
        this.lastResult = renderContext.svgSketch
      } else if (this.outputType === OutputType.CANVAS) {
        const canvas = document.createElement('canvas')
        this.outputElement.appendChild(canvas)
        canvas.width = this.width
        canvas.height = this.height
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        ctx.clearRect(0, 0, this.width, this.height)
        this.drawSvg(renderContext.svgSketch, ctx).then(() => {
          // console.log(this.exportCanvas.toDataURL())
          // sketch.parentElement?.appendChild(this.exportCanvas)
        })
        this.lastResult = canvas
      }
    }

    // TODO if the outputElement was not directly an SVGSVGElement, we need
    // * if outputElement === container: Either append SVG sketch container or append a canvas and draw it to the canvase
    // * or draw the  sketch container to the given outputElement canvas

    // target = document.createElement('canvas')
    // target.width = this.width
    // target.height = this.height

    // if (this.$renderMode === RenderMode.CANVAS) {
    //   const sketch = renderContext.svgSketchContainer
    //   if (sketch) {
    //     const targetCanvas = this.outputElement as HTMLCanvasElement
    //     targetCanvas.width = this.width
    //     targetCanvas.height = this.height
    //     const ctx = targetCanvas.getContext('2d') as CanvasRenderingContext2D
    //     ctx.clearRect(0, 0, this.width, this.height)
    //     this.drawSvg(sketch, ctx).then(() => {
    //       // console.log(this.exportCanvas.toDataURL())
    //       // sketch.parentElement?.appendChild(this.exportCanvas)
    //     })
    //   }
    // }
  }

  private drawSvg(svgElement: SVGSVGElement, ctx: CanvasRenderingContext2D): Promise<void> {
    return new Promise(resolve => {
      const svgString = new XMLSerializer().serializeToString(svgElement)
      const img = new Image()
      img.onload = function () {
        ctx.drawImage(this as HTMLImageElement, 0, 0)
        resolve()
      }
      img.src = `data:image/svg+xml;charset=utf8,${encodeURIComponent(svgString)}`
    })
  }

  /**
   * Prepares the given canvas element depending on the set properties.
   */
  // private initializeCanvas(canvas: HTMLCanvasElement) {
  //   this.ctx = canvas.getContext('2d')
  //   if (this.ctx) {
  //     this.ctx.clearRect(0, 0, this.width, this.height)
  //     if (this.backgroundColor) {
  //       this.ctx.fillStyle = this.backgroundColor
  //       this.ctx.fillRect(0, 0, this.width, this.height)
  //     }
  //     // use round linecap to emphasize a ballpoint pen like drawing
  //     this.ctx.lineCap = 'round'
  //   }
  // }

  /**
   * Prepares the given SVG element depending on the set properties.
   */
  private prepareRenderContainer(): SVGSVGElement {
    let svgElement: SVGSVGElement

    if (this.outputElement instanceof SVGSVGElement) {
      // just use the user given outputElement directly as sketch-container
      svgElement = this.outputElement
    } else {
      // we need a separate svgElement as output element
      svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    }

    // make sure it has all the proper namespaces
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

    // clear SVG element
    while (svgElement.firstChild) {
      svgElement.removeChild(svgElement.firstChild)
    }

    // set size
    svgElement.setAttribute('width', this.width.toString())
    svgElement.setAttribute('height', this.height.toString())

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

    return svgElement
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
