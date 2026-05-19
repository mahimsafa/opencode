import { describe, expect, test } from "bun:test"
import { VoiceWhisper } from "@/voice/whisper"
import { VoiceModel } from "@/voice/model"

describe("voice.whisper", () => {
  test("cliPath prefers configured path", () => {
    expect(VoiceWhisper.cliPath("/custom/whisper-cli")).toBe("/custom/whisper-cli")
  })

  test("cliPath falls back to homebrew default when not on PATH", () => {
    const original = process.env.PATH
    process.env.PATH = ""
    try {
      expect(VoiceWhisper.cliPath()).toBe("/opt/homebrew/bin/whisper-cli")
    } finally {
      process.env.PATH = original
    }
  })

  test("modelPath maps sizes to ggml filenames", () => {
    expect(VoiceModel.modelPath("base")).toContain("ggml-base.bin")
    expect(VoiceModel.modelPath("large")).toContain("ggml-large-v3.bin")
  })

  test("resolve finds ggml-base.en.bin in whisper.cpp models dir", async () => {
    const model = "/Users/mahimsafa/rnd/whisper.cpp/models/ggml-base.en.bin"
    if (!(await Bun.file(model).exists())) return
    const resolved = await VoiceModel.resolve({ model: "base" })
    expect(resolved).toBe(model)
  })
})
