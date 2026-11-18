# Yol Haritası

AKİS sürüm numarasını iki parçalı tutar: `v1` yayımlanmış ve çalışan sürümdür,
`v2` ise bir sonraki büyük çalışmadır. Ayrıntılı sürüm geçmişi için
[`../CHANGELOG.md`](../CHANGELOG.md) dosyasına bakın.

## v1 — Yayımlanmış sürüm (tamamlandı)

v1 kapsamındaki çalışmalar tamamlanmış ve `main` dalında yayındadır.

| Alt sürüm | Çalışma | Durum |
|-----------|---------|-------|
| 1.1 | Mevcut sistemin korunması | Tamamlandı |
| 1.2 | Mercie özel raporlar, DOCX ve UDF | Tamamlandı |
| 1.3 | Konuşma çözümleme motoru ve modeller | Tamamlandı |
| 1.4 | Model yöneticisi, GPU/CPU, toplu çözümleme | Tamamlandı |
| 1.5 | Uzun kayıt yönetimi | Tamamlandı |
| 1.6 | Gelişmiş deşifre editörü | Tamamlandı |
| 1.7 | Dijital delil güvenliği | Tamamlandı |

Mevcut özelliklerin tam listesi için [`OZELLIKLER.md`](OZELLIKLER.md) dosyasına
bakın.

## v2 — Sıradaki çalışma

### v2.0 — Rapor metni tutarlılığı (tamamlandı)

v1 incelemesinde üç rapor oluşturucu arasında dokuz metin sapması bulundu;
en ciddisi "Çözümleme uyarısı" bilgisinin yalnızca önizlemede görünüp DOCX ve
UDF çıktısında kaybolmasıydı. Tüm sapmalar giderildi ve tekrar oluşmasını
önlemek için `tools/rapor-tutarlilik-testi.mjs` eklendi. Ayrıntı:
[`BILINEN_SORUNLAR.md`](BILINEN_SORUNLAR.md).

### v2.1 — Deşifre ve kontrol çalışma alanı (tamamlandı)

Uzmanın en çok zaman geçirdiği alan yeniden tasarlandı. Klavye kısayolları,
aktif bölüm odağı, bölüm filtresi, oynatma hızı ve denetim ilerlemesi eklendi.
Ayrıca metin geçmişinin her tuş vuruşunda kaydedilmesi hatası ve kirlenmiş
geçmiş giderildi. Ayrıntı: [`../CHANGELOG.md`](../CHANGELOG.md).

### v2.2–v2.8 — Araç ve doğruluk katmanı (tamamlandı)

Ayrıntı [`../CHANGELOG.md`](../CHANGELOG.md) ve
[`OZELLIKLER.md`](OZELLIKLER.md) dosyalarında:

- v2.2: hassas sınır ayarı, yakınlaştırılmış dalga formu, odak modu.
- v2.3: kanal seçimi (sol/sağ/stereo), gözlem işaretleri, böl/birleştir.
- v2.4: spektrogram (FFT, doğruluğu birim testiyle kanıtlandı).
- v2.5: inceleme özeti (denetim kaydı).
- v2.6: çözümleme doğruluk ölçümü (WER).
- v2.7: kayıt kökeni ve teslim zinciri.
- v2.8: sayfa sıçramasının kök nedeninin giderilmesi.

### v2.9 — Yeni AKİS PRO arayüzü

- Yenilenmiş ana kontrol paneli ve modern dosya yönetimi.
- Gelişmiş rapor önizlemesi ve toplu işlem ekranı.

> Not: Deşifre deneyimine yönelik arayüz düzeltmeleri ve iyileştirmeler
> (dinleme denetimleri, ms zaman kodu, yakınlaştırılmış dalga formu etkileşimi,
> hızlı etiketler, paragraf, karaoke, dinleme yardımcıları, odak modu çıkışı)
> uygulandı ve `CHANGELOG.md` içinde v2.9–v2.13 olarak belgelendi. "Yeni AKİS
> PRO arayüzü" kapsamındaki kalan tasarım çalışması sürüyor.

### v2.10 — Düşük güvenli bölüm vurgusu

Kullanıcı, uzmanın hızlı bitirebilmesi için düşük güvenli kelimelerin
işaretlenmesini istedi. Kütüphane (transformers.js) dışarıya güven skoru
vermediği için uydurma skor üretilmedi. Değerlendirilecek seçenekler:
- Model güven skoru dışa aktarılırsa gerçek skor kullanmak.
- Alternatif: dil modeli tabanlı tutarsızlık işareti (yine gerekçeli olmak
  koşuluyla).

### v2.11 — Mercie özel rapor alanları

v1'de bölüm yapısı dört merci türünde aynıdır; fark yalnızca kapak alanlarındadır.
v2'de ceza, savcılık ve icra için bölüm içi alanların ayrıca uzmanlaştırılması
değerlendirilecektir.

### v2.12 — Test kapsamını genişletme

Rapor oluşturucuları, deşifre alanı, WER, köken ve özet otomatik denetleniyor
(`tools/rapor-tutarlilik-testi.mjs`, 8 senaryo). Deşifre motoru, model yöneticisi
ve yedekleme akışları için de otomatik kontrol eklenmesi değerlendirilecektir.

## Değişmez kurallar

Bu kurallar her sürümde korunur:

- Python yok.
- Node.js yok (yalnızca tarayıcı ve isteğe bağlı PowerShell yerel sunucusu).
- GitHub Pages üzerinden `main` kök dizininden çalışma korunur.
- DOCX ve UDF üretimi korunur.
- Orijinal ses dosyaları değiştirilmez.
- Kontrol edilmeyen deşifre, kontrol edilmiş gibi gösterilmez.
- Yapılmayan inceleme raporu, yapılmış gibi yazılmaz.
- Her aşama test edilmeden sonraki aşamaya geçilmez.
