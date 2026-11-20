# Yol Haritası

AKİS sürüm numarasını `MAJOR.MINOR` biçiminde tutar. Tek kaynak
`assets/app.js` içindeki `APP_VERSION` değeridir; arayüzdeki etiket oradan
yazılır. **Güncel sürüm: v2.92.**

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

### v2.92 — Sessizlik/perde tüm kanalları görür (tamamlandı, canlı veri)

`measureSegmentSilence` ve `measureSpeakerPitch` yalnız `getChannelData(0)`
okuyordu. Konuşma sağ kanalda ise bölüm "tamamen sessiz" sanılıyor (oran 1,0)
ve perde ölçülemiyordu. `pickActiveChannel()` + `analyzeSilenceChannelAware()`
eklendi: en yüksek enerjili kanal kullanılır, kanal numarası yazılır.
`SILENCE_SCHEMA = 2`; eski ölçümler atılır. `birim-testleri` [23] korur.

### v2.91 — Seviye/kırpılma kanal kanal ölçülür (tamamlandı, canlı veri)

`measureLevels` tüm kanalları ortalamayla mono'ya indiriyordu. Ses tek kanalda
ise tepe −6 dB düşük, tek kanaldaki kırpılma tamamen görünmez, ters fazda tepe
sıfır oluyordu. `analyzeChannelLevels()` eklendi: tepe/kırpılma en kötü
kanaldan (hangi kanal olduğu yazılarak), gürültü/SNR/bant mono karışımdan.
Ölçüm şeması 2 → 3. `birim-testleri` [22] korur.

### v2.90 — WER ters çalışıyordu (tamamlandı, canlı veri)

Rapordaki "çözümleme doğruluğu (WER)" tablosu hipotez olarak `s.text`
(bilirkişinin düzelttiği metin) kullanıyordu; modelin ham çıktısı `s.asrText`
ölçüme girmiyordu. Sonuç TERS: model %100 hatalıyken rapor %0, model
mükemmelken %100 diyordu. Hipotez artık yalnız `asrText`; model çıktısı yoksa
satır yazılmaz. `werMeasuredCount()` ile özet sayacı tabloyla eşlendi.
`birim-testleri` [21] ve `rapor-tutarlilik-testi` Senaryo 7b korur.

### v2.89 — Eski dosyalardaki onaylar yüklenirken siliniyordu (tamamlandı, canlı veri)

v2 dosyalarında kontrol durumu Türkçe kodla saklanıyordu ('onaylandi' vb.);
`normalizeSegment` bunları `pick()` ile okuyup tanımadığı için sessizce
'pending'e düşürüyordu. Dosya açılır açılmaz bilirkişinin onayları siliniyordu.
`REVIEW_LEGACY` + `normalizeReviewState()` şemaya tek kaynak olarak eklendi;
app.js'teki kopya tablo kaldırıldı. `sema-testi` [4b] korur.

### v2.88 — Onay metne bağlı değildi (tamamlandı, canlı veri)

Adli bütünlük hatası: onaylanmış bir bölümün metni tamamen değiştirilse bile
rozet "Onaylandı" kalıyor ve kontrol edilmemiş metin rapora onaylı giriyordu.
`setSegmentText()` tek darboğazında düzeltildi; onay düşünce kullanıcı anında
bilgilendirilir. `birim-testleri` [20] korur.

### v2.87 — Kayıt tamamen duruyordu (tamamlandı, canlı veri)

Bilirkişi "yaptığım tüm değişiklikleri kaybettim, uyarıyı görmedim" dedi.
İki hata birleşmişti: (1) bölüme tıklayınca `attachSegWave` malzemeye fonksiyon
yazıyor, IndexedDB `structuredClone` yapamadığı için **her kayıt iptal
ediliyordu**; (2) yazma hatası büyük uyarı göstermiyordu (şerit yalnız kota
hatasında çıkıyordu). `sanitizeForStorage()` eklendi; her yazma hatası görünür
şerit üretir. `birim-testleri` [17]/[18] korur.

### Açık konular — sırayla ele alınacak (tek konu = tek sürüm)

Aşağıdakiler ölçülerek tespit edildi; her biri **kıran test + düzeltme** ile
ayrı bir sürümde ele alınacak. Sıra, veri doğruluğuna etkisine göre:

| Sıra | Konu | Durum |
|---|---|---|
| 1 | Kayıt tamamen duruyordu + uyarı görünmüyordu | **v2.87 tamamlandı** |
| 2 | Onay metne bağlı değil: metin değişse de "Onaylandı" kalıyor | **v2.88 tamamlandı** |
| 3 | v2 onay kodları yüklemede sessizce `pending`'e düşüyor | **v2.89 tamamlandı** |
| 4 | WER, modelin çıktısı yerine bilirkişinin metnini ölçüyor | **v2.90 tamamlandı** |
| 5 | Seviye/kırpılma ölçümü mono karışımdan (kırpılma görünmüyor) | **v2.91 tamamlandı** |
| 6 | Sessizlik/perde ölçümü yalnız kanal 0 (stereo'da yanlış) | **v2.92 tamamlandı** |
| 7 | `isHallucination` gerçek cümleleri dolgu sayıyor | bekliyor |
| 8 | Birleştirmede kayıt düzeyi alanlar sessizce düşüyor | bekliyor |
| 9 | `updatedAt` hiç güncellenmiyor (yenilik ölçütü ölü) | bekliyor |
| 10 | Önizleme ile birleştirme farklı alan kümesi kullanıyor | bekliyor |
| 11 | SHA-256 hesaplanamazsa "doğrulandı" deniyor | bekliyor |
| 12 | Zaman alanı doğrulanmıyor (`00:00:05,100` → `00:00:00.000`) | bekliyor |
| 13 | `paragraphize` asrText/asrModel'i siliyor | bekliyor |
| 14 | Hızlı onay sayacı ile filtresi ayrışıyor | bekliyor |
| 15 | Türkçe büyük İ terim tutarlılığını bozuyor | bekliyor |

### v2.86 — Eksik ses uyarısı + yazma akıcılığı (tamamlandı)

Ses blobu kaybolduğunda dışa aktarma **sessizce** atlıyor, yedek "tam"
görünüyordu. Artık eksik sesler `EKSIK_SES_UYARISI.txt` olarak pakete yazılır
ve bildirim açıkça söyler. Ayrıca her tuş vuruşunda çalışan `segCounts` +
`renderOverview` 250 ms geciktirildi (ölçüm: 500 bölümde 8,5 ms/tuş → 0).

### v2.85 — Rapor çıktısı denetimi (tamamlandı)

Mahkemeye giden belge denetlendi. **Gerçek hata:** şema konuşmacıyı `label`'da
tutuyor, arayüzün 15+ yeri `name` okuyor; yükleme sonrası eşleşme kopuyor ve
raporda `S1` kodu kayboluyordu. `normalizeSpeaker` artık `name` ve `label`
alanlarını tek kaynaktan türetir. Ayrıca rapor testi yalnız metne bakıyordu;
ZIP yapısı, XML dengesi, kaçış ve Türkçe karakter denetimi eklendi
([Senaryo 11], 20 kontrol).

### v2.84 — Veri güvenliği denetimi, canlı veri (tamamlandı)

Bilirkişi gerçek veriye geçti; denetim veri kaybına odaklandı. Dört kritik hata:
(1) `loadState` içindeki tek hata **tüm arşivi** siliyordu (kanıtlandı), (2)
`beforeunload` yoktu, son 400 ms kayboluyordu, (3) iki sekme birbirinin işini
eziyordu (kanıtlandı), (4) dışa aktarma yalnız **aktif** dosyayı yedekliyor,
diğerleri sessizce dışarıda kalıyordu (kanıtlandı). Dördü de düzeltildi;
`surum-testi` [10] ve `sema-testi` [3d] korur.

### v2.83 — Otomatik çıktı ayrımı + depolama iki havuz (tamamlandı)

Harici bir analiz metni geldi. Maddelerin çoğu zaten vardı; iki gerçek boşluk
düzeltildi. (1) Model çıktısı yalnız `history`'de tutuluyor ve 10 sürümden
sonra siliniyordu; artık `asrText/asrModel/asrAt` alanlarında **değişmez**
saklanır ve arayüzde karşılaştırma bloğu olarak görünür. (2) Depolama
göstergesi model önbelleğini dava verisiyle topluyordu; artık iki havuz ayrı
yazılır. Test: `sema-testi` [3c], `birim-testleri` [16].

### v2.82 — Yerleşim düzeltmeleri (tamamlandı)

Kullanıcı görsel bozulma bildirdi. Headless Chromium ile **ölçülerek** üç hata
bulundu: (1) `sd-field > span` kuralı yeni konuşmacı seçicisini de yakalıyordu
(seçim kutusu ve ＋ düğmesi etiket stiline düşüyordu), (2) `.compact-bar`
`nowrap+hidden` olduğu için yeni filtre çipi ve toplu onay düğmesi kesiliyordu,
(3) dalga çubuğu `wrap` ile **5 satıra** kırılıyordu (ölçüm: 84px). Dalga
çubuğu iki satırlı grid'e çevrildi (84px → 57px). `tasarim-testi.mjs`
[Yerleşim] bu sınıfı korur.

### v2.81 — Çözümleme profilleri (tamamlandı)

Kullanıcı şive, kıcırtı ve malzeme sesi gibi farklı çözümlemeler istedi. Bunlar
**ayrı eğitilmiş model** gerektirir; depo öyle bir model içermez ve yapılmış gibi
gösterilmez. Bunun yerine aynı modelin yönlendirilebilir ayarı profil olarak
sunuldu (`ASR_PROFILES`): standart, şive/ağır aksan, gürültülü/kıcırtılı,
telefon/dar bant. Dil Türkçe ve görev transkripsiyon **sabit** kalır. Seçim
`akis.asrProfile` ile hatırlanır, rapora yazılmaz. Test: `birim-testleri.mjs`
[13] (19 kontrol; dil kilidinin bozulmadığını da doğrular).

### v2.80 — Hızlı onaya uygun filtresi + toplu onay (tamamlandı)

Kullanıcı: "otomatik onaylayabileceğimiz, doğrulukları yüksek olanları
belirleyelim". Model güven skoru vermediği için **uydurma doğruluk yüzdesi
üretilmez**; ölçüt yalnız gözlemlenebilir işaretlere dayanır (`segQuickCheck`):
anlamlı metin var mı, süre ≥1,2 sn mi, model tekrarı var mı, üst üste/anlaşılmaz
işaretli mi, öncekiyle çakışıyor mu. Sol panelde **Hızlı onaya uygun** filtresi
ve `✓ N hızlı onayla` toplu onay düğmesi eklendi. Toplu onay yalnız uygun
bölümlere dokunur, geri alınabilir, delil günlüğüne yazılır; onay yetkisi
kuralı (ikinci göz onaylayamaz) korunur. Test: `birim-testleri.mjs` [12].

### v2.79 — Konuşmacı standardı: rol/cinsiyet sessizce kayboluyordu (tamamlandı)

Kanıtlanmış **veri kaybı**: arayüz rol/cinsiyeti Türkçe etiket olarak yazıyordu
(`Davacı`, `Kadın`), şema ASCII kod bekliyordu (`complainant`, `female`). Etiket
kayda yazılınca `normalizeSpeaker` değeri `unspecified`'a düşürüyordu — her
yenilemede bilirkişinin girdiği rol ve cinsiyet siliniyordu.

Çözüm: standart konuşmacı kodu **S1, S2, S3…** (`assignSpeakerCodes`). Kod bir
kez verilir, değişmez; silinen konuşmacının kodu yeniden kullanılır. Bölümdeki
konuşmacı alanı serbest metin değil **listedit** (`S2 · Kiracı`); **＋** düğmesi
yeni konuşmacı ekler ve sıradaki boş kodu verir. Seçenek `value`'su kod, görünen
metin etikettir. Eski kayıtlar `normalizeSpeakerRole`/`normalizeSpeakerGender`
göç tablolarıyla kurtarılır. Raporun üç çıktısı `segSpeakerCell` ile tek
kaynaktan beslenir. Test: `sema-testi.mjs` [3b] (16 kontrol).

### v2.78 — Dinlerken bölme çizgisi bozulmuyor + A–B döngü (tamamlandı)

Kullanıcı: "dinlerken bölme çizgileri bozuluyor, tekrar düzeltmem gerekiyor"
ve "bir aralığı takip ederek dinlesek anlayamıyoruz".

İki gerçek hata:
- `nudgeBoundary` başlangıcı kaydırınca **bitişi de sessizce** taşıyordu;
  bölüm sıfır uzunlukta kalabiliyordu.
- Dalgaya **düz tıklamak** "en yakın sınırı" taşıyordu. Uzman dinlemek için
  tıkladığında bölme çizgisi bozuluyordu.

Çözüm: karşı sınır artık sürüklenmez (en az 0,1 sn kalır, nedenini söyler).
Düz tıklama yalnız **konuma gider**; sınırı taşımanın iki açık yolu var:
sınırı sürüklemek ya da **Alt+tıkla**. Yeni **A–B döngüsü** eklendi: yalnız
oynatmayı sarar, bölüm sınırlarına dokunmaz, kayda yazılmaz (oturumluk).
Test: `birim-testleri.mjs` [11] (11 kontrol).

### v2.77 — Belge koruması, buton hiyerarşisi, takip modu (tamamlandı)

Belge boşluğu bulundu: son 10 sürümün özellikleri OZELLIKLER.md'de yoktu.
Üç yeni bölüm eklendi; `surum-testi.mjs` artık 7 konuyu ve 4 yardım başlığını
denetliyor (yeni özellik belgeye yazılmazsa test kalır). 26 buton 5 renkli
aileye ayrıldı (onay yeşil, gözlem altın, yapısal mavi, yıkıcı kırmızı,
gezinme gri). Takip modu düzeltildi: `markTextFollow()` sağ paneldeki metni
canlı vurgular; bölüm dinlenince takip otomatik açılır. Model seçimi v2.73'ten
sonra hatırlanıyor (önce her açılışta öneri uygulanıyordu).

### v2.76 — Bölüm aralığını yeniden çözümle (tamamlandı)

Bölme sonrası metin kaybolabiliyordu. `retranscribeSegment()` eklendi: bölümün
başlangıç–bitiş aralığı ses dosyasından kesilir, yalnız o parça modele verilir;
diğer bölümlere dokunulmaz. Metin varsa onay sorulur, Ctrl+Z ile geri alınır,
eski metin geçmişe yazılır, işlem delil günlüğüne girer. Test [13]:
317 → 329.

### v2.75 — Geri alma (Ctrl+Z) + dalga kaydırma + bölme netliği (tamamlandı)

Geri alma hiç yoktu; yıkıcı işlemler kurtarılamıyordu. Her işlemden önce
anlık görüntü saklanır (son 20 adım), Ctrl+Z veya ↶ düğmesiyle geri dönülür.
Dalga: sürükle=sınır, Shift+sürükle=kaydır, tekerlek=zoom (üç işlev ayrı).
Bölme açıklığa kavuştu: aktif bölümü böler, metin yeniden çözümlenmez
(v2.74'teki paylaştırma kullanılır), bölünen bölümler "Kontrol bekliyor"a
döner. İpuçları ve Yardım ekranı güncellendi. Test [12]: 299 → 317.

### v2.74 — Bölme: metin paylaştırılıyor + tam noktadan bölme (tamamlandı)

Bölme `{...s}` ile metni iki tarafa kopyalıyordu: iki bölümde aynı metin
kalıyordu. `splitSegmentText()` eklendi: kelime zamanlaması varsa kesim
noktasına göre böler; yoksa oran tahminiyle kelime sınırından; hiçbiri
olmazsa kopyalar ve uyarır. Dalga üzerinde imleç zamanı gösterilir ve
"✂ Böl" düğmesi imlecin olduğu yerden böler. Bölünen bölümler "Kontrol
bekliyor"a döner, ayrı kimlik alır. Test [11]: 283 → 299.

### v2.73 — Veri 5 MB'lık yere sıkışmıştı; 10 GB'lık alana taşındı (tamamlandı)

Mimari hataydı: dava verisi localStorage'a (5 MB) yazılıyordu, oysa tarayıcı
kotası 10 GB. v2.72'de "küçültme" yanlış yaklaşımdı. Veri IndexedDB'ye
(`STATE_STORE`) taşındı; eski localStorage kaydı otomatik göç eder. Kalite
geri geldi: kelime zamanlaması yine saklanıyor (karaoke), geçmiş 3 → 10.
Üst barda "Depolama: X / Y (%)" göstergesi.

### v2.72 — Depolama bir davada doluyordu (%76 küçültüldü) (tamamlandı)

Üç suçlu ölçüldü: (1) `words` kelime zamanlaması kalıcı yazılıyordu (~320 KB),
(2) geçmiş 20 kayıt her biri tam metin (~770 KB), (3) v2.71'in
`previousSegments` yedeği bölümlerin tam kopyasını tutuyordu (dosyayı 2 katına
çıkarıyordu). Tek dava 3.74 MB (kota %75) idi. Çözüm: words yazılmaz, geçmiş
20→3, yedek yalnız metin. Sonuç: 1.25 MB → 0.30 MB (%76 küçük); 4 dava yerine
16 dava sığıyor.

### v2.71 — "Yeniden çözümle" tüm elle düzeltmeleri siliyordu (tamamlandı)

`m.segments = collected` mevcut bölümlerin üzerine yazıyordu: elle düzeltmeler
ve onaylar uyarısız siliniyordu. Artık elle düzeltme varsa onay sorulur, eski
bölümler `previousSegments`'e saklanır ve "Önceki bölümleri geri yükle"
düğmesiyle dönülebilir.

### v2.70 — Yarıda kalan çözümleme dosyaya yazılıyordu (tamamlandı)

`transcribing` ve `progress` geçici işlem durumları dosyaya yazılıyordu.
Çözümleme sürerken dışa aktarılan dosya, başka bilgisayarda açılınca sonsuza
kadar "%70 çözümlüyor" görünüyor, İptal çalışmıyordu (okuyan döngü yok).
`normalizeMaterial()` artık `transcribing`i `partial`/`pending`e çeviriyor;
`stripDerivedFields()` açılışta eski kayıtları da temizliyor. Test [7j]:
273 → 283.

### v2.69 — Veri güvenliği: sessiz kayıp önlendi + model hatırlanıyor (tamamlandı)

Depolama dolduğunda yalnız küçük bir yazı değişiyordu; kullanıcı yazmaya
devam edip veri kaybediyordu. Büyük uyarı şeridi + "Dışa aktar" düğmesi
eklendi. Üst barda yedek durumu göstergesi (hiç / güncel / 3+ gün eski).
Model seçimi `akis.model` ile saklanıyor; her açılışta öneri onu ezmiyor.
İçe aktarmada çözümleme korunuyor (ölçümle doğrulandı).

### v2.68 — Yardımcı kendi yazdığını göremiyordu (tamamlandı)

`applyTextEdit()` öneriyi `proposal`'a yazıyor, `text` değişmiyordu — doğru.
Ama textarea `s.text` gösteriyordu: yardımcı yazıyor, panel yenilenince kendi
yazdığını göremiyordu. "Hiçbir şey değişmiyor" hissi buydu. Artık ikinci göz
textarea'da öneriyi görür. Ayrıca: aynı dosya açıkken İçe aktar onay sorar
(kopya açacağını söyler), "Şu an çalışan" seçilince rol bildirilir
(onaylayabilir / öneri verir).

### v2.67 — Ekip çalışması akışı Yardım ekranına yazıldı (tamamlandı)

Akış hiçbir yerde yazmıyordu; kullanıcı tahmin ediyordu. Simülasyonla iki
yanlış anlama bulundu: (1) yardımcı "Onaylandı" basamaz — uygulama engeller,
(2) birleştirme için "İçe aktar" değil "⇄ Birleştir" kullanılır (içe aktar
kopya açar). 9 adımlı akış Yardım ekranına eklendi.

### v2.66 — Gözlemci onaylayabiliyordu (tamamlandı)

Rol tablosu ölçüldü: `observer` (Gözlemci) ikinci göz sayılmıyordu, TAM
YETKİLİYDİ. Ölçüm: gözlemcinin onayı birleşmede "approved" olarak kabul
edildi. Gözlemci sadece bakar; onayı adli belgede kabul edilemez.
`SECOND_EYES_ROLES`'a `observer` eklendi; `APPROVER_ROLES = [owner, expert]`
ve `canApproveRole()` tanımlandı; iki küme ayrık. Test [7i]: 250 → 273.

### v2.65 — Dosya bilgileri birleşmeye girmiyordu (tamamlandı)

`mergeCases()` yalnız 7 düz alanı birleştiriyordu; arayüzdeki 17 alanın 10'u
(parties/expert/assignment/report içinde) birleştirmeye hiç girmiyordu.
Ölçüm: yardımcının doldurduğu davacı, davalı, bilirkişi adı, sicil no, tarihler
KAYBOLDU — ne uygulandı ne çakışma bildirildi. İç içe gruplar eklendi. Kural:
boş alan dolar, ikisi de doluysa gelen yeniyse o alınır / değilse çakışma,
boş gelen dolu değeri asla ezmez. Test [7h]: 231 → 250 kontrol.

### v2.64 — Sol liste kaydırması geri geldi (tamamlandı)

`app.css:918` kuralı `max-height:none!important` taşıyordu; v2.63'teki
`max-height:62vh` onu ezemedi. Ölçüm: 200 bölümde liste 6816px uzuyor,
SCROLL YOK. `!important` ile sabitlendi: görünen 670px, içerik 6814px,
scroll ÇALIŞIYOR. Sağ detay da 78vh ile kendi içinde kayar.

### v2.63 — Panel iki sütuna bölündü; sabit yükseklik kaldırıldı (tamamlandı)

KÖK NEDEN: `#view-audio .seg-workspace { height: clamp(280px,52vh,620px) }`
panel ekranın %52'sine sabitlenmişti. İçerik 642px istiyor → her ekranda
taşıyordu (1080px'te 80px, 800px'te 226px). Önceki üç deneme bu yüzden
"bir türlü olmuyor"du. Sabit yükseklik kaldırıldı; panel iki sütuna bölündü
(sol: dalga/zaman/konuşmacı, sağ: metin, alt: onay+araçlar). Ölçüm: panel
642 → 415px, taşma yok, çakışma yok.

### v2.62 — Bölüm detayı sıfırdan; segment dalgası geri (tamamlandı)

v2.61'de zoom dalgası yanlışlıkla kaldırılmıştı; ana dalga tüm kaydı gösterdiği
için bölüm sınırlarını hassas ayarlamaya yetmiyordu ve elle saat yazmak
zorlayıcıydı. `attachSegWave()` eklendi: bölümün ±0,5 sn penceresinde
sürüklenebilir B/S sınırları, tekerlek zoom, canlı konum çizgisi. Yapı yeni
`sd-*` sınıf adlarıyla sıfırdan yazıldı; eski 21 CSS katmanı artık uymuyor.
Ölçümle doğrulandı: taşma yok, çakışma yok.

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
