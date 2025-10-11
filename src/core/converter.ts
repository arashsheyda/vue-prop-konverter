import type { PropDefinition } from '../types'
import {
  extractDefaultValue,
  extractProps,
  findMatchesDefineProps,
  inferTypeFromValueOrValueToken,
  isPropRequired,
} from '../utils'

/**
 * Converts object-style `defineProps({})` to type-safe, destructured TypeScript syntax.
 * Handles:
 * - Required vs optional props
 * - Default values
 * - Type inference from PropType, type field, or default value
 * - Multi-line formatting if destructure is long
 * 
 * @param source The original code containing `defineProps({})`
 * @returns The converted, type-safe defineProps string
 */
export function convertProps(source: string): string {
  const text = source

  // Find first defineProps match
  const matches = findMatchesDefineProps(text)
  if (matches.length === 0) return source

  const m = matches[0]
  const body = text.slice(m.openBrace + 1, m.closeBrace)

  // Extract individual prop definitions
  const propsList = extractProps(body)
  const propsParsed: PropDefinition[] = []

  for (const p of propsList) {
    // Clean quotes from prop name
    const name = p.name.replace(/^['"`](.+)['"`]$/, '$1')
    const valueBlock = p.value

    // Determine if prop is required
    const required = isPropRequired(valueBlock)

    // Extract default value if available
    const defaultValue = extractDefaultValue(valueBlock) ?? (
      /^[^{}[\n]/.test(valueBlock) ? valueBlock : undefined
    )

    // Infer TypeScript type
    const type = inferTypeFromValueOrValueToken(defaultValue ?? '', valueBlock)

    propsParsed.push({
      name,
      type,
      required,
      defaultValue,
      comment: p.comment,
    })
  }

  // Build TypeScript type block for defineProps<{}>()
  const tsLines = propsParsed.map(p => {
    const isOptional = p.defaultValue !== undefined || p.required === false
    const line = `${p.name}${isOptional ? '?' : ''}: ${p.type}`

    if (p.comment) {
      const lines = p.comment.split('\n')
      const formattedComment = lines
        .map((line, idx) => (idx === 0 ? line.trimStart() : `  ${line.trim()}`)) // first line not extra indented
        .join('\n')
      return `${formattedComment}\n  ${line}` // prop line stays 2 spaces
    }
    return line
  })

  // Build destructured assignment parts with defaults
  const destructureParts = propsParsed.map(p => {
    if (p.defaultValue !== undefined) return `${p.name} = ${p.defaultValue}`
    return p.name
  })

  // Preserve original indentation
  const lineStart = text.lastIndexOf('\n', m.start) + 1
  const indentMatch = text.slice(lineStart, m.start).match(/^\s*/)
  const indent = indentMatch ? indentMatch[0] : ''

  // Detect original declaration keyword (const|let|var)
  const declMatch = m.prefix.match(/\b(const|let|var)\b/)
  const decl = declMatch ? declMatch[1] : 'const'

  // Construct final replacement string
  let replacement = ''

  if (destructureParts.length === 0) {
    // No destructured props, just type-safe defineProps
    const hasVar = /\b(const|let|var)\s+[A-Za-z0-9_$]+\s*=/.test(m.prefix)
    const varNameMatch = m.prefix.match(/\b(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*$/)
    const varName = varNameMatch ? varNameMatch[1] : 'props'
    replacement = hasVar
      ? `${indent}${decl} ${varName} = defineProps<{\n${tsLines.map(l => `${indent}  ${l}`).join('\n')}\n${indent}}>()`
      : `${indent}defineProps<{\n${tsLines.map(l => `${indent}  ${l}`).join('\n')}\n${indent}}>()`
  } else {
    // Destructured assignment
    const multiline = destructureParts.join(', ').length > 60 || destructureParts.length > 1
    if (multiline) {
      const destructured = destructureParts.map(p => `${indent}  ${p},`).join('\n')
      replacement = `${indent}${decl} {\n${destructured}\n${indent}} = defineProps<{\n${tsLines.map(l => `${indent}  ${l}`).join('\n')}\n${indent}}>()`
    } else {
      replacement = `${indent}${decl} { ${destructureParts.join(', ')} } = defineProps<{\n${tsLines.map(l => `${indent}  ${l}`).join('\n')}\n${indent}}>()`
    }
  }

  return replacement
}
