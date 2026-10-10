import type { Settings } from "./config";

function stripFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  const lines = trimmed.split("\n");
  const start = lines[0].startsWith("```") ? 1 : 0;
  let end = lines.length;
  if (lines[lines.length - 1].trim().startsWith("```")) {
    end = lines.length - 1;
  }
  return lines.slice(start, end).join("\n").trim();
}

function trimOverlap(prefix: string, completion: string): string {
  const max = Math.min(prefix.length, completion.length, 200);
  for (let len = max; len > 0; len--) {
    if (completion.startsWith(prefix.slice(prefix.length - len))) {
      return completion.slice(len);
    }
  }
  return completion;
}

async function chatCompletion(
  prefix: string,
  suffix: string,
  languageId: string,
  settings: Settings,
  signal: AbortSignal,
): Promise<string> {
  const endpoint = settings.baseUrl + "/v1/chat/completions";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.apiKey) {
    headers["Authorization"] = "Bearer " + settings.apiKey;
  }
  const body = {
    model: settings.model,
    stream: false,
    max_tokens: settings.maxTokens,
    temperature: settings.temperature,
    messages: [
      {
        role: "system",
        content:
          "You are a code autocomplete engine. Output only the exact code that continues at the cursor. No explanations. No markdown fences. Keep style consistent with the prefix.",
      },
      {
        role: "user",
        content:
          "Language: " +
          languageId +
          "\n< PREFIX >\n" +
          prefix +
          "\n< CURSOR >\n< SUFFIX >\n" +
          suffix,
      },
    ],
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new Error("Request failed: " + String(response.status));
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function ollamaGenerate(
  prefix: string,
  suffix: string,
  languageId: string,
  settings: Settings,
  signal: AbortSignal,
): Promise<string> {
  const endpoint = settings.baseUrl + "/api/generate";
  const body = {
    model: settings.model,
    prompt: prefix,
    suffix: suffix,
    system:
      "You are a code autocomplete engine for " +
      languageId +
      ". Output only the exact code that continues at the cursor. No explanations.",
    stream: false,
    options: {
      num_predict: settings.maxTokens,
      temperature: settings.temperature,
    },
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new Error("Request failed: " + String(response.status));
  }
  const data = (await response.json()) as { response?: string };
  return data.response ?? "";
}

export async function fetchCompletion(
  prefix: string,
  suffix: string,
  languageId: string,
  settings: Settings,
  signal: AbortSignal,
): Promise<string | null> {
  if (settings.provider === "ollama") {
    const generated = await ollamaGenerate(
      prefix,
      suffix,
      languageId,
      settings,
      signal,
    );
    const direct = trimOverlap(prefix, generated).replace(/^\s*\n/, "");
    return direct ? direct : null;
  }
  const raw = await chatCompletion(
    prefix,
    suffix,
    languageId,
    settings,
    signal,
  );
  const cleaned = trimOverlap(prefix, stripFences(raw));
  const result = cleaned.replace(/^\s*\n/, "");
  return result ? result : null;
}
