Tamamlananlar:
- Dashboard app bar ve layout (Faz 1)
- TS/ESLint build kontrolleri ve tüm lint/type hatalarının giderilmesi (Faz 2)
- Middleware ile dashboard/chat/progress/vocabulary/blogs/pages/documents koruması (Faz 3)
- Onboarding zorunluluğu ve `onboardingCompleted` alanı ile yönlendirme (Faz 4)
- Chat için konu/senaryo butonları ve Gemini prompt’unda topic kullanımı (Faz 5)
- Konu/senaryo için `Conversation.topicId/topicLabel` alanları eklenmesi ve schema/DB senkronu
- Konu seçildiğinde her zaman yeni conversation açılması ve sol listede topic etiketinin gösterilmesi

Mevcut Durum:
- Kod: `src/app/[locale]/(dashboard)/chat/ChatInterface.tsx` içinde topic seçimi yeni konuşma başlatıyor ve `getConvTitle` topic etiketini kullanıyor.
- Backend: `src/app/api/chat/route.ts` yeni conversation oluştururken `topicId/topicLabel` alanlarını Prisma Conversation kaydına yazıyor.
- DB: `prisma/schema.prisma` ve canlı Postgres şeması `Conversation.topicId/topicLabel` alanlarını içeriyor.

Kritik Değişkenler:
- DB bağlantısı: Railway üzerinden Supabase/PostgreSQL, `DATABASE_URL`/`DIRECT_URL` SSL ile (`sslmode=require&uselibpqcompat=true&sslaccept=accept_invalid_certs`).
- Auth: NextAuth JWT stratejisi, `User` modelinde `onboardingCompleted` alanı, middleware bu alana göre `/onboarding` yönlendirmesi yapıyor.
- Chat modeli: `/api/chat` Gemini 2.x flash modellerini sırasıyla deniyor, response JSON formatında bekleniyor.

Sıradaki Adım:
- Kelime/quiz akışını güçlendirmek: chat mesajlarından tek tıkla vocabulary’ye kelime ekleme ve `VocabularyWord` için hafif bir tekrar (review) mantığı tasarlayıp uygulamak.

