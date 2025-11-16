import * as vscode from 'vscode'
import { createDiagnosticCollection, scanDocument } from '~/core/diagnostics'
import { propFixProvider } from '~/core/actions'

/**
 * This method is called when the extension is activated.
 * Activation occurs the first time a command is executed
 * or when a relevant file is opened (here: `.vue` files).
 *
 * @param context - The VS Code extension context
 */
export function activate(context: vscode.ExtensionContext) {
  // Create a diagnostic collection for tracking defineProps issues
  const diagnostics = createDiagnosticCollection()
  context.subscriptions.push(diagnostics)

  // Register the code action provider for Vue files
  // This enables the QuickFix lightbulb for suggested prop conversions
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('vue', propFixProvider, {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }),
  )

  // Initial scan: Check all open documents for old-style defineProps
  vscode.workspace.textDocuments.forEach(doc => scanDocument(doc, diagnostics))

  // Listen for document open and change events
  // Re-scan the document whenever it is opened or edited
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(doc => scanDocument(doc, diagnostics)),
    vscode.workspace.onDidChangeTextDocument(e => scanDocument(e.document, diagnostics)),
  )
}

/**
 * This method is called when the extension is deactivated.
 * Clean-up logic can go here if necessary.
 */
export function deactivate() {}
