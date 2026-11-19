# Yol Haritası

AKİS sürüm numarasını `MAJOR.MINOR` biçiminde tutar. Tek kaynak
`assets/app.js` içindeki `APP_VERSION` değeridir; arayüzdeki etiket oradan
yazılır. **Güncel sürüm: v2.61.**

Her güncellemede üç yer birlikte artırılır: `APP_VERSION`, bu dosyadaki ilgili
başlık ve `CHANGELOG.md`. Ayrıntılı sürüm geçmişi:
[`../CHANGELOG.md`](../CHANGELOG.md).

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

### v2.61 — Bölüm detayı sadeleştirildi (tamamlandı)

`app.css`'te `seg-detail` için 21 çakışan kural vardı; ikisi `height:100%!important`
zorluyor, içerik taşıyor ve düğmeler üst üste biniyordu. Zoom dalgası, zaman
hassas kaydırma ve hız düğmeleri kaldırıldı (~35 → ~18 düğme); gözlem/araçlar
katlanır bölmeye alındı. `reading-layer.css` sonuna tek yetkili v2.61 katmanı
eklendi. Ölçümle doğrulandı: taşma yok, çakışma yok (normal ve 420px).

### v2.60 — Öneri görünür oldu + bölüm detayı düzenlendi (tamamlandı)

İkinci göz yazdığında öneri saklanıyordu ama panel yeniden çizilmediği için
görünmüyordu; yardımcı "hiçbir şey olmuyor" sanıyordu. `refreshProposalBand()`
bandı yerinde tazeler, listede "Öneri" rozeti çıkar. Yerleşik ses player
gizlendi (dalga formu hem konumu gösterir hem tıklanınca gider); süre metin
olarak yazılır. Bölüm detayı bölgelere ayrıldı; kaydırma yalnız liste ve detay
paneline hapsedildi. Ayrıntı: `CHANGELOG.md`.

### v2.59 — Onay çalışıyordu ama ekranda görünmüyordu (tamamlandı)

Şema v3 ASCII kod üretiyordu (`approved`), liste çizimi v2 Türkçe kod arıyordu
(`onaylandi`). Onaylama veriyi doğru yazıyordu ama rozet hep "Bekliyor"
görünüyor, sayaçlar artmıyordu; kullanıcı "değişmiyor" sanıyordu. Altı
karşılaştırma v3 koduna çevrildi. Ayrıntı: `CHANGELOG.md`.

### v2.58 — "Onayla" sessizce başarısız oluyordu (tamamlandı)

Bölüm yoksa `approveActiveSegment()` hiçbir şey yapmadan dönüyordu; kullanıcı
düğmeye basıp yanıt alamıyor, sistem bozuk sanıyordu. Sessiz çıkışlar
kaldırıldı: bölüm yoksa ve seçili bölüm yoksa açıklayıcı uyarı gösterilir.

### v2.57 — Teslim alma: kod ≠ etiket + rapor uyarıları (tamamlandı)

v2.56'da diyalog Türkçe etiket ("USB flaş bellek") yazıyordu, şema ASCII kod
("usb") bekliyordu: kayıt yeniden yüklenince teslim bilgisi geçersiz oluyordu.
Seçenek değeri artık kod, görünen metin etiket; eski Türkçe değerler
`normalizeMediumType()` ile koda çevriliyor. Rapor öncesi "teslim bilgisi
eksik" ve "zincir kırığı" uyarıları eklendi. Ayrıntı: `CHANGELOG.md`.

### v2.56 — Delil zinciri gerçekten çalışıyor + teslim alma kaydı (tamamlandı)

Belgeler "kurcalama tespit edilir" diyordu ama uygulama günlüğü elle
`{at,event}` yazıyordu: `logEntry()` çağrısı 0, `verifyLogChain()` çağrısı 0,
8 ham `m.log.push`, gerçek günlük **kırık**. Sekiz nokta `logEvent()`e
bağlandı; girdiler `prevHash`+`hash`+`actor` taşıyor. Üç hâlli durum
(`verified`/`legacy`/`broken`) ve eski kayıt göçü eklendi; eski kayıt "kırık"
diye suçlanmıyor. Dosya eklemeden önce "Delil teslim alma" diyaloğu açılıyor.
Ayrıntı: `CHANGELOG.md`.

### v2.55 — Kaynağı tanımsız düzenleme onaylı sayılmaz (tamamlandı)

Yardımcı ekip bölümünü doldurmayı atlarsa eski kod onun onayını kabul ediyordu
(rapor "Onaylandı" diyordu). Kural: ekip listesi doluysa ve düzenleyen
eşleşmiyorsa onay kabul edilmez; bölüm "Kontrol bekliyor"a çekilir ve çakışma
olarak bildirilir. Ekip boşsa (tek kişilik dosya) eski davranış korunur.
Ayrıca dışa aktarmadan önce "kim olarak çalışıyorsunuz?" sorulur. Ayrıntı:
`CHANGELOG.md`.

### v2.54 — İkinci göz: yardımcı önerir, bilirkişi onaylar (tamamlandı)

Gönüllü yardım senaryosu: bilirkişinin dosyası kendi bilgisayarında; yardımcı
başka bilgisayardan metne ikinci göz olarak bakar. Kararı bilirkişi verir.

Risk: rapor "Kontrol" sütununa `reviewLabel()` yazıyor; yardımcı onaylarsa
rapor "Onaylandı" derdi. Çözüm: `assistant`/`reviewer` rolleri ikinci göz
sayılır; düzeltmeleri `segment.proposal` olarak saklanır, ana metin değişmez.
Bilirkişi öneriyi kabul veya reddeder. İkinci göz onay veremez; birleştirmede
ikinci gözün onayı "Kontrol bekliyor"a çekilir. Ayrıntı: `CHANGELOG.md`.

### v2.53 — Yardımcı düzeltmesi birleştirmede korunuyor (tamamlandı)

Gerçek kullanım senaryosu: bilirkişi kendi bilgisayarında çözümlemeyi yapar,
işi bitmez; yardımcısı **başka bilgisayardan** metni kontrol edip düzeltir.
İki hata bulundu ve giderildi:

1. `mergeCases()` metin çakışmasında her zaman yerel metni tutuyordu; yardımcının
   düzeltmesi sessizce kayboluyor, "onaylandı" damgası yanlış metne vuruluyordu.
2. Deşifre bölümleri kimliksiz üretiliyordu; iki bilgisayarda ayrı kimlikler
   oluştuğu için birleştirme bölümleri hiç eşleştiremiyordu.

Çözüm: kimlik üretim anında verilir; metne insan eli değdiğinde `textRev`
işareti konur. Birleştirmede yalnız bir taraf düzenlemişse o taraf alınır; iki
taraf da düzenlemişse **sessiz seçim yapılmaz**, çakışma bilirkişiye bildirilir.
Kaybeden metin geçmişe yazılır. Onay metne bağlıdır. Ayrıntı: `CHANGELOG.md`.

### v2.52 — Ekip çalışması: dosya birleştirme (tamamlandı)

İki bilirkişi aynı davada çalıştığında her biri kendi `.akis` dosyasında
ilerler; dosyalar **⇄ Birleştir** ile birleştirilir. Kimlik (id) ile eşleşme,
çakışma ekranı, işlem günlüğü. Sunucu/eşzamanlı düzenleme yok. Ayrıntı:
`CHANGELOG.md`.

### v2.51 — v3 veri şeması (tamamlandı)

Kimlikli, kod tabanlı, sürümlü şema (`assets/schema.js`): bölüm/soru/konuşmacı
id ile; durum kodları ASCII sabit, Türkçe yalnız etiket; iç içe `parties/
assignment/expert/report`; delil günlüğünde `prevHash`+`hash` zinciri; id ile
çakışma raporlayan birleştirme. Dosya çekmecesine "İnceleme ekibi" bölümü
eklendi (rapora girmez). 87 şema testi. Ayrıntı: `CHANGELOG.md`.

### v2.50 — Okuma katmanı (tamamlandı)

Üç tema (açık/koyu/sepya), yoğunluk ve yazı boyutu; token tabanlı tipografi ve
kontrast (WCAG AA); rapor kâğıdı temadan bağımsız. Ayrıntı: `CHANGELOG.md`.

### v2.49 — Rapor bilirkişi adına, seviye ölçümü, sürüm disiplini (tamamlandı)

Rapor çıktılarından uygulama kimliği çıkarıldı (alt bilgi, yöntem metni, UDF
tablo adları); kapak ve Word üst bilgisi dosyada girilen uzmanlık alanını
gösteriyor. Ses seviyesi/kırpılma ölçümü (`analyzeLevels`) eklendi ve üç rapor
oluşturucusuna tek kaynaktan bağlandı; ölçülmemiş kayıt tabloya girmiyor.
v2.32–v2.48 sürüm kayması giderildi ve `tools/surum-testi.mjs` ile kalıcı
denetime bağlandı. Ayrıntı: `CHANGELOG.md`.

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

### v2.9–v2.13 — Deşifre deneyimi (tamamlandı)

Dinleme denetimleri (akıllı Dinle/Duraklat + Durdur), milisaniye zaman kodu,
yakınlaştırılmış dalga formu etkileşimi, hızlı etiketler, paragraf oluşturma,
karaoke vurgulama, DSP dinleme yardımcıları ve odak modu çıkışı. Ayrıntı:
`CHANGELOG.md`.

### v2.14 — Kayıt listesi (master–detail) (tamamlandı)

Çok kayıtlı dosyalarda sayfa uzaması giderildi: üstte kompakt kayıt listesi,
altta yalnızca seçili kaydın detayı.

### v2.15–v2.17 — NLP ölçümleri (tamamlandı)

Sessizlik/boşluk ölçümü, terim yazım tutarlılığı, tekrar/dolgu tespiti.
Hepsi deterministik; uydurma skor üretilmez.

### v2.18 — Akış test kapsamı (tamamlandı)

Yedekleme, model yöneticisi ve deşifre motoru karar mantığı saf fonksiyonlara
ayrılıp otomatik teste bağlandı.

### v2.27–v2.48 — Arayüz yenilemesi (tamamlandı)

Dar ray + üst bar + durum çubuğu; ayarlar ve dosya bilgileri sağ çekmecede;
uzun açıklamalar ⓘ ipucunda; rapor tam ekran modu; kayıt kartı sekmeleri,
çalışma modu, tek kaydırma katmanı, ana oynat şeridi ve dinleme yardımcısının
şeride taşınması. Ayrıntı: `CHANGELOG.md`.

### v2.19–v2.26 — Model ve çözümleme düzeltmeleri (tamamlandı)

Model görünürlüğü ve yükleme ilerlemesi; timestamp token sızıntısı ("- - - -");
dtype/bellek sorunları; GPU→CPU geri dönüşü; gerçek model boyutları;
cache-busting. Ayrıntı: `CHANGELOG.md`.

## Planlanan çalışmalar (henüz uygulanmadı)

Bu maddeler henüz kodlanmadı; sürüm numarası verilmedi.

### Düşük güvenli bölüm vurgusu

Kütüphane (transformers.js) güven skoru vermediği için uydurma skor üretilmedi.
Model skoru dışa aktarılırsa gerçek skor; aksi halde gerekçeli alternatif
değerlendirilecek.

### Mercie özel rapor alanları

Bölüm yapısı dört merci türünde aynıdır; fark yalnızca kapak alanlarındadır.
Ceza, savcılık ve icra için bölüm içi alanların uzmanlaştırılması değerlendirilecek.

### Model karşılaştırma aracı

Aynı kaydı birden çok modelle çözümleyip WER ve metni yan yana göstermek.
WER yalnızca referans metni bulunan kayıtlarda hesaplanabilir.

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
