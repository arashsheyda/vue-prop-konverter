import { describe, it, expect } from 'vitest'
import { convertProps } from '../src/core/converter'

describe('convertProps', () => {
  it('should convert object-style defineProps to type-safe defineProps', () => {
    const code = `
    const props = defineProps({
      /** fetches URL */
      test: {
        type: String,
        required: true
      },
      // another comment
      count: {
        type: Number,
        default: 0
      }
    })
    `
    const converted = convertProps(code)
    expect(converted).toContain('defineProps<{')
    expect(converted).toContain('test: string')
    expect(converted).toContain('count?: number')
    expect(converted).toContain('/** fetches URL */')
    expect(converted).toContain('// another comment')
  })

  it('should preserve multi-line default values', () => {
    const code = `
    const props = defineProps({
      data: {
        type: Object as PropType<{ a: number, b: string }>,
        default: () => ({ a: 1, b: 'x' })
      }
    })
    `
    const converted = convertProps(code)
    expect(converted).toContain('data = ({ a: 1, b: \'x\' })')
    expect(converted).toContain('data?: { a: number, b: string }')
  })
})
