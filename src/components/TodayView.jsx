import { useState, useEffect } from 'react'
import { db, getDueWords } from '../db'
import { syncBooks } from '../utils/librarySync'

export default function TodayView({ onBookSelect, onOpenLibrary, stats }) {
  const [recentBook, setRecentBook] = useState(null)
  const [dueCards, setDueCards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodayData()
  }, [])

  const loadTodayData = async () => {
    try {
      // Get most recently read book
      await syncBooks()
      const books = await db.books.orderBy('uploadDate').reverse().limit(1).toArray()
      if (books.length > 0) {
        setRecentBook(books[0])
      }

      // Get due cards for today
      const words = await getDueWords(5)
      setDueCards(words)
    } catch (error) {
      console.error('Error loading today data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="glass-card p-6 animate-scale-in">
        <h2 className="text-2xl font-bold mb-2">
          Merhaba! 👋
        </h2>
        <p className="text-gray-300">
          Bugünkü İngilizce yolculuğuna hazır mısın?
        </p>
        
        {stats && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <StatCard icon="📖" label="Okuma" value={`${Math.floor(stats.readingTime / 60)}dk`} color="primary" />
            <StatCard icon="🎯" label="Kelime" value={stats.wordsLearned} color="success" />
            <StatCard icon="🃏" label="Kart" value={stats.cardsReviewed} color="purple" />
          </div>
        )}
      </div>

      {/* Continue Reading */}
      {recentBook && (
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">📚 Kaldığın Yer</h3>
              <p className="text-gray-400 text-sm">{recentBook.title}</p>
            </div>
            <button
              onClick={() => onBookSelect(recentBook)}
              className="btn-gradient text-sm px-4 py-2"
            >
              Devam Et →
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">İlerleme</span>
              <span className="text-primary-400 font-semibold">
                %{Math.round(recentBook.progress || 0)}
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${recentBook.progress || 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Due Cards */}
      {dueCards.length > 0 && (
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">🃏 Bugün Tekrar Et</h3>
              <p className="text-gray-400 text-sm">{dueCards.length} kart seni bekliyor</p>
            </div>
            <div className="bg-primary-500/20 text-primary-400 rounded-full px-4 py-2 font-bold">
              {dueCards.length}
            </div>
          </div>
          
          <div className="space-y-2">
            {dueCards.slice(0, 3).map((word, idx) => (
              <div 
                key={word.id} 
                className="bg-white/5 rounded-xl p-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
              >
                <span className="text-2xl">📝</span>
                <div className="flex-1">
                  <div className="font-medium">{word.word}</div>
                  <div className="text-sm text-gray-400 truncate">{word.sentence}</div>
                </div>
              </div>
            ))}
          </div>

          {dueCards.length > 3 && (
            <p className="text-center text-sm text-gray-400 mt-3">
              +{dueCards.length - 3} kart daha...
            </p>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <QuickActionCard
          icon="📚"
          title="Kitaplık"
          description="Yeni kitap yükle"
          color="from-blue-500 to-cyan-500"
          onClick={onOpenLibrary}
        />
        <QuickActionCard
          icon="🎯"
          title="Pratik"
          description="Konuşma pratiği"
          color="from-purple-500 to-pink-500"
        />
      </div>

      {/* Motivational Quote */}
      <div className="glass-card p-6 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <p className="text-lg font-medium text-gray-300 italic">
          "The limits of my language mean the limits of my world."
        </p>
        <p className="text-sm text-gray-500 mt-2">— Ludwig Wittgenstein</p>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const colorClasses = {
    primary: 'bg-primary-500/20 text-primary-400',
    success: 'bg-success-500/20 text-success-400',
    purple: 'bg-purple-500/20 text-purple-400'
  }

  return (
    <div className={`${colorClasses[color]} rounded-xl p-4 text-center`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  )
}

function QuickActionCard({ icon, title, description, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-gradient-to-br ${color} p-6 rounded-2xl shadow-lg hover:shadow-glow transition-all duration-300 text-left ripple`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h4 className="font-bold text-lg mb-1">{title}</h4>
      <p className="text-sm opacity-90">{description}</p>
    </button>
  )
}
