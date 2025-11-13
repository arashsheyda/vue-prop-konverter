import * as vscode from 'vscode'
import { parse } from '@vue/compiler-sfc'
import { isScriptSetupTs } from '../shared'
import { findObjectDefineProps } from './converter'

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
export function scanDocument(doc: vscode.TextDocument, diagnostics: vscode.DiagnosticCollection): void {
  if (doc.languageId !== 'vue') return

  const text = doc.getText()
  const sfc = parse(text)
  const scriptSetup = sfc.descriptor.scriptSetup

  if (!scriptSetup || !isScriptSetupTs(text)) return

  const nodes = findObjectDefineProps(scriptSetup.content)
  const foundDiagnostics: vscode.Diagnostic[] = []

    for (const node of nodes) {
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
    diagnostic.code = 'props.TypeSyntax'
    foundDiagnostics.push(diagnostic)
  }

  // Update diagnostics for the document
  diagnostics.set(doc.uri, foundDiagnostics)
}
