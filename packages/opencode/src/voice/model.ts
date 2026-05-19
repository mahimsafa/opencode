import path from "path"
import os from "os"
import { mkdir } from "fs/promises"
import { Global } from "@opencode-ai/core/global"
import { Filesystem } from "@/util/filesystem"
import type { ConfigVoice } from "@/config/voice"

const HF_BASE = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main"

const FILENAMES = {
  tiny: "ggml-tiny.bin",
  base: "ggml-base.bin",
  small: "ggml-small.bin",
  medium: "ggml-medium.bin",
  large: "ggml-large-v3.bin",
} as const satisfies Record<ConfigVoice.ModelSize, string>

const ALTERNATE_FILENAMES: Partial<Record<ConfigVoice.ModelSize, readonly string[]>> = {
  base: ["ggml-base.en.bin"],
}

export function modelsDir() {
  return path.join(Global.Path.data, "voice", "models")
}

export function modelFilename(size: ConfigVoice.ModelSize) {
  return FILENAMES[size]
}

export function modelPath(size: ConfigVoice.ModelSize) {
  return path.join(modelsDir(), modelFilename(size))
}

function searchDirs() {
  const home = os.homedir()
  return [
    modelsDir(),
    path.join(home, "rnd/whisper.cpp/models"),
    path.join(home, "whisper.cpp/models"),
    path.join(home, "Projects/whisper.cpp/models"),
  ]
}

function candidateFilenames(size: ConfigVoice.ModelSize) {
  return [modelFilename(size), ...(ALTERNATE_FILENAMES[size] ?? [])]
}

async function findLocal(size: ConfigVoice.ModelSize) {
  const env = process.env.OPENCODE_VOICE_MODEL_PATH
  if (env && (await Filesystem.exists(env))) return env

  for (const dir of searchDirs()) {
    for (const name of candidateFilenames(size)) {
      const file = path.join(dir, name)
      if (await Filesystem.exists(file)) return file
    }
  }
}

export async function resolve(input: { model: ConfigVoice.ModelSize; model_path?: string }) {
  if (input.model_path) {
    if (!(await Filesystem.exists(input.model_path))) {
      throw new Error(`Whisper model not found: ${input.model_path}`)
    }
    return input.model_path
  }

  const local = await findLocal(input.model)
  if (local) return local

  const file = modelPath(input.model)
  if (await Filesystem.exists(file)) return file

  await download(input.model)
  return file
}

export async function download(size: ConfigVoice.ModelSize, onProgress?: (loaded: number, total: number) => void) {
  const dir = modelsDir()
  await mkdir(dir, { recursive: true })

  const filename = modelFilename(size)
  const dest = path.join(dir, filename)
  const url = `${HF_BASE}/${filename}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download Whisper model (${response.status}): ${url}`)
  }

  const total = Number(response.headers.get("content-length") ?? 0)
  const body = response.body
  if (!body) {
    throw new Error(`Failed to download Whisper model: empty response from ${url}`)
  }

  const file = Bun.file(dest)
  const writer = file.writer()
  const reader = body.getReader()
  let loaded = 0

  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    writer.write(chunk.value)
    loaded += chunk.value.byteLength
    onProgress?.(loaded, total)
  }
  await writer.end()
}

export * as VoiceModel from "./model"
