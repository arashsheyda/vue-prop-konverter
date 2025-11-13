import { describe, it, expect } from 'vitest'
import { convertProps } from '../src/core/converter'
import * as PropFixtures from './fixtures/props'

describe('convertProps', () => {
  for (const [name, prop] of Object.entries(PropFixtures)) {
    it(`should correctly convert "${name}"`, () => {
      const converted = convertProps(prop.js)
      expect(converted).toBe(prop.ts)
    })
  }
})
