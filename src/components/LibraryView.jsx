import { useState, useEffect } from 'react'
import { db, addBook } from '../db'
import { parseFile } from '../utils/fileParser'
import { forgetSharedBook, syncBooks } from '../utils/librarySync'

export default function LibraryView({ onBookSelect }) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showExportImport, setShowExportImport] = useState(false)
  const [notice, setNotice] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftText, setDraftText] = useState('')

  useEffect(() => {
    loadBooks()
  }, [])

  const loadBooks = async () => {
    try {
      const shared = await syncBooks()
      setBooks(await db.books.toArray())
      return Boolean(shared?.ok)
    } catch (error) {
      console.error('Error loading books:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await parseFile(file)
      
      if (result.success && result.content?.trim()) {
        await addBook(result.title, result.content)
        const shared = await loadBooks()
        setNotice(shared
          ? `"${result.title}" kaydedildi. Diğer telefonda sayfayı yenile.`
          : `"${result.title}" bu telefona kaydedildi.`)
      } else {
        setNotice(result.error || 'Dosya okunamadı')
      }
    } catch (error) {
      console.error('Error uploading book:', error)
      setNotice('Dosya kaydedilemedi. Tekrar dene veya metni yapıştır.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleExportData = async () => {
    try {
      const allBooks = await db.books.toArray()
      const allWords = await db.words.toArray()
      const allStats = await db.stats.toArray()
      const allSettings = await db.settings.toArray()

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        books: allBooks,
        words: allWords,
        stats: allStats,
        settings: allSettings
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `english-studio-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('✅ Veriler başarıyla dışa aktarıldı!')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('❌ Dışa aktarma sırasında hata oluştu')
    }
  }

  const handleImportData = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const text = await file.text()
      const importData = JSON.parse(text)

      if (!importData.version || !importData.books) {
        throw new Error('Geçersiz dosya formatı')
      }

      // Import books
      if (importData.books && importData.books.length > 0) {
        await db.books.bulkPut(importData.books)
      }

      // Import words
      if (importData.words && importData.words.length > 0) {
        await db.words.bulkPut(importData.words)
      }

      // Import stats
      if (importData.stats && importData.stats.length > 0) {
        await db.stats.bulkPut(importData.stats)
      }

      // Import settings
      if (importData.settings && importData.settings.length > 0) {
        await db.settings.bulkPut(importData.settings)
      }

      await loadBooks()
      alert(`✅ Veriler başarıyla içe aktarıldı!\n\n📚 ${importData.books.length} kitap\n📝 ${importData.words?.length || 0} kelime`)
      setShowExportImport(false)
    } catch (error) {
      console.error('Error importing data:', error)
      alert('❌ İçe aktarma sırasında hata oluştu: ' + error.message)
    } finally {
      event.target.value = ''
    }
  }

  const handleDeleteBook = async (bookId, title) => {
    if (!confirm(`"${title}" kitabını silmek istediğinden emin misin?`)) {
      return
    }

    try {
      const book = books.find((item) => item.id === bookId)
      if (book?.cloudId) await forgetSharedBook(book.cloudId)
      await db.books.delete(bookId)
      await loadBooks()
    } catch (error) {
      console.error('Error deleting book:', error)
      alert('❌ Kitap silinirken hata oluştu')
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
      {/* Header */}
      {notice && (
        <div className="glass-card px-4 py-3 text-sm text-gray-200">{notice}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold mb-1">📚 Kitaplık</h2>
          <p className="text-gray-400 text-sm">
            {books.length} kitap yüklendi
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Export/Import Button */}
          <button
            onClick={() => setShowExportImport(!showExportImport)}
            className="glass-card px-4 py-2 hover:bg-white/20 transition-colors"
          >
            💾
          </button>
          
          {/* Upload Button */}
          <label className="btn-gradient cursor-pointer inline-flex items-center gap-2">
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Yükleniyor...</span>
              </>
            ) : (
              <>
                <span>➕</span>
                <span>Kitap Yükle</span>
              </>
            )}
            <input
              type="file"
              accept=".txt,.epub,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Export/Import Panel */}
      {showExportImport && (
        <div className="glass-card p-6 animate-slide-down">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span>💾</span>
            <span>Yedekleme ve Geri Yükleme</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleExportData}
              className="bg-primary-500/20 text-primary-400 px-6 py-3 rounded-xl font-medium hover:bg-primary-500/30 transition-colors flex items-center justify-center gap-2"
            >
              📤 Dışa Aktar
            </button>
            <label className="bg-success-500/20 text-success-400 px-6 py-3 rounded-xl font-medium hover:bg-success-500/30 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              📥 İçe Aktar
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Tüm kitaplarını, kelimelerini ve ilerlemeni yedekle veya geri yükle
          </p>
        </div>
      )}

      <form
        className="glass-card p-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          const content = draftText.trim()
          if (!content) {
            setNotice('Kaydetmek için metni yapıştır.')
            return
          }
          const title = draftTitle.trim() || 'Yeni metin'
          setUploading(true)
          try {
            await addBook(title, content)
            setDraftTitle('')
            setDraftText('')
            const shared = await loadBooks()
            setNotice(shared
              ? `"${title}" kaydedildi. Diğer telefonda sayfayı yenile.`
              : `"${title}" bu telefona kaydedildi.`)
          } catch (error) {
            console.error(error)
            setNotice('Metin kaydedilemedi.')
          } finally {
            setUploading(false)
          }
        }}
      >
        <h3 className="font-semibold">Metin yapıştır</h3>
        <input
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          placeholder="Kitap adı"
          className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none"
        />
        <textarea
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          placeholder="İngilizce metni buraya yapıştır"
          rows={5}
          className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none"
        />
        <button type="submit" className="btn-gradient px-5 py-3" disabled={uploading}>
          Kaydet
        </button>
      </form>

      {/* Empty State */}
      {books.length === 0 && (
        <div className="glass-card p-12 text-center animate-scale-in">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2">Henüz kitap yüklenmedi</h3>
          <p className="text-gray-400 mb-6">
            İlk kitabını yükleyerek İngilizce öğrenmeye başla!
          </p>
          <label className="btn-gradient inline-block cursor-pointer">
            İlk Kitabını Yükle 🚀
            <input
              type="file"
            accept=".txt,.epub,.pdf"
            onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Books Grid */}
      {books.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book, idx) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={() => onBookSelect(book)}
              onDelete={() => handleDeleteBook(book.id, book.title)}
              delay={idx * 0.05}
            />
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="glass-card p-6 animate-fade-in">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <span>💡</span>
          <span>İpucu</span>
        </h4>
        <ul className="text-sm text-gray-300 space-y-2">
          <li>• .txt, .epub ve .pdf formatındaki dosyaları yükleyebilirsin</li>
          <li>• Kitap bu telefonda kalır. Bağlantı açıksa diğer telefonda yenileyince de görünür</li>
          <li>• Her kitapta kaldığın yer otomatik kaydedilir</li>
          <li>• 💾 butonundan verilerini yedekleyip başka cihaza taşıyabilirsin</li>
        </ul>
      </div>
    </div>
  )
}

function BookCard({ book, onSelect, onDelete, delay }) {
  const progress = book.progress || 0
  const wordCount = book.content.split(/\s+/).length
  const readingTime = Math.ceil(wordCount / 200) // avg 200 words/min

  return (
    <div 
      className="glass-card p-5 hover:shadow-glow transition-all duration-300 hover:scale-105 cursor-pointer group animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
      onClick={onSelect}
    >
      {/* Book Icon */}
      <div className="w-16 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg mb-4 flex items-center justify-center text-3xl shadow-lg group-hover:shadow-glow-lg transition-shadow">
        📖
      </div>

      {/* Book Info */}
      <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary-400 transition-colors">
        {book.title}
      </h3>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>📄</span>
          <span>{book.totalSentences} cümle</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>⏱️</span>
          <span>~{readingTime} dakika</span>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">İlerleme</span>
          <span className="text-primary-400 font-semibold">%{Math.round(progress)}</span>
        </div>
        <div className="progress-bar h-1.5">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onSelect}
          className="flex-1 bg-primary-500/20 text-primary-400 px-4 py-2 rounded-lg font-medium hover:bg-primary-500/30 transition-colors"
        >
          {progress > 0 ? 'Devam Et' : 'Başla'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="bg-danger-500/20 text-danger-400 px-3 py-2 rounded-lg hover:bg-danger-500/30 transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
