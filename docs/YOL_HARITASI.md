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

## v2 — Sıradaki büyük çalışma

### v2.0 — Teknik temizlik ve doğrulama (öncelik)

v2'ye başlamadan önce v1'de tespit edilen borç kapatılmalıdır. Ayrıntı:
[`BILINEN_SORUNLAR.md`](BILINEN_SORUNLAR.md).

- Rapor metinlerini üç oluşturucuda da (HTML önizleme, DOCX, UDF) tam olarak
  `REPORT_TEXT` üzerinden okumak; kalan sapmaları gidermek.
- Özellikle `hallucinationWarning` ("Çözümleme uyarısı") bilgisini DOCX ve UDF
  çıktısına da eklemek (şu an yalnızca önizlemede görünüyor).
- Ölü `REPORT_TEXT` anahtarlarını kaldırmak veya kullanmak.
- Üç rapor oluşturucuyu aynı girdiyle karşılaştıran otomatik kontrol betiği
  eklemek.
- `app.js`'i okunabilir satırlara ayırmak (isteğe bağlı, düşük öncelik).

### v2.1 — Yeni AKİS PRO arayüzü

- Yenilenmiş ana kontrol paneli.
- Modern dosya yönetimi ve toplu işlem ekranı.
- Gelişmiş rapor önizlemesi.

### v2.2 — Deşifre doğruluğunu artırma

- Daha büyük modellerle (large-v3-turbo) doğruluk karşılaştırması ve ölçümü.
- Ölçüm sonuçlarının belgelenmesi.

### v2.3 — Mercie özel rapor alanları

v1'de bölüm yapısı dört merci türünde aynıdır; fark yalnızca kapak alanlarındadır.
v2'de ceza, savcılık ve icra için bölüm içi alanların ayrıca uzmanlaştırılması
değerlendirilecektir.

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
