import * as vscode from 'vscode'
import { findMatching } from '../utils'

/**
 * Creates a VSCode diagnostic collection for this extension.
 * 
 * @returns A DiagnosticCollection instance
 */
export function createDiagnosticCollection(): vscode.DiagnosticCollection {
  return vscode.languages.createDiagnosticCollection('vuePropKonverter')
}

/**
 * Scans a Vue document for object-style defineProps usage and adds diagnostics.
 * Only runs inside `<script setup lang="ts">` blocks.
 * 
 * @param doc The text document to scan
 * @param diagnostics The diagnostic collection to update
 */
export function scanDocument(
  doc: vscode.TextDocument,
  diagnostics: vscode.DiagnosticCollection,
) {
  if (doc.languageId !== 'vue') return

  const text = doc.getText()
  const foundDiagnostics: vscode.Diagnostic[] = []

  // Regex to detect object-style defineProps
  const regex = /(?:const\s+\w+\s*=\s*)?defineProps\s*\(/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text))) {
    const start = match.index
    const openParen = text.indexOf('(', start + match[0].length - 1)
    if (openParen < 0) continue

    const closeParen = findMatching(text, openParen, '(', ')')
    if (closeParen < 0) continue

    // Map string indices to VSCode positions
    const startPos = doc.positionAt(start)
    const endPos = doc.positionAt(closeParen + 1)
    const range = new vscode.Range(startPos, endPos)

    // Only flag inside TypeScript `<script setup>`
    const isScriptTs = /<script\s+setup\s+lang=["']ts["']/.test(text)
    if (!isScriptTs) continue

    const diagnostic = new vscode.Diagnostic(
      range,
      'Object-style defineProps() used. Convert to type-safe variant.',
      vscode.DiagnosticSeverity.Information,
    )
    diagnostic.code = 'props.TypeSyntax'
    foundDiagnostics.push(diagnostic)
  }

  // Update diagnostics for the document
  diagnostics.set(doc.uri, foundDiagnostics)
}
