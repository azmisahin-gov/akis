# Değişiklik Günlüğü

Bu dosya AKİS'in sürüm geçmişini özetler. Kayıtlar, uygulamanın geliştirme
sürecinde tutulan eski `VERSION.txt` dosyasından tekrarlar ayıklanarak
derlenmiştir. Önceki dosya tek bir sürüm başlığı altında yüzden fazla maddeyi
(yaklaşık 13'ü birebir tekrar) sıralıyordu; burada aynı bilgiler konuya göre
gruplanmıştır.

**Güncel sürüm: v2.59.** Sürüm numarası `MAJOR.MINOR` biçimindedir ve tek
kaynaktan gelir: `assets/app.js` içindeki `APP_VERSION`. Her güncellemede o
değer, bu dosyadaki yeni başlık ve `docs/YOL_HARITASI.md` birlikte artırılır.

Kayıtlar en yeniden en eskiye doğru sıralanır. Yol haritası:
[`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md).

## v2.59 — Onay çalışıyordu ama ekranda görünmüyordu (kritik)

KULLANICI: "Kontrol kısmında Onayla diyorum ya da Enter, değişmiyor. Hatta
orada ne değiştirsem değişmiyor."

### Bulunan gerçek hata

Kod iki farklı kod sözlüğü kullanıyordu:

```
Şema (schema.js) üretiyor : approved | inaudible | relisten | pending
Liste çizimi (app.js) arıyor: onaylandi | anlasilmadi | yeniden
```

`segReview()` daima **v3 ASCII** kod döndürüyor; `segItemHtml()` ise **v2
Türkçe** kodla karşılaştırıyordu. Sonuç:

- Onaylama **çalışıyordu** (veri doğru yazılıyordu)
- Ama listedeki rozet **hep "Bekliyor"** görünüyordu
- Sayaçlar ("Onaylandı 0") hiç artmıyordu
- Kullanıcı "değişmiyor" sanıyordu

Gerçek ölçüm (tarayıcıda): "Bekleyen 2 · Onaylandı 0" → Onayla → veri
`approved` oldu ama rozet hâlâ "Bekliyor" ve sayaç hâlâ "Onaylandı 0".

### Çözüm

Altı karşılaştırma v3 koduna çevrildi:
- `segItemHtml` rozetleri (`approved` / `inaudible` / `relisten`)
- Öncelik filtresi (`approved` atlanır)
- `inaudible` sayımları (2 yer)
- `checked` bayrağı (2 yer)

v2 kodları artık **yalnız** `REVIEW_LEGACY` göç tablosunda bulunuyor.

### Ek düzeltme

`approveActiveSegment()` bölüm yoksa sessizce dönüyordu; artık açıklayıcı
uyarı gösteriyor.

### Test

`sema-testi.mjs` [6c] bloğu eklendi (220 → 231 kontrol): uygulama kodunda v2
Türkçe kod karşılaştırması kalmadığı, rozetlerin v3 kodla eşleştiği ve
sayımların doğru olduğu denetlenir.

## v2.58 — "Onayla" sessizce başarısız oluyordu

KULLANICI: "Adım 7'de Onayla'yı seçtim ama olmadı."

### Bulunan hata

`approveActiveSegment()` bölüm yoksa **hiçbir şey yapmadan** dönüyordu:

```js
if (!segs.length) return;   // ← sessiz çıkış
```

Kullanıcı "✓ Onayla" düğmesine basıyor, ekranda hiçbir şey olmuyor, hata
sanıyor. Gerçek sebep: kayıtta henüz **bölüm yok** (çözümleme yapılmamış).

### Çözüm

Sessiz çıkışlar kaldırıldı:
- Bölüm yoksa: "Bu kayıtta onaylanacak bölüm yok. Önce çözümleme yapın veya
  elle bölüm ekleyin."
- Seçili bölüm yoksa: "Önce listeden bir bölüm seçin."

Kural: kullanıcı bir düğmeye bastıysa **her zaman** bir yanıt almalı. Sessiz
başarısızlık, hatadan daha kötüdür — kullanıcı sistemin bozuk olduğunu sanır.

## v2.57 — Teslim alma: kod ≠ etiket hatası + rapor uyarıları

### Bulunan gerçek hata (uçtan uca testte yakalandı)

v2.56'da teslim alma diyaloğu Türkçe **etiket** yazıyordu, şema ise ASCII
**kod** bekliyor:

```
Arayüz yazıyor : "USB flaş bellek"
Şema bekliyor  : "usb"
Sonuç          : validateCase → "origin.mediumType geçersiz"
```

Yani teslim bilgisi girilse bile kayıt yeniden yüklenince **geçersiz** oluyor
ve bilgi görünmez hâle geliyordu. Bu, v2.56'nın kendi özelliğini boşa
çıkarıyordu.

**Çözüm:** seçeneklerin `value` değeri ASCII kod (`usb`), görünen metin Türkçe
etiket (`USB flaş bellek`). Tabloya da etiket yazılır. Eski kayıtlarda kalmış
Türkçe değerler `normalizeMediumType()` ile koda çevrilir; `mediumLabel`,
`deliveredBy`, `deliveredAt` alanları korunur.

### Rapor öncesi yeni uyarılar

- **Teslim bilgisi eksik:** kaç kaydın ortam türü/teslim eden bilgisi yoksa
  bildirilir; rapora "—" olarak yazılacağı söylenir.
- **Zincir kırığı:** delil günlüğü doğrulanamayan kayıt varsa uyarılır. Bu
  adli bir uyarıdır; sessiz geçemez.

### Test

`sema-testi.mjs` [7g] bloğu eklendi (192 → 220 kontrol): Türkçe etiketin koda
çevrilmesi, kodun aynen korunması, boş/bilinmeyen değer, gerçek kaydın göçü
(etiket metni ve teslim eden korunur) ve her etiketin bir kodu olduğu.

## v2.56 — Delil zinciri gerçekten çalışıyor + teslim alma kaydı

KULLANICI: "USB'yi gösterip eklemiyoruz, sadece dosya ekliyoruz. Delil teslim
alma izi yanlış mı?" ve "delil zinciri var mı, güvenli mi?"

### Bulunan gerçek hata: zincir kırıktı

`AGENTS.md` şunu iddia ediyordu:

> "her günlük girdisi `logEntry()` ile üretilir (`prevHash`+`hash`). Elle
> `{at,event}` yazmayın; zincir kırılır ve `verifyLogChain()` hata verir."

Ölçüm (v2.55):

```
logEntry() çağrısı:       0
verifyLogChain() çağrısı: 0
Elle m.log.push:          8 yer
Gerçek günlük doğrulaması: KIRIK (hash uyuşmuyor)
```

Yani işlem günlüğü görünüyordu ama **kurcalama tespiti çalışmıyordu**.
Testler geçiyordu çünkü test `logEntry`'yi kendisi doğru çağırıyor, uygulamanın
onu kullanmadığını sınamıyordu. Adli belgede iddia edilen bir güvence
gerçekte yoktu.

### Çözüm

- **Tek yazma noktası:** `logEvent(m, event, detail)`. Sekiz ham `m.log.push`
  çağrısının hepsi buna bağlandı; girdiler `logEntry()` ile üretiliyor
  (`prevHash` + `hash` + `actor`).
- **Üç hâlli durum (`logChainState`):** `verified` / `legacy` / `broken` /
  `empty`. Eski (hash'siz) kayıtlar "kurcalanmış" diye **suçlanmaz**; ama
  "doğrulandı" da denmez. Yanlış suçlama adli belgede kabul edilemez.
- **Eski kayıt göçü (`upgradeLogChain`):** açılışta hash'siz günlükler zincire
  bağlanır. Girdi metinleri **değiştirilmez**; yalnız `prevHash`/`hash` eklenir.
- **Günlük diyaloğunda durum kutusu:** kullanıcı zincirin doğrulanıp
  doğrulanmadığını, kırıksa kaçıncı girdide olduğunu görür.
- **Girdilerde `actor`:** kimin yaptığı yazılır (seçili ekip üyesi).

### Teslim alma kaydı

Dosya eklemeden **önce** "Delil teslim alma" diyaloğu açılır: ortam türü
(USB/CD/DVD…), ortam etiketi/seri no, teslim eden, teslim tarihi, kayıt
cihazı. Aynı ortamdan gelen dosyalar **tek beyanı** paylaşır — adli pratikte
"delil teslim alındı" işlemidir, dosya sayısı kadar tekrarlanmaz. Yeni USB
gelirse yeni teslim alma açılır. "Sonra dolduracağım" denebilir.

**Teknik sınır (dürüst not):** tarayıcı USB'nin seri numarasını, etiketini
veya sürücü harfini **göremez**. Bu bir izin sorunu değil, tarayıcı güvenlik
sınırıdır; WebUSB API'si de yalnız USB *aygıtlarına* erişir, dosya sistemi
üzerinden gelen bir klasörün hangi ortamda olduğunu söylemez. Bu yüzden ortam
bilgisi **uzman beyanıdır** ve öyle etiketlenir. Otomatik alınabilecekler
(dosya adı, boyut, SHA-256, eklenme zamanı) zaten otomatik alınır.

### Test

`sema-testi.mjs` [6b] bloğu eklendi (179 → 192 kontrol): uygulamada elle
günlük yazımı kalmadığı, `logEvent`'in `logEntry` kullandığı, açılışta göçün
çalıştığı, üretilen günlüğün doğrulandığı, kurcalamanın yakalandığı, eski
kaydın "legacy" (kırık değil) sayıldığı ve göçün girdi metnini koruduğu.

## v2.55 — Kaynağı tanımsız düzenleme onaylı sayılmaz

KULLANICI: "Yardımcı ekip bölümünü doldurması gerekiyor mu, yoksa içe/dışa
aktar yeter mi? Otomatik olur mu?"

Cevap: **otomatik değildi.** Ölçüldü: yardımcı ekip bölümünü doldurmadan
düzeltme yapıp onaylarsa, eski kod bunu kabul ediyordu:

```
metin : "yardimcinin duzeltmesi"
review: approved   ← ONAY SIZDI
oneri : null
```

Yani bilirkişi korunduğunu sanıyordu ama korunmuyordu. Sessiz hata — en
tehlikeli tür.

### Kural

Gelen dosyanın **ekip listesi doluysa** ve düzenleyen o listeyle eşleşmiyorsa,
o düzenlemenin **onayı kabul edilmez**. Bölüm "Kontrol bekliyor"a çekilir ve
çakışma olarak bildirilir.

Ekip listesi **boşsa** (tek kişilik dosya) eski davranış korunur; yoksa
bilirkişi kendi onayını veremezdi.

### Ek düzeltmeler

- **Dışa aktarmadan önce soru:** ekip doluysa ve "Şu an bu bilgisayarda
  çalışan" seçilmemişse uygulama sorar. Seçim yapılmazsa dışa aktarma
  yapılmaz ve dosya bilgileri çekmecesi açılır.
- **İkinci göz metni öneriye çevrilir:** bozuk/eski kayıtta ikinci gözün
  yazdığı metin ana metne girmişse, birleştirmede öneriye dönüşür.
- **Önizleme birleştirmeyle aynı kararı verir:** tanımsız onay önizlemede de
  çakışma olarak görünür. (Burada bir hata vardı: `out.conflicts` sonda
  yeniden atanıyordu ve tanımsız onayları siliyordu; düzeltildi.)

### Test

`sema-testi.mjs` [7f] bloğu eklendi (168 → 179 kontrol): ekip boşken onay
korunur, bilirkişinin onayı korunur, tanımsız onay reddedilir, önizleme aynı
kararı verir, ikinci göz metni öneriye dönüşür.

## v2.54 — İkinci göz: yardımcı önerir, bilirkişi onaylar

KULLANICI: "Gönüllü olarak bilirkişiye yardım etmek istiyorum. Tüm materyaller
onun bilgisayarında; biz anlık olarak düzeltmesi gereken kısımlara ikinci bir
göz olarak bakacağız. Kararı veren yine bilirkişinin kendisi. Tek fark: ikisi
de ayrı bilgisayar kullanıyor."

### Bulunan risk

Rapor tablosunda "Kontrol" sütunu var ve oraya `reviewLabel()` yazılıyor. Yani
yardımcı bir bölümü onaylarsa rapor **"Onaylandı"** diyordu. Bu, senaryonun
tersidir: kararı bilirkişi verir. Onaysız bir düzeltme adli belgede onaylı
görünemez.

### Çözüm: rol ayrımı + öneri

**Roller.** `assistant` (Yardımcı) ve `reviewer` (Kontrol eden) "ikinci göz"
sayılır (`SECOND_EYES_ROLES`). `expert` ve `owner` değildir.

**Kim çalışıyor.** Dosya bilgileri çekmecesindeki ekip bölümüne "Şu an bu
bilgisayarda çalışan" seçicisi eklendi (`case.lastEditedBy`). Seçilen kişi metin
geçmişine yazılır.

**Öneri.** İkinci göz metni yazdığında **ana metin değişmez**. Düzeltme
`segment.proposal = { text, by, at, baseText }` olarak saklanır. Bölüm detayında
öneri bandı görünür: "Şu anki metin" / "Önerilen" ve **Kabul et / Reddet**.

**Onay yetkisi.** İkinci göz:
- `Onayla` düğmesini kullanamaz (uyarı gösterilir),
- kontrol listesinde "Onaylandı" seçemez ("Anlaşılmadı" ve "Yeniden dinlenecek"
  serbesttir; onlar gözlem, onay değil),
- öneriyi kendisi kabul veya reddedemez.

**Kabul edilen öneri.** Bilirkişi kabul ederse metin yazılır, öneri silinir,
kontrol durumu **"Kontrol bekliyor"**a çekilir (metin değişti, yeniden
dinlenmeli). Geçmiş kaydı tutulur.

**Birleştirmede.** Öneri metne karışmaz, ayrı taşınır (`at` daha yeni olan
kazanır). Önizlemede "Alınacak ikinci göz önerisi" satırı görünür.

**Güvenlik ağı.** Birleştirme sonunda, "onaylandı" diyen ama son düzenleyeni
ikinci göz olan bölümler **"Kontrol bekliyor"**a çekilir ve işlem günlüğüne
yazılır. Eski kayıtlarda veya yanlış seçimde oluşmuş onay sızamaz.

### Test

`sema-testi.mjs` [7e] bloğu eklendi (153 → 168 kontrol): rol tanımı, önerinin
ana metni değiştirmemesi, birleştirmede taşınması, önizleme sayacı, ikinci
gözün onayının geçersiz sayılması, bilirkişinin onayının korunması ve bozuk
önerinin yok sayılması.

## v2.53 — Yardımcı düzeltmesi birleştirmede korunuyor (kritik düzeltme)

KULLANICI: "Bilirkişi kendi bilgisayarında gerekli tüm davaları oluşturmuş,
çözümlemesini de yapmış; ama tüm işleri kendi tamamlayamıyor. Yardımcısı başka
bilgisayardan metin kontrolü yapacak, belki başka alanları da düzeltecek."

### Bulunan gerçek hata

`mergeCases()` metin çakışmasında **her zaman yerel metni** koruyordu. Sonuç:
yardımcının düzelttiği metin birleştirmede **sessizce kayboluyordu**. Kontrol
durumu (onay) korunuyordu ama metin eski hâline dönüyordu — yani "onaylandı"
damgası **yanlış metne** vuruluyordu. Ölçümle doğrulandı (düzeltmeden önce):

```
A: "merhaba dünya" (taslak)   B: "Merhaba dünya." (düzeltilmiş + onaylı)
birleştirme sonucu: "merhaba dünya"  ← B'nin düzeltmesi KAYBOLDU
```

İkinci ve daha temel hata: deşifre bölümleri **kimliksiz** üretiliyordu
(`parseAsrResult` yalnız `{start, end, text}` döndürüyordu). Kimlik ilk yeniden
yüklemede rastgele atandığı için iki bilgisayarda **ayrı kimlikler** oluşuyor,
birleştirme bölümleri hiç eşleştiremiyordu. Bu yüzden düzeltme, çakışma
mantığı düzeltilse bile uygulanamazdı.

### Çözüm

**1. Kimlik üretim anında verilir.** `parseAsrResult`, elle bölüm ekleme, ikiye
bölme ve paragraf oluşturma artık `newId('sg')` ile kimlik üretir. Böylece
`.akis` paketi gidiş-dönüşünde kimlik korunur ve iki taraf aynı bölümü görür.
İkiye bölmede iki parçaya **ayrı** kimlik verilir (eskiden aynı kimlik iki
parçaya kopyalanıyordu).

**2. Düzenleme işareti (`textRev`).** Bir metne insan eli değdiğinde bölümün
`textRev` alanı 1 olur. Birleştirmede metinler farklıysa:

| Durum | Sonuç |
|---|---|
| Yalnız gelen taraf düzenlemiş | Gelen metin alınır (yardımcı düzeltmesi korunur) |
| Yalnız yerel taraf düzenlemiş | Yerel metin korunur, gelen metin geçmişe yazılır |
| İki taraf da düzenlemiş | **Sessiz seçim yok**; çakışma olarak bilirkişiye bildirilir |
| İkisi de dokunmamış, metin farklı | **Sessiz seçim yok**; çakışma olarak bildirilir |

Ölçüt sayacın **büyüklüğü değil, sıfırdan farklı olmasıdır**. Böylece çok yazan
taraf haksız yere kazanmaz. Kaybeden metin silinmez; bölümün metin geçmişine
(`history`) yazılır ve geçmiş düğmesinden görülebilir.

Neden duvar saati değil: iki bilgisayarın saati kayabilir; işaret kaymaz.

**3. Onay metne bağlıdır.** Metin değiştiğinde kontrol durumu gelen taraftan
alınır; eski onay yeni metne taşınmaz. "Onaylandı" damgası hiçbir zaman
onaylanmamış bir metnin üstünde kalmaz.

**4. Yeniden çözümleme korunuyor.** Kayıt yeniden çözümlenmişse ve yerelde elle
düzeltilmiş bölüm varsa, birleştirme bunu **sessizce ezmez**: çakışma bildirir
ve bölümleri çoğaltmaz (kimlikler tutmadığı için her bölüm "yeni" sanılırdı).

**5. Yardımcı yalnız metni değil, diğer alanları da düzeltebilir.** Rapor
metinleri (yöntem, sınırlılık, sonuç), görevlendirme metinleri, dosya alanları
ve soru cevapları da birleştirmeye girer. Boş alan her zaman doldurulur; iki
dolu farklı değerde gelen dosya daha yeniyse o alınır, değilse çakışma
bildirilir.

**6. Önizleme birleştirmeyle aynı kararı verir.** `compareCases()` artık
otomatik çözülecek ile gerçek çakışmayı ayırır; diyalogda "Otomatik alınacak"
satırları görünür.

### Yan düzeltmeler

- Yinelenen `focusin`/`focusout` dinleyicileri kaldırıldı (metin geçmişi iki kez
  yazılıyordu).
- `compactHistory()` artık `actor` alanını da koruyor.
- `__editSnapshot` gibi oturum içi geçici alanlar kayda ve dışa aktarıma
  girmiyor.

### Test

`tools/sema-testi.mjs` [7c] ve [7d] blokları eklendi (129 → 153 kontrol):
yardımcı düzeltmesinin korunması, onayın doğru metne taşınması, iki taraflı
düzenlemede sessiz seçim yapılmaması, önizleme uyumu, yeniden çözümlemede
çoğalma olmaması ve kimliğin paket gidiş-dönüşünde korunması.

## v2.52 — Ekip çalışması: dosya birleştirme

KULLANICI: "İki kişiyiz; bazen bir davaya iki bilirkişi atandığını gördüm.
Hazırlık için yapacağız, zorunlu değil."

### Model: dosya tabanlı birleştirme (sunucu yok)

Her bilirkişi kendi `.akis` dosyasında ilerler; sonra dosyalar birleştirilir.
Sunucu, hesap, e-posta entegrasyonu veya internet gerekmez. Dosya nasıl
gönderilirse gönderilsin (ağ paylaşımı, USB, e-posta) çalışır.

**Neden eşzamanlı (WebRTC) düzenleme değil:** Adli bilişimde asıl soru "bu
metni kim doğruladı?"dır. Aynı bölümü iki kişi aynı anda yazarsa bu soru
yanıtsız kalır. Ayrıca WebRTC'de kimlik doğrulama yoktur (sinyal MITM'e açık),
çevrimiçi olma zorunludur ve TURN sunucusu gerekebilir. Dosya birleştirme bu
sorunların hiçbirini taşımaz; bütünlük zaten SHA-256 ile kanıtlanır.

### Ne eklendi

- Üst barda **⇄ Birleştir** düğmesi: gönderilen `.akis` paketini açar.
- **Karşılaştırma önizlemesi** (`compareCases`, saf fonksiyon): birleştirmeden
  ÖNCE ne değişeceğini gösterir — yeni kayıt, değişen kayıt, yeni bölüm,
  çakışan bölüm, doldurulacak cevap, eklenecek ekip üyesi.
- **Çakışma ekranı:** farklı metinler yan yana gösterilir. Birleştirmede yerel
  metin korunur; gelen metin kaybolmaz, işlem günlüğüne yazılır.
- Birleştirme **kimlik (id) ile** yapılır: aynı bölüm iki tarafta da varsa
  sessizce ezilmez.
- Gelen paketteki ses dosyaları saklanır; aynı kayıt iki kez yazılmaz.
- Sonuç `mergeLog`'a yazılır (kaynak, uygulanan değişiklik, çakışma sayısı).

### Test

`tools/sema-testi.mjs` [7b] bölümü eklendi (114 → 129 kontrol): önizlemenin
doğru sayması, önizlemenin **hiçbir şeyi değiştirmemesi**, kendisiyle
karşılaştırmada çakışma olmaması, boş girdinin çökertmemesi.

Gerçek `.akis` paketleriyle uçtan uca doğrulandı: çakışan bölüm yerel metinle
korundu, yeni kayıt ve bölüm eklendi, boş soru cevabı dolduruldu, ekip üyesi
eklendi, `mergeLog` yazıldı.

### Sınır (dürüstçe)

Bu bir **eşzamanlı** çalışma değildir: iki kişi aynı anda aynı dosyada
düzenlemez. Sırayla çalışırlar ve dosyaları birleştirirler. Aynı bölümü ikisi
de düzenlerse çakışma ekranı çıkar ve kararı uzman verir.

## v2.51.1 — Şema tek geçerli yapı; yeni vaka akışı düzeltmesi

KULLANICI: "Bundan sonra tek geçerli şemamız yapımız bu olacak. Repoda
dokümanlarda hatalı bir bilgi varsa kaldır, düzelt. Artık yeni davaya
başlayacağız, tekrar kontrol et, sürüm bilgilerini kontrol et."

### Tek geçerli yapı ilanı ve denetimi

`assets/schema.js` (v3) depodaki **tek geçerli veri yapısı** olarak sabitlendi.
Yanlış/eski bilgi taşıyan belgeler düzeltildi:

- `docs/MIMARI.md`: "app.js tek dosyadır" ifadesi yanlıştı — `schema.js`,
  `tokens.css`, `reading-layer.css` ayrı dosyalar. Dosya düzeni ve katman
  açıklaması güncellendi; şemanın tam ağacı ve değişmez kuralları eklendi.
- `docs/OZELLIKLER.md`: "Veri şeması (v3) — tek geçerli yapı" bölümü eklendi;
  çalışma dosyası yönetimi yeni vaka akışına göre güncellendi.
- `docs/YOL_HARITASI.md`: v2.51 ve v2.50 başlıkları eklendi.

### Testle kilitlendi

`tools/sema-testi.mjs` iki yeni bölüm kazandı (87 → 114 kontrol):

- **[9b] freshCase eşlemesi:** uygulamanın kendi oluşturucusu şemayı ve düz
  alan eşlemesini kuruyor mu.
- **[10] Tek geçerli yapı:** `schema.js` var mı, `app.js` onu import ediyor mu,
  ikinci bir şema tanımı yok mu, belgeler v3'ü anlatıyor mu, "app.js tek
  dosyadır" gibi eski ifade kaldı mı.

### Tarayıcıda bulunan gerçek hata (düzeltildi)

`freshCase()` eşleme tanımlayıcılarını (`defineCaseMirrors`) kurmuyordu.
Sonuç: **yeni dosyada forma yazılan mahkeme/dosya no/taraf bilgisi kayboluyordu.**
Eski kayıtlar `loadState` üzerinden geçtiği için sorun görünmüyordu; yalnızca
yeni oluşturulan dosyada ortaya çıkıyordu. Düzeltildi; test [9b] bunu artık
yakalıyor.

### Sürüm denetimi

Tüm sürüm izleri tarandı: `APP_VERSION` (2.51), `index.html` dört `?v=`
parametresi, README, OZELLIKLER, AGENTS, YOL_HARITASI, CHANGELOG — hepsi aynı.
Kalan `v2.49`/`v2.50` atıfları yalnız tarihsel bölüm başlıkları (doğru).

## v2.51 — v3 veri şeması: kimlik, kod, delil zinciri, ekip

KULLANICI: "Kullandığımız veri yapısını ciddi bir şekilde gözden geçir. Sıfırdan
başlıyoruz, eski verileri kullanmayacağız. Şemamız doğru mu, düzenli mi, daha
sonra genişletmek istesek sıkıntı olur mu?" + "Yeni vaka oluştururken düzenli
bir şekilde oluşturabilelim, gerektiğinde ortak başka bilirkişilerle de
çalışabilelim."

### Ölçülen sorunlar (v2 şeması)

| Sorun | Sonuç |
|---|---|
| Bölüm ve sorunun kimliği yoktu; dizi indeksiyle adreslenirdi | Sıralama değişince kayıt yanlış bölüme bağlanır |
| Kalıcı veri ile oturumluk veri karışıktı (`progress`, `uiTab`, `activeSeg`) | Gereksiz şişme, yeniden yüklemede garip durum |
| Durum Türkçe metinle karşılaştırılıyordu (`m.status === 'Çözümleme sürüyor'`) | Metin değişince mantık sessizce bozulur |
| Konuşmacı bölümde AD ile tutuluyordu | Ad değişince bağ kopar |
| Delil günlüğü serbest metindi | "Sonradan değiştirilmiş" iddiası ölçülemez |
| Sürüm alanı yoktu | Genişletmede göç yolu bilinmez |

### Yeni mimari: `assets/schema.js`

Şema ayrı dosyada, tarayıcıya bağımlı olmayan **saf fonksiyonlar**. Böylece
hem üretimde hem testte aynı kod çalışır (kopya yok).

- **Kimlik:** her dosya/kayıt/bölüm/soru/konuşmacı/ekip üyesi `id` taşır.
  Referanslar id ile kurulur: `segment.speakerId`, `question.evidence[]`.
- **Kod ≠ etiket:** durum/rol/cinsiyet/ortam kodları ASCII sabit
  (`pending`, `approved`, `inaudible`…); Türkçe metin `STATUS_LABEL` gibi tek
  yerden türetilir. Kod değişmez, etiket serbestçe değişir.
- **İç içe yapı:** `parties{}`, `assignment{}`, `expert{}`, `report{}`.
  v2'nin 168 düz alan erişimi için saydam eşleme (`defineCaseMirrors`)
  kuruldu: `c.plaintiff` ↔ `c.parties.plaintiff` her zaman aynı değeri verir.
- **Delil zinciri:** her günlük girdisi `prevHash` + `hash` taşır.
  `verifyLogChain()` kurcalamayı ve girdi silinmesini tespit eder.
- **Birleştirme:** `mergeCases()` iki kopyayı id ile birleştirir; metin
  çakışmasını **sessizce ezmez**, raporlar.
- **Genişletme:** bilinmeyen alan korunur; `normalizeCase()` eksik alanı
  varsayılanla tamamlar, çökertmez.

### Ekip (ortak çalışma)

Dosya çekmecesine "04 — İnceleme ekibi" bölümü eklendi: ad, görev (dosya
sorumlusu / bilirkişi / yardımcı / kontrol eden / gözlemci), sicil, kurum.
Ekip bilgisi **rapora ve UDF/DOCX çıktısına girmez**; iş bölümü ve birleştirme
atfı içindir. Bu, "rapor bilirkişi adına yazılır" ilkesini bozmaz.

### Göç ve uyumluluk

Eski veri kullanılmayacak olsa da şema **çökertmez**: `normalizeCase()` v2
kaydını okur (düz alan → iç içe, `checked` → `approved`, ad → `speakerId`,
`basis` → `basisNote`) ve kayıpsız v3'e çevirir. `segReview()` v2 Türkçe
anahtarlarını da tanır.

### Düzeltilen gerçek hatalar (tarayıcıda bulundu)

- Kayıt bilgilerinde "Durum" ham kod (`pending`) gösteriyordu → etiket.
- Örnek veri yüklendikten sonra materyal listesi tazelenmiyordu (istatistik
  3 kayıt, liste 0 kayıt) → `await renderAudioList()`.

### Test

`tools/sema-testi.mjs` eklendi: **87 kontrol**. Boş varlıklar, kimlik
benzersizliği, kod↔etiket bütünlüğü, v2→v3 göçü kayıpsızlığı, doğrulayıcının
gerçek hataları yakalaması, delil zinciri kurcalama tespiti, birleştirme
çakışma raporlaması, zaman biçimi.

Testler artık şemayı **kopyalamıyor**, gerçek `schema.js`'i sandbox'a enjekte
ediyor. Toplam: 175 birim + 87 şema + rapor tutarlılığı + sürüm + tasarım.

## v2.50 — Okuma katmanı: tema, tipografi, kontrast

KULLANICI: "Bu saatlerce bu sesleri inceleyecek güzelim kadın ya da erkek
bilirkişi için uygulamadaki tüm tasarımı gözden geçirelim; onun en rahat
edeceği şekilde hazırlayalım. Gerekirse tema seçenekleri verelim."

Önce ölçtüm, sonra düzelttim. Bulunan tasarım borcu:

| Sorun | Ölçüm |
|---|---|
| Punto çok küçük | 54 kural 9px, 49 kural 10px, 8 kural 8px, 2 kural 7px |
| Kontrast yetersiz | 16 metin renginin 11'i WCAG AA altı; yer tutucu 2.03:1 |
| Font yüklenmiyor | `Manrope` 20+ yerde çağrılıyor, depoda `@font-face` yok |
| Renk karmaşası | 202 farklı hex, 100 farklı metin rengi, 66 farklı gri |
| CSS yama çorbası | 21 yama bloğu; `.seg-list` 11×, `.seg-detail` 10×, 26 `!important` |
| Tema yok | Kullanıcı tercihi altyapısı hiç yoktu |

### Tasarım token sistemi (`assets/tokens.css`)

Tek kaynak: renk, tipografi, boşluk, yarıçap, gölge. Üç tema — **açık, koyu,
sepya** — ve her metin rengi WCAG AA (≥4.5:1) olacak şekilde hesaplanıp
doğrulandı:

- Açık: gövde 14.97:1, ikincil 8.70:1, etiket 5.93:1
- Koyu: 14.15 / 9.72 / 6.48
- Sepya: 13.10 / 8.01 / 6.05

Punto ölçeği 11px'te başlar (eskiden 7px'e iniyordu). Yoğunluk (rahat/sıkı) ve
yazı boyutu (normal/büyük/çok büyük) ayrı tercihler. `prefers-reduced-motion`
ve `prefers-contrast: more` desteklenir.

### Tema seçici

Ayarlar çekmecesinin en üstünde "Görünüm" paneli: üç tema, iki yoğunluk, üç
yazı boyutu. Seçim `localStorage`'da saklanır; `index.html`'deki küçük satır
içi betik tercihi **ilk boyamadan önce** uygular (FOUC yok). Seçenekler
`role="radiogroup"` + `aria-checked` ile ekran okuyucuya da bildirilir.

### Okuma katmanı (`assets/reading-layer.css`)

Eski kuralları tek tek kovalamak yerine en sonda gelen tek tutarlı katman:

- Tüm 8-10px metinler 11px tabana çekildi; deşifre metin alanı 14px'e çıktı
  (saatlerce yazılan alan), satır aralığı 1.7.
- Yer tutucu kontrastı 2.03:1 → 5.93:1.
- `Manrope` referansları temizlendi; başlıklar artık yüklenen arayüz fontuyla
  çiziliyor (önceden rastgele sistem fontu kullanılıyordu).
- Zaman kodu eş aralıklı (tabular) fonta alındı; rakamlar hizalı okunuyor.
- Odak halkası, kaydırma çubuğu ve uyarı kutuları temaya bağlandı.
- Uyarılar yalnız renkle değil, metin + kenarlıkla da ayrışıyor (renk körlüğü).

### Rapor kâğıdı temadan bağımsız

Rapor önizlemesi basılı belgeyi temsil eder. Koyu temada bile kâğıt açık
kalır (ayrı `--paper-*` tokenları); yazdırmada her tema beyaza çevrilir.
Tema yalnız ekranı etkiler; UDF/DOCX çıktısı değişmez.

### Doğrulama

`tools/tasarim-testi.mjs` eklendi: kontrast oranlarını yeniden hesaplar, punto
alt sınırını denetler, tema tokenlarının varlığını ve okuma katmanının yüklenme
sırasını sınar. Testler: 169 birim + rapor tutarlılığı + sürüm + tasarım.

## v2.49 — Rapor bilirkişi adına: uygulama kimliği çıktıdan çıkarıldı, seviye ölçümü eklendi

Rapor, bilirkişinin bilimsel aracıyla ürettiği bir belgedir; belgenin kendisi
bilirkişi adına yazılır ve aracın varlığından söz etmez. Bu sürüm o ilkeyi
çıktının her yerinde uygular ve 56.12 uzmanlık alanının gerektirdiği eksik
ölçümü (ses seviyesi) tamamlar.

### Rapor metinlerinden uygulama kimliği çıkarıldı

- Rapor alt bilgisindeki "AKİS çalışma çıktısı" ifadesi kaldırıldı; alt
  bilgi yalnızca dosya numarası ve rapor tarihini taşır.
- Yöntem metnindeki "uygulama depolamasında tutulur" ve "tarayıcı belleğine
  alınarak işlenir" ifadeleri, aracın adını anmayan teknik anlatımla
  değiştirildi (dosya baytları değiştirilmeden saklanır, SHA-256 hesaplanır,
  çözümleme çalışma kopyası üzerinde yürütülür).
- Konuşmacı ve köken girişlerindeki "uygulama … tespit etmez" kalıbı
  "kendiliğinden tespit edilmemiştir" biçimine çevrildi; sınır beyanı korunur,
  özne bilirkişi olur.
- UDF tablo adlarındaki "AkisTable" öneki "Tablo" olarak nötrleştirildi.
- Kapak üst satırı ve Word üst bilgisi artık sabit "56.12" yerine dosyada
  girilen uzmanlık alanı kodunu gösterir (`expertFieldShort`).

### Ses seviyesi ve kırpılma ölçümü (yeni araç)

- `analyzeLevels`: tepe ve RMS düzeyi (dBFS), tepe kırpılma oranı (en az üç
  ardışık tam ölçek örneği kuralıyla), gürültü tabanı ve sinyal/gürültü oranı.
  Saf fonksiyon; birim testleriyle sınanır.
- Analiz sekmesine "Seviye ölçümü" paneli ve ölçüm düğmesi eklendi; sonuç
  kayda bağlanır ve işlem günlüğüne yazılır.
- Rapor: "Ses seviyesi ve kırpılma ölçümü" bölümü HTML, DOCX ve UDF
  çıktılarında aynı tek kaynaktan (`levelRowsForCase`) üretilir. Ölçüm
  yapılmamış kayıt tabloya **girmez**; yapılmayan ölçüm rapora yazılmaz.
- İnceleme özetine "Seviyesi ölçülen kayıt" satırı eklendi.

### Dinleme yardımcısı düzeltmesi (v2.48 devamı)

- Filtre açıkken kart yeniden çizildiğinde ses grafiği yeni oynatıcıya
  bağlanmıyordu: arayüz "filtre açık" gösterirken ses özgün hâliyle çalıyordu.
  Artık kalıcı filtre her çizimde yeniden uygulanır (gürültü kapısı dahil).
- Dinleme filtresi seçimine erişilebilir ad eklendi (`aria-label`).
- Taşıma sırasında düşen mesleki sınır cümlesi ("Kaynak ayrıştırma …
  yapılmaz") geri getirildi.
- Analiz sekmesinde kalan ölü CSS kuralları ve yanlış kalan yorumlar
  temizlendi.

### Sürüm disiplini

- v2.32–v2.48 arasında `APP_VERSION` 2.31'de kalmış, yalnız `?v=` parametresi
  artmıştı. Sürüm tek kaynaktan yeniden hizalandı: `APP_VERSION`,
  `CHANGELOG`, `YOL_HARITASI`, README, OZELLIKLER ve AGENTS aynı numarayı
  gösterir.
- `tools/surum-testi.mjs` eklendi: sürüm bir yerde artırılıp başka yerde
  unutulursa test kalır. `tools/test.sh` artık üç betiği çalıştırır.

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

## v2.27–v2.31 — Arayüz yenilemesi (beş faz)

Kullanıcı geri bildirimi: "çok güzel özellikler var ama dağınık, her yerde çok
yazı var". Sayfa değiştirme yerine **tek çalışma alanı + çekmeceler** düzenine
geçildi. Tüm `id`/`data-*` işaretleri korundu; deşifre/model/rapor mantığı
değişmedi.

### v2.27 — Kabuk
- 264px kenar çubuğu → **68px dar ikon rayı** (ikon + kısa etiket, aktif
  göstergesi, ses kaydı rozeti).
- Çalışma dosyası seçici ve dosya adı **üst bara** taşındı.
- **Alt durum çubuğu**: dosya · kayıt · bölüm · denetim % · yüklü model + GPU/CPU.
- Odak modu düğmesi ikona indirildi; duyarlı (≤900px etiket gizli, ≤640px alt sekme).

### v2.28 — Ayarlar çekmecesi
- Ses kayıtları sayfası 6 dikey bloktan **3'e** indi (yükleme + liste + detay).
- Model ayarları, toplu çözümleme ve depolama **sağ çekmeceye** taşındı;
  çalışma alanı kapanmıyor. Esc / × / karartma ile kapanır.

### v2.29 — Dosya çekmecesi
- "Dosya bilgileri" ayrı sayfa olmaktan çıktı; **çekmeceye** taşındı.
- Ray **5 → 4 öğe**: Özet · Ses · İnceleme · Rapor.
- Genel görünüm sadeleşti; tüm giriş noktaları (`switchView('case')` dahil)
  çekmeceyi açar.

### v2.30 — Metin temizliği
- "Nasıl çalışır" türü uzun açıklamalar **ⓘ ipucuna** taşındı (CSS-only,
  klavye erişilebilir).
- **Kritik uyarılar görünür kaldı**: mesleki sınır, "kontrol edilmedi",
  dolgu/çöp/tekrar, sessizlik, boş sonuç yönlendirmesi.

### v2.31 — Rapor tam ekran
- **⛶ Tam ekran**: kabuk gizlenir, önizleme genişler; ince çubukta
  "← Çalışmaya dön", "🖨 Yazdır", "UDF indir". Esc ile çıkılır.
- Yazdırmada çubuk gizlenir; çıktı temiz kalır.
