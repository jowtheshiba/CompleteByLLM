# Complete by LLM

Minimal VS Code code autocomplete powered by a local or remote LLM.

## Providers

- LM Studio (default, `http://localhost:1234`) via OpenAI-compatible `POST {baseUrl}/v1/chat/completions`.
- Ollama (`http://localhost:11434`) via native `POST {baseUrl}/api/generate` with fill-in-the-middle (`prompt` + `suffix`), which suits base code models.
- OpenAI (`https://api.openai.com`) or any OpenAI-compatible server (vLLM, llama.cpp, OpenRouter) via `POST {baseUrl}/v1/chat/completions`. Set `apiKey` when the server needs a Bearer token.

## Setup

1. Start a model:
   - LM Studio: load a model and start the server.
   - Ollama: run `ollama serve`, then `ollama pull qwen2.5-coder:1.5b` (or any code model; `-base` variants also work).
   - OpenAI-compatible: set `provider` to `openai`, `baseUrl` to the server URL, `model` to the model name, and `apiKey` if needed.
2. Install dependencies and build:
   ```sh
   npm install
   npm run compile
   ```
3. Press `F5` to run the extension in a new window.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `completeByLLM.enabled` | `true` | Enable or disable autocomplete |
| `completeByLLM.acceptMovesDown` | `true` | Move cursor to the next line after accepting with Tab |
| `completeByLLM.provider` | `"lmstudio"` | `"lmstudio"`, `"ollama"`, or `"openai"` |
| `completeByLLM.baseUrl` | `""` | Custom base URL, empty means provider default; a trailing `/v1` is accepted |
| `completeByLLM.model` | `"local-model"` | Model name |
| `completeByLLM.apiKey` | `""` | Optional Bearer token |
| `completeByLLM.maxTokens` | `128` | Max completion tokens |
| `completeByLLM.temperature` | `0` | Sampling temperature |
| `completeByLLM.debounceMs` | `300` | Delay after typing stops |
| `completeByLLM.prefixChars` | `2000` | Context before cursor |
| `completeByLLM.suffixChars` | `500` | Context after cursor |

## Commands

- `Complete by LLM: Toggle Autocomplete`
- `Complete by LLM: Trigger Suggestion`
- `Complete by LLM: Open Settings`
- `Complete by LLM: Accept Suggestion and Move Down`

Ghost suggestions appear as you type. Press `Tab` to accept, the cursor moves to the next line. Click the `LLM: On/Off` status bar item to toggle.

## Sidebar

The activity bar icon opens a Status view with provider, model, and server, plus quick actions in the title bar: trigger suggestion, toggle, and open settings. Clicking a row opens the settings.

## Troubleshooting

- No suggestions: check the status bar. `LLM: Error` means the request failed, hover it and open `Output > Complete by LLM` for details.
- Make sure `provider` matches your running server (`lmstudio` uses port 1234, `ollama` uses port 11434).
- `404` from Ollama usually means the model is not pulled. Run `ollama list` and set `model` to an exact local name.
- Type in the Extension Development Host window when testing with `F5`, not in your main window.
- Suggestions need existing code before the cursor; empty files produce nothing.
