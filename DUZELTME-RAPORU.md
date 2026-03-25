# 🔍 AiTut — Mantık Hatası & Güvenlik Analiz Raporu
**Tarih:** 2026-03-25
**Kapsam:** Son kullanıcı akışı, erişim kontrolü, ödeme entegrasyonu, navigasyon, API güvenliği

---

## 🚨 KRİTİK HATALAR (Hemen Düzeltilmeli)

---

### BUG-01 — Navbar'daki "Go to Chat" butonu plan kontrolü yapmıyor
**Dosya:** `src/components/DashboardAppBar.tsx` (satır 41–46)
**Önem:** 🔴 KRİTİK

**Sorun:**
```tsx
<Link href="/chat" ...>
  {t("goToChat")}
</Link>
```
Bu `<Link>` doğrudan `/chat` adresine gönderir. Middleware'deki plan kontrolü (`planStatus !== "active"` → `/pricing` yönlendirmesi) teorik olarak doğru ancak **JWT token'ındaki `planStatus` alanı stale (eski) kalabilir.**

**Kök neden — JWT Stale Token Problemi:**
`src/lib/auth.ts` içindeki `jwt()` callback sadece ilk giriş sırasında (`if (user)` bloğu) `planStatus`'u token'a yazar:
```ts
async jwt({ token, user, trigger, session }) {
  if (user) {  // ← SADECE giriş anında çalışır
    token.planStatus = user.planStatus;
  }
  if (trigger === "update" && session?.planStatus) {
    token.planStatus = session.planStatus;  // ← Sadece manuel update() çağrıldığında
  }
  return token;
}
```
Kullanıcı giriş yaptığında `planStatus: "inactive"` token'a yazılır. Ödeme yapıldıktan sonra Paddle webhook DB'yi günceller ama JWT token otomatik yenilenmez. Sonraki request'lerde middleware eski token'daki `inactive` değerini okur ve her seferinde `/pricing`'e yönlendirir.

**Ek sorun:** `session()` callback'i DB'den her seferinde taze veri çekiyor (`prisma.user.findUnique`), ama middleware `getToken()` ile doğrudan JWT'yi okuyup DB'ye hiç bakmıyor. Bu iki farklı veri kaynağı arasında tutarsızlık yaratır.

**Gerçek senaryo bu yüzden olabilir:**
Kullanıcı kayıt olup girince → JWT'ye `planStatus: "inactive"` yazılır → pricing sayfasına yönlendirilir → `DashboardAppBar` pricing sayfasında da görünüyor mu? Görünüyorsa "Go to Chat" butonu tıklanabiliyor → middleware token'ı okur → token hâlâ `inactive` → `/pricing`'e yönlendiriyor. Yani aslında middleware çalışıyor ama **kullanıcı deneyimi kötü**: buton görünüyor ama çalışmıyor gibi hissettiriyor.

**Düzeltme:**
1. `jwt()` callback'inde her token yenilemesinde DB'den `planStatus` çekilmeli (en güvenli yol)
2. Ya da middleware'de `getToken` yerine gerçek DB sorgusu yapılmalı
3. `DashboardAppBar`'da "Go to Chat" linki `planStatus`'a göre koşullu gösterilmeli

---

### BUG-02 — Pricing sayfası `/dashboard` grubunun içinde ama plan yoksa erişilemiyor
**Dosya:** `src/app/[locale]/(dashboard)/pricing/page.tsx`
**Önem:** 🔴 KRİTİK

**Sorun:**
`pricing` sayfası `(dashboard)` layout'u içinde yer alıyor ve `DashboardShell` → `DashboardAppBar`'ı render ediyor. Yani plan olmadan pricing'e gelen kullanıcı navbar'da "Go to Chat" butonunu görüyor. Bu düğmeye tıklaması → middleware `/pricing`'e geri yönlendiriyor → kısır döngü yaratma riski.

Ayrıca `pricing` yolu `PROTECTED_PATHS` içinde **yok**, bu yüzden giriş yapmamış kullanıcılar da `/pricing`'e erişebilir. Bu kasıtlı mı belirsiz.

**Düzeltme:**
- Pricing sayfasında plan kontrolü yapılıp "zaten aktif plan var" mesajı gösterilmeli ve `/chat`'e yönlendirilmeli
- Ya da pricing, dashboard layout'undan çıkarılmalı (ayrı bir layout ile)

---

### BUG-03 — Chat sayfasında server-side plan kontrolü yok
**Dosya:** `src/app/[locale]/(dashboard)/chat/page.tsx` (satır 17–21)
**Önem:** 🔴 KRİTİK

**Sorun:**
```ts
const session = await getServerSession(authOptions);
if (!session?.user) {
  redirect({ href: "/login", locale });
}
// ← planStatus kontrolü YOK!
return <ChatInterface ... />
```
Chat page server component'ı sadece `session` varlığını kontrol ediyor. `planStatus` kontrolü yok. Middleware atlansaydı (Next.js edge case'leri, direct API call, middleware bug) chat sayfası yüklenirdi.

**Not:** API (`/api/chat`) backend'de `planStatus` kontrol ediyor, bu iyi. Ama page.tsx server tarafında da kontrol edilmeli — defense in depth prensibi.

**Düzeltme:**
```ts
const planStatus = (session.user as { planStatus?: string }).planStatus;
if (planStatus !== "active") {
  redirect({ href: "/pricing", locale });
}
```

---

### BUG-04 — Dashboard sayfasındaki /chat linkleri plan kontrolü yapmıyor
**Dosya:** `src/app/[locale]/(dashboard)/dashboard/page.tsx`
**Önem:** 🟠 YÜKSEK

**Sorun:**
Dashboard sayfasında plan olmayan kullanıcıya aşağıdaki linkler gösteriliyor:
- Satır 288: `<Link href="/chat">Practice now</Link>` (banner içinde)
- Satır 303: `<Link href="/chat">` (ana büyük CTA butonu)
- Satır 322: `<Link href="/chat">View All</Link>` (recent conversations)
- Satır 338: `href={`/chat?conv=${conv.id}`}` (conversation listesi)
- Satır 364: `<Link href="/chat">Start first</Link>`

Bu linkler plan olmayan kullanıcıya da görünüyor. Middleware yakalıyor ama UX açısından çok kötü: kullanıcı her butona tıkladığında pricing'e geri atılıyor, ne yapması gerektiğini anlamıyor.

**Düzeltme:**
Dashboard'da `session?.user?.planStatus` değerine göre:
- Plan yoksa: `/chat` linkleri yerine `/pricing`'e yönlendiren butonlar göster
- "Önce plan seç" mesajı veya CTA ekle

---

### BUG-05 — JWT token'ında `planStatus` ödeme sonrası güncellenmez (ana stale token sorunu)
**Dosya:** `src/lib/auth.ts` + `src/app/api/paddle/webhook/route.ts`
**Önem:** 🔴 KRİTİK

**Sorun:**
Paddle webhook başarılı ödeme sonrası DB'yi günceller:
```ts
await prisma.user.update({ data: { planStatus: "active" } });
```
Ancak kullanıcının mevcut JWT session token'ı bu değişikliği **otomatik olarak yansıtmaz**. Kullanıcı ödeme yapıp `pricing?checkout=success` sayfasına döndüğünde:
```ts
// pricing/page.tsx satır 48
await update();  // ← Bu NextAuth session update'i tetikliyor
```
`update()` çağrısı `jwt` callback'ini `trigger === "update"` ile çağırıyor AMA `session.planStatus` yoksa token güncellenmez:
```ts
if (trigger === "update" && session?.planStatus) {
  token.planStatus = session.planStatus;  // ← session.planStatus nereden geliyor?
}
```
`update()` çağrısı boş çağrıldığında `session` parametresi `undefined` olur → `planStatus` güncellenmez → middleware hâlâ `inactive` görür.

**Düzeltme:**
`pricing/page.tsx`'de `update()` yerine `update({ planStatus: "active" })` çağrılmalı. Ya da daha güvenli yol: `jwt` callback her çağrıldığında DB'den `planStatus` çeksin.

---

## 🟠 ORTA ÖNEME SAHIP HATALAR

---

### BUG-06 — `conversations` API endpoint'i plan kontrolü yapmıyor
**Dosya:** `src/app/api/conversations/route.ts`
**Önem:** 🟠 YÜKSEK

**Sorun:**
`GET /api/conversations` endpoint'i sadece auth kontrolü yapıyor, `planStatus` kontrolü yok. Plan olmayan kullanıcı da konuşma listesini çekebilir.

**Düzeltme:**
Plan kontrolü eklenmeli:
```ts
const planStatus = (session.user as { planStatus?: string }).planStatus;
if (planStatus !== "active") {
  return NextResponse.json({ error: "Subscription required" }, { status: 403 });
}
```

---

### BUG-07 — `conversations/[id]` API endpoint'i incelenmedi — muhtemelen aynı sorun
**Dosya:** `src/app/api/conversations/[id]/route.ts`
**Önem:** 🟠 YÜKSEK

Tek konuşma endpoint'i de plan kontrolü içermiyor olabilir. Kontrol edilmeli.

---

### BUG-08 — Dashboard sayfası `pricing` sayfasına yönlendirmiyor
**Dosya:** `src/app/[locale]/(dashboard)/dashboard/page.tsx`
**Önem:** 🟠 YÜKSEK

**Sorun:**
Giriş yapan ama planı olmayan kullanıcı `/dashboard`'a düşüyor. Dashboard hiçbir şekilde "plan al" mesajı vermiyor veya pricing'e yönlendirmiyor. Kullanıcı bütün içerikleri görüyor, sadece chat'e tıklayınca fırlatılıyor.

Onboarding akışına benzer bir mekanizma: `planStatus !== "active"` ise middleware `/pricing`'e yönlendirebilir (yeni bir middleware kuralı) ya da dashboard page.tsx içinde kontrol edilebilir.

---

### BUG-09 — Ödeme başarılı sayfasında çift toast riski
**Dosya:** `src/app/[locale]/(dashboard)/pricing/page.tsx` (satır 45–51)
**Önem:** 🟡 ORTA

**Sorun:**
```ts
const refreshAfterCheckout = useCallback(async () => {
  if (checkoutHandled.current) return;
  checkoutHandled.current = true;
  await update();
  toast.success(t("checkoutSuccess"));
  router.replace("/pricing");  // ← tekrar /pricing'e yönlendiriyor
}, ...);
```
`router.replace("/pricing")` aynı sayfaya yönlendiriyor. `?checkout=success` parametresi temizleniyor ama yönlendirme `/dashboard` veya `/chat` olmalı. Kullanıcı ödeme yaptı, neden hâlâ pricing sayfasında kalsın?

**Düzeltme:**
`router.replace("/dashboard")` veya `router.replace("/chat")` olmalı.

---

### BUG-10 — `pricing` sayfasında aktif plan sahibi kullanıcıya özel mesaj yok
**Dosya:** `src/app/[locale]/(dashboard)/pricing/page.tsx`
**Önem:** 🟡 ORTA

**Sorun:**
`planStatus === "active"` olan kullanıcı `/pricing`'e gittiğinde normal plan kartları gösteriliyor. "Zaten aktif planın var, chat'e git" mesajı ya da otomatik yönlendirme yok.

---

### BUG-11 — `word-of-day` API endpoint'i plan kontrolü yapmıyor
**Dosya:** `src/app/api/word-of-day/route.ts`
**Önem:** 🟡 ORTA

Dashboard'daki "Word of the Day" widget'ı plan olmadan da çalışıyor. Bu premium bir özellikse kısıtlanmalı.

---

## 🟡 DÜŞÜK ÖNCELİKLİ / İYİLEŞTİRME ÖNERİLERİ

---

### BUG-12 — Dev endpoint production'da güvensiz olabilir
**Dosya:** `src/app/api/dev/activate-plan/route.ts`
**Önem:** 🟡 ORTA

`NODE_ENV === "production"` kontrolü var ama Next.js'te `NODE_ENV` her zaman güvenilir değildir. Railway gibi platform'larda env değerleri karışabilir. Ek olarak `DEV_SECRET` tanımlanmamışsa hiçbir secret kontrolü yapılmıyor.

**Düzeltme:**
`DEV_SECRET` zorunlu yapılmalı; yoksa endpoint tamamen kapatılmalı.

---

### BUG-13 — `pricing` sayfasının `(dashboard)` grubunda olması kafa karıştırıcı
**Önem:** 🟡 DÜŞÜK

Pricing sayfası hem public landing page'de hem de dashboard içinde var gibi görünüyor (`/components/Pricing.tsx` landing için, `/app/.../pricing/page.tsx` authenticated için). İki ayrı component bu şekilde yönetmek tutarsızlığa yol açabilir.

---

### BUG-14 — `ChatInterface.tsx` localStorage cache kullanıyor
**Dosya:** `src/app/[locale]/(dashboard)/chat/ChatInterface.tsx` (satır 30)
**Önem:** 🟡 DÜŞÜK

```ts
const CONVERSATIONS_CACHE_KEY_PREFIX = "chat_conversations_cache_v1";
```
Konuşmalar localStorage'da cache'leniyor. Plan iptal edildiğinde bu cache temizlenmiyor. Plan olmayan kullanıcı eski konuşmaları localStorage'dan görebilir.

---

## 📋 DÜZELTME ÖNCELİK SIRASI

| # | Bug | Dosya | Öncelik |
|---|-----|-------|---------|
| 1 | JWT stale token — `jwt()` callback DB'den okumalı | `auth.ts` | 🔴 KRİTİK |
| 2 | Chat page'de server-side plan kontrolü yok | `chat/page.tsx` | 🔴 KRİTİK |
| 3 | `update()` çağrısı planStatus'u geçirmiyor | `pricing/page.tsx` | 🔴 KRİTİK |
| 4 | Dashboard'daki tüm /chat linkleri plan kontrolsüz | `dashboard/page.tsx` | 🟠 YÜKSEK |
| 5 | Navbar "Go to Chat" — plan yoksa pricing'e link et | `DashboardAppBar.tsx` | 🟠 YÜKSEK |
| 6 | `conversations` API plan kontrolü yok | `conversations/route.ts` | 🟠 YÜKSEK |
| 7 | Ödeme sonrası yönlendirme pricing değil dashboard olmalı | `pricing/page.tsx` | 🟠 YÜKSEK |
| 8 | Plan sahibi kullanıcıya pricing'de "aktif plan" mesajı | `pricing/page.tsx` | 🟡 ORTA |
| 9 | `conversations/[id]` API plan kontrolü kontrol edilmeli | `conversations/[id]/route.ts` | 🟠 YÜKSEK |
| 10 | DEV endpoint zorunlu secret | `dev/activate-plan/route.ts` | 🟡 ORTA |

---

## ✅ DOĞRU ÇALIŞAN KISIMLAR

- `middleware.ts` → `/chat` için `planStatus` kontrolü mantıksal olarak doğru ✅
- `/api/chat` POST ve GET → Backend'de `planStatus !== "active"` kontrolü var ✅
- Paddle webhook → İmza doğrulaması (HMAC-SHA256) + replay attack koruması ✅
- Onboarding zorunluluğu → Middleware doğru çalışıyor ✅
- Admin yetki kontrolü → `token.role !== "admin"` → dashboard yönlendirmesi ✅
- Rate limiting → Chat API'de `checkRateLimit` uygulanmış ✅
- Dev endpoint → Production'da devre dışı ✅

---

*Rapor otomatik olarak kayıt edildi: 2026-03-25*
