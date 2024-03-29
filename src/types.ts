import { Options } from 'roughjs/bin/core'
import { RoughSVG } from 'roughjs/bin/svg'
import { Rectangle } from './geom/primitives'
import { RandomNumberGenerator } from './RandomNumberGenerator'

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
  rng: RandomNumberGenerator
  sketchPatterns: boolean
  idElements: Record<string, SVGElement | string>
  sourceSvg: SVGSVGElement
  svgSketch: SVGSVGElement
  svgSketchIsInDOM: boolean
  svgSketchDefs?: SVGDefsElement
  useElementContext?: UseContext | null
  viewBox?: Rectangle
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
