// Real audio files, played like music.
// The phone's built-in speech engine is not used.

let player = null
let speechRate = 1

export function setSpeechRate(rate) {
  speechRate = rate
  if (player) player.playbackRate = rate
}

function getPlayer() {
  if (!player) {
    player = new Audio()
    player.preload = 'auto'
    player.setAttribute('playsinline', 'true')
  }
  return player
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

export function stopSentenceAudio() {
  if (!player) return
  player.onended = null
  player.ontimeupdate = null
  player.onerror = null
  player.pause()
  player.removeAttribute('src')
  try {
    player.load()
  } catch {
    // Ignore a player that has no source.
  }
}

export function playSentence(text, { onWord, onEnd, onError } = {}) {
  const parts = partsOf(text)
  if (parts.length === 0) {
    onError?.()
    return
  }

  const audio = getPlayer()
  let partIndex = 0
  let wordOffset = 0
  let failed = false

  const fail = () => {
    if (failed) return
    failed = true
    onError?.()
  }

  const playPart = () => {
    const words = parts[partIndex]
    const query = encodeURIComponent(words.join(' '))
    audio.onended = null
    audio.ontimeupdate = null
    audio.onerror = null
    audio.pause()
    audio.src = `/api/tts?text=${query}`
    audio.playbackRate = speechRate

    audio.ontimeupdate = () => {
      const duration = audio.duration
      if (!duration || !Number.isFinite(duration) || !words.length) return
      const local = Math.min(words.length - 1, Math.floor((audio.currentTime / duration) * words.length))
      onWord?.(wordOffset + local)
    }

    audio.onended = () => {
      wordOffset += words.length
      partIndex += 1
      if (partIndex < parts.length) playPart()
      else onEnd?.()
    }

    audio.onerror = () => fail()

    const started = audio.play()
    if (started?.catch) started.catch(() => fail())
  }

  playPart()
}
