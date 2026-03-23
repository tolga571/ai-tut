# Backend dayanıklılık planı — “tüm site kapanıyor” riski

Amaç: Kullanıcı veya altyapı kaynaklı hatalar **mümkün olduğunca tek özelliği** etkilesin; **tüm sayfaların beyaz ekran / genel çökme** olasılığını azaltmak.

---

## 1) Mevcut durumda gözlenen riskler (kod incelemesi)

### P0 — Çok geniş etki alanı

| Risk | Konum | Neden tehlikeli |
|------|--------|-------------------|
| **DB env yoksa modül seviyesinde throw** | `src/lib/prisma.ts` — `DATABASE_URL` / `DIRECT_URL` yoksa `throw` | `prisma` import edilen **her** server route / RSC yükü başarısız olabilir; yapılandırma hatası **tüm siteyi** etkileyebilir. |
| **Middleware’de try/catch yok** | `src/middleware.ts` — `getToken`, `intlMiddleware` | Beklenmeyen exception (ör. secret, edge runtime uyumsuzluğu) **korumalı tüm rotalarda** 500 / kırık akış. |
| **Global / locale `error.tsx` yok** | `src/app/` altında bulunamadı | RSC veya layout’ta yakalanmayan hata → kullanıcıya Next varsayılanı; **kurtarma / yönlendirme** yok. |

### P1 — Orta risk

| Risk | Not |
|------|-----|
| **API 500’de ham `error.message`** | Örn. `chat/route.ts` catch içinde `error.message` JSON’a gidiyor | Prod’da iç detay / stack sızıntısı; güvenlik + kafa karışıklığı. |
| **Session callback** | `auth.ts` içinde DB hatası için fallback var (iyi) | Devam edilebilir; token’da eksik alan senaryoları gözden geçirilebilir. |
| **Health yok** | Railway / uptime için **DB’siz** “ok” ve **DB’li** ayrı endpoint yok | Deploy sonrası “çalışıyor mu?” anlamı zor. |

### İyi taraflar (korunmuş yerler)

- `chat` API POST/GET: `try/catch` + JSON hata dönüşü.
- `authorize` + `session` callback: DB hatasında kullanıcıya anlamlı mesaj veya token fallback.

---

## 2) Hedef mimari (özet)

1. **Kritik yol (middleware):** Asla exception yüzeyine çıkmasın; hata olursa **güvenli yönlendirme** (ör. login veya statik “hizmet geçici” sayfası).
2. **Veri katmanı:** `DATABASE_URL` eksikliği **mümkünse** ilk istekte kontrollü hata (veya operasyonel olarak env zorunluluğu + deploy öncesi kontrol).
3. **Kullanıcı arayüzü:** `error.tsx` / `global-error.tsx` ile **yeniden dene + ana sayfaya dön**.
4. **API:** Prod’da **sabit kullanıcı mesajı** + log sunucuda; iç detay sızmasın.
5. **Gözlemlenebilirlik:** `/api/health` (veya `/api/health/ready`) ile load balancer / Railway kontrolü.

---

## 3) Uygulama fazları (öncelik sırası)

### Faz A — Hemen (P0)

- [ ] **Middleware sarmalayıcı:** Tüm `middleware` gövdesi `try/catch` içinde; catch’te:
  - log (kısa, PII yok),
  - `NextResponse.redirect` → `/{locale}/login` veya **statik** `/[locale]/error?reason=service` (i18n uyumlu tek sayfa).
- [ ] **`app/[locale]/error.tsx`:** `reset()` ile yeniden deneme, `Link` ile home/login.
- [ ] **`app/global-error.tsx`:** Root layout altındaki kritik hatalar için (minimal HTML + “yeniden yükle”).

### Faz B — Kısa vadede (P1)

- [ ] **[`/api/health`](./api/health)** (veya `health/live` + `health/ready`):
  - `live`: process yanıt veriyor (DB yok),
  - `ready`: `prisma.$queryRaw\`SELECT 1\`` veya `findFirst` — DB yoksa **503** (Railway restart tetiklenebilir).
- [ ] **API hata yanıtları:** Prod’da `NODE_ENV === "production"` için `error: "Something went wrong"`; detay sadece `console.error` server-side.
- [ ] **Chat / kritik route’lar:** Özellikle 500 gövdesindeki `error.message` kaldırma / maskeleme.

### Faz C — Orta vade (P2)

- [ ] **Prisma init:** İsteğe bağlı: `getPrisma()` lazy + singleton; env yoksa modül throw yerine **null** ve route’larda 503 (büyük refactor — V1’de opsiyonel; çoğu zaman **env doğrulama + CI** yeterli).
- [ ] **Smoke test:** GitHub Actions veya lokal script: `lint`, `build`, `curl /api/health` staging’de.
- [ ] **Rate limit / timeout:** Zaten bazı route’larda var; chat için upstream timeout netleştirme.

### Faz D — Operasyonel

- [ ] Deploy checklist: `DATABASE_URL`, `NEXTAUTH_SECRET`, Paddle env’leri dolu mu.
- [ ] İsteğe bağlı: Sentry / Logflare — 5xx oranı alarmı.

---

## 4) “Tüm site çalışmıyor” senaryolarına göre öncelik

| Senaryo | Önerilen ilk müdahale |
|---------|------------------------|
| DB down / env yanlış | Health 503 + `error.tsx` + middleware’in çökmemesi |
| JWT / secret sorunu | Middleware catch → login; log’da `[AUTH]` |
| Tek API patladı | Chat sadece chat’i etkiler; UI toast (zaten var) — API mesajını maskele |
| Layout/RSC throw | `error.tsx` ile kurtarma |

---

## 5) V1 ile ilişki

Bu plan, **V1-RELEASE-PLAN.md** içindeki “her şeyin düzgün çalıştığından emin olma” maddesinin **backend güvenliği** ayağıdır. V1 etiketinden önce en azından **Faz A + Faz B’nin health + API maskeleme** kısmı tamamlanması önerilir.

---

## 6) Sonraki adım

Onayla: Önce **Faz A (middleware + error.tsx + global-error)** kod değişikliklerini uygulayalım; ardından **health endpoint** ve API mesaj maskeleme.

Bu belge yalnızca **plan**dır; uygulama ayrı commit’lerle yapılmalıdır.
