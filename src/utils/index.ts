/**
 * Determines if a prop is required based on its object-style definition.
 *
 * @param value - The prop definition block (as string)
 * @returns true if explicitly required, false if default exists or optional
 */
export function isPropRequired(value: string): boolean {
  // 1. Explicit `required: true`
  if (/\brequired\s*:\s*true\b/.test(value)) return true

  // 2. If a `default` value is provided, prop is NOT required
  if (/\bdefault\s*:/.test(value)) return false

  // 3. Otherwise optional
  return false
}

/**
 * Extracts the default value expression from a prop definition.
 *
 * Handles arrow functions, object/array literals, and string/number values.
 *
 * @param value - The full prop definition string
 * @returns Default value as string, or undefined if none found
 */
export function extractDefaultValue(value: string): string | undefined {
  const idx = value.indexOf('default')
  if (idx === -1) return undefined

  const after = value.slice(idx)
  const m = after.match(/default\s*:\s*/)
  if (!m) return undefined

  let i = idx + m[0].length
  let result = ''
  let inString: string | null = null
  let depth = 0

  while (i < value.length) {
    const ch = value[i]

    if (inString) {
      result += ch
      if (ch === '\\' && i + 1 < value.length) {
        i++
        result += value[i]
      } else if (ch === inString) {
        inString = null
      }
      i++
      continue
    }

    if (ch === '\'' || ch === '"' || ch === '`') {
      inString = ch
      result += ch
      i++
      continue
    }

    if ('({['.includes(ch)) {
      depth++
      result += ch
      i++
      continue
    }

    if (')}]'.includes(ch)) {
      depth = Math.max(0, depth - 1)
      result += ch
      i++
      const nxt = value.slice(i).trimStart()
      if (depth === 0 && (nxt.startsWith(',') || nxt.startsWith('\n') || nxt.startsWith('}'))) break
      continue
    }

    if ((ch === ',' || ch === '\n') && depth === 0) break

    result += ch
    i++
  }

  let def = result.trim()
  if (!def) return undefined

  // Handle arrow functions
  if (def.startsWith('() =>')) {
    def = def.replace(/^\(\)\s*=>\s*/, '').trim()
    // Only wrap if returning object without parentheses
    if (/^\{[\s\S]*\}$/.test(def) || /^\[[\s\S]*\]$/.test(def)) {
      // no need to wrap — it's already a valid literal
    } else if (!def.startsWith('(')) {
      def = `(${def})`
    }
  }

  // Remove unnecessary wrapping parentheses around literals like ({}) or ([])
  if (/^\(\s*(\{|\[)/.test(def) && /(\}|\])\s*\)$/.test(def)) {
    def = def.replace(/^\(\s*/, '').replace(/\s*\)$/, '')
  }

  return def
}

/**
 * Finds the matching closing character for a given opening character in text.
 *
 * @param text - The text to search
 * @param openIdx - Index of the opening character
 * @param openChar - Opening character ('(', '{', '[')
 * @param closeChar - Closing character (')', '}', ']')
 * @returns Index of the matching closing character, or -1 if not found
 */
export function findMatching(text: string, openIdx: number, openChar: string, closeChar: string): number {
  let depth = 0
  let inString: string | null = null

  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i]

    if (inString) {
      if (ch === '\\' && i + 1 < text.length) {
        i++
        continue
      }
      if (ch === inString) inString = null
      continue
    }

    if ('\'"`'.includes(ch)) {
      inString = ch
      continue
    }

    if (ch === openChar) depth++
    else if (ch === closeChar) {
      depth--
      if (depth === 0) return i
    }
  }

  return -1
}

/**
 * Finds all defineProps calls with object-style props in the given text.
 *
 * @param text - The full document text
 * @returns Array of matches with positions and brace locations
 */
export function findMatchesDefineProps(text: string) {
  const results: { start: number; end: number; openBrace: number; closeBrace: number; prefix: string }[] = []
  const regex = /(?:const\s+\w+\s*=\s*)?defineProps\s*\(/g
  let m: RegExpExecArray | null

  while ((m = regex.exec(text))) {
    const start = m.index
    const openParen = text.indexOf('(', start + m[0].length - 1)
    if (openParen < 0) continue

    const closeParen = findMatching(text, openParen, '(', ')')
    if (closeParen < 0) continue

    const braceOpen = findFirstTopLevelBrace(text, openParen + 1, closeParen)
    if (braceOpen < 0) continue

    const braceClose = findMatching(text, braceOpen, '{', '}')
    if (braceClose < 0 || braceClose > closeParen) continue

    results.push({
      start,
      end: closeParen + 1,
      openBrace: braceOpen,
      closeBrace: braceClose,
      prefix: text.slice(start, openParen),
    })
  }

  return results
}

/**
 * Finds the first top-level opening brace '{' in a given text range.
 *
 * @param text - The text to search
 * @param from - Start index
 * @param to - End index
 * @returns Index of the first top-level brace, or -1 if none
 */
export function findFirstTopLevelBrace(text: string, from: number, to: number): number {
  let inString: string | null = null

  for (let i = from; i < to; i++) {
    const ch = text[i]

    if (inString) {
      if (ch === '\\' && i + 1 < text.length) i++
      else if (ch === inString) inString = null
      continue
    }

    if ('\'"`'.includes(ch)) {
      inString = ch
      continue
    }

    if (ch === '{') return i
  }

  return -1
}

/**
 * Parses a prop object body into name/value/comment triples.
 *
 * Preserves:
 * - Single-line `//` comments
 * - Multi-line `/* ... *\/` and JSDoc `/** ... *\/` comments
 * - Inline comments after properties
 *
 * @param body - The content inside defineProps({ ... })
 * @returns Array of props with name and value as string and optional comment
 */
export function extractProps(body: string) {
  const out: { name: string; value: string; comment?: string }[] = []
  let i = 0
  const n = body.length

  while (i < n) {
    // Skip whitespace
    while (i < n && /\s/.test(body[i])) i++
    if (i >= n) break

    // Capture comments before prop (multi-line)
    const commentLines: string[] = []
    while (i < n) {
      const nextTwo = body.slice(i, i + 2)
      if (nextTwo === '//') {
        const end = body.indexOf('\n', i)
        const comment = body.slice(i, end >= 0 ? end : n).trim()
        commentLines.push(comment)
        i = end >= 0 ? end + 1 : n
      } else if (nextTwo === '/*') {
        const end = body.indexOf('*/', i)
        if (end !== -1) {
          const comment = body.slice(i, end + 2).trim()
          commentLines.push(comment)
          i = end + 2
        } else {
          i = n
          break
        }
      } else if (/^\s*$/.test(body.slice(i, i + 1))) {
        i++ // skip blank lines
      } else {
        break
      }
    }

    if (i >= n) break

    // --- Extract prop name ---
    let name = ''
    if ('\'"`'.includes(body[i])) {
      const quote = body[i++]
      let sb = quote
      while (i < n) {
        const ch = body[i++]
        sb += ch
        if (ch === '\\' && i < n) sb += body[i++]
        if (ch === quote) break
      }
      name = sb
    } else {
      const start = i
      while (i < n && /[A-Za-z0-9_$]/.test(body[i])) i++
      name = body.slice(start, i).trim()
    }

    // Skip to colon
    while (i < n && /\s/.test(body[i])) i++
    if (body[i] !== ':') {
      i++
      continue
    }
    i++

    // --- Extract prop value ---
    const valueStart = i
    let vInString: string | null = null
    let vDepth = 0

    while (i < n) {
      const ch = body[i]

      if (vInString) {
        if (ch === '\\' && i + 1 < n) { i += 2; continue }
        if (ch === vInString) { vInString = null; i++; continue }
        i++; continue
      } else {
        if ('\'"`'.includes(ch)) { vInString = ch; i++; continue }
        if ('{[('.includes(ch)) { vDepth++; i++; continue }
        if ('}])'.includes(ch)) { if (vDepth > 0) vDepth--; i++; continue }

        // Inline comments
        if (vDepth === 0 && body.slice(i, i + 2) === '//') {
          const end = body.indexOf('\n', i)
          const inline = body.slice(i, end >= 0 ? end : n).trim()
          commentLines.push(inline)
          i = end >= 0 ? end + 1 : n
          continue
        } else if (vDepth === 0 && body.slice(i, i + 2) === '/*') {
          const end = body.indexOf('*/', i)
          if (end !== -1) {
            const inline = body.slice(i, end + 2).trim()
            commentLines.push(inline)
            i = end + 2
            continue
          }
        }

        if (ch === ',' && vDepth === 0) break
        i++
      }
    }

    const value = body.slice(valueStart, i).trim()
    const comment = commentLines.length ? commentLines.join('\n') : undefined

    out.push({ name: name.trim(), value, comment })
    if (i < n && body[i] === ',') i++
  }

  return out
}

/**
 * Infers TypeScript type from a prop's default value or type declaration.
 *
 * @param value - Extracted default value
 * @param propValueBlock - Full prop object block
 * @returns TypeScript type as string
 */
export function inferTypeFromValueOrValueToken(value: string, propValueBlock: string): string {
  const propType = extractPropType(propValueBlock, 'PropType')
  if (propType) return propType

  const asPropTypeIndex = propValueBlock.indexOf('as PropType<')
  if (asPropTypeIndex !== -1) {
    const asPropType = extractPropType(propValueBlock.slice(asPropTypeIndex), 'PropType')
    if (asPropType) return asPropType
  }

  const typeMatch = propValueBlock.match(/type\s*:\s*([A-Za-z0-9_$.|&\\[\]\s]+)/)
  if (typeMatch) {
    const typeStr = typeMatch[1].trim()
    if (typeStr.startsWith('[')) {
      return typeStr.replace(/\[|\]/g, '')
        .split(',')
        .map(t => normalizeType(t.trim()))
        .join(' | ')
    }
    return normalizeType(typeStr)
  }

  return inferTypeFromDefault(value)
}

/**
 * Helper: converts Vue basic types to TypeScript equivalents
 */
function normalizeType(type: string): string {
  switch (type) {
    case 'String': return 'string'
    case 'Number': return 'number'
    case 'Boolean': return 'boolean'
    case 'Array': return 'any[]'
    case 'Object': return 'Record<string, any>'
    case 'Function': return '(...args: any[]) => any'
    default: return type
  }
}

/**
 * Helper: infer type from default value when type not explicitly declared
 */
function inferTypeFromDefault(value?: string): string {
  if (!value) return 'any'
  if (/^["'`].*["'`]$/.test(value)) return 'string'
  if (/^\d+(\.\d+)?$/.test(value)) return 'number'
  if (/^(true|false)$/.test(value)) return 'boolean'
  if (value.startsWith('(') && value.slice(1).trim().startsWith('[')) return 'any[]'
  if (value.startsWith('[') || (value.startsWith('(') && value.includes('['))) return 'any[]'
  if (value.startsWith('{') || (value.startsWith('(') && value.includes('{'))) return 'Record<string, any>'
  return 'any'
}

function extractPropType(input: string, keyword: string): string | null {
  const index = input.indexOf(`${keyword}<`)
  if (index === -1) return null

  // Skip past 'PropType<'
  let i = index + keyword.length + 1
  let depth = 1
  let typeStr = ''

  while (i < input.length && depth > 0) {
    const char = input[i]
    if (char === '<') depth++
    else if (char === '>') depth--
    if (depth > 0) typeStr += char
    i++
  }

  return typeStr.trim()
}
