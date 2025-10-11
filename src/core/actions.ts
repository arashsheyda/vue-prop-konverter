import * as vscode from 'vscode'
import { convertProps } from '../core/converter'
import { isScriptSetupTs } from '../shared'

/**
 * Provides quick fixes for Vue defineProps conversion.
 * Converts object-style defineProps({}) to type-safe defineProps<{}>()
 * and replaces props.<name> usages with direct variable references.
 */
export const propFixProvider: vscode.CodeActionProvider = {
  /**
   * Provide code actions (quick fixes) for the given diagnostics.
   * 
   * @param document The document where the command was invoked
   * @param range The range where the command was invoked
   * @param context Context containing diagnostics
   * @returns An array of vscode.CodeAction objects
   */
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = []

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.code !== 'props.TypeSyntax') continue

      const fullText = document.getText()
      
      // Only flag inside TypeScript `<script setup>`
      if (!isScriptSetupTs(fullText)) continue

      const oldCode = document.getText(diagnostic.range)
      const replacement = convertProps(oldCode)

      // Extract prop names from the converted code
      const propsMatch = replacement.match(/\{\s*([\s\S]*?)\s*\}\s*=\s*defineProps/)
      const propsUsed = new Set<string>()

      if (propsMatch && propsMatch[1]) {
        const regex = /\b([A-Za-z0-9_$]+)\b(?=\s*(?:=|,|$))/g
        let m: RegExpExecArray | null
        while ((m = regex.exec(propsMatch[1]))) propsUsed.add(m[1])
      }

      // Create a new QuickFix action
      const fix = new vscode.CodeAction(
        'Convert to type-safe defineProps()',
        vscode.CodeActionKind.QuickFix,
      )
      fix.diagnostics = [diagnostic]
      fix.edit = new vscode.WorkspaceEdit()

      // 1️⃣ Replace the old defineProps with the type-safe version
      fix.edit.replace(document.uri, diagnostic.range, replacement)

      // 2️⃣ Replace `props.<name>` usages in the document with direct variable references
      const originalText = document.getText()
      for (const prop of propsUsed) {
        const re = new RegExp(`\\bprops\\.${prop}\\b`, 'g')
        let match: RegExpExecArray | null
        while ((match = re.exec(originalText))) {
          fix.edit.replace(
            document.uri,
            new vscode.Range(
              document.positionAt(match.index),
              document.positionAt(match.index + match[0].length),
            ),
            prop,
          )
        }
      }

      actions.push(fix)
    }

    return actions
  },
}
