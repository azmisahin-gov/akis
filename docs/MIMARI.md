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
  app.js                Uygulamanın tamamı (durum, çözümleme, rapor üretimi)
  app.css               Stil
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

## Uygulama katmanları (`assets/app.js`)

`app.js` tek dosyadır ve sırasıyla şu katmanları içerir:

1. **Sabitler ve durum.** `REPORT_TEXT` (rapor metinleri), `REPORT_TYPES`
   (merci türüne göre kapak terminolojisi), `ASR_MODELS` (çözümleme modelleri),
   `appState`, IndexedDB yardımcıları.
2. **Kalıcılık.** Dosya bilgileri `localStorage` (`mihenk.pro.cases.v1`
   anahtarı — eski MİHENK kayıtlarıyla uyumluluk için korunur), ses kayıtları
   IndexedDB (`mihenk-pro-assets`) içinde tutulur.
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
