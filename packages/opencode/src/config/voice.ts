import { Schema } from "effect"

export const ModelSize = Schema.Literals(["tiny", "base", "small", "medium", "large"])
export type ModelSize = Schema.Schema.Type<typeof ModelSize>

export const Info = Schema.Struct({
  enabled: Schema.optional(Schema.Boolean).annotate({
    description: "Enable voice input in the TUI",
  }),
  model: Schema.optional(ModelSize).annotate({
    description: "Whisper model size to use for local transcription (default: base)",
  }),
  language: Schema.optional(Schema.String).annotate({
    description: "Spoken language hint for Whisper (BCP-47 code, or omit for auto-detect)",
  }),
  cli: Schema.optional(Schema.String).annotate({
    description: "Path to whisper-cli (default: whisper-cli on PATH, then /opt/homebrew/bin/whisper-cli)",
  }),
  model_path: Schema.optional(Schema.String).annotate({
    description: "Full path to a ggml model file (overrides model size)",
  }),
}).annotate({ identifier: "VoiceConfig" })
export type Info = Schema.Schema.Type<typeof Info>

export * as ConfigVoice from "./voice"
