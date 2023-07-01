import { Random } from 'roughjs/bin/math'

/**
 * A simple random number generator that allows for seeding.
 */
export class RandomNumberGenerator {
  private readonly rng: Random | null
  constructor(seed: number | null) {
    // since we already depend on Rough.js, we may just use its seedable RNG implementation
    this.rng = seed ? new Random(seed) : null
  }

  /**
   * Returns a random number in the given range.
   */
  next(range?: [number, number]): number {
    const rnd = this.rng?.next() ?? Math.random()
    if (range) {
      const min = range[0]
      const max = range[1]
      return rnd * (max - min) + min
    }
    return rnd
  }
}
