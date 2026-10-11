// Plays a real audio file. The phone's speech engine is not used,
// because that engine stops after one sentence on mobile browsers.

let player = null

function getPlayer() {
  if (!player) {
    player = new Audio()
    player.preload = 'auto'
    player.setAttribute('playsinline', 'true')
  }
  return player
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
    // Some browsers throw if the element has no source.
  }
}

export function playSentence(text, { onTime, onEnd, onError } = {}) {
  const spoken = String(text || '').replace(/\s+/g, ' ').trim()
  const audio = getPlayer()

  audio.onended = null
  audio.ontimeupdate = null
  audio.onerror = null
  audio.pause()

  audio.src = `/api/tts?text=${encodeURIComponent(spoken)}`
  audio.playbackRate = 0.9

  audio.ontimeupdate = () => {
    const duration = audio.duration
    if (!duration || !Number.isFinite(duration)) return
    onTime?.(Math.min(1, audio.currentTime / duration))
  }
  audio.onended = () => onEnd?.()
  audio.onerror = () => onError?.()

  const started = audio.play()
  if (started?.catch) {
    started.catch(() => onError?.())
  }
}
