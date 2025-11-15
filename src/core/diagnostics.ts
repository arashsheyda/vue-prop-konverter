import * as vscode from 'vscode'
import { parse } from '@vue/compiler-sfc'
import { isScriptSetupTs } from '../shared'
import { findObjectDefineProps } from './converter'

/**
 * Creates a VSCode diagnostic collection for for detecting outdated object-style defineProps usage inside Vue SFCs
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
export function scanDocument(doc: vscode.TextDocument, diagnostics: vscode.DiagnosticCollection): void {
  if (doc.languageId !== 'vue') return

  const text = doc.getText()
  const sfc = parse(text)
  const scriptSetup = sfc.descriptor.scriptSetup

  // Only process <script setup lang="ts">
  if (!scriptSetup || !isScriptSetupTs(text)) {
    diagnostics.set(doc.uri, [])
    return
  }

  // Find all defineProps({}) object-style occurrences in the script content
  const nodes = findObjectDefineProps(scriptSetup.content)
  const foundDiagnostics: vscode.Diagnostic[] = []

  for (const node of nodes) {
    // skip malformed nodes
    if (node.start == null || node.end == null) continue

    // offsets inside scriptSetup.content must be shifted by scriptSetup.loc.start.offset
    const startOffset = scriptSetup.loc.start.offset + (node.start ?? 0)
    const endOffset = scriptSetup.loc.start.offset + (node.end ?? 0)

    const range = new vscode.Range(
      doc.positionAt(startOffset),
      doc.positionAt(endOffset),
    )

    const diagnostic = new vscode.Diagnostic(
      range,
      'Object-style defineProps() used. Convert to type-safe variant.',
      vscode.DiagnosticSeverity.Information,
    )

    // Used by the CodeActionProvider to trigger fixes
    diagnostic.code = 'props.TypeSyntax'

    foundDiagnostics.push(diagnostic)
  }

  // Update all diagnostics for this document
  diagnostics.set(doc.uri, foundDiagnostics)
}
