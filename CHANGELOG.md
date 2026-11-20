# Değişiklik Günlüğü

Bu dosya AKİS'in sürüm geçmişini özetler. Kayıtlar, uygulamanın geliştirme
sürecinde tutulan eski `VERSION.txt` dosyasından tekrarlar ayıklanarak
derlenmiştir. Önceki dosya tek bir sürüm başlığı altında yüzden fazla maddeyi
(yaklaşık 13'ü birebir tekrar) sıralıyordu; burada aynı bilgiler konuya göre
gruplanmıştır.

**Güncel sürüm: v2.103.** Sürüm numarası `MAJOR.MINOR` biçimindedir ve tek
kaynaktan gelir: `assets/app.js` içindeki `APP_VERSION`. Her güncellemede o
değer, bu dosyadaki yeni başlık ve `docs/YOL_HARITASI.md` birlikte artırılır.

Kayıtlar en yeniden en eskiye doğru sıralanır. Yol haritası:
[`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md).

## v2.103 — Yeniden çözümleme veriyi sormadan siliyordu (geri alınamaz)

CANLI VERİ. Bilirkişi: *"bazen yanlışlıkla tümünü çözümle diyebiliyoruz… her
anlamda sağlam ve geri dönebilmeliyiz."* Haklıydı.

### ÖLÇÜM (v2.102)

Model çıktısı olan ama **hiç dokunulmamış** 2 bölüm varken `transcribe()`
çağrıldı:

```
askConfirm çağrısı      : 0   → SORMUYOR
snapshotForUndo çağrısı : 0   → GERİ ALINAMAZ (Ctrl+Z yok)
previousSegments kaydı  : YOK → kayıt içi yedek yok
```

Sebep: koruma `edited.length` (elle düzeltilmiş **veya** onaylanmış bölüm)
koşuluna bağlıydı. Modelin ürettiği ama kimsenin dokunmadığı metin bu koşula
girmediği için **sessizce** siliniyordu.

### KULLANICI NE GÖRECEK

- **"Yeniden çözümle" / "Tüm kayıtları çözümle" artık her zaman sorar** —
  kayıtta bölüm varsa. Soruda kaç bölümün değişeceği ve kaçının elle
  düzeltilmiş / onaylanmış / henüz kontrol edilmemiş olduğu yazılır.
- **"Vazgeç" derseniz hiçbir şey silinmez.**
- Onaylarsanız eski bölümler saklanır ve **Ctrl+Z** ile geri alınabilir.
- **Toplu çözümlemede** kayıt başına ayrı diyalog yerine **tek soru** çıkar
  (kaç kayıtta kaç bölüm etkilenecek).

### KURAL (değişmez)

`reprocessPlan(segments)` → mevcut bölüm varsa `ask: true, snapshot: true`.
Sayıma dayalı dar koşul **tam olarak bu hatayı üretmişti**; koşul genişletilmek
yerine tek ve açıklanabilir kural konuldu: *bölüm varsa üzerine yazılacak
demektir, sor ve geri alma kaydı al.* Metni boş bölümler de emektir (elle
yerleştirilmiş zaman sınırları kaybolur), bu yüzden onlar da soruya dahildir.

### DOĞRULAMA

- `birim-testleri` **[33]** — 21 kontrol (tek kayıt + toplu yol).
- **Gerçek Chromium**: uygulamanın kendi deposuna (IndexedDB) bölümlü kayıt
  yazıldı, sayfa yenilendi, gerçek UI'dan "Yeniden çözümle" tıklandı →
  onay diyaloğu **çıktı**, "Vazgeç" sonrası 2 bölüm **korundu**.
- `bash tools/test.sh` → 490 birim + 396 şema + rapor/sürüm/tasarım.

## v2.102 — Yedek, geri yükleme ve birleştirme: sahte kayıt ve kopya birikmesi

CANLI VERİ. Bilirkişi yedeği başka bir bilgisayarda boş bir tarayıcıda açtı:
ekran "**iki paket**" dedi, içe aktarma sonrası çalışma alanında **üç kayıt**
oluştu ve "⇄ Birleştir" **"uyumsuz"** hatası verdi. Üç belirtinin de tek kökü
vardı ve üçü de ölçümle doğrulandı.

### KULLANICI NE GÖRECEK

- **Yeni bilgisayarda "2 dosya" görmeyeceksiniz.** Boş çalışma alanı yedeğe girmez.
- **Geri yükleme sonrası sahte kayıt birikmez.** Boş dosya düşürülür; aynı dosya
  ikinci kez içe aktarılırsa kopya açılmaz, "bu dosya zaten var" denir.
- **⇄ Birleştir artık çok dosyalı yedeği kabul eder.** Önceki sürümde aynı yedek
  paketini birleştirmeye verdiğinizde "bu bir çalışma paketi değil" hatası
  alıyordunuz; artık paketteki doğru dosya (dosya numarası + mahkeme ile)
  bulunur ve birleştirilir.
- **Sesi bulunamayan kayıt sessizce atlanmaz.** Arşivden geri yüklemede bir ses
  dosyası pakette yoksa hangi kayıt olduğu söylenir.

### ÖLÇÜLEN HATALAR

| Belirti | Ölçüm (v2.101) |
|---|---|
| Boş çalışma alanı "dosya" sayılıyor | `freshCase()` → 0 kayıt, boş dosya no, `draft` |
| Boş dosya yedeğe giriyor | 2 dosyada `archive.json` içinde `BOS-DOSYA[0 kayıt]` |
| Arşiv birleştirilemiyor | `readProjectPack` yalnız `case.json` arıyor → hata |
| İçe aktarma sonrası 3 kayıt | boş dosya + 2 gelen dosya, temizlik yok |
| İkinci aktarımda kopya | `importArchive` yinelenen denetimi yapmıyor |
| Birleştirmede yanlış MIME alanı | `m?.mimeType` okunuyor; gerçek alan `m.type` |
| Arşivde ses yanlış klasörde aranıyor | `audio/<kayıtId>` aranıyor; doğrusu `audio/<dosyaId>/` |

### DÜZELTME (tek sözleşme)

Yeni saf fonksiyonlar (`birim-testleri` [32] korur):

- `isEmptyCase(c)` — kullanıcı verisi yoksa dosya değildir (varsayılan uzmanlık
  alanı ve yöntem metni veri sayılmaz).
- `buildExportPlan(cases)` — `none` / `single` / `archive`; boş dosyalar
  `skipped` olarak **bildirilir**, sessizce atılmaz.
- `selectCaseFromArchive(arch, mine)` — id → dosya no + mahkeme; bulunamazsa
  NEDEN söylenir ("uyumsuz" demek yetmez).
- `dropEmptyCases(cases)` — yalnız boş kayıtlar düşürülür.
- `matchAudioEntries(names, mats, caseId)` — arşivde doğru klasör.

`exportProject`, `importProject`, `importArchive`, `readProjectPack`,
`applyMerge`, `loadState` ve "yeni dosya" düğmesi bu fonksiyonları kullanır.

### DOĞRULAMA

- `bash tools/test.sh` → 467 birim (26 yeni) + 395 şema + rapor/sürüm/tasarım.
- Gerçek `JSZip` ile uçtan uca: yedek üret → yeniden oku → arşiv birleştir →
  boş tarayıcıya geri yükle → ikinci kez yükle. Sonuç: boş dosya pakette yok,
  birleştirme kabul, geri yükleme sonrası **2 kayıt** (3 değil), ikinci aktarım
  kopya eklemedi.

## v2.101 — Perde tahmininde oktav hatası (dürüst sınır)

CANLI VERİ. Perde ölçümü, temel frekans zayıf olduğunda perdeyi **iki katına**
çıkarabiliyordu; rapor bu yanlış değeri "genellikle kadın" ipucuyla birlikte
basıyordu.

### GERÇEK HATA

`detectPitchHz` yalnız "en yüksek normalize otokorelasyon" gecikmesini
alıyordu. Temel frekans (H1) zayıf, 2. harmonik (H2) güçlü olduğunda
algoritma H2'nin periyodunu bulur ve perdeyi iki katına çıkarır. Ölçüm:

```
zayıf temel (H1=0,05 · H2=1,0), gerçek 120 Hz → 238,8 Hz   (2× hata)
```

Rapor bunu `pitchHint` ile birlikte bastığı için yanıltıcı bir **cinsiyet
ipucu** da üretiyordu.

### NEDEN "DÜZELTME" DEĞİL, "BİLDİRİM"

Klasik oktav düzeltmesi (gecikmenin katlarına bakmak) **denendi ve ölçüldü**:
normal sesleri de bozdu.

```
mult=2 ratio=0.95 → 6/9 doğru · HATA: normal 210→105, normal 250→125
```

Sebep: her periyodik sinyal 2×lag'de de tepe verir. Otokorelasyondan hangi
tepenin gerçek temel olduğunu güvenilir biçimde ayırmak mümkün değildir.
**Yanlış sayıyı "düzeltmek" yerine belirsizliği tespit edip bildiriyoruz.**

### Çözüm

- `detectPitchAmbiguity(samples, sr, measuredHz)` — Goertzel ile ölçülen
  frekansın **yarısında** anlamlı enerji olup olmadığına bakar. Normal seslerde
  f/2'de enerji pratikte yoktur (ölçüldü: −250 dB); oktav hatasında vardır
  (ölçüldü: −22 dB). Eşik −30 dB.
- Ölçüm sırasında her bölüm için belirsizlik hesaplanır;
  `speaker.pitchAmbiguous` ve `speaker.pitchOctaveHz` kaydedilir.
- `pitchCellText(sp)` — raporun "ÖLÇÜLEN PERDE" hücresi **tek kaynak**.
  Belirsizse tek bir kesin sayı **iddia etmez**; olası aralık + uyarı yazar ve
  **cinsiyet ipucu vermez**.

**Ölçüm (gerçek Chromium, üretilen zayıf-temel dosyası):**

```
ÖNCE   "240 Hz (yüksek perde (genellikle kadın))"   ← yanıltıcı
SONRA  "oktav belirsiz: ≈120–240 Hz (tek sayı iddia edilmez)"
```

### KULLANICI NE GÖRECEK

- Perde ölçümü oktav yukarıda olabilecekse rapor **"oktav belirsiz"** yazar ve
  olası aralığı gösterir. Tek bir yanlış sayı ve ona bağlı cinsiyet ipucu
  verilmez.
- Perde güvenilir biçimde ölçüldüyse (temel güçlü) davranış değişmez:
  "120 Hz (düşük perde (genellikle erkek))".
- Ölçüm yapılmadıysa "Ölçülmedi" yazılır (uydurma yok).

### Bilinen sınır (dürüstçe)

Otokorelasyon tabanlı perde tahmini, temel frekans çok zayıf olduğunda oktav
hatası yapabilir. Bu sürüm hatayı **düzeltmiyor**, **bildiriyor**. Kesin perde
için daha ağır bir yöntem (ör. YIN, SWIPE) gerekir; bu depo öyle bir model
içermez ve yapılmış gibi göstermez.

### Testle korunur

`birim-testleri` [31] (18 kontrol): normal sesler doğru ve belirsiz değil,
zayıf temelde belirsizlik tespit edilir ve oktav adayı doğru, H1 güçlüyken
belirsizlik yok, rapor hücresi belirsizde cinsiyet ipucu vermez. Test
düzeltme yokken **kaldı**, düzeltmeden sonra geçti (`441 geçti, 0 kaldı`).

## v2.100 — Türkçe büyük İ terim tutarlılığını bozuyordu

CANLI VERİ. "İ" ile başlayan kelimeler terim tutarlılık panelinde yanlış
yazıma dönüşüyordu.

### GERÇEK HATA

`contentWords()` düz `toLowerCase()` kullanıyordu:

```js
const raw = String(text || '').toLowerCase()   // ← yerel ayardan bağımsız
```

Türkçe'de büyük `İ` düz küçültüldüğünde **`i` + birleşik nokta (U+0307)**
olur. Ardından gelen `\p{L}` dışı sayılan birleşik işaret atılır ve kelime
`stanbul`a dönüşür. Ölçüm:

```
İstanbul  →  toLowerCase: "i̇stanbul"  (birleşik nokta)
         →  contentWords: "stanbul"    ← parçalandı
istanbul →  "istanbul"
eşleşme: YOK
```

`normalizeForWer()` doğru yapıyordu (`toLocaleLowerCase('tr-TR')`), ama
`contentWords()` yapmıyordu — **tek kaynak kuralı ihlali**.

### Çözüm

`trLowerCase(v)` — **tek kaynak**: `toLocaleLowerCase('tr-TR')`.
`normalizeForWer` ve `contentWords` artık bunu kullanır. Türkçe metin
küçültmesi gereken her yer bu yardımcıyı çağırmalıdır.

**Ölçüm (gerçek Chromium, terim paneli):**

```
ÖNCE   "İstanbul" → "stanbul"; "istanbul" ile eşleşmiyor → küme YOK
SONRA  "istanbul ×2 · istambul ×1"   (İstanbul + istanbul aynı kelime)
       "istanbul" esas al / "istambul" esas al  ← gerçek yazım farkı yakalanıyor
```

### KULLANICI NE GÖRECEK

- **"İ" ile başlayan kelimeler artık doğru tanınır**; terim tutarlılık paneli
  "İstanbul" ile "istanbul"u **aynı kelime** sayar (yanlış "yazım farkı"
  uyarısı vermez).
- Gerçek yazım farkları ("İstambul" gibi) **hâlâ yakalanır**.
- Metin aramasında ve WER ölçümünde de aynı Türkçe küçültme kullanılır
  (tutarlılık).

### Testle korunur

`birim-testleri` [30] (10 kontrol): `trLowerCase` doğru küçültür, birleşik
nokta bırakmaz, `İstanbul == istanbul`, aynı yazım küme oluşturmaz, gerçek
yazım farkı bulunur. Test düzeltme yokken **kaldı** (`410 geçti, 4 kaldı`),
düzeltmeden sonra geçti (`419 geçti, 0 kaldı`).

## v2.99 — Hızlı onay sayacı ile filtresi ayrışıyordu

CANLI VERİ. "Hızlı onaya uygun" göstergesi üç yerde farklı sayı veriyordu:
sayaç çipi, filtre listesi ve toplu onay düğmesi.

### GERÇEK HATA

`segCounts()` hızlı onay sayısını **önceki bölümü de vererek** hesaplıyordu:

```js
if (segQuickCheck(s, segs[i - 1]).ok) c.quick++;    // çakışma denetimi DAHİL
```

Ama filtre fonksiyonu **prev geçmiyordu**:

```js
if (filter === 'quick') return !isReviewed(s) && segQuickCheck(s).ok;   // prev YOK
```

`segQuickCheck` "öncekiyle çakışıyor" denetimini yalnız `prev` verildiğinde
yapar. Ölçüm:

```
sayaç (çip)      : 1
filtre listesi   : 2      ← çakışan bölüm de listeleniyor
toplu onay hedefi: 1
```

Kullanıcı "Hızlı onaya uygun 2" filtresine geçip listelenen bölümü görüyor,
ama toplu onay ona **dokunmuyordu**. AGENTS.md kuralı: *"Filtre ve sayaç aynı
fonksiyonu kullanır; arayüz ile liste ayrışamaz."*

### Çözüm

`quickApproveTargets(m)` — **tek kaynak**: uygun bölümlerin indekslerini
döndürür (prev dahil). Üç tüketici de bunu kullanır:

- `segCounts().quick` → `quickApproveTargets(m).length`
- `segMatchesFilter(s, 'quick', prev)` → prev parametresi eklendi; liste
  `segs[i-1]` geçer (hem `segListHtml` hem `navSegment`)
- `bulkApproveQuick()` → `quickApproveTargets(m)`

**Ölçüm (gerçek Chromium, çakışan iki bölüm):**

```
ÖNCE   sayaç "Hızlı onaya uygun 1"  ·  filtre listesi 2  ·  düğme "✓ 1"
SONRA  sayaç "Hızlı onaya uygun 1"  ·  filtre listesi 1  ·  düğme "✓ 1 hızlı onayla"
       onay sonrası: Onaylandı 1 · Bekleyen 1  (tutarlı)
```

### KULLANICI NE GÖRECEK

- "Hızlı onaya uygun" sayısı ile filtreye geçince **listelenen bölüm sayısı
  artık aynı**.
- Toplu onay düğmesindeki sayı da aynı; listelediğiniz bölüm atlanmaz.
- Öncekiyle çakışan bölümler hızlı onaya uygun **sayılmaz** (yanlış onay riski
  yok) ve bu, üç yerde tutarlı gösterilir.

### Testle korunur

`birim-testleri` [29] (7 kontrol): çakışan bölüm uygun değil, sayaç = filtre =
toplu onay hedefi, çakışmasız durumda ikisi de 2. Test düzeltme yokken
**kaldı** (`sayaç 2, filtre 1`), düzeltmeden sonra geçti (`409 geçti, 0 kaldı`).

## v2.98 — Paragraf ve bölme, modelin çıktısını siliyordu

CANLI VERİ. Adli ayrım kuralı (v2.83): *"Modelin ürettiği ham metin ASLA
üzerine yazılmaz."* Bu sürüm, kuralın iki yolda bozulduğunu kapatıyor.

### GERÇEK HATA

**1. `paragraphize()` — tamamen siliyordu.** Paragraf oluşturulunca yeni
bölüm nesnesi `asrText`, `asrModel`, `asrAt` alanlarını **hiç taşımıyordu**:

```
ÖNCE   s1: asrText "model bir", asrModel "Xenova/whisper-small"
       s2: asrText "model iki", asrModel "Xenova/whisper-small"
SONRA  paragraf: asrText undefined · asrModel undefined · asrAt undefined
```

Yani paragraf oluşturan bilirkişi, **modelin ne dediği bilgisini kaybediyordu**.

**2. `splitSegmentAt()` — ikiye kopyalıyordu.** `{...s}` tüm alanları
kopyaladığı için **tam asrText her iki yarıya** yazılıyordu:

```
ÖNCE   "bir iki üç dört"
SONRA  sol: "bir iki üç dört"  sağ: "bir iki üç dört"   (toplam iki katı)
```

İki bölüm de "model tüm metni söyledi" diyordu; sağ yarıda model hiçbir şey
söylememiş olabilirdi.

### Çözüm

- **Paragraf**: `asrText` = girdi bölümlerinin `asrText`'lerinin birleşimi.
  `asrModel` yalnız tüm girdiler **aynı** modeli kullanıyorsa korunur;
  farklı modeller karıştıysa boşaltılır (yanlış atıf yapılmaz — `uniformAsrModel`).
  `asrAt` en erken zaman damgası. Girdilerde `asrText` yoksa **uydurulmaz**.
- **Bölme**: `asrText` de metinle aynı oranda **paylaştırılır**
  (`splitSegmentText` ile), kopyalanmaz. Toplamları orijinali verir.
- `asrText` yoksa (eski kayıt / elle girilmiş bölüm) boş kalır — uydurma yok.

**Ölçüm (gerçek Chromium, gerçek ¶ düğmesi):**

```
ÖNCE   iki bölüm: "model bir" / "model iki"  (asrModel dolu)
SONRA  paragraf : asrText "model bir model iki" · asrModel "Xenova/whisper-small"
```

Birim testi (bölme):
```
"bir iki üç dört" → sol "bir iki" + sağ "üç dört"  (kopya değil, paylaşım)
```

### KULLANICI NE GÖRECEK

- Paragraf oluşturduğunuzda **"Otomatik çözümleme çıktısı"** bloğu artık
  kaybolmaz; modelin ne dediği görülebilir kalır.
- Bölme yaptığınızda model çıktısı da iki bölüme **adil biçimde paylaştırılır**;
  aynı metin iki kez görünmez.
- Farklı modellerle çözümlenmiş bölümler paragrafta birleşirse model adı
  **boş** görünür (yanlış model atfı yapılmaz).

### Testle korunur

`birim-testleri` [28] (12 kontrol): paragrafta asrText/asrModel/asrAt korunur,
eski kayıtta uydurulmaz, karışık modelde model adı boşaltılır, bölmede asrText
paylaştırılır (kopyalanmaz). Test düzeltme yokken **kaldı** (`389 geçti,
8 kaldı`), düzeltmeden sonra geçti (`402 geçti, 0 kaldı`).

## v2.97 — Zaman alanı doğrulanmıyordu (rapora sessizce 00:00:00.000)

CANLI VERİ. Bölüm detayındaki başlangıç/bitiş alanları **hiç doğrulanmıyordu**;
yazılan değer olduğu gibi kayda giriyordu.

### GERÇEK HATA

`input` dinleyicisi değeri doğrudan yazıyordu:

```js
else s[el.dataset.key] = el.value;
```

`secondsFromTimecode()` çözemeyince **0** döndürür; 0 ise geçerli bir andır
(kaydın başlangıcı). Bu yüzden "bozuk girdi" ile "gerçekten 0" ayırt
edilemiyordu. Ölçülen sonuçlar:

| Girilen | Raporda | Süre |
|---|---|---|
| `00:00:05,100` (Türkçe virgül) | **`00:00:00.000`** | 0 |
| `00:00:09.000 – 00:00:05.000` (ters) | `00:00:09.000 – 00:00:05.000` | 0 |
| `00:00:99.000` | **`00:01:39.000`** (sessizce taşıyor) | 0 |
| `abc` | **`00:00:00.000`** | 10 |

Türkçe klavyede ondalık virgül yazmak çok olası; sonuç raporda sessizce
`00:00:00.000` satırı oluyordu. `validateSegment()` bu biçimleri **yakalıyordu**
ama hiçbir yerde **çağrılmıyordu**.

### Çözüm

- `parseTimecodeStrict(t)` — katı çözücü; geçersizde **`null`** döner (0 değil).
  Türkçe ondalık virgül kabul edilir. Sınırlar: dakika/saniye 0–59, ms ≤ 3 hane,
  negatif reddedilir.
- `normalizeTimeInput(value, end)` — geçerliyse **kanonik** `HH:MM:SS.mmm`
  döndürür; aralık denetimi (`end > start`) yapar; aksi hâlde `null`.
- **Yazarken kayda yazılmaz**: yarım yazılmış `00:00:0` gibi değer kayda
  girerse rapor bozulur. Doğrulama **odak kaybında** yapılır.
- Geçersiz değer **reddedilir**: kayda dokunulmaz, alan eski değerine döner ve
  kullanıcıya neden reddedildiği söylenir (biçim örneğiyle). Sessiz sıfırlama yok.

**Ölçüm (gerçek Chromium, gerçek giriş alanı):**

```
A) "00:00:05,250" (Türkçe virgül) → kabul · kayıt: 00:00:05.250
B) "00:00:99.000"                 → REDDEDİLDİ · kayıt değişmedi
   uyarı: 'Bölüm 1: "00:00:99.000" geçerli bir zaman kodu değil.
           Biçim: SS:DD:ss.mmm (ör. 00:01:23.450). Bitiş, başlangıçtan
           sonra olmalı. Değer değiştirilmedi.'
C) "00:00:20.000" (bitiş 10 sn → ters aralık) → REDDEDİLDİ · kayıt değişmedi
```

### KULLANICI NE GÖRECEK

- Zaman alanına **Türkçe ondalık virgülle** de yazabilirsiniz
  (`00:00:05,250`); uygulama bunu `00:00:05.250` biçimine çevirir.
- Geçersiz bir değer yazarsanız (harf, 99 saniye, ters aralık) değer
  **kaydedilmez**; alan eski değerine döner ve neden kabul edilmediği söylenir.
- Rapora artık **sessizce `00:00:00.000`** yazılmaz.

### Testle korunur

`birim-testleri` [27] (22 kontrol): geçerli biçimler, virgül kabulü, geçersiz
biçimlerin `null` dönmesi, kanonikleştirme, ters/eşit aralık reddi. Test
düzeltme yokken **kaldı** (`366 geçti, 2 kaldı`), düzeltmeden sonra geçti
(`388 geçti, 0 kaldı`).

## v2.96 — SHA-256 doğrulaması sahte "eşleşti" verebiliyordu

CANLI VERİ. Adli raporda en ağır iddia "dosya değişmemiş" iddiasıdır. Bu
sürüm, o iddianın yanlış verilebildiği bir hatayı kapatıyor.

### GERÇEK HATA

`sha256()` hesaplayamadığında bir **metin** döndürüyordu:

```js
return 'Hesaplanamadı (tarayıcı güvenlik kısıtı)';
```

`verifyIntegrity()` ise `now === m.sha256` karşılaştırması yapıyordu. Eski
sürüm bu metni **özet olarak kaydettiği** için iki metin eşit çıkıyor ve
uygulama şunu diyordu:

> **"SHA-256 doğrulandı; dosya değişmemiş."**

`crypto.subtle` yalnız **güvenli bağlamda** (https, localhost, file://) vardır.
Yerel sunucuya LAN IP'si üzerinden `http://192.168.x.x:8787` ile girildiğinde
`crypto.subtle` **yoktur** — yani o kurulumda **her doğrulama sahte "eşleşti"
veriyordu**.

Ölçüm:

```
kayıtlı özet   : "Hesaplanamadı (tarayıcı güvenlik kısıtı)"
bulunan        : "Hesaplanamadı (tarayıcı güvenlik kısıtı)"
now === stored : true   ← "doğrulandı" der
```

### Çözüm

- `sha256()` hesaplayamazsa **`null`** döner (metin değil).
- `isSha256Hex(v)` — yalnız 64 küçük harf hex geçerlidir. Eski sürümün
  kaydettiği hata metni bu kontrolü geçemez.
- `verifyHashState(now, stored)` — **üç hâl**:
  - `verified` — iki geçerli özet eşit
  - `mismatch` — iki geçerli özet farklı (dosya değişmiş)
  - `unavailable` — özet hesaplanamadı/geçersiz → **doğrulanamadı**
- `unavailable` **asla** `verified` sayılmaz; ölçülemeyen bir şey doğrulanmış
  gösterilemez.
- Arayüz üç hâli ayırır: "doğrulandı" / "FARKLI: dosya değişmiş olabilir" /
  "YAPILAMADI: özet hesaplanamıyor (güvenli bağlantı gerekir)".

**Ölçüm (gerçek Chromium, `crypto.subtle` kaldırılmış):**

```
TOAST   : "SHA-256 DOĞRULANAMADI: bu tarayıcıda özet hesaplanamıyor
           (güvenli bağlantı gerekir). Dosya değişmemiş sayılmaz."
lastVerify: { ok: false, state: "unavailable" }
Günlük  : "Doğrulanamadı: özet bu tarayıcıda hesaplanamadı (güvenli bağlam gerekir)."
Uyarı   : "Son SHA-256 doğrulaması YAPILAMADI: ... Dosya doğrulanmış sayılmaz."
```

### KULLANICI NE GÖRECEK

- Doğrulama **gerçekten yapılamıyorsa** artık "doğrulandı" demez; açıkça
  "doğrulanamadı" der ve **neden** olduğunu söyler (güvenli bağlantı gerekir).
- "Dosya değişmiş olabilir" uyarısı yalnız **gerçekten farklı** özetlerde
  çıkar; hesaplanamadığında bu yanıltıcı suçlama görünmez.
- LAN IP'si üzerinden `http://` ile çalıştırıyorsanız SHA-256 doğrulaması
  yapılamaz; bunun için `https` veya `localhost` kullanın.

### Testle korunur

`birim-testleri` [26] (15 kontrol): geçerli/geçersiz özet ayrımı, üç hâl,
"iki hata metni yan yana gelse bile verified olmaz". Test düzeltme yokken
**kaldı** (`353 geçti, 2 kaldı`), düzeltmeden sonra geçti (`366 geçti, 0 kaldı`).

## v2.95 — "Daha yeni kazanır" kuralı çalışmıyordu (updatedAt bayatlıyordu)

CANLI VERİ. Birleştirmede "gelen dosya daha yeniyse onun değeri alınır" kuralı
vardı; ama bu kuralın dayandığı `updatedAt` alanı **hiç tazelenmiyordu**.

### GERÇEK HATA

`updatedAt` yalnız iki yerde yazılıyordu: `freshCase()` (dosya oluşturma) ve
`applyMerge()` (birleştirme). **Normal düzenleme** — metin yazmak, kapak
alanını değiştirmek, ölçüm yapmak — damgayı hiç tazelemiyordu.

`mergeCases`/`compareCases` ise karar verirken `updatedAt`'i karşılaştırıyor:

```js
const newer = (theirs.updatedAt || '') > (mine.updatedAt || '');
```

Ölçülen sonuç:

```
Yerel dosya: 2020-01-01'de oluşturuldu, BUGÜN düzenlendi → updatedAt hâlâ 2020
Gelen dosya: 2025-01-01 tarihli
Birleştirme: court = "GELEN" (gelen ezdi)   ·   çakışma bildirilmedi
```

Yani bilirkişi bir dosyayı aylarca düzenlese bile, o dosya "en eski" görünüp
karşı taraftan gelen değer tarafından **sessizce eziliyordu**.

### Çözüm

- `touchCaseUpdated(c)` — damgayı `now`a çeker; **asla geri çekmez** (saat
  kayması / aynı milisaniye durumunda en büyük değer korunur).
- `persist()` — **72 yazma noktasının tamamı buradan geçer** — artık damgayı
  tazeler. Böylece çağrı yerlerini tek tek değiştirmek (ve birini unutmak)
  gerekmez.
- Yükleme/göç yolu `persist({ touch: false })` kullanır: **dosya açmak
  düzenleme değildir**. Aksi hâlde her açılışta dosya "en yeni" görünür ve
  birleştirmede haksız kazanırdı.
- `saveCaseNow(c)` — veri değiştiren yollar için tek kapı yardımcısı.

**Ölçüm (gerçek Chromium):**

```
Açılış    → updatedAt 2020-01-01  (korundu; açmak düzenleme sayılmadı)
Düzenleme → updatedAt 2026-11-20T12:26:48.021Z  (tazelendi)
Yenileme  → updatedAt 2026-11-20T12:26:48.021Z  (korundu)
```

### KULLANICI NE GÖRECEK

- Bugün düzenlediğiniz dosya, birleştirmede artık **"eski" sayılmaz**;
  karşı taraftan gelen değer onu sessizce ezmez.
- Gerçekten daha yeni olan dosya **yine kazanır** (kural bozulmadı).
- Bir dosyayı yalnız **açmak** onu "yeni" göstermez; bu yüzden eski bir
  dosyayı açıp kapatmanız birleştirme sonucunu değiştirmez.

### Testle korunur

`birim-testleri` [25] (11 kontrol): damga ilerler, geri çekilmez, `persist()`
tazeler, `persist({touch:false})` tazelemez, bugün düzenlenen dosya birleştirmede
korunur, gerçekten yeni olan kazanır. Test düzeltme yokken **kaldı**
(`342 geçti, 2 kaldı`), düzeltmeden sonra geçti (`353 geçti, 0 kaldı`).

## v2.94 — Birleştirmede kayıt bilgileri sessizce kayboluyordu

CANLI VERİ. İki dosya birleştirildiğinde, aynı kaydın (ses dosyasının) **kayıt
düzeyi bilgileri hiç aktarılmıyordu** ve hiçbir çakışma bildirilmiyordu.

### GERÇEK HATA

`mergeCases()` aynı `id`'li kayıtta yalnız bölümleri ve birkaç durum alanını
işliyordu. Şu alanlar gelen dosyada **dolu olsa bile** hiç aktarılmıyordu:

| Alan | Ne kayboluyordu |
|---|---|
| `speakers` | Konuşmacı listesi (S2 · Tanık) |
| `levels` | Seviye ölçümü (tepe/RMS/kırpılma) |
| `origin` | Köken/teslim zinciri (ortam, teslim eden, tarih) |
| `spectrogramReviewed` | Spektrogram inceleme kaydı |
| `expectedText` | WER referans metni |
| `sha256` | Dosya özeti (delil bütünlüğü) |
| `tech` | Codec/kanal/örnekleme/bit derinliği |
| `log` | Delil işlem günlüğü |

Ölçüm: **8 alan kayboluyor, `conflicts.length = 0`, `applied = []`.** Yani
kullanıcı "çakışma yok, güvenle birleştir" görüyor, sonra ölçümler ve
konuşmacılar sessizce siliniyordu.

Ek olarak `applyMerge()` sonucu yeni bir nesne kuruyor ama `defineCaseMirrors`
çağırmıyordu; bu yüzden birleştirme sonrası `c.plaintiff` gibi düz alanlar
boş okunuyordu.

### Çözüm

`mergeMaterialFields()` ve `diffMaterialFields()` eklendi — **tek kaynak**,
hem birleştirme hem önizleme aynı kuralı kullanır:

- Yerel alan **boşsa** gelen değer alınır (veri kaybı yok).
- İki taraf da **dolu ve farklıysa** sessiz seçim YAPILMAZ; yerel korunur ve
  `material-field` çakışması bildirilir. Bu `sha256`/`tech` için de geçerli
  (delil bütünlüğü: dosya özeti sessizce değişmez).
- Şema varsayılanları (`mediumType: 'unspecified'`, `tech.channels: 0`) "boş"
  sayılır; gerçek değer varsa doldurulur.
- Konuşmacılar `id` ile birleşir; `assignSpeakerCodes` ile kodlar
  benzersizleştirilir (aynı kişi çoğalmaz).
- Delil günlüğü girdileri zincire **eklenir** (hash ile yinelenmez).
- Önizleme artık "Alınacak kayıt bilgisi (ölçüm/konuşmacı/köken): N" satırını
  gösterir ve "Değişecek kayıt" sayısı gerçeği yansıtır.
- `applyMerge()` birleştirme sonrası `syncCaseMirrors` + `defineCaseMirrors`
  çağırır.

**Ölçüm (gerçek Chromium, ⇄ Birleştir UI akışı):**

```
ÖNCE   önizleme: "Değişecek kayıt 0"   birleşme sonrası: 8 alan BOŞ
SONRA  önizleme: "Değişecek kayıt 1 | Alınacak kayıt bilgisi 14"
       birleşme sonrası: S2:Tanık · levels VAR · ortam usb · teslim Kolluk
                         spektrogram VAR · referans "referans metin"
                         sha abc123 · kanal 2 · log 1 girdi
```

### KULLANICI NE GÖRECEK

- Birleştirme artık **ölçümleri, konuşmacıları, köken/teslim bilgisini,
  referans metnini ve delil günlüğünü** karşı taraf doldurmuşsa getirir.
- Birleştirme öncesi ekranda **kaç kayıt bilgisinin alınacağı** yazar; sürpriz
  olmaz.
- İki tarafta **farklı** değer varsa sessizce biri seçilmez; çakışma olarak
  listelenir ve **bu dosyadaki değer korunur**.
- Dosya özeti (SHA-256) birleştirmeyle **sessizce değişmez**.

### Testle korunur

`sema-testi` [7k] (21 kontrol): 8 alanın hepsi doldurulur, çakışma bildirilir,
konuşmacı çoğalmaz, SHA-256 sessizce değişmez, önizleme birleştirmeyle aynı
sonucu gösterir. Test düzeltme yokken **kaldı** (`378 geçti, 14 kaldı`),
düzeltmeden sonra geçti (`395 geçti, 0 kaldı`).

## v2.93 — Gerçek cümleler "dolgu" sayılıyordu

CANLI VERİ. Uygulama, bir kelimeyle **başlayan** her metni dolgu (halüsinasyon)
sayıyordu; bu yüzden gerçek deşifre cümleleri çöpe atılıyordu.

### GERÇEK HATA

Dolgu tespiti deseni şuydu:

```js
/^[\s(]*[(\[]?\s*(konuşma|müzik|nefes|sessizlik|…)[\s\S]*?[)\]]?\s*$/i
```

`[\s\S]*?` **her şeyi** kabul ediyordu. Yani "bu kelimeyle başlayan ve 60
karakterden kısa her metin" dolgu sayılıyordu. Ölçülen yanlış pozitifler:

```
"Konuşma sırasında bağırdı"        → dolgu
"Müzik çalıyordu ama konuşma vardı"→ dolgu
"Nefes alıyor"                     → dolgu
"Kalabalık içinde konuşuyor"       → dolgu
"Sessizlik oldu sonra devam etti"  → dolgu
"Müzik kutusu çalındı"             → dolgu
```

Sonucu ağırdı: `isHallucination` şu yerlerde kullanılır —
çözümlemede `meaningful = filter(!isHallucination)`, hızlı onay ölçütü,
"anlamlı metin içermeyen bölüm" sayacı, rapor uyarısı, karaoke. Yani bu
cümleler **deşifreden çöpe atılıyor**, kayıt "sonuç rapora aktarılmamalıdır"
uyarısı alabiliyordu.

### Çözüm

Desen **tam eşleşme** olacak şekilde daraltıldı: isteğe bağlı parantez +
etiket + isteğe bağlı tireyle ayrılmış ikinci etiket + noktalama.

```js
const FILLER_WORD = '(konuşma|müzik|jenerik|…|no speech|background noise)';
const HALLUCINATION_RE = new RegExp(
  '^[\\s(\\[]*' + FILLER_WORD + '(?:\\s*[-–—]\\s*' + FILLER_WORD + ')*[\\s)\\].,;:!?]*$', 'i'
);
```

Whisper'ın dolgu çıktısı `(Konuşma)`, `[Müzik]`, `(Müzik - Jenerik)` gibi
**kısa ve yalnız etiket olan** metindir; cümle değildir. Doğru pozitifler
korunur, yanlış pozitifler ortadan kalkar.

**Ölçüm (gerçek Chromium, 4 bölümlü kayıt: 3 gerçek cümle + 1 gerçek etiket):**

```
ÖNCE   4 bölümün TAMAMI "boş/anlamlı metin yok"
SONRA  yalnız 1 bölüm ((Konuşma)) "boş"; 3 gerçek cümle normal bölüm
       sayaçlar: Tümü 4 | Bekleyen 4 | Hızlı onaya uygun 3
       rapor deşifre tablosu: 4 satır (hiçbiri atılmadı)
```

### KULLANICI NE GÖRECEK

- "Konuşma…", "Müzik…", "Nefes…" gibi kelimelerle başlayan **gerçek
  cümleler artık dolgu sayılmaz**; deşifrede kalır, rapora girer.
- Hızlı onay ve "anlamlı metin içermeyen bölüm" sayacı bu cümleleri doğru
  sayar.
- Gerçek Whisper dolgu etiketleri (`(Konuşma)`, `[Müzik]`) **hâlâ** dolgu
  sayılır; rapora konuşma olarak girmez.
- Çözümleme sırasında "anlamlı konuşma bulunamadı" yanlış uyarısı artık
  verilmez.

### Testle korunur

`birim-testleri` [24] (27 kontrol): 9 gerçek cümle dolgu **değil**, 12 dolgu
etiketi dolgu **evet**, boş/çöp davranışı korunur, etiketle başlayan uzun
cümle dolgu değil. Test düzeltme yokken **kaldı** (`333 geçti, 9 kaldı`),
düzeltmeden sonra geçti (`342 geçti, 0 kaldı`).

## v2.92 — Sessizlik ve perde ölçümü yalnız sol kanalı okuyordu

CANLI VERİ. Stereo kayıtta konuşma sağ kanalda ise uygulama bölümü **"tamamen
sessiz"** sanıyordu.

### GERÇEK HATA

`measureSegmentSilence()` ve `measureSpeakerPitch()` yalnız birinci kanalı
okuyordu:

```js
const data = audio.getChannelData(0);   // sessizlik
const ch = audio.getChannelData(0);     // perde
```

Stereo kayıtta konuşma sağ kanalda ise:

| Ölçüm | Gerçek | Kanal 0'dan |
|---|---|---|
| Sessizlik oranı | 0,0 | **1,0 → "yüksek"** |
| Perde | 180 Hz | **null → "ölçülemedi"** |

Sonucu adli açıdan ağırdı: uzman **"bu bölüm büyük ölçüde sessiz"** uyarısı
alıyor, metni `[sessizlik]` diye işaretliyordu — oysa konuşma vardı. Perde
ölçülemediği için konuşmacı karşılaştırması da yapılamıyordu.

### Çözüm

- `pickActiveChannel()` — kanalların **en yüksek enerjilisini** seçer,
  kanal numarasını (1 tabanlı) döndürür. Eşitlikte sol kanal (kararlı).
- `analyzeSilenceChannelAware()` — sessizlik ölçümünü seçilen kanaldan yapar
  ve hangi kanal olduğunu sonuca yazar.
- `measureSegmentSilence()` ve `measureSpeakerPitch()` artık **tüm kanalları**
  okur; perde için her bölümün kendi en yüksek enerjili kanalı seçilir.
- `SILENCE_SCHEMA = 2`: eski (kanal 0) ölçümler `stripDerivedFields` ile
  atılır; gösterim noktaları (bölüm notu, liste etiketi, özet sayacı) şema
  kontrolünden geçer. Ölçülmemiş değer ekranda/raporda görünmez.

**Ölçüm (gerçek Chromium, üretilen dosya: sol kanal TAMAMEN sessiz, sağ
kanalda 180 Hz konuşma, sağ RMS 0,16):**

```
ÖNCE   sessizlik oranı 1,0 → "yüksek" uyarısı · perde null
SONRA  sessizlik oranı 0,42 · kanal 2 · şema 2 · uyarı GÖSTERİLMEDİ
       perde 180 Hz (gerçek 180 Hz) · 1 örnek
```

### KULLANICI NE GÖRECEK

- Tek kanalda konuşma olan stereo kayıtlarda bölüm artık **"sessiz" diye
  işaretlenmez**; yanlış `[sessizlik]` notu verilmez.
- **Perde ölçümü artık çalışır** (konuşan kanal bulunur), konuşmacı
  karşılaştırması yapılabilir.
- Hangi kanaldan ölçüldüğü delil günlüğüne yazılır.
- Eski sessizlik ölçümleri geçersiz sayıldı; bölüm detayındaki **Sessizlik
  ölç** düğmesiyle yeniden ölçün. Yeniden ölçülmemiş değer gösterilmez.

### Testle korunur

`birim-testleri` [23] (16 kontrol): en yüksek enerjili kanal seçilir (sol/sağ/
mono/sessiz), yalnız sağ kanalda konuşma varsa sessizlik **yüksek çıkmaz**,
sessizlik uyarısı üretilmez, şema 2'dir. Test düzeltme yokken **kaldı**
(`299 geçti, 2 kaldı`), düzeltmeden sonra geçti (`315 geçti, 0 kaldı`).

## v2.91 — Seviye ve kırpılma ölçümü mono karışımdan yapılıyordu

CANLI VERİ. 56.12 alanının **çekirdek ölçümü** yanlıştı: tepe düzeyi ve tepe
kırpılma.

### GERÇEK HATA

`measureLevels()` tüm kanalları ortalamayla tek bir "mono"ya indiriyor, sonra
ölçüyordu:

```js
for (let ch = 0; ch < chCount; ch++) {
  const d = audio.getChannelData(ch);
  for (let i = 0; i < len; i++) mono[i] += d[i] / chCount;   // ← ortalama
}
const lv = analyzeLevels(mono, audio.sampleRate);
```

Stereo bir kayıtta bu üç şekilde yanlış sonuç verir:

| Senaryo | Gerçek | Mono karışımdan |
|---|---|---|
| Ses yalnız sol kanalda, tepe 0,9 | −0,92 dBFS | **−6,94 dBFS** (yarıya düşer) |
| Kırpılma yalnız sol kanalda, 500 örnek | 500 kırpık | **0 kırpık** (tamamen kaybolur) |
| Ters faz stereo (L = −R) | −0,92 dBFS | **tepe 0 → "—"** |

Yani **kırpılmış bir kanal rapora "kırpılma yok" olarak girebiliyordu.** Bu,
"sesin bozulup bozulmadığı" sorusunun cevabını doğrudan etkiler.

### Çözüm

`analyzeChannelLevels()` eklendi:

- **Tepe** ve **kırpılma** → **en kötü kanaldan** raporlanır, hangi kanal
  olduğu yazılır (`tepe kanal 1`, `kırpılma kanal 2`).
- **Gürültü tabanı / SNR / RMS** → mono karışımdan (gürültünün kanallar
  arasında dağılımı için doğru ölçü).
- **Bant genişliği** → mono karışımdan (bant sınırlaması kanaldan bağımsız).
- Ölçüm şeması **2 → 3** yükseltildi: eski kayıtlar `stripDerivedFields` ile
  atılır ve yeniden ölçülür (eksik/çelişkili değer gösterilmez).

Kanal bilgisi **üç yerde** görünür: arayüz paneli, rapor tablosu ve delil
günlüğü. Mono kayıtta kanal numarası **yazılmaz** (yanıltıcı olur).

**Ölçüm (gerçek Chromium, stereo test dosyası: sol tepe 0,9 + 300 kırpık
örnek, sağ 0,1 → 20 dB fark):**

```
ÖNCE (mono)   tepe −6,0 dBFS   kırpılma 0 örnek
SONRA         tepe  0,0 dBFS   kırpılma 300 örnek · tepe kanal 1 · kırpılma kanal 1
panel:  "Tepe düzeyi 0,0 dBFS (kanal 1)"
rapor:  "tepe kanal 1 · kırpılma kanal 1 · denge: 19,1 dB · korelasyon: 0,992"
```

### KULLANICI NE GÖRECEK

- Stereo kayıtlarda **tepe düzeyi artık doğru** (kanallardan birinde yüksek
  ses varsa görünür).
- **Tek kanaldaki kırpılma artık raporlanır**; "kırpılma yok" yanlış güveni
  ortadan kalkar.
- Hangi kanaldan ölçüldüğü **yazılır**, böylece rapor okunurken değerin hangi
  kanala ait olduğu bilinir.
- Eski ölçümler otomatik geçersiz sayılır; kaydı yeniden ölçmeniz istenir
  (ölçüm düğmesi). Önceden ölçülmüş değerler rapora **girmez**.

### Testle korunur

`birim-testleri` [22] (13 kontrol): tepe doğru kanaldan, kırpılma doğru
kanaldan, ters fazda tepe kaybolmaz, mono davranışı korunur, gürültü tabanı
mono karışımdan, şema 3, kanal bilgisi rapora yazılır, mono kayıtta kanal
numarası yazılmaz. Test düzeltme yokken **kaldı** (`284 geçti, 1 kaldı`),
düzeltmeden sonra geçti (`299 geçti, 0 kaldı`).

## v2.90 — WER ters çalışıyordu: rapor yanlış "doğruluk" gösteriyordu

CANLI VERİ. Rapordaki "ÇÖZÜMLEME DOĞRULUĞU ÖLÇÜMÜ (WER)" tablosu, ölçmesi
gereken şeyin **tam tersini** ölçüyordu.

### GERÇEK HATA

`measureWerForCase()` hipotez (modelin çıktısı) olarak `s.text` kullanıyordu.
Ama `s.text` **bilirkişinin düzelttiği** metindir; modelin ham çıktısı
`s.asrText`'te durur (v2.83'te bu ayrım için eklenmişti). Modelin çıktısı
ölçüme **hiç girmiyordu**.

Sonuç, ölçümle kanıtlandı:

```
model %100 hatalı, bilirkişi metni referansa EŞİT  → rapor "%0,0 WER"
model MÜKEMMEL,    bilirkişi metni bozuk          → rapor "%100,0 WER"
```

Yani tablo modelin doğruluğunu değil, **bilirkişinin referansa ne kadar
yaklaştığını** ölçüyordu. Bilirkişi metni düzelttikçe "çözümleme doğruluğu"
yükseliyor görünüyordu — bu, tablonun adıyla ve rapor metniyle çelişiyordu.
Rapor metni "otomatik çözümleme çıktısının referansla karşılaştırılması"
diyordu; bu iddia **yanlıştı**.

### Çözüm

- Hipotez artık **yalnız `asrText`**'ten gelir (modelin ürünü).
- `asrText` yoksa (eski kayıt veya elle girilmiş bölüm) satır **yazılmaz** —
  uydurma ölçüm üretilmez.
- Rapor giriş metni dürüstleştirildi: ölçümün **ham model çıktısını**
  (bilirkişi düzeltmesinden önceki hâli) ölçtüğü, bu yüzden düzeltmelerin
  oranı değiştirmediği açıkça yazıyor.
- `werMeasuredCount()` eklendi: özet satırı ("WER ölçümü yapılan kayıt") ile
  tablo artık **aynı kaynaktan** besleniyor. Ayrışsalardı özet 1 derken tablo
  0 satır gösterirdi.

**Ölçüm (gerçek Chromium, rapor çıktısı):**

```
ÖNCE   model-kötü.wav → %0,0     model-iyi.wav → %100,0     (TERS)
SONRA  model-kötü.wav → %100,0   model-iyi.wav → %0,0       (DOĞRU)
özet: "WER ölçümü yapılan kayıt: 2"  (tablodaki 2 satırla uyumlu)
```

### KULLANICI NE GÖRECEK

- Rapordaki WER tablosu artık **modelin gerçek doğruluğunu** gösterir.
  Daha önce "%0 hata" yazan bir kayıt, model gerçekte kötüyse artık yüksek
  oran gösterir.
- Sizin yaptığınız metin düzeltmeleri bu oranı **değiştirmez** (ölçüm modelin
  ham çıktısına aittir). Bu, tablonun anlamını netleştirir.
- Model çıktısı saklanmamış eski kayıtlar bu tabloya **girmez**; uydurma
  oran gösterilmez.
- Rapor giriş metni, ölçümün neyi ölçtüğünü açıkça söyler.

### Testle korunur

`birim-testleri` [21] (11 kontrol): model hatalıyken %0 çıkmaz, model
mükemmelken 0 çıkar, uzman metni değişince oran değişmez, `asrText` yoksa
satır üretilmez, özet sayacı tabloyla aynıdır. Ayrıca `rapor-tutarlilik-testi`
Senaryo 7b: model çıktısı yokken WER tablosu üç çıktıda da basılmaz.
Testler düzeltme yokken **kaldı** (`277 geçti, 5 kaldı`), düzeltmeden sonra
geçti (`284 geçti, 0 kaldı`).

## v2.89 — Eski dosyalardaki onaylar yüklenirken siliniyordu

CANLI VERİ. Bu, sessiz veri kaybının en sinsi türüydü: dosya **açılır
açılmaz** bilirkişinin onayları siliniyordu ve hiçbir uyarı çıkmıyordu.

### GERÇEK HATA

v2 dosyalarında kontrol durumu Türkçe kodla saklanıyordu: `onaylandi`,
`anlasilmadi`, `yeniden`, `bekliyor`. Şema v3'e geçtiğinde ASCII kodlar
(`approved`, `inaudible`, `relisten`, `pending`) kullanılmaya başlandı.

`normalizeSegment()` şunu yapıyordu:

```js
review: pick(s.review, REVIEW_STATE, 'pending')
```

`pick()` yalnız v3 kodlarını tanıyor; `'onaylandi'` tanınmadığı için
**sessizce `'pending'`e düşüyordu**. Yani:

- Bilirkişi 400 bölümü tek tek dinleyip onaylamış,
- dosyayı kapatmış,
- ertesi gün açmış,
- **tüm onaylar "Kontrol bekliyor" olmuş** — hiçbir uyarı yok.

`segReview()` (app.js) v2 kodlarını tanıyordu, ama değer oraya ulaşmadan
`normalizeCase` onu çoktan ezmiş oluyordu. Bu yüzden mevcut `sema-testi`
(yalnız `segReview`'u sınıyordu) **yeşil kalıyordu**.

**Ölçüm:**

```
ÖNCE   normalizeCase({review:'onaylandi'})   → 'pending'   ← KAYIP
       normalizeCase({review:'anlasilmadi'}) → 'pending'   ← KAYIP
       normalizeCase({review:'yeniden'})     → 'pending'   ← KAYIP
SONRA  normalizeCase({review:'onaylandi'})   → 'approved'
       normalizeCase({review:'anlasilmadi'}) → 'inaudible'
       normalizeCase({review:'yeniden'})     → 'relisten'
```

Gerçek tarayıcıda uçtan uca doğrulandı: depoya v2 biçiminde 4 bölümlü bir
dosya yazıldı, sayfa yenilendi (uygulama göçü çalıştırdı):

```
yükleme sonrası: approved · inaudible · relisten · pending   (hepsi korundu)
ekran sayaçları: Onaylandı 1 | Anlaşılmadı 1 | Yeniden dinlenecek 1 | Bekleyen 2
```

### Çözüm

- `assets/schema.js` → `REVIEW_LEGACY` tablosu ve `normalizeReviewState()`
  **tek kaynak** olarak eklendi.
- `normalizeSegment()` artık `normalizeReviewState()` kullanıyor.
- `app.js` içindeki **kopya** `REVIEW_LEGACY` tablosu kaldırıldı; şemadan
  içe aktarılıyor. Kopya kalsaydı iki tablo zamanla ayrışır ve aynı hata
  tekrar ederdi.

### KULLANICI NE GÖRECEK

- Eski (v2) dosyalarınızı açtığınızda **onaylarınız artık korunur**.
  "Onaylandı" olarak işaretlediğiniz bölümler "Onaylandı" kalır.
- Onay sayaçları ve rapor etiketleri dosyayı ilk açtığınızda doğru görünür;
  onları yeniden onaylamanız gerekmez.
- Daha önce bu sürümle açılmış bir dosyada onaylar bir kez kaybolmuşsa o
  kayıp geri getirilemez (dosyada artık `pending` yazıyor). Elinizde eski bir
  yedek varsa onu açtığınızda onaylar korunur.

### Testle korunur

`sema-testi` [4b] (12 kontrol): dört v2 kodu doğru v3 koduna çevrilir, dört
v3 kodu aynen korunur, bilinmeyen değer uydurulmaz (güvenli `pending`),
göç sonrası sayaçlar doğrudur. Test düzeltme yokken **kaldı**
(`367 geçti, 6 kaldı`), düzeltmeden sonra geçti (`373 geçti, 0 kaldı`).

## v2.88 — Onay metne bağlı değildi (kontrol edilmemiş metin onaylı görünüyordu)

CANLI VERİ. Bu, adli bütünlüğün temel kuralını bozan bir hataydı: **onay
metne bağlı değildi.**

### GERÇEK HATA

`setSegmentText()` yalnız metni yazıyor, kontrol durumuna hiç dokunmuyordu.
Yani onaylanmış bir bölümün metni **tamamen değiştirilse bile** rozet
"Onaylandı" kalıyor, sayaçlar "Onaylandı 1" gösteriyor ve o metin rapora
**onaylanmış** olarak giriyordu.

Depo ilkesi bunun tersini söylüyor: *"Kontrol edilmeyen deşifre, kontrol
edilmiş gibi gösterilmez."* AGENTS.md'deki "onay metne bağlıdır" kuralı yalnız
birleştirmede (`mergeCases`) uygulanıyordu; editörde uygulanmıyordu.

**Ölçüm (gerçek Chromium):**

```
ÖNCE   boş bölümü onayla        → "st-approved"
       metni TAMAMEN değiştir   → "st-approved"        ← değişmedi
       sayaçlar                 → "Onaylandı 1"
SONRA  metni değiştir           → "st-pending"
       sayaçlar                 → "Bekleyen 1 | Onaylandı 0"
       kullanıcı uyarısı        → "Bölüm 1: metin değiştiği için kontrol durumu
                                   'Kontrol bekliyor'a döndü. Metni dinleyip
                                   yeniden onaylayın."
       sayfa yenilendi          → onay gerçekten düşmüş (kalıcı)
```

### Çözüm

`setSegmentText()` — bütün metin yazma yollarının geçtiği **tek darboğaz** —
artık metin gerçekten değiştiyse `review = 'pending'` yapar. Bu üç durumu da
kapsar: "Onaylandı", "Anlaşılmadı", "Yeniden dinlenecek" (metin değiştiyse
bölüm yeniden dinlenmelidir).

Metin **değişmediyse** onay korunur: aynı metni yeniden yazmak onayı düşürmez.

### Sessiz düşüş yok

Onay düştüğünde kullanıcı **anında** bilgilendirilir (toast). Düşüş bayrağı
`setSegmentText()` içinde kurulduğu için yapıştırma, programatik yazma veya
odak olayı çalışmadığı durumlarda da bildirim kaçmaz. Her tuşta tekrar
etmez (bayrak bir kez gösterilip silinir).

### KULLANICI NE GÖRECEK

- Onayladığınız bir bölümün metnini değiştirirseniz rozet **"Kontrol
  bekliyor"a döner** ve ekranın altında neden döndüğünü söyleyen bir uyarı
  çıkar. Değişikliği dinleyip yeniden onaylamanız gerekir.
- Onaylı bölüm sayacı ve rapor etiketi bu değişikliği **anında** yansıtır;
  rapora artık kontrol edilmemiş metin "Onaylandı" olarak girmez.
- Aynı metni yeniden yazarsanız (değişiklik yoksa) onayınız korunur.

### Testle korunur

`birim-testleri` [20] (13 kontrol): metin değişince onay düşer, "Anlaşılmadı"
ve "Yeniden dinlenecek" de düşer, aynı metinde onay korunur, düşüş bayrağı
odak olayından bağımsız çalışır. Test düzeltme yokken **kaldı**
(`262 geçti, 6 kaldı`), düzeltmeden sonra geçti (`272 geçti, 0 kaldı`).

## v2.87 — Kayıt tamamen duruyordu (canlı veride iş kaybı)

CANLI VERİ. Bilirkişi "yaptığım tüm değişiklikleri kaybetmiş" ve "kayıt
başarısız uyarısını görmemiş" diye bildirdi. İkisi de doğruydu; iki ayrı hata
birleşince sessiz veri kaybı oluşuyordu.

### 1. GERÇEK HATA: bölüme tıklayınca kayıt tamamen duruyordu

`attachSegWave()` bölümün dalga formunu çizmek için malzeme nesnesine
**fonksiyon** yazıyordu (`m.__segWaveRebind`, `m.__segWaveRedraw`).
`persistNow()` ise `appState`'i doğrudan IndexedDB'ye yazıyor; tarayıcı yazarken
`structuredClone` yapar ve **fonksiyon kopyalayamaz**. İşlem
`DataCloneError` ile iptal ediliyor, hiçbir şey yazılmıyordu.

Sonuç: bölüm listesinden **herhangi bir bölüme tıkmak** (normal çalışmanın ilk
adımı) o oturumun geri kalanında her kaydı başarısız kılıyordu. Sayfa
yenilenene kadar yazılan her şey kayboluyordu.

Daha kötüsü: `JSON.stringify` fonksiyonları sessizce atladığı için **Dışa
aktar çalışıyordu**. Bilirkişi "yedeğim var" sanıyor, oysa kayıt yoktu.

**Ölçüm (gerçek Chromium):**

```
ÖNCE:  DataCloneError: () => { index2 = activeIdx(); ... } could not be cloned.
       durum: "● Kayıt başarısız"      IndexedDB: [""]     ← metin yok
SONRA: durum: "● Yerel kayıt güncellendi"  IndexedDB: ["BİLİRKİŞİ METNİ"]
       yenileme sonrası metin korundu.
```

**Çözüm:** `sanitizeForStorage()` — kayda ve dışa aktarıma giden derin kopya.
`__` ile başlayan her alan oturumluktur ve kayda girmez; fonksiyon hiçbir
koşulda yazılmaz; dava verisi (metin, ölçüm, günlük) aynen korunur. Orijinal
nesneye dokunulmaz (ekran fonksiyonları kullanmaya devam eder).

### 2. GERÇEK HATA: kayıt başarısız uyarısı görünmüyordu

Yazma başarısız olduğunda yalnız üst çubuktaki küçük `● Kayıt başarısız` yazısı
değişiyordu. Büyük uyarı şeridi **yalnız kota hatasında** çıkıyordu; bu hata
kota hatası sayılmadığı için hiçbir uyarı görünmedi. Bilirkişi çalışmaya devam
etti ve her şeyi kaybetti.

**Çözüm:** her yazma hatası artık büyük, ekranın üstünde, tam genişlikte bir
şerit gösterir: ne olduğunu ("Değişiklikleriniz KAYDEDİLMİYOR"), ne
kaybedeceğini ("sayfayı yenilerseniz kaybolur") ve ne yapacağını ("Dışa aktar
ile çalışmanızı bilgisayarınıza alın") açıkça söyler.

**Ölçüm (gerçek Chromium, yazma kasten bozuldu):**

```
durum: "● KAYDEDİLMİYOR — yedek alın!"
şerit: görünür · üst: 0px · yükseklik: 111px · genişlik: 780/780 (tam)
```

### KULLANICI NE GÖRECEK

- Bölüme tıkladıktan sonra yazdığınız metin **artık kaybolmuyor**; sayfayı
  yenileseniz de yerinde durur.
- Bir sorun nedeniyle kayıt yapılamazsa ekranın üstünde **kırmızı şerit**
  çıkar ve ne yapmanız gerektiğini söyler. Küçük yazıyı fark etmek zorunda
  kalmazsınız.
- Dışa aktarma da aynı temiz kopyayı kullanır; yedek dosyası gereksiz büyük
  veri (spektrogram, yakınlaştırma penceresi) taşımaz.

### Testle korunur

`birim-testleri` [17] (7 kontrol) ve [18] (6 kontrol): kayda giden kopyada
fonksiyon kalmaz, kopya klonlanabilir, orijinal bozulmaz, yazma hatası görünür
şerit üretir. Testler düzeltme yokken **kaldı** (kanıt: `236 geçti, 2 kaldı`),
düzeltmeden sonra geçti (`249 geçti, 0 kaldı`).

## v2.86 — Eksik ses yedeğe yazılıyor + yazma akıcılığı

CANLI veri denetimi 3. tur: büyük veri ve ses bütünlüğü.

### 1. GERÇEK HATA: ses bulunamazsa yedek sessizce eksik kalıyordu

Dışa aktarma döngüsünde:

```js
const blob = await getAudioBlob(c, m);
if (blob) assets.file(...);      // ← blob yoksa SESSİZCE atlanıyor
```

Tarayıcı verisi temizlenirse veya kota dolarsa ses blobu kaybolur. Yedek
"alındı" der, kullanıcı tam sanır — **ama ses yoktur**. Adli incelemede bu
kabul edilemez.

**Düzeltme:** eksik sesler toplanır, pakete `EKSIK_SES_UYARISI.txt` yazılır
(hangi dosya, hangi kayıt) ve bildirim açıkça söyler:
"Yedek alındı ANCAK N ses dosyası bulunamadı ve pakete GİRMEDİ."

### 2. Yazarken her tuşta ağır iş yapılıyordu

Her tuş vuruşunda `segCounts` (tüm bölümler × `segQuickCheck`) +
`renderOverview` çalışıyordu. **Ölçüm: 500 bölümde tuş başına 8,5 ms.**
Deşifre yazarken bu gecikme hissedilir.

**Düzeltme:** `scheduleLightRefresh()` — son tuştan 250 ms sonra bir kez.
Sayaçlar yine doğru, yazma akıcı.

### 3. Ölçülen performans (kabul edilebilir)

| Bölüm | Liste çizimi | Sayaç | HTML |
|---|---|---|---|
| 100 | 4,9 ms | 3,1 ms | 44 KB |
| 500 | 14,7 ms | 8,8 ms | 223 KB |
| 1000 | 24,6 ms | 17,2 ms | 446 KB |

JSON yazma: 500 bölümde 0,9 ms. Darboğaz yok.

### 4. Test

`surum-testi` [10]: 3 yeni kural (eksik ses uyarısı, bildirim, geciktirme).

## v2.85 — Rapor çıktısı denetimi: konuşmacı kodu kayboluyordu

CANLI veri denetiminin ikinci turu. Mahkemeye giden belge denetlendi.

### 1. GERÇEK HATA: konuşmacı kodu raporda kayboluyordu

Şema konuşmacıyı `label` alanında tutuyor; arayüzün **15+ yeri** `name`
okuyor (`speakerByName`, `speakerSegments`, `speakerRows`…). Yükleme
sonrasında `name` alanı yok olduğu için eşleşme kopuyordu:

```
speakers[0]: {"code":"S1","label":"Kiracı", ...}     ← name YOK
speakerByName bulur mu: false
→ raporda "S1 · Kiracı" yerine yalnız "Kiracı"
```

Kanıt: test çıktısında `HTML çıktısında konuşmacı kodu S1 var` **KALDI**.

**Düzeltme:** `normalizeSpeaker` içinde `out.name = out.label` (tek kaynak).
Yazma tarafında da `name` yazılınca `label` güncellenir. Artık üç çıktıda da
`S1 · Kiracı` görünür.

### 2. Rapor testi yalnız METNE bakıyordu, DOSYAYA bakmıyordu

Mevcut test UDF/DOCX üretip metnini çıkarıyordu ama **ZIP yapısını, XML
dengesini ve kaçışları** denetlemiyordu. Kullanıcı bu dosyayı mahkemeye
gönderiyor; dosya açılmazsa felaket.

**Eklenen [Senaryo 11]** (20 kontrol):
- ZIP gerçekten açılıyor mu, `content.xml` / `word/document.xml` var mı
- UDF'de `<template>`, `<styles>`, `<properties>`, `format_id` korunmuş mu
- Türkçe karakterler (şğüıöçİĞÜŞÖÇ) bozulmamış mı
- DOCX paragraf etiketleri dengeli mi (aç = kapa)
- CDATA dışında kaçırılmamış `&` kalmış mı
- **Konuşmacı kodu üç çıktıda da var mı**

Not: UDF tablosu uzun kelimeleri `\u200B` ile böler (taşmayı önleyen kasıtlı
davranış); test bunu temizleyerek karşılaştırır.

### 3. Ölçülen sonuçlar

| Çıktı | Sonuç |
|---|---|
| DOCX | 57.747 bayt, 10 dosya, 137 paragraf dengeli |
| UDF | 1 dosya, 3.915 karakter CDATA, şablon korunmuş |
| HTML | 6.623 karakter |

### 4. Test

`rapor-tutarlilik-testi.mjs` [Senaryo 11]: 20 yeni kontrol.
Toplam: 236 birim + 361 şema + rapor (tüm senaryolar).

## v2.84 — Veri güvenliği denetimi (CANLI veri)

KULLANICI: "Tam bir denetim yapalım. Bilirkişi gerçek verileri girmeye başladı,
yani CANLI'dayız."

Canlı veride öncelik görsel değil **veri kaybı**dır. Dört kritik hata bulundu;
üçü kanıtlandı, biri ölçüldü. Hepsi düzeltildi.

### 1. Tek bozuk alan BÜTÜN arşivi siliyordu (en tehlikeli)

`loadState()` içinde tek bir dosya normalleştirilirken hata çıkarsa `catch`
bloğu **tüm** durumu boşaltıyordu:

```js
catch (e) { appState = { cases: [], activeCaseId: null }; }  // ← TÜM VERİ GİTTİ
```

Sonraki herhangi bir kayıt bu boş durumu diske yazıyordu. Yani tek bozuk alan
→ arşiv yok. Node ile birebir kanıtlandı:

```
B) Tek dosyada bozuk alan (gerçek veri DOLU):
   dosya sayısı: 0
   GERÇEK VERİ KAYBOLDU MU?: EVET — TÜMÜ SİLİNDİ
```

**Düzeltme:** her dosya **ayrı** normalleştirilir; bozuk olan **yalnız o**
atlanır, diğerleri korunur. Atlananların ham kaydı `akis.rescue.failedCases`
anahtarına yazılır ve kullanıcı uyarılır. Okuma/kök hatasında **hiçbir şey
silinmez**, üzerine yazılmaz (`showLoadFailure`).

### 2. Sayfa kapanınca son 400 ms kayboluyordu

`persist()` yazmayı 400 ms geciktiriyor ve `beforeunload` dinleyicisi **yoktu**.
Bilirkişi yazıp hemen sekmeyi kapatırsa son değişiklik gidiyordu.

**Düzeltme:** `flushPersist()` + `beforeunload`, `pagehide`,
`visibilitychange` dinleyicileri. Ayrıca küçük bir **kurtarma kopyası**
(`akis.lastSnapshot`) bırakılır; depo boş açılırsa kullanıcıya "kurtarma
kopyası bulundu, geri yüklensin mi?" diye sorulur.

### 3. İki sekmede çalışmak diğerinin işini eziyordu

Her sekme **tüm** durumu yazıyordu; son yazan kazanıyordu. Node ile kanıtlandı:

```
A yazdıktan sonra disk: A METNİ
B yazdıktan sonra disk: ORİJİNAL
A'nın işi KAYBOLDU MU?: EVET
```

**Düzeltme:** `BroadcastChannel('akis.tab')` ile sekme sahipliği. Yeni sekme
açılınca eskisi **yazmayı bırakır** ve "bu sekme artık kaydetmiyor" uyarısı
gösterir. Kilitlemek yerine uyarı: bilirkişinin işi engellenmez, veri ezilmez.

### 4. Dışa aktarma yalnız AKTİF dosyayı yedekliyordu

4 dosya varken "Dışa aktar" tek dosyayı paketliyor, ekran yine de
"Bu bir yedektir" diyordu. Diğer 3 dosya **sessizce yedek dışı** kalıyordu.

**Düzeltme:** birden fazla dosya varsa hepsi tek pakete girer
(`archive.json` + `audio/<dosyaId>/`). Dosya adı
`AKIS_Yedek_4_dosya_2026-11-19.akis` olur. İçe aktarma `archive.json` görürse
**hepsini** geri yükler (`importArchive`) — yoksa yedek işe yaramazdı.

### 5. Test

- `sema-testi` [3d]: bozuk dosya izolasyonu (6 kontrol).
- `surum-testi` [10]: 8 veri güvenliği kuralı kodda var mı.
- Toplam: 236 birim + 361 şema + sürüm kontrolü.

## v2.83 — Otomatik çıktı ayrı saklanıyor + depolama iki havuzu ayırıyor

KULLANICI: harici bir analiz metni paylaştı; "özellikle veri kısmı beni
endişelendirdi, normalde storage'ı almıştık, veri sorunumuz yok ama".

Metindeki maddelerin çoğu AKİS'te **zaten vardı** (SHA-256, değişmez günlük,
kelime senkronizasyonu, klavye kısayolları, duyarlı arayüz). İki madde
**gerçek boşluktu** ve ikisi de düzeltildi.

### 1. Otomatik çıktı ile düzeltme ayrılmıyordu (GERÇEK BOŞLUK)

Modelin ürettiği metin yalnız `history` dizisinde kalıyordu ve **10 sürümden
sonra `shift()` ile SİLİNİYORDU**. Yani bilirkişi 11 kez düzenlerse "model ne
dedi" bilgisi kalıcı olarak kayboluyordu. Adli incelemede bu kabul edilemez:
otomatik çıktı ile onaylanmış metin ayrı belgelerdir.

Çözüm: `asrText`, `asrModel`, `asrAt` alanları. Model çıktısı **üretim anında**
(`parseAsrResult`) ayrı yazılır ve bir daha **değiştirilmez**. Bölüm detayında
metin değiştiyse "Otomatik çözümleme çıktısı (değiştirilmedi)" katlanmış bloğu
görünür — model kimliği ve zamanıyla. Eski kayıtlarda alan boştur; uydurma
yapılmaz.

### 2. Depolama göstergesi yanıltıyordu (GERİ BİLDİRİMİN HAKLI KISMI)

Kota **gerçekti** (`navigator.storage.estimate()`), ama tek sayı gösteriliyordu
ve o sayı **model önbelleğini de** içeriyor. 1,5 GB'lık Large model indirince
"%15 dolu" görünüyordu — dava verisi boş olsa bile. "Verim doldu" korkusunun
kaynağı buydu.

Çözüm: üst bar artık **iki havuzu ayırır**:
`Dava verisi: 17 MB · Model: 0 B · Kota: 10 GB (%0)`.
Model boyutu `scanModelCache()`'ten gelir. İpucunda hangisinin silinebilir
(model, yeniden indirilir) hangisinin silinemez (dava verisi) olduğu yazar.

### 3. Harici metindeki diğer maddeler — durum

| Madde | Durum |
|---|---|
| SHA-256 kaydı ve doğrulama | **Vardı** (v1'den beri) |
| Orijinal ses değişmez | **Vardı** (çalışma kopyası kullanılır) |
| Değişiklik kaydı (tarih/saat/kullanıcı) | **Vardı** (`history` + delil zinciri) |
| Kelime bazlı senkronizasyon | **Vardı** (`words`, karaoke) |
| Klavye kısayolları | **Vardı** |
| Duyarlı arayüz | **Vardı** (900/640px kırılımları) |
| Bölümleme kolaylığı | **Vardı** (✂ Böl, Alt+tıkla, A–B döngü) |
| Otomatik çıktı ayrı | **YOKTU → eklendi** |
| Depolama ayrımı | **YOKTU → eklendi** |
| Kelime başı/sonu hassas düzenleme | Kısmen: bölüm sınırı 1 ms; kelime sınırı arayüzde düzenlenemez |
| "Sunucu kaydı" ayrımı | **Yok ve olmayacak**: AKİS'te sunucu yok (depo ilkesi) |

### 4. Test

`sema-testi.mjs` [3c]: 10 kontrol — asrText/text ayrı, normalize korur, eski
kayıtta uydurma yok. `birim-testleri.mjs` [16]: 5 kontrol — bayt biçimi.
Toplam: 236 birim + 355 şema.

## v2.82 — Yerleşim düzeltmeleri (görsel bozulma)

KULLANICI: "Bazı görsel sorunlar olmuş, son yaptığın tüm değişikliklerdeki
yerleşimleri tekrar kontrol et."

Üç gerçek yerleşim hatası bulundu ve düzeltildi. Üçü de **CSS seçici sızıntısı
veya taşma** sınıfındandı; işlev bozulmuyordu, bu yüzden davranış testleri
yakalayamadı.

### 1. Konuşmacı seçimi "etiket" gibi görünüyordu

`#view-audio .sd-field > span` kuralı, etiket `<span>Konuşmacı</span>` için
yazılmıştı. Yeni konuşmacı seçicisini sararken `<span class="sd-spk-pick">`
kullandım; kural onu da yakaladı. Sonuç: seçim kutusu ve **＋** düğmesi 11px,
soluk, kalın etiket stiline düştü.

Düzeltme: `> span:not(.sd-spk-pick)`. Ayrıca `＋` düğmesi ve seçim kutusu en az
32px yüksekliğe sabitlendi (dar ekranda birbirini ezmesin).

### 2. Araç çubuğu öğeleri sessizce kesiliyordu

`.compact-bar` `flex-wrap:nowrap; overflow:hidden` idi. v2.80'de filtre çipi
sayısı 5 → 6 oldu ("Hızlı onaya uygun") ve "✓ N hızlı onayla" düğmesi eklendi.
Sığmayan çipler ve düğme **kesiliyordu** — kullanıcı düğmeyi hiç göremiyordu.

Düzeltme: çubuk ve filtre grubu alt satıra inebilir; hiçbir öğe kesilmez.

### 3. Dalga araç çubuğu BEŞ satıra kırılıyordu

v2.78'de üç düğme eklendi (A · B · 🔁 Döngü); çubukta artık beş düğme var.

İlk deneme `flex-wrap: wrap` oldu — **yetersizdi**. Gerçek Chromium'da ölçtüm:
çubuk **5 satıra** kırılıyor, **84px** yüksekliğe çıkıyor ve dalgayı aşağı
itiyordu. Gözle bakınca "idare eder" görünen şey ölçümde çirkin çıktı.

Düzeltme: **iki satırlı grid**. Üstte ipucu (tek satır, üç noktayla kısalır) ve
imleç zamanı; altta araç düğmeleri tek satırda, gerekirse yatay kayar.
Ölçüm: 84px → **57px**, 1400/1100/900/760px genişliklerde sabit.

### 4. Toplu onay düğmesi görsel aile kazandı

Diğer araç ikonlarıyla aynı gri görünüyordu; artık **yeşil** (onay ailesi) ve
kalın. Renk körlüğü için metin zaten "✓ N hızlı onayla" diyor.

### 5. Test

`tasarim-testi.mjs` [Yerleşim]: seçici sızıntısı yok, `nowrap+hidden` yok,
dalga çubuğu iki satırlı grid, araç satırı tek satırda kayar, toplu onay yeşil
ailede. Bu sınıf hata bir daha sessizce dönemez.

**Yöntem notu:** bu hatalar gözle bakılarak değil, **headless Chromium ile
ölçülerek** bulundu (`scrollWidth > clientWidth` = kesilen içerik; çocukların
`getBoundingClientRect().top` kümesi = satır sayısı). Ölçüm, "biraz bozuk
görünüyor" ile "5 satıra kırılıyor" arasındaki farkı kesinleştirir.

## v2.81 — Çözümleme profilleri (dürüst sınırla)

KULLANICI: "Şive olabilir, kıcırtı sesi olabilir, malzemenin sesi olabilir;
bu tür farklı çözümleri de düşünebilirsin."

### 1. Önce sınır: bunlar ayrı model ister

Şive tanıma, kaynak ayrıştırma (konuşmayı müzikten ayırma) ve malzeme sesi
sınıflandırma **ayrı eğitilmiş modeller** gerektirir. Bu depo öyle bir model
içermiyor. Depo ilkesi gereği **yapılmış gibi gösterilmez**; böyle bir düğme
konmadı ve rapora böyle bir yetenek yazılmaz.

### 2. Yapılan: aynı modelin yönlendirilebilir ayarı

`ASR_PROFILES` — dört profil:

| Profil | Ne değişir |
|---|---|
| Standart Türkçe konuşma | yalnız temel ayarlar |
| Şive / ağır aksan (ipucu) | bağlam istemi: "yerel şive ve ağır aksan içerebilir" |
| Gürültülü / kıcırtılı kayıt (ipucu) | bağlam istemi + tekrar cezası |
| Telefon / dar bant (ipucu) | bağlam istemi: "dar bantlı telefon görüşmesi" |

Dil her zaman **Türkçe**, görev her zaman **transkripsiyon** kalır; profil bunu
gevşetmez (test [13] bunu doğrular). Seçim `akis.asrProfile` ile hatırlanır.

### 3. Arayüz

Ayarlar çekmecesine **Çözümleme profili** seçicisi eklendi. Her seçeneğin
ipucu, profilin ne YAPMADIĞINI de yazar ("şive tanıma modeli DEĞİLDİR").

### 4. Tarayıcıda yakalanan dört ayrı hata (testler kaçırmıştı)

Sahte DOM ile çalışan testler geçiyordu ama gerçek tarayıcıda dört hata vardı:

1. **Geri alma hiç çalışmıyordu.** `renderUndoState()` `#undoState` arıyordu;
   düğmenin kimliği `#undoBtn`. Eleman bulunamadığı için sayaç yazılmıyor,
   düğme **hep devre dışı** kalıyordu. Yani "Ctrl+Z ile geri alınır" vaadi
   arayüzde yürümüyordu.
2. **Toplu onay düğmesi görünmüyordu.** Düğme yalnız tam çizimde ekleniyordu;
   metin yazıp sayaç değişince yenilenmiyordu. `refreshSegChips()` artık
   düğmeyi yerinde tazeler.
3. **Elle eklenen bölüm "(kayıtlı değil)" konuşmacıya bağlanıyordu.** Konuşmacı
   kaydı oluşturulmadan `speaker: 'Konuşmacı 1'` yazılıyordu.
4. **Zaman kodu tutarsızdı.** Elle eklenen bölüm `00:00:00` (ms'siz), bitişi
   `00:00:05.000` yazılıyor; rapor satırı "00:00:00 – 00:00:05.000" oluyordu.
   Depo kuralı "zaman kodu HER ZAMAN ms içerir". `tcRange()` üç çıktıda da
   tek biçim uygular.

Ayrıca `fmtWer` "%94.0" yazıyordu; Türkçe ondalık ayırıcı virgüldür → "%94,0".

### 5. Test

- `birim-testleri.mjs` [13] profil (19 kontrol), [14] zaman aralığı biçimi,
  [15] WER biçimi.
- `surum-testi.mjs` [9]: JS'in zorunlu kimlikleri HTML'de var mı, `renderUndoState`
  doğru düğmeyi mi hedefliyor. Bu kontrol olmadan 1. hata yine sessizce döner.
- Toplam: 231 birim + 345 şema kontrolü, hepsi geçiyor.

## v2.80 — Hızlı onaya uygun filtresi + toplu onay

KULLANICI: "Otomatik onaylayabileceğimiz, doğrulukları yüksek olanları
belirleyelim. Sol panelde filtre de var; böyle filtrelerimiz olsun."

### 1. Neden "doğruluk yüzdesi" YOK

Whisper modeli güven skoru vermiyor. Uydurma bir "%97 doğru" etiketi, bilirkişi
raporunda savunulamayacak bir iddia olurdu. Bu yüzden ölçüt yalnız
**gözlemlenebilir** işaretlere dayanır ve gerekçesi yazılır.

### 2. `segQuickCheck` — uygunluk ölçütü

Uygun sayılmama nedenleri (hepsi metinle gösterilir):
- anlamlı metin yok (boş/dolgu çıktı)
- süre geçersiz (0) veya çok kısa (< 1,2 sn) — sınır hatası olasılığı yüksek
- model tekrarı işareti (cümle düzeyinde)
- üst üste konuşma / anlaşılmaz gözlemi işaretlenmiş
- önceki bölümle çakışan zaman aralığı

### 3. Sol panelde filtre

`SEG_FILTERS`'a **Hızlı onaya uygun** eklendi; sayaç (`segCounts.quick`) ve
filtre aynı fonksiyonu kullanır, arayüz ile liste ayrışamaz.

### 4. Toplu onay

`✓ N hızlı onayla` düğmesi **yalnız** ölçütü geçen bölümleri onaylar.
- Uygun olmayanlara **dokunmaz**; kaç bölümün onaylandığını söyler.
- **Geri alınabilir** (Ctrl+Z) ve **delil günlüğüne** yazılır.
- Onay yetkisi kuralı korunur: ikinci göz (yardımcı/gözlemci) düğmeyi görmez
  ve fonksiyon da reddeder.
- Düğme yoksa "uygun bölüm yok" — sessiz başarısızlık yok.

### 5. Test

`birim-testleri.mjs` [12]: 18 yeni kontrol (uygunluk, gerekçeler, filtre,
sayaç tutarlılığı). Toplam 203 birim kontrolü geçiyor.

## v2.79 — Konuşmacı standardı: rol/cinsiyet sessizce kayboluyordu

KULLANICI: "Konuşmacıları nasıl kodlayalım, bir standardı olsun."

### 1. GERÇEK VERİ KAYBI bulundu (kanıtlandı)

Arayüz uzun süredir rol ve cinsiyeti **Türkçe etiket** olarak yazıyordu
(`Davacı`, `Kadın`). Şema ise **ASCII kod** bekler (`complainant`, `female`).
Etiket kayda yazılınca `normalizeSpeaker` onu tanımıyor ve değeri
`unspecified`'a düşürüyordu:

```
yazılan:  { role: "Davacı", gender: "Kadın" }
geri okunan: unspecified / unspecified     ← bilirkişinin girdiği kayboldu
```

Yani her yenilemede bilirkişinin yazdığı rol ve cinsiyet **sessizce siliniyordu**.

### 2. Standart konuşmacı kodu: S1, S2, S3…

- Her konuşmacı **değişmez kod** taşır; etiket değişse de kod kalır.
- Kod bir kez verilir, silinen konuşmacının kodu yeniden kullanılır
  (raporda `S1, S3` boşluğu oluşmaz).
- Bölümdeki konuşmacı alanı **serbest metin değil listedir** (`S2 · Kiracı`).
- **＋** düğmesi yeni konuşmacı ekler: sıradaki boş kodu alır ve o bölüme atanır.
- Bölüm listesindeki rozet etiket yerine kodu gösterir (dar alan, okunur).
- Raporun **üç çıktısı** (HTML/DOCX/UDF) tek kaynaktan beslenir
  (`segSpeakerCell`); bir çıktıda kod, diğerinde etiket görünmez.

### 3. Kod ≠ etiket kuralı tam uygulandı

- Seçeneklerin `value` değeri **kod**, görünen metin **etiket**.
- Kayda yalnız kod yazılır; rapora yalnız etiket basılır.
- Eski kayıtlar `normalizeSpeakerRole` / `normalizeSpeakerGender` göç
  tablolarıyla kurtarılır (`Davacı → complainant`, `Kadın → female`).

### 4. Takip modu: üç ayrı gerçek hata

Kullanıcı: "takip modunda metin görünüyor ama takip etmiyor, tam okunamıyor."

- `followTick` **ilk** ses kartını alıyordu; birden fazla kayıtta yanlış
  dosyanın konumu okunuyordu → artık **aktif kaydın** kartı kullanılır.
- `syncSegDetailInPlace` **var olmayan seçiciler** kullanıyordu
  (`.seg-detail-head`, `.seg-times`, `.seg-meta-row`, `.seg-text-wrap`).
  Panel v2.62'de `.sd-head`, `.sd-times`, `.sd-meta`, `.sd-text` olduğu için
  hiçbir alan eşleşmiyor, sağ panel eski bölümde kalıyordu → seçiciler düzeltildi.
- Uzun metinde vurgu görünür alanın dışında kalıyordu → vurgu kutusu kendi
  içinde kaydırılır.

### 5. Test

- `sema-testi.mjs` [3b]: rol/cinsiyet göçü, kod atama, çakışma, etiket
  bağımsızlığı (16 yeni kontrol).
- Toplam: 345 şema kontrolü + 186 birim kontrolü, hepsi geçiyor.

## v2.77 — Belge koruması, buton hiyerarşisi, takip modu düzeltmesi

KULLANICI: "Bir sürü kural/plan değişikliği yapıyoruz, bunları bir yerlere not
alıyor muyuz? İki gün sonra unutmayalım. Her yer buton oldu, hepsi aynı renk;
gözümüz net seçsin. Takip modunda metin görünüyor ama takip etmiyor."

### 1. Belge boşluğu bulundu (kullanıcı haklıydı)

Ölçüm — `docs/OZELLIKLER.md` içinde:
```
"geri al" / "Ctrl+Z"   → 0 kez
"yeniden çözümle"      → 0 kez
"bölme"                → 0 kez
"metin paylaştırma"    → 0 kez
```

Son 10 sürümün özellikleri belgede **yoktu**. Tasarım değişince kaybolurdu.

**Çözüm:**
- `OZELLIKLER.md`'ye üç yeni bölüm: Bölüm düzenleme, Geri alma, Depolama.
- **Otomatik koruma:** `tools/surum-testi.mjs` artık 7 konuyu ve 4 yardım
  başlığını denetliyor. Yeni özellik belgeye yazılmazsa **test kalır**.

### 2. Buton hiyerarşisi (26 buton → 5 aile)

| Aile | Renk | Örnek |
|---|---|---|
| Oynatma/gezinme | nötr gri | ↑ ↓ ⏹ |
| Onay | **yeşil** | ✓ Onayla → |
| Gözlem | **altın** (basılınca dolar) | gürültü, üst üste |
| Yapısal (böl/çözümle) | **mavi** | buradan böl, ↻ Bu aralığı çözümle |
| Yıkıcı | **kırmızı** | sil |

Renk tek başına anlam taşımaz — metin/ikon da farklı (renk körlüğü).
Araç satırının üstüne kesikli ayırıcı eklendi.

### 3. Takip modu düzeltildi

Ölçüm: `followKaraoke()` yalnız **karaoke kutusuna** yazıyordu; sağ paneldeki
metin alanı beslenmiyordu. Kullanıcı "metin görünüyor ama takip etmiyor"
diyordu — doğruydu.

**Çözüm:** `markTextFollow()` eklendi. Sağ paneldeki metnin **üstünde** canlı
okunan kısım vurgulanır (kelime zamanlaması varsa kelime kelime, yoksa
oransal). Ayrıca bir bölüm "Dinle" ile çalınca takip **otomatik açılır**.

### 4. Model seçimi sorusu — cevap

Ölçüm: model seçimi **v2.73'e kadar kaydedilmiyordu**. Her açılışta
`recommendModel()` çalışıyordu:
- WebGPU varsa → **Orta**
- WebGPU yoksa → **Küçük**

Sizin durumunuz: Large kullanıyordunuz ama kayıt yoktu → öneri (Orta)
uygulandı. **v2.73'ten sonra** seçiminiz `akis.model` ile saklanıyor;
Large seçerseniz hatırlanır.

## v2.76 — Bölüm aralığını yeniden çözümle (metin kaybolursa geri getir)

KULLANICI: "Bir bölümü bölüyorum ama bazen metin gidiyor. O iki aralığın
metnini getiremez miyim, yeniden çözümleyemez miyim?"

### Yeni: `↻ Bu aralığı çözümle`

Bölümün **başlangıç–bitiş aralığı** ses dosyasından kesilir, yalnız o parça
modele verilir. Diğer bölümlere **dokunulmaz**.

```
Bölüm 3:  [15.560 ───── 18.000]   ← yalnız bu aralık modele gider
Bölüm 4:  [18.000 ───── 21.004]   ← etkilenmez
```

**Ne zaman kullanılır:**
- Bölme sonrası metin boş kaldıysa
- Metin yanlış çözümlendiyse, yalnız o bölüm düzeltilsin isteniyorsa
- Bölüm sınırları değiştirildiyse, yeni aralık yeniden çözümlensin isteniyorsa

**Güvenlik:**
- Metin varsa **onay sorulur** (mevcut metin değişecek).
- **Ctrl+Z** ile geri alınabilir.
- Eski metin **metin geçmişine** yazılır (`geçmiş (N)` düğmesi).
- Yeni metin **"Kontrol bekliyor"** olur — dinleyip doğrulamalısınız.
- İşlem **delil günlüğüne** yazılır: aralık + parça sayısı.

**Sınırlar:**
- Aralık en az **0,3 sn** olmalı.
- Model gereklidir (ilk kullanımda indirilir).
- Aralık ses dosyasının dışındaysa uyarı verir.

### Test

`sema-testi.mjs` [13] bloğu eklendi (317 → 329 kontrol).

## v2.75 — Geri alma (Ctrl+Z) + dalga kaydırma + bölme netliği

KULLANICI: "Yanlış yaparsam geri alabilir miyim? Kaydırma kesin lazım. Bölme
hangi bölümü bölüyor, metni yeniden mi çözümlüyor?"

### 1. Geri alma — YOKTU, eklendi

Ölçüm: `grep "undo|geri al"` → **0 sonuç**. Bölme, silme, birleştirme
işlemlerinde geri dönüş yoktu; scroll sırasında kaybolan veri
kurtarılamıyordu.

**Artık:**
- Her yıkıcı işlemden **önce** durumun anlık görüntüsü saklanır (son 20 adım).
- **Ctrl+Z** veya üst bardaki **↶ N** düğmesi.
- Kapsam: bölme, bölüm silme, birleştirme, paragraf, kayıt kaldırma, içe
  aktarma, dosya birleştirme, yeniden çözümleme.
- Metin yazarken Ctrl+Z **tarayıcının kendi** geri almasını kullanır (karakter
  geri alma), belge işlemlerini değil. Karışmaz.

### 2. Dalga kaydırma (pan)

Üç işlev ayrıldı, birbirine karışmıyor:

| İşlem | Ne yapar |
|---|---|
| **Sürükle** | B/S sınırını taşır |
| **Shift + sürükle** (veya orta tuş) | Görünümü kaydırır (pan) |
| **Tekerlek** | Yakınlaştırır |

### 3. Bölme netliği

- **✂ Böl** → sağ panelde **açık olan (aktif)** bölümü ikiye ayırır.
  Sol listeden seçtiğiniz bölümdür.
- **Metin yeniden çözümlenmez.** LLM çalışmaz. Mevcut metin kesim noktasına
  göre paylaştırılır (v2.74).
- Bölme noktası: dalga üzerinde farenin bulunduğu an (üstte zaman olarak
  görünür) ya da oynatıcı konumu.
- Bölünen iki bölüm de **"Kontrol bekliyor"**a döner (metin değişti).
- İpucu metinleri ve Yardım ekranı bunu açıkça yazıyor.

### Test

`sema-testi.mjs` [12] bloğu eklendi (299 → 317 kontrol).

## v2.74 — Bölme: metin artık paylaştırılıyor + tam noktadan bölme

KULLANICI: "Böl dediğimde iki bölümde de aynı metin var. Otomatik böldüğüm
yerden metinler ayrılmalı. Ayrıca hangi bölümü böldüğümü anlamıyorum, sanki
ortayı bölüyor. Dalga alanı fareyle kaydırılamıyor (zoom oluyor)."

### Bulunan hata: metin ikiye kopyalanıyordu

Ölçüm:
```
Sol : "Bu konuyla da ilgili sana maruzatımı defalarca kez dile getirmeme rağmen"
Sağ : "Bu konuyla da ilgili sana maruzatımı defalarca kez dile getirmeme rağmen"
-> İKİSİ DE AYNI METİN
```

Bölme `{...s}` ile tüm alanları kopyalıyordu; metin paylaştırılmıyordu.

### Çözüm: `splitSegmentText()`

Üç kademeli:
1. **Kelime zamanlaması (`words`) varsa** — kesim anından önceki kelimeler
   sola, sonrakiler sağa. En doğru yöntem.
2. **Yoksa** — metin, kesim oranına göre **kelime sınırından** bölünür
   (yaklaşık; kullanıcı kontrol eder).
3. **Hiçbiri mümkün değilse** — metin ikiye kopyalanır ve kullanıcı
   uyarılır: "Metin ikiye kopyalandı; her iki bölümü de düzeltin."

Ölçüm (kelime zamanlamasıyla):
```
SOL : "Bu konuyla da ilgili sana"
SAĞ : "maruzatımı defalarca kez dile getirmeme rağmen"
sol + sağ = orijinal metin  ✅
```

### Bölme noktası artık SİZİN seçtiğiniz yer

- **Dalga üzerinde imleç zamanı gösterilir** (`00:00:18.000`).
- **✂ Böl** düğmesi dalganın üzerinde: imlecin olduğu yerden böler.
- "Buradan böl" düğmesi de aynı fonksiyonu kullanır (oynatıcı konumu).
- "Ortayı bölüyor" hissi biter: nokta sizin kontrolünüzde.

### Bölünen bölümler

- Onay durumu **"Kontrol bekliyor"**a döner (metin değişti, doğrulanmadı).
- `textRev` sıfırlanır (yeni bölümler, elle düzeltilmiş sayılmaz).
- İki bölüme **ayrı kimlik** verilir.

### Test

`sema-testi.mjs` [11] bloğu eklendi (283 → 299 kontrol).

## v2.73 — Veri 5 MB'lık yere sıkışmıştı; 10 GB'lık alana taşındı

KULLANICI: "Küçültüyoruz diye kaliteyi ve kullanım özelliklerini kaybetmeyelim.
Biz niye öyle küçük bir alana kendimizi sıkıştırdık? Sesleri de geniş bir alana
koysaydık. Ayrıca ekranda ne kadar kullandık, ne kadar kaldı yazmıyor."

### Kullanıcı haklıydı: mimari hataydı

Ölçüm:
```
Tarayıcı kotası      : 10 GB   <- IndexedDB bunu kullanır
localStorage limiti  :  5 MB   <- dava verisi BURADA idi
```

Veri 10 GB'lık alan varken **5 MB'lık yere** yazılıyordu. v2.72'de bunu
"küçültme" ile telafi etmeye çalıştım — yanlış yaklaşımdı. Doğrusu veriyi
geniş alana taşımaktı.

### Çözüm: dava verisi IndexedDB'ye taşındı

- Aynı veritabanında ikinci store: `STATE_STORE` (DB sürümü 1 → 2).
- `persist()` artık IndexedDB'ye yazar; 400 ms içinde biriken çağrılar tek
  yazmada birleştirilir (yazma yarışı yok).
- `loadState()` async oldu; `init()` bekler (boş ekran gösterilmez).
- **Göç:** eski localStorage kaydı bulunursa okunur, IndexedDB'ye taşınır ve
  localStorage'daki büyük kopya silinir. **Mevcut veri kaybolmaz.**

### Kalite geri geldi (v2.72'de kısıtlananlar)

| Alan | v2.72 (kısıtlı) | v2.73 (geri) |
|---|---|---|
| Kelime zamanlaması (`words`) | kaydedilmiyordu | **kaydediliyor** — karaoke yeniden yüklemede çalışır |
| Metin geçmişi | 3 kayıt | **10 kayıt** |

### Depolama göstergesi (üst barda)

```
Depolama: 5 KB / 10.00 GB (%0)
```

`navigator.storage.estimate()` ile gerçek kullanım. %70'te altın uyarı,
%90'da kalın. Üzerine gelince kullanılan/kota/kalan ayrıntısı.

## v2.72 — Depolama bir davada doluyordu (%76 küçültüldü)

KULLANICI: "Hemen uyarı verdi? Daha sadece bir dava var, ne kadar dolmuş ki?"

### Ölçüm: üç suçlu

```
200 bölüm, geçmiş YOK                     :   60 KB
+ 30 kelime zamanlaması (karaoke)         :  380 KB
+ 20 geçmiş kaydı (her biri tam metin)    :  843 KB
+ yeniden çözümleme yedeği (v2.71)        : 1917 KB
Gerçek yer: 3.74 MB  ->  5 MB kotanın %75'i
```

**Tek dava kotanın %75'ini dolduruyordu.** Sebepler:

1. **`words` (kelime zamanlaması)** — karaoke için gerekli, ama **kalıcı
   olması gerekmiyor**. Her kelime için `{w, s, e}` üç alan; 200 bölümde
   ~320 KB.
2. **`history` 20 kayıt** — her kayıt **metnin tamamını** saklıyor. 200
   bölümde ~770 KB.
3. **`previousSegments`** — v2.71'de eklediğim geri dönüş yedeği, bölümlerin
   **tam kopyasını** (geçmiş ve kelimeler dahil) saklıyordu: dosyayı iki
   katına çıkarıyordu.

### Çözüm

| Değişiklik | Kazanç |
|---|---|
| `words` kayda/dışa aktarıma yazılmaz (normalize'da boşaltılır) | ~320 KB |
| Geçmiş sınırı 20 → 3 | ~600 KB |
| `previousSegments` yalnız metin/zaman/kontrol taşır | ~900 KB |
| Açılışta eski kayıtlar temizlenir | mevcut dosyalar |

Karaoke çalışmaya devam eder: kelime zamanlaması bölüm çalındığında modelden
yeniden üretilir; kalıcı olması gerekmez.

### Ölçüm (sonra)

```
ÖNCE  : 639 KB | 1.25 MB | kota %25   -> 5 MB'a 4 dava
SONRA : 151 KB | 0.30 MB | kota %6    -> 5 MB'a 16 dava
Kazanç: %76 küçüldü
```

## v2.71 — "Yeniden çözümle" tüm elle düzeltmeleri siliyordu (kritik)

KULLANICI: "Bu yeniden çözümle deyince ne oluyor?"

### Ölçümle bulunan en büyük veri kaybı

```js
m.segments = collected;   // mevcut bölümlerin ÜZERİNE yazılır
```

Ölçüm:
```
ÖNCE (elle düzeltilmiş, onaylanmış):
  "ELLE DÜZELTİLMİŞ METİN 1"  | Onaylandı | textRev: 3
  "ELLE DÜZELTİLMİŞ METİN 2"  | Onaylandı | textRev: 2

"Yeniden çözümle" sonrası:
  "model çıktısı 1"  | Bekliyor
  "model çıktısı 2"  | Bekliyor

-> TÜM DÜZELTMELER KAYBOLDU, onaylar kayboldu
-> Uyarı YOK, soru YOK, geri alma YOK
```

Kullanıcı yanlışlıkla basarsa saatlerce emek gider. Bu, bugünkü veri
güvenliği çalışmasında gözden kaçmıştı.

### Çözüm

**1. Onay sorusu.** Elle düzeltilmiş veya onaylanmış bölüm varsa:

> **Yeniden çözümleme mevcut düzeltmeleri siler**
> Bu kayıtta N bölüm elle düzeltilmiş veya onaylanmış. Yeniden çözümleme bu
> bölümlerin TAMAMINI siler ve modelin yeni çıktısıyla değiştirir. Eski hâli
> geri dönebilmek için saklanacak. Devam edilsin mi?
> [Vazgeç] [Devam et]

**2. Geri dönüş kopyası.** Devam edilirse eski bölümler `previousSegments`
alanında saklanır ve işlem günlüğüne yazılır.

**3. "Önceki bölümleri geri yükle" düğmesi.** Kayıt bilgileri sekmesinde,
yedek varsa görünür. Basınca onay sorar, sonra eski bölümleri geri getirir.

### Akış

```
Elle düzeltme var mı?
  EVET -> Onay sor -> Vazgeç: hiçbir şey olmaz
                   -> Devam : eski bölümler saklanır, çözümleme başlar
                              sonra "Önceki bölümleri geri yükle" ile dönülebilir
  HAYIR -> Doğrudan çözümle (soru yok, gereksiz sürtünme yok)
```

## v2.70 — Yarıda kalan çözümleme dosyaya yazılıyordu (donmuş %70)

KULLANICI: "2.68 sürümünde dışa aktardım, başka bilgisayarda içe aktardım.
Ama sanki çözümleme yapıyor gibi, %70'te duruyor. İptal de çalışmıyor."

### Bulunan hata: geçici durum kalıcı olmuş

`transcribing` bir **işlem durumu**dur (o an çalışıyor demek). `progress` de
geçici bir sayaç. İkisi de dosyaya yazılıyordu.

Ölçüm:
```
Dışa aktarılan dosya:  status=transcribing, progress=70
İçe aktarma sonrası:   status=transcribing, progress=70   <- hâlâ
Gerçekte:              çözümleme YOK (hiçbir işlem çalışmıyor)
İptal düğmesi:         cancelRequested=true yazar, ama okuyan döngü yok
                       -> hiçbir şey olmaz
```

Yani dosya çözümleme **sürerken** dışa aktarılmış. O donmuş hâl dosyaya
yazılmış; başka bilgisayarda açılınca sonsuza kadar "%70 çözümlüyor" görünüyor.

### Çözüm (iki katman)

**1. `normalizeMaterial()`** — `transcribing` asla kalıcı olmaz:
```
transcribing + bölüm var  -> partial  (kısmen çözümlendi)
transcribing + bölüm yok  -> pending  (inceleme bekliyor)
```
Gerçek durumlar (`review`, `pending`, `partial`, `error`, `empty`,
`cancelled`) aynen korunur.

**2. `stripDerivedFields()`** — açılışta eski kayıtlar da temizlenir:
`transcribing` → `partial`/`pending`, `progress` silinir,
`cancelRequested` silinir.

Böylece hem yeni hem eski dosyalar güvenli. Kullanıcı dosyayı açtığında
"Çözümle" düğmesi görünür (İptal değil) ve işlem gerçekten çalışır.

### Test

`sema-testi.mjs` [7j] bloğu eklendi (273 → 283 kontrol).

## v2.69 — Veri güvenliği: sessiz kayıp önlendi + model hatırlanıyor

KULLANICI: "Veri kaybederiz gibi geliyor. Bilgileri nerede tutuyoruz? Umarım
güvendedir. Ayrıca model her seferinde ortayı seçiyor, benim seçtiğimi
hatırlamıyor."

### Ölçüm: veri nerede, ne kadar güvende?

```
Metin/deşifre  -> localStorage  (tipik limit 5 MB)
Ses dosyaları  -> IndexedDB     (çok daha büyük)
```

Kapasite ölçümü (200 bölümlü dosya = 71 KB):
```
5 MB limitine sığar  : ~72 dosya
10 MB limitine sığar : ~144 dosya
```

### Bulunan sessiz veri kaybı

`persist()` depolama dolduğunda yalnızca küçük bir yazı değiştiriyordu:

```js
$('#saveState').textContent = '● Kayıt alanı dolu';
```

Başka hiçbir şey olmuyordu. **Kullanıcı yazmaya devam eder, hiçbir şey
kaydedilmez, hiçbir uyarı penceresi çıkmaz.** Adli belgede kabul edilemez.

Ayrıca **hiçbir yerde yedek hatırlatması yoktu** (ölçüm: 0 sonuç).

### Çözüm 1: Büyük uyarı şeridi

Depolama dolduğunda ekranın üstünde kapatılabilir ama görünür bir şerit:

> **Depolama doldu — yeni değişiklikler KAYDEDİLMİYOR**
> Tarayıcının yerel alanı doldu. Şu andan sonra yaptığınız düzenlemeler
> kaybolur. Hemen **Dışa aktar** ile dosyayı bilgisayarınıza alın, sonra eski
> dosyaları silin.
> [Dışa aktar] [×]

Durum göstergesi de kırmızıya döner: "● KAYIT ALANI DOLU — yedek alın!"

### Çözüm 2: Yedek durumu göstergesi (üst barda)

```
Hiç yedek alınmadı          (gri)
Son yedek 19.11.2026        (yeşil)
Son yedek 15.11.2026 (4 gün önce)  (altın, kalın)
```

Dışa aktarma yapıldığında zaman damgası kaydedilir. 3 günden eskiyse uyarır.
Böylece "veri nerede, yedek var mı" sorusu ekranda cevaplanır.

### Çözüm 3: Model seçimi hatırlanıyor

Ölçüm: model seçimi **hiçbir yere kaydedilmiyordu**. Her açılışta
`applyRecommendation()` çalışıp öneriyi (CPU'da "Küçük") uyguluyordu.
Kullanıcı Large-v3-turbo seçse bile ertesi açılışta "Küçük"e dönüyordu.

Artık `akis.model` anahtarıyla saklanır; açılışta geri yüklenir. Öneri metni
de "Seçtiğiniz model korunuyor: …" der.

### İçe aktarma sorusu (doğrulandı)

Kullanıcı: "Dışa aktardım, boş tarayıcıda içe aktardım. Yeniden çözümlemem
gerekir mi?"

**Hayır.** Ölçüm:
```
İçe aktarma sonrası:
  bölüm sayısı : 2 (korundu)
  metin        : korundu
  onay durumu  : approved (korundu)
  model        : whisper-large-v3-turbo (korundu)
  durum        : review (korundu)
-> Çözümleme KORUNDU; yeniden çözümleme gerekmez.
```

## v2.68 — Yardımcı kendi yazdığını göremiyordu (veri kaybı hissi)

KULLANICI: "Yardımcı düzeltir diyorsun ama onaylandı diyemiyor, düzeltim de
demiyor. Bu adam nasıl takip edecek? Hiçbir şey değişmiyorsa onun ekranında.
Veri kaybederiz gibi geliyor. Yanlışlıkla içe aktar da diyebilir."

### Bulunan hata: yardımcı kendi yazdığını göremiyordu

Ölçüm:
```
Yardımcı "düzeltilmiş metin" yazdı
  -> s.proposal = "düzeltilmiş metin"    (kaydedildi)
  -> textarea gösteriyor: "ham metin"    (ESKİ METİN)
```

`applyTextEdit()` öneriyi `proposal` alanına yazıyor, `text` değişmiyor —
doğru. Ama **textarea `s.text` gösteriyordu**. Sonuç: yardımcı yazıyor, panel
yenilenince (başka bölüme geçip dönünce) **kendi yazdığını göremiyordu**.
"Hiçbir şey değişmiyor" hissi tam buydu. Veri kaybı değildi ama **görünmezdi**.

**Çözüm:** İkinci göz rolündeyken textarea öneriyi gösterir; placeholder da
"öneri olarak kaydedilir, ana metne girmez" der.

### İkinci düzeltme: yanlışlıkla İçe aktar

Kullanıcı "Birleştir" yerine "İçe aktar"a basabilir; bu yeni kopya açar ve
öneriler o kopyada kalır. Aynı dosya zaten açıksa artık **onay sorulur**:

> "Bu dosya zaten açık. İçe aktarma YENİ BİR KOPYA açar; birleştirme yapmaz.
> Yardımcıdan gelen düzeltmeleri almak istiyorsanız 'Vazgeç' deyip
> ⇄ Birleştir düğmesini kullanın."

### Üçüncü düzeltme: yanlış rol seçimi

Kullanıcı yardımcıyı yanlışlıkla "Bilirkişi" olarak eklerse o kişi onaylayabilir.
Artık "Şu an bu bilgisayarda çalışan" seçilince rol bildirilir:

> "Ayşe — Yardımcı: düzeltmeleri ÖNERİ olur, onaylayamaz."
> "Ahmet — Bilirkişi: metni onaylayabilir."

Böylece yanlış rol sessizce geçmez.

## v2.67 — Ekip çalışması akışı Yardım ekranına yazıldı

KULLANICI: "Bende kontrol bölümünde öneri diye bir şey çıkacak diye
azannediyorum... Yardımcı onaylandıya basar... sonra ben içe aktarırım...
doğru mu böyle mi çalışıyor? Çünkü hiçbir yere bununla ilgili bir şey
yazmamışız."

### Kullanıcı haklıydı: akış hiçbir yerde yazmıyordu

Yardım ekranında (?) "Klavye kısayolları", "Ses çözümleme", "Gizlilik"…
bölümleri vardı ama **ekip çalışması yoktu**. Kullanıcı akışı tahmin etmek
zorunda kalıyordu.

### Ölçümle bulunan iki yanlış anlama

Senaryo uçtan uca simüle edildi. Kullanıcının anlattığı iki nokta yanlıştı:

**1. "Yardımcı onaylandıya basar"** — Yanlış. Uygulama engeller:
```
canApproveRole('assistant') = false
-> ENGELLENİR: "Onay yetkisi dosya sorumlusunda" uyarısı çıkar
```

**2. "Ben içe aktarırım"** — Yanlış. İçe aktar **yeni kopya** açar
(`case.id = uid()`), birleştirmez. Öneriler o kopyada görünür, sizin
dosyanızda değil. Doğru düğme: **⇄ Birleştir**.

### Doğru akış (Yardım ekranına eklendi)

```
1. Bilirkişi: ekip bölümüne kendini ekle (görev: Bilirkişi),
   "Şu an çalışan"dan seç
2. Dışa aktar → .akis dosyasını yardımcıya gönder
3. Yardımcı: İçe aktar → kendini Yardımcı olarak ekle ve seç
4. Yardımcı düzeltir → ÖNERİ olur (ana metin değişmez)
   "Onayla"ya basarsa "yetki yok" uyarısı alır
5. Yardımcı dışa aktarır → size gönderir
6. Siz: ⇄ BİRLEŞTİR (İçe aktar DEĞİL)
7. Listede "Öneri" rozetli satıra tıkla → Kabul et / Reddet
8. Kabul edilen metin ana metne girer, durum "Kontrol bekliyor"a döner
9. Onay yetkisi sizde. Rapor bilirkişi adına; ekip adı geçmez
```

### Doğrulama (simülasyon)

```
3) Yardımcı metni düzeltti -> ONERI | ana metin: "ham metin bir" (değişmedi)
4) Yardımcı "Onaylandı" seçti -> ENGELLENDİ
7) Birleştir: metin "ham metin bir", öneri "Ham metin bir (düzeltilmiş)."
   uygulanan: 3, çakışma: 0
```

## v2.66 — Gözlemci onaylayabiliyordu (rol yetkisi hatası)

KULLANICI: "Bu sürü rol kısmı var, burada bir şey ekleyecek miyim? Eklersem ne
oluyor?" — ekran görüntüsünde **Gözlemci** seçiliydi.

### Bulunan hata

Rol yetki tablosu ölçüldü:

```
Dosya sorumlusu (owner)     -> TAM YETKİ
Bilirkişi       (expert)    -> TAM YETKİ
Yardımcı        (assistant) -> öneri verir
Kontrol eden    (reviewer)  -> öneri verir
Gözlemci        (observer)  -> TAM YETKİ   ← HATA
```

Gözlemci **onaylayabiliyordu**. Ölçüm:

```
Gözlemcinin onayı birleşmede: approved
-> KABUL EDİLDİ  <-- HATA: gözlemci onaylamamalı
```

Gözlemci yalnızca bakmak için eklenen roldür. Onayı adli belgede kabul
edilemez; "kontrol edilmiş" görünen bir metin gerçekte kimse tarafından
doğrulanmamış olurdu.

### Çözüm

- `SECOND_EYES_ROLES`'a `observer` eklendi: düzeltmesi **öneri** olur,
  onaylayamaz.
- `APPROVER_ROLES = ['owner', 'expert']` ve `canApproveRole()` eklendi:
  onay yetkisi açıkça tanımlı. İki küme **ayrık**; bir rol hem onaylayıp hem
  öneri veremez.

### Yetki tablosu (v2.66)

| Rol | Öneri verir | Onaylar |
|---|---|---|
| Dosya sorumlusu | — | ✅ |
| Bilirkişi | — | ✅ |
| Yardımcı | ✅ | — |
| Kontrol eden | ✅ | — |
| Gözlemci | ✅ | — |

### Doğrulama

```
assistant onayı reddedildi -> pending  ✅
reviewer  onayı reddedildi -> pending  ✅
observer  onayı reddedildi -> pending  ✅
owner     onayı korundu    -> approved ✅
expert    onayı korundu    -> approved ✅
```

### Test

`sema-testi.mjs` [7i] bloğu eklendi (250 → 273 kontrol): rol tablosu,
kümelerin ayrıklığı ve birleşme güvenlik ağı.

## v2.65 — Dosya bilgileri birleşmeye girmiyordu (10 alan kayboluyordu)

KULLANICI: "Dosya bilgilerine eklediğimiz şeyler nasıl çalışacak? Şu an hepsini
bilirkişi kendi yapıyor. Diğerleri ne görecek, ne yapabilecek?"

### Ölçümle bulunan sessiz kayıp

Yardımcı dosya bilgilerini doldurdu, birleştirme yapıldı:

```
davaci               KAYBOLDU
davali               KAYBOLDU
davaci vekili        KAYBOLDU
davali vekili        KAYBOLDU
bilirkisi adi        KAYBOLDU
sicil no             KAYBOLDU
gorevlendirme tarihi KAYBOLDU
son teslim           KAYBOLDU
sure (gun)           KAYBOLDU
rapor tarihi         KAYBOLDU

uygulanan değişiklik: 0     çakışma: 0    ← ne uygulandı ne bildirildi
```

**Sebep:** `mergeCases()` yalnız 7 düz alanı birleştiriyordu
(`court`, `fileNo`, `subject`, `caseDate`, `inspectionDate`, `reportType`,
`status`). Arayüzdeki 17 alanın 10'u `parties` / `expert` / `assignment` /
`report` **içinde** duruyor ve birleştirmeye hiç girmiyordu.

### Çözüm

İç içe gruplar da birleştirmeye girdi:

| Grup | Alanlar |
|---|---|
| `parties` | davacı, davacı vekili, davalı, davalı vekili |
| `expert` | ad, sicil no, uzmanlık alanı |
| `assignment` | tarih, son teslim, süre, kapsam, yazı |
| `report` | tarih, yöntem, sınırlılık, sonuç |

Kural aynı: **boş alan her zaman doldurulur**; ikisi de doluysa gelen dosya
daha yeniyse o alınır, değilse çakışma bildirilir; **boş gelen dolu değeri
asla ezmez**.

### Doğrulama (ölçüm)

```
Yardımcı doldurmuş → 10/10 alan GELDİ, çakışma 0
İkisi de farklı, gelen yeni → gelen alındı
İkisi de farklı, yerel yeni → yerel korundu + 2 çakışma bildirildi
Yerel dolu, gelen boş → yerel korundu (ezilmedi)
```

### Test

`sema-testi.mjs` [7h] bloğu eklendi (231 → 250 kontrol).

## v2.64 — Sol liste kaydırması geri geldi (200+ bölüm)

KULLANICI: "Sağ panel iş görür ama sol panelin scroll'unu kaldırmışsın. Orada
scroll olmak zorunda çünkü 200'den fazla kayıt olabilir."

### Ölçümle kanıtlanan hata

200 bölümlü bir listeyle ölçüldü:

```
ÖNCE:
  görünen yükseklik : 6816px      ← liste sayfayı sonsuz uzatıyor
  SCROLL VAR MI     : HAYIR
  max-height        : none
```

**Sebep:** `app.css` satır 918:

```css
#view-audio .seg-list { height:100%!important; max-height:none!important; }
```

Bu kural `!important` taşıyordu; v2.63'te eklediğim `max-height: 62vh` onu
ezemedi. Liste 200 bölümde 6816px uzayarak sayfayı kullanılamaz hâle
getiriyordu.

### Çözüm

`!important` ile sabitlendi (`reading-layer.css` sonuna v2.64 bloğu):

```css
#view-audio .seg-list {
  height: auto !important;
  max-height: 62vh !important;
  overflow-y: auto !important;
}
```

### Ölçümle doğrulandı

```
SONRA:
  görünen yükseklik : 670px       ← 62vh
  içerik yüksekliği : 6814px
  SCROLL VAR MI     : EVET
  kaydırma testi    : scrollTop=500 ÇALIŞIYOR
```

Ayrıca sağ detay paneli de `max-height: 78vh` ile kendi içinde kayar (uzun
bölüm metni sayfayı uzatmaz).

## v2.63 — Panel iki sütuna bölündü; sabit yükseklik kaldırıldı (kök neden)

KULLANICI: "Segment detay kısmını bir türlü çözemedik. İşlevsel özellikleri
kalsın ama rahat kullanılsın. Fazla mı, eksik mi? Ortadan ikiye bölsem nasıl
olur?"

### KÖK NEDEN bulundu (ölçümle)

Sorun düğmelerin çokluğu değildi. `app.css` satır 552:

```css
#view-audio .seg-workspace { height: clamp(280px, 52vh, 620px); }
```

Panel ekranın %52'sine **sabitlenmişti**. İçerik 642px istiyor:

```
Ekran 1080px → kap 562px → 80px taşıyor
Ekran  900px → kap 468px → 174px taşıyor
Ekran  800px → kap 416px → 226px taşıyor
```

**Her ekranda taşıyordu.** Bu yüzden önceki üç denemede (v2.60, v2.61, v2.62)
ne yapılırsa yapılsın "bir türlü olmuyor"du. İçerik taştığı için öğeler
birbirine giriyordu.

### Çözüm: iki sütun + serbest yükseklik

```
┌──────────────────────────────────────────────────────┐
│ Bölüm 1 / 3              ↑ ↓ ▶ Dinle ⏹              │
├────────────────────────┬─────────────────────────────┤
│ ═══ DALGA ═══          │ ═══ METİN ═══               │
│ sürükle · zoom         │                             │
│                        │ (textarea — asıl iş)        │
│ Başlangıç│Bitiş│Süre   │                             │
│ Konuşmacı│Kontrol      │                             │
│ gürültü üst üste ...   │                             │
├────────────────────────┴─────────────────────────────┤
│ ✓ Onayla →  Yeniden dinle  Anlaşılmadı   [araçlar]   │
└──────────────────────────────────────────────────────┘
```

- **Sol** = teknik: dalga, zaman, konuşmacı, gözlem işaretleri
- **Sağ** = metin: asıl iş, tam yükseklik alır
- **Alt** = onay düğmeleri + araçlar (tam genişlik)

`height: clamp(...)` **kaldırıldı**; panel artık içeriği kadar yer alır.

### Ölçümle doğrulandı

```
panel h: 415px   (önce 642px)          taşma: YOK
ÇAKIŞMA: YOK
sol sütun: 367px   sağ sütun: 495px    yan yana: EVET
```

Panel **%35 kısaldı**; içerik sığıyor, çakışma yok.

## v2.62 — Bölüm detayı SIFIRDAN yazıldı; segment dalgası geri geldi

KULLANICI: "seg-detail kısmı hâlâ sorunlu, orayı komple sil yeniden yap.
WAV dalgasını silmiştin, yukarıdaki dalga segmentler için işe yarıyor mu?
Başlangıç ve bitişi elle giriyoruz ama elle sorunlu."

### Kullanıcı haklıydı: dalga geri getirildi

v2.61'de zoom dalgasını "ana dalga aynı işi yapıyor" diyerek kaldırmıştım.
**Yanlıştı.** Ana dalga tüm kaydı gösterir; bölüm sınırlarını 0,1 sn
hassasiyetle ayarlamak için yetersizdir. Elle saat yazmak deşifrede en çok
zaman kaybettiren işti.

**Yeni `attachSegWave()`:**
- Bölümün ±0,5 sn penceresi büyütülmüş dalga olarak gösterilir
- **Sınırları sürükleyerek** başlangıç/bitiş ayarlanır (elle yazmak gerekmez)
- Ortaya tıkla → en yakın sınıra atlar
- Tekerlek → imlecin altındaki an sabit kalacak şekilde yakınlaştır
- Bölüm dışı hafif karartılır; B (başlangıç) ve S (bitiş) tutamaçları görünür
- Oynatma konumu canlı çizgi olarak gösterilir
- Süre alanı otomatik güncellenir (başlangıç/bitiş değişince)

### Sıfırdan yazım: yeni sınıf adları (sd-*)

Eski `seg-detail` yapısında 21 çakışan CSS kuralı vardı. Yeni yapı **farklı
sınıf adları** kullanıyor (`sd-head`, `sd-wave`, `sd-times`, `sd-meta`,
`sd-text`, `sd-actions`, `sd-obs`, `sd-ops`). Böylece eski 21 katmanın hiçbiri
yeni yapıya uymuyor — çakışma fiziksel olarak imkânsız.

### Yeni sıra

```
1. Başlık          Bölüm 1 / 3   ↑ ↓ ▶ Dinle ⏹
2. Öneri bandı     (varsa — ikinci göz)
3. Notlar          (varsa — öncelik/tekrar/sessizlik)
4. DALGA           sürüklenebilir sınırlar + Sığdır
5. Zamanlar        Başlangıç | Bitiş | Süre
6. Konuşmacı | Kontrol
7. METİN           (en çok yer, 150px+)
8. Onayla → | Yeniden dinle | Anlaşılmadı
9. Gözlem işaretleri (tek satır)
10. Araçlar         (tek satır)
```

### Ölçümle doğrulandı

Gerçek CSS + gerçek DOM ile ölçüm sayfası kuruldu:

```
panel h: 642   scrollH: 640   clientH: 640     taşma: YOK
sd-head    top= 33  h= 36
sd-notes   top= 77  h= 16
sd-wave    top=101  h=124
sd-times   top=233  h= 52
sd-meta    top=293  h= 54
sd-text    top=355  h=188
sd-actions top=551  h= 38
sd-obs     top=597  h= 25
sd-ops     top=630  h= 19
ÇAKIŞMA: YOK
```

Gerçek uygulamada da doğrulandı (v2.62, tarayıcı).

## v2.61 — Bölüm detayı sadeleştirildi (düğmeler üst üste biniyordu)

KULLANICI: "Segment detail kısmını bir düzeltir misin, butonlar üst üste binmiş
hâlâ. Fazlalık varsa sil, yerleşimi değiştir."

### Kök neden: 21 çakışan CSS kuralı

`app.css` içinde `#view-audio .seg-detail` için **21 ayrı kural** vardı; v2.44,
v2.45, v2.47, v2.48 ve v2.60 katmanları birbirini eziyordu. İkisi
`height:100%!important` zorluyordu: içerik sığmayınca panel taşıyor, düğmeler
üst üste biniyordu.

### Fazlalıklar silindi

| Kaldırılan | Neden |
|---|---|
| **Zoom dalgası** (canvas + 5 düğme) | Ana dalga formu aynı işi yapıyor; tıklayınca konuma gidiyor |
| **Zaman hassas kaydırma** (8 düğme: −1/−.1/+.1/+1 ×2) | Zaman kutusuna elle yazılabiliyor |
| **Hız düğmeleri** | Araç çubuğunda zaten var |

Toplam **~35 düğme → ~18 düğme**. Gözlem ve araçlar katlanır bölmeye alındı
(`Gözlem ve araçlar`), varsayılan kapalı → panel kısa kalır.

### Yeni yerleşim (tek yetkili katman)

`reading-layer.css` sonuna v2.61 bloğu eklendi; **en sonda** geldiği için
önceki 21 kuralı ezer. Yeni kural oraya yazılır, `app.css`'e dokunulmaz.

```
1. Başlık (bölüm no + gezinme/dinle)
2. Notlar (varsa)
3. Konuşmacı | Kontrol        ← iki sütun
4. Başlangıç | Bitiş          ← iki sütun
5. METİN (esnek, 140px+)
6. Onayla → / Yeniden dinle / Anlaşılmadı
7. ▸ Gözlem ve araçlar        ← katlanır
```

### Ölçümle doğrulandı

Gerçek CSS ve gerçek DOM yapısıyla statik ölçüm sayfası kuruldu; öğelerin
`getBoundingClientRect()` değerleri karşılaştırıldı:

```
panel yükseklik: 455px   scrollHeight 453 = clientHeight 453  (taşma yok)
seg-detail-head  top=33   h=36
seg-notes        top=77   h=20
seg-meta-row     top=105  h=48
seg-times        top=161  h=48
seg-text-wrap    top=217  h=164
seg-actions      top=389  h=38
seg-more         top=435  h=27
ÇAKIŞMA: YOK
```

420px dar ekranda da tekrarlandı: **çakışma yok**.

## v2.60 — Öneri görünür oldu + bölüm detayı yeniden düzenlendi

KULLANICI: "Kontrol kısmında öneri diye bir şey yok ama? Yardımcı olunca öneri
verecek demiştin." ve "Gözlem işaretleri kısmı karışık, scroll sıkışıyor,
ses player ile dalga formu aynı işi yapıyor."

### Bulunan hata: öneri yazarken görünmüyordu

`applyTextEdit()` ikinci göz yazdığında ana metni **doğru şekilde**
değiştirmiyor, öneriyi saklıyordu. Ama yazma anında detay paneli yeniden
çizilmediği için **öneri bandı hiç görünmüyordu**. Yardımcı yazıyor, hiçbir
şey olmuyor sanıyordu (tıpkı bilirkişinin "Onayla çalışmıyor" dediği gibi).

**Çözüm:**
- `proposalBandHtml()` ayrı fonksiyona çıkarıldı.
- `refreshProposalBand()`: yazarken bandı **yerinde** tazeler; textarea odağı
  ve imleç korunur (panel baştan çizilmez).
- Segment listesinde **"Öneri" rozeti** ve sol kenarda altın çizgi. Bilirkişi
  hangi bölümde bekleyen öneri olduğunu tek bakışta görür.

### Arayüz: ses player kaldırıldı, dalga formu öne alındı

Yerleşik `<audio>` denetimi **gizlendi**. Aynı işi iki öğe yapıyordu (düz
çizgi player + dalga formu). Artık:
- Dalga formu tek konum göstergesi; tıklayınca konuma gider (zaten vardı).
- Süre göstergesi (`0:00 / 12:34`) ayrı metin olarak yazılır.
- Dalga yüksekliği 52px → 72px (çalışma modunda 92px).

### Bölüm detayı yerleşimi

Dikey yığın yerine bölgeler ayrıldı:
1. Öneri bandı (varsa)
2. Zaman + dalga formu
3. Konuşmacı + kontrol
4. **Metin alanı** (esnek, büyür)
5. Gözlem işaretleri (tek satır, sarar)
6. İşlemler (tek satır, sarar)
7. Onayla / Yeniden dinle / Anlaşılmadı (alt satır, Onayla sağa yaslı)

### Kaydırma

Sayfa gövdesi kaymaz; **yalnız bölüm listesi ve detay paneli** kendi içinde
kayar (`overflow-y: auto` + `overscroll-behavior: contain`). Uzun deşifrede
oynatıcı ve başlık yerinde kalır.

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
