import { useState, useEffect, useRef } from 'react'
import { db, addWord, updateTodayStats } from '../db'
import { getTranslation } from '../utils/dictionary'
import { initVoices, speakEnglish, stopSpeech } from '../utils/speech'

export default function ReaderView({ book, onBack }) {
  const [sentences, setSentences] = useState([])
  const [currentSentence, setCurrentSentence] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showWordPopup, setShowWordPopup] = useState(null)
  const [recognizedText, setRecognizedText] = useState('')
  const [accuracy, setAccuracy] = useState(null)
  
  const recognitionRef = useRef(null)
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

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'en-US'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setRecognizedText(transcript)
        calculateAccuracy(sentences[currentSentence], transcript)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'no-speech') {
          alert('🎤 Ses algılanamadı. Lütfen tekrar dene.')
        }
      }
    }

    // Start reading timer
    readingStartTime.current = Date.now()
    readingTimerRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - readingStartTime.current) / 1000)
      await updateTodayStats({ readingTime: elapsed })
    }, 30000) // Update every 30 seconds

    return () => {
      // Stop any ongoing speech
      stopSpeech()
      
      // Stop recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop()
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
    setIsSpeaking(false)
  }

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('😔 Konuşma tanıma bu cihazda desteklenmiyor.')
      return
    }

    if (!navigator.onLine) {
      alert('📡 Konuşma tanıma için internet bağlantısı gerekli.')
      return
    }

    setRecognizedText('')
    setAccuracy(null)
    setIsListening(true)
    
    try {
      recognitionRef.current.start()
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
      <div className="glass-card p-8 min-h-[300px] flex items-center justify-center">
        <p className="text-2xl leading-relaxed text-center select-none">
          {currentText.split(/\s+/).map((word, idx) => (
            <span
              key={idx}
              onClick={() => handleWordClick(word.replace(/[^\w]/g, ''), currentText)}
              className={`
                cursor-pointer hover:bg-primary-500/30 px-1 rounded transition-colors
                ${isSpeaking ? 'highlight-word' : ''}
              `}
            >
              {word}{' '}
            </span>
          ))}
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('BUTTON CLICKED!', { isSpeaking, currentSentence, sentencesLength: sentences.length });
            
            if (isSpeaking) {
              console.log('Stopping speech...');
              stopSpeaking();
            } else {
              const text = sentences[currentSentence];
              console.log('Text to speak:', text);
              
              if (text && window.speechSynthesis) {
                console.log('Calling speakEnglish...');
                setIsSpeaking(true);
                
                // Direct call for maximum compatibility
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                utterance.onstart = () => {
                  console.log('Speech STARTED!');
                  setIsSpeaking(true);
                };
                utterance.onend = () => {
                  console.log('Speech ENDED');
                  setIsSpeaking(false);
                };
                utterance.onerror = (err) => {
                  console.error('Speech ERROR:', err);
                  setIsSpeaking(false);
                  alert('Ses hatası: ' + err.error);
                };
                
                console.log('Speaking now...');
                window.speechSynthesis.speak(utterance);
              } else {
                alert('❌ Ses özelliği kullanılamıyor veya metin yok');
              }
            }
          }}
          className="btn-gradient py-4 text-lg"
          disabled={isListening}
        >
          {isSpeaking ? '⏸️ Durdur' : '🔊 Dinle'}
        </button>
        <button
          onClick={startListening}
          className={`
            py-4 text-lg font-semibold rounded-xl transition-all duration-300
            ${isListening 
              ? 'bg-danger-500 hover:bg-danger-600 animate-pulse' 
              : 'bg-success-500 hover:bg-success-600'
            }
          `}
          disabled={isSpeaking}
        >
          {isListening ? '🎤 Dinleniyor...' : '🎤 Ben Söyleyeyim'}
        </button>
      </div>

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
