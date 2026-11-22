# Gelecek Planı — Öneriler

> **Durum:** **Delil Tier 1 v2.208'de uygulandı.** Bu belgedeki diğer konular
> (LLM, rapor, Rust/Tauri, delil Tier 2) **öneridir**; uygulanmamıştır.
> Uygulanmadan önce ölçüm, test ve kullanıcı onayı gerekir.
>
> **Güncel sürüm:** v2.211.

## 0. Öncelik sırası (kullanıcı kararı)

1. ~~**Delil edinme** — hızlı geçiş: minimum standart + paket doğrulama.~~
   **v2.208'de yapıldı (Tier 1).**
2. **LLM** — hızlı çalışan çözüm: yerel, ölçülmüş, yalnız taslak.
3. **Rapor** — bölüm yapısı + kurumsal biçim.
4. **Uzun vade:** saf Rust / Tauri yeniden yazım (opsiyonel).

Her konu **tek sürüm** olarak ele alınır; konular aynı sürüme karıştırılmaz.

---

## 1. Delil edinme

Ayrıntılı standart ve `delil.json` şeması: [`DELIL_EDINME.md`](DELIL_EDINME.md).

### Sorun

Mevcut akış: USB'yi Windows'a tak → dosyaları kopyala → teslim bilgisini elle
gir. Bu akış:

- cihazı **salt-okunur** yapmaz (Windows arka planda yazabilir),
- **imaj** almaz (silinmiş veri/boş alan gelmez),
- **kaynaktaki hash**i kaydetmez,
- cihaz bilgisini **otomatik** toplamaz,
- **zincir** kaydı üretmez.

### Seçenekler

| # | Seçenek | Ne yapar | Süre | Risk | Adli değer | Kurulum |
|---|---|---|---|---|---|---|
| 0 | Mevcut akış | Dosya kopyası + elle bilgi | — | Yüksek | Düşük | Yok |
| A | **PowerShell Tier 1** | USB listeler, salt-okunur, dosya kopyası, SHA-256, `delil.json` | **En hızlı** | Düşük | Orta | Yok |
| B | **Rust CLI Tier 1** | Aynısı; Windows+Linux tek binary | Orta | Düşük | Orta | Binary |
| C | **Rust CLI Tier 2** | + tam DD imajı, ham SHA-256, sıkıştırma | Orta-yüksek | Orta | Yüksek | Binary |
| D | **Yerel ajan + web** | Tarayıcıdan "Cihazı tara", otomatik | Uzun | Orta-yüksek | Yüksek | Kurulum |
| E | **Tauri masaüstü** | Tam deneyim, tek program | Çok uzun | Geliştirme | Yüksek | Kurulum |
| F | **Donanım write-blocker + FTK/Guymager** | En savunulabilir edinme | Para + eğitim | En düşük | En yüksek | Para |

### Önerilen yol

**A → B → (C) → (D, isteğe bağlı).**

1. **v2.208 — A: YAPILDI.** PowerShell Tier 1 + `delil.json` + AKİS
   "Delil paketi yükle". Bugün çalışır, kurulum istemez, kanıt zinciri üretir.
2. **Sonraki — B:** Aynı şema ve akış Rust CLI'ye taşınır; PowerShell emekliye
   ayrılır. A'nın emeği kaybolmaz; **sözleşme `delil.json`'dur**.
3. **İsteğe bağlı — C:** Tam DD imajı; kurgusal USB'de ölçülmeden gerçek delile
   uygulanmaz.
4. **İsteğe bağlı — D:** Yerel ajan + web; B'nin üstüne UX. CORS/Private Network
   Access ve güvenlik ölçülmeden söz verilmez.
5. **F:** En iyi kanıt yatırımı. Alınmazsa yazılımsal salt-okunur + dürüst etiket.

### Dürüst sınırlar

- Yazılımsal salt-okunur, donanım write-blocker **değildir**.
- Kendi aracımız doğrulanmış adli araç **değildir**; "deneysel" etiketi taşır.
- Tier 1 "imaj" değil, "belgelenmiş dosya kopyası"dır.
- Tarayıcı tek başına USB'yi göremez; "tarama" ancak yerel ajanla olur.

---

## 2. LLM (yerel yazı yardımcısı)

### Bugüne kadar ölçülen (v2.206 → v2.207'de kaldırıldı)

| Deneme | Sonuç |
|---|---|
| Qwen2.5-0.5B · q4f16 · WebGPU | Çöp çıktı (Kiril), yavaş |
| Qwen2.5-1.5B · q4f16 · WebGPU | `Aborted()` — 6 GB kartta bellek hatası |
| Qwen2.5-0.5B · int8 · WASM | Türkçe ama **sadakatsiz**; metinde olmayan içerik uyduruyor |
| Qwen2.5-1.5B · int8 · WASM | Türkçe ama konuyla ilgisiz, genel metin |

**Sonuç:** Tarayıcıda çalışan 0,5–1,5B modeller Türkçe hukuki metinde güvenilir
taslak üretmiyor. Tarayıcı-içi küçük model yolu **kapatıldı**.

### Seçenekler

| # | Seçenek | Ne yapar | Süre | Risk | Not |
|---|---|---|---|---|---|
| A | Tarayıcı küçük model (0.5–1.5B) | — | — | — | ❌ Ölçüldü, kullanılamaz |
| B | Tarayıcı yeni model (Qwen3.5-0.8B-Text / Gemma 4) | Daha iyi olabilir | Orta | Kütüphane v4 + Whisper regresyonu | Gemma 4 ~3,3 GB; ölçülmedi |
| C | **Yerel native LLM** (llama.cpp / ONNX Runtime, Rust) | 3–4B model, GPU | Uzun | Binary + model + bakım | Kalite yüksek olabilir |
| D | **Ollama (yerel sunucu)** | Kur, model indir, `127.0.0.1:11434` | **Kısa** | Kurulum + CORS/PNA | **En hızlı çalışan yol** |
| E | **LLM'siz deterministik yardımcılar** | Terim/konu listesi, soru↔bölüm eşleştirme, seçmeli özet | **En kısa** | Düşük | Uydurma yok; indirme yok |
| F | Bulut LLM | — | — | Veri koruma | ❌ Reddedildi |

### Önerilen yol

1. **Şimdi — E:** Deterministik yardımcılar. Hızlı, güvenli, gerçek katkı:
   - soru ↔ ilgili bölüm eşleştirme (zaman damgalı),
   - sık geçen terim/konu listesi,
   - seçmeli (extractive) özet — yeni cümle yazmaz.
2. **LLM isteniyorsa — D (Ollama):** 4B sınıfı bir model (6 GB RTX 3060'a sığar).
   - Veri cihazdan çıkmaz; yerel sunucu.
   - `OLLAMA_ORIGINS` ile tarayıcı origin'i açılır; **Private Network Access**
     engeli test edilir. Engel varsa uygulama yerel olarak servis edilir veya
     küçük bir yerel proxy kullanılır.
   - Çıktı yine **taslak**: yalnız onaylı metin, rapora kendiliğinden girmez,
     sayı/isim denetimi + bayatlık + insan onayı korunur.
3. **Uzun vade — C:** Native LLM yardımcısı; Tauri/Rust ile tek binary.

### Dürüst sınırlar

- 0,5–1,5B tarayıcı modelleri bu iş için yetersiz; tekrar denenmez.
- Ollama/native çözümlerde de **uydurma riski** vardır; guard yalnız sayı/isim
  yakalar, anlam kaymasını yakalamaz.
- LLM çıktısı **hiçbir zaman** rapora kendiliğinden girmez.

---

## 3. Rapor

### Seçenekler

| # | Seçenek | Ne yapar | Değer | Risk |
|---|---|---|---|---|
| A | **Bölüm/başlık tek kaynak** (`ALAN_SISTEMI` §5C) | Başlık, sıra, TOC tek yerden; üç çıktı aynı | Yüksek | Orta |
| B | **Kurumsal kâğıt biçimi** | Başlık bandı, sayfa no, imza bloğu, tablo tipografisi | Orta | Düşük |
| C | **Okuma metni** (v2.202'de yapıldı) | Bölümlerden salt-okunur okuma metni | — | — |
| D | **LLM destekli taslak** | Bölüm/başlık/özet taslağı | Yüksek | LLM'e bağlı |
| E | **Hazırlık/kapsama** (v2.149–v2.156) | Eksik listesi, kapsam | — | — |

### Önerilen yol

**A → B → (D, LLM çalışırsa).**

- A: Rapor bölümleri/başlıkları tek kaynak; HTML/DOCX/UDF aynı metni üretir
  (`rapor-tutarlilik-testi` korur).
- B: Kâğıt biçimi; yazdırma ve UDF sayfa ayarları bozulmaz.
- D: Ancak LLM kararı verilirse; taslak + insan onayı + fark ekranı.

### Dürüst sınırlar

- Rapor **bilirkişi adına** yazılır; uygulama/LLM adı geçmez.
- LLM taslağı onaysız rapora girmez.
- Kurumsal biçim değişikliği UDF/DOCX çıktısını bozmamalı; üç çıktı birlikte
  test edilir.

---

## 4. Uzun vade: saf Rust / Tauri

### Seçenekler

| # | Seçenek | Ne yapar | Süre | Risk |
|---|---|---|---|---|
| A | **Web uygulaması + native yardımcılar** | Edinme/LLM ayrı Rust binary; web aynı kalır | Kısa-orta | Düşük |
| B | **Tauri kabuğu** | Web arayüzü + native komutlar tek program | Orta-uzun | Orta |
| C | **Tam Rust yeniden yazım** | Her şey Rust | Çok uzun | Yüksek |

### Önerilen yol

**A → B → (C, gerekirse).**

- A: Edinme aracı Rust; web uygulaması değişmez. `delil.json` köprüdür.
- B: Tauri, mevcut HTML/CSS/JS'i sarar; native edinme + LLM komutları ekler.
  GitHub Pages bağımlılığı azalır; imzalı kurulum gerekir.
- C: Ancak A/B oturduktan ve gerçek ihtiyaç doğduktan sonra. DOCX/UDF üretimi,
  WebGPU/transformers.js, testler ve dağıtım yeniden yazılır; büyük iş.

### Dürüst sınırlar

- Tam Rust yeniden yazım **aylar** sürer; bu proje için şu an doğru değil.
- Tauri kurulumu imza/antivirüs/kurum onayı gerektirir.
- Web uygulaması GitHub Pages'te kalırsa güncelleme kolaydır; Tauri'de sürüm
  dağıtımı ayrı bir süreçtir.

---

## 5. Karar tablosu (özet)

| İş | Değer | Emek | Risk | Öneri |
|---|---|---|---|---|
| Delil Tier 1 (PowerShell) + AKİS import | Yüksek | Düşük | Düşük | **İlk iş** |
| LLM'siz deterministik yardımcılar | Orta-yüksek | Düşük | Düşük | **İlk iş** |
| LLM via Ollama (4B) | Yüksek | Orta | Orta | Ölçümden sonra |
| Rapor bölüm yapısı + biçim | Yüksek | Orta | Orta | Üçüncü iş |
| Rust CLI Tier 1 | Orta-yüksek | Orta | Düşük | Tier 1'den sonra |
| DD imajı (Tier 2) | Yüksek | Orta-yüksek | Orta | Ölçümden sonra |
| Yerel ajan + web | Yüksek UX | Yüksek | Orta-yüksek | Sonra |
| Tauri / tam Rust | Stratejik | Çok yüksek | Yüksek | Uzun vade |

## 6. Önerilen sürüm sırası

1. **v2.208 — Delil Tier 1: YAPILDI.** `delil.json` + PowerShell `edinme.ps1`
   + AKİS "Delil paketi yükle" + hash doğrulama + rapor satırı.
2. **v2.209 — Hızlı yardımcılar (LLM'siz):** soru↔bölüm eşleştirme, terim/konu
   listesi, seçmeli özet.
3. **v2.210 — LLM (Ollama) — isteğe bağlı:** 4B model, taslak-only, guard,
   bayatlık; CORS/PNA ölçümü.
4. **v2.211 — Rapor:** bölüm/başlık tek kaynak + kurumsal biçim.
5. **Sonra:** Rust CLI edinme, DD imajı, yerel ajan, Tauri.

Bu sıra **öneridir**; kullanıcı her adımda durdurabilir veya sırayı değiştirebilir.

## 7. Açık sorular

- Delil kapsamı: yalnız ses dosyaları mı, tüm dosyalar mı?
- Paket: klasör mü, ZIP mi?
- Donanım write-blocker alınacak mı?
- LLM: Ollama kabul edilebilir mi (kurulum + model indirme)?
- Rapor: önce bölüm yapısı mı, kâğıt biçimi mi?
- Rust/Tauri: ne zaman, hangi kapsamda?

## 8. Karar günlüğü

| Tarih | Konu | Karar | Gerekçe |
|---|---|---|---|
| 2026-11-22 | LLM (tarayıcı) | Kaldırıldı | Ölçüm: çöp/sadakatsiz çıktı |
| 2026-11-22 | Planlama | Bu belge eklendi | Seçenekleri kayda geçirmek |

## 9. Delil envanteri (v2.212–v2.215)

v2.208–v2.211 ile edinme + doğrulama çalışıyor. Kullanıcı kararı: paket
**“imaj gibi”** düşünülecek; içinde bilinmeyen dosyalar olabilir. Aşağıdaki
sıra onaylandı.

| Sürüm | İş | Not |
|---|---|---|
| **v2.212** | Teslim/operatör ayrımı + rapor düzeltmesi | `delivery` alanları, operatör sicili, **D: rapora yazılmaz**, marka/model/seri/etiket |
| **v2.213** | Disk envanteri + paket v2 | `disk.json` (partition/volume anlık görüntüsü), `icerik/<etiket\|seri\|marka>/...`, varsayılan **tüm dosyalar**, `-AudioOnly`; v1 uyumlu |
| **v2.214** | Envanter arayüzü | ağaç, filtre, paket özeti, “Elle ekle (paketsiz)” ikincil |
| **v2.215** | Hızlı akış | “Paketten yeni dosya” sihirbazı, ilerleme, hatırlama, toplu |

**Kararlar:**

- **Teslim eden ≠ operatör.** Teslim eden: flash'ı bilirkişiye veren
  mahkeme/merci personeli. Operatör: edinmeyi fiilen yapan (bilirkişi/yardımcı).
  İkisi ayrı kaydedilir; rapor ikisini ayrı gösterir.
- **Sürücü harfi (D:) kanıt kimliği değildir;** raporda yok. `device.volumes`
  yalnız `delil.json` teknik izinde.
- **Varsayılan tüm dosyalar;** `-AudioOnly` büyük medya için. AKİS yalnız
  `audio` rolünü materyal yapar; diğerleri envanterde görünür.
- **Kök klasör:** etiket → seri → marka (sanitize). `ses/` adı terk edilir.
- **`disk.json`:** raw/sıfır yok; disk/partition/volume metadata.
- **Elle “Dosya ekle” hemen kaldırılmaz;** ikincil “Elle ekle (paketsiz)” olur.
  Kaldırma, envanter UI oturduktan sonra ölçümle.

**Açık sorular:**

1. Envanter yeri: “Ses” içinde ağaç mı, yeni “Envanter” ray öğesi mi?
2. `-AudioOnly` eşiği (öneri: 8 GB üstünde uyarı).
3. Teslim eden sicili zorunlu mu? (öneri: isteğe bağlı).
4. Teslim yeri/şekli rapora ayrı satır mı? (öneri: evet, isteğe bağlı).
5. Hukuki usul: kurumun standardı teyit edilecek.


## 10. İlgili belgeler

- [`DELIL_EDINME.md`](DELIL_EDINME.md) — delil standardı ve `delil.json`
- [`YOL_HARITASI.md`](YOL_HARITASI.md) — sürüm planı
- [`ALAN_SISTEMI.md`](ALAN_SISTEMI.md) — alan/şema sistemi
- [`STANDARTLAR.md`](STANDARTLAR.md) — çalışma standartları
