// Android Chrome compatible TTS - tested and working
let voicesReady = false

export function initVoices() {
  if (!window.speechSynthesis) return
  
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) voicesReady = true
  }
  
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
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
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel()
  
  // Small delay for Android - allows user gesture to propagate
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(String(text))
    utterance.lang = 'en-US'
    utterance.rate = rate
    utterance.pitch = 1.0
    utterance.volume = 1.0
    
    // Get English voice if available
    const voices = window.speechSynthesis.getVoices()
    const enVoice = voices.find(v => v.lang === 'en-US' || v.lang.startsWith('en'))
    if (enVoice) utterance.voice = enVoice
    
    utterance.onstart = () => onStart?.()
    utterance.onend = () => onEnd?.()
    utterance.onerror = (e) => {
      console.error('TTS Error:', e.error)
      onEnd?.()
    }
    
    window.speechSynthesis.speak(utterance)
  }, 50)
}
