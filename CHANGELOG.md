# Değişiklik Günlüğü

Bu dosya AKİS'in sürüm geçmişini özetler. Kayıtlar, uygulamanın geliştirme
sürecinde tutulan eski `VERSION.txt` dosyasından tekrarlar ayıklanarak
derlenmiştir. Önceki dosya tek bir sürüm başlığı altında yüzden fazla maddeyi
(yaklaşık 13'ü birebir tekrar) sıralıyordu; burada aynı bilgiler konuya göre
gruplanmıştır.

**Güncel sürüm: v2.26.** Sürüm numarası `MAJOR.MINOR` biçimindedir ve tek
kaynaktan gelir: `assets/app.js` içindeki `APP_VERSION`. Her güncellemede o
değer, bu dosyadaki yeni başlık ve `docs/YOL_HARITASI.md` birlikte artırılır.

Kayıtlar en yeniden en eskiye doğru sıralanır. Yol haritası:
[`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md).

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

## v2 — Aktif geliştirme sürümü

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

## v2.16 — Terim yazım tutarlılığı (NLP katmanı)

Aynı terimin metin içinde farklı yazımlarla geçtiğini bulan bir öneri aracı
eklendi. Uydurma yoktur; yalnızca metinde gerçekten geçen sözcükler karşılaştırılır.

- **"Terim tutarlılığı" düğmesi:** Kaydın tüm bölüm metinlerini tarar; küçük
  yazım farkı olan sözcük kümelerini listeler (ör. "depozito" / "depozit").
  İşlev sözcükleri (bir, bu, ve…) elenir; yalnızca 4+ harfli anlamlı sözcükler
  karşılaştırılır. Eşleşme, aynı ilk üç harf ve küçük düzenleme uzaklığı ile
  sınırlanır (yanlış eşleşmeyi önler).
- **Otomatik değiştirme yoktur.** Uzman bir biçimi "esas al" seçerse diğer
  yazımlar o biçime çevrilir; çevirme yalnızca tam sözcük sınırında yapılır
  ("depozitin" içindeki "depozit" eşleşmez) ve metin geçmişine yazılır.
- `contentWords`, `findTermInconsistencies` ve `applyTermForm` saf
  fonksiyonlardır; birim testleriyle doğrulanır.

## v2.17 — Tekrar/dolgu tespiti (NLP katmanı)

Whisper'ın bazen aynı cümleyi/ifadeyi arka arkaya veya bir bölüm boyunca
tekrarlaması, gerçek konuşma değil model artefaktı olabilir. Bu durum
işaretlenir. Uydurma yoktur; yalnızca metindeki gerçek tekrar ölçülür.

- `detectRepetition`: ardışık yinelenen cümleleri ve bölüm içinde aşırı
  tekrarlanan ifadeleri bulur (ör. "Evet. Evet. Evet." veya aynı cümlenin
  bölümün %60'ından fazlasını kaplaması).
- `segmentRepetitionFlag`: bölüm düzeyinde tekrar işareti; bölüm detayında
  "Model tekrarı olasılığı… kaydı dinleyerek doğrulayın" notu gösterilir.
- Rapor öncesi uyarılara "model tekrarı olasılığı olan bölüm" sayısı eklendi.
- Metin asla otomatik düzeltilmez; yalnızca uzmana hatırlatılır.
- `detectRepetition` ve `segmentRepetitionFlag` saf fonksiyonlardır; birim
  testleriyle doğrulanır.

## v2.17.1 — Okunabilirlik (Faz 5)

- `assets/app.js` Prettier ile biçimlendirildi (printWidth 120, 2 boşluk, tek
  tırnak). Dosya ~1943 sıkışık satırdan ~5368 okunabilir satıra indi; davranış
  değişmedi (tüm testler geçer). Biçimlendirme ayarları `.prettierrc.json`
  dosyasında tutulur; tekrar biçimlendirmek için:
  `npx prettier --config .prettierrc.json assets/app.js`
- `tools/rapor-tutarlilik-testi.mjs` içindeki kaynak marker denetimi
  biçimlendirmeye dayanıklı hâle getirildi (boşluk ve süslü parantez öncesi
  boşluğa toleranslı). Böylece kaynak yeniden biçimlendirilse bile denetim
  sessizce boşa düşmez.

## v2.18 — Akış test kapsamı (yedekleme, model yöneticisi, deşifre motoru)

Kalan teknik borç (bu akışların otomatik test dışında olması) giderildi.
Tarayıcıya bağlı mantık, saf ve test edilebilir fonksiyonlara ayrıldı; davranış
değişmedi.

- **Yedekleme/geri yükleme:** `buildProjectPack`, `validateProjectPack`,
  `matchAudioEntries` ayrıldı. Paket şeması (`mihenk.project.v1`) ve ses girdisi
  eşleme (`${m.id}_...`) artık test edilir.
- **Model yöneticisi:** `evaluateModelIntegrity` (gerekli dosyalar + boş olmama),
  `recommendModel(device)` ve `modelIdFromUrl` saf fonksiyonlar; test edilir.
- **Deşifre motoru:** `asrWindows` (uzun kayıt pencere bölme), `parseAsrResult`
  (model çıktısı ayrıştırma, zaman ofseti, kelime zamanları) ve
  `looksNonTurkish` (dil uyarısı) ayrıldı; `transcribe` bu fonksiyonları
  kullanır. Pencere döngüsü artık aynı sınırları üretir.
- Toplam birim testi 114'ten 145'e çıktı; tümü geçer.

## v2.19 — Model seçimi, yükleme ve çıktı kalitesi düzeltmeleri

Kullanıcının bildirdiği dört sorun giderildi.

- **Duyarlılık (dtype) cihaza göre seçilir:** WASM (CPU) üzerinde fp16 güvenilir
  değildir ve bozuk çıktı ("- - - -" gibi) üretebilir. Artık WASM'da her zaman
  **fp32**, WebGPU'da **fp16** kullanılır (`dtypeFor`). Kalite ve doğruluk
  önceliklidir. Not: bu, "- - - -" sorununun en olası nedenine yönelik bir
  düzeltmedir; gerçek model indirilerek uçtan uca doğrulanmalıdır.
- **Yükleme ilerlemesi okunabilir:** dosya bazlı zıplayan yüzde yerine,
  tamamlanan dosya sayısına göre **genel ilerleme** ve ilerleme çubuğu
  gösterilir; aktif dosya adı ve seçili model adı yazılır.
- **Yüklü model görünür:** "Yüklü model: …" rozeti eklendi. Seçili model ile
  yüklü model farklıysa "seçili modeli kullanmak için Modeli yükle'ye basın"
  uyarısı çıkar. Böylece hangi modelin çözümleyeceği belirsiz kalmaz.
- **Kayıt başına çözümleyen model:** her ses kartında "Çözümleyen model: …"
  ve çözümleme tarihi gösterilir (rapor zaten modeli yazıyordu; arayüzde de
  görünür hâle geldi).
- Yeni saf fonksiyonlar `dtypeFor` ve `modelShortName`; birim testleriyle
  doğrulanır. Toplam birim testi 153'e çıktı.

## v2.20 — Timestamp token sızıntısı ("- - - -") giderildi

Kullanıcının bildirdiği ciddi sorun: orta ve küçük modelde temiz bir Türkçe
kayıt "- - - - - -" ve "< - < - < < <" gibi anlamsız çıktı üretiyor, bölümler
`00:00:00–00:00:00` görünüyordu; turbo modeli etkilenmiyordu. Makinede WebGPU
(RTX 3060) çalışıyordu, yani sorun dtype değildi.

**Kök neden:** `return_timestamps: 'word'` bu Whisper ONNX modellerinde
desteklenmiyor; model timestamp/özel token'larını metne döküyordu. Turbo farklı
mimari kullandığı için etkilenmiyordu.

Düzeltmeler:
- **`return_timestamps: true`** (segment düzeyi) kullanılır; kelime düzeyi
  kaldırıldı. Tekrar döngüsünü kırmak için `no_repeat_ngram_size: 3` ve
  `repetition_penalty: 1.2` eklendi; parametre kabul edilmezse sade çağrıya düşer.
- **`looksLikeGarbage`:** harf/rakam oranı ve jeton tekrarına göre çöp çıktıyı
  tespit eder. Çöp bölümler `parseAsrResult`'ta atılır; deşifreye hiç girmez ve
  `isHallucination` bunu da yakalar.
- **Sıfır süre giderildi:** bitiş zamanı gelmezse pencere süresi kadar
  tamamlanır; bölüm artık "00:00:00–00:00:00" olmaz.
- Birim testleri gerçek hata desenleriyle eklendi (çizgi/açı/tırnak yığını çöp;
  gerçek cümle temiz). Toplam birim testi 164'e çıktı.

## v2.21 — Decoder fp16 kök nedeni ve kademeli çözümleme

v2.20'den sonra orta model **boş** sonuç döndürdü. Konsol çıktısı WebGPU
(`ort-wasm-simd-threaded.jsep`) yolunu doğruladı. Asıl kök neden bulundu:
tek bir `dtype: 'fp16'` hem encoder hem **decoder**'a uygulanıyordu; onnx-community
Whisper modellerinde **decoder fp16 çalıştırmak bozuktur** ve boş/token çöpü
üretir.

Düzeltmeler:
- **Bileşen bazlı dtype:** `dtypeFor` artık `{ encoder_model, decoder_model_merged }`
  döndürür. WebGPU: encoder fp16 + **decoder fp32**. WASM: ikisi de fp32.
  Decoder'ın asla fp16 olmaması birim testiyle kilitlendi.
- **Dtype kademesi:** istenen dtype ile yüklenemezse tümü fp32 ile yeniden
  denenir; dtype seçimi yüklemeyi asla kırmaz.
- **Zaman damgası merdiveni:** `return_timestamps:true` (+ tekrar kırıcı) →
  `true` → parametresiz sırayla denenir; ilk anlamlı sonuç kullanılır. Çöp asla
  kabul edilmez.
- **Boş sonuçta yol gösterici uyarı:** çıktı yalnızca çöp ise kullanıcıya
  Large-v3-turbo denemesi ve elle giriş önerilir.
- `dtypeLabel` ile durum satırında "encoder … / decoder …" gösterilir.
  Toplam birim testi 165'e çıktı.

## v2.22 — Model yüklenirken çözümleme (yarış durumu) düzeltildi

Kullanıcı model indirmesi sürerken (ör. %86, decoder dosyası) "Çözümle"ye
bastığında "Çözümleme başarısız: Model yükleniyor. Lütfen bekleyin." hatası
alıyordu. Bu bir yarış durumuydu.

- **Bekleme:** yükleme sürerken gelen çözümleme isteği artık hata fırlatmaz;
  aynı yükleme promise'ini bekler ve indirme bitince çözümlemeye devam eder.
- **Hata ayrımı:** yükleme hatası ile çözümleme hatası arayüzde ayrı gösterilir;
  yükleme hatasında "modeli yeniden yükleyip tekrar deneyin" yönlendirmesi ve
  hata ayrıntısı verilir.

## v2.23 — Bellek güvenli dtype geri dönüşü (Aborted düzeltmesi)

v2.21'deki dtype geri dönüşü bellek açısından tersti: bileşen-bazlı dtype
başarısız olunca **tümü fp32**'ye düşüyordu. fp32 daha fazla bellek ister;
6 GB VRAM'de `Aborted()` (bellek taşması) ile sonuçlandı.

- **Azalan bellek sırası:** `dtypeCandidates` artık bellek artmayacak sırayı
  verir. WebGPU: (encoder fp16 + decoder fp32) → fp16. WASM: fp32.
- **Denemeler arası serbest bırakma:** her başarısız denemeden önce önceki
  oturum `dispose()` edilir; bellek birikmez.
- `dtypeFor` yerine `dtypeCandidates` kullanılır; testler buna göre güncellendi.
  Toplam birim testi 165 (tümü geçer).

## v2.24 — İlerleme göstergesi, Tiny model, GPU→CPU geri dönüşü

Kullanıcı geri bildirimi: yükleme ilerlemesi gerçekçi görünmüyor ("%71'de
başlıyor, %80'e çıkıp duruyor"); ayrıca 16 GB RAM + 6 GB GPU'da orta model
neden yüklenmiyor sorusu.

- **İlerleme düzeltmesi:** eski kodda payda dosya sayısıydı; dosyalar indikçe
  payda büyüdüğü için yüzde geriye düşüyordu. Artık **sabit beklenen dosya
  sayısı** (7) ve **hiç azalmayan** yüzde kullanılır; aktif dosya adı gösterilir.
- **Tiny model** eklendi (~75 MB) — en hızlı, en düşük doğruluk.
- **GPU→CPU geri dönüşü:** GPU'da tüm dtype denemeleri başarısız olursa
  (ör. bellek yetmez → `Aborted`) son olarak **CPU (WASM) fp32** denenir.
  16 GB RAM'de model CPU'da çalışır. Böylece yükleme artık kilitlenmez.
- Durum satırı gerçek kullanılan cihazı ve dtype'ı gösterir.
- Model menüsünde 5 model: Tiny, Temel, Küçük, Orta, Large-v3-turbo.

## v2.25 — Gerçek model boyutları ve cache-busting

Kullanıcı haklı olarak "dosya boyutlarını yanlış hesaplamışsın" dedi. Doğrulandı:
HuggingFace deposundaki gerçek ONNX boyutları (encoder + decoder) ölçüldü ve
etiketler düzeltildi:

| Model | GPU (fp16) | CPU (tam) |
|---|---|---|
| Tiny | ~73 MB | ~144 MB |
| Temel | ~139 MB | ~278 MB |
| Küçük | ~463 MB | ~923 MB |
| Orta | ~1,46 GB | ~2,9 GB |
| Large-v3-turbo | ~1,54 GB | ~657 MB |

- Eski "~485 MB" gibi yanlış/eksik etiketler gerçek toplam boyutlarla değiştirildi;
  hem GPU hem CPU boyutu ayrı gösterilir (seçilen cihaza göre ne ineceği belli olur).
- **Cache-busting:** `app.js`/`app.css` artık `?v=2.25` ile yüklenir. Böylece
  tarayıcı eski JS'i önbellekten çalıştırıp eski davranışı göstermez (kullanıcı
  "hâlâ encoder fp16 / decoder fp32 yazıyor" diyordu; bu eski kodun önbellekte
  kalmasındandı).

## v2.26 — "%70'ten başlıyor" açıklaması ve doğruluk oranı netliği

Kullanıcı yüklemenin hep %70'ten başladığını bildirdi. Teknik olarak doğru:
önbellekteki dosyalar anında %100 rapor edilir; 7 dosyadan 5'i önbellekteyse
5/7 = %71 çıkar. Bu yanıltıcıydı.

- İlerleme metni artık **"N dosya önbellekten"** notunu gösterir; böylece yüksek
  başlangıç yüzdesinin nedeni anlaşılır.
- **Doğruluk (WER) ölçümü netleştirildi:** WER yalnızca **referans metni** olan
  kayıtlarda hesaplanır (test verisi gibi). Gerçek dosyalarda referans metni
  yoktur; bu yüzden çözümleme yaptıkça "kendiliğinden" bir doğruluk oranı
  çıkmaz. Uzman, metni kaydı dinleyerek düzeltir; bu bir doğruluk ölçümü değil
  kontrol sürecidir. WER yalnızca karşılaştırma (hangi model daha iyi) için,
  referans bulunan durumlarda kullanılır.
