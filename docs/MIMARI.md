# Mimari

AKİS, kurulum gerektirmeyen, tamamen tarayıcıda çalışan bir adli ses inceleme
ve raporlama uygulamasıdır. Sunucu tarafı kod yoktur; Python veya Node.js
kurulumu gerekmez.

## Çalışma modeli

Uygulama iki şekilde çalışır:

1. **GitHub Pages (birincil).** `main` dalının kök dizini GitHub Pages
   üzerinden doğrudan yayınlanır: <https://azmisahin-gov.github.io/akis/>
   Burada statik dosyalar doğrudan sunulur; ek bir çalıştırıcı gerekmez.
2. **Yerel sunucu (isteğe bağlı).** Windows'ta `START.bat`, `run.ps1` üzerinden
   PowerShell tabanlı küçük bir HTTP sunucusu başlatır ve Microsoft Edge'i açar.
   Amaç, uygulamayı internet olmadan ve dosya sistemi erişimiyle çalıştırmaktır.
   `run.ps1` 8787–8817 aralığından boş bir bağlantı noktası seçer.

Her iki durumda da tüm işlem tarayıcıda yapılır. Ses verisi uzak bir sunucuya
gönderilmez.

## Dosya düzeni

```
index.html              Tek sayfalık uygulama iskeleti (beş görünüm, diyaloglar)
assets/
  schema.js             v3 veri şeması — TEK GEÇERLİ YAPI (saf fonksiyonlar)
  app.js                Uygulama mantığı (durum, çözümleme, rapor üretimi)
  tokens.css            Tasarım tokenları (renk/tipografi/boşluk, 3 tema)
  app.css               Eski stil katmanı (v2.27–v2.49)
  reading-layer.css     Okuma katmanı (en sonda; yamaları ezer)
  vendor/
    jszip.min.js        ZIP/DOCX/UDF paketleme kitaplığı (pakete gömülü)
    JSZIP_LICENSE.txt   JSZip lisans metni
templates/
  BOS.udf               Boş UYAP UDF şablonu (sayfa ayarları ve stil kaynağı)
sample_data/
  cases.json            Kurgusal test dosyaları ve referans metinleri
  audio/                On sentetik Türkçe WAV kaydı
  docs/                 Test dosyalarının açıklaması, örnek rapor
  outputs/              Üretilmiş örnek UDF
docs/                   Proje belgeleri (bu klasör)
run.ps1                 Windows yerel sunucusu
START.bat               Windows başlatıcı
```

## Veri şeması (`assets/schema.js`) — TEK GEÇERLİ YAPI

Şema, uygulamanın en kritik sözleşmesidir ve **ayrı dosyada** durur:
`assets/schema.js`. Tarayıcıya bağımlı olmayan saf fonksiyonlar içerir; bu
sayede üretim kodu ile testler AYNI dosyayı kullanır (kopya tanım yok).

**Sürüm: v3** (`SCHEMA_VERSION = 3`). Bu, depodaki tek geçerli veri yapısıdır.

```
case
├── schemaVersion: 3, id, createdAt, updatedAt, status, reportType
├── court, fileNo, subject, caseDate, inspectionDate
├── parties   { plaintiff, plaintiffCounsel, defendant, defendantCounsel }
├── assignment{ date, dueDate, durationDays, scope, body }
├── expert    { name, registryNo, field }
├── team[]    { id, name, role, registryNo, institution, email, phone }
├── speakers[]{ id, code (K1…), label, role, gender, ageRange, notes }
├── report    { date, methodText, limitationsText, conclusionText }
├── questions[]{ id, no, question, answer, evidence[], basisNote, answeredBy }
├── materials[]
│   ├── id, fileName, mimeType, sizeBytes, durationSec, sha256
│   ├── tech { codec, channels, sampleRate, bitDepth }
│   ├── status (kod), statusNote, transcribedWithModel, transcribedAt
│   ├── segments[]{ id, start, end, speakerId, text, review, obs, history,
│   │               silence, words }
│   ├── speakers[]{ id, code (S1…), label, role, gender, ageRange, notes,
│   │               pitchHz, personId (case.speakers[].id) }
│   ├── referenceSegments[], expectedText
│   ├── levels, spectrogramReviewedAt
│   ├── origin { mediumType, mediumLabel, deliveredBy, deliveredAt, deviceInfo }
│   └── lastVerify, log[]  (prevHash + hash zinciri)
├── shared, lastEditedBy, mergeLog[]
```

**Değişmez kurallar:**

1. **Kimlik.** Her varlık `id` taşır. Referanslar id ile kurulur:
   `segment.speakerId`, `question.evidence[].segmentId`. Ad veya dizi indeksi
   ile referans kurulmaz.
2. **Kod ≠ etiket.** Durum/rol/cinsiyet/ortam kodları ASCII sabittir
   (`pending`, `approved`, `inaudible`, `relisten`). Türkçe metin
   `STATUS_LABEL` / `REVIEW_LABEL` gibi tek yerden türetilir. Karşılaştırma
   daima kodla yapılır.
3. **Kalıcı ≠ geçici.** `uiTab`, `activeSeg`, `progress`, `playbackRate`
   oturumluktur; şemaya ve diske yazılmaz.
4. **Delil.** Her günlük girdisi `logEntry()` ile üretilir; `prevHash` + `hash`
   zinciri kurulur. `verifyLogChain()` kurcalamayı ve girdi silinmesini tespit
   eder.
5. **Genişletme.** Bilinmeyen alan korunur; `normalizeCase()` eksik alanı
   varsayılanla tamamlar. Yeni alan eklerken `emptyCase` / `emptyMaterial` /
   `emptySegment` varsayılanı da güncellenir.

**Ortak çalışma.** `case.team[]` aynı dosyada çalışan bilirkişileri tanımlar;
rapora girmez. `mergeCases(mine, theirs)` iki kopyayı id ile birleştirir ve
metin çakışmasını sessizce ezmez, `conflicts[]` olarak raporlar.

## Alan tanımlama sistemi (v2.203)

Gözlem bayrakları gibi eklemeli alanlar `schema.js` içinde **tek bir tanım
listesinden** (`OBS_DEFS`) türetilir. `defineOptions()` anahtar/etiket/kısa
etiket/ipucu haritalarını üretir; arayüz düğmeleri, rapor etiketleri, yardım
listesi, `emptySegment`/`normalizeSegment` ve testler buradan beslenir. Yeni
bir gözlem bayrağı eklemek için yalnız `OBS_DEFS`'e bir satır eklenir.

v2.204'te aynı desen **sınıflandırma/rol seçeneklerine** uygulandı:
`CASE_STATUS_DEFS`, `MATERIAL_STATUS_DEFS`, `REVIEW_DEFS`,
`SPEAKER_ROLE_DEFS`, `SPEAKER_GENDER_DEFS`, `MEDIUM_TYPE_DEFS`,
`TEAM_ROLE_DEFS`. `*_KEYS`/`*_LABEL`, `REVIEW_SHORT`/`REVIEW_HINT`/
`REVIEW_TONE` ve rol yetkileri (`SECOND_EYES_ROLES`, `APPROVER_ROLES`) bunlardan
türetilir; uygulamadaki kopya etiketler kaldırıldı.

Ayrıntı, geriye/ileriye uyumluluk kuralları ve diğer alan aileleri için
kademeli plan: [`ALAN_SISTEMI.md`](ALAN_SISTEMI.md).

## Uygulama katmanları (`assets/app.js`)

`app.js` şu katmanları içerir:

1. **Sabitler ve durum.** `REPORT_TEXT` (rapor metinleri), `REPORT_TYPES`
   (merci türüne göre kapak terminolojisi), `ASR_MODELS` (çözümleme modelleri),
   `appState`, IndexedDB yardımcıları. Veri yapısı `schema.js`'ten gelir.
2. **Kalıcılık.** Dosya bilgileri `localStorage` (`mihenk.pro.cases.v1`
   anahtarı — eski MİHENK kayıtlarıyla uyumluluk için korunur), ses kayıtları
   IndexedDB (`mihenk-pro-assets`) içinde tutulur. Yükleme sırasında her dosya
   `normalizeCase()` ile şemaya göre normalleştirilir.
3. **Ses çözümleme.** Transformers.js ile Whisper modelleri; WebGPU varsa
   WebGPU, yoksa WASM. Kayıtlar 30 saniyelik pencerelere bölünür.
4. **Deşifre editörü.** Bölüm bazında metin, konuşmacı, zaman aralığı, dört
   kontrol durumu ve metin geçmişi.
5. **Rapor üretimi.** Üç çıktı yolu: HTML önizleme (`renderReport`),
   DOCX (`docxXml` / `makeDocx`), UDF (`makeUdf`).
6. **Model yöneticisi.** Cache Storage taraması, bütünlük kontrolü, silme.

## Veri akışı

```
Ses dosyası  →  IndexedDB (blob) + localStorage (meta, SHA-256, teknik envanter)
                    │
                    ├─→ Whisper (tarayıcı, WASM/WebGPU) → deşifre bölümleri
                    │
                    └─→ Rapor üreticileri
                          ├─ HTML önizleme  (renderReport)
                          ├─ DOCX           (docxXml → JSZip)
                          └─ UDF            (makeUdf → JSZip, BOS.udf tabanlı)
```

## Rapor çıktı biçimleri

- **UDF (birincil).** Bilirkişi Portalı UDF kabul eder. Üretim,
  `templates/BOS.udf` içindeki `format_id=1.8`, sayfa ayarları ve stil
  tanımları temel alınarak yapılır. Uygulama e-imza üretmez ve belgeyi UYAP'a
  göndermez; bu adım UYAP Editöründe kullanıcı tarafından tamamlanır.
- **DOCX (isteğe bağlı yardımcı kopya).** Word uyumlu, üst bilgi/alt bilgi ve
  sayfa numarası içerir.
- **HTML önizleme.** Rapor oluşturma ekranında gösterilen canlı görünüm.

## Gizlilik ve ağ erişimi

- Ses içeriği tarayıcıda işlenir; uzak bir konuşma tanıma API'sine gönderilmez.
- İlk kullanımda Transformers.js jsDelivr üzerinden, model dosyaları Hugging Face
  üzerinden indirilir. Sonraki çevrimdışı kullanım, tarayıcı önbelleğine bağlıdır.
- JSZip pakete gömülüdür; DOCX/UDF/ZIP işlemleri için internet gerekmez.

## Bilinen mimari borç

Rapor metinlerinin tek kaynaktan gelmesi hedefine yönelik sapmalar giderildi
(v2.0). Ayrıntı ve kalan borç için [`BILINEN_SORUNLAR.md`](BILINEN_SORUNLAR.md).

## Doğrulama

Rapor oluşturucularını denetleyen betik:

```bash
node tools/rapor-tutarlilik-testi.mjs
```

`tools/rapor-tutarlilik-testi.mjs`, `assets/app.js`'i Node.js `vm` içinde sahte
bir DOM ile yükler; üç oluşturucuyu (`renderReport`, `makeDocx`, `makeUdf`) aynı
veriyle çalıştırır ve çıktı metinlerini karşılaştırır. Ayrıca kaynakta
`REPORT_TEXT` değerlerinin sabit kopyası kalıp kalmadığını denetler.
