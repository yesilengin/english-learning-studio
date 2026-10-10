import { useState, useEffect } from 'react'
import { db } from '../db'

export default function StatsView({ stats }) {
  const [allStats, setAllStats] = useState([])
  const [totalWords, setTotalWords] = useState(0)
  const [totalBooks, setTotalBooks] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllStats()
  }, [])

  const loadAllStats = async () => {
    try {
      const statsData = await db.stats.toArray()
      const words = await db.words.toArray()
      const books = await db.books.toArray()
      
      setAllStats(statsData)
      setTotalWords(words.length)
      setTotalBooks(books.length)
    } catch (error) {
      console.error('Error loading stats:', error)
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

  const totalReadingTime = allStats.reduce((sum, s) => sum + (s.readingTime || 0), 0)
  const totalWordsLearned = allStats.reduce((sum, s) => sum + (s.wordsLearned || 0), 0)
  const totalCardsReviewed = allStats.reduce((sum, s) => sum + (s.cardsReviewed || 0), 0)
  const currentStreak = stats?.streak || 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">📊 İstatistikler</h2>
        <p className="text-gray-400">İlerleme kaydını takip et</p>
      </div>

      {/* Streak Card */}
      <div className="glass-card p-8 text-center bg-gradient-to-br from-primary-500/20 to-purple-500/20 animate-scale-in">
        <div className="text-7xl mb-4 streak-flame">🔥</div>
        <h3 className="text-5xl font-bold mb-2 text-primary-400">
          {currentStreak}
        </h3>
        <p className="text-xl text-gray-300">Günlük Seri</p>
        <p className="text-sm text-gray-400 mt-2">
          {currentStreak > 1 ? `${currentStreak} gündür aralıksız çalışıyorsun! 🎉` : 'Devam et, seriyi kırmamak için!'}
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon="📚"
          title="Toplam Kitap"
          value={totalBooks}
          color="from-blue-500 to-cyan-500"
          delay={0.1}
        />
        <StatCard
          icon="📝"
          title="Toplam Kelime"
          value={totalWords}
          color="from-purple-500 to-pink-500"
          delay={0.15}
        />
        <StatCard
          icon="⏱️"
          title="Okuma Süresi"
          value={`${Math.floor(totalReadingTime / 60)}dk`}
          color="from-green-500 to-emerald-500"
          delay={0.2}
        />
        <StatCard
          icon="🃏"
          title="Kart Tekrarı"
          value={totalCardsReviewed}
          color="from-orange-500 to-red-500"
          delay={0.25}
        />
      </div>

      {/* Today's Stats */}
      {stats && (
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>📅</span>
            <span>Bugünün Özeti</span>
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-400">
                {Math.floor(stats.readingTime / 60)}
              </div>
              <div className="text-sm text-gray-400">Dakika Okuma</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success-400">
                {stats.wordsLearned}
              </div>
              <div className="text-sm text-gray-400">Yeni Kelime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-warning-400">
                {stats.cardsReviewed}
              </div>
              <div className="text-sm text-gray-400">Kart Tekrarı</div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Chart Placeholder */}
      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <h3 className="text-xl font-bold mb-4">📈 Son 7 Gün</h3>
        <div className="flex items-end justify-between h-48 gap-2">
          {Array.from({ length: 7 }).map((_, idx) => {
            const dayStats = allStats[allStats.length - 7 + idx]
            const height = dayStats ? (dayStats.readingTime / 60 / 60) * 100 : 0
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-primary-500/20 rounded-t-lg overflow-hidden flex items-end" style={{ height: '100%' }}>
                  <div 
                    className="w-full bg-gradient-to-t from-primary-500 to-purple-500 transition-all duration-500"
                    style={{ height: `${Math.min(height, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400">
                  {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][idx]}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Achievements */}
      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🏆</span>
          <span>Başarılar</span>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <AchievementBadge
            icon="🔥"
            title="İlk Adım"
            description="İlk kitabını yükledin"
            unlocked={totalBooks > 0}
          />
          <AchievementBadge
            icon="📚"
            title="Kitap Kurdu"
            description="5 kitap yükle"
            unlocked={totalBooks >= 5}
          />
          <AchievementBadge
            icon="🎯"
            title="Kelime Avcısı"
            description="50 kelime öğren"
            unlocked={totalWords >= 50}
          />
          <AchievementBadge
            icon="⚡"
            title="Hız Tuttu"
            description="7 gün seriyi koru"
            unlocked={currentStreak >= 7}
          />
        </div>
      </div>

      {/* Motivational Message */}
      <div className="glass-card p-6 text-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <p className="text-lg text-gray-300">
          {totalReadingTime > 3600
            ? '🌟 Harika ilerleme! Devam ediyorsun!'
            : totalReadingTime > 600
            ? '💪 Güzel gidiyorsun, devam et!'
            : '🚀 Yolculuğun daha yeni başlıyor!'}
        </p>
      </div>
    </div>
  )
}

function StatCard({ icon, title, value, color, delay }) {
  return (
    <div 
      className={`glass-card p-6 bg-gradient-to-br ${color} animate-slide-up hover:scale-105 transition-transform`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-90">{title}</div>
    </div>
  )
}

function AchievementBadge({ icon, title, description, unlocked }) {
  return (
    <div className={`
      glass-card p-4 text-center transition-all
      ${unlocked 
        ? 'bg-gradient-to-br from-primary-500/20 to-purple-500/20 scale-100' 
        : 'opacity-40 scale-95 grayscale'
      }
    `}>
      <div className="text-4xl mb-2">{icon}</div>
      <div className="font-bold text-sm mb-1">{title}</div>
      <div className="text-xs text-gray-400">{description}</div>
      {unlocked && (
        <div className="mt-2 text-success-400 text-xs font-semibold">
          ✓ Kazanıldı
        </div>
      )}
    </div>
  )
}
