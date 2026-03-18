# 🎮 6A GameHub

Sosyal oyun platformu — Node.js + Express ile geliştirilmiştir.

---

## 🔑 BAŞ ADMİN ANAHTARI

```
GMPLT-XKQZ7-M9R4N-BW2VP-L8TJH
```

Bu anahtarı güvende tutun!

---

## 🚀 Kurulum

### 1. Bağımlılıkları yükle
```bash
npm install
```

### 2. Sunucuyu başlat
```bash
npm start
```

### 3. Tarayıcıda aç
```
http://localhost:3000
```

---

## 📁 Proje Yapısı

```
gameplatform/
├── server/
│   └── index.js          # Ana sunucu dosyası
├── public/
│   └── index.html        # Tek sayfa uygulama
├── data/
│   ├── accounts.json     # Kullanıcı ve admin hesapları
│   ├── tokens.json       # Token bakiyeleri
│   ├── badges.json       # Rozet tanımları ve kullanıcı rozetleri
│   ├── friends.json      # Arkadaşlık ilişkileri
│   ├── trades.json       # Takas teklifleri
│   └── market.json       # Market ürünleri ve satın almalar
└── package.json
```

---

## 👤 Kullanıcı Özellikleri

- Kayıt / Giriş sistemi
- @kod ile arkadaş ekleme
- **15 oyun** (her kazanma = +5 token)
- Rozet sistemi (çoklu kazanma desteği)
- Market (isim efekti, profil efekti, setler)
- Token hediye etme
- Rozet takası

## 🎮 Oyunlar (15 adet)

| # | Oyun | Açıklama |
|---|------|----------|
| 1 | 🃏 Hafıza Oyunu | Kartları eşleştir |
| 2 | 🐍 Yılan | Klasik snake |
| 3 | 🧠 Bilgi Yarışması | 5 soru, 4/5 doğru kazan |
| 4 | ⚡ Refleks Testi | 500ms altında tıkla |
| 5 | 📝 Wordle | 5 harfli kelime bul |
| 6 | 🔢 Hızlı Matematik | 10 soruda 8/10 doğru |
| 7 | 🎨 Renk Eşleştir | 10 soruda 8/10 doğru |
| 8 | ⌨️ Yazma Yarışı | 30 WPM üzerinde yaz |
| 9 | 🔵 Simon Says | 5 tur sırayı takip et |
| 10 | 💣 Mayın Tarlası | Tüm güvenlileri aç |
| 11 | 🎲 Zar Oyunu | 5 turda 3 kez kazan |
| 12 | ⚽ Flappy Ball | 5 borudan geç |
| 13 | 👤 Adam Asmaca | Kelimeyi tahmin et |
| 14 | ✂️ Taş Kağıt Makas | 5 turda 3 kez kazan |
| 15 | 🔮 Sayı Tahmin | 7 denemede bul |

---

## 🛡️ Admin Sistemi

### Baş Admin
- Kullanıcı silme
- Token düzenleme (ayarla/ekle/çıkar)
- Rozet verme/alma
- Banlama
- **Alt Admin oluşturma** (kullanıcı ID ile)
- Alt Admin kaldırma
- Kimlik bilgisi görüntüleme

### Alt Admin
- Token ekleme/çıkarma
- Rozet verme/alma
- Banlama
- Kimlik bilgisi görüntüleme

### Alt Admin Oluşturma (Baş Admin)
1. Admin paneline gir
2. "Alt Adminler" sekmesine tıkla
3. Kullanıcı ID gir → Alt Admin oluştur
4. Oluşan anahtarı alt admine ver
5. Alt admin hem kendi kullanıcı hesabına hem admin paneline giriş yapabilir

---

## 🏅 Rozet Sistemi

Kazanma sayısına göre otomatik rozet:

| Rozet | Gereksinim | Açıklama |
|-------|------------|----------|
| 🥉 İlk Adım | 10 kazanma | Her 10'da 1 tane |
| ⭐ Yükselen Yıldız | 20 kazanma | |
| 🥈 Tecrübeli | 50 kazanma | |
| 🥇 Usta | 100 kazanma | |
| 🏆 Efsane | 200 kazanma | |
| 👑 Tanrı Oyuncu | 500 kazanma | |
| 💎 Ölümsüz | 1000 kazanma | |

**Çoklu rozet örneği:** 20 kazanmada → 1x "İlk Adım" + 1x "Yükselen Yıldız"

Manuel rozetler (Admin tarafından verilir):
🌟 Nadir • 💫 VIP • 🔬 Beta Test • 🦋 Sosyal • 🤝 Tüccar • 💰 Zengin • ⚡ Hız Şeytanı • ❤️ Sadık

---

## 🛍️ Market Ürünleri

### İsim Efektleri
- 🔥 Ateş (100 token)
- ❄️ Buz (100 token)
- ✨ Altın (150 token)
- 🌈 Gökkuşağı (200 token)
- 💡 Neon (175 token)

### Profil Efektleri
- 🌌 Galaksi (250 token)
- 🌅 Aurora (200 token)
- 🔥 Alev (300 token)

### Setler
- 🐉 Ejderha Seti (500 token)
- 🌊 Okyanus Seti (400 token)
- 🌠 Kozmik Set (600 token)

---

## 🌐 İnternet Kontrolü

- **İnternet yok** → Kırmızı popup
- **Sunucuya bağlanılamıyor** → Turuncu popup
- 10 saniyede bir otomatik kontrol
