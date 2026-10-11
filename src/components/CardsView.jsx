import { useState, useEffect } from 'react'
import { getDueWords, getWordsByLevel, setWordLevel, deleteWord, updateTodayStats, getSetting } from '../db'
import { initVoices, speakEnglish } from '../utils/speech'

export default function CardsView({ onStatsUpdate }) {
  const [dueCards, setDueCards] = useState([])
  const [currentCard, setCurrentCard] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 })
  const [loading, setLoading] = useState(true)
  const [sessionTime, setSessionTime] = useState(0)
  const [dailyLimit, setDailyLimit] = useState(20)
  const [isFlipped, setIsFlipped] = useState(false)
  const [shelf, setShelf] = useState('due')

  const levels = [
    { id: 1, label: 'Her gün' },
    { id: 2, label: '3 gün' },
    { id: 3, label: 'Hafta' },
    { id: 4, label: '2 hafta' },
    { id: 5, label: 'Ay' }
  ]

  useEffect(() => {
    initVoices()
    loadSettings()
    const timer = setInterval(() => setSessionTime((prev) => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadCards(shelf)
  }, [shelf])

  const loadCards = async (which = shelf) => {
    try {
      const words = which === 'due' ? await getDueWords(500) : await getWordsByLevel(which)
      setDueCards(words)
      setCurrentCard(0)
      setIsFlipped(false)
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

  const placeCard = async (level) => {
    const card = dueCards[currentCard]
    if (!card) return
    await setWordLevel(card.id, level)
    await updateTodayStats({ cardsReviewed: 1 })
    setSessionStats((prev) => ({ reviewed: prev.reviewed + 1, correct: prev.correct + 1 }))
    await loadCards(shelf)
    onStatsUpdate?.()
  }

  const removeCard = async () => {
    const card = dueCards[currentCard]
    if (!card) return
    await deleteWord(card.id)
    await loadCards(shelf)
  }

  const speakWord = (text) => {
    speakEnglish(text, { rate: 0.85 })
  }

  const speakSentence = (text) => {
    speakEnglish(text, { rate: 0.9 })
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
      <div className="space-y-6">
        <ShelfPicker shelf={shelf} onChange={setShelf} />
        <div className="glass-card p-12 text-center animate-scale-in">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold mb-2">Tebrikler!</h3>
          <p className="text-gray-400 mb-6">
            {shelf === 'due' ? 'Bugün için tekrar edilecek kart yok.' : 'Bu seviyede kelime yok.'}
          </p>
          <p className="text-sm text-gray-500">
            Yeni kelimeler eklemek için kitap oku ve kelimeleri kaydet.
          </p>
        </div>
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
      <ShelfPicker shelf={shelf} onChange={setShelf} />
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
            <h2 className="text-4xl font-bold mb-4 text-center">
              {card.translation}
            </h2>
            {card.sentence && (
              <p className="text-center text-gray-300 italic mb-6">"{card.sentence}"</p>
            )}
            <button
              onClick={toggleCard}
              className="btn-gradient px-8 py-3"
            >
              🔄 Çevir
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
                    onClick={(e) => {
                      e.preventDefault();
                      speakEnglish(card.word, { rate: 0.85 });
                    }}
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
                    onClick={(e) => {
                      e.preventDefault();
                      speakEnglish(card.sentence, { rate: 0.9 });
                    }}
                    className="text-xl hover:scale-110 transition-transform"
                  >
                    🔊
                  </button>
                </div>
              </div>

              <button
                onClick={toggleCard}
                className="w-full glass-card py-3"
              >
                🔄 Tekrar çevir
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {levels.map((level) => (
          <button
            key={level.id}
            type="button"
            onClick={() => placeCard(level.id)}
            className={`py-3 rounded-xl text-sm font-semibold ${
              (card.level || 1) === level.id ? 'bg-primary-500 text-white' : 'glass-card'
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={removeCard}
        className="w-full py-3 rounded-xl bg-danger-500/80 font-semibold"
      >
        Karttan sil
      </button>

      {/* Info */}
      <div className="glass-card p-4 text-center text-sm text-gray-400">
        Kartı istediğin kadar çevir. Sonra kelimeyi bir rafa koy.
      </div>
    </div>
  )
}

function ShelfPicker({ shelf, onChange }) {
  const items = [
    ['due', 'Bugün'],
    [1, '1'],
    [2, '2'],
    [3, '3'],
    [4, '4'],
    [5, '5']
  ]

  return (
    <div className="grid grid-cols-6 gap-2">
      {items.map(([id, label]) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(id)}
          className={`py-3 rounded-xl text-sm font-semibold ${
            shelf === id ? 'bg-primary-500 text-white' : 'glass-card text-gray-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
