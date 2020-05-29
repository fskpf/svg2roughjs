import tinycolor from 'tinycolor2'
import { SVGPathData, encodeSVGPath, SVGPathDataTransformer } from 'svg-pathdata'
import rough from 'roughjs/bundled/rough.esm'

var units = require('units-css')

/**
 * A small helper class that represents a point.
 */
class Point {
  /**
   * @return {number}
   */
  get x() {
    return this.$x
  }
  /**
   * @return {number}
   */
  get y() {
    return this.$y
  }
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    this.$x = x || 0
    this.$y = y || 0
  }

  toString() {
    return `${this.x},${this.y}`
  }
}

/**
 * Svg2Roughjs parses a given SVG and draws it with Rough.js
 * in a canvas.
 */
export default class Svg2Roughjs {
  /**
   * A simple regexp which is used to test whether a given string value
   * contains unit identifiers, e.g. "1px", "1em", "1%", ...
   * @private
   * @returns {RegExp}
   */
  static CONTAINS_UNIT_REGEXP() {
    return /[a-z%]/
  }

  /**
   * The SVG that should be converted.
   * Changing this property triggers drawing of the SVG into
   * the canvas or container element with which Svg2Roughjs
   * was initialized.
   * @param {SVGSVGElement} svg
   */
  set svg(svg) {
    if (this.$svg !== svg) {
      /** @type {SVGSVGElement} */
      this.$svg = svg

      if (svg.hasAttribute('width')) {
        this.width = svg.width.baseVal.value
      } else if (svg.hasAttribute('viewBox')) {
        this.width = svg.viewBox.baseVal.width
      } else {
        this.width = 300
      }

      if (svg.hasAttribute('height')) {
        this.height = svg.height.baseVal.value
      } else if (svg.hasAttribute('viewBox')) {
        this.height = svg.viewBox.baseVal.height
      } else {
        this.height = 150
      }

      this.canvas.width = this.width
      this.canvas.height = this.height

      // pre-process defs for subsequent references
      this.collectElementsWithID()

      this.redraw()
    }
  }
  /**
   * @return {SVGSVGElement}
   */
  get svg() {
    return this.$svg
  }

  /**
   * Rough.js config object that is provided to Rough.js for drawing
   * any SVG element.
   * Changing this property triggers a repaint.
   * @param {object}
   */
  set roughConfig(config) {
    this.$roughConfig = config
    this.rc = rough.canvas(this.canvas, config)
    this.redraw()
  }

  /**
   * @return {object}
   */
  get roughConfig() {
    return this.$roughConfig
  }

  /**
   * Set a font-family for the rendering of text elements.
   * If set to `null`, then the font-family of the SVGTextElement is used.
   * By default, 'Comic Sans MS, sans-serif' is used.
   * Changing this property triggers a repaint.
   * @param {string | null}
   */
  set fontFamily(fontFamily) {
    if (this.$fontFamily !== fontFamily) {
      this.$fontFamily = fontFamily
      this.redraw()
    }
  }

  /**
   * @returns {string}
   */
  get fontFamily() {
    return this.$fontFamily
  }

  /**
   * Whether to randomize Rough.js' fillWeight, hachureAngle and hachureGap.
   * Also randomizes the disableMultiStroke option of Rough.js.
   * By default true.
   * Changing this property triggers a repaint.
   * @param {boolean}
   */
  set randomize(randomize) {
    this.$randomize = randomize
    this.redraw()
  }

  /**
   * @returns {boolean}
   */
  get randomize() {
    return this.$randomize
  }

  /**
   * Optional solid background color with which
   * the canvas should be initialized.
   * It is drawn on a transparent canvas by default.
   * @param {string}
   */
  set backgroundColor(color) {
    this.$backgroundColor = color
  }

  /**
   * @returns {string}
   */
  get backgroundColor() {
    return this.$backgroundColor
  }

  /**
   * Creates a new instance of Svg2roughjs.
   * @param {string | HTMLCanvasElement} target Either a selector for the container to which a canvas should be added
   * or an `HTMLCanvasElement` into which should be drawn.
   * @param {object?} roughConfig Config object this passed to the Rough.js ctor and
   * also used while parsing the styles for `SVGElement`s.
   */
  constructor(target, roughConfig = {}) {
    if (!target) {
      throw new Error('No target provided')
    }
    if (typeof target === 'object' && target.tagName === 'CANVAS') {
      if (target.tagName === 'CANVAS') {
        // directly use the given canvas
        this.canvas = target
      } else {
        throw new Error('Target object is not an HMTLCanvaseElement')
      }
    } else if (typeof target === 'string') {
      // create a new HTMLCanvasElement as child of the given element
      const container = document.querySelector(target)
      if (!container) {
        throw new Error(`No element found with ${target}`)
      }
      this.canvas = document.createElement('canvas')
      this.canvas.width = container.clientWidth
      this.canvas.height = container.clientHeight
      container.appendChild(this.canvas)
    }

    // the Rough.js instance to draw the SVG elements
    this.rc = rough.canvas(this.canvas, roughConfig)
    this.$roughConfig = roughConfig

    // canvas context for convenient access
    this.ctx = this.canvas.getContext('2d')

    // size of the canvas
    this.width = this.canvas.width
    this.height = this.canvas.height

    // default font family
    this.$fontFamily = 'Comic Sans MS, cursive'

    // we randomize the visualization per element by default
    this.$randomize = true
  }

  /**
   * Clears the canvas.
   * @private
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  /**
   * Triggers an entire redraw of the SVG which also
   * processes it anew.
   */
  redraw() {
    if (!this.svg) {
      return
    }
    this.clearCanvas()
    if (this.backgroundColor) {
      this.ctx.fillStyle = this.backgroundColor
      this.ctx.fillRect(0, 0, this.width, this.height)
    }
    this.processRoot(this.svg, null, this.width, this.height)
  }

  /**
   * Traverses the SVG in DFS and draws each element to the canvas.
   * @private
   * @param {SVGSVGElement | SVGGElement} root either an SVG- or g-element
   * @param {SVGTransform?} svgTransform
   * @param {number?} width Use elements can overwrite width
   * @param {number?} height Use elements can overwrite height
   */
  processRoot(root, svgTransform, width, height) {
    // traverse svg in DFS
    const stack = []

    if (root.tagName === 'svg') {
      if (
        typeof width !== 'undefined' &&
        typeof height !== 'undefined' &&
        root.getAttribute('viewBox')
      ) {
        const {
          x: viewBoxX,
          y: viewBoxY,
          width: viewBoxWidth,
          height: viewBoxHeight
        } = root.viewBox.baseVal

        const svgX = root.x.baseVal.value
        const svgY = root.y.baseVal.value

        const viewBoxMatrix = this.svg
          .createSVGMatrix()
          .translate(-viewBoxX * (width / viewBoxWidth), -viewBoxY * (height / viewBoxHeight))
          .translate(svgX, svgY)
          .scaleNonUniform(width / viewBoxWidth, height / viewBoxHeight)
        const combinedMatrix = svgTransform
          ? svgTransform.matrix.multiply(viewBoxMatrix)
          : viewBoxMatrix
        svgTransform = this.svg.createSVGTransformFromMatrix(combinedMatrix)
      }

      // don't put the SVG itself into the stack, so start with the children of it
      const children = this.getNodeChildren(root)
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i]
        let newTransform = svgTransform
        if (child.transform && child.transform.baseVal.numberOfItems > 0) {
          const childTransformMatrix = child.transform.baseVal.consolidate().matrix
          const combinedMatrix = newTransform
            ? newTransform.matrix.multiply(childTransformMatrix)
            : childTransformMatrix
          newTransform = this.svg.createSVGTransformFromMatrix(combinedMatrix)
        }
        stack.push({ element: child, transform: newTransform })
      }
    } else {
      stack.push({ element: root, transform: svgTransform })
    }

    while (stack.length > 0) {
      const { element, transform } = stack.pop()

      // maybe draw the element
      this.drawElement(element, transform)

      if (
        element.tagName === 'defs' ||
        element.tagName === 'svg' ||
        element.tagName === 'clipPath'
      ) {
        // Defs are prepocessed separately.
        // Don't traverse the SVG element itself. This is done by drawElement -> drawSvg.
        // clipPaths are not supported.
        continue
      }
      // process childs
      const children = this.getNodeChildren(element)
      for (let i = children.length - 1; i >= 0; i--) {
        const childElement = children[i]
        let newTransform = transform
        if (childElement.transform && childElement.transform.baseVal.numberOfItems > 0) {
          const childTransformMatrix = childElement.transform.baseVal.consolidate().matrix
          const combinedMatrix = transform
            ? transform.matrix.multiply(childTransformMatrix)
            : childTransformMatrix
          newTransform = this.svg.createSVGTransformFromMatrix(combinedMatrix)
        }
        stack.push({ element: childElement, transform: newTransform })
      }
    }
  }

  /**
   * Stores defs elements with their IDs for later use.
   * @private
   */
  collectElementsWithID() {
    this.defs = {}
    const elementsWithID = Array.prototype.slice.apply(this.svg.querySelectorAll('*[id]'))
    for (const elt of elementsWithID) {
      const id = elt.getAttribute('id')
      if (id) {
        this.defs[id] = elt
      }
    }
  }

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
  applyMatrix(point, svgTransform) {
    if (!svgTransform) {
      return point
    }
    const matrix = svgTransform.matrix
    const x = matrix.a * point.x + matrix.c * point.y + matrix.e
    const y = matrix.b * point.x + matrix.d * point.y + matrix.f
    return new Point(x, y)
  }

  /**
   * Returns a random number in the given rande.
   * @private
   * @param {number} min
   * @param {number} max
   * @return {number}
   */
  getRandomNumber(min, max) {
    return Math.random() * (max - min) + min
  }

  /**
   * Returns the `offset` of an `SVGStopElement`.
   * @private
   * @param {SVGStopElement} stop
   * @return {number} stop percentage
   */
  getStopOffset(stop) {
    const offset = stop.getAttribute('offset')
    if (!offset) {
      return 0
    }
    if (offset.indexOf('%')) {
      return parseFloat(offset.substring(0, offset.length - 1))
    } else {
      return parseFloat(offset) * 100
    }
  }

  /**
   * Returns the `stop-color`of an `SVGStopElement`.
   * @private
   * @param {SVGStopElement} stop
   * @return {tinycolor}
   */
  getStopColor(stop) {
    let stopColorStr = stop.getAttribute('stop-color')
    if (!stopColorStr) {
      const style = stop.getAttribute('style')
      const match = /stop-color:\s?(.*);?/.exec(style)
      if (match.length > 1) {
        stopColorStr = match[1]
      }
    }
    return stopColorStr ? tinycolor(stopColorStr) : tinycolor('white')
  }

  /**
   * Converts an SVG gradient to a color by mixing all stop colors
   * with `tinycolor.mix`.
   * @private
   * @param {SVGLinearGradientElement | SVGRadialGradientElement} gradient
   * @param {number} opacity
   * @return {string}
   */
  gradientToColor(gradient, opacity) {
    const stops = Array.prototype.slice.apply(gradient.querySelectorAll('stop'))
    if (stops.length === 0) {
      return 'transparent'
    } else if (stops.length === 1) {
      const color = this.getStopColor(stop)
      color.setAlpha(opacity)
      return color.toString()
    } else {
      // combine the gradient
      const mixedColor = stops.reduce((acc, stop) => {
        const color = this.getStopColor(stop)
        const offset = this.getStopOffset(stop)
        return tinycolor.mix(acc, color, offset)
      })
      mixedColor.setAlpha(opacity)
      return mixedColor.toString()
    }
  }

  /**
   * Parses a `fill` url by looking in the SVG `defs` element.
   * When a gradient is found, it is converted to a color and stored
   * in the internal defs store for this url.
   * @private
   * @param {string} url
   * @param {number} opacity
   * @return {string}
   */
  parseFillUrl(url, opacity) {
    const result =
      /url\('#?(.*?)'\)/.exec(url) || /url\("#?(.*?)"\)/.exec(url) || /url\(#?(.*?)\)/.exec(url)
    if (result && result.length > 1) {
      const id = result[1]
      const fill = this.defs[id]
      if (fill) {
        if (typeof fill === 'string') {
          // maybe it was already parsed and replaced with a color
          return fill
        } else {
          if (fill.tagName === 'linearGradient' || fill.tagName === 'radialGradient') {
            const color = this.gradientToColor(fill, opacity)
            this.defs[id] = color
            return color
          }
        }
      }
    }
    return 'transparent'
  }

  /**
   * Converts SVG opacity attributes to a [0, 1] range.
   * @private
   * @param {SVGElement} element
   * @param {string} attribute
   */
  getOpacity(element, attribute) {
    const attr = element.getAttribute(attribute)
    if (attr) {
      if (attr.indexOf('%') !== -1) {
        return parseFloat(attr.substring(0, attr.length - 1)) / 100
      }
      return parseFloat(attr)
    }
    return 1
  }

  /**
   * Traverses the given elements hierarchy bottom-up to determine its effective
   * opacity attribute.
   * @private
   * @param {SVGElement} element
   * @param {number} currentOpacity
   */
  getEffectiveElementOpacity(element, currentOpacity) {
    const attr = element.getAttribute('opacity')
    if (attr) {
      let elementOpacity = 1
      if (attr.indexOf('%') !== -1) {
        elementOpacity = parseFloat(attr.substring(0, attr.length - 1)) / 100
      } else {
        elementOpacity = parseFloat(attr)
      }
      // combine opacities
      currentOpacity *= elementOpacity
    }
    // traverse upwards to combine parent opacities as well
    const parent = element.parentElement
    return parent ? this.getEffectiveElementOpacity(parent, currentOpacity) : currentOpacity
  }

  /**
   * Returns the attribute value of an element under consideration
   * of inherited attributes from the `parentElement`.
   * @private
   * @param {SVGElement} element
   * @param {string} attributeName Name of the attribute to look up
   * @return {string|null} attribute value if it exists
   */
  getEffectiveAttribute(element, attributeName) {
    // getComputedStyle doesn't work for, e.g. <svg fill='rgba(...)'>
    const attr = getComputedStyle(element)[attributeName] || element.getAttribute(attributeName)
    if (!attr) {
      const parent = element.parentElement
      return parent ? this.getEffectiveAttribute(parent, attributeName) : null
    }
    return attr
  }

  /**
   * Converts the given string to px unit. May be either a <length>
   * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Length)
   * or a <percentage>
   * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Percentage).
   * @private
   * @param {string} value
   * @returns {number} THe value in px unit
   */
  convertToPixelUnit(value) {
    // css-units fails for converting from unit-less to 'px' in IE11,
    // thus we only apply it to non-px values
    if (value.match(Svg2Roughjs.CONTAINS_UNIT_REGEXP) !== null) {
      return units.convert('px', value, this.$svg)
    }
    return parseFloat(value)
  }

  /**
   * Converts the effective style attributes of the given `SVGElement`
   * to a Rough.js config object that is used to draw the element with
   * Rough.js.
   * @private
   * @param {SVGElement} element
   * @param {SVGTransform?} svgTransform
   * @return {object} config for Rough.js drawing
   */
  parseStyleConfig(element, svgTransform) {
    const config = Object.assign({}, this.$roughConfig)

    // incorporate the elements base opacity
    const elementOpacity = this.getEffectiveElementOpacity(element, 1)

    const fill = this.getEffectiveAttribute(element, 'fill') || 'black'
    const fillOpacity = elementOpacity * this.getOpacity(element, 'fill-opacity')
    if (fill) {
      if (fill.indexOf('url') !== -1) {
        config.fill = this.parseFillUrl(fill, fillOpacity)
      } else if (fill === 'none') {
        delete config.fill
      } else {
        const color = tinycolor(fill)
        color.setAlpha(fillOpacity)
        config.fill = color.toString()
      }
    }

    const stroke = this.getEffectiveAttribute(element, 'stroke')
    const strokeOpacity = elementOpacity * this.getOpacity(element, 'stroke-opacity')
    if (stroke) {
      if (stroke.indexOf('url') !== -1) {
        config.stroke = this.parseFillUrl(fill, strokeOpacity)
      } else if (stroke === 'none') {
        config.stroke = 'none'
      } else {
        const color = tinycolor(stroke)
        color.setAlpha(strokeOpacity)
        config.stroke = color.toString()
      }
    } else {
      config.stroke = 'none'
    }

    let strokeWidth = this.getEffectiveAttribute(element, 'stroke-width')
    if (strokeWidth) {
      // Convert to user space units (px)
      strokeWidth = this.convertToPixelUnit(strokeWidth)
      // If we have a transform and an explicit stroke, include the scaling factor
      if (svgTransform && stroke !== 'none') {
        // For lack of a better option here, just use the mean of x and y scaling factors
        const factor = (svgTransform.matrix.a + svgTransform.matrix.d) / 2
        strokeWidth *= factor
      }
      config.strokeWidth = strokeWidth
    } else {
      config.strokeWidth = 0
    }

    let strokeDashArray = this.getEffectiveAttribute(element, 'stroke-dasharray')
    if (strokeDashArray && strokeDashArray !== 'none') {
      strokeDashArray = strokeDashArray
        .split(/[\s,]+/)
        .filter(entry => entry.length > 0)
        .map(dash => this.convertToPixelUnit(dash))
      config.strokeLineDash = strokeDashArray
    }

    let strokeDashOffset = this.getEffectiveAttribute(element, 'stroke-dashoffset')
    if (strokeDashOffset) {
      strokeDashOffset = this.convertToPixelUnit(strokeDashOffset)
      config.strokeLineDashOffset = strokeDashOffset
    }

    // unstroked but filled shapes look weird, so always apply a stroke if we fill something
    if (config.fill && config.stroke === 'none') {
      config.stroke = config.fill
      config.strokeWidth = 1
    }

    if (this.randomize) {
      // Rough.js default is 0.5 * strokeWidth
      config.fillWeight = this.getRandomNumber(0.5, 3)
      // Rough.js default is -41deg
      config.hachureAngle = this.getRandomNumber(-30, -50)
      // Rough.js default is 4 * strokeWidth
      config.hachureGap = this.getRandomNumber(3, 5)
      // randomize double stroke effect if not explicitly set through user config
      if (typeof config.disableMultiStroke === 'undefined') {
        config.disableMultiStroke = Math.random() > 0.3
      }
    }

    return config
  }

  /**
   * The main switch to delegate drawing of `SVGElement`s
   * to different subroutines.
   * @private
   * @param {SVGElement} element
   * @param {SVGTransform} svgTransform
   */
  drawElement(element, svgTransform) {
    switch (element.tagName) {
      case 'svg':
        // nested svg
        let width, height
        if (element.getAttribute('width') && element.getAttribute('height')) {
          width = element.width.baseVal.value
          height = element.height.baseVal.value
        }
        this.processRoot(element, svgTransform, width, height)
        break
      case 'rect':
        this.drawRect(element, svgTransform)
        break
      case 'path':
        this.drawPath(element, svgTransform)
        break
      case 'use':
        this.drawUse(element, svgTransform)
        break
      case 'line':
        this.drawLine(element, svgTransform)
        break
      case 'circle':
        this.drawCircle(element, svgTransform)
        break
      case 'ellipse':
        this.drawEllipse(element, svgTransform)
        break
      case 'polyline':
        this.drawPolyline(element, svgTransform)
        break
      case 'polygon':
        this.drawPolygon(element, svgTransform)
        break
      case 'text':
        this.drawText(element, svgTransform)
        break
      case 'image':
        this.drawImage(element, svgTransform)
        break
    }
  }

  /**
   * @private
   * @param {SVGPolylineElement} polyline
   * @param {SVGTransform?} svgTransform
   */
  drawPolyline(polyline, svgTransform) {
    const points = this.getPointsArray(polyline)
    const transformed = points.map(p => {
      const pt = this.applyMatrix(p, svgTransform)
      return [pt.x, pt.y]
    })
    const style = this.parseStyleConfig(polyline, svgTransform)
    if (style.fill && style.fill !== 'none') {
      const fillStyle = Object.assign({}, style)
      fillStyle.stroke = 'none'
      this.rc.polygon(transformed, fillStyle)
    }
    this.rc.linearPath(transformed, style)
  }

  /**
   * @private
   * @param {SVGPolygonElement | SVGPolylineElement} element
   * @returns {Array<Point>}
   */
  getPointsArray(element) {
    const pointsAttr = element.getAttribute('points')
    if (!pointsAttr) {
      return []
    }
    const pointList = pointsAttr.split(/\s+/g)
    const points = []
    for (let i = 0; i < pointList.length; i++) {
      const currentEntry = pointList[i]
      const coordinates = currentEntry.split(',')
      if (coordinates.length === 2) {
        points.push(new Point(parseFloat(coordinates[0]), parseFloat(coordinates[1])))
      } else {
        // space as separators, take next entry as y coordinate
        const next = i + 1
        if (next < pointList.length) {
          points.push(new Point(parseFloat(currentEntry), parseFloat(pointList[next])))
          // skip the next entry
          i = next
        }
      }
    }
    return points
  }

  /**
   * @private
   * @param {SVGPolygonElement} polygon
   * @param {SVGTransform?} svgTransform
   */
  drawPolygon(polygon, svgTransform) {
    const points = this.getPointsArray(polygon)
    const transformed = points.map(p => {
      const pt = this.applyMatrix(p, svgTransform)
      return [pt.x, pt.y]
    })
    this.rc.polygon(transformed, this.parseStyleConfig(polygon, svgTransform))
  }

  /**
   * @private
   * @param {SVGEllipseElement} ellipse
   * @param {SVGTransform?} svgTransform
   */
  drawEllipse(ellipse, svgTransform) {
    const cx = ellipse.cx.baseVal.value
    const cy = ellipse.cy.baseVal.value
    const rx = ellipse.rx.baseVal.value
    const ry = ellipse.ry.baseVal.value

    if (rx === 0 || ry === 0) {
      // zero-radius ellipse is not rendered
      return
    }

    if (svgTransform === null) {
      // Simple case, there's no transform and we can use the ellipse command
      const center = this.applyMatrix(new Point(cx, cy), svgTransform)
      // transform a point on the ellipse to get the transformed radius
      const radiusPoint = this.applyMatrix(new Point(cx + rx, cy + ry), svgTransform)
      const transformedWidth = 2 * (radiusPoint.x - center.x)
      const transformedHeight = 2 * (radiusPoint.y - center.y)
      this.rc.ellipse(
        center.x,
        center.y,
        transformedWidth,
        transformedHeight,
        this.parseStyleConfig(ellipse, svgTransform)
      )
    } else {
      // in other cases we need to construct the path manually.
      const factor = (4 / 3) * (Math.sqrt(2) - 1)
      const p1 = this.applyMatrix(new Point(cx + rx, cy), svgTransform)
      const p2 = this.applyMatrix(new Point(cx, cy + ry), svgTransform)
      const p3 = this.applyMatrix(new Point(cx - rx, cy), svgTransform)
      const p4 = this.applyMatrix(new Point(cx, cy - ry), svgTransform)
      const c1 = this.applyMatrix(new Point(cx + rx, cy + factor * ry), svgTransform)
      const c2 = this.applyMatrix(new Point(cx + factor * rx, cy + ry), svgTransform)
      const c4 = this.applyMatrix(new Point(cx - rx, cy + factor * ry), svgTransform)
      const c6 = this.applyMatrix(new Point(cx - factor * rx, cy - ry), svgTransform)
      const c8 = this.applyMatrix(new Point(cx + rx, cy - factor * ry), svgTransform)
      const path = `M ${p1} C ${c1} ${c2} ${p2} S ${c4} ${p3} S ${c6} ${p4} S ${c8} ${p1}z`
      this.rc.path(path, this.parseStyleConfig(ellipse, svgTransform))
    }
  }

  /**
   * @private
   * @param {SVGCircleElement} circle
   * @param {SVGTransform?} svgTransform
   */
  drawCircle(circle, svgTransform) {
    const cx = circle.cx.baseVal.value
    const cy = circle.cy.baseVal.value
    const r = circle.r.baseVal.value

    if (r === 0) {
      // zero-radius circle is not rendered
      return
    }

    const center = this.applyMatrix(new Point(cx, cy), svgTransform)

    if (svgTransform === null) {
      // transform a point on the ellipse to get the transformed radius
      const radiusPoint = this.applyMatrix(new Point(cx + r, cy + r), svgTransform)
      const transformedWidth = 2 * (radiusPoint.x - center.x)
      this.rc.circle(
        center.x,
        center.y,
        transformedWidth,
        this.parseStyleConfig(circle, svgTransform)
      )
    } else {
      // in other cases we need to construct the path manually.
      const factor = (4 / 3) * (Math.sqrt(2) - 1)
      const p1 = this.applyMatrix(new Point(cx + r, cy), svgTransform)
      const p2 = this.applyMatrix(new Point(cx, cy + r), svgTransform)
      const p3 = this.applyMatrix(new Point(cx - r, cy), svgTransform)
      const p4 = this.applyMatrix(new Point(cx, cy - r), svgTransform)
      const c1 = this.applyMatrix(new Point(cx + r, cy + factor * r), svgTransform)
      const c2 = this.applyMatrix(new Point(cx + factor * r, cy + r), svgTransform)
      const c4 = this.applyMatrix(new Point(cx - r, cy + factor * r), svgTransform)
      const c6 = this.applyMatrix(new Point(cx - factor * r, cy - r), svgTransform)
      const c8 = this.applyMatrix(new Point(cx + r, cy - factor * r), svgTransform)
      const path = `M ${p1} C ${c1} ${c2} ${p2} S ${c4} ${p3} S ${c6} ${p4} S ${c8} ${p1}z`
      this.rc.path(path, this.parseStyleConfig(circle, svgTransform))
    }
  }

  /**
   * @private
   * @param {SVGLineElement} line
   * @param {SVGTransform?} svgTransform
   */
  drawLine(line, svgTransform) {
    const p1 = this.applyMatrix(
      new Point(line.x1.baseVal.value, line.y1.baseVal.value),
      svgTransform
    )
    const p2 = this.applyMatrix(
      new Point(line.x2.baseVal.value, line.y2.baseVal.value),
      svgTransform
    )

    if (p1.x === p2.x && p1.y === p2.y) {
      // zero-length line is not rendered
      return
    }

    this.rc.line(p1.x, p1.y, p2.x, p2.y, this.parseStyleConfig(line, svgTransform))
  }

  /**
   * @private
   * @param {SVGUseElement} use
   * @param {SVGTransform?} svgTransform
   */
  drawUse(use, svgTransform) {
    let href = use.href.baseVal
    if (href.startsWith('#')) {
      href = href.substring(1)
    }
    const defElement = this.defs[href]
    if (defElement) {
      let useWidth, useHeight
      if (use.getAttribute('width') && use.getAttribute('height')) {
        // Use elements can overwrite the width which is important if it is a nested SVG
        useWidth = use.width.baseVal.value
        useHeight = use.height.baseVal.value
      }
      // We need to account for x and y attributes as well. Those change where the element is drawn.
      // We can simply change the transform to include that.
      const x = use.x.baseVal.value
      const y = use.y.baseVal.value
      let matrix = this.svg.createSVGMatrix().translate(x, y)
      matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix
      this.processRoot(
        defElement,
        this.svg.createSVGTransformFromMatrix(matrix),
        useWidth,
        useHeight
      )
    }
  }

  /**
   * @private
   * @param {SVGPathElement} path
   * @param {SVGTransform?} svgTransform
   */
  drawPath(path, svgTransform) {
    const dataAttrs = path.getAttribute('d')
    let pathData =
      // Parse path data and convert to absolute coordinates
      new SVGPathData(dataAttrs)
        .toAbs()
        // Normalize H and V to L commands - those cannot work with how we draw transformed paths otherwise
        .transform(SVGPathDataTransformer.NORMALIZE_HVZ())
        // Normalize S and T to Q and C commands - Rough.js has a bug with T where it expects 4 parameters instead of 2
        .transform(SVGPathDataTransformer.NORMALIZE_ST())
        // Convert elliptical arcs to cubic béziers - those are easier to transform
        .transform(SVGPathDataTransformer.A_TO_C())
    // If there's a transform, transform the whole path accordingly
    if (svgTransform) {
      pathData = pathData.transform(
        SVGPathDataTransformer.MATRIX(
          svgTransform.matrix.a,
          svgTransform.matrix.b,
          svgTransform.matrix.c,
          svgTransform.matrix.d,
          svgTransform.matrix.e,
          svgTransform.matrix.f
        )
      )
    }
    const transformedPathData = encodeSVGPath(pathData.commands)
    if (transformedPathData.indexOf('undefined') !== -1) {
      // DEBUG STUFF
      console.error('broken path data')
      debugger
      return
    }
    this.rc.path(transformedPathData, this.parseStyleConfig(path, svgTransform))
  }

  /**
   * @private
   * @param {SVGRectElement} rect
   * @param {SVGTransform?} svgTransform
   */
  drawRect(rect, svgTransform) {
    const x = rect.x.baseVal.value
    const y = rect.y.baseVal.value
    const width = rect.width.baseVal.value
    const height = rect.height.baseVal.value

    if (width === 0 || height === 0) {
      // zero-width or zero-height rect will not be rendered
      return
    }

    let rx = rect.hasAttribute('rx') ? rect.rx.baseVal.value : null
    let ry = rect.hasAttribute('ry') ? rect.ry.baseVal.value : null
    if (!rx && !ry) {
      // Simple case; just a rectangle
      const p1 = this.applyMatrix(new Point(x, y), svgTransform)
      const p2 = this.applyMatrix(new Point(x + width, y + height), svgTransform)
      this.rc.rectangle(
        p1.x,
        p1.y,
        p2.x - p1.x,
        p2.y - p1.y,
        this.parseStyleConfig(rect, svgTransform)
      )
    } else {
      // Rounded rectangle
      // Negative values are an error and result in the default value
      if (rx < 0) {
        rx = 0
      }
      if (ry < 0) {
        ry = 0
      }
      // If only one of the two values is specified, the other has the same value
      if (rx === null) {
        rx = ry
      }
      if (ry === null) {
        ry = rx
      }
      // Clamp both values to half their sides' lengths
      rx = Math.min(rx, width / 2)
      ry = Math.min(ry, height / 2)

      let path = ''

      if (!rx && !ry) {
        // No rounding, so just construct the respective path as a simple polygon
        path += `M ${this.applyMatrix(new Point(x, y), svgTransform)}`
        path += `L ${this.applyMatrix(new Point(x + width, y), svgTransform)}`
        path += `L ${this.applyMatrix(new Point(x + width, y + height), svgTransform)}`
        path += `L ${this.applyMatrix(new Point(x, y + height), svgTransform)}`
        path += `z`
      } else {
        const factor = (4 / 3) * (Math.sqrt(2) - 1)

        // Construct path for the rounded rectangle
        // perform an absolute moveto operation to location (x+rx,y), where x is the value of the ‘rect’ element's ‘x’ attribute converted to user space, rx is the effective value of the ‘rx’ attribute converted to user space and y is the value of the ‘y’ attribute converted to user space
        const p1 = this.applyMatrix(new Point(x + rx, y), svgTransform)
        path += `M ${p1}`
        // perform an absolute horizontal lineto operation to location (x+width-rx,y), where width is the ‘rect’ element's ‘width’ attribute converted to user space
        const p2 = this.applyMatrix(new Point(x + width - rx, y), svgTransform)
        path += `L ${p2}`
        // perform an absolute elliptical arc operation to coordinate (x+width,y+ry), where the effective values for the ‘rx’ and ‘ry’ attributes on the ‘rect’ element converted to user space are used as the rx and ry attributes on the elliptical arc command, respectively, the x-axis-rotation is set to zero, the large-arc-flag is set to zero, and the sweep-flag is set to one
        const p3c1 = this.applyMatrix(new Point(x + width - rx + factor * rx, y), svgTransform)
        const p3c2 = this.applyMatrix(new Point(x + width, y + factor * ry), svgTransform)
        const p3 = this.applyMatrix(new Point(x + width, y + ry), svgTransform)
        path += `C ${p3c1} ${p3c2} ${p3}` // We cannot use the arc command, since we no longer draw in the expected coordinates. So approximate everything with lines and béziers
        // perform a absolute vertical lineto to location (x+width,y+height-ry), where height is the ‘rect’ element's ‘height’ attribute converted to user space
        const p4 = this.applyMatrix(new Point(x + width, y + height - ry), svgTransform)
        path += `L ${p4}`
        // perform an absolute elliptical arc operation to coordinate (x+width-rx,y+height)
        const p5c1 = this.applyMatrix(
          new Point(x + width, y + height - ry + factor * ry),
          svgTransform
        )
        const p5c2 = this.applyMatrix(new Point(x + width - factor * rx, y + height), svgTransform)
        const p5 = this.applyMatrix(new Point(x + width - rx, y + height), svgTransform)
        path += `C ${p5c1} ${p5c2} ${p5}`
        // perform an absolute horizontal lineto to location (x+rx,y+height)
        const p6 = this.applyMatrix(new Point(x + rx, y + height), svgTransform)
        path += `L ${p6}`
        // perform an absolute elliptical arc operation to coordinate (x,y+height-ry)
        const p7c1 = this.applyMatrix(new Point(x + rx - factor * rx, y + height), svgTransform)
        const p7c2 = this.applyMatrix(new Point(x, y + height - factor * ry), svgTransform)
        const p7 = this.applyMatrix(new Point(x, y + height - ry), svgTransform)
        path += `C ${p7c1} ${p7c2} ${p7}`
        // perform an absolute absolute vertical lineto to location (x,y+ry)
        const p8 = this.applyMatrix(new Point(x, y + ry), svgTransform)
        path += `L ${p8}`
        // perform an absolute elliptical arc operation to coordinate (x+rx,y)
        const p9c1 = this.applyMatrix(new Point(x, y + factor * ry), svgTransform)
        const p9c2 = this.applyMatrix(new Point(x + factor * rx, y), svgTransform)
        path += `C ${p9c1} ${p9c2} ${p1}`
        path += 'z'
      }

      // must use square line cap here so it looks like a rectangle. Default seems to be butt.
      this.ctx.save()
      this.ctx.lineCap = 'square'

      this.rc.path(path, this.parseStyleConfig(rect, svgTransform))

      this.ctx.restore()
    }
  }

  /**
   * @private
   * @param {SVGImageElement} svgImage
   * @param {SVGTransform?} svgTransform
   */
  drawImage(svgImage, svgTransform) {
    const href = svgImage.href.baseVal
    const x = svgImage.x.baseVal.value
    const y = svgImage.y.baseVal.value
    let width, height
    if (svgImage.getAttribute('width') && svgImage.getAttribute('height')) {
      width = svgImage.width.baseVal.value
      height = svgImage.height.baseVal.value
    }
    if (href.startsWith('data:') && href.indexOf('image/svg+xml') !== -1) {
      // data:[<media type>][;charset=<character set>][;base64],<data>
      const dataUrlRegex = /^data:([^,]*),(.*)/
      const match = dataUrlRegex.exec(href)
      if (match.length > 2) {
        const meta = match[1]
        let svgString = match[2]
        const isBase64 = meta.indexOf('base64') !== -1
        const isUtf8 = meta.indexOf('utf8') !== -1
        if (isBase64) {
          svgString = btoa(svgString)
        }
        if (!isUtf8) {
          svgString = decodeURIComponent(svgString)
        }
        const parser = new DOMParser()
        const doc = parser.parseFromString(svgString, 'image/svg+xml')
        const svg = doc.firstElementChild

        let matrix = this.svg.createSVGMatrix().translate(x, y)
        matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix

        this.processRoot(svg, this.svg.createSVGTransformFromMatrix(matrix), width, height)
        return
      }
    } else {
      // we just draw the image 'as is' into the canvas
      const img = new Image()
      let matrix = this.svg.createSVGMatrix().translate(x, y)
      matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix
      const dx = matrix.e
      const dy = matrix.f
      img.onload = () => {
        this.ctx.drawImage(img, dx, dy)
      }
      img.src = href
    }
  }

  /**
   * @private
   * @param {SVGTextElement} text
   * @param {SVGTransform?} svgTransform
   */
  drawText(text, svgTransform) {
    this.ctx.save()

    let textLocation = new Point(this.getLengthInPx(text.x), this.getLengthInPx(text.y))

    // text style
    this.ctx.font = this.getCssFont(text, svgTransform)
    const style = this.parseStyleConfig(text, svgTransform)
    if (style.fill) {
      this.ctx.fillStyle = style.fill
    }

    const textAnchor = this.getEffectiveAttribute(text, 'text-anchor')
    if (textAnchor) {
      this.ctx.textAlign = textAnchor !== 'middle' ? textAnchor : 'center'
    }

    // apply the global transform
    if (svgTransform) {
      const matrix = svgTransform.matrix
      // IE11 doesn't support SVGMatrix as parameter for setTransform
      this.ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
    }

    // consider dx/dy of the text element
    const dx = this.getLengthInPx(text.dx)
    const dy = this.getLengthInPx(text.dy)
    this.ctx.translate(dx, dy)

    if (text.childElementCount === 0) {
      this.ctx.fillText(
        this.getTextContent(text),
        textLocation.x,
        textLocation.y,
        text.getBBox().width
      )
    } else {
      const children = this.getNodeChildren(text)
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (child.tagName === 'tspan') {
          textLocation = new Point(this.getLengthInPx(child.x), this.getLengthInPx(child.y))
          const dx = this.getLengthInPx(child.dx)
          const dy = this.getLengthInPx(child.dy)
          this.ctx.translate(dx, dy)
          this.ctx.fillText(this.getTextContent(child), textLocation.x, textLocation.y)
        }
      }
    }

    this.ctx.restore()
  }

  /**
   * Retrieves the text content from a text content element (text, tspan, ...)
   * @private
   * @param {SVGTextContentElement} element
   * @returns {string}
   */
  getTextContent(element) {
    let content = element.textContent
    if (this.shouldNormalizeWhitespace(element)) {
      content = content.replace(/[\n\r\t ]+/g, ' ').trim()
    } else {
      content = content.replace(/\r\n|[\n\r\t]/g, ' ')
    }
    return content
  }

  /**
   * Determines whether the given element has default white-space handling, i.e. normalization.
   * Returns false if the element (or an ancestor) has xml:space='preserve'
   * @private
   * @param {SVGElement} element
   * @returns {boolean}
   */
  shouldNormalizeWhitespace(element) {
    let xmlSpaceAttribute = null
    while (element !== null && element !== window.document && xmlSpaceAttribute === null) {
      xmlSpaceAttribute = element.getAttribute('xml:space')
      if (xmlSpaceAttribute === null) {
        element = element.parentNode
      }
    }
    return xmlSpaceAttribute !== 'preserve' // no attribute is also default handling
  }

  /**
   * @private
   * @param {SVGAnimatedLengthList} svgLengthList
   * @return {number} length in pixels
   */
  getLengthInPx(svgLengthList) {
    if (svgLengthList && svgLengthList.baseVal.numberOfItems > 0) {
      return svgLengthList.baseVal.getItem(0).value
    }
    return 0
  }

  /**
   * @private
   * @param {SVGTextElement} text
   * @param {SVGTransform?} svgTransform
   * @return {string}
   */
  getCssFont(text, svgTransform) {
    let cssFont = ''
    const fontStyle = this.getEffectiveAttribute(text, 'font-style')
    if (fontStyle) {
      cssFont += fontStyle
    }
    const fontWeight = this.getEffectiveAttribute(text, 'font-weight')
    if (fontWeight) {
      cssFont += ` ${fontWeight}`
    }
    let fontSize = this.getEffectiveAttribute(text, 'font-size')
    if (fontSize) {
      cssFont += ` ${fontSize}`
    }
    if (this.fontFamily) {
      cssFont += ` ${this.fontFamily}`
    } else {
      const fontFamily = this.getEffectiveAttribute(text, 'font-family')
      if (fontFamily) {
        cssFont += ` ${fontFamily}`
      }
    }

    cssFont = cssFont.trim()
    return cssFont
  }

  /**
   * Returns the Node's children, since Node.prototype.children is not available on all browsers.
   * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/children
   * @private
   * @param {Node} element
   * @returns {Array}
   */
  getNodeChildren(element) {
    if (typeof element.children !== 'undefined') {
      return element.children
    }
    let i = 0
    let node
    const nodes = element.childNodes
    const children = []
    while ((node = nodes[i++])) {
      if (node.nodeType === 1) {
        children.push(node)
      }
    }
    return children
  }
}
