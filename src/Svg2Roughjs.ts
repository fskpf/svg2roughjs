import { Options } from 'roughjs/bin/core'
import rough from 'roughjs/bin/rough'
import { OutputType } from './OutputType'
import { processRoot } from './processor'
import { createPencilFilter } from './styles/textures'
import { RenderContext } from './types'
import { getDefsElement } from './utils'
import { RandomNumberGenerator } from './RandomNumberGenerator'

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
   * The randomness may be seeded with the `seed` property.
   * By default `true`.
   */
  randomize: boolean = true

  /**
   * Optional seed for the randomness when creating the sketch.
   * Providing a value implicitly seeds Rough.js which may be overwritten
   * by provding a different seed with the optional `roughConfig` property.
   * By default `null`.
   */
  seed: number | null = null

  /**
   * Whether pattern elements should be sketched or just copied to the output.
   * For smaller pattern base sizes, it's often beneficial to just copy it over
   * as the sketch will be too smalle to actually look sketched at all.
   */
  sketchPatterns: boolean = true

  /**
   * Whether to apply a pencil filter.
   */
  pencilFilter: boolean = false

  private $svg?: SVGSVGElement
  private width: number = 0
  private height: number = 0
  private $outputType: OutputType
  private $roughConfig: Options = {}
  private idElements: Record<string, SVGElement | string> = {}

  private outputElement: Element
  private lastResult: SVGSVGElement | HTMLCanvasElement | null = null

  /**
   * Set the SVG that should be sketched.
   */
  set svg(svg: SVGSVGElement) {
    if (this.$svg !== svg) {
      this.$svg = svg
      this.sourceSvgChanged()
    }
  }

  /**
   * Returns the SVG that should be sketched.
   */
  get svg(): SVGSVGElement | undefined {
    return this.$svg
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

  /**
   * Returns the currently configured output type.
   */
  get outputType(): OutputType {
    return this.$outputType
  }

  /**
   * Sets the config object that is passed to Rough.js and considered
   * during rendering of the `SVGElement`s.
   *
   * Sets `fixedDecimalPlaceDigits` to `3` if not specified otherwise.
   */
  set roughConfig(config: Options) {
    if (typeof config.fixedDecimalPlaceDigits === 'undefined') {
      config.fixedDecimalPlaceDigits = 3
    }
    this.$roughConfig = config
  }

  /**
   * Returns the currently configured rendering configuration.
   */
  get roughConfig(): Options {
    return this.$roughConfig
  }

  /**
   * Creates a new instance of Svg2roughjs.
   * @param target Either a container `HTMLDivElement` (or a selector for the container) to which a sketch should be added
   * or an `HTMLCanvasElement` or `SVGSVGElement` that should be used as output target.
   * @param outputType Whether the output should be an SVG or drawn to an HTML canvas.
   * Defaults to SVG or CANVAS depending if the given target is of type `HTMLCanvasElement` or `SVGSVGElement`,
   * otherwise it defaults to SVG.
   * @param roughConfig Config object that is passed to Rough.js and considered during
   * rendering of the `SVGElement`s.
   */
  constructor(
    target: string | HTMLDivElement | HTMLCanvasElement | SVGSVGElement,
    outputType: OutputType = OutputType.SVG,
    roughConfig: Options = {}
  ) {
    if (!target) {
      throw new Error('No target provided')
    }

    const targetElement = typeof target === 'string' ? document.querySelector(target) : target
    if (!targetElement) {
      throw new Error('Could not find target in document')
    }

    this.roughConfig = roughConfig

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
   * @param sourceSvgChanged When `true`, the given {@link svg} is re-evaluated as if it was set anew.
   *  This allows the Svg2Rough.js instance to be used mutliple times with the same source SVG container but different contents.
   * @returns A promise that resolves with the sketched output element or null if no {@link svg} is set.
   */
  sketch(sourceSvgChanged = false): Promise<SVGSVGElement | HTMLCanvasElement | null> {
    if (!this.svg) {
      return Promise.resolve(null)
    }

    if (sourceSvgChanged) {
      this.sourceSvgChanged()
    }

    const sketchContainer = this.prepareRenderContainer()
    const renderContext = this.createRenderContext(sketchContainer)

    // prepare filter effects
    if (this.pencilFilter) {
      const defs = getDefsElement(renderContext)
      defs.appendChild(createPencilFilter())
    }

    // sketchify the SVG
    renderContext.processElement(renderContext, this.svg, null, this.width, this.height)

    if (this.outputElement instanceof SVGSVGElement) {
      // sketch already in the outputElement
      return Promise.resolve(this.outputElement)
    } else if (this.outputElement instanceof HTMLCanvasElement) {
      return this.drawToCanvas(renderContext, this.outputElement)
    }

    // remove the previous attached result
    this.lastResult?.parentNode?.removeChild(this.lastResult)
    // assume that the given output element is a container, thus append the sketch to it
    if (this.outputType === OutputType.SVG) {
      const svgSketch = renderContext.svgSketch
      this.outputElement.appendChild(svgSketch)
      this.lastResult = svgSketch
      return Promise.resolve(svgSketch)
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
    let roughConfig = this.roughConfig
    if (this.seed !== null) {
      roughConfig = { seed: this.seed, ...roughConfig }
    }
    return {
      rc: rough.svg(sketchContainer, { options: roughConfig }),
      roughConfig: this.roughConfig,
      fontFamily: this.fontFamily,
      pencilFilter: this.pencilFilter,
      randomize: this.randomize,
      rng: new RandomNumberGenerator(this.seed),
      sketchPatterns: this.sketchPatterns,
      idElements: this.idElements,
      sourceSvg: this.svg,
      svgSketch: sketchContainer,
      svgSketchIsInDOM: document.body.contains(sketchContainer),
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
    svgElement.setAttributeNS(
      'http://www.w3.org/2000/xmlns/',
      'xmlns:xlink',
      'http://www.w3.org/1999/xlink'
    )

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

    // use round linecap to emphasize a ballpoint pen like drawing
    svgElement.setAttribute('stroke-linecap', 'round')

    return svgElement
  }

  /**
   * Initializes the size based on the currently set SVG and collects elements
   * with an ID property that may be referenced in the SVG.
   */
  private sourceSvgChanged() {
    const svg = this.$svg
    if (svg) {
      const precision = this.roughConfig.fixedDecimalPlaceDigits
      this.width = parseFloat(this.coerceSize(svg, 'width', 300).toFixed(precision))
      this.height = parseFloat(this.coerceSize(svg, 'height', 150).toFixed(precision))

      // pre-process defs for subsequent references
      this.collectElementsWithID()
    }
  }

  /**
   * Stores elements with IDs for later use.
   */
  private collectElementsWithID() {
    this.idElements = {}
    const elementsWithID: SVGElement[] = Array.prototype.slice.apply(
      this.svg!.querySelectorAll('*[id]')
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
