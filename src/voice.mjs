import { spawn } from 'node:child_process'
import { config } from './store.mjs'

// A voice note becomes the plain sound the speech model wants: one channel,
// 16,000 samples a second, as 32-bit numbers.
function decode(buffer) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1'], { windowsHide: true })
    const parts = []
    let err = ''
    ff.stdout.on('data', d => parts.push(d))
    ff.stderr.on('data', d => { err += d })
    ff.on('error', reject)
    ff.on('close', code => {
      if (code !== 0) return reject(new Error(`ffmpeg ended with ${code}: ${err.slice(0, 200)}`))
      const bytes = Buffer.concat(parts)
      resolve(new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.length / 4)))
    })
    ff.stdin.on('error', () => {})
    ff.stdin.end(buffer)
  })
}

let model

// Runs on this computer. The model downloads once, on the first voice note.
export async function hear(buffer) {
  const sound = await decode(buffer)
  const { voiceModel, voiceLanguage } = config()
  if (!model) {
    const { pipeline } = await import('@huggingface/transformers')
    model = await pipeline('automatic-speech-recognition', voiceModel, { dtype: 'q8' })
  }
  const out = await model(sound, { chunk_length_s: 30, language: voiceLanguage, task: 'transcribe' })
  return out.text.trim()
}
