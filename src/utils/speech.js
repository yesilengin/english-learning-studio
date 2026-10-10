// Direct speech - NO delays, NO async - works on Android Chrome
export function initVoices() {
  if (!window.speechSynthesis) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
}

export function stopSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

export function speakEnglish(text, options = {}) {
  const { rate = 0.9, onStart, onEnd } = options
  
  if (!window.speechSynthesis || !text) {
    onEnd?.()
    return
  }
  
  // Cancel first
  window.speechSynthesis.cancel()
  
  // Create and speak - DIRECT, NO DELAY
  const utterance = new SpeechSynthesisUtterance(String(text))
  utterance.lang = 'en-US'
  utterance.rate = rate
  utterance.pitch = 1.0
  utterance.volume = 1.0
  
  // Get voice
  const voices = window.speechSynthesis.getVoices()
  const enVoice = voices.find(v => v.lang === 'en-US' || v.lang.startsWith('en'))
  if (enVoice) utterance.voice = enVoice
  
  // Callbacks
  utterance.onstart = () => onStart?.()
  utterance.onend = () => onEnd?.()
  utterance.onerror = (e) => {
    console.error('TTS Error:', e.error)
    onEnd?.()
  }
  
  // SPEAK IMMEDIATELY
  window.speechSynthesis.speak(utterance)
}
