Tamamlananlar:
- Dashboard app bar ve layout (Faz 1)
- TS/ESLint build kontrolleri ve tüm lint/type hatalarının giderilmesi (Faz 2)
- Middleware ile dashboard/chat/progress/vocabulary/blogs/pages/documents koruması (Faz 3)
- Onboarding zorunluluğu ve `onboardingCompleted` alanı ile yönlendirme (Faz 4)
- Chat için konu/senaryo butonları ve Gemini prompt’unda topic kullanımı (Faz 5)
- Konu/senaryo için `Conversation.topicId/topicLabel` alanları eklenmesi ve schema/DB senkronu
- Konu seçildiğinde her zaman yeni conversation açılması ve sol listede topic etiketinin gösterilmesi
- Kelime/quiz akışının güçlendirilmesi:
  - Chat içinde AI mesajlarından tek tıkla vocabulary’ye kelime/ifade ekleme
  - `VocabularyWord` için hafif review alanları (`reviewCount`, `correctStreak`, `lastReviewedAt`, `nextReviewAt`)
  - Quiz akışında doğru/yanlış cevaba göre review metriklerinin güncellenmesi ve öncelikle süresi gelen kelimelerin sorulması
  - Railway tarafında Prisma schema senkronunun build sırasında otomatik çalışması (`prisma db push && next build`)
  - Chat’ten kaydedilen kartlarda tam mesaj + grammar notunun (correction) vocabulary’de gösterilmesi
  - Vocabulary kartının profesyonel yapıya getirilmesi: hiyerarşi, “İpucu” etiketli amber kutu, etiketli footer (Eklenme, tekrar · seri)
- Vocabulary/Chat için TTS: SpeechSynthesis ile sesli okuma kontrollerinin eklenmesi
  - Chat’te “Listen” yalnızca ana cevap kısmını (target dil) okur, orta translation blokunu okuma
  - Sarı “grammar note” (correction) iki parçaya ayrılır:
    - target dildeki düzeltme bölümü target voice/aksanıyla
    - native dildeki açıklama bölümü native voice/aksanıyla okunur
  - Correction içindeki ikon/ok işaretleri TTS için temizlenir (kalem/pencil okunmaz)
  - Native açıklama içindeki İngilizce/ASCII kelimeler target dil sesini kullanacak şekilde okunur (Coffee vb. bozulmaz)
- Vocabulary Quiz’in egzersiz çeşitliliğinin artırılması:
  - `Multiple Choice`, `Fill in the Blank`, `Matching Pairs` modları
  - Matching modunda spaced-repetition mantığıyla due kelimelerin önceliklenmesi
  - Matching doğru/yanlış seçimlerinde `/api/vocabulary/:id` üzerinden review metriklerinin güncellenmesi
- Şifre sıfırlama (forgot/reset) akışının eklenmesi:
  - `PasswordResetToken` için Prisma model + DB tarafı
  - Forgot password & Reset password UI/route’ları
  - E-posta gönderimi (nodemailer) ile reset linki üretimi
- Prod güvenliği: Login sayfasındaki hardcoded test credentials kaldırılıp dev-only endpoint’e taşınması
- Bildirim sistemi (minimal): Dashboard’ta “Bugün henüz pratik yapmadın” hatırlatma banner’ının eklenmesi
- Onboarding güçlendirme:
  - Hedef (learningGoal) ve ilgi alanı (interestArea) seçimleri
  - `/api/user/languages` üzerinden DB’ye kaydedilmesi
- **Paddle ödeme entegrasyonu:**
  - Paddle checkout akışı ve webhook yönetimi eklendi
  - Ödeme başarıyla test edildi ve çalışıyor (2026-03-25)

Mevcut Durum:
- Kod: `src/app/[locale]/(dashboard)/chat/ChatInterface.tsx` içinde topic seçimi yeni konuşma başlatıyor ve `getConvTitle` topic etiketini kullanıyor.
- Frontend:
  - `src/app/[locale]/(dashboard)/vocabulary/page.tsx` — kartlarda sesli okuma (TTS) kontrolü var.
  - `src/app/[locale]/(dashboard)/vocabulary/quiz/page.tsx` — çok modlu quiz + matching (due + review PATCH).
  - `src/app/[locale]/(auth)/login/page.tsx` — forgot password linki var; test credentials sadece dev-only endpoint ile geliyor.
  - `src/app/[locale]/(auth)/forgot-password/page.tsx` & `src/app/[locale]/(auth)/reset-password/page.tsx` — UI eklendi.
  - `src/app/[locale]/(dashboard)/onboarding/page.tsx` — goal/interest seçimleri eklendi.
- Backend:
  - `src/app/api/chat/route.ts` yeni conversation oluştururken `topicId/topicLabel` alanlarını Prisma Conversation kaydına yazıyor.
  - `src/app/api/auth/forgot-password/route.ts` & `src/app/api/auth/reset-password/route.ts` — reset token üretimi + şifre güncelleme.
  - `src/app/api/user/dashboard/route.ts` — daily hatırlatma için `hasActivityToday` döndürüyor.
- DB: `prisma/schema.prisma` (Conversation topic alanları + `PasswordResetToken` + onboarding preferences) canlı Postgres şemasıyla senkronlanacak.

Kritik Değişkenler:
- DB bağlantısı: Railway üzerinden Supabase/PostgreSQL, `DATABASE_URL`/`DIRECT_URL` SSL ile (`sslmode=require&uselibpqcompat=true&sslaccept=accept_invalid_certs`).
- Auth: NextAuth JWT stratejisi, `User` modelinde `onboardingCompleted` alanı, middleware bu alana göre `/onboarding` yönlendirmesi yapıyor.
- Chat modeli: `/api/chat` Gemini 2.x flash modellerini sırasıyla deniyor, response JSON formatında bekleniyor.

- **Plan gating — tam erişim kontrolü (2026-03-25):**
  - Middleware: onboarding sonrası plan yoksa tüm korumalı sayfalar /pricing'e yönlendirir
  - /pricing PROTECTED_PATHS'e eklendi (giriş zorunlu)
  - chat/page.tsx, /api/conversations, /api/conversations/[id]: server-side plan guard
  - /api/user/dashboard, /api/user/progress: plan guard eklendi
  - /api/vocabulary GET+POST, /api/vocabulary/[id] DELETE+PATCH: plan guard eklendi
  - /api/word-of-day: plan guard eklendi (Gemini maliyet koruması)
  - JWT jwt() callback: her token yenilemesinde DB'den planStatus taze okunuyor
  - Ödeme sonrası update({ planStatus: "active" }) + /dashboard yönlendirmesi
  - Aktif planlı kullanıcı /pricing'e gelirse /chat'e yönlendiriliyor
  - Onboarding tamamlanınca /pricing'e yönlendirme (dashboard yerine)
  - DashboardAppBar: plan yoksa "Go to Chat" /pricing'e işaret eder
  - dashboard/page.tsx: tüm chat linkleri plan durumuna göre yönetilir
  - dev/activate-plan: DEV_SECRET zorunlu hale getirildi

Sıradaki Adım:
- (Opsiyonel) Faz 6: Dashboard/Progress tarafında XP ve quiz performansını görselleştiren daha zengin bir ilerleme ekranı tasarlamak (streak/quiz detayları + bildirim derinleştirme).