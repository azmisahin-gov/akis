# CSS Borcu — Ölçüm ve Plan

Bu belge, stil katmanının **ölçülmüş** borcunu ve neden otomatik temizlik
yayınlanmadığını kaydeder. Borç artarsa `tasarim-testi` **[8]** kalır.

## Ölçüm (v2.139)

| Ölçüm | Değer |
|---|---|
| `assets/app.css` kural sayısı | **980** (tarihsel katman, minify) |
| `assets/reading-layer.css` kural sayısı | **693** (okuma katmanı, okunabilir) |
| `!important` — app.css | **26** |
| `!important` — reading-layer | **59** |
| `.main-area` tanımı (iki dosya) | **14** |
| Ölü bildirim — reading-layer içi | **98** |
| Ölü bildirim — app.css → reading-layer | **507** |

"Ölü bildirim": aynı seçici + aynı özellik için **daha sonra** (aynı veya daha
geniş kapsamda, `!important` üstünlüğü korunarak) bir tanım var; yani önceki
değer hiçbir zaman kazanamaz.

En çok ölü bildirim taşıyan seçiciler: `#view-audio .seg-list` (26),
`#view-audio .seg-detail` (21), `.case-switcher select` (12),
`#view-audio #audioDetail` (10), `.topbar` (8).

## Neden önemli

Bu deponun tekrar eden hata sınıfı: **bir düzeltme başka bir paneli bozuyor**
(v2.120 → v2.121 → v2.129). Kök neden, aynı seçicinin onlarca kez yeniden
tanımlanması ve `!important` yarışı. Kimse `app.css`i güvenle düzenleyemiyor.

## Otomatik temizlik denemesi — YAYINLANMADI

Plan: aynı seçici+özellik için sonraki tanım kazanıyorsa öncekini sil; kanıt
olarak "son değer haritası"nın (seçici|kapsam|özellik → değer) önce/sonra
**birebir aynı** kalmasını göster.

Sonuç: kendi yazdığımız CSS ayrıştırıcısı kaldırma sonrası yapıyı bozdu
(harita 4.284 → 26.494 anahtar). Sebep: minify edilmiş, yorum/`@media`/kısayol
karışık metinde konum takibi güvenilir değil. Dış paket (PostCSS) bu depoda
yasak (bağımlılıksız araç zinciri).

**Karar:** kanıt tutmadığı için 500 bildirim silinmedi. Kanıtsız silme, tam
olarak kaçındığımız "bir düzeltme başka paneli bozar" riskini üretirdi.

## Nöbetçi (v2.138)

`tools/tasarim-testi.mjs` **[8]** her koşuda şunları ölçer ve eşiği aşarsa
kalır:

- app.css `!important` ≤ 26
- reading-layer `!important` ≤ 59
- reading-layer içi ölü bildirim ≤ 98
- app.css → reading-layer ölü bildirim ≤ 507
- `.main-area` tanımı ≤ 14

Kanıt: reading-layer'a tek bir `!important` eklendi → test **KALDI**
(64 > 63); geri alındı → geçti.

## Temizlik yapılırsa

1. **Tek seferde tek seçici ailesi** (ör. yalnız `#view-audio .seg-list`).
2. Önce/sonra **son değer haritası** karşılaştırması (kanıt) — tutmuyorsa
   dokunma.
3. Gerçek tarayıcıda **stil parmak izi**: aynı görünüm × genişlik kümesinde
   ölçülen kutu değerleri (yükseklik/genişlik/kırpma) değişmemeli.
4. `bash tools/test.sh` + `tasarim-testi` [2d]–[2m] yeşil olmalı.
5. Eşikleri **düşür** (borç azaldıysa nöbetçi bunu yansıtmalı).
6. Kullanıcıya görünür değişiklik yoksa sürüm notunda "görünür değişiklik yok"
   yazılır; sessizce geçilmez.

## Sıradaki aday (elle, küçük)

`.topbar` (8 ölü) ve `.field input/select/textarea` (7+7+7) aileleri küçük ve
izole; elle temizlik için en düşük riskli başlangıç. `#view-audio .seg-list`
ailesi (26) en yüksek kazanç ama v2.129–v2.131 kararlarının tamamını taşıdığı
için **en son** ele alınmalı.
