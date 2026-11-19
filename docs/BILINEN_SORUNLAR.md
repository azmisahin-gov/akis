# Bilinen Sorunlar ve Teknik Borç

Bu belge, AKİS üzerinde yapılan kod incelemelerinde bulunan sorunları ve
bunların durumunu kaydeder.

**Durum:** Rapor metni sapmaları **giderildi** (bölüm 1). Otomatik doğrulama
kısmen eklendi (bölüm 2). Kalan borç bölüm 2 ve 3'te listelenmiştir.

## 1. Rapor içeriği tek kaynaktan gelmiyor — ÇÖZÜLDÜ

v1 incelemesinde, `assets/app.js` içindeki `REPORT_TEXT` sabitinin "rapor
metinlerinin tek kaynağı" olarak tanıtıldığı, ancak HTML önizlemenin birçok
metni hâlâ sabit yazdığı ölçülerek görülmüştü. Üç oluşturucu (HTML önizleme,
DOCX, UDF) arasında dokuz sapma vardı. Bulunan sapmalar:

| # | İçerik | Sapma |
|---|--------|-------|
| 1 | Alt başlık | HTML önizleme sabit yazıyordu |
| 2 | 5.1 kayıt meta etiketi | DOCX "Bölüm sayısı", diğerleri "Deşifre bölümü" |
| 3 | Segment tablosu başlığı | HTML önizleme sabit yazıyordu |
| 4 | 5.2 fallback | HTML farklı, DOCX/UDF yanlışlıkla bölüm 2 metnini kullanıyordu |
| 5 | Boş envanter satırı | Üç çıktıda üç ayrı metin |
| 6 | Malzeme yok metni | HTML/DOCX ile UDF farklıydı |
| 7 | Envanter notu | HTML sabit yazıyordu |
| 8 | Codec yedek metni | UDF "Ses dosyası", diğerleri "Ses" |
| 9 | **`hallucinationWarning`** | **yalnızca önizlemede; DOCX ve UDF'te kayıp** |

Madde 9 veri kaybıydı: bir kayıtta model dolgu/anlamsız çıktı üretirse uyarı
önizlemede görünür, ancak dışa aktarılan belgelerde sessizce kaybolurdu.

Yapılan düzeltmeler:

- HTML önizlemedeki sabit metinlerin tümü `REPORT_TEXT` üzerinden okunuyor.
- DOCX ve UDF'e `hallucinationWarning` (çözümleme uyarısı) eklendi.
- DOCX'teki `Bölüm sayısı` etiketi `segmentCountLabel` ile tekilleştirildi.
- DOCX ve UDF'teki 5.2 fallback'i `defaultEvaluation` ile düzeltildi.
- Codec yedek metni, mahkeme yer tutucusu (7/12 nokta) ve zaman aralığı tire
  işareti üç oluşturucuda tek kaynağa bağlandı.
- Kullanılmayan anahtarlar (`emptyCourt`, `timeDash`, `evidenceWarningPrefix`,
  `languageWarningPrefix`, `fileMissing`) kullanıma bağlandı.
- `noInventoryRow` artık `noMaterials` metninden türetiliyor.
- Rapor öncesi kontrol uyarı metinleri de `REPORT_TEXT`'e taşındı.

## 2. Otomatik doğrulama (kısmen giderildi)

`tools/rapor-tutarlilik-testi.mjs` eklendi. Betik üç oluşturucuyu aynı veriyle
çalıştırır, metinleri karşılaştırır ve ayrıca kaynakta `REPORT_TEXT` değerlerinin
sabit kopyası kalıp kalmadığını denetler. Şu an tüm kontroller geçer.

Birim testleri (`tools/birim-testleri.mjs`) milisaniye hassasiyetli zaman kodu
dönüşümünü ve paragraf oluşturma mantığını da kapsar (v2.10 ve v2.12'de eklendi).

Hâlâ kapsam dışı olan alanlar: deşifre motoru, model yöneticisi, yedekleme/geri
yükleme ve diğer tarayıcıya bağlı akışlar (dalga formu etkileşimi, dinleme
yardımcıları, karaoke). Bunlar elle doğrulanmaktadır.

## 3. Diğer gözlemler (düşük öncelik)

- `assets/app.js` Prettier ile biçimlendirildi (`.prettierrc.json`); dosya
  artık okunabilir satırlar hâlinde. Yeniden biçimlendirmek için:
  `npx prettier --config .prettierrc.json assets/app.js`. (Bu adım giderildi.)
- UDF `content.xml` içine gömülen `CDATA` metninde görünmez `U+200B`
  (zero-width space) karakterleri satır kırma noktası olarak kullanılır. Uzun
  SHA-256 dizilerinde taşmayı önlemek için makuldür, ancak bu karakterler
  kopyala-yapıştır sırasında metne sessizce sızabilir.
- `templates/BOS.udf` ikili (binary) bir dosyadır ve git geçmişinde okunamaz;
  içeriği bir kullanıcıdan alınmış boş UYAP belgesidir.
