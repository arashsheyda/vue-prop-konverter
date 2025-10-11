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

  // Clean arrow functions
  if (def.startsWith('() =>')) {
    def = def.replace(/^\(\)\s*=>\s*/, '').trim()
    if (def.startsWith('{') || def.startsWith('[')) def = `(${def})`
  } else if (def.startsWith('{') || def.startsWith('[')) {
    def = `(${def})`
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
    // Skip whitespace and commas
    while (i < n && /[\s,]/.test(body[i])) i++
    if (i >= n) break

    // Gather any comments before this prop
    const commentLines: string[] = []
    let foundComment = true

    // Capture consecutive comment blocks
    while (foundComment) {
      foundComment = false

      // Single-line comment
      if (body.slice(i, i + 2) === '//') {
        const end = body.indexOf('\n', i)
        const comment = body.slice(i, end >= 0 ? end : n).trim()
        commentLines.push(comment)
        i = end >= 0 ? end + 1 : n
        foundComment = true
        continue
      }

      // Multi-line comment
      if (body.slice(i, i + 2) === '/*') {
        const end = body.indexOf('*/', i)
        if (end !== -1) {
          const comment = body.slice(i, end + 2).trim()
          commentLines.push(comment)
          i = end + 2
          foundComment = true
          continue
        } else {
          i = n
          break
        }
      }
    }

    // Skip any whitespace after comments
    while (i < n && /\s/.test(body[i])) i++
    if (i >= n) break

    let name = ''
    // eslint-disable-next-line quotes
    if (`"'`.includes(body[i])) {
      const quote = body[i++]
      const start = i
      while (i < n && body[i] !== quote) {
        if (body[i] === '\\') i++ // skip escape
        i++
      }
      name = body.slice(start, i)
      i++ // skip closing quote
    } else {
      const start = i
      while (i < n && /[A-Za-z0-9_$]/.test(body[i])) i++
      name = body.slice(start, i)
    }

    // Skip whitespace
    while (i < n && /\s/.test(body[i])) i++
    if (body[i] !== ':') {
      // Not a prop (maybe spread or malformed), skip line
      const nl = body.indexOf('\n', i)
      i = nl === -1 ? n : nl + 1
      continue
    }

    i++ // skip ':'

    // Extract value block
    const valueStart = i
    let depth = 0
    let inString: string | null = null

    while (i < n) {
      const ch = body[i]

      if (inString) {
        if (ch === '\\' && i + 1 < n) i++
        else if (ch === inString) inString = null
      } else {
        // eslint-disable-next-line quotes
        if (`"'`.includes(ch)) inString = ch
        else if ('{[('.includes(ch)) depth++
        else if ('}])'.includes(ch)) depth = Math.max(0, depth - 1)
        else if (depth === 0) {
          // Inline comments
          if (body.slice(i, i + 2) === '//') {
            const end = body.indexOf('\n', i)
            const comment = body.slice(i, end >= 0 ? end : n).trim()
            commentLines.push(comment)
            i = end >= 0 ? end + 1 : n
            continue
          } else if (body.slice(i, i + 2) === '/*') {
            const end = body.indexOf('*/', i)
            if (end === -1) break
            const comment = body.slice(i, end + 2).trim()
            commentLines.push(comment)
            i = end + 2
            continue
          }

          // End of this prop (top-level comma)
          if (ch === ',') break
        }
      }
      i++
    }

    const value = body.slice(valueStart, i).trim()

    // Merge all comments
    const comment = commentLines.length ? commentLines.join('\n') : undefined

    out.push({ name, value, comment })

    // Skip comma
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
