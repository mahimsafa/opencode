import { describe, expect, test } from "bun:test"
import { VoiceCapture } from "@/voice/capture"

describe("voice.capture", () => {
  test("recPath returns a path when sox is installed", () => {
    const path = VoiceCapture.recPath()
    if (!path) return
    expect(path.length).toBeGreaterThan(0)
  })

  test("ensureAvailable throws SoxMissingError when rec is missing", async () => {
    const original = process.env.PATH
    process.env.PATH = ""
    try {
      await expect(VoiceCapture.ensureAvailable()).rejects.toBeInstanceOf(VoiceCapture.SoxMissingError)
    } finally {
      process.env.PATH = original
    }
  })
})
