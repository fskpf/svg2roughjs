/**
 * A small helper class that represents a point.
 */
export class Point {
  private $x: number
  private $y: number

  get x(): number {
    return this.$x
  }
  get y(): number {
    return this.$y
  }
  constructor(x: number, y: number) {
    this.$x = x || 0
    this.$y = y || 0
  }

  toString(): string {
    return `${this.x},${this.y}`
  }
}