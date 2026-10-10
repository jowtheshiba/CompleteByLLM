import * as vscode from "vscode";

export type Provider = "lmstudio" | "ollama" | "openai";

export interface Settings {
  enabled: boolean;
  acceptMovesDown: boolean;
  provider: Provider;
  baseUrl: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  debounceMs: number;
  prefixChars: number;
  suffixChars: number;
}

function asProvider(value: unknown): Provider {
  if (value === "ollama") {
    return "ollama";
  }
  if (value === "openai") {
    return "openai";
  }
  return "lmstudio";
}

function asPositiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

function defaultBaseUrl(provider: Provider): string {
  if (provider === "ollama") {
    return "http://localhost:11434";
  }
  if (provider === "openai") {
    return "https://api.openai.com";
  }
  return "http://localhost:1234";
}

export function loadSettings(): Settings {
  const config = vscode.workspace.getConfiguration("completeByLLM");
  const provider = asProvider(config.get("provider"));
  const rawBaseUrl = String(config.get("baseUrl") ?? "").trim();
  const cleaned = rawBaseUrl
    .replace(/\/+$/, "")
    .replace(/\/v1$/, "");
  const baseUrl = cleaned ? cleaned : defaultBaseUrl(provider);
  return {
    enabled: config.get("enabled") !== false,
    acceptMovesDown: config.get("acceptMovesDown") !== false,
    provider,
    baseUrl,
    model: String(config.get("model") ?? "local-model"),
    apiKey: String(config.get("apiKey") ?? ""),
    maxTokens: asPositiveInt(config.get("maxTokens"), 128),
    temperature: typeof config.get("temperature") === "number"
      ? (config.get("temperature") as number)
      : 0,
    debounceMs: asPositiveInt(config.get("debounceMs"), 300),
    prefixChars: asPositiveInt(config.get("prefixChars"), 2000),
    suffixChars: asPositiveInt(config.get("suffixChars"), 500),
  };
}
