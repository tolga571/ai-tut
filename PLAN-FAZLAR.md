# AiTut – Fazlı Geliştirme Planı

Her faz için önce onay alınacak, onay sonrası uygulama yapılacak.

---

## Faz 1 – Giriş yapmış kullanıcı için ortak app bar (Dashboard shell)

**Amaç:** Dashboard, profile, vocabulary, progress, blogs, pages, documents sayfalarında tutarlı üst bar: logo, Dashboard/Chat linki, Profile, Log out.

**Yapılacaklar:**
- Dashboard layout’unda (veya tüm `(dashboard)` sayfalarını saran ortak layout) sabit bir **DashboardNavbar** / **AppBar** bileşeni eklemek.
- Bu bar: logo (Ana sayfaya/Dashboard’a), Chat, Profile, ThemeToggle, UserMenu (çıkış dahil).
- Chat sayfası kendi header’ını koruyabilir; diğer sayfalarda bu ortak bar kullanılacak.
- Navbar.tsx mantığı: public sayfalarda mevcut Navbar, korumalı sayfalarda bu yeni AppBar gösterilsin (veya LayoutWrapper/tek layout ile tek bar, path’e göre içerik değişsin).

**Çıktı:** Giriş yapmış kullanıcı her sayfada hesap ve çıkışa erişebilir.

**Onay:** [x] Onaylandı — Uygulandı (Faz 1)

---

## Faz 2 – Build kalitesi (TypeScript / ESLint)

**Amaç:** Production build’in hata ile geçmemesi; kod kalitesi kontrollerinin açık olması.

**Yapılacaklar:**
- `next.config.mjs`: `ignoreDuringBuilds: false` (veya bu satırı kaldırmak), `ignoreBuildErrors: false` (veya kaldırmak).
- `npm run build` çalıştırıp oluşan TypeScript/ESLint hatalarını tespit etmek.
- Tespit edilen hataları düzeltmek (tip düzeltmeleri, eksik tipler, lint kuralları).

**Çıktı:** `npm run build` hatasız tamamlanır; proje production build’e hazır.

**Onay:** [ ] Bekliyor

---

## Faz 3 – Korumalı sayfaların middleware ile korunması

**Amaç:** /vocabulary, /progress, /blogs, /pages sayfalarının giriş yapmamış kullanıcıya kapalı olması; login’e yönlendirme.

**Yapılacaklar:**
- `src/middleware.ts` içinde `PROTECTED_PATHS` listesine `/vocabulary`, `/progress`, `/blogs`, `/pages` eklemek.
- (İsteğe bağlı) `/pricing` public kalsın; listeye eklenmeyecek.

**Çıktı:** Bu sayfalar sadece oturum açmış kullanıcıya açık; değilse locale’li login’e yönlendirilir.

**Onay:** [ ] Bekliyor

---

## Faz 4 – İlk girişte onboarding yönlendirmesi

**Amaç:** Yeni kayıt veya ilk girişte kullanıcının dil/CEFR tercihini yapması için onboarding’e yönlendirilmesi.

**Yapılacaklar:**
- Kullanıcı giriş yaptıktan sonra: eğer henüz “onboarding tamamlandı” sayılmıyorsa (ör. `nativeLang`/`targetLang` varsayılan mı veya ayrı bir “onboardingCompleted” flag’i) `/onboarding`’e yönlendirmek.
- Mantık: Dashboard (veya ortak bir layout) içinde kontrol; gerekirse session veya API’den “onboarding gerekli mi?” bilgisi.
- Mevcut onboarding sayfası kullanılacak; sadece yönlendirme koşulu eklenecek.

**Çıktı:** Yeni kullanıcılar en az bir kez hedef dil ve CEFR seviyesi seçer.

**Onay:** [ ] Bekliyor

---

## Faz 5 – Rate limit (production için not / opsiyonel Redis)

**Amaç:** Çok sunucu ortamında rate limit’in anlamlı çalışması için dokümantasyon ve (isteğe bağlı) basit genişletme noktası.

**Yapılacaklar:**
- `src/lib/rateLimit.ts` dosyasının başında veya README’de kısa bir yorum: “Production’da çok instance kullanılıyorsa Redis (veya paylaşımlı storage) ile değiştirin” notu.
- İsteğe bağlı: `checkRateLimit` için bir “adapter” imzası (örn. env’e göre in-memory vs Redis) taslağı; bu fazda sadece mevcut in-memory kalsın, sadece not/gelecek için hazırlık.

**Çıktı:** Sonraki production deploy’da rate limit stratejisi netleşmiş olur.

**Onay:** [ ] Bekliyor

---

## Faz 6 – Test altyapısı ve ilk testler (opsiyonel)

**Amaç:** Kritik akışlar için çalıştırılabilir testler ve `npm run test`.

**Yapılacaklar:**
- Vitest (veya Jest) + gerekirse React Testing Library kurulumu; `package.json`’a `test` script’i.
- En az 1–2 kritik API veya yardımcı fonksiyon için örnek test (örn. `rateLimit.checkRateLimit`, veya register validation).
- README’de “Testleri çalıştırmak: npm run test” notu.

**Çıktı:** Projede test komutu ve örnek testler vardır; CI’a eklenebilir.

**Onay:** [ ] Bekliyor

---

## Özet sıra

| Faz | Konu                          | Onay sonrası uygulama |
|-----|-------------------------------|------------------------|
| 1   | Dashboard app bar (UX)        | Evet                   |
| 2   | Build kalitesi (TS/ESLint)   | Evet                   |
| 3   | Middleware korumalı yollar   | Evet                   |
| 4   | Onboarding yönlendirmesi     | Evet                   |
| 5   | Rate limit dokümantasyonu   | Evet                   |
| 6   | Test altyapısı (opsiyonel)  | Evet                   |

---

**Şu an:** Faz 1 onayını bekliyorum. Onay verirseniz Faz 1 maddelerini uygulayacağım.
