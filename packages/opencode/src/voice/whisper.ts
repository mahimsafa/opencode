import { Process } from "@/util/process"
import { which } from "@/util/which"
import { VoiceModel } from "./model"
import type { ConfigVoice } from "@/config/voice"

const DEFAULT_CLI = "/opt/homebrew/bin/whisper-cli"

export function cliPath(configured?: string) {
  if (configured) return configured
  return which("whisper-cli") ?? DEFAULT_CLI
}

export async function transcribe(
  wavPath: string,
  input: {
    model: ConfigVoice.ModelSize
    model_path?: string
    language?: string
    cli?: string
  },
) {
  const cli = cliPath(input.cli)
  const model = await VoiceModel.resolve({ model: input.model, model_path: input.model_path })

  const args = [cli, "-m", model, "-nt", "-np", wavPath]
  if (input.language) args.push("-l", input.language)

  const out = await Process.run(args, { nothrow: true })
  if (out.code !== 0) {
    const detail = out.stderr.toString().trim() || out.stdout.toString().trim()
    throw new Error(detail ? `Whisper failed: ${detail}` : `Whisper failed with code ${out.code}`)
  }

  return out.stdout
    .toString()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .trim()
}

export * as VoiceWhisper from "./whisper"
