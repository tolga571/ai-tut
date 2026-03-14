# AiTut — Product Requirements Document (PRD)

**Versiyon:** 1.0  
**Tarih:** Mart 2025  
**Durum:** Güncel

---

## 1. Ürün Özeti

**AiTut**, AI destekli bir dil öğrenme platformudur. Kullanıcılar hedef dilde AI öğretmenle sohbet eder, anlık çeviri ve gramer düzeltmeleri alır. Gemini AI tabanlı konuşma deneyimi, CEFR seviyesine uyumlu içerik ve çok dilli arayüz sunar.

### Temel Değer Önerisi

- **Konuşma odaklı öğrenme:** Kelime ezberlemek yerine doğal sohbetle dil pratiği
- **Anlık geri bildirim:** Çeviri + gramer düzeltmesi tek yanıtta
- **Kişiselleştirme:** Ana dil, hedef dil ve CEFR seviyesine göre uyarlanmış içerik

---

## 2. Vizyon ve Hedefler

### Vizyon

Dünya genelinde dil öğrenenlere, AI destekli, kişiselleştirilmiş ve erişilebilir bir öğrenme deneyimi sunmak.

### Kısa Vadeli Hedefler

- Kullanıcı kaydı ve onboarding akışının tamamlanması
- Chat deneyiminin stabil ve hızlı çalışması
- Paddle ile ödeme entegrasyonunun canlıya alınması
- Blog, sayfa ve doküman içerik yönetiminin admin panelinden yönetilmesi

### Uzun Vadeli Hedefler

- Sesli konuşma (speech-to-text / text-to-speech) desteği
- Mobil uygulama
- Topluluk ve sosyal özellikler

---

## 3. Kullanıcı Tipleri

| Rol | Açıklama | Temel İhtiyaçlar |
|-----|----------|------------------|
| **Öğrenci** | Dil öğrenmek isteyen kullanıcı | Chat, çeviri, düzeltme, içerik okuma |
| **Premium Öğrenci** | Ücretli plana sahip kullanıcı | Tüm özellikler + premium dokümanlar |
| **Admin** | İçerik ve kullanıcı yönetimi | Post CRUD, dashboard istatistikleri |

---

## 4. Özellik Listesi

### 4.1 Kimlik Doğrulama ve Hesap Yönetimi

| Özellik | Açıklama | Durum |
|---------|----------|-------|
| Kayıt | E-posta, ad, şifre ile hesap oluşturma | ✅ |
| Giriş | Credentials ile oturum açma | ✅ |
| Çıkış | Güvenli oturum sonlandırma | ✅ |
| Onboarding | Ana dil, hedef dil, CEFR seviyesi seçimi | ✅ |
| Profil | Ad, dil tercihleri, CEFR güncelleme | ✅ |
| Test modu | Login sayfasında demo giriş bilgileri | ✅ |

### 4.2 AI Chat (Çekirdek Özellik)

| Özellik | Açıklama | Durum |
|---------|----------|-------|
| Konuşma | Hedef dilde AI ile sohbet | ✅ |
| Çeviri | Yanıtta ana dile çeviri | ✅ |
| Düzeltme | Gramer/spelling hatalarının işaretlenmesi | ✅ |
| CEFR uyumu | Seviyeye göre dil karmaşıklığı | ✅ |
| Konuşma geçmişi | Birden fazla sohbet, silme | ✅ |
| Rate limit | Dakikada mesaj sınırı (30/dk) | ✅ |

### 4.3 İçerik Modülleri

| Modül | Açıklama | Erişim |
|-------|----------|--------|
| **Blogs** | Hedef dilde makaleler | Tüm kullanıcılar |
| **Pages** | Rehberler ve öğrenme kaynakları | Tüm kullanıcılar |
| **Documents** | Premium belgeler ve materyaller | Premium plan |

### 4.4 Ödeme ve Abonelik

| Özellik | Açıklama | Durum |
|---------|----------|-------|
| Paddle entegrasyonu | Aylık/yıllık plan satışı | ✅ |
| Webhook | Ödeme sonrası plan aktivasyonu | ✅ |
| Premium doküman kilidi | Plan durumuna göre erişim | ✅ |
| Dev aktivasyon | Geliştirme ortamında plan atlama | ✅ |

### 4.5 Admin Panel

| Özellik | Açıklama | Durum |
|---------|----------|-------|
| Dashboard | Kullanıcı sayısı, sohbet, mesaj istatistikleri | ✅ |
| Post yönetimi | Blog, sayfa, doküman CRUD | ✅ |
| Kullanıcı tablosu | Son 50 kullanıcı, rol, plan, aktivite | ✅ |

### 4.6 Arayüz ve Deneyim

| Özellik | Açıklama | Durum |
|---------|----------|-------|
| Çok dilli UI | ar, de, en, es, fr, ja, zh | ✅ |
| Dark/Light tema | next-themes ile tema değiştirme | ✅ |
| Responsive | Mobil uyumlu tasarım | ✅ |

---

## 5. Teknik Mimari

### 5.1 Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Veritabanı | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (Credentials, JWT) |
| AI | Google Gemini (gemini-2.5-flash) |
| Ödeme | Paddle |
| i18n | next-intl |
| Styling | Tailwind CSS |

### 5.2 Proje Yapısı

```
src/
├── app/
│   ├── [locale]/           # Lokalize sayfalar
│   │   ├── (auth)/         # Login, Register
│   │   ├── (dashboard)/    # Chat, Dashboard, Profile, vb.
│   │   └── page.tsx       # Ana sayfa
│   └── api/               # API route'ları
├── components/
├── constants/
├── lib/
└── messages/              # next-intl çevirileri
```

### 5.3 Veri Modeli (Özet)

- **User:** email, name, password, nativeLang, targetLang, cefrLevel, role, planStatus, paddleCustomerId
- **Conversation:** userId, messages
- **Message:** conversationId, role, content, translation, correction
- **Post:** title, slug, content, category (blog|page|document), language, published, isPremium, authorId

---

## 6. API Endpoints

| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/api/auth/[...nextauth]` | * | NextAuth oturum yönetimi |
| `/api/auth/register` | POST | Yeni kullanıcı kaydı |
| `/api/chat` | POST | AI sohbet mesajı gönder |
| `/api/conversations` | GET | Kullanıcının sohbet listesi |
| `/api/conversations/[id]` | GET, DELETE | Sohbet detay / silme |
| `/api/user/profile` | GET, PATCH | Profil okuma/güncelleme |
| `/api/user/languages` | POST | Dil tercihleri güncelleme |
| `/api/user/dashboard` | GET | Dashboard istatistikleri |
| `/api/user/plan-status` | GET | Plan durumu |
| `/api/posts` | GET | Yayınlanmış postlar (liste) |
| `/api/paddle/create-transaction` | POST | Paddle checkout başlat |
| `/api/paddle/webhook` | POST | Paddle ödeme webhook |
| `/api/admin/posts` | GET, POST | Admin post listesi / oluşturma |
| `/api/admin/posts/[id]` | PATCH, DELETE | Admin post güncelleme / silme |
| `/api/dev/activate-plan` | POST | [DEV] Plan aktivasyonu |

---

## 7. Kullanıcı Akışları

### 7.1 Yeni Kullanıcı Kaydı

1. Ana sayfa → "Hadi Başlayalım"
2. Register → Ad, e-posta, şifre
3. Plan seçimi (Temel / Pro)
4. Ödeme (Paddle) veya [DEV] atlama
5. Onboarding → Ana dil, hedef dil, CEFR
6. Dashboard → Chat'e yönlendirme

### 7.2 Mevcut Kullanıcı Girişi

1. Login → E-posta, şifre
2. Dashboard
3. Chat / Blogs / Documents / Profile

### 7.3 Chat Akışı

1. Chat sayfası → Sohbet listesi (sidebar)
2. Yeni sohbet veya mevcut sohbet seçimi
3. Mesaj yaz → AI yanıtı (içerik + çeviri + düzeltme)
4. Konuşma geçmişi saklanır

---

## 8. Fonksiyonel Olmayan Gereksinimler

| Gereksinim | Hedef |
|------------|-------|
| **Performans** | Chat yanıt süresi < 5 sn (ortalama) |
| **Güvenlik** | Şifre bcrypt hash, JWT session |
| **Rate limit** | 30 mesaj/dakika kullanıcı başına |
| **Erişilebilirlik** | Temel a11y (aria-label, semantic HTML) |
| **SEO** | next-intl ile locale-aware meta |

---

## 9. Ortam Değişkenleri

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `DATABASE_URL` | ✅ | PostgreSQL connection URL |
| `DIRECT_URL` | ✅ | Prisma direct URL |
| `NEXTAUTH_SECRET` | ✅ | NextAuth güvenlik anahtarı |
| `NEXTAUTH_URL` | ✅ | Uygulama base URL |
| `GEMINI_API_KEY` | ✅ | Google AI Studio API anahtarı |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | ❌ | Paddle frontend token |
| `PADDLE_API_KEY` | ❌ | Paddle backend key |
| `PADDLE_WEBHOOK_SECRET` | ❌ | Webhook doğrulama |
| `NEXT_PUBLIC_PADDLE_PRICE_MONTHLY` | ❌ | Aylık plan price ID |
| `NEXT_PUBLIC_PADDLE_PRICE_ANNUAL` | ❌ | Yıllık plan price ID |
| `DEV_SECRET` | ❌ | Dev plan aktivasyonu |

---

## 10. Gelecek Yol Haritası

### Faz 1 (Mevcut)
- [x] Temel auth, chat, içerik modülleri
- [x] Paddle entegrasyonu
- [x] Admin panel
- [x] Tema (dark/light) ve çok dilli UI

### Faz 2 (Planlanan)
- [ ] Sesli konuşma (STT/TTS)
- [ ] E-posta doğrulama
- [ ] Şifre sıfırlama
- [ ] E-posta bildirimleri

### Faz 3 (İleri)
- [ ] Mobil uygulama (React Native / PWA)
- [ ] Topluluk / arkadaş ekleme
- [ ] Gamification (rozetler, liderlik tablosu)
- [ ] Offline mod

---

## 11. Ekler

### A. Desteklenen Diller (UI)

- Arapça (ar)
- Almanca (de)
- İngilizce (en)
- İspanyolca (es)
- Fransızca (fr)
- Japonca (ja)
- Çince (zh)

### B. Öğrenilebilir Diller

~35 dil: Afrikaanca, Arapça, Bengalce, Çince, Hollandaca, İngilizce, Fince, Fransızca, Almanca, Yunanca, Guceratça, Hintçe, Endonezce, İtalyanca, Japonca, Korece, Malayca, Marathi, Norveççe, Farsça, Lehçe, Portekizce, Pencapça, Romence, Rusça, İspanyolca, Svahili, İsveççe, Tamilce, Tayca, Türkçe, Ukraynaca, Urduca, Vietnamca.

### C. CEFR Seviyeleri

A1, A2, B1, B2, C1, C2

---

*Bu PRD, AiTut projesinin mevcut durumunu ve planlanan gelişimini tanımlar. Güncellemeler `docs/PRD.md` üzerinden takip edilir.*
