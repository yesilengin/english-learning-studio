# English Learning Studio 🎓

Amerikan İngilizcesi öğrenmeye yönelik, **offline-first** PWA (Progressive Web App) uygulaması.

## ✨ Özellikler

### 📖 Okuma ve Dinleme
- **.txt, .epub ve .pdf** dosya desteği
- Cümle cümle okuma ve navigasyon
- **Web Speech API** ile Amerikan İngilizcesi (en-US) seslendirme
- Okunan cümlenin vurgulanması
- Kelimelere dokunarak anlamlarını görme

### 🃏 Kelime Kartları (Flashcards)
- **SuperMemo SM-2** aralıklı tekrar algoritması (Anki'nin kullandığı)
- Türkçe ipucu → İngilizce cümle kurma
- Kartlarda hem kelime hem cümle sesli okuma
- Günlük kart limiti ve 20 dakika timer
- Zor/Orta/İyi/Kolay derecelendirme sistemi

### 🎤 Konuşma Pratiği (Shadowing)
- Cümleyi Amerikan İngilizcesiyle dinleme
- **Web Speech Recognition** ile mikrofon tanıma (en-US)
- Hangi kelimelerin anlaşıldığının gösterimi
- Anlaşılırlık puanı (%)

### 📊 İstatistikler ve İlerleme
- Günlük, haftalık ve toplam istatistikler
- **Streak** (günlük seri) sistemi 🔥
- Okuma süresi, öğrenilen kelime sayısı
- Başarı rozetleri ve motivasyon

### 💾 Offline-First ve Veri Yönetimi
- **IndexedDB** ile tüm veriler cihazda
- Service Worker ile çevrimdışı çalışma
- Export/Import (JSON) ile yedekleme
- Online durum göstergesi

### 🎨 Modern UI/UX
- Renkli, eğlenceli, göz yormayan tasarım
- Dark mode (koyu tema)
- Gradient arka planlar ve smooth animasyonlar
- Micro-animations (hover effects, card flips)
- Google Fonts (Poppins, Inter)

## 🚀 Kullanılan Teknolojiler

- **React 19** - UI framework
- **Vite 8** - Build tool
- **Tailwind CSS 3** - Styling
- **Dexie.js** - IndexedDB wrapper
- **PWA (vite-plugin-pwa)** - Progressive Web App
- **Web Speech API** - TTS ve Speech Recognition
- **epub.js & pdf.js** - Epub ve PDF okuyucu
- **SuperMemo SM-2** - Spaced repetition algoritması

## 📱 Desteklenen Platformlar

- **Android** (Samsung S24 Ultra ve üzeri)
- **iOS** (iPhone 17 Pro Max ve üzeri)
- **Desktop** (Chrome, Edge, Safari)

## 🛠️ Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+ (yüklü: v24.20.0)
- npm 10+ (yüklü: v11.19.0)

### Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Production build
npm run build

# Production önizleme
npm run preview
```

### PWA Kurulumu

1. Tarayıcıda `http://localhost:3001` adresini aç
2. Chrome/Edge: Adres çubuğundaki "Yükle" butonuna tıkla
3. Safari (iOS): Paylaş → Ana Ekrana Ekle

## 📂 Proje Yapısı

```
├── public/                 # Statik dosyalar
├── src/
│   ├── components/        # React componentleri
│   │   ├── TodayView.jsx     # Ana sayfa
│   │   ├── LibraryView.jsx   # Kitaplık
│   │   ├── ReaderView.jsx    # Okuyucu
│   │   ├── CardsView.jsx     # Kelime kartları
│   │   └── StatsView.jsx     # İstatistikler
│   ├── utils/
│   │   ├── dictionary.js     # Gömülü sözlük ve API
│   │   └── fileParser.js     # Dosya ayrıştırıcı
│   ├── App.jsx            # Ana uygulama
│   ├── db.js              # IndexedDB şeması ve işlemleri
│   ├── index.css          # Global stiller
│   └── main.jsx           # Giriş noktası
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 💡 Kullanım Rehberi

### 1. İlk Kitabını Yükle
1. **Kitaplık** sekmesine git
2. **➕ Kitap Yükle** butonuna tıkla
3. `.txt`, `.epub` veya `.pdf` dosyasını seç
4. Kitap otomatik olarak yüklenir ve cihazda saklanır

### 2. Kitap Oku ve Kelime Öğren
1. Yüklediğin kitaba tıkla
2. **🔊 Dinle** ile cümleyi Amerikan İngilizcesiyle dinle
3. Bilmediğin kelimeye dokun
4. Türkçe anlamını gir ve **💾 Karta Ekle**
5. **🎤 Ben Söyleyeyim** ile telaffuz pratiği yap

### 3. Kartlarla Tekrar Et
1. **🃏 Kartlar** sekmesine git
2. Türkçe ipucunu gör
3. İngilizce cümleyi hatırlamaya çalış
4. **🔄 Cevabı Göster** ile kontrol et
5. Ne kadar iyi bildiğini seç: 😔 Zor / 😐 Orta / 🙂 İyi / 😄 Kolay

### 4. İlerlemeni Takip Et
1. **📊 İstatistik** sekmesine git
2. Günlük seriyi (🔥 Streak) kırma!
3. Toplam okuma süren, öğrendiğin kelimeler ve başarılarını gör

## 🔒 Gizlilik

- **Tüm veriler cihazda** (IndexedDB)
- **Bulut yok**, hesap yok, giriş yok
- **Konuşma tanıma** internet gerektirir (Chrome Web Speech API)
- **Kelime anlamı** önce offline sözlükten aranır, bulunamazsa online API kullanılır

## 🎯 Önerilen Günlük Rutini (1 saat)

- **0-20 dakika**: Kart tekrarı (Türkçe → İngilizce cümle kur)
- **20-50 dakika**: Metin okuma (kelime kaydet, TTS dinle)
- **50-60 dakika**: Gölgeleme (5-10 cümle duyup tekrar et)

## 🐛 Bilinen Sınırlamalar

- **TTS kelime vurgulama**: Android Chrome'da `boundary` olayı çalışmayabilir (cümle vurgulu yedek sistem devreye girer)
- **DRM'li e-kitaplar**: Kindle, Apple Books gibi kilitli kitaplar açılamaz
- **Konuşma tanıma**: Tamamen çevrimdışı değildir, internet bağlantısı gerektirir
- **Sözlük**: Gömülü sözlük ~1000 sık kullanılan kelimeyi kapsar, eksik kelimeler için manuel giriş gerekir

## 📄 Lisans

MIT License - Bu proje eğitim amaçlıdır.

## 🙏 Teşekkürler

- [LingQ](https://www.lingq.com) - Okuma ve kelime öğrenme konsepti
- [Anki](https://apps.ankiweb.net) - SuperMemo SM-2 algoritması
- [ELSA Speak](https://elsaspeak.com) - Konuşma tanıma ilhamı

---

**Made with ❤️ for English learners**

🎓 **English Learning Studio** - Her gün biraz İngilizce ile hayallerine yaklaş ✨
