# Uçtan Uca Akış Denetimi — 56.12 Bilirkişisi (gözden geçirme)

> **Amaç:** Yeni özellik eklemek değil; bilirkişinin **dosyayı başlatmasından
> raporu teslim etmesine** kadar tüm akışı **gözüyle** denetlemek. Otomatik
> hazır gelmesi gereken yerler hazır gelsin, otomatik oluşturulması gerekenler
> otomatik oluşsun. Bu belge **bulguları + planı** tutar; uygulama sonraki
> oturumlarda **tek konu = tek sürüm** disipliniyle yapılır.
>
> **Durum:** ÖLÇÜM YAPILDI (v2.311). Henüz kod değişikliği yok.

## 1. Yöntem (ölçüm, tahmin değil)

- **Gerçek Chromium** (headless, temiz profil) + CDP; arayüz tıklanarak gezildi.
- **Kod kanıtı**: ilgili fonksiyon/satırlar (aşağıda).
- Akış: **Dashboard (Özet) → Dosya → Ses/Deşifre → İncele (Sorular) → Rapor**.

## 2. Ölçülen mevcut durum (v2.311)

| Ölçüm | Sonuç |
|---|---|
| Sol ray görünümleri | `overview · audio · questions · report` — **"Dosya" görünümü YOK** |
| "Dosya bilgileri" nerede | Sağ **çekmece** (`#caseDrawer`), üst barda ✎ / `data-goto="case"` |
| Dashboard'da son teslim tarihi | **YOK** (`TESLİM` metni yok) |
| Dashboard'da "kaç gün kaldı" | **YOK** |
| `#reportDate` (rapor tarihi) | **otomatik bugün** ✓ |
| `#assignmentDate` (görevlendirme tarihi) | çekmecede boş geliyor (ölçüm: `''`) |
| Süre (gün) girilince son teslim tarihi | **otomatik DOLMUYOR** (30 gün girdim → `dueDate` boş kaldı) |
| Dosya oluşturma zamanı | `case.createdAt` **var** (freshCase) ama **hiçbir yerde gösterilmiyor** |
| "Dosya açılışından bu yana" | **YOK** (createdAt'ten hesaplanabilir) |
| JS hatası | 0 |

Kod kanıtı:
- `freshCase()` içinde `assignment: { date: dateToday(), dueDate:'', durationDays:'' }` (görevlendirme tarihi varsayılanı bugün).
- **`dueDate`'i `date + durationDays`'ten hesaplayan HİÇBİR işleyici yok** (grep: yalnız ayna/şema/kapak).
- `reportDate` yalnız form doldurulurken `dateToday()` ile önerilir.
- Kapak "SON TESLİM TARİHİ" ve "RAPOR TARİHİ" basar; **kalan gün** hiçbir yerde yok.

## 3. Bulgular (aşama aşama, önem sırası)

### A. Dashboard (Özet) — **P1**
- Var: 4 istatistik (kayıt/süre/bölüm/%kontrol), 4 adımlı iş akışı durumu,
  künye özeti (merci/dosya no/konu/bilirkişi), iş yükü, durum çubuğu.
- **Eksik:** **son teslim tarihi** ve **kalan gün**; "rapor teslimine ne kadar
  var", "gecikme riski". Bilirkişinin en kritik sorusu bu.
- **Eksik:** "rapor teslimi için gerekenler" özeti (hazırlık kartı yalnız Rapor
  ekranında; dashboard'da görünmüyor).

### B. Dosya (künye) — **P1**
- **Ayrı adım/sayfa yok**; çekmecede. Kullanıcı "Dosya" adımını akışta görmek
  istiyor (Dashboard → **Dosya** → Deşifre → İncele → Rapor).
- **Son teslim tarihi otomatik hesaplanmıyor** (görevlendirme tarihi + süre).
- Görevlendirme tarihi çekmecede boş geliyor (varsayılan bugün olmalı).
- Künye doğrulaması: zorunlu alanlar (dosya no, mahkeme, bilirkişi) var; ancak
  "süre/tarih" alanları arasında **tutarlılık denetimi** yok (ör. bitiş <
  başlangıç; rapor tarihi > son teslim).

### C. Ses / Deşifre — **P2 (çoğunlukla iyi)**
- Dosya ekleme, çözümleme (tümü/dosya/bölüm), bölümleme, konuşmacı ön-atama,
  canlı vurgu, geri alma: **hazır ve akıcı**.
- Otomatik: TOC/numara/kapak alanları raporda veriden üretiliyor.
- Not: ASR modeli bu ortamda çalıştırılmadı (indirme gerekir); ses hattı
  v2.279'da ölçülmüştü.

### D. İncele (Sorular) — **P2**
- Soru ekleme, dayanak (bölüm bağlama), "ilgili bölümleri öner" (v2.307): var.
- **Eksik:** soruların **görevlendirme yazısından** otomatik taslak gelmesi
  (dosya no/merci gibi alanlar elle). Bu bir "otomatik oluşturulması gereken"
  aday; ancak serbest metin → soru çıkarımı **deterministik değil**, dikkatli
  ele alınmalı (aşağıda "dürüst sınır").

### E. Rapor — **P1**
- Hazırlık kartı (engelleyen/uzman/iyileştirme), TOC, numara, kapak, ekler,
  UDF/DOCX: var. **Rapor tarihi otomatik bugün.**
- **Eksik:** raporda/araç çubuğunda **"son teslim tarihine kalan gün"** ve
  **teslim kontrol listesi** özeti (hazırlık kartı var ama "teslim" diliyle
  değil).
- **Eksik:** "rapor tarihi"nin son teslimle ilişkisi (rapor tarihi > son teslim
  ise uyarı yok).

## 4. "Otomatik olması gerekenler" tablosu

| Alan / iş | Şu an | Olması gereken |
|---|---|---|
| Rapor tarihi | otomatik bugün ✓ | (koru) |
| Görevlendirme tarihi | boş/elle | **varsayılan bugün** |
| Son teslim tarihi | elle | **görevlendirme + süre** (elle ezilebilir) |
| Kalan gün | yok | **son teslim − bugün** (dashboard + rapor) |
| Dosya açılışından bu yana | yok | **bugün/rapor tarihi − createdAt** |
| İş akışı adım durumu | var ✓ | (koru, "Dosya" adımını ekle) |
| Kapak/künye alanları | veriden ✓ | (koru) |
| TOC / numara | otomatik ✓ | (koru) |
| Rapor teslim gerekenleri | Rapor ekranında | **dashboard'da da özet** |
| Sorular (görev yazısından) | elle | **öneri** (deterministik değilse YAPMA) |

## 5. "Dosya bilgileri": çekmece mi, sayfa mı?

**Öneri: ayrı bir "Dosya" görünümü (sayfa) — akışın 2. adımı.**
- Ray: **Özet · Dosya · Ses/Deşifre · İncele · Rapor**.
- Çekmece hızlı düzenleme için kalabilir (üst bar ✎); **ana giriş sayfa olur**.
- Sayfa, künyeyi **bölümlere** ayırır: Merci/Dosya · Taraflar · Bilirkişi ·
  Görevlendirme (tarih/süre/**son teslim**/konu) · Ekip. Üstte **kalan gün**
  ve **tamamlanma** göstergesi.
- Gerekçe: künye, dosyanın **kimliği**; çekmecede "gizli" kalıyor ve akışta
  adım olarak görünmüyor. (Ölçüm: ray'de "Dosya" yok.)

## 6. Dürüst sınırlar

- **"Kaç gün kaldı"** yalnız **son teslim tarihi** girliyse hesaplanır; tarih
  yoksa "—" (uydurma yok). Saat dilimi: gün farkı yerel güne göre.
- **Soruları görev yazısından otomatik çıkarma** deterministik değildir; LLM
  olmadan güvenilir değil. Yapılırsa **öneri** olarak ve **insan onayıyla**
  sunulmalı; "otomatik dolduruldu" denmemeli.
- Bu denetimde **ASR/model** çalıştırılmadı (indirme gerekir); ses hattı ayrı
  ölçülmüştü (v2.279).

## 7. Önerilen plan (her adım ayrı sürüm, ölçüm + test)

| Sürüm (aday) | Konu | Değer |
|---|---|---|
| **v2.312** | **Tarih zekâsı:** görevlendirme tarihi varsayılan bugün; **son teslim = tarih + süre** (elle ezilebilir); **kalan gün** saf fonksiyon + dashboard/rapor/durum çubuğu; "gecikti" uyarısı; rapor tarihi > son teslim uyarısı | **Yüksek** |
| **v2.313** | **"Dosya" görünümü (sayfa):** ray'a "Dosya" ekle; künye bölümlere ayrılmış; üstte kalan gün + tamamlanma; çekmece hızlı düzenleme olarak kalır | Yüksek |
| **v2.314** | **Dashboard "teslim" özeti:** kalan gün, hazırlık maddelerinin özeti, "rapora hazır mı" tek bakışta | Orta-yüksek |
| **v2.315** | **Teslim kontrol listesi (rapor):** rapor ekranında "teslim için gerekenler" + yazdır/indir öncesi son kontrol | Orta |
| (aday) | Soru önerisi (görev yazısından) — **yalnız öneri**, deterministik değilse yapılmaz | Belirsiz |

## 8. Açık kararlar (kullanıcıya)

1. **Son teslim tarihi** elle ezilebilsin mi? (öneri: evet; otomatik öneri ama
   kullanıcı değiştirebilir)
2. "Dosya" **ayrı sayfa** mı olsun, yoksa çekmece mi kalsın? (öneri: sayfa)
3. **Kalan gün** hangi ekranlarda: dashboard + rapor + durum çubuğu? (öneri: üçü)
4. **Resmî tatil/hafta sonu** hesaba katılsın mı? (öneri: önce takvim günü;
   iş günü ayrı sürüm)
5. Sorular görev yazısından **öneri** olarak çıkarılsın mı? (deterministik
   değil; öneri: şimdilik hayır)
