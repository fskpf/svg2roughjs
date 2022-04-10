export type Point = { x: number; y: number }
export type Size = { w: number; h: number }

export type Rectangle = Point & Size

export function str(p: Point) {
  return `${p.x},${p.y}`
}
