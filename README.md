# AKİS — Adli Konuşma İnceleme Sistemi

Bilirkişiler için ses kaydı inceleme, konuşma çözümleme (deşifre) ve rapor
hazırlama aracı. Tamamen tarayıcıda çalışır; Python veya Node.js kurulumu
gerektirmez.

**Sürüm:** v2.191 · **Lisans:** özel / kurumsal kullanım

> Sürüm numarası tek kaynaktan gelir: `assets/app.js` içindeki `APP_VERSION`.
> Arayüzdeki etiket buradan yazılır. Her güncellemede bu değer, `CHANGELOG.md`
> ve `docs/YOL_HARITASI.md` birlikte artırılır.

## Çalıştırma

Uygulama iki şekilde çalışır.

**1. Doğrudan tarayıcıda (birincil).** Statik dosyalar GitHub Pages üzerinden
yayınlanır; kurulum gerekmez:

> <https://azmisahin-gov.github.io/akis/>

**2. Yerel sunucu (Windows, isteğe bağlı).** `main` dalının kök dizini indirilip
`START.bat` çalıştırılır. `run.ps1` PowerShell tabanlı yerel bir HTTP sunucusu
başlatır ve Microsoft Edge'i açar. Bu yol internet olmadan çalışmak içindir.

## İlk kullanım

1. Genel görünüm ekranında **"Hazır test dosyalarını yükle"** seçeneğine basın.
   Dört kurgusal dosya ve on sentetik WAV kaydı çalışma alanına eklenir.
2. **Ses kayıtları** bölümünde model olarak "Küçük model" seçip **"Modeli
   yükle"**ye basın. İlk indirme internet gerektirir; sonrasında çözümleme
   tarayıcıda yapılır.
3. Her kaydın yanındaki **"Çözümle"** ile çıkan zaman damgalı metni kaydı
   dinleyerek düzeltin ve kontrol durumunu işaretleyin.
4. Dosya bilgilerini, görevlendirme kapsamını, mahkeme sorularını ve teknik
   değerlendirmeyi tamamlayın.
5. **Rapor oluştur** bölümünde UYAP UDF (`.udf`) çıktısını alın. DOCX isteğe
   bağlı yardımcı kopyadır.

## Önemli sınırlar

- Uygulama **hukuki değerlendirme ve bilirkişi kanaati üretmez**; bunlar hâkime
  aittir.
- Konuşmacı kimliği, kayıt orijinalliği ve montaj tespiti otomatik yapılmaz.
- Otomatik deşifre, uzmanın kaydı dinleyerek doğrulamasının yerine geçmez.
  Kontrol edilmemiş bölümler doğrulanmış sayılmaz.
- Uygulama **e-imza üretmez ve UYAP'a belge göndermez**; bu adım UYAP Editöründe
  kullanıcı tarafından tamamlanır.

## Öne çıkan özellikler

- **Deşifre ve kontrol çalışma alanı:** iki panelli (bölüm listesi + aktif bölüm
  detayı), klavye kısayolları, bölüm filtresi, oynatma hızı, inceleme önceliği.
- **Hassas sınır araçları:** 0,1 sn adımlarla sınır kaydırma, yakınlaştırılmış
  dalga formu, spektrogram (FFT).
- **Konuşmacı yönetimi:** rol, cinsiyet (uzman beyanı), yaş aralığı, not; perde
  (temel frekans) ölçümü ve konuşmacı eşleştirme önerisi.
- **Dijital delil güvenliği:** SHA-256, teknik envanter, delil işlem günlüğü,
  kayıt kökeni ve teslim zinciri.
- **Rapor:** yedi bölümlü yapı, konuşmacılar tablosu, gözlem sütunu, WER ölçümü
  ve inceleme özeti (denetim kaydı). UDF birincil, DOCX yardımcı çıktı.

## Belgeler

| Belge | İçerik |
|-------|--------|
| [`docs/MIMARI.md`](docs/MIMARI.md) | Dosya düzeni, katmanlar, veri akışı |
| [`docs/OZELLIKLER.md`](docs/OZELLIKLER.md) | Mevcut (çalışan) özelliklerin tam listesi |
| [`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md) | Sürüm geçmişi ve planlanan çalışmalar |
| [`docs/BILINEN_SORUNLAR.md`](docs/BILINEN_SORUNLAR.md) | Tespit edilen sorunlar ve teknik borç |
| [`docs/KAYNAK.md`](docs/KAYNAK.md) | Resmî kaynaklar ve mevzuat notları |
| [`CHANGELOG.md`](CHANGELOG.md) | Sürüm geçmişi |

## Sorun giderme

**`START.bat` çalışmıyor.** Windows PowerShell'in çalıştırılmasına izin
verildiğini kontrol edin. Klasör yolunda Türkçe karakter varsa klasörü kısa bir
yola (örneğin `C:\AKIS`) taşıyın.

**Sayfa açılmıyor.** PowerShell penceresinde yazan `127.0.0.1:PORT` adresini
tarayıcı adres çubuğuna elle yazın. 8787–8817 aralığındaki tüm bağlantı noktaları
doluysa uygulama başlamaz; pencereyi kapatıp tekrar açın.

**Model indirilmiyor.** İlk indirme jsDelivr ve Hugging Face adreslerine erişim
gerektirir. İndirme yarıda kalırsa "Modeli yükle"ye tekrar basın; tamamlanmış
dosyalar yeniden indirilmez.

**Çözümleme sonucu anlamsız.** Çıktı yalnızca "(Konuşma)" gibi dolgu
ifadelerinden oluşuyorsa uygulama bunu uyarı olarak işaretler. Bu durumda sonucu
rapora aktarmayın; kaydı elle dinleyip bölümleri kendiniz girin.

**Ses okunmuyor.** WAV veya MP3 biçimine dönüştürüp tekrar deneyin. Tarayıcının
çözemediği bazı codec'ler sessizce atlanabilir.

## Geliştirme ve doğrulama

Tüm testleri tek komutla çalıştırın:

```bash
bash tools/test.sh
```

İki test betiği vardır:
- `tools/birim-testleri.mjs` — hesaplama fonksiyonları (WER, FFT, perde,
  Türkçe yönelme eki, zaman kodu, dolgu tespiti, geçmiş sıkıştırma).
- `tools/rapor-tutarlilik-testi.mjs` — üç rapor oluşturucuyu aynı veriyle
  çalıştırıp metinleri karşılaştırır.

Harici paket gerekmez; Node.js yeterlidir.

## Veri saklama

Dosya bilgileri tarayıcı `localStorage`, ses kayıtları IndexedDB içinde
saklanır. Tarayıcı verisini temizlemek kayıtları silebilir. Her çalışma için
"Dosyayı dışa aktar" ile `.akis` yedeği oluşturun. Önceki MİHENK sürümünden
alınmış `.mihenk` yedekleri de içe aktarılabilir.

## Test verileri

Paket içindeki dört kurgusal dosya ve on sentetik Türkçe WAV kaydı, eSpeak
tabanlı TTS ile üretilmiştir. Gerçek kişi, olay veya dosya içermez; yalnızca
çözümleme ve rapor akışını denemek içindir. Ayrıntı:
[`sample_data/docs/TEST_DOSYALARI.txt`](sample_data/docs/TEST_DOSYALARI.txt).
