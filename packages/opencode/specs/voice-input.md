# Voice input (TUI)

Local speech-to-text in the OpenCode terminal UI. Audio is captured with **sox**, transcribed with **whisper-cli** (whisper.cpp), and inserted into the prompt. Transcription runs on your machine; nothing is sent to a cloud STT API.

**Platform:** macOS only (current implementation).

---

## Prerequisites

Install these before using voice input:

| Requirement | Install | Verify |
|-------------|---------|--------|
| **sox** (includes `rec`) | `brew install sox` | `which rec` |
| **whisper-cpp** (includes `whisper-cli`) | `brew install whisper-cpp` | `which whisper-cli` |
| **Whisper model** (`.bin` file) | See [Model files](#model-files) | File exists on disk |

### Model files

If you do not set `voice.model_path` in `opencode.json`, OpenCode looks for a model in this order:

1. `OPENCODE_VOICE_MODEL_PATH` environment variable (if set)
2. Common local directories (for `base`, tries `ggml-base.bin` and `ggml-base.en.bin`):
   - `~/.local/share/opencode/voice/models/`
   - `~/rnd/whisper.cpp/models/`
   - `~/whisper.cpp/models/`
   - `~/Projects/whisper.cpp/models/`
3. Download `ggml-<size>.bin` into `~/.local/share/opencode/voice/models/` on first use

**Recommended:** point `voice.model_path` at a model you already have, for example:

```text
/Users/you/whisper.cpp/models/ggml-base.en.bin
```

### Quick check

From `packages/opencode`:

```bash
bun -e "
import { VoiceCapture } from './src/voice/capture.ts'
import { VoiceWhisper } from './src/voice/whisper.ts'
import { VoiceModel } from './src/voice/model.ts'
console.log('rec:', VoiceCapture.recPath())
console.log('whisper-cli:', VoiceWhisper.cliPath())
console.log('model:', await VoiceModel.resolve({ model: 'base' }))
await VoiceCapture.ensureAvailable()
console.log('OK')
"
```

---

## Running in dev

```bash
cd packages/opencode
bun dev
```

1. Focus the prompt (cursor in the input area).
2. Press **Ctrl+Shift+R** to start recording.
3. Speak, then press **Ctrl+Shift+R** again to stop and transcribe.
4. Edit the text in the prompt and submit as usual.

**Keyboard shortcut:** **Ctrl+Shift+R** (fixed; not configurable via config).

You can also run **`/voice`** from the command palette or slash autocomplete.

While recording you should see:

- Red **● REC** in the prompt footer
- Red prompt border
- Footer text: `Recording … · ctrl+shift+r to stop`

---

## Configuration (`opencode.json`)

All voice settings are configured under a top-level **`voice`** object in **`opencode.json`**.

### Where to put the file

| Scope | Path |
|-------|------|
| **Project** | `./opencode.json`, `./opencode.jsonc`, or `.opencode/opencode.json` (OpenCode walks up from the project directory) |
| **Global** | `~/.config/opencode/opencode.json` |

Project and global configs are merged; project values override global ones.

### Example

```json
{
  "$schema": "https://opencode.ai/config.json",
  "voice": {
    "enabled": true,
    "model": "base",
    "language": "en",
    "cli": "/opt/homebrew/bin/whisper-cli",
    "model_path": "/Users/you/whisper.cpp/models/ggml-base.en.bin"
  }
}
```

### Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Set to `false` to turn off voice input entirely. |
| `model` | `"tiny"` \| `"base"` \| `"small"` \| `"medium"` \| `"large"` | `"base"` | Which Whisper model size to use when `model_path` is not set. |
| `model_path` | `string` | *(not set)* | **Full path** to a `.bin` model file on your machine. When set, this overrides `model`. |
| `cli` | `string` | `whisper-cli` on your `PATH`, or `/opt/homebrew/bin/whisper-cli` | Path to the `whisper-cli` binary. |
| `language` | `string` | *(not set)* | Spoken language passed to whisper-cli (e.g. `"en"`). Omit to use whisper-cli’s default. |

### Minimal project config

If your model and tools are already on PATH:

```json
{
  "voice": {
    "model_path": "/Users/mahimsafa/rnd/whisper.cpp/models/ggml-base.en.bin"
  }
}
```

### Environment variable

Instead of `voice.model_path` in JSON, you can set:

```bash
export OPENCODE_VOICE_MODEL_PATH=/Users/you/whisper.cpp/models/ggml-base.en.bin
```

`model_path` in `opencode.json` takes precedence over this variable when both are set.

---

## Behavior

| State | Ctrl+Shift+R |
|-------|----------------|
| Idle | Start recording |
| Recording | Stop and transcribe |
| Transcribing | Cancel |

**Text insertion:**

- Empty prompt → transcribed text is inserted as the prompt content.
- Non-empty prompt → appends a new paragraph (`\n\n` + transcribed text).

Errors (missing sox, missing model, whisper failure) appear as TUI toast messages.

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| Nothing happens when pressing Ctrl+Shift+R | Prompt must be focused; `voice.enabled` must not be `false` |
| “Voice input requires sox…” | Run `brew install sox` |
| Whisper or model error | Set `voice.model_path` to your `.bin` file; verify `voice.cli` points to `whisper-cli` |
| Session rename opens instead | Session rename is **Ctrl+R**; voice is **Ctrl+Shift+R** |

---

## Implementation reference

| Area | Location |
|------|----------|
| Config schema | `packages/opencode/src/config/voice.ts` |
| Capture / whisper / model | `packages/opencode/src/voice/` |
| TUI integration | `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` |
