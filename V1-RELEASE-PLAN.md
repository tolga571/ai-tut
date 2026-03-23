# V1 dondurma ve V2 süreci — plan (güncel)

Bu belge, **Versiyon 1** kapsamını, **Paddle ile ücretlendirme + ödeme sonrası chat**, V1 etiketinden önce **test ve doğrulama** yükümlülüklerini ve **Versiyon 2** kurallarını tanımlar.

---

## 1) Amaç

- **V1:** Ürün **ücretli** çalışır: kullanıcı ödeme (Paddle) tamamlanana kadar **chat’e giremez**; ödeme onayından sonra chat ve ilgili ücretli deneyim açılır. Deploy **stabil**, davranış **testlerle doğrulanmış**, sınırlar yazılı.
- **V2:** V1’i bozmadan yeni büyük özellikler (ör. Kitten TTS / bulut TTS, mobil, büyük UI revizyonu) **ayrı plan / milestone** ile gelir; `v1.0.0` etiketi geriye dönük referans kalır.

---

## 2) V1 kapsamı — ürün tanımı

### 2.1 Zaten projede olan yapı (Paddle iskeleti)

Aşağıdaki dosyalar mevcut entegrasyonu özetler; V1’de bunların **uçtan uca prod-ready** hale getirilmesi hedeflenir:

| Bileşen | Konum / not |
|--------|--------------|
| Checkout (Paddle.js) | `src/app/[locale]/(dashboard)/pricing/page.tsx` — `customData.userId` webhook ile eşleşmeli |
| İşlem oluşturma (API) | `src/app/api/paddle/create-transaction/route.ts` |
| Webhook | `src/app/api/paddle/webhook/route.ts` — `transaction.completed` / `transaction.paid` / `subscription.*` → `planStatus: "active"` |
| Plan alanı | Prisma `User.planStatus` (`inactive` \| `active`), `paddleCustomerId` |
| Oturum | `src/lib/auth.ts` — JWT/session’da `planStatus` |

### 2.2 V1’de özellikle tamamlanması gereken iş: ödeme → chat kilidi

**Bugün:** `src/middleware.ts` yalnızca giriş + onboarding kontrol ediyor; **`planStatus` ile `/chat` kısıtlanmıyor.**

**V1 tanımı:**

- [ ] `planStatus !== "active"` iken **`/chat`** (ve gerekiyorsa chat API’si) **erişilemez**; kullanıcı anlamlı şekilde **`/pricing`** (veya “ödeme beklemede” sayfası) yönlendirilir.
- [ ] Ödeme başarılı → webhook `planStatus: "active"` → kullanıcı **oturumu yenileyebilmeli** (`update()` veya kısa gecikmeyle `/api/user/plan-status` kontrolü) ve **chat’e gidebilmeli**.
- [ ] Abonelik iptali / gecikme webhook’larında `inactive` ile chat tekrar kapanmalı (mevcut webhook’ta kısmen var; senaryolar netleştirilmeli).

### 2.3 V1’deki diğer ürün parçaları

- Kimlik: kayıt / giriş, şifre sıfırlama (NextAuth + Prisma)
- Onboarding (zorunlu alanlar tamam)
- Dashboard, **ücretli kullanıcı için** chat (Gemini), konu/senaryo, geçmiş
- Kelime hazinesi + quiz (ücretli mi ücretsiz mi — **karar verilmeli**; chat kesin ücretliyse vocabulary’nin de aynı politikada olması tutarlı olur)
- Çok dilli UI (next-intl)
- TTS: tarayıcı **Web Speech API** (V1’de sunucu TTS zorunlu değil)

### 2.4 Kayıt akışı ile ödeme uyumu

`register` akışında “plan seçimi” adımı **gerçek Paddle ödemesi** ile aynı hikâyede olmalı:

- [ ] Ya kayıt sonrası kullanıcı **zorunlu** olarak **pricing + checkout**’a yönlendirilir,
- Ya da mevcut adım gerçek **priceId** ve **webhook** ile sonuçlanacak şekilde sadeleştirilir.

Bu madde V1 “ödeme alıyoruz” tanımı için **ürün tutarlılığı** şartıdır.

---

## 3) “V1 Definition of Done” — kalite çubuğu

V1 etiketi (**§5**) ancak aşağıdakiler **yeşil** olduktan sonra konur.

### 3.1 Ürün akışı (smoke — manuel veya otomatik)

- [ ] Kayıt → giriş → **ödeme öncesi chat’e girilemiyor**
- [ ] Pricing → Paddle checkout (sandbox **ve** canlı ortam checklist’i) → webhook → DB’de `active`
- [ ] Ödeme sonrası chat: mesaj gönderme, AI cevabı, vocabulary’ye ekleme (kapsam dahilse)
- [ ] Şifre sıfırlama (prod e-posta env’leri varsa uçtan uca)
- [ ] Kritik sayfalar 404/500 üretmiyor (login, register, pricing, chat, vocabulary)

### 3.2 Testler (V1 için zorunlu)

**Hedef:** “Her şeyin düzgünce çalıştığından emin olmak” tekrarlanabilir olsun.

- [ ] **Lint:** `npm run lint` temiz (veya istisnalar tek satırda dokümante)
- [ ] **Build:** `npm run build` CI veya eşdeğerinde başarılı
- [ ] **Otomatik testler (eklenecek):**
  - [ ] Birim / entegrasyon: kritik API’ler (ör. webhook imza doğrulaması mantığı, `planStatus` güncellemesi — mock DB veya test DB ile)
  - [ ] **E2E (öneri: Playwright):** “giriş yapmış, `inactive` → /chat engeli → pricing’e yönlendirme”; “`active` → chat açılır” (session mock veya test kullanıcı + DB seed)
- [ ] **Paddle:** Webhook’u yerelde **Paddle CLI / replay** veya imzalı örnek payload ile doğrulama prosedürü yazılmış (`README` veya `docs/`)

### 3.3 Teknik / dokümantasyon

- [ ] `.env.example` güncel: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_PRICE_*`, `NEXTAUTH_*`, `DATABASE_URL`, e-posta için gerekli değişkenler
- [ ] `README.md`: kurulum, env, Paddle sandbox vs production, webhook URL’si, deploy özeti
- [ ] **Paddle ortamı:** `pricing/page.tsx` şu an `environment: "sandbox"` sabit; V1’de **production’da live** için `NEXT_PUBLIC_PADDLE_ENV` veya benzeri ile ayrım netleştirilmeli

### 3.4 Veritabanı ve deploy riski (kritik)

- [ ] `package.json` `build` içindeki `prisma db push --accept-data-loss` prod için **risklidir**. V1 öncesi karar:
  - **Önerilen:** `prisma migrate deploy` + build’den `db push` çıkarma
  - **Geçici:** en azından prod pipeline’da `--accept-data-loss` kaldırılmalı

### 3.5 Güvenlik / gizlilik

- [ ] API route’larında hassas log yok
- [ ] Test kullanıcı endpoint’i yalnızca development’ta bilgi döndürüyor
- [ ] Gizli anahtarlar repoda yok
- [ ] Webhook: imza doğrulaması açık; raw body kullanımı korunuyor

---

## 4) Versiyon kaydı (V1’i nasıl “kilitleyiz”)

Koşul: **§3 tamamlandı** (özellikle ödeme + chat kilidi + testler).

1. `package.json` → `"version": "1.0.0"`
2. `CHANGELOG.md` — **v1.0.0**: Paddle ödeme, chat kilidi, test kapsamı özeti
3. `git tag -a v1.0.0 -m "Version 1.0.0"` + `git push origin v1.0.0`
4. İsteğe bağlı: GitHub Release

**Beğenilmezse / sorun çıkarsa:** `git revert` ile son release commit’i veya tag’e karşılık gelen değişiklikler geri alınabilir (önceki konuşmadaki gibi).

---

## 5) V2 kuralları

- Yeni büyük işler: milestone `v2` veya commit/PR öneki `v2:`
- V1 patch: sadece kritik düzeltmeler → `1.0.x`
- `PROGRESS.md`: V1 tamamlanma tarihi + V2 backlog

---

## 6) V2 backlog örneği (ödeme artık V1’de)

- Alternatif TTS (Kitten TTS, Google Cloud TTS, …)
- İlerleme ekranı zenginleştirme
- Mobil / PWA
- Ek ödeme senaryoları (kupon, trial, farklı planlar) — **V2’de genişletme** olarak

---

## 7) Sonraki somut adımlar (uygulama sırası önerisi)

1. **Middleware + API:** `inactive` kullanıcıyı `/chat` ve gerekiyorsa `/api/chat` dışında bırak; yönlendirme metinleri i18n.
2. **Register / dashboard CTA:** “Chat” her zaman ödeme sonrası; tutarsız butonları kaldır.
3. **Paddle prod/sandbox** ayrımı ve `.env.example` + README.
4. **Test altyapısı:** Playwright + (isteğe bağlı) webhook unit testleri.
5. **DB build stratejisi** kararı (`db push` vs `migrate deploy`).
6. §3 yeşil → §4 tag.

---

Bu belge **plan**dır; maddelerin kod karşılığı ayrı commit’lerle uygulanmalıdır.
