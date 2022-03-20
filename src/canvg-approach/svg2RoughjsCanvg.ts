import Canvg from 'canvg'
import { Options } from 'roughjs/bin/core'
import rough from 'roughjs/bin/rough'
import { RoughSVG } from 'roughjs/bin/svg'
import { Renderer } from './renderer'

export class Svg2RoughjsCanvg {
  private container: SVGSVGElement
  private rc: RoughSVG
  private $svg: SVGSVGElement | null = null
  private width: number = 0
  private height: number = 0
  $roughConfig: any

  /**
   * The SVG that should be converted.
   * Changing this property triggers drawing of the SVG into
   * the canvas or container element with which Svg2Roughjs
   * was initialized.
   */
  set svg(input: SVGSVGElement | null) {
    if (input === null) {
      this.$svg = null
      this.width = 0
      this.height = 0
      return
    }

    if (this.$svg !== input) {
      this.$svg = input

      if (input.hasAttribute('width')) {
        this.width = input.width.baseVal.value
      } else if (input.hasAttribute('viewBox')) {
        this.width = input.viewBox.baseVal.width
      } else {
        this.width = 300
      }

      if (input.hasAttribute('height')) {
        this.height = input.height.baseVal.value
      } else if (input.hasAttribute('viewBox')) {
        this.height = input.viewBox.baseVal.height
      } else {
        this.height = 150
      }

      const svg = this.container
      svg.setAttribute('width', this.width.toString())
      svg.setAttribute('height', this.height.toString())

      this.redraw()
    }
  }

  get svg(): SVGSVGElement | null {
    return this.$svg
  }

  /**
   * Rough.js config object that is provided to Rough.js for drawing
   * any SVG element.
   * Changing this property triggers a repaint.
   */
  set roughConfig(config: Options) {
    this.$roughConfig = config
    this.rc = rough.svg(this.container, { options: this.roughConfig })
    this.redraw()
  }

  /**
   * Creates a new instance of Svg2roughjs.
   * @param container Either a selector for the container to which a canvas should be added
   * or an `HTMLCanvasElement` or `SVGSVGElement` that should be used as output target.
   */
  constructor(container: string | SVGSVGElement) {
    if (!container) {
      throw new Error('No target provided')
    }
    if (container instanceof SVGSVGElement) {
      if (container.tagName === 'svg') {
        this.container = container
      } else {
        throw new Error('Target object is not SVGSVGElement')
      }
    } else {
      // create a new HTMLCanvasElement or SVGSVGElement as child of the given element
      const parent = document.querySelector(container)
      if (!parent) {
        throw new Error(`No element found with ${container}`)
      }

      this.container = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      this.container.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      this.container.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      parent.appendChild(this.container)
    }

    // this.$roughConfig = roughjsOptions

    // the Rough.js instance to draw the SVG elements
    this.rc = rough.svg(this.container /* , { options: this.roughConfig } */)

    // default font family
    // this.$fontFamily = 'Comic Sans MS, cursive'

    // we randomize the visualization per element by default
    // this.$randomize = true
  }

  async redraw(): Promise<void> {
    const renderer = new Renderer(this.rc, this.container) as any
    const v = await Canvg.from(renderer, new XMLSerializer().serializeToString(this.$svg as Node))
    return v.render()
  }
}
