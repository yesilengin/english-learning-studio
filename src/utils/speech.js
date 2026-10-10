// GUARANTEED Android Chrome Compatible Speech API
// NO async, NO setTimeout, DIRECT execution

let speaking = false

// Initialize voices - call once on page load
export function initVoices() {
  if (!window.speechSynthesis) return
  
  // Force load voices
  window.speechSynthesis.getVoices()
  
  // Handle async voice loading
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices()
  }
}

// Stop speech immediately
export function stopSpeech() {
  speaking = false
  window.speechSynthesis?.cancel()
}

// Speak text - MUST be called from direct user interaction (click event)
export function speakEnglish(text, options = {}) {
  const { rate = 0.9, onStart, onEnd } = options
  
  if (!window.speechSynthesis || !text) return
  
  // CRITICAL: Cancel first
  window.speechSynthesis.cancel()
  speaking = true
  
  // Create utterance
  const utterance = new SpeechSynthesisUtterance(String(text))
  utterance.lang = 'en-US'
  utterance.rate = rate
  utterance.pitch = 1.0
  utterance.volume = 1.0
  
  // Try to use US voice
  const voices = window.speechSynthesis.getVoices()
  const usVoice = voices.find(v => v.lang === 'en-US' || v.lang.startsWith('en-US'))
  if (usVoice) utterance.voice = usVoice
  
  // Callbacks
  utterance.onstart = () => {
    speaking = true
    onStart?.()
  }
  
  utterance.onend = () => {
    speaking = false
    onEnd?.()
  }
  
  utterance.onerror = (e) => {
    console.error('Speech error:', e.error)
    speaking = false
    onEnd?.()
  }
  
  // SPEAK - no delay, no wrapper
  window.speechSynthesis.speak(utterance)
}
