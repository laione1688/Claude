import { describe, it, expect } from 'vitest'
import { sum } from '../smoke'

describe('smoke', () => {
  it('adds', () => { expect(sum(1, 2)).toBe(3) })
})
