import { describe, it, expect } from 'vitest'
import { extractProps, findMatchesDefineProps, findMatching } from '../src/utils'

describe('Utils', () => {
  describe('extractProps', () => {
    it('should extract single-line and multi-line comments correctly', () => {
      const code = `
      /** multi-line comment */
      // single-line comment
      testProp: {
        type: String,
        required: true
      },
      anotherProp: 42
      `
      const props = extractProps(code)
      expect(props).toHaveLength(2)
      expect(props[0].name).toBe('testProp')
      expect(props[0].comment).toBeDefined()
      expect(props[0].comment).toContain('multi-line comment')
      expect(props[0].comment).toContain('single-line comment')
      expect(props[1].name).toBe('anotherProp')
      expect(props[1].comment).toBeUndefined()
    })
  })

  describe('findMatching', () => {
    it('should find matching braces correctly', () => {
      const code = 'function test() { return { a: 1, b: [2,3] }; }'
      const openIdx = code.indexOf('{')
      const closeIdx = findMatching(code, openIdx, '{', '}')
      expect(closeIdx).toBe(code.lastIndexOf('}'))
    })
  })

  describe('findMatchesDefineProps', () => {
    it('should detect defineProps calls', () => {
      const code = `
      const props = defineProps({
        test: String
      })
      `
      const matches = findMatchesDefineProps(code)
      expect(matches).toHaveLength(1)
      expect(matches[0].prefix).toContain('const props =')
    })
  })
})
