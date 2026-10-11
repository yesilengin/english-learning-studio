import { playSentence, stopSentenceAudio } from './sentenceAudio'

let speakToken = 0

export function initVoices() {
  if (!window.speechSynthesis) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
}

function deviceSpeak(text, { rate = 0.9, onEnd } = {}) {
  if (!window.speechSynthesis || !text) {
    onEnd?.()
    return
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(String(text))
  utterance.lang = 'en-US'
  utterance.rate = rate
  utterance.pitch = 1
  utterance.volume = 1

  const voices = window.speechSynthesis.getVoices()
  const enVoice = voices.find((voice) => voice.lang === 'en-US')
    || voices.find((voice) => voice.lang?.startsWith('en'))
  if (enVoice) utterance.voice = enVoice

  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onEnd?.()
  window.speechSynthesis.speak(utterance)
}

export function stopSpeech() {
  speakToken += 1
  if (window.speechSynthesis) window.speechSynthesis.cancel()
  stopSentenceAudio()
}

export function speakEnglish(text, options = {}) {
  const { rate = 0.9, onStart, onEnd } = options
  if (!text) {
    onEnd?.()
    return
  }

  const token = ++speakToken
  if (window.speechSynthesis) window.speechSynthesis.cancel()
  onStart?.()

  playSentence(String(text), {
    rate,
    onEnd: () => {
      if (token === speakToken) onEnd?.()
    },
    onError: () => {
      if (token !== speakToken) return
      deviceSpeak(text, {
        rate,
        onEnd: () => {
          if (token === speakToken) onEnd?.()
        }
      })
    }
  })
}
