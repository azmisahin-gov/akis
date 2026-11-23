# Özellikler (v2.215 — mevcut durum)

Bu belge, AKİS v2.127'de **hâlihazırda çalışan** özellikleri listeler. Yol haritası
ve tamamlanma durumu için [`YOL_HARITASI.md`](YOL_HARITASI.md) dosyasına bakın.

## Arayüz düzeni (v2.27–v2.31)

- **Dar ikon rayı** (68px): Özet · Ses · İnceleme · Rapor. Aktif öğe altın
  çizgiyle işaretlenir; ses kaydı sayısı rozet olarak görünür.
- **Üst bar:** çalışma dosyası seçici, sayfa başlığı, kayıt durumu, içe/dışa
  aktarma düğmeleri her an görünür.
- **Künye düğmesi (v2.167):** dosya seçicinin yanındaki **✎** her görünümden
  dosya bilgilerini tek tıkla açar; kapatınca aynı görünümde kalırsınız.
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

- **Dosyalar arası konuşmacı kaydı (v2.205):** `case.speakers[]` dosya geneli
  kişi kaydı (**K1, K2…**) ve kayıt içi konuşmacıda `personId` bağı. **Analiz →
  Konuşmacılar** panelinde **"Dosyalar arası kişiler"** ve her konuşmacı kartında
  **"Aynı kişi"** seçicisi. Aynı kişiye bağlı konuşmacılar raporda **tek satırda**
  gösterilir; BÖLÜM/NOT hücresinde kayıt + yerel kod + bölüm sayısı ve **uzman
  eşleştirmesi** notu yazılır. Bağsız konuşmacılar ayrı satır kalır. Kişi silme
  yalnız eşleştirmeyi kaldırır; ses ve metin korunur. **Bu bir kimlik tespiti
  değildir**; yerel `S1/S2` kodları ayrı kalır.
- **Sınıflandırma/rol seçenekleri tek kaynaktan (v2.204):** Dosya/kayıt durumu,
  kontrol durumu, konuşmacı rolü/cinsiyeti, ortam türü ve ekip rolü listeleri
  `*_DEFS` tanımlarından türetilir; `*_KEYS`/`*_LABEL`, `REVIEW_SHORT`/
  `REVIEW_HINT`/`REVIEW_TONE`, rozet/filtre etiketleri ve rol yetkileri
  (`SECOND_EYES_ROLES`, `APPROVER_ROLES`) aynı kaynaktan gelir. **Görünür
  davranış değişmedi**; kopya etiket haritaları kaldırıldı.
- **Gözlem işaretleri tek kaynaktan (v2.203):** Bölüm gözlem bayrakları
  `schema.js` → `OBS_DEFS` listesinde tanımlanır; arayüz düğmeleri, rapor
  etiketleri, yardım listesi, `emptySegment`/`normalizeSegment` ve testler
  buradan türetilir. Yeni bayrak eklemek için **tek satır** yeterlidir. Yeni
  işaretler: **telefon görüşmesi** ve **sessizlik (konuşma yok)** (ölçülen
  sessizlik oranından ayrıdır). Dosya birleştirmede gözlemler **OR**'lanır;
  bilinmeyen (ileri sürüm) anahtarlar kayıtta korunur, rapora basılmaz.
- **Raporda okuma metni (v2.202):** Raporun **5.1** bölümünde, ayrıntılı kanıt
  tablosundan **sonra** her kayıt için **"Okuma metni"** alt bölümü gelir. Aynı
  konuşmacının ardışık bölümleri tek paragraf; başında konuşmacı kodu/etiketi,
  zaman aralığı ve bölüm sayısı. Kontrol bekleyen grup **"kontrol bekliyor"** ile
  işaretlenir. **Kanıt tablosu ve cümle zamanları değişmez**; HTML, DOCX ve UDF
  aynı metni üretir.
- **45 sn üstü bölüm uyarısı (v2.200):** Birleştirme sonucu **45 sn**'yi aşarsa
  işlem **engellenmez**. Uyarı kalıcıdır: liste satırında **⏱**, Durum satırında
  **"Uzun bölüm"** çipi, rapor hazırlığında **"45 sn üstü bölüm"** maddesi ve
  raporun **"Rapor öncesi kontrol"** satırında sayı. Standart: **1–3 cümle veya
  15–30 sn**, üst sınır **45 sn**.
- **Dar ekran karar çubuğu (v2.199):** ≤900 px'te bölüm kartının altındaki
  yapışkan çubukta **▶ Dinle · Kontrol · ↑/↓ · ✓ Onayla** vardır. Karar
  (Onaylandı / Anlaşılmadı / Yeniden dinle / Belirsiz) kaydırmadan verilir;
  çubuk sığmazsa **alt satıra sarar**. Karar tek kapıdan (`applyReviewChoice`)
  işlenir: "Bekleyen" filtresindeki satır onaylanınca listeden düşer ve başlık
  anında güncellenir.
- **Birleştirme adayı (v2.198):** Aynı konuşmacı + kısa bölüm (<2 sn veya
  <5 kelime) + cümle sonu noktalaması yok + sonrakiyle boşluk ≤0,5 sn koşullarını
  sağlayan satırlar listede **⇄** rozetiyle işaretlenir; araç çubuğunda
  **Birleştirme adayı** filtresi görünür. Uydurma skor yoktur. **Otomatik
  birleştirme yapılmaz**; rozet yalnız işarettir, birleştirme ⋮ menüsü / **M** /
  sürükleme ile yapılır. Denetlenmiş (onaylı/anlaşılmadı) bölüm aday gösterilmez
  — birleştirme onayı "Kontrol bekliyor"a düşürür. Aday sayısı sıfıra düşünce
  filtre kendiliğinden **Tümü**'ye döner. Klavyeden **5** aday filtresini
  açıp kapatır (karar değildir; veri değiştirmez). 6–9 tanımlı değildir;
  birleştirme kısayolu **M**'dir.
- **Belirsiz okuma rapor hücresi (v2.197):** Hücrede tekrar yok:
  `Belirsiz okuma: "okuma1" / "okuma2" (seçilen: …)`. İki okuma korunur.
- **Hızlı karar (v2.196):** Kontrol seçicisi Dinle'nin yanında; **1** onay,
  **2** anlaşılmadı, **3** yeniden dinle, **4** belirsiz. Önerilen ritim:
  bölüm seç → Y → 1–4 → ↓.
- **Paragraf görünümü salt okunur (v2.195):** ¶ düğmesi bölümleri değiştirmez;
  aynı konuşmacının ardışık bölümlerini okuma paragrafı olarak gösterir. Kanıt
  tablosu ve cümle zamanları korunur; metin panoya kopyalanabilir. Önerilen
  bölüm uzunluğu: 1–3 cümle veya 15–30 sn.
- **Yeniden çözümleme sonrası kaydırma korunur (v2.194):** Bir bölümü
  yeniden çözümledikten sonra liste başa dönmez; konum ve seçili bölüm korunur.
- **Birleştirme sonrası kaydırma korunur (v2.193):** Birleştirme/bölme/paragraf
  sonrası liste konumu korunur, sayfa başa dönmez; birleşen satır görünür kalır.
  Liste satırında **tek satır metin önizlemesi** vardır (tam metin ipucunda ve
  editörde); satır 50 px.
- **Konuşmacı silme ve rapor filtresi (v2.192):** Hiçbir bölüme atanmamış
  konuşmacı raporda görünmez. Konuşmacı panelinde **Sil** ve
  **Kullanılmayanları temizle** vardır; silme ses/metni silmez, atanmış
  bölümler "Konuşmacı seçilmedi" olur.
- **Sağ panel kaymaz (v2.191):** Bölüm paneli kaymaz; dalga bölümü her zaman
  görünür. Metin alanı kalan yüksekliği alır (en az 120 px) ve **kendi içinde
  kayar**; vurgu katmanı kaydırmayla hizalı kalır.
- **Dalga menüleri görünür (v2.190):** Dalga / Spek / İkisi düğmeleri
  sığmayınca **alt satıra iner** (gizli yatay kaydırma yok). Uzun metin dalga
  araçlarının üstüne binmez; metin bittikten sonra dalga bölümü gelir, panel
  kaydırılır. Dalga ipucu kısadır, tam açıklama fare ipucundadır.
- **Zamanlar dalganın üstünde (v2.189):** Başlangıç, Süre ve Bitiş alanları
  ayrı satır yerine dalga/spektrogram kutusunun altında **yarı saydam şeritte**
  (solda Başlangıç, ortada Süre, sağda Bitiş). Şerit tıklamayı geçirir; dalga
  sürükleme ve zoom bozulmaz; ~44 px dikey yer kazanılır.
- **Metin kutusu: tek kutu, dört köşe (v2.188):** okunan kelime metnin
  **içinde** vurgulanır (ayrı vurgu şeridi yok). Gözlem işaretleri (rapora
  aktarılır) kutunun **alt solunda**, "+ Hızlı ekle" menüsü **alt sağında**,
  modelin ham çıktısı **sağ üstünde** açılır kutuda. Profil alanı kaldırıldı;
  "Henüz çözümlenmedi" **Durum** satırında. Metin alanı içeriği kadar büyür;
  uzun metin kırpılmaz, panel kayar.

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
- **Durum renkleri (v2.163):** birincil = accent · seçili = accent-soft ·
  çalıyor = yeşil · uyarı/gözlem = altın; üç temada tutarlı.
- **Tema tam uygulama (v2.162):** yüzey/metin renkleri token; tuval temadan;
  üç temada AA kontrast; koyu/sepya temada açık kalan panel yok.
- **Tasarım sistemi (v2.161):** üç temada AA kontrast; punto ölçeği tek
  kaynak (11/12/14/15/17/20/25/30); deşifre 14 px; kâğıt laciverti kurumsal.
- **Görsel düzen (v2.160):** kartlar içeriğe göre; istatistiklerde ikon + 30 px
  sayı; iş akışı adımları rozetli; hızlı erişim kartları çerçeveli; inceleme
  yazı yüzeyi ölçülü ve ortalı.
- **Dar ekran başlığı (v2.159):** ≤900 px'te yinelenen "SEÇİLİ KAYIT"
  başlığı gizlenir; masaüstünde korunur.
- **Bildirim ve ses yok durumu (v2.158):** toast durum çubuğunun üstünde;
  ses yoksa teknik bölümde kalıcı açıklama.
- **Test verisi koruması (v2.157):** hazır test dosyaları **onayla** yüklenir;
  aynı düğme "Test dosyalarını kaldır (N)" olur ve sesleriyle siler.
- **Hazırlık ↔ kapsama (v2.156):** rapor hazırlığı bölümlenmemiş ses
  aralıklarını da sayar; satıra tıklayınca kapsam paneli açılır.
- **Tek dil (v2.155):** kullanıcı metninde "Yedek" yok; paket diyaloğu
  "Paketi oluştur" der ve bozuk metin onarıldı.
- **Tek panel, iki bölge (v2.154):** sabit başlıkta gezinme · dinle · **Onayla**
  · Teknik; metin alanı kalan yüksekliği alır (446 px). Dalga/zaman/konuşmacı/
  gözlem "Teknik" ile açılır; açıkken de kaydırma yok. Tercih hatırlanır.
- **Detay paneli sıkıştırma (v2.153):** etiketler satır içinde, konuşmacı ·
  kontrol · profil tek satırda, ikincil araçlar "Diğer işlemler" altında.
  Panel içeriği 795 → 680 px; metin alanı ve analiz kutusu korunur.
- **Listede bitiş zamanı (v2.152):** zaman hücresi iki satır — başlangıç ve
  **→ bitiş**; ms biçimi korunur, hiçbir saat kesilmez.
- **Onaydan sonra sonraki bekleyene geç (v2.151):** Ayarlar → Onay davranışı.
  İsteğe bağlı, **varsayılan kapalı**. Açıkken onay sonrası sıradaki kontrol
  edilmemiş bölüme geçilir; bekleyen yoksa yerinde kalınır.
- **Rapor hazırlığı (v2.150):** rapor görünümünde eksikleri **sayıyla** listeleyen
  kart: kontrol edilmemiş bölüm, seçilmemiş belirsiz okuma, konuşmacı atanmamış,
  zaman sorunu, SHA-256 yok, teslim/köken yok, boş künye, soru yok. Satır
  tıklanınca ilgili yere gider. Uydurma yüzde yoktur.
- **Kapsama denetimi (v2.149):** araç çubuğunda "Kapsam %98 · 2 boşluk" düğmesi;
  sesin bölümlenmemiş aralıklarını zaman aralığıyla listeler, "Git" oynatıcıyı o
  ana getirir. Çakışma iki kez sayılmaz. Boşluk "konuşma yok" demek değildir.
- **Oynatma sayfayı zıplatmez (v2.148):** takip şeridi canlı vurgu açıkken
  yer tutucu olarak önceden kurulur; başlık her zaman "Bölüm X / N".
- **Takip şeridi eski bölüme dönmez (v2.147):** otomatik geçişte şerit her
  zaman aktif bölümü gösterir; eski indeks kullanılmaz.
- **Zaman sorunu anında görünür (v2.146):** çakışma yaratan düzenleme biter
  bitmez iki satırda ⚠ ve filtre görünür; sorun bitince filtre kalkar.
- **Takip çakışmada atlamaz (v2.145):** oynatma konumu aktif bölümün
  aralığındaysa vurgu o bölümde kalır; komşu bölüme geri atlamaz.
- **Zaman sorunları görünür (v2.144):** çakışan/yinelenen/sıfır süreli bölümler
  ⚠ rozetiyle işaretlenir; "Zaman sorunları" filtresi yalnız onları listeler.
  Uygulama zamanı kendiliğinden düzeltmez.
- **Hazırlık zaman sayacı kayıt başına (v2.201):** çok kayıtlı dosyada "Zaman
  sorunu" sayısı, kayıtların zaman çizgilerini **ayrı** sayar; ses görünümündeki
  `Zaman sorunları` filtresiyle **aynı** sayıyı gösterir. Aynı kayıt içindeki
  gerçek çakışma iki tarafıyla kalır.
- **Detay paneli kırpmaz (v2.143):** bölüm detayında tüm alanlar panelde
  kaydırılarak erişilir; alt içerik kesilmez.
- **Kayıt listesi dikey, çalışma modu yok (v2.142):** dosyalar solda alt alta;
  kaydırma kayıt sütununda (100 kayıtta tek çubuk). "Kayıt listesine dön" ve
  "Çalışma modu" kaldırıldı; başlık ve "N kayıt" görünür.
- **Masaüstünde çalışma modu yok (v2.141):** kayıtlar sürekli solda;
  "Kayıt listesine dön" ve çalışma modu düğmesi ≥901 px'te gizli.
- **Masaüstü kabuğu (v2.140):** ≥901 px'te üst bar ve durum çubuğu sabit;
  kayıtlar solda, bölüm listesi ve düzenleme paneli kendi içinde kayar.
  Sayfa uzamaz. ≤900 px'te eski düzen (dar ekran yedeği).
- **Uzun listede detay yapışkan (v2.139):** bölüm listesi uzunken düzenleme
  paneli sağda hep görünür; panel ekrandan uzunsa kendi içinde kayar.
- **CSS borcu nöbetçisi (v2.138):** stil borcu ölçülür; borcu artıran
  değişiklik testi kırar. Görünür davranış değişmez.
- **Rapor dar ekranda kırpılmaz (v2.137):** ≤900 px'te kâğıt iç boşluğu azalır,
  tablo hücreleri sarar; sağ kenar görünür. Çıktı (UDF/DOCX) değişmez.
- **Sekme simgesi (v2.136):** SVG + ICO; konsolda favicon 404 yok.
- **Kritik uyarılar duyurulur (v2.135):** kayıt/depolama hataları ekran
  okuyucuya kesintili (`role=alert`), normal bilgiler bekleyen işi bölmeden
  (`role=status`) okunur.
- **Boş çalışma alanı kayda yazılmaz (v2.134):** yeni tarayıcıda hayalet
  dosya görünmez; tüm veri silinirse eski kayıt diskte bırakılmaz.
- **Durum çubuğu kesmez (v2.133):** dar ekranda dosya/mahkeme, eksik özeti ve
  model bilgisi "…" ile kısaltılmaz; çubuk sarar ve içerikle büyür.
- **Kurtarma kopyası dürüsttür (v2.132):** depo boşken kurtarma kopyasından
  geri yüklemede okunamayan dosya sessizce atlanmaz; kaç dosyanın atlandığı
  bildirilir, ham kayıt kurtarma alanında tutulur, kopya silinmez.
- **Tek kaydırma, büyüyen görünüm kutusu (v2.131):** ses görünümü içeriği
  kadar uzar; kaydırma yalnız ana alanda. Çalışma modunda üst bar
  (önceki/sonraki kayıt) liste boyunca yapışkan kalır; durum çubuğu listenin
  altındadır, satırların üstüne binmez.
- **Kontrol durumu listede her zaman görünür (v2.130):** durum rozeti
  (Bekliyor / Onaylandı / Çözümlendi / Anlaşılmadı / Yeniden / Belirsiz)
  rozet alanının ilk sırasındadır. Rozetler sığmazsa **sarar**, kesilmez;
  1200 px altında rozetler metnin altına iner.
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
- **Dar ekran işlem çubuğu (v2.165):** ≤900 px'te kartın altında yapışkan
  çubuk (↑ ↓ · ▶ Dinle · ✓ Onayla · konum) durur; onay ve dinleme için
  kaydırma gerekmez. Masaüstünde görünmez.
- **Dar ekranda metne gidiş (v2.168):** ≤900 px'te bölüme dokununca veya
  ↑ ↓ / ✓ kullanınca düzenleme alanı görünür alana gelir (100 bölümde metin
  7.349 px uzaktaydı). Masaüstünde kaydırma yapılmaz.

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
- **Ses kaydını kaldırma onay ister (v2.166):** ses IndexedDB'den **kalıcı**
  silinir; geri alma yalnız kaydı/metni getirir. Bu yüzden onay diyaloğu
  kaydın adını, bölüm sayısını ve "ses dosyası geri gelmez" uyarısını gösterir.

## Model yöneticisi

- İndirilen modellerin listelenmesi; dosya sayısı ve disk boyutu.
- Yapısal bütünlük kontrolü (config, tokenizer, encoder, decoder mevcut mu).
- Model silme; tüm önbelleği temizleme.
- Donanıma göre model önerisi (WebGPU varsa large-v3-turbo, yoksa küçük model).

## Rapor

- Üç çıktı yolu: HTML önizleme, DOCX, UDF.
- **Liste sağa yaslı (v2.187):** rozetler sağda, durum rozeti en sağda; satır
  34 px. Detaydaki "Onayla" düğmesi kaldırıldı: eylem satır menüsünde ve
  Enter'da; durum Kontrol seçicisinde.
- **Liste tek satır (v2.186):** satır 34 px, her genişlikte aynı; başlangıç–bitiş
  yan yana (kısa saat; ms detayda). Öncelik rozeti detayın durum satırında.
  Teknik düğmesi yok: analiz her zaman görünür, metnin altında.
- **Bölüm listesi dizin (v2.185):** satırda metin yok; numara · zaman ·
  rozetler. Metin tek kaynak: editör (ve satır ipucu). Satır 74 → 50 px.
- **Tek durum satırı (v2.184):** başlığın altında her bölümde görünen "Durum"
  satırı: Ses: hazır/yok · Anlamlı metin yok · Model tekrarı · Sessizlik ·
  Model çıktısı farklı. Yükseklik sabit; gizli öğe yok. Etiketler ekranda.
- **Birleşik işlem satırı (v2.183):** konuşmacı ve kontrol seçicileri başlıkta;
  onay ikon (✓, Enter), "Yeniden dinle"/"Anlaşılmadı" düğmeleri Kontrol
  seçicisine taşındı; profil Teknik'te. Üst bölge 76 → 42 px.
- **Dikey yer kazanımı (v2.182):** konuşmacı/kontrol tek satırda (etiketler
  `aria-label`/`title`); "ses yok" satırı tek satır; metin alanı 160 px korunur.
- **ASR kökeni Teknik'te (v2.181):** metin üstünde yalnız tek satır ipucu
  ("Model çıktısı farklı — karşılaştır"); model adı, tarih ve ham çıktı Teknik
  panelinde. Notlardaki "öncelik" satırı kaldırıldı; liste rozeti korunur.
- **Düzenleme bilgisi her zaman görünür (v2.180):** konuşmacı ve kontrol
  seçimleri başlığın altında; gözlem düğmeleri metnin altında. Teknik paneli
  yalnız analiz taşır (dalga/spektrogram, zamanlar, ölçümler).
- **Detay paneli ezilmez (v2.179):** canlı vurgu şeridi her zaman 48 px,
  metin alanı en az 160 px; içerik sığmazsa **panel kaydırır** (Teknik açıkken
  de). Not/uyarı/öneri satırı çıkınca düzen zıplamaz.
- **Sürükleyerek birleştirme (v2.178):** satırdaki **⋮⋮** tutamağını **komşu**
  satıra bırakınca iki bölüm birleşir. Yalnız komşu; filtre "Tümü" değilse
  kapalı; M tuşu ve satır menüsü korunur; Ctrl+Z ile geri alınır.
- **Satır menüsü (v2.177):** her bölüm satırında **⋮** (sağ tık da olur):
  birleştir · oynatıcı konumundan böl · aralığı çözümle · metin geçmişi ·
  sessizlik ölç · sil. Detaydaki "Diğer işlemler" katlaması kaldırıldı.
- **Birleştirme güvenliği (v2.176):** birleşen bölümün ham model çıktısı
  (`mergedFrom`), kelime zamanları ve gözlemleri korunur; farklı konuşmacı ve
  ikinci göz reddedilir; birleştirme/bölme delil günlüğüne yazılır.
- **"Ses yok" uyarısı (v2.174):** sesi bulunmayan kayıtta uyarı, Teknik paneli
  kapalıyken de görünür; bölüm değişiminde tazelenir.
- **Paket adında saniye (v2.173):** `AKIS_Paket_<dosya no>_<tarih>_<saat>-<saniye>.akis`.
  Aynı dakikada üretilen iki paket (sahip + yardımcı) karışmaz.
- **Önizleme tek kaydırma (v2.172):** rapor kâğıdı kendi yüksekliğinde akar;
  araç çubuğu yapışkandır. 100 bölümde kâğıt 196 px'lik kutudan **6.438 px**'e
  çıktı.
- **Kâğıt belge fontu ve punto tabanı (v2.169):** önizleme **Arial** ile çizilir;
  SHA-256 özeti **11 px**, tek aralıklı ve satır kırar. Rapor kâğıdında 11 px
  altı metin yoktur.
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

## Delil paketi (v2.208; teslim zinciri v2.212; tablolar v2.213; araç 1.2)

Ayrı edinme aracı + tarayıcıda doğrulama. Tarayıcı USB'yi **görmez**; edinme
`tools/edinme/edinme.ps1` ile yapılır, AKİS yalnız **doğrular ve belgeler**.
Araç **Ses → Edinme aracını indir** ile tek zip olarak iner
(`edinme.ps1`, `BASLAT.bat`, `OKUBENI.md`).

- **Paket:** ZIP içinde `delil.json` + `ses/` dosyaları.
- **Yükleme:** Ses görünümü → **Delil paketi yükle**.
- **Doğrulama:** her dosyanın SHA-256 özeti yeniden hesaplanır; üç durum:
  **Doğrulandı** / **Uyuşmuyor** / **Doğrulanamadı**. Hash yoksa
  "Doğrulandı" denmez.
- **Cihaz bilgisi:** model, seri no, birim etiketi (varsa), kapasite, yöntem,
  araç, operatör (ad + sicil), alınma zamanı. Bu bilgiler **edinme
  tutanağının beyanıdır**; cihaz bu ortamda okunmaz.
- **Teslim zinciri (v2.212):** **Teslim eden** (flash'ı veren kişi/kurum, ad +
  isteğe bağlı sicil/kayıt no) ile **operatör** (edinmeyi yapan) **ayrı**
  kaydedilir; teslim tarihi ve teslim yeri isteğe bağlıdır. Boş alan
  **uydurulmaz**. **TCKN istenmez.** Bilgiler paketten gelir veya elle girilir
  (Ses → kayıt → **Kayıt kökeni ve teslim zinciri**).
- **Sürücü harfi raporda yok (v2.212):** `E:`/`D:` kanıt kimliği değildir ve
  platform değişince değişir; yalnız `delil.json` teknik izinde kalır.
- **Alet adı:** raporun ARAÇ sütunu ürün adını değil aleti yazar
  (`Edinim v1.1`). Ürün adı rapora girmez.
- **Envanter tablosu 7 ayrı sütun (v2.213):** DOSYA ADI · DOSYA BİÇİMİ ·
  DOSYA BOYUTU · SÜRE · SES KANALI · ÖRNEKLEME HIZI · SHA-256. Biçim uzantıdan
  (MP3/WAV/M4A…), kanal ve örnekleme hızı dosya çözülerek **ölçülür**; ölçülemezse
  “Bilinmiyor” yazar. Tek kaynak: `inventoryRows` (HTML/DOCX/UDF aynı).
- **Köken tablosu 8 sütun (v2.213):** KAYIT CİHAZI ve KAYIT TARİHİ **ayrı**;
  bilinmiyorsa “bilinmiyor”. Edinme yöntemi/aracı bu alanlara **yazılmaz**.
- **Edinme tablosu 9 sütun (v2.213):** CİHAZ ve ETİKET **ayrı**; OPERATÖR
  `Ad · Sicil`.
- **Edinim aracı 1.2 (v2.213/v2.214):** soru-cevap sihirbazı (kaynak, hedef, operatör,
  teslim zinciri, özet + onay), ilerleme çubuğu, `E`/`E:`/`E:\` kabul,
  UTF-8 BOM ile düzgün Türkçe, `İŞLEM DURDURULDU` özeti.
- **Paket v2 — disk yapısı (v2.215):** dosyalar `icerik/<cihaz-kökü>/<kaynak yolu>`
  altında, cihazdaki dizin yapısı **birebir** korunur; yapay `ses/` klasörü yok.
  Kök = seri no (yoksa etiket/model); klasör kaynağında klasör adı. `relPath`
  kaynak yolu, `packagePath` paket içi yoldur. Varsayılan **tüm dosyalar**;
  `-AudioOnly` yalnız ses. v1 paketler açılmaya devam eder.
- **`disk.json` (v2.215):** disk/bölüm/birim metadata'sı (offset, boyut, tür,
  dosya sistemi, etiket, birim seri no) + dizin listesi. **Raw sektör/boş alan
  yok**; imaj değildir. AKİS `case.disks[]` alanında saklar; materyal
  `origin.acquisition.diskId` ile bağlanır. Birleştirmede disk kimliğiyle
  eşleşir; farklı içerik çakışma bildirir.
- **Zip BOM korunur (v2.214):** indirilen zip'te `edinme.ps1` **UTF-8 BOM** ile
  yazılır. `fetch().text()` BOM'u sildiği için zip'te kayboluyordu; Windows
  PowerShell 5.1 dosyayı ANSI okuyup sözdizimi hatası veriyordu. Ayrıca betikte
  tipografik tire/akıllı tırnak kullanılmaz (BOM yine kaybolsa da çalışır).
- **Yeniden yükleme:** aynı SHA-256 varsa yeni kayıt açılmaz; mevcut kayıt ve
  düzenlemeler korunur, **yalnız boş alanlar** doldurulur ve günlüğe yazılır.
- **Uyuşmazlık:** sessizce geçmez; onay istenir, kabul edilirse raporda
  "Uyuşmuyor" yazar.
- **Delil günlüğü:** "Delil paketinden alındı" + "SHA-256 doğrulandı /
  UYUŞMUYOR / doğrulanamadı" girdileri zincirle yazılır.
- **Rapor:** **DELİL EDİNME VE DOĞRULAMA** bölümü; HTML/DOCX/UDF aynı metni
  üretir. Paket yoksa bölüm çizilmez.
- **Tier 1 sınırı:** silinmiş dosya/boş alan gelmez; "adli imaj" değil,
  "belgelenmiş dosya kopyası"dır. Yazılımsal salt-okunur, donanım
  write-blocker değildir; yöntem raporda yazılır.

## Mesleki sınırlar (uygulama bunları yapmaz)

- Hukuki değerlendirme ve bilirkişi kanaati üretmez.
- Konuşmacı kimliği, kayıt orijinalliği veya montaj tespiti yapmaz.
- E-imza üretmez, UYAP'a belge göndermez.
- **USB/cihaz edinmez.** Cihaz bilgisi edinme tutanağının beyanıdır; cihaz bu
  ortamda okunmaz. Tier 1 çıktısı "adli imaj" değil, "belgelenmiş kopya"dır.
- Kontrol edilmemiş deşifreyi doğrulanmış gibi göstermez.
- Yapılmayan incelemeyi rapora yazmaz.
