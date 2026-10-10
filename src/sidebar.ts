import * as vscode from "vscode";
import { loadSettings } from "./config";

function row(
  label: string,
  description: string,
  icon: string,
): vscode.TreeItem {
  const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
  item.description = description;
  item.iconPath = new vscode.ThemeIcon(icon);
  item.command = {
    command: "completeByLLM.openSettings",
    title: "Open Settings",
  };
  return item;
}

export class StatusProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;

  refresh(): void {
    this.changed.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const settings = loadSettings();
    return [
      row(
        "Status",
        settings.enabled ? "On" : "Off",
        settings.enabled ? "check" : "x",
      ),
      row("Provider", settings.provider, "server"),
      row("Model", settings.model, "symbol-method"),
      row("Server", settings.baseUrl, "link"),
    ];
  }
}
