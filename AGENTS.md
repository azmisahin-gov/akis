# AKİS — Depo Notları (ajanlar için)

Bu dosya, AKİS deposunda çalışan ajanlar için kalıcı bağlam sağlar.

## Proje özeti

AKİS (Adli Konuşma İnceleme Sistemi), bilirkişiler için tarayıcıda çalışan bir
ses inceleme, deşifre ve rapor hazırlama aracıdır. Python ve Node.js
kullanılmaz; tüm mantık `assets/app.js` içindedir.

## Çalışma ve yayın

- **GitHub Pages:** `main` dalının kök dizini doğrudan yayınlanır
  (<https://azmisahin-gov.github.io/akis/>). Yayın için derleme adımı yoktur.
  Kök dizine eklenecek her dosya canlı siteye çıkar.
- **Yerel:** `START.bat` → `run.ps1` (PowerShell HTTP sunucusu, 8787–8817).
- Sayfa yolları göreli olduğundan (`assets/…`, `templates/…`) dosyaları
  taşırken bu yolları bozmayın.

## Dosya düzeni

- `index.html` — tek sayfa iskeleti.
- `assets/app.js` — uygulamanın tamamı (tek dosya, satırlar çok uzun).
- `templates/BOS.udf` — UDF üretiminin temeli; sayfa ayarları ve stiller
  buradan okunur. İkili dosyadır.
- `sample_data/` — kurgusal test verisi.
- `docs/` — proje belgeleri.

## Değişmez kurallar

- Python yok, Node.js yok (yalnızca tarayıcı + isteğe bağlı PowerShell).
- GitHub Pages üzerinden `main` kökünden çalışma korunur.
- DOCX ve UDF üretimi korunur.
- Orijinal ses dosyaları değiştirilmez.
- Kontrol edilmeyen deşifre, kontrol edilmiş gibi gösterilmez.
- Yapılmayan inceleme rapora yazılmaz.
- E-imza üretilmez, UYAP'a belge gönderilmez.

## Bilinen önemli borç (v2'de çözülecek)

Rapor metinlerinin tek kaynaktan (`REPORT_TEXT`) gelmesi hedeflenmiştir ancak
**HTML önizleme hâlâ birçok metni sabit yazar**. Ölçülen dokuz sapma ve tam
ayrıntı: [`docs/BILINEN_SORUNLAR.md`](docs/BILINEN_SORUNLAR.md).

En kritik madde: `hallucinationWarning` ("Çözümleme uyarısı") yalnızca HTML
önizlemede görünür; DOCX ve UDF çıktısında kaybolur. Bu bir veri kaybıdır.

## Doğrulama yöntemi (test altyapısı yok)

Repoda otomatik test yoktur. Rapor oluşturucuları doğrulamak için `app.js`
Node.js `vm` içinde sahte bir DOM ile yüklenip `makeUdf` / `makeDocx` /
`renderReport` fonksiyonları çağrılabilir; çıktı ZIP'leri açılıp
`content.xml` (UDF) ve `word/document.xml` (DOCX) incelenebilir. JSZip
`assets/vendor/jszip.min.js` içindedir.

## Sürüm şeması

İki parçalı: `v1` yayımlanmış sürüm, `v2` sıradaki büyük çalışma. Yol haritası:
[`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md). Sürüm geçmişi:
[`CHANGELOG.md`](CHANGELOG.md).

## Commit dili

Commit mesajları Türkçe yazılır.
