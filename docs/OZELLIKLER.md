# Özellikler (v2.383 — mevcut durum)

Bu belge, AKİS'in **güncel sürümünde çalışan** özellikleri listeler. Yol haritası
ve tamamlanma durumu için [`YOL_HARITASI.md`](YOL_HARITASI.md) dosyasına bakın.


## Rapor okuma metni, konuşmacı tablosu ve sayfa düzeni (v2.383)

- **Okuma metninde kontrol durumu görünür.** Her paragrafın başlığında `Onaylandı · Anlaşılmadı · Belirsiz okuma (seçilen: …) · Yeniden dinlenecek · Kontrol bekliyor` yazar (`readingStatusLabel`). Gruplama konuşmacı **ve** kontrol durumuna göre yapılır; onaylı ve onaysız metin aynı paragrafta birleşmez. Metin **silinmez**; yalnız durum görünür olur.
- **Konuşmacı tablosunda kısa kayıt adı.** KAYIT ve BÖLÜM/NOT sütunları `Kayıt 1`, `Kayıt 2` yazar (`speakerReportRows`, `speakerDurationReportRows`); tam dosya adları tablonun altındaki **KAYIT NUMARALARI** satırındadır (`speakerRecordLegend`). Rol (Davacı/Davalı) ve başlık sözcükleri ortadan bölünmez.
- **Word/PDF sayfa düzeni.** İÇİNDEKİLER kendi sayfasından başlar; bölüm başlığı + giriş cümlesi + tablo aynı sayfada kalır (DOCX `w:keepNext`; HTML yazdırmada `break-after: avoid`).
- **Teslim kontrolünde tarih tutarlılığı.** “Kalan gün” **rapor tarihine** göre hesaplanır; “13 gün / 14 gün” çelişkisi olmaz.

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

### Depolama yazma/silme hatası görünür (v2.332)

- **Ses yazılamazsa "eklendi" denmez.** `storeBlob` true/false döner; ekleme,
  delil paketi, tekil/arşiv paket, test paketi ve fizikî belge yolları sonucu
  kontrol eder. Yazılamayan ses/belge **role=alert** ile bildirilir ve günlüğe
  yazılır.
- **Kalıcı uyarı:** kayıt detayında `audioPersistWarningHtml` — "oturumda
  çalınır ama yazılamadı" veya "ses bu tarayıcıda yok". Bölümü olmayan kayıtta
  da görünür; önceki sürümde uyarı yalnız bölüm detayının içindeydi.
- **Fizikî belge** yazılamazsa kayıt açılmaz (dosyasız üst veri bırakılmaz).
- **Ses silinemezse "kaldırıldı" denmez (v2.333).** `deleteBlob` true/false
  döner; `discardMaterialMedia` sonucu iletir; `purgeCaseMedia` silinemeyenlerin
  adlarını listeler. Kayıt kaldır · kalıcı sil · test dosyalarını kaldır · fizikî
  belge kaldır yolları sonucu **role=alert** ile bildirir; başarı mesajı yalnız
  silme doğrulandıysa yazılır.
- **Bozuk paket dosyası sessizce atlanmaz (v2.334).** `importArchive` bozuk
  dosyaları `failed[]`'e alır; `akis.rescue.failedImport`'a ham kayıt yazılır ve
  **kalıcı şerit** (`#importFailureBanner`, role=alert) + kırmızı toast ile kaç
  dosyanın geri yüklenemediği söylenir. Sağlam dosyalar alınmaya devam eder.
- **Toplu işlem ve aktarma bildirimleri (v2.335).** `runQueue` başarısız
  kayıtları sayar; sonuç `queueResultText` tek kaynağından yazılır ("N tamamlandı,
  M BAŞARISIZ"), hata varsa **role=alert**. Paketten yükleme hatası da
  **role=alert** ile duyurulur.
- **Rapor künyesi tek bölüm (v2.336).** Ayrıntılı künye bölümü kaldırıldı;
  `coverFields` = “RAPOR KÜNYESİ”. Alanlar `case.report.fields` ile tek tek
  açılıp kapatılır (iskelette “Alanlar · N/M”); kapatılan alan üç çıktıda da
  çizilmez. “Keşif / inceleme tarihi” → **İnceleme tarihi**; uzmanlık alanı
  `DEFAULT_EXPERT_FIELD` tam metniyle gelir; inceleme konusu boşsa **engelleyen**
  hazırlık maddesi; “Raporun ekleri” EKLER’den otomatik; tarafsızlık beyanı
  künyede kapatılabilir; kısa özet süreleri birimli.

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
- **Kayıt adı kırpılmaz (v2.277):** listede dosya adı üç noktayla kısaltılmaz;
  uzun ad **sarar** (satır, adın uzunluğu kadar uzar). Ad rengi temaya bağlıdır;
  koyu temada da okunur (kontrast 12.7:1). Numara rozeti çok satırlı adda üstte hizalanır.
- Sürükle-bırak veya dosya seçme; WAV, MP3, M4A, OGG, FLAC, AAC.
- Toplu dosya ekleme.
- Kayıt başına teknik envanter: dosya adı, biçim, boyut, süre, codec, kanal
  sayısı, örnekleme frekansı, bit derinliği, SHA-256 özeti.
- WAV başlığı chunk yürüyerek okunur (sabit offset varsayımı kullanılmaz).
- Canvas tabanlı dalga formu: tıklayarak konuma gitme, bölüm aralıklarının
  görsel işaretlenmesi, oynatma imleci.
- Kayıt kaldırma.
- **Video dosyalarından ses (v2.248):** "Ses dosyası ekle" MP4 · MOV · M4V · WEBM ·
  OGV kabul eder. 56.12 kapsamında video konteynerindeki **yalnızca ses** metne
  dönüştürülür; **görüntü incelenmez.** Kartta ve delil günlüğünde bu yazar;
  envanter biçimi "MP4 (video)" gibi görünür. Tarayıcının çözebildiği ses kodekleri
  (AAC/Opus/MP3) desteklenir; çözemezse açık hata verir. (Fizibilite gerçek
  Chromium'da ölçüldü; `birim [100]`.)
  **v2.250:** Bölüm başlığı **"Ses ve video kayıtları"**; video içeren dosyalarda
  raporun envanter notuna *"video dosyalarından yalnızca ses kanalı çözümlenmiştir;
  görüntü incelenmemiştir"* eklenir (üç çıktı aynı metin; video yoksa girmez).

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

- **Analiz / Kayıt bilgileri sekmeleri kendi içinde kayar (v2.249):** bu sekmelerin
  altındaki içerik (ör. "Konuşmacılar ve ses özellikleri") daha önce kartın
  `overflow:hidden`'ı ile kırpılıyordu; artık kaydırılarak erişilir. **Deşifre
  sekmesi değişmez.** (Ölçüm: içerik 810 / görünür 673 → kaydırınca son bölüm görünür.)

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
  işlenir: "Kontrol bekleyen" filtresindeki satır onaylanınca listeden düşer ve
  başlık anında güncellenir.
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
- **Bölüm iş durumu filtreleri (v2.240):** "Kontrol bekleyen" çipi onaylanmamış
  TÜM bölümleri toplar; ipucu, makine **"Çözümlendi"** ve **"Belirsiz"** bölümlerin
  de onay beklediği için burada olduğunu söyler. Çalışırken "bu bölüm ne istiyor?"
  sorusu filtreden yanıtlanır: **Çözümlendi (makine)** onayla, **Belirsiz okuma**
  okuma seç, **Yeniden dinlenecek** dinle, **Birleştirme adayı** birleştir,
  **Uzun · bölünmeli** (45 sn üstü) böl, **Üst üste (gözlem)** / **Anlaşılmayan
  (gözlem)** gözlem işaretlerini bul. Bu çiplerin hepsi yalnız sayı > 0 iken
  görünür ve **sayaç = filtre** tek kaynaktan gelir (`birim [95]`).
- **Bölüm iş durumu satırı (v2.241):** seçili bölümün detayında teknik "Durum"
  satırının üstünde **"İş"** satırı: durum → **tek önerilen eylem** ("Dinleyip
  onayla (makine çözümledi)", "İki okumadan birini seç", "Yeniden dinle",
  "Tamam — onaylandı") + birleştirilebilir / zaman sorunu / üst üste / anlaşılmayan
  gözlem / okuma seçilmedi işaretleri. `segmentWorkSummary` saf fonksiyon; durum
  değişince satır **yerinde** tazelenir (`birim [96]`).
- **Karar rehberi (v2.242):** Yardım (?) ekranında "üst üste · belirsiz · tek
  kelime" rehberi. Kontrol durumu (karar) ile gözlem işaretini ayırır; "Onaylandı"
  = dinleyip doğrulama (çakışmayı gizlemez); belirsiz ayrı bir durumdur (okuma seç);
  anlaşılmaz bölümdeki tek kelimede Onaylandı/Anlaşılmadı/Belirsiz seçimi açıklanır.
  Belgede: [`STANDARTLAR.md` §12](../docs/STANDARTLAR.md).
- **İş yükü özeti (v2.243):** Özet (dashboard) sayfasında **ölçülen** göstergeler:
  toplam ses süresi (**sa/dk/sn**; saniye tutulur), kayıt/bölüm sayısı, **kontrol
  bekleyen toplam**, konuşmacı etiketi, yanıtlanan/toplam soru; **kontrol dağılımı**
  (karşılıklı-dışlayan: onaylandı/anlaşılmadı/yeniden/belirsiz/makine/hiç
  dokunulmadı); **emek** (onay oranı, elle düzeltilen bölüm sayısı/%) ve **zorluk
  işaretleri** (üst üste, anlaşılmayan, sessizlik, telefon, müzik, gürültü, zaman,
  uzun bölüm, birleştirme adayı, kapsam boşluğu). **Süre/ücret tahmini üretilmez**;
  yalnız gerçek sayımlar gösterilir (`birim [97]`).
  **v2.244:** panelin başında **tek satır özet** (ses · kayıt · bölüm · kontrol % ·
  kalan iş); **Ortalama bölüm** ve **Kapsam %** KPI'ları; "kapsam boşluğu" artık
  "zorluk" değil ayrı **Kapsam** bölümünde (bölümlenmemiş aralık = çoğu zaman
  sessizlik; "konuşma yok" demek değildir). Panel **göstergedir**, harcanan
  takvim/zamanı göstermez.
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
- **Rapor ekranı sürekli okuma (v2.246):** varsayılan **Sürekli** (normal belge
  gibi kayar, kâğıt 900 px). **Tek-sayfa A4 + ‹ ›** isteğe bağlı: "Sürekli"
  anahtarını kapatınca açılır. "Sayfaya sığdırma" yalnız A4 modunda görünür ve
  **gerçekten aç/kapa çalışır** (v2.247; aç→sayfa ekrana sığar, kapat→doğal
  genişlik). (Ölçüm 1440×900: eski varsayılan kâğıdı **320 px**'e sıkıştırıyordu.)
- **Rapor biçimi (v2.238):** Kontrol → Rapor biçimi panelinden yazı tipi, gövde
  puntosu (11–14), kenar boşluğu (10–50 mm) ve yön (dikey/yatay) seçilir. Seçim
  ekran önizlemesine, yazdırma/PDF'e (A4 + ölçülü marj, `@page`) ve Word
  (DOCX) çıktısına uygulanır. **Yazı tipi ÜÇ çıktıya da uygulanır** (v2.254);
  varsayılan **Times New Roman** (resmî) → UDF/DOCX/PDF aynı tipografi. Yön
  (dikey/yatay), punto ve kenar boşluğu da UDF'e uygulanır (v2.245:
  `paperOrientation` dikey=1, yatay=0). **Kenar boşluğu varsayılan 15 mm (1,5 cm)**;
  UDF bunu **punto** olarak saklar (15 mm = 42,52 pt ≈ boş dokümanın 42,525'i) — v2.257.
  0,5 adım, 10–50 mm. Tek kaynak: `case.report.format`. Motorlar farklı olduğundan
  pixel-pixel aynılık beklenmez.
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
- **Gözlem işaretleri (v2.317):** 12 bayrak — arka plan gürültüsü, üst üste konuşma,
  anlaşılmaz bölüm, **duyulmuyor (ses yok/kısık)**, müzik/ses efekti, telefon,
  sessizlik, kesinti, yankı, **uzaktan/zayıf**, **bozuk ses**, **dil değişimi**.
  **Tümü “Gözlem işaretle” panelindedir**; yan yana 8 düğme kaldırıldı. **Etkin**
  işaretler alt şeritte **çip** olarak görünür; çipe tıklayınca kaldırılır.
  İşaretler rapora **“GÖZLEM”** sütunu ve **EK-5** olarak yansır.
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
- **Hızlı etiketler (v2.320):** soldaki **“Etiket ekle · 30”** menüsü **gruplu ve aranabilir** — Anlaşılırlık · Ortam/teknik · Konuşma biçimi · İçerik notu. **30 metin etiketi:**
  `[duyulmuyor]`, `[anlaşılmaz]`, `[şüpheli]`, `[tahmin]`, `[kesik]`, `[bozuk ses]`,
  `[gürültü]`, `[üst üste]`, `[yankı]`, `[kesinti]`, `[sessizlik]`, `[müzik/ses]`,
  `[telefon]`, `[uzaktan konuşma]`, `[fısıltı]`, `[bağırma]`, `[gülüşme]`,
  `[öksürük]`, `[ağlama]`, `[alkış]`, `[karşı taraf]`, `[dil değişimi]`,
  `[mikrofon teması]`, `[rüzgar]`, `[trafik/araç]`, `[isim belirsiz]`,
  `[yer belirsiz]`, `[rakam belirsiz]`, `[tarih belirsiz]`, `[küfür]` + **“Etiketleri temizle”**.
  **12 gözlem kavramı hem bu menüde (metne) hem “Gözlem işaretle” panelinde (rapora) bulunur.** `[belirsiz]` etiketi **yoktur** (Belirsiz okuma bir kontrol durumudur). Etiket görünen adı ile metne giren değer **aynı**; “son kullanılan 5” hatırlanır (kayda yazılmaz). Etiket **imlecin olduğu yere** eklenir (v2.239). **Menü segment listesine doğru (sola) açılır** ve deşifre metni alanını örtmez; **seçim yapılmasa da** üst ×, alt “Kapat”, **Esc** ve dış tıklama kapatır (v2.322). **“Etiketleri temizle”** yalnız `[etiket]` işaretlerini kaldırır; **metnin kendisi korunur**, bilinmeyen köşeli parantezler (`[bkz. 3]`, `[...]`) dokunulmaz; onay ister ve Ctrl+Z ile geri alınır (v2.322).
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
- **Kod salt-okunur (v2.262):** kod **kimliktir**; panelde düzenlenemez
  (önceden bir giriş alanıydı ve iki kişiye aynı kod yazılabiliyordu — rapor iki
  kez "S1" yazıyordu). Görünen ad "Konuşmacı etiketi" alanından değiştirilir.
- **Hızlı atama ve dinleme (v2.263):** dinlerken **Alt+1…9** aktif bölüme o
  sıradaki konuşmacıyı atar (ad + kimlik birlikte yazılır). Kartta
  **▶ Örnek dinle** (ilk bölümden ≤3 sn) ve **▶ Tüm bölümlerini dinle** (bölümleri
  sırayla; elle çalma/⏹ iptal eder) vardır; kartta bölüm sayısı, toplam süre ve
  ilk–son duyulma görünür.
- **Konuşmacı kimliği tutarlılığı (v2.274):** bir bölüm **tek** konuşmacıya aittir.
  "＋ Yeni konuşmacı" adı ve **kimliği** (`speakerId`) birlikte yazar; "＋ Bölüm" mevcut
  konuşmacıyı kullanır (gereksiz "Konuşmacı 2" uydurmaz). Eski sürümlerde bozulmuş kayıtlar
  açılışta onarılır (`reconcileSpeakerRefs`); paketten yükleme arşivle aynı normalize kuralını
  kullanır. Raporda aynı bölüm iki satırda görünmez.
- **Başlık düzenleme + numara biçimi (v2.285):** rapor iskeletindeki her bölümün
  yanındaki **kalem (✎)** ile başlık yazılır (Enter uygular, Esc vazgeçer); başlık
  `case.report.titles`ta saklanır ve **HTML/DOCX/UDF** çıktılarında aynı yazılır.
  **Numaralar** üç biçimlidir: **1, 2, 3…** · **A, B, C…** · **Numarasız**;
  İÇİNDEKİLER ve alt başlıklar aynı biçimi izler. **Düzeltme:** numarasız kipte
  alt başlıklar da numarasız (eskiden "5.1" kalıyordu); bölüm kapalıysa numara
  uydurulmaz.
- **Kullanıcı rapor profilleri (v2.288):** iskelette **Profiller** satırı; seç ·
  **Uygula** · **Sil** · **＋ Bu düzeni kaydet**. Profil yalnız düzeni taşır
  (bölüm görünürlüğü, sıra, başlıklar, numara biçimi, tablo alanları); **kanıt ve
  serbest blok metni girmez**. En çok 20 profil; aynı ad günceller. Uygulama onay
  ister, **Ctrl+Z** ile geri alınır; yerleşik/otomatik profil yoktur.
- **Serbest rapor bölümü (v2.287):** iskeletin gövdesinde **“＋ Bölüm ekle”** ile
  başlık + metin yazılır. Blok açılır/kapanır, **↑↓** ile sıralanır, İÇİNDEKİLER’de
  **“– Başlık”** olarak görünür ve **HTML/DOCX/UDF** çıktısına girer. Başlık veya metin
  boşsa rapora **girmez**; “—” uydurulmaz. Silme onay ister, **Ctrl+Z** ile geri alınır;
  ses/deşifre kanıtı etkilenmez. Revizyon ve paket birleştirme blokları taşır.
- **Numaralandırma seçenekli (v2.284):** aynı anahtarın ilk sürümü; kapatınca
  tüm başlıklar ve İÇİNDEKİLER numarasız yazılıyordu. Açıkken ana bölümler 1…N,
  alt bloklar TOC'ta "–".
- **"Git" düğmeleri (v2.284):** perde/gömme işaretli bölüme giderken **Deşifre**
  sekmesine geçer, bölümü açar ve satıra odaklanır.
- **Rapor sütunları: konuşmacı KODU ve ETİKETİ ayrı (v2.281):** kanıt tablosunda
  `ZAMAN ARALIĞI · KONUŞMACI KODU · KONUŞMACI ETİKETİ · ÇÖZÜMLENEN KONUŞMA ·
  KONTROL DURUMU · GÖZLEM`; konuşmacı tablolarında `KOD · ETİKET …`. "Rapor alanları"
  panelinde **9 grup** (konuşmacı tablosu · konuşmacı süreleri · kayıt konuşmacı
  tablosu dâhil); her sütun tek tek açılıp kapanır, üç çıktıda da geçerlidir.
- **Ses gömme (embedding) benzerliği (v2.279):** konuşmacı doğrulama modeli
  (**WavLM-SV**, q8, ~97 MB; isteğe bağlı, bir kez indirilir) her bölümün atandığı
  konuşmacıya benzerliğini ölçer. Eşikler **ölçüldü**: ≥ 0,88 aynı · < 0,72 farklı;
  arası belirsiz sayılır ve işaretlenmez. Belirgin çelişki **⚠ gömme** rozetiyle
  görünür; atanmamış bölüm için "hangi konuşmacıya benziyor" önerisi yazılır.
  **Kimlik tespiti değildir**, hiçbir atama otomatik değişmez; ölçüm yalnız
  kullanıcı tetiklediğinde çalışır.
- **Kayıt bazında konuşmacı tablosu (v2.273; sütunlar v2.281/v2.283):** her kayıt için **KOD · ETİKET · BÖLÜM · SÜRE · İLK – SON**; **atanmamış bölümler** ayrı satırda (— Konuşmacı belirtilmedi);
  dosyalar arası kişi bağlıysa **DOSYALAR ARASI KİŞİ** sütunu eklenir (boş sütun çizilmez). Tek kaynak:
  `materialSpeakerRows(c, m)`; üç çıktı aynı tabloyu basar.
- **Yeni gözlem bayrakları (v2.314):** **duyulmuyor (ses yok/kısık)** (`notAudible`), **uzaktan/zayıf konuşma** (`distance`), **bozuk ses / artefakt** (`distortion`), **dil değişimi** (`foreignLanguage`). Tek kaynak `OBS_DEFS`; düğmeler, yardım listesi, rapor gözlem sütunu, EK-5 ve **koşullu filtreler** otomatik güncellenir. `[duyulmuyor]` etiketi teknik bir gözlemdir; **“Anlaşılmadı” kontrol durumundan ayrıdır** ve etiket eklemek gözlemi otomatik açmaz. 12 bayrak alt şeritte 1100 px’te 4 satıra çıkınca **8 birincil + “Gözlem” paneli** düzenine geçildi (panel tümünü gösterir).
- **İki yeni gözlem bayrağı (v2.272):** **yankı / oda akustiği** (`echo`) ve **kesinti / kopukluk**
  (`dropout`). Tek kaynak `OBS_DEFS`; düğmeler, yardım listesi, rapor gözlem sütunu ve **EK-5 gözlem
  tablosu** otomatik güncellenir. Eski kayıtlar `false` ile açılır (veri kaybı yok).
- **WER referans alanı (v2.270):** Dinleme sekmesinde **“WER — çözümleme doğruluğu (referans varsa)”**
  paneli; **referans metin** yazılınca WER kendiliğinden hesaplanır (hipotez = modelin **HAM çıktısı**
  `asrText`). Referans yok / model çıktısı yok ise tablo çizilmez ve **nedeni yazılır**; ölçümler
  bloğunda **WER (referans)** çipi vardır.
- **Analiz sekmesi düzeni (v2.269):** **Ölçümler** bloğunda durum çipleri (yapıldı · saat / yapılmadı) ve
  **“Tüm ölçümleri yap”** (seviye → perde → tutarlılık; sıralı, çift çalışmaz). Spektrogram **beyandır**,
  toplu ölçüme katılmaz ve **bölüm açmakla işaretlenmez** (yalnız “Spektrogramı göster”). Köken/teslim
  alanları **Kayıt bilgileri** sekmesine taşındı.
- **Süre tablosu ve üçlü gösterim anahtarı (v2.268):** konuşmacı künyesi tablosunun yanında
  **“Konuşmacı süreleri”** tablosu (KOD · ETİKET · KAYIT · BÖLÜM · SÜRE · İLK – SON) + tek satır açıklama;
  **EK-5** üç tablodur (konuşmacı kodları · metin işaretleri · **gözlem işaretleri = uygulamadaki
  bayraklardan otomatik**). Okuma metninde de kayıt başına “Bu kaydın konuşmacıları” satırı vardır.
- **S/K ayrımı ve açıklamalar (v2.267):** **S1, S2… kayıt içi** etikettir; her kayıtta S1'den başlar.
  Bölüm listesinin üstünde **“Bu kaydın konuşmacıları: S1 · Kiracı (12) · …”** satırı çıkar; panelde alanlar
  **Kayıt içi kod (S)** ve **Dosyalar arası kişi (K)** adını taşır. Raporda Konuşmacılar bölümünde S/K paragrafı,
  **her kaydın başında** o kaydın konuşmacı listesi ve **EK-5** gösterim anahtarında S/K tanımları vardır.
- **Konuşmacı tablosunda süre (v2.266):** BÖLÜM/NOT hücresi `a.wav: 5 bölüm · toplam 00:25 ·
  00:00:00.000 – 00:01:10.000` biçiminde süre ve ilk–son duyulmayı taşır; dosyalar arası kişide
  bağlı kayıtların toplamıdır.
- **Ses tutarlılığı ölçümü (v2.265):** **Ses tutarlılığını ölç** → bölüm bazında perde ölçer, atandığı
  konuşmacının profiliyle (ortanca) karşılaştırır. Sapan bölüm listede **⚠ ses**, panelde “Bölüm N · … Hz ·
  atandığı profili … Hz · en yakın: S2” + **Git**. Ardışık bölümlerde ani sıçrama → “konuşmacı değişmiş
  olabilir”. **Otomatik atama değişikliği YOK**; kimlik tespiti değildir; oktav belirsiz ölçüm profile
  girmez; profil için en az **3** güvenilir bölüm gerekir. Ölçüm yalnız kullanıcı tetikleyince çalışır.
- **“Doğrulandı” kilidi (v2.264):** kartta işaretlenince künye (etiket/rol/cinsiyet/yaş/not/kişi bağı)
  ve **Sil** kilitlenir; kart yeşil kenarla işaretlenir, raporda **“doğrulandı”** yazar. Bölüm onayı
  değildir; “Kontrol” sütununu etkilemez. Geri alınabilir, günlüğe yazılır, birleştirmede aktarılır.
- **Kod çakışması denetimi (v2.262):** eski/elle düzenlenmiş kayıtta aynı kod
  iki kişide ise panelde uyarı + **"Çakışan kodları düzelt"**. Düzeltme onay
  ister, **ilk konuşmacının kodunu korur**, diğerini sıradaki boş koda taşır;
  metin/ses değişmez, **geri alınabilir** ve delil günlüğüne yazılır. Rapor
  hazırlığında **engelleyen** madde; raporda uyarı satırı (üç çıktı).
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
- **UDF metin bütünlüğü (v2.251 → v2.252):** deşifre metni, saat, tarih ve uzun
  sözcüklerde **görünmez karakter (U+200B) yoktur**. ZWSP **yalnız 48+ karakterlik
  saf hex (SHA-256)** içinde satır kırma için bulunur (hash'i tercihen uygulamadan
  kopyalayın). (Gerçek UDF'lerde 377 → 173 → yalnız hash; düzeltildi. `birim [103]`,
  `rapor` 28.)
- **Rapor kâğıdı biçimi (v2.253):** kapakta çerçeveli başlık bandı, bölüm başlığında
  sol vurgu, tablolarda zebra satırlar, imza üstünde çizgi. Yazdırmada tablo satırı
  bölünmez, tablo başlığı yinelenir, başlık yalnız kalmaz. **Yalnız görsel**; metin
  ve üç çıktı değişmez (`birim [104]`). Sayfa numarası: DOCX `PAGE` alanı; HTML/UDF
  için tarayıcı/UYAP editörüne bağlı.
- **Sayfa ayırımı (v2.258):** DOCX tablo satırları **bölünmez** (`cantSplit`); tablo
  başlığı yeni sayfada yinelenir. **Ekler (EK-1…)** DOCX/UDF/yazdırmada **yeni
  sayfadan** başlar; kapak ayrı sayfa. Sayfa kırılmasının kendisi motora (UYAP/Word/
  tarayıcı) aittir; biz yalnız mantıklı sayfa sonlarını koyarız (`rapor` 29).
- **Resmîleştirme (v2.259):** DOCX tabloları **metin genişliğine oturur**
  (`tblW=contentTw`, `tblInd=0`; önce sabit 9000 twip idi). Her **ana bölüm (1–7)**
  ve **ekler** yeni sayfadan başlar. "Yazdır" → **"PDF / Yazdır"** (tarayıcı
  yazdırma → PDF olarak kaydet; üst/alt bilgi kapalı). **Ayrı PDF motoru yoktur.**
- **OpenOffice/LibreOffice tablo hizası (v2.260):** DOCX tablo hücresi yatay dolgusu
  **0** + paragraf girintisi (90) → **tablo kenarlığı metin marjıyla aynı hizada**;
  "sola çıkıntı" olmaz. (`rapor` 29.)
- **Parametrik rapor — bölüm aç/kapa (v2.219):** Rapor görünümünde "Rapor
  bölümleri" paneli; **19 bölüm** (kapak, künye, içindekiler, 1–7, kayıt kökeni,
  gömülü metadata, delil edinme, konuşmacılar, okuma metni, WER, seviye,
  inceleme özeti, imza) tek tek açılır/kapatılır. Kapalı bölüm **üç çıktıya da**
  girmez; içindekiler yalnız açık bölümleri listeler. Tercih
  `case.report.sections`'ta saklanır; varsayılan hepsi açık.
- **56.12 şablon bölümleri (v2.220):** rapor künyesi (ayrıntılı), kısa özet,
  ses iyileştirme, ASR/yapay zekâ, görev alanı dışı beyan, gizlilik ve
  EK-1…EK-7 ekleri **varsayılan kapalı** olarak eklendi. Veri yoksa "—" yazılır;
  uydurma yok. Üç çıktı aynı metni üretir.
- **Sayfalı önizleme — A4 (v2.221):** Rapor görünümünde "Sayfalı önizleme
  (A4)" anahtarı. Varsayılan kapalı. Açınca kâğıt üzerinde A4 sayfa çizgileri
  ve "Sayfa N / M" etiketleri çizilir; genişlik değişince yeniden hesaplanır.
  Ekran kılavuzudur (kesin kırılma yazdırma/PDF'te); yazdırmada gizlenir;
  UDF/DOCX etkilenmez.
- **Teknik ortam alanları (v2.222):** Rapor görünümünde "Teknik özellikler ve
  inceleme ortamı" paneli; 7 elle doldurulan alan (iş istasyonu, işletim
  sistemi, ses yazılımı, meta veri aracı, dinleme donanımı, inceleme ortamı,
  diğer). Boş alan rapora "—" yazılır. Rapor bölümü `tech` varsayılan kapalı;
  birleştirmede boş alan dolar, dolu farklı değer sessizce ezilmez.
- **Rapor profilleri (v2.223):** Bölümler panelinde **Yalın (7)** · **Standart
  (19)** · **Tam 56.12 (27)** hazır kümeler; tek tıkla bölüm görünürlüğü
  ayarlanır, veri değişmez, sonra ince ayar yapılabilir.
- **Yazdırma yalnız rapor kâğıdı (v2.224):** Yazdır/PDF çıktısında bölüm
  paneli, teknik ortam alanları, hazırlık kartı ve anahtarlar gizlenir; yalnız
  rapor belgesi basılır.
- **Künye ek alanları (v2.225):** Rapor görünümünde "Rapor künyesi ek alanları"
  paneli; **Raporun ekleri** ve **Tarafsızlık/bağımsızlık beyanı** elle
  doldurulur, boşsa rapora "—" yazılır. Değerler yalnız Rapor künyesi bölümü
  açıkken görünür; üç çıktı aynı.
- **Kalite kontrolü / denetlenebilirlik (v2.226):** `qc` bölümü (varsayılan
  kapalı); otomatik sayaçlar (onaylı/bekleyen/45 sn/zaman/kapsam/delil zinciri/
  ekip/birleştirme) + ikinci kontrol alanları (yapan/kapsam/tarih). Boşsa "—".
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
- **Delil envanteri (v2.216):** Ses görünümünde katlanır **Delil envanteri** paneli
  paketteki TÜM dosyaları (ses + ses dışı) klasör ağacıyla gösterir; arama ve
  paket seçimi vardır. Ses satırı ilgili kaydı açar. Envanter `case.disks[].files`
  alanında tutulur (ad, yol, boyut, SHA-256, rol, materyal bağı).
- **Gömülü metadata — cihaz beyanı (v2.217):** MP4/M4A `mvhd`/`©day`/`©too`,
  ID3v2.3/2.4 `TDRC`/`TDEN`/`TDRL`/`TSSE`, WAV `bext`/`LIST-INFO`, FLAC Vorbis
  `DATE`/`ENCODER` okunur. `origin.embedded` alanında saklanır. **Beyandır**;
  doğrulanmaz. Rapora **varsayılan kapalı** (`report.includeEmbedded`); Rapor
  görünümündeki anahtarla açılır. Kapalıyken bölüm çizilmez.
- **Gözlenen dosya zamanları (v2.216):** her dosyanın oluşturulma/değiştirilme/
  erişim zamanı `origin.fileTimes` alanına yazılır. Bunlar **kayıt zamanı
  değildir**; rapor köken tablosunun altında bu sınırı yazar.
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

## Rapor ekranı: iskelet · A4 · kontrol/revizyon (v2.227)

Rapor ekranı üç bölgeye ayrıldı; rapor ilk ekranda görünür. **İki çalışma
modu** vardır (v2.228): **Düzenle** (belge + iskelet; kontrol paneli kapalı) ve
**Kontrol** (panel açık). Kontrol maddeleri **önem sırasına göre** gruplanır:
engelleyen · uzman kontrolü · iyileştirme. Geniş sarı uyarı belgeden kaldırıldı;
uyarılar Kontrol panelindedir. İskelette **bölüm arama**, **kategori çipleri**
(Kapak · Ana · Teknik · Beyan · Kapanış) ve **"Yalnız açık"** anahtarı vardır;
bunlar yalnız görünürlüğü süzer, **rapor sırasını değiştirmez** (v2.229).
Araç çubuğunda **tek durum çipi** vardır ("Engelleyen eksik: N" · "Kontrol
bekliyor: N" · "Hazır"); iskelet "N dahil · M hariç" der, kapalı bölüm soluk
görünür (v2.230). **Dahil** (rapora girer) ile **Kontrol** (dinlenip onaylandı)
ayrı kavramlardır. Belgede bir bölüme tıklayınca sağda **odaklı düzenleyici**
açılır (v2.231): **İnceleme yöntemi · Teknik sınırlılıklar · Sonuç** serbest
metinleri burada yazılır; diğer bölümler veriden üretilir. **A4 kâğıdı contentEditable
değildir**; üç çıktı aynı metni üretir. **Sayfaya sığdır** anahtarı tek bir A4
sayfasını ekrana sığdırır (v2.232); tam ekranda dön/yazdır/UDF ve A4/sığdır
kontrolleri görünür kalır; sol iskelet kaydırırken görünür kalır. **Sayfa
görüntüleyici** (v2.233): rapor tek A4 sayfa penceresinde; ‹ › ve
PageUp/PageDown ile sayfalar arası gezinme, "Sayfa N/M"; "Sürekli" anahtarı
uzun kâğıt akışını korur. Tablolar sayfaya sığar (sabit düzen + sarma).
**Okuma metni bağımsız bölüm** (v2.234): iskelette kendi satırı; 5. bölüm kapalı
olsa da tek başına açılıp rapora girebilir; kanıt tablosu değişmez.
**Rapor alanları** (v2.235): Kontrol → Rapor alanları panelinden envanter,
köken, edinme, WER ve seviye tablolarının sütunları tek tek açılıp kapatılır
(ör. SHA-256). Kapatılan alan üç çıktıda da görünmez; veri silinmez.
**Kanıt tablosu** (v2.236): Konuşmacı/Kontrol/Gözlem sütunları açılıp kapatılır;
**zaman aralığı ve çözümlenen konuşma zorunludur** (kilitli). EK-2 envanter ana
envanterle aynı sütun seçimini izler.

- **Rapor iskeleti (sol):** bütün bölümler ve **ekler** tek listede. Gövde ve
  ekler **↑↓** ile sıralanır, tek tek açılıp kapatılır. Hazır profil düğmeleri
  **v2.286'da kaldırıldı**; bölüm kümesini tek tek siz seçersiniz.
- **↑↓ alt ağacıyla taşır (v2.299):** bir bölümü ↑↓ ile taşıdığınızda **alt
  bölümleri de birlikte** hareket eder; sıra sessizce geri alınmaz. Aynı düzeyde
  komşu yoksa uygulama nedenini söyler (başka düzeye taşımak için sürükleyin).
  Sürükle-bırak ile bölüm **başka bölümün altına** bırakılınca **alt bölüm**
  (1.1 / A.1) olur; kenara bırakılınca aynı düzeyde sıralanır. Derinlik sınırsız,
  döngü engellenir; ↑↓ ve sürükleme aynı ağaç kuralıyla çalışır.
- **Soru dayanağı — bölümlere bağlama (v2.300):** İnceleme → Sorular kartında
  her soruya **zaman damgalı bölüm** bağlanır (bölüm seç → **＋ Bölüm ekle**;
  **×** ile kaldır). Raporun **Dayanak** satırı serbest notu **ve** bağlı
  bölümleri (`kayıt · 00:00:00.000 – 00:00:05.000 · “alıntı”`) yazar. Bağlı
  bölüm/kayıt silinmişse o bağ **yazılmaz** (uydurma dayanak yok). Serbest metin
  tek kaynaktır (`basisNote`); üç çıktı aynı metni üretir.
- **Parçalar ayrı ayrı (v2.261):** **kayıt bazında bulgular**, **soruların
  cevapları** ve **teknik sınırlılıklar** ayrı bölümdür; her biri tek başına
  açılıp kapatılır ve sıralanır. **Soru yoksa** "Cevaplar" bölümü hiç çizilmez.
- **Orijinalin korunması ve bütünlük (v2.261):** varsayılan **kapalı** bölüm;
  her kaydın **SHA-256** özetini, **doğrulama durumunu** (Doğrulandı /
  Uyuşmuyor / Doğrulanamadı) ve **delil günlüğü zincirini** yazar. Özet yoksa
  "hesaplanmadı" der; uydurma değer yazmaz.
- **56.12 Ana Şablon (v2.261–v2.285):** düğme **v2.286'da kaldırıldı**.
  Tanım geri uyum için şemada (`reportPresetLayout`) kalır; **otomatik
  uygulanmaz**. Kayıtlı bir düzenin sırası bozulmaz.
- **EKLER bölümü (v2.261):** gerçekten basılan ekleri listeler (EK-1, EK-2…);
  ek yoksa **"Bu raporla ek sunulmamıştır"** yazar. Boş vaat bırakmaz.
- **Numara türetilir (v2.289):** **çizilen her gövde bölümü** numara alır
  (1,2,3… veya A,B,C…); “ana bölüm / alt blok” ayrımı ve TOC’taki “–” işareti
  kaldırıldı. Bir bölüm kapatılınca numarada **boşluk kalmaz**; numarasız modda
  hiç numara yazılmaz. Alt başlık ana numaradan türetilir (5.1 / A.1…).
- **Veri yoksa sessiz değil (v2.289):** açık ama verisi olmayan bölüm iskelette
  **“veri yok”** rozeti taşır; nedeni ipuçunda ve açma bildiriminde yazar.
  WER için referans metin + model çıktısı gerekir; yoksa rapora girmez.
- **İçindekiler** gövde sırasını birebir izler; yalnız ana 7 başlık değil,
  çizilen tüm bölümler listelenir.
- **Kişiler paneli dosya çekmecesinde (v2.293):** **Dosyalar arası kişiler (K)**
  Analiz yerine **Dosya bilgileri** çekmecesinde; ekle/düzenle/sil orada. Kayıt
  kartındaki “Aynı kişi” bağlantısı yerinde. Silme onay ister; ses/metin korunur.
- **Konuşmacıları otomatik ön-atama (v2.301):** Konuşmacılar panelindeki
  **“Konuşmacıları önceden belirle (otomatik)”** düğmesi **boş** bölümlerin
  konuşmacısını ses benzerliğine göre **S1, S2…** olarak ön-atar. Bu bir
  **öneridir** (anonim kümeleme; **kimlik tespiti değildir**); dinleyip
  düzeltirsiniz, yanlışsa değiştirir veya **＋** ile yeni eklersiniz. Mevcut
  atamalar korunur, onay ister, **Ctrl+Z** ile geri alınır; ön-atama bölümde
  **≈ otomatik** rozetiyle görünür.

## Üst yazı ve belge ekleri (v2.323)

Üst yazı (sunuş yazısı) **ayrı bir belgedir**; bilirkişi raporu onun **EK-1**'idir.
Rapor ekranında **Rapor | Üst yazı** sekmeleri vardır; aynı A4 önizleme ve aynı
rapor biçimi (font/punto/marj) kullanılır.

- **Üst yazı alanları:** yer · tarih · konu · muhatap · imza unvanı · gövde.
  Boş alan satır üretmez; gövde boşsa varsayılan metin yazılır.
- **Zorunlu künye:** mahkeme, dosya no, bilirkişi adı. Biri eksikse üst yazı
  **hazır değil** denir, eksikler listelenir ve **çıktı üretilmez**.
- **Belge ekleri:** `case.letterAnnexes[]` sıralıdır; EK numarası **türetilir**
  (EK-1 rapor; sonrakiler bitişik). Türler: `report` (rapor) · `sections`
  (bölümlerden teknik ek) · `reportAnnex` (rapor içi eki belgeye taşır) ·
  `custom` (serbest başlık + metin). **Tek kopya:** eke alınan bölüm/ek raporda
  kapanır; raporda yeniden açılırsa ekten çıkar. Ek belgesinde kapak, içindekiler,
  künye ve imza **yoktur**; bölüm başına sayfa sonu yoktur (kompakt).
- **Ek yönetimi:** sağ panelde **＋ Teknik bilgiler / ＋ Rapor içi ek /
  ＋ Serbest ek**; satırda **↑ ↓ ⤓ ✎ ×**. Silme onay ister ve bölümleri önceki
  görünürlüğüne döndürür; Ctrl+Z ile geri alınır.
- **Çıktı:** `UstYazi_<dosya no>.udf` (+ isteğe bağlı `.docx`); rapor adı
  değişmedi. **“Üst yazı + rapor (2 dosya)”** ikisini birlikte indirir.
- **Tek kaynak:** `letterModel(c)` — ekran, DOCX ve UDF aynı metni üretir
  (`rapor-tutarlilik-testi` Senaryo 44).
- **Sınır:** uygulama e-imza üretmez; sayfa sayısı UYAP/Word düzenine bağlıdır.

- **Belge ekleri yönetimi (v2.324):** üst yazıya **teknik bilgiler** (bölümlerden), **rapor içi ek** ve **serbest ek** eklenir; sıralanır, indirilir, kaldırılır. Eke alınan içerik raporda tekrar etmez.
- **Üst yazı ayrı belge (v2.323):** Rapor ekranında **Rapor | Üst yazı** sekmesi. Üst yazı kendi UDF/DOCX dosyasıdır; rapor **EK-1**'dir; **“Üst yazı + rapor (2 dosya)”** tek tıkla indirir. Eksik künyede üretilmez. Ayrıntı: yukarıdaki “Üst yazı ve belge ekleri”.
- **Etiket menüsü onarıldı (v2.322):** menü **segment listesine doğru (sola)** açılır, deşifre metni alanını örtmez; **seçim yapılmasa da** üst × / alt “Kapat” / **Esc** / dış tıklama kapatır (inline `display` artık `[hidden]` kuralını ezmiyor). **“Etiketleri temizle”** yalnız `[etiket]` işaretlerini kaldırır — **metin korunur**, bilinmeyen köşeli parantezler dokunulmaz, onay ister. Yeniden çizimden sonra backdrop eşitlenir; etiket eklendikten sonra menü yine açılır.
- **30 etiket geri + kapatma garantisi (v2.320):** Etiket menüsünde **30 etiketin tamamı** (12 gözlem kavramı dâhil) görünür; başlıkta **“Etiket ekle · 30”**. Alt **Kapat** şeridi sabittir; kapatma **yakalama aşamasında** da bağlanır. Menü yüksekliği 30 etikete göre büyütüldü, kaydırılır.
- **Görünür sürüm + tek tık yenile (v2.319):** üst barda **⟳ vX.Y** düğmesi; tıklayınca sayfa `?t=` ile önbelleği kırarak yenilenir. İlk sürüm denetimi **hemen**, sonra 30 sn’de bir ve sekmeye dönüşte. Eski sürümde “Yeni sürüm hazır” şeridi.
- **Envanter bütünlüğü (v2.318):** EK-5 “Metin işaretleri” anahtarı **o sürümde menüdeki 18 etiketten** (`QUICK_TAG_DEFS`), “Gözlem işaretleri” **12 bayraktan** (`OBS_DEFS`) üretilir; eski/olmayan etiketler kaldırıldı. Etiket/Gözlem menülerinde **üst/alt Kapat + backdrop + Esc**; tarayıcının arama ×’i gizli; gözlem panelinde **Kapat ×**.
- **Etiket menüsü kapatma + onaylı temizleme (v2.317):** “Etiket ekle” menüsünde sağ üstte **× Kapat**; **Esc**, dış tıklama ve düğmeye tekrar basma da kapatır. **“Metni temizle”** artık **onay ister** (yanlışlıkla silme yok). Metin alanı **~3 satır** (min ~87 px); uzun metin kendi içinde kayar.
- **Menü kırpılması düzeltildi (v2.316):** “Etiket ekle” ve “Gözlem işaretle” menüleri artık **`position:fixed`** ve görünür alana oturtulur; `.seg-detail`/`.audio-card` gibi ataların `overflow:hidden` kutusuna hapsolmaz, sağa taşmaz. **Solda Etiket, sağda Gözlem** (rapor tablosunun GÖZLEM sütunuyla uyumlu); düğmeler ne işe yaradığını yazar. Menü dışarı tıklama/kaydırma/pencere boyutunda kapanır.
- **Dosya görünümü (v2.315):** soldaki **Dosya** ayrı bir **sayfa** açar — künye, taraflar, teslim durumu ve **tamamlanacaklar** tek ekranda. Düzenleme sağdaki **çekmecede** yapılır (form kimlikleri çoğaltılmaz). **✎ Düzenle** çekmeceyi açar; **Git ›** ilgili görünüme geçer; **Rapor kontrolü →** raporu Kontrol modunda açar.
- **Teslim tarihi zekâsı (v2.312):** görevlendirme tarihi + verilen süre → **son teslim tarihi otomatik** (elle yazılan korunur, `dueDateManual`); **kalan gün / gecikme** tek kaynaktan (`deliveryInfo`) Özet **TESLİM** panelinde, **durum çubuğunda** (“Teslim: N gün / gecikti”) ve **rapor ekranında**; rapor tarihi > son teslim ve gecikme **metinle** uyarır. Ray’da **Dosya** girişi. Tarih yoksa “—” (uydurma yok); gün farkı **takvim günü**.
- **Terim/konu listesi (v2.311):** rapor iskeletinde **TERİM VE KONU LİSTESİ** (varsayılan kapalı): en az 2 kez geçen anlamlı sözcükler + geçiş sayısı (`depozito (3)`). Özet değil; deterministik tarama yardımcısı. Üç çıktı aynı.
- **Kurumsal kâğıt biçimi (v2.310):** bölüm alt kuralı, tablo çerçevesi + başlık ayırıcı, çerçeveli imza bloğu, alt bilgi çift çizgi. Yalnız görsel; metin ve üç çıktı değişmez; renkler token.
- **Gömülü metadata tüm dosyada (v2.309):** “Dosyadan oku” büyük dosyada metadata’yı sondan da arar (ID3v1 / MP4 moov); baş 8 MB + gerekirse kuyruk 4 MB. Sonuç cihaz beyanıdır; doğrulanmış kayıt zamanı değildir.
- **Kanıt zaman çelişkisi (v2.308):** gömülü metadata (beyan) kayıt tarihi, dosyanın değişiklik zamanından (gözlem) belirgin sonra ise Kayıt bilgileri’nde **⚠** uyarı + rapor hazırlığında madde. Kanıt değil, dikkat işareti; çözülemeyen tarihte uyarı yok (1 gün tolerans).
- **Soru ↔ bölüm önerisi (v2.307):** Sorular kartında **“İlgili bölümleri öner”** soru metniyle anlamlı sözcük örtüşen bölümleri (zaman · alıntı · örtüşme sayısı) listeler; **Ekle** ile zaman damgalı dayanak bağlanır. Otomatik bağlama ve uydurma skor yok; bağlı bölüm tekrar önerilmez.
- **Satır ⋮ menüsünde konuşmacı işlemleri (v2.306):** bölüm satırı **⋮** menüsünde **“≈ Konuşmacıyı tahmin et”** ve **Konuşmacı** seçicisi (S1/S2…) vardır; çözümlemeyle aynı yerde. Mevcut tek kapı kullanılır.
- **Bölüm ↔ konuşmacı tablosu (v2.305):** Konuşmacılar sekmesinde her bölüm **zaman · kısa metin · konuşmacı seçici · ≈ öneri/durum** olarak listelenir; atama satırdan yapılır (Deşifre'ye gitmeden), değişiklik Deşifre'ye de yansır. Filtre: Tümü · Atanmamış · Otomatik. Kimlik değil; öneri/ön-atama anonim benzerlik.
- **Konuşmacılar kendi sekmesinde (v2.304):** kayıt kartı dört sekme: **Deşifre · Konuşmacılar · Ölçümler · Kayıt bilgileri**. Konuşmacı işi (ön-atama, ≈ tahmin, perde, tutarlılık, gömme) **Konuşmacılar** sekmesinde; spektrogram/seviye/WER **Ölçümler** (eski “Analiz”) sekmesinde. Davranış aynı.
- **Konuşmacı yöntem notu (v2.303):** rapor araç çubuğundaki **“Konuşmacı yöntem notu raporda görünsün”** anahtarı (varsayılan **kapalı**) açılırsa ve **otomatik ön-atama** kullanıldıysa Konuşmacılar bölümüne dürüst bir yöntem cümlesi eklenir (ses benzerliğine dayalı anonim kümeleme; kimlik tespiti değildir). Aksi hâlde **yazılmaz** (uydurma beyan yok); üç çıktı aynı.
- **Bölüm bazında konuşmacı tahmini (v2.302):** bölüm detayında **≈?** düğmesi, o bölümü mevcut konuşmacıların ses örnekleriyle karşılaştırıp **öneri** verir (ör. **≈ S2 · 0.91**). **Uygula** ile atanır; onaylamadan atama **değişmez**. Belirsiz aralık (0,72–0,88) **işaretlenir**; kör uygulama yok. Kimlik tespiti değildir.
- **Benzer ses grupları (v2.292):** gömme ölçümünde **atanmamış** bölümler
  `Grup A · N bölüm` olarak gruplanır. **Git** / **Ata**; hedef konuşmacı seçilir,
  onay + Ctrl+Z + günlük. Otomatik atama yok; kimlik tespiti değildir.
- **Bölümü EKLER altına taşıma (v2.291):** her gövde bölümünün yanındaki
  **EK** düğmesi bölümü gövdeden çıkarır, EKLER altında **EK-N. başlık**
  olarak basar; alt başlıklar **EK-N.1** olur. İçerik aynı üreticiden, üç
  çıktı aynı. **G** gövdeye geri alır; Ctrl+Z ile geri alınır. Kanıt etkilenmez.
- **Tek EKLER bölümü (v2.290):** boş “EKLER” listesi (`s7`) varsayılan
  **kapalı** ve başlığı **“EK LİSTESİ”**; asıl **EKLER** (`annex`) varsayılan
  **açık**. EK-1… içerikleri tek yerde. İsteğe bağlı ek listesi açılabilir;
  eski `s7` tercihi `annex`e taşınır.
- **Ekler ayrı ve düzenlenebilir kayıttır:** her ek tek tek açılır/kapanır ve
  sıralanır; numara **EK-1…EK-N** bitişiktir (eski EK-4 boşluğu kapandı). Sağdaki
  **Ekler · başlık / içerik / not** panelinden başlık ve not düzenlenir; **＋ Yeni
  ek** ile özel ek eklenir/kaldırılır. Yerleşik ek gövdesi veriden üretilir.
- **A4 önizleme (orta):** kâğıt genişliğinden A4 sayfa kılavuzu; sayfa sayısı
  (`A4 · N sayfa`) gösterilir. Kılavuz niteliğindedir; kesin kırılma
  yazdırma/PDF’te oluşur. Kırpma yok.
- **Rapor kontrolü (sağ):** rapor hazırlığı maddeleri (tıkla → ilgili yere git),
  teknik ortam, künye ek alanları ve kalite kontrolü panelleri.
- **Rapor revizyonu (sağ):** “Revizyon kaydet” o anki bölüm düzenini ve rapor
  metinlerini saklar (en çok 10). “Geri yükle” değişecek alanları söyler; iki
  revizyon **Farkları karşılaştır** ile alan grupları bazında kıyaslanır.
  **Ses ve deşifre kanıtı revizyona girmez.**
- **Tek kaynak:** sıra/numara/başlık/TOC ve üç çıktı (HTML/DOCX/UDF) aynı
  tanımdan (`REPORT_SECTION_DEFS`, `REPORT_ANNEX_DEFS`, `case.report.layout`)
  beslenir.
- **Yazdırma/tam ekran:** yalnız rapor kâğıdı çıkar; iskelet/kontrol/revizyon
  panelleri gizlenir.

## Mesleki sınırlar (uygulama bunları yapmaz)

- Hukuki değerlendirme ve bilirkişi kanaati üretmez.
- Konuşmacı kimliği, kayıt orijinalliği veya montaj tespiti yapmaz.
- E-imza üretmez, UYAP'a belge göndermez.
- **USB/cihaz edinmez.** Cihaz bilgisi edinme tutanağının beyanıdır; cihaz bu
  ortamda okunmaz. Tier 1 çıktısı "adli imaj" değil, "belgelenmiş kopya"dır.
- Kontrol edilmemiş deşifreyi doğrulanmış gibi göstermez.
- Yapılmayan incelemeyi rapora yazmaz.

## Fizikî dosya teslim ve iade (v2.330)

Mahkemenin **fizikî olarak** teslim ettiği dava dosyası ve ayrı materyaller
(USB, CD, DVD, harici disk, mühürlü zarf) **Dosya** alanında kaydedilir.
Teslim ve iade **ayrı tarih/saat** ile tutulur; iade ekranına ilk teslim listesi
aynen gelir ve **hiçbir materyal kendiliğinden iade edilmiş sayılmaz**.
İade edilmeyen materyal açık uyarı olarak görünür. Dizi pusulası
verildi/verilmedi/belirtilmedi olarak işaretlenir, taranmış kopyası eklenebilir.
**Teslim tutanağı** ve **iade tutanağı** ayrı UDF/DOCX (imza alanlı) indirilir.
Raporun **EK-1 (materyal teslim ve iade tutanağı)** bölümü bu kayıttan üretilir;
ses kaydı kökeni (`origin`) ile karışmaz. Dosya yalnız **UYAP erişimi**yle
incelendiyse bu bölüm boş kalabilir ve **zorunlu değildir**. Belge kopyaları
`.akis` paketine girer; uygulama e-imza üretmez. Test: `birim [162]`,
`rapor` 46, `tasarim [2dg]`.

## Belge paketi: UDF + DOCX (v2.331)

Üst yazı ekranındaki **⤓ Tüm belgeler (UDF + DOCX)** düğmesi üst yazıyı, raporu
ve belge eklerini **tek ZIP'te** indirir; **her belge iki biçimde** bulunur:
`.udf` (Bilirkişi Portalı/UYAP) ve `.docx` (Word kopyası). İçindeki
**`belgeler.json`** (`akis.documents.v2`) her dosyayı **ayrı satırda** listeler:
`sequence`, `annexNo`, `kind`, `format`, `label`, `file`, `bytes`, `sha256`;
üstte `hashAlgorithm`, `createdAtUtc`, `appVersion` ve `case` künyesi vardır.
**`SHA256SUMS.txt`** her dosya için `<hash>  <dosya>` satırı taşır. Hash
hesaplanamazsa veya bir belgenin bir biçimi üretilemezse paket **eksik
indirilmez**; hangi belge/biçim olduğu yazılır. ZIP bir **arşiv/taşıma**
paketidir; UYAP'a tek belge gibi gönderilmez. Test: `rapor` 47,
`tasarim [2dh]`.

## Teslim tarihi ve gecikme uyarısı (v2.308/v2.312/v2.338)

Son teslim tarihi görevlendirme tarihi + süreden hesaplanır (elle yazılan korunur). Özet ekranında, durum çubuğunda ve rapor çıktısında “N gün kaldı / N gün gecikti” yazar. **Gecikmiş dosya açılışta bir kez kırmızı şeritle bildirilir** (#dueNotice): dosya adı, gecikme günü ve son teslim tarihi; “Dosyayı aç” Dosya sayfasına gider. Şerit günde bir kez çıkar ve dosyaya yazılmaz; tarih yoksa uyarı üretilmez (uydurma yok).

## Teslim kontrol listesi (EK-5, v2.339)

Raporun **EK-5 “Son kontrol listesi”** eki teslimden önce otomatik denetim yapan **TESLİM KONTROLÜ** tablosu taşır: künye alanları, kayıt/bölüm durumu, kontrol bekleyen bölüm, belirsiz okumada seçim, konuşmacı ataması ve kod çakışması, kapsama, SHA-256 doğrulaması, son teslim tarihi, rapor tarihi ≤ son teslim ve fizikî materyal iadesi. Durum **metinle** yazılır: Tamam · Eksik · Bilgi. "Bilgi" eksik değildir (isteğe bağlı ya da ölçülmemiş); uydurma "Eksik" üretilmez. Tablo HTML/DOCX/UDF çıktısında **aynı satırları** basar.

## Rapor içi ekler (v2.340)

Raporun ön bölümünde **RAPOR İÇİ EKLER** satırı vardır; raporun kendi eklerini **“1. BAŞLIK · 2. BAŞLIK…”** biçiminde listeler ve EKLER bölümünden otomatik türetilir (elle yazılmaz). Üst yazıdaki **EK-1/EK-2** belge seti ayrıdır: üst yazı ayrı belgeleri sunar. EKLER bloğu kapalıysa liste yazılmaz; kapatmak için künye alanlarından `annexList` kapatılır. Kapak ile EKLER bölümü aynı kaynaktan (`reportAnnexList`) beslenir; üç çıktı (HTML/DOCX/UDF) aynı metni üretir.

## Tarafsızlık beyanı (v2.341)

Künyede **“TARAFSIZLIĞI ETKİLEYEBİLECEK HÂL BEYANI”** satırı vardır. 56.12 künyesi bu alanda “engel bulunmadığı” ya da “varsa açıklama ve merciye bildirim” ister; alan **taahhüt değil beyandır**. Varsayılan **boştur** ve boşsa rapora satır basılmaz; uygulama kendiliğinden beyan yazmaz. **“Engel bulunmadığını yaz”** düğmesi hazır cümleyi yalnız açık tıklamayla koyar (dolu alan ezilmez). Satır, künye alanlarından kapatılabilir; rapor revizyonuna girer. Eski sürümden kalan görünmez `report.annexList` alanı birleştirmeye girmez (ölü alan).

## Varsayılan metinler (v2.342)

**Ayarlar → Kendi varsayılan metinlerim**: inceleme yöntemi, teknik sınırlılıklar ve sonuç metni bir kez yazılır; her yeni dosyada gelir (kod değişikliği gerekmez). Metin **dosyaya yazılmaz**; boş alanın yerine basılır. Bölüm düzenleyicide **VARSAYILAN METİN** rozeti ve **Varsayılana dön** düğmesi vardır. Tarafsızlık beyanı kapsam dışıdır (kişisel beyan, kendiliğinden dolmaz). Depo yalnız bu tarayıcıdır (`akis.defaults`); pakete girmez.

## Kayıtlı metinlerim (v2.343)

Rapor bölümü metin alanlarının altında **Kayıtlı metinlerim** kutusu vardır: metni kısa adla kaydedin, sonraki dosyalarda **tek tıkla** alana ekleyin. Kayıtlar **yalnız bu tarayıcıda** tutulur (`akis.textLibrary`); dosyaya ve pakete girmez, birleştirmede çakışma üretmez. Ekleme kopyadır (canlı bağ yok); dolu alan **onayla** değişir, silme onay ister. Kapsam: inceleme yöntemi · teknik sınırlılıklar · sonuç; tarafsızlık beyanı kütüphanede yer almaz (kişisel beyan).

## Metin envanteri (v2.344)

Uygulamadaki tüm rapor metinleri `docs/METIN_ENVANTERI.md` içinde tek listede toplanır (künye, bölüm girişleri, beyan, gizlilik, dayanak, ASR, fizikî tutanak, üst yazı, kısa etiketler) ve nerede düzenlendiği yazılır. Belge **koddan üretilir** (`node tools/metin-envanteri.mjs`); `surum-testi` güncelliğini denetler.

## Tek düzenleme yeri (v2.345)

Yöntem, teknik sınırlılıklar ve sonuç metinleri **yalnız** Rapor görünümünde (belgede bölüme tıkla → Bölüm düzenle) düzenlenir; İnceleme görünümünde ikinci kopya yoktur, yalnız yönlendirme düğmeleri vardır. Yeni dosyada hangi metnin geleceği Ayarlar → Kendi varsayılan metinlerim ile belirlenir.

## Rapor dili (v2.347)

Rapor metinleri bilirkişinin kendi anlatımıyla yazılır: inceleme yöntemi birinci kişidir; “ASR / yapay zekâ / model çıktısı / diarizasyon / embedding / pipeline” gibi terimler ana anlatımın zorunlu dili değildir (teknik kayıtlarda ve gerektiğinde kullanılabilir). Otomatik çözümleme bölümünün başlığı **İNCELEME VE ÇÖZÜMLEME YÖNTEMİ**’dir. SHA-256, doğrulama, sayım, imza ve kümeleme iddiaları gerçek duruma **koşulludur**; kontrolü tamamlanmamış bölüm onaylanmış sayılmaz. S/K açıklaması tek yerde; teknik algoritma ayrıntısı ana rapora taşınmaz.

## Düzenlenebilir rapor metinleri (v2.348)

**Ayarlar → Kendi varsayılan metinlerim** 15 rapor metnini kapsar (yöntem, sınırlılıklar, sonuç, kapsam beyanı, hukuki dayanaklar, gizlilik, bütünlük notu, yazılım desteği açıklamaları, WER/seviye açıklamaları, teslim kontrolü notu, gömülü metadata açıklaması). Metinler **yalnız bu tarayıcıda** saklanır, dosyaya yazılmaz; bölümü açık olan tüm raporlarda kullanılır. Her metin tek tek varsayılana döndürülebilir; hukuki dayanak metninde doğrulanmamış mevzuat/standart künyesi eklenmemesi uyarısı vardır. Tarafsızlık beyanı kapsam dışıdır.

## Boş tablo kuralı (v2.350)

Veri yoksa rapor **boş tablo basmaz**: envanter, kayıt kökeni, konuşmacılar, EK-2 ve EK-3 bölümlerinde yalnız “kayıt yok” cümlesi yazılır; “—” satırları ve görünmez karakter kullanılmaz. Üç çıktı (HTML/DOCX/UDF) aynı cümleyi verir. Yazılım desteği kullanılmadıysa çözümleme bölümünde “yararlandım” girişi ve doğrulama cümlesi basılmaz. Önceki sürümlerin eski yöntem metni, uzman düzenlemediyse yeni anlatıma çevrilir.

## Rapor metinleri ayrı pencerede (v2.361)

16 varsayılan rapor metni Ayarlar'dan çıktı: **Rapor → 📄 Metinler** veya
**Ayarlar → Rapor metinleri · Pencereyi aç**. Ayarlar üç sekmeye indi
(Görünüm · Model · Depolama). Arama ve "Varsayılana dön" aynı çalışır.

## Ayarlar sekmeleri (v2.360)

Ayarlar dört sekmeye ayrıldı (Görünüm · Metinler · Model · Depolama); son sekme
hatırlanır. “Kendi varsayılan metinlerim” 16 metin kapalı başlık hâlinde ve
aranabilir. Ölçüm: tek liste 3.453 px (4,7 ekran) → sekme başına 1,0–1,8 ekran.

## Rapor özeti girişi düzenlenebilir (v2.359)

“RAPORUN KISA ÖZETİ” giriş paragrafı: Ayarlar → Kendi varsayılan metinlerim →
“Rapor özeti girişi” (kendi standardınız) veya Rapor → özet bölümü → Bölüm
düzenle (yalnız bu dosya). Sıra: dosya → kullanıcı → uygulama metni. Üç çıktı
aynı metni basar.

## Notu bölüme bağlama (v2.358)

Ses görünümünde bölüm seçiliyken deftere yazılan not o bölüme bağlanır
(`materialId` + `segmentId`). Notta **↪ Bölüm N · aralık** bağlantısı, bölüm
satırında **📝 N** rozeti görünür; bağlantı o bölümü deşifrede açar. Bölüm
silinirse not korunur, yalnız bağ "Bölüm silinmiş" olur. Notlar rapora girmez.

## Yalnız not yazılan dosya kaydedilir (v2.357)

Çalışma notu (ve inceleme konusu) dosya verisidir: yalnız not yazılmış dosya da
kaydedilir, pakete ve arşive girer. Boş metinli not dosyayı doldurmaz. Hiç veri
yoksa dosya yine kayda yazılmaz. Koruyan test: `birim [176]`.

## Çalışma notları — kişisel defter (v2.356)

Bilirkişi dosyayı incelerken not tutabilir: üst barda **📝** veya **Alt+N**.
Notlar zaman damgalıdır; sabitlenebilir, aranabilir, kopyalanabilir ve tek tıkla
cevaplanacak sorulara aktarılabilir. **Rapora, eklerine ve belge çıktılarına
girmez** (otomatik test). Paket oluştururken notlar istenirse paket dışında
bırakılır. Silme onaylıdır ve Ctrl+Z ile geri alınır.

## 1. bölüm başlığı 56.12 diliyle (v2.355)

Raporun 1. bölümü **"GÖREVLENDİRME, İNCELEMENİN KONUSU VE SINIRLARI"** başlığıyla
gelir (56.12 ana şablonu); iskelet etiketi de aynı dili kullanır. Başlık tek
kaynaktan gelir (`REPORT_SECTION_DEFS`), kullanıcı başlığı korunur. Ölü ikinci
başlık listesi (`REPORT_TEXT.sections`) kaldırıldı.

## Dava konusu ≠ inceleme konusu (v2.354)

Rapor künyesindeki konu (`subject`) hukuki uyuşmazlığı; 1. bölümdeki **İnceleme
konusu** (`examinationSubject`) bilirkişiye verilen teknik görevi anlatır. İkisi
ayrı alandır; inceleme konusu boşsa 1. bölümde satır yazılmaz. Form yer tutucusu
türe göre değişir. İnceleme görünümündeki alan **"Görevlendirme kapsamı ve
sınırları"** adını taşır. Koruyan testler: `birim [174]`, `rapor 55`,
`tasarim [2dr]`.

## Ölü kod temizliği (v2.353)

Üretimde çağrılmayan 9 yardımcı fonksiyon kaldırıldı; davranış değişmedi.
Testler canlı karşılıkları sınar (`exportPlanFor`, `casesForStorage`,
`isHumanApprovedReview`, `asrProfile`). Paket sözleşmesi belgesi
`exportPlanFor(cases, activeCaseId, scope)` olarak düzeltildi: kapsam (`scope`)
taşımayan plan fonksiyonu yazılmaz.

## Okunabilirlik: biçim ipucu satırı (v2.352)

Ses görünümündeki yükleme alanının altında desteklenen biçimleri yazan satır
(WAV · MP3 · M4A · OGG · FLAC · AAC · MP4/MOV/WEBM · delil paketi) artık tema
renginden (`--ink-3`) gelir. Önce ham hex taşıyordu ve açık/sepya temada
okunabilirlik ölçütünün altındaydı (2.48:1 / 2.30:1 → 5.93:1 / 6.11:1).
Davranış değişmedi; koruyan test `tasarim [2dq]`.

## Kurgusal demo paketi (v2.351)

`sample_data/demo/AKIS_Demo_Kurgusal.akis` gerçek veri girmeden denemek içindir: 2 gerçek örnek ses kaydı, 12 bölüm (onaylı · belirsiz okuma · bekleyen · anlaşılmadı), S1/S2 ve K1 konuşmacı eşleştirmesi, 3 soru, kayıt kökeni, fizikî teslim/iade tutanağı ve üst yazı. **Paketten yükle** ile açılır. Tamamen kurgusaldır; gerçek dava verisi değildir.
