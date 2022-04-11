import { Options } from 'roughjs/bin/core'
import { RoughSVG } from 'roughjs/bin/svg'

/**
 * A context that represents the current state of the rendering,
 * which is used in the rendering functions.
 */
export type RenderContext = {
  rc: RoughSVG
  roughConfig: Options
  fontFamily: string | null
  pencilFilter: boolean
  randomize: boolean
  sketchPatterns: boolean
  idElements: Record<string, SVGElement | string>
  sourceSvg: SVGSVGElement
  svgSketch: SVGSVGElement
  svgSketchDefs?: SVGDefsElement
  useElementContext?: UseContext | null
  styleSheets: CSSStyleSheet[]
  processElement: (
    context: RenderContext,
    root: SVGSVGElement | SVGGElement | SVGSymbolElement | SVGMarkerElement | SVGElement,
    svgTransform: SVGTransform | null,
    width?: number,
    height?: number
  ) => void
}

/**
 * The context for rendering use elements.
 */
export type UseContext = {
  referenced: SVGElement
  root: Element | null
  parentContext: UseContext | null
}
