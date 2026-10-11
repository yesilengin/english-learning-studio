import { useState, useEffect } from 'react'
import { db, getTodayStats } from './db'
import TodayView from './components/TodayView'
import LibraryView from './components/LibraryView'
import ReaderView from './components/ReaderView'
import CardsView from './components/CardsView'
import StatsView from './components/StatsView'

function App() {
  const [currentView, setCurrentView] = useState('today')
  const [selectedBook, setSelectedBook] = useState(null)
  const [stats, setStats] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    loadStats()
    
    // Online/offline listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadStats = async () => {
    const todayStats = await getTodayStats()
    setStats(todayStats)
  }

  const handleBookSelect = (book) => {
    setSelectedBook(book)
    setCurrentView('reader')
  }

  const renderView = () => {
    switch (currentView) {
      case 'today':
        return <TodayView onBookSelect={handleBookSelect} stats={stats} />
      case 'library':
        return <LibraryView onBookSelect={handleBookSelect} />
      case 'reader':
        return <ReaderView book={selectedBook} onBack={() => setCurrentView('library')} />
      case 'cards':
        return <CardsView onStatsUpdate={loadStats} />
      case 'stats':
        return <StatsView stats={stats} />
      default:
        return <TodayView onBookSelect={handleBookSelect} stats={stats} />
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 -z-10" />
      
      {/* Animated Background Orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl floating pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl floating pointer-events-none" style={{ animationDelay: '1s' }} />
      
      {/* Online/Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="glass-card px-6 py-3 flex items-center gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">📡 Çevrimdışı Mod</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container relative z-10 mx-auto px-4 pb-24 pt-6 max-w-6xl">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              English Studio 🎓
            </h1>
            {stats && (
              <div className="glass-card px-4 py-2 flex items-center gap-2">
                <span className="text-2xl streak-flame">🔥</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-400">{stats.streak}</div>
                  <div className="text-xs text-gray-400">gün</div>
                </div>
              </div>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            Her gün biraz İngilizce ile hayallerine yaklaş ✨
            <span className="ml-2 text-xs text-gray-500">2.3</span>
          </p>
        </header>

        {/* View Content */}
        <main className="animate-fade-in">
          {renderView()}
        </main>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-around py-3">
            <NavButton
              icon="🏠"
              label="Bugün"
              active={currentView === 'today'}
              onClick={() => setCurrentView('today')}
            />
            <NavButton
              icon="📚"
              label="Kitaplık"
              active={currentView === 'library'}
              onClick={() => setCurrentView('library')}
            />
            <NavButton
              icon="📖"
              label="Oku"
              active={currentView === 'reader'}
              onClick={() => selectedBook && setCurrentView('reader')}
              disabled={!selectedBook}
            />
            <NavButton
              icon="🃏"
              label="Kartlar"
              active={currentView === 'cards'}
              onClick={() => setCurrentView('cards')}
            />
            <NavButton
              icon="📊"
              label="İstatistik"
              active={currentView === 'stats'}
              onClick={() => setCurrentView('stats')}
            />
          </div>
        </div>
      </nav>
    </div>
  )
}

function NavButton({ icon, label, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200
        ${active 
          ? 'text-primary-400 bg-primary-500/20 scale-110' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
        }
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'ripple'}
      `}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

export default App
