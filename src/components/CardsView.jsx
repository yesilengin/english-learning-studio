import { useState, useEffect } from 'react'
import { db, getDueWords, reviewWord, updateTodayStats, getSetting } from '../db'

export default function CardsView({ onStatsUpdate }) {
  const [dueCards, setDueCards] = useState([])
  const [currentCard, setCurrentCard] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 })
  const [loading, setLoading] = useState(true)
  const [sessionTime, setSessionTime] = useState(0)
  const [dailyLimit, setDailyLimit] = useState(20)
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    loadCards()
    loadSettings()

    // Session timer
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1)
      if (sessionTime >= 20 * 60) { // 20 minutes
        handleEndSession()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const loadCards = async () => {
    try {
      const limit = await getSetting('dailyCardLimit') || 20
      const words = await getDueWords(limit)
      setDueCards(words)
    } catch (error) {
      console.error('Error loading cards:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    const limit = await getSetting('dailyCardLimit')
    setDailyLimit(limit || 20)
  }

  const handleAnswer = async (quality) => {
    const card = dueCards[currentCard]
    if (!card) return

    await reviewWord(card.id, quality)
    await updateTodayStats({ cardsReviewed: 1 })

    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: quality >= 3 ? prev.correct + 1 : prev.correct
    }))

    // Move to next card
    if (currentCard < dueCards.length - 1) {
      setCurrentCard(currentCard + 1)
      setShowAnswer(false)
      setIsFlipped(false)
    } else {
      handleEndSession()
    }

    onStatsUpdate?.()
  }

  const handleEndSession = () => {
    alert(`🎉 Harika iş çıkardın!\n\n✅ ${sessionStats.reviewed} kart tekrar edildi\n🎯 %${Math.round((sessionStats.correct / Math.max(sessionStats.reviewed, 1)) * 100)} başarı oranı`)
  }

  const speakWord = (text) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.85
    
    const voices = window.speechSynthesis.getVoices()
    const usVoice = voices.find(v => v.lang === 'en-US')
    if (usVoice) utterance.voice = usVoice
    
    window.speechSynthesis.speak(utterance)
  }

  const speakSentence = (text) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    
    const voices = window.speechSynthesis.getVoices()
    const usVoice = voices.find(v => v.lang === 'en-US')
    if (usVoice) utterance.voice = usVoice
    
    window.speechSynthesis.speak(utterance)
  }

  const toggleCard = () => {
    setIsFlipped(!isFlipped)
    setShowAnswer(!showAnswer)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    )
  }

  if (dueCards.length === 0) {
    return (
      <div className="glass-card p-12 text-center animate-scale-in">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold mb-2">Tebrikler!</h3>
        <p className="text-gray-400 mb-6">
          Bugün için tekrar edilecek kart yok.
        </p>
        <p className="text-sm text-gray-500">
          Yeni kelimeler eklemek için kitap oku ve kelimeleri kaydet.
        </p>
      </div>
    )
  }

  const card = dueCards[currentCard]
  const progress = ((currentCard + 1) / dueCards.length) * 100
  const timeLeft = Math.max(0, 20 * 60 - sessionTime)
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-primary-400">
            {currentCard + 1}/{dueCards.length}
          </div>
          <div className="text-xs text-gray-400">Kart</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-success-400">
            {sessionStats.reviewed}
          </div>
          <div className="text-xs text-gray-400">Tekrar</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-warning-400">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-400">Kalan</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="glass-card p-4">
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Flashcard */}
      <div className={`card-flip ${isFlipped ? 'flipped' : ''} min-h-[400px]`}>
        <div className="card-flip-inner relative">
          {/* Front of Card */}
          <div className="card-flip-front glass-card p-8 absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-sm text-gray-400 mb-4">Türkçe anlamı:</div>
            <h2 className="text-4xl font-bold mb-6 text-center">
              {card.translation}
            </h2>
            <button
              onClick={toggleCard}
              className="btn-gradient px-8 py-3"
            >
              🔄 Cevabı Göster
            </button>
          </div>

          {/* Back of Card */}
          <div className="card-flip-back glass-card p-8 absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-full space-y-6">
              {/* Word */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <h2 className="text-5xl font-bold text-primary-400">
                    {card.word}
                  </h2>
                  <button
                    onClick={() => speakWord(card.word)}
                    className="glass-card p-3 hover:bg-white/20 transition-colors ripple"
                  >
                    🔊
                  </button>
                </div>
                <p className="text-gray-400">{card.translation}</p>
              </div>

              {/* Sentence */}
              <div className="glass-card p-4 bg-white/5">
                <div className="flex items-start gap-2 mb-2">
                  <p className="text-sm text-gray-400 flex-1 italic">
                    "{card.sentence}"
                  </p>
                  <button
                    onClick={() => speakSentence(card.sentence)}
                    className="text-xl hover:scale-110 transition-transform"
                  >
                    🔊
                  </button>
                </div>
              </div>

              {/* Answer Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleAnswer(1)}
                  className="bg-danger-500 hover:bg-danger-600 text-white py-3 rounded-xl font-semibold transition-all hover:scale-105 ripple"
                >
                  😔
                  <div className="text-xs">Zor</div>
                </button>
                <button
                  onClick={() => handleAnswer(2)}
                  className="bg-warning-500 hover:bg-warning-600 text-white py-3 rounded-xl font-semibold transition-all hover:scale-105 ripple"
                >
                  😐
                  <div className="text-xs">Orta</div>
                </button>
                <button
                  onClick={() => handleAnswer(3)}
                  className="bg-success-500 hover:bg-success-600 text-white py-3 rounded-xl font-semibold transition-all hover:scale-105 ripple"
                >
                  🙂
                  <div className="text-xs">İyi</div>
                </button>
                <button
                  onClick={() => handleAnswer(4)}
                  className="bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-semibold transition-all hover:scale-105 ripple"
                >
                  😄
                  <div className="text-xs">Kolay</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="glass-card p-4 text-center text-sm text-gray-400">
        💡 Kartı çevirip kelimenin İngilizcesini gör, sonra ne kadar iyi bildiğini seç
      </div>
    </div>
  )
}
