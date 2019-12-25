import tinycolor from 'tinycolor2'
import { SVGPathData, encodeSVGPath } from 'svg-pathdata'

import rough from 'roughjs/dist/rough.umd'

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
}

export default class Svg2Roughjs {
  /**
   * @param {SVGSVGElement} svg
   */
  set svg(svg) {
    if (this.$svg !== svg) {
      this.$svg = svg

      this.width = svg.width.baseVal.value
      this.height = svg.height.baseVal.value
      this.canvas.width = this.width
      this.canvas.height = this.height

      // pre-process defs for subsequent references
      this.parseDefs()

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
   * @param {string} selector
   * @param {object?} roughConfig Config object passed to the Rough.js ctor
   */
  constructor(selector, roughConfig = {}) {
    const container = document.querySelector(selector)
    const canvas = document.createElement('canvas')
    this.rc = rough.canvas(canvas, roughConfig)
    this.width = container.clientWidth
    this.height = container.clientHeight
    this.$roughConfig = roughConfig
    canvas.width = this.width
    canvas.height = this.height
    container.appendChild(canvas)
    this.canvas = canvas
  }

  clearCanvas() {
    const ctx = this.canvas.getContext('2d')
    ctx.clearRect(0, 0, this.width, this.height)
  }

  redraw() {
    this.clearCanvas()
    this.drawSvg(this.svg)
  }

  /**
   * @param {SVGSVGElement} svg
   * @param {SVGTransform?} svgTransform
   * @param {number?} width Use elements can overwrite width
   * @param {number?} height Use elements can overwrite height
   */
  drawSvg(svg, svgTransform, width, height) {
    // traverse svg in DFS
    const stack = []

    if (
      typeof width !== 'undefined' &&
      typeof height !== 'undefined' &&
      svg.getAttribute('viewBox')
    ) {
      const {
        x: viewBoxX,
        y: viewBoxY,
        width: viewBoxWidth,
        height: viewBoxHeight
      } = svg.viewBox.baseVal

      const viewBoxMatrix = this.svg
        .createSVGMatrix()
        .translate(-viewBoxX, -viewBoxY)
        .scaleNonUniform(width / viewBoxWidth, height / viewBoxHeight)
      const combinedMatrix = svgTransform
        ? svgTransform.matrix.multiply(viewBoxMatrix)
        : viewBoxMatrix
      svgTransform = this.svg.createSVGTransformFromMatrix(combinedMatrix)
    }

    // don't put the SVG itself into the stack, so start with the children of it
    for (let i = svg.childElementCount - 1; i >= 0; i--) {
      const child = svg.children[i]
      let newTransform = svgTransform
      if (child.transform && child.transform.baseVal.length > 0) {
        const childTransformMatrix = child.transform.baseVal.consolidate().matrix
        const combinedMatrix = newTransform
          ? newTransform.matrix.multiply(childTransformMatrix)
          : childTransformMatrix
        newTransform = this.svg.createSVGTransformFromMatrix(combinedMatrix)
      }
      stack.push({ element: child, transform: newTransform })
    }

    while (stack.length > 0) {
      const { element, transform } = stack.pop()

      // maybe draw the element
      this.drawElement(element, transform)

      if (element.tagName === 'defs' || element.tagName === 'svg') {
        // Defs are prepocessed separately.
        // Don't traverse the SVG element itself. This is done by drawElement -> drawSvg.
        continue
      }
      // process childs
      for (let i = element.childElementCount - 1; i >= 0; i--) {
        const childElement = element.children[i]
        let newTransform = transform
        if (childElement.transform && childElement.transform.baseVal.length > 0) {
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
   */
  parseDefs() {
    this.defs = {}
    const defs = [...this.svg.querySelectorAll('defs')]
    defs.forEach(defsElement => {
      for (let i = 0; i < defsElement.childElementCount; i++) {
        const def = defsElement.children[i]
        this.storeDefElement(def)
      }
    })
  }

  /**
   * @param {SVGElement} defElement
   */
  storeDefElement(defElement) {
    const id = defElement.getAttribute('id')
    if (id) {
      this.defs[id] = defElement
    }
  }

  /**
   *
   * [a c e] [x] = (a*x + c*y + e)
   * [b d f] [y] = (b*x + d*y + f)
   * [0 0 1] [1] = (0 + 0 + 1)
   *
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
   * @param {number} min
   * @param {number} max
   * @return {number}
   */
  getRandomNumber(min, max) {
    return Math.random() * (max - min) + min
  }

  /**
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
   * @param {SVGLinearGradientElement | SVGRadialGradientElement} gradient
   * @param {number} opacity
   * @return {string}
   */
  gradientToColor(gradient, opacity) {
    const stops = [...gradient.querySelectorAll('stop')]
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
   * @param {string} url
   * @param {number} opacity
   * @return {string}
   */
  parseFillUrl(url, opacity) {
    const result = /url\(#?(.*?)\)/.exec(url)
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
   *
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
   * @param {SVGElement} element
   * @return {object} config for Rough.js drawing
   */
  parseStyleConfig(element) {
    const config = Object.assign({}, this.$roughConfig)

    const fill = element.getAttribute('fill')
    const fillOpacity = this.getOpacity(element, 'fill-opacity')
    if (fill) {
      if (fill.indexOf('url') !== -1) {
        config.fill = this.parseFillUrl(fill, fillOpacity)
      } else if (fill === 'none') {
        config.fill = 'transparent' // roughjs fills paths even though they have 'fill="none"'
      } else {
        const color = tinycolor(fill)
        color.setAlpha(fillOpacity)
        config.fill = color.toString()
      }
    } else {
      config.fill = 'transparent'
    }

    // roughjs default is 0.5 * strokeWidth
    config.fillWeight = this.getRandomNumber(0.5, 3)
    // roughjs default is -41deg
    config.hachureAngle = this.getRandomNumber(-30, -50)
    // roughjs defailt is 4 * strokeWidth
    config.hachureGap = this.getRandomNumber(3, 5)

    const stroke = element.getAttribute('stroke')
    const strokeOpacity = this.getOpacity(element, 'stroke-opacity')
    if (stroke) {
      if (stroke.indexOf('url') !== -1) {
        config.stroke = this.parseFillUrl(fill, strokeOpacity)
      } else {
        const color = tinycolor(stroke)
        color.setAlpha(strokeOpacity)
        config.stroke = color.toString()
      }
    } else {
      config.stroke = 'transparent'
    }

    const strokeWidth = element.getAttribute('stroke-width')
    if (strokeWidth) {
      config.strokeWidth = strokeWidth
    } else {
      config.strokeWidth = 0
    }

    return config
  }

  /**
   * @param {SVGElement} element
   * @param {SVGTransform} svgTransform
   * @param {number?} width Use elements can overwrite width
   * @param {number?} height Use elements can overwrite height
   */
  drawElement(element, svgTransform, width, height) {
    switch (element.tagName) {
      case 'svg':
        this.drawSvg(element, svgTransform, width, height)
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
    }
  }

  /**
   * @param {SVGPolylineElement} polyline
   * @param {SVGTransform?} svgTransform
   */
  drawPolyline(polyline, svgTransform) {
    const points = [...polyline.points]
    const transformed = points.map(p => {
      const pt = this.applyMatrix(p, svgTransform)
      return [pt.x, pt.y]
    })
    this.rc.linearPath(transformed, this.parseStyleConfig(polyline))
  }

  /**
   * @param {SVGPolygonElement} polygon
   * @param {SVGTransform?} svgTransform
   */
  drawPolygon(polygon, svgTransform) {
    const points = [...polygon.points]
    const transformed = points.map(p => {
      const pt = this.applyMatrix(p, svgTransform)
      return [pt.x, pt.y]
    })
    this.rc.polygon(transformed, this.parseStyleConfig(polygon))
  }

  /**
   * @param {SVGEllipseElement} ellipse
   * @param {SVGTransform?} svgTransform
   */
  drawEllipse(ellipse, svgTransform) {
    const cx = ellipse.cx.baseVal.value
    const cy = ellipse.cy.baseVal.value
    const rx = ellipse.rx.baseVal.value
    const ry = ellipse.ry.baseVal.value
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
      this.parseStyleConfig(ellipse)
    )
  }

  /**
   * @param {SVGCircleElement} circle
   * @param {SVGTransform?} svgTransform
   */
  drawCircle(circle, svgTransform) {
    const cx = circle.cx.baseVal.value
    const cy = circle.cy.baseVal.value
    const r = circle.r.baseVal.value
    const center = this.applyMatrix(new Point(cx, cy), svgTransform)
    // transform a point on the ellipse to get the transformed radius
    const radiusPoint = this.applyMatrix(new Point(cx + r, cy + r), svgTransform)
    const transformedWidth = 2 * (radiusPoint.x - center.x)
    this.rc.circle(center.x, center.y, transformedWidth, this.parseStyleConfig(circle))
  }

  /**
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
    this.rc.line(p1.x, p1.y, p2.x, p2.y, this.parseStyleConfig(line))
  }

  /**
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
      this.drawElement(defElement, svgTransform, useWidth, useHeight)
    }
  }

  /**
   * @param {SVGPathElement} path
   * @param {SVGTransform?} svgTransform
   */
  drawPath(path, svgTransform) {
    const dataAttrs = path.getAttribute('d')
    const pathData = new SVGPathData(dataAttrs).toAbs()
    const transformedCommands = pathData.commands.map(command =>
      this.transformPathCommand(command, svgTransform)
    )
    const transformedPathData = encodeSVGPath(transformedCommands)
    if (transformedPathData.indexOf('undefined') !== -1) {
      // DEBUG STUFF
      console.error('broken path data')
      debugger
      return
    }
    this.rc.path(transformedPathData, this.parseStyleConfig(path))
  }

  /**
   * @param {SVGCommand} command
   * @param {SVGTransform?} svgTransform
   */
  transformPathCommand(command, svgTransform) {
    if (!svgTransform || command.type === SVGPathData.CLOSE_PATH) {
      return command
    }

    const transformed = { type: command.type, relative: command.relative }
    if (
      command.type === SVGPathData.MOVE_TO ||
      command.type === SVGPathData.LINE_TO ||
      command.type === SVGPathData.SMOOTH_QUAD_TO
    ) {
      // x, y
      const { x, y } = this.applyMatrix(new Point(command.x, command.y), svgTransform)
      transformed.x = x
      transformed.y = y
    } else if (command.type === SVGPathData.HORIZ_LINE_TO) {
      // x
      const { x } = this.applyMatrix(new Point(command.x, 0), svgTransform)
      transformed.x = x
    } else if (command.type === SVGPathData.VERT_LINE_TO) {
      // y
      const { y } = this.applyMatrix(new Point(0, command.y), svgTransform)
      transformed.y = y
    } else if (command.type === SVGPathData.QUAD_TO) {
      // x, y, x1, y1
      const { x, y } = this.applyMatrix(new Point(command.x, command.y), svgTransform)
      const { x: x1, y: y1 } = this.applyMatrix(new Point(command.x1, command.y1), svgTransform)
      transformed.x = x
      transformed.y = y
      transformed.x1 = x1
      transformed.y1 = y1
    } else if (command.type === SVGPathData.CURVE_TO) {
      // x, y, x1, y1, x2, y2
      const { x, y } = this.applyMatrix(new Point(command.x, command.y), svgTransform)
      const { x: x1, y: y1 } = this.applyMatrix(new Point(command.x1, command.y1), svgTransform)
      const { x: x2, y: y2 } = this.applyMatrix(new Point(command.x2, command.y2), svgTransform)
      transformed.x = x
      transformed.y = y
      transformed.x1 = x1
      transformed.y1 = y1
      transformed.x2 = x2
      transformed.y2 = y2
    } else if (command.type === SVGPathData.SMOOTH_CURVE_TO) {
      // x, y, x2, y2
      const { x, y } = this.applyMatrix(new Point(command.x, command.y), svgTransform)
      const { x: x2, y: y2 } = this.applyMatrix(new Point(command.x2, command.y2), svgTransform)
      transformed.x = x
      transformed.y = y
      transformed.x2 = x2
      transformed.y2 = y2
    } else if (command.type === SVGPathData.ARC) {
      // rX: number;
      // rY: number;
      // xRot: number;
      // sweepFlag: 0 | 1;
      // lArcFlag: 0 | 1;
      // x: number;
      // y: number;
      // cX?: number;
      // cY?: number;
      // phi1?: number;
      // phi2?: number;
      transformed.xRot = command.xRot
      transformed.sweepFlag = command.sweepFlag
      transformed.lArcFlag = command.lArcFlag
      const { x: rX, y: rY } = this.applyMatrix(new Point(command.rX, command.rY), svgTransform)
      transformed.rX = rX
      transformed.rY = rY
      const { x, y } = this.applyMatrix(new Point(command.x, command.y), svgTransform)
      transformed.x = x
      transformed.y = y
      if (typeof command.cX !== 'undefined' && typeof command.cY !== 'undefined') {
        const { x: cX, y: cY } = this.applyMatrix(new Point(command.cX, command.cY), svgTransform)
        transformed.cX = cX
        transformed.cY = cY
      }
      if (typeof phi1 !== 'undefined') {
        transformed.phi1 = command.phi1
      }
      if (typeof phi2 !== 'undefined') {
        transformed.phi2 = command.phi2
      }
    }

    return transformed
  }

  /**
   * @param {SVGRectElement} rect
   * @param {SVGTransform?} svgTransform
   */
  drawRect(rect, svgTransform) {
    const x = rect.x.baseVal.value
    const y = rect.y.baseVal.value
    const width = rect.width.baseVal.value
    const height = rect.height.baseVal.value
    const p1 = this.applyMatrix(new Point(x, y), svgTransform)
    const p2 = this.applyMatrix(new Point(x + width, y + height), svgTransform)
    this.rc.rectangle(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y, this.parseStyleConfig(rect))
  }
}
