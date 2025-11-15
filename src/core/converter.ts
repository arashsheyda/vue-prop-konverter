import * as babel from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'
import { PropDefinition } from '../types'
import type { NodePath } from '@babel/traverse'

/**
 * Finds all object-style defineProps({}) usages in the given script content.
 * 
 * @param scriptContent The content of the <script setup> block
 * @returns An array of VariableDeclaration or CallExpression nodes
 */
export function findObjectDefineProps(scriptContent: string): Array<t.VariableDeclaration | t.CallExpression> {
  const ast = babel.parse(scriptContent, {
    sourceType: 'module',
    plugins: ['typescript'],
  })

  const nodes: Array<t.VariableDeclaration | t.CallExpression> = []

  traverse(ast, {
    CallExpression(path: NodePath<t.CallExpression>) {
      if (
        t.isIdentifier(path.node.callee, { name: 'defineProps' }) &&
        path.node.arguments.length === 1 &&
        t.isObjectExpression(path.node.arguments[0])
      ) {
        // See if the call is assigned: const props = defineProps(...)
        const declaratorPath = path.findParent(p => p.isVariableDeclarator()) as
          | NodePath<t.VariableDeclarator>
          | null

        if (declaratorPath) {
          const declarationPath = declaratorPath.parentPath
          if (declarationPath?.isVariableDeclaration()) {
            nodes.push(declarationPath.node)
            return
          }
        }

        // Otherwise, push the bare call
        nodes.push(path.node)
      }
    },
  })

  return nodes
}

/**
 * Converts object-style defineProps to type-safe defineProps<{}>().
 * Removes "props =" binding if default values exist.
 * 
 * @param scriptContent The content of the <script setup> block
 * @returns The converted defineProps code as a string
 */
export function convertProps(scriptContent: string): string {
  const nodes = findObjectDefineProps(scriptContent)
  if (!nodes.length) return scriptContent

    const target = nodes[0]

  let callExpr: t.CallExpression | undefined

  if (t.isVariableDeclaration(target)) {
    const declarator = target.declarations[0]
    if (
      declarator.init &&
      t.isCallExpression(declarator.init) &&
      t.isIdentifier(declarator.init.callee, { name: 'defineProps' })
    ) {
      callExpr = declarator.init
    }
  } else if (t.isCallExpression(target)) {
    callExpr = target
  }

  if (!callExpr || callExpr.arguments.length !== 1) return scriptContent

  const arg = callExpr.arguments[0]
  if (!t.isObjectExpression(arg)) return scriptContent

  const props: PropDefinition[] = []

  for (const prop of arg.properties) {
    if (t.isObjectProperty(prop) && (t.isIdentifier(prop.key) || t.isStringLiteral(prop.key))) {
              let name: string

  if (t.isIdentifier(prop.key)) {
    name = prop.key.name
  } else if (t.isStringLiteral(prop.key)) {
    // Normalize weird keys:
    // "weird-key" → weirdKey
    // "some key" → someKey
    // "🔥value🔥" → value
    name = normalizePropKey(prop.key.value)
  } else {
    continue
  }
      let defaultValue: string | undefined
      let required = false
      let type = 'any'
      let comment: string | undefined

      if (t.isObjectExpression(prop.value)) {
        for (const p of prop.value.properties) {
          if (t.isObjectProperty(p) && t.isIdentifier(p.key)) {
            const keyName = p.key.name
            if (keyName === 'default') defaultValue = generate(p.value).code
            if (keyName === 'required' && t.isBooleanLiteral(p.value)) required = p.value.value
            if (keyName === 'type') type = extractTypeFromNode(p.value)
          }
        }
      } else if (t.isIdentifier(prop.value)) {
        const builtinTypes = ['String', 'Number', 'Boolean', 'Array', 'Object', 'Function']

        if (builtinTypes.includes(prop.value.name)) {
          // Shorthand type syntax (title: String)
          type = extractTypeFromNode(prop.value)
        } else {
          // treat as default if it's not one of the known constructors
          defaultValue = generate(prop.value).code
        }
      } else {
        defaultValue = generate(prop.value).code
      }

      if (prop.leadingComments?.length) {
        const commentTexts = prop.leadingComments.map(c => c.value.trimStart())
        // Preserve /** ... */ JSDoc blocks as-is, not converting them to `//`
        if (prop.leadingComments.some(c => c.type === 'CommentBlock' && c.value.startsWith('*'))) {
          comment = '/*' + commentTexts.join('\n') + '*/'
        } else {
          // Fallback for normal line comments
          comment = commentTexts.map(c => (c.startsWith('*') ? `/*${c}*/` : `// ${c}`)).join('\n')
        }
      }


      props.push({ name, type, required, defaultValue, comment })
    }
  }

  const destructureParts = props.map(p => p.defaultValue ? `${p.name} = ${normalizeDefault(p.defaultValue)}` : p.name)

  const multiline = destructureParts.join(', ').length > 60 || destructureParts.length > 1

  const destructureBlock = multiline ? `{\n  ${destructureParts.join(',\n  ')}\n}` : `{ ${destructureParts.join(', ')} }`


  const destructureLines = destructureBlock.split('\n')
  const baseIndent = destructureLines[0].match(/^\s*/)?.[0] ?? ''


  const hasDefaults = props.some(p => p.defaultValue)

  const tsBlockIndented = props
    .map((p, i) => {
      // TODO: fix the issue with multi line jsdoc comment indents
      const typeIndented = indentTypeLines(p.type, baseIndent)
      const comment = p.comment ? p.comment.split('\n').map((line, ci) => (i === 0 && ci === 0 ? line : baseIndent + '  ' + line)).join('\n') + '\n' : ''
      const line = (i === 0 && !comment ? '' : baseIndent + '  ') + `${p.name}${!p.required ? '?' : ''}: ${typeIndented}`
      return comment + line
    })
    .join('\n')

  const replacement = hasDefaults
    ? `const ${destructureBlock} = defineProps<{\n  ${tsBlockIndented}\n}>()`
    : `const props = defineProps<{\n  ${tsBlockIndented}\n}>()`

  return replacement
}

/** Extracts a TypeScript type string from a Babel AST node.
 * 
 * @param node The Babel AST node representing the type
 * @returns The extracted type as a string
 */
function extractTypeFromNode(node: t.Node): string {
  if (t.isIdentifier(node)) {
    switch (node.name) {
      case 'String':
        return 'string'
      case 'Number':
        return 'number'
      case 'Boolean':
        return 'boolean'
      case 'Array':
        return 'any[]'
      case 'Object':
        return 'Record<string, any>'
      case 'Function':
        return '(...args: any[]) => any'
      default:
        return node.name
    }
  }

  // Handle PropType<Type>
  if (
    t.isTSAsExpression(node) &&
    t.isTSTypeReference(node.typeAnnotation) &&
    t.isIdentifier(node.typeAnnotation.typeName, { name: 'PropType' }) &&
    node.typeAnnotation.typeParameters?.params.length
  ) {
    return generate(node.typeAnnotation.typeParameters.params[0]).code
  }

  return 'any'
}

/**
 * Normalizes default value code by removing unnecessary wrappers
 * and converting object-literals with numeric keys into array-literals.
 * 
 * @param code The original default value code
 * @returns The normalized default value code
 */
function normalizeDefault(code: string): string {
  // remove arrow function wrapper
  if (code.startsWith('() =>')) {
    code = code.replace(/^\(\)\s*=>\s*/, '')
  }

  // remove wrapping parentheses from Object type: ({ ... }) -> { ... }
  if (code.startsWith('(') && code.endsWith(')')) {
    const inside = code.slice(1, -1).trim()
    if (inside.startsWith('{') && inside.endsWith('}')) {
      code = inside
    }
  }

  // Try to parse with Babel to reliably detect arrays or object-literals
  try {
    // Wrap in parentheses to make single expressions parse cleanly
    const parsed = babel.parse(`(${code})`, {
      sourceType: 'module',
      plugins: ['typescript'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

    // drill down to the expression node
    let expr = parsed.program?.body?.[0]?.expression
    if (!expr) throw new Error('no-expression')

    // Unwrap ParenthesizedExpression if present
    if (expr.type === 'ParenthesizedExpression') expr = expr.expression

    // If it's already an ArrayExpression, return a pretty array literal
    if (expr.type === 'ArrayExpression') {
      // Use generator to keep formatting consistent with other outputs
      return generate(expr).code
    }

    // If it's an ObjectExpression, check whether keys are numeric indexes
    if (expr.type === 'ObjectExpression') {
      const props = expr.properties

      // Ensure every property is a simple property with numeric-like key
      const numericEntries: Array<string | undefined> = []
      let allNumericKeys = props.length > 0

      for (const p of props) {
        if (p.type !== 'ObjectProperty') {
          allNumericKeys = false
          break
        }

        // Accept NumericLiteral keys or string literals that are digits: '0', '1', ...
        let keyIndex: number | null = null
        if (p.key.type === 'NumericLiteral') {
          keyIndex = p.key.value
        } else if (p.key.type === 'StringLiteral' && /^[0-9]+$/.test(p.key.value)) {
          keyIndex = parseInt(p.key.value, 10)
        } else {
          allNumericKeys = false
          break
        }

        // store generated value at the numeric index
        if (keyIndex) {
          numericEntries[keyIndex] = generate(p.value).code
        }
      }

      // If all keys were numeric and we have a dense 0..n set, convert to array literal
      if (allNumericKeys) {
        // find max index and verify contiguous 0..max
        const maxIndex = numericEntries.length - 1
        let contiguous = true
        for (let i = 0; i <= maxIndex; i++) {
          if (numericEntries[i] === undefined) {
            contiguous = false
            break
          }
        }

        if (contiguous) {
          return `[${numericEntries.join(', ')}]`
        }
      }

      // Not numeric-contiguous: fallthrough to later heuristics (maybe keep object)
    }
  } catch {
    // parsing failed -> fall back to older heuristics below
  }

  // Fallback heuristic: collapse simple objects to single-line using runtime eval.
  // This handles cases like `{ a: 1, b: 2 }` and turns them into "{ a: 1 }" one-liners.
  try {
    const obj = new Function(`return ${code}`)()
    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj)
      if (keys.length && keys.every(k => typeof obj[k] !== 'object')) {
        // simple object: keep one line and use single quotes for strings to match existing formatting
        const parts = keys.map(k => `${k}: ${JSON.stringify(obj[k]).replace(/"/g, '\'')}`)
        return `{ ${parts.join(', ')} }`
      }
    }
  } catch {
    // leave as-is if runtime parsing fails
  }

  return code
}

/**
 * Indents all lines of a type string except the first line.
 * 
 * @param typeStr The type string to indent
 * @param indent The indent string to use
 * @returns The indented type string
 */
function indentTypeLines(typeStr: string, indent: string) {
  const lines = typeStr.split('\n')
  return lines
    .map((line, i) => (i === 0 ? line : indent + '  ' + line))
    .join('\n')
}

/**
 * Normalizes a prop key string by removing non-alphanumeric characters
 * and converting to camelCase.
 * 
 * @param key The original prop key string
 * @returns The normalized prop key
 */
function normalizePropKey(key: string): string {
  // remove anything not alphanumeric or whitespace
  const cleaned = key.replace(/[^a-zA-Z0-9 ]+/g, ' ').trim()
  // convert to camelCase
  return cleaned
    .split(/\s+/)
    .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
}
