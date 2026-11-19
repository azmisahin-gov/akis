# AKİS — Depo Notları (ajanlar için)

Bu dosya, AKİS deposunda çalışan ajanlar için kalıcı bağlam sağlar.

## Sıradaki çalışma: sürümleme ve arayüz tasarımı

Tamamlanan v2 çalışmalarından (deşifre deneyimi, master–detail, NLP ölçümleri,
app.js biçimlendirme, akış test kapsamı) sonra iki büyük iş planlanmıştır.
Öncelik sırası aşağıda.

### Aşama 1 — Sürümleme ve depo organizasyonu (öncelikli)

Şu an sürüm numarası belirsiz: arayüzde hâlâ "v1" yazıyor ama CHANGELOG v2.x
çalışmalarını içeriyor. Yapılacaklar:

- Mevcut durumu tam bir depo denetimiyle çıkar; hangi sürümde, hangi
  özelliklerin çalıştığını netleştir.
- Tek ve tutarlı bir sürüm şeması belirle ve uygula (arayüzdeki sürüm etiketi,
  CHANGELOG, README, YOL_HARITASI hepsi aynı numarayı göstersin).
- Bundan sonraki her çalışma yeni bir sürüm numarasıyla yapılsın; her
  güncellemede sürüm görünür biçimde artsın.
- Tüm belgeleri (README, OZELLIKLER, MIMARI, YOL_HARITASI, BILINEN_SORUNLAR,
  KAYNAK, CHANGELOG) yeni sürüme göre düzenle.

### Aşama 2 — Arayüz tasarımı (sonra)

Kullanım kolaylığını ve estetiği artırmak; masaüstü uygulaması hissini
güçlendirmek. Değerlendirilecekler: kenar çubuğu yerine üst menü seçeneği,
genel görsel dil, boşluk/hizalama, klavye ile tam gezinme. `docs/OZELLIKLER.md` listesindeki mevcut özelliklerin **hiçbiri kaybolmamalı**.

### Bilinen açık hatalar (önce düzeltilecek)

1. **Model yükleme ilerlemesi okunaksız:** indirme yüzdesi/çubuk karışık
   görünüyor; hangi dosyanın yüklendiği ve genel ilerleme anlaşılmıyor.
2. **Seçili model görünmüyor:** hangi modelin seçili olduğu ve hangi kaydın
   hangi modelle çözümlendiği arayüzde belli değil. Her kayıt için kullanılan
   model gösterilmeli.
3. **Orta/temel model çıktısı bozuk:** temiz bir kayıtta orta model
   "- - - - - -" gibi çizgiler üretiyor; küçük model "konuşma tespit edemedi"
   diyor; large/turbo çalışıyor. Model seçimi ve dtype/kuantizasyon ayarları
   gözden geçirilmeli (bkz. CHANGELOG: int8 WASM'da yüklenmiyor, q8 uzun
   kayıtta dolgu üretiyor).
4. **Model seçimi kaydı etkilemiyor gibi:** modeli seçip "Modeli yükle"
   denmeden çözümleme eski modelle yapılıyor olabilir; seçim ile yükleme
   arasındaki ilişki netleştirilmeli.

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

Rapor metinlerinin tek kaynaktan (`REPORT_TEXT`) gelmesi hedefine yönelik
sapmalar giderildi; ayrıntı ve durum için
[`docs/BILINEN_SORUNLAR.md`](docs/BILINEN_SORUNLAR.md) dosyasına bakın.

Rapor metni sapmaları v2.0'da çözüldü. `app.js` okunabilirliği Prettier ile
biçimlendirilerek giderildi (`.prettierrc.json`; `npx prettier --config
.prettierrc.json assets/app.js`). Yedekleme, model yöneticisi ve deşifre motoru
akışlarının karar/hesap mantığı saf fonksiyonlara ayrılıp otomatik teste
bağlandı (v2.18). Kalan: bu akışların tarayıcıya bağlı dış kabuğu (gerçek model
indirme, IndexedDB yazımı, ses çözme) elle doğrulanır.

## Doğrulama

Tüm testleri tek komutla çalıştırın:

```bash
bash tools/test.sh
```

Bu komut iki betiği çalıştırır:
- `tools/birim-testleri.mjs` — hesaplama fonksiyonları (WER, FFT, perde,
  Türkçe yönelme eki, ms hassasiyetli zaman kodu, dolgu tespiti, geçmiş
  sıkıştırma, kontrol durumu, paragraf oluşturma, mercie özel ifadeler).
- `tools/rapor-tutarlilik-testi.mjs` — rapor oluşturucuları (HTML/DOCX/UDF).

Betik, `assets/app.js`'i Node.js `vm` içinde sahte bir DOM ile yükler; üç rapor
oluşturucuyu (`renderReport`, `makeDocx`, `makeUdf`) aynı veriyle çalıştırır ve
metinleri karşılaştırır. Ayrıca kaynakta `REPORT_TEXT` değerlerinin sabit
kopyası kalıp kalmadığını denetler. Çıkış kodu 0 = tüm kontroller geçti.

Rapor dışı akışlar (deşifre motoru, model yöneticisi, yedekleme, dalga formu
etkileşimi, dinleme yardımcıları, karaoke) elle doğrulanır.

### Deşifre alanında dikkat edilecekler

- Zaman kodu `timecode`/`secondsFromTimecode` **milisaniye hassasiyetlidir**
  (`00:00:05.100`); eski `HH:MM:SS` biçimi de okunur. Saniyeye yuvarlama
  yapmayın; "buradan böl" ve 0,1 sn'lik sınır kaydırma buna bağlıdır.
- Dinleme durumu tek bir `segPlayback` nesnesinde tutulur; bölüm bitişinde
  durma tek bir `timeupdate` dinleyicisiyle yapılır (her çalmada yeni dinleyici
  eklemeyin, sızıntı olur).
- Klavye kısayolları belge düzeyinde dinlenir (`onGlobalSegKey`); metin
  alanlarındayken yazmayı engellememelidir.
- Kaynak ayrıştırma (yalnız konuşmayı müzikten ayırma) bilerek yapılmaz; ağır
  bir makine öğrenmesi işidir. Sunulan dinleme yardımcıları yalnızca DSP
  filtreleridir ve kaydı değiştirmez.

### Ses kayıtları görünümü (master–detail)

- `#audioList` yalnızca kompakt kayıt satırlarını (`renderMaterialList`) çizer;
  seçili kaydın tam kartı ayrı kapsayıcıda (`#audioDetail`,
  `renderMaterialDetail`) durur. Yeni bir kayıt kartı **yalnızca detay
  kapsayıcısına** eklenmelidir; listeye tam kart eklemeyin (sayfa uzar).
- Seçili kayıt `case.activeMaterialId` ile tutulur; `activeMaterial()` erişir.
- Olay delegasyonu `#view-audio` üzerindedir (hem liste hem detayı kapsar).
  Araçlar `.audio-card` içindeki `[data-transcribe]` üzerinden kaydı bulur;
  bu nedenle detay kartı `.audio-card` sınıfını ve `data-transcribe` düğmesini
  korumalıdır.
- Durum/ilerleme değişince `refreshAudioStatusZone` hem detay durum bölgesini
  hem ilgili liste satırını (`refreshMaterialRow`) tazeler.

## Sürüm şeması

İki parçalı: `v1` yayımlanmış sürüm, `v2` sıradaki büyük çalışma. Yol haritası:
[`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md). Sürüm geçmişi:
[`CHANGELOG.md`](CHANGELOG.md).

## Commit dili

Commit mesajları Türkçe yazılır.
