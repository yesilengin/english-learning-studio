// Simple, reliable Web Speech API wrapper for Android Chrome

let currentUtterance = null

// Preload voices on page load
export function initVoices() {
  if (!window.speechSynthesis) return
  
  // Trigger voices loading
  window.speechSynthesis.getVoices()
  
  // Some browsers need the voiceschanged event
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices()
    }
  }
}

// Stop any ongoing speech
export function stopSpeech() {
  if (currentUtterance) {
    currentUtterance.onend = null
    currentUtterance = null
  }
  window.speechSynthesis?.cancel()
}

// Speak English text with callbacks
export function speakEnglish(text, options = {}) {
  const {
    rate = 0.9,
    pitch = 1.0,
    onStart = null,
    onEnd = null
  } = options

  if (!window.speechSynthesis || !text) return

  // Stop previous speech
  stopSpeech()

  // Small delay for Android Chrome
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = 1.0

    // Get US English voice
    const voices = window.speechSynthesis.getVoices()
    const usVoice = voices.find(v => v.lang.includes('en-US') || v.lang.includes('en_US'))
    if (usVoice) {
      utterance.voice = usVoice
    }

    // Set up callbacks
    utterance.onstart = () => {
      currentUtterance = utterance
      onStart?.()
    }

    utterance.onend = () => {
      currentUtterance = null
      onEnd?.()
    }

    utterance.onerror = (event) => {
      console.error('Speech error:', event)
      currentUtterance = null
      onEnd?.()
    }

    // Speak!
    window.speechSynthesis.speak(utterance)
  }, 100)
}
