# Özellikler (v2.129 — mevcut durum)

Bu belge, AKİS v2.127'de **hâlihazırda çalışan** özellikleri listeler. Yol haritası
ve tamamlanma durumu için [`YOL_HARITASI.md`](YOL_HARITASI.md) dosyasına bakın.

## Arayüz düzeni (v2.27–v2.31)

- **Dar ikon rayı** (68px): Özet · Ses · İnceleme · Rapor. Aktif öğe altın
  çizgiyle işaretlenir; ses kaydı sayısı rozet olarak görünür.
- **Üst bar:** çalışma dosyası seçici, sayfa başlığı, kayıt durumu, içe/dışa
  aktarma düğmeleri her an görünür.
- **Alt durum çubuğu:** dosya · kayıt sayısı · bölüm sayısı · denetim yüzdesi ·
  yüklü model ve çalışma birimi (GPU/CPU).
- **Sağ çekmeceler:** Ayarlar (model, toplu çözümleme, depolama) ve Dosya
  bilgileri. Çalışma alanı kapanmaz; aynı anda yalnızca biri açılır; Esc, ×
  veya karartmaya tıklayarak kapanır.
- **ⓘ ipuçları:** "nasıl çalışır" türü açıklamalar başlık yanındaki ipucunda;
  kritik uyarılar (mesleki sınır, denetlenmemiş bölüm, dolgu/çöp) görünür kalır.
- **Rapor tam ekran:** kabuk gizlenir; "← Çalışmaya dön", "Yazdır", "UDF indir".
- **Duyarlı:** ≤900px etiketler gizlenir; ≤640px ray alt sekmeye döner.
- **Odak modu** ikon olarak ray altında; Esc ile çıkılır.

## Bölüm düzenleme (v2.60–v2.76)

- **İki sütunlu bölüm detayı:** sol = dalga/zaman/konuşmacı/gözlem, sağ =
  metin (asıl iş, tam yükseklik), alt = onay + araçlar.
- **Bölüm dalgası:** bölümün ±0,5 sn penceresi. **Sınırı sürükle** = B/S
  sınırı, **Shift+sürükle** = görünümü kaydır (pan), **tekerlek** = zoom,
  **düz tıkla** = yalnız konuma git, **Alt+tıkla** = en yakın sınırı taşı.
  İmleç zamanı üstte yazılır (`00:00:18.000`).
  v2.78'de düz tıklama sınırı **sessizce taşıyordu**; uzman dinlemek için
  tıkladığında bölme çizgisi bozuluyordu. Artık tıklama sınırı taşımaz.
- **A–B dinleme döngüsü (v2.78):** dalgada A ve B noktaları belirlenir,
  **🔁 Döngü** ile aralık tekrar tekrar dinlenir. Döngü **yalnız oynatmayı
  sarar**; bölüm sınırlarına dokunmaz ve kayda yazılmaz (oturumluktur).
- **✂ Böl:** aktif bölümü imlecin olduğu yerden ikiye ayırır. **Metin yeniden
  çözümlenmez**; kesim noktasına göre paylaştırılır (kelime zamanlaması varsa
  tam, yoksa kelime sınırından tahmin). Bölünen iki bölüm de "Kontrol
  bekliyor"a döner.
- **↻ Bu aralığı çözümle:** yalnız o bölümün başlangıç–bitiş aralığını ses
  dosyasından kesip modele verir. Diğer bölümlere dokunmaz. Metin kaybolduysa
  geri getirir; eski metin geçmişe yazılır.
- **Sonrakine ekle:** aktif bölümü sonrakiyle birleştirir; metinler boşlukla
  birleşir.
- **Paragraf oluştur:** ardışık ve aynı konuşmacıya ait bölümleri toplar.
- **Metin geçmişi:** bölüm başına son 10 sürüm (`geçmiş (N)` düğmesi).
- **Otomatik çıktı ile düzeltme AYRI (v2.83):** modelin ürettiği ham metin
  `asrText` alanında **değişmez** biçimde saklanır; bilirkişinin düzenlediği
  metin `text` alanındadır. Metin değiştiyse bölüm detayında "Otomatik
  çözümleme çıktısı (değiştirilmedi)" katlanmış bloğu açılır; model kimliği ve
  çözümleme zamanı da görünür. Öncesinde model çıktısı yalnız `history`'de
  kalıyor ve **10 sürümden sonra siliniyordu** — adli açıdan kabul edilemez.
  Eski kayıtlarda alan boştur; uydurma yapılmaz.
- **Hızlı onaya uygun filtresi (v2.80):** sol panelde **Hızlı onaya uygun**
  sekmesi yalnız *gözlemlenebilir* ölçütü geçen bekleyen bölümleri listeler.
  Uydurma bir doğruluk yüzdesi **yoktur**; dışlama nedenleri metinle yazılır:
  anlamlı metin yok, süre geçersiz, çok kısa bölüm (<1,2 sn), model tekrarı,
  üst üste konuşma / anlaşılmaz işareti, öncekiyle çakışan aralık.
- **Toplu onay (v2.80):** `✓ N hızlı onayla` düğmesi **yalnız** bu ölçütü
  geçen bölümleri onaylar; uygun olmayanlara dokunmaz. Geri alınabilir
  (Ctrl+Z), delil günlüğüne yazılır. Onay yetkisi kuralı korunur: ikinci göz
  (yardımcı/gözlemci) bu düğmeyi **görmez**. Toplu onay denetim yerine
  geçmez; uzman listeyi yine de dinlemelidir.

## Geri alma (v2.75)

- **Ctrl+Z** veya üst bardaki **↶ N** düğmesi; son **20 işlem**.
- Kapsam: bölme, bölüm silme, birleştirme, paragraf, kayıt kaldırma, içe
  aktarma, dosya birleştirme, yeniden çözümleme, aralık çözümleme.
- Metin yazarken Ctrl+Z tarayıcının kendi geri almasını kullanır (karakter
  geri alma); belge işlemleriyle karışmaz.

## Depolama (v2.69–v2.73)

- **Dava verisi IndexedDB'de** (tarayıcı kotası ~10 GB). v2.72'ye kadar
  localStorage (5 MB) kullanılıyordu; bir dava bile doldurabiliyordu.
- **Eski veri otomatik göç eder:** localStorage kaydı bulunursa okunur,
  IndexedDB'ye taşınır, büyük kopya silinir.
- **Üst barda kullanım göstergesi:** `Depolama: 5 KB / 10.00 GB (%0)`.
  %70 altın, %90 kalın uyarı. Üzerine gelince kullanılan/kota/kalan.
- **Yedek durumu:** `Hiç yedek alınmadı` / `Son yedek 19.11.2026` /
  `Son yedek … (4 gün önce)` (3+ gün altın uyarı).
- **Depolama dolunca:** büyük uyarı şeridi + "Dışa aktar" düğmesi. Sessiz
  veri kaybı olmaz.
- **Model seçimi hatırlanır** (`akis.model`); her açılışta öneri onu ezmez.

## Veri şeması (v3) — tek geçerli yapı

Tüm veri `assets/schema.js` içindeki **v3 şemasına** uyar. Şema ayrı dosyada,
tarayıcıya bağımlı olmayan saf fonksiyonlar olarak durur; üretim ve test aynı
dosyayı kullanır.

- **Kimlik:** dosya, kayıt, bölüm, soru, konuşmacı ve ekip üyesi `id` taşır.
  Referanslar id ile kurulur (ad veya dizi indeksi değil).
- **Kod ≠ etiket:** durum/rol/cinsiyet/ortam kodları ASCII sabittir
  (`pending`, `approved`, `inaudible`…). Türkçe metin tek yerden türetilir.
- **Kalıcı ≠ geçici:** sekme, aktif bölüm, ilerleme gibi oturumluk alanlar
  diske yazılmaz.
- **Delil zinciri:** her işlem günlüğü girdisi `prevHash`+`hash` taşır;
  sonradan değişiklik ve silme tespit edilebilir.
- **Genişletme güvenli:** bilinmeyen alan korunur, eksik alan varsayılanla
  tamamlanır; sıralama/taşıma veri bağını bozmaz.
- **Ortak çalışma (dosya birleştirme):** iki bilirkişi aynı davada
  çalıştığında her biri kendi `.akis` dosyasında ilerler. Üst bardaki
  **⇄ Birleştir** düğmesi gönderilen paketi açar ve **önce ne değişeceğini
  gösterir** (yeni kayıt, yeni bölüm, çakışan bölüm, doldurulacak cevap).
  Birleştirme kimlik (id) ile yapılır; farklı metinler yan yana gösterilir ve
  sessizce ezilmez. Sunucu, hesap veya internet gerekmez; dosya nasıl
  gönderilirse gönderilsin çalışır.
- **İnceleme ekibi:** dosyaya ad, görev, sicil ve kurumla ekip üyesi eklenir.
  Ekip bilgisi rapora girmez; iş bölümü içindir.

Ayrıntılı yapı ve kurallar: [`MIMARI.md`](MIMARI.md).

## Çalışma dosyası yönetimi

- Birden fazla inceleme dosyası; üst bardan dosya değiştirme ve "＋" ile yeni
  dosya. Yeni dosya boş formla açılır; bilgiler yazıldıkça otomatik kaydedilir.
- Dosya bilgileri `localStorage`, ses kayıtları IndexedDB içinde saklanır.
- `.akis` yedek dışa/içe aktarma (dosya bilgileri, sorular, bölümler, teknik
  envanter, SHA-256 ve tüm ses blob'ları).
- Eski MİHENK `.mihenk` yedekleri de içe aktarılabilir (depolama anahtarları
  geriye dönük uyumlu tutulur).

## Dosya tanımı

- Dört merci türü: Hukuk/İdare-Vergi, Ceza, Cumhuriyet Başsavcılığı, İcra.
- Merci türüne göre kapak terminolojisi ve rol etiketleri:
  - Dosya numarası: hukuk/ceza/icra "DOSYA NO", savcılık "SORUŞTURMA NO".
  - Taraflar: davacı/davalı, müşteki-mağdur/katılan ve sanık, müşteki/şüpheli,
    alacaklı/borçlu (+ vekil karşılıkları).
  - Konu/tarih: dava, inceleme, soruşturma, takip konusu ve tarihi.
- Bölüm içi ifadeler mercie göre uyarlanır: soruları yönelten merci hukuk ve
  cezada "Mahkemece", savcılıkta "Cumhuriyet Başsavcılığınca", icrada "İcra
  Müdürlüğünce" olarak yazılır. Savcılık dosyasında "mahkemece yöneltilen
  sorular" ifadesi yanlış olurdu.
- Rapor başlığındaki yönelme eki Türkçe ünlü uyumuna göre hesaplanır
  ("MAHKEMESİ'NE", "BAŞSAVCILIĞI'NA", "MÜDÜRLÜĞÜ'NE").
- Görevlendirme tarihi, verilen süre (gün) ve son teslim tarihi alanları.

## Ses kayıtları

- **Kayıt listesi (master–detail):** üstte kompakt kayıt listesi (sıra, dosya
  adı, süre/boyut, durum, kontrol ilerlemesi; sabit yükseklikte, kendi içinde
  kayar), altta yalnızca **seçili** kaydın tam detayı. Böylece çok kayıtlı
  dosyalarda sayfa uzamaz; seçili kayıt çalışma dosyasında saklanır.
- Sürükle-bırak veya dosya seçme; WAV, MP3, M4A, OGG, FLAC, AAC.
- Toplu dosya ekleme.
- Kayıt başına teknik envanter: dosya adı, biçim, boyut, süre, codec, kanal
  sayısı, örnekleme frekansı, bit derinliği, SHA-256 özeti.
- WAV başlığı chunk yürüyerek okunur (sabit offset varsayımı kullanılmaz).
- Canvas tabanlı dalga formu: tıklayarak konuma gitme, bölüm aralıklarının
  görsel işaretlenmesi, oynatma imleci.
- Kayıt kaldırma.

## Konuşma çözümleme (deşifre)

- Tarayıcıda çalışan Whisper modelleri (Transformers.js): temel, küçük, orta,
  large-v3-turbo.
- Kaynak dil Türkçe, görev "transcribe" olarak sabitlenir (çeviri yapılmaz).
- WebGPU algılama; yoksa otomatik WASM (CPU) geri dönüşü.
- Kayıtlar 30 saniyelik pencerelere bölünür; her pencere sonunda ilerleme
  kaydedilir, işlem kesintiye uğrarsa kalan bölümler korunur.
- Çözümleme iptal edilebilir.
- Toplu çözümleme kuyruğu: sıralı işlem, genel ilerleme, tahmini kalan süre,
  hatalı kaydı tekrar deneme.
- Dolgu/halüsinasyon tespiti: "(Konuşma)" gibi anlamsız çıktılar işaretlenir.
- Pencere dayanıklılığı: tek pencere hatası tüm kaydı çökertmez.
- Türkçe dışı çıktı olasılığı için dil uyarısı.

## Deşifre editörü

- Zaman damgalı bölümler; başlangıç/bitiş zamanı ve metin düzenleme.
- Konuşmacı etiketi (uzman tarafından girilir; otomatik kimlik tespiti yoktur).
- Dört kontrol durumu: Onaylandı, Kontrol bekliyor, Anlaşılmadı, Yeniden
  dinlenecek. Yalnızca "Onaylandı" ve "Anlaşılmadı" denetlenmiş sayılır.
- "▶" düğmesiyle bölümü kayıttan dinleme (başlangıçta başlar, bitişte durur).
- Bölüm metni değişiklik geçmişi.
- Elle bölüm ekleme.

## Deşifre ve kontrol çalışma alanı

Uzmanın en çok zaman geçirdiği alan olduğu için hızlı ve hatasız kontrol
hedefiyle tasarlanmıştır. **İki panel** kullanır: solda bölüm listesi (gezinme),
sağda aktif bölüm detayı (çalışma). Aktif bölüm değişince DOM yeniden çizilmez;
yalnızca işaret ve detay alanları güncellenir. Böylece kaydırma, odak ve ok
tuşları bozulmaz.

- **Klavye kısayolları** (eller metinden ayrılmadan):
  - `Boşluk` oynat/durdur
  - `↑` `↓` önceki/sonraki bölüm
  - `Enter` aktif bölümü onayla ve sonrakine geç
  - `Y` aktif bölümü dinle
  - `[` `]` oynatma hızını düşür/artır
  - `←` `→` 5 saniye geri/ileri
  - Metin alanındayken `Esc` ile alandan çık, klavye gezinmesine dön
  - Kısayollar belge düzeyinde dinlenir; odak listeden çıksa bile çalışır.
- **Bölüm listesi:** numara, başlangıç, metin özeti, konuşmacı, öncelik ve
  kontrol durumu tek satırda. Aktif bölüm işaretlenir.
- **Bölüm filtresi:** Tümü / Bekleyen / Onaylandı / Anlaşılmadı / Yeniden
  dinlenecek; her birinin sayısı görünür.
- **İnceleme önceliği:** hangi bölümün önce dinlenmesi gerektiğini gösteren
  şeffaf, gerekçeli işaret (anlamlı metin yok, süre sıfır, çok kısa/uzun bölüm,
  öncekiyle çakışma). "Öncelikliye git" düğmesi en yüksek öncelikli bekleyen
  bölüme atlar.
- **Bölüm işlemleri:** oynatıcı konumundan böl (`B`), sonrakiyle birleştir
  (`M`), sil.
- **Gözlem işaretleri:** her bölüm için arka plan gürültüsü, üst üste konuşma,
  anlaşılmaz bölüm ve müzik/ses efekti işaretlenebilir. Bu işaretler rapora
  "Gözlem" sütunu olarak yansır.
- **Kanal seçimi (stereo kayıtlarda):** her iki kanal, yalnız sol veya yalnız
  sağ kanal dinlenebilir. Arka plan gürültüsünü veya tek kanaldaki konuşmayı
  ayırt etmeye yardımcı olur. Web Audio `ChannelSplitter` ile uygulanır;
  seçilen kanal rapor envanterinde gösterilir.
- **Hassas sınır ayarı:** başlangıç/bitiş zamanı 0,1 sn ve 1 sn adımlarla
  kaydırılır. Zaman kodu milisaniye hassasiyetindedir (`00:00:05.100`); eski
  `HH:MM:SS` kayıtlar da okunur. Uzman, konuşmanın tam başladığı/bittiği noktayı
  bu düğmelerle ayarlar.
- **Yakınlaştırılmış dalga formu:** aktif bölümün çevresi gösterilir; fare
  tekerleğiyle yakınlaştırma, ＋/−/Sığdır düğmeleri, yeşil/kırmızı sınır
  çizgilerini sürükleyerek başlangıç/bitiş ayarlama ve boşluğa tıklayarak
  konuma gitme desteklenir. Canvas üstünde ▶/⏹ düğmeleri vardır.
- **Spektrogram:** talep üzerine hesaplanan FFT spektrogramı (512 nokta, Hann
  penceresi). Logaritmik frekans ekseni 20 Hz – 8 kHz; sarı çizgiler bölüm
  sınırlarını gösterir. Bölüm sınırının tam yerini görmek ve gürültü/tıslama
  gibi unsurları ayırt etmek için kullanılır. Hesaplama deterministiktir.
  İncelenen spektrogram rapor envanterinde tarihiyle belirtilir.
- **Oynatma hızı** 0,25× – 2× arası; kayda bağlı saklanır.
- **Dinle / Duraklat / Durdur:** "Dinle" düğmesi akıllıdır; aynı bölümde tekrar
  basınca duraklar, duraklatılmışken kaldığı yerden devam eder. "Durdur" çalmayı
  keser ve bölüm başına sarar. Bölüm bitişinde otomatik durur.
- **Hızlı etiketler:** [sessizlik], [anlaşılmaz], [uzaktan konuşma], [gürültülü],
  [üst üste], [müzik/ses] düğmeleri ve "Temizle". Boş veya anlaşılmaz bölümler
  elle yazmadan işaretlenir; uygulama uydurma metin üretmez.
- **Sessizlik ölçümü:** "Sessizlik ölç" düğmesi bölüm aralığını RMS tabanlı
  inceler; sessiz oran, sessiz süre ve toplam süre gösterilir. Eşik kaydın
  kendi gürültü zeminine göre uyarlanır. Metin boş/dolgu ve aralık büyük ölçüde
  sessizse "[sessizlik] etiketi uygun olabilir" notu çıkar; metin otomatik
  doldurulmaz.
- **Terim tutarlılığı:** "Terim tutarlılığı" düğmesi kaydın tüm bölümlerinde
  küçük yazım farkı olan sözcükleri bulur (ör. "depozito"/"depozit"). Öneri
  listesidir; uzman bir biçimi "esas al" seçerse diğerleri ona çevrilir (tam
  sözcük sınırında, metin geçmişine yazılarak).
- **Tekrar tespiti:** Modelin aynı ifadeyi arka arkaya veya bölüm boyunca
  tekrarladığı durumlar işaretlenir ("model tekrarı olasılığı"). Metin otomatik
  düzeltilmez; yalnızca uzmana hatırlatılır.
- **Paragraf oluştur:** ardışık ve aynı konuşmacıya ait bölümler tek paragrafta
  birleştirilir; konuşmacı değişince yeni paragraf başlar. Onaylanmamış bölüm
  paragrafta onaylı sayılmaz.
- **Karaoke vurgulama:** çalma sırasında o an konuşulan kelime vurgulanır. Model
  kelime zamanı verirse gerçek zamanlama, yoksa bölüm aralığı kullanılır.
- **Dinleme yardımcıları (DSP):** konuşma odağı (300 Hz – 3,4 kHz), uğultu kes
  (80 Hz üstü) ve gürültü kapısı. Oynatıcı şeridinde, deşifre sekmesinde her
  zaman görünür; filtre açıksa şerit bunu gösterir ve filtre sayfa
  yenilendikten sonra da ses üzerinde etkili olur. Yalnızca dinlemeyi
  kolaylaştırır; kaydı değiştirmez. Oturum ayarıdır, rapora yazılmaz. Kaynak
  ayrıştırma (yalnız konuşmayı müzikten ayırma) yapılmaz.
- **Denetim ilerlemesi** çubuğu ve durum renkleri.
- **Kaydırma koruması:** liste yeniden kurulurken sayfanın ve panelin kaydırma
  konumu korunur; işlem sırasında ekran zıplamaz.
- Uzun kayıtta liste paneli kayar, sağ panel sabit kalır.

## Ölçüm katmanı (elektro-akustik)

Her ölçüm kaydın örneklerinden hesaplanır; hiçbiri tahmin değildir ve hiçbiri
bilirkişi tetiklemeden çalışmaz. Ölçüm yapılmamışsa rapora satır yazılmaz.

- **Seviye ölçümü:** tepe ve RMS düzeyi (dBFS), tepe kırpılma oranı, gürültü
  tabanı ve sinyal/gürültü oranı. Ölçüm dosyanın kendi örnekleme hızında
  yapılır. Analiz sekmesindeki "Seviye ölçümü yap" düğmesi tetikler.
- **Stereo ölçümü (iki kanallı kayıtta):** kanal dengesi (L−R dB), kanallar
  arası korelasyon (ters faz −1'e yaklaşır) ve DC kayması.
- **Etkin bant genişliği:** ortalama güç spektrumunda toplam enerjinin %95'ini
  kapsayan üst frekans (P95). Yeniden kodlama, telefon bandı veya düşük
  örnekleme izlerini değerlendirmede ölçülebilir dayanak verir.
- **Sessizlik oranı:** bölüm bazında, kaydın kendi gürültü zeminine göre
  uyarlanan eşikle ölçülür.
- **Konuşmacı perdesi:** otokorelasyonla temel frekans tahmini (tahmindir;
  kimlik tespiti değildir).
- **WER:** yalnızca referans metni bulunan kayıtlarda kelime hata oranı.

Bu ölçümler rapora "Ses seviyesi ve kırpılma ölçümü" bölümü olarak girer;
HTML, DOCX ve UDF çıktıları aynı tek kaynaktan beslenir.

## Görünüm ve okuma konforu (v2.50)

Bilirkişi bu ekranda saatlerce deşifre yazıyor. Görünüm bu yüzden ölçülebilir
kurallara bağlandı; hiçbir metin 11px'in altında değil, her metin rengi
WCAG AA (≥4.5:1) eşiğinin üstünde.

- **Üç tema:** Açık (gündüz), Koyu (loş oda/gece), Sepya (kâğıt hissi, uzun
  okuma). Seçim tarayıcıda saklanır; sayfa açılırken bir an bile yanlış temada
  görünmez.
- **İki yoğunluk:** Rahat (geniş nefes payı) ve Sıkı (uzun kayıtta daha çok
  satır).
- **Üç yazı boyutu:** Normal, Büyük, Çok büyük. Küçültme seçeneği yoktur;
  okunabilirlik tek yönlü korunur.
- **Deşifre alanı** 14px punto ve 1.7 satır aralığıyla yazılır; zaman kodu eş
  aralıklı (tabular) fontla hizalanır.
- **Rapor önizlemesi** temadan bağımsızdır: koyu temada bile kâğıt açık kalır,
  yazdırmada beyaza çevrilir. Tema yalnız ekranı etkiler; UDF/DOCX çıktısı
  değişmez.
- **Erişilebilirlik:** Odak halkası, hareket azaltma (`prefers-reduced-motion`),
  yüksek karşıtlık (`prefers-contrast: more`) desteklenir. Uyarılar yalnız
  renkle değil, metin ve kenarlıkla da ayrışır.

Ayarlar çekmecesinin en üstündeki **Görünüm** panelinden seçilir.

## Çıktı ilkesi

Üretilen her belge bilirkişi adına yazılır. Raporun hiçbir yerinde uygulamanın
adı, sürümü veya varlığı anılmaz; uygulama yalnızca bilirkişinin kullandığı
bilimsel araçtır. Kapak üst satırı ve Word üst bilgisi, dosyada girilen
uzmanlık alanını gösterir.

## Masaüstü uygulaması hissi

- **Odak modu:** kenar çubuğu gizlenir, çalışma alanı genişler; bölüm metni
  alanı büyür. Tercih tarayıcıda saklanır. Kenar çubuğu gizlendiği için moddan
  çıkmak üzere üst çubukta "Odak modundan çık" düğmesi ve `Esc` kısayolu vardır.
- **Kompakt yükleme alanı:** ses ekleme şeridi ekranın çoğunu kaplamaz.
- İşlemler listeyi bütünüyle yeniden kurmaz; yalnızca değişen bölüm güncellenir.

## Konuşmacı yönetimi ve ses özellikleri

- **Standart konuşmacı kodu (v2.79):** her konuşmacı **S1, S2, S3…** kodu taşır.
  Kod bir kez verilir ve **değişmez**; etiket ("Kiracı", "Ev sahibi") sonradan
  değişse bile aynı kişi raporda aynı kodla görünür. Silinen konuşmacının kodu
  yeniden kullanılır; raporda `S1, S3` gibi boşluk oluşmaz.
- **Bölümde konuşmacı seçimi listedir** (serbest metin değil): `S2 · Kiracı`.
  Yeni kişi için bölüm detayındaki **＋** düğmesi kullanılır; yeni konuşmacı
  sıradaki boş kodu alır ve o bölüme atanır.
- Her konuşmacı için **rol** (davacı, davalı, müşteki, sanık, şüpheli, alacaklı,
  borçlu, tanık, bilirkişi…), **cinsiyet** (uzman beyanı), **yaş aralığı** ve
  **not** alanları. Bu bilgiler rapora "Konuşmacılar" tablosu olarak akar.
- **Kod ≠ etiket (v2.79):** rol ve cinsiyet kayda **ASCII kod** olarak yazılır
  (`complainant`, `female`), raporda **Türkçe etiket** görünür. v2.78 ve
  öncesinde arayüz etiketi kaydediyordu; şema kodu beklediği için değer
  yeniden yüklemede `Belirtilmedi`ye düşüyordu (sessiz veri kaybı). Eski
  kayıtlar `normalizeSpeakerRole` / `normalizeSpeakerGender` ile kurtarılır.
- **Perde (temel frekans) ölçümü:** otokorelasyon yöntemiyle gerçek DSP ölçümü.
  Her konuşmacının bölümlerinden örnekler alınır, ortanca perde hesaplanır ve
  kaba bir yönlendirme gösterilir (ör. "düşük perde, genellikle erkek").
  Ölçüm otomatik değildir; uzman "Konuşmacı perdesini ölç" düğmesiyle başlatır.
- **Konuşmacı eşleştirme önerisi:** benzer perdede görünen etiketler uzmana
  "aynı kişi olabilir" diye hatırlatılır. Bu bir **öneridir**; kimlik tespiti
  değildir ve arayüzde açıkça belirtilir.
- **Sınır:** uygulama konuşmacı kimliğini kendiliğinden tespit etmez. Etiketler
  ve öznitelikler uzman beyanına dayanır; perde değeri kayıt koşullarına bağlı
  bir tahmindir.

## Çözümleme profilleri (v2.81)

- **Ne yapar:** aynı konuşma modelinin **dil ipucu ve bağlam istemini** değiştirir
  (standart · şive/ağır aksan · gürültülü/kıcırtılı · telefon/dar bant). Seçim
  Ayarlar → *Çözümleme profili*'nde yapılır ve tarayıcıda hatırlanır.
- **Ne YAPMAZ (dürüst sınır):** şive tanıma, kaynak ayrıştırma (konuşmayı
  müzikten ayırma), malzeme sesi sınıflandırma veya konuşmacı kimlik tespiti
  **yapmaz**. Bunlar ayrı eğitilmiş modeller gerektirir; bu depo öyle bir model
  içermez ve yapılmış gibi göstermez.
- **Rapora girmez:** profil yalnız çözümleme ayarıdır; rapor metnine veya
  künyeye yazılmaz. Çıktı yine bilirkişinin doğrulamasına tabidir.

## Dijital delil güvenliği

- SHA-256 sonradan doğrulama; fark çıkarsa açık uyarı.
- Delil işlem günlüğü (ekleme, çözümleme, doğrulama) tarih-saat damgalı.
- Orijinal ses dosyası değiştirilmez.

## Model yöneticisi

- İndirilen modellerin listelenmesi; dosya sayısı ve disk boyutu.
- Yapısal bütünlük kontrolü (config, tokenizer, encoder, decoder mevcut mu).
- Model silme; tüm önbelleği temizleme.
- Donanıma göre model önerisi (WebGPU varsa large-v3-turbo, yoksa küçük model).

## Rapor

- Üç çıktı yolu: HTML önizleme, DOCX, UDF.
- Bakanlığın yayımladığı hukuk örneğine göre yedi bölümlü yapı:
  1. İncelemenin konusu, kapsam ve sınırları
  2. Bilirkişinin cevaplaması gereken sorular
  3. Gözlemlenmesi/incelenmesi istenen maddi unsurlar
  4. İnceleme yöntemi, bilimsel ve teknik dayanaklar
  5. Analiz, tespit ve değerlendirme
  6. Gerekçeli sonuç
  7. Ekler
- Kapak ve içindekiler ilk sayfada; ana rapor sonraki sayfadan başlar.
- **Konuşmacılar tablosu:** her konuşmacı için etiket, rol, cinsiyet, yaş
  aralığı, ölçülen perde ve ilgili kayıt/bölüm bilgisi. Üç çıktıda da yer alır.
- **Gözlem sütunu:** her deşifre bölümü için işaretlenen gözlemler (gürültü,
  üst üste konuşma, anlaşılmaz bölüm, müzik/ses efekti).
- **Kayıt kökeni ve teslim zinciri:** her kayıt için ortam türü (CD/DVD, USB
  flaş, taşınabilir disk, telefon…), ortam etiketi/seri no, teslim eden kişi,
  teslim tarihi ve kayıt cihazı bilgisi. Kaydın nereden geldiğini ve nasıl
  teslim edildiğini belgeler. Uzman beyanına dayanır; uygulama ortamı
  kendiliğinden tespit etmez. Rapora "Kayıt Kökeni ve Teslim Zinciri"
  tablosu olarak yansır.
- **Çözümleme doğruluk ölçümü (WER):** referans metni bulunan kayıtlarda
  otomatik çözümleme çıktısı referansla karşılaştırılır. WER (kelime hata
  oranı) yerine koyma, silme ve ekleme hatalarını referans kelime sayısına
  böler; düşük olan daha iyidir. Türkçe normalizasyon (küçük harf, noktalama
  atma) uygulanır. Yalnızca hem referans hem çözümleme metni olan kayıtlar
  ölçülür; ölçüm yapılamayan kayıt tabloda gösterilmez. Rapora hangi modelin
  kullanıldığı da yazılır.
- **İnceleme özeti (denetim kaydı):** rapor sonunda gerçekten yapılan
  işlemlerin ve kalan eksiklerin sayısal dökümü: incelenen kayıt, çözümlenen
  bölüm, denetlenen/denetim bekleyen bölüm, anlaşılmadı, anlamlı metin yok,
  gözlem işareti, spektrogram incelenen kayıt, kanal ayrımı, etiketlenen ve
  perdesi ölçülen konuşmacı sayıları. Yapılmayan işlem raporda yapılmış gibi
  gösterilmez.
- Rapor öncesi kontrol uyarıları (eksik alan, denetlenmemiş bölüm, dolgu metni).
- DOCX çıktısında üst bilgi, alt bilgi ve sayfa numarası.
- UDF çıktısı `templates/BOS.udf` sayfa ayarları ve stillerini korur.

## Mesleki sınırlar (uygulama bunları yapmaz)

- Hukuki değerlendirme ve bilirkişi kanaati üretmez.
- Konuşmacı kimliği, kayıt orijinalliği veya montaj tespiti yapmaz.
- E-imza üretmez, UYAP'a belge göndermez.
- Kontrol edilmemiş deşifreyi doğrulanmış gibi göstermez.
- Yapılmayan incelemeyi rapora yazmaz.
