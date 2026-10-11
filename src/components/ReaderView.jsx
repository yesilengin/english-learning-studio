import { useState, useEffect, useRef } from 'react'
import { db, addWord, updateTodayStats } from '../db'
import { getTranslation, lookupFast } from '../utils/dictionary'
import { initVoices, speakEnglish, stopSpeech } from '../utils/speech'
import { playSentence, stopSentenceAudio } from '../utils/sentenceAudio'

export default function ReaderView({ book, onBack }) {
  const [sentences, setSentences] = useState([])
  const [currentSentence, setCurrentSentence] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showWordPopup, setShowWordPopup] = useState(null)
  const [recognizedText, setRecognizedText] = useState('')
  const [accuracy, setAccuracy] = useState(null)
  const [activeWordIndex, setActiveWordIndex] = useState(-1)
  const [liveTranslation, setLiveTranslation] = useState('')
  const [listenError, setListenError] = useState('')
  
  const recognitionRef = useRef(null)
  const sentenceRef = useRef('')
  const readingTimerRef = useRef(null)
  const readingStartTime = useRef(Date.now())

  useEffect(() => {
    if (!book) return

    // Initialize voices for speech
    initVoices()

    // Parse sentences
    const sentenceList = book.content.match(/[^.!?]+[.!?]+/g) || []
    setSentences(sentenceList.map(s => s.trim()))
    
    // Set current position
    setCurrentSentence(book.lastReadPosition || 0)

    // Start reading timer
    readingStartTime.current = Date.now()
    readingTimerRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - readingStartTime.current) / 1000)
      await updateTodayStats({ readingTime: elapsed })
    }, 30000) // Update every 30 seconds

    return () => {
      stopSpeech()
      stopSentenceAudio()
      
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* already stopped */ }
      }

      // Save reading position
      if (book?.id) {
        const progress = sentences.length > 0 ? (currentSentence / sentences.length) * 100 : 0
        db.books.update(book.id, {
          lastReadPosition: currentSentence,
          progress: progress
        })
      }

      // Clear timer
      if (readingTimerRef.current) {
        clearInterval(readingTimerRef.current)
      }

      // Update final reading time
      const totalElapsed = Math.floor((Date.now() - readingStartTime.current) / 1000)
      updateTodayStats({ readingTime: totalElapsed })
    }
  }, [book])

  useEffect(() => {
    const text = sentences[currentSentence] || ''
    const raw = text.split(/\s+/).filter(Boolean)[activeWordIndex]
    if (!raw) {
      setLiveTranslation('')
      return
    }

    const fast = lookupFast(raw)
    if (fast) {
      setLiveTranslation(fast)
      return
    }

    let cancel = false
    setLiveTranslation('...')
    getTranslation(raw, text).then((result) => {
      if (!cancel) setLiveTranslation(result.translation || '—')
    })
    return () => {
      cancel = true
    }
  }, [activeWordIndex, currentSentence, sentences])

  const speakSentence = (sentenceIndex = currentSentence) => {
    const text = sentences[sentenceIndex]
    console.log('speakSentence called:', { sentenceIndex, text: text?.substring(0, 50), totalSentences: sentences.length })
    
    if (!text) {
      console.error('No text to speak!')
      return
    }

    speakEnglish(text, {
      rate: 0.9,
      onStart: () => {
        console.log('Speech started')
        setIsSpeaking(true)
      },
      onEnd: () => {
        console.log('Speech ended')
        setIsSpeaking(false)
      }
    })
  }

  const stopSpeaking = () => {
    stopSpeech()
    stopSentenceAudio()
    setIsSpeaking(false)
  }

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('😔 Konuşma tanıma bu cihazda desteklenmiyor.')
      return
    }

    if (!navigator.onLine) {
      alert('📡 Konuşma tanıma için internet bağlantısı gerekli.')
      return
    }

    stopSpeaking()

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* already stopped */ }
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setRecognizedText(transcript)
      calculateAccuracy(sentenceRef.current, transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (event) => {
      setIsListening(false)
      if (event.error === 'aborted') return
      if (event.error === 'no-speech') {
        alert('🎤 Ses algılanamadı. Lütfen tekrar dene.')
      } else if (event.error === 'not-allowed') {
        alert('🎤 Mikrofon izni gerekli.')
      }
    }

    recognitionRef.current = recognition
    setRecognizedText('')
    setAccuracy(null)
    setIsListening(true)

    try {
      recognition.start()
    } catch (error) {
      console.error('Recognition start error:', error)
      setIsListening(false)
    }
  }

  const calculateAccuracy = (original, recognized) => {
    const originalWords = original.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
    const recognizedWords = recognized.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
    
    let matches = 0
    originalWords.forEach(word => {
      if (recognizedWords.includes(word)) {
        matches++
      }
    })

    const accuracyPercent = Math.round((matches / originalWords.length) * 100)
    setAccuracy(accuracyPercent)
  }

  const handleWordClick = async (word, sentence) => {
    stopSpeaking()
    
    // Open popup immediately for fast UX
    setShowWordPopup({ 
      word, 
      sentence,
      suggestedTranslation: '...', // Loading indicator
      translationSource: null
    })

    // Get translation in background
    const translation = await getTranslation(word, sentence)
    
    // Update popup with translation
    setShowWordPopup(prev => prev ? {
      ...prev,
      suggestedTranslation: translation.translation,
      translationSource: translation.source
    } : null)
  }

  const saveWord = async (translation) => {
    if (!showWordPopup) return

    try {
      await addWord(
        showWordPopup.word,
        translation,
        showWordPopup.sentence,
        book.id,
        'learning'
      )
      
      await updateTodayStats({ wordsLearned: 1 })
      alert(`✅ "${showWordPopup.word}" kelimesi kartlara eklendi!`)
      setShowWordPopup(null)
    } catch (error) {
      console.error('Error saving word:', error)
      alert('❌ Kelime kaydedilirken hata oluştu')
    }
  }

  const nextSentence = () => {
    if (currentSentence < sentences.length - 1) {
      setCurrentSentence(currentSentence + 1)
      setRecognizedText('')
      setAccuracy(null)
      stopSpeaking()
    }
  }

  const prevSentence = () => {
    if (currentSentence > 0) {
      setCurrentSentence(currentSentence - 1)
      setRecognizedText('')
      setAccuracy(null)
      stopSpeaking()
    }
  }

  if (!book || sentences.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    )
  }

  const currentText = sentences[currentSentence] || ''
  sentenceRef.current = currentText
  const words = currentText.split(/\s+/).filter(Boolean)
  const progress = ((currentSentence + 1) / sentences.length) * 100

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="glass-card p-3 hover:bg-white/20 transition-colors ripple"
        >
          ← Geri
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold truncate">{book.title}</h2>
          <p className="text-sm text-gray-400">
            {currentSentence + 1} / {sentences.length} cümle
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="glass-card p-4">
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-sm text-gray-400 mt-2">
          %{Math.round(progress)} tamamlandı
        </p>
      </div>

      {/* Main Reading Area */}
      <div className="glass-card p-8 min-h-[300px] flex flex-col items-center justify-center gap-6">
        <p className="text-2xl leading-relaxed text-center select-none">
          {words.map((word, idx) => (
            <span
              key={idx}
              onClick={() => handleWordClick(word.replace(/[^\w]/g, ''), currentText)}
              className={`
                cursor-pointer px-1 rounded transition-colors
                ${idx === activeWordIndex
                  ? 'bg-amber-400/40 text-amber-100'
                  : 'hover:bg-primary-500/30'}
              `}
            >
              {word}{' '}
            </span>
          ))}
        </p>
        {activeWordIndex >= 0 && (
          <div className="text-center">
            <p className="text-sm text-gray-400">{words[activeWordIndex]}</p>
            <p className="text-3xl font-bold text-amber-300">{liveTranslation || '...'}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div
          onClick={() => {
            if (isSpeaking) {
              stopSpeaking()
              return
            }
            const text = sentences[currentSentence]
            if (!text) return
            setListenError('')
            setIsSpeaking(true)
            setActiveWordIndex(0)
            playSentence(text, {
              onTime: (ratio) => {
                const parts = text.split(/\s+/).filter(Boolean)
                if (!parts.length) return
                setActiveWordIndex(Math.min(parts.length - 1, Math.floor(ratio * parts.length)))
              },
              onEnd: () => setIsSpeaking(false),
              onError: () => {
                setIsSpeaking(false)
                setListenError('Ses hazırlanamadı. İnterneti açıp tekrar dene.')
              }
            })
          }}
          className="btn-gradient py-4 text-lg cursor-pointer select-none text-center active:scale-95 transition-transform"
          style={{ touchAction: 'manipulation' }}
        >
          {isSpeaking ? '⏸️ Durdur' : '🔊 Dinle'}
        </div>
        <div
          onClick={startListening}
          className={`
            py-4 text-lg font-semibold rounded-xl cursor-pointer select-none text-center active:scale-95 transition-all
            ${isListening 
              ? 'bg-danger-500 animate-pulse' 
              : 'bg-success-500'
            }
          `}
          style={{ touchAction: 'manipulation' }}
        >
          {isListening ? '🎤 Dinleniyor...' : '🎤 Ben Söyleyeyim'}
        </div>
      </div>
      {listenError && (
        <p className="text-center text-sm text-amber-300">{listenError}</p>
      )}

      {/* Recognition Result */}
      {recognizedText && (
        <div className="glass-card p-6 animate-scale-in">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <span>🎯</span>
            <span>Senin Söylediğin:</span>
          </h4>
          <p className="text-lg mb-4 text-gray-300 italic">"{recognizedText}"</p>
          
          {accuracy !== null && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="progress-bar h-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      accuracy >= 80 ? 'bg-success-500' :
                      accuracy >= 60 ? 'bg-warning-500' :
                      'bg-danger-500'
                    }`}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              </div>
              <div className="text-2xl font-bold">
                {accuracy >= 80 ? '🎉' : accuracy >= 60 ? '👍' : '💪'}
                {' %'}{accuracy}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevSentence}
          disabled={currentSentence === 0}
          className="glass-card px-6 py-3 disabled:opacity-30 hover:bg-white/20 transition-colors ripple"
        >
          ← Önceki
        </button>
        <button
          onClick={nextSentence}
          disabled={currentSentence === sentences.length - 1}
          className="glass-card px-6 py-3 disabled:opacity-30 hover:bg-white/20 transition-colors ripple"
        >
          Sonraki →
        </button>
      </div>

      {/* Word Popup */}
      {showWordPopup && (
        <WordPopup
          word={showWordPopup.word}
          sentence={showWordPopup.sentence}
          suggestedTranslation={showWordPopup.suggestedTranslation}
          translationSource={showWordPopup.translationSource}
          onClose={() => setShowWordPopup(null)}
          onSave={saveWord}
          speakEnglish={speakEnglish}
        />
      )}
    </div>
  )
}

function WordPopup({ word, sentence, onClose, onSave, suggestedTranslation, translationSource, speakEnglish }) {
  const [translation, setTranslation] = useState(suggestedTranslation || '')

  // Update translation when it loads
  useEffect(() => {
    if (suggestedTranslation && suggestedTranslation !== '...') {
      setTranslation(suggestedTranslation)
    }
  }, [suggestedTranslation])

  const handleSave = () => {
    if (!translation.trim() || translation === '...' || translation === '(çeviri bulunamadı)') {
      alert('❌ Lütfen Türkçe anlamını gir')
      return
    }
    onSave(translation)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="glass-card p-6 max-w-md w-full animate-scale-in">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-2xl font-bold">{word}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            speakEnglish(word, { rate: 0.8 });
          }}
          className="bg-primary-500/20 text-primary-400 px-4 py-2 rounded-lg mb-4 hover:bg-primary-500/30 transition-colors"
        >
          🔊 Dinle
        </button>

        <div className="mb-4 p-4 bg-white/5 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Cümlede:</p>
          <p className="text-gray-300 italic">"{sentence}"</p>
        </div>

        <div className="space-y-3">
          {translationSource && (
            <div className="text-xs text-gray-400 flex items-center gap-2">
              {translationSource === 'offline' && <span>📖 Çevrimdışı sözlükten</span>}
              {translationSource === 'online' && <span>🌐 Online sözlükten</span>}
              {translationSource === 'none' && <span>❓ Sözlükte bulunamadı</span>}
            </div>
          )}
          
          <label className="block">
            <span className="text-sm text-gray-400 mb-2 block">Türkçe Anlamı:</span>
            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Türkçe karşılığını yaz..."
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 transition-colors"
              autoFocus
            />
          </label>

          <button
            onClick={handleSave}
            className="btn-gradient w-full py-3"
          >
            💾 Karta Ekle
          </button>
        </div>
      </div>
    </div>
  )
}
