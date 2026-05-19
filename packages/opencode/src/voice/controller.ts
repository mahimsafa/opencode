import type { ConfigVoice } from "@/config/voice"
import { VoiceCapture } from "./capture"
import { VoiceWhisper } from "./whisper"

export type State = "idle" | "recording" | "transcribing"

export type Event =
  | { type: "state"; state: State; startedAt?: number }
  | { type: "transcription"; text: string }
  | { type: "error"; message: string }

export type Options = {
  enabled: boolean
  model: ConfigVoice.ModelSize
  language?: string
  cli?: string
  model_path?: string
  onProgress?: (loaded: number, total: number) => void
}

export function create(options: Options) {
  let state: State = "idle"
  let startedAt = 0
  let capture: VoiceCapture.Handle | undefined
  let generation = 0
  const listeners = new Set<(event: Event) => void>()

  function emit(event: Event) {
    listeners.forEach((listener) => listener(event))
  }

  function setState(next: State) {
    state = next
    emit({ type: "state", state: next, startedAt: next === "recording" ? startedAt : undefined })
  }

  async function toggle() {
    if (!options.enabled) return

    if (state === "idle") {
      await startRecording()
      return
    }

    if (state === "recording") {
      await stopRecording()
      return
    }

    if (state === "transcribing") {
      cancel()
    }
  }

  async function startRecording() {
    if (state !== "idle") return

    try {
      await VoiceCapture.ensureAvailable()
    } catch (error) {
      emit({
        type: "error",
        message: error instanceof Error ? error.message : "Voice capture is unavailable",
      })
      return
    }

    capture = await VoiceCapture.start()
    startedAt = Date.now()
    setState("recording")
  }

  async function stopRecording() {
    if (state !== "recording" || !capture) return

    const handle = capture
    capture = undefined
    const wav = await VoiceCapture.stop(handle)
    setState("transcribing")

    const run = ++generation
    try {
      const text = await VoiceWhisper.transcribe(wav, {
        model: options.model,
        model_path: options.model_path,
        language: options.language,
        cli: options.cli,
      })
      if (run !== generation) return
      if (!text) {
        emit({ type: "error", message: "No speech detected" })
        setState("idle")
        return
      }
      emit({ type: "transcription", text })
    } catch (error) {
      if (run !== generation) return
      emit({
        type: "error",
        message: error instanceof Error ? error.message : "Transcription failed",
      })
    } finally {
      await VoiceCapture.remove(wav)
      if (run === generation) setState("idle")
    }
  }

  function cancel() {
    generation += 1
    if (capture) {
      void VoiceCapture.stop(capture).then((wav) => VoiceCapture.remove(wav))
      capture = undefined
    }
    setState("idle")
  }

  return {
    get state() {
      return state
    },
    get startedAt() {
      return startedAt
    },
    subscribe(listener: (event: Event) => void) {
      listeners.add(listener)
      listener({ type: "state", state, startedAt: state === "recording" ? startedAt : undefined })
      return () => listeners.delete(listener)
    },
    toggle,
    cancel,
  }
}

export * as VoiceController from "./controller"
