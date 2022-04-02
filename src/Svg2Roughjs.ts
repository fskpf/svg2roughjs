import { Options } from 'roughjs/bin/core'
import rough from 'roughjs/bin/rough'
import { processRoot } from './processor'
import { OutputType } from './OutputType'
import { SvgTextures } from './SvgTextures'
import { getDefsElement, RenderContext } from './utils'

/**
 * Svg2Roughjs parses an SVG and converts it to a hand-drawn sketch.
 */
export class Svg2Roughjs {
  /**
   * Optional solid background color with which the canvas should be initialized.
   * It is drawn on a transparent canvas by default.
   */
  backgroundColor: string | null = null

  /**
   * Set a font-family for the rendering of text elements.
   * If set to `null`, then the font-family of the SVGTextElement is used.
   * By default, 'Comic Sans MS, cursive' is used.
   */
  fontFamily: string | null = 'Comic Sans MS, cursive'

  /**
   * Whether to randomize Rough.js' fillWeight, hachureAngle and hachureGap.
   * Also randomizes the disableMultiStroke option of Rough.js.
   * By default true.
   */
  randomize: boolean = true

  /**
   * Whether to apply a pencil filter.
   */
  pencilFilter: boolean = false

  private $svg?: SVGSVGElement
  private width: number = 0
  private height: number = 0
  private $outputType: OutputType
  private idElements: Record<string, SVGElement | string> = {}

  private outputElement: Element
  private lastResult: SVGSVGElement | HTMLCanvasElement | null = null

  /**
   * The SVG that should be converted.
   */
  set svg(svg: SVGSVGElement) {
    if (this.$svg !== svg) {
      this.$svg = svg

      this.width = this.coerceSize(svg, 'width', 300)
      this.height = this.coerceSize(svg, 'height', 150)

      // pre-process defs for subsequent references
      this.collectElementsWithID()
    }
  }

  get svg(): SVGSVGElement {
    return this.$svg as SVGSVGElement
  }

  /**
   * Sets the output format of the sketch.
   *
   * Applies only to instances that have been created with a
   * container as output element instead of an actual SVG or canvas
   * element.
   *
   * Throws when the given mode does not match the output element
   * with which this instance was created.
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
  }

  get outputType(): OutputType {
    return this.$outputType
  }

  /**
   * Creates a new instance of Svg2roughjs.
   * @param target Either a selector for the container to which a canvas should be added
   * or an `HTMLCanvasElement` or `SVGSVGElement` that should be used as output target.
   * @param outputType Whether the output should be an SVG or drawn to an HTML canvas.
   * Defaults to SVG or CANVAS depending if the given target is of type `HTMLCanvasElement` or `SVGSVGElement`,
   * otherwise it defaults to SVG.
   * @param roughConfig Config object this passed to the Rough.js ctor and
   * also used while parsing the styles for `SVGElement`s.
   */
  constructor(
    target: string | HTMLCanvasElement | SVGSVGElement,
    outputType: OutputType = OutputType.SVG,
    public roughConfig: Options = {}
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
      this.$outputType = outputType
    }
  }

  /**
   * Triggers an entire redraw of the SVG which
   * processes the input element anew.
   * @returns A promise that resolved to the sketched output element or null if no {@link svg} is set.
   */
  sketch(): Promise<SVGSVGElement | HTMLCanvasElement | null> {
    if (!this.svg) {
      return Promise.resolve(null)
    }

    const sketchContainer = this.prepareRenderContainer()
    const renderContext = this.createRenderContext(sketchContainer)

    // sketchify the SVG
    renderContext.processElement(renderContext, this.svg, null, this.width, this.height)

    if (this.outputElement instanceof SVGSVGElement) {
      // sketch already in the outputElement
      return Promise.resolve(this.outputElement)
    } else if (this.outputElement instanceof HTMLCanvasElement) {
      return this.drawToCanvas(renderContext, this.outputElement)
    }

    // remove the previous attached result
    this.lastResult?.parentElement?.removeChild(this.lastResult)
    // assume that the given output element is a container, thus append the sketch to it
    if (this.outputType === OutputType.SVG) {
      this.outputElement.appendChild(renderContext.svgSketch)
      this.lastResult = renderContext.svgSketch
      return Promise.resolve(renderContext.svgSketch)
    } else {
      // canvas output type
      const canvas = document.createElement('canvas')
      this.outputElement.appendChild(canvas)
      this.lastResult = canvas
      return this.drawToCanvas(renderContext, canvas)
    }
  }

  /**
   * Creates a new context which contains the current state of the
   * Svg2Roughs instance for rendering.
   */
  private createRenderContext(sketchContainer: SVGSVGElement): RenderContext {
    if (!this.svg) {
      throw new Error('No source SVG set yet.')
    }
    return {
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
  }

  /**
   * Helper method to draw the sketched SVG to a HTMLCanvasElement.
   */
  private drawToCanvas(
    renderContext: RenderContext,
    canvas: HTMLCanvasElement
  ): Promise<HTMLCanvasElement> {
    canvas.width = this.width
    canvas.height = this.height
    const canvasCtx = canvas.getContext('2d') as CanvasRenderingContext2D
    canvasCtx.clearRect(0, 0, this.width, this.height)
    return new Promise(resolve => {
      const svgString = new XMLSerializer().serializeToString(renderContext.svgSketch)
      const img = new Image()
      img.onload = function () {
        canvasCtx.drawImage(this as HTMLImageElement, 0, 0)
        resolve(canvas)
      }
      img.src = `data:image/svg+xml;charset=utf8,${encodeURIComponent(svgString)}`
    })
  }

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
