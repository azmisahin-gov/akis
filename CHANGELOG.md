# Değişiklik Günlüğü

Bu dosya AKİS'in sürüm geçmişini özetler. Kayıtlar, uygulamanın geliştirme
sürecinde tutulan eski `VERSION.txt` dosyasından tekrarlar ayıklanarak
derlenmiştir. Önceki dosya tek bir sürüm başlığı altında yüzden fazla maddeyi
(yaklaşık 13'ü birebir tekrar) sıralıyordu; burada aynı bilgiler konuya göre
gruplanmıştır.

Sürüm numaralandırması iki parçalıdır: `v1` yayımlanmış sürüm, `v2` sıradaki
büyük çalışma. Yol haritası için [`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md).

## v1 — Yayımlanmış sürüm

### Marka ve çıktı önceliği

- Uygulama adı AKİS (Adli Konuşma İnceleme Sistemi) olarak güncellendi. Eski
  MİHENK tarayıcı depolama anahtarları korundu; aynı tarayıcıdaki önceki
  çalışmalar görünmeye devam eder.
- Bilirkişi Portalı için birincil ve zorunlu çıktı UDF olarak belirlendi. DOCX
  isteğe bağlı yardımcı kopyadır.
- Uygulama e-imza üretmez ve UYAP'a belge göndermez.

### Rapor altyapısı

- Rapor bölümleri Bakanlığın yayımladığı hukuk örneğine göre yedi başlıklı
  sıralamaya alındı.
- Mercie özel kapak terminolojisi: dosya numarası etiketi, taraf etiketleri ve
  konu/tarih alanları dört merci türüne göre ayrıştırıldı (hukuk, ceza, savcılık,
  icra).
- Rapor başlığındaki yönelme eki hesaplanır hâle getirildi ("MAHKEMESİ'NE",
  "BAŞSAVCILIĞI'NA", "MÜDÜRLÜĞÜ'NE").
- Soru bölümü başlığı merciden bağımsız hâle getirildi; savcılık ve icra
  dosyalarında "mahkeme" ifadesi yanlıştı.
- Kapak tablosundaki çift satır hatası düzeltildi (savcılıkta "DOSYA NO" ve
  "SORUŞTURMA NO" birlikte çıkıyordu); etiket tek kaynağa indirildi.
- Dosya adı üretimindeki çift nokta kusuru giderildi ("2026/214 E." gibi
  değerlerde "…E..akis" oluşuyordu).
- UDF görsel düzeni: tablo kenarlıkları hafifletildi, hücre boşlukları
  dengelendi, sayfa kenar boşlukları DOCX ile aynı A4 geometriye yaklaştırıldı.
  Tablo başlıkları koyu lacivert yazı ve açık zeminle oluşturulur.
- UDF çıktısı `templates/BOS.udf` içindeki `format_id=1.8`, sayfa ayarları ve
  stil tanımları temel alınarak üretilir. Uzun SHA-256 dizilerinde görünmez
  satır kırma noktaları eklenerek hücre taşmaları azaltıldı.
- Rapor içeriği tek `REPORT_TEXT` tanımına taşınmaya başlandı (bkz. bilinen
  sorunlar: bu birleştirme tamamlanmadı).

### Konuşma çözümleme motoru

- Tarayıcıda çalışan Whisper modelleri eklendi: temel, küçük, orta,
  large-v3-turbo. Kaynak dil Türkçe, görev "transcribe" olarak sabitlendi.
- Ölçülen doğruluk (paketteki sentetik kayıtlara karşı kelime hata oranı, WER):
  orta model 0,378 · küçük model 0,651 · temel model bir pencerede
  "token_ids must be a non-empty array" hatasıyla durdu. Model etiketleri ve
  donanım önerisi bu ölçüme dayanır.
- Çözümlemede `return_timestamps=true` kullanılmalıdır; kapalıyken model gerçek
  metin yerine "(Konuşma)" gibi dolgu üretiyor.
- int8 kuantizasyon WASM'da yüklenemiyor (ConvInteger çekirdeği yok); q8
  kuantizasyon uzun kayıtlarda anlamlı metin yerine tekrarlı dolgu üretiyor.
  Modeller bu nedenle fp16/fp32 ile çalışıyor.
- WebGPU algılama ve yoksa otomatik WASM (CPU) geri dönüşü eklendi.
- Dolgu/halüsinasyon tespiti eklendi; "(Konuşma)", "(Müzik - Jenerik)" gibi
  bölümler "anlamlı metin yok" diye işaretlenir ve rapor öncesi uyarı üretir.
- Pencere dayanıklılığı: tek pencere hatası tüm kaydı çökertmez; başarısız
  pencere sayısı uyarı olarak gösterilir, diğer pencerelerin sonucu korunur.

### Uzun kayıt yönetimi

- Kayıtlar 30 saniyelik pencerelere bölünerek çözümlenir; her pencere sonunda
  ilerleme kaydedilir. Bellek şişmez, kesinti hâlinde o ana kadarki bölümler
  korunur.
- Çözümleme iptal edilebilir; bulunan bölümler saklanır.

### Toplu çözümleme ve model yöneticisi

- Sıralı işlem kuyruğu: birden fazla kayıt tek tek çözümlenir, genel ilerleme
  ve tahmini kalan süre gösterilir, kuyruk durdurulabilir, hatalı kayıtlar
  tekrar denenebilir.
- Model yöneticisi: indirilen modeller listelenir, model başına dosya sayısı ve
  disk boyutu gösterilir; model seçilebilir, bütünlüğü doğrulanabilir ve
  silinebilir; tüm önbellek tek düğmeyle temizlenebilir.
- Model bütünlük kontrolü yapısal düzeydedir (config, tokenizer, encoder,
  decoder dosyalarının varlığı ve boş olmaması denetlenir); kitaplık yayınlanmış
  sağlama toplamı sunmadığı için bu sınırlılık arayüzde belirtilir.
- Donanıma göre model önerisi: WebGPU varsa large-v3-turbo, yoksa küçük model.
- İndirme duraklatma, kullanılan kitaplık desteklemediği için gerçek anlamda
  yapılamaz; ancak tamamlanan dosyalar hemen önbelleğe yazıldığından kesilen
  indirme tamamlanmış dosyaları yeniden indirmez.

### Deşifre editörü

- Bölüm bazında dinleme: her satırdaki "▶" düğmesi kaydın oynatıcısını ilgili
  bölümün başlangıcına getirip çalar ve bitişte durur.
- Dört kontrol durumu: Onaylandı, Kontrol bekliyor, Anlaşılmadı, Yeniden
  dinlenecek. Yalnızca Onaylandı ve Anlaşılmadı denetimden geçmiş sayılır;
  Yeniden dinlenecek asla doğrulanmış kabul edilmez.
- Bölüm metni değişiklik geçmişi tutulur ve görüntülenebilir.
- Eski kayıtlardaki "kontrol edildi" onay kutusu "Onaylandı" durumuna eşlenir.
- Elle bölüm ekleme; yeni bölüm önceki bölümün bitişinden veya oynatıcı
  konumundan başlar.

### Dijital delil güvenliği

- Her kayıt için dosya adı, biçim, boyut, süre, codec, kanal sayısı, örnekleme
  frekansı, bit derinliği ve SHA-256 özeti kaydedilir.
- WAV başlığı chunk yürüterek okunur; sabit offset varsayımı LIST/fact gibi ek
  chunk içeren dosyalarda yanlış sonuç verdiği için kullanılmaz.
- Sonradan SHA-256 doğrulama: kayıt yeniden okunup özet yeniden hesaplanır ve
  ilk değerle karşılaştırılır; fark çıkarsa dosyanın değişmiş olabileceği
  bildirilir.
- Delil işlem günlüğü: ekleme, çözümleme ve doğrulama işlemleri tarih-saat
  damgasıyla kaydedilir.
- Rapor envanterine "Kanal / örnekleme" sütunu eklendi.

### Arayüz

- Ses kayıtları görünümünün yerleşimi düzenlendi: yükleme alanı, ses kayıtları
  listesi, ardından katlanabilir "Çözümleme ve model ayarları" bölümü.
- Model seçimi, işlem kuyruğu ve model yöneticisi tek bir katlanabilir bölümde
  toplandı; varsayılan olarak kapalı gelir.
- Canvas tabanlı ses dalga formu eklendi; tıklayarak konuma gitme, bölüm
  aralıklarının işaretlenmesi ve oynatma imleci.
- Dalga formu verisi (peak dizisi) kayıt başına bir kez hesaplanıp önbelleğe
  alınır; liste yeniden çizildiğinde ses yeniden çözümlenmez.
- Dalga formu verisinin kalıcı depolamaya yazılması hatası giderildi. Peak
  dizisi kayıt başına yaklaşık 32 KB tutuyor ve yanlışlıkla `localStorage`'a
  kaydediliyordu (10 kayıtta 320 KB, 100 kayıtta 3,2 MB şişme riski). Peak
  verisi artık yalnızca bellekte tutulur. Ölçüm: düzeltme öncesi 3 kayıtla
  103 KB, sonrasında 10 kayıtla 23 KB (kayıt başına ~27 KB'den ~2,3 KB'ye).
- Önceki sürümlerde kaydedilmiş peak verisi açılışta temizlenir.

### Yedekleme

- `.akis` paketi dosya bilgileri, sorular, yöntem metni, bölümler, teknik
  envanter, SHA-256 ve tüm ses blob'larını eksiksiz taşır; içe aktarmada hepsi
  geri yüklenir.
- Hazır test dosyaları yüklenirken teknik envanterin atlanması hatası giderildi;
  iki yükleme yolu artık aynı bilgileri üretir.

### Belgeler ve kaynaklar

- Adalet Bakanlığının resmî standartları `docs/KAYNAK.md` dosyasına eklendi:
  zorunlu bir şablon yoktur; Bilirkişi Portalı UDF ve geçerli e-imza/m-imza
  ister.

## v2 — Sıradaki çalışma

### v2.0 — Rapor metni tutarlılığı

v1 incelemesinde üç rapor oluşturucu (HTML önizleme, DOCX, UDF) arasında dokuz
metin sapması ölçüldü. En ciddisi, "Çözümleme uyarısı" (`hallucinationWarning`)
bilgisinin yalnızca önizlemede görünüp dışa aktarılan DOCX ve UDF belgelerinde
kaybolmasıydı; bu bir veri kaybıydı.

- HTML önizlemedeki tüm sabit metinler `REPORT_TEXT` üzerinden okunacak şekilde
  bağlandı (alt başlık, mahkeme yer tutucusu, 5.1 meta etiketi, segment tablosu
  başlıkları, envanter notu, 5.2 fallback, malzeme yok ve dosya yok metinleri).
- DOCX ve UDF'e çözümleme uyarısı eklendi; artık üç çıktıda da görünüyor.
- DOCX'teki "Bölüm sayısı" etiketi, diğer çıktılardaki "Deşifre bölümü" ile
  `segmentCountLabel` üzerinden tekilleştirildi.
- DOCX ve UDF'teki 5.2 fallback'i yanlışlıkla bölüm 2 metnini kullanıyordu;
  `defaultEvaluation` ile düzeltildi.
- Codec yedek metni, mahkeme yer tutucusu (7/12 nokta tutarsızlığı) ve zaman
  aralığı tire işareti üç oluşturucuda tek kaynağa bağlandı.
- Kullanılmayan `REPORT_TEXT` anahtarları (`emptyCourt`, `timeDash`,
  `evidenceWarningPrefix`, `languageWarningPrefix`, `fileMissing`) kullanıma
  bağlandı; ölü tanım kalmadı.
- `noInventoryRow`, tek `noMaterials` metninden türetiliyor.
- `tools/rapor-tutarlilik-testi.mjs` eklendi: üç oluşturucuyu aynı veriyle
  çalıştırıp metinleri karşılaştırır ve kaynakta `REPORT_TEXT` değerlerinin
  sabit kopyasını denetler. Beş senaryo, tümü geçiyor.

### v2.1 — Deşifre ve kontrol çalışma alanı

Uzmanın en çok zaman geçirdiği alan yeniden tasarlandı; hedef, uzun kayıtlarda
(20–60 dakika, dosya başına on kayıt) hızlı ve hatasız denetimdi.

**İlk sürümdeki hatalar giderildi.** Alan ilk kez eklenirken her bölüm
değişiminde tablo `innerHTML` ile baştan çiziliyordu; bu, kaydırmanın zıplamasına,
odağın kaybolmasına, ok tuşlarının çalışmamasına ve oynatma sırasında metnin
sıçramasına yol açıyordu. Alan bu kez doğru mimariyle kuruldu.

- **İki panel:** solda bölüm listesi, sağda aktif bölüm detayı. Aktif bölüm
  değişince DOM yeniden çizilmez; yalnızca işaret ve detay alanları güncellenir.
  Kaydırma, odak ve ok tuşları korunur.
- **Klavye kısayolları:** `Boşluk` oynat/durdur, `↑`/`↓` bölüm, `Enter` onayla,
  `Y` dinle, `[`/`]` hız, `←`/`→` 5 sn, `Esc` metin alanından çık.
- **Bölüm listesi:** numara, başlangıç, metin özeti, konuşmacı, öncelik ve durum
  tek satırda. Bölüm filtresi (Tümü/Bekleyen/Onaylandı/Anlaşılmadı/Yeniden).
- **İnceleme önceliği:** hangi bölümün önce dinlenmesi gerektiğini gösteren
  şeffaf, gerekçeli işaret. "Öncelikliye git" düğmesi en yüksek öncelikli
  bekleyen bölüme atlar.
- **Bölüm işlemleri:** oynatıcı konumundan böl, sonrakiyle birleştir, sil.
- **Oynatma hızı** 0,75×–2× ve denetim ilerleme çubuğu.
- **Konuşmacı yönetimi:** rol, cinsiyet (uzman beyanı), yaş aralığı ve not
  alanları; bu bilgiler rapora "Konuşmacılar" tablosu olarak akar.
- **Perde (temel frekans) ölçümü:** otokorelasyon yöntemiyle gerçek DSP ölçümü.
  Birim testiyle doğrulandı (120 Hz sinüs → 120 Hz, 220 Hz → 221 Hz, gürültü →
  sonuç yok). Ölçüm uzman tarafından tetiklenir, otomatik çalışmaz.
- **Konuşmacı eşleştirme önerisi:** benzer perdedeki etiketler "aynı kişi
  olabilir" diye önerilir; kimlik tespiti değildir ve bu açıkça belirtilir.
- **Düzeltilen iki hata:** (1) Metin geçmişi her tuş vuruşunda kaydediliyordu;
  artık düzenleme oturumu başına bir kez. (2) Eski sürümlerden kalan kirlenmiş
  geçmiş açılışta otomatik sıkıştırılır (`Geçmiş (20)` → `Geçmiş (1)`).

### v2.2 — Sınır araçları, odak modu, masaüstü hissi

- **Hassas sınır ayarı:** başlangıç/bitiş 0,1 sn ve 1 sn adımlarla kaydırılır.
  Uzman, konuşmanın tam başladığı/bittiği noktayı ayarlar.
- **Yakınlaştırılmış dalga formu:** aktif bölümün ±0,5 sn'si büyütülür; sınır
  çizgileri ve oynatma imleci görünür. Sol yarıya tıkla = başlangıç, sağ
  yarıya tıkla = bitiş.
- **Odak modu:** kenar çubuğu gizlenir, çalışma alanı genişler; tercih saklanır.
- **Kompakt yükleme alanı:** ses ekleme şeridi ekranı kaplamaz.
- **Düzeltilen hata:** Enter çift tetikleniyordu (odak düğmedeyken tarayıcı
  tıklaması + keydown onayı). Artık düğme odaktayken kısayol devre dışı.

### v2.3 — Kanal seçimi, gözlem işaretleri, böl/birleştir kısayolları

- **Kanal seçimi (stereo):** sol/sağ/stereo dinleme (Web Audio
  `ChannelSplitter`). Grafik tembel kurulur; hata olursa normal oynatmaya döner.
  Seçilen kanal rapor envanterinde gösterilir.
- **Gözlem işaretleri:** arka plan gürültüsü, üst üste konuşma, anlaşılmaz
  bölüm, müzik/ses efekti. Rapora "GÖZLEM" sütunu olarak yansır.
- **Klavye:** `B` böl, `M` birleştir.

### v2.4 — Spektrogram (FFT)

- Radix-2 Cooley-Tukey FFT (yerinde, gerçek giriş), Hann penceresi, 512 nokta.
- Logaritmik frekans ekseni 20 Hz – 8 kHz; bölüm sınırları sarı çizgiyle.
- Hesaplama deterministiktir; aynı kayıt her zaman aynı görüntüyü verir.
- Talep üzerine hesaplanır ve kayda bağlı saklanır.
- **Doğruluk kanıtı:** 1000 Hz→1000.0, 300 Hz→296.9 (bin çözünürlüğü), sabit
  sinyal→0.0.
- İncelenen spektrogram rapor envanterine tarihiyle yansır.

### v2.5 — İnceleme özeti (denetim kaydı)

- Rapor sonunda "İNCELEME ÖZETİ" tablosu: incelenen kayıt, çözümlenen bölüm,
  denetlenen/denetim bekleyen bölüm, anlaşılmadı, anlamlı metin yok, gözlem
  işareti, spektrogram incelenen kayıt, kanal ayrımı, etiketlenen konuşmacı,
  perdesi ölçülen konuşmacı, kökeni belgelenen kayıt, WER ölçümü yapılan kayıt.
- Her satır yalnızca gerçek veriden üretilir; yapılmayan işlem yapılmış gibi
  gösterilmez. Üç çıktıda da yer alır.
- Klavye kısayolları yardım penceresine eklendi.

### v2.6 — Çözümleme doğruluk ölçümü (WER)

- Kelime düzeyinde Levenshtein uzaklığı + Türkçe normalizasyon (küçük harf,
  noktalama atma). WER = hata / referans kelime sayısı.
- **Doğruluk kanıtı (7 senaryo):** aynı metin→0, yerine koyma→0.5, silme→0.333,
  ekleme→0.5, tamamen farklı→1.0, noktalama farkı→0, Türkçe karakter→0.
- Gerçek veriyle: 67 kelimede 7 hata → %10.4.
- Raporda tablo; çözümlemede kullanılan model de belirtilir.
- Yalnızca hem referans hem çözümleme metni olan kayıtlar ölçülür.

### v2.7 — Kayıt kökeni ve teslim zinciri

- Her kayıt için ortam türü (CD/DVD, USB flaş, taşınabilir disk, telefon…),
  ortam etiketi/seri no, teslim eden, teslim tarihi, kayıt cihazı bilgisi.
- Rapora "KAYIT KÖKENİ VE TESLİM ZİNCİRİ" tablosu; üç çıktıda da.
- Uzman beyanına dayanır; uygulama ortamı kendiliğinden tespit etmez.

### v2.8 — Sayfa sıçramasını giderme (kök neden)

- `transcribe` her 30 saniyelik pencere sonunda tüm listeyi yeniden kuruyordu;
  bir saatlik kayıtta ~120 yeniden çizim. Kart iki bölgeye ayrıldı: durum
  bölgesi (sık tazelenir) ve içerik bölgesi (oynatıcı, dalga formu, deşifre;
  korunur). Yeniden çizim sayısı ~120'den 1'e indi.
- `renderAudioList` sayfanın ve panelin kaydırma konumunu saklayıp geri yükler.
- Perde ölçümü artık yalnızca konuşmacı panelini günceller.

## v2.9–v2.13 — Deşifre deneyimi iyileştirmeleri (uygulandı)

Kullanıcı geri bildirimiyle uzmanın en çok zaman geçirdiği deşifre alanında
kullanım kolaylığı ve doğruluk iyileştirildi. Mevcut özellikler korundu.

### v2.9 — Dinleme denetimleri

- **Dinle düğmesi artık akıllı:** aynı bölümde tekrar basınca duraklar,
  duraklatılmışken kaldığı yerden devam eder, başka bölümde baştan başlar.
- **Durdur düğmesi** eklendi: çalmayı keser ve bölüm başına sarar.
- Bölüm bitişinde durma tek bir `timeupdate` dinleyicisiyle yapılır; önceki
  sürümde her çalmada yeni dinleyici ekleniyordu (sızıntı giderildi).
- Oynatma hızı seçenekleri 0,25× ve 0,5× ile genişletildi.

### v2.10 — Milisaniye hassasiyetli zaman kodu

- `timecode` artık alt saniyeyi korur (`00:00:05.100`). Önceki sürümde
  `Math.floor` nedeniyle 0,1 sn'lik hassas kaydırma düğmeleri ve "buradan böl"
  işlemi saniyeye yuvarlanıyordu; 0,1 sn beş kez kaydırıldığında toplam 0,5 sn
  kayboluyordu. Eski `HH:MM:SS` biçimi de okunmaya devam eder (geriye dönük
  uyumlu). Birim testleri eklendi.

### v2.11 — Yakınlaştırılmış dalga formu etkileşimi

- **Tekerlek ile yakınlaştırma** (imlecin altındaki zaman sabit kalır) ve
  ＋ / − / Sığdır düğmeleri.
- **Sınır sürükleme:** yeşil (başlangıç) ve kırmızı (bitiş) çizgiler fare ile
  tutulup taşınabilir; imleç `ew-resize` olur.
- **Boşluğa tıklama:** oynatıcı o konuma gider; bölüm dışı hafifçe karartılır.
- Canvas üstünde ▶ / ⏹ düğmeleri; görünür pencere süresi başlıkta yazar.

### v2.12 — Elle yazmadan düzeltme ve paragraf

- **Hızlı etiketler:** [sessizlik], [anlaşılmaz], [uzaktan konuşma],
  [gürültülü], [üst üste], [müzik/ses] düğmeleri ve "Temizle". Boş veya
  anlaşılmaz bölümler elle yazmadan işaretlenir; uydurma metin üretilmez.
- **Paragraf oluştur:** ardışık ve aynı konuşmacıya ait bölümler tek paragrafta
  birleştirilir; konuşmacı değişince yeni paragraf başlar. Onaylanmamış içerik
  paragrafta onaylı sayılmaz. Birim testleri eklendi.
- **Karaoke vurgulama:** çalma sırasında o an konuşulan kelime vurgulanır.
  Model kelime zamanı verirse gerçek zamanlama, yoksa bölüm aralığı kullanılır.

### v2.13 — Dinleme yardımcıları (DSP)

- **Konuşma odağı** (300 Hz yüksek geçiren + 3,4 kHz alçak geçiren),
  **uğultu kes** (80 Hz yüksek geçiren) ve **gürültü kapısı** (sessizlikte
  kazancı düşürür) seçenekleri eklendi.
- Bu filtreler yalnızca dinlemeyi kolaylaştırır; kaydı değiştirmez. Kaynak
  ayrıştırma (yalnız konuşmayı müzikten ayırma) ağır bir makine öğrenmesi işi
  olduğu için uygulanmadı ve arayüzde bu sınır açıkça yazılır.

### Arayüz düzeltmeleri (v2.9 ile birlikte)

- **Odak modundan çıkış:** kenar çubuğu gizlenince çıkış düğmesi de
  kayboluyordu. Üst çubuğa "Odak modundan çık" düğmesi ve Esc kısayolu eklendi.
- **Gözlem işaretleri görünür geri bildirim:** işaret düğmeleri seçildiğinde
  koyu zemin ve ✓ işaretiyle gösterilir (`.mini-button.on` stili eksikti).
- **Klavye kısayolları güvenilirliği:** kısayollar belge düzeyine taşındı;
  metin alanından Esc ile çıkınca odak bölüme döner ve kısayollar çalışmaya
  devam eder. Boşluk tuşu odak bir düğmedeyken artık çift işlem yapmaz.
- **Bölmeden sonra kaydırma:** yeni oluşan bölüm görünür alana getirilir.

## v2.14 — Kayıt listesi (master–detail) düzeni

Çok sayıda ses kaydı olan dosyalarda kullanılabilirlik sorunu giderildi.

**Sorun:** Her ses kaydı için tam bir kart (dalga formu, oynatıcı, spektrogram,
köken, konuşmacılar ve tam deşifre editörü) alt alta çiziliyordu. On kayıtta
sayfa aşırı uzuyor, uzman ekranda yönünü kaybediyordu ("başım dönüyor").
Kullanıcılar bu nedenle her kaydı ayrı bir çalışma dosyasına koyma yoluna
gidiyordu; bu da raporun bütünlüğünü bozuyordu (rapor tek dosya üzerinden
üretilir).

**Çözüm:** Ses kayıtları görünümü iki katmana ayrıldı:

- **Kayıt listesi (üst):** her kayıt tek satır — sıra, dosya adı, süre/boyut,
  durum ve kontrol ilerlemesi. Liste sabit yükseklikte ve kendi içinde kayar;
  yirmi kayıt da bir ekrana sığar.
- **Seçili kayıt detayı (alt):** yalnızca seçili kaydın tam kartı çizilir
  (dalga formu, oynatıcı, dinleme yardımcıları, spektrogram, köken, konuşmacılar
  ve deşifre çalışma alanı). Tüm araçlar aynen korunur.

- Seçili kayıt (`activeMaterialId`) çalışma dosyasında saklanır; sayfa
  yenilenince aynı kayıt açık kalır.
- Çözümleme sırasında hem liste satırı hem detay durum bölgesi tazelenir;
  oynatıcı ve deşifre korunur (sayfa sıçramaz).
- Kayıt kaldırma, ekleme ve dosya değiştirmede liste ve detay tutarlı kalır.
- Rapor yine tek çalışma dosyasından üretilir; envanter, özet ve konuşmacı
  tabloları bölünmez.

## v2.15 — Sessizlik/boşluk ölçümü (NLP öncesi sinyal katmanı)

Uzmanın "boşluklar oluyor, konuşma yok diye elle yazmam gerekiyor" geri
bildirimi için deterministik bir ölçüm eklendi. Uydurma yoktur; yalnızca
ölçülen bir büyüklük sunulur.

- **Bölüm sessizlik ölçümü:** "Sessizlik ölç" düğmesi, bölüm aralığını RMS
  tabanlı inceler. Eşik, kaydın kendi gürültü zeminine göre uyarlanır (mutlak
  eşik yanlış olurdu). Sonuç: sessiz oran (%), sessiz süre ve toplam süre.
- **Gerekçeli işaret:** Ölçüm, bölüm metni boş/dolgu iken ve aralık büyük
  ölçüde sessizse "metin yerine [sessizlik] etiketi uygun olabilir" notu
  gösterir. Anlamlı metin varsa yalnızca "sessizlik yüksek ama metin girilmiş;
  doğrulayın" uyarısı verilir; metin asla otomatik doldurulmaz.
- Ölçüm sonucu bölüme ve delil işlem günlüğüne kaydedilir.
- Rapor inceleme özetine "Sessizlik oranı ölçülen bölüm" satırı eklendi
  (yalnızca gerçekten ölçülen bölümler sayılır).
- `analyzeSilence` ve `segmentSilenceFlag` saf fonksiyonlardır; birim
  testleriyle doğrulanır (tam sessiz → ~%100, tam konuşma → ~%0, yarı yarıya
  → ~%50).
