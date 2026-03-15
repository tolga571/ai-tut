# AiTut

AI destekli dil öğrenme platformu. Hedef dilde sohbet edin, anlık çeviri ve gramer düzeltmeleri alın.

**Stack:** Next.js 14, Prisma, PostgreSQL, NextAuth, Gemini AI, next-intl

---

## Geliştirme Ortamı Kurulumu

### 1. Bağımlılıkları yükleyin

```bash
npm install
```

### 2. Ortam değişkenlerini ayarlayın

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyip gerekli değerleri girin. Zorunlu değişkenler:

- `DATABASE_URL` – Runtime bağlantı URL'i (Supabase pooler için `:6543`, `sslmode=require`)
- `DIRECT_URL` – Prisma direct URL (Supabase direct host için `:5432`, `sslmode=require`)
- `NEXTAUTH_SECRET` – Rastgele güvenli string (`openssl rand -base64 32`)
- `NEXTAUTH_URL` – Geliştirme için `http://localhost:3000`
- `GEMINI_API_KEY` – [Google AI Studio](https://aistudio.google.com/) API anahtarı

### 3. Veritabanını hazırlayın

```bash
npx prisma generate
npm run db:push
```

### 4. Geliştirme sunucusunu başlatın

```bash
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın. `next-intl` varsayılan olarak `/en` ile yönlendirir.

---

## Railway ile Deploy

### 1. Railway projesi oluşturun

- [Railway](https://railway.app/) hesabı açın
- Yeni proje oluşturun
- GitHub repo'nuzu bağlayın

### 2. PostgreSQL ekleyin

- Railway dashboard'da **Add Service** → **Database** → **PostgreSQL**
- Oluşan `DATABASE_URL` ve `DIRECT_URL` değerlerini kopyalayın

### 3. Ortam değişkenlerini ayarlayın

Railway'de servisinize tıklayın → **Variables** sekmesi → aşağıdaki değişkenleri ekleyin:

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `DATABASE_URL` | ✅ | Railway PostgreSQL connection URL |
| `DIRECT_URL` | ✅ | Railway PostgreSQL direct URL |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` ile üretin |
| `NEXTAUTH_URL` | ✅ | Railway uygulama URL'i (örn. `https://aitut-xxx.railway.app`) |
| `GEMINI_API_KEY` | ✅ | Google AI Studio API anahtarı |

**Önemli:** `NEXTAUTH_URL` deploy sonrası Railway'in verdiği public URL olmalı (örn. `https://your-app-name.up.railway.app`).

### 4. Deploy

- GitHub'a push yaptığınızda Railway otomatik build ve deploy yapar
- İlk deploy'dan sonra **Deploy** → **Settings** → **Generate Domain** ile public URL alın
- Bu URL'i `NEXTAUTH_URL` olarak güncelleyin ve tekrar deploy tetikleyin

### 5. Veritabanı schema'sını uygulayın

İlk deploy'dan sonra Railway CLI ile veya **One-off command** ile:

```bash
npm run db:push
```

Bu komutu proje root'unda bir kez çalıştırmanız yeterli. Schema değişikliği yaptığınızda tekrar çalıştırın.

---

## Proje Yapısı

- `src/app/[locale]/` – Locale'li sayfalar (ar, de, en, es, fr, ja, zh)
- `src/app/api/` – API route'ları
- `src/components/` – Paylaşılan bileşenler
- `messages/` – next-intl çeviri dosyaları

---

## Lisans

Private
