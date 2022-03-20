import { RoughSVG } from 'roughjs/bin/svg'

export class Renderer {
  canvas: HTMLCanvasElement
  private dummyCtx: CanvasRenderingContext2D
  $currentPath: string | null = null

  constructor(private roughjs: RoughSVG, private svg: SVGSVGElement) {
    this.canvas = document.createElement('canvas')
    this.dummyCtx = this.canvas.getContext('2d')!
  }

  // globalAlpha: number
  // globalCompositeOperation: string
  drawImage(image: CanvasImageSource, dx: number, dy: number): void
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): void
  drawImage(
    image: any,
    sx: any,
    sy: any,
    sw?: any,
    sh?: any,
    dx?: any,
    dy?: any,
    dw?: any,
    dh?: any
  ): void {
    console.log('Not implemented')
  }
  beginPath(): void {
    this.$currentPath = ''
  }
  clip(fillRule?: CanvasFillRule): void
  clip(path: Path2D, fillRule?: CanvasFillRule): void
  clip(path?: any, fillRule?: any): void {
    console.log('Not implemented')
  }
  fill(fillRule?: CanvasFillRule): void
  fill(path: Path2D, fillRule?: CanvasFillRule): void
  fill(path?: any, fillRule?: any): void {
    console.log('Not implemented')
  }
  stroke(path?: Path2D): void {
    if (path) {
      console.log('Not implemented')
    } else {
    }
  }
  // fillStyle: string | CanvasGradient | CanvasPattern
  // strokeStyle: string | CanvasGradient | CanvasPattern
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    return this.dummyCtx.createLinearGradient(x0, y0, x1, y1)
  }
  createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null {
    return this.dummyCtx.createPattern(image, repetition)
  }
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number
  ): CanvasGradient {
    return this.dummyCtx.createRadialGradient(x0, y0, r0, x1, y1, r1)
  }
  // filter: string
  createImageData(imagedata: ImageData): ImageData
  createImageData(sw: any, sh?: any): ImageData {
    return this.dummyCtx.createImageData(sw, sh)
  }
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    return this.dummyCtx.getImageData(sx, sy, sw, sh)
  }
  putImageData(imagedata: ImageData, dx: number, dy: number): void
  putImageData(
    imagedata: ImageData,
    dx: number,
    dy: number,
    dirtyX: number,
    dirtyY: number,
    dirtyWidth: number,
    dirtyHeight: number
  ): void
  putImageData(
    imagedata: any,
    dx: any,
    dy: any,
    dirtyX?: any,
    dirtyY?: any,
    dirtyWidth?: any,
    dirtyHeight?: any
  ): void {
    console.log('Not implemented')
  }
  // imageSmoothingEnabled: boolean
  // imageSmoothingQuality: ImageSmoothingQuality
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void {
    console.log('Not implemented')
  }
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    console.log('Not implemented')
  }
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void {
    this.$currentPath += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`
  }
  closePath(): void {
    this.$currentPath += ' Z'
  }
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void {
    console.log('Not implemented')
  }
  lineTo(x: number, y: number): void {
    this.$currentPath += ` L${x},${y}`
  }
  moveTo(x: number, y: number): void {
    this.$currentPath += ` M${x},${y}`
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.$currentPath += ` Q${cpx},${cpy} ${x},${y}`
  }
  rect(x: number, y: number, w: number, h: number): void {
    console.log('Not implemented')
  }
  // lineCap: CanvasLineCap
  // lineDashOffset: number
  // lineJoin: CanvasLineJoin
  // lineWidth: number
  // miterLimit: number
  getLineDash(): number[] {
    return this.dummyCtx.getLineDash()
  }
  setLineDash(segments: number[]): void {
    console.log('Not implemented')
  }
  clearRect(x: number, y: number, w: number, h: number): void {
    console.log('Not implemented')
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    const sketch = this.roughjs.rectangle(
      x,
      y,
      w,
      h,
      { stroke: 'red', fill: 'green' } // TODO
    )
    this.svg.appendChild(sketch)
  }
  strokeRect(x: number, y: number, w: number, h: number): void {
    console.log('Not implemented')
  }
  // shadowBlur: number
  // shadowColor: string
  // shadowOffsetX: number
  // shadowOffsetY: number
  restore(): void {
    this.dummyCtx.restore()
  }
  save(): void {
    this.dummyCtx.save()
  }
  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    console.log('Not implemented')
  }
  measureText(text: string): TextMetrics {
    return this.dummyCtx.measureText(text)
  }
  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    console.log('Not implemented')
  }
  // direction: CanvasDirection
  // font: string
  // textAlign: CanvasTextAlign
  // textBaseline: CanvasTextBaseline

  getTransform(): DOMMatrix {
    return this.dummyCtx.getTransform()
  }
  resetTransform(): void {
    this.dummyCtx.resetTransform()
  }
  rotate(angle: number): void {
    this.dummyCtx.rotate(angle)
  }
  scale(x: number, y: number): void {
    this.dummyCtx.scale(x, y)
  }
  setTransform(
    a: number | DOMMatrix2DInit,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ): void {
    if (arguments.length === 1) {
      this.dummyCtx.setTransform(a as DOMMatrix2DInit)
    } else {
      this.dummyCtx.setTransform(a as number, b, c, d, e, f)
    }
  }
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.dummyCtx.transform(a, b, c, d, e, f)
  }
  translate(x: number, y: number): void {
    this.dummyCtx.translate(x, y)
  }
  drawFocusIfNeeded(element: Element): void
  drawFocusIfNeeded(path: Path2D, element: Element): void
  drawFocusIfNeeded(path: any, element?: any): void {
    console.log('Not implemented')
  }
}
