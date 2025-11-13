import * as babel from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'
import { PropDefinition } from '../types'
import type { NodePath } from '@babel/traverse'

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
 */
export function convertProps(scriptContent: string): string {
  const nodes = findObjectDefineProps(scriptContent)
  if (!nodes.length) return scriptContent

  // Find the first defineProps() call
  const firstNode = nodes[0]

  let callExpr: t.CallExpression | undefined

  if (t.isVariableDeclaration(firstNode)) {
    const declarator = firstNode.declarations[0]
    if (
      declarator.init &&
      t.isCallExpression(declarator.init) &&
      t.isIdentifier(declarator.init.callee, { name: 'defineProps' })
    ) {
      callExpr = declarator.init
    }
  } else if (t.isCallExpression(firstNode)) {
    callExpr = firstNode
  }

  if (!callExpr) return scriptContent
  if (callExpr.arguments.length !== 1) return scriptContent

  const arg = callExpr.arguments[0]
  if (!t.isObjectExpression(arg)) return scriptContent

  const props: PropDefinition[] = []

  for (const prop of arg.properties) {
    if (t.isObjectProperty(prop) && (t.isIdentifier(prop.key) || t.isStringLiteral(prop.key))) {
      const name = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value
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

  // collapse simple object literals to single line
  try {
    const obj = new Function(`return ${code}`)()
    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj)
      if (keys.length && keys.every(k => typeof obj[k] !== 'object')) {
        // simple object: keep one line
        const parts = keys.map(k => `${k}: ${JSON.stringify(obj[k]).replace(/"/g, '\'')}`)
        code = `{ ${parts.join(', ')} }`
      }
    }
  } catch {
    // fallback: leave as-is if parsing fails
  }

  return code
}

function indentTypeLines(typeStr: string, indent: string) {
  const lines = typeStr.split('\n')
  return lines
    .map((line, i) => (i === 0 ? line : indent + '  ' + line))
    .join('\n')
}
