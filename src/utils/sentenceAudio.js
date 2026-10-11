// One playback path for every spoken sentence.
// Each recording is leveled to the same loudness before it plays.

let speechRate = 1
let playToken = 0
let audioCtx = null
let active = null

export function setAudioRoute(mode) {
  const session = typeof navigator !== 'undefined' ? navigator.audioSession : null
  if (!session) return
  try {
    session.type = mode
  } catch {
    // The browser chooses the route itself.
  }
}

export function setSpeechRate(rate) {
  speechRate = rate
  if (active?.source) {
    try {
      active.source.playbackRate.value = rate
    } catch {
      // The clip already ended.
    }
  }
}

function getContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  if (!audioCtx) audioCtx = new AudioCtx()
  return audioCtx
}

function haltPlayback() {
  const current = active
  active = null
  if (!current) return
  if (current.frame) cancelAnimationFrame(current.frame)
  try {
    current.source.stop(0)
  } catch {
    // Already stopped.
  }
}

export function stopSentenceAudio() {
  playToken += 1
  haltPlayback()
}

function normalizeBuffer(buffer) {
  const channels = []
  let sum = 0
  let count = 0
  let peak = 0

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    channels.push(data)
    for (let index = 0; index < data.length; index += 1) {
      const value = data[index]
      const abs = value < 0 ? -value : value
      if (abs > peak) peak = abs
      sum += value * value
      count += 1
    }
  }

  if (!count || peak < 0.001) return
  const rms = Math.sqrt(sum / count)
  if (rms < 0.001) return

  let gain = 0.16 / rms
  if (peak * gain > 0.95) gain = 0.95 / peak
  if (gain > 4) gain = 4
  if (Math.abs(gain - 1) < 0.04) return

  for (const data of channels) {
    for (let index = 0; index < data.length; index += 1) data[index] *= gain
  }
}

function partsOf(text) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const parts = []
  let current = []
  let length = 0

  for (const word of words) {
    const extra = current.length ? word.length + 1 : word.length
    if (length + extra > 180 && current.length) {
      parts.push(current)
      current = [word]
      length = word.length
    } else {
      current.push(word)
      length += extra
    }
  }

  if (current.length) parts.push(current)
  return parts
}

async function loadBuffer(ctx, text) {
  const response = await fetch(`/api/tts?text=${encodeURIComponent(text)}`)
  if (!response.ok) throw new Error('tts')
  const bytes = await response.arrayBuffer()
  return ctx.decodeAudioData(bytes.slice(0))
}

function playBuffer(ctx, buffer, words, wordOffset, token, rate, onWord) {
  return new Promise((resolve) => {
    if (token !== playToken) {
      resolve()
      return
    }

    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = 1
    source.buffer = buffer
    source.playbackRate.value = rate
    source.connect(gain)
    gain.connect(ctx.destination)

    const startedAt = ctx.currentTime
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      if (active?.source === source) {
        if (active.frame) cancelAnimationFrame(active.frame)
        active = null
      }
      resolve()
    }

    source.onended = finish
    active = { source, frame: 0 }

    const tick = () => {
      if (!active || active.source !== source || token !== playToken) {
        finish()
        return
      }
      const elapsed = (ctx.currentTime - startedAt) * (source.playbackRate.value || 1)
      const duration = buffer.duration
      if (duration > 0 && words.length) {
        const local = Math.min(words.length - 1, Math.floor((elapsed / duration) * words.length))
        onWord?.(wordOffset + local)
      }
      active.frame = requestAnimationFrame(tick)
    }

    source.start(0)
    active.frame = requestAnimationFrame(tick)
  })
}

export function playSentence(text, { onWord, onEnd, onError, rate } = {}) {
  const parts = partsOf(text)
  if (parts.length === 0) {
    onError?.()
    return
  }

  const myToken = ++playToken
  haltPlayback()
  setAudioRoute('playback')

  const ctx = getContext()
  if (!ctx) {
    onError?.()
    return
  }

  const pending = ctx.resume()
  const playbackRate = rate || speechRate

  const run = async () => {
    try {
      await pending
    } catch {
      if (myToken === playToken) onError?.()
      return
    }

    let wordOffset = 0
    for (const words of parts) {
      if (myToken !== playToken) return
      let buffer
      try {
        buffer = await loadBuffer(ctx, words.join(' '))
      } catch {
        if (myToken === playToken) onError?.()
        return
      }
      if (myToken !== playToken) return
      normalizeBuffer(buffer)
      await playBuffer(ctx, buffer, words, wordOffset, myToken, playbackRate, onWord)
      wordOffset += words.length
    }

    if (myToken === playToken) onEnd?.()
  }

  run()
}
