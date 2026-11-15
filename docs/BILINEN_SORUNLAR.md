# Bilinen Sorunlar ve Teknik Borç

Bu belge, AKİS v1 üzerinde yapılan kod incelemesinde (2026-11-15) bulunan
ve henüz giderilmemiş sorunları kaydeder. v2 çalışmasına başlarken bu liste
öncelik sırası olarak kullanılmalıdır.

## 1. Rapor içeriği hâlâ tek kaynaktan gelmiyor (yüksek öncelik)

`assets/app.js` içindeki `REPORT_TEXT` sabiti "rapor metinlerinin tek kaynağı"
olarak tanıtılır ve `VERSION.txt` ile son commit mesajı "üç oluşturucuda kalan
literal metin sayısı 0" iddiasını taşır. Bu iddia **doğru değildir**. Aynı dosya
verisiyle üç çıktı (HTML önizleme, DOCX, UDF) üretilip karşılaştırıldığında
HTML önizleme birçok metni hâlâ sabit yazmaktadır.

Ölçülen sapmalar (satır numaraları `assets/app.js`):

| # | İçerik | HTML önizleme | DOCX | UDF | Satır |
|---|--------|---------------|------|-----|-------|
| 1 | Alt başlık | `Ses kayıtlarının teknik incelenmesi…` (elle) | `REPORT_TEXT.subtitle` | aynı | 223 |
| 2 | 5.1 kayıt meta etiketi | `Deşifre bölümü:` | `Bölüm sayısı:` | `Deşifre bölümü:` | 234 / 275 |
| 3 | Segment tablosu başlığı | `Zaman aralığı` (elle) | `REPORT_TEXT.segmentHeaders` | aynı | 234 |
| 4 | Soru yoksa 5.2 fallback | "Teknik sorulara ilişkin değerlendirme…" | `defaultQuestions` | aynı | 236 |
| 5 | Boş envanter satırı | `İncelemeye sunulan ses kaydı henüz eklenmemiştir.` | `noInventoryRow` | `…ses kaydı bulunmamaktadır.` | 231 / 341 |
| 6 | Malzeme yoksa 5.1 | `Ses kaydı eklenmemiştir.` | `Ses kaydı eklenmemiştir.` | `…ses kaydı bulunmamaktadır.` | 234 / 347 |
| 7 | Envanter notu | `Bu envanterdeki codec…` | `REPORT_TEXT.inventoryNote` | aynı | 231 |
| 8 | Codec yedek metni | `Ses` | `Ses` | `Ses dosyası` | — |
| 9 | **`hallucinationWarning` ("Çözümleme uyarısı")** | **gösterilir** | **gösterilmez** | **gösterilmez** | 234 |

### Neden önemli

Madde 9 veri kaybıdır. Bir kayıtta model dolgu/anlamsız çıktı üretirse uyarı
önizlemede görünür, ancak dışa aktarılan DOCX ve UDF belgelerinde sessizce
kaybolur. Adli bir araçta tam olarak kaçınılmak istenen durumdur.

### Çözüm yönü

HTML önizleme (`renderReport`), DOCX (`docxXml`) ve UDF (`makeUdf`) üçü de
başlık, varsayılan metin, tablo başlığı ve notları yalnızca `REPORT_TEXT`
üzerinden okumalıdır. Sapmayı yapısal olarak imkânsız kılmak için üç oluşturucuyu
karşılaştıran otomatik bir kontrol betiği eklenmelidir (bkz. bölüm 3).

## 2. Ölü ve tutarsız tanımlar (orta öncelik)

`REPORT_TEXT` içinde tanımlı ama hiç kullanılmayan anahtarlar:

- `emptyCourt`
- `timeDash`
- `evidenceWarningPrefix`
- `languageWarningPrefix`
- `fileMissing`

Ayrıca `emptyCourt` değeri üç yerde elle yazılmış ve **tutarsızdır**:
HTML önizlemede 7 nokta (`………………… MAHKEMESİ`), DOCX ve UDF'te 12 nokta
(`……………………………… MAHKEMESİ`).

## 3. Otomatik test / doğrulama yok (yüksek öncelik)

Repoda ne `package.json` ne `tests/` dizini vardır. `VERSION.txt`'teki
"doğrulandı", "ölçüldü" ifadeleri tekrar üretilebilir değildir; yukarıdaki
sapmaların yakalanmamış olmasının nedeni budur.

v2'de en azından üç rapor oluşturucuyu aynı girdiyle çalıştırıp metinleri
karşılaştıran bir kontrol betiği (Node.js, harici bağımlılık olmadan)
eklenmelidir.

## 4. Diğer gözlemler (düşük öncelik)

- `assets/app.js` "415 satır" görünür ama içerik çok uzun tek satırlar hâlinde
  sıkıştırılmıştır; okunabilirlik ve diff kalitesi düşüktür.
- UDF `content.xml` içine gömülen `CDATA` metninde görünmez `U+200B`
  (zero-width space) karakterleri satır kırma noktası olarak kullanılır. Uzun
  SHA-256 dizilerinde taşmayı önlemek için makuldür, ancak bu karakterler
  kopyala-yapıştır sırasında metne sessizce sızabilir.
- `templates/BOS.udf` ikili (binary) bir dosyadır ve git geçmişinde okunamaz;
  içeriği bir kullanıcıdan alınmış boş UYAP belgesidir.
