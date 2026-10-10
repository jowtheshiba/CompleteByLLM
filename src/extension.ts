import * as vscode from "vscode";
import { loadSettings } from "./config";
import { fetchCompletion } from "./llm";
import { StatusProvider } from "./sidebar";

function sleep(ms: number, token: vscode.CancellationToken): Promise<boolean> {
  return new Promise((resolve) => {
    if (ms <= 0 || token.isCancellationRequested) {
      resolve(token.isCancellationRequested);
      return;
    }
    const timer = setTimeout(() => {
      dispose();
      resolve(token.isCancellationRequested);
    }, ms);
    const disposable = token.onCancellationRequested(() => {
      clearTimeout(timer);
      dispose();
      resolve(true);
    });
    function dispose(): void {
      disposable.dispose();
    }
  });
}

export function activate(context: vscode.ExtensionContext): void {
  let settings = loadSettings();
  const status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  status.command = "completeByLLM.toggle";
  const output = vscode.window.createOutputChannel("Complete by LLM");
  let lastError: string | null = null;

  function refreshStatus(): void {
    if (lastError) {
      status.text = "$(warning) LLM: Error";
      status.tooltip =
        "Complete by LLM error: " +
        lastError +
        " Open Output > Complete by LLM for details. Click to toggle.";
    } else {
      status.text = settings.enabled ? "$(zap) LLM: On" : "$(zap) LLM: Off";
      status.tooltip =
        "Complete by LLM (" +
        settings.provider +
        ", " +
        settings.model +
        "). Click to toggle.";
    }
    status.show();
  }

  refreshStatus();

  const sidebar = new StatusProvider();
  context.subscriptions.push(
    status,
    output,
    vscode.window.registerTreeDataProvider(
      "completeByLLM.status",
      sidebar,
    ),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("completeByLLM")) {
        settings = loadSettings();
        lastError = null;
        refreshStatus();
        sidebar.refresh();
      }
    }),
    vscode.commands.registerCommand("completeByLLM.toggle", () => {
      settings.enabled = !settings.enabled;
      lastError = null;
      void vscode.workspace
        .getConfiguration("completeByLLM")
        .update(
          "enabled",
          settings.enabled,
          vscode.ConfigurationTarget.Global,
        );
      refreshStatus();
      sidebar.refresh();
      void vscode.window.showInformationMessage(
        settings.enabled
          ? "Complete by LLM enabled."
          : "Complete by LLM disabled.",
      );
    }),
    vscode.commands.registerCommand("completeByLLM.openSettings", () => {
      void vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "completeByLLM",
      );
    }),
    vscode.commands.registerCommand("completeByLLM.trigger", () => {
      void vscode.commands.executeCommand(
        "editor.action.inlineSuggest.trigger",
      );
    }),
    vscode.commands.registerCommand(
      "completeByLLM.acceptAndNextLine",
      async () => {
        await vscode.commands.executeCommand(
          "editor.action.inlineSuggest.commit",
        );
        if (settings.acceptMovesDown && vscode.window.activeTextEditor) {
          await vscode.commands.executeCommand("cursorDown");
        }
      },
    ),
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: "**" },
      {
        async provideInlineCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position,
          _context: vscode.InlineCompletionContext,
          token: vscode.CancellationToken,
        ): Promise<vscode.InlineCompletionItem[] | null> {
          if (!settings.enabled || token.isCancellationRequested) {
            return null;
          }
          const cancelled = await sleep(settings.debounceMs, token);
          if (cancelled || token.isCancellationRequested) {
            return null;
          }
          const full = document.getText();
          const offset = document.offsetAt(position);
          const prefix = full.slice(
            Math.max(0, offset - settings.prefixChars),
            offset,
          );
          const suffix = full.slice(
            offset,
            offset + settings.suffixChars,
          );
          if (!prefix.trim()) {
            return null;
          }
          const controller = new AbortController();
          const abort = token.onCancellationRequested(() =>
            controller.abort(),
          );
          try {
            const text = await fetchCompletion(
              prefix,
              suffix,
              document.languageId,
              settings,
              controller.signal,
            );
            if (!text || token.isCancellationRequested) {
              return null;
            }
            if (lastError) {
              lastError = null;
              refreshStatus();
            }
            return [
              new vscode.InlineCompletionItem(
                text,
                new vscode.Range(position, position),
              ),
            ];
          } catch (error) {
            if ((error as Error).name === "AbortError") {
              return null;
            }
            const message =
              error instanceof Error ? error.message : String(error);
            if (lastError !== message) {
              lastError = message;
              output.appendLine("Completion failed: " + message);
              refreshStatus();
            }
            return null;
          } finally {
            abort.dispose();
          }
        },
      },
    ),
  );
}

export function deactivate(): void {}
