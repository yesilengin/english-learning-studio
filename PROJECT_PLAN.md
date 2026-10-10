# İngilizce Öğrenme Uygulaması - Proje Planı

## Kullanıcı Profili
- **Konum**: Amerika, Army asker
- **Durum**: İngilizce var ama zayıf, cümle kurmakta zorluk
- **Hedef**: Kelime haznesi güçlendirme, aksan yapma, cümleleri doğru konuşma
- **Kullanım**: Günde en az 1 saat
- **Cihazlar**: Samsung S24 Ultra (Android), iPhone 17 Pro Max (iOS)
- **İnternet**: Var, ama offline kısımlar da olmalı

## Uygulamanın Amacı
LingQ + Anki + ELSA'nın en iyi özelliklerini tek uygulamada harmanlayıp kullanıcıya tam kontrol vermek.

## Temel Özellikler

### 1. Metin Okuma (LingQ tarzı)
- ✅ .txt, .epub, PDF yükleme
- ✅ Cümle cümle okuma
- ✅ Native Amerikan İngilizcesi TTS (Web Speech API `en-US`)
- ✅ Okunan cümle vurgulanır
- ✅ Kelimeye dokunma → anlam + örnek cümle popup
- ✅ Kelimeleri "biliyorum/bilmiyorum/öğreniyorum" işaretle
- ✅ İlerleme takibi (kaç sayfa okudun)

### 2. Kelime Kartları (Anki tarzı)
- ✅ SuperMemo SM-2 aralıklı tekrar algoritması
- ✅ Kartlar: Türkçe ipucu → İngilizce cümle kur
- ✅ Zor gelen her gün, bildiğin seyrekleşir
- ✅ Günde maksimum yeni kart limiti (ayarlanabilir)
- ✅ 20 dakika timer - geçince kalan kartlar yarına
- ✅ **Kartlarda hem kelime hem cümle sesli okunabilir (Amerikan aksanı)**

### 3. Konuşma Pratiği (ELSA tarzı)
- ✅ Shadowing: Cümleyi duy → tekrar et
- ✅ Web Speech Recognition (Chrome, `en-US`) - internet gerekli
- ✅ Hangi kelimelerin anlaşıldığını göster
- ✅ Anlaşılırlık puanı (%)

### 4. Offline-First
- ✅ İnternet kesilince: okuma, TTS, kartlar, kaydedilmiş anlamlar çalışır
- ✅ İnternet varken: eksik anlamlar bulunur, IndexedDB'ye yazılır
- ✅ IndexedDB: metinler, kelimeler, kartlar, progress
- ✅ Veriler kullanıcının cihazında (bulut yok)

### 5. Cross-Platform PWA
- ✅ Android (S24 Ultra) + iOS (iPhone 17 Pro Max)
- ✅ Ana ekrana kurulabilir
- ✅ Responsive, mobil-first tasarım
- ✅ Dark theme

### 6. Bağımsızlık ve Kontrol
- ✅ Export/Import (JSON)
- ✅ Kendi sözlük dosyası gömmek
- ✅ Kendi metinler (Army dokümanları)
- ✅ Progress tracking: saat, kelime sayısı, streak

### 7. Tasarım ve UI/UX (Kullanıcı İsteği)
- ✅ **Renkli ve eğlenceli** arayüz
- ✅ **Göz yormayan** renkler (dark mode, yumuşak tonlar)
- ✅ **Modern yazı stilleri** (Google Fonts - Poppins, Inter vb.)
- ✅ Gradient arka planlar ve smooth transitions
- ✅ Gamification unsurları (progress bars, badges, streak flame)
- ✅ Micro-animations (hover effects, card flips)
- ✅ Renkli kategori etiketleri (kelime durumları için)
- ✅ Emoji kullanımı (motivasyon için 🎯 📚 🔥 ⭐)

## Teknik Stack
- **Frontend**: React (tek sayfa PWA)
- **Styling**: Tailwind CSS (dark theme, mobile-first)
- **Storage**: IndexedDB (Dexie.js)
- **PWA**: Service Worker, manifest.json
- **API'ler**:
  - Web Speech API (TTS) - `en-US`
  - Web Speech Recognition API - `en-US`
- **Algoritma**: SuperMemo SM-2 (Anki'nin kullandığı)

## Uygulama Yapısı (Sekmeleri)

### Ana Sekme: "Bugün"
- Kaldığın yer (son okuma noktası)
- Bugün tekrar edilecek kartlar (20dk timer)
- Bugün gölgeleme için 5-10 cümle

### Sekme: "Kitaplık"
- Yüklü metinlerin listesi
- Yeni metin yükle butonu
- İlerleme göstergesi (her kitap için %)

### Sekme: "Oku"
- Seçili metni cümle cümle göster
- Her cümleye dokun → TTS oku + vurgula
- "Ben söyleyeyim" butonu → shadowing
- Kelimeye dokun → anlam popup + karta ekle

### Sekme: "Kartlar"
- Tüm kartların listesi
- Filtreleme: biliyorum/öğreniyorum/bilmiyorum
- Her kartı sesli dinleyebilme (kelime + cümle)
- Tekrar sistemi (SM-2 zamanlaması)

### Sekme: "İstatistikler"
- Toplam okuma saati
- Öğrenilen kelime sayısı
- Streak (kaç gün üst üste)
- Hangi kelimelerde takılıyorsun

## Günlük Akış (1 saat)
1. **0-20dk**: Kart tekrarı (Türkçe → İngilizce cümle kur)
2. **20-50dk**: Metin okuma (kelime kaydet, TTS dinle)
3. **50-60dk**: Gölgeleme (5-10 cümle duyup tekrar et)

## Proje Kuralları (Ajan için)

### KURAL 1: Token ve Bağlantı
- Token biterse: Cursor otomatik özet alır, devam edilir
- Bağlantı kesilirse: Kullanıcı geri gelince bu dosyayı oku, kaldığın yerden devam et
- Bilgisayar fiziksel olarak açık kalacak

### KURAL 2: Onay Gerektirmeyen Çalışma
- Başladıktan sonra hiç onay isteme
- Workspace rules zaten "izin sorma" diyor
- Kodlama, test, deploy - hepsini onaysız yap

### KURAL 3: Ses Okuma
- Kartlarda hem kelime hem cümle sesli okunabilmeli
- TTS: Web Speech API `en-US` (offline, cihazda ses paketi varsa)

### KURAL 4: Offline-First Öncelik
- İnternet varken: tüm özellikler
- İnternet kesilince: okuma, TTS (eğer ses paketi varsa), kartlar, kaydedilmiş anlamlar çalışmalı

### KURAL 5: Mobil-First
- Samsung S24 Ultra ve iPhone 17 Pro Max için optimize et
- Tek elle kullanılabilir kontroller
- Responsive, touch-friendly

## Geliştirme Aşamaları

### Faz 1: Temel PWA ve Okuma (1-2 saat)
- [ ] React + Vite proje kurulumu
- [ ] PWA manifest + service worker
- [ ] Tailwind CSS dark theme
- [ ] IndexedDB setup (Dexie.js)
- [ ] Metin yükleme (.txt başlangıç)
- [ ] Cümle cümle gösterim
- [ ] Web Speech API TTS entegrasyonu (`en-US`)
- [ ] Cümle vurgulama
- [ ] Kelimeye dokunma popup (basit)

### Faz 2: Kelime Kartları (1 saat)
- [ ] Kelime kaydetme sistemi
- [ ] SuperMemo SM-2 algoritması
- [ ] Kart arayüzü (Türkçe → İngilizce)
- [ ] Günlük limit ve timer (20dk)
- [ ] Kartlarda sesli okuma (kelime + cümle)

### Faz 3: Konuşma Tanıma (2-3 saat)
- [ ] Web Speech Recognition entegrasyonu
- [ ] Shadowing modu
- [ ] Kelime eşleştirme
- [ ] Anlaşılırlık puanı

### Faz 4: Offline Support (1 saat)
- [ ] Service Worker cache stratejisi
- [ ] IndexedDB offline veri yönetimi
- [ ] Online/offline durum göstergesi
- [ ] Kelime anlamı API (internet varken)

### Faz 5: İleri Özellikler (2-3 saat)
- [ ] .epub ve PDF yükleme
- [ ] Export/Import (JSON)
- [ ] İstatistikler ve progress tracking
- [ ] Streak sistemi
- [ ] Kelime bilgi durumu (biliyorum/öğreniyorum/bilmiyorum)

### Faz 6: Polish ve Test (2-3 saat)
- [ ] Bug fixing
- [ ] S24 Ultra test
- [ ] iPhone 17 Pro Max test
- [ ] Performans optimizasyonu
- [ ] UI/UX iyileştirmeler

## Başarı Kriterleri
1. ✅ Her iki telefonda da ana ekrana kurulabilir
2. ✅ İnternet kesilince temel özellikler çalışır
3. ✅ Kelime kartlarında ses çalar
4. ✅ Günde 1 saat kullanım senaryosu sorunsuz işler
5. ✅ Veriler cihazda kalır, export edilebilir

## Notlar
- DRM'li (Kindle) kitaplar açılamaz
- Sözlük: Gömülü çekirdek sözlük + kullanıcının eklediği anlamlar
- Fonem fonem aksan notu yok, kelime anlaşılırlığı var
- Hazır içerik yok, kullanıcı kendi metinlerini yükler

---

**Son Güncelleme**: 2026-10-09 21:09  
**Durum**: Plan tamamlandı, onay bekleniyor  
**Sonraki Adım**: Kullanıcı onayı → Faz 1 başlat
