export type Point = { x: number; y: number }
export type Size = { w: number; h: number }

export type Rectangle = Point & Size

export function str(p: Point) {
  return `${p.x},${p.y}`
}

export function equals(p0: Point, p1: Point): boolean {
  return p0.x === p1.x && p0.y === p1.y
}
