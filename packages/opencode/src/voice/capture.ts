import path from "path"
import { randomBytes } from "crypto"
import { unlink } from "fs/promises"
import { Global } from "@opencode-ai/core/global"
import { Process, type Child } from "@/util/process"
import { which } from "@/util/which"

const SOX_INSTALL = "Voice input requires sox. Install with: brew install sox"

export class SoxMissingError extends Error {
  constructor() {
    super(SOX_INSTALL)
    this.name = "SoxMissingError"
  }
}

export function recPath() {
  return which("rec")
}

export async function ensureAvailable() {
  if (!recPath()) throw new SoxMissingError()
}

export type Handle = {
  path: string
  proc: Child
}

export async function start() {
  await ensureAvailable()

  const file = path.join(Global.Path.tmp, `opencode-voice-${randomBytes(8).toString("hex")}.wav`)
  const proc = Process.spawn(["rec", "-r", "16000", "-c", "1", "-b", "16", file], {
    stdout: "ignore",
    stderr: "pipe",
  })

  return { path: file, proc }
}

export async function stop(handle: Handle) {
  if (handle.proc.exitCode === null && handle.proc.signalCode === null) {
    handle.proc.kill("SIGTERM")
  }
  await handle.proc.exited.catch(() => 1)
  return handle.path
}

export async function remove(file: string) {
  await unlink(file).catch(() => undefined)
}

export * as VoiceCapture from "./capture"
