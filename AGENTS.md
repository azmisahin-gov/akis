# AKİS — Depo Notları (ajanlar için)

Bu dosya, AKİS deposunda çalışan ajanlar için kalıcı bağlam sağlar.

## Tamamlanan aşamalar

### Aşama 1 — Sürümleme ve depo organizasyonu (TAMAMLANDI, v2.26)

Sürüm numarası artık tek kaynaktan gelir (`assets/app.js` → `APP_VERSION`),
arayüzdeki etiket oradan yazılır ve tüm belgeler aynı numarayı gösterir.
Yapılanlar:

- Arayüzdeki "v1" etiketi gerçek sürüme (v2.26) çekildi; etiket artık
  `#appVersion` üzerinden `APP_VERSION`'dan yazılıyor.
- `YOL_HARITASI.md` ile `CHANGELOG.md` arasındaki **sürüm numarası çakışması**
  giderildi (v2.9–v2.12 iki belgede farklı şeyler anlatıyordu).
- `CHANGELOG.md` sırası düzeltildi; sıra dışı "v2.15+" başlığı `v2.17.1` oldu.
- README, OZELLIKLER, AGENTS güncel sürüme hizalandı.
- Kural: her güncellemede `APP_VERSION` + CHANGELOG başlığı + YOL_HARITASI
  birlikte artırılır, `?v=` parametreleri güncellenir.

### Aşama 2 — Arayüz tasarımı (TAMAMLANDI, v2.27–v2.31)

Beş faz uygulandı: (1) dar ikon rayı + üst bar + durum çubuğu, (2) ayarlar
sağ çekmecede, (3) dosya bilgileri sağ çekmecede (ray 5→4), (4) uzun
açıklamalar ⓘ ipucunda (kritik uyarılar görünür kaldı), (5) rapor tam ekran.

Yeni arayüz mimarisi:
- `#settingsDrawer` (model/kuyruk/depolama), `#caseDrawer` (dosya bilgileri).
  Aynı anda yalnızca biri açık; Esc/×/karartma kapatır.
- `setSettingsDrawer(open)`, `setCaseDrawer(open)`, `setReportFull(on)`.
- `renderStatusBar()` alt durum çubuğunu besler; `renderOverview()` içinden
  ve `updateModelBadge()`'den çağrılır.
- `switchView('case')` artık çekmeceyi açar (eski sayfa yok); bu sayede
  workflow/hızlı erişim/`data-goto="case"` girişleri çalışmaya devam eder.
- Rapor: `body.report-full` sınıfı kabuğu gizler; ince çubuk kalır.

Dikkat: `id`/`data-*` işaretleri deşifre/model/rapor mantığının dayanağıdır;
çekmeceye taşırken bunlar korunmalıdır.

### Aşama 3 — Rapor bilirkişi adına, ölçüm katmanı (TAMAMLANDI, v2.49)

**Çıktı ilkesi (değişmez):** Üretilen her belge bilirkişi adına yazılır.
Uygulamanın adı, sürümü veya varlığı rapora **girmez**; belge yalnızca
bilirkişinin kullandığı bilimsel araçların ürünüdür. Bu ilke
`tools/rapor-tutarlilik-testi.mjs` Senaryo 10 ile otomatik denetlenir:
HTML, DOCX ve UDF çıktılarında "AKİS", "uygulama", "tarayıcı" geçemez.

- Rapor alt bilgisi yalnızca dosya numarası + rapor tarihi taşır.
- Yöntem metni (`DEFAULT_METHOD`) araç adı anmaz; SHA-256 ve çalışma kopyası
  üzerinden teknik anlatım yapar. Eski kayıtlı metin `LEGACY_DEFAULT_METHOD`
  ile birebir eşleşiyorsa `stripDerivedFields` içinde yenisine çevrilir.
- Kapak üst satırı ve Word üst bilgisi sabit "56.12" yerine
  `expertFieldShort(c)` ile dosyada girilen alan kodunu gösterir.
- UDF tablo adları nötrdür (`Tablo1`, `Tablo2` …); araç markası taşımaz.

**Ölçüm katmanı:** 56.12 alanının gerektirdiği ölçümler saf fonksiyonlarla
hesaplanır ve yalnızca bilirkişi tetiklediğinde çalışır:

| Fonksiyon | Ne ölçer | Rapora girer mi |
|---|---|---|
| `analyzeLevels` | tepe/RMS dBFS, tepe kırpılma, gürültü tabanı, SNR | Evet (ölçüldüyse) |
| `analyzeStereo` | kanal dengesi, kanallar arası korelasyon, DC kayması | Evet (stereo ise) |
| `spectralRolloff` | etkin bant genişliği (P95) | Evet (ölçüldüyse) |
| `analyzeSilence` | sessizlik oranı (bölüm bazında) | Evet (ölçüldüyse) |
| `detectPitchHz` | temel frekans tahmini (konuşmacı) | Evet (ölçüldüyse) |
| `computeWer` | kelime hata oranı (referans varsa) | Evet (ölçüldüyse) |

Kurallar:
- Ölçüm yapılmamışsa rapora **satır yazılmaz** (`levelRowsForCase` yalnız
  `schema === LEVELS_SCHEMA` ve `ok` olanları alır).
- Ölçüm şeması `LEVELS_SCHEMA` sabitiyle sürümlenir. Alanlar değişirse sabit
  artırılır; eski kayıtlar `stripDerivedFields` ile atılır ve yeniden ölçülür.
  Böylece arayüz eski kodla üretilmiş eksik/çelişkili değeri göstermez.
- Ölçüm **dosyanın kendi örnekleme hızında** yapılır
  (`new AudioContext({sampleRate: m.tech.sampleRate})`); aksi hâlde tarayıcı
  48 kHz'e yeniden örnekler ve bant genişliği yanlışlıkla yüksek görünür.
- Biçimlendirme tek kaynaktan: `fmtDb`, `fmtPct`, `snrText`, `floorText`.
  Negatif sıfır ("-0,0") yazılmaz; gürültü tabanı tam 0 ise "sessizlik (0)"
  yazılır ve SNR "sonsuz (sayısal sessizlik)" olur — "ölçülemedi" değil.

### Aşama 4 — Okuma katmanı: tema, tipografi, kontrast (TAMAMLANDI, v2.50)

**Neden:** Bilirkişi bu ekranda saatlerce deşifre yazıyor. Ölçüm yapıldı:
54 kural 9px, 49 kural 10px, 8 kural 8px, 2 kural 7px punto kullanıyordu;
16 metin renginin 11'i WCAG AA altındaydı (yer tutucu 2.03:1); `Manrope`
20+ yerde çağrılıyordu ama depoda `@font-face` yoktu — başlıklar rastgele
sistem fontuyla çiziliyordu; 202 farklı hex, 66 farklı gri, 21 CSS yama bloğu,
`.seg-list` 11 kez yeniden tanımlı, 26 `!important` vardı.

**Mimari — üç dosya, bu sırayla yüklenir:**

1. `assets/tokens.css` — TEK kaynak. Renk (üç tema), punto ölçeği, boşluk,
   yarıçap, gölge. Ham `#hex` yalnız burada bulunur.
2. `assets/app.css` — v2.27–v2.49 arası eski katmanlar (dokunulmadı; geri
   alma kolay olsun diye yerinde bırakıldı).
3. `assets/reading-layer.css` — en sonda; eski yamaları ezer, tek tutarlı
   tipografi/kontrast katmanı kurar. Yeni tasarım kuralı buraya yazılır.

**Değişmez tasarım kuralları (testle korunur):**

- Hiçbir metin 11px'in altında olamaz. Deşifre metin alanı 14px, satır
  aralığı 1.7 — en çok bakılan yer.
- Her metin rengi WCAG AA (≥4.5:1). Üç tema ayrı ayrı doğrulanır.
- Metin rengi ham `#hex` ile yazılmaz; `var(--ink|--ink-2|--ink-3|...)`.
- Uyarılar yalnız renkle anlatılmaz: metin + kenarlık da taşır (renk körlüğü).
- Rapor kâğıdı temadan bağımsızdır (`--paper-*`); koyu temada bile açık kalır,
  yazdırmada beyaza çevrilir. Tema yalnız ekranı etkiler, çıktıyı etkilemez.
- Yazı boyutu yalnız BÜYÜTÜLEBİLİR (normal/büyük/çok büyük); küçültme yok.

**Tema altyapısı:** `<html data-theme="light|dark|sepia">`, ayrıca
`data-density="comfortable|compact"` ve `data-fontscale="normal|large|xlarge"`.
Tercih `localStorage`'da (`akis.theme`, `akis.density`, `akis.fontscale`).
`index.html`'deki satır içi betik tercihi **ilk boyamadan önce** uygular
(FOUC yok). JS tarafı: `applyTheme`, `setTheme`, `setDensity`, `setFontscale`,
`appearancePanelHtml` (Ayarlar çekmecesinin en üstünde).

Dikkat: tema değişince rapor önizlemesi yeniden çizilmez — kâğıt tokenları
temadan bağımsız olduğu için gerek yok. UDF/DOCX çıktısı hiç etkilenmez.

### Aşama 5 — v3 veri şeması (TAMAMLANDI, v2.51)

**Neden:** v2 şemasında bölüm ve sorunun kimliği yoktu; her şey dizi indeksiyle
adreslenirdi. Durum Türkçe metinle karşılaştırılıyordu. Konuşmacı bölümde AD
ile tutuluyordu. Delil günlüğü serbest metindi. Sürüm alanı yoktu.

**Mimari:** `assets/schema.js` — tarayıcıya bağımlı olmayan saf fonksiyonlar.
Üretim ve test AYNI dosyayı kullanır (test kopya tanım yapmaz; sandbox'a
`__schema` olarak enjekte edilir).

**Değişmez şema kuralları:**

1. **Kimlik:** dosya, kayıt, bölüm, soru, konuşmacı, ekip üyesi `id` taşır.
   Referans id ile: `segment.speakerId`, `question.evidence[].segmentId`.
   Yeni referans eklerken AD veya İNDEKS kullanmayın.
2. **Kod ≠ etiket:** durum/rol/cinsiyet/ortam kodları ASCII sabit
   (`pending`, `approved`, `inaudible`, `relisten`…). Türkçe metin
   `STATUS_LABEL` / `REVIEW_LABEL` gibi tek yerden türetilir. Karşılaştırma
   **daima kodla**: `materialStatus(m) === 'review'`, asla
   `m.status === 'Kontrol bekliyor'`.
3. **Kalıcı ≠ geçici:** `uiTab`, `activeSeg`, `progress`, `playbackRate`
   oturumluktur; şemaya eklenmez.
4. **Delil:** her günlük girdisi `logEntry()` ile üretilir (`prevHash`+`hash`).
   Elle `{at,event}` yazmayın; zincir kırılır ve `verifyLogChain()` hata verir.
5. **Genişletme:** bilinmeyen alan korunur; `normalizeCase()` eksik alanı
   varsayılanla tamamlar. Yeni alan eklerken `emptyCase`/`emptyMaterial`/
   `emptySegment` varsayılanını da güncelleyin.

**v2 uyumluluğu:** `normalizeCase()` eski kaydı okur (düz alan → iç içe,
`checked` → `approved`, ad → `speakerId`, `basis` → `basisNote`).
`segReview()` v2 Türkçe anahtarlarını tanır. 168 düz alan erişimi için
`defineCaseMirrors()` saydam eşleme kurar (`c.plaintiff` ↔ `c.parties.plaintiff`).

**Ekip:** `case.team[]` — ad, görev, sicil, kurum. **Rapora girmez**; iş
bölümü ve birleştirme atfı içindir. "Rapor bilirkişi adına yazılır" ilkesi
korunur.

**Birleştirme:** `mergeCases(mine, theirs)` — id ile eşleştirir, metin
çakışmasını sessizce EZMEZ, `conflicts[]` olarak raporlar.

**Kimlik üretim anında verilir (v2.53):** `parseAsrResult`, elle bölüm ekleme,
ikiye bölme ve paragraf oluşturma bölüme `newId('sg')` verir. Kimlik sonradan
(normalleştirmede) atanırsa iki bilgisayarda AYRI kimlikler oluşur ve
birleştirme bölümleri hiç eşleştiremez — her bölüm "yeni bölüm" sanılır.

**Metin düzenleme işareti `textRev` (v2.53):** Bir metne insan eli değdiğinde
`textRev` 1 olur. Birleştirmede metinler farklıysa yalnız bir taraf düzenlemişse
o taraf alınır; iki taraf da düzenlemişse **sessiz seçim yapılmaz**, çakışma
bildirilir. Ölçüt sayacın büyüklüğü değil, sıfırdan farklı olmasıdır (çok yazan
haksız yere kazanmasın). Kaybeden metin `history`'ye yazılır. Onay metne
bağlıdır: metin değişince kontrol durumu gelen taraftan alınır. Bölüm metnini
`setSegmentText()` ile yazın ve `pushSegmentHistory()` çağırın; doğrudan
`s.text = ...` ataması işareti atlar ve düzeltme birleştirmede kaybolur.

**İkinci göz kuralı (v2.54):** `assistant` ve `reviewer` rolleri "ikinci göz"
sayılır (`SECOND_EYES_ROLES`). Bu rollerin metin düzeltmesi ana metne YAZILMAZ;
`segment.proposal = { text, by, at, baseText }` olarak saklanır. Onay yetkisi
yalnız `expert`/`owner` rolündedir. Rapor "Kontrol" sütununa `reviewLabel()`
bastığı için bu ayrım zorunludur: onaysız metin "Onaylandı" görünemez.
Birleştirme sonunda ikinci gözün verdiği onay "Kontrol bekliyor"a çekilir.
Yeni metin yazma noktası eklerken `applyTextEdit()` kullanın; doğrudan
`s.text = ...` ataması bu korumayı atlar.

**Kaynağı tanımsız onay kabul edilmez (v2.55):** Birleştirmede, gelen dosyanın
ekip listesi DOLUYSA ve düzenleyen o listeyle eşleşmiyorsa onay kabul edilmez;
bölüm "Kontrol bekliyor"a çekilir ve `unattributed-approval` çakışması
bildirilir. Ekip listesi BOŞSA (tek kişilik dosya) eski davranış korunur.
Dışa aktarmadan önce `ensureEditorIdentity()` kimlik sorar. Önizleme
(`compareCases`) birleştirmeyle AYNI kuralı kullanmalıdır; ayrışırsa kullanıcı
yanlış bilgiyle karar verir.

**Delil günlüğü tek yazma noktası (v2.56):** Günlük **yalnız** `logEvent(m,
event, detail)` ile yazılır; o da `logEntry()` kullanır. Elle `m.log.push(...)`
yazmayın — zincir kırılır ve `verifyLogChain()` kurcalamayı yakalayamaz.
v2.55 ve öncesinde tam olarak bu hata vardı: belgeler kurcalama tespiti
vaat ediyordu, kod onu yapmıyordu. `sema-testi.mjs` [6b] bunu denetler.
Durum üç hâllidir: `verified` / `legacy` (hash'siz eski kayıt — "kırık" diye
suçlanmaz) / `broken`. Eski kayıtlar açılışta `upgradeLogChain()` ile zincire
bağlanır; girdi metni değiştirilmez.

**Teslim alma (v2.56/v2.57):** Dosya eklemeden önce `askIntake()` ortam
bilgisi sorar. Tarayıcı USB seri no/etiket göremez (teknik sınır); bu bilgi
**uzman beyanıdır**, otomatik tespit diye sunulmaz. Seçeneklerin `value`
değeri ASCII **kod** (`usb`), görünen metin Türkçe **etiket** olmalıdır;
v2.56'da bu karıştı ve kayıt geçersiz oldu. Eski Türkçe değerler
`normalizeMediumType()` ile koda çevrilir.

**Kod ≠ etiket (v2.59 — kritik):** `segReview()` daima **v3 ASCII** kod döndürür
(`approved`, `inaudible`, `relisten`, `pending`). Karşılaştırma **asla** v2
Türkçe kodla (`onaylandi`, `anlasilmadi`, `yeniden`) yapılmaz; v2 kodları
yalnız `REVIEW_LEGACY` göç tablosunda bulunur. v2.59 öncesinde `segItemHtml()`
v2 kodla karşılaştırıyordu: onaylama veriyi doğru yazıyordu ama rozet hep
"Bekliyor" görünüyor, sayaçlar artmıyordu. `sema-testi.mjs` [6c] bunu denetler.

## Ekip çalışması — durum: TAMAM, ŞİMDİLİK KULLANILMIYOR (v2.68)

Ekip çalışması (yardımcı / ikinci göz / öneri) özelliği **tamamlandı ve
güvenceye alındı** (`v2.68` etiketi). Kullanıcı **şimdilik kullanmayacak**;
sistem tek kişilik kullanım için hazır.

### Neden kullanılmıyor (tasarım kararı, hata değil)

Ekip çalışması **dosya gidiş-gelişi** ile yapılır: `.akis` dosyası dışa
aktarılır, yardımcıya gönderilir, geri gelir, ⇄ Birleştir ile alınır.
Canlı bağlantı, sunucu, eşzamanlı düzenleme **yoktur**. Bu, depo ilkesinin
("sunucu yok") doğal sonucudur. Tek kişilik kullanımda bu sınır devreye
girmez.

### Kullanıcı bu özelliği açarsa ne yapmalı

1. Yardım ekranındaki (?) **"Ekip çalışması (yardımcı / ikinci göz)"**
   bölümü 9 adımlı akışı anlatır. Oradan başlayın.
2. **İçe aktar** değil **⇄ Birleştir** kullanılır. İçe aktar kopya açar;
   aynı dosya açıkken onay sorar (v2.68).
3. Yardımcı kendini **Yardımcı** rolüyle eklemeli. Yanlış rolle eklenirse
   onaylayabilir; "Şu an çalışan" seçilince rol bildirilir (v2.68).

### v2.68 itibarıyla doğrulanmış olanlar

| Konu | Durum |
|---|---|
| Bölüm metni önerisi (yardımcı yazar → bilirkişi kabul/red) | ✅ |
| Yardımcı kendi önerisini görür (textarea) | ✅ v2.68 |
| Onay yetkisi: yalnız owner/expert | ✅ v2.66 |
| Gözlemci onaylayamaz | ✅ v2.66 |
| Dosya alanları (parties/expert/assignment/report) birleşir | ✅ v2.65 |
| Aynı dosya açıkken İçe aktar onay sorar | ✅ v2.68 |
| Öneri rozeti + bant + Kabul/Reddet | ✅ v2.60 |
| Yardım ekranında 9 adımlı akış | ✅ v2.67 |

### Bilinen sınırlar (hata değil)

- Canlı bağlantı yok; dosya el değiştirir.
- Yardımcı sesi duymaz (paket ses içerir ama dinleme yardımcının
  bilgisayarında olur; dosya büyükse gönderim zorlaşır).
- Aynı anda iki kişi aynı dosyada çalışamaz.

## Aşama 6 — Dinleme güvenliği, konuşmacı standardı, hızlı onay, profiller (TAMAMLANDI, v2.78–v2.81)

Kullanıcı tek oturumda dört konu açtı ve hepsi uygulandı. Aşağıdaki maddeler
**değişmez kural** hâline geldi; bozulurlarsa testler kalır.

### v2.78 — Dinlerken bölme çizgisi bozulmuyor

İki gerçek hata vardı ve ikisi de "sessiz" davranıştı:

1. `nudgeBoundary` başlangıcı kaydırınca **bitişi de** taşıyordu; bölüm sıfır
   uzunlukta kalabiliyordu. Artık karşı sınır sürüklenmez, 0,1 sn boşluk
   korunur ve nedenini söyler.
2. Dalgaya **düz tıklamak** "en yakın sınırı" taşıyordu. Uzman dinlemek için
   tıkladığında bölme çizgisi bozuluyordu. Artık:
   - **düz tıklama** = yalnız konuma git (sınır taşımaz)
   - **Alt+tıklama** = en yakın sınırı taşı
   - **sürükleme** = sınırı taşı

**A–B döngüsü** eklendi (`loopRange`/`setLoopPoint`/`loopLabel`): anlaşılmayan
aralık tekrar tekrar dinlenir. Döngü **yalnız oynatmayı sarar**; `segment.start/
end` değerlerine dokunmaz. `m.__loop` **oturumluktur** ve
`stripDerivedFields` ile kayıttan/dışa aktarımdan atılır — şemaya yazılmaz.

### v2.79 — Konuşmacı standardı ve sessiz veri kaybı

**Kanıtlanmış veri kaybı:** arayüz rol/cinsiyeti Türkçe etiket olarak
yazıyordu (`Davacı`, `Kadın`), şema ASCII kod bekliyordu (`complainant`,
`female`). `normalizeSpeaker` etiketi tanımayıp `unspecified`'a düşürüyordu —
her yenilemede bilirkişinin girdisi siliniyordu.

- **Standart kod:** `S1`, `S2`, `S3`… (`assignSpeakerCodes`). Var olan kod
  **korunur**; kodu olmayan en küçük **boş** kodu alır (silinen kişinin kodu
  yeniden kullanılır, raporda boşluk olmaz).
- **Bölümde konuşmacı seçimi listedir** (`spkSelectOptions`), serbest metin
  değil. **＋** (`data-add-spk`) yeni konuşmacı ekler ve aktif bölüme atar.
- Seçenek `value`'su **kod**, görünen metin **etiket**. Kayda kod yazılır,
  rapora etiket basılır (`SPEAKER_ROLE_LABEL[...]`).
- **Raporun üç çıktısı tek kaynaktan:** `segSpeakerCell(m, s)` → `S1 · Kiracı`.
  HTML/DOCX/UDF ayrı ayrı biçimlendirmez.
- Göç: `normalizeSpeakerRole` / `normalizeSpeakerGender` eski Türkçe
  etiketleri koda çevirir. `sema-testi.mjs` [3b] bunu denetler.

### v2.80 — Hızlı onaya uygun + toplu onay

- **Uydurma doğruluk yüzdesi YOK.** Model güven skoru vermiyor. Ölçüt yalnız
  **gözlemlenebilir** işaretlere dayanır (`segQuickCheck`): anlamlı metin var
  mı, süre ≥ 1,2 sn mi, model tekrarı var mı, üst üste/anlaşılmaz işaretli mi,
  öncekiyle çakışıyor mu. Gerekçeler metinle gösterilir.
- Filtre (`quick`) ve sayaç (`segCounts.quick`) **aynı fonksiyonu** kullanır;
  arayüz ile liste ayrışamaz.
- `bulkApproveQuick`: yalnız uygun bölümleri onaylar, uygun olmayanlara
  dokunmaz, `snapshotForUndo` + `logEvent` ile geri alınabilir ve kayıtlıdır.
  **Onay yetkisi kuralı korunur:** `isSecondEyesEditor()` hem düğmeyi
  gizler hem fonksiyonu reddeder.

### v2.81 — Çözümleme profilleri (dürüst sınır)

Kullanıcı şive/kıcırtı/malzeme sesi çözümlemesi istedi. Bunlar **ayrı eğitilmiş
model** gerektirir; depo öyle bir model içermez. **Yapılmış gibi gösterilmez.**

- `ASR_PROFILES`: standart · şive/ağır aksan · gürültülü/kıcırtılı ·
  telefon/dar bant. Yalnız dil ipucu + bağlam istemi + tekrar cezası değişir.
- **Dil her zaman `turkish`, görev her zaman `transcribe`** kalır; profil bunu
  gevşetmez. `birim-testleri.mjs` [13] dil kilidini doğrular.
- Seçim `akis.asrProfile` ile hatırlanır; **rapora yazılmaz**.
- Yeni çözümleme türü eklerken: ayrı model gerekiyorsa **ekleme**; sınırı
  belgele. Profil eklemek serbest, "şive tanıma" iddiası yasak.

### Bu aşamanın korunan kuralları (testle)

| Kural | Test |
|---|---|
| Karşı sınır sessizce sürüklenmez | `birim-testleri` [11] |
| A–B döngüsü bölüm sınırına dokunmaz | `birim-testleri` [11] |
| Rol/cinsiyet etiketi koda göçer, kaybolmaz | `sema-testi` [3b] |
| S1/S2 kodu çakışmaz, etiketten bağımsız | `sema-testi` [3b] |
| Hızlı onay ölçütü + sayaç tutarlı | `birim-testleri` [12] |
| Profil dil kilidini bozmaz | `birim-testleri` [13] |
| Rapor zaman aralığı tek biçim (ms) | `birim-testleri` [14] |
| WER "%94,0" biçiminde | `birim-testleri` [15] |
| JS'in aradığı kimlik HTML'de var | `surum-testi` [9] |
| Yeni özellik belgede + yardımda anılır | `surum-testi` [7]/[8] |

**Takip modu (v2.79'da düzeltildi):** `followTick` **aktif kaydın** kartını
kullanır (önce ilk kartı alıyordu). `syncSegDetailInPlace` seçicileri
`segDetailHtml` ile **aynı** olmalı (`.sd-head`, `.sd-times`, `.sd-meta`,
`.sd-text`); panel v2.62'de yeniden yazıldığında seçiciler eskimişti ve sağ
panel hiç güncellenmiyordu. Dalga (`attachSegWave`) bölümü **kapalı değişkenle**
tutmaz; `m.__segWaveRebind` + `refreshSegWave` ile aktif bölümü izler.

### DERS: sahte DOM yetmez, tarayıcıda da deneyin

`tools/*.mjs` testleri `node:vm` içinde **sahte DOM** kullanır. Bu yüzden
DOM kimliği ve seçici uyuşmazlıklarını **yakalayamaz**. v2.78–v2.81 arasında
tam olarak bu sınıftan dört hata gerçek tarayıcıda bulundu:

1. `renderUndoState()` `#undoState` arıyordu, düğme `#undoBtn` → geri alma
   düğmesi **hiç etkinleşmedi**.
2. Toplu onay düğmesi yalnız tam çizimde ekleniyordu → sayaç değişince
   kayboluyordu.
3. Elle eklenen bölüm, kaydı olmayan konuşmacıya bağlanıyordu.
4. Elle eklenen bölüm `00:00:00` (ms'siz) yazıyordu → raporda tutarsız sütun.

**Kural:** arayüz/DOM'a dokunan her değişiklikten sonra `bash tools/test.sh`
yetmez; gerçek tarayıcıda o akış **tıklanarak** denenir. Kimlik ve seçici
uyuşmazlığı için `surum-testi` [9] koruma sağlar, ama tam kapsam için
tarayıcı denemesi zorunludur.


### DERS: görsel hata gözle değil ÖLÇÜLEREK bulunur

Kullanıcı "bazı görsel sorunlar olmuş" dediğinde ekran görüntüsüne bakmak
yetmez; hangi öğenin ne kadar bozulduğu ölçülmelidir. İki ölçüm yeterli:

1. **Kesilme:** `el.scrollWidth > el.clientWidth + 1` → içerik taşıyor/kesiliyor.
2. **Satır sayısı:** `new Set([...el.children].map(c => c.getBoundingClientRect().top)).size`
   → öğe kaç satıra kırıldı.

Bu yöntemle v2.82'de dalga çubuğunun `wrap` ile **5 satıra** kırıldığı
(84px) ölçüldü; iki satırlı grid'e çevrilince **57px** oldu. "Biraz bozuk
görünüyor" ile "5 satıra kırılıyor" arasındaki farkı yalnız ölçüm söyler.

**Araç:** depo içinde headless Chromium var (`/usr/bin/chromium`). Aynı
kaynaklı bir denetim sayfası (`iframe` + `--dump-dom`) ile ölçüm alınabilir.
Geçici ölçüm dosyaları iş bitince **silinir** (depoya girmez).

**CSS kuralı:** bir kapsayıcıya `flex-wrap: nowrap` + `overflow: hidden`
yazmak, sığmayan öğeyi **sessizce keser**. Yerleşim çubuğunda bunun yerine
`wrap` veya grid kullanın; kesme kararı kullanıcıya görünür olmalıdır.

**Seçici kuralı:** `X > span` gibi geniş seçiciler, sonradan eklenen
`<span class="...">` sarmalayıcıları da yakalar. Yeni bir sarmalayıcı
eklerken `:not(.sinifin)` ile daraltın; aksi hâlde etiket stili kutuya sızar.


### Aşama 7 — Adli ayrım ve depolama dürüstlüğü (TAMAMLANDI, v2.83)

**KURAL: otomatik çıktı ile onaylanmış metin AYRI belgelerdir.**
`segment.asrText` modelin ürettiği ham metindir ve **asla üzerine yazılmaz**.
`segment.text` bilirkişinin düzenlediği/onayladığı metindir. `asrModel` ve
`asrAt` hangi modelin ne zaman ürettiğini söyler.

v2.83 öncesinde model çıktısı yalnız `history` dizisinde kalıyordu ve
`history.length > 10` olunca `shift()` ile **siliniyordu**. Bilirkişi 11 kez
düzenlerse "model ne dedi" bilgisi kalıcı kayboluyordu. Bu adli açıdan kabul
edilemez; `sema-testi` [3c] artık bunu denetler.

Yeni bir metin yazma noktası eklerken `asrText`'e DOKUNMAYIN. Yeni bir
çözümleme yolu eklerken `asrText`/`asrModel`/`asrAt` üçlüsünü birlikte yazın.

**KURAL: depolama göstergesi iki havuzu ayırır.**
`navigator.storage.estimate()` TÜM kullanımı verir ve model önbelleği (1,5 GB'a
kadar) bu sayının içindedir. Tek sayı göstermek "dava verim doldu" yanılgısı
yaratıyordu. `renderUsage()` dava verisini `usage - modelBytes` ile hesaplar;
`refreshStorage()` model boyutunu `scanModelCache()`'ten `usageInfo.modelBytes`'e
yazar. Kota uydurulmaz, tarayıcıdan gelir.


### Aşama 8 — Veri güvenliği (TAMAMLANDI, v2.84) — CANLI VERİ

Bilirkişi gerçek veriye geçtikten sonra yapılan denetim. Dört kritik hata
bulundu ve düzeltildi. **Bu kurallar bozulursa veri kaybı olur.**

1. **Tek bozuk dosya arşivi silmez.** `loadState` her dosyayı AYRI
   normalleştirir. `catch` içinde `appState = { cases: [], ... }` YAZMAYIN;
   bu, tek hatada tüm arşivi siler (v2.84'te kanıtlandı). Bozuk dosya `failed`
   listesine girer, ham kaydı `akis.rescue.failedCases`'e yazılır.
2. **Kapanışta yazma zorlanır.** `flushPersist()` `beforeunload`, `pagehide`
   ve `visibilitychange` (hidden) ile bağlıdır. Yeni bir yazma yolu eklerseniz
   `persist()` kullanın; doğrudan IndexedDB'ye yazmayın.
3. **Çoklu sekme koruması.** `initTabGuard()` + `tabWriteGuard()`. İkinci sekme
   açılınca ilki yazmayı bırakır. `persistNow()` başında `tabWriteGuard()`
   denetimi ZORUNLU.
4. **Dışa aktarma TÜM dosyaları kapsar.** Tek dosya varsa `case.json`, birden
   fazlaysa `archive.json` + `audio/<dosyaId>/`. `importProject` `archive.json`
   görürse `importArchive` çağırır. Yalnız aktif dosyayı paketlemek yanıltıcıdır
   (ekran "yedek alındı" der ama diğer dosyalar dışarıda kalır).

Test: `surum-testi` [10] (8 kural), `sema-testi` [3d] (6 kontrol).


## Aşama 10 — Paket sözleşmesi: yedek/geri yükleme/birleştirme (TAMAMLANDI, v2.102)

**Belirti (canlı veri):** Yedek başka bir bilgisayarda boş tarayıcıda açıldı →
ekran "2 dosya" dedi; içe aktarma sonrası çalışma alanında **3 kayıt** oluştu;
"⇄ Birleştir" **"uyumsuz"** hatası verdi.

**Tek kök:** *Boş çalışma alanı "dosya" sayılıyordu.* Uygulama boş kurulumda
çalışabilmek için kendiliğinden boş bir dosya açar; bu dosya kullanıcı verisi
değildir. v2.101'de yedeğe, arşive ve geri yüklemeye giriyordu. Ayrıca yedek
(`archive.json`) ile birleştirme (`case.json`) paketleri **ayrı kurallarla**
okunuyordu; aynı biçimde üretilen paket birleştirmede reddediliyordu.

### Değişmez kural: paket = kullanıcı verisi taşıyan dosyalar

| Fonksiyon | Görev |
|---|---|
| `isEmptyCase(c)` | Kullanıcı verisi yoksa `true`. Varsayılan uzmanlık alanı, yöntem metni ve tarih **veri sayılmaz**. |
| `exportPlanFor(cases, activeCaseId, scope)` | `scope` = `current`/`all`; döner: `kind` (`none`/`single`/`archive`) + `scope` + `cases` + `skipped`. Boş dosyalar `skipped` ile **bildirilir**, sessizce atılmaz. **Kapsamı (`scope`) taşımayan bir plan fonksiyonu yazmayın** — v2.124 "hangi kapsam seçildi" hatası buradan doğdu. |
| `selectCaseFromArchive(arch, mine)` | id → dosya no + mahkeme. Bulunamazsa NEDEN söylenir; "uyumsuz" demek yetmez. |
| `dropEmptyCases(cases)` | Yalnız boş kayıtları düşürür. Açılışta, içe aktarma sonrası ve yeni dosya açarken kullanılır. |
| `matchAudioEntries(names, mats, caseId)` | Arşivde sesler `audio/<dosyaId>/` altındadır; `caseId` verilmezse yanlış dosyanın sesi bağlanabilir. |

**Kural:** Yeni bir paket okuyan/yazan yol eklerken bu beş fonksiyondan geçin.
İki paket biçimi (tekil/arşiv) **aynı** kuralı kullanmalıdır; ayrışırsa kullanıcı
"uyumsuz" hatası görür.

**Sessiz hata yasak:** Arşivden geri yüklemede ses bulunamazsa hangi kayıt
olduğu söylenir (dışa aktarmada `EKSIK_SES_UYARISI.txt` zaten vardı; içeri
alırken yoktu).

**Yan alan hatası (düzeltildi):** `applyMerge` MIME için `m?.mimeType` okuyordu;
öyle bir alan yok. Gerçek alan `m.type`. Alan adı uydurmayın — şemaya bakın.

**Koruyan test:** `birim-testleri` [32] (26 kontrol) + gerçek `JSZip` ile uçtan
uca ölçüm (yedek üret → oku → arşiv birleştir → boş tarayıcıya geri yükle →
ikinci kez yükle).

### DERS: belirti sayısı ≠ hata sayısı

Üç belirti (2 dosya / 3 kayıt / uyumsuz) tek kökten geliyordu. Belirtileri ayrı
ayrı yamamak yerine **ortak sözleşme** aranmalı. Ölçüm sırası: `freshCase()` →
`exportProject` paket içeriği → `readProjectPack` → `importArchive` sonrası
`appState.cases.length`. Dördü de aynı betikle ölçüldü.


### Aşama 10b — Yeniden çözümleme koruması (TAMAMLANDI, v2.103)

**KURAL: `transcribe()` mevcut bölümlerin üzerine yazar → bölüm varsa HER ZAMAN
sor ve geri alma kaydı al.**

v2.102'de koruma `edited.length` koşuluna bağlıydı: *elle düzeltilmiş veya
onaylanmış* bölüm yoksa hiçbir uyarı çıkmıyordu. Modelin ürettiği ama henüz
kontrol edilmemiş metin sessizce siliniyordu. Ölçüm (2 dokunulmamış bölüm):

```
askConfirm=0 · snapshotForUndo=0 · previousSegments=YOK
```

Düzeltme:
- `reprocessPlan(segments)` — saf karar. `ask = segs.length > 0`.
  `edited` / `approved` / `untouched` yalnız **gerekçe metni** için sayılır,
  karar sayıma bağlı DEĞİLDİR. (Dar sayım koşulu tam olarak bu hatayı üretti.)
- `queueReprocessSummary(materials)` — toplu yolda tek soru.
- `transcribe(id, {confirmed})` — `confirmed` yalnız kuyruktan gelir; geri alma
  kaydı (`snapshotForUndo` + `previousSegments`) her durumda alınır.

**Neden metni boş bölüm de soruya dahil:** elle yerleştirilmiş zaman sınırları
emektir ve yeniden çözümlemede kaybolur.

**Koruyan test:** `birim-testleri` [33] (21 kontrol). Ayrıca gerçek Chromium:
IndexedDB'ye bölümlü kayıt yaz → yenile → UI'dan "Yeniden çözümle" tıkla →
onay diyaloğu çıkar → "Vazgeç" → 2 bölüm korunur.

**Test yazım dersi:** `sema-testi` [13] `transcribe(id)` imzasını birebir
arıyordu ve imza `transcribe(id, opts)` olunca kırıldı. Test **davranışı**
sınarlamalı, yazımı değil; sınır artık `async function transcribe(` ile
bulunuyor.


### Aşama 10c — Üst bar sessiz kesme (TAMAMLANDI, v2.105)

**KURAL: sığmayan öğe kesilmez, SARAR.** `overflow:hidden` + `text-overflow:
ellipsis` bir metin kutusunda, o metin gerçekten kısalıyorsa "sessiz kesme"dir
ve yasaktır.

**Ölçüm (v2.104):** `#pageTitle` 5 görünümün hepsinde kırpılıyordu
("İnceleme ve sorular" 211px içerik / 95px kutu). Sebep: `.top-actions`
`flex:none` ile 922px yer kaplıyordu (depolama göstergesi tek başına 304px).
Hiçbir uyarı yoktu.

**Düzeltme:**
- `.topbar { flex-wrap: wrap }`, `.top-left`/`.top-title { flex: 0 0 auto }`
- `.top-title h1 { overflow: visible; text-overflow: clip }`
- Durum yazıları kısaltıldı (`● Kayıt güncel`, `Yedek yok`, `Dava: … · %n dolu`)
- **UYARI yazıları kısaltılmaz** (`KAYDEDİLMİYOR`, `DEPOLAMA DOLU`,
  `KAYIT OKUNAMADI`). Yer kazanmak için uyarı küçültmek yasak.

**Kendi kuralımı ihlal ettim:** ilk denemede `#usageState`'e
`max-width: 22ch` + `text-overflow: ellipsis` verdim; ölçüm **201px → 152px
kırpma** gösterdi. Kırpma kaldırıldı, `tasarim-testi` [2c] bunu da denetliyor.

**Ölçüm (v2.105):** 1280px+ tek satır (60px), 1100–900px sarar (92px),
760–600px sarar (125px). 5 görünümde **kesilen metin: 0**.

**DERS:** "kesme" ölçütü yalnız `scrollWidth > clientWidth` değildir;
`overflow` görünür değilse kesme vardır. Ve kendi eklediğin `max-width` +
`ellipsis` de aynı hatayı üretir — düzeltmeyi de ölç.


### Aşama 10d — Otomatik onay ≠ bilirkişi onayı (TAMAMLANDI, v2.106)

**KURAL: makinenin "uygun" işareti bilirkişi onayı DEĞİLDİR.** Rapora
"Onaylandı" yalnız `approved` (dinleyerek onay) için yazılır.

**Ölçüm (v2.105):** `bulkApproveQuick` → `review='approved'`; rapor
`reviewLabel()` → **"Onaylandı"**. Makine kararı ile insan onayı ayrışmıyordu.

**Yeni durum: `machine` ("Çözümlendi")**
- `REVIEW_STATE` + `REVIEW_LABEL` + `REVIEW_HINT` + `REVIEW_TONE` dördü birlikte
  tanımlanır (`assets/schema.js`). Etiket/ipucu/renk TEK KAYNAK; app.js kopya
  metin tutmaz.
- `isReviewed({review:'machine'})` → **false** (kontrol sayacı saymaz).
- `isHumanApprovedReview(segReview(s))` (schema) → yalnız `approved`.
- Birleştirme `rank`: `machine: 0` (= `pending`), `approved: 2` → gelen onay
  makine işaretini geçer.
- Rozet: kısa etiket + `title` ipucu + `auto` sınıfı (yeşil DEĞİL).

**Kullanıcı tasarım kuralı:** etiket KISA, ayrıntı İPUCUNDA. Segment listesi
kalabalıklaşmaz; yeni etiket eklenince karışmaz.

**Ölçüm (v2.106, gerçek Chromium):** 3 bölüm → "✓ 3 hızlı onayla" →
"Çözümlendi" ×3 (`auto`), sayaç **0/3**, raporda "Onaylandı" yok. Sonra 1 bölüm
elle onaylandı → "Onaylandı" (1 `done`), raporda `onayCount = 1`.

**DERS:** "onay" kelimesi iki farklı şeyi anlatıyordu (makine uygunluğu,
bilirkişi doğrulaması). Aynı sözcüğü iki anlamda kullanmak adli belgede
yanıltıcıdır; durum kodları ayrılmalı.


### Aşama 10e — Arşivleme ve iki aşamalı silme (TAMAMLANDI, v2.107)

**KURAL: arşiv veri silmez; silme iki aşamalıdır.**

**Ölçülen risk:** `snapshotForUndo` yalnız `appState.cases` kopyalar; ses
IndexedDB'de ayrı ve `deleteBlob` KALICI. Ctrl+Z metni getirir, **sesi
getirmez**. Bu yüzden silme tek tıkla yapılamaz.

**Akış:**
1. **Arşivle** (`archiveCase`): `status='archived'` + `archivedAt` + `auditLog`.
   Veri ve ses DURUR; yedeğe girmeye devam eder. `visibleCases()` seçiciden
   gizler. Üst barda "Arşiv (N)" düğmesi.
2. **Geri al** (`unarchiveCase`): `status='draft'`, `archivedAt` silinir.
3. **Kalıcı sil** (`purgeCaseById`): yalnız `canDeleteCase` (arşivli) iken.
   (a) `askConfirm` — sesin de silineceğini söyler; (b) `askTypedConfirm` —
   `deleteConfirmPhrase` (dosya no) ELLE yazılır. Sonra `deleteBlob` ile ses
   kalıcı silinir.

**Değişmez kurallar:**
- Son görünür dosya arşivlenirse **yeni boş çalışma alanı** açılır; seçici boş
  kalmaz (boş seçici "verim gitti" izlenimi verir).
- Arşivli dosyalar `exportPlanFor` çıktısında **kalır** (yedek eksik olmaz).
- Silinen dosyanın sesi geri gelmez; kullanıcıya açıkça söylenir.

**Koruyan test:** `birim-testleri` [35] (24 kontrol) + gerçek Chromium
kırılganlık testi: A silindi → **B'nin sesi korundu** (`cB::mcB`), A'nın sesi
(`cA::mcA`) gitti. "Doğru dosyayı mı siliyor" sorusunun cevabı ölçümle verildi.


### Aşama 10f — Arşiv: boş dosya ve görünmeyen kimlik (TAMAMLANDI, v2.108)

**KURAL: kullanıcı GÖREMEDİĞİ bir şeyi yazamaz.** Onay ifadesi, ekranda görünen
addır; ham kimlik (`mwp6t1x5-fdist0v`) asla yazdırılmaz.

**Ölçülen üç hata (v2.107):**
1. Boş dosya (0 kayıt, dosya no yok) arşivlenebiliyordu.
2. Her arşivlemede yeni boş dosya açıldığı için arşiv "Yeni inceleme dosyası" ile
   doluyordu; aynı adlı kayıtlar ayırt edilemiyordu.
3. Silme onayı ekranda HİÇ görünmeyen ham kimliği yazdırıyordu.

**Düzeltme (saf fonksiyonlar, `birim-testleri` [36] korur):**
- `canArchiveCase(c)` → `!isArchivedCase(c) && !isEmptyCase(c)`
- `caseShortId(c)` → kimliğin son 6 karakteri (okunabilir, yazılabilir)
- `caseDisplayName(c)` → dosya no varsa o; yoksa `ad #kısaKimlik`
- `deleteConfirmPhrase(c)` = `caseDisplayName(c)`

**Kullanım kuralı:** dosya adı gösteren HER yer `caseDisplayName()` kullanır
(seçici, arşiv paneli, toast, onay diyaloğu). Ham `c.id` gösterme.

**Ölçüm (v2.108, gerçek Chromium):** boş dosyada arşivle → engellendi
("Arşivlenecek veri bulunmuyor"); 4 kez bas → **Arşiv (0)**; dolu dosya
arşivlendi → panelde `2024/108`; silme onayı `2024/108` istedi.

**DERS:** "kimlik" ile "görünen ad" ayrı şeylerdir. Ekran için `caseDisplayName`,
veri için `c.id`. İkisini karıştırmak kullanıcıyı çıkmaza sokar (görünmeyen
değeri yazmasını istemek gibi).


### Aşama 10g — İlk açılış gerçekten boş (TAMAMLANDI, v2.109)

**KURAL: boş taslak KAYDA YAZILMAZ.** Bellekte tutulur (arayüz gerekli),
diske yazılmaz.

**Ölçülen hata (v2.108, tam boş profil):** IndexedDB'de 1 kayıt vardı
(`{fileNo:"", name:"Yeni inceleme dosyası", mats:0}`). Yeni tarayıcıda/sekmede
"zaten dosya var" görünüyordu.

**Ölçülen YANLIŞ çözüm:** "dosya oluşturmayı kaldır" → `TypeError: Cannot read
properties of null (reading 'reportDate')`. Nesne bellekte **gerekli**.

**Doğru çözüm:**
- `casesForStorage(cases)` → yalnız `isEmptyCase` olmayan dosyalar.
  `persistNow` ve `flushPersist` bunu kullanır.
- `isEmptyWorkspace(cases)` → kayda yazılacak dosya yok mu?
- Seçicide boş taslak **"— Yeni dosya —"** olarak görünür (dosya adı değil).
- Durum çubuğu: "Henüz dosya yok — bilgi girin veya içe aktarın".

**Uçtan uca ölçüm (gerçek Chromium):** boş tarayıcı → `DEPO []`; yeni sekme →
hayalet yok; veri gir → `DEPO [{"no":"2024/109"}]`; yenile → veri korundu;
JS hatası 0.

**DERS:** "bellekte gerekli" ≠ "diske yazılmalı". Arayüzün ihtiyaç duyduğu
geçici nesne ile kullanıcının verisi ayrı şeylerdir. Ayrıca düzeltmeyi
denemeden "kaldır" demek çökertiyor — **her düzeltme ölçülür.**


### Aşama 10h — Dışa aktarma kapsamı ve terimler (TAMAMLANDI, v2.110)

**KURAL: "Dışa aktar" neyi aktaracağını SORAR. Sessiz varsayılan yok.**

**Ölçülen hata (v2.109, 3 dosya varken aktif=2024/A):** düğmenin `title`'ı yoktu
ve basınca **3 dosyanın hepsi** indi (`AKIS_Yedek_3_dosya_2026-11-20.akis`).
Kullanıcı tek dosya sandı. Dosya adında **saat yoktu** → aynı gün üzerine yazma.

**Terim sözlüğü (tek anlam, tek terim):**

| Terim | Anlamı |
|---|---|
| Dosya | Tek dava / çalışma alanı |
| Yedek paketi (.akis) | 1+ dosya + ses kayıtları |
| Dışa aktar | Paket oluştur |
| İçe aktar | Paket ekle (kopya açar) |
| Birleştir | Paketi mevcut dosyayla birleştir |
| Arşivle | Gizle (silmez) |

"Arşiv" kelimesi **paket** anlamında kullanılmaz (yalnız arşivlenmiş dosyalar).

**Fonksiyonlar:**
- `EXPORT_SCOPE = ['current','all']`
- `exportPlanFor(cases, activeId, scope)` — `current` yalnız aktif dosya;
  `all` hepsi (arşivliler dâhil). Aktif boşsa `current` → `none` (tümüne dönmez).
- `backupFileName(plan, when)` — tarih **+ saat**; `safeName` ile dosya sistemi
  güvenli.
- `askExportScope()` — iki seçenekli diyalog; aktif dosya boşsa "yalnız bu dosya"
  devre dışı ve nedeni görünür.

**DERS:** Bir düğme birden fazla işi sessizce yapıyorsa kullanıcı yanılır.
Kapsam **açık seçim** olmalı; ayrıca her düğmenin `title`'ı olmalı (masaüstü
uygulaması beklentisi).


### Aşama 10i — Çözümleme profili: kayıt başına sabit + görünür (v2.111)

**KURAL: profil çözümleme BAŞINDA bir kez sabitlenir.** `transcribeWindow()`
kendi başına `localStorage` okumaz.

**Ölçülen hata (v2.110):** `transcribeWindow()` her pencerede
`savedProfilePref()` çağırıyordu. Uzun çözümleme sürerken profil değişirse aynı
kaydın bölümleri **farklı profille** çözümlenirdi. Ayrıca kayıtta profil
saklanmıyor, ekranda yazmıyordu.

**Değişmez kurallar:**
1. `transcribe()` → `const runProfile = savedProfilePref()` (bir kez) →
   `transcribeWindow(pipe, window, offset, runProfile)`.
2. `material.transcribedWithProfile` kayda yazılır.
3. Bölüm yeniden çözümlemesi kendi `segProfile`'ını sabitler.
4. `PROFILE_LOCK = {language:'turkish', task:'transcribe'}` — profil gevşetmez.
5. Profil RAPORA yazılmaz (`REPORT_TEXT`'te "profil" geçmez).
6. Ekranda KISA etiket (`profileRunLabel`), uzun açıklama ipucunda.

**Ölçüm (v2.111, gerçek Chromium):** kayıt kartı "Şive/aksan" + ipucu; bölüm
paneli "Profil: Şive/aksan"; model rozeti yanında; raporda profil adı YOK.

**Test dersi (tekrar):** `sema-testi` `transcribeWindow(pipe, slice, a)` imzasını
birebir arıyordu, imza değişince kırıldı. İmza testi **davranışa** çevrildi
(`transcribeWindow(\s*pipe,\s*slice,\s*a\b`). Bu ders ikinci kez yaşandı;
yeni test yazarken imza değil DAVRANIŞ sınanmalı.


### Aşama 10j — A–B döngüsü onarıldı (TAMAMLANDI, v2.112)

**KURAL: `loopStopTarget(m, segmentEnd)` TEK KAYNAK.** Döngü açık ve geçerliyse
durma noktası **B**'dir; bölüm sonu değil.

**Ölçülen üç hata (v2.111):**
1. `playSegmentRange()` `loopRange`'ı hiç çağırmıyordu → her "▶ Dinle" `stopAt =
   bölüm sonu` yazıp döngüyü **sessizce öldürüyordu**.
2. A–B için klavye kısayolu yoktu; `B` tuşu **bölmeye** bağlıydı.
3. Gösterge yalnız `draw()` içinde tazeleniyordu → tuşla A/B basınca geri
   bildirim yoktu ("tuşlar çalışmıyor" izlenimi).

**Kendi hatam (kayda geçti):** ilk düzeltmede `handleSegKey` kapsamında
**olmayan** `player` değişkenini kullandım; tuşlar sessizce hiçbir şey yapmadı.
Doğrusu `card.querySelector('audio')`. **Ders: kapsamda var mı diye bakmadan
değişken kullanma; sessiz ReferenceError/catch yutması fark edilmez.**

**Fonksiyonlar:**
- `loopStopTarget(m, segmentEnd)` — 2 oynatma yolu (bölüm, ana oynat) kullanır.
- `toggleLoop(m, player, index)` — 🔁 düğmesi ve `K` tuşu **aynı** fonksiyon.
- `paintLoopIndicators(m)` — `draw()`'dan bağımsız DOM tazeleme.
- `LOOP_KEYS = {a:'a', b:'b', toggle:'k'}`; bölme **S**.

**Değişmez:** döngü şemaya yazılmaz (`m.__loop` oturumluk); bölüm
`start`/`end`'ine dokunmaz.

**Ölçüm (v2.112, gerçek WAV + Chromium):** A(1.0)+B(3.0) → etiket doğru;
K → açık; "▶ Dinle" → `stillOn=true` (eski: false), `curTime 2.51 < 3.0`.


### Aşama 10k — Bölüm listesi kaydırması (TAMAMLANDI, v2.113)

**KURAL: kaydırma hedefi MUTLAK hesaplanır; `scrollTop +=` ile artımlı ekleme
YAPILMAZ.** `scrollTop` tam sayıya yuvarlanır → hata birikir.

**Ölçülen hata (v2.112, 100 bölüm):** `scrollTop=3184`, `maxScroll=3227` →
43px eksik, son öğe 28px görünmüyor. Takip modunda `activeOverflowPx=28`.

**Düzeltme:** `nextScrollTop({listTop,listBottom,itemTop,itemBottom,scrollTop,
maxScroll})` — mutlak hesap + `[0,maxScroll]` kırpma + idempotent.

**Ölçüm (v2.113):** takip modunda 100. bölüm → `activeOverflowPx=0`.

**DERS (ölçüm yöntemi):** `scrollHeight`/`clientHeight` doğru görünse bile
`getBoundingClientRect().bottom` karşılaştırması gerçek görünürlüğü verir.
"Kaydırma çubuğu dipte" ≠ "içerik oturdu".

**DERS (kullanıcı algısı):** kullanıcı "3 kayıt" dedi, ölçüm 1 öğenin 28px'i
dedi. Sayı farklı ama hata gerçekti; **algıyı değil ölçümü esas al, ama
kullanıcı gözlemini küçümseme.**


### Aşama 10l — "%100 olmuyor" açıklaması (TAMAMLANDI, v2.114)

**KURAL: sayı doğruysa da AÇIKLAMA zorunlu.** "97/100" gösterip nedenini
söylememek sessiz hatadır.

**Ölçüm (v2.113):** 97 approved + 2 relisten + 1 machine → %97. Kural doğru
(yalnız approved/inaudible sayılır) ama kullanıcı hangi 3 bölüm olduğunu
göremiyordu.

**Fonksiyonlar (tek kaynak):**
- `pendingBreakdown(segs)` → `{total, pending, relisten, machine, approved, inaudible}`
- `pendingSummaryText(segs)` → `"3 bölüm eksik: 2 yeniden dinlenecek · 1 çözümlendi"`;
  eksik yoksa `''`. Türkçe tekil: "1 bölüm".

**Arayüz:** durum çubuğu (`#sbPending`, tıklanabilir → filtre `pending`) ve
kayıt kartı `head-check` ipucu aynı metni kullanır.

**Ölçüm (v2.114):** "%40" + açıklama; tıklayınca 5 değil **3** bölüm listelendi.

**DERS:** Bir sayı kullanıcıyı şaşırtıyorsa eksik olan sayı değil AÇIKLAMADIR.
Sayıyı değiştirmeden önce "neden böyle" sorusunu cevapla.


### Aşama 10m — Belirsiz okuma + bölüm spektrogramı (TAMAMLANDI, v2.115)

**ADLİ AYRIM (yeni, değişmez):**
| Durum | Etiket | Anlamı |
|---|---|---|
| Ses anlaşılmıyor | `inaudible` → "Anlaşılmadı" | teknik yetersizlik |
| Ses duyuldu, iki okuma mümkün | `ambiguous` → "Belirsiz okuma" | "geldi" / "kaldı" |
| Bilirkişi karar verdi | `approved` → "Onaylandı" | seçilen okuma |

**KURALLAR:**
1. `ambiguous` onay DEĞİLDİR: `isReviewed` false → sayaçta eksik görünür.
2. `ambiguousReportText(s)` TEK KAYNAK: iki okuma + seçim; seçim yoksa
   "seçilmedi". **Belirsizlik raporda gizlenmez** (adli dürüstlük).
3. Alanlar: `s.reading1`, `s.reading2`, `s.chosen`.
4. Spektrogram: dalga zaman/ritim, spektrogram frekans. **İkisi birlikte**;
   biri diğerinin yerine geçmez. `computeSpectrogram(blob, cols, fft, {startSec,
   endSec})` yalnız bölüm aralığını hesaplar.
5. Bölüm değişince eski spektrogram gizlenir.

**BULUNAN YAN HATA (kritik):** rapor hücreleri `reviewLabel(s)` çağırıyordu;
`reviewCellText(s)` hiç kullanılmıyordu. Bu yüzden `machine` ve `ambiguous`
için özel metin rapora GİRMİYORDU. Düzeltildi: her iki rapor yolu (HTML satırı
ve DOCX/UDF) `reviewCellText` kullanır. **Yeni bir durum eklerken rapor
yollarının `reviewCellText` çağırdığını doğrulayın.**

**DERS:** İki benzer fonksiyon (`reviewLabel` / `reviewCellText`) varsa biri
ölü koddur. Çağrı yerlerini grep'le doğrula; "fonksiyon var" ≠ "fonksiyon
kullanılıyor".

**Ölçüm (v2.115, gerçek Chromium):** panel iki okuma + seçim; rozet "Belirsiz";
rapor `Belirsiz okuma — Belirsiz: "geldi" / "kaldı" (seçilen: geldi)`;
spektrogram `drawn=true`.


### Aşama 10n — Takip modu: titreme + yinelenen alan (TAMAMLANDI, v2.116)

**KURAL: döngü içinde `innerHTML` YAZILMAZ.** DOM bir kez çizilir; her tick'te
yalnız **sınıf** (`on`/`done`) değişir.

**Ölçülen hata (v2.115, MutationObserver):** `markTextFollow` ve `followKaraoke`
her 120 ms'de `innerHTML` yazıyordu → **3 saniyede 25 DOM değişikliği** →
metin titriyordu. Aynı metin **3 yerde** gösteriliyordu (`.karaoke`,
`.sd-follow`, `textarea`).

**Fonksiyonlar (tek kaynak):**
- `karaokeSegments(s)` → `[{w, s, e}]`. Kelime zamanı varsa kelime; yoksa metin
  parçaları (oransal). **Boşluk parçaları korunur** (`w` boşluk, `s/e` NaN).
- `karaokeActiveIndex(segs, t)` → aktif indeks veya `-1`.
- `markTextFollow`: `__karaokeKey` (idx|metin|parça sayısı) değişmedikçe DOM'a
  dokunmaz; `bar.__active` değişince yalnız sınıf güncellenir.

**Değişmez:** takip metni **tek yerde**. İkinci kutu (`.karaoke`) gizli ve boş.

**Ölçüm (v2.116):** DOM değişikliği 25 → **0**; `.karaoke` hidden+boş;
`.sd-follow` metin + sınıf vurgusu; textarea ayrı.

**DERS:** `innerHTML` döngü içinde = titreme + performans kaybı + kullanıcı
okuyamaz. Sınıf değişimi her zaman tercih edilir.


### Aşama 10o — ACİL: canlı site açılmıyordu (TAMAMLANDI, v2.117)

**HATA:** `Uncaught SyntaxError: The requested module './schema.js' does not
provide an export named 'AMBIGUOUS_REVIEW'` → uygulama HİÇ açılmadı.

**KÖK NEDEN (ölçüldü):**
```
index.html     : <script src="assets/app.js?v=2.116">   ← sürümlü
assets/app.js  : } from './schema.js';                   ← SÜRÜMSÜZ
GitHub Pages   : cache-control: max-age=600
```
`?v=` yalnız `<script>` etiketini kırar; **iç `import`'u kırmaz**. Tarayıcı eski
`schema.js`'i önbellekten kullandı → yeni export yok → modül yüklenemedi.

**NEDEN v2.115'te görünmedi:** o sürümde `schema.js` değişmemişti; uyuşmazlık
zararsızdı. v2.116'da `schema.js`'e `ambiguous` eklenince patladı.

**DÜZELTME:** `from './schema.js?v=2.117'` — import artık sürümlü.

**KORUYAN TEST:** `surum-testi` **2b** — import `?v=` taşımak ZORUNDA ve
`APP_VERSION` ile aynı olmalı. Düzeltme yokken KALDI (kanıtlandı).

**DEĞİŞMEZ KURAL:** `?v=` verilen bir modülün **tüm import zinciri** de
sürümlenmelidir. Aksi hâlde tarayıcı karışık sürüm yükler ve bu hata YALNIZ
canlıda görünür (yerelde önbellek yok).

**YENİ MODÜL EKLERKEN:** `import ... from './x.js?v=${APP_VERSION}'` biçimini
kullanın ve `surum-testi`'ye kontrol ekleyin.

**Ölçüm (v2.117):** uygulama açıldı, `#appVersion=v2.117`, JS hatası 0,
`schema.js?v=2.117` → `hasAmbiguous: true`.

**DERS:** Tarayıcıda ES modülleri ayrı ayrı önbelleklenir. Sürüm parametresi
tek dosyaya verilirse diğerleri eski kalır. "Yerelde çalışıyor" bu sınıf hatayı
YAKALAMAZ — yalnız temiz önbellekli canlı ortam gösterir.


### Aşama 10p — Kendini güncelleyen sayfa (TAMAMLANDI, v2.118)

**SORUN:** GitHub Pages **her dosyaya** `cache-control: max-age=600` verir —
`index.html` dâhil. Push sonrası kullanıcı 10 dk eski sayfayı görür; oradaki
`?v=` de eski kalır. "Ctrl+Shift+R bas" çok kullanıcıda ölçeklenmez.

**ÇÖZÜM:**
1. `version.json` (`{"version":"X.Y"}`) — `cache:'no-store'` ile istenir.
2. `index.html` denetleyici: **60 sn** + `visibilitychange` (sekmeye dönüş).
3. Fark varsa: `__akisIdle() === true` ise `location.replace(?t=<zaman>)`;
   değilse **"Yeni sürüm hazır"** banner + "Şimdi yenile".

**GÜVENLİK (`window.__akisIdle`, app.js):** `false` döner eğer
`persistPending` · `queueRunning` · `transcribing` · ses çalıyor · odakta
metin alanı · açık `<dialog>`. Bilinmeyen durumda `false` (temkinli).

**Sürümü artırırken 4 yer birlikte:**
`APP_VERSION` · `import './schema.js?v='` · `index.html` `RUNNING` + `?v=` ·
`version.json`. `surum-testi` 2b/2c bunu zorunlu kılar.

**Ölçüm (v2.118):** `version.json` okundu; `__akisIdle()` boşta `true`,
yazarken `false`; banner `display:flex`.

**DERS:** Önbelleği "kullanıcıya kırdırma" çözüm değildir. Sürüm bilgisini
önbelleksiz bir uçtan oku ve sayfayı kendine yenilet — ama **iş kaybettirmeden**
(boşta değilse yenileme yok).


### Aşama 10q — Takip iki özelliğe ayrıldı; karaoke kaldırıldı (TAMAMLANDI, v2.119)

**ÖLÇÜLEN ÜÇ HATA (v2.118):**
1. Ana oynat/Dinle takibi **kendiliğinden açıyordu**:
   `if (!followState.on) setFollow(true)` — **2 yerde**.
2. Aynı metin **iki yerde** gösteriliyordu: `.karaoke` + `.sd-follow`.
3. `.karaoke` **her `timeupdate`'te** `innerHTML` yazıyordu → bozuluyordu.

**KULLANICI KARARI (değişmez):** Takip **kullanıcı açmadıkça AÇILMAZ**.
Varsayılan kapalı. Ana oynat/Dinle takibi açmaz.

**İKİ AYRI MOD (tek düğme iki işi yapıyordu):**
| Mod | Kısayol | İş |
|---|---|---|
| `autoAdvance` | `F` | Çalarken sol listede bir sonraki bölüme geç |
| `liveHighlight` | `G` | Sağ panelde okunan kelimeyi vurgula |

**Kurallar:**
1. `followState = { on, autoAdvance, liveHighlight }` — üçü de **false** başlar.
2. `followShouldAutoStart(pref)` → yalnız `pref.autoFollow === true`. Bilinmeyen
   değerde **false** (temkinli). Tercih `akis.followPref`'te saklanır.
3. `setFollow(on, mode)` — mod verilirse yalnız o; verilmezse ikisi (geriye uyum).
4. `followTick` yalnız `autoAdvance` iken; `markTextFollow` yalnız
   `liveHighlight` iken çizer (kapalıysa `.sd-follow` kaldırılır).
5. **Karaoke kutusu YOK.** `renderKaraoke` `innerHTML` yazmaz; `markTextFollow`'a
   delege eder. Tek görsel alan `.sd-follow` (sınıf-tabanlı, sabit).

**DERS:** Bir düğme iki farklı işi yapıyorsa kullanıcı hangisini açtığını
bilemez. Modları AYIR ve varsayılanı KAPALI tut. Ayrıca aynı veriyi iki yerde
gösteren ikinci kutu, güncellenmediğinde "bozuk" görünür — tek kaynak kullan.


### Aşama 10r — Liste yüksekliği kabı aşıyordu (TAMAMLANDI, v2.120)

**BELİRTİ:** 82 bölüm var, kullanıcı 78'i görüyor; 79 yarım.

**ÖLÇÜM (gerçek Chromium):**
```
.seg-list       : 497px  (max-height: 62vh)
.seg-workspace  : 360px  overflow: hidden   ← KIRPAN
Kırpılan        : 137px ≈ 3,8 bölüm
```

**KÖK NEDEN:** v2.64'te "200 bölümde scroll yok" hatası için
`max-height: 62vh !important` eklenmişti. Ama saran `.seg-workspace` daha
kısaydı ve `overflow:hidden` olduğu için liste **sessizce kırpılıyordu**.
v2.113 `scrollTop` hesabını düzeltmişti; bu AYRI bir katmandı (görünürlük).

**DÜZELTME:** `seg-list { height:100% !important; max-height:none !important }`
ve `seg-workspace { overflow: visible !important; height: 100% !important }`.

**DEĞİŞMEZ KURALLAR:**
1. Liste yüksekliği **KABINDAN** türetilir; `vh` tabanlı sabit yükseklik
   kullanılmaz (kap daha kısaysa kırpılır).
2. `overflow:hidden` ile çocuk kırpılmaz → kaydırma kullanılır (görünür).
3. Dar ekran `@media` kısa liste makuldür; test bunu ayrı tutar.

**KORUYAN TEST:** `tasarim-testi` [2d] — yorumlar ve `@media` blokları
çıkarılarak denetlenir (yanlış pozitif önlenir).

**DERS:** `!important` ile verilen yükseklik, KAP yüksekliğiyle uyuşmuyorsa
sessiz kırpma üretir. Yükseklik verirken KABI da hesaba kat; `overflow:hidden`
bir kabın çocuğunu kesiyorsa bu bir hatadır, "tasarım" değil.

**Ölçüm (v2.120):** `listH=351 · parentH=351 · overflow=visible · kırpılan=0`;
sona kaydırınca `lastFullyVisible: true`.


### Aşama 10s — Yerleşim: tek kaydırma + spektrogram geçişi (TAMAMLANDI, v2.121)

**ÖLÇÜLEN HATA (v2.120 yan etkisi):** `.seg-workspace { height:100% }` sağ
detayı 351px'e sıkıştırdı; içerik 496px → **sağ panelde ayrı kaydırma çubuğu**.
Kullanıcı: *"sağ taraftaki segment detay kısmına kaydırma çubuğu gelmiş"*.

**DOĞRU YERLEŞİM (değişmez):**
```css
.seg-workspace { height: auto !important; align-items: start; overflow: visible; }
.seg-list      { height: auto; max-height: 68vh; overflow-y: auto; }
.seg-detail    { max-height: none; overflow: visible; }   /* iç kaydırma YOK */
```
- Kap **yükseklik dayatmaz** → çocuklar içeriği kadar uzar.
- **Tek kaydırma**: yalnız `.seg-list`. Sağ panel kendi içinde kaymaz.
- `overflow:hidden` ile çocuk kırpılmaz (v2.120 dersi).

**SPEKTROGRAM (v2.121):** Düğme **dalga araç çubuğunda** (Böl'ün yanında).
Basınca **aynı alanda** dalga ↔ spektrogram geçişi (biri gizlenir). Aynı
yükseklik (88px) → zıplama yok, panel uzamaz. Bölümün **kendi aralığı** çizilir.
Bölüm değişince görünüm **dalgaya döner**.

**KORUYAN TEST:** `tasarim-testi` [2d] (3) + [2e] (2).

**Ölçüm (v2.121, gerçek Chromium):** 82 bölüm → liste kayar, son bölüm tam
görünür; detay `hasScroll=false`; spektrogram `drawn=true`, panel 598px.

**DERS (ikinci kez):** Bir yerleşim hatasını düzeltirken (`height:100%`) başka
bir bölgeyi sıkıştırmamak gerekir. **Her iki paneli de ölç**: `scrollHeight >
clientHeight` her iki yönde kontrol edilmeli. "Liste düzeldi" demek "detay
bozulmadı" demek değildir.

**DERS:** `max-height: Nvh` kendi başına suçlu değildir; suçlu olan **kabın
daha kısa olup `overflow:hidden` ile kırpmasıdır**. Test ölçütü buna göre
yazılmalı (v2.120'deki "vh yasak" ifadesi yanlış ölçüttü).

### Aşama 10t — Onayın sahibi: birleştirmede onay aktarımı (TAMAMLANDI, v2.122)

**KURAL: onayı KİMİN verdiği kaydedilir; kaynağı doğrulanamayan onay
aktarılmaz ve SESSİZCE düşürülmez.**

**Ölçülen hata (v2.121, canlı veri):** Bilirkişi A dosyayı onaylayıp dışa
aktardı; yardımcı B **⇄ Birleştir** yaptı; onaylı bölümler "Kontrol bekliyor"
göründü. `mergeCases` dört senaryoda ölçüldü:

| Senaryo | Sonuç | Bildirim |
|---|---|---|
| Metne dokunmadan onay (`lastEditBy` boş) | approved → **pending** | **yok** |
| Metni düzenleyip onay | korunur | — |
| Tek kişilik dosya (ekip boş) | korunur | — |
| Yardımcı onayı | pending (doğru) | **yok** |

Kök neden: onay yalnız `review` yazıyordu; birleştirme "kim onayladı" sorusunu
`lastEditBy` (metin düzenleyen) ile tahmin ediyordu. Dinleyip onaylayan
bilirkişi metne dokunmaz → onay sahipsiz → düşer. Önizleme de "Çakışma yok"
diyordu.

**Değişmez kurallar:**

1. Kontrol kararı **yalnız** `setSegReview(s, code)` ile yazılır. İnsan kararı
   (`approved`/`inaudible`/`relisten`/`ambiguous`) `reviewedBy` + `reviewedAt`
   yazar; `pending` ve `machine` atfı temizler. Doğrudan `s.review = ...`
   yazmayın.
2. Birleştirme atfı `reviewedBy` → (eski kayıt) `lastEditBy` sırasıyla çözer
   (`approvalTransfer`). Ekip listesi boşsa eski davranış korunur.
3. Aktarılamayan onay **bildirilir** (`approval-not-attributed`): önizleme satırı
   + çakışma + sonuç bildirimi. Sessiz düşürme yasak.
4. Metin gelen taraftan alınınca `lastEditBy`/`reviewedBy` birlikte taşınır;
   aksi hâlde sonraki birleştirmede ikinci göz koruması yanlış çalışır.
5. İçe aktarma/geri yükleme `lastEditedBy` alanını **temizler**; kimlik bu
   bilgisayara aittir. Devralınırsa onaylar yanlış kişiye yazılır ve "ikinci göz
   onaylayamaz" kuralı sessizce delinebilir.
6. Önizleme (`compareCases`) birleştirmeyle AYNI `approvalTransfer()` kararını
   kullanır; ayrışırsa kullanıcı yanlış bilgiyle karar verir.

**DERS:** "Onay" tek bir alan (`review`) sanıldığında kimin verdiği kaybolur.
Metin düzenleyen ≠ onaylayan. Aynı alanı iki soru için kullanmak (kim yazdı /
kim onayladı) canlı veride onay kaybı üretti.

### Aşama 10u — Terim birliği ve paket adı (TAMAMLANDI, v2.123)

**KURAL: aynı şeye tek ad. "Dosya" = tek dava; "Paket" = taşınabilir .akis.
"Yedek" diye ikinci bir kavram yok.**

**Ölçülen karışıklık (v2.122):** aynı iş için üç sözcük ("dışa aktar", "yedek",
"paket"); tek dosya adı `AKIS_2024_108_…` (paket olduğu belli değil), tümü
`AKIS_TUM_3dosya_…`, boş `AKIS_YEDEK_bos_…`. Yardım metni gerçek adla
uyuşmayan `AKIS_Yedek_N_dosya_tarih.akis` örneğini gösteriyordu.

**Değişmez terim sözlüğü (yardım ekranıyla aynı):**

| Terim | Anlamı | Eski ad |
|---|---|---|
| Dosya | Tek dava/çalışma alanı | — |
| Paket (.akis) | 1+ dosya + ses | "yedek paketi" |
| Paket oluştur | Paketi indir | "Dışa aktar" |
| Paketten yükle | Paketi ekle (kopya açar) | "İçe aktar" |
| ⇄ Birleştir | Paketi açık dosyayla birleştir | — |
| Arşivle | Gizle; silmez | — |

**Paket adı:** `AKIS_Paket_<dosya no>_<tarih>_<saat>.akis` ·
`AKIS_Paket_Tam_<N>dosya_<tarih>_<saat>.akis` · `AKIS_Paket_bos_…`. Dosya
numarasındaki `/` → `-`.

**Kurallar:**

1. Yeni kullanıcı metni yazarken bu sözlüğü kullanın; "dışa aktar", "içe
   aktar", "yedek" sözcüklerini yeni metinde kullanmayın.
2. Eski sürüm notları (VERSION_NOTICES, CHANGELOG, yardım geçmişi) tarihseldir;
   yeniden yazılmaz. Yardım sözlüğü "bugünkü adı"nı söyler.
3. `backupState` "Paket yok" / "Son paket …" der; "Yedek" yazmaz.
4. **Arşiv güvenlidir** (ölçüldü): yalnız `status='archived'`; veri ve ses
   durur, pakete girer; kalıcı silme ayrı ve iki onaylı. "Arşiv" adı korunur.
5. Dosya adı biçimi testle sabittir (`birim` [38]); düğme/sözlük terimleri
   `surum` [11] ile denetlenir.

**DERS:** Aynı işi iki adla anlatmak kullanıcıyı yorar; adı dosyanın kendisi
söylemeli. "Yedek" sözcüğü hem paketi hem geri dönüş kopyasını anlatıyordu;
ikinci anlam kaldırıldı.

### Aşama 10v — Paket adı seçimi söyler (TAMAMLANDI, v2.124)

**KURAL: paket adı kullanıcının SEÇİMİNİ söyler, dosya SAYISINI değil.**

**Ölçülen hata (v2.123):** `backupFileName` "Tam" etiketini
`kind === 'archive'` koşuluna bağlamıştı; `kind` ise dosya sayısından
geliyordu. Tek dosya varken "Tüm dosyalar" seçilse bile `kind='single'`
olduğu için ad `AKIS_Paket_2024-108_…` çıkıyordu. İki seçim aynı adı
üretiyordu; hangisinin alındığı anlaşılmıyordu.

**Düzeltme:** `exportPlanFor` seçimi (`scope`) taşır; `backupFileName` "Tam"
dalını `plan.scope === 'all'` ile seçer. Paket BİÇİMİ (`case.json` /
`archive.json`) dosya sayısına bağlı kalır. Bildirim de seçimi söyler
("TÜM dosyalar (1 dosya)").

**DERS:** Bir etiketi türetilmiş bir alandan (`kind`) okumak, o alanın anlamı
değişince sessizce yanlış etiket üretir. Etiket doğrudan kullanıcı kararından
(`scope`) türetilmeli.

### Aşama 10w — Takip şeridi: sabit pencere (TAMAMLANDI, v2.125)

**KURAL: takip şeridi SABİT yükseklikte ve O ANKİ CÜMLEYİ gösterir; vurgu
metriği DEĞİŞTİRMEZ.**

**Ölçülen hata (v2.124):** kutu `max-height:120px` idi; içerik 202–314px,
iç kaydırma 74px (~5 satır) sıçrıyordu; `span.on` kalın+dolgu 1100px'te 8
kelimeyi başka satıra taşıyordu.

**Değişmez kurallar:**

1. `.sd-follow` yüksekliği sabittir (`height`, `overflow:hidden`); içerik
   değişse de kutu değişmez.
2. Yalnız o anki cümle gösterilir (`karaokeSentences`): sınır noktalama veya
   ≥0,4 sn sessizlik. Cümle değişince DOM bir kez yenilenir.
3. Aktif kelime yalnız arka plan/çerçeve ile vurgulanır; `font-weight` veya
   `padding` DEĞİŞTİRİLMEZ (satır sonları kayar).
4. Kaydırma birer satırdır; konum mutlak hesaplanır (`scrollTop +=` yok).
5. ASR `words` yalnız kelime veriyorsa aralara boşluk konur.

**DERS:** Bir "vurgu" yalnız renk değildir; kalınlık/dolgu değişirse metin
yeniden akar ve göz kaybedilir. Takip, gözün sabit bir noktada kalmasını
gerektirir.

### Aşama 10x — Spektrogram analiz yüzeyi (TAMAMLANDI, v2.126)

**KURAL: spektrogram yalnız GÖRÜNTÜ değildir; üzerinde çalışılır. Zaman ve
frekans eşlemesi SAF fonksiyonlardır.**

**Ölçülen hata (v2.125):** tuval 900 px iken ekranda 323 px (2,8× küçültme);
88 px yükseklik; tıklama oynatıcıyı oynatmıyordu; `tabIndex = -1`.

**Değişmez kurallar:**

1. Spektrogram açıkken `.sd-body` tek sütun (`spec-mode`); tuval tam genişlik
   ve 200 px. Dalga gizlenir.
2. Etkileşim: tıkla = konuma git · sürükle = A–B (döngü açılır) · Alt+tıkla =
   en yakın sınır · fare = zaman/frekans okuması.
3. İmleç ve A–B **ayrı kaplama tuvalinde**; spektrogram her harekette yeniden
   hesaplanmaz/çizilmez.
4. Eşleme saf fonksiyonlarla: `specTimeAt`, `specHzAt` (log ölçek),
   `specNearestBoundary`. Test edilir (`birim` [48]).
5. Bölüm değişince spektrogram kapanır (`closeSegmentSpectrogram`), dalga döner.
6. Okuma kutusu temadan bağımsız koyu yüzeydir (`--overlay-ink/surface`).

**DERS:** "Gösteren" bir tuval, "üzerinde çalışılan" bir araç değildir. Analiz
için koordinat→zaman/frekans eşlemesi ve kaplama katmanı şart; aksi hâlde
kullanıcı resme bakar ama hiçbir şey yapamaz.

### Aşama 10y — Yerleşim: metin listeye bitişik (TAMAMLANDI, v2.127)

**KURAL: yazı alanı segment listesine BİTİŞİK; oynat/ok düğmeleri YANINDA.**

**Ölçülen hata (v2.126, 1440 px):** liste→metin **361 px** (teknik kolon
arada); liste→oynat **699 px** (başlık `space-between` ile sağa yaslı).
Ayrıca detay ilk bölümü gösterirken `activeSeg` tanımsızdı; "▶ Dinle" hiçbir
şey yapmıyordu.

**Değişmez kurallar:**

1. `.sd-body` görsel sırası: metin (`.sd-right`) SOLDA, teknik (`.sd-left`)
   SAĞDA. `order` ile; DOM sırası okunabilirlik için metin önce kalır.
2. Spektrogram açıkken (`spec-mode`) sıra ters: teknik üstte, metin altta.
3. `.sd-head` kontrolleri `flex-start` ile SOLDA; sağa yaslamayın.
4. Detayın gösterdiği bölüm = oynatılan bölüm: `activeSegIndex(m)` kullanın;
   tanımsız/aralık dışı `activeSeg` → 0 ve yazılır.
5. Mesafe bir kullanılabilirlik ölçütüdür; yerleşim değişince ölçün.

**DERS:** "Göz gidiş-gelişi" soyut değil, ölçülebilir: liste→metin 361 px idi.
Aynı ekranda iki farklı iş (listeden seç, metne yaz) arasındaki mesafe
azaltılınca kullanıcı hızlanır.

### Aşama 10z — Katmanlı analiz kutusu (TAMAMLANDI, v2.128)

**KURAL: dalga ve spektrogram AYNI kutuda, AYNI zaman ekseninde, SABİT
yükseklikte katmanlanır. Altına ayrı blok açmak yasaktır.**

**Ölçülen hata (v2.127):** v2.126'da spektrogram tam genişlikte **alt bloğa**
açılıyordu; gövde tek sütuna düşüyor, metin aşağı kayıyordu. Ayrıca dalga
(bölüm ±0,5 sn) ve spek (yalnız bölüm aralığı) **farklı zaman pencereleri**
kullanıyordu; çizgiler hizalanmıyordu.

**Değişmez kurallar:**

1. Tek kutu (`sd-canvas-wrap`), sabit **160 px**. Mod değişince yerleşim
   zıplamaz; metin kaymaz.
2. Üç mod: `wave` (160), `spec` (160), `both` (48+112). Varsayılan `both`;
   tercih `localStorage`'da, **kayda yazılmaz**.
3. **Ortak zaman ekseni**: `analysisView(m,index)` tek kaynak. Dalga, spek ve
   kaplama aynı `[a,b]` penceresini kullanır. Zoom/kaydırma `zoomAnalysisAt`
   ile ikisini birlikte günceller; spek yeniden hesaplanır (250 ms debounce).
4. **Katman sırası**: spek (alt) → dalga (üst) → sınır/oynatma/A–B/imleç
   (kaplama, en üst). Çizgiler spektrogramın ÜSTÜNDE.
5. Spek her harekette yeniden çizilmez; imleç/A–B kaplamada.
6. Bölüm değişince mod KORUNUR; spek yeni bölüm için yeniden hesaplanır.

**DERS:** "Aynı veriyi göstermek" ile "aynı kutuda katmanlamak" farklıdır.
Profesyonel araçlar (Praat/Audacity/RX) ortak zaman eksenini ve sabit yüksekliği
korur; görünüm değişince panel zıplamaz. Kullanıcı "altında açılması tasarımı
bozdu" dediğinde sorun estetik değil, **yerleşim sözleşmesi**dir.

### Aşama 10aa — Ses görünümü: tek kaydırma (TAMAMLANDI, v2.129)

**KURAL: kaydırma YALNIZ `.main-area`'da. Ses görünümü, detay paneli, kart,
çalışma alanı ve liste İÇERİĞİ KADAR UZAR; hiçbiri kendi içinde kaymaz.**

**Ölçülen hata (v2.128, 36 bölüm, 1440×900):** `html/body` ve `.main-area`
`overflow: hidden`; `#audioDetail` `overflow: visible`; `.seg-workspace` 285 px
ama `.seg-list` 612 px → liste kabı taşıyor. `kbd-fold` (y817) ve `.sd-actions`
(y1038) listenin ÜSTÜNE biniyor; son erişilebilen öğe 28–29 (ws kapalı),
32–33 (ws açık). Alt içerik ne sayfa ne panel tarafından kaydırılabiliyordu.

**Değişmez kurallar:**

1. Tek kaydırma: `.main-area { overflow-y: auto }`. İç içe kaydırma yok.
2. `#view-audio`, `.detail-panel`, `#audioDetail`, `.audio-card`,
   `.seg-workspace`, `.seg-list`: `height:auto`, `max-height:none`,
   `overflow:visible`. Liste "kendi içinde kayar" kuralı **kaldırıldı**;
   kaydırma ana alanda.
3. Çalışma modunda `.workspace-bar` yapışkan (`position: sticky; top: 0`).
4. v2.128 katmanlı analiz kutusu (sabit 160 px) korunur.
5. Bir kapta `overflow: hidden` varsa çocuğun taşması **sessiz kesme**dir;
   ölçüt `scrollHeight > clientHeight` + son öğenin `getBoundingClientRect()`.

**DERS:** Sabit `100vh` kabuk + `overflow:hidden` + iç `max-height` birleşince
alt içerik **sessizce** kaybolur. "Sayfa kaymıyor" belirtisi, iç kaydırma
kaplarının yanlış hesaplandığını gösterir; tek kaydırma en dayanıklı çözümdür.

### Aşama 10ab — Bölüm rozeti görünürlüğü (TAMAMLANDI, v2.130)

**KURAL: listede durum rozeti HER ZAMAN görünür; rozet kutusu sabit genişliğe
kilitlenmez, sığmayan rozet SARAR.**

**Ölçülen hata (v2.129, 60 bölüm):** `#view-audio .seg-badges` kuralı
`max-width:96px; overflow:hidden` idi. Rozet sırası konuşmacı → öneri → öncelik
→ **durum** olduğu için, kap dolunca **en önemli bilgi ilk kesilen** oldu:
rozet sağ kenarları 591 ve 656, kap sağ kenarı 582 → "Bekliyor / Onaylandı /
Çözümlendi" **hiç görünmüyordu**; satırda yalnız "Öncelik: Düşü…" vardı.
Bilirkişi listede onay durumunu göremiyordu (ekran görüntüsüyle doğrulandı).

**Düzeltme:**
1. `segItemHtml` → durum rozeti **ilk sırada** (`${state}${propBadge}${spk}${prio}`).
   Kırpılacaksa en önemsiz kırpılsın.
2. `reading-layer.css` → `#view-audio .seg-badges { max-width:none;
   overflow:visible; flex-wrap:wrap; justify-content:flex-end }`.
3. `@media (max-width:1200px)` → rozetler `grid-column:3` ile metnin **altına**
   iner; metin sütunu ezilmez.

**Ölçüm (v2.130, gerçek Chromium):** 1440 → satır 37 px, metin 181, rozet 170;
1280 → 37/120/170; 1200 → 59/267/267 (alt satır); 900 → 59/181/181.
Durum rozeti **her genişlikte görünür**, kesilen rozet **0**.

**DERS:** `max-width` + `overflow:hidden` bir rozet şeridinde "sessiz kesme"dir.
Sıra da önemlidir: en önemli bilgi **sona** yazılırsa ilk kesilen o olur.
Kırpma kararı verilecekse sıralama bilinçli seçilmeli; tercih **sarmaktır**.

**Koruyan test:** `tasarim-testi` [2j] (5 kontrol) — düzeltme yokken KALDI.

### Aşama 10ac — Görünüm kutusu içerikle büyür (TAMAMLANDI, v2.131)

**KURAL: görünüm kutusu yükseklik DAYATMAZ (`flex: 0 0 auto`). Yapışkan çubuk
kutusunun bittiği yerde bırakır; durum çubuğu da kutunun bittiği yerde içeriğin
üstüne biner.**

**Ölçülen hata (v2.130, 60 bölüm, 1440×900):** `#view-audio` kutusu **635 px**,
içerik **2582 px**, `flex: 1 1 auto`. Sonuçlar:
1. Çalışma modundaki üst bar (önceki/sonraki kayıt) **635 px sonra** bırakıyordu
   (scroll 700'de `top: −42`); v2.129'un "yapışkan" vaadi ilk ekranla sınırlıydı.
2. Durum çubuğu 713–739'da **içeriğin üstüne** biniyordu; 2 bölüm satırını
   örtüyor, `elementFromPoint` `.sb-item` döndürüyordu → tıklama yutuluyordu.

**Düzeltme:** `#view-audio.active { flex: 0 0 auto }`. Kaydırma `.main-area`'da
kalır (v2.129). Kutu 2592 = içerik; çubuk 600–2400 arası `top: 0`; durum çubuğu
2670'te (listenin altında), örtülen satır **0**.

**DERS:** `flex: 1 1 auto` + `min-height: 0` verilen bir kutu, içeriği taşıyorsa
`position: sticky` çocuklarını **kutunun yüksekliğiyle** sınırlar. "Tek kaydırma"
çözümü, kaydırılan kabı büyütmeyi de kapsamalı; yoksa çubuk yarı yolda bırakır ve
alt çubuk içeriğin üstüne biner. Ölçüt: `scrollTop` artarken çubuğun `top` değeri
**0 kalıyor mu**, durum çubuğunun örtüğü satır **kaç**.

**Koruyan test:** `tasarim-testi` [2k] — düzeltme yokken KALDI.

### Aşama 10ad — Kurtarma kopyasında sessiz düşme kapatıldı (TAMAMLANDI, v2.132)

**KURAL: aynı işi yapan iki yükleme yolu AYNI sözleşmeyi kullanır. Bozuk dosya
hiçbir yolda sessizce atlanmaz.**

**Ölçülen ayrışma (v2.131):**
| Yol | Bozuk dosya |
|---|---|
| Ana yükleme (`loadState`) | `failed` + `reportLoadFailures` (v2.84) |
| Kurtarma kopyası (depo boşken) | **`catch (e) {}`** |

Kurtarma kopyasında 3 dosya varken biri okunamazsa ekran "2 dosya geri
yüklendi" diyor, üçüncünün kaybolduğunu söylemiyordu.

**Düzeltme:** `normalizeRescueCases(rawCases)` → `{ cases, failed }`; kurtarma
dalı `failed.length` ise `reportLoadFailures(failed, { cases: rescue.cases })`
çağırır. Kopya **silinmez** (elle kurtarma mümkün). `raw.id` okuması da
fırlatabilir → güvenli okunur, bildirim yine yapılır.

**DÜRÜST SINIR:** Geçerli JSON ile yeniden üretilemez; `normalizeCase`
savunmacıdır. Test, fırlatan kayıt (Proxy) ile sözleşmeyi sınar. Tarayıcıda
normal akış doğrulandı: boş depo + 2 dosyalık kopya → soru → geri yükleme →
"2 dosya kurtarma kopyasından geri yüklendi" → kopya korundu, JS hatası 0.

**DERS:** Aynı veriyi okuyan iki yol varsa hata davranışları da aynı olmalı.
Bir yol `failed` listesi tutarken diğerinin boş `catch` kullanması, "sessiz veri
kaybı" sınıfının tipik kaynağıdır. Yeni bir yükleme/aktarma yolu eklerken
`reportLoadFailures` sözleşmesine bağlanın.

**Koruyan test:** `birim-testleri` [51] (10 kontrol) — düzeltme yokken KALDI.

### Aşama 10ae — Durum çubuğu kesmez (TAMAMLANDI, v2.133)

**KURAL: durum çubuğu öğesi `text-overflow: ellipsis` ile KESİLMEZ; sığmayan
öğe alt satıra iner, çubuk yüksekliği içerikle büyür.**

**Ölçülen hata (v2.132, 60 bölüm):** `.sb-item{white-space:nowrap;
overflow:hidden;text-overflow:ellipsis}`. 1440 px'te 6 öğe sığıyor; **1100 px'te
6'sı da** kırpılıyordu (sbCase 241/273, sbCheckWrap 248/280, model 90/102…).
900 px'te ayrıca çalışma çubuğu başlığı (`#wsTitle`) kırpılıyordu ve **tam ad
hiçbir yerde yoktu** (ipucu yok).

**Düzeltme:**
1. ≤1200 px: `.statusbar { height:auto; min-height:var(--status-h);
   flex-wrap:wrap; row-gap:2px }`.
2. `.statusbar .sb-item { white-space:normal; overflow:visible;
   text-overflow:clip }` — kesme yok, sarma var.
3. `#wsTitle.title` = tam ad (dosya adı tanımlayıcıdır; kart başlığında da tam
   görünür). Başlık tek satır kalır, çubuk yapışkan olduğu için büyümez.

**Ölçüm (v2.133, gerçek Chromium):** 1440 → 26 px / kesilen 0; 1100–600 →
34 px / kesilen 0; örtülen satır 0; yatay taşma yok.

**DERS:** "Kesme" ölçütü `scrollWidth > clientWidth` + `overflow` görünür
değilse kesme vardır. Bir bilgi çubuğunda ellipsis "tasarım" değil sessiz bilgi
kaybıdır; çubuk sarabilir çünkü içerik akışında ve sayfayı uzatmak zararsız.

**Koruyan test:** `tasarim-testi` [2l] (4 kontrol) — düzeltme yokken KALDI.

### Aşama 10af — Boş çalışma alanı kayda yazılmaz (TAMAMLANDI, v2.134)

**KURAL: yazacak kullanıcı verisi yoksa kayıt YAZILMAZ, varsa SİLİNİR.**
Yalnız "yazmayı atlamak" yetmez: eski kayıt diskte kalırsa silinen dosyalar
yeniden yüklenir.

**Ölçülen hata (v2.133, temiz profil):** `casesForStorage` boş dosyayı eliyordu
ama `persistNow` yine de `{cases: []}` yazıyordu → IndexedDB'de **1 kayıt**.
Ayrıca tüm dosyalar silinince boş kayıt yazmak eski kaydı diskte bırakıyordu
(veri geri gelmesi riski).

**Düzeltme:**
1. `persistPayloadFor(state)` — kullanıcı verisi yoksa `null`.
2. `persistNow`: `null` ise `delete(STORE_KEY)`.
3. `flushPersist`: boşsa `localStorage.removeItem('akis.lastSnapshot')`.

**Ölçüm (v2.134, gerçek Chromium):** ilk açılış **0 kayıt** (önce 1), seçici
"— Yeni dosya —"; `2026/999` yazılınca 1 kayıt; yenilemede korunur; anlık kopya
boş açılışta `null`.

**DERS:** "Boş veriyi filtrele" ile "boş veriyi yazma" aynı şey değildir.
Filtre yalnız gövdeyi boşaltır; yazma yine olur. Ayrıca silme senaryosunda
"yazmayı atla" yanlış çözümdür: kayıt silinmeli, yoksa veri dirilir.

**Koruyan test:** `birim-testleri` [52] (8 kontrol) — düzeltme yokken KALDI.

### Aşama 10ag — Kritik uyarılar ekran okuyucuya duyurulur (TAMAMLANDI, v2.135)

**KURAL: veri kaybı riski taşıyan uyarı `role=alert` (assertive); normal bilgi
`role=status` (polite). Görsel uyarı yeterli değildir.**

**Ölçülen hata (v2.134):** sayfada **aria-live bölgesi 0**. `#toast` ve
"KAYDEDİLMİYOR" şeridi rol taşımıyordu; ekran okuyucu kullanan bilirkişi veri
kaybı riskini duymuyordu.

**Düzeltme:**
1. `showToast(msg, urgent)` → `role=status|alert`, `aria-live=polite|assertive`,
   `aria-atomic=true`.
2. `showLoadFailure` ve `reportLoadFailures` `urgent=true`.
3. Kayıt hatası + depolama şeritleri `role=alert/assertive` (her çağrıda).
4. `#toast`, `#versionNotice` HTML'de de canlı bölge.

**Ölçüm (v2.135, CDP erişilebilirlik ağacı):** `#toast` → role `status`,
`live=polite`, `atomic=true`; `#versionNotice` aynı. JS hatası 0.

**DERS:** "Uyarı görünür" demek "uyarı duyulur" demek değildir. Ekran okuyucu
için `aria-live` şart; kritik uyarıda `assertive`, gürültü yapmamak için
normalde `polite`. Sahte DOM'a `setAttribute/getAttribute` eklendi; aksi hâlde
erişilebilirlik nitelikleri test edilemiyordu.

**Koruyan test:** `birim-testleri` [53] (14) + `tasarim-testi` [6] (2).

### Aşama 10ah — Sekme simgesi (TAMAMLANDI, v2.136)

**KURAL: kök `favicon.ico` bulunur; `index.html` SVG simgeyi bağlar.**

Tarayıcı her açılışta `/favicon.ico` istiyor, **404** dönüyordu; sekmede boş
simge görünüyordu. `assets/favicon.svg` (lacivert zemin + altın "A") ve kök
`favicon.ico` (32×32) eklendi; `index.html` iki bağlantı taşır.

**Ölçüm (v2.136, gerçek Chromium):** `favicon.svg` 200, `favicon.ico` 200,
sunucu günlüğünde 404: **0**.

**Koruyan test:** `tasarim-testi` [4b] (3 kontrol) — düzeltme yokken KALDI.

### Aşama 10ai — Rapor kâğıdı dar ekranda kırpılmıyor (TAMAMLANDI, v2.137)

**KURAL: dar ekranda rapor kâğıdı KESİLMEZ; iç boşluk azalır, tablo hücreleri
SARAR.**

**Ölçülen hata (v2.136, 40 bölüm):** `#view-report { overflow-x: hidden }`.
Kâğıdın en küçük genişliği tablo içeriğinden 678 px; görünüm 760 px'te 642 px,
600 px'te 538 px → **26 / 40 px sağdan sessiz kesme**, kaydırma yok.

**Düzeltme:** `@media (max-width: 900px)` → `#view-report .report-paper
{padding:26px 16px}` + `.paper-table th/td { overflow-wrap: anywhere }`.
Yalnız ekran; `@media print` ve UDF/DOCX değişmez.

**Ölçüm (v2.137):** 1440 1310/1310 · 900 782/782 · 760 642/642 · 600 538/538 →
kesilen 0.

**DERS:** Tablo tabanlı bir belge düzeninde `min-content` genişliği kapsayıcıdan
büyük olabilir. `overflow:hidden` bunu **sessiz kesme**ye çevirir. Ölçüt:
`scrollWidth > clientWidth` + `overflow-x` görünür değilse kesme vardır; çözüm
ya sar (`overflow-wrap`) ya da görünür kaydırma.

**Koruyan test:** `tasarim-testi` [2m] (2 kontrol) — düzeltme yokken KALDI.

### Aşama 10aj — CSS borcu: ölçüm ve nöbetçi (TAMAMLANDI, v2.138)

**KURAL: CSS borcu ÖLÇÜLÜR ve ARTIRILAMAZ; kanıtsız temizlik yapılmaz.**

**Ölçüm (v2.138):** app.css 980 kural · reading-layer 691 kural ·
`!important` 26+63 · `.main-area` 14 tanım · ölü bildirim 97 (layer içi) +
494 (app.css → layer). Ayrıntı: `docs/CSS_BORCU.md`.

**Otomatik temizlik DENENDİ, YAYINLANMADI:** aynı seçici+özellik için sonraki
tanım kazanıyorsa öncekini silmek ve "son değer haritası değişmedi" kanıtını
göstermek planlandı. Kendi ayrıştırıcımız kaldırma sonrası yapıyı bozdu
(harita 4.284 → 26.494). Dış paket (PostCSS) yasak. Kanıtsız 500 bildirim
silinmedi; bu tam olarak deponun "bir düzeltme başka paneli bozar" sınıfıdır.

**Nöbetçi:** `tasarim-testi` [8] eşikleri (26/63/97/494/14) aşan değişiklikte
KALIR. Kanıt: tek `!important` eklendi → KALDI (64 > 63); geri alındı → geçti.

**DERS:** "Silinebilir görünüyor" ≠ "silinemez olduğu kanıtlandı". Minify CSS'te
konum tabanlı otomatik düzenleme, kanıt üretmiyorsa yapılmaz. Borç önce
ölçülür, nöbetçiyle sabitlenir; temizlik küçük ve kanıtlı adımlarla yapılır.

### Aşama 10ak — Uzun listede detay yapışkan (TAMAMLANDI, v2.139)

**KURAL: bölüm listesi uzunken düzenleme paneli YAPIŞKAN ve ekranla sınırlı
olmalı; kullanıcı aşağıdayken tıkladığı bölümün metnini hemen görmeli.**

**Ölçülen hata (v2.138, 362 bölüm, 1440×900):** listede %45'e kaydırıp 181.
bölüme tıklayınca detay "Bölüm 181 / 362" olarak güncelleniyor ama blok
**−5.899 px**'te kalıyordu; editör görünmüyordu. İki modda da aynı.

**Düzeltme:**
1. `#view-audio .seg-detail { position: sticky; top: 8px; max-height:
   calc(100vh - 24px); overflow-y: auto }`; ws-mode'da `top: 53px`.
2. Yapışkanlığı **beş ata kutusu** engelliyordu (segments-root,
   transcript-editor, card-pane, audio-content-zone, audio-card →
   `overflow:hidden`). Yalnız **deşifre sekmesi** kapsamında `overflow:visible`;
   diğer sekmelerin kaydırması korunur. `!important` gerekmedi (aynı/ daha
   yüksek özgüllük).
3. Kısa listede davranış değişmez; panel ekrandan uzunsa kendi içinde kayar
   (v2.121 kararı yalnız bu durum için güncellendi; test [2e] yenilendi).

**Ölçüm (v2.139):** %45/%75 → detay 53–588, editör görünür; mod kapalı → 8–543;
çubukla çakışma yok; yatay taşma yok; JS hatası 0.

**BİLİNEN SINIR:** ≤900 px tek sütun → detay listenin ALTINDA; yapışkanlık
devreye girmez. Dar ekran için ayrı düzen gerekir (açık konu).

**DERS:** `position: sticky`, arada `overflow:hidden` olan bir ata varsa
ÇALIŞMAZ (o ata kaydırma kabı sayılır). Önce ata zinciri ölçülür
(`getComputedStyle` ile overflow), sonra yapışkanlık denenir. Ayrıca yeni kural
mevcut `!important` sayacını **yorum içindeki kelimeyle** şişirdi: sayaç artık
yorumları çıkarır.

**Koruyan test:** `tasarim-testi` [2n] (4) + [2e] (güncellendi).

### Aşama 10al — Masaüstü kabuğu (TAMAMLANDI, v2.140)

**KURAL (≥901 px): kabuk SABİT; kayıt sütunu, bölüm listesi ve düzenleme paneli
KENDİ İÇİNDE kayar. Sayfa uzamaz. ≤900 px eski tek-kaydırma yedeğidir.**

**Neden:** v2.129'un "tek uzun sayfa" kararı 362 bölümde çalışmıyordu
(14.156 px; panel ekran dışında). Kullanıcı: "aşağı doğru uzayıp gitmesi çok
garip; masaüstü uygulaması havasında olmalı."

**Uygulama (reading-layer, `@media (min-width: 901px)`):** üç bölmeli ızgara
(220 px kayıtlar · 320 px liste · kalan düzenleme), kayıt başlığı kompakt
(oynatıcı KORUNUR, kayıt dalgası gizlenir), satırlar iki satır (metin + rozet),
detayda metin üstte / teknik panel altta.

**Ölçüm (v2.140, 362 bölüm, 1440×900):** belge/ana alan **900/900** (sayfa
kaymıyor) · üst bar 0–60 · durum çubuğu 876–900 · liste 528 px kendi kaydırması
(21.473 px) · panel 248–778 hep görünür · 181. bölüm tıklanınca panelde
"Bölüm 181 / 362" · yatay taşma yok · JS hatası 0.

**DÖRT SESSİZ TUZAK (ölçülerek bulundu):**
1. `#view-audio.active{flex:0 0 auto}` (v2.131) — görünüm büyümez; id
   özgüllüğü nedeniyle masaüstü bloğunda `flex:1 1 auto` AÇIKÇA yazılmalı.
2. `#view-audio #audioDetail{flex:0 0 auto !important}` ve
   `.audio-card{flex:0 0 auto}` (v2.129) — `!important` ile ezilmeden yükseklik
   zinciri kurulmaz.
3. `.seg-workspace{align-items:start}` (v2.129) + `.seg-detail{align-self:start}`
   (v2.139) — paneller satırı DOLDURMAZ; içerik kadar uzayıp `overflow:hidden`
   ile KIRPILIR (v2.129 hatasının aynısı). `stretch` şart.
4. `height:auto !important` (app.css, seg-workspace) tek başına suçlu değil;
   asıl sorun üstteki üç maddeydi.

**DERS:** Bir yerleşim kararını geri alırken ATA ZİNCİRİNİN tamamını ölç
(display/flex/min-height/align-self/overflow). Tek bir `align-self:start`
bütün kabuğu sessizce bozar ve belirti "liste kırpılıyor" olur — yani eski hata
geri gelmiş gibi görünür.

**Koruyan test:** `tasarim-testi` [2o] (6). [2i]/[2e]/[2n] dar ekran yedeği
için geçerli. CSS borcu eşikleri: 26/68/98/507/15.

### Aşama 10am — Masaüstünde çalışma modu kaldırıldı (TAMAMLANDI, v2.141)

**KURAL: ≥901 px'te çalışma modu YOKTUR.** Kayıtlar sürekli solda; "← Kayıt
listesine dön" ve "⛶ Çalışma modu" gereksizdir. ≤900 px'te mod korunur.

**Neden:** v2.140 kabuğu kayıt sütununu kalıcı yaptı; çalışma modu ise aynı
sütunu gizleyip geri dönme düğmesi gösteriyordu (çelişki). Kullanıcı:
"o buton gereksiz olmuş, kaldıralım."

**Düzeltme:**
1. `switchView('audio')` otomatik girişi yalnız `window.innerWidth <= 900`.
2. `setWorkspace(on)` koruması: ≥901'de `on` isteği yok sayılır + kısa bilgi
   (W/L kısayolu sessiz kalmasın).
3. Masaüstü bloğunda `.workspace-bar` ve `#workspaceBtn` gizli;
   `body.ws-mode` açık kalsa bile kayıt sütunu görünür
   (`display:block !important` — app.css'te `display:none!important` var).

**Ölçüm (v2.141, 362 bölüm):** 1440 → ws-mode kapalı, çubuk/düğme gizli, kayıt
sütunu 148–719, liste 385 px kendi kaydırması; 900 → mod açık, çubuk 110–168,
kayıt sütunu gizli. JS hatası 0.

**DERS:** Kalıcı bir panel eklediğinde, o paneli gizleyen eski "mod"u aynı
sürümde emekliye ayır. Aksi hâlde iki tasarım kararı çelişir ve kullanıcı
"gereksiz düğme" görür.

**Koruyan test:** `tasarim-testi` [2p] (4).

### Aşama 10an — Çalışma modu kaldırıldı; kayıt listesi dikey (TAMAMLANDI, v2.142)

**KURAL: tek mod vardır.** Kayıt listesi her zaman solda, **dikey** ve tek
kaydırma (kayıt sütunu). "Çalışma modu", "← Kayıt listesine dön", `ws-mode`
YOKTUR.

**Kullanıcı devtools'ta üç şey buldu:** (1) gizli `workspaceBar` ("önceki/
sonraki"), (2) gizlenmiş kayıt başlığı ("9 kayıt"), (3) dosyalar **yanyana**.

**Ölçüm (v2.141):** `#audioList` `display:flex` (yatay çip şeridi), `max-height:
190px` → liste kendi içinde ayrıca kayıyordu; `#workspaceBar` DOM'da duruyordu.

**Düzeltme:**
1. Mod tamamen kaldırıldı: HTML (`#workspaceBar`, `#workspaceBtn`), JS
   (`setWorkspace`, `updateWorkspaceBar`, `workspaceDeclined`, W/L, otomatik
   giriş, Esc dalı), CSS (`body.ws-mode ...`).
2. `#view-audio > .panel:not(.detail-panel) .audio-list { display:grid;
   max-height:none; overflow:visible }` → dikey, sütunla birlikte kayar.
3. Başlık görünür: "Ses kayıtları" + "N kayıt".
4. **DİKKAT:** `max-height:190px` kuralı `#view-audio>.panel:not(.detail-panel)
   .audio-list` (1,3,0) idi; `#view-audio .audio-list` (1,1,0) YETMEDİ. Aynı
   özgüllükte seçici gerekti.

**Ölçüm (v2.142):** 100 kayıt → liste 5.711 px dikey, sütun 569/5.762 **tek
kaydırma**; 9 kayıt → 516 px, kaydırma yok; `#workspaceBar`/`#workspaceBtn`
DOM'da yok; JS hatası 0. CSS borcu: !important 70→59, ölü 98→96, app→layer
507→496.

**DERS:** Bir "mod"u kaldırırken yalnız görünürlüğü değil, o moda bağlı
dinleyicileri, kısayolları ve çağrıları da kaldır. `updateWorkspaceBar()` çağrısı
kaldırılan fonksiyona bağlı kaldığında malzeme seçimi **ReferenceError** üretirdi
(`node --check` yakalamaz; grep ile bulundu).

**Koruyan test:** `tasarim-testi` [2p] (4) + [2q] (2).

### Aşama 10ao — Detay panelinin alt kısmı kırpılmıyor (TAMAMLANDI, v2.143)

**KURAL (≥901 px): bölüm detay paneli KENDİ İÇİNDE kayar; alt içerik
(`sd-meta`, gözlem düğmeleri) kırpılmaz.**

**Ölçülen hata (v2.142, 1440×900):** panel 385 px, içerik 795 px,
`overflow-y: visible`. `sd-meta` 818–919 ve `sd-obs` 927–950 → panel 635'te
bittiği için **görünmüyordu**. Kök neden: v2.129'un
`#view-audio .seg-detail { overflow: visible !important }` kuralı masaüstü
kaydırmasını eziyor; taşan içerik `.seg-workspace`in `overflow:hidden`ı ile
kırpılıyordu.

**Düzeltme:** masaüstünde `.seg-detail { overflow-y: auto !important;
max-height: none }`. Ölçüm: sona kaydırınca `sd-meta` 408–509, `sd-obs`
517–540 görünür; JS hatası 0.

**DERS:** `overflow: visible !important` bir panelde "kaydırma yok" demek
değildir; ata `overflow:hidden` ile birleşince **sessiz kırpma** olur. Panelin
kaydırıp kaydırmadığını `overflow-y` + `clientHeight/scrollHeight` ile ölç.

**Koruyan test:** `tasarim-testi` [2r] (2).

### Aşama 10ap — Zaman bütünlüğü denetimi (TAMAMLANDI, v2.144)

**KURAL: bölüm aralıkları sıralı ve örtüşmesiz olmalı; çakışma GÖRÜNÜR olur,
uygulama kendiliğinden DÜZELTMEZ.**

**Kullanıcı:** "82 bölüm var; yanlışlıkla aynı zamanı mı böldük, aralıklar
birbirine giriyor mu, listeden göremiyoruz."

**Eklenen:** `segmentTimeIssues(segments)` (saf) + `segmentTimeIssueIndexes`.
Bildirir: `overlap`, `duplicate`, `zero`, `inverted`, `invalid`. Liste satırında
⚠ rozeti (ipucunda "önceki bölümle çakışıyor (bölüm 11)"), araç çubuğunda
"Zaman sorunları N" filtresi (0 ise gizli). Çakışmanın İKİ tarafı da işaretlenir.

**Ölçüm (v2.144, 82 bölüm):** 1 çakışma + 1 yinelenen + 1 sıfır → çip 5;
⚠ 5 satır (11, 12, 21, 22, 31); filtre 5 satır; JS hatası 0.

**DERS:** Kullanıcı "veride sorun var mı" diye sorduğunda önce ÖLÇÜM ARACI ver.
Zaman çakışması, takip vurgusunun komşu bölüme atlaması gibi belirtilerin ortak
kökü olabilir; hangi bölümün sorunlu olduğunu göstermek, tahmin yürütmekten
daha değerlidir. Zamanı otomatik düzeltmek adli kayıtta kabul edilemez.

**Koruyan test:** `birim-testleri` [54] (8).

### Aşama 10aq — Takip vurgusu çakışmada geri atlamıyor (TAMAMLANDI, v2.145)

**KURAL: `followTick` bölüm seçimi SAF fonksiyonla yapılır; t hâlâ AKTİF
bölümün aralığındaysa aktif kalır.**

**Ölçülen kök neden:** `followTick` "t'yi içeren İLK bölümü" seçiyordu.
Aralıklar çakışırsa (0–5 ve 3–8), oynatma sonraki bölüme geçince zaman 5→3'e
geri atlıyor; tarama yine ilk bölümü buluyor ve vurgu ÖNCEKİ bölüme dönüyordu
(kullanıcı: "bir önceki segment bir sonrakiyle karışıyor").

**Düzeltme:** `segmentIndexAtTime(segments, t, preferIdx)`:
1) t aktif bölümün aralığında → aktif; 2) t'yi içeren ilk bölüm; 3) t'den sonra
başlayan ilk bölüm; 4) yoksa −1. `followTick` bunu kullanır.

**Ölçüm (birim [55]):** temiz veri t=4 → 2; boşluk t=3 → sonraki; çakışma t=4
tercihsiz → 0 (eski); çakışma t=4 aktif=1 → **1**; aktif dışına çıkış → normal;
kayıt sonu → −1.

**DÜRÜST SINIR:** Gerçek sesle uçtan uca takip denemesi bu ortamda yapılamadı
(sentetik kayıtta ses yok). Kullanıcı verisinde "Zaman sorunları" boşsa bu
düzeltme devreye girmez; karışma başka kaynakta aranmalı.

**DERS:** "Vurgu sürekli değişiyor" belirtisinin kökü zaman çakışması olabilir.
Önce veriyi denetle (v2.144), sonra seçim mantığını düzelt; ikisini birlikte
sun. Zaman seçimini saf fonksiyona ayırmak, ses olmadan da test edilebilir kılar.

**Koruyan test:** `birim-testleri` [55] (8).

### Aşama 10ar — Zaman sorunu düzenlerken anında görünür (TAMAMLANDI, v2.146)

**KURAL: bir bölümün zamanı düzenlendiğinde ⚠ rozeti ve "Zaman sorunları"
filtresi ANINDA güncellenir; sayfa yenilemek gerekmez.**

**Ölçülen hata (v2.145):** 1. bölümün bitişi 00:00:04.000 yapıldı (2. bölümle
çakışır) → çip yok, ⚠ yok; **sayfa yenilenince** "Zaman sorunları 2" ve 2 ⚠.
Kök neden: `updateSegListItem` satırı yeniden çiziyor ama ⚠ parametresini
geçmiyordu; çip yalnız tam çizimde oluşuyordu.

**Düzeltme:** `segmentTimeIssueAt` (iki taraf), komşu satır tazeleme,
`segFilterChipsHtml` (tek kaynak) + `refreshSegChips` içinde çip ekle/kaldır.

**Ölçüm (v2.146):** aynı düzenleme, yenilemeden → çip 2, ⚠ 2 satır, JS hatası 0.

**DERS:** Liste satırını "yerinde" güncelleyen her fonksiyon, satırın TÜM
girdilerini (metin, durum, öneri, özet, zaman sorunu) yeniden hesaplamalı.
Yeni bir rozet/rozet kuralı eklerken `segItemHtml` çağrılarının HEPSİNİ gözden
geçir: biri (burada `updateSegListItem`) parametreyi geçmezse rozet yalnız tam
çizimde görünür ve "yenileyince düzeldi" belirtisi doğar.

**Koruyan test:** `birim-testleri` [56] (5).

### Aşama 10as — Takip şeridi eski bölüme dönmüyor (TAMAMLANDI, v2.147)

**KURAL: şerit hangi bölümü göstereceğini AKTİF bölümden alır; oynatıcının
"çalmaya başladığı" indeks şeridi geriye çekemez.**

**Ölçülen hata (v2.146, GERÇEK SES `sample_data/audio/ses_01…wav`, 16 bölüm,
F+G açık, 50 ms aralık):** aktif bölüm 2 iken şerit anahtarı 1,3 sn içinde
**5 kez** `0|0|Bölüm 1:`e döndü. Kök neden: `ensureSegStopListener`'ın
`timeupdate`i `renderKaraoke(mm, st.index)` çağırıyordu; `st.index` çalmanın
BAŞLADIĞI indekstir.

**Düzeltme:** `followStripIndex(m, idx, autoAdvance)` (saf) + `markTextFollow`
sabitlemesi; `timeupdate` artık `activeSegIndex(mm)` kullanır (şerit + spek
kaplaması).

**Ölçüm (v2.147, aynı ses):** eski bölüme dönüş **0**; anahtar her örnekte
`1|…`; JS hatası 0.

**DERS:** `timeupdate` gibi sık çalışan dinleyiciler kapanış anındaki indeksi
taşımamalı; indeks HER çağrıda aktif durumdan okunmalı. Ayrıca sentetik veriyle
"ses yok" diyip geçmemek gerekir: `sample_data/audio` WAV'ı IndexedDB'ye
konarak takip uçtan uca **gerçek sesle** ölçülebildi (ASR gerekmedi).

**Koruyan test:** `birim-testleri` [57] (4).

### Aşama 10at — Oynatma başlarken sayfa zıplamıyor (TAMAMLANDI, v2.148)

**KURAL: bir panelin içeriği OYNATMA anında büyüyüp küçülmez. Yer tutucu
kullan; başlık etiketi tek kaynaktan gelir.**

**Ölçülen iki hata (v2.147, gerçek ses):**
1. Takip şeridi ancak oynatma başlayınca DOM'a ekleniyordu → metin alanı
   305 → 369 px (**+64**) aşağı itiliyordu.
2. `syncSegDetailInPlace` `.sd-idx`in textContent'ini yazıyor, **içindeki
   ` / N` span'ını siliyordu** → oynatma anında başlık "Bölüm 1 / 16"den
   "Bölüm 1"e düşüyordu.

**Düzeltme:**
1. `segHeadParts(i, total)` — etiket ve toplam TEK KAYNAK; `.sd-idx` ve
   `.sd-of` **kardeş** span'lar (biri diğerini silemez).
2. `ensureFollowStrip(m, idx)` — canlı vurgu açıkken şerit **yer tutucu**
   olarak önceden kurulur; oynatma yalnız metni değiştirir. Metin yoksa şerit
   silinmez, yer tutucuya döner.

**Ölçüm (v2.148):** oynatma öncesi/sonrası metin alanı **369 px (aynı)**;
başlık iki durumda da "Bölüm 1 / 16"; JS hatası 0.

**TASARIM NOTU:** Şeridi başlığa taşımak zıplamayı çözmez (iki satır başlığı
büyütür). Doğru çözüm **yer tutucu**; maliyeti canlı vurgu açıkken 48 px sabit
alan, karşılığı sıfır yerleşim kayması.

**DERS:** `textContent =` ile içinde span olan bir öğeyi güncellemek çocukları
siler. Etiket + toplam gibi iki parça ayrı span ise İKİSİ de ayrı yazılmalı ya
da tek saf fonksiyondan üretilmeli. Ayrıca "oynatınca beliren" her kutu, kutu
zaten yoksa yerleşimi kaydırır; kutu önceden kurulmalı.

**Koruyan test:** `birim-testleri` [58] (4) + `tasarim-testi` [2s] (3).

### Aşama 10au — Kapsama denetimi (TAMAMLANDI, v2.149)

**KURAL: "sesin bölümlenmemiş aralığı var mı" sorusu GÖRÜNÜR olur; boşluk
"konuşma yok" demek değildir ve zaman OTOMATİK DÜZELTİLMEZ.**

Kullanıcı: *"bölerken/çözümlerken parça kaçabiliyor mu, sesin hiç bölüme
girmemiş aralığı var mı, listeden göremiyoruz."*

**Saf fonksiyon:** `segmentCoverage(segments, duration)` →
`{ ok, totalSec, coveredSec, pct, gaps, outside, zero }`.
- `coveredSec` **birleşim** uzunluğu; çakışan bölüm iki kez sayılmaz.
- Bitişik bölüm boşluk sayılmaz (`COVERAGE_TOL = 0.001`).
- Aralıklar `[0, duration]` içine kırpılır; `outside` (kayıt sonunu aşan) ve
  `zero` (sıfır/ters süre) ayrıca bildirilir.
- Süre bilinmiyorsa `ok:false`, `pct:null` — **uydurma yüzde yok**.
- `coveragePctText()` TEK KAYNAK: `"Kapsam %100"`, `"Kapsam %98 · 2 boşluk"`,
  `"Kapsam hesaplanamadı"`. Boşluk varken yüzde **99 tavanı** (asla %100).

**Arayüz:** araç çubuğunda `[data-coverage]` düğmesi; panel
`#coverage-panel-<id>`; her boşlukta `[data-cov-goto]` = "Git" → `seekPlayerTo`
(oynatmayı kendiliğinden başlatmaz). `refreshCoverage()` `refreshSegChips`
içinden çağrılır → süre düzenlemesi **yenilemeden** yüzdeyi/listeyi tazeler.

**Ölçüm (v2.149, gerçek Chromium):** 4 bölüm (0–3, 3–6, 8–10, 14–16) / 16 sn →
düğme "Kapsam %62 · 2 boşluk"; panel 06–08 ve 10–14; "Git" → `currentTime=6`;
2. bölümün bitişi 08.000 yapılınca **"Kapsam %75 · 1 boşluk"** (yenilemeden);
JS hatası 0. 1440/1280/1100/900/760 px: düğme **kırpılmıyor**, yatay taşma yok.

**Koruyan test:** `birim-testleri` [59] (28 kontrol).

**DERS:** Kullanıcı "veride sorun var mı" diye sorduğunda önce **ölçüm aracı**
ver. Otomatik düzeltme adli kayıtta kabul edilemez; araç yalnız "nerede"
sorusunu cevaplar, kararı bilirkişiye bırakır. Ayrıca yüzde gösteren her yerde
"boşluk varken %100 yazma" kuralı korunmalı — yanlış tamamlanmışlık izlenimi
sessiz hatadır.


### Aşama 10av — Rapor hazırlık denetimi (TAMAMLANDI, v2.150)

**KURAL: rapor öncesi eksikler SAYIYLA görünür; uydurma "hazırlık yüzdesi"
YOKTUR. Kart bir DENETİM LİSTESİDİR, onay değildir.**

**Saf fonksiyon:** `reportReadiness(c)` → `{ ok, items:[{key,label,count,target,
detail,filter}] }`. Maddeler: `fileNo`, `court`, `expert`, `materials`,
`noSegments`, `pending` (pendingBreakdown), `ambiguous` (seçim yok), `speaker`
(boş veya "Belirtilmedi"), `time` (segmentTimeIssueIndexes), `hash`
(`isSha256Hex`), `origin` (sentetik hariç), `log` (zincir kırığı), `questions`.

**Arayüz:** `#reportReadiness` kartı `renderReport()` içinde
`renderReportReadiness(c)` ile çizilir; satırlar `[data-ready-goto]`
(`case|audio|questions`) ve isteğe bağlı `[data-ready-filter]`
(`pending|time`). Tıklama `#reportReadiness` delegasyonunda: filtreyi aktif
kayda yazar, `switchView(target)` çağırır, `audio` ise `renderAudioList()`.

**Ölçüm (v2.150, gerçek Chromium):** 4 bölümlük eksik dosya → kart
"8 konu eksik" ve 8 satır (pending 3, zaman 2, konuşmacı 3, …); "Kontrol
edilmemiş bölüm" satırına tıklayınca **view-audio** açıldı ve filtre
**"Bekleyen 3"**, listede 3 satır. Eksikler tamamlanınca kart
"Eksik görünmüyor" (is-ok). Kırpılma 0, punto 11px, JS hatası 0.

**Koruyan test:** `birim-testleri` [60] (33 kontrol).

**DERS:** "Hazır mı?" sorusuna yüzde ile cevap vermek sahte kesinlik üretir.
Adli belgede yanlış "hazır" izlenimi, eksik listesinden daha tehlikelidir;
bu yüzden yalnız madde + sayı gösterilir ve listenin onay olmadığı yazılır.


### Aşama 10aw — Onaydan sonra sonraki bekleyene geç (TAMAMLANDI, v2.151)

**KURAL: bu İSTEĞE BAĞLI bir tercihtir, VARSAYILAN KAPALI. Tek düğme iki iş
yapmaz: takip modlarından (F/G) AYRIDIR. Bekleyen yoksa YERİNDE kalınır.**

- `nextPendingIndex(segments, from)` — `from` sonrasındaki ilk
  `!isReviewed(s)` bölüm; yoksa `-1`. Onaylı/anlaşılmadı atlanır; `machine`,
  `ambiguous`, `relisten`, `pending` bekleyen sayılır (readiness ile aynı ölçüt).
- `nextPendingPref()` / `setNextPending(on)` — `akis.nextPending` ('1'/'0'),
  varsayılan kapalı. `behaviorPanelHtml()` + `#behaviorHost` (Ayarlar).
- `approveActiveSegment(m)` tek onay kapısıdır; tercih orada uygulanır. Kapalıyken
  eski davranış (`i+1`, son bölümde sabit) korunur.

**Ölçüm (v2.151, gerçek Chromium):** varsayılan KAPALI (aria-pressed=false,
kırpılma 0); açıkken bölüm 1 onaylandı → **bölüm 4** (onaylı 2–3 atlandı),
detay "Bölüm 4"; son bekleyen onaylandı → **yerinde kaldı**. Kapalıyken bölüm 1
onaylandı → **bölüm 2** (eski davranış). JS hatası 0.

**Koruyan test:** `birim-testleri` [61] (9 kontrol).

**DERS:** "Sonraki bölüme geç" varsayılanı uzun deşifrede hızlıdır ama
onaylanmış bölümleri tekrar tekrar gösterir. Tercih kullanıcıya bırakılmalı;
varsayılanı değiştirmek sessiz davranış değişikliği olurdu.


### Aşama 10ax — Listede bitiş zamanı (TAMAMLANDI, v2.152)

**KURAL: zaman hücresi iki satır (başlangıç / → bitiş); sütun ms için genişler,
hiçbir saat KESİLMEZ.**

- `segItemHtml` → `<span class="seg-time"><span class="seg-start">…</span>
  <span class="seg-end">→ …</span></span>`.
- CSS: `#view-audio .seg-time { display:flex; flex-direction:column }`;
  `grid-template-columns: 20px 96px …` (hem temel hem ≥901 px bloğunda).

**Ölçüm (v2.152, gerçek Chromium, 1440 px):** satır **59 → 72 px** (+13);
zaman hücresi 35 px / 2 satır. 1440/1280/1100/900/760: `timeClipped=false`,
`endClipped=false`, yatay taşma yok, rozet görünür.

**Not:** P4 notundaki "37 → ~51 px" tahmini v2.140 masaüstü kabuğundan ÖNCE
yazılmıştı; gerçek taban 59 px. Tahmin değil ÖLÇÜM yazılır.

**Koruyan test:** `tasarim-testi` [2t] (6 kontrol).

**DERS:** Kullanıcı "hangi saat ne" diye sorduğunda ek bilgi eklemek, tahmin
yürütmesini beklemekten iyidir; ama sütun genişliği ölçülmeden artırılırsa
(v2.130 dersi) saat sessizce kırpılır. Ekleyen ölçer.


### Aşama 10ay — Detay paneli sıkıştırma (TAMAMLANDI, v2.153 — hedef KISMEN)

**ÖLÇÜM (v2.152, 1440×900):** panel **577 px**, içerik **795 px** (218 taşma).
`sd-meta` 818'de, `sd-obs` 927'de → ekran dışında.

**Yapılan (yalnız yerleşim; metin alanı ve analiz kutusu KORUNDU):**
| Öğe | Önce | Sonra |
|---|---|---|
| `.sd-times` (etiket yanda) | 52 | **40** |
| `.sd-meta` (3 sütun) | 101 | **54** |
| `.sd-actions` (ikincil araçlar katlı) | 74 | **38** |
| `.sd-text` (masaüstü 180→160) | 218 | **198** |
| **Toplam içerik** | **795** | **680** |

**Sonuç:** `sd-meta` 786'da (önce 818), `sd-obs` 848'de (önce 927). Gözlem
düğmelerine kalan kaydırma **125 → 46 px**. **"Kaydırmasız" hedef TAM
KARŞILANMADI** (46 px eksik). Kapatmak için metin alanı 180→120 (−60) veya
analiz kutusu 160→120 (−40) küçültülmeli; ikisi de bilinçli korundu (metin
alanı en çok bakılan yer; analiz kutusu kullanıcı isteğiyle büyütülmüştü).
Karar kullanıcıya bırakıldı.

**Dar ekran:** ≤640 px'te `.sd-meta` yeniden tek sütun (163 px), zaman
etiketleri alt alta. 1440/1280/1100/900/760/640/480: kırpılma 0, yatay taşma 0.

**Koruyan test:** `tasarim-testi` [2u] (6 kontrol).

**DERS — `<details>` içine `display` yazmak gizlemeyi EZER:** kapalı
`<details>` çocuğuna `display:flex` verilince araçlar KAPALIYKEN de göründü
(tarayıcıda yakalandı). Kapalı durumu açıkça `display:none`, açık durumu
`.sd-more[open] .sd-ops { display:flex }` ile yazın.

**DERS — hedef tutmadıysa "tutmadı" yaz:** P5 notundaki "~100 px" tahmini
gerçek 218 px'in altındaydı (P4'te de tahmin tutmamıştı). Tahminle iş
bitirilmez; ölçüm yazılır ve kalan fark ADIYLA söylenir.


### Aşama 10az — Tek panel, iki bölge (TAMAMLANDI, v2.154)

**KURAL: detay paneli TEK panel, İKİ bölge. Sabit başlıkta yalnız günlük iş
vardır; metin alanı kalan yüksekliği alır; teknik alan istenince açılır.
Hiçbir birincil eylem kaydırmadan erişilemez olmaz.**

**Neden (ölçüm, v2.153):** detayda 38 kontrol; 16'sı gizli; onay 90 px,
gözlem 44 px, konuşmacı 13 px aşağıda. Panel aynı anda 6 iş yapıyordu; her
sıkıştırma başka bir öğeyi aşağı itiyordu (v2.127 → v2.153 arası ders).

**Yapı (`segDetailHtml`):**
```
sd-head (sabit): Bölüm X / N · ↑ ↓ · ▶ Dinle · ⏹
                 · sd-primary: ✓ Onayla · Yeniden · Anlaşılmadı · ⋯
                 · Teknik ▾  (data-tech-toggle)
sd-body: .sd-right (metin, flex 1) + .sd-left.sd-tech[hidden] (dalga/zaman/meta/obs)
```
- Alt `.sd-actions` satırı **kaldırıldı** (tek satır, bir kez).
- Teknik tercih `akis.techOpen` (`techOpenPref`/`setTechOpen`), **varsayılan kapalı**.
- `renderSegDetail` ve `syncSegDetailInPlace` analiz çizimini YALNIZ teknik açıkken yapar.

**Ölçüm (v2.154, gerçek Chromium):** 1440×900 kapalı: **17/17** kontrol görünür,
kaydırma **0**, metin alanı **446 px** (önce 160). Açık: **34/34** görünür,
kaydırma **0**, metin 120 px. 1280/1100/900/760: gizli **0**, kaydırma **0**.

**BULUNAN YAN HATA:** teknik açıkken sayfa yenilenirse dalga BOŞ kalıyordu
(`painted=0`; bölüm değişince 3020). Görünüm gizliyken çizilen tuvalin
genişliği 0 olur ve sonraki çizim ESKİ tuvale bağlı kalır (closure).
Düzeltme: `switchView('audio')` → `renderAudioList()` bittikten sonra
`requestAnimationFrame` ile detay **yeniden çizilir**. Sonrası: `painted=3020`.

**Koruyan test:** `tasarim-testi` [2v] (9 kontrol).

**DERS:** Bir panelde "hepsini sığdırma" hedefi yanlıştır; hedef **işe göre
bölge** ayırmaktır. Ölçüt "kaç piksel kaldı" değil, "kaydırmadan kaç kontrol
erişilebilir" ve "ana iş (yazma) ne kadar yer alıyor" olmalıdır. Ayrıca gizli
tuvalin genişliği 0'dır; çizim bağlama işini görünürlükten SONRA yapın.


### Aşama 10ba — Dil tutarlılığı ve bozuk diyalog onarımı (TAMAMLANDI, v2.155)

**BULGU (tüm sayfa taraması):** `index.html` içindeki paket kapsam diyaloğunda
bir satır bozuktu — `<code>AKIS_Paket_` içine iki tam paragraf girmiş, arada
`lt;dosya no` çöpü kalmıştı. Etiket sayısı DENGELİ olduğu için hiçbir test
yakalamadı; tarayıcı cümleyi iki kez gösteriyordu. Ayrıca düğme "Yedeği
oluştur" diyordu (v2.123 sözlüğü "Yedek"i kaldırmıştı).

**Düzeltme:** satır iki temiz paragrafa ayrıldı; düğme "Paketi oluştur";
arşiv notu "Pakete dâhil edilirler"; iki kod yorumu "anlık kopya/paket" diline
çekildi.

**Yeni nöbetçiler (`surum-testi` [11]/[11b]):**
- Kullanıcı metninde `Yede[kğ]` yasak — `index.html` (yardım geçmişi hariç) ve
  `app.js` (VERSION_NOTICES + yorumlar hariç).
- Satır içi etiketin (`code|b|small|span|label`) içine blok (`p|div`) giremez.
- `<p>` ve `<code>` dengesi.

**Ölçüm (v2.155, gerçek Chromium):** diyalog metni tek: "Paket adı:
AKIS_Paket_<dosya no>_tarih_saat.akis Dosya adına tarih ve saat eklenir; …";
düğme "Paketi oluştur"; `Dosya adına tarih` sayısı **1**; `lt;dosya` **yok**.
Boş çalışma alanında "Paket oluştur" → açıklayıcı toast, JS hatası 0.

**DERS:** Etiket dengesi, bozuk HTML'i yakalamaz. Otomatik metin düzenlemesi
yapan her araç, sonunda **yapısal** bir kontrol çalıştırmalı: satır içi/blok
iç içe geçmesi ve tekrar eden cümle. Bir cümlenin iki kez görünmesi
"tasarım" değil, veri bozulmasıdır.


### Aşama 10bb — Hazırlık ↔ kapsama tek gerçek (TAMAMLANDI, v2.156)

**BULGU (denetim #1):** 14–16 boşluklu dosyada "Kapsam %68 · 16 boşluk"
diyordu ama "Rapor hazırlığı" kartı **"1 konu eksik"** diyordu. İki teşhis
aracı aynı dosya için farklı "hazır" tablosu çiziyordu.

**KURAL:** `reportReadiness` kapsamayı `segmentCoverage` üzerinden sayar;
boşluk = eksik maddedir. Satır `action:'coverage'` taşır; tıklanınca ses
görünümü açılır ve `renderCoveragePanel` kendiliğinden gelir.

**Dürüst sınır korunur:** süre bilinmiyorsa `segmentCoverage` boşluk
üretmez → madde de çıkmaz. Boşluk "konuşma yok" demek değildir; metin bunu
söyler.

**Ölçüm (v2.156, gerçek Chromium):** 16 boşluklu dosya → kart
"1 konu eksik · **16** Bölümlenmemiş ses aralığı"; satıra tıklayınca
`view-audio` + kapsam paneli açık + **16** boşluk satırı. JS hatası 0.

**Koruyan test:** `birim-testleri` [62] (6 kontrol).

**DERS:** İki ayrı araç aynı veriyi farklı ölçerse kullanıcı hangisine
güveneceğini bilemez. Yeni bir ölçüm eklerken "hazırlık/özet" ekranlarının da
aynı kaynağı kullanıp kullanmadığını sor.


### Aşama 10bc — Test verisi koruması (TAMAMLANDI, v2.157)

**BULGU (denetim #2):** "Hazır test dosyalarını yükle" **onay sormadan** 4
kurgusal dosya + 10 sentetik kayıt ekliyordu; bunlar gerçek dosyalarla aynı
listede ve **pakette** yer alıyordu.

**KURAL:** test verisi **onayla** girer ve **tek tıkla, sesleriyle** çıkar.
- `sampleCases(cases)` — yalnız `sampleKey` taşıyan dosyalar (saf).
- `loadSamples()` → `askConfirm` (ne ekleneceğini söyler).
- `removeSamples()` → `askConfirm` + `deleteBlob` (sesler) + aktif dosya düzeltme.
- `refreshSampleAction()` — düğme `dataset.mode` = `load|remove`, metin
  "Hazır test dosyalarını yükle" / "Test dosyalarını kaldır (N)".

**Ölçüm (v2.157, gerçek Chromium):** ilk durum `load`; tıkla → onay diyaloğu;
onayla → 4 dosya, düğme `remove` "…(4)"; tekrar tıkla → onay → dosyalar ve
sesleri silindi, düğme `load`. JS hatası 0.

**Koruyan test:** `birim-testleri` [63] (9 kontrol).

**DERS:** Gerçek veriyle aynı listede duran "örnek" veri, onay ve tek tıkla
çıkış olmadan veri hijyenidir diye adlandırılamaz. Örnek veri ekleyen her yol
"nasıl çıkar?" sorusunun cevabını da taşımalı.


### Aşama 10bd — Bildirim yerleşimi ve ses yok durumu (TAMAMLANDI, v2.158)

**BULGULAR (denetim #4/#5):** toast durum çubuğunun üstüne biniyordu
(ölçüm 835–878 / 876–900). Ses blob'u yokken analiz kutusu BOŞ kalıyordu;
sebebi yalnız kaybolan toast söylüyordu.

**Düzeltme:**
- `.toast { bottom: calc(var(--status-h) + 12px) }` (reading-layer).
- `audioStateText(hasSrc)` + `refreshAudioState(m)`: `[data-audio-state]`
  satırı ses yoksa kalıcı uyarı yazar (sebep + çözüm), ses varsa gizlenir.
  `renderSegDetail` her çizimde tazeler.

**Ölçüm (v2.158, gerçek Chromium):** toast alt **854** / çubuk üst **876** →
çakışma yok. Ses yokken uyarı görünür; gerçek WAV eklenince gizli, süre 47,7.
JS hatası 0.

**Koruyan test:** `birim-testleri` [64] (7 kontrol).

**DERS:** Kaybolan bildirim "durum" değildir. Bir hata durumu ekranda kalıcı
bir satır bırakmalı; toast yalnız *değişikliği* duyurur. Ayrıca sabit konumlu
her öğe, altındaki sabit çubukla çakışma açısından ölçülmelidir.


### Aşama 10be — Dar ekranda yinelenen başlık (TAMAMLANDI, v2.159)

**BULGU (denetim #6):** ≤900 px'te tek kayıt için DÖRT başlık: sayfa
"Ses kayıtları" + panel "MATERYAL LİSTESİ / Ses kayıtları" + panel
"SEÇİLİ KAYIT / <dosya adı>" + karttaki dosya adı.

**Düzeltme:** `@media (max-width: 900px) { #view-audio .detail-panel >
.panel-heading { display: none } }`. Kart adı ve eylemleri taşıdığı için bilgi
kaybı yok. Masaüstü kuralı ayrı; test ikisini ayrı sınar.

**Ölçüm (v2.159, gerçek Chromium):** 900 px → başlık **0 px**, kart görünür,
yatay taşma yok. 1440 px → değişiklik yok (kabuk zaten gizliyor).

**Koruyan test:** `tasarim-testi` [2w] (2 kontrol).

**DERS:** Master–detail düzeninde her katman kendi başlığını ekler; dar ekranda
bunlar üst üste gelir. "Kaç başlık var?" sorusu ölçülebilir bir denetimdir.


### Aşama 10bf — Görsel düzen (kozmetik) (TAMAMLANDI, v2.160)

**ÖLÇÜM (v2.159, 1440×900):** iş akışı kartı ~265 px boş alan taşıyordu;
istatistik kartları düz metin (27 px sayı); adım açıklamaları gizli; inceleme
yazı yüzeyi 1344 px'e yayılıyordu.

**Yapılan (yalnız reading-layer sonuna eklenen v2.160 katmanı):**
- Genel bakış: `.content-grid` → `align-items:start; flex-grow:0; flex-shrink:0`
  (boşluk yok, taşma/üst üste binme yok), `.stat-card` ikon yuvası + 30 px sayı,
  adımlar yuvarlak numara + durum rozeti, hızlı erişim çerçeveli kart.
- İnceleme: yazı yüzeyi 920 px + `margin-inline:auto`.
- Rapor: kâğıt gölgesi `--shadow-lg`, hazırlık satırları ferah.
- Ses: satır hover yüzeyi; `material-chip` yarıçapı.
- `::selection` token renkleriyle.

**Ölçüm (v2.160, gerçek Chromium):** boşluk **0**; 900×700'de kartlar üst üste
binmiyor (önce biniyordu); 1440/900'de JS hatası 0; CSS borcu **98/507** (artmadı).

**Koruyan test:** `tasarim-testi` [2x] (8 kontrol).

**DERS:** `align-items:start` tek başına yeterli değil: sabit yükseklikli bir
flex alanında kartlar *kısalıp* altlarındaki karta binebilir. Kozmetik
düzeltmede `flex-grow/flex-shrink` ikisini birlikte düşün; her genişlikte
(1440 ve 900) ekran görüntüsü al.


### Aşama 10bg — Tasarım sistemi: palet, tema, punto (TAMAMLANDI, v2.161)

**ÖLÇÜLEN HATA (canlı):** koyu temada sayfa zemini açık, kartlar koyu, başlıklar
**okunmuyordu** (kontrast **1.16:1**). Kök neden: `tokens.css` tema blokları
`[data-theme=…]` (0,1,0); `app.css` `:root` da (0,1,0) ve **sonra** yükleniyor →
7 ortak ad (`--bg,--ink,--line,--gold,--green,--red,--paper`) her temada açık
değeri alıyordu.

**Düzeltme:**
1. Tema seçicileri `html[data-theme=…]` (0,1,1) → artık kazanıyor.
2. `app.css`'in kendi adları temaya bağlandı: `--navy→--ink`, `--navy2→--ink-2`,
   `--blue→--accent`, `--muted→--ink-3`, `--pale→--surface-3`, `--shadow→--shadow-md`.
3. Ham kalan metin renkleri (`#30465d`, `#91a0ad`, `#9aa6b1`, `#2c6b4f`) token'a çevrildi.
4. Palet rafine: açık zemin #eef2f7, koyu zemin #0d131a/kart #18212b, sepya
   #ece2d0/#fbf6ec, iki katmanlı gölge, kâğıt laciverti #16324f.
5. Punto ölçeği tek kaynak: 11/12/14/15/17/20/25/30 (+mono 14, ikon 16/18).
   Okuma katmanındaki **13 ham `font-size`** token'a çevrildi (ham 0). Deşifre 13→14.

**Ölçüm (v2.161, gerçek Chromium):** 4 görünüm × 3 tema kontrast taraması →
**0 başarısız**; en düşük ölçülen 4.89:1. 1440/1100/900: başlık kırpılması yok,
durum çubuğu 24/34/45 px / 0 kırpma, panel kaydırması 0, yatay taşma 0.

**Koruyan test:** `tasarim-testi` [2y] (13 kontrol).

**DERS:** İki stil dosyası aynı adı tanımlıyorsa **özgüllük ve yükleme sırası**
birlikte düşünülmeli. `:root` ile `[data-theme]` eşit özgüllüktedir; sonra
yüklenen kazanır. Tema testi yalnız "token var mı" değil, "**hesaplanan renk**
doğru mu" diye bakmalı — bu hata yalnız ekran görüntüsünde görünüyordu.


### Aşama 10bh — Temalar baştan sona uygulandı (TAMAMLANDI, v2.162)

**BULGU (kullanıcı uyarısı, ölçümle doğrulandı):** koyu/sepya temada bileşenler
açık kalıyordu. Ölçülen: "▶ Çal" **1.16:1**, `.seg-text` **1.67:1**,
`.seg-time` 2.71, `.split-nav`/`.split-body` **beyaz**, `.split-no` 1.16,
`.notice-box b` 2.79, rozetler açık çip (`#e8f5ef`, `#fdf3f3`, `#fff4e3`).

**KÖK NEDEN:** `app.css` 151 sabit `background:#hex` (40 saf beyaz) + onlarca
sabit metin rengi taşıyordu; reading-layer yalnız bir kısmını eziyordu.

**YAPILAN:**
- 86 yüzey + 75 metin kuralı token'a bağlandı (offset tabanlı güvenli düzenleme;
  seçici ikizlenmesi olmadan).
- Dolu düğmeler `--accent`/`--accent-ink`; uyarı kutusu `--gold-soft`; klavye
  tuşları `--surface-3`.
- Tuval: `themeVar(name, fallback)`; `applyTheme` içinde `__segWaveRedraw` +
  `renderAudioList` ile tazeleme.

**ÖLÇÜM (v2.162):** 4 görünüm × 3 tema kontrast **0 hata**; koyu/sepya'da açık
yüzey **0**; seçici taraması 65 bileşen × 2 tema → gerçek hata 0 (rail
yanlış pozitif; rail kontrastı 12.61/7.16/15.19). JS hatası 0.

**Koruyan test:** `tasarim-testi` [2z] (11 kontrol).

**DERS (pahalı):** "Tema var" ≠ "tema uygulanmış". Tema testi **hesaplanan
rengi** ve **yüzey parlaklığını** ölçmeli: koyu temada parlak zemin = hata.
Ayrıca JS ile boyanan tuval (dalga) CSS token'ı almaz; renkler `getComputedStyle`
ile okunmalı ve tema değişiminde yeniden çizilmeli. Son olarak: minified CSS'te
toplu düzenleme yaparken **seçici ikizlenmesi** riski var (`.app-shell.app-shell`);
düzenleme sonrası ikiz seçici ve parantez dengesi ölçülmeli.


### Aşama 10bi — Durum renkleri tek anlam (TAMAMLANDI, v2.163)

**BULGU (kullanıcı gözlemi, ölçümle doğrulandı):** `.seg-tool.play-main` siyah
zemin + mavi yazı (**1.1:1**), `#view-audio .follow-btn.on` altın zemin + koyu
yazı (**3.03:1**), `#view-audio .play-main.on` sabit yeşil + tema yazısı
(3.44:1), `.seg-tool.on` ID kapsamlı kural yüzünden rengi değişmiyordu.

**KÖK NEDEN (üç ayrı hata):**
1. **Anlam kayması:** "açık" durumu altınla işaretlenmişti (altın = uyarı).
2. **Özgüllük:** `#view-audio .seg-tool { color: … }` (1,1,0) `.seg-tool.on`
   (0,2,0) rengini eziyordu.
3. **Eski değerler:** durum kuralları `--navy` + `#fff` kullanıyordu; `--navy`
   temaya bağlanınca (v2.161) "siyah zemin" oluştu.

**KURAL — DURUM TABLOSU (değişmez):**

| Rol | Zemin | Yazı |
|---|---|---|
| Birincil (dolu) | `--accent` | `--accent-ink` |
| Açık / seçili | `--accent-soft` | `--accent` |
| Çalıyor | `--green` | `--surface` |
| Uyarı / gözlem | `--gold-soft` | `--gold` |
| Nötr | `--surface-2` | `--ink-2` |

**Ölçüm (v2.163, gerçek Chromium):** 19 bileşen × 6 (2 görünüm × 3 tema) durum
matrisi → **0** düşük kontrast; metin kontrastı 12/12 → 0 hata; koyu/sepya'da
açık yüzey 0. Gerçek UI (takip + hız + filtre + Dinle açık) ekran görüntüsüyle
doğrulandı.

**Koruyan test:** `tasarim-testi` [2aa] (6 kontrol).

**DERS (en pahalı):** Neden göremedim? Çünkü denetimlerim **temel durumu** ve
**kontrastı** ölçüyordu; `.on`/`.is-active`/`:hover` gibi **durum sınıflarını
hiç çizmedim**. Ayrıca minified CSS'te kural çok satıra yayıldığı için
`grep` ile bulunamadı; kesin yöntem CDP `CSS.getMatchedStylesForNode` ile
"hangi kural kazanıyor" sorusunu sormaktır. Bundan sonra her tema
incelemesinde **durum matrisi** çıkarılmalı: bileşen × durum × tema.


## YENİ OTURUM DEVRİ (v2.322) — Dar ekran kırpması + etiket menüsü

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.322** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2378 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` = v2.322 commit'i (push edildi) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.322** |
| Açık konu | A‑2 yazdırılan teslim kontrol listesi; A‑3 gecikme açılış uyarısı |

### v2.321 — Dar ekranda metin kırpılması/taşması

Ölçülen iki hata: 600 px'te kayıt başlığındaki **dosya adı** 96 px kutuya sığmıyordu
(içerik 170 px, %44 gizli, `nowrap+ellipsis`); 360 px'te **"ÇÖZÜMLENEN"** etiketi
36 px taşıp kart dışına çıkıyordu. Düzeltme yalnız CSS (`reading-layer.css`):
ad **sarar**; ≤480 px'te istatistik kartı **tek sütun** (ikon üst satır).
Ölçüm sonrası: 600 px kayıp **0**, 360 px taşma **0**, 1440 px değişmedi.
Test `tasarim [2da]` (düzeltme yokken 8 kontrol KALDI).

### v2.322 — Etiket menüsü (kapanma, yerleşim, "Etiketleri temizle")

Gerçek Chromium + gerçek fare ile **dört** hata ölçüldü:

| Belirti | Kök neden |
|---|---|
| Seçim yapmadan kapanmıyor | `placeFloatingMenu` inline `style.display='block'` yazıyordu → `[hidden]{display:none}` eziliyordu (computed `block`) |
| Menü metni örtüyor | menü `[762,131,380,470]` vs metin `[756,517,619,87]` |
| "Metni temizle" metni siliyordu | `applyTextEdit(s, '')` |
| Etiket sonrası menü açılmıyor | yeniden çizimden sonra backdrop görünür kalıp tıklamayı yutuyordu |

**DEĞİŞMEZ KURALLAR (bu sürümde doğdu):**

1. **Inline `display` yazmayın.** `style.display='block'` verilen bir öğe,
   `[hidden] { display:none }` kuralını ezer; menü "kapandı" görünür ama ekranda
   kalır. Görünürlük **yalnız `hidden` niteliğiyle** yönetilir (v2.322 dersi).
2. **Açılır menü tek kapıdan kapanır:** `closeQuickMenu(menu, focusTrigger)` —
   üst ×, alt Kapat, Esc ve yakalama aşamasındaki kapatma aynı yolu kullanır.
3. **Yerleşim kipi `'list'`:** etiket menüsü **segment listesine doğru (sola)**
   açılır; ≤900 px tek sütunda **metnin altına** iner, sığmazsa kısalıp kaydırılır.
4. **"Etiketleri temizle" = `stripQuickTags()`**: yalnız **bilinen** `[etiket]`
   işaretlerini kaldırır; metin, satır sonları ve bilinmeyen köşeli parantezler
   (`[bkz. 3]`, `[...]`) korunur. Etiket yoksa metin değişmez ve söylenir.
   Toplu metin değişikliği olduğu için `snapshotForUndo` alınır (↶ / Ctrl+Z).
5. **Yeniden çizimden sonra `syncFloatingBackdrop()`** çağrılır; aksi hâlde
   görünmez backdrop sonraki tıklamayı yutar.
6. Gözlem paneli `<details>` içindedir; inline `display` verilmez (yoksa
   `display:flex` düzeni bozulur ve kapalıyken de görünür kalır).

**Ölçüm (sonra):** 1440 → `[374,47,380,522]` · 1100 → `[265,51,380,522]` (metinle
örtüşme yok); 900/760/600/360 → menü metnin altında (`y≈470`, metin 347–434),
örtüşme yok, kaydırılır; her genişlikte Esc kapatıyor; yatay taşma 0; temizleme
sonrası metin durdu, **↶** etiketi geri getirdi; JS hatası 0.

**Koruyan test:** `birim [158]` (13) + `tasarim [2db]` (17) — v2.321 kodunda
tamamı KALDI (kanıtlandı).

**ÖLÇÜM TUZAĞI (tekrar etmesin):** Chromium profili aynı kalınca `?v=` sabit
olduğu için **CSS/JS önbellekten** gelebilir; ölçümden önce
`Network.setCacheDisabled(true)` kullanın. Aksi hâlde "düzeltme işlemedi"
gibi yanlış sonuç alınır (v2.321'de bir kez yaşandı).

## YENİ OTURUM DEVRİ (v2.323) — Üst yazı ayrı belge (rapor EK-1)

| | |
|---|---|
| Sürüm | **v2.323** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2417 birim + 522 şema** + rapor (44) + sürüm + tasarım yeşil |
| Plan | [`docs/UST_YAZI_PLANI.md`](docs/UST_YAZI_PLANI.md) (v2.323 uygulandı; v2.324/325 sırada) |
| Açık konu | **v2.324 belge ekleri düzenleme** (EK-2 teknik bilgiler, rapordan çıkarma), v2.325 ZIP |

### Ne yapıldı
- `case.letter` + `case.letterAnnexes[]` (schema): `report` tektir ve **EK-1**;
  `sections` · `reportAnnex` · `custom` türleri modelde hazır (v2.323'te yalnız
  `report` etkin). EK numarası **türetilir** (`letterAnnexNumbering`).
- **Tek model**: `letterModel(c)` → `letterPaperHtml` (A4), `docxLetterXml`,
  `makeUdf({letter:true})`. Üçü **aynı metni** üretir (`rapor` Senaryo 44).
- Rapor görünümünde **Rapor | Üst yazı** sekmesi (`setReportDoc`); üst yazıda
  sol panel alanlar, sağ panel **Belge ekleri**; araç çubuğunda üst yazı çıktıları
  (`#letterToolbarActions`), rapor çıktıları gizlenir (`#reportToolbarActions`).
- Eksik künyede (mahkeme / dosya no / bilirkişi adı) üst yazı **üretilmez**;
  eksikler yazılır. Boş alan satır üretmez; gövde boşsa varsayılan metin.
- "Üst yazı + rapor (2 dosya)" (`downloadLetterAndReport`).

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)
1. **"Teslim" sözcüğü tarih içindir** (`deliveryInfo`). Belge kümesi **belge
   eki**dir; `.akis` yedeği **paket**tir. Üç anlamı karıştırmayın.
2. **EK numarası yalnız üst yazıda** ve **bitişik**; rapor içinde "EK-N" adı
   kullanılmaz (rapor içi ekler "rapor içi tablolar"dır veya belgeye taşınır).
3. **Üç çıktı tek model**: yeni bir alan eklerken `letterModel` + üç üretici
   birlikte güncellenir; kopya metin/biçim yazmayın.
4. **Uydurma yok**: zorunlu künye eksikse çıktı üretilmez; "—" ile doldurulmaz.
5. `makeUdf(opts)` / `makeDocx(opts)` **imzası** `{letter:true}` alır; rapor
   davranışı değişmez (rapor testleri bunu korur).
6. **Rapor tarafına dokunmadan** eklendi: `#reportPreview`/rapor çıktıları aynı.

### Ölçüm (gerçek Chromium + CDP, 1440×900)
Üst yazı kâğıdı: `T.C.` · `ANTALYA 4. ASLİYE HUKUK MAHKEMESİ'NE` ·
`Sayı: 2026/214 E.` · `Konu: Bilirkişi raporunun sunulması` ·
`Sayın Hâkimliğine,` · 2 paragraf · `Bilgilerinize arz ederim.` ·
`Antalya, 15.11.2026` · `Bilirkişi` · `Örnek Bilirkişi` · imza çizgisi ·
`EKLER` · `EK-1 Bilirkişi raporu`.
İndirilen: `UstYazi_2026_214_E.udf` (998 bayt, **sayfa sonu 0** = tek sayfa),
`UstYazi_2026_214_E.docx`; iki dosya kipinde rapor `2026_214_E.udf`.
UDF: `paperOrientation=1`, `leftMargin=42.52 pt` (15 mm), **AKİS/uygulama yok**.
Eksik dosyada: engel kutusu (3 madde), toast, **dosya yok**.
1440/1100/900/760/600: yatay taşma **0**, kırpılan **0**; JS hatası **0**.

### ÖLÇÜM TUZAĞI (yine)
- Sürüm notu bandı (`#versionNotice`) rapor araç çubuğunun üstüne biner; gerçek
  fare ölçümünden önce `#versionNoticeClose` ile kapatın.
- `#newCaseBtn` çekmeceyi açar; açık çekmece tıklamayı yer. Ölçümden önce kapatın.
- CSS/JS önbelleği: `Network.setCacheDisabled(true)` + `Page.reload({ignoreCache:true})`.

### Sıradaki iş (v2.324 — plan hazır)
Belge ekleri düzenleme: `sections` (EK-2 Teknik bilgiler) + `reportAnnex`
(rapor içi eki belgeye çıkar, raporda kapat) + `custom`; ekle/sırala/sil;
**taşınan bölüm raporda çizilmez** (`reportBlockRenders`); her belge için
UDF/DOCX. Ayrıntı: `docs/UST_YAZI_PLANI.md` §10–§14.

## YENİ OTURUM DEVRİ (v2.324) — Belge ekleri: EK-2 teknik bilgiler + ek yönetimi

| | |
|---|---|
| Sürüm | **v2.324** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2436 birim + 522 şema** + rapor (45) + sürüm + tasarım yeşil |
| Plan | [`docs/UST_YAZI_PLANI.md`](docs/UST_YAZI_PLANI.md) — v2.323+324 uygulandı; v2.325 (ZIP + sayfa sayısı) sırada |
| Açık konu | v2.325: ZIP (`belgeler.json`), sayfa sayısı (opt-in), rapor içi eklerin "Rapor eki N" olarak yeniden adlandırılması |

### Ne yapıldı
- **Belge eki yönetimi** (sağ panel): `＋ Teknik bilgiler` · `＋ Rapor içi ek` ·
  `＋ Serbest ek`; satırda `↑ ↓ ⤓ ✎ ×`. EK numarası **türetilir**.
- **TEK KOPYA (DEĞİŞMEZ):** eke alınan bölüm `report.sections[k]=false` ile
  raporda kapanır; raporda yeniden açılırsa **ekten çıkar** (`setReportSection`
  içinde `letterMovedSectionKeys`). Rapor içi ek için aynısı `setReportAnnexOn`.
- **Ek belgesi** `annexDocumentCase(c, annex)` ile üretilir: geçici kopyada yalnız
  ilgili içerik açık; kapak/toc/künye/imza/ek listesi **kapalı**; `__annexDoc`
  ile **kompakt akış** (bölüm başına sayfa sonu yok). `makeUdf({case, fileName})`
  / `makeDocx({case, fileName})` geçici kopyayı kullanır — **rapor kaydı değişmez**.
- **Silme güvenli:** `prev` alanı bölümün ÖNCEKİ görünürlüğünü saklar; ek
  kaldırılınca o değere döner (kapalı bölüm kendiliğinden açılmaz).
- **Kapak yoksa baştaki sayfa sonu eklenmez** (UDF `frontRendered`, DOCX
  `frontCount`) — ek belgesinde boş ilk sayfa oluşmuyordu.
- **`hidden` dersi tekrar:** `#view-report [hidden] { display:none }` eklendi;
  yazar `display` kuralı `hidden`'ı eziyordu (sağ panel alt satıra düşüyordu).
  Üst yazı ızgarası ayrıca **3 sütun** olarak sabitlendi.

### Ölçüm (gerçek Chromium + CDP)
EK-2 UDF **3.670 bayt**, yalnız taşınan bölümler, **kapak/içindekiler/imza yok**,
sayfa sonu **0**; EK-3 (rapor içi ek) 1.248 bayt; EK-4 (serbest) 731 bayt.
Rapor başlıkları 12 → 11 (köken çıktı, numaralar bitişik). `origin` raporda
yeniden açılınca EK-2'den düştü (7 bölüm kaldı); `ek1` açılınca EK-3 kalktı.
1440/1100/900/760: kırpma 0, yatay taşma 0; JS hatası 0.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)
1. **Bir içerik tek yerde:** rapor **veya** belge eki. İki yön de otomatik
   (ekle → raporda kapat; raporda aç → ekten çıkar).
2. Ek belgesi **sade**dir: kapak/içindekiler/künye/imza/ek listesi yok.
3. Ek belgesi üretimi **raporun kendi üreticisini** kullanır (kopya biçim yok).
4. `prev` olmadan bölüm geri alınmaz; "hepsini aç" yanlış (v2.324'te ölçüldü:
   `integrity/tech/qc` kendiliğinden açılıyordu).
5. Yeni bir "taşıma" yolu eklerseniz `moveSectionsOutOfReport` +
   `letterMovedSectionKeys` + `removeSectionsFromLetterAnnexes` üçlüsünü kullanın.

## YENİ OTURUM DEVRİ (v2.325) — ZIP paketi, sayfa tahmini, "Rapor eki N"

| | |
|---|---|
| Sürüm | **v2.325** |
| Testler | **2445 birim + 522 şema** + rapor (45) + sürüm + tasarım yeşil |
| Açık konu | Yok (üst yazı/belge eki turu kapandı) |

- **ZIP:** `buildDocumentsZip()` → üst yazı + rapor + belge ekleri +
  `belgeler.json` (`akis.belgeler.v1`: no, kind, label, file, bytes, sha256).
  Dosya adı `UstYazi_Belgeler_<no>_<tarih>_<saat>.zip` — **"Paket" sözcüğü yok**.
- **Üretici sözleşmesi:** `udfDocument(opts)` / `docxDocument(opts)` → `{blob, name,
  message}`; `makeUdf` / `makeDocx` indirme sarmalayıcısıdır. ZIP bunları kullanır.
- **Sayfa tahmini YALNIZ EKRAN** (`estimateDocumentPages`): gizli kâğıdın yüksekliği
  0 olduğu için ölçüm **görünür alan dışına** taşınır (v2.325'te ölçüldü: hepsi
  "1 sayfa" görünüyordu). **Belge metnine sayfa sayısı YAZILMAZ** — UYAP/Word
  düzeni farklı sayfa üretir; adli belgede uydurma sayı yanıltıcıdır.
- **Adlandırma:** rapor içi ekler `Rapor eki N.` (üst yazının `EK-N`'siyle karışmaz).
- **Birim sandbox'ında `fetch` stub'ı YOK**; `udfDocument`/`docxDocument` yalnız
  `rapor` testinde (gerçek `templates/BOS.udf` ile) sınanır.

## Bilinen açık hatalar

**Yok.** 2026-11-19 itibarıyla bildirilen tüm model/çözümleme hataları
giderildi ve kullanıcı tarafından uçtan uca doğrulandı (Tiny → Large-v3-turbo
arası tüm modeller yüklendi ve çözümledi; gerçek Türkçe çıktı alındı).

2026-11-20: canlı veri denetimi **v2.87–v2.101** arasında 15 konuda
tamamlandı; hepsi kapatıldı (aşağıda).

Kapanan maddeler ve sürümleri:

1. Model yükleme ilerlemesi okunaksız → **v2.24/v2.26** (sabit payda,
   hiç azalmayan yüzde, "N dosya önbellekten" notu).
2. Seçili/yüklü model görünmüyor → **v2.19** ("Yüklü model" rozeti, kayıt
   başına "Çözümleyen model").
3. Orta/temel model "- - - -" üretiyordu → **v2.20** (timestamp token
   sızıntısı: `return_timestamps:'word'` kaldırıldı, çöp ayıklama eklendi).
4. Model seçimi yükleme ilişkisi belirsizdi → **v2.19** (seçim-yükleme uyarısı).
5. GPU bellek taşması (`Aborted`) → **v2.23** (bellek güvenli dtype sırası,
   GPU→CPU geri dönüşü).
6. Model boyutu etiketleri yanlıştı → **v2.25** (gerçek ölçümler).

### Bilinen sınırlar (hata değil, tasarım kararı)

- WER/doğruluk oranı yalnızca **referans metni** olan kayıtlarda hesaplanır;
  gerçek dosyalarda referans yoktur, bu yüzden çözümleme yaptıkça kendiliğinden
  oran çıkmaz.
- Kaynak ayrıştırma (yalnız konuşmayı müzikten ayırma) yapılmaz; ağır ML işidir.

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

### DERS: commit ≠ yayın — push edilmeden sürüm değişmez

v2.78–v2.81 çalışması commit'lendi ama **push edilmedi**. Kullanıcı canlı
sitede hâlâ v2.77 gördü ve haklı olarak "pushlandı mı?" diye sordu. Sebep:
GitHub Pages yalnız **uzaktaki** `main` dalından yayın yapar; yerel commit
hiçbir şeyi değiştirmez.

**Kural — sürüm işi bitmiş sayılmaz, ta ki şunlar doğrulanana kadar:**

1. `git push origin main`
2. `git ls-remote origin refs/heads/main` → yerel `HEAD` ile **aynı** hash
3. Pages derlemesi `built` olmalı ve `commit` bizimki olmalı:
   `curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
     https://api.github.com/repos/azmisahin-gov/akis/pages/builds/latest`
4. Canlı site gerçekten yeni sürümü sunmalı:
   `curl -s https://azmisahin-gov.github.io/akis/assets/app.js | grep APP_VERSION`

**Kullanıcı "hâlâ eski sürümü görüyorum" derse** ilk bakılacak üç şey:
push edildi mi → Pages derlemesi bitti mi → tarayıcı önbelleği (sayfayı
`?t=<tarih>` ile veya Ctrl+Shift+R ile aç). `?v=` parametreleri yalnız
`assets/*` önbelleğini kırar, `index.html`'in kendisini kırmaz.

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
- Yapılmayan inceleme rapora yazılmaz; ölçülmemiş büyüklük tabloya girmez.
- E-imza üretilmez, UYAP'a belge gönderilmez.
- **Rapor bilirkişi adına yazılır.** Çıktıda uygulamanın adı, sürümü veya
  varlığı anılmaz; uygulama yalnızca bilirkişinin kullandığı bilimsel araçtır.
  Hukuki/mesleki çerçeve: [`docs/BILIRKISILIK_CERCEVESI.md`](docs/BILIRKISILIK_CERCEVESI.md).
- Mevzuat atfı, madde numarası ve uzmanlık alanı künyesi **doğrulanmadan
  rapora yazılmaz**; uygulama uydurma künye üretmez.
- Raporun işi hukuki değerlendirme değildir; uygulama bilirkişi kanaati
  üretmez, yalnızca ölçülebilir teknik bulguyu ve sınırını sunar.
- Ağır makine öğrenmesi gerektiren işler (kaynak ayrıştırma, konuşmacı kimlik
  tespiti, montaj tespiti) yapılmış gibi gösterilmez.

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

Bu komut üç betiği çalıştırır:
- `tools/birim-testleri.mjs` — hesaplama fonksiyonları (WER, FFT, perde,
  Türkçe yönelme eki, ms hassasiyetli zaman kodu, dolgu tespiti, geçmiş
  sıkıştırma, kontrol durumu, paragraf oluşturma, mercie özel ifadeler).
- `tools/rapor-tutarlilik-testi.mjs` — rapor oluşturucuları (HTML/DOCX/UDF);
  ayrıca seviye ölçümü bölümünün yalnız ölçülmüş kayıtlarla dolduğunu ve
  çıktılarda uygulama kimliği bulunmadığını denetler.
- `tools/surum-testi.mjs` — `APP_VERSION`, dört `?v=` parametresi, CHANGELOG,
  YOL_HARITASI, README, OZELLIKLER ve AGENTS sürümlerinin aynı olduğunu
  denetler. Sürüm bir yerde artırılıp başka yerde unutulursa test kalır.
- `tools/sema-testi.mjs` — v3 şeması: kimlik benzersizliği, kod↔etiket
  bütünlüğü, v2→v3 göçü kayıpsızlığı, doğrulayıcı, delil zinciri kurcalama
  tespiti, birleştirme çakışma raporlaması, zaman biçimi (87 kontrol).
- `tools/tasarim-testi.mjs` — üç temanın kontrast oranlarını WCAG ile yeniden
  hesaplar, punto alt sınırını (≥11px), ham hex yasağını, stil yükleme sırasını,
  tema bütünlüğünü ve erişilebilirlik ipuçlarını denetler. Tasarım kararı
  bozulursa test kalır.

Betik, `assets/app.js`'i Node.js `vm` içinde sahte bir DOM ile yükler; üç rapor
oluşturucuyu (`renderReport`, `makeDocx`, `makeUdf`) aynı veriyle çalıştırır ve
metinleri karşılaştırır. Ayrıca kaynakta `REPORT_TEXT` değerlerinin sabit
kopyası kalıp kalmadığını denetler. Çıkış kodu 0 = tüm kontroller geçti.

Rapor dışı akışlar (deşifre motoru, model yöneticisi, yedekleme, dalga formu
etkileşimi, dinleme yardımcıları, karaoke, seviye/stereo/bant ölçümünün
tarayıcıya bağlı dış kabuğu) elle doğrulanır. Ölçümün **hesabı** saf
fonksiyonlarda olduğu için birim testleriyle otomatik sınanır.

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

Biçim `MAJOR.MINOR`. **Güncel sürüm: v2.365.**

Tek kaynak: `assets/app.js` içindeki `APP_VERSION` sabiti. Arayüzdeki sürüm
etiketi (`#appVersion`) bu değerden yazılır; `index.html`'de yalnızca başlangıç
metni bulunur.

Her sürüm güncellemesinde **üç yer birlikte** artırılır:

1. `assets/app.js` → `APP_VERSION`
2. `CHANGELOG.md` → yeni `## vX.Y — başlık` bölümü
3. `docs/YOL_HARITASI.md` → ilgili sürüm başlığı

Ayrıca `index.html`'deki `assets/app.js?v=…` ve `assets/app.css?v=…`
parametreleri güncellenir (tarayıcı önbelleğini kırmak için).

Sürüm geçmişi: [`CHANGELOG.md`](CHANGELOG.md). Yol haritası:
[`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md).

## Commit dili

Commit mesajları Türkçe yazılır.

## Çalışma disiplini (DEĞİŞMEZ — v2.87'de yazıldı)

Bilirkişi bu uygulamayı **canlı/gerçek veriyle** kullanıyor. Bir kez kaybedilen
iş geri gelmez. Bu yüzden aşağıdaki akış her düzeltmede istisnasız uygulanır.

### 1. Tek konu, tek sürüm

- Bir oturumda **tek bir konu** ele alınır. Konu bitmeden ikincisine
  geçilmez; iki konu aynı commit'e/sürüme karıştırılmaz.
- Her konu **tam olarak bir sürüm** üretir (`vX.Y`). Bir konu için birden
  fazla sürüm gönderilmez; bir sürümde birden fazla konu olmaz.
- Konu listesi ve sırası `docs/YOL_HARITASI.md` içinde tutulur.

### 2. Önce kıran test, sonra düzeltme

Her düzeltme şu sırayla yapılır — sıra atlanmaz:

1. **Hatayı yeniden üret.** Ölç, tahmin etme. Gerekirse gerçek tarayıcıda
   (headless Chromium + CDP) çalıştır.
2. **Kıran testi yaz.** Test, düzeltme yokken **KALMALI**. Kalıyorsa test
   hatayı gerçekten yakalamıyor; test düzeltilir.
3. **Testin kaldığını göster** (`bash tools/test.sh` çıktısı).
4. **Düzeltmeyi uygula.** Yalnız bu konuya dokun.
5. **Testin geçtiğini göster.** Diğer testler de geçmeli.
6. **Gerçek tarayıcıda akışı tıkla.** DOM/IndexedDB davranışı sahte DOM'da
   görünmez (bkz. "DERS: sahte DOM yetmez").
7. **Sürümü gönder** (aşağıdaki 3. madde).

### 3. Sürüm gönderme (tek yol)

1. `APP_VERSION` + `CHANGELOG.md` başlığı + `docs/YOL_HARITASI.md` birlikte.
2. `index.html` içindeki `?v=` parametreleri.
3. `bash tools/test.sh` → tümü geçmeli.
4. Commit (Türkçe) → **push** → `git ls-remote` ile uzak hash eşit mi.
5. Pages derlemesi `built` ve canlı site yeni sürümü sunuyor mu.

Push edilmemiş commit yayın değildir (bkz. "DERS: commit ≠ yayın").

**Kullanıcı tercihi (2026-11-25):** değişiklikler **doğrudan `main`** dalına
push edilir; özellikle istenmedikçe ara/özellik dalı açılmaz. Gereksiz dal
açıldıysa hem uzak (`git push origin --delete <dal>`) hem yerel
(`git branch -D <dal>`) dal silinir.

### 4. Kullanıcı her değişiklikten haberdar edilir

Bilirkişi teknik ayrıntıyı okumaz; **ne kaybettiğini ve ne kazandığını** bilmek
zorundadır. Her sürümde üç yerde açık dille yazılır:

1. **`CHANGELOG.md`** — "KULLANICI NE GÖRECEK" başlığı altında, teknik terim
   yerine gözlemlenebilir sonuç ("kayıt artık durmuyor", "onay düşüyor" gibi).
2. **Uygulama içi yardım ekranı** — kullanıcıya görünen davranış değişikliği
   varsa (?) yardım ekranındaki ilgili bölüme yazılır.
3. **Sürüm notu (toast/banner)** — kayıt kaybı gibi kritik bir hata
   düzeltildiyse uygulama açılışta bir kez bilgilendirir
   (`akis.seenNotice.<sürüm>` anahtarıyla, her açılışta tekrarlamaz).

Bir hata **sessizce** düzeltilip geçilmez. "Kayıt başarısız" gibi bir uyarı
kullanıcı tarafından görülmediyse, uyarı **yeterince görünür değildir** —
uyarı görünürlüğü de düzeltmenin parçasıdır.

### 5. Sessiz hata yasak

Bu depoda en pahalı hata türü **sessiz** olandır: ekran "kaydedildi" derken
veri yazılmaması, onayın sessizce düşmesi, ölçümün sessizce yanlış olması.
Bir işlem başarısız oluyorsa:

- kullanıcı **görmeli** (büyük, kapatılamaz uyarı),
- **ne kaybettiğini** anlamalı,
- **ne yapacağını** bilmeli (ör. "Dışa aktar" ile yedek al).

### 6. Ölçülemeyen iddia yazılmaz

Rapor ve arayüz yalnız ölçülmüş/doğrulanmış değeri gösterir. Ölçüm yapılmadıysa
satır yazılmaz; ölçüm yapılamadıysa "ölçülemedi" yazılır, uydurma değer
yazılmaz. Bu, hata düzeltmeleri için de geçerlidir: "düzeltildi" demek için
önce/sonra ölçümü gösterilir.

## Aşama 9 — Canlı veri doğruluk turu (TAMAMLANDI, v2.87–v2.101)

Bilirkişi "yaptığım tüm değişiklikleri kaybettim, uyarıyı görmedim" dedi.
Buradan başlayan 15 konuluk denetim **her sürümde kıran test → düzeltme →
gerçek tarayıcı → push** disipliniyle yürütüldü. Test sayısı 361 → **441**.

| Sürüm | Konu | Koruyan test |
|---|---|---|
| v2.87 | Kayıt tamamen duruyordu (DataCloneError) + uyarı görünmüyordu | `birim` [17][18][19] |
| v2.88 | Onay metne bağlı değildi (metin değişse de "Onaylandı") | `birim` [20] |
| v2.89 | v2 onay kodları yüklemede sessizce `pending`'e düşüyordu | `sema` [4b] |
| v2.90 | WER, modelin çıktısı yerine bilirkişinin metnini ölçüyordu (TERS) | `birim` [21] + `rapor` 7b |
| v2.91 | Seviye/kırpılma mono karışımdan (kırpılma görünmüyordu) | `birim` [22] |
| v2.92 | Sessizlik/perde yalnız kanal 0'ı okuyordu | `birim` [23] |
| v2.93 | Gerçek cümleler "dolgu" sayılıyordu (deşifre çöpe atılıyordu) | `birim` [24] |
| v2.94 | Birleştirmede kayıt düzeyi 8 alan sessizce düşüyordu | `sema` [7k] |
| v2.95 | `updatedAt` hiç tazelenmiyordu (yenilik ölçütü ölü) | `birim` [25] |
| v2.96 | SHA-256 hesaplanamazsa sahte "doğrulandı" deniyordu | `birim` [26] |
| v2.97 | Zaman alanı doğrulanmıyordu (`00:00:05,100` → `00:00:00.000`) | `birim` [27] |
| v2.98 | Paragraf/bölme model çıktısını siliyordu (`asrText`) | `birim` [28] |
| v2.99 | Hızlı onay sayacı ile filtresi ayrışıyordu | `birim` [29] |
| v2.100 | Türkçe büyük İ terim tutarlılığını bozuyordu | `birim` [30] |
| v2.101 | Perde oktav hatası → artık **bildirilir** (düzeltilmez) | `birim` [31] |

### Bu turdan çıkan değişmez teknik kurallar

- **Kayda giden her kopya klonlanabilir olmalı.** `sanitizeForStorage()`
  `__` alanlarını ve fonksiyonları atar; `persistNow`/dışa aktarma onu
  kullanır. Malzemeye fonksiyon yazmak (`m.__x = fn`) kaydı bozar.
- **Her yazma hatası GÖRÜNÜR.** `showSaveFailureBanner()`; küçük durum yazısı
  yeterli değil.
- **Onay metne bağlıdır.** `setSegmentText()` metin değişince `review`ı
  `pending`e çeker; `__reviewDropped` bayrağı kullanıcıyı bir kez uyarır.
- **Göç tablosu TEK KAYNAK.** `REVIEW_LEGACY` + `normalizeReviewState()` yalnız
  `schema.js`'te; `app.js` kopya tutmaz.
- **Ölçüm doğru girdiyi ölçer.** WER → `asrText`; tepe/kırpılma → en kötü
  kanal; sessizlik/perde → en yüksek enerjili kanal; Türkçe küçültme →
  `trLowerCase()`.
- **Ölçüm şemaları sürümlenir.** `LEVELS_SCHEMA` (3), `SILENCE_SCHEMA` (2);
  eski kayıtlar `stripDerivedFields` ile atılır, yeniden ölçülür.
- **Birleştirme sessizce ezmez.** `mergeMaterialFields()` +
  `diffMaterialFields()` tek kural; önizleme = birleştirme.
- **`updatedAt` her düzenlemede tazelenir** (`persist()` tek kapı); dosya
  AÇMAK tazelemez (`persist({touch:false})`).
- **Doğrulama üç hâlli.** `verifyHashState()` → `verified` / `mismatch` /
  `unavailable`; "hesaplanamadı" asla "doğrulandı" değildir.
- **Zaman girdisi katı.** `parseTimecodeStrict()` geçersizde `null` (0 değil);
  Türkçe virgül kabul; geçersiz değer kayda girmez.
- **Adli ayrım her yolda korunur.** Paragraf `asrText`i birleştirir, bölme
  paylaştırır; farklı modeller karışırsa model adı boşaltılır.
- **Tek kaynak ilkesi.** Sayaç/filtre/toplu onay `quickApproveTargets()`;
  perde hücresi `pitchCellText()`; rapor satırları `levelRowsForCase()`.

### Dürüst sınır olarak bırakılanlar (hata değil)

- Perde: otokorelasyon oktav hatası **düzeltilmiyor**, `detectPitchAmbiguity()`
  ile **bildiriliyor**. Kesin perde için YIN/SWIPE gerekir; depo böyle bir
  model içermiyor ve yapılmış gibi göstermiyor.
- `pitchHint` cinsiyet ipucu yalnız **güvenilir** ölçümde gösterilir.

## Yeni oturuma devir notu (v2.163) — DURUM, KURALLAR, SIRADAKİ İŞLER

Bu not, **tasarım/tema/kozmetik turunu** kapatan oturumun devridir. Eski
v2.129 devir notu kaldırıldı; onun yerini bu not alır (mimari ve sınırlar
güncellendi). Aşağıdaki
kurallar bu oturumda **ölçümle** doğrulandı ve testle korunuyor; yeni oturum
bunları bozmadan devam etmelidir.

### Durum (2026-11-21, P1 + P2 + P4–P17 kapandı; P3 sürüyor)

| | |
|---|---|
| Sürüm | **v2.197** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **977 birim + 404 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | `main` = `origin/main` = `b1f2d88` |
| Pages | `built`, commit bizimki |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.187** |
| Açık konu | **Yok** — sırada P3 devamı ve P5 (karar bekliyor) |

### Senaryo ölçümü (v2.163'te yapıldı, kararların dayanağı)

Gerçek Chromium 156 + CDP, gerçek WAV (2,1 MB / 47,7 sn), 1440×900 ve 900×900.
Ölçülen: tıklama, dosya işlemi, kaydırma, gizli/ekran dışı kontrol, odak
kaybı, hata. **Beş senaryoda JS hatası 0.**

| Senaryo | Tıklama | Not |
|---|---|---|
| Yeni dosya + künye | 2 | 17 alan, ilk ekranda 8; zorunlu `expertName` 454 px aşağıda |
| Ses ekle + teslim alma | +2 (+1 dosya) | diyalog 5 alan |
| 10 bölüm yaz/onayla | +31 (11 elle bölüm + 20 yaz/onay) | odak kaybı 0, bölüm başına 2 tık |
| Rapor + UDF | +2 | hazırlık 1 eksik madde, indirme ilk ekranda |
| Paket oluştur → başka profile yükle | 4 + 3 | künye + kayıt + 10 bölüm korundu |

Görünüm envanteri (1440): Özet 9 · Ses **96 (54 görünür)** · İnceleme 8 ·
Rapor 7. 900 px'te Ses görünümünde 21 kontrol ekran dışında, ana alan
825 px kayıyordu; "✓ Onayla" **y=1313** (ekranın 413 px altında).

**Bu ölçümden çıkan üç sürüm:** v2.164 (künye), v2.165 (dar ekran çubuğu),
v2.166 (onaysız ses silme — ölçüm sırasında bulunan **veri kaybı**).

### Bu oturumda ne yapıldı (v2.164–v2.166, P1 ilk tur)

| Sürüm | Konu | Ölçüm | Koruyan test |
|---|---|---|---|
| v2.164 | Künye: zorunlu alanlar ilk ekranda | 3/5 → **5/5**; `#expertName` 454→356 px | `tasarim` [2ab] |
| v2.165 | ≤900 px yapışkan işlem çubuğu (↑↓ · Dinle · Onayla · 3/10) | onay y=1313 → **820–874**; toast çakışması yok | `tasarim` [2ac] |
| v2.166 | Ses kaydını kaldırma **onay ister** (onaysız kalıcı silme) | diyalog yok → var; Vazgeç sesi korur | `birim` [65] |
| v2.167 | Künye her görünümden **tek tıkla** (üst barda ✎) | 4 tık + 2 görünüm → **2 tık, 0 görünüm** | `tasarim` [2ad] |
| v2.168 | Dar ekranda bölüme geçince metin görünür alana gelir | 100 bölüm: metin 7.929 → **587 px**; 1440'ta kaydırma 0 | `tasarim` [2ae] |
| v2.169 | Rapor kâğıdı: punto tabanı + belge fontu | 11 px altı metin 1 → **0**; kâğıt Segoe UI → **Arial** | `tasarim` [2af] |
| v2.170 | CSS borcu: ölü `.seg-*` kuralları silindi | kural 852 → **828**, `!important` 62 → **58**, ölü 95 → **72**; stil farkı **0** | `tasarim` [2ag] |
| v2.171 | CSS borcu: ölü bildirimler (7 katman tekrarı) | kural 828 → **825**, `!important` 58 → **55**, ölü 72 → **60**; stil farkı **0** | `tasarim` [8] eşik |
| v2.172 | Rapor önizlemesi kırpılmıyor (tek kaydırma) | kâğıt **196 → 6.438 px**; görünüm 6.254 px kayıyor; araç çubuğu yapışkan | `tasarim` [2ah] |
| v2.173 | Paket adı saniye taşıyor | aynı dakikada iki paket **farklı ad** (10-00-40 / 10-00-47) | `birim` [66] |
| v2.174 | "Ses yok" uyarısı Teknik kapalıyken de görünür | uyarı panel dışına alındı | `tasarim` [2ai] |
| v2.175 | Uyarı **ilk çizimde** de yazılır | Teknik kapalı + taze sayfa → uyarı görünür | `tasarim` [2ai] |
| v2.176 | Birleştirme: ham çıktı korunur, günlüğe yazılır | asrText `mergedFrom`; S1/S2 reddedildi; günlük 1→2 | `birim` [67] |
| v2.177 | Satır menüsü (⋮ / sağ tık) | kontrol 54 → **47**; birleştirme 3 → **2** | `tasarim` (güncellendi) |
| v2.178 | Sürükleyerek birleştirme (komşu) | 1 sürükleme; komşu olmayan reddedilir; satır 74 px | `tasarim` [2aj] |
| v2.179 | Detay: canlı vurgu ezilmiyor | vurgu **14 → 48 px**, metin **120 → 160 px**, panel 81 px kaydırıyor | `tasarim` [2al] |
| v2.180 | Konuşmacı/kontrol/gözlem her zaman görünür | meta **y=822 → 303**, gözlem **884 → 642** (panel içinde) | `tasarim` [2am] |
| v2.181 | ASR kökeni Teknik'te, metinde ince ipucu | metin 371 → **344 px**; blok Teknik'te; notta "öncelik" yok | `tasarim` [2an] |
| v2.182 | Dikey yer kazanımı: etiketler satır içi | meta **63 → 40 px**; ses yok **47 → 31 px**; kaydırma 84 → 63 | `birim` [64] + `tasarim` [2am] |
| v2.183 | Başlıkta birleşik işlem satırı | üst bölge **76 → 42 px** (1440), **78 → 42** (900) | `tasarim` [2ao] |
| v2.184 | Tek durum satırı: her zaman görünür | satır üç durumda da **28 px**; boş şerit yok; metin 359 px | `tasarim` [2ai] + `birim` [64] |
| v2.185 | Bölüm listesi = dizin (metin tek yerde) | satır **74 → 50 px**; rozetler görünür | `tasarim` [2ap] |
| v2.186 | Liste tek satır + Teknik düğmesi kalktı | satır **34 px** (4 genişlikte aynı); metin 359 → 260 | `tasarim` [2t]/[2ap]/[2v] |
| v2.187 | Liste sağa yaslı; Onayla düğmesi kalktı | satır 34 px; durum sağdan **8 px**; eylem menüde + Enter | `tasarim` [2j]/[2v]/[2ao] |

### Önceki oturum (v2.149–v2.163, 15 sürüm)

| Sürüm | Konu | Koruyan test |
|---|---|---|
| v2.149 | **Kapsama denetimi**: "Kapsam %98 · 2 boşluk" düğmesi + panel + "Git" | `birim` [59] |
| v2.150 | **Rapor hazırlığı** kartı (eksikler sayıyla; uydurma yüzde yok) | `birim` [60] |
| v2.151 | **Onaydan sonra sonraki bekleyene geç** (varsayılan kapalı) | `birim` [61] |
| v2.152 | **Listede bitiş zamanı** (iki satır; sütun 96 px; kesme yok) | `tasarim` [2t] |
| v2.153 | Detay paneli sıkıştırma (hedef kısmen; 46 px kaldı) | `tasarim` [2u] |
| v2.154 | **Tek panel, iki bölge**: sabit başlık + metin + isteğe bağlı teknik | `tasarim` [2v] |
| v2.155 | **Paket diyaloğu onarıldı** (bozuk satır) + "Yedek" → "Paket" | `surum` [11]/[11b] |
| v2.156 | **Hazırlık ↔ kapsama** tek gerçek | `birim` [62] |
| v2.157 | **Test verisi koruması** (onay + tek tıkla kaldır) | `birim` [63] |
| v2.158 | Toast durum çubuğunun üstünde + **ses yok** kalıcı uyarısı | `birim` [64] |
| v2.159 | ≤900 px'te yinelenen başlık kaldırıldı | `tasarim` [2w] |
| v2.160 | **Kozmetik düzen**: kartlar içeriğe göre, ikon+sayı, rozetli adımlar | `tasarim` [2x] |
| v2.161 | **Palet + tema + punto**: koyu tema onarıldı (1.16:1 → 14.05:1) | `tasarim` [2y] |
| v2.162 | **Tema tam uygulama**: 151 sabit yüzey → token; tuval temadan | `tasarim` [2z] |
| v2.163 | **Durum renkleri tek anlam**: `.play-main`, `.follow-btn.on`, `.seg-tool.on` | `tasarim` [2aa] |

### DEĞİŞMEZ TASARIM KURALLARI (bu oturumda doğdu)

**1. Tema özgüllüğü.** Tema blokları `html[data-theme='light|dark|sepia']`
(0,1,1) yazılır. `:root` (0,1,0) ile eşit özgüllükte olursa **sonra yüklenen**
app.css kazanır ve tema sessizce çalışmaz. `tasarim` [2y] bunu denetler.

**2. Eski adlar temaya bağlı.** app.css `:root` içinde kendi adları var; her
tema bloğunda takma adlar tanımlı: `--navy→--ink`, `--navy2→--ink-2`,
`--blue→--accent`, `--muted→--ink-3`, `--pale→--surface-3`,
`--shadow→--shadow-md`. Yeni bir eski-ad kullanımı eklerken bunları kullanın.

**3. Durum renkleri TEK TABLO** (altın **yalnız** uyarı/gözlem):

| Rol | Zemin | Yazı | Nerede |
|---|---|---|---|
| Birincil (dolu) | `--accent` | `--accent-ink` | Onayla · Çal/Dinle · UDF · split no |
| Açık / seçili | `--accent-soft` | `--accent` | filtre · hız · analiz modu · takip |
| Çalıyor | `--green` | `--surface` | bölüm "Dinle" |
| Uyarı / gözlem | `--gold-soft` | `--gold` | gürültü/üst üste, uyarı kutuları |
| Nötr | `--surface-2` | `--ink-2` | temel düğme/çip |

**4. Punto ölçeği tek kaynak:** 11/12/14/15/17/20/25/30 (+mono 14, ikon 16/18).
Okuma katmanında **ham `font-size` yok**; deşifre metni **14 px**. Büyütme
kademeleri (large/xlarge) tabanı düşürmez.

**5. Yüzey/metin rengi token.** `app.css` içinde `paper`/`print` dışında
`background:#fff` yok; yüzeyler `--surface/2/3`, metin `--ink/2/3`.
Yeni kural yazarken ham hex kullanmayın (yalnız `tokens.css`).

**6. Tuval (dalga) renkleri temadan.** `themeVar(name, fallback)` ile okunur;
`applyTheme` içinde `__segWaveRedraw` + `renderAudioList` ile yeniden çizilir.
Spektrogram renk skalası bilinçli olarak tema bağımsızdır (veri görselleştirme).

**7. Kozmetik yerleşim.** Kartlar **içeriği kadar** uzar
(`align-items:start; flex-grow:0; flex-shrink:0`) — boş alan ve üst üste binme
yok. Tek panel iki bölge (v2.154): sabit başlık · esneyen metin · isteğe bağlı
teknik. Kırpma yasak: sığmayan öğe sarar.

### DENETİM YÖNTEMİ (bu oturumun en pahalı dersi)

Kullanıcı "siyah zemin/mavi yazı", "kahverengi zemin" gördü; ben **göremedim**.
Sebep: denetimlerim **temel durumu** ve **kontrastı** ölçüyordu; `.on`,
`.is-active`, `:hover` gibi **durum sınıflarını hiç çizmedim**. Ayrıca minified
CSS'te kural çok satıra yayıldığı için `grep` kaçırdı.

**Bundan sonra her tema/arayüz incelemesinde üç ölçüm zorunlu:**

1. **Durum matrisi** — bileşen × durum × tema; her hücre için fg/bg + kontrast.
   "Hangi kural kazanıyor?" sorusu **CDP `CSS.getMatchedStylesForNode`** ile
   sorulur (grep değil).
2. **Yüzey taraması** — koyu/sepia temada parlak zemin (`luminance > 0.6`) =
   hata. Rail öğeleri yanlış pozitif verir (zemin gradyan; elle ölçüldü:
   12.61 / 7.16 / 15.19).
3. **Metin kontrastı** — 4 görünüm × 3 tema, eşik 4.5.
4. **Gerçek tıklama + ekran görüntüsü** — durumları UI'dan aç (takip, hız,
   filtre, Dinle) ve **gözle** doğrula.

Tarayıcı denetimi için kısa tarif (geçici dosyalar iş bitince **silinir**):

```bash
python3 -m http.server 8790 &
/usr/bin/chromium --headless=new --no-sandbox --disable-gpu \
  --remote-debugging-port=9229 --user-data-dir=/tmp/akis-audit \
  --autoplay-policy=no-user-gesture-required about:blank &
# CDP: Runtime.evaluate ile ölç; IndexedDB: mihenk-pro-assets → state →
# anahtar 'mihenk.pro.cases.v1'; ses: 'audio' store, key '<caseId>::<materialId>'
```

### SIRADAKİ İŞLER (öncelik sırasıyla)

#### P1 — Senaryo ölçümü ve bilgi mimarisi (kullanıcının açık isteği)

Amaç: "gerçek kullanımda uygulama iş görüyor mu, hangi iş nerede olmalı?"
**Önce ölç, sonra yerleştir.**

- 5 senaryo, gerçek Chromium + gerçek WAV (`sample_data/audio/ses_01_…wav`):
  1. Yeni dosya + künye (kaç tık, kaç kaydırma)
  2. Ses ekle + teslim alma
  3. 10 bölüm deşifre yaz/onayla (odak kaybı, kaydırma)
  4. Rapor hazırlığı + UDF indir
  5. Paket oluştur → başka profile yükle
- Ölçütler: **tıklama**, **kaydırma sayısı**, **görünmeyen kontrol**,
  **odak kaybı**, **hata/toast**.
- Sonra IA kararı: sol ray gruplaması (Özet·Ses·İnceleme·Rapor), "Ayarlar"ın
  yeri (sağ çekmece), iş akışı sırası (künye → ses → sorular → rapor).
- Her karar **tek sürüm**; ölçüm tablosu CHANGELOG'a.

#### P2 — Rapor kâğıdının kurumsal biçimi

Kâğıt laciverti `#16324f` (v2.161). Derinleştirme adayları: başlık bandı,
sayfa numarası, imza bloğu, tablo başlık tipografisi. **Şart:** HTML önizleme,
DOCX ve UDF **aynı metni** üretmeli (`rapor-tutarlilik-testi`), uygulama adı
geçmemeli.

#### P3 — CSS borcu (kontrollü azaltma) — v2.170'te ilk adım atıldı

Nöbetçi eşikleri (v2.171): ölü bildirim **60** (okuma katmanı) / **500**
(app→layer), `!important` **26/55**, `.main-area` **15**, reading-layer kural
**825**. Borç **artırılamaz**; azaltma küçük ve kanıtlı adımlarla.

**v2.170'te ne yapıldı:** DOM'da hiç bulunmayan altı eski sınıfa
(`.seg-meta-row`, `.seg-times`, `.seg-text-wrap`, `.seg-actions`,
`.seg-obs-row`, `.seg-ops-row`) ait 18 kural silindi. Yöntem (tekrar
kullanılabilir):

1. Ölü sınıfı **DOM'da ölç** (malzemeli sayfa; `querySelectorAll` = 0) ve
   `app.js`'te üretilmediğini doğrula.
2. Kuralları **birebir metin eşleşmesiyle** sil (kendi ayrıştırıcısını yazma —
   v2.138'de yapı bozuldu; bu turda ilk denemede yorumlar seçiciye karıştı,
   geri alındı).
3. Birleşik (virgüllü) kuralları **önce** sil; yoksa "yetim seçici" kalır.
4. Parantez dengesi + "ölü sınıf kalmadı" kontrolü; geçmezse dosya yazılmaz.
5. **Kanıt:** 4 görünüm × 3 tema, tüm öğeler × 33 hesaplanan özellik →
   **0 fark** (araç: `/tmp` içinde, depoya girmez).
6. Nöbetçi testi ([2ag]) ve eşik düşürme.

**v2.171'de:** `#view-audio .seg-detail` aynı özellikleri yedi katmanda
yeniden tanımlıyordu; 12 ölü bildirim silindi. **Kanıt yöntemi (önemli):**
A/B fotoğrafı **aynı veri ve aynı kimliklerle** alınmalı — `reset` kimlikleri
değiştirdiği için ilk karşılaştırma 240 sahte fark üretti; doğrusu yalnız
sayfayı yenilemek (`Page.reload({ignoreCache:true})`).

Kalan borç: 60 ölü bildirim (katman içi) ve 500 (app→katman) — çoğu v2.50
öncesi yamaların katman tarafından ezilmesi. Azaltma aynı yöntemle sürer.

#### P4 — ≤900 px tek sütun IA (KAPANDI, v2.165 + v2.168)

Onay/dinle yapışkan çubukta (y=820–874, kaydırmasız). Bölüme geçince
düzenleme alanı görünür alana geliyor (metin 7.929 → 587 px). Masaüstünde
kaydırma yapılmıyor. Kalan tek sınır: ≤900 px'te liste ile metin aynı anda
görünmez (tek sütun) — bu tasarım kararı, kusur değil.

#### P5 — Ses görünümü: performans ve yoğunluk (KAPANDI, v2.172)

**Performans (gerçek Chromium, 100 bölüm):** yazma **0,21 ms/tuş** (p95 0,5),
uzun görev **0**; onay **13 ms** (boya 17 ms); görünüm geçişi **21 ms** senkron
/ 92 ms boya; rapor çizimi **2,4 ms** / 19 ms. Darboğaz **yok**.

**Yoğunluk:** 96 kontrol, 54 görünür (10'u bölüm satırı); 42'si sekme/Teknik
arkasında. Araç çubuğu 1280 px altında 2 satıra kırılıyor (62 → 87 px) —
depo kuralı gereği **sarma doğrudur**. Kanıtlanmış kusur yok; değiştirilmedi.

**Ölçüm sırasında bulunan gerçek kusur:** rapor önizlemesi 100 bölümde
**196 px'lik** kutuya sıkışıyordu (içerik 6.452 px). Sebep: `app.css`
`#view-report #reportPreview` (2,0,0) kuralı. **v2.172'de düzeltildi**
(kâğıt 6.438 px, tek kaydırma, yapışkan araç çubuğu).

#### P6 — Ekip çalışması / paket birleştirme (ÖLÇÜLDÜ, v2.173)

Gerçek Chromium'da uçtan uca ölçüldü (sahip → paket A → yardımcı → paket B →
sahip birleştirir). **Akış doğru çalışıyor:**

| Adım | Ölçüm |
|---|---|
| Sahip: 2 ekip üyesi + kimlik seçimi + 2 onaylı bölüm | paket A 2.109.241 bayt |
| Yardımcı: metni düzeltir | **öneri** oluşur (rozet), ana metin **değişmez** |
| Yardımcı: onay dener | **reddedilir** ("Onay yetkisi dosya sorumlusunda…") |
| Sahip: ⇄ Birleştir önizlemesi | "Alınacak ikinci göz önerisi **1**", "Değişecek kayıt 1" |
| Birleştirme sonrası | öneri geldi, ana metin korundu, onaylar korundu (2) |
| Sahip: öneriyi kabul | metin değişti, onay **1**'e düştü (doğru), yeniden onay → 2 |

**Ölçümde bulunan kusur (v2.173):** sahip ve yardımcı paketi **aynı dakikada**
üretilince iki dosya da `…_09-58.akis` adını alıyordu; tarayıcı " (1)" ekliyor,
hangi paketin kimden geldiği addan anlaşılmıyordu. Ad artık **saniye** taşıyor.

**ÖLÇÜM TUZAĞI (tekrar etmesin):** paket adı dakika hassasiyetindeyken
ölçüm betiği yanlış dosyayı seçti ve "birleştirme öneriyi aktarmıyor" gibi
**yanlış** bir sonuç verdi. Kural: indirilen dosyaları **benzersiz adlara
kopyalayıp** kullan (`A.akis` / `B.akis`); ada göre arama yapma.

#### P7 — Arşiv / kalıcı silme / kurtarma kopyası (ÖLÇÜLDÜ, v2.175)

Gerçek Chromium'da uçtan uca ölçüldü (2 dosya + 2 ses; arşivle → geri al →
yeniden arşivle → iki onayla sil → kurtarma kopyası).

| Adım | Sonuç |
|---|---|
| Arşivle | onay sorulmaz (yıkıcı değil), dosya seçiciden gizlenir, "Arşiv (1)", toast "SİLİNMEDİ" |
| Arşiv paneli | "↩ Geri al" + "Kalıcı sil"; geri alınca dosya döner, "Arşiv (0)" |
| Kalıcı sil | 1. onay (sesin gideceğini söyler) + **yazılı ifade** (dosya no); yanlış ifade → düğme kapalı + hata |
| Silme sonrası | yalnız o dosyanın ses blob'u silindi (**doğru dosya** doğrulandı), diğeri durdu |
| Son dosya arşivlenince | onay + **yeni boş çalışma alanı**; ses korunur |
| Son dosya silinince | yeni boş çalışma alanı; blob'lar boş |
| Kurtarma kopyası | yazma beklerken `pagehide` → `akis.lastSnapshot` (2.577 bayt); yalnız IndexedDB silinip yenilenince "1 dosyalık kurtarma kopyası var" → geri yüklendi |

**Ölçümde bulunan kusur (v2.174/v2.175):** sesi silinmiş kayıtta "ses yok"
uyarısı Teknik panelinin içindeydi (kapalı) ve **ilk çizimde** yazılmıyordu →
kullanıcı durumu hiç görmüyordu. Uyarı panel dışına alındı ve ilk çizimde de
tazeleniyor.

**AÇIK KONU (ölçüldü, DÜZELTİLMEDİ):** kalıcı silme sonrası Ctrl+Z kaydı
arşivde geri getiriyor; ancak **bellekteki object URL iptal edilmediği** için
ses, sayfa yenilenene kadar **çalınabiliyor** (ölçüm: `blob:` src, 47,7 sn;
yenilemeden sonra src boş). Yanıltıcı: kullanıcı sesi geri geldi sanabilir.
Sıradaki sürüm adayı: `purgeCaseById` içinde `URL.revokeObjectURL` + `objectUrls`
temizliği; test: purge sonrası `[data-audio-state]` uyarısı görünür, oynatıcıda
src yok.

#### P8 — Bölüm işlemleri: birleştirme güvenliği, satır menüsü, sürükleme (v2.176–v2.178)

**v2.176 — Birleştirme adli olarak eksiksiz.** Ölçüm: `mergeSegmentWithNext`
ikinci bölümün `asrText`/`words`/model bilgisini **siliyor**, delil günlüğüne
**yazmıyor**, farklı konuşmacıyı **sessizce** birleştiriyordu. Artık:

- `mergedFrom[]`: ikinci bölümün ham çıktısı (asrText/asrModel/asrAt/words/
  obs/review/proposal) saklanır; `asrText` üzerine YAZILMAZ.
- Kelime zamanları ve gözlem işaretleri birleşir.
- **Farklı konuşmacı reddedilir** (nedeni yazılır); **ikinci göz** birleştiremez.
- Birleştirme ve bölme `logEvent` ile günlüğe yazılır.
- Test: `birim` [67] (13 kontrol) + `sema` (geri alma kaydı `splice`'ten ÖNCE —
  mesafe tabanlı kontrol **davranışa** çevrildi).

**v2.177 — Satır menüsü.** Her satırda **⋮** (ve sağ tık) menüsü: birleştir ·
oynatıcı konumundan böl · aralığı çözümle · metin geçmişi · sessizlik ölç ·
sil. Menü öğeleri **mevcut `data-*` işleyicilerini** kullanır (yeni mantık yok).
Detaydaki "Diğer işlemler" katlaması kaldırıldı. Ölçüm: görünür kontrol
54 → **47**, birleştirme 3 → **2** etkileşim, satır 72 px (aynı).

**v2.178 — Sürükleyerek birleştirme.** Satırdaki **⋮⋮** tutamağı, **komşu**
satıra bırakılınca birleştirir; hedef kesikli çerçeveyle vurgulanır.

**DEĞİŞMEZ KURALLAR (sürükleme):**
1. Yalnız **tutamaktan** sürüklenir (metin seçimi/kaydırma çakışmaz).
2. Yalnız **komşu** satır hedeftir; uzak satır sessizce reddedilir.
3. Filtre **"Tümü" değilse kapalıdır**: filtreli listede komşu görünen satırlar
   gerçekte komşu olmayabilir; kapalıyken neden söylenir.
4. Sürükleme **hızlandırıcıdır**: **M** tuşu ve **⋮ menüsü** korunur
   (erişilebilirlik; sürükleme tek yol olamaz).
5. Birleştirme kuralları tek yerde: `mergeSegmentWithNext`.

**ÖLÇÜM:** komşu sürükleme 3 → 2 satır (metin birleşti, vurgu göründü);
komşu olmayan → vurgu yok, değişiklik yok, toast yok; filtreli → reddedildi;
satır 72 → **74 px**; kırpılma/yatay taşma yok; hata 0.

**ÖLÇÜM TUZAĞI:** `#toast` gizlense de **metni kalır**; `textContent` ile
okumak eski mesajı "yeni uyarı" sanmanıza yol açar. Toast'ı
`classList.contains('show')` ile birlikte okuyun.

#### P9 — Detay paneli: içerik ezer, panel kaydırır (v2.179)

**ÖLÇÜM (1440×900, gerçek Chromium):** Teknik paneli açıkken (360 px) canlı
vurgu şeridi **48 → 14 px** (scroll 30 / görünen 12), metin alanı **448 →
120 px**'e eziliyordu. Araya bir satır (notlar, "ses yok" uyarısı, öneri bandı,
ölçüm sonucu) girdiğinde aynı ezilme oluyordu.

**KÖK NEDEN:** `.sd-body`/`.sd-right` `min-height: 0` ile esniyor ve metin
alanının masaüstü tabanı **120 px**'ti; flex çocukları içeriklerinin altına
inebiliyordu. `sd-head` ile `sd-body` arasına giren her satır kalan yüksekliği
azalttığı için vurgu şeridi ilk ezilen öğeydi.

**KURAL (değişmez):** çocuklar **içeriğinden aşağı inmez**; sığmazsa **panel
kaydırır** (v2.143'te panelde kaydırma zaten var).

- `.sd-follow`: `flex: 0 0 auto` + `min-height: calc(2*1.5em+12px)` (48 px)
- metin alanı: `min-height: 160px` (masaüstü)
- `.sd-body` / `.sd-right`: `min-height: 236px`

**ÖLÇÜM (sonra):** Teknik açık → vurgu **48**, metin **160**, panel **81 px**
kaydırıyor; 900 px'te vurgu 48 / metin 180; kırpılma ve yatay taşma yok;
JS hatası 0. Ezilen eski bildirimler (`min-height:0`, `120px`) silindi; CSS
borcu artmadı.

**DERS:** "Panelde kaydırma olmasın" hedefi (v2.154) ile "öğe ezilmesin"
çelişirse doğru çözüm **ezmek değil, kaydırmaktır**. Ölçüt: her öğenin
`getBoundingClientRect().height` değeri, durum değişince (Teknik aç/kapa,
ölçüm yap, not çık) **aynı kalıyor mu**. Gözle bakmak yetmez; ölçün.

#### P10 — Bilgi mimarisi: analiz ≠ düzenleme (v2.180)

**ÖLÇÜM (1440×900):** Teknik paneli açıkken (360 px) **konuşmacı+kontrol y=822**,
**gözlem düğmeleri y=884**; panel 248–827 → **kaydırmadan erişilemiyordu**.

**AYRIM (değişmez):**
| Bölge | Ne taşır |
|---|---|
| Başlık (sabit) | bölüm no, gezinme, dinle, onayla, kontrol durumu düğmeleri, Teknik anahtarı |
| **Düzenleme bilgisi** (her zaman görünür) | **konuşmacı** ve **kontrol** seçimleri (+ belirsiz okuma paneli, profil) |
| Metin bölgesi | canlı vurgu, metin, quick-insert, **gözlem düğmeleri** |
| **Teknik** (istenince) | dalga/spektrogram, zamanlar, seviye/sessizlik/perde ölçümleri |

Kural: **analiz** (ölçüm/görselleştirme) ile **düzenleme** (konuşmacı, kontrol,
gözlem) ayrı bölgede durur. Düzenleme bilgisi bir katlama/panel arkasına
konmaz; çünkü her bölümde kullanılır.

**ÖLÇÜM (sonra):** meta y=303, gözlem y=642 — panel içinde; metin 160 (Teknik
açık) / 371 (kapalı); vurgu 48; panel kaydırması 81 → **55 px**; hata 0.

**DERS:** Bir alanı "Teknik" gibi bir katlamaya koyarken soru şu olmalı:
*"Bu bilgi her bölümde, yazarken gerekli mi?"* Evet ise katlanamaz. Ayrıca
ölçümü **en kötü içerikle** yapın (notlar + ASR kökeni + Teknik açık); temiz
durumda sorun görünmez (v2.179'da quick-insert'in kaybolması bu yüzden
kaçmıştı).

#### P11 — Köken bilgisi analizdir (v2.181)

**ÖLÇÜM (v2.180):** "Otomatik çözümleme çıktısı (model … · tarih)" bloğu metin
alanının üstündeydi (~30 px katlanmış). Notlarla birleşince metin bölgesi
aşağı itiliyor, quick-insert görünür alandan çıkabiliyordu.

**KURAL:** **köken/provenans** (hangi model, ne zaman, ham çıktı) **analizdir**
→ Teknik panelinde. Metin bölgesinde yalnız **tek satır ipucu** kalır:
"Model çıktısı farklı — karşılaştır (Teknik)"; tıklayınca Teknik açılır, blok
açılır ve `scrollIntoView` ile panel içinde gösterilir.

- `asrDiffers(s)` tek kaynak: ham çıktı metinden farklı mı (hem blok hem ipucu
  bunu kullanır).
- Notlarda **tekrar eden** bilgi olmaz: "öncelik" satırı notlardan kaldırıldı;
  aynı bilgi listedeki **Öncelik** rozetinde (gerekçe `title`'da) durur.

**ÖLÇÜM (sonra):** metin alanı 371 → **344 px** (ipucu görünürken); blok
Teknik'te; ipucuya tıklayınca model adı + tarih + ham metin **panel içinde**;
JS hatası 0.

**DERS:** Aynı bilgiyi iki yerde göstermek (not + rozet) yükseklik yer ve
dikkat dağıtır. "Bu bilgi nerede kullanılır?" sorusu: **yazarken** → metin
bölgesi; **incelerken** → Teknik; **listede tararken** → rozet.

#### P12 — Dikey yer: etiket satır içi, uyarı tek satır (v2.182)

**ÖLÇÜM (1440×900):** `.sd-field` `flex-direction: column` olduğu için
"Konuşmacı"/"Kontrol" etiketleri seçimin **üstünde** duruyordu; her alan 57 px,
meta satırı **63 px**. "Ses yok" uyarısı uzun metinle **47 px** (2 satır).

**YAPILAN:**
- Etiketler **satır içi**; Konuşmacı/Kontrol görsel etiketi kaldırıldı →
  `aria-label` + `title` (değerler kendini anlatıyor: "S1 · Konuşmacı 1",
  "Kontrol bekliyor").
- Profil kısa etiketiyle aynı satırda; seçim genişlikleri **sınırlı**
  (`min/max-width`) ki üç alan tek satıra sığsın.
- `audioStateText` kısaldı ("Ses dosyası yok — paketten yükle");
  tam açıklama `audioStateHint` ile `title`'da.
- **Metin alanı 160 px (6,7 satır) KORUNDU** — gerekçe: 80 px = **3,4 satır**,
  bir cümle + yarım satır; deşifre alanı en çok yazılan yer (v2.50 kuralı).

**ÖLÇÜM (sonra):** meta **40 px** (1 satır), ses yok **31 px**, metin 160 px,
Teknik açık kaydırma **84 → 63 px**; 900 px'te meta 40 px ve yatay taşma yok;
JS hatası 0.

**DERS:**
1. Etiketi **kaldırmak** dikey yer kazandırmaz; **satır içi yapmak** kazandırır
   (kaldırmak yalnız yatay kazanç verir, görünür etiket erişilebilirlik için
   değerlidir).
2. Genişlik sınırsız bırakılırsa alanlar büyür ve satır **yine sarar** (ilk
   denemede meta 67 px oldu); `min/max-width` ile tek satıra sabitlenir.
3. Uzun uyarı metni 2 satıra sarar; **kısa metin + `title`** hem yeri korur hem
   bilgiyi kaybetmez.

#### P13 — Başlıkta birleşik işlem satırı (v2.183)

**ÖLÇÜM (1440×900):** başlıkta **üç düğme** (Onayla / Yeniden dinle /
Anlaşılmadı) vardı; **hemen altındaki Kontrol seçicisi** aynı üç durumu
taşıyordu. Konuşmacı seçicisi ayrı satırdaydı. Üst bölge **76 px** (1440),
**78 px** (900), 1100'de **128 px**.

**YAPILAN:**
- Yeniden dinle + Anlaşılmadı düğmeleri **kaldırıldı** → durum tek kaynak:
  Kontrol seçicisi.
- Onayla **ikon**: `✓` + `aria-label`/`title` (Enter kısayolu aynı). Onay,
  "durum" değil **eylem**dir (sonraki bölüme geçer); bu yüzden seçicide değil,
  ikon olarak kalır.
- Konuşmacı + Kontrol **başlıkta**; etiketler `aria-label`/`title`'da.
- Profil → **Teknik** (köken bilgisi).
- Boş `.sd-meta` **çizilmez**; yalnız belirsiz okuma paneli gerektiğinde çizilir.
- `.sd-primary { margin-left: auto }` **sıfırlandı**: 66,25 px yer kaplayıp
  satırı taşırıyordu.
- `gap: 4px`, seçici `max-width: 96px` → 1440'ta **tek satır**.

**ÖLÇÜM (sonra):** üst bölge **42 px** (1440), 79 px (1280), 73 px (1100),
**42 px** (900); metin alanı 160 px (900'de 180); yatay taşma yok; hata 0.
Seçici gerçekten çalışıyor: "Anlaşılmadı" → rozet + `st-inaudible` + %100.

**DERS:**
1. Aynı durumu iki denetimle sunmak (3 düğme + seçici) yer **ve dikkat
   kaybıdır**; **durum** seçicide, **eylem** ikonda olmalı.
2. `margin-left: auto` gibi görünmez boşluklar satırı taşırır; ölçümde
   çocukların **margin**'lerini de oku (`getComputedStyle(el).marginLeft`).
3. Etiket kaldırmak yalnız `aria-label`/`title` ile kabul edilebilir; ekran
   okuyucu ve fare ipucu bilgiyi taşımaya devam etmeli.

#### P14 — Durum bilgisi: tek satır, her zaman görünür (v2.184)

**KULLANICI KURALI (değişmez):** *"Gizli bir şey olmasın, yeri dursun, ne işe
yaradığı ekranda yazsın."*

**ÖLÇÜM (v2.183):** aynı dikey alanda **üç ayrı şerit** vardı ve her biri başka
koşulda çıkıyordu: `sd-audio-state` (31 px), `sd-notes` (19 px — bazı
bölümlerde **boş**, çünkü "öncelik" koşulda sayılıp ekranda çizilmiyordu),
`asr-hint` (19 px).

**YAPILAN:** üçü tek `sd-status` satırında toplandı.
- Satır **koşulsuz** çizilir; en az **"Ses: hazır"** / **"Ses: yok — paketten
  yükle"** çipi vardır. `min-height` ile yükseklik sabit → **zıplama yok**.
- Sorun çipleri: `Anlamlı metin yok` · `Model tekrarı` · `Sessizlik %N` ·
  `Model çıktısı farklı — karşılaştır` (tıklanır → Teknik).
- **Etiketler ekranda:** "Konuşmacı", "Kontrol", "✓ Onayla" (yalnız ikon
  değil). Başlık **bilinçli iki satır** (77 px) — gizemli sarma yok.
- Eski üç öğenin CSS'i ve boş kalan "öncelik" koşulu silindi.

**ÖLÇÜM (sonra):** durum satırı **üç durumda da 28 px** (normal / boş metin /
ses yok); boş şerit yok; metin alanı **359 px**; JS hatası 0.
**Bedel:** üst bölge 42 → **77 px** (etiketler ve "Onayla" yazısı görünür).
Bu turda kullanıcı **alan yerine açıklığı** seçti.

**DERS:** Bir bilgi "bazen" görünüyorsa kullanıcı onu **kayıp** sayar. Durum
bilgisi ya **hep** görünür olmalı ya da hiç olmamalı; arada kalan "koşullu
şerit" hem yerleşimi oynatır hem güveni sarsar. Ayrıca bir bilgiyi ekrandan
kaldırıp yalnız `title`'a koymak, o bilgiyi **gizlemek**tir (kullanıcı
"tooltip'i kaldır, ekranda yaz" dedi).

#### P15 — Liste dizindir, metin tek yerde (v2.185)

**KULLANICI:** *"Segmente neden metin gösteriyoruz? Neden bunu detayda da
gösteriyoruz? Segment kısmını biraz küçültürsün."*

**ÖLÇÜM (v2.184, 1440×900):** satır **74 px**; bölüm metni **hem listede hem
editörde** vardı. Aynı veriyi iki yerde tutmak hem yer kaplar hem bakım yükü
doğurur (metin değişince iki yerin tutarlı kalması gerekir).

**KURAL:** **Liste = dizin** (numara · başlangıç–bitiş · rozetler). **Metin tek
kaynak: editör.** Metin, satırın `title` ipucunda yardımcı olarak durur.

**YAPILAN:** `.seg-text` satırdan kaldırıldı; ızgara 3 sütuna indi
(`20px 96px auto`); 4 sütunlu eski tanımlar (4 adet) silindi; rozetler sola
hizalandı; rozet kırpması yok (v2.130 korunuyor).

**ÖLÇÜM (sonra):** satır **50 px** (1440/1280/900), 1100'de **66 px**
(rozetler iki satıra sarar — kırpma değil); rozetler görünür; yatay taşma yok;
JS hatası 0.

**DERS:** Liste bir **dizin**tir, belge değildir. Belgeyi (metni) liste ve
editör olmak üzere iki yerde göstermek "aynı veri tek yerde" kuralını bozar;
ayrıca satır yüksekliğini iki katına çıkarır. İçerik editörde, dizin listede.

#### P16 — Liste tek satır; Teknik düğmesi kalktı (v2.186)

**KULLANICI:** *"Liste dağınık; iki satır mı tek satır mı belli değil. Tek satır
yap, hizala, başlangıç ve bitişi yan yana koy. Teknik düğmesine de gerek
kalmadı."*

**LİSTE (ölçüm):** satır 50 → **34 px**, dört genişlikte de **aynı** (hizalı).
- Başlangıç–bitiş **yan yana**; listede **kısa saat** (`00:00:12`), **ms
  detayda** (düzenlenebilir girdiler). Liste dizindir; ms sütunu taşırıyordu.
- Öncelik rozeti satırdan çıktı → **detayın Durum satırında** çip.
- Dar listelerde **ikincil** öğe çıkar: ≤1280 konuşmacı rozeti (satır ipucunda
  ve detayda var), 901–1200 `⋮` + tutamak (sağ tık aynı menü). **Durum rozeti
  asla çıkmaz** (v2.130).

**TEKNİK:** düğme ve `techOpen` tercihi **kaldırıldı**; analiz (dalga/spek,
zamanlar, profil, ASR kökeni) **her zaman görünür** ve **metnin ALTINDA**
(`order`). Metin tabanı **260 px**; sığmazsa **panel kaydırır** (141 px).

**DÜRÜST BEDEL:** metin alanı 359 → **260 px** (−99), panel kaydırma 0 → **141
px**. Düğme geri istenirse metin yeniden 359 olur.

**DERS:**
1. Liste sütunu **sandığınızdan dar** olabilir: 1440'ta 409 px, 1280'de 348,
   1100'de **300**. Tek satır garantisi için ikincil öğeyi çıkarmak gerekir.
2. Bir düğmeyi kaldırmak "gizli bilgi" bırakabilir: analiz artık gizlenmiyor
   ama **yazma alanı küçülüyor**. Bedel ölçülüp yazılmalı; sessizce kabul
   edilmemeli.
3. Kısa biçim (ms'siz saat) **listede**, tam biçim **detayda**: aynı veri, iki
   farklı çözünürlük — dizin ile belge ayrımının doğal sonucu.

#### P17 — Liste sağa yaslı; onay eylemi menüde (v2.187)

**KULLANICI:** *"Liste kocaman görünüyor; `st-approved` kısmını sağa yasasan
daha düzgün olmaz mı? Listede başka bir şey var mı? Detaydaki Onayla düğmesine
gerek var mı? Zaten açılır listede bu seçenekler var."*

**YAPILAN:**
- Rozetler **sağa yaslı**; **durum rozeti en sağda** (sağ kenardan 8 px).
  Satırda yalnız: numara · zaman · (⚠) · (konuşmacı) · (öneri) · ⋮⋮ · ⋮ · durum.
- **"✓ Onayla" düğmesi başlıktan kaldırıldı.** Onay bir **eylem**dir (sonraki
  bölüme geçer); **durum** seçicide (`Onaylandı`) durur. Eylem iki yerde
  görünür kalır: **satır menüsü** ("✓ Onayla (sonrakine geç)") ve **Enter**.
- Satır kırma öğesi kaldırıldı; başlık 900 px'te tek satıra indi.

**ÖLÇÜM:** satır **34 px** (1440/1280/1100/900), durum rozeti sağdan **8 px**,
kırpılma/yatay taşma yok; başlık **78 px** (≥1100, iki satır) / **42 px** (900).

**DERS:** "Aynı işi yapan iki denetim" sorunu düğme tarafında da geçerli:
Onayla düğmesi **durum** değil **eylem** taşıyordu, ama seçicideki `Onaylandı`
ile karışıyordu. Çözüm: **durum seçicide, eylem menüde** — ve eylemi yalnız
klavyeye bırakmamak (menüde görünür).

#### P18 — Metin kutusu: tek kutu, dört köşe (v2.188)

**KULLANICI:** *"Vurguyu text box içinde yaptır; quick-insert'leri buton olarak
yapmayalım, textbox alanına koyalım; sd-obs'u text box içine sol alt köşeye
koy; model çıktısını sağ üst köşeye koy; Profil'i sil; 'Henüz çözümlenmedi'
kısmını Durum'a koy."*

**YAPILAN:**
- `.sd-follow` şeridi kaldırıldı. Vurgu, textarea'nın arkasındaki saydam
  `.sd-hl` katmanında: aynı punto (14), satır aralığı (1.7), dolgu (8×10).
  Genişlik/yükseklik JS ile `textarea.clientWidth/clientHeight`'tan verilir.
- Metin alanı **içeriği kadar büyür** (`autoGrowTextarea`), iç kaydırma yok →
  vurgu hizası kaymaz; sığmazsa panel kayar.
- `.sd-obs` kutunun **alt solunda**, "+ Hızlı ekle" menüsü **alt sağında**,
  "Model çıktısı" düğmesi **sağ üstünde** (açılır kutu).
- Profil alanı silindi; "Henüz çözümlenmedi" **Durum** satırına taşındı.

**ÖLÇÜM (gerçek Chromium + gerçek WAV):** vurgu katmanı `scrollHeight` 611 =
textarea 611; genişlik 582 = 582; t=1,08 "mi?", t=1,73 ikinci "Ali". Uzun metin
587 px'e büyür (kırpılmaz). 1440/1280/1100/900/760/600 → kırpılan 0, yatay
taşma 0. Hızlı ekle menüsü 340×64 tam görünür. JS hatası 0.

**DERS:** `<textarea>` içine HTML yazılamaz; vurgu ancak arkasına konan AYNI
ölçülü saydam katmanla metnin içinde gösterilebilir. İki katmanın puntoyu,
satır aralığını, dolguyu ve GENİŞLİĞİ paylaşması şarttır — genişlik
`clientWidth`'tan verilmezse kaydırma çubuğu farkı kelimeyi kaydırır. Ayrıca
textarea kendi içinde kayarsa katman hizada kalamaz: alan içeriği kadar
büyümeli, kaydırma panelde olmalıdır.

**Koruyan test:** `birim` [68] + `tasarim` [2f]/[2s]/[2al]/[2am]/[2an]/[2ao].

#### P19 — Zamanlar dalganın üstünde (v2.189)

**KULLANICI:** *"sd-canvas-wrap kısmına da üzerine gelecek şekilde hafif şeffaf
sol alt taraf time-input (Başlangıç — ortaya Süre — sağ alt Bitiş) taşı."*

**YAPILAN:** `.sd-times` bloğu `.sd-canvas-wrap` içine taşındı ve
`sd-times-overlay` sınıfıyla alt kenara yarı saydam şerit olarak bindirildi.
Sıra: Başlangıç (sol) → Süre (orta) → Bitiş (sağ). Şerit `pointer-events:none`,
yalnız `input`lar `auto` → dalga sürükleme/zoom bozulmaz.

**ÖLÇÜM:** şerit 46 px / kanvas 160 px; 1440→600 kırpılma 0, yatay taşma 0;
`elementFromPoint` şerit ortasında `sd-spec-canvas` döndü (tıklama geçiyor);
input odaklanıyor (height 24). JS hatası 0.

**DERS:** Bindirilmiş bir araç şeridi, altındaki tuvalin etkileşimini
YUTMAMALIDIR. `pointer-events:none` + yalnız etkileşimli çocukta `auto`
deseni bunu sağlar. Ayrıca form alanlarının `min-height` tabanı (32 px) şeridi
şişirir; kompakt şeritte açıkça düşürülür (24 px).

**Koruyan test:** `tasarim` [2u] + [2t].

#### P20 — Dalga menüleri görünür; metin dalgaya binmiyor (v2.190)

**KULLANICI:** *"Yalnız wave kısmındaki menüler kaybolmuş; her şey görünüyor mu,
orası biraz karışmış."*

**ÖLÇÜLEN İKİ HATA:**
1. `.sd-wave-tools` tek satır + `overflow-x:auto` + gizli kaydırma çubuğuydu.
   1100 px'te araç satırı **470 px**, kap **372 px** → "Dalga / Spek / İkisi"
   düğmeleri **görünmüyordu** (sessiz kesme).
2. v2.188 autoGrow sonrası `.sd-body/.sd-right/.sd-text` hâlâ `flex:1 1 auto`
   idi; metin kabuğa sığmayıp **dalga çubuğunun üstüne** biniyordu
   (metin 349–745, dalga 595'te başlıyordu).

**DÜZELTME:** gövde/sağ sütun/metin `flex:0 0 auto` (içeriğe göre büyür, panel
kayar); `.sd-wave-tools { flex-wrap: wrap; overflow: visible }`; `.sd-view-modes`
birlikte kalır; ipucu kısaltıldı + tam metin `title`'da; "🔁"/"✂" tofu
simgeleri metinden çıkarıldı.

**ÖLÇÜM:** metin 751 / dalga 759 (**çakışma yok**); 1100 px'te gizli düğme **0**,
araç satırı 372/372; 600 px'te gizli 0; ipucu kesiği 0; yatay taşma 0; JS
hatası 0.

**DERS:** `overflow-x:auto` + gizli kaydırma çubuğu, dar ekranda düğmeleri
GÖRÜNMEZ yapar — bu sessiz kesmedir; çözüm **sarmaktır**. Ayrıca bir esnek
kabukta (`flex:1 1 auto`) içeriği büyüyen bir alan, kabuğu taşıp ALTTAKİ
bölümün üstüne biner; böyle yerlerde `flex:0 0 auto` + panel kaydırması doğru
mimaridir.

**Koruyan test:** `tasarim` [2aq].

#### P21 — Sağ panel kaymıyor; metin kendi içinde kayıyor (v2.191)

**KULLANICI:** *"E alan çok yüksek olmamış mı? Scroll çıkıyor gereksiz yere;
birazcık daha wave yukarıda duramaz mı ya da eşit? Bölüm listesiyle çalışırken
sağ menüyü scroll yapmayalım."*

**DÜZELTME:** `.sd-body/.sd-right/.sd-text/.sd-editor/.sd-ta-wrap` `flex:1` +
`min-height:0`; textarea `flex:1`, **min-height 120 px**, `overflow-y:auto`.
Vurgu katmanı `syncHighlightLayer` ile `clientWidth/clientHeight` ve `scrollTop`
eşlenir. v2.179'un 236 px tabanı KALDIRILDI (paneli gereksiz kaydırıyordu).

**ÖLÇÜM:** 1440/1280/1100/900/760 → panel `scrollHeight == clientHeight`
(kayma **0**), dalga çubuğu panel içinde. Textarea iç scroll: 468/563/778 px
içerik. Vurgu `scrollTop` 120 = 120, yükseklik 142 = 142. JS hatası 0.

**DERS:** Bir esnek kabukta metin alanı sınırsız büyürse panel kayar. Doğru
çözüm: alan kalan yüksekliği alsın, **kendi içinde kaysın**; vurgu katmanı da
`scrollTop` ile eşlensin. Böylece hem panel sabit kalır hem vurgu hizası korunur.

**Koruyan test:** `tasarim` [2aq]/[2u]/[2al]/[2v].

#### P22 — Konuşmacı silme ve rapor filtresi (v2.192)

**KULLANICI:** *"Bölümde konuşmacı seçilmedi yapıyorum ama raporda ve ses
dosyasında yine görünüyor; bunları silemiyor muyuz?"*

**KÖK:** `ensureSpeakers` segment etiketlerinden kayıt üretir; atama kaldırılınca
kayıt SİLİNMİYORDU ve `speakerRows` TÜM kayıtları listeliyordu. `Konuşmacı 1`
elle bölüm eklenince oluşur; K/E/S1/S2 eski etiketlerdir. ASR konuşmacı tespiti
YAPMAZ.

**DÜZELTME:** `speakerRows` yalnız `speakerSegments(m,sp).length > 0` olanları
yazar (özet sayacı da aynı). `speakerSegments` isim VE `speakerId` ile eşleşir.
Panelde `data-del-spk` (Sil) + `data-clean-spk` (Kullanılmayanları temizle);
`removeSpeaker` atanmış bölümlerin `speaker`/`speakerId` alanlarını temizler,
ses/metne dokunmaz, günlüğe yazar.

**ÖLÇÜM (gerçek Chromium):** 5 atanmamış konuşmacı → rapor 0 satır, panel 5 kart;
tek tek Sil → 4; temizle → 0; metinler korundu; JS hatası 0.

**DERS:** "Atamayı kaldır" ≠ "kaydı sil". Rapor, kayıt listesini değil GERÇEKTEN
ATANMIŞ konuşmacıları göstermelidir. Silme sessiz olmamalı: ne silineceğini,
ses/metnin korunacağını ve atanmış bölümlerin ne olacağını söylemeli.

**Koruyan test:** `birim` [69] + `tasarim` [2ar].

#### P23 — Birleştirme sonrası kaydırma + metin önizlemesi (v2.193)

**KULLANICI:** *"Birleştirme yaptıktan sonra sayfa başa geliyor. Ayrıca listeden
kaldırdığımız, yalnız ipucunda gösterdiğimiz metin başlıkları birleştirme/bölme
sırasında satırları ayırt etmeyi zorlaştırıyor; geri getirilsin."*

**DÜZELTME:**
- `captureSegScroll(m)` + `restoreSegScroll(m, st, focusIndex)`: liste, detay,
  `.main-area` ve `window` kaydırması yapısal işlem sonrası geri yüklenir;
  birleşen/odak satır `scrollListToItem` ile görünür tutulur. `scrollIntoView`
  KALDIRILDI (sayfayı da kaydırıyordu). Birleştirme/bölme/paragraf kullanır.
- `segItemHtml`: `.seg-text-preview` tek satır önizleme (grid ikinci satır);
  tam metin `title` ve editörde. Boş metin "—". Satır 34 → **50 px**.

**ÖLÇÜM (gerçek Chromium, 30 bölüm):** liste scrollTop 800 → **704** (başa
dönme yok, birleşen satır görünür); `.main-area`/window 0 → 0; satır 50 px;
JS hatası 0.

**DERS:** `renderSegments` DOM'u yeniden kurduğunda `scrollTop` sıfırlanır.
Yapısal işlemlerden sonra kaydırmayı AÇIKÇA yakala/geri yükle; `scrollIntoView`
kullanma (üst kapları da kaydırır). Liste dizin kalsa da birleştirme/bölme için
tek satır metin önizlemesi gerekli: kullanıcı satırları metinden ayırt eder.

**Koruyan test:** `tasarim` [2ap] + [2as].

#### P24 — "Paragraf / türetilmiş görünüm" konusu (v2.195 ile TAMAMLANDI)

**SORU (2026-11-21):** "Paragraf/türetilmiş görünüm konusu diye bir konu var
mıydı?"

**DURUM (v2.195):** Konu **tamamlandı**. Eski yıkıcı `paragraphize` KALDIRILDI.
¶ düğmesi artık `openParagraphView` ile **salt-okunur paragraf görünümü** açar:
`paragraphGroups` aynı konuşmacının ardışık bölümlerini gruplar; `m.segments`
DEĞİŞMEZ. Kanıt tablosu ve cümle zamanları aynen kalır. Diyalogda konuşmacı,
zaman aralığı, bölüm sayısı, metin ve "1–3 cümle veya 15–30 sn" standardı
görünür; "Panoya kopyala" vardır.

**AYRIM (korunur):** Paragraf **görünümü** veriyi DEĞİŞTİRMEZ; yalnız gösterir.
Raporun kanıt tablosu bölümlerden gelir.

**AÇIK KONU:** Paragraf/okuma metnini **rapora ayrı bölüm** olarak eklemek
(HTML/DOCX/UDF) henüz YAPILMADI. Görünüm var; rapor entegrasyonu ayrı konu.

**KARARLAR VE TERİM SÖZLÜĞÜ (2026-11-21, kullanıcıyla netleşti):**

- **Bölüm** = arayüzde ve raporda kullanılan terim (teknik adı `segment`).
  Kullanıcıya/rapora "pencere" denmez.
- **Zaman penceresi** = yalnız ASR'nin 30 sn'lik teknik dilimi
  (`ASR_WINDOW_SECONDS = 30`). Kullanıcı bunu ayarlayamaz; bölüm uzunluğunu
  **birleştirme** ile uzman belirler.
- **Paragraf / okuma metni** = bölümlerden türetilen, salt-okunur okuma biçimi
  (v2.195: ¶ düğmesiyle açılır; veriyi değiştirmez).
- **Ayrıntılı (zaman damgalı) bölüm tablosu** = kanıt. "Granüler" yerine bu
  Türkçe ifade kullanılır.
- **Birleştirme kuralı:** yalnız komşu ve AYNI konuşmacı; hedef **1–3 cümle
  veya ~15–30 sn**. 5 dakikalık tek satır YASAK. Konuşmacı değişiminde
  birleştirme yok (kod engeller).
- **¶ (Paragraf görünümü):** v2.195'ten itibaren **SALT OKUNUR**; bölümleri
  DEĞİŞTİRMEZ. Aynı konuşmacının ardışık bölümlerini okuma paragrafı olarak
  gruplar; kanıt tablosu ve cümle zamanları korunur. Eski yıkıcı "Paragraf
  oluştur" kaldırıldı.
- **Otomatik geçiş:** ilk tarama için; **son doğrulamada manuel**. "Onaydan
  sonra sonraki bekleyene geç" tercihi (varsayılan kapalı) daha güvenli.
- **Konuşmacı:** model **diarization YAPMAZ**; etiketler uzmandan. Kodlar
  **kayıt başınadır**: 1. dosyadaki S1 ile 2. dosyadaki S1 aynı kişi
  DEĞİLDİR; aynı kişi ise aynı ETİKET adı kullanılmalı ve rapora not
  düşülmelidir. Müzik/gürültü/telefon konuşmacı DEĞİLDİR; gözlem/etiket
  olarak yazılır.
- **Rapor yöntemi:** ASR aracı dürüstçe yazılır (yerel, açık kaynak Whisper
  tabanlı model + sürüm). "Konuşmacı ayrıştırma / kaynak ayırma yaptık"
  DENMEZ. Uygulama adı yazılmaz (v2.83 kuralı).
- **Geri alma:** 20 işlem, bellek içi; sayfa yenileme/tarayıcı kapanışı
  geçmişi temizler. Riskli toplu işlemden önce **paket** alınır.
- **LLM:** doğrulanmış metni yalnız biçimlendirme için kullanmak dışında ham
  ses/metin LLM'e verilmez; uydurma riski ve veri koruma nedeniyle.

#### P25 — Yeniden çözümleme sonrası kaydırma (v2.194)

**KULLANICI:** *"Çözümleye bastığımda bölüm listesi yenileniyor; kullanım
deneyimini etkiliyor."*

**KÖK:** `retranscribeSegment` sonunda `renderAudioList()` kartı yeniden
kuruyordu; v2.193 koruması yalnız birleştirme/bölme/paragraf yolundaydı.

**DÜZELTME:** işlem öncesi `captureSegScroll(m)`, `await renderAudioList()`
sonrası `restoreSegScroll(m, scroll, index)`.

**Koruyan test:** `tasarim` [2at].

#### P26 — Paragraf görünümü salt okunur (v2.195)

**KULLANICI:** *"Salt-okunur paragraf görünümü yapalım. ¶ bölümleri
değiştiriyordu; cümle zamanları kayboluyordu."*

**YAPILAN:**
- `paragraphize` (yıkıcı) KALDIRILDI. Yerine `paragraphGroups(segments)` saf
  gruplama ve `openParagraphView(m)` salt-okunur diyalog geldi.
- ¶ düğmesi `#paragraphDialog` açar: konuşmacı · zaman · bölüm sayısı · metin;
  "kontrol bekliyor" uyarısı; "Panoya kopyala".
- Pencere içinde standart yazılı: **1–3 cümle veya 15–30 sn**.
- Hızlı ekle'ye `[telefonda konuşma]` eklendi.
- `docs/STANDARTLAR.md` eklendi (terimler, bölüm uzunluğu, konuşmacı,
  rapor yöntemi, gözlemler, geri alma, LLM politikası).

**ÖLÇÜM (gerçek Chromium):** ¶ öncesi/sonrası bölüm sayısı **6 → 6**
(değişmedi); **3** paragraf grubu; grup metinleri birleşik; kopyalama metni
doğru; JS hatası 0.

**DERS:** "Paragraf" bir SUNUMdur, kanıt değil. Görünüm veriyi değiştirirse
kanıt tablosu kabalaşır ve cümle zamanları kaybolur. Salt-okunur türetme,
kanıtı korurken okunabilirlik sağlar.

**Koruyan test:** `birim` [7b]/[28], `sema`, `tasarim` [2au].

#### P27 — Hızlı karar şeridi (v2.196)

**KULLANICI:** *"Dinle → Kontrol → en sola dön turu yavaş. Kontrol'ü Play'in
yanına koysak? Ritmi kısaltabilir miyiz?"*

**DÜZELTME:**
- Başlıkta **Kontrol seçicisi Dinle'nin yanına** alındı (Konuşmacı'nın önüne).
- **1/2/3/4 kısayolları:** onay / anlaşılmadı / yeniden dinle / belirsiz.
  `applyReviewChoice` tek kapı; `setSegReview` kullanır; ikinci göz onayı
  engellenir; metin alanında çalışmaz.
- Yardıma **"Hızlı çalışma ritmi"** eklendi.

**ÖLÇÜM (1440×900):** fare turu 1.624 → **1.196 px** (−%26);
Dinle→Kontrol 373 → **159**; Kontrol→↓ 426 → **212**. Klavye turu **0 px**.

**Koruyan test:** `tasarim` [2av].

---

#### P28 — Belirsiz okuma rapor hücresi kısaldı (v2.197)

**KULLANICI:** *"Belirsiz harika olmuş ama rapor aynı böyle mi yazacağız, çok
uzun değil mi?"*

**DÜZELTME:** `reviewCellText` belirsiz okumada `reviewLabel — ambiguousReportText`
yazıyordu ("Belirsiz okuma — Belirsiz: …"). Artık yalnız `ambiguousReportText`
yazılır: `Belirsiz okuma: "geldi" / "kaldı" (seçilen: geldi)`. İki okuma ve seçim
KORUNUR; belirsizlik gizlenmez; yalnız yinelenen etiket kaldırıldı.

**Koruyan test:** `birim` [43].

## YENİ OTURUM DEVRİ (v2.197) — DURUM, KARARLAR, SIRADAKİ İŞLER

Bu not, uzun tasarım/UX turunu kapatan oturumun devridir. Aşağıdaki kararlar
**ölçümle** doğrulandı ve testle korunuyor. Yeni oturum bunları bozmadan devam
etmelidir.

### Durum (2026-11-21)

| | |
|---|---|
| Sürüm | **v2.197** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **999 birim + 404 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | `main` = `origin/main` = v2.197 commit'i |
| Pages | `built` (v2.196 push sonrası doğrulanacak) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.197** |
| Açık konu | Rapora "Okuma metni" entegrasyonu; ≤900 px karar şeridi; bölüm uzunluğu uyarısı |

### Bu oturumda yapılanlar (v2.188–v2.196)

| Sürüm | Konu |
|---|---|
| v2.188 | Metin kutusu: tek kutu, dört köşe (vurgu içeride, obs alt sol, hızlı ekle alt sağ, ASR üst sağ, Profil silindi) |
| v2.189 | Zamanlar dalganın üstünde yarı saydam şeritte |
| v2.190 | Dalga menüleri görünür (sarma); metin dalgaya binmiyor |
| v2.191 | Sağ panel kaymıyor; metin kendi içinde kayıyor |
| v2.192 | Konuşmacı silme + rapor filtresi (atanmamış konuşmacı rapora girmez) |
| v2.193 | Birleştirme/bölme/paragraf sonrası kaydırma korunur; listede metin önizlemesi |
| v2.194 | Yeniden çözümleme sonrası kaydırma korunur |
| v2.195 | Paragraf görünümü **salt okunur** (yıkıcı `paragraphize` kaldırıldı); `[telefonda konuşma]`; `docs/STANDARTLAR.md` |
| v2.196 | Kontrol Dinle yanında; 1/2/3/4 karar kısayolları; hızlı ritim |
| v2.197 | Belirsiz okuma rapor hücresi kısaldı (tekrar yok) |

### Değişmez kararlar (bu oturumda doğdu)

1. **Paragraf bir SUNUMdur, kanıt değil.** ¶ salt okunur; `segments` değişmez.
2. **Kanıt = ayrıntılı (zaman damgalı) bölüm tablosu.** Paragraf/okuma metni
   ayrı gösterilir; rapora entegrasyonu henüz yok.
3. **Bölüm uzunluğu standardı:** 1–3 cümle veya ~15–30 sn; 30–45 sn üst sınır;
   konuşmacı değişimi/uzun duraklamada böl. 5 dk tek satır yasak.
4. **Konuşmacı:** model diarization YAPMAZ; kodlar kayıt başınadır. Aynı kişi
   ise aynı etiket adı + uzman kanaati notu. Perde tahmindir.
5. **Rapor yöntemi:** yerel Whisper tabanlı ASR modeli + sürüm yazılır; uygulama
   adı yazılmaz; "konuşmacı/kaynak ayrıştırma yaptık" denmez.
6. **Geri alma:** 20 işlem, bellek içi; **sayfa yenileme geçmişi siler**.
7. **LLM:** ham ses/metin verilmez; yalnız doğrulanmış metinde taslak/başlık
   önerisi; insan onayı şart.
8. **Kırpma yasak:** sığmayan öğe sarar; gizli yatay kaydırma yok.
9. **Tek kaynak:** durum kodları/etiketler `schema.js`; rapor metinleri
   `REPORT_TEXT`; konuşmacı eşleşmesi isim VE `speakerId`.
10. **Ölçülemeyen iddia yok:** "düzeltildi" demek için önce/sonra ölçümü ver.

Ayrıntılı standartlar: [`docs/STANDARTLAR.md`](docs/STANDARTLAR.md).

### Önerilen çalışma ritmi

1. **Ön tarama:** "Bekleyen" filtresi + Canlı vurgu (G) + Otomatik geçiş (F)
   ile hızlı bak. Bariz olanları işaretle.
2. **Son doğrulama:** Otomatik geçişi KAPAT. `↓` / `Y` / `1–4` / `Enter` ile
   manuel ilerle. "Onaydan sonra sonraki bekleyene geç" (varsayılan kapalı)
   isteğe bağlı.
3. **Belirsizleri** "Yeniden dinlenecek" bırak; son turda filtrele.
4. **İstisnalar:** gözlem düğmeleri + hızlı etiketler (`[uzaktan konuşma]`,
   `[telefonda konuşma]`, `[müzik/ses]`…).
5. **Bitirmeden önce:** Rapor hazırlığı kartı + Kapsam denetimi + zaman
   sorunları filtresi.

### SIRADAKİ İŞLER (öneri sırası — v2.197 sonrası)

1. **v2.198 — Birleştirme adayı (deterministik).** Kullanıcı çok sık birleştirme
   yapıyor. Aday ölçütü (uydurma skor yok): aynı konuşmacı + kısa süre
   (<2 sn veya <5 kelime) + cümle sonu noktalaması yok + sonrakiyle boşluk
   ≤0,5 sn. Listede **⇄ aday** rozeti + **"Birleştirme adayı"** filtresi.
   **Otomatik birleştirme YOK**; kullanıcı karar verir. `birim` testi.
2. **v2.199 — ≤900 px yapışkan karar şeridi.** Ölçüm: 900 px'te Dinle/Kontrol
   y=1631 (ekran dışı). Yapışkan çubuğa **Kontrol + ↓** ekle; kısayol ipucu.
   Ölçüt: 900 px'te dinle→karar→sonraki kaydırmasız.
3. **v2.200 — Bölüm uzunluğu uyarısı.** Birleştirme sonucu >45 sn ise **uyarı**
   (engelleme yok) + raporda standart hatırlatması. `birim` testi.
4. **v2.201 — Rapora "Okuma metni".** `paragraphGroups` çıktısını HTML/DOCX/UDF
   çıktısına **ayrı bölüm** olarak ekle; kanıt tablosu değişmez. Üç çıktı aynı
   metni üretmeli (`rapor-tutarlilik-testi`).
5. **v2.202 — Gözlem anahtarları.** "telefon" ve "sessizlik" gözlem anahtarı
   eklemek şema göçü gerektirir (`OBS_KEYS`, `emptySegment`, rapor sayacı).
6. **v2.203 — Dosyalar arası konuşmacı kaydı.** Case-level speaker registry;
   aynı kişiyi dosyalar arası bağlama (isteğe bağlı, uzman kanaati).
7. **v2.204 — Yerel LLM yardımcısı (isteğe bağlı).** Doğrulanmış metinde
   gruplama/başlık/rapor taslağı; ham veri verilmez; insan onayı şart.

### Bilinen sınırlar (hata değil)

- ≤900 px tek sütun; detay listenin altında.
- Konuşmacı diarization yok; etiketler uzman.
- Kaynak ayrıştırma (müzik/gürültü ayırma) yok.
- Perde oktav hatası düzeltilmez; bildirilir.
- Rapor "Okuma metni" bölümü henüz yok.
- Model indirme/ASR bu ortamda denenmedi (0,5–1,5 GB).

### Doğrulama (her oturum başı)

```bash
bash tools/test.sh
git log --oneline -3; git status --short
curl -s https://azmisahin-gov.github.io/akis/version.json
curl -s https://azmisahin-gov.github.io/akis/assets/app.js | grep -m1 APP_VERSION
```

### İlk komut

`bash tools/test.sh` → yeşil olmalı. Sonra **v2.197** ile başla (≤900 px
yapışkan karar şeridi).

### DOĞRULAMA (her oturum başı)

```bash
bash tools/test.sh                      # 956 + 404 + rapor/sürüm/tasarım
git log --oneline -3; git status --short
curl -s https://azmisahin-gov.github.io/akis/version.json
curl -s https://azmisahin-gov.github.io/akis/assets/app.js | grep -m1 APP_VERSION
```

### BİLİNEN SINIRLAR (hata değil)

- **≤900 px** tek sütun; detay listenin altında.
- **Perde oktav hatası** düzeltilmez, `detectPitchAmbiguity()` ile bildirilir.
- **Spektrogram renk skalası** tema bağımsız (veri görselleştirme).
- **Rail zemini gradyan**; kontrast taramasında yanlış pozitif üretir.
- **Model indirme/ASR** bu ortamda denenmedi (0,5–1,5 GB indirme gerekir).
- `date`/`fs`/`vm` sandbox farkı: `instanceof Date` güvenilmez; davranıştan anla.
- Ölçüm şemaları: `LEVELS_SCHEMA` (3), `SILENCE_SCHEMA` (2).

### KULLANICI TERCİHLERİ (bu oturumda netleşti)

- **Ekran etiketleri KISA**; ayrıntı **ipucunda** (`title`).
- **Masaüstü uygulaması** hissi: sabit çerçeve, paneller kendi içinde kayar.
- **Tek düğme iki iş yapmaz** (takip F/G ayrı; onay davranışı ayrı anahtar).
- **Kırpma yasak**: sığmayan öğe **sarar** veya görünür **kaydırır**.
- **Aynı veri tek yerde** gösterilir.
- **Ölçülemeyen iddia yok**: "düzeltildi" demek için önce/sonra ölçümü verilir.
- **Tema bir "süs" değil**: üç temada da okunur ve tutarlı olmalı; durum
  renkleri (açık/seçili/çalıyor/uyarı) tek anlama sahip olmalı.

## YENİ OTURUM DEVRİ (v2.198) — Birleştirme adayı

### Durum (2026-11-21)

| | |
|---|---|
| Sürüm | **v2.198** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1041 birim + 404 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | `main` = `origin/main` = v2.198 commit'i |
| Pages | push sonrası `built` doğrulanacak |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.198** |
| Açık konu | ≤900 px yapışkan karar şeridi; >45 sn birleştirme uyarısı; rapora "Okuma metni" |

### Bu sürümde ne yapıldı

Kullanıcı: *"Birleştirilecek gibi bir şey koysak."* Bölüm listesinde birleştirmeye
uygun görünen satırlar **⇄** rozetiyle işaretlenir; araç çubuğunda **Birleştirme
adayı** filtresi görünür.

**Aday ölçütü (uydurma skor yok, yalnız gözlemlenebilir):**

| Ölçüt | Değer |
|---|---|
| Konuşmacı | aynı (birleştirme zaten farklıyı reddeder) |
| Kısa bölüm | **< 2 sn VEYA < 5 kelime** |
| Cümle sonu | yok (`. ! ? …`) |
| Sonrakiyle boşluk | **≤ 0,5 sn** (çakışma aday değil) |

**Değişmez kural: aday İŞARETTİR, eylem değil.**
- Rozet bir `<span>`'dir; **tıklanınca birleştirmez**. Yıkıcı eylem tek tıkla
  olmaz; birleştirme ⋮ menüsü, **M** tuşu veya sürükleme ile yapılır.
- **Otomatik birleştirme YOK**; kararı bilirkişi verir.
- **Denetlenmiş bölüm aday gösterilmez** (`isReviewed`): birleştirme onayı
  "Kontrol bekliyor"a düşürür — sessiz onay kaybı adli kayıtta kabul edilemez.
- **TEK KAYNAK:** `mergeCandidateAt` → `mergeCandidateIndexes` → sayaç
  (`segCounts.merge`), filtre (`segMatchesFilter(..., mergeSet)`) ve rozet
  (`segItemHtml`) aynı kümeyi kullanır. Ayrışırsa kullanıcı sayının tutmadığını
  görür (v2.99 dersi).
- **Koşullu çip:** `CONDITIONAL_FILTERS = {time, merge}`; sayı 0 iken çip
  çizilmez. Aktif koşullu filtre boşalınca liste kendiliğinden **Tümü**'ye
  döner (çipi olmayan filtrede kalmak listeyi boş gösteriyordu).

### Ölçüm (gerçek Chromium + CDP, 1440×900 ve 900×900)

10 bölümlük gerçek kayıt (5 aday beklenen veri: 0,2,4,5,8):

| Ölçüm | Sonuç |
|---|---|
| Aday rozeti | **5** · satırlar `[0,2,4,5,8]` |
| Çip | **"Birleştirme adayı 5"** |
| Rozet öğe türü | **SPAN** (buton değil) |
| Satır yüksekliği | **50 px** (10 satır; değişmedi) |
| Kırpılan rozet şeridi | **0** |
| Rozet kontrastı | açık **7.87** · koyu **6.05** · sepya **7.40** (AA) |
| Filtre | 5 satır, hepsi aday; **veri korundu (10 bölüm)** |
| 5 birleştirme sonrası | aday **0**, çip **kalktı**, filtre **`all`**, 5 bölüm kaldı |
| 900 px | satır 50 px, kırpılan **0**, yatay taşma **yok** |
| JS hatası | **0** |

**Testin kırmızı olduğu kanıtlandı:** yeni test dosyası v2.197 koduyla
çalıştırıldı → çıkış kodu **1** (fonksiyonlar yok). Düzeltmeyle **1041 geçti**.

### SIRADAKİ İŞLER (öneri sırası — v2.198 sonrası)

1. **v2.199 — ≤900 px yapışkan karar şeridi.** Ölçüm: 900 px'te Dinle/Kontrol
   ekran dışı. Yapışkan çubuğa **Kontrol + ↓** ekle; ölçüt: dinle→karar→sonraki
   kaydırmasız.
2. **v2.200 — Birleştirme >45 sn uyarısı.** Bölüm uzunluğu standardını korur
   (engellemez); `birim` testi.
3. **v2.201 — Rapora "Okuma metni".** `paragraphGroups` çıktısını HTML/DOCX/UDF
   çıktısına **ayrı bölüm** olarak ekle; kanıt tablosu değişmez; üç çıktı aynı
   metni üretmeli (`rapor-tutarlilik-testi`).
4. **v2.202 — Gözlem anahtarları:** telefon / sessizlik (`OBS_KEYS` şema göçü).
5. **v2.203 — Dosyalar arası konuşmacı kaydı** (case-level registry; uzman
   kanaati).
6. **v2.204 — Yerel LLM yardımcısı** (isteğe bağlı; yalnız doğrulanmış metin).

### Bilinen sınırlar (hata değil)

- Aday ölçütü **sezgiseldir**: aynı konuşmacı + kısa + noktalamasız + boşluksuz.
  Yanlış aday gösterebilir; rozet bağlayıcı değildir, kararı kullanıcı verir.
- Konuşmacı atanmamış iki bölüm `speaker` alanı ikisinde de boşsa "aynı" sayılır
  (birleştirme kuralıyla birebir aynı davranış).
- ≤900 px tek sütun; detay listenin altında.
- Model indirme/ASR bu ortamda denenmedi (0,5–1,5 GB).

### Düzeltme — 5 tuşu (aynı sürüm, yeni commit)

Kullanıcı **5 ve 8**'i 1–4 gibi bir "karar" kısayolu sandı; 5'e basınca
birleştirme rozeti konacağını düşündü. **Rozet otomatik hesaplanır; tuşla
konmaz.**

- `5` = **"Birleştirme adayı" filtresini aç/kapa** (`toggleMergeFilter`).
  Veri **DEĞİŞMEZ**. Akış: **5 → adaylar → M (birleştir) → 5 (Tümü)**.
- `nextMergeFilter(current, count)` saf karar: `count` 0 ise filtre **değişmez**;
  >0 ise `merge ↔ all`.
- **Aday yokken 5 filtre açmaz:** boş liste "veri gitti" izlenimi verir; ölçüt
  metinle söylenir.
- **6–9 (ve 8) tanımlı değildir.** Birleştirme kısayolu **M**'dir; uydurma tuş
  eklenmez. (Kullanıcının gördüğü hareket, sayı tuş takımında NumLock kapalıyken
  **8 = ↑** olmasından kaynaklanır; ölçüldü.)
- Ölçüm (gerçek Chromium): 5 → **5 satır** (hepsi aday), tekrar 5 → **10 satır**;
  aday yokken 5 → **filtre değişmedi + toast**; 8 → **değişiklik yok**;
  JS hatası **0**.
- Test: `birim` [70] (47 kontrol), `tasarim` [2ax] (5 kontrol).

**Sürüm notu:** Aynı sürüm (v2.198) korunduğu için `version.json` değişmedi;
açık sekmeler kendiliğinden yenilenmez. Kullanıcı sayfayı **bir kez** yenilemeli
(`?t=<zaman>` veya Ctrl+Shift+R).

## YENİ OTURUM DEVRİ (v2.199) — Dar ekranda karar çubuğu

### Durum (2026-11-21)

| | |
|---|---|
| Sürüm | **v2.199** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1058 birim + 404 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | `main` = `origin/main` = **c867344** (push doğrulandı) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.199** |
| Açık konu | v2.200 >45 sn birleştirme uyarısı; v2.201 rapora "Okuma metni" |

### Bu sürümde ne yapıldı

Kullanıcı: *"≤900 px'te Dinle/Kontrol ekran dışında; karar için kaydırmak
gerekiyor."* Ölçüm (v2.198, 900×900): ayrıntı başlığı **y=1112** (ekran dışında);
yapışkan çubukta **Kontrol seçicisi yoktu**.

- `narrowBarHtml` sırası: **▶ Dinle · Kontrol · ↑/↓ · ✓ Onayla**.
- Kontrol seçicisi `reviewSelectOptions(rev, true)` kullanır; ayrıntı başlığı
  `reviewSelectOptions(rev)` (tam etiket). **Tek kaynak**; dar ekranda kısa
  etiket (`Bekliyor`, `Yeniden`, `Belirsiz`…).
- `.narrow-bar { flex-wrap: wrap }`: sığmayan öğe **sarar**, kırpılmaz.
- Karar **tek kapıdan**: değişiklik işleyicisi `applyReviewChoice(m, i, el.value)`
  çağırır. Böylece ikinci göz koruması, "Bekleyen" filtresinden düşme, ayrıntı
  paneli ve dar çubuk **aynı anda** tazelenir. Önceden kopya mantık vardı:
  pending filtresinde onaylanan satır listede kalıyor, başlık eski değeri
  gösteriyordu.
- Toast, çubuğun **gerçek** yüksekliğinin üstünde: `--narrow-bar-h`
  (`syncNarrowBarHeight` + `ResizeObserver`). Sabit 66 px 360 px'te yetmiyordu.

### Ölçüm (gerçek Chromium + CDP, 900×900)

| Genişlik | Çubuk | Kırpılan | Toast çakışması |
|---|---|---|---|
| 900/760/600 | 54 px, tek satır | 0 | yok (20 px boşluk) |
| 480/360 | 100 px, iki satır | 0 | yok (20 px) |
| 320 | 146 px, üç satır | 0 | yok (18 px) |

Akış (360 px): Kontrol'den **Anlaşılmadı** → satır `st-inaudible`, başlık ve
çubuk aynı; "Bekleyen" filtresinde **↓** → sonraki; **Onaylandı** → satır
listeden düştü (9 → 8); **✓ Onayla** → sonraki bölüme geçti. JS hatası **0**.

### DEĞİŞMEZ KURAL: dar çubukta karar tek kapıdan

Yeni bir kontrol kararı yazma noktası eklerken **`applyReviewChoice`** kullanın.
Doğrudan `setSegReview` + elle DOM tazeleme, "Bekleyen" filtresini ve başlıktaki
seçiciyi ayrı bırakır (v2.199'da düzeltildi). `narrowBarHtml` yeni bir kontrol
eklerse mevcut `data-*` işleyicisini kullanmalı; kendi mantığını taşımamalı.

### SIRADAKİ İŞLER (öneri sırası — v2.199 sonrası)

1. **v2.200 — Birleştirme >45 sn uyarısı.** Bölüm uzunluğu standardını korur
   (engellemez); `birim` testi.
2. **v2.201 — Rapora "Okuma metni".** `paragraphGroups` çıktısını HTML/DOCX/UDF
   çıktısına **ayrı bölüm** olarak ekle; kanıt tablosu değişmez.
3. **v2.202 — Gözlem anahtarları:** telefon / sessizlik (`OBS_KEYS` şema göçü).
4. **v2.203 — Dosyalar arası konuşmacı kaydı** (case-level registry).
5. **v2.204 — Yerel LLM yardımcısı** (isteğe bağlı; yalnız doğrulanmış metin).

### Bilinen sınırlar (hata değil)

- ≤900 px tek sütun; detay listenin altında.
- 320 px'te çubuk üç satıra çıkar (146 px); kırpma yok, kaydırma gerekmez.
- Toast, sayfa kartın sonuna kaydırıldığında çubuğun bir kısmını **geçici**
  (3,4 sn) örtebilir; toast `pointer-events:none` olduğu için tıklamayı engellemez.

## YENİ OTURUM DEVRİ (v2.200) — 45 saniye üstü bölüm uyarısı

### Durum (2026-11-21)

| | |
|---|---|
| Sürüm | **v2.200** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1074 birim + 404 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | `main` = `origin/main` = **c867344** (push doğrulandı) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.200** |
| Açık konu | — (v2.201'de düzeltildi) |

### Bu sürümde ne yapıldı

Standart: **1–3 cümle veya 15–30 sn**, üst sınır **45 sn**. Birleştirme sonucu
45 sn'yi aşarsa işlem **ENGELLENMEZ**; uyarı verilir.

- `segmentLengthInfo(seconds)` saf fonksiyon; `SEG_LENGTH = {targetMaxSec:30,
  hardMaxSec:45}`. `>45` → `level:'long'`, `short` (01:12), metin.
- `mergeSegmentWithNext` sonunda `showToast(..., true)` (role=alert). Erken
  `return` YOK — birleştirme engellenmez.
- Kalıcı göstergeler: liste satırında **⏱**, Durum satırında **"Uzun bölüm
  01:12 — 45 sn üstü"** çipi, `reportReadiness` içinde **"45 sn üstü bölüm"**
  maddesi, `renderReport` uyarı satırı.
- Toast kaybolsa da durum satırda/raporda kalır (v2.158 dersi).

### Ölçüm (gerçek Chromium + CDP, gerçek WAV)

| Adım | Sonuç |
|---|---|
| m1: 0–40 + 40–72 birleştir | 1 bölüm, **⏱ 1**, Durum "Uzun bölüm 01:12 — 45 sn üstü" |
| Toast | **role=alert / assertive**, "…süre 01:12 — önerilen üst sınır 45 sn…" |
| Rapor hazırlığı | **"1 45 sn üstü bölüm"** |
| Rapor uyarısı | "1 bölüm 45 sn üstünde (en uzun 01:12); önerilen 1–3 cümle veya 15–30 sn, üst sınır 45 sn." |
| m2: 0–22 + 22–44 birleştir | **⏱ 0**, toast normal (uyarı YOK) |
| JS hatası | **0** |

### ÖLÇÜM SIRASINDA BULUNAN AYRI SORUN (v2.201'de düzeltildi)

`reportReadiness` "Zaman sorunu" sayısını **tüm kayıtların bölümlerini tek zaman
çizgisi gibi** sayıyor (`materials.flatMap`). İki kayıt da 0'dan başlıyorsa
aralarında olmayan "çakışma" üretiliyor. Ölçümde 3 geçerli bölüm (m1: 0–72;
m2: 0–22, 22–44) **"3 Zaman sorunu"** gösterdi. Ses görünümündeki `time` filtresi
ise **kayıt başına** doğru sayıyor → iki araç ayrışıyor (v2.156 dersi).

**Önerilen düzeltme (v2.201):** `reportReadiness` içinde zaman sorununu kayıt
başına topla:
`materials.reduce((n,m)=>n+segmentTimeIssueIndexes(m.segments||[]).size,0)`.
Test: iki kayıt da 0'dan başlasın → hazırlıkta "Zaman sorunu" **0** olmalı.

### SIRADAKİ İŞLER (öneri sırası — v2.200 sonrası)

1. **v2.201 — Rapor hazırlığı zaman sayacı (YAPILDI).** Kayıt-başına toplama
   + `birim` [73] + `tasarim` [2ba].
2. **v2.202 — Rapora "Okuma metni".** `paragraphGroups` çıktısını HTML/DOCX/UDF
   çıktısına **ayrı bölüm** olarak ekle; kanıt tablosu değişmez.
3. **v2.203 — Gözlem anahtarları:** telefon / sessizlik (`OBS_KEYS` şema göçü).
4. **v2.204 — Dosyalar arası konuşmacı kaydı** (case-level registry).
5. **v2.205 — Yerel LLM yardımcısı** (isteğe bağlı; yalnız doğrulanmış metin).

### Bilinen sınırlar (hata değil)

- 45 sn eşiği **sabit**tir; kullanıcı ayarlayamaz (standart `docs/STANDARTLAR.md`).
- Uyarı **engellemez**; 5 dakikalık tek bölüm de birleştirilebilir (uyarı verilir).
- Rapor uyarısı **ekran** "Rapor öncesi kontrol" bloğundadır; DOCX/UDF metnine
  yeni bir cümle eklenmedi (belge bilirkişinin metni olarak kalır).

## YENİ OTURUM DEVRİ (v2.201) — Rapor hazırlığı zaman sayacı

### Durum (2026-11-21)

| | |
|---|---|
| Sürüm | **v2.201** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1079 birim + 404 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | `main` = `origin/main` = **c867344** (push doğrulandı) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.201** |
| Açık konu | — (v2.202'de yapıldı); v2.203 gözlem anahtarları |

### Ne yapıldı

v2.200 ölçümünde bulunan hata: `reportReadiness` "Zaman sorunu" sayısını
`materials.flatMap(...)` ile **tüm kayıtları tek zaman çizgisi** gibi sayıyordu.
Her kayıt 0'dan başladığı için aralarında olmayan "çakışma" üretiyordu.

- `time` maddesi artık **kayıt başına**:
  `materials.reduce((n,m)=>n+segmentTimeIssueIndexes((m&&m.segments)||[]).size,0)`.
- Ses görünümündeki `time` filtresi (`segCounts(m).time`) ile **aynı** kural.
- Gerçek çakışma (aynı kayıt içinde) iki tarafıyla kalır.

### Ölçüm (gerçek Chromium + CDP)

m1 (0–10, 10–20), m2 (0–10, 10–20), m3 (0–10, 5–15):

| Ölçüm | Önce (v2.200) | Sonra (v2.201) |
|---|---|---|
| Hazırlık "Zaman sorunu" | **4** (yanlış) | **2** (yalnız m3) |
| m1 zaman çipi | — | **yok** |
| m3 zaman çipi | — | **"Zaman sorunları 2"** |
| m3 filtre satırı | — | **2** |
| JS hatası | 0 | **0** |

### DEĞİŞMEZ KURAL: zaman çizgileri KAYIT BAŞINA

Ses kayıtlarının zaman çizgileri **ayrıdır**. Bölüm zamanlarını kayıtlar arası
karşılaştırmak (düzleştirilmiş `flatMap` + `segmentTimeIssues`) yanlış "çakışma"
üretir. Zaman denetimi gereken her yerde **kayıt başına** hesapla:
`segmentTimeIssueIndexes(m.segments || [])`. Hazırlık kartı ve `time` filtresi
aynı sayıyı vermelidir (v2.156 dersi: iki araç ayrışmamalı).

### SIRADAKİ İŞLER (öneri sırası — v2.201 sonrası)

1. **v2.202 — Rapora "Okuma metni" (YAPILDI).** `readingGroupsFor` + üç çıktı;
   kanıt tablosu değişmedi. Test: `rapor` Senaryo 12 + `birim` [74] + `tasarim` [2bb].
2. **v2.203 — Gözlem anahtarları:** telefon / sessizlik (`OBS_KEYS` şema göçü).
3. **v2.204 — Dosyalar arası konuşmacı kaydı** (case-level registry).
4. **v2.205 — Yerel LLM yardımcısı** (isteğe bağlı; yalnız doğrulanmış metin).

### Bilinen sınırlar (hata değil)

- Zaman sorunu denetimi **kayıt içi**dir; iki kaydın aynı saniyeye denk gelmesi
  sorun değildir (farklı zaman çizgileri).
- 45 sn eşiği ve diğer v2.200 davranışları değişmedi.

## YENİ OTURUM DEVRİ (v2.202) — Rapora "Okuma metni"

### Durum (2026-11-21)

| | |
|---|---|
| Sürüm | **v2.202** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1089 birim + 404 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | `main` = `origin/main` = **c867344** (push doğrulandı) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.202** |
| Açık konu | v2.203 gözlem anahtarları; v2.204 konuşmacı kaydı |

### Ne yapıldı

Raporun **5.1** bölümünde, ayrıntılı kanıt tablosundan **sonra** her kayıt için
**"Okuma metni"** alt bölümü eklendi.

- `readingGroupsFor(m)` — `paragraphGroups` + `paragraphSpeakerLabel` + `tcRange`.
  Grup başlığı: `S1 · Kiracı · 00:00:00.000 – 00:00:10.000 · 2 bölüm`; kontrol
  bekleyen grupta `· kontrol bekliyor`.
- `paragraphViewText` (¶ penceresinin "Panoya kopyala" metni) de **aynı**
  `readingGroupsFor` kaynağını kullanır.
- `REPORT_TEXT.readingHeading` / `readingIntro`.
- HTML (`renderReport`), DOCX (`docxXml`) ve UDF (`makeUdf`) üçünde de kanıt
  tablosundan sonra eklenir. **Kanıt tablosu ve cümle zamanları DEĞİŞMEZ.**
- `m.segments`e dokunulmaz; yıkıcı `paragraphize` yok.

### Ölçüm (gerçek Chromium + CDP)

| Ölçüm | Sonuç |
|---|---|
| Rapor önizlemesi "Okuma metni" | **1** başlık |
| Açıklama + grup metni | var ("salt okunur…", "merhaba dünya") |
| Bölüm sayısı | **"2 bölüm"** |
| Kanıt tablosu başlığı | **var** ("ZAMAN ARALIĞI") |
| Okuma metni konumu | kanıt tablosundan **sonra** |
| Ses görünümü bölüm sayısı | **3** (veri değişmedi) |
| JS hatası | **0** |

Üç çıktı (HTML/DOCX/UDF) `rapor` **Senaryo 12** ile aynı metni veriyor:
başlık, açıklama, "merhaba dünya", "2 bölüm", kanıt tablosu başlığı.

### DEĞİŞMEZ KURAL: okuma metni TÜRETİLMİŞ sunumdur

Okuma metni `m.segments`i **değiştirmez**; kanıt (ayrıntılı zaman damgalı
tablo) korunur. Yeni bir çıktı yolu eklerken **`readingGroupsFor(m)`** kullanın;
kendi gruplama/biçimlendirme kopyanızı yazmayın. Üç çıktı **aynı metni**
üretmelidir (`rapor-tutarlilik-testi`). Boş metin "(metin yok)" olarak görünür;
uydurma metin üretilmez.

### SIRADAKİ İŞLER (öneri sırası — v2.202 sonrası)

1. **v2.203 — Gözlem anahtarları:** telefon / sessizlik (`OBS_KEYS` şema göçü,
   `emptySegment`, rapor gözlem sayacı).
2. **v2.204 — Dosyalar arası konuşmacı kaydı** (case-level registry; uzman
   kanaati).
3. **v2.205 — Yerel LLM yardımcısı** (isteğe bağlı; yalnız doğrulanmış metin).

### Bilinen sınırlar (hata değil)

- Okuma metni bölümleri **birleştirmez/bölmez**; yalnız gösterir.
- Konuşmacı etiketi kayıt başınadır; iki kayıttaki `S1` aynı kişi olmayabilir.
- Rapor uyarısı ekran "Rapor öncesi kontrol" bloğundadır; DOCX/UDF metnine yeni
  bir cümle eklenmedi (v2.200 notu).

## YENİ OTURUM DEVRİ (v2.203) — Alan tanımlama sistemi

### Durum (2026-11-21)

| | |
|---|---|
| Sürüm | **v2.203** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1096 birim + 420 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | `main` = `origin/main` = **c867344** (push doğrulandı) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.203** |
| Açık konu | Case alanları ve rapor bölümleri (sınıflandırma/rol v2.204'te yapıldı) |

### Ne yapıldı

Kullanıcı yalnız iki gözlem işareti değil, **genişletilebilir alan altyapısı**
istedi. Gözlem bayrakları tek tanım noktasına taşındı:

- `schema.js` → `OBS_DEFS` (key, label, short, hint) — **TEK KAYNAK**.
- `defineOptions(defs)` → `{ defs, keys, label, short, hint }`.
- Türetilen: `OBS_KEYS`, `OBS_LABEL`, `OBS_SHORT`, `OBS_HINT`, `emptyObs()`.
- `emptySegment.obs` ve `normalizeSegment` buradan beslenir.
- `app.js` → `obsBtns` `OBS_DEFS.map`; `REPORT_TEXT.obsLabels = OBS_LABEL`;
  `segObsText`/gözlem sayacı yalnız `OBS_KEYS`.
- Yardım listesi `#obsHelpList` çalışma anında `OBS_DEFS`ten doldurulur.
- Yeni işaretler: **telefon görüşmesi** (`phone`), **sessizlik (konuşma yok)**
  (`noSpeech`; ölçülen `s.silence` oranından AYRIDIR).
- ≤600 px'te tek **Gözlem** düğmesi + açılır panel (6 düğme 4 satıra çıkıp
  metni eziyordu).
- `mergeCases` gözlemleri **OR**'lar; gelen eklemeler `applied` günlüğüne yazılır.
- `normalizeSegment` **bilinmeyen anahtarı silmez** (ileri uyum); rapor/sayaç
  yalnız bilinen anahtarları basar/sayar.

**Yeni gözlem bayrağı eklemek için tek zorunlu değişiklik `OBS_DEFS`'e bir
satır.** Ayrıntı: [`docs/ALAN_SISTEMI.md`](docs/ALAN_SISTEMI.md).

### Ölçüm (gerçek Chromium + CDP)

| Genişlik | Alt şerit | Düğmeler | Kırpılan |
|---|---|---|---|
| 1440 / 900 | **30 px**, tek satır | 6 görünür | 0 |
| 360 | **31 px**, "Gözlem" düğmesi | panelde 6, 2 satır | 0 |

Rapor GÖZLEM hücresi: `telefon görüşmesi, sessizlik (konuşma yok)`; bilinmeyen
`futureFlag` **basılmadı**; yardım listesi 6 işareti gösterdi; JS hatası **0**.

### DEĞİŞMEZ KURALLAR

1. Yeni gözlem bayrağı = **yalnız `OBS_DEFS`'e satır**; `OBS_KEYS`/`OBS_LABEL`/
   `OBS_SHORT`/`OBS_HINT` elle yazılmaz.
2. Arayüz düğmeleri `OBS_DEFS`ten, rapor etiketleri `OBS_LABEL`den türetilir.
3. `emptySegment`/`normalizeSegment` bilinen anahtarları tamamlar; bilinmeyen
   anahtarı **silmez**.
4. Rapor/sayaç yalnız **bilinen** anahtarları basar/sayar.
5. `mergeCases` gözlemleri OR'lar ve günlüğe yazar.
6. Testler `OBS_DEFS`i gezer; yeni anahtar otomatik sınanır.
7. Eklemeli alan `SCHEMA_VERSION`ı artırmaz; kırıcı değişiklik artırır.
8. **Evrensel şema motoru / dinamik form üreteci yazma**: büyük yeniden yazım ve
   veri kaybı riski. Alan aileleri kademeli taşınır.

### SIRADAKİ İŞLER (öneri sırası — v2.203 sonrası)

1. **v2.204 — Sınıflandırma/rol seçenekleri (YAPILDI).** `*_DEFS` tek kaynak;
   test: `sema` [3f] + `tasarim` [2bd].
2. **v2.205 — Dosyalar arası konuşmacı kaydı** (case-level registry; uzman
   kanaati).
3. **v2.206 — Yerel LLM yardımcısı** (isteğe bağlı; yalnız doğrulanmış metin).
4. **Case alanları / rapor bölümleri** — `ALAN_SISTEMI.md` §5'teki kademeli plan;
   her biri ayrı sürüm.

### Bilinen sınırlar (hata değil)

- v2.203 **öncesi** uygulama yeni paketi açıp kaydederse bilinmeyen gözlem
  anahtarlarını siler; paketler eski sürümle paylaşılmamalıdır.
- "Sessizlik" işareti ölçülen sessizlik oranı değildir; ölçüm ayrı satırdadır.
- ≤600 px'te gözlemler tek "Gözlem" düğmesi arkasındadır (açılır panel).
- Case alanları ve rapor bölümleri hâlâ özel kod; ortaklaştırma kademeli.

## YENİ OTURUM DEVRİ (v2.204) — Sınıflandırma/rol seçenekleri tek kaynakta

### Durum (2026-11-21)

| | |
|---|---|
| Sürüm | **v2.204** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1096 birim + 465 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | `main` = `origin/main` = **c867344** (push doğrulandı) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.204** |
| Açık konu | Case alanları ve rapor bölümleri (kademeli); konuşmacı kaydı |

### Ne yapıldı

v2.203'te gözlem bayrakları için kurulan `*_DEFS` + `defineOptions` deseni
sınıflandırma/rol seçeneklerine uygulandı:

| Defs | Türetilenler |
|---|---|
| `CASE_STATUS_DEFS` | `CASE_STATUS`, `CASE_STATUS_LABEL` |
| `MATERIAL_STATUS_DEFS` | `MATERIAL_STATUS`, `STATUS_LABEL` |
| `REVIEW_DEFS` | `REVIEW_STATE`, `REVIEW_LABEL`, `REVIEW_SHORT`, `REVIEW_HINT`, `REVIEW_TONE` |
| `SPEAKER_ROLE_DEFS` | `SPEAKER_ROLE`, `SPEAKER_ROLE_LABEL` |
| `SPEAKER_GENDER_DEFS` | `SPEAKER_GENDER`, `SPEAKER_GENDER_LABEL` |
| `MEDIUM_TYPE_DEFS` | `MEDIUM_TYPE`, `MEDIUM_TYPE_LABEL` |
| `TEAM_ROLE_DEFS` | `TEAM_ROLE`, `TEAM_ROLE_LABEL`, `SECOND_EYES_ROLES`, `APPROVER_ROLES` |

- `defineOptions` artık `byKey` döndürür (tone gibi ek alan).
- Rol yetkileri ayrı liste değil, `TEAM_ROLE_DEFS` bayrakları (`approver`,
  `secondEyes`).
- Uygulamadaki kopyalar kaldırıldı: `REVIEW_SHORT_LABEL`, `badgeFor` metinleri,
  `SEG_FILTERS` kontrol etiketleri artık schema'dan gelir.
- **Görünür davranış değişmedi**; kodlar, sıra ve etiketler aynı.

### Ölçüm (gerçek Chromium + CDP)

| Öğe | Sonuç |
|---|---|
| Filtre çipleri | "Onaylandı", "Anlaşılmadı", "Yeniden dinlenecek" |
| Aktif bölüm rozeti | "Onaylandı" |
| Tam Kontrol seçenekleri | 6 etiket (Kontrol bekliyor…Belirsiz okuma) |
| Dar ekran Kontrol seçenekleri | 6 kısa etiket (Bekliyor…Belirsiz) |
| JS hatası | **0** |

### DEĞİŞMEZ KURALLAR

1. Yeni bir seçenek = **ilgili `*_DEFS` listesine satır**; `*_KEYS`/`*_LABEL`
   elle yazılmaz.
2. Etiket/kısa etiket/ipucu/ton `*_DEFS` satırında; uygulama kopya tutmaz.
3. Rol yetkileri (`approver`, `secondEyes`) `TEAM_ROLE_DEFS` bayrağıdır.
4. `defineOptions` ek alanları `byKey` ile taşır; yeni bir tanım ailesi için
   aynı yardımcı kullanılır.
5. Testler `*_DEFS` listelerini gezer; yeni seçenek otomatik sınanır.
6. Eklemeli alan `SCHEMA_VERSION`ı artırmaz; kırıcı değişiklik artırır.
7. **Evrensel şema motoru / dinamik form üreteci yazma**: büyük yeniden yazım ve
   veri kaybı riski. Alan aileleri kademeli taşınır.

### SIRADAKİ İŞLER (öneri sırası — v2.204 sonrası)

1. **v2.205 — Dosyalar arası konuşmacı kaydı** (case-level registry; uzman
   kanaati).
2. **v2.206 — Yerel LLM yardımcısı** (isteğe bağlı; yalnız doğrulanmış metin).
3. **Case alanları / rapor bölümleri** — `ALAN_SISTEMI.md` §5 B/C kademeli plan;
   her biri ayrı sürüm. `REPORT_TYPES` (kapak/rol/başlık metinleri) hâlâ app.js
   içinde; rapor bölümü aşamasında ele alınacak.

### Bilinen sınırlar (hata değil)

- `REPORT_TYPE` anahtarları hâlâ düz dizi; `REPORT_TYPES` zengin metinleri
  app.js'te (rapor bölümü aşaması).
- Case alanları ve rapor bölümleri özel kod; tam otomatik değil.
- Görünür davranış değişmediği için kullanıcıya yeni bir iş akışı sunulmadı.

## YENİ OTURUM DEVRİ (v2.205) — Dosyalar arası konuşmacı kaydı

### Durum (2026-11-21)

| | |
|---|---|
| Sürüm | **v2.205** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1105 birim + 482 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | `main` = `origin/main` = **c867344** (push doğrulandı) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.205** (Pages `built`) |
| Açık konu | Case alanları / rapor bölümleri; yerel LLM |

### Ne yapıldı

Aynı kişi birden çok kayıtta görünüyorsa **dosya geneli kişi** kaydı:

- `case.speakers[]` → `{ id, code: K1/K2…, label, role, gender, ageRange, notes }`.
- `material.speakers[].personId` → bu kişiye bağ. Yerel `S1/S2` kodları AYRI kalır.
- **Analiz → Konuşmacılar** panelinde **"Dosyalar arası kişiler"** bölümü
  (ekle/düzenle/sil) ve her konuşmacı kartında **"Aynı kişi (dosyalar arası)"**
  seçicisi (mevcut kişi veya `＋ Yeni kişi`).
- Rapor `speakerRows(c)` bağlı kişileri **tek satırda** gruplar:
  `K1 · Kiracı`; BÖLÜM/NOT: `A.wav: S1 · 12 bölüm · B.wav: S1 · 8 bölüm ·
  uzman eşleştirmesi`. Perde kayıt adıyla listelenir. Bağsızlar ayrı satır.
- `reviewSummaryRows` konuşmacı sayacı **tablo satırıyla** aynı kaynaktan.
- `mergeCases`: kişi alanları boşsa doldurulur; farklı dolu değer
  `case-speaker`, aynı konuşmacının iki farklı kişiye bağlanması
  `speaker-person` çakışması. `compareCases` aynı kuralı önizler.
- Kişi silme yalnız `personId` bağlarını temizler; ses/metin/yerel etiket korunur.

### Ölçüm (gerçek Chromium + CDP)

| Adım | Sonuç |
|---|---|
| m1'de ＋ Yeni kişi | **K1 · Kiracı**, “1 kayıt: a.wav (S1)” |
| m2'yi K1'e bağla | “2 kayıt: a.wav (S1) · b.wav (S1)” |
| Rapor | **tek** `K1 · Kiracı` satırı; `a.wav` + `b.wav` aynı satırda; “uzman eşleştirmesi” |
| m2 bağını kes | m2 ayrı satır; K1 satırında yalnız a.wav |
| Kişiyi sil | K1 satırı kalktı; yerel etiket/metin korundu |
| 1440 / 900 / 360 | kişi paneli taşma **0**, kırpılan **0** |
| JS hatası | **0** |

### DEĞİŞMEZ KURALLAR

1. **Kimlik tespiti değildir.** Bağ **uzman kanaatidir**; ses biyometrisi yok.
2. **Yerel kodlar ayrı.** İki kaydın `S1`'i otomatik aynı kişi sayılmaz;
   dosya geneli kod **K1**'dir.
3. **Ad/perde benzerliğiyle otomatik bağ YOK.** Yalnız açık seçim.
4. **Silme veri silmez:** yalnız `personId` temizlenir.
5. **Birleştirme sessiz ezmez:** kişi alanı ve bağ çakışması bildirilir.
6. **Önizleme = birleştirme:** `compareCases` aynı kuralı kullanır.
7. Yeni bir ilişki türü eklerken `docs/ALAN_SISTEMI.md` §8 desenini kullan.

### SIRADAKİ İŞLER (öneri sırası — v2.205 sonrası)

1. **v2.206 — Yerel LLM yardımcısı** (isteğe bağlı; yalnız doğrulanmış metin).
2. **Case alanları / rapor bölümleri** — `ALAN_SISTEMI.md` §5 B/C kademeli plan.
3. **≤900 px** tek sütunda detay/liste kararı (bilinen sınır).

### Bilinen sınırlar (hata değil)

- Eşleştirme otomatik doğrulanmaz; uzman beyanıdır.
- Kişi rol/cinsiyeti kayıt içi konuşmacıdan farklıysa **kişi kaydı** kullanılır;
  çelişki birleştirmede çakışma olarak çıkar.
- Eski kayıtlarda dosya geneli kişi yoktur; sonradan bağlanır.
- ≤900 px tek sütun; detay listenin altında.

### Yeni oturum başlangıcı (kopyala-yapıştır)

Bu oturum **v2.205** ile kapatıldı. Yeni oturum aynı depoyu açtığında:

1. **İlk komut:**
   ```bash
   bash tools/test.sh
   ```
   Beklenen: **1105 birim + 482 şema** + rapor/sürüm/tasarım yeşil.
2. **Durum doğrula:**
   ```bash
   git log --oneline -3          # c867344 v2.205
   git status --short            # temiz olmalı
   curl -s https://azmisahin-gov.github.io/akis/version.json
   ```
3. **Önerilen ilk mesaj:**
   > "AGENTS.md'deki **YENİ OTURUM DEVRİ (v2.205)** bölümünü oku.
   > `bash tools/test.sh` çalıştır. Sonra **v2.206** ile devam et."
4. **Sıradaki iş seçenekleri (kullanıcı seçer):**
   - **v2.206 — Case alanları (ALAN_SISTEMI §5B):** etiket/sıra/doğrulama tek
     kaynak; özel denetimler korunur. (Alan sisteminin 3. aşaması.)
   - **v2.207 — Rapor bölümleri (ALAN_SISTEMI §5C):** başlık/sıra/TOC tek
     kaynak; içerik renderer'ları korunur; üç çıktı birlikte.
   - **v2.208 — Yerel LLM yardımcısı (isteğe bağlı):** yalnız doğrulanmış
     metinde gruplama/başlık/rapor taslağı; ham ses/metin verilmez.

**Not:** Her yeni sürümde `APP_VERSION` + `CHANGELOG` başlığı +
`docs/YOL_HARITASI.md` + `index.html` dört `?v=` + `version.json` birlikte
artırılır; `bash tools/test.sh` yeşil olmadan push edilmez.

## YENİ OTURUM DEVRİ (v2.207) — Yerel LLM denemesi kaldırıldı

### Durum (2026-11-22)

| | |
|---|---|
| Sürüm | **v2.207** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → tümü yeşil |
| Git | commit + push sonrası `main` = `origin/main` doğrulanacak |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.207** |
| Açık konu | Yok — proje kullanıcı kararıyla burada kapatıldı |

### Ne oldu

v2.206'da **deneysel** bir yerel LLM yardımcısı eklenmişti (Qwen2.5 0.5B/1.5B,
yalnız onaylı metin, çıktı rapora girmiyor). Kullanıcı denedi; sonuçlar:

| Deneme | Sonuç |
|---|---|
| 0.5B · q4f16 · WebGPU | Çöp çıktı: `Кызета / 8.о / 8о` (Kiril), yavaş |
| 1.5B · q4f16 · WebGPU | `Aborted()` — 6 GB kartta bellek/GPU hatası |
| 0.5B · int8 · WASM | Türkçe ama **sadakatsiz**; metinde olmayan içerik uyduruyor, özetlemiyor |
| 1.5B · int8 · WASM | Türkçe ama konuyla ilgisiz, genel metin |

**Karar:** Tarayıcıdaki 0,5–1,5B modeller Türkçe hukuki metinde güvenilir
taslak üretmiyor. Özellik **tamamen kaldırıldı** (arayüz + kod + testler).
Hiçbir model indirilmez, GPU kullanılmaz, ek risk yok. Mevcut akışlar değişmedi.

### DEĞİŞMEZ DERS

- **"Daha yeni model" tek başına çözüm değildir.** Qwen3.5/Gemma 4 mimarileri
  `transformers.js 4.x` ister; uygulama Whisper için `3.7.2`'de sabitlidir.
  Kütüphane yükseltmesi ASR regresyonu demektir; ölçülmeden yapılmaz.
- **Kuantizasyon değiştirmek kalite sorununu çözmez.** q4f16 → int8, "anlamsız"
  çıktıyı "sadakatsiz" çıktıya çevirdi; ikisi de rapora giremez.
- **Küçük model + hukuki Türkçe = güvenilmez.** Bu sınıf iş için 3–4B alt sınır;
  tarayıcıda 2–4 GB indirme ve yavaş CPU demek.
- **Model demo'su ile tarayıcı denemesi aynı şey değildir.** Demo büyük olasılıkla
  daha büyük model/farklı çalışma birimi kullanır.
- **Kullanıcı verisiyle deneme yapılmaz.** Deneme yalnız kurgusal/onaylı metinle
  yapıldı; rapora hiçbir LLM çıktısı girmedi.

### İleride araştırma adayı (ürüne alınmadı)

`transformers.js 4.3.2` + `onnx-community/Qwen3.5-0.8B-Text-ONNX` (int8 ~470 MB)
+ açık GPU seçici + Whisper regresyon testi. **Ölçüm iyi çıkmadan** varsayılan
model değiştirilmez; çıktı yine taslak olur ve rapora kendiliğinden girmez.

### Bilinen sınırlar (hata değil)

- Yerel LLM özelliği **yoktur**; arayüzde düğme yoktur.
- Deterministik yardımcılar (paragraf görünümü, terim tutarlılığı, kapsama,
  rapor hazırlığı) korunur ve LLM'siz çalışır.
- Whisper çözümlemesi ve tüm mevcut akışlar değişmedi.

## PLANLAMA (v2.208 sonrası) — Delil Tier 1 uygulandı; diğerleri öneri

Ayrıntılı seçenekler: [`docs/GELECEK_PLANI.md`](docs/GELECEK_PLANI.md).
Delil standardı ve `delil.json`: [`docs/DELIL_EDINME.md`](docs/DELIL_EDINME.md).

**Durum:** **Delil Tier 1 v2.208'de uygulandı.** Bu bölümdeki diğer özellikler
uygulanmadı; sürüm numarası verilmedi. Uygulanmadan önce ölçüm, test ve
kullanıcı onayı gerekir.

### Öncelik sırası (kullanıcı kararı)

1. ~~**Delil edinme — Tier 1:** PowerShell `edinme.ps1` + `delil.json` + AKİS
   "Delil paketi yükle" + hash doğrulama.~~ **v2.208'de yapıldı.**
2. **Hızlı yardımcılar (LLM'siz):** soru↔bölüm eşleştirme, terim/konu listesi,
   seçmeli özet.
3. **LLM (isteğe bağlı):** tarayıcı küçük modeller **kapalı** (ölçüldü:
   çöp/sadakatsiz). Hızlı çalışan yol: **Ollama** veya native 4B; CORS/PNA
   ölçülmeden söz verilmez. Çıktı taslak; rapora kendiliğinden girmez.
4. **Rapor:** bölüm/başlık tek kaynak + kurumsal biçim.
5. **Uzun vade:** Rust CLI → yerel ajan → Tauri; tam Rust yeniden yazım en son.

### Değişmez ilkeler (plan için de geçerli)

- Tarayıcı tek başına USB'yi göremez; "tarama" ancak **yerel ajan**la olur.
- Donanım write-blocker yoksa "adli imaj" denmez; yöntem raporda yazılır.
- LLM yalnız **onaylı** metni görür; çıktı **taslaktır**, rapora kendiliğinden
  girmez.
- "Daha yeni model" tek başına çözüm değildir; **ölçülmeden** ürüne alınmaz.
- Her konu **tek sürüm**; plan belgesi sürüm yerine geçmez.

## YENİ OTURUM DEVRİ (v2.208) — Delil paketi (Tier 1)

### Durum (2026-11-22)

| | |
|---|---|
| Sürüm | **v2.208** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1143 birim + 482 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | commit + push sonrası `main` = `origin/main` doğrulanacak |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.208** |
| Açık konu | LLM (Ollama/native) ve rapor sırada; Tier 2 (DD imajı) öneri |

### Ne yapıldı

Ayrı edinme aracı + tarayıcıda doğrulama:

- **`tools/edinme/edinme.ps1`** (Windows, yönetici): USB'yi listeler,
  `diskpart` ile **yazılımsal salt-okunur** yapar, dosyaları kopyalar, SHA-256
  hesaplar, `delil.json` + `delil.log` + ZIP üretir. `-Simulate` kurgusal test.
- **AKİS "Delil paketi yükle"** (Ses görünümü): ZIP içindeki `delil.json` +
  `ses/` dosyalarını alır; her dosyanın SHA-256'sını **yeniden hesaplar**.
- **Doğrulama penceresi**: cihaz, seri, yöntem, araç, operatör, alınma ve
  dosya bazında durum.
- **Rapor**: **DELİL EDİNME VE DOĞRULAMA** bölümü; HTML/DOCX/UDF aynı metni
  üretir. Paket yoksa bölüm çizilmez.

### DEĞİŞMEZ KURALLAR

1. **Tarayıcı cihazı görmez.** `delil.json` cihaz bilgisi **edinme aracının
   beyanıdır**; arayüz bunu yazar.
2. **Hash yoksa doğrulanmış sayılmaz.** `verifyHashState` üç hâllidir:
   `verified` / `mismatch` / `unavailable`.
3. **Uyuşmazlık sessizce geçmez.** Onay istenir; raporda "Uyuşmuyor" yazılır.
4. **Tier 1 imaj değildir.** Silinmiş dosya/boş alan gelmez; "belgelenmiş
   dosya kopyası"dır.
5. **Yazılımsal salt-okunur, donanım write-blocker değildir.** Yöntem raporda
   açıkça yazılır.
6. **Paket yoksa rapor bölümü çizilmez.** Yapılmayan edinme rapora yazılmaz.

### Fonksiyonlar (saf, test edilir)

`validateDelilPack`, `findDelilManifestPath`, `delilFileState`,
`delilOriginFromPack`, `delilSummary`, `delilStateLabel`, `delilCopyTypeLabel`,
`acquisitionRows`; ayrıca `importDelilPack`, `renderDelilResult`.

### Şema

`emptyMaterial.origin.acquisition` (v2.208): edinme tutanağı; `normalizeMaterial`
bilinmeyen alanlarıyla korur. `hashState`, `manifestSha256`, `fileRelPath`
materyal bazında yazılır.

### Koruyan testler

- `birim-testleri` **[78]** (38 kontrol): şema, manifest yolu, hash üçlüsü,
  origin eşlemesi, özet, rapor satırı.
- `rapor-tutarlilik-testi` **Senaryo 14**: üç çıktı aynı edinme satırını üretir;
  paket yoksa bölüm yok.
- `tasarim-testi` **[2bg]**: düğme/pencere, beyan metni, hash doğrulaması,
  delil günlüğü, üç çıktı, kırpma yok.
- `surum-testi`: `#importDelilBtn`, `#delilResultDialog`, OZELLIKLER/yardım
  konusu.

### Dürüst sınır

- PowerShell aracı bu ortamda (Linux, USB yok) **çalıştırılmadı**. Yalnız
  şema/import/rapor tarafı test edildi. Gerçek delilden önce kurgusal USB'de
  3–5 deneme şart.
- Tier 2 (tam DD imajı) henüz yok; `docs/GELECEK_PLANI.md`.
- `diskpart` salt-okunur doğrulaması `Get-Disk.IsReadOnly` ile yapılır; dil
  bağımsızdır.

### SIRADAKİ İŞLER

1. **v2.209 — Hızlı yardımcılar (LLM'siz):** soru↔bölüm eşleştirme, terim/konu
   listesi, seçmeli özet.
2. **v2.210 — LLM (Ollama/native) — isteğe bağlı:** 4B, taslak-only, CORS/PNA
   ölçümü.
3. **v2.211 — Rapor:** bölüm/başlık tek kaynak + kurumsal biçim.
4. **Sonra:** Rust CLI edinme, DD imajı, yerel ajan, Tauri.

## EK DÜZELTME (v2.209) — Edinme aracı (kullanıcı geri bildirimi)

Kullanıcı v2.208 aracını Windows 11'de denedi. İki gerçek hata:

1. **SD kart reddedildi:** SD okuyucu `BusType=SCSI` bildirdi; araç yalnız
   USB/SD/MMC kabul ediyordu.
2. **USB'de paket oluşmadı:** `Bağımsız değişken türleri eşleşmiyor`
   (ArgumentException). Kök: `files = @($entries)` (PowerShell 7.7'de
   `List[object]` üzerinde hata) ve `Compress-Archive` modül bağımlılığı.

### Düzeltmeler

- **SD/SCSI:** `Get-Volume.DriveType = Removable` ise SCSI kabul; sistem/boot
  diski reddedilir. Log'da `Sürücü türü · BusType`.
- **`files = $entries.ToArray()`**: ArgumentException giderildi.
- **ZIP:** .NET `ZipFile.CreateFromDirectory`; modül yoksa `Compress-Archive`
  yedeği.
- **`-Operator` zorunlu**; boş künye ile paket oluşmaz.
- **Konsol UTF-8:** `chcp 65001` + `[Console]::OutputEncoding`.
- **`device.removable`:** manifest alanı; AKİS'te SCSI+removable → `usb`,
  SD/MMC → `memory_card`.
- **Yol ayırıcı:** `TrimStart/TrimEnd` `\` ve `/` kabul eder (Linux testi).

### Ölçüm

- PowerShell 7.7 (Linux, `-Simulate`) uçtan uca: 2 dosya → `delil.json` + ZIP
  → AKİS'te **2/2 Doğrulandı**, operatör/seri/cihaz rapora girdi, JS hatası 0.
- Windows `diskpart`/SD algılama bu ortamda denenemedi; kullanıcı denemesi
  bekleniyor.

### Koruyan test

- `birim-testleri` **[78]**: SCSI+removable → `usb`, SD → `memory_card`
  (40 kontrol). `bash tools/test.sh` tümü yeşil.

### KURAL (tekrar)

- **PowerShell'de `List[object]` üzerinde `@($list)` kullanmayın.** `.ToArray()`
  kullanın. Aksi hâlde PS 7.7'de `Argument types do not match` alınır.
- **Dış modül bağımlılığından kaçının:** `Compress-Archive` yerine .NET
  `ZipFile`; Windows PowerShell 5.1 ve PS 7'de çalışır.
- **Cihaz filtresi yalnız `BusType`'a bakmaz:** SD okuyucular SCSI bildirir;
  `DriveType=Removable` da kabul ölçütüdür. Sistem diski her zaman reddedilir.

## EK DÜZELTME (v2.210) — Windows ZIP ayırıcısı

Kullanıcı sıfır profilli Brave'de SD paketini yükledi: **0 doğrulandı, 10
pakette yok**. Paket sağlamdı; hata uygulamadaydı.

### Kök neden

Windows .NET `ZipFile.CreateFromDirectory` ZIP girdi adlarını **`\`** ile
yazabiliyor (`ses\00-bozuk.aac`). Uygulama yalnız `/` ile eşleştiriyordu
(`ses/00-bozuk.aac`); `delil.json` kökte bulundu, ses dosyaları "yok" sayıldı.

### Düzeltme

- `importDelilPack`: ZIP girdi adları ve `relPath` **`/` üzerinden normalize**;
  büyük/küçük harf duyarsız yedek eşleşme.
- `findDelilManifestPath`: `\` içeren yol da kök/nested bulunur.
- Kart okuyucu modeli "Card Reader" ise ortam türü **Hafıza kartı**.
- `edinme.ps1` başında `chcp.com 65001` (Windows PowerShell 5.1 Türkçe konsol;
  Linux'ta yok sayılır).

### Ölçüm

- `\` ayırıcılı ZIP (1 WAV) → **1/1 Doğrulandı**, onay penceresi yok, JS hatası 0.
- Normal `/` ZIP ve PowerShell `-Simulate` → 2/2 Doğrulandı (önceki).
- `birim-testleri` [78]: backslash `delil.json` + "Card Reader" eşlemesi.

### KURAL

- **ZIP girdi adlarını asla ham karşılaştırmayın.** `\` ve `/` aynı anlama
  gelir; normalize edin. Windows'ta üretilen ZIP, Linux/macOS'ta üretilenden
  farklı ayırıcı taşıyabilir.
- Büyük/küçük harf de eşleşmeyebilir (Windows duyarsız, ZIP duyarlı); yedek
  eşleşme tutun.
- Bir dosya "pakette yok" diyorsa önce **ayırıcı** ve **göreli yol** kontrol
  edilir; paketin bozuk olduğu sonucuna hemen varılmaz.

## EK DÜZELTME (v2.211) — Delil paketi kopya oluşturmaz

Kullanıcı gerçekçi senaryoyu denedi: dosyada elle eklenmiş, düzenlenmiş ve
onaylanmış bir kayıt varken aynı sesi içeren delil paketini yükledi. Sonuç:
**12 kayıt** (2 elle + 10 paket) ve paket kopyalarında düzenleme/onay yok.

### Kök neden

Paket içe aktarma her zaman **yeni materyal** ekliyordu; aynı ses olup olmadığını
**SHA-256 ile karşılaştırmıyordu**. `-IncludeAll` ile gelen `bilgi.txt` gibi ses
dışı dosyalar da materyal sanılıyordu.

### Düzeltme

- **Yinelenen koruması:** `delilDuplicateOf(materials, hash)`; aynı SHA-256 varsa
  yeni kayıt açılmaz.
- **Edinme bilgisi mevcut kayda işlenir:** paket doğrulandıysa
  `origin.acquisition` mevcut materyale yazılır; düzenlemeler/onaylar korunur;
  günlüğe "Delil paketinden edinme bilgisi işlendi" girer.
- **Ses dışı dosyalar:** `isAudioFileName`; `bilgi.txt`/video materyal olmaz,
  manifestte kalır, "Ses dışı (atlandı)" görünür. `-IncludeAll` güvenli.
- **Birim:** `device.volumes` sonuç penceresinde ve rapor cihaz hücresinde
  (`model · D:`).

### Ölçüm

- Onaylı/düzenlenmiş materyal + aynı WAV + `bilgi.txt` ZIP:
  kayıt **1**, `review` **approved**, metin **düzenlenmiş metin** korundu,
  `origin.acquisition.hashState` **verified**, birim **D:**, günlük 1;
  pencere **1 zaten vardı · 1 ses dışı**.
- Boş dosyaya aynı ZIP: **1 doğrulandı · 1 ses dışı**, kayıt 1; JS hatası 0.
- Rapor: cihaz + birim + operatör.

### KURAL

- **İçe aktarma "ekle" demek değildir; önce KİMLİK (SHA-256) kontrol edilir.**
  Aynı ses ikinci kez eklenirse düzenlemeler/onaylar kaybolur. Yeni materyal
  yalnız hash dosyada yoksa açılır.
- **Edinme bilgisi mevcut kayda işlenir**, yeni kopya açılmaz.
- **Ses dışı dosya materyal değildir.** Manifestte kalır; arayüzde atlandı
  olarak görünür.
- **Eski kopyalar silinmez:** v2.211 öncesi oluşanlar Kaldır ile temizlenir.
- **Hash yoksa eşleşme olmaz:** eski kayıtta `sha256` yoksa yeni kayıt açılır.

## YENİ OTURUM DEVRİ (v2.211) — Delil envanteri ve teslim zinciri

### Durum (2026-11-22)

| | |
|---|---|
| Sürüm | **v2.211** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1155 birim + 482 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | `main` = `origin/main` = `895b8df` (push doğrulandı) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.211** |
| Açık konu | **v2.212–v2.215** delil envanteri/teslim zinciri planı; envanter yeri kararı |

### Bu oturumda tamamlananlar (v2.208–v2.211)

| Sürüm | Konu | Koruyan test |
|---|---|---|
| v2.208 | `delil.json` + PowerShell edinme aracı + AKİS “Delil paketi yükle” + rapor bölümü | `birim` [78], `rapor` 14, `tasarim` [2bg] |
| v2.209 | SD/SCSI kabul (Removable), ZIP .NET, `-Operator` zorunlu, UTF-8 | `birim` [78] |
| v2.210 | Windows ZIP `\` ayırıcısı normalizasyonu | `birim` [78] |
| v2.211 | SHA-256 yinelenen koruması, ses dışı atlama, birim bilgisi | `birim` [78] |

**Kullanıcı testi (Windows 11):** SD (SCSI+Removable) ve USB (Kingston) →
salt-okunur EVET → 10 dosya → `delil.json` + ZIP → AKİS'te **10/10 Doğrulandı**.
Aynı paket mevcut dosyaya yüklenince **kopya oluşmadı**; düzenleme/onay korundu,
edinme bilgisi mevcut kayda işlendi.

### Kullanıcı kararları (onaylandı)

1. **Paket “imaj gibi” düşünülecek.** İçinde avukat/başka kişinin koyduğu
   bilinmeyen dosyalar olabilir; yalnız sese daralmayalım.
2. **Varsayılan kopya: tüm dosyalar.** `-AudioOnly` büyük medya için seçenek.
3. **Kök klasör:** **etiket → seri → marka** sırasıyla, sanitize edilmiş ad.
   `ses/` adı terk edilecek; `icerik/<stabıl kök>/<klasör yapısı>`.
4. **Rapor:** **Teslim eden** ve **Operatör** ayrı alanlar. Operatör hücresi
   `Ad Soyad · Sicil`. **Sürücü harfi (D:) rapora yazılmaz**; marka/model/
   seri/etiket yazılır. `device.volumes` yalnız `delil.json` teknik izinde kalır.
5. **`disk.json`:** disk/partition/volume anlık görüntüsü (raw değil, sıfır yok).
6. **Envanter yeri:** kullanıcı kararsız; **yeni oturum ölçüp karar verecek**
   (A: “Ses” içinde ağaç · B: yeni “Envanter” ray öğesi).
7. **Elle “Dosya ekle” hemen kaldırılmayacak.** Eski dosyalar ve paketsiz
   istisnalar için **ikincil “Elle ekle (paketsiz)”** olarak kalacak. Kaldırma
   ancak envanter UI oturduktan ve ölçüldükten sonra.

### Plan (v2.212–v2.215)

| Sürüm | İş | Not |
|---|---|---|
| **v2.212** | Teslim/operatör ayrımı + rapor düzeltmesi | `delivery` alanları, operatör sicili, D: kaldır, marka/seri/etiket |
| **v2.213** | Disk envanteri + paket v2 | `disk.json`, `icerik/<kök>/...`, varsayılan tüm dosyalar, `-AudioOnly`; v1 uyumlu |
| **v2.214** | Envanter arayüzü | ağaç, filtre, paket özeti, “Elle ekle” ikincil |
| **v2.215** | Hızlı akış | “Paketten yeni dosya” sihirbazı, ilerleme, hatırlama, toplu |

### v2.212 için somut kapsam (sıradaki)

- `delil.json`:
  - `operator: { name, registry, organization }`
  - `delivery: { deliveredBy, registry, deliveredAt, place, method }`
  - `device: { busType, model, serial, label, sizeBytes, removable }`
  - `volumes` yalnız teknik iz.
- `edinme.ps1` parametreleri:
  `-Operator`, `-OperatorRegistry`, `-DeliveredBy`, `-DeliveredByRegistry`,
  `-DeliveredAt`, `-DeliveryPlace`.
  - `Operator` zorunlu; teslim alanları isteğe bağlı ama **sorulur**.
- AKİS:
  - `origin.deliveredBy`, `origin.deliveredAt`, `origin.deliveredByRegistry`,
    `origin.deliveryPlace`.
  - `origin.acquisition.operator.registry`.
  - Sonuç penceresi: “Teslim eden · tarih · yer” ve “Operatör · sicil”.
  - Rapor “KAYIT KÖKENİ VE TESLİM ZİNCİRİ”: teslim eden/tarih.
  - Rapor “DELİL EDİNME VE DOĞRULAMA”: operatör + sicil, marka/model/seri/
    etiket; **D: yok**.
- Test: `birim` [78] + `rapor` 14 + `tasarim` [2bg] güncellenecek.

### Açık sorular (yeni oturum)

1. **Envanter yeri:** A (“Ses” içinde ağaç) mı, B (yeni “Envanter” ray öğesi)
   mi? Ölçüt: tıklama, kaydırma, görünmeyen kontrol, mevcut ses akışının
   bozulmaması.
2. **Elle ekle:** ikincil menüde kalsın mı? (Öneri: kalsın; kaldırma ayrı ve
   ölçümlü karar.)
3. **`-AudioOnly` eşiği:** öneri 8 GB üstünde uyarı; kullanıcı onayı.
4. **Teslim eden sicili** zorunlu mu? (Öneri: isteğe bağlı.)
5. **Teslim yeri/şekli** rapora ayrı satır mı? (Öneri: evet, isteğe bağlı.)
6. **Hukuki usul:** kurumun standardı teyit edilecek; uygulama yalnız doğru
   kaydı ve dürüst sınırı sağlar.

### Değişmez kurallar / dersler (bu oturum)

- **ZIP girdi adları `\` veya `/` olabilir; normalizasyon ZORUNLU.** Windows
  .NET `\` yazar; ham karşılaştırma “pakette yok” üretir.
- **İçe aktarma = kimlik kontrolü.** Aynı SHA-256 varsa yeni kayıt açılmaz;
  mevcut düzenleme/onay korunur; edinme bilgisi mevcut kayda işlenir.
- **Ses dışı dosya materyal değildir.** Manifestte kalır; “Ses dışı (atlandı)”.
- **PowerShell `List[object]` üzerinde `@($list)` kullanma.** `.ToArray()`.
- **Salt-okunur doğrulaması `Get-Disk.IsReadOnly` ile** (dil bağımsız).
- **SD okuyucular SCSI bildirir;** `DriveType=Removable` kabul ölçütü.
- **Sürücü harfi kanıt kimliği değildir;** rapora yazılmaz.
- **Teslim eden ≠ operatör.** İkisi ayrı kaydedilir.
- **Elle ekleme kaldırılmadan önce** envanter akışının eski dosyaları
  kapsadığı ölçülür.

### İlk komut (yeni oturum)

```bash
bash tools/test.sh
git log --oneline -3
curl -s https://azmisahin-gov.github.io/akis/version.json
```

Beklenen: **1155 birim + 482 şema** + rapor/sürüm/tasarım yeşil; sürüm 2.211.
Sonra **v2.212** ile başla.

## YENİ OTURUM DEVRİ (v2.212) — Delil teslim zinciri

### Durum (2026-11-22)

| | |
|---|---|
| Sürüm | **v2.212** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1188 birim + 482 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Git | commit + push sonrası doğrulanacak |
| Açık konu | v2.213 (disk envanteri + paket v2), v2.214 (envanter UI) |

### Ne yapıldı

- **Teslim eden ≠ operatör.** `delil.json` → `delivery { deliveredBy, registry,
  deliveredAt, place }`; AKİS → `origin.deliveredBy`, `deliveredByRegistry`,
  `deliveredAt`, `deliveryPlace`. Operatör `acquisition.operator` alanında kalır.
- **Sürücü harfi rapordan kaldırıldı** (`device.volumes` yalnız teknik izde).
- **Operatör hücresi** `Ad · Sicil`; köken tablosu 7 sütun (`TESLİM YERİ`).
- **Alet adı ürün adı değil:** `edinme.ps1 1.0 · PowerShell` (rapor ARAÇ sütunu).
  Eski paketler kendi alet adını taşır; manifest tahrif edilmez.
- **Rapor metni** ürün kimliği taşımaz (`acqIntro` yeniden yazıldı).
- **Yeniden yükleme ezmez:** yalnız boş köken/teslim alanı dolar; günlüğe yazılır.
- **Birleştirme nesneyi JSON ile karşılaştırır:** aynı tutanak çakışma değil;
  farklıysa okunur metin. Önizleme = birleştirme.
- **Araç indirme:** Ses → **Edinme aracını indir** (zip: ps1 + BASLAT.bat + OKUBENI).
- **edinme.ps1:** `-OperatorRegistry`, `-DeliveredBy`, `-DeliveredByRegistry`,
  `-DeliveredAt`, `-DeliveryPlace`, `-NonInteractive`; `device.label`.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Rapor ÜRÜNÜ değil ALETİ adlandırır.** ARAÇ hücresi `ad sürüm · motor`.
   Ürün adı/sürümü hiçbir çıktıda (başlık, künye, alt bilgi, gövde) yer almaz.
   Delil verili çıktı da kurala dahildir (`rapor` Senaryo 15).
2. **Sürücü harfi kanıt kimliği değildir.** Rapora yazılmaz; platform değişince
   değişir. Yalnız `delil.json` teknik izinde (`device.volumes`) kalır.
3. **Teslim eden ≠ operatör.** İkisi ayrı alan, ayrı sütun. Boş alan uydurulmaz.
4. **TCKN istenmez.** "Sicil / kayıt no (varsa)" serbest metindir, doğrulanmaz.
5. **`normalizeMaterial` beyaz listesi:** `origin` altına yeni alan eklerken
   `emptyMaterial.origin` + `normalizeMaterial` + test **birlikte** güncellenir;
   aksi hâlde alan ilk kaydetmede sessizce silinir (v2.212'de ölçüldü).
6. **Birleştirmede nesne değeri referansla karşılaştırma.** `sameOriginValue`
   + `originValueText` kullanın; ekranda `[object Object]` yasak.
7. **Yeniden yükleme ezmez:** mevcut kaydın dolu alanı korunur, yalnız boş alan
   dolar ve günlüğe yazılır.

### Dürüst sınır

`edinme.ps1` bu ortamda (Linux, USB yok, `pwsh` yok) **çalıştırılmadı**. Yalnız
şema/import/rapor tarafı otomatik sınandı. Windows'ta kurgusal klasörde
`-Simulate` ve gerçek USB'de teslim parametreleriyle denenmelidir.

### Sıradaki iş

**v2.213 — Disk envanteri + paket v2:** `disk.json`, `icerik/<etiket|seri|marka>/`,
varsayılan tüm dosyalar, `-AudioOnly`; v1 uyumlu. Ayrıntı:
`docs/GELECEK_PLANI.md` §9.

## YENİ OTURUM DEVRİ (v2.213) — Delil tabloları ve Edinim 1.1

### Durum (2026-11-22)

| | |
|---|---|
| Sürüm | **v2.213** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → birim + 482 şema + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.214 (disk envanteri + paket v2), v2.215 (envanter UI) |

### Ne yapıldı

- **Envanter tablosu 7 ayrı sütun:** DOSYA ADI · DOSYA BİÇİMİ · DOSYA BOYUTU ·
  SÜRE · SES KANALI · ÖRNEKLEME HIZI · SHA-256. Tek kaynak `inventoryRows(c)`;
  HTML/DOCX/UDF aynı hücreleri kullanır.
- **Biçim uzantıdan:** `audioFormatLabel(name, codec)`. Delil paketinde MIME
  `audio/*` gelir; uzantı asıl kaynaktır. `audioTech(blob, name)` imzası
  değişti — çağrılarda **adı geçirin**.
- **Köken tablosu 8 sütun:** KAYIT CİHAZI ve KAYIT TARİHİ **ayrı**. Edinme
  yöntemi/aracı bu alanlara yazılmaz. Bilinmiyorsa **"bilinmiyor"**.
- **Edinme tablosu 9 sütun:** CİHAZ ve ETİKET ayrı.
- **Alet adı:** `Edinim v1.1` (rapor ARAÇ sütunu). Yöntem: "Mantıksal kopya".
- **Edinim 1.1 (ps1):** soru-cevap sihirbazı, özet+onay, ilerleme çubuğu,
  `E`/`E:`/`E:\` normalizasyonu, UTF-8 BOM, `İŞLEM DURDURULDU` çıkışı.

### DEĞİŞMEZ KURALLAR

1. **Rapor ÜRÜNÜ değil ALETİ adlandırır.** ARAÇ hücresi `Edinim v1.1` gibi
   `ad vSürüm` biçimindedir. Ürün adı hiçbir çıktıda geçmez.
2. **"Bilinmiyor" uydurma değer değildir.** Ölçülemeyen/verilmeyen alan
   "bilinmiyor" (veya "—") yazar; tahmin yazılmaz.
3. **Edinme yöntemi kayıt cihazı değildir.** `origin.deviceInfo`'ya yöntem/araç
   yazılmaz; yöntem `acquisition.method`, araç `acquisition.method.tool`'dadır.
   Eski kayıtlarda `deviceInfo` içindeki gerçek cihaz metni `recordingDevice`'e
   göç eder; makine metni (Mantıksal/PowerShell/Edinim…) yok sayılır.
4. **Envanter tek kaynak.** Yeni bir çıktı yolu eklerken `inventoryRows(c)`
   kullanın; satır biçimini kopyalamayın.
5. **`audioTech` ad ister.** Uzantı bilgisi olmadan biçim "Bilinmiyor" olur.
6. **PowerShell betiği UTF-8 BOM ile kaydedilir.** BOM'suz dosyayı Windows
   PowerShell 5.1 ANSI okur ve Türkçe bozulur (`tasarim` [2bi] denetler).
7. **Sürücü yolu normalize edilir.** `E`, `E:` ve `E:\` aynı kabul edilir;
   iki nokta eksikliği hata değildir.
8. **Sihirbaz = soru-cevap.** Zorunlu alan boşsa tekrar sorulur; isteğe bağlı
   alan boş bırakılabilir; özet gösterilip onay istenir. `-NonInteractive`
   betikli kullanım içindir.

### Dürüst sınır

`edinme.ps1` bu ortamda çalıştırılmadı (Linux, USB yok, `pwsh` yok). Windows'ta
`-Simulate` ve gerçek USB'de denenmelidir.

### Sıradaki iş

**v2.214 — Disk envanteri + paket v2:** `disk.json`, `icerik/<etiket|seri|marka>/`,
varsayılan tüm dosyalar, `-AudioOnly`; v1 uyumlu.

## EK DÜZELTME (v2.214) — Zip'te BOM korunur (Edinim 1.2)

**BELİRTİ (canlı, Windows PowerShell 5.1):** `Unexpected token 'Delil'` ve
ekranda `EDÄ°NÄ°M {0} â€” Delil Edinme`. Dosya UTF-8'ti ama PowerShell ANSI
okuyordu.

**KÖK NEDEN:** `downloadAcquisitionTool()` içinde `fetch().text()` kullanılıyor.
**UTF-8 çözücüsü baştaki BOM'u SİLER**; JSZip BOM'suz yazar. Depodaki dosyada
BOM vardı, indirilen zip'te yoktu. cp1252'de `—` → `”` olur; PowerShell akıllı
tırnağı **dize sınırı** sanar ve betik erken kapanır.

**DÜZELTME:**
1. `acquisitionToolFileContent(name, text)` → `.ps1` başına `U+FEFF` ekler
   (varsa ikizlemez). Zip'e bu içerik yazılır.
2. `edinme.ps1` içinde tipografik işaret **yok** (`—`, `→`, `≠`, `·`, `…`
   ASCII'ye çevrildi). BOM yine kaybolsa betik **çalışır**; yalnız Türkçe
   harfler bozuk görünür.
3. Alet sürümü **1.2**; uygulama **2.214**.

**KORUYAN TEST:** `birim` [80] (BOM eklenir/ikizlenmez, .bat/.md değişmez) +
`tasarim` [2bi] (ps1 BOM'lu, tipografik işaret yok, sürüm 1.2).

**DERS:** Tarayıcıda dosya indirirken **baytları** düşünün. `text()` metin
verir, BOM'u atar; `Blob`/`arrayBuffer` bayt verir. Bir betiğin kodlaması
önemliyse içeriği metin olarak yeniden paketlerken BOM'u **açıkça** geri koyun.

## YENİ OTURUM DEVRİ (v2.215) — Paket v2: disk yapısı ve disk.json

### Durum (2026-11-22)

| | |
|---|---|
| Sürüm | **v2.215** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1237 birim + 482 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.216 (envanter ağacı UI), v2.217 (sanal imaj/geri yazma fikri) |

### Ne yapıldı

- **Paket yapısı v2:** `icerik/<cihaz-kökü>/<kaynak yolu>`; yapay `ses/` yok.
  Kök = **seri no** (yoksa etiket/model), klasör kaynağında klasör adı.
- **İki yol:** `files[].relPath` = kaynak cihaz yolu; `files[].packagePath` =
  paket içi yol. AKİS `packagePath || relPath` sırasıyla arar (v1 uyumlu).
- **Varsayılan tüm dosyalar**; `-AudioOnly` yalnız ses. `-IncludeAll` no-op.
- **`disk.json` (`akis.disk.v1`):** disk/bölüm/birim metadata'sı + dizin ağacı.
  Raw sektör/boş alan **yok**; imaj değildir.
- **AKİS:** `case.disks[]` (normalize + birleştirme kimlikle + önizleme sayacı);
  materyal `origin.acquisition.diskId`, `fileRelPath`, `packagePath`.

### DEĞİŞMEZ KURALLAR

1. **`relPath` KAYNAK yoludur.** Paket içi yol `packagePath`'tir. Yapay klasör
   (`ses/`) eklemeyin; disk yapısı birebir korunur.
2. **Kök = seri no** (yoksa etiket/model). Klasör kaynağında klasör adı.
3. **Varsayılan tüm dosyalar.** Yalnız ses istenirse `-AudioOnly`.
4. **`disk.json` metadata'dır.** Raw sektör/boş alan/silinmiş veri içermez;
   "imaj" diye sunulmaz.
5. **Disk envanteri kimlikle birleşir.** Aynı kimlik + farklı içerik = çakışma;
   sessiz ezme yok.
6. **Eski paketler açılır.** `relPath` yedeği ve `ses/` adayları korunur.

### Dürüst sınır

`edinme.ps1` burada çalıştırılmadı. Sanal imaj üretme/geri yazma **yapılmadı**;
yalnız yapı korunuyor.

### Sıradaki iş

**v2.216 — Envanter arayüzü:** `case.disks[]` ağacı, dizin/filtre, paket özeti;
"Elle ekle (paketsiz)" ikincil. Rapor bölümü ayrı sürüm.

## YENİ OTURUM DEVRİ (v2.216) — Delil envanteri ve dosya zamanları

### Durum (2026-11-22)

| | |
|---|---|
| Sürüm | **v2.216** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1251 birim + 482 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Gömülü metadata (MP4/ID3) okuma; raporda dosya zamanı sütunu |

### ÜÇ KATMAN (değişmez kavramsal çerçeve)

| Katman | Alan | Anlamı |
|---|---|---|
| **Kayıt** | `origin.recordingDevice`, `origin.recordingAt` | Sesin oluştuğu cihaz/an. **Beyan**; genelde bilinmiyor. |
| **Ortam** | `origin.fileTimes {createdAt, modifiedAt, accessedAt}` | USB'deki dosya sistemi zamanı. **Gözlem**; kayıt zamanı DEĞİL. |
| **Edinme** | `acquisition.acquiredAt` + `sha256` | Bizim aldığımız an; kesin. |

### Ne yapıldı

- **Delil envanteri paneli:** Ses görünümünde katlanır `#delilInventory`; paketteki
  TÜM dosyalar (ses + ses dışı) klasör ağacıyla. Arama (`#invFilter`), çoklu paket
  seçimi (`#invPackSelect`), ses satırı → `setActiveMaterial`.
- **Envanter verisi:** `case.disks[].files` = `{name, relPath, packagePath,
  sizeBytes, sha256, role, state, materialId}`. v1 paketlerde de oluşur.
- **Dosya zamanları:** `origin.fileTimes`; edinimde okunur, `disk.json`
  `source.timeZone/utcOffsetMinutes` taşır.
- **Rapor notu:** `REPORT_TEXT.originFileTimeNote` — köken tablosunun altında,
  üç çıktıda aynı.

### DEĞİŞMEZ KURALLAR

1. **Dosya sistemi zamanı KAYIT ZAMANI değildir.** `KAYIT TARİHİ` sütununa
   yazılmaz; yalnız `origin.fileTimes` (gözlem) olarak saklanır ve rapor notuyla
   sınırı söylenir.
2. **Envanter tek kaynak:** `inventoryTree` + `inventoryCounts`. Yeni bir görünüm
   eklerken bunları kullanın.
3. **Envanter yalnız oturumluk filtre tutar** (`invState.filter`); kayda yazılmaz.
4. **Ses satırı kaydı açar**, yeni kayıt oluşturmaz.
5. **`case.disks[].files` paket gerçeğidir**; materyal silinse bile envanterde
   dosya görünür (rol/ses, materyal bağı boşalabilir).
6. **Rapor notu kaldırılamaz:** "gözlem, kayıt zamanı değil" açıklaması üç
   çıktıda bulunmalı (`rapor` Senaryo 14 denetler).

### Dürüst sınır

Dosya sistemi zamanları **gözlem**dir; kayıt anını kanıtlamaz. Gömülü metadata
(MP4 `creation_time`, ID3 `TDRC`, WAV `bext`) okuma **yapılmadı**; sıradaki aday.

### Sıradaki iş

**v2.217 — Gömülü metadata (cihaz beyanı):** MP4/M4A `creation_time`, ID3
`TDRC/TDRL`, WAV `bext`/`ICRD`; **"cihaz beyanı"** etiketiyle, doğrulanmış gerçek
gibi sunulmadan. Sonra raporda ayrı sütun/not.

## YENİ OTURUM DEVRİ (v2.217) — Gömülü metadata (cihaz beyanı)

### Durum (2026-11-22)

| | |
|---|---|
| Sürüm | **v2.217** |
| Testler | `bash tools/test.sh` → **1277 birim + 482 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Rapor sütunu olarak gömülü metadata (şu an ayrı bölüm, isteğe bağlı) |

### Ne yapıldı

- Ayrıştırıcılar: `parseId3v2`, `parseMp4Meta`, `parseWavMeta`, `parseFlacMeta`,
  `readEmbeddedMeta`, `audioEmbedded`, `embeddedSummary`, `embeddedRows`.
- `origin.embedded = { source, recordingAt, encodingAt, releaseAt, software, readAt }`.
- Köken panelinde özet + `data-read-embedded` (Dosyadan oku).
- Rapor anahtarı: `case.report.includeEmbedded` (**varsayılan false**),
  `#reportEmbeddedToggle`.

### DEĞİŞMEZ KURALLAR

1. **Gömülü metadata BEYANDIR.** Doğrulanmış gerçek gibi sunulmaz; `recordingAt`
   alanına (beyan) yazılmaz, ayrı `embedded` alanında durur.
2. **Rapora kendiliğinden girmez.** Varsayılan kapalı; kullanıcı açarsa üç
   çıktıda aynı bölüm.
3. **Ayrıştırma hatası veriyi düşürmez.** Hata yutulur, sonuç boş kalır.
4. **Yalnız ilk 8 MB taranır** (performans); büyük dosyada metadata sonda
   olabilir — bu bilinen sınırdır.
5. **MP4 zamanı UTC'ye çevrilir** (1904 epoch); diğer biçimler **ham metin**
   olarak korunur (saat dilimi uydurulmaz).

### Dürüst sınır

Metadata değiştirilebilir, cihaz saati yanlış olabilir, çoğu dosyada yoktur.
"Kayıt zamanı" kanıtı değildir.

### Sıradaki iş (aday)

Rapor sütunu/grafiği; gömülü metadata ile dosya zamanı arasındaki farkı gösteren
**tutarlılık uyarısı** (ör. mtime < metadata tarihi). Karar kullanıcıda.

## YENİ OTURUM DEVRİ (v2.217 → sıradaki oturum) — ÖNCE TASARIM, SONRA RAPOR

### Durum (2026-11-22)

| | |
|---|---|
| Sürüm | **v2.217** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1277 birim + 482 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` = **9b9d9d8** |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.217** |
| Plan | `docs/GELECEK_PLANI.md` **§11** (birleşik yol haritası) |
| Açık konu | **v2.218 tasarım denetimi**, sonra **rapor** |

### KULLANICI TALİMATI (değişmez — bu oturumun sırası)

> “Yeni oturum bunlara başlamadan **önce tasarımı gözden geçirsin**, çünkü en son
> **delil envanteri** eklemesinden sonra bazı **tutarsız görünümler** olmaya
> başladı; belki daha iyi şekiller yapabilir. … Eğer çok yüksek değerli ya da çok
> acil değilse **rapora odaklanacağız**.”

Bu yüzden sıra **kesin**:

1. **v2.218 — Tasarım denetimi ve düzeltme.** Yeni özellik YOK; yalnız görsel/
   yerleşim tutarlılığı. Ölç, düzelt, ölç.
2. **v2.219+ — Rapor odağı** (B1 → B2). Aradaki maddeler yalnız gerçekten
   yüksek değerli/acilse öne alınır.

### 1) İLK İŞ: v2.218 tasarım denetimi (zorunlu)

**Neden:** v2.216'da eklenen `#delilInventory` paneli, v2.212–v2.217'de köken
paneline eklenen yeni alanlar (`recordingDevice`, `recordingAt`, `fileTimes`,
`embedded`) ve rapor dipnotları/gömülü metadata bölümü, mevcut panel dilinden
farklı görünüyor olabilir. Kullanıcı bunu **gözle** fark etti; doğrulama **ölçümle**
yapılır.

**Denetlenecek yüzeyler ve ölçütler:**

| Yüzey | Ne ölçülür | Aranan |
|---|---|---|
| `#delilInventory` | yükseklik, kenarlık/yarıçap, `summary` punto, `panel-heading` ile boşluk | malzeme paneliyle **aynı dil**; başlık hiyerarşisi tutarlı |
| Köken paneli | alan hizası, 2 sütun ızgara, uzun metin sarma, `mini-button` boyu | etiketler hizalı; taşma yok |
| Envanter ağacı | satır yüksekliği, girinti, `overflow`, uzun yol | kırpma yok; `overflow-wrap` |
| Rapor | `originFileTimeNote`, gömülü metadata tablosu, anahtar | 1440/900/600 px **kırpma 0** |
| Üç tema | yüzey + metin kontrastı; durum renkleri | açık/koyu/sepya aynı okunurluk |
| Durum matrisi | `:hover`, `.on`, `.is-active`, `[open]` | CDP `CSS.getMatchedStylesForNode` ile **hangi kural kazanıyor** |

**Yöntem (depo kuralı):** `getBoundingClientRect`, `scrollWidth > clientWidth`,
`elementFromPoint`, CDP matched styles, ekran görüntüsü. Tahminle düzeltme yok.

**Kural:** tek sürüm (v2.218), davranış değişmez, `bash tools/test.sh` yeşil,
ölçüm tablosu CHANGELOG'a. Yeni özellik eklenmez.

### 2) SONRA: Rapor odağı (B1 → B2)

- **B1 — Bölüm/başlık tek kaynak:** başlık, sıra, TOC tek yerden; HTML/DOCX/UDF
  aynı metni üretir (`rapor-tutarlilik-testi` korur).
- **B2 — Kurumsal kâğıt biçimi:** başlık bandı, sayfa no, imza bloğu, tablo
  tipografisi. **Şart:** üç çıktı birlikte test; uygulama adı geçmez.
- Sıra kullanıcıya sorulabilir: **B1 mi B2 mi** önce?

### 3) Birleşik plan (kaydedildi)

`docs/GELECEK_PLANI.md` **§11** — tablolar, emek/risk, karar soruları:

| Grup | İçerik |
|---|---|
| **A** | Kanıt tutarlılığı: A1 çelişki uyarısı, A2 envanterde dosya zamanları, A3 tam dosya metadata, A4 hazırlık maddesi |
| **B** | **Rapor:** B1 bölüm/başlık, B2 kâğıt biçimi, B3 case alanları, B4 metadata sütunu |
| **C** | LLM'siz yardımcılar: C1 soru↔bölüm, C2 terim listesi, C3 seçmeli özet |
| **D** | Delil: D1 `-AudioOnly` eşiği, D2 Rust CLI, D3 Tier 2 imaj, D4 sanal imaj/geri yazma, D5 yerel ajan, D6 paket sihirbazı |
| **E** | LLM (Ollama 4B, isteğe bağlı; tarayıcı küçük modeller ❌) |
| **F** | Platform/borç: Tauri, tam Rust, CSS borcu, ≤900 px sınırı |

Önerilen sıra: **v2.218 tasarım → v2.219 A1+A2+A4 → v2.220 A3 → v2.221 C1 →
v2.222 C2+C3 → v2.223 B1 → v2.224 B2 → D1 → D2 → (D3/D4) → D6 → B3/B4 → F.**

### 4) Karar bekleyen sorular

1. Write-blocker alınacak mı?
2. Ollama kabul edilebilir mi (kurulum + 4B model)?
3. Tier 2 / sanal imaj gerekli mi, Tier 1 yeterli mi?
4. Rapor: önce **B1** mi, **B2** mi?
5. Küçük maddeler aynı sözleşmede birleştirilsin mi? (öneri: evet, yalnız aynı sözleşme)

### 5) İlk komutlar

```bash
bash tools/test.sh
git log --oneline -3
curl -s https://azmisahin-gov.github.io/akis/version.json
```

Beklenen: **1277 birim + 482 şema** yeşil; sürüm **2.217**. Sonra **v2.218
tasarım denetimi** ile başla; rapor işine ondan sonra geç.


## YENİ OTURUM DEVRİ (v2.226 → sıradaki oturum) — RAPOR EKRANI VE ŞABLON YENİDEN PLANLANACAK

### Durum (2026-11-23)

| | |
|---|---|
| Sürüm | **v2.226** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1277 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` = `d1cc6da` |
| Pages | `built` |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.226** |
| Açık konu | **Rapor ekranı + şablon yeniden tasarımı** (plan: `docs/RAPOR_EKRANI_PLANI.md`) |

### KULLANICI TALİMATI (değişmez — yeni oturumun ilk işi)

> "Rapor sayfasının hem tasarımsal hem de şablonsal sorunları var. Yeni oturuma
> başlayacak kişi, kullanıcı için **kullanışlı bir rapor ekranı** planlamalı.
> Ayrıca **tüm rapor parçalarının, ekler de dahil tüm eklerin organize
> edilebilmesi** gerekiyor. Rapor gerçekten **tutarlı, düzenli ve okunaklı bir
> sırayla** hazırlanabilmeli. Şu anki yapıda hatalar var: rapor ekranının
> kullanımı sorunlu; rapor ve rapor şablonlarının kullanımı ve uygulama biçimi
> tasarımsal. Özetle **rapor bölümleri · A4 önizlemesi · rapor kontrolü ·
> gerekirse rapor revizyonu** gibi bölümler daha iyi planlanmalı."

**Yeni oturum ÖNCE plan yapar, sonra kod yazar.** Plan belgesi:
[`docs/RAPOR_EKRANI_PLANI.md`](docs/RAPOR_EKRANI_PLANI.md) — ekran mimarisi
(3 bölge), veri modeli (sıra + ekler), karar soruları, faz planı (v2.227+).

### Bu oturumda yapılanlar (v2.218–v2.226)

| Sürüm | Konu | Koruyan test |
|---|---|---|
| v2.218 | Delil envanteri masaüstü ızgara düzeltmesi | `tasarim` [2bm] |
| v2.219 | Parametrik rapor: 19 bölüm anahtarı + panel | `rapor` 17, `sema` [3h], `tasarim` [2bn] |
| v2.220 | 56.12 şablon bölümleri (künye, özet, iyileştirme, ASR, sınırlılık, gizlilik, Ekler) | `rapor` 18 |
| v2.221 | A4 sayfalı önizleme (ekran kılavuzu, varsayılan kapalı) | `sema` [3h], `tasarim` [2bo] |
| v2.222 | Teknik ortam alanları (7, elle) | `rapor` 19, `tasarim` [2bp] |
| v2.223 | Rapor profilleri: Yalın 7 · Standart 19 · Tam 56.12 27 | `sema` [3h], `tasarim` [2bq] |
| v2.224 | Yazdırmada yalnız rapor kâğıdı | `tasarim` [2br] |
| v2.225 | Künye ek alanları (ekler + tarafsızlık) | `rapor` 20, `tasarim` [2bs] |
| v2.226 | Kalite kontrolü / denetlenebilirlik (`qc`) | `rapor` 21, `tasarim` [2bt] |

**Eklenen rapor bölüm anahtarları (toplam 27):** 19 varsayılan açık
(cover, coverFields, toc, s1–s7, origin, embedded, acquisition, speakers,
reading, wer, levels, reviewSummary, signature) + 8 varsayılan kapalı
(kunye, summary, enhance, asr, tech, qc, scopeNote, privacy, annex → 9? bkz.
REPORT_SECTION_DEFS; sayı koda göre doğrulanır).

### Bilinen tasarım/şablon sorunları (yeniden tasarımın gerekçesi)

1. **Rapor ekranı kalabalık:** önizlemenin üstünde 4 panel + hazırlık kartı +
   2 anahtar yığılı; raporu görmek için kaydırmak gerekiyor.
2. **Sıralama yok:** bölümler yalnız aç/kapa; sıra değiştirilemiyor. TOC yalnız
   7 numaralı bölümü listeliyor.
3. **Ekler tek blok:** `annex` EK-1/2/3/5/6/7'yi birlikte basıyor; **EK-4 yok**
   (numarada boşluk), imza satırları yok; tek tek organize edilemiyor.
4. **Numara boşluğu:** bölüm kapatılınca numara boşluğu kalıyor (1,2,4…);
   numara türetilmeli.
5. **A4 önizlemesi yaklaşık:** gerçek sayfa kırılması değil; kâğıt genişliğinden
   hesaplanan kılavuz.
6. **Rapor kontrolü ayrı kart:** rapor ekranına entegre değil.
7. **Revizyon yok:** rapor düzeyinde sürüm/karşılaştırma yok.
8. **Şablon birebir değil:** eklenen 56.12 şablonunun 14 bölüm + 7 ek yapısı
   çıktıya birebir uygulanmıyor.

### Karar bekleyen sorular (yeni oturum kullanıcıya soracak)

1. A4 önizleme: gerçek sayfa ayırımı mı, yaklaşık kılavuz mu?
2. Sıralama: sürükle-bırak mı, yukarı/aşağı düğmeleri mi (erişilebilirlik)?
3. Şablon: çıktı 56.12'nin 14+7 sırasına birebir mi uysun, yoksa mevcut 7
   bölüm korunup şablon "Tam" profili mi olsun?
4. Revizyon: kaç sürüm, ne saklanır, karşılaştırma türü?
5. EK-4: içerik ne olsun / numara EK-1…EK-6'ya mı çekilsin?
6. İmza: EK-1 imza satırları elle mi, "e-imza üretilmez" notu mu?

### Değişmez kısıtlar (bozulmamalı)

- Rapor **bilirkişi adına**; uygulama adı/sürümü çıktıda geçmez.
- **Üç çıktı (HTML/DOCX/UDF) aynı metni** üretir.
- Ölçülmeyen iddia yok; boş alan "—".
- Kod ≠ etiket; **S1/S2 kayıt-içi, K1/K2 dosya-arası**.
- Yazdırmada yalnız rapor kâğıdı (v2.224).
- Kırpma yasak; sığmayan öğe sarar.
- Tek kaynak: bölüm/ek tanımı, numara, TOC, üç çıktı.

### İlk komutlar

```bash
bash tools/test.sh
git log --oneline -3
git status --short
curl -s https://azmisahin-gov.github.io/akis/version.json
```

Beklenen: **1277 birim + 517 şema** yeşil; sürüm **2.226**; `git status` temiz.
Sonra **`docs/RAPOR_EKRANI_PLANI.md`** okunur, §5 soruları kullanıcıya sorulur
ve **v2.227 — Rapor ekranı IA (3 bölge)** ile başlanır.

### Kullanıcı kararları (bu oturumdan, geçerli)

- Write-blocker: **alınmayacak** (56.12 için mevcut sistem yeterli).
- Ollama/LLM: **şimdilik kullanılmayacak** (WebGPU ile faydalı olanlar
  değerlendirilecek).
- Tier 2 / sanal imaj: **emin değil; gerekirse planlanacak**.
- Rapor: **örnek/şablon önce incelenecek**, sonra karar (bu oturumda yapıldı).
- Küçük maddeler **aynı sözleşmede birleştirilmeyecek** (hata riski).

## YENİ OTURUM DEVRİ (v2.236) — Kanıt tablosu sütunları

### DEĞİŞMEZ KURALLAR (v2.236)

1. **Kanıt tablosunda zaman + metin ZORUNLU.** `REPORT_COLUMN_LOCKED.segments =
   ['time','text']`; `reportTableColumns` kilitli sütunları her zaman basar.
   Panelde kilitli kutu `disabled` + ipucu. Bunları kapatılabilir yapmayın:
   tablo adli kanıt niteliğini yitirir.
2. `REPORT_COLUMN_TABLES.segments = ['time','speaker','text','review','obs']`.
3. **EK-2 envanteri** `reportTableColumns(c,'inventory',...)` kullanır; ana
   envanterle aynı sütun seçimi (SHA-256 kapatıldıysa ekte de yok).
4. Test: `birim [91]`, `rapor` 25, `tasarim [2cg]`.

## YENİ OTURUM DEVRİ (v2.235) — Rapor alanları (tablo sütunları)

### DEĞİŞMEZ KURALLAR (v2.235)

1. **TEK KAYNAK:** `REPORT_COLUMN_TABLES` + `REPORT_COLUMN_LABELS` (schema.js).
   Yeni bir tablo/sütun eklerken buraya yazın; panel, filtre ve üç çıktı aynı
   kaynaktan beslenir.
2. **Filtre tek fonksiyon:** `reportTableColumns(c, table, headers, rows, widths)`
   başlık/satır/genişlik üçlüsünü birlikte süzer. Çıktılarda ayrı sütun seçme
   mantığı yazmayın.
3. **Veri SİLİNMEZ:** yalnız gösterim. Tüm sütunlar kapalıysa boş tablo yerine
   `REPORT_TEXT.noColumns` yazılır.
4. `case.report.columns` varsayılan tümü açık; eksik alan açık varsayılır;
   bilinmeyen tablo korunur. **Rapor revizyonuna dâhildir** (`columns`).
5. Test: `birim [90]`, `rapor` 24, `tasarim [2cf]`, `surum` kimlikleri.

## YENİ OTURUM DEVRİ (v2.234) — Okuma metni bağımsız bölüm

### DEĞİŞMEZ KURALLAR (v2.234)

1. **`reading` artık gövde bölümü:** `REPORT_BODY_ORDER` içinde (`s5` sonrası).
   Üç çıktıda ayrı `reading` bloğu; `s5` içinde okuma metni ÜRETİLMEZ.
2. **Eski kayıt göçü:** `normalizeReportLayout`, sırada olmayan `reading`'i
   **sonda değil `s5` hemen ardına** koyar. `srcOrder`'da varsa konum korunur.
3. **Bağımsız aç/kapa:** `s5` kapalı + `reading` açık → okuma metni görünür;
   tersi de olur. `reportBlockRenders('reading')` grup yoksa bloğu çizmez.
4. Okuma metni **türetilmiş sunumdur**; bölümleri birleştirmez/bölmez. Kanıt
   tablosu ve cümle zamanları değişmez.
5. Test: `rapor` Senaryo 12, `birim [89]`, `tasarim [2ce]`.

## YENİ OTURUM DEVRİ (v2.233) — Rapor sayfa görüntüleyici

### DEĞİŞMEZ KURALLAR (v2.233)

1. **Kâğıt DOM'u BÖLÜNMEZ.** Sayfalama `.report-page-window` (sabit yükseklik,
   overflow hidden) + kâğıt `translateY(-sayfa×pageH)` ile yapılır. DOM'u A4
   sayfalara bölmek riskli; yapmayın.
2. **Sayfa modu sığdırmayı gerektirir:** tek sayfa tam görünsün diye
   `applyReportPageView` fit'i açar. Okumak için "Sürekli" anahtarı.
3. **Sayfa indeksi oturumluk** (`reportPageIndex`); kayda yazılmaz. Tercih
   `akis.reportContinuous`.
4. **Sabit çubuk:** `.report-stage-bar` `top: var(--report-toolbar-h)` ile araç
   çubuğunun altında yapışır; `syncReportToolbarHeight` yüksekliği ölçer.
   Rapor görünümünde `.section-intro` gizli.
5. **Tablo sığdırma:** `table-layout:fixed; width:100%` + `overflow-wrap:anywhere`.
   Ölçüt: taşan tablo 0.
6. Test: `birim [88]`, `tasarim [2cd]`, `surum` kimlikleri.

## YENİ OTURUM DEVRİ (v2.232) — Tam A4, tam ekran kontrolleri, sabit iskelet

### DEĞİŞMEZ KURALLAR (v2.232)

1. **Kaydırma kabı `#view-report`.** `window.scrollTo` burada etkisizdir;
   kaydırmayı `#view-report.scrollTop` ile sıfırlayın (tam ekran girişi).
2. **`.report-workspace` `flex:0 0 auto; height:auto`** olmalı. `flex:0 1 auto`
   verilirse 573 px'e sıkışır, içerik taşar ve **sticky iskelet çalışmaz**
   (ölçüm: 500 px kaydırınca üst 202 → −298). Bu satırı kaldırmayın.
3. **Tam ekranda kontroller kalır:** `#reportFullbar` sticky top:0;
   `.report-stage-bar` tam ekranda **gizlenmez** (A4/sığdır). Yalnız iskelet/
   yan panel/düzenleyici gizlenir.
4. **Sayfaya sığdır** kâğıt genişliğini görünüm yüksekliğinden türetir:
   `reportFitWidth = clamp(320, 900, (availH-8)×210/297)`. Uydurma sabit yok.
   Tercih `akis.reportFit` (dosyaya yazılmaz).
5. Test: `birim [87]`, `tasarim [2cc]`, `surum` kimlikleri.

## YENİ OTURUM DEVRİ (v2.231) — Belge odaklı bölüm düzenleme

Rapor belgesinde bölüme tıklayınca sağda odaklı düzenleyici açılır.

### DEĞİŞMEZ KURALLAR (v2.231)

1. **A4 kâğıdı contentEditable DEĞİL.** Düzenleme, aynı model alanlarını yazan
   bir panelde olur; üç çıktı (HTML/DOCX/UDF) aynı metni üretmeye devam eder.
   Kâğıdı doğrudan düzenlenebilir yapmak bu garantiyi bozar; yapmayın.
2. **Serbest metin yalnız s4/s5/s6** (`methodText`, `limitationsText`,
   `conclusionText`). Diğer bölümler veriden üretilir; düzenleyici ilgili yere
   yönlendirir. Yeni bir serbest metin alanı eklerseniz
   `REPORT_NARRATIVE_FIELDS`'e yazın ve üç çıktıya bağlandığını doğrulayın.
3. **Blok sarmalayıcı `data-report-key` + `display:contents`** kullanılır;
   yerleşim değişmez. Tıklama `#reportPreview` delegasyonunda çözülür.
4. **Seçim oturumluktur** (`reportEditKey`); kayda yazılmaz.
5. Yazarken model güncellenir (`input`), önizleme `change`te tazelenir (odak
   korunur). Doğrudan `renderReport()` çağırıp her tuşta yeniden çizmeyin.
6. Test: `birim [86]`, `tasarim [2cb]`, `surum` kimlikleri.

## YENİ OTURUM DEVRİ (v2.230) — Tek kayıt durumu + dahil/kontrol ayrımı

Rapor ekranındaki dağınık durum göstergeleri tek çipte toplandı; "rapora dahil"
ile "dinlenip onaylandı" kavramları ayrıldı.

### DEĞİŞMEZ KURALLAR (v2.230)

1. **Tek durum kaynağı:** `reportRecordStatus(c)` → `blocked|review|ready`.
   Uydurma yüzde yok; "Hazır" bile denetim listesidir (ipucu söyler).
2. **Renk tek başına anlam taşımaz:** durum çipi metin de taşır.
3. **Dahil ≠ Kontrol:** Dahil = iskelet onay kutusu (rapora girer);
   Kontrol = bölümün dinlenip onaylanması (ses görünümü). İskelet "N dahil ·
   M hariç" der, kapalı satır `is-excluded` ile soluk.
4. **Görünüm adı `body.dataset.view`** ile yazılır; alt çubuktaki yinelenen
   bölüm/denetim sayaçları rapor görünümünde gizlenir. Yeni bir görünüm-özel
   gizleme eklerken bu dataset'i kullanın.
5. Test: `birim [85]`, `tasarim [2ca]`, `surum` kimlikleri.

## YENİ OTURUM DEVRİ (v2.229) — Rapor iskeleti: arama + kategori + yalnız açık

Uzun iskelet (28 bölüm + ekler) için **arama**, **kategori çipleri** ve
**"Yalnız açık"** anahtarı eklendi.

### DEĞİŞMEZ KURALLAR (v2.229)

1. **Filtre yalnız GÖRÜNÜRLÜK.** Kategoriye göre **yeniden sıralama YOK**;
   rapor sırası tek kaynak `case.report.layout.order` ve ↑↓ ile belirlenir.
   Kategoriye göre sıralamak çıktı sırasını sessizce bozardı.
2. `REPORT_SECTION_CATEGORY` yalnız filtre içindir; yeni bölüm eklerken
   kategori yazın (yoksa `tech`).
3. `reportOutlineState` **oturumluktur**, kayda yazılmaz.
4. Arama kutusu statik HTML'de; yeniden çizimde odak korunur. Yalnız
   `#reportSections` yeniden çizilir.
5. Test: `birim [84]`, `tasarim [2bz]`, `surum` kimlikleri.

## YENİ OTURUM DEVRİ (v2.228) — Rapor çalışma modları + önem gruplu kontrol

Rapor ekranı **belge merkezli** hâle getirildi: **Düzenle** (belge + iskelet,
kontrol paneli kapalı) ve **Kontrol** (panel açık) modları. Kontrol maddeleri
tek düz liste değil; **engelleyen / uzman kontrolü / iyileştirme** grupları.

### DEĞİŞMEZ KURALLAR (v2.228)

1. **Mod bir UI tercihidir**, dosyaya yazılmaz (`localStorage('akis.reportMode')`).
   Varsayılan **Düzenle**; sağ panel kendiliğinden açılmaz.
2. **Önem derecesi TEK KAYNAK:** `READINESS_SEVERITY` haritası. Yeni bir kontrol
   maddesi eklerken buraya da yazın; bilinmeyen anahtar `expert` sayılır.
3. **Gruplu gösterim `readinessRowsHtml`** içinde; ayrı liste kopyası yazmayın.
4. **Geniş sarı uyarı belgede değil** sağ panelde (`#reportWarning`).
   Düzenle modunda `#reportCheckChip` yalnız engelleyen sayısını gösterir.
5. **Yazdırma/tam ekran** yalnız kâğıt (değişmedi); ≤900 px tek sütun korunur.
6. "Çıktı" ayrı mod DEĞİL: UDF/DOCX/yazdır her an erişilebilir eylemdir.
   Mod yapmak ekranı boşaltır; bu bilinçli karardır.

### Ölçüm (gerçek Chromium)

1440/1100/900/760: Düzenle modunda sağ panel gizli, belge genişler; kırpma 0,
yatay taşma 0, JS hatası 0. Kontrol modunda gruplar görünür; çip engelleyen
sayısını doğru verir. Testler: `birim [60]`, `tasarim [2by]`, `surum`.

## YENİ OTURUM DEVRİ (v2.227) — Rapor çalışma alanı (DAL: rapor-workspace-birlesik)

Bu sürüm **ayrı bir dalda** (`rapor-workspace-birlesik`) hazırlandı; `main`'e
doğrudan push edilmedi. Amaç: rapor ekranını ve şablon kullanımını yeniden
tasaramak. Bu çalışma, aynı konuda üretilen **iki taslak dalın en iyi yanlarını**
birleştirir: güvenli tek-döngü üretim hattı (A) + saf model modülü ve
düzenlenebilir/özel ekler (B).

### Ne yapıldı

- **Üç bölge:** sol **rapor iskeleti** · orta **A4 önizleme** · sağ **rapor
  kontrolü + revizyon**. Önizleme üst kenarı 1440×900'de **901 → 279 px**.
- **Tek iskelet:** 28 bölüm + ekler tek listede; ↑↓ sıralama, tek tek aç/kapa.
- **Numara türetilir:** kapatılan ana bölüm numarada boşluk bırakmaz
  (3 kapatılınca 4 → 3). 5.1/5.2/5.3 de türetilir.
- **TOC gövdeyi izler:** 7 değil, çizilen tüm bölümler (ölçüm: 10 madde).
- **Ekler ayrı ve düzenlenebilir kayıt:** EK-1…EK-N bitişik; eski **EK-4
  boşluğu** kapandı. Sağdaki **Ekler · başlık / içerik / not** panelinden başlık
  ve not düzenlenir; **＋ Yeni ek** ile özel ek (x1, x2…) eklenir/kaldırılır.
  Yerleşik ek gövdesi veriden üretilir; özel ek gövdesi kullanıcı içeriğinden.
- **Rapor revizyonu:** düzen + rapor metinleri (en çok 10); kanıt dışı; iki
  revizyon **Farkları karşılaştır** ile kıyaslanır.
- **A4** sayfa sayısı (`A4 · N sayfa`); yazdırma/tam ekranda yalnız kâğıt.
- **Saf model modülü** `assets/report-model.js`: `moveInList`,
  `mainSectionNumbers`, `revisionDigest`, `compareRevisionGroups`. DOM yok;
  uygulama ve test aynı dosyayı kullanır.

### DEĞİŞMEZ KURALLAR (v2.227)

1. **Sıra/numara/TOC/başlık TEK KAYNAK:** `reportBodyOrder`,
   `reportNumberMap`, `reportHeadingText`, `reportTocEntries`. Üç çıktı
   (HTML/DOCX/UDF) aynı döngüden geçer; ayrı sıra kodu yazmayın.
2. **Ekler `REPORT_ANNEX_DEFS` + `reportAnnexList` + `layout.annexMeta`.**
   Başlığı elle yazmayın; numara **açık** eklere göre bitişik kalmalı. Özel ek
   anahtarı `xN`; normalize yerleşik + özel anahtarı korur, geçersiz anahtarı
   düşürür. Ek başlık/içerik/notu `patchReportAnnexMeta` ile yazın (yazarken
   yeniden çizmez, odak korunur); `change`te önizleme tazelenir.
3. **Revizyon ETKİN durumu saklar:** `reportSnapshot` `sections`/`tech`
   varsayılanlarını da yazar. Ham `{}` saklamak geri yüklemede sahte fark üretir
   (ölçüldü ve düzeltildi).
4. **Revizyon kanıt taşımaz:** ses/bölüm snapshot'a girmez; geri yükleme kanıta
   dokunmaz.
5. **Yazdırma/tam ekran** `.report-skeleton`, `.report-side`,
   `.report-stage-bar` gizler; yalnız kâğıt kalır.
6. **Sıralama düğmeleri erişilebilir:** `data-report-move`,
   `data-report-annex-move`; sürükle-bırak zorunlu değil.
7. **Modül importları sürümlüdür.** `app.js` → `./schema.js?v=` ve
   `./report-model.js?v=`. `surum` [2b-2] bunu zorunlu kılar (v2.117 dersi).
8. **Test koşumu TÜM importları sıyırmalı.** `tools/birim-testleri.mjs` ve
   `tools/rapor-tutarlilik-testi.mjs` `__inlineImports` ile hem `__schema` hem
   `__reportModel` bağlar; sıyrılamayan import kalırsa koşum **açık hatayla**
   durur. İkinci bir import eklerseniz koşumu da güncelleyin (v2.227'de bir
   taslakta bu unutuldu ve `birim`/`rapor` testleri sessizce çöktü).
9. **Karşılaştırma saf modelde:** `compareRevisionGroups`; önizleme/UI ayrı
   kural yazmaz.

### Ölçüm (gerçek Chromium)

1440/1300/1280/1100/900/760/600: yatay taşma **0**, kırpılan öğe **0**,
JS hatası **0**. Yenileme sonrası sıra/ek/revizyon **korundu**. Revizyon geri
yükleme gerçek değişikliği **geri aldı** ve farkı doğru yazdı. Yazdırma/tam
ekran panelleri gizledi.

### Testler

`bash tools/test.sh` → **1320 birim + 517 şema** + rapor (Senaryo 22 + 23) +
sürüm + tasarım yeşil. Yeni: `birim [82]` (sıra/numara/TOC/ek/özel ek/revizyon),
`birim [83]` (saf model), `rapor [22]` (sıra/numara/ek), `rapor [23]` (özel ek
üç çıktıda), `surum` `report-model.js` import sürümü.

### Sıradaki iş (öneri)

- Sürükle-bırak sıralama (düğmeler kalmalı).
- Raporda "Okuma metni" bölümünün iskelette ayrı gösterimi (şu an 5. içinde).
- Gerçek A4 sayfa kırılması (şu an kılavuz) — tablo bölme riski ölçülmeli.
- Özel ek içeriğinde zengin metin (şu an düz metin).

## YENİ OTURUM DEVRİ (v2.237) — Rapor biçimi denetimi + liste etkileşimi

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.237** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1400 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Git | yerel değişiklik (commit/push kullanıcı onayı bekliyor) |
| Denetim/plan | [`docs/DENETIM_VE_PLAN.md`](docs/DENETIM_VE_PLAN.md) |
| Açık konu | **Rapor biçimi (v2.238)** — 5 karar sorusu kullanıcıda |

### Bu sürümde yapılan (tek konu: liste etkileşimi)
- Oynatma hızı düğmesi artık **tam yeniden çizim yapmaz**; kaydırma/odak korunur.
- Satır (⋮) menüsü **ekranda kalır** (`clampSegMenuPosition`; alt satırda yukarı açılır).
- Koruyan test: `birim [92]`.

### Denetim sonucu (koddan, ölçüm değil) — özet
- **Rapor biçimi kullanıcıya kapalı:** font/punto/marj/yön sabit; üç çıktı farklı
  (HTML/DOCX Arial, UDF Times; DOCX 2cm/2.25cm, UDF 60/60/56.7/56.7mm).
- **Yazdırma/PDF `@page` YOK** → A4 + ölçülü marj garanti değil (en somut eksik).
- Eski notlar: 1/3/6 düzeltildi; 9 (imleç konumuna etiket) yok; 16 (video) yok;
  5/7/8/10/11 rehber/karar bekliyor; 12 kısmen; 13/14/15 mevcut.

### SIRADAKİ İŞ — v2.238 Rapor biçimi (kullanıcı kararı gerek)
`case.report.format` (font + punto + marj + yön) → HTML + yazdırma(`@page`) +
DOCX + UDF. **Resmî UDF varsayılanı sessizce DEĞİŞTİRİLMEZ.** Karar soruları:
`docs/DENETIM_VE_PLAN.md` §1 (marj mm, UDF font, yatay, PDF yöntemi, punto aralığı).

## YENİ OTURUM DEVRİ (v2.238) — Rapor biçimi (font · punto · marj · yön)

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.238** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1422 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni testler | `birim [93]`, `rapor` Senaryo 26 |
| Açık konu | UDF yön (yatay) doğrulanamadı; imleç konumuna etiket; video (56.12) |

### Ne yapıldı
- `case.report.format` (schema.js): `{ fontFamily, fontSizePt(11–14), marginsMm(10–50), orientation }`.
  TEK KAYNAK. `emptyReportFormat`/`normalizeReportFormat` ile doğrulanır; bilinmeyen korunur.
- **Ekran:** `--paper-font`, `--paper-scale`, `--paper-margin`; A4 kılavuz/sığdırma yönü
  (`reportFitWidth(availH, orientation)`, `reportPageHeight`, `renderPageGuides`) dikkate alır.
- **Yazdırma/PDF:** `applyReportFormat` dinamik `<style id="reportPrintStyle">@page { size: A4 <yön>;
  margin: …mm }</style>` üretir. **Önceden @page HİÇ yoktu** — en somut eksik kapandı.
- **DOCX:** `docxFormatInit` → `__docxFmt`; wRun (font+sz ölçeği), styles.xml, `w:pgSz`/`w:pgMar`/`w:orient`.
- **UDF:** gövde `size` `fontSizePt/11` ile ölçeklenir; `pageFormat` marjları mm'den. **Font/yön resmî
  (Times New Roman + dikey A4) DEĞİŞMEZ** (UYAP standardı).
- Panel: Kontrol → **Rapor biçimi · sayfa · font · punto** (`#reportFormatBox`/`#reportFormatFields`).

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)
1. **UDF resmî çıktı font/yön KİLİTLİ** (Times New Roman + dikey A4). `fontFamily`/`orientation`
   yalnız ekran + yazdırma + DOCX içindir. UDF'e yalnız punto ve kenar boşluğu uygulanır.
2. **Varsayılan biçim:** 11 pt · 20 mm simetrik marj · dikey. UDF marjı 60 mm'den 20 mm'ye çekildi
   (çok genişti); panelden 10–50 mm arası ayarlanır.
3. **Punto 11–14.** Depo kuralı ekran metnini 11px altına indirmez; 11 taban = mevcut görünüm (ölçek 1).
4. **Yazdırma çift marj olmaz:** ekran `--paper-margin` (kâğıt dolgusu); yazdırmada `@page` marjı +
   kâğıt dolgusu `0` (`.report-paper.report-paper{padding:0}`).
5. **CSS borcu nöbetçisi:** `.report-paper.report-paper` (çift sınıf) kullanılır ki `.report-paper{padding}`
   app.css ile TAM eşleşip borç sayacını (app→layer ≤500) artırmasın. Yeni override eklerken aynı desen.
6. **tek kaynak:** üç çıktı + yazdırma `reportFormat(c)`/`__docxFmt`/UDF `fmt` üzerinden okur; kopya yok.

### Dürüst sınırlar
- **UDF yatay (landscape) DESTEKLENMİYOR:** depoda doğrulanmış `paperOrientation` yatay kodu yok;
  resmî çıktıda tahmin edilmedi (dikey kalır). Gerekirse UYAP editöründe doğrulanıp eklenir.
- **Etkileşim gerçek tarayıcıda tıklanarak ölçülmedi** (bu ortamda WS/CDP istemcisi yok). Fonksiyonel
  yol `rapor` Senaryo 26 + headless yükleme (v2.238, JS hatası 0) ile doğrulandı.
- PDF = tarayıcı yazdırma (ayrı PDF motoru yok; depo "harici paket yok" ilkesi).

### SIRADAKİ İŞLER
1. **UDF yatay** (doğrulanmış kod ile) + gerçek tarayıcıda biçim paneli tıklama ölçümü.
2. **C1 — Hızlı etiket imleç konumuna eklenmeli** (eski not #9).
3. **C2 — "Bekleyen" ↔ "Çözümlendi"(machine) netleştirme** (eski not #5).
4. **Video (56.12)** desteği: mp4/mov sesi demux/decode edilebilir mi (eski not #16).
5. `docs/STANDARTLAR.md`: üst üste / belirsiz / tek kelime rehberi (#7/#8/#10/#11).

## YENİ OTURUM DEVRİ (v2.239) — Hızlı etiket imleç konumuna

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.239** |
| Testler | `bash tools/test.sh` → **1432 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni test | `birim [94]` |
| Açık konu | C2 (Bekleyen↔Çözümlendi), UDF yatay, video (56.12), STANDARTLAR rehberi |

### Ne yapıldı
- `insertTagAt(full, token, start, end)` saf fonksiyon: etiket **imleç konumuna** (seçim varsa
  yerine), yoksa sona. Komşu boşluk değilse tek boşluk. Dönüş `{ text, caret, mode }`.
- Tıklama işleyicisi imleci **yeniden çizimden ÖNCE** okur; `renderSegDetail` sonrası
  `requestAnimationFrame` + `setSelectionRange` ile odağı/imleci geri verir.
- Eski not **#9** kapandı.

### DEĞİŞMEZ KURAL
- Hızlı etiket metni `applyTextEdit` ile yazılır (adli ayrım/`asrText` korunur); imleç bilgisi
  yoksa bile **veri kaybı yok** (sona ekleme yedeği).

### SIRADAKİ İŞLER
1. **C2:** "Bekleyen" filtresi ↔ "Çözümlendi"(machine) ilişkisini netleştir (etiket/ipucu veya ayırma — karar).
2. **UDF yatay** (doğrulanmış `paperOrientation` koduyla) + gerçek tarayıcıda biçim/etiket tıklama ölçümü.
3. **Video (56.12):** mp4/mov sesinin tarayıcıda çözülüp çözülemeyeceğini ölç.
4. `docs/STANDARTLAR.md`: üst üste / belirsiz / tek kelime rehberi (#7/#8/#10/#11).

## YENİ OTURUM DEVRİ (v2.240) — Bölüm iş durumu: eksik filtreler + netlik

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.240** |
| Testler | `bash tools/test.sh` → **1451 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni/updated test | `birim [95]`; `birim [70]` conditional küme; `tasarim [2ax]` regex |
| Açık konu | UDF yatay, video (56.12), STANDARTLAR rehberi, detay "iş durumu" satırı |

### Ne yapıldı (C2)
- `SEG_FILTERS` genişledi; "Bekleyen" → **"Kontrol bekleyen"** (ipucu: machine/ambiguous
  de onay beklediği için buradadır). Yeni KOŞULLU çipler (sayı>0):
  `machine` (Çözümlendi), `ambiguous` (Belirsiz), `long` (Uzun·bölünmeli 45 sn),
  `overlap` (Üst üste gözlem), `inaudibleObs` (Anlaşılmayan gözlem). Her çipin `title` ipucu var.
- `CONDITIONAL_FILTERS = {machine,ambiguous,merge,long,overlap,inaudibleObs,time}`.
- TEK KAYNAK: `segmentHasObs(s,key)` + `segmentIsLong(s)`; `segCounts` ve `segMatchesFilter`
  aynı yardımcıları kullanır. `segFilterChipsHtml` üçüncü öğe (title) ve `counts[k]||0`.

### DEĞİŞMEZ KURALLAR
1. **Sayaç = filtre.** Yeni bir filtre eklerken `segCounts`'a da ekle ve `segMatchesFilter` ile
   AYNI yardımcıyı kullan; aksi hâlde kullanıcı "sayı tutmuyor" görür (v2.99/[95] dersi).
2. **"Kontrol bekleyen" = !isReviewed** (machine/ambiguous/relisten/pending). Bu kasıtlıdır
   (hiçbiri bilirkişi onayı değildir); "Çözümlendi"/"Belirsiz" ayrı çiplerle bulunur.
3. Koşullu çipler `SEG_FILTERS` sonunda, `CONDITIONAL_FILTERS` ile aynı sırada olmalı
   (dinamik ekleme görünür sırayı bozmasın).
4. Ham `s.obs[...]` yerine `segmentHasObs`; süre için `segmentIsLong` kullan.

### SIRADAKİ İŞLER
1. **Detay "iş durumu" satırı:** aktif bölümde birleştir/böl/üst üste/belirsiz için tek satırlık
   yönlendirme (filtreler zaten var; bu ek görünürlük). 
2. **UDF yatay** (doğrulanmış `paperOrientation` kodu).
3. **Video (56.12).**
4. `docs/STANDARTLAR.md`: üst üste / belirsiz / tek kelime rehberi (#7/#8/#10/#11).

## YENİ OTURUM DEVRİ (v2.241) — Aktif bölümde "İş durumu" satırı

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.241** |
| Testler | `bash tools/test.sh` → **1467 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni test | `birim [96]` |
| Açık konu | UDF yatay, video (56.12), STANDARTLAR rehberi |

### Ne yapıldı
- `segmentWorkSummary(s, opts)` saf fonksiyon: durum → tek **eylem** + **işaretler**
  (birleştirilebilir, zaman sorunu, üst üste/anlaşılmayan/sessizlik/telefon gözlem,
  belirsizde okuma seçilmedi). `done` = approved/inaudible.
- `workStatusHtml(m,s,i)` bunu `.sd-work` satırı olarak çizer (teknik `.sd-status`'un
  ÜSTÜNDE). `segDetailHtml`'e eklendi; `syncSegDetailInPlace` `.sd-work`'ü **yerinde** tazeler.

### DEĞİŞMEZ KURALLAR
1. **İş durumu satırı yalnız GÖRÜNÜRLÜK**; veri/karar yazmaz. Eylem metni + title ipucu taşır
   (renk tek başına anlam vermez).
2. **Yerinde tazeleme:** yeni bir "öneri" alanı eklersen hem `segDetailHtml` (tam çizim) hem
   `syncSegDetailInPlace` (yerinde) yollarında güncelle; aksi hâlde takip sırasında eski kalır
   (v2.78 dersi).
3. Tek kaynak: eylem/işaretler `segmentWorkSummary`; başka yerde kopya metin yazma.

### SIRADAKİ İŞLER
1. **UDF yatay** (doğrulanmış `paperOrientation` kodu) + gerçek tarayıcı tıklama ölçümü.
2. **Video (56.12)** ses çıkarma ölçümü.
3. `docs/STANDARTLAR.md`: üst üste / belirsiz / tek kelime rehberi (#7/#8/#10/#11) — öneri sunulacak.

## YENİ OTURUM DEVRİ (v2.242) — Karar rehberi (belge + yardım)

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.242** |
| Testler | `bash tools/test.sh` → tümü yeşil |
| Açık konu | UDF yatay, video (56.12) |

### Ne yapıldı (eski not #7/#8/#10/#11)
- `docs/STANDARTLAR.md` **§12 "Karar rehberi"**: kontrol durumu ≠ gözlem işareti;
  "Onaylandı" = dinleyip doğrulama (çakışmayı gizlemez); belirsiz = ayrı durum (iki okuma
  + seçim); anlaşılmaz bölümdeki tek kelimede Onaylandı/Anlaşılmadı/Belirsiz seçimi;
  birleştir/böl ölçütü.
- Aynı rehber **Yardım (?) ekranına** kısa biçimde eklendi (index.html, `<h3>Gözlem
  işaretleri</h3>` öncesi).
- `STANDARTLAR.md` §6 gözlem listesi 6 işarete çekildi (telefon + sessizlik); hızlı
  etiketin **imleç konumuna** eklendiği yazıldı.
- **Davranış değişmedi** (yalnız belge + yardım metni).

### DEĞİŞMEZ
- Rehber **iç çalışma standardıdır**, hukuki zorunluluk değil. "Onaylandı" tanımı:
  dinleyip doğrulama; belirsizliği gizlemez. Belirsiz = Belirsiz okuma durumu (gözlem değil).

### SIRADAKİ İŞLER
1. **UDF yatay** (doğrulanmış `paperOrientation` kodu).
2. **Video (56.12)** ses çıkarma ölçümü.

## YENİ OTURUM DEVRİ (v2.243) — İş yükü özeti

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.243** |
| Testler | `bash tools/test.sh` → **1499 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni test | `birim [97]` |
| Açık konu | UDF yatay, video (56.12) |

### Ne yapıldı
- Özet/dashboard'a **"İş yükü göstergeleri (ölçülen)"** kartı (`#workloadPanel`).
- `caseWorkload(c)` saf: toplam ses süresi (saniye; `m.duration` yoksa bölüm zamanları),
  kayıt/bölüm, kontrol bekleyen toplam (`segCounts.pending` toplamı), konuşmacı etiketi,
  kontrol dağılımı (KARŞILIKLI-DIŞLAYAN: approved/inaudible/relisten/ambiguous/machine/pending),
  emek (onay %, `textRev>0` elle düzeltme), zorluk işaretleri (segCounts + obs), sorular.
- `formatWorkloadDuration(sec)` → "sa/dk/sn"; "TOPLAM SÜRE" kartı da bunu kullanır.

### DEĞİŞMEZ KURALLAR
1. **Süre/ücret TAHMİNİ YOK.** Yalnız ölçülen sayılar; kartın içinde bu yazılı.
2. **Süre birimi saniye**; gösterim sa/dk/sn. `m.duration` yoksa bölüm zamanlarından topla
   (`parseTimecodeStrict`); ikisi de yoksa "bilinmiyor"/kapsam hesaplanamaz.
3. **Kontrol dağılımı karşılıklı-dışlayandır** (toplam = bölüm sayısı). "Kontrol bekleyen
   toplam" AYRI KPI'dır (= !isReviewed toplamı). İkisini karıştırma.
4. Sayımlar `segCounts` ile **tek kaynak** (makine/belirsiz/yeniden/gözlemler filtreyle tutarlı).

### SIRADAKİ İŞLER
1. **UDF yatay** (doğrulanmış `paperOrientation` kodu).
2. **Video (56.12)** ses çıkarma ölçümü.
3. İş yükü özetini istenirse **rapora ayrı bölüm** olarak eklemek (şu an yalnız ekran).

## YENİ OTURUM DEVRİ (v2.244) — İş yükü özeti anlamlandırma

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.244** |
| Testler | `bash tools/test.sh` → **1502 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni/updated test | `birim [97]` genişledi |
| Açık konu | UDF yatay, video (56.12), **etkin çalışma süresi (öneri)** |

### Ne yapıldı (kullanıcı geri bildirimi: "sayılar anlam ifade etmiyor")
- Panel başına **tek satır özet** (ses · kayıt · bölüm · kontrol % · kalan iş).
- **Ortalama bölüm** (ses/bölüm) ve **Kapsam %** KPI'ları; `avgSegmentSec`, `coveragePct`,
  `coverageUnknown` (`caseWorkload`).
- **"Kapsam boşluğu" zorluktan ÇIKARILDI** → ayrı **Kapsam** bölümü + açıklama
  (bölümlenmemiş aralık = çoğu zaman sessizlik; "konuşma yok" değil; otomatik düzeltilmez).
- "Kontrol bekleyen" → **"Kalan iş (bölüm)"**.

### DERS / SINIR (önemli)
- Panel **girdileri** (ingredients) gösterir; **harcanan takvim/zamanı** göstermez.
  "1 sa ses ≈ kaç sa emek" ancak **etkin çalışma süresi izlenerek** ölçülür; geçmiş
  geri kazanılamaz. İstenirse v2.245: aktif süre sayacı (görünür+etkileşim; boşta >1-2 dk
  sayılmaz; `case.worklog.workSeconds`), "yaklaşık" etiketiyle.

### SIRADAKİ İŞLER
1. **Etkin çalışma süresi** (kullanıcı onayına bağlı; geçmiş sayılmaz).
2. **UDF yatay** (doğrulanmış `paperOrientation`).
3. **Video (56.12)** ölçümü.

## YENİ OTURUM DEVRİ (v2.245) — UDF yatay/dikey (doğrulandı)

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.245** |
| Testler | `bash tools/test.sh` → tümü yeşil |
| Doğrulama | `yatay.udf` (kullanıcı, UYAP editörü) → `paperOrientation="0"` yatay, `"1"` dikey |

### Ne yapıldı
- `makeUdf` artık `paperOrientation` değerini `case.report.format.orientation`'dan yazar
  (yatay "0", dikey "1"); mediaSizeName A4 ("1") sabit. Rapor biçimi → Yön seçimi **UDF'e
  de** uygulanır. Font resmî Times New Roman kalır.
- Panel notu + şema yorumu güncellendi.

### DEĞİŞMEZ
- `paperOrientation` kodu **doğrulanmıştır** (tahmin değil). Yeni bir UYAP alanı eklerken
  aynı yöntemi kullan: UYAP Doküman Editörü'nde örnek üret, `content.xml`'i oku, kodu sabitle.
- Yatayda tablo `columnSpans` (≈510) portre için ölçülmüştü; yatayda tablolar daha dar
  görünebilir (kırpılmaz, sığar). Gerekirse genişlik ölçeklemesi ayrı iş.

### SIRADAKİ İŞLER
1. **Etkin çalışma süresi** (kullanıcı onayı).
2. **Video (56.12)** ölçümü.
3. Yatay UDF tablo genişliklerini sayfa genişliğine göre ölçekleme (gerekirse).

## YENİ OTURUM DEVRİ (v2.246) — Rapor ekranı: sürekli okuma varsayılan

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.246** |
| Testler | `bash tools/test.sh` → **1507 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni test | `birim [98]` |
| Ölçüm | **Gerçek Chromium + CDP** (1440×900), örnek dosyalar yüklendi |

### ÖLÇÜM (kök neden)
Eski varsayılan **tek-sayfa + zorla sayfaya sığdır** idi → kâğıt **320 px** (min),
`translateY` ile sayfalama, satırlar sınırda kesiliyor; "Sürekli"ye geçilince bile
fit `maxWidth` temizlenmiyordu → ince-uzun şerit.

### DÜZELTME (kanıtlı)
- `reportContinuousPref()` varsayılan **true** (yalnız `'0'` → tek-sayfa).
- `applyReportFit`: sürekli modda fit UYGULANMAZ (maxWidth temizlenir).
- `applyReportPageView`: sürekli modda eski genişliği temizler + "Sayfaya sığdır"
  etiketini gizler; `setReportContinuous` fit+guide tazeler.
- Ölçüm SONRA (default): `continuous`, paper **900 px**, `#view-report` kayar
  (4753/804), yatay taşma 0. Tek-sayfa opt-in: Sayfa 1/10, genişlik 507.

### DEĞİŞMEZ
- Tek-sayfa A4 penceresi + `translateY` **satır keser** (gerçek pagination değil);
  bu yüzden **varsayılan olamaz**, yalnız opt-in olur.
- Sürekli modda tek kaydırma `#view-report`'tadır; `.main-area`/body kaymaz (900/900).

### CDP DENETİM TARİFİ (tekrar kullanılabilir)
`python3 -m http.server 8800` + `chromium --headless=new --remote-debugging-port=9230
--remote-allow-origins=*` → `websocket-client` ile Runtime.evaluate: `#loadSamplesBtn`→
`#confirmOk`→`[data-view=report]` tıkla → ölç. (Geçici dosyalar /tmp; depoya girmez.)

### SIRADAKİ İŞLER
1. **Video (56.12)** ölçümü (kullanıcı istedi).
2. Etkin çalışma süresi (opsiyonel).
3. Tek-sayfa modunda gerçek sayfa kırılması (satır kesmesini giderme) — zor, ancak opt-in.

## YENİ OTURUM DEVRİ (v2.247) — "Sayfaya sığdır" düğmesi çalışıyor

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.247** |
| Testler | `bash tools/test.sh` → **1512 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni test | `birim [99]` |
| Ölçüm | Gerçek Chromium: tek-sayfa fit ON=507px, OFF=900px (önceden ikisi de 507 → ölü) |

### Kök neden
`applyReportPageView` tek-sayfa modunda her çizimde `if(!reportFitPref()) setReportFit(true)`
diyordu → "Sayfaya sığdır" aç/kapa düğmesi **hiçbir şeyi değiştirmiyordu**. Ayrıca sürekli modda
etiket gizliydi.

### Düzeltme
- `reportFitPref()` varsayılan **açık** (`'0'` → kapalı).
- Zorla `setReportFit(true)` **kaldırıldı** → kullanıcı seçimi geçerli; tek-sayfa `pageH`/pencere
  kâğıt genişliğinden yeniden hesaplanır.

### DEĞİŞMEZ
- "Sayfaya sığdır" **yalnız A4/tek-sayfa** modunda görünür; sürekli modda gizli (anlamsız).
  "Sürekli"yi kapatınca A4 + sığdır gelir. Yeni bir "mod" eklerken bu iki anahtarın ilişkisini koru.
- Bir tercih düğmesi her çizimde **zorla set edilmemeli**; aksi hâlde ölü düğme olur (v2.247 dersi).

### SIRADAKİ İŞLER
1. **Video (56.12)** ölçümü (kullanıcı istedi).
2. Etkin çalışma süresi (opsiyonel).
3. Sürekli modda istenirse **zoom/ölçek** (%/sığdır) ayrı kontrol.

## YENİ OTURUM DEVRİ (v2.248) — Video: yalnız ses (56.12 kapsamı)

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.248** |
| Testler | `bash tools/test.sh` → **1530 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni test | `birim [100]` |
| Fizibilite | **Gerçek Chromium**: mp4/mov(AAC)/webm(Opus) sesi `decodeAudioData` ile çözüldü (15 sn, 1 kanal, 44100). |

### Ne yapıldı
- `isVideoFileName/isMediaFileName/isMediaFileObject/isVideoMaterial`. Kabul filtresi ve delil
  sınıflandırması **ses+video** medyayı kapsar; biçim etiketleri "MP4 (video)" vb.
- Video materyal: kartta **"Video: yalnızca SES çözülür; görüntü incelenmez"** uyarısı + delil
  günlüğü "Video (yalnız ses)". Deşifre **ses** üzerinden çalışır (mevcut decodeAudioData hattı).

### DEĞİŞMEZ SINIRLAR (yetki/payload)
1. **YALNIZ SES.** Video görüntüsü/çerçevesi analiz EDİLMEZ; "video analizi" iddiası yok.
2. **Tarayıcının çözebildiği kodek** (AAC/Opus/MP3). Çözemezse açık hata; "çözüldü" denmez.
3. Kapsam: 56.12 = sesin metne dönüştürülmesi; video yalnız bir **konteyner**dir.
4. **SIRADAKİ:** rapora ayrıca "video kaydından yalnız ses çözülmüştür" notu (şu an UI+günlük+biçim
   sütunu söylüyor). Eklerken üç çıktı (HTML/DOCX/UDF) aynı metni üretmeli + `rapor` testi.

### Fizibilite tarifi (tekrar)
`ffmpeg` (imageio-ffmpeg) ile WAV→`out.mp4/.mov/.webm`; CDP `Runtime.evaluate` (awaitPromise) ile
`fetch→decodeAudioData` ve `<audio>.duration` ölç. Bu ortamda üçü de çözüldü.

## YENİ OTURUM DEVRİ (v2.249) — Analiz sekmesi kırpılması

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.249** |
| Testler | `bash tools/test.sh` → **1531 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni test | `birim [101]` |
| Ölçüm | CDP 1440×900: Analiz içerik 810/görünür 673 → sonra kaydırınca son bölüm görünür |

### Kök neden
`#view-audio .card-pane.on { overflow:visible }` (v2.129) Analiz/Kayıt sekmelerini de kapsıyordu;
`#audioDetail { overflow:hidden }` alttaki "Konuşmacılar ve ses özellikleri"ni kesiyordu.

### Düzeltme
- Yalnız `#view-audio .card-pane.on[data-pane="listen"], [data-pane="record"] { max-height:100%; overflow-y:auto }`
  (daha yüksek özgüllük). **Deşifre sekmesi değişmez** (kendi iç kaydırması korunur).

### DEĞİŞMEZ
- Deşifre/hızlı kontrol ekranının iç kaydırma düzenine DOKUNMA. Yeni bir sekme/panel eklerken
  kırpılma ölçütü: `scrollHeight > clientHeight` + ata zincirinde `overflow:hidden` var mı.
- `overflow:hidden` + taşan çocuk = sessiz kırpma; çözüm o paneli kaydırmak.

### SIRADAKİ (video IA + rapor, kullanıcı kararı bekliyor)
- Video **ayrı sayfa mı** yoksa **Ses** başlığını "Ses/Video" mu yapmalı? (öneri: ayrı sayfa YOK;
  video bir konteynerdir; "Ses"i "Ses/Video" yap. Video oynatma varsayılan değil, isteğe bağlı.)
- Rapora "video kaydından yalnız ses çözülmüştür" notu (üç çıktı).
- Desteklenen video kodekleri genişletme (gerçek dosyalarla ölçerek).

## YENİ OTURUM DEVRİ (v2.250) — "Ses/Video" başlığı + rapor "yalnız ses" notu

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.250** |
| Testler | `bash tools/test.sh` → **1536 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni test | `birim [102]`, `rapor` Senaryo 27 |

### Ne yapıldı
- Sol ray/başlık **"Ses ve video kayıtları"** (nav ipucu + panel h3).
- `REPORT_TEXT.videoAudioNote` + `reportVideoNote(c)` / `videoNoteSuffix(c)` (tek kaynak).
  Envanter notuna **video materyal varsa** eklenir (HTML/DOCX/UDF aynı metin); yoksa girmez.

### DEĞİŞMEZ
- Video = yalnız ses; görüntü incelenmez. Bu, rapor metninde de yazılı (envanter notu).
- Üç çıktı tek kaynak `videoNoteSuffix` kullanır (kopya metin yazma).
- Yeni bir "yalnız ses" benzeri koşullu not eklerken aynı desen: REPORT_TEXT anahtarı + helper +
  üç çıktıda aynı ek + `rapor` testi.

### SIRADAKİ (kullanıcı "gerekli olanı yap" dedi; mantıklı adaylar)
1. **İsteğe bağlı video önizleme** (Analiz sekmesinde, katlanır; deşifre bölünmez) — istenirse.
2. **Desteklenen video kodekleri** — gerçek dosyalarla ölçerek (mkv/avi genelde çözülmez).
3. Video raporunu gerçek bir mp4 ile uçtan uca dene (kullanıcı).

## YENİ OTURUM DEVRİ (v2.251) — UDF ZWSP temizliği + uçtan uca doğrulama

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.251** |
| Testler | `bash tools/test.sh` → tümü yeşil (rapor Senaryo 28 eklendi) |
| E2E | Temiz profil + CDP: örnek kanıt → Rapor → **UDF indi** (`2026_214_E.udf`); A4 dikey 20mm |

### Bulgu (kullanıcının gerçek UDF'i)
`Bilirkisi_Raporu.udf` (video+deşifre) içinde **377 U+200B**. Eski `makeUdf` tablo hücresinde
`(\S{8})(?=\S)` ile her 8 karakterde ZWSP ekliyordu → deşifre metni/saat/tarih görünmez karakterli.
**Adli metin bütünlüğü ihlali.** Düzeltildi: yalnız `\S{24,}` (SHA-256 vb.) içinde ZWSP.

### DEĞİŞMEZ
- **Deşifre metnine/saatine görünmez karakter enjekte etme.** Yalnız uzun kesintisiz token sarılır.
- UDF tablo hücresi metnini değiştiren her yeni kural, "çıktı metni = girdi metni (+görünür
  biçim)" ilkesini korumalı; `rapor` testiyle denetle.
- Kullanıcı raporu (`Bilirkisi_Raporu.udf`) **depoya commit edilmez** (gerçek dava verisi olabilir).

### SIRADAKİ
1. Kullanıcı gerçek mp4 + deşifre ile yeni UDF üretip ZWSP'siz doğrulasın.
2. (İstenirse) isteğe bağlı video önizleme / kodek genişletme / rapor kâğıt biçimi.

## YENİ OTURUM DEVRİ (v2.252) — UDF ZWSP yalnız SHA-256 içinde

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.252** |
| Testler | `bash tools/test.sh` → **1544 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni test | `birim [103]` |
| Bulgu | `Bilirkisi_Raporu_Tumunu_Sec.udf` (Tümünü seç) 173 ZWSP; bir kısmı **saat/kelimede** |

### Ne yapıldı
- `zwspWrapLongHex(text)`: YALNIZ `\b[0-9a-fA-F]{48,}\b` (SHA-256) içine 16'da bir ZWSP.
  `makeUdf` tablo hücresi bunu kullanır. Metin/saat/tarih/sözcük **değişmez**.
- v2.251'in `\S{24,}` kuralı uzun zaman aralığı ve uzun sözcükleri de sarıyordu → düzeltildi.

### DEĞİŞMEZ
- **Deşifre metni = çıktı metni.** Görünmez karakter yalnız saf uzun hex'te. Başka hiçbir
  hücre metni değiştirilmez. Yeni bir "wrap" ihtiyacı doğarsa önce metni bozmadan çöz.
- Hash kopyalama uyarısı: ZWSP nedeniyle hash'i tercihen uygulamadan kopyala.

### SIRADAKİ
- Kullanıcı yeni UDF üretip saat/kelime ZWSP'siz doğrulasın.
- İsteğe bağlı: video önizleme / kodek genişletme / rapor kâğıt biçimi.

## YENİ OTURUM DEVRİ (v2.253) — Rapor kâğıdı biçimi (görsel)

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.253** |
| Testler | `bash tools/test.sh` → **1550 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Yeni test | `birim [104]` |
| Ölçüm | CDP: kapak 4px bant + paper-band zemin + 4px radius; h3 sol 4px; zebra farklı; footer 600 |

### Ne yapıldı (yalnız GÖRSEL; metin değişmedi)
- `.report-paper` önekli kurallar (app.css'i özgüllükle ezer; CSS borcu nöbetçisini artırmaz):
  kapak bandı, bölüm sol vurgu, tablo zebra, imza çizgisi, alt bilgi.
- Yazdırma: `paper-table tr {break-inside:avoid}`, `thead {table-header-group}`,
  `h3 {break-after:avoid}`, kapak zemini yazdırmada `--paper`.

### DEĞİŞMEZ
- **Kâğıt biçimi METNİ değiştirmez.** Üç çıktı aynı metni üretir (`rapor` testi). Yeni bir
  görsel kural eklerken `.report-paper` öneki kullan (tam-seçici çakışmasını/borcu önler).
- Sayfa numarası: DOCX `PAGE`; HTML yazdırma tarayıcıya, UDF UYAP editörüne bağlı — uydurma.

### SIRADAKİ
- İstenirse DOCX başlık/alt bilgi ve UDF kapak görselini ayrıca iyileştirme; sayfa no denemesi.

## YENİ OTURUM DEVRİ (v2.254) — Üç çıktı tek yazı tipi

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.254** |
| Testler | `bash tools/test.sh` → **1551 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Bulgu | UDF Times, DOCX/PDF Arial idi (içerik aynı, font farklı). Marjl 20 mm eşitti. |

### Ne yapıldı
- `emptyReportFormat().fontFamily` varsayılanı **'times'** (resmî).
- `makeUdf` font ailesini `REPORT_FONT_DOCX[fmt.fontFamily]` ile yazar → Arial seçilirse UDF de
  Arial; varsayılan Times. Böylece UDF/DOCX/PDF/ekran aynı tipografi.

### DEĞİŞMEZ
- Üç motor (UYAP/Word/tarayıcı) **pixel-pixel aynı olamaz**; hedef aynı içerik + font + marj +
  başlık hiyerarşisi. Üst/alt bilgi ve sayfa numarası motora bağlı (DOCX PAGE; HTML/UDF editör).
- `fontFamily` artık ÜÇ çıktıya da uygulanır (önceki "UDF font sabit" notu geçersiz).

## YENİ OTURUM DEVRİ (v2.255) — Kenar boşluğu 25 mm + şablon netliği

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.255** |
| Testler | `bash tools/test.sh` → **1551 birim + 517 şema** + rapor/sürüm/tasarım yeşil |

### Bulgu / açıklama
- UDF marjı "Rapor biçimi → kenar boşluğu"ndan gelir ve **boş UYAP şablonunun ~42,5 mm'sini ezer**.
  "Boş şablondan farklı" görünmesinin nedeni budur.
- Varsayılan 20→**25 mm** (yeni dosyalar). Mevcut kayıtlı dosya 20'de kalır; panelden ayarlanır.

### DEĞİŞMEZ
- Kenar boşluğu **üç çıktıya da** uygulanır; değer `case.report.format.marginsMm`.
- Şablon marjını (42,5) istiyorsa kullanıcı panelden ~42 seçer; kodda şablonu otomatik koruma YOK
  (tek değer ilkesi). Gerekirse ileride "şablondan" modu eklenebilir.

## YENİ OTURUM DEVRİ (v2.256) — Kenar boşluğu UYAP boş dokümanıyla aynı

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.256** |
| Testler | `bash tools/test.sh` → **1551 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Kanıt | `bos.udf` (gerçek UYAP boş doküman) = **42,525 mm** = `templates/BOS.udf`; bizimki 20 idi (override) |

### Ne yapıldı
- Varsayılan kenar boşluğu **42,5 mm** (UYAP boş dokümanıyla aynı), üç çıktıya uygulanır.
- Marj 0,5 mm adımla 10–50 mm (fmtClamp `Math.round(n*2)/2`; input `step=0.5`).
- Panel notu: "varsayılan 42,5 mm (UYAP boş şablonuyla aynı)".

### DEĞİŞMEZ
- **Boş UYAP dokümanının marjı ~42,5 mm'dir.** Uygulama bu değeri "Rapor biçimi" ile
  eziyordu; artık varsayılan aynı. Mevcut kayıtlı dosya eski değerini korur (panelden ayarla).
- Marj yalnız değişebilir; şablon marjını "otomatik koru" modu YOK (tek değer ilkesi).

## YENİ OTURUM DEVRİ (v2.257) — UDF kenar boşluğu BİRİMİ: punto

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.257** |
| Testler | `bash tools/test.sh` → **1551 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Kanıt | bos.udf leftMargin=42.525 → **punto** = 15 mm = 1,5 cm; bizim dosya 20.0 → 20 pt = 7 mm (dar) |

### DEĞİŞMEZ (kritik birim)
- **UDF `pageFormat` kenar boşlukları PUNTO (1/72 inç).** mm DEĞİL.
  - `mm → pt`: `mm × 72/25,4` (15 mm = 42,52 pt).
  - Boş UYAP dokümanı 42,525 pt = 15 mm = 1,5 cm.
- `makeUdf` artık `mmToPt` ile yazıyor; varsayılan marj **15 mm** (1,5 cm) = boş şablon.
- DOCX `pgMar` **twip** (mm→twip ayrı), HTML mm→px. Her motorun birimi ayrı; karıştırma.

### SIRADAKİ
- Kullanıcı yeni UDF üretip UYAP'ta **1,5 cm** göründüğünü doğrulasın (leftMargin ≈ 42.52).

## YENİ OTURUM DEVRİ (v2.258) — Sayfa ayırımı (cantSplit + ekler yeni sayfa)

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.258** |
| Testler | `bash tools/test.sh` → **1551 birim + 517 şema** + rapor/sürüm/tasarım yeşil |
| Bulgu | Her iki çıktıda yalnız 1 sayfa sonu (kapak→gövde); tablo satırları bölünebiliyordu |

### Ne yapıldı
- DOCX `wTable`: her satıra `<w:cantSplit/>` (satır sayfa arasında bölünmez).
- Ekler (annex) DOCX/UDF/HTML-yazdırma: **yeni sayfadan** başlar (page break önce).
- Kapak ayrı sayfa (korunur).

### DEĞİŞMEZ
- Sayfa kırılması **motora** aittir; biz yalnız mantıklı sayfa sonları + satır bölünmezliği veririz.
  Motor düzenini birebir denetleyemeyiz.
- UDF `<page-break>`, DOCX `w:br type=page`, HTML `.paper-page-break`. Üçünde de ekler öncesi.

### SIRADAKİ (kullanıcı kararı)
- İstenirse her ana bölüm yeni sayfadan; imza ayrı sayfa; tablo başlık tekrarı UDF'te.

## YENİ OTURUM DEVRİ (v2.259) — Resmîleştirme (DOCX tablo, ana bölüm sayfa, PDF düğmesi)

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.259** |
| Testler | `bash tools/test.sh` → **1551 birim + 517 şema** + rapor/sürüm/tasarım yeşil |

### Ne yapıldı
- **DOCX tablo genişliği:** sabit 9000 twip → `contentTw = sayfa − sol/sağ marj` (15mm'de 10206);
  `tblInd=0`. Tablo metin genişliğine oturur.
- **Her ana bölüm (1–7) + ekler yeni sayfa** (DOCX `w:br page`, UDF `<page-break>`, HTML
  `.paper-page-break`). İlk gövde hariç (kapak→gövde zaten ayrı).
- **PDF:** "Yazdır" → "PDF / Yazdır"; ipucunda "Hedef: PDF; üst/alt bilgi kapalı".

### DEĞİŞMEZ / DÜRÜST SINIR
- **Gerçek PDF motoru YOK.** `.pdf` üretmek için PDF kütüphanesi + Türkçe font gömme gerekir
  (büyük iş). PDF = tarayıcı Yazdır → PDF kaydet. Tarayıcı üst/alt bilgisi CSS ile kaldırılamaz.
- **Numaralandırma:** ana 1–7 numaralı; alt parçalar (köken/konuşmacı/okuma/WER/seviye/özet/
  kalite/gizlilik/ekler) numarasız başlık + TOC'te gövde sırası. Tümüne numara = ayrı şema kararı.
- DOCX tablo genişliği `__docxFmt.contentTw`'den; marj/yön değişince otomatik.

### SIRADAKİ (karar)
- Gerçek PDF (pdf-lib/jsPDF + font) — büyük iş; onay gerekir.
- Alt bölümlere numara (3.1 gibi) — 5.1 atıfları yeniden numaralanır; karar gerekir.
- "UI'de başka ekler" — hangi ekran/öğe olduğu netleşince tutarlılaştırılır.

## YENİ OTURUM DEVRİ (v2.260) — OpenOffice/LibreOffice tablo sola çıkıntı

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.260** |
| Testler | `bash tools/test.sh` → **1551 birim + 517 şema** + rapor/sürüm/tasarım yeşil |

### Kök neden / düzeltme
- Tablo hücresi **yatay dolgu 110 twip (~0,19cm)** → LibreOffice tablo metnini marja hizalayıp
  **kenarlığı sola taşırıyordu**. Düzeltme: `tblCellMar left/right=0` + hücre paragrafına
  `w:ind left/right=90`. Kenarlık metin marjıyla hizalı.
- **LibreOffice bu ortamda YOK** → görsel doğrulama kullanıcıda. Hâlâ çıkıntı varsa `tblInd=110`.

### Kullanıcı istekleri (açık, karar/sıradaki)
- **Serbest düzen / sürükle-bırak:** bölüm ve ekleri istediği yere sürükleyip koymak istiyor.
  Şu an iskelet ↑↓ + aç/kapa + ek sıralama var; gerçek **drag-drop** ve "bölümü ekler'e taşı"
  ayrı ve büyük bir özellik (sıradaki aday).
- **PDF motoru:** gerçek `.pdf` = PDF kütüphanesi + Türkçe font gömme → **yüksek maliyet**;
  öneri: OpenOffice/Word "PDF olarak dışa aktar" kullan (tablo hizası düzeltildi).

## YENİ OTURUM DEVRİ (v2.261) — Rapor parçaları ayrı ayrı alınabilir

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.261** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1582 birim + 520 şema** + rapor/sürüm/tasarım yeşil |
| Git | commit + push sonrası `main` = `origin/main` doğrulanacak |
| Açık konu | Gerçek sürükle-bırak; kayıt/soru bazında ayrı kalem (v2.262 adayı) |

### Neden (kullanıcı sorusu)

Kullanıcı ChatGPT'nin hazırladığı `56_12_ana_bilirkisi_rapor_sablonu.udf` dosyasını
gösterdi: *"bizde bunlar var mı, kolayca ekleyebilir miyiz, bizimki karışık mı?"*
**Ölçüm:** içerik zaten vardı (v2.220); sorun **sıra ve gruplamaydı**. Varsayılan
raporda **GEREKÇELİ SONUÇ ve EKLER**, WER/seviye/özet ölçümlerinden ÖNCE
geliyordu; "EKLER" başlığı "burada gösterilir" diyordu ama **ekler kapalıydı**
(altında hiçbir şey yok); `s5` bulgular+cevaplar+sınırlılıkları birlikte
tutuyordu; "Tam 56.12" profili **sırayı değiştirmiyordu**.

### Yapılan

- `answers`, `limits`, `integrity` bölümleri; üçü de **numaralı ana bölüm**.
  Varsayılan: cevaplar/sınırlılıklar AÇIK, bütünlük KAPALI.
- `REPORT_BODY_ORDER` mantıklı sıraya çekildi: ölçümler + özet **sonuçtan önce**,
  sonuç sonda, ekler en sonda.
- `REPORT_SABLON_ORDER` + `reportPresetLayout(name)` → profil **sıra da** yazar;
  diğer profiller `order: null` (kullanıcı sırası korunur).
- Göç: `insertMissingInCanonicalOrder(order, REPORT_BODY_ORDER)` — eksik bölüm
  **kanonik komşusunun yanına** girer (sona atılsa eklerden sonra çıkardı).
  `reading` özel durumu kaldırıldı.
- `reportBlockRenders` **gövde döngüsünde de** kullanılıyor → TOC ile gövde
  ayrışamaz; soru yoksa cevaplar bölümü hiç çizilmez.
- **EKLER** bölümü `reportAttachmentLines(c)` ile gerçek ek başlıklarını listeler;
  ekler bloğu kapalıysa "Bu raporla ek sunulmamıştır".
- Serbest metin (sınırlılıklar) `s5`'ten `limits`'e taşındı; düzenleyici ve
  `reportSectionDerivedTarget` güncellendi.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Yeni bölüm eklerken göç kuralı hazır:** anahtarı `REPORT_SECTION_DEFS` +
   `REPORT_BODY_ORDER` + (numaralıysa) `REPORT_MAIN_KEYS` listelerine yazın.
   `normalizeReportLayout` eksik anahtarı kanonik komşusuna yerleştirir;
   **elle "sonda ekle" mantığı yazmayın** (v2.261'de bu hata ölçüldü).
2. **Profil iki şeyi yazabilir:** bölüm kümesi **ve** sıra. Sıra yazmayan profil
   `order: null` döndürmeli; aksi hâlde kullanıcının düzeni sessizce ezilir.
3. **TOC = gövde:** hangi bölüm çiziliyorsa TOC'ta o var. Yeni bir koşullu blok
   eklerken `reportBlockRenders`'a yazın; gövde döngüsü aynı ölçütü kullanır.
4. **"Burada gösterilir" diyen bir başlık boş bırakılamaz.** Ya içerik listelenir
   ya "yok" denir (EKLER dersi).
5. **Soru yoksa cevaplar bölümü çizilmez** (boş başlık/fallback yok).
6. `limits` ölçülen özeti (`limitsMeasuredText`) **yalnız bölüm işaretlerinden**
   üretir; işaret yoksa satır yazılmaz.

### Ölçüm (gerçek Chromium + CDP, 1440×900, örnek dosyalar)

| Ölçüm | Sonuç |
|---|---|
| Varsayılan sıra | 1 kapsam · 2 sorular · 3 envanter · … · 5 bulgular · 6 cevaplar · 7 sınırlılıklar · 8 sonuç · 9 EKLER |
| 56.12 profili | 1..8 bitişik; bulgular → sınırlılıklar → kalite → cevaplar → … → sonuç |
| Cevap kapat → sınırlılık | **duruyor** (bağımsız) |
| EK yokken | "Bu raporla ek sunulmamıştır" |
| Kırpma / yatay taşma | 1280/1100/900/760 → **0 / yok** |
| JS hatası | **0** |

### Sıradaki (aday)

1. **Kayıt bazında ayrı kalem:** "yalnız 2. kaydın transkripti" (dinamik kalem).
2. **Soru bazında ayrı kalem:** "yalnız 1. sorunun cevabı".
3. **Parçayı eke taşı** (gövde ↔ ek).
4. Gerçek sürükle-bırak sıralama (↑↓ korunur).

## YENİ OTURUM DEVRİ (v2.262) — Konuşmacı kodu güvenliği

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.262** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1606 birim + 520 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Sıradaki konuşmacı işleri: hız (klavye/aralık atama), dinleme, tutarlılık denetimi |

### Ölçülen hata (kullanıcı sorusu üzerine)

Kullanıcı: *"S1/S2 kodlarını değiştirmemeliyiz değil mi? Çok dosyada yanlış tanımlama
istemiyoruz."* Ölçüm: panelde **"Standart kod" bir giriş alanıydı**; iki konuşmacıya
`S1` yazmak mümkündü ve **kalıcıydı** (`S1/A | S1/B`), geçersiz kod (`SX`) ise sessizce
düzeltiliyordu → koruma yarım. Sonuç: rapor **iki kez "S1"** yazıyor, hangi bölümün
kime ait olduğu okunamıyordu.

### Yapılan

- **Kod salt-okunur** (`<span class="spk-code">`); etiket düzenlenebilir kalır.
- `schema.js`: `speakerCodeIssues(case)` (kayıt başına çakışma) +
  `fixSpeakerCodeConflicts(case, materialId?)` (ilk kodu KORUR, sonrakini boş koda taşır).
  **Yüklemede sessiz yeniden numaralama YOK.**
- Panel: çakışma uyarısı + "Çakışan kodları düzelt" → `askConfirm` → `snapshotForUndo`
  → `logEvent('speaker-code-fix')` → toast. Metin/ses değişmez.
- `READINESS_SEVERITY.speakerCodes = 'blocking'` + hazırlık satırı
  (`target:'audio'`, `action:'speakerCodes'` → Dinleme sekmesindeki panel).
- Rapor: `speakerCodeConflictText(c)` tek kaynak; **üç çıktı** aynı uyarıyı basar.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Kod kimliktir, etiket görünür addır.** Kod kullanıcıya açılmaz; yeni bir
   görünen-alan eklerken kodu değiştirmeyin.
2. **Çakışma sessizce düzeltilmez.** Veri olarak bildirilir; düzeltme kullanıcı
   kararıdır, onay + geri alma + günlük ister.
3. **Kayıtlar arası S1 çakışma DEĞİLDİR** (kod kayıt başınadır). Dedektör kayıt
   içinde bakar.
4. Yeni bir "kimlik" alanı eklerken aynı desen: salt-okunur + çakışma dedektörü +
   hazırlık maddesi.

### Ölçüm (gerçek Chromium + CDP)

Çakışma enjekte → Durum **Engelleyen eksik: 1**; rapor uyarısı **var**; satıra tıkla →
Ses görünümü + panel (kod girişi **0**, rozet `S1`,`S1`); düzelt → `S1, S2`, toast,
günlük `speaker-code-fix: S1→S2 (B)`; **Ctrl+Z → `S1, S1`**; uyarı/hazırlık maddesi
kayboldu; kırpılma 0; JS hatası **0**.

## YENİ OTURUM DEVRİ (v2.263) — Konuşmacı atama hızı

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.263** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1637 birim + 520 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Sıradaki: tutarlılık denetimi + "doğrulandı" kilidi (v2.264), rapor tablosu (v2.265) |

### Yapılan

- **Alt+1…9** → aktif bölüme o sıradaki konuşmacı atanır (`assignSpeakerHotkey`).
  Karar tuşlarından (1…5) ayrıdır; metin alanında çalışmaz; onay durumunu değiştirmez.
- **`setSegmentSpeakerByName` TEK KAPI**: adı ve `speakerId`'yi birlikte yazar.
  Bölüm detayındaki seçim de buradan geçer (eskiden yalnız ad yazılıyordu).
- `assignSpeakerByIndex`, `speakerIndexList` (yalnız etiketli kişiler),
  `speakerQueueIndexes`, `speakerStats` — saf, test edilir.
- Konuşmacı kartı: **▶ Örnek dinle (≤3 sn)** · **▶ Tüm bölümlerini dinle**
  (oturumluk `spkQueue`) · **bölüm sayısı · toplam süre · ilk–son duyulma**.
- `playSegmentRange(..., {seconds})` bitişi `min(bölüm sonu, başlangıç+n)` yapar.
- Kuyruk iptal noktaları: elle çalma (`restart:false`), ⏹ (`stopSegmentPlayback`),
  ana oynat (`playWholeRecording`). Kuyruk kendi geçişini `restart:true` ile yapar.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Atama tek kapıdan:** `setSegmentSpeakerByName` (ad + kimlik). Doğrudan
   `s.speaker = ...` yazmayın; kimlik boş kalır ve ada bağımlılık geri gelir.
2. **Kuyruk oturumluktur**, şemaya yazılmaz. Yeni bir çalma yolu eklerseniz
   `playSegmentRange`'i `restart:true` ile çağırın (kuyruğu iptal etmesin).
3. **Adsız konuşmacıya atama yok**: raporda "S1 · " boş görünürdü.
4. Örnek dinleme bölüm sonunu AŞMAZ (`seconds` sınırı).

### Ölçüm (gerçek Chromium + CDP, gerçek WAV, 3 elle bölüm, TEK sekme)

| Adım | Sonuç |
|---|---|
| Alt+1 / Alt+2 / Alt+1 | rozetler **S1, S2, S1**; toast "Bölüm 3 → S1 · Konuşmacı 1." |
| Kart istatistiği | "2 bölüm · 00:10 · 00:00:00.000–00:00:10.000" |
| Tümünü dinle | 0–5 çaldı, **S2'yi atladı**, 10–15'e geçti |
| ⏹ | durdu, aktif bölüm başına döndü |
| Örnek dinle | 0–3 sn, **t=3,1'de durdu** |
| Kırpılma / taşma / JS hatası | **0 / yok / 0** |

### ÖLÇÜM TUZAĞI (tekrar etmesin)

İki sekme açıkken **sekme koruması** devreye girer ("değişiklikler KAYDEDİLMİYOR")
ve klavye/DB ölçümleri yanıltıcı olur. Ölçümden önce **tek sekme** kullanın.
Ayrıca klavye olayını `document.body`'ye göndermek YETMEZ: `onGlobalSegKey`
kartı `e.target.closest('.audio-card')` ile bulur; olayı **bölüm köküne**
(`[id^="segments-"]`) gönderin (gerçek kullanımda odak kartın içindedir).

## YENİ OTURUM DEVRİ (v2.264) — Konuşmacı "doğrulandı" kilidi

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.264** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1650 birim + 520 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Ölçülen tutarlılık denetimi (ses tabanlı) ve rapor konuşmacı tablosu |

### Yapılan

- `emptySpeaker.verifiedAt/verifiedBy` + `normalizeSpeaker` korur + `isSpeakerVerified`.
- Kart: **"Doğrulandı (kilitle)"** → `data-spk-key` alanları ve **Sil** `disabled`;
  `.spk-card.is-verified` yeşil kenar; etiket **"✓ doğrulandı · <kim>"**.
- `snapshotForUndo` + `logEvent('Konuşmacı doğrulandı' / 'Konuşmacı kilidi açıldı')`.
- Rapor: `REPORT_TEXT.speakerVerifiedSuffix` bağsız satırda ve bağlı kişi satırında
  (bağlı konuşmacılardan biri doğrulanmışsa) NOT hücresine eklenir.
- `mergeCases`: doğrulama devralınır; iki tarafta da varsa **daha yeni tarih** korunur.

### DEĞİŞMEZ KURALLAR

1. **Kilit ≠ onay.** Konuşmacı doğrulaması raporun **Kontrol** sütununu ve onay
   sayacını ETKİLEMEZ; metinle de böyle söylenir.
2. **Doğrulayan kimliği uydurulmaz:** kimlik girilmemişse `verifiedBy` boş kalır
   (günlükte "bilinmiyor" yazar). Ad uydurmayın.
3. **Kilitli kayıt silinemez**: silme düğmesi devre dışı; önce işaret kaldırılır.
4. Yeni bir "kilit" alanı eklerken aynı üçlü: şema alanı + normalize + birleştirme
   (daha yeni kazanır) + rapor notu.

### Ölçüm (gerçek Chromium + CDP, gerçek WAV)

| Adım | Sonuç |
|---|---|
| Doğrula | **6** alan `disabled`, Sil kapalı, `.is-verified` var |
| Etiket | "✓ doğrulandı" (kimlik yoksa ad eklenmez) |
| Toast | "S1 · Konuşmacı 1 doğrulandı: künye kilitlendi. (Bölüm onayı değildir.)" |
| Rapor | "doğrulandı" notu **var** |
| Ctrl+Z | kilit açıldı (0 disabled, sınıf yok) |
| Kırpılma / taşma / JS hatası | **0 / yok / 0** |

## YENİ OTURUM DEVRİ (v2.265) — Ses tutarlılığı ölçümü

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.265** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1680 birim + 520 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Rapor konuşmacı tablosu (süre + ilk/son + listede etiket) — v2.266 adayı |

### Yapılan

- `schema.js`: `VOICE_SCHEMA/1`, `VOICE_RATIO .28`, `VOICE_CHANGE_RATIO .35`,
  `VOICE_MIN_SAMPLES 3`; saf `medianOf`, `speakerVoiceProfiles`, `voiceOutliers`,
  `voiceChangeSuspects`.
- `emptyMaterial.voiceCheck` (türetilmiş ölçüm) + `normalizeMaterial` korur.
- `measureSpeakerConsistency(m)`: dosyanın kendi örnekleme hızında **tek decode**;
  her bölümde 2 pencere (0,25 sn) → `detectPitchHz` + `detectPitchAmbiguity` →
  ortanca. `m.voiceCheck = {ok, schema, at, points, profiles, outliers, changes}`.
- Arayüz: panelde **Ses tutarlılığını ölç** düğmesi; özet kutusu (`.voice-check`,
  `.vc-row`, **Git** = `data-voice-goto`); listede **⚠ ses** rozeti.
- Hazırlık: `voice` maddesi (**expert**, yalnız ölçüm varsa). QC tablosuna satır
  (yalnız ölçüm varsa; `perde ölçümü, kimlik tespiti değildir`).

### DEĞİŞMEZ KURALLAR

1. **İşaret ≠ düzeltme.** Hiçbir atama otomatik değişmez (`setSegmentSpeakerByName`
   çağrısı YOK); test [112] bunu negatif aramayla denetler.
2. **Oktav belirsiz ölçüm profile girmez** (v2.101); aksi hâlde yanlış yöne işaret eder.
3. **Profil ≥3 güvenilir bölüm** ister; az örnekte karşılaştırma yapılmaz.
4. **Ölçülmemiş ≠ 0 şüpheli**: hazırlık/QC yalnız ölçüm varsa görünür.
5. Ölçüm ağır iş: **yalnız kullanıcı tetikler**; kendiliğinden çalışmaz.

### Ölçüm (gerçek Chromium + CDP)

| Senaryo | Sonuç |
|---|---|
| Paket örnek kayıt (2 konuşmacı) | profiller 100,9 / 99,5 Hz → **0 şüpheli** (sesler ayrışmıyor) |
| İki perdeli test WAV (110/210 Hz) + bilinçli yanlış etiket | **1 şüpheli**: "Bölüm 4 · 210 Hz · atandığı profili 110 Hz"; liste **⚠ ses 1** |
| Kırpılma / taşma / JS hatası | **0 / yok / 0** |

### DÜRÜST SINIR

Perde ayrımı zayıftır: benzer perdedeki iki kişi ayrışmaz. **İşaret yokluğu**
atamaların doğru olduğu anlamına gelmez. Gerçek ayrıştırma için konuşmacı gömme
(embedding) modeli gerekir; ölçülmeden ürüne alınmaz.

## YENİ OTURUM DEVRİ (v2.267) — S/K ayrımı ve açıklamalar

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.267** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1699 birim + 520 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Analiz sayfası düzeni (v2.269), WER referans alanı (v2.270), gömme modeli (v2.271) |

### Yapılan

- **S = kayıt içi** (her kayıtta S1'den başlar), **K = dosyalar arası kişi** — bu ayrım artık her yerde yazılı.
- **Liste başı satırı:** `Bu kaydın konuşmacıları: S1 · Kiracı (12) · S2 · Ev sahibi (8)`.
  `speakerLegendItems` + `speakerLegendHtml`; etiket değişince `refreshSpeakerLegend` (tam çizim yok).
- Panel etiketleri: **Kayıt içi kod (S)** / **Dosyalar arası kişi (K)** + panel başında S/K notu.
- Rozet ipucu: `S1 · Kiracı — bu kayda özgü kod`.
- Rapor: `REPORT_TEXT.speakerCodeNote` (Konuşmacılar bölümü, üç çıktı), her kaydın başında
  `materialSpeakerLine(m)`, **EK-5**'e S/K tanımları.

### DEĞİŞMEZ KURALLAR

1. **S kodları kayıt başınadır**; rapor/ekran bunu her yerde söyler. İki kaydın S1'i aynı kişi değildir.
2. **K yalnız uzman eşleştirmesidir**; kimlik tespiti değildir.
3. Liste başı satırı ve rapor satırı **aynı fonksiyondan** (`materialSpeakerLine`) beslenir; kopya metin yok.
4. **Türkçe büyük İ** tuzağı: `KAYIT İÇİ` gibi metinleri `/i` bayrağıyla ARAMAYIN (v2.100).

### Ölçüm (gerçek Chromium + CDP)

| Ölçüm | Sonuç |
|---|---|
| Liste satırı | `Bu kaydın konuşmacıları: S1 · Konuşmacı 1 1` |
| Panel | `Kayıt içi kod (S)` · `Dosyalar arası kişi (K)` · S/K notu |
| Rozet ipucu | `Konuşmacı: S2 · Konuşmacı 2 — bu kayda özgü kod` |
| Rapor | S/K paragrafı + `Bu kaydın konuşmacıları: S2 · Konuşmacı 2 (1 bölüm)` |
| Kırpılma / taşma (1440/1280/1100/900) | 0 / yok |
| JS hatası | 0 |

## YENİ OTURUM DEVRİ (v2.268) — Rapor netliği

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.268** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1716 birim + 520 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Analiz sayfası düzeni (v2.269), WER referans alanı (v2.270), gömme modeli (v2.271) |

### Yapılan

- **Konuşmacı künyesi tablosu sadeleşti**; süre/aralık **ayrı** "Konuşmacı süreleri"
  tablosunda: `KONUŞMACI · BÖLÜM · SÜRE · İLK – SON` + altında tek satır dipnot.
  **TEK KAYNAK:** `speakerGroups(c)` → `speakerRows` + `speakerDurationRows`.
- **EK-5 üç tablo:** Konuşmacı kodları · Metin işaretleri · **Gözlem işaretleri**.
  Gözlem satırları `OBS_DEFS`ten **otomatik**; yeni bayrak eklenince anahtar kendiliğinden güncellenir.
- Ek blok türü **`tables`** (HTML/DOCX/UDF). Yeni bir "çok tablolu ek" gerekirse bu türü kullanın.
- **Okuma metni + ¶ penceresi** kayıt konuşmacı satırını (`materialSpeakerLine`) taşır.

### DEĞİŞMEZ KURALLAR

1. **İki tablo tek kaynaktan:** künye ve süre tabloları `speakerGroups`tan üretilir; ayrı hesap yazmayın.
2. **Gözlem anahtarı elle yazılmaz:** `OBS_DEFS.map(d => [d.label, d.hint])`. Yeni bayrakta
   rapor anahtarı otomatik güncellenir (test [115] satır sayısını OBS_DEFS ile karşılaştırır).
3. **Ek blok türleri:** `para` · `table` · `tables`. Üç çıktı da (`b.kind === 'tables'`) destekler;
   test [2cm] sayısını denetler.
4. Raporda ölçülmeyen süre/aralık **"—"**; uydurma yok.

### Ölçüm (gerçek Chromium + CDP)

| Ölçüm | Sonuç |
|---|---|
| Konuşmacılar bölümünde tablo | 2 (künye + süre) |
| Süre başlığı/dipnot | var |
| EK-5 üç tablo + 6 gözlem etiketi | var |
| "Bu kaydın konuşmacıları" | 2 kez (bulgular + okuma) |
| Kırpılan tablo (1440/1280/1100/900) | 0 |
| JS hatası | 0 |

## YENİ OTURUM DEVRİ (v2.269) — Analiz sekmesi düzeni + sessiz beyan düzeltmesi

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.269** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1739 birim + 520 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | WER referans alanı (v2.270), gömme modeli (v2.271), yeni bayraklar (v2.272) |

### Yapılan

- **Ölçümler bloğu** (Dinleme sekmesinin başı): 4 durum çipi (seviye · perde · tutarlılık ·
  spektrogram) + **“Tüm ölçümleri yap”** (sıralı, çift çalışma kilidi, hata → dur ve söyle).
- **Köken/teslim alanları** (beyan) **Kayıt bilgileri** sekmesine taşındı.
- **SESSİZ HATA DÜZELTİLDİ:** `refreshSegmentSpectrogram` her çizimde `spectrogramReviewed`
  yazıyordu → bölümü yalnız açan uzman “spektrogram incelendi” beyanı vermiş görünüyordu.
  Otomatik işaret kaldırıldı; beyan yalnız **“Spektrogramı göster”** düğmesiyle; çip yerinde tazelenir.
- Konuşmacı kartı: “perde ölçülmedi” ↔ **“perde ölçülemedi (ölçüm yapıldı)”** ayrımı.

### DEĞİŞMEZ KURALLAR

1. **Ölçüm durumu TEK KAYNAK:** `measurementStatus(m)`. Eski şema ölçümü (`schema !== LEVELS_SCHEMA`)
   “yapılmadı” sayılır. Yeni bir ölçüm eklerken buraya da satır ekleyin.
2. **Beyan ≠ ölçüm.** Spektrogram incelemesi (`spectrogramReviewed`) **yalnız açık kullanıcı
   eylemiyle** yazılır. Bir görünümün çizilmesi beyan DEĞİLDİR (v2.269 dersi).
3. **Toplu ölçüm sıralıdır ve çift çalışmaz**; atlanan adım **söylenir**.
4. Ölçüm sonunda **çipler tazelenir** (`refreshMeasurementPanel`); aksi hâlde beyan verildiği
   hâlde “yapılmadı” görünür (v2.269'da ölçüldü).

### Ölçüm (gerçek Chromium + CDP)

| Ölçüm | Sonuç |
|---|---|
| Başlangıç | 4 çip × `yapılmadı` |
| Tüm ölçümleri yap | 3/3 adım; `19:41`, `1/1 konuşmacı`, `0 şüpheli` |
| Köken paneli | Dinleme'de yok, Kayıt bilgileri'nde var |
| Bölüm açma | spektrogram çipi **yapılmadı** kalır |
| Spektrogramı göster | çip `19:42 · uzman beyanı` |
| Kırpılma / taşma / JS hatası | 0 / yok / 0 |

## YENİ OTURUM DEVRİ (v2.270) — WER referans alanı

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.270** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1758 birim + 520 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Gömme modeli (v2.271), yeni gözlem bayrakları (v2.272) |

### Kök neden (kullanıcı: "WER rapora koymuşuz ama çıkmıyor")

`measureWerForCase` **referans metni** (`m.expectedText`) + modelin **ham çıktısını**
(`s.asrText`) ister. **Referans girilecek alan arayüzde yoktu** → gerçek dosyalarda tablo
hiç oluşmuyordu. Satır yoksa bölüm çizilmez (doğru), ama **nedeni görünmüyordu**.

### Yapılan

- Dinleme sekmesinde katlanır **“WER — çözümleme doğruluğu (referans varsa)”** paneli:
  referans textarea (`data-wer-ref`), **durum satırı**, açıklama.
- `werStatus(m)` (saf) + `werStatusText(st)` (tek kaynak metin). Üç durum:
  `no-reference` · `no-asr` · hazır (oran + kelime sayıları).
- Ölçümler bloğuna **WER (referans)** çipi (`manual:true`; düğmeyle ölçülmez).
- `input` yalnız durum metnini tazeler; kayıt `change`te (uzun metinde her tuşta yazma yok).

### DEĞİŞMEZ KURALLAR

1. **Hipotez yalnız `asrText`** (modelin ham çıktısı). Bilirkişi metni WER'e GİRMEZ (v2.90).
2. **Referans yoksa tablo çizilmez** ve **nedeni yazılır** (sessiz boşluk yok).
3. `expectedText` şemada ve birleştirmede mevcut (v3); yeni alan eklemeye gerek yok.
4. Her yeni "ölçüm" eklerken: `measurementStatus` satırı + çip + (varsa) panel + test.

### Ölçüm (gerçek Chromium + CDP)

| Adım | Sonuç |
|---|---|
| Referans yok | `Referans metin yok — WER ölçülemez…`; çip `yapılmadı · referans yok` |
| Referans var, model çıktısı yok | `Model çıktısı yok — önce kaydı çözümleyin…` |
| Referans + asrText | `Ölçüldü: %50,0 · referans 2 kelime · çıktı 1 kelime` |
| Rapor | WER bölümü var, `%50,0` |
| Kırpılma / JS hatası | 0 / 0 |

## YENİ OTURUM DEVRİ (v2.272) — İki yeni gözlem işareti

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.272** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1778 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Gömme modeli (veri bekliyor); Pages derleme kuyruğu (GitHub tarafı) |

### Yapılan

- `OBS_DEFS` +2: **`echo` (yankı / oda akustiği)** ve **`dropout` (kesinti / kopukluk)**.
  Düğmeler, `#obsHelpList`, rapor GÖZLEM sütunu ve **EK-5 gözlem tablosu** otomatik.
- Eski kayıtlar `false` ile açılır; `normalizeSegment` bilinmeyen anahtarı silmez;
  `mergeCases` gözlemleri OR'lar.

### DEĞİŞMEZ KURALLAR

1. **Bayrak metni yalnız `OBS_DEFS`'te.** Uygulamaya/HTML'e tam etiket kopyası yazmayın;
   kullanıcı metninde **kısa ad** kullanın ("yankı", "kesinti"). `tasarim` [2cp] ve
   `birim` [118] tam etiketin app.js/index.html'de bulunmasını **hata** sayar.
2. Yeni bayrak eklerken **tek zorunlu değişiklik** `OBS_DEFS`'e satır; EK-5 satır sayısı
   testte `OBS_DEFS.length` ile karşılaştırılır.

### Ölçüm (gerçek Chromium + CDP)

| Ölçüm | Sonuç |
|---|---|
| Gözlem düğmesi | 8 (satır 19 px, kırpma 0) |
| ≤600 px | satır gizli, "Gözlem (N)" paneli |
| Rapor | gözlem metni + EK-5 tanımları var |
| JS hatası | 0 |

## YENİ OTURUM DEVRİ (v2.273) — Kayıt bazında konuşmacı tablosu

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.273** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1792 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Gömme modeli (veri bekliyor) |

### Yapılan

- **1.1'de her kayıt için konuşmacı TABLOSU** (düz satır kaldırıldı):
  `KOD · KONUŞMACI · BÖLÜM · SÜRE · İLK – SON`; kişi bağı varsa
  **DOSYALAR ARASI KİŞİ** sütunu eklenir; bağ yoksa sütun çizilmez.
- Tek kaynak `materialSpeakerRows(c, m)` → `{ headers, rows, hasPerson }`.
- **Yinelenen S/K cümlesi** `speakerIntro`dan çıkarıldı (tek paragraf: `speakerCodeNote`).
- Okuma metni **kısa satırı** korur (tablo orada akışı bozar).

### DEĞİŞMEZ KURALLAR

1. **Tabloda süre/aralık `speakerStats`ten** gelir; ayrı hesap yazmayın.
2. **Boş sütun çizilmez**: kişi bağı yoksa "DOSYALAR ARASI KİŞİ" eklenmez.
3. **Aynı bilgi tek yerde**: S/K açıklaması yalnız `speakerCodeNote`;
   `speakerIntro` eşleştirme cümlesini TEKRARLAMAZ (test [2cq]/Senaryo 36).
4. Raporda kişi etiketi **tablo başına bir kez** görünür; kayıt sayısı kadar çoğalmaz.

### Ölçüm (gerçek Chromium + CDP, `01-dikey.mp4`)

| Ölçüm | Sonuç |
|---|---|
| 1.1 tablo | `KOD · KONUŞMACI · BÖLÜM · SÜRE · İLK – SON` + 2 satır |
| Kırpılan tablo (1440/900/600) | 0 |
| S/K cümlesi | 1 |
| JS hatası | 0 |

### DİKKAT — kök dizine medya dosyası koymayın

Kullanıcı `01-dikey.mp4` dosyasını **depo köküne** koydu. Kök dizin GitHub Pages'te
**herkese açık** yayınlanır; gerçek dava kaydı olabilir. Bu dosya **commit edilmedi**.
Kural: gerçek/olasi dava medyası depoya (özellikle köke) konmaz; gerekirse
`sample_data/` altında ve **kurgusal** olarak tutulur ya da `.gitignore`'a eklenir.

## YENİ OTURUM DEVRİ (v2.274) — Konuşmacı kimliği tutarlılığı

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.274** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1814 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.275 (silmede bellek temizliği), v2.276 (depo hijyeni + belge) |

### Ölçülen hata (v2.273)

Bölüm S1'e atanmışken **＋ Yeni konuşmacı** yalnız `speaker` adını yazıyordu;
`speakerId` eski kişide kalıyordu. `speakerSegments` **ad VEYA kimlik** ile
eşleştiği için tek bir 5 sn'lik bölüm raporda **hem S1 hem S2** satırında
görünüyordu (yenilemeden sonra da kalıcı). **＋ Bölüm** de materyalde konuşmacı
varken ikinci bir "Konuşmacı 1" uyduruyordu (ölçüm: S1 "Kiracı" iken S2).

### Yapılan

- `schema.js` → **`reconcileSpeakerRefs(speakers, segments)`** (saf) ve
  `normalizeMaterial` içinde kullanımı: bayat/tanınmayan kimlik onarılır; ad ile
  kimlik çelişirse **ad** (uzmanın açık seçimi) kazanır, ad listede yoksa ad
  kimlikten yazılır (tek kaynak).
- `addSpeakerAndAssign(m)` — ＋ konuşmacı: sıradaki **boş** adı verir ve aktif
  bölüme **tek kapıdan** (`setSegmentSpeakerByName`) atar.
- `addManualSegment` — mevcut konuşmacıyı kullanır (önceki bölümün konuşmacısı →
  ilk etiketli konuşmacı → yoksa "Konuşmacı 1") ve `speakerId` yazar.
- `importProject` — tekil paket de arşiv gibi **`normalizeCase`** ile açılır
  (önce ham `pack.case` belleğe giriyor, bozuk kimlik ancak yenilemede düzeliyordu).

### DEĞİŞMEZ KURALLAR

1. Konuşmacı ataması **yalnız** `setSegmentSpeakerByName` ile yapılır (ad + kimlik).
2. `speakerId` **kimliktir**; ad yalnız görünür addır. Çelişki varsa normalize
   onarır; raporda çift sayım kalmaz.
3. İki paket yolu (`case.json` / `archive.json`) **aynı** normalize sözleşmesini
   kullanır (v2.132 dersi: iki yol ayrışmaz).
4. Yeni bir "bölüme kişi ata" yolu eklerken tek kapıyı kullanın; doğrudan
   `s.speaker = ...` yazmayın.

### Ölçüm (gerçek Chromium + CDP + gerçek WAV)

| Adım | Önce | Sonra |
|---|---|---|
| Elle bölüm → ＋ konuşmacı → rapor | S1 1 + S2 1 (aynı 5 sn) | **yalnız S2 · 1 bölüm** |
| ＋ Bölüm (S1 "Kiracı") | yeni S2 "Konuşmacı 1" | **S1'e atanır** |
| Bayat kimlikli paket | S1 2 · S2 1 | **S1 1 · S2 1** |
| JS hatası | 0 | **0** |

Koruyan test: `birim` [120] (20 kontrol).

## YENİ OTURUM DEVRİ (v2.275) — Silmede medya temizliği

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.275** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1827 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.276 (depo hijyeni + belge + ölü kod) |

### Ölçülen risk (v2.274)

**Kalıcı sil** ses blob'unu IndexedDB'den siliyordu ama **object URL iptal
edilmiyor, AudioContext kapatılmıyordu**. Silinen ses, sayfa yenilenene kadar
çalınabiliyor; kullanıcı "kayıt geri geldi" sanıyordu. Aynı eksik **Test
dosyalarını kaldır** yolunda da vardı; yalnız **Kaldır** doğru temizliyordu
(üç ayrı silme yolu, üç ayrı kod).

### Yapılan

- `discardMaterialMedia(c, m)` — AudioContext kapat · object URL iptal · blob sil
  (idempotent; kayıt yoksa güvenli).
- `purgeCaseMedia(c)` — dosyadaki tüm materyaller için yukarıdakini çağırır.
- **Üç yol tek yardımcı:** `removeAudio` · `purgeCaseById` · `removeSamples`.
- Test koşumunda sahte IndexedDB **işlem tamamlanacak** biçimde düzeltildi;
  aksi hâlde `await deleteBlob()` asılı kalıyordu (testte "unsettled top-level
  await").

### DEĞİŞMEZ KURALLAR

1. Bir materyalin medyası **yalnız** `discardMaterialMedia` ile bırakılır;
   `deleteBlob` doğrudan çağrılmaz (URL/AudioContext unutulur).
2. Yeni bir silme yolu eklerken `purgeCaseMedia`/`discardMaterialMedia` kullanın.
3. `speakerId` (v2.274) gibi, "tek kapı" kuralı silme için de geçerlidir:
   kopya temizlik kodu bir yolda eksik kalır.

### Ölçüm (gerçek Chromium + CDP + gerçek WAV)

| Adım | Önce | Sonra |
|---|---|---|
| Kalıcı sil → `revokeObjectURL` | **0** | **1** |
| Kalıcı sil → IndexedDB delete | 1 | 1 |
| Arşiv sayısı | 1 → 0 | 1 → **0** |
| JS hatası | 0 | **0** |

Koruyan test: `birim` [121] (12 kontrol).

## YENİ OTURUM DEVRİ (v2.276) — Depo hijyeni, belge, ölü kod

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.276** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1831 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Yok (v2.274–v2.276 turu kapandı) |

### Ölçülen durum (v2.275)

Kök dizin GitHub Pages'te **herkese açık** yayınlanır (ölçüm: `2026_1.udf` →
HTTP **200**, depo **public**). Kökte eski ZWSP hatalı rapor (541 kelime/tarih
içinde U+200B) + referans şablonlar vardı. `sample_data/outputs/UDF_Yapi_Testi_Kurgusal.udf`
v2.252 öncesi kodla üretilmişti (63 ZWSP). Üç ölü fonksiyon; üç belgede eski ifade.

### Yapılan

- **Kök dizin nöbetçisi** (`surum` **[12]**): git'e İZLENEN kök girdileri beyaz
  listede olmalı; `*.udf|docx|pdf|wav|mp3|mp4|mov|webm|akis|zip` yasak.
  "Yayınlanan = izlenen" ölçütü kullanılır (`.gitignore`daki yerel dosya yanlış
  pozitif üretmez).
- `2026_1.udf` → `git rm --cached` + `.gitignore` (`/2026_1.udf`, `/*.udf`).
  **Dosya yerelde SİLİNMEDİ**; yalnız yayından çıktı.
- `56_12_ana_bilirkisi_rapor_sablonu.{udf,html}` → `docs/kaynak/` (git mv).
- `sample_data/outputs/UDF_Yapi_Testi_Kurgusal.udf` **güncel kodla yeniden
  üretildi**: ZWSP'li token **63 → 0**.
- Ölü kod silindi: `repetitionNoteHtml`, `silenceNoteHtml` (ham hex renk
  taşıyordu), `undoDepth` → `birim` [122].
- Belgeler: README "yedi bölümlü" → **dokuz ana bölüm**; OZELLIKLER girişi
  (v2.127 ifadesi) ve v2.274 notu; `DENETIM_VE_PLAN.md` #5/#9/#16 kapandı +
  v2.276 güncelleme notu; `RAPOR_EKRANI_PLANI.md` şablon yolu.

### DEĞİŞMEZ KURALLAR

1. **Kök = yayın.** Köke rapor/medya koymayın; `surum` [12] kalır.
2. Kullanıcı dosyasını **silmeden** yayından çıkarmak için `git rm --cached` +
   `.gitignore` kullanın; yerel dosya korunur.
3. Referans/örnek belgeler `docs/kaynak/` veya `sample_data/` altında durur.
4. Ölü kod silmeden önce kullanımını ölçün (grep + testler); silinen davranışın
   yerine geçen tek kaynağın durduğunu test edin.

### Ölçüm

| Ölçüm | Önce | Sonra |
|---|---|---|
| Kökte izlenen rapor/medya | 3 | **0** |
| Örnek UDF ZWSP token | 63 | **0** |
| Ölü fonksiyon | 3 | **0** |
| Testler | 1827 | **1831 + 522** |

## YENİ OTURUM DEVRİ (v2.277) — Kayıt adı: kırpma ve koyu tema

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.277** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1831 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Koyu/sepya temada kalan düşük kontrast metinler (ayrı sürüm adayı) |

### Ölçülen hata (v2.276, gerçek Chromium + 55 karakterlik gerçek dosya adı)

`.mc-name` **147 px kutu / 368 px içerik**: dosya adının **%60'ı gizliydi**
(app.css `nowrap + ellipsis`). Rengi ham hex olduğu için **koyu temada 1.38:1**
(okunmuyordu); açık 10.16 / sepya 9.16.

### Yapılan (yalnız `reading-layer.css`)

- `#view-audio .mc-name`: `white-space: normal; overflow: visible;
  text-overflow: clip; overflow-wrap: anywhere; color: var(--ink); line-height: 1.3`.
- `#view-audio .mc-top { align-items: flex-start }` — çok satırlı adda numara üstte.

### DEĞİŞMEZ KURALLAR

1. **Liste adı kimliktir, kırpılmaz.** Uzun ad sarar; satır uzar (kabul edilen bedel).
2. Bir metin rengi **ham hex** ile yazılmaz; token kullanılır (koyu tema).
3. Yeni bir liste/madde öğesi eklerken `text-overflow: ellipsis` yazmayın;
   sarma veya görünür kaydırma kullanın (v2.130 dersi).

### Ölçüm

| Ölçüm | Önce | Sonra |
|---|---|---|
| Ad kırpıldı mı | evet (147/368) | **hayır** (147/147) |
| Ad yüksekliği / satır | 17 / 51 px | **57 / 91 px** |
| Koyu tema kontrastı | **1.38** | **12.73** |
| Yatay taşma · rozet | yok · görünür | yok · görünür |

Koruyan test: `tasarim` [2cr] (6 kontrol).

## YENİ OTURUM DEVRİ (v2.278) — Kalan düşük kontrast metinler

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.278** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1831 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Yok (v2.277–v2.278 tema turu kapandı) |

### Ölçüm yöntemi (TEKRAR KULLANILABİLİR — bu turun en değerli çıktısı)

Üç tema × dört görünümde **her metin düğümü** için:
1. `getComputedStyle(el).color` (alfa dâhil),
2. ata zinciri boyunca `background-color` **alfa birleştirilerek** gerçek zemin,
3. WCAG kontrast oranı; `el.closest('[aria-hidden="true"]')`, `[hidden]`,
   `.report-paper` dışlanır; yalnız **harf içeren** yaprak düğümler sayılır.

Bu yöntem, CSS dosyasını taramaktan farklıdır: **hangi kuralın kazandığını** ve
gerçek zemini ölçer. v2.277 sonrası **10 ihlal** bulundu (v2.161/v2.162
denetimlerinin kaçırdığı öğeler).

### Bulunan ve düzeltilen (hepsi app.css'te HAM HEX metin rengi)

| Öğe | Koyu tema önce | Sonra |
|---|---|---|
| Soru sekmesi etiketi | **1.53** | 9.65 |
| Soru sekmesi açıklaması | 2.30 (açık) | 7.51 / 8.21 |
| Soru sekmesi sayacı | 2.34 | 7.75 |
| Klavye etiketi | 1.94 | 8.75 |
| Yükleme ipucu | 3.13 | 6.44 |
| Dışa aktarma notu | 1.91 | 14.05 |
| Referans kutusu başlığı/kalın | 3.02 | token |

Tarama sonrası: **0 ihlal** (boş durumlar dâhil).

### DEĞİŞMEZ KURALLAR

1. Metin rengi **ham hex** yazılmaz; `--ink/--ink-2/--ink-3` kullanılır.
2. Tema denetimi **hesaplanan renkle** yapılır; "token var" yeterli değildir.
3. Yeni bir kural eklerken **CSS borç nöbetçisi** (app.css→layer ≤500) artmamalı:
   aynı seçici+özellik çifti yazmak yerine kapsamlı seçici kullanın
   (ör. `.app-shell .empty-state b`).
4. Ocak 2026'ya kadar: yeni bir panel/rozet eklediğinizde yukarıdaki taramayı
   çalıştırın; ihlal 0 olmadan sürüm çıkarmayın.

Koruyan test: `tasarim` [2cs] (9 kontrol).

## YENİ OTURUM DEVRİ (v2.279) — Konuşmacı gömme (embedding) benzerliği

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.279** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1874 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Yok (gömme ölçümü kapandı; kalan sınırlar aşağıda) |

### Model ve ÖLÇÜLEN fizibilite (gerçek Chromium, transformers.js 3.7.2)

| | |
|---|---|
| Model | `Xenova/wavlm-base-plus-sv` (transformers.js uyumlu ONNX, `audio-xvector`) |
| Dosya | `onnx/model_quantized.onnx` = **101.683.453 bayt** (fp32 402 MB — kullanılmıyor) |
| Gömme | **512** boyut · 16 kHz mono · 5 sn pencere |
| Yükleme | **3,7 sn** (profil önbelleği boş; sonra tarayıcı önbelleği) |
| Hız | pencere başına **~2,1 sn** (CPU) |
| Eşik (ölçüldü) | aynı **0,963 / 0,917** · farklı **0,786 / 0,678 / 0,764 / 0,664** |
| Karar | **≥ 0,88 aynı**, **< 0,72 farklı**, arası **belirsiz** (işaretlenmez) |

### Yapılan

- `schema.js`: `l2Normalize`, `cosineSimilarity`, `embeddingCentroid`,
  `speakerEmbeddingProfiles`, `embeddingOutliers`, `embeddingChangeSuspects`,
  `embeddingSuggestions` + `VOICE_EMBED_*` sabitleri. **Saf**; test edilir.
- `app.js`: `loadSpeakerEmbedder` (dinamik import, dtype q8), `resampleTo16k`,
  `measureSpeakerEmbeddings`, panel (`voiceEmbedPanelHtml`), `⚠ gömme` rozeti,
  rapor QC satırı, `data-voice-embed` / `data-voice-embed-goto` işleyicileri.
- `emptyMaterial.voiceEmbed` + `normalizeMaterial` korur. **Vektör saklanmaz**;
  yalnız özet (outliers/changes/suggestions/profiles sayıları).
- Yardım ekranı + OZELLIKLER + CHANGELOG/YOL; `surum` yardım konusu kontrolü.

### DEĞİŞMEZ KURALLAR

1. **Kimlik tespiti değildir.** Yalnız benzerlik; hiçbir atama otomatik değişmez
   (`setSegmentSpeakerByName` gömme kodunda YOK — test [123] denetler).
2. **İndirme sessiz olmaz:** model bellekte yoksa her oturumda onay sorulur.
3. **Vektör kayda yazılmaz** (şişme/veri sızıntısı); yeniden ölçüm gerekir.
4. **Belirsiz bölge işaretlenmez** (0,72–0,88). Eşik değişecekse YENİ ölçüm yapılır.
5. Ölçüm yalnız kullanıcı tetiklediğinde çalışır; "tüm ölçümleri yap" zincirine
   **eklenmez** (indirme gerektirir).

### Ölçüm (uçtan uca, etiketli ses)

| Senaryo | Sonuç |
|---|---|
| 5 bölüm (2×S1, 3×S2); son bölüm yanlış S2 | **1 şüpheli** "kendi 0,67 · S1 0,99" + rozet |
| Aynı ölçümde değişim | **1 değişim şüphesi** |
| Yanlış etiket yok | **0 şüpheli** |
| Yenileme | özet + rozet **korundu** |
| Model + 5 bölüm | **~12 sn** |

### TEST VERİSİ DERSİ (pahalı)

`sample_data/audio/*` kayıtları **konuşma (iki kişi)** — tek konuşmacılı test
verisi DEĞİL. İlk denemede 0–20 sn "aynı kişi" sanıldı; ölçüm 0,51–0,65 çıktı.
Etiketli doğrulama için `Xenova/transformers.js-docs` `sv_speaker-*` çiftleri
kullanıldı (**indirilmez, depoya girmez**; test paketi /tmp'de üretilir).
Tek konuşmacılı veri gerekiyorsa gerçek/etiketli kayıt kullanın.

### Bilinen sınırlar

- Model konuşma/şarkı ayrımı yapmaz; müzikli bölümde gömme yanıltıcı olabilir.
- Çok kısa bölüm (<1,2 sn) ölçülmez (sayılır, "kısa bölüm atlandı" yazılır).
- Profil için en az **2** ölçülmüş bölüm gerekir (leave-one-out); tek bölümlü
  konuşmacı değerlendirilmez.
- Kuantize model (q8) fp32'ye göre küçük farklar üretir; eşikler q8 ile ölçüldü.

## EK DÜZELTME (v2.280) — Gömme paneli konuşmacı yokken de görünür

**Ölçülen eksik:** `speakersPanelHtml` konuşmacı listesi boşken **erken
dönüyordu**; `.voice-embed` paneli hiç çizilmiyordu (canlı ölçüm: 0). Oysa
öneri üretimi tam o durumda gerekli. Erken dönüşe panel eklendi; profil yoksa
"bölümlere konuşmacı atayıp yeniden ölçün" yazar.

**DERS:** "Panel yalnız veri varsa çizilir" varsayımı, o panelin **veri
oluşturma** işi varsa yanlıştır. Boş durum = panelin en gerekli olduğu durum
olabilir.

## YENİ OTURUM DEVRİ (v2.281) — Konuşmacı KOD/ETİKET ayrı sütunlar

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.281** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1896 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | **Ses detayındaki analiz alanı sadeleştirme** (ölçüm alındı, adım planlanıyor) |

### Ölçülen durum (v2.280)

- Kanıt tablosunda `S1 · Kiracı` **tek hücre**; konuşmacı ve süre tablolarında da
  tek hücre.
- "Rapor alanları" panelinde **6 tablo** vardı; konuşmacı tabloları (3) **yoktu** →
  sütunlar açılıp kapatılamıyordu.
- Analiz alanı (Deşifre sekmesindeki dalga kutusu): **10 kontrol**, 219 px;
  detay paneli 385 px görünür / 543 px içerik → **158 px kaydırma**.

### Yapılan (yalnız sütunlar)

- `REPORT_COLUMN_TABLES`: `segments` → `time, speakerCode, speakerLabel, text,
  review, obs`; yeni `speakers`, `speakerDurations`, `materialSpeakers`.
- `normalizeReportColumns`: **göç** (`segments.speaker` → kod+etiket, kapalı kalır).
- **Okuma anında göç:** `reportTableColumns` normalize edilmiş tercihleri okur
  (`reportColumnOn` ham değeri okusaydı kapalı sütun geri açılıyordu — ölçüldü).
- `speakerGroups` → `code` + `name`; `speakerRows`/`speakerDurationRows`/
  `materialSpeakerRows` KOD ve ETİKET'i **ayrı** döndürür; `segSpeakerCells`.
- Üç çıktı (HTML/DOCX/UDF) `reportTableColumns` ile filtrelenir; genişlikler
  6/7/5 sütuna göre güncellendi; kişi sütunu **koşullu** (`keys` override).
- **DOCX test kusuru:** `<w:t[^>]*>` deseni `<w:tblPr>`/`<w:tblW>` etiketlerini
  yakalıyor, XML metne sızıyordu → `/<w:t(?:\s[^>]*)?>/` ile sınırlandı.

### DEĞİŞMEZ KURALLAR

1. **KOD = kimlik, ETİKET = görünen ad.** Tablolarda ayrı sütun; tek hücrede
   birleştirmeyin (mahkeme ayrı okur, kullanıcı ayrı kapatır).
2. Yeni bir tablo eklerken `REPORT_COLUMN_TABLES` + `REPORT_COLUMN_LABELS` +
   `REPORT_COLUMN_TABLE_LABELS` üçlüsüne yazın; panel otomatik listeler.
3. Koşullu sütunda `reportTableColumns(..., keysOverride)` kullanın (person).
4. Tercih göçü **okuma anında** da çalışmalı (`reportTableColumns` normalize eder).
5. Sütun başlığı eklerken üç çıktının **genişlik dizilerini** de güncelleyin
   (DOCX twip, UDF relatif); yoksa hücreler kayar.

Koruyan test: `birim` [124], `rapor` 13/25/36, `tasarim` [2cq]/[2cs].

## EK: v2.282 — Analiz alanı sadeleştirme (aynı sürümde)

- Dalga çubuğu **59 → 34 px**; görünür ipucu satırı → `title`; imleç zamanı,
  zoom, **Sığdır** tuvalin üst kaplamasına taşındı (`pointer-events:none`,
  yalnız Sığdır `auto`).
- Döngü metni → **🔁**; ayrı **İş** satırı **Durum** satırına katıldı
  (`workChipsHtml`; `workStatusHtml` kaldırıldı).
- Ölçüm: panel kaydırması 1440'ta **158 → 0**, 1280/1100'de **95/99**; yatay
  taşma yok; JS hatası 0.
- **DÜRÜST SINIR:** Bu ortamda dalga tuvalinin **çizimi** doğrulanamadı (v2.280
  tabanında da aynı: `fillRect` sayacı artmıyor, tuval 900/619). Değişiklik
  yalnız **HTML/CSS**; işleyiciler `closest('.sd-wave')` + `querySelector` ile
  arıyor (kaydırılan öğeler aynı ağaçta) ve JS hatası yok. Gerçek kullanıcı
  doğrulaması gerekir.
- Kalan adım: dalga kutusunu **Analiz** sekmesine taşımak (metin ~+219 px) —
  kullanıcı kararı bekliyor.

## YENİ OTURUM DEVRİ (v2.283) — Rapor bütünlüğü (canlı rapor denetimi)

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.283** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1915 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Konuşmacı kişi birleştirmenin yeri (kullanıcı önerisi), tam numaralandırma kararı |

### Kullanıcının gerçek uçtan uca testi (ölçüm kaynağı)

2 delil paketi (USB Kingston: `00-bozuk.aac` 0 bayt + `02-iki-konuşmacı.mp3`;
SD Realtek: `01-dikey.mp4`, `02-yatay.mp4` 2:37), 4 kayıt, 82 bölüm; 68 bölüm
kontrol bekliyor. Paylaşılan `2026_TEST.udf` / `2026_TEST.docx` incelendi.

**Doğru çıkanlar:** SHA-256'lar edinme günlüğüyle birebir; 0 bayt dosya
"Bilinmiyor/0 B" + çözümleme hatası (uydurma bölüm yok); atanmamış bölümler
`— / Belirtilmemiş / Kontrol bekliyor`; UDF'te ZWSP yalnız SHA-256'da.

### Bulunan ve düzeltilen hatalar

1. **Numara boşluğu (5 → 7).** `reportNumberMap` "bölüm AÇIK mı" ölçütü
   kullanıyordu; `answers` açık ama soru yokken `reportBlockRenders` false →
   numara verilip blok atlanıyordu. Artık numara **çizilen** bölüme göre.
2. **Konuşmacı tablosu eksik bölüm gösteriyordu.** 68 bölümün 55'i atanmamış;
   tablo yalnız atanmış 13'ü listeliyordu. `materialSpeakerRows` artık
   **"— Konuşmacı belirtilmedi"** satırı ekler; `materialSpeakerLine` da yazar.
3. **S kodları kayıt başına ama tabloda kayıt yoktu.** Konuşmacı ve süre
   tablolarına **KAYIT** sütunu (schema `material` anahtarı).
4. **Bilinmeyen süre "00:00:00" yazılıyordu** → "Bilinmiyor"; tarayıcının
   İngilizce çözme hatası `decodeErrorText()` ile Türkçeleşti.
5. **Ek:** TOC'ta numarasız satırlar **"–"** (alt blok); özet etiketi
   "Konuşmacı etiketi (kayıt içi)" + "Konuşmacı atanmamış bölüm"; hazırlıkta
   "Gerekçeli sonuç yazılmadı" (expert); `.docx/.pdf` kökte ignore.

### DEĞİŞMEZ KURALLAR (yeni)

1. **Numara = çizilecek blok.** `reportSectionOn` (kullanıcı tercihi) ile
   `reportBlockRenders` (gerçek çıktı) ayrıdır; numaralandırma İKİNCİSİNİ
   kullanmalı. Aksi hâlde numarada boşluk oluşur (v2.283'te canlıda ölçüldü).
2. **Konuşmacı tablosu tüm bölümleri kapsar.** Yalnız atanmışları listelemek
   "kayıtta 13 bölüm var" izlenimi verir; atanmamış satırı zorunludur.
3. **S kodu kayıt başınadır** → tabloda KAYIT sütunu olmadan aynı S1'ler
   ayırt edilemez.
4. **Ölçülemeyen süre "00:00:00" değildir**; "Bilinmiyor" yazılır.
5. Tabloya sütun eklerken üç çıktının genişliklerini + `REPORT_COLUMN_TABLES`
   anahtarını birlikte güncelleyin (`birim [125]` indeks kaymasını yakalar).

### Bilinen açık konular

- **Kişi birleştirme yeri:** "Dosyalar arası kişiler (K)" şu an Analiz sekmesinde.
  Kullanıcı "orada kaybolmuş gibi" dedi; **dosya (case) düzeyinde** bir yere
  (ör. Dosya bilgileri çekmecesi veya ayrı bir "Kişiler" paneli) taşınması
  değerlendirilecek (karar bekliyor).
- **Numaralandırma politikası:** ana bölümler 1..N, alt bloklar "–" olarak
  işaretli. Kullanıcı isterse **her başlık** (13 bölüm) numaralanabilir; bu,
  56.12'nin 9 bölüm + alt blok yapısından ayrılmak olur (karar bekliyor).

## YENİ OTURUM DEVRİ (v2.284) — Numaralandırma seçenekli; Git onarıldı

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.284** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1929 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | **Serbest tasarım planı** (`docs/RAPOR_SERBEST_TASARIM.md`): v2.285 başlık düzenleme + numara biçimi, v2.286 profil düğmelerinin kaldırılması, v2.287 serbest blok, v2.288 kullanıcı profilleri. Gömme kümeleme (atamasız) ve Kişiler panelinin taşınması. |

### Ölçülen kullanıcı şikâyetleri ve karşılıkları

1. **"Her şeyi kapattım, yalnız kökeni açtım → numara yok."** Kök: numara
   yalnız `REPORT_MAIN_KEYS`'e veriliyordu (v2.259 kararı). **Çözüm:** numaralar
   kullanıcıya bırakıldı (`report.numbering`); kapatınca hiç numara yok.
2. **"Git düğmeleri işe yaramıyor."** Kök: panel "Kayıt bilgileri"/"Analiz"
   sekmesinde; `activeSeg` yazılıyor ama sekme değişmiyordu. **Çözüm:**
   `goToSegment()` → Deşifre sekmesine geçer, bölümü açar, satıra odaklanır.
3. **"Konuşmacılar ve süreleri ayrı seçilemiyor."** Aslında *Rapor alanları*nda
   üç ayrı grup var (8/6/6); **bölüm** düzeyinde hâlâ birlikte. İstenirse
   "Konuşmacı süreleri" ayrı bölüm yapılabilir (plan).
4. **"Kayıt altında tablo nedir?"** Kısa etiketler eklendi; uzun açıklama bölüm
   başında bir kez (üç çıktıda aynı).

### DEĞİŞMEZ KURALLAR

1. **Numara bir TERCİHTİR**, zorunlu şablon değil: `reportNumbering(c)` tek
   kaynak; başlık ve TOC aynı kipten türetilir.
2. **"Git" tek kapıdan:** `goToSegment` (sekme + aktif bölüm + odak). Yeni bir
   "işarete git" düğmesi eklerken bunu kullanın; yoksa kullanıcı panelde kalır.
3. **Kayıt altı etiketler üç çıktıda aynı** (`recordSpeakersHeading`,
   `recordTranscriptHeading`); açıklama her dosyada YİNELENMEZ.
4. Serbest tasarım ilkeleri: rapor bilirkişi adına, üç çıktı aynı metin,
   ölçülmeyen değer yazılmaz, kanıtta zaman+metin zorunlu.

## YENİ OTURUM DEVRİ (2026-11-25, v2.284 sonrası) — SIRADAKİ İŞ: v2.285

Kullanıcı planı **onayladı** ve oturumu kapattı: *"Yukarıda söylediklerini
yapalım; diğer oturumda devam edeceğiz."* Sıra: **v2.285 → v2.288**, sonra
konuşmacı kümeleme ve Kişiler panelinin taşınması.

### Durum

| | |
|---|---|
| Sürüm | **v2.284** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1929 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` = **7519eed** |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.284** |
| Plan | [`docs/RAPOR_SERBEST_TASARIM.md`](docs/RAPOR_SERBEST_TASARIM.md) (onaylandı) |

### v2.285 — Başlık düzenleme + numara biçimi (İLK İŞ)

1. **Başlık düzenleme:** `reportSectionTitle(key)` → `reportSectionTitle(c, key)`;
   `c.report.titles[key]` varsa onu döndür. `emptyReport.titles = {}` +
   `normalizeCase` yalnız `REPORT_SECTION_KEYS` anahtarlarını korusun.
   Üç çıktı `H(k) = reportHeadingText(c, k, map)` kullandığı için başlık tek
   yerden değişir (HTML ~13338, DOCX ~13745, UDF ~14298).
2. **Numara biçimi:** `REPORT_NUMBERING = ['auto','none','letters']`;
   `auto` → `1.` · `letters` → `A.` · `none` → numarasız. `reportNumbering`,
   `reportHeadingText`, `reportTocEntries` birlikte.
3. **Panel:** iskelet satırına **kalem** (`data-report-title`) + küçük giriş;
   Enter uygula / Esc vazgeç; `persist()` + `renderReport()`.
4. **Konuşmacı süreleri ayrı bölüm:** `REPORT_SECTION_DEFS` + `REPORT_BODY_ORDER`
   (`speakers` sonrası), `speakers` renderer'ından süre tablosunu çıkar.
5. **Sütun başlığı değiştirme:** `case.report.columns.labels` yerine ayrı
   `case.report.labels[table][key]`; panelde küçük giriş.
6. **Testler:** `birim [127]` + `rapor` (üç çıktıda başlık/süre bölümü) +
   `surum` kimlik kontrolü (`reportSectionTitle` imzası **davranışa** çevrilsin;
   v2.103/v2.111 dersi: imza testi kırılgan).

### v2.286 — Profil düğmelerinin kaldırılması

- "Yalın / Standart / Tam 56.12" düğmeleri kaldırılır. `REPORT_PRESET_DEFS`
  silinmez (testler/geri uyum), yalnız **panel düğmeleri** kaldırılır; istenirse
  "Şablonlar" altında saklanır ve **varsayılan uygulanmaz**.
- Varsayılan bölüm kümesi **olduğu gibi** kalır (mevcut rapor değişmez).

### v2.287 — Serbest blok

- "＋ Bölüm ekle": `{kind:'free', title, text}`. `REPORT_BODY_ORDER`'a dinamik
  anahtar (`free:<id>`) eklenir; `reportBodyOrder` sıralamayı korur; üç çıktı
  aynı bloğu basar. Boş başlık/metin → blok çizilmez; "—" uydurulmaz.

### v2.288 — Kullanıcı profilleri

- "Bu düzeni profil olarak kaydet" (`case.report.userProfiles[]`),
  "Profili uygula" (yalnız kullanıcı tanımlı). Yerleşik 56.12 profili yok.

### Konuşmacı işleri (v2.289 önerisi)

- **Kümeleme (atamasız):** yeni saf fonksiyonlar
  `embeddingClusters(points, {threshold:0.88, minSize:2})` → `[{key:'A',
  count, first, last}]`; `m.voiceEmbed.clusters` **özet** olarak saklanır
  (vektör yok). Liste satırında **≈A** rozeti; panelde grup listesi + **Git**
  (`goToSegment`). **"Grubu S1'e ata"** onay ister, `snapshotForUndo` +
  `logEvent`, geri alınır. Otomatik atama **yok**.
- **Kişiler (K) taşıma:** "Dosyalar arası kişiler" paneli **Dosya bilgileri
  çekmecesine** (case düzeyi). Per-kayıt "Aynı kişi" seçici yerinde kalır.
  Uygulama: `personBlock` HTML'i `caseDrawer` içindeki yeni konağa taşınır;
  `renderCasePersons()` + kova değişiminde `refreshCasePersons()`.

### DEĞİŞMEZ (bu turda doğdu)

1. **Numara/başlık bir TERCİHTİR**, şablon zorunlu değil; tek kaynak
   `reportHeadingText` + `reportSectionTitle(c,key)`.
2. **"Git" tek kapı:** `goToSegment` (sekme + bölüm + odak). Yeni işaret
   düğmeleri bunu kullanmalı.
3. **Kayıt altı etiketler üç çıktıda aynı**; uzun açıklama her dosyada yinelenmez.
4. Üç çıktı aynı metni üretmeli; her adımda `bash tools/test.sh` yeşil olmadan
   push yok.
5. Kökteki `.udf/.docx/.pdf` çıktıları **ignore**; rapor dosyaları depoya girmez.

## YENİ OTURUM DEVRİ (v2.285) — Başlık düzenleme + numara biçimi

### Durum (2026-11-24)

| | |
|---|---|
| Sürüm | **v2.285** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1954 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` (push edildi) |
| Açık konu | v2.286 profillerin kaldırılması; v2.287 serbest blok; v2.288 kullanıcı profilleri; konuşmacı kümeleme; Kişiler panelinin taşınması |

### Ne yapıldı

- **Bölüm başlığı düzenleme:** `case.report.titles` + `normalizeReportTitles`
  (yalnız bilinen bölüm, boş atılır, 160 karakter). İskelette her satırda
  **kalem (✎)**; Enter uygular, Esc vazgeçer. Başlık üç çıktıda aynı
  (`reportHeadingText` tek kaynak).
- **Numara biçimi:** `REPORT_NUMBERING = ['auto','letters','none']`;
  `#reportNumberingToggle` artık **select** (1,2,3… / A,B,C… / numarasız).
  İçindekiler, alt başlıklar ve kayıt ön ekleri aynı biçimi izler.
- **Düzeltilen sessiz hata:** numarasız kipte h3 numarasızken h4 hâlâ
  **5.1 / 5.1.1** yazıyordu; s5 kapalıyken de numara uyduruyordu. Artık
  `reportSubHeadings` kipi ve "çiziliyor mu" durumunu izler.

### Ölçüm (gerçek Chromium + CDP, 1440/1100/900/600)

| Ölçüm | Sonuç |
|---|---|
| Seçici | `SELECT:auto:3` · 89×24 px, kırpma yok |
| Harf kipi | h3 `A.`/`B.`/`C.`, TOC `A.`, h4 `E.1.` |
| Numarasız | h3 numarasız, h4 `Ses kayıtlarının çözümlenmesi`, `5.1.` sayısı **0** |
| Kalem | 31 satır · tıkla → odak + mevcut başlık seçili |
| Başlık kaydı | önizleme + iskelet + yenileme sonrası korundu |
| Kırpma / yatay taşma / JS hatası | **0 / 0 / 0** |

### DEĞİŞMEZ KURALLAR

1. **Tek kaynak:** `reportSectionTitle(c, key)`, `reportNumbering(c)`,
   `reportHeadingText`, `reportSubHeadings` (+`recordPrefix(i)`).
   Başlığı/numarayı başka yerde yeniden biçimlendirmeyin.
2. **Alt başlık numarası türetilir:** kip + bölüm çiziliyor mu. `n5` gibi sabit
   varsayım kullanmayın (v2.285'te hata buydu).
3. **Başlık yalnız `case.report.titles`.** Bilinmeyen anahtar ve boş değer
   normalize'da atılır; başlık metni uydurulmaz.
4. **İskelet düzenleme oturumluktur** (`reportTitleEditKey`), kayda yazılmaz.
   Enter `change` → kaydet; Esc iptal. Yeniden çizimden sonra odak geri verilir.
5. **`#reportNumberingToggle` bir SELECT'tir.** Checkbox'a döndürmeyin: üç kip
   (auto/letters/none) tek boolean ile anlatılamaz.
6. **Yeni numara kipi eklerken** `REPORT_NUMBERING`, `reportNumberToken`,
   `reportSubHeadings`, TOC ve üç çıktı testleri birlikte güncellenir.

### Sıradaki iş (plan: `docs/RAPOR_SERBEST_TASARIM.md`)

1. **v2.286 — Profil düğmeleri kaldırılır** (tanımlar geri uyum için kalır).
2. **v2.287 — Serbest blok** (`free:` anahtarı; `normalizeReportLayout` ve
   `normalizeReportTitles` dinamik anahtarı kabul etmeli).
3. **v2.288 — Kullanıcı profilleri.**
4. **Konuşmacı kümeleme** (atamasız, `≈A` rozeti) + **Kişiler (K)** panelinin
   dosya düzeyine taşınması.

## YENİ OTURUM DEVRİ (v2.286) — Hazır profil düğmeleri kaldırıldı

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.286** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1960 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` (doğrudan push) |
| Açık konu | v2.287 serbest blok; v2.288 kullanıcı profilleri; konuşmacı kümeleme; Kişiler panelinin taşınması |

### Ne yapıldı

- Rapor iskeletindeki **Yalın / Standart / Tümü / 56.12 Ana Şablon** düğmeleri
  kaldırıldı (`rsec-presets` bloğu + `[data-report-preset]` işleyicisi +
  `.rsec-presets` CSS'i).
- `REPORT_PRESET_DEFS` ve `reportPresetLayout` **şemada kalır** (geri uyum,
  testler ve kayıtlı düzenler için); **UI'den çağrılmaz**.
- Varsayılan bölüm kümesi **değişmedi**: `reportSectionsForPreset('standard')`
  = `emptyReportSections()`.

### DEĞİŞMEZ KURALLAR

1. **Profil tanımları silinmez.** Geri uyum ve test için şemada durur; yalnız
   ekranda düğme yoktur.
2. **Varsayılan bölüm kümesi = `emptyReportSections()`.** Yeni dosya açılışında
   profil otomatik uygulanmaz; kullanıcı istediğini kapatır/sıralar.
3. **Kayıtlı `case.report.sections` / `layout` korunur.** Açılışta hiçbir profil
   yazılmaz (v2.286'da düğmeler kaldırıldı; sessiz sıra değişimi yok).
4. Yeni bir "hazır şablon" özelliği eklenirse **kullanıcı açıkça seçmedikçe**
   uygulanmaz; varsayılan olarak dayatılmaz.
5. Testler UI'nin YOKLUĞUNU denetler: `data-report-preset` / `rsec-presets`
   app.js ve CSS'te bulunmamalı (`birim [128]`, `tasarim [2bq]`).

### Sıradaki iş

1. **v2.287 — Serbest blok:** “＋ Bölüm ekle” (başlık + metin); `free:<id>`
   dinamik anahtarı. `normalizeReportLayout` ve `normalizeReportTitles`
   bilinmeyen anahtarı **düşürmemeli**; üç çıktı aynı bloğu basmalı.
2. **v2.288 — Kullanıcı profilleri:** yalnız kullanıcı tanımlı; kaydet/uygula.
3. **Konuşmacı kümeleme** (atamasız, `≈A` rozeti) + **Kişiler (K)** panelinin
   dosya düzeyine taşınması.

## YENİ OTURUM DEVRİ (v2.287) — Serbest rapor bölümü

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.287** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1977 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` (doğrudan push) |
| Açık konu | v2.288 kullanıcı profilleri; konuşmacı kümeleme; Kişiler panelinin taşınması |

### Ne yapıldı

- **“＋ Bölüm ekle”** (rapor iskeleti gövdesi): başlık + metin. Blok açılır/kapanır,
  ↑↓ ile sıralanır, üç çıktıya girer; İÇİNDEKİLER’de **“– Başlık”** (numarasız).
- Veri: `case.report.blocks[] = { id, title, text, on }`; sıra `layout.order`
  içinde **`free:<id>`**. Boş blok (başlık veya metin yok) **rapora girmez**.
- Silme: onay ister, `snapshotForUndo` alınır, **Ctrl+Z** ile geri gelir.
- Revizyon `blocks` taşır; birleştirme id ile ekler, farklı içerikte
  **`report-block` çakışması** bildirir (sessiz ezme yok).

### DEĞİŞMEZ KURALLAR

1. **Serbest anahtar `free:<id>`.** Blok kimliği `normalizeReportBlocks` ile
   doğrulanır; yetim anahtar `ensureFreeBlockOrder` ile düşer, sırası olmayan
   blok `s6` öncesine girer. Yeni blok eklerken bu iki fonksiyonu birlikte
   kullanın.
2. **Boş blok çizilmez.** `reportBlockRenders` **başlık VE metin** ister;
   “—” uydurulmaz. Arayüzde boş blok “Yeni bölüm” görünür, rapora girmez.
3. **Üç çıktı aynı kapıdan:** `reportBodyOrder` serbest anahtarları kapsar;
   HTML/DOCX/UDF döngüleri `body[key]`/`blocks[key]` yoksa serbest üreticiye
   düşer. Yeni bir çıktı yolu eklerken aynı fallback'i kullanın.
4. **Kaydetme:** serbest blokta **Kaydet** düğmesi veya başlık alanında
   **Enter**; metin alanında Enter **satır atlar**. **Esc** vazgeçer; boş blok
   iptalinde yetim kayıt bırakılmaz.
5. **Revizyon ve birleştirme:** `reportSnapshot.blocks` taşınır; merge farklı
   içerikte çakışma bildirir, ezmez. Kanıt (ses/deşifre) etkilenmez.

### Sıradaki iş

1. **v2.288 — Kullanıcı profilleri:** yalnız kullanıcı tanımlı; “düzeni profil
   olarak kaydet” + “profili uygula”.
2. **Konuşmacı kümeleme** (atamasız, `≈A` rozeti) + **Kişiler (K)** panelinin
   dosya düzeyine taşınması.
3. İsteğe bağlı: `speakerDurations` ayrı bölüm, sütun başlığı düzenleme,
   sürükle-bırak sıralama.

## YENİ OTURUM DEVRİ (v2.288) — Kullanıcı rapor profilleri

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.288** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **1992 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` (doğrudan push) |
| Açık konu | Konuşmacı kümeleme; Kişiler (K) panelinin taşınması; isteğe bağlı küçük işler |

### Ne yapıldı

- Rapor iskeletinde **Profiller** satırı: seç · **Uygula** · **Sil** ·
  **＋ Bu düzeni kaydet**. Ad, küçük bir diyalogla sorulur (`#profileDialog`).
- Profil yalnız **düzeni** taşır: bölüm görünürlüğü, sıra (`order`), ek sırası/
  görünürlüğü, başlıklar, numara biçimi, tablo alanları. **Kanıt ve serbest blok
  metni girmez.**
- Uygulama **onay ister** ve `snapshotForUndo` alır (Ctrl+Z). Yerleşik/otomatik
  profil yoktur.

### DEĞİŞMEZ KURALLAR

1. **Profil = düzen, içerik değil.** `blocks` (serbest blok metni), ses,
  deşifre, SHA-256 profile **konmaz**. Yeni bir profil alanı eklerken bu sınırı koru.
2. **Ad zorunlu, kimlik tekil, en çok 20 profil.** `normalizeReportProfiles`
  bilinmeyen/boş kaydı atar; aynı adla kaydetmek **günceller** (kopya üretmez).
3. **Uygulama tek kapıdan:** `applyReportProfile(id)` — onay + snapshot +
  `normalizeReportSections`/`normalizeReportLayout`/`normalizeReportTitles`/
  `normalizeReportColumns`. Serbest blok anahtarları hedef dosyanın bloklarına
  göre `ensureFreeBlockOrder` ile süzülür.
4. **Birleştirme sessiz ezmez:** profiller id ile eklenir; aynı kimlikte farklı
  düzen `report-profile` çakışması olarak bildirilir.
5. **Arayüz kimlikleri:** `#profileDialog`, `#profileName` `surum-testi` [9] ile
  korunur. `reportProfileSel` oturumluktur, kayda yazılmaz.
6. Profil **otomatik uygulanmaz**; dosya açılışında hiçbir profil yazılmaz.

### Sıradaki iş

1. **Konuşmacı kümeleme** (atamasız): `≈A` rozeti, grup listesi, “Grubu S1’e
   ata” onaylı/geri alınabilir; otomatik atama YOK.
2. **Kişiler (K) panelinin** Analiz sekmesinden **Dosya bilgileri** düzeyine
   taşınması.
3. İsteğe bağlı: `speakerDurations` ayrı bölüm, sütun başlığı düzenleme,
   sürükle-bırak sıralama.

## YENİ OTURUM DEVRİ (v2.289) — Tüm bölümler numaralı + veri yok açıklaması

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.289** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2000 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` (doğrudan push) |
| Açık konu | Konuşmacı kümeleme; Kişiler (K) panelinin taşınması |

### Kullanıcı sorusu ve kök neden

*"Tüm gövde alanlarında bazı bölümlere bastığımda otomatik A gibi şeyler
başlıklarında oluşmuyor… WER ölçümüne basıyorum madde vermiyor; EK’e basıyorum
raporda A diyor."*

**Kök neden:** v2.259/v2.283 kuralı **yalnız `REPORT_MAIN_KEYS`** (s1–s7,
answers, limits, integrity) numaralıyordu; köken/konuşmacı/WER/seviye gibi
bloklar numarasız ve TOC’ta “–” idi. Kullanıcı bunu **çelişki** olarak gördü.
Ayrıca verisi olmayan bölüm (WER) sessizce hiç çizilmiyordu.

### Ne yapıldı

- **Numara artık çizilen HER gövde bölümüne** verilir:
  `reportNumberMap` → `mainSectionNumbers(reportBodyOrder, renders, reportBodyOrder)`.
  `REPORT_MAIN_KEYS` yalnız **sayfa sonu** için kullanılır; numara koşulu değildir.
- `reportHeadingText`/`reportUiLabel` main-key koşulu kaldırıldı; TOC’taki
  `–` alt blok işareti kaldırıldı. Serbest bloklar da numara alır.
- **Veri yok sessiz değil:** `reportBlockEmptyReason(c,key)` + iskelette
  `.rsec-nodata` rozeti (“veri yok”, neden `title`’da) + `setReportSection`
  açma toast’ı. Rapor boş bölümü **basmaz**; uydurma “—” yok.
- WER nedeni: “WER için referans metin ve model çıktısı gerekir.”

### DEĞİŞMEZ KURALLAR

1. **Numara = çizilen bölüm.** Kapalı/verisiz bölüm numara tüketmez; numarada
   boşluk olmaz. `REPORT_MAIN_KEYS`’i numara listesi sanıp geri dönmeyin.
2. **TOC = gövde.** TOC “–” işareti taşımaz; her satır başlığın numarasını taşır
   (numarasız modda hiç numara yok).
3. **Veri yoksa neden söylenir.** Yeni bir koşullu bölüm eklerken
   `reportBlockEmptyReason`’a da nedeni yazın; rozet + toast otomatik gelir.
4. **Ölçülmeyen değer yazılmaz.** Boş bölüm rapora basılmaz; “veri yok” rozeti
   yalnız iskelettedir. WER referans/model çıktısı olmadan ölçülmez.
5. Testler: `birim [82]/[125]/[127]/[129]/[131]`, `rapor 22/37/38`.

### Sıradaki iş

1. **Konuşmacı kümeleme** (atamasız, `≈A` rozeti) + onaylı grup atama.
2. **Kişiler (K)** panelinin dosya düzeyine taşınması.
3. İsteğe bağlı: `speakerDurations` ayrı bölüm, sütun başlığı düzenleme,
   sürükle-bırak sıralama.

## YENİ OTURUM DEVRİ (v2.290) — Tek EKLER bölümü

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.290** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2009 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` (doğrudan push) |
| Açık konu | **v2.291 — bölümü EK olarak taşıma** (kullanıcı sorusu); konuşmacı kümeleme; Kişiler paneli |

### Kullanıcı sorusu

*"İki tane EKLER alanı var; ‘Sadece Ekler’ kısmında bir şey yok. Hatalı mı, amacı
ne? … Kayıt bazında bulguları EK olarak göstermek istesem olur mu?"*

**Kök neden:** `s7` yalnız **ek başlıklarını listeleyen** bölümdü ve varsayılan
açıktı; asıl ek içerikleri (`annex`) varsayılan **kapalı** olduğu için liste boş
kalıyordu. İki “EKLER” yanıltıcıydı.

### Ne yapıldı

- `s7` → başlık **“EK LİSTESİ”**, varsayılan **kapalı**.
- `annex` → başlık **“EKLER”**, varsayılan **açık**; `annexIntro` eklendi.
- Göç: `normalizeCase` içinde `annex` tanımsız + `s7` tanımlıysa
  `annex = s7 !== false`, `s7 = false`.
- Varsayılan raporda **tek EKLER** ve EK-1… içerikleri görünür; isteğe bağlı
  “Ek listesi (başlıklar)” açılabilir.

### DEĞİŞMEZ KURALLAR

1. **Tek EKLER bölümü.** Yeni bir “ek listesi” eklerken asıl EKLER’i kapatıp
   boş liste bırakmayın; `annex` açık olmalı.
2. **Göç korunur:** eski `s7` tercihi `annex`e taşınır; boş liste kapanır.
3. **s7 yalnız listedir:** içerik üretmez; `reportAttachmentLines` ile başlıkları
   basar. Ek gövdesi `reportAnnexBlocks` + `annex` renderer’ındadır.
4. Testler: `birim [132]`, `rapor 39`.

### Sıradaki iş — v2.291 (plan)

**Bölümü EK olarak taşıma:** `case.report.annexPlacement = { s5: true }` gibi
bir yerleşim alanı; taşınan bölüm gövde sırasından çıkar, EKLER altında
`EK-N. <bölüm başlığı>` olarak basılır; içerik üreticisi aynı kalır (kopya yok),
alt başlıklar `EK-N.1`, üç çıktı aynı, onay + Ctrl+Z. Kanıt etkilenmez.
Ayrıntı: `docs/RAPOR_SERBEST_TASARIM.md` §v2.291.

## YENİ OTURUM DEVRİ (v2.291) — Bölümü EKLER altına taşıma

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.291** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2017 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` (doğrudan push) |
| Açık konu | Konuşmacı kümeleme; Kişiler (K) panelinin taşınması |

### Ne yapıldı

- Her gövde bölümünün yanında **EK** düğmesi: bölüm gövdeden çıkar, EKLER
  altında **EK-N. <başlık>** olarak basılır. **G** gövdeye geri alır.
- Örnek: s5 → `EK-7. KAYIT BAZINDA BULGULAR VE TRANSKRİPT`, alt başlık
  `EK-7.1`, kayıtlar `EK-7.1.1`…
- İçerik aynı üreticiden; üç çıktı aynı. Ctrl+Z ile geri alınır; kanıt etkilenmez.
- Revizyon (`reportSnapshot.annexPlacement`) ve birleştirme taşır.

### DEĞİŞMEZ KURALLAR

1. **Yalnız gövde bölümleri taşınır.** `isAnnexPlaceable` EKLER (`annex`) ve
   EK LİSTESİ (`s7`) için false; kendini taşımaz.
2. **Tek kaynak:** `normalizeAnnexPlacement` + `reportMovedSections` +
   `reportAnnexList`/`reportAnnexBlocks(kind:'moved')`. Ayrı kopya sıra/numara
   üretmeyin.
3. **Alt başlık `EK-N.1`:** `movedAnnexNo`; UDF başlığı `movedAnnexHeading` ile
   **tek kez** yazılır (textParts/offset bütünlüğü). UDF’te başlığı el’den
   silmeye çalışmayın.
4. **Kanıt etkilenmez:** taşıma yalnız yerleşimdir; ses/deşifre/silme yok.
5. Testler: `birim [133]`, `rapor 40`.

### Sıradaki iş

1. **Konuşmacı kümeleme** (atamasız, `≈A` rozeti) + onaylı grup atama.
2. **Kişiler (K)** panelinin dosya düzeyine taşınması.


## YENİ OTURUM DEVRİ (v2.292) — Benzer ses grupları

| | |
|---|---|
| Sürüm | **v2.292** |
| Testler | **2027 birim + 522 şema** yeşil |
| Açık konu | Kişiler (K) panelinin taşınması |

- `embeddingClusters` (saf) atanmamış bölümleri `VOICE_EMBED_SAME` eşiğiyle gruplar.
- `m.voiceEmbed.clusters` özet (vektör yok); **Git** / **Ata**; atama onay + snapshot + `speaker-cluster-assign` günlüğü.
- **Otomatik atama yok**; kimlik tespiti değildir. Test: `birim [134]`.
- Sıradaki: Kişiler (K) panelinin dosya düzeyine taşınması.


## YENİ OTURUM DEVRİ (v2.293) — Kişiler paneli dosya çekmecesinde

| | |
|---|---|
| Sürüm | **v2.293** |
| Testler | **2033 birim + 522 şema** yeşil |
| Açık konu | Yok (planlanan rapor/kişi işleri kapandı) |

- **Dosyalar arası kişiler (K)** Analiz’den **Dosya bilgileri** çekmecesine taşındı.
- `casePersonsPanelHtml` + `renderCasePersons`; ekle/düzenle/sil çekmecede.
- Silme onaylı; bağlı konuşmacı/ses/metin korunur. Kayıt kartındaki “Aynı kişi” yerinde.
- Test: `birim [135]`, `tasarim` kişi paneli.

## YENİ OTURUM DEVRİ (v2.294–v2.299) — Rapor iskeleti: ağaç, sürükle-bırak, ↑↓

Bu not, v2.293'ten sonra gelen **rapor iskeleti yapısal** sürümlerini özetler
(AGENTS.md'de eksikti). Hepsi yalnız **yerleşim/sıra** ile ilgilidir; kanıt
(ses/deşifre/silme) **değişmez**.

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.299** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2076 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` (commit + push kullanıcı onayına bağlı) |
| Canlı | gerçek Chromium: `#appVersion` = **v2.299**, JS modül hatası 0 |

### Bu aralıkta yapılanlar

| Sürüm | Konu |
|---|---|
| v2.294 | Konuşmacı süreleri ayrı bölüm (skeleton'da aç/kapa + sırala) |
| v2.295 | Tablo sütun başlığı düzenleme (`case.report.labels`; üç çıktı ortak) |
| v2.296 | Sürükle-bırak sıralama (`moveKeyTo`; ↑↓ korunur; filtre açıkken kapalı) |
| v2.297 | Sınırsız alt bölüm ağacı (`layout.parent` + DFS; 1.1 / A.1) |
| v2.298 | EKLER alt grup olabilir (iç EKLER sayfa sonu zorlamaz) |
| v2.299 | **↑↓ alt ağacıyla taşır** (bu oturum; aşağıda) |

### v2.299 — ölçülen hata ve düzeltme

v2.297 ağacında **↑↓ hâlâ düz `moveInList`** kullanıyordu (tek anahtar). Ebeveyni
çocuğunun altına indirince `normalizeReportLayout` sırayı **yeniden DFS'e**
çevirip değişikliği **sessizce geri alıyordu**:

```
order=s1,s2,s4,s3 · parent={s2:s1,s4:s1}
↓ s1 (ebeveyn)  → DEĞİŞMEDİ   ↑ s3 (kök, düz komşusu çocuk) → DEĞİŞMEDİ
↓ s2 (alt bölüm) → çalışıyordu (komşusu kardeş)
```

Düzeltme: `report-model.js` → **`moveTreeBlock(order, parent, key, dir)`** (saf).
Düğümü **alt ağacıyla** aynı ebeveynli komşusuyla değiştirir; çıktı **geçerli
DFS** olduğu için normalize onu artık geri almaz. `moveReportSection` bunu
kullanır; aynı düzeyde komşu yoksa **toast** ile söyler (sessiz no-op yok).
Ölü `moveReportSectionTo` (tek anahtar) kaldırıldı. Test `birim [140]`.

### DEĞİŞMEZ KURALLAR (bu aralıkta doğdu)

1. **Sıra/numara/TOC tek kaynak:** `reportBodyOrder` (layout.order, DFS),
   `reportNumberLabelMap` (ağaç numarası), `reportHeadingText`. Üç çıktı aynı
   döngüden geçer.
2. **Numara = ÇİZİLEN blok** (v2.289): kapalı/verisiz bölüm numara tüketmez.
3. **↑↓ ve sürükleme AYNI ağaç kuralı:** düğüm **alt ağacıyla** taşınır. Düz
   `moveInList`'i `layout.order` üzerinde kullanmayın — normalize DFS'i geri
   kurar (v2.299 hatası). Yeni bir taşıma yolu eklerken `moveTreeBlock` /
   `moveSectionRelative` kullanın.
4. **Sessiz no-op yasak:** taşınamıyorsa nedenini söyle (toast).
5. **Sürükleme tek yol değil:** ↑↓ erişilebilirlik için korunur (depo kuralı).
6. **`layout.parent` döngü engelli** (`normalizeReportLayout`); derinlik sınırsız.

### Sıradaki iş (adaylar)

1. **Rapora "video kaydından yalnız ses" notu** gerçek mp4 ile uçtan uca deneme
   (v2.250'de metin var; kullanıcı doğrulaması bekliyor).
2. **A3 — gömülü metadata tam dosyada** (8 MB sınırı; `GELECEK_PLANI §11.1`).
3. **C1 — soru ↔ bölüm eşleştirme** (deterministik; `§11.3`).
4. **UDF yatay tablo genişliği** yatay sayfada ölçekleme (v2.245 notu).
5. CSS borcu: nöbetçi eşikleri korunur; küçük ve kanıtlı adımlar.

## YENİ OTURUM DEVRİ (v2.300) — Soru dayanağı: bölümlere bağlama

| | |
|---|---|
| Sürüm | **v2.300** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2091 birim + 522 şema** + rapor (Senaryo 41) + sürüm + tasarım yeşil |
| Açık konu | Deterministik soru↔bölüm **önerisi** (otomatik değil) ileride eklenebilir |

### Ölçülen tutarsızlık

Şema `question.evidence = [{materialId, segmentId}]` alanını tanımlıyor,
`normalizeQuestion` ve `mergeCases` onu taşıyordu; ama **hiçbir arayüz ve hiçbir
rapor okumuyordu** (ölü alan). Rapor/arayüz eski serbest `q.basis` alanını
kullanıyordu. "Soru → bölüm" bağı modelde vardı, kullanımda yoktu.

### Yapılan

- `schema.js` → **`questionEvidenceRows(c, q)`** (saf): `evidence` bağlarını
  `{materialId, segmentId, material, range, text, note}` olarak çözer; kayıt/
  segment yoksa **atlar** (uydurma yok).
- `app.js` → **`questionBasisText(c, q)`** TEK KAYNAK: serbest not
  (`basisNote || basis`) + `kayıt · zaman aralığı · “alıntı”` satırları. Üç cevap
  bloğu (HTML/DOCX/UDF) bunu kullanır; eski `q.basis` okuması kaldırıldı.
- `renderQuestions` soru kartına **Dayanak bölümleri** (çipler + bölüm seçici +
  **＋ Bölüm ekle** / **×** kaldır) eklendi. Serbest metin artık `basisNote`a
  yazılır; eski `basis` kopyası yazınca silinir (tek kaynak).
- Test: `birim` [141] (15) + `rapor` Senaryo 41 (üç çıktı aynı dayanak;
  çözülemeyen bağ yazılmaz).

### DEĞİŞMEZ KURALLAR

1. **Soru dayanağı = `question.evidence`** (yapılandırılmış, segment kimliğiyle).
   Rapor/arayüz `q.basis` (eski serbest alan) OKUMAZ; `basisNote` + `evidence`.
2. **Uydurma dayanak yok:** bağ çözülemezse satır yazılmaz; yalnız serbest not
   (yoksa "Belirtilmemiş") kalır.
3. **Üç çıktı tek kaynak:** `questionBasisText` — kopya metin/biçim yazmayın.
4. **Kimlikle bağ:** `materialId` + `segmentId`; bölüm sırası değişse de bağ
   kopmaz (indekse bağlamayın).
5. Yeni bir "kanıt atfı" eklerken `questionEvidenceRows` desenini kullan
   (dangling → atla, uydurma yok).

### Sıradaki iş (adaylar)

1. **Deterministik soru↔bölüm ÖNERİSİ** (keyword örtüşmesi; otomatik bağlama
   YOK; yalnız "öneri" + tıkla bağla). Bu sürümdeki manuel bağın üstüne.
2. Gömülü metadata tam dosya (8 MB sınırı), UDF yatay tablo genişliği.
3. CSS borcu: nöbetçi eşikleri korunur.

## PLAN GÜNCELLEMESİ (2026-11-25) — ÖNCELİK 1: Konuşmacı ön-atama

Kullanıcı, çözümlemedeki kolaylığın (**tümünü çözümle · dosya bazında yeniden
çözümle · bölümü yeniden çözümle**) konuşmacılarda da olmasını istedi:

> "Aynı işlemi bölümlenen yerlerdeki konuşmacıları da bizim için **önceden
> belirleyebilirse** çok iyi olacak."

Yani deşifre gelince her bölümün konuşmacısı **makul bir başlangıç** olarak dolu
gelsin; uzman yalnız **hatalı olanları** düzeltsin.

**Ayrıntılı plan:** [`docs/KONUSMACI_ON_ATAMA.md`](docs/KONUSMACI_ON_ATAMA.md).
Bu bölüm yalnız **özet**tir; sıra: **v2.301 → v2.302 → v2.303**.

### Dürüst çerçeve (DEĞİŞMEZ)
- **Kimlik tespiti DEĞİLDİR**; **anonim kümeleme** (S1, S2…). "Kim olduğu"
  değil, "hangi bölümler aynı sese benziyor".
- ASR modeli diyarizasyon **yapmaz**; ayrı **gömme modeli** (WavLM-SV q8 ≈ 97 MB,
  v2.279 altyapısı) kullanılır; isteğe bağlı indirme.
- Çıktı **ön-atama/öneri**; **uzman doğrular**. Rapora "diyarizasyon yaptık"
  **yazılmaz**; rapordaki etiketler uzman onaylıdır.
- Kısa bölüm (<1,2 sn) güvenilmez; belirsiz benzerlik **kör atanmaz**, işaretlenir.

### v2.292 "otomatik atama yok" ile ilişki
v2.292 kuralı **sessiz/arka plan** atamayı yasaklar. Bu, kullanıcının **açıkça
tetiklediği**, **onay isteyen**, **geri alınabilir** ve **uzmanın düzelttiği**
bir **ön-atama**dır. Varsayılan **yalnız boş** bölümleri doldurur; onaylı/
doğrulanmış atamayı **ezmez**; `review` (onay) durumunu **değiştirmez**.

### Üç düzey (çözümleme ile aynı)
1. **Dosya:** "Konuşmacıları önceden belirle" → kümele → S1…Sk → boş bölümlere ata.
2. **Bölüm:** "Bu bölümün konuşmacısını tahmin et" → en yakın konuşmacı önerisi.
3. **Yeniden:** "Konuşmacıları yeniden kümele" (yalnız boşlar; "hepsi" ayrı onay).

### Veri modeli (eklemeli; SCHEMA_VERSION artmaz)
- `segment.speakerAuto` (bool), `segment.speakerMatch` (`certain|uncertain`),
  `material.speakerAutoAt`. Vektör **saklanmaz** (yeniden ölçüm).
- Atama yine **tek kapıdan** `setSegmentSpeakerByName` (ad + kimlik).
- Onay + `snapshotForUndo` + `logEvent`; Ctrl+Z.

### Karar bekleyen sorular (uygulamadan önce)
1. Varsayılan yalnız boş mu, "hepsini yeniden" de olsun mu? (öneri: yalnız boş)
2. Onaylı bölümlere dokunsun mu? (öneri: hayır)
3. Rapora dürüst yöntem notu? (öneri: isteğe bağlı, varsayılan kapalı)
4. Eşik mevcut 0,88 mi? (öneri: önce ölç, sonra gerekirse kalibre)
5. Etiket "Konuşmacı 1…" mi, "Kişi 1…" mi? (öneri: Konuşmacı)

### Diğer planlar (not edildi, ÖNCELİK 1'den SONRA)
v2.301'den sonra sırasıyla: deterministik soru↔bölüm **önerisi**, terim/konu
listesi (C2), kanıt tutarlılığı A1+A3, kurumsal kâğıt (B2), UDF yatay tablo
genişliği + video "yalnız ses" gerçek mp4 doğrulaması. Stratejik/karar bekleyen:
Delil D2 (Rust CLI), D3/D4 (imaj), Ollama LLM, Tauri. Ayrıntı:
`docs/GELECEK_PLANI.md`.

## YENİ OTURUM DEVRİ (v2.301) — Konuşmacı otomatik ön-atama (anonim)

| | |
|---|---|
| Sürüm | **v2.301** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2107 birim + 522 şema** + rapor + sürüm + tasarım yeşil |
| Açık konu | v2.302 (bölüm bazında tahmin + yeniden kümele), v2.303 (rapor yöntem notu) |

### Ne yapıldı
- Konuşmacılar panelinde **“Konuşmacıları önceden belirle (otomatik)”** düğmesi:
  **boş** bölümlerin konuşmacısını ses benzerliğine göre **S1, S2…** ön-atar.
- `schema.js` → **`autoSpeakerPlan(points)`** (saf): kümeler + ilk görülme sırasına
  göre kod; `minSize:1` → her bölüm atanır.
- `app.js` → **`autoAssignSpeakers(m)`** + `embedSegmentIndexes` (mevcut gömme
  hattı). Atama **tek kapıdan** `setSegmentSpeakerByName`; `segment.speakerAuto`.
- UI: **“≈ otomatik”** rozeti; elle atama değişince `speakerAuto=false`.
- Test: `birim` [142] (16).

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)
1. **Kimlik tespiti DEĞİLDİR**; anonim kümeleme (S1/S2). Rapora "diyarizasyon
   yaptık" yazılmaz; etiketler uzman onaylı.
2. **Mevcut atamalar KORUNUR**: düğme yalnız **boş** bölümleri doldurur
   (`if (s.speakerId || String(s.speaker||'').trim()) continue`).
3. **Onay (`review`) değişmez**; ön-atama yalnız `speaker`/`speakerId` yazar.
4. **Onay + snapshot + Ctrl+Z + log**; model indirme onayı (v2.279 deseni).
5. `speakerAuto` yalnız "gözden geçir" işaretidir; elle atama temizler.
6. Yeni bir atama yolu eklerken **`setSegmentSpeakerByName`** kullanın.

### Sıradaki iş
- **v2.302:** bölüm bazında tahmin ("bu bölümün konuşmacısı ≈S2") + yeniden
  kümele düğmesi + belirsiz işaretleri (minSize/cohesion).
- **v2.303:** rapor dürüst yöntem notu (varsayılan kapalı) + dosyalar arası K
  kişi eşleştirmesiyle birleştirme.
- Sonra: deterministik soru↔bölüm önerisi, terim listesi, kanıt tutarlılığı.

## YENİ OTURUM DEVRİ (v2.302) — Bölüm bazında konuşmacı tahmini

| | |
|---|---|
| Sürüm | **v2.302** |
| Testler | `bash tools/test.sh` → **2123 birim + 522 şema** + rapor + sürüm + tasarım yeşil |
| Açık konu | v2.303 (rapor yöntem notu + K eşleştirme) |

- Bölüm detayında **≈?** düğmesi: hedef bölüm + her konuşmacıdan ≤3 örnek **tek
  decode** ile gömülür; konuşmacı **centroid**'iyle karşılaştırılır; **öneri**
  (≈ S2 · 0.91) çip olarak gösterilir. **Uygula** demeden atama DEĞİŞMEZ.
- `schema.js` → **`bestSpeakerMatch`** (saf): `certain|uncertain|none`
  (`VOICE_EMBED_SAME=0.88`, `VOICE_EMBED_DIFF=0.72`). `app.js` →
  `suggestSpeakerForSegment`; sonuç `m.__spkSuggest` (**oturumluk**).
- **Uygula** `setSegmentSpeakerByName` + `logEvent('Konuşmacı tahmini uygulandı')`;
  `speakerAuto=false`.
- Test: `birim` [143] (16).

### DEĞİŞMEZ
1. **Kimlik tespiti değil**; en yakın konuşmacı **önerisi**. Belirsiz aralık
   işaretlenir, kör uygulama yok.
2. Öneri **atama yapmaz**; yalnız `__spkSuggest` yazar. Atama **Uygula** ile ve
   **tek kapıdan** (`setSegmentSpeakerByName`).
3. Karşılaştırma için **konuşmacı örneği** gerekir (önce dosya bazında ön-atama
   veya elle atama). Örnek yoksa öneri üretilmez.
4. `__spkSuggest` şemaya YAZILMAZ (oturumluk; `sanitizeForStorage` atar).
5. Üçlü tamam: **dosya** (v2.301 ön-atama) · **bölüm** (v2.302 tahmin) · elle
   düzelt/ekle. Yeniden çalıştırma = dosya düğmesini tekrar bas (boşları doldurur).

### Sıradaki iş
- **v2.303 (opsiyon):** raporda dürüst yöntem notu ("konuşmacı grupları
  benzerlikle ön-atandı, uzman doğruladı"; varsayılan kapalı) + dosyalar arası K
  kişi eşleştirmesiyle birleştirme.
- Sonra: deterministik soru↔bölüm önerisi, terim listesi, kanıt tutarlılığı.

## YENİ OTURUM DEVRİ (v2.303) — Konuşmacı yöntem notu (opt-in)

| | |
|---|---|
| Sürüm | **v2.303** |
| Testler | `bash tools/test.sh` → **2134 birim + 522 şema** + rapor (Senaryo 42) + sürüm + tasarım yeşil |
| Açık konu | Konuşmacı ön-atama üçlüsü KAPANDI (v2.301–v2.303) |

- Rapor araç çubuğunda **“Konuşmacı yöntem notu raporda görünsün”**
  (`#reportSpeakerMethodToggle`, `case.report.speakerMethod`, varsayılan **kapalı**).
  Açıksa **ve** `material.speakerAutoAt` varsa Konuşmacılar bölümüne dürüst yöntem
  cümlesi eklenir; aksi hâlde **yazılmaz** (uydurma beyan yok).
- TEK KAYNAK: `anyMaterialAutoUsed(c)` + `speakerMethodNoteText(c)`; üç çıktı aynı.
- `autoAssignSpeakers` artık `material.speakerAutoAt` yazar (yöntem notu koşulu).
- Revizyona girer (`reportSnapshot.speakerMethod`).

### DEĞİŞMEZ
1. **Uydurma beyan yok:** not yalnız (a) kullanıcı açtıysa **ve** (b) gerçekten
   otomatik ön-atama kullanıldıysa yazılır.
2. Not **kimlik tespiti olmadığını** açıkça söyler; uygulama adı geçmez.
3. Üç çıktı tek fonksiyondan; kopya metin yazmayın.

### DURUM — Konuşmacı arc tamam
- v2.301 dosya bazında ön-atama · v2.302 bölüm bazında tahmin · v2.303 yöntem notu.
- Dosyalar arası **K** kişi eşleştirmesi v2.205'ten beri var; ek iş gerekmedi.

### Sıradaki iş (öneri)
- Deterministik **soru↔bölüm önerisi** (keyword örtüşmesi; otomatik bağlama yok).
- **Terim/konu listesi (C2)** — opt-in.
- Kanıt tutarlılığı A1+A3 (dosya zamanı ↔ gömülü metadata; tam dosya metadata).

## YENİ OTURUM DEVRİ (v2.304) — Konuşmacılar kendi sekmesinde

| | |
|---|---|
| Sürüm | **v2.304** |
| Testler | `bash tools/test.sh` → **2142 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.305 (bölüm↔konuşmacı tablosu), v2.306 (⋮ menü + toplu) |

- Kayıt kartı **4 sekme**: Deşifre · **Konuşmacılar** · **Ölçümler** · Kayıt bilgileri.
  "Analiz" → **"Ölçümler"**; konuşmacı bölümü (`#spk-panel` + perde/tutarlılık)
  `listen` panelinden yeni `speakers` paneline taşındı (id'ler korundu).
- `uiTab` `['record','listen','speakers']` kabul eder; kod çakışması readiness
  artık `uiTab='speakers'` yapar.
- CSS: `#view-audio .card-pane.on[data-pane="speakers"]` kendi içinde kayar.
- **Davranış değişmedi** (yerleşim/ad). Test `birim [145]`.

### Sıradaki iş (v2.305)
- **Bölüm ↔ konuşmacı tablosu** (Konuşmacılar sekmesinde): her bölüm = zaman ·
  metin kısa · konuşmacı seçici · ≈ öneri · durum. Deşifre'ye gitmeden hızlı
  gözden geçir/düzelt.
- Sonra v2.306: satır **⋮** menüsüne "≈ Konuşmacıyı tahmin et" + "Konuşmacı
  ata ▸" ve toplu ön-atama.

## YENİ OTURUM DEVRİ (v2.305) — Bölüm ↔ konuşmacı tablosu

| | |
|---|---|
| Sürüm | **v2.305** |
| Testler | `bash tools/test.sh` → **2151 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.306 (⋮ menü + toplu ön-atama) |

- Konuşmacılar sekmesinde **`renderSpeakerSegmentTable(m)`**: her bölüm = zaman ·
  kısa metin · konuşmacı seçici · ≈ öneri/durum. Filtre `m.__spkSegFilter`
  (Tümü/Atanmamış/Otomatik; oturumluk). 400 satır sınırı + not.
- Satırdaki seçici **mevcut tek kapıyı** kullanır (`data-seg`/`data-key="speaker"`);
  değişiklik Deşifre listesi + detay + tablo birlikte tazelenir.
- Panel çizimi / ön-atama / ≈ tahmin / “Uygula” sonrası tablo tazelenir.
- Test `birim [146]` (9).

### Sıradaki iş (v2.306)
- Satır **⋮** menüsüne “≈ Konuşmacıyı tahmin et” + “Konuşmacı ata ▸ S1/S2…”;
  toplu ön-atama (dosya başına).

## YENİ OTURUM DEVRİ (v2.306) — Satır ⋮ menüsünde konuşmacı işlemleri

| | |
|---|---|
| Sürüm | **v2.306** |
| Testler | `bash tools/test.sh` → **2155 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Konuşmacı UX arc (v2.304–v2.306) KAPANDI |

- Bölüm satırı **⋮** menüsüne: **“≈ Konuşmacıyı tahmin et”** (`data-suggest-speaker`)
  + **Konuşmacı** seçicisi (`.seg-menu-spk` içinde `data-seg`/`data-key="speaker"`).
- Mevcut işleyiciler/tek kapı kullanılır; yeni mantık yok. CSS `.seg-menu-spk`.
- Test `birim [147]` (4).

### ÖLÇÜM DERSİ (tekrar etmesin)
- Bölüm alanı değişiklikleri **`input`** olayıyla işlenir (satır 17987). Gerçek
  `<select>` hem `input` hem `change` üretir; sentetik testte **yalnız `change`**
  göndermek atamayı tetiklemez → yanlış "çalışmıyor" sonucu. Test ederken `input`
  da gönder.

### Konuşmacı UX durumu (kapandı)
- **v2.304:** Konuşmacılar kendi sekmesinde (Analiz→Ölçümler).
- **v2.305:** Bölüm ↔ konuşmacı tablosu (Konuşmacılar sekmesi; filtre).
- **v2.306:** Satır ⋮ menüsünde tahmin + atama (çözümlemeyle aynı yerde).
- Ön-atama (v2.301) · bölüm tahmini (v2.302) · yöntem notu (v2.303) korunur.

### Sıradaki iş (öneri)
- Deterministik **soru↔bölüm önerisi**; terim listesi (C2); kanıt tutarlılığı A1+A3.

## YENİ OTURUM DEVRİ (v2.307) — Soru ↔ bölüm önerisi (deterministik)

| | |
|---|---|
| Sürüm | **v2.307** |
| Testler | `bash tools/test.sh` → **2165 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | A1 zaman çelişkisi, B2 kurumsal kâğıt, terim listesi (C2) |

- `app.js` → **`questionSegmentSuggestions(c, q, opts)`**: mevcut `contentWords`/
  `trLowerCase` ile soru + bölüm sözcüklerini çıkarır; örtüşme ≥ eşik
  (varsayılan 2; tek sözcüklü soruda 1) olan bölümleri sıralar. `q.__suggest`
  **oturumluk**; `evidence` bağlarına dokunmaz (otomatik bağlama YOK).
- UI: Sorular kartında **“İlgili bölümleri öner”** (`data-q-suggest`) + her
  öneride **Ekle** (`data-q-sug-add` → `evidence` + persist). Bağlı bölüm önerilmez.
- Örtüşme sayısı **görünür** (uydurma güven skoru değil). Test `birim [148]` (10).

### DEĞİŞMEZ
1. **Otomatik bağlama yok**; yalnız gözlenebilir kelime örtüşmesi. Karar uzmanın.
2. Bağlı bölüm tekrar önerilmez; öneri `evidence`'e dokunmaz.
3. Türkçe küçültme/stopword tek kaynak: `contentWords` (kopya tokenizer yazmayın).

### Sıradaki iş (öneri sırası)
1. **A1 — kanıt tutarlılığı:** dosya zamanı ↔ gömülü metadata çelişkisi (çip +
   hazırlık maddesi; "beyan ≠ gözlem"). A3 (tam dosya metadata) sonra, ölçümle.
2. **B2 — kurumsal kâğıt biçimi** (başlık bandı/sayfa no/imza; üç çıktı aynı).
3. **C2 — terim/konu listesi** (opt-in; en sona).

## YENİ OTURUM DEVRİ (v2.308) — Kanıt zaman çelişkisi (A1)

| | |
|---|---|
| Sürüm | **v2.308** |
| Testler | `bash tools/test.sh` → **2174 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | A3 (tam dosya metadata), B2 kurumsal kâğıt, C2 terim listesi |

- `schema.js` → **`evidenceTimeConflict(origin)`** (saf): `Date.parse` ile
  `embedded.recordingAt` ve `fileTimes.modifiedAt||createdAt` çözülür; beyan
  dosyadan **>1 gün** sonra ise `{conflict:true, embeddedAt, fileAt}`.
  Çözülemeyen tarihte `{conflict:false}` (uydurma yok).
- UI: `originPanelHtml` → **⚠ Zaman çelişkisi** kutusu; `reportReadiness`
  maddesi `timeConflict` (`READINESS_SEVERITY.timeConflict='advisory'`).
- Test `birim [149]` (9).

### DEĞİŞMEZ
1. **Beyan ≠ gözlem:** gömülü metadata beyandır, dosya zamanı gözlemdir. Uyarı
   **kanıt değil**, dikkat işaretidir; "çelişki yok" kaydın gerçek olduğunu
   KANITLAMAZ.
2. **Uydurma yok:** tarih çözülemezse çelişki bildirilmez; 1 gün tolerans.
3. Yeni bir "dikkat" maddesi eklerken `reportReadiness` + `READINESS_SEVERITY`.

### Sıradaki iş
- **A3:** gömülü metadata tam dosyada (8 MB sınırı) — gerçek büyük dosyada ölç.
- **B2:** kurumsal kâğıt biçimi (başlık bandı/sayfa no/imza; üç çıktı aynı).
- **C2:** terim/konu listesi (opt-in).

## YENİ OTURUM DEVRİ (v2.309) — Gömülü metadata tüm dosyada (A3)

| | |
|---|---|
| Sürüm | **v2.309** |
| Testler | `bash tools/test.sh` → **2180 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | B2 kurumsal kâğıt, C2 terim listesi |

- `app.js` → **`parseId3v1`** (son 128 bayt "TAG" → `releaseAt` yıl) +
  **`parseMp4MetaTail`** (kuyrukta `moov` arar, `mvhd` creation → `recordingAt`) +
  **`readEmbeddedMetaTail`**. `audioEmbedded`: baş 8 MB; kayıt tarihi yoksa ve
  dosya > 8 MB ise kuyruk 4 MB okunur, boş alanlar dolar.
- Test `birim [150]` (6).

### DEĞİŞMEZ
1. Metadata **beyandır**; kanıt değil (v2.217 kuralı).
2. Baş bulamazsa kuyruk okunur; bulunamazsa "yok" denir (uydurma yok).
3. Kuyruk penceresi 4 MB; çok büyük `moov` nadir sınır.

### Sıradaki iş
- **B2:** kurumsal kâğıt biçimi (başlık bandı/sayfa no/imza; üç çıktı aynı).
- **C2:** terim/konu listesi (opt-in).

## YENİ OTURUM DEVRİ (v2.310) — Kurumsal kâğıt biçimi (B2)

| | |
|---|---|
| Sürüm | **v2.310** |
| Testler | `bash tools/test.sh` → **2186 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | C2 terim/konu listesi |

- `assets/reading-layer.css` sonuna `.report-paper` önekli 5 kural: bölüm alt
  kuralı, tablo üst/alt çerçeve, başlık ayırıcı, imza kutusu, alt bilgi çift çizgi.
- **YALNIZ GÖRSEL**: metin/üç çıktı değişmez (`rapor-tutarlilik-testi` yeşil).
  Renkler `--paper-*` token; koyu/sepya tema ve yazdırma etkilenmez.
- Test `birim [151]` (6; ham hex yasağı dahil).

### DEĞİŞMEZ
1. Kâğıt biçimi **metni değiştirmez**; üç çıktı aynı metni üretir.
2. `.report-paper` öneki kullan (app.css'i özgüllükle ezer; CSS borcunu artırmaz).
3. Sayfa numarası motora bağlıdır (tarayıcı/Word/UYAP); uydurulmaz.

### Sıradaki iş
- **C2:** terim/konu listesi (opt-in; `contentWords` altyapısı hazır).

## YENİ OTURUM DEVRİ (v2.311) — Terim/konu listesi (C2)

| | |
|---|---|
| Sürüm | **v2.311** |
| Testler | `bash tools/test.sh` → **2193 birim + 522 şema** + rapor (Senaryo 43) + sürüm + tasarım yeşil |
| Açık konu | Önerilen C2/A1/A3/B2 turu KAPANDI |

- `app.js` → **`frequentTerms(c)`** (contentWords; sıklık, eşitlikte alfabetik,
  en az 2 geçiş, en çok 24) + **`termsText(c)`** (tek kaynak metin).
- `schema.js` → `terms` bölümü (`def:false`), `REPORT_BODY_ORDER`'da `reading`
  sonrası. `reportBlockRenders`/`reportBlockEmptyReason` + kategori `main`.
- Üç çıktı (HTML/DOCX/UDF) `terms:` renderer'ı; aynı metin. Test `birim [152]`,
  `rapor` Senaryo 43.

### DEĞİŞMEZ
1. **Özet/çıkarım değil**: yalnız sözcük sıklığı (gözlenebilir). Uydurma yok.
2. Varsayılan **KAPALI**; veri yoksa bölüm çizilmez (nedeni yazılır).
3. Türkçe küçültme/stopword tek kaynak: `contentWords`.

### Sıradaki (yeni tur — öneri)
- **A3 tamam** (v2.309), **A1** (v2.308), **B2** (v2.310), **C2** (v2.311) bitti.
- Yeni adaylar: sürükle-bırak rapor sırası iyileştirmeleri, ≤900 px IA, CSS borcu
  azaltma, video "yalnız ses" gerçek mp4 uçtan uca, UDF yatay tablo genişliği.

## YENİ OTURUM DEVRİ (v2.311) — UÇTAN UCA OTOMASYON GÖREVİ (öncelik)

> **Yeni oturum ÖNCE bunu okusun.** Bu oturum v2.307–v2.311 turunu ve
> **uçtan uca akış denetimini** kapattı. Kullanıcı talimatı: *"Önerilen iyi;
> bu uçtan uca çalışmaları ve hatta daha fazlasını başlayalım. Yeni oturum
> kendi araştırmalarını yapsın ve bilirkişiye gerekli olabilecek HER ŞEYİ tam
> otomatik denetleme için sırayla (ya da yapabiliyorsa topluca) yapsın."*

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.311** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2193 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` = **d868f29** (push edildi) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.311** |
| Denetim | [`docs/UCTAN_UCA_DENETIM.md`](docs/UCTAN_UCA_DENETIM.md) (OKU) |

### Bu oturumda yapılanlar (v2.307–v2.311)
| Sürüm | Konu |
|---|---|
| v2.307 | Soru ↔ bölüm **önerisi** (deterministik kelime örtüşmesi; Ekle ile dayanak) |
| v2.308 | **Kanıt zaman çelişkisi (A1)** — dosya zamanı ↔ gömülü metadata uyarısı |
| v2.309 | **Gömülü metadata tüm dosyada (A3)** — ID3v1 + sonda moov; gerçek 9 MB dosyada doğrulandı |
| v2.310 | **Kurumsal kâğıt biçimi (B2)** — yalnız görsel; üç çıktı metni değişmedi |
| v2.311 | **Terim/konu listesi (C2)** — opt-in; `frequentTerms`/`termsText` |

### ÖLÇÜLEN EKSİKLER (uçtan uca denetim, gerçek Chromium + kod)
1. **Dashboard'da son teslim tarihi ve "kaç gün kaldı" YOK.**
2. **Son teslim tarihi otomatik hesaplanmıyor** (görevlendirme tarihi + süre).
   `freshCase.assignment.date = dateToday()` var ama `dueDate` boş; hesaplayan
   işleyici YOK.
3. **Görevlendirme tarihi çekmecede boş geliyor.**
4. **"Dosya" adımı/sayfası yok** (ray: overview · audio · questions · report);
   künye yalnız sağ çekmecede (`#caseDrawer`, üst bar ✎).
5. **`case.createdAt` var ama gösterilmiyor** → "dosya açılışından bu yana"
   hesaplanabilir ama yok.
6. Rapor tarihi **otomatik bugün** (doğru). "Rapor tarihi > son teslim" uyarısı yok.
7. Rapor teslimi hazırlık kartı **var** (Rapor ekranında) ama **dashboard'da yok**.

### YENİ OTURUMUN GÖREVİ — tam otomasyon araştırması + uygulama
Kullanıcı **uçtan uca** (dosya başlatma → rapor teslimi) her şeyin **otomatik
denetlenmesini** ve gerekli alanların **otomatik hazır/oluşturulmasını** istiyor.
**Önce araştır** (kod + gerçek tarayıcı ölçümü + gerekiyorsa mevzuat/56.12
pratiği), **sonra sırayla (ya da güvenliyse topluca) uygula.** Önerilen sıra:

| Aday | Konu | Not |
|---|---|---|
| **v2.312** | **Tarih zekâsı** | görevlendirme tarihi = bugün; **son teslim = tarih + süre** (elle ezilebilir); **kalan gün** + **dosya açılışından bu yana**; gecikme ve "rapor tarihi > son teslim" uyarısı — dashboard + rapor + durum çubuğu |
| **v2.313** | **"Dosya" görünümü (sayfa)** | ray'a Dosya ekle; künye bölümlere ayrılmış; üstte kalan gün + tamamlanma; çekmece hızlı düzenleme olarak kalır |
| **v2.314** | **Dashboard "teslim" özeti** | kalan gün + hazırlık maddeleri özeti ("rapora hazır mı") |
| **v2.315** | **Teslim kontrol listesi (rapor)** | yazdır/indir öncesi son kontrol |

**Tarih zekâsı için teknik yön (saf fonksiyon + test):**
- `daysRemaining(dueDate, today)` → tam sayı gün (takvim günü); tarih yoksa
  `null` (uydurma yok). `elapsedDays(createdAt, today)` → gün.
- `dueDate = addDays(assignmentDate, durationDays)`; kullanıcı elle ezebilir
  (`dueDateManual` bayrağı: elle değiştirilirse otomatik hesaplama onu EZMEZ).
- Gösterim: dashboard + rapor kapağı + durum çubuğu. "Gecikti" (negatif) ve
  "rapor tarihi > son teslim" uyarıları **metinle** (renk tek başına yetmez).
- **Resmî tatil/hafta sonu**: önce **takvim günü**; iş günü ayrı sürüm (karar).

### Açık kararlar (kullanıcıya; güvenli varsayılanlar)
1. Son teslim otomatik **önerilsin ama elle ezilebilsin** — *varsayılan: evet*.
2. "Dosya" **ayrı sayfa** — *varsayılan: evet* (çekmece kalır).
3. Kalan gün **dashboard + rapor + durum çubuğu** — *varsayılan: üçü*.
4. **Takvim günü** (iş günü sonra) — *varsayılan: takvim*.
5. Soruları görev yazısından otomatik çıkarma **deterministik değil** —
   *varsayılan: yapma; yalnız elle/öneri*. (LLM yok.)

### DEĞİŞMEZ (bu oturumda doğdu/pekişti)
- **Uydurma yok:** tarih/veri yoksa "—"; ölçülmeyen değer yazılmaz.
- **Üç çıktı aynı metin** (`rapor-tutarlilik-testi`); kâğıt biçimi metni değiştirmez.
- **Tek kaynak:** `contentWords` (terim/soru önerisi), `setSegmentSpeakerByName`,
  `reportHeadingText`, `reportTableColumns`, `questionBasisText` vb.
- **Bölüm alanı değişiklikleri `input` olayıyla** işlenir; sentetik testte
  `input` da gönder (yalnız `change` yanıltır — v2.305 dersi).
- Her sürüm: **APP_VERSION + CHANGELOG + YOL_HARITASI + index.html 4×`?v=` +
  version.json**; `bash tools/test.sh` yeşil; **gerçek Chromium** ölçümü;
  **commit + push + uzak hash + Pages `built` + canlı `version.json`** doğrula.
- Rapor **bilirkişi adına**; uygulama adı/sürümü çıktıda geçmez.

### İlk komutlar (yeni oturum)
```bash
bash tools/test.sh
git log --oneline -3; git status --short
curl -s https://azmisahin-gov.github.io/akis/version.json
```
Beklenen: **2193 birim + 522 şema** yeşil; sürüm **2.311**; git temiz (veya d868f29).
Sonra **`docs/UCTAN_UCA_DENETIM.md`** okunur; **v2.312 — Tarih zekâsı** ile başlanır.

## YENİ OTURUM DEVRİ (v2.312) — Teslim tarihi zekâsı ve teslim hazırlığı

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.312** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2241 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Git | yerel değişiklik (commit/push kullanıcı onayına bağlı) |
| Açık konu | Ayrı “Dosya” sayfası, yazdırılan teslim kontrol listesi, görev yazısından soru önerisi (deterministik değil) |

### Ne yapıldı (uçtan uca akış denetiminin 1. maddesi)

- **Son teslim tarihi otomatik:** görevlendirme tarihi + verilen süre → `dueDate`.
  Elle yazılan tarih **korunur** (`assignment.dueDateManual`); `↻ Süreye göre
  hesapla` yeniden hesaplar.
- **Kalan gün / gecikme tek kaynak:** `deliveryInfo(c)` → Özet **TESLİM** paneli,
  **durum çubuğu** (`#sbDue`), **rapor araç çubuğu** (`#reportDueChip`, her iki
  modda), Kontrol panelinde `.report-due` ve gecikme uyarıları. “N gün kaldı /
  N gün gecikti / Bugün son gün”.
- **Görevlendirme tarihi** çekmecede **bugün** ön dolgu; modele yazılmaz →
  **boş taslak kaydedilmez** (v2.109) korunur.
- **Ray’a “Dosya”** (`#navCase`) → dosya bilgileri çekmecesini açar.
- Test: `birim` [153], `tasarim` [2ct], `surum` [9] kimlikleri.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Teslim hesabı TEK KAYNAK:** `deliveryInfo` + `deliverySummaryText` /
   `deliveryDetailText`. Dashboard/durum çubuğu/rapor ayrı hesap yazmaz.
2. **Tarih yoksa uydurma yok:** `—`, `level:'none'`; gün farkı **takvim günü**
   (`Date.UTC`), `dateToday()` **yerel** gün.
3. **Elle yazılan son teslim EZİLMEZ:** `dueDateManual`; yalnız `↻` (force)
   temizler.
4. **Boş taslak kayda yazılmaz:** ön dolgu yalnız GİRDİ değeridir; `isEmptyCase`
   ve `casesForStorage` değişmedi. Yeni bir “varsayılan tarih” eklerken modele
   yazmayın; aksi hâlde ilk açılış “hayalet dosya” üretir.
5. **Renk tek başına anlam taşımaz:** “gecikti” metni + kırmızı; kırpma yok,
   durum çubuğu sarar.
6. **`input` olayı** ile alan değişikliği işlenir (sentetik testte `input` da
   gönder — v2.305 dersi).

### Sıradaki iş (adaylar)

1. **Ayrı “Dosya” sayfası:** künyeyi bölümlere ayır, üstte kalan gün + tamamlanma;
   çekmece hızlı düzenleme olarak kalsın. (Tek form kuralı: kimlik çoğaltmayın.)
2. **Teslim kontrol listesi (yazdırılan):** rapor ekranındaki hazırlık + teslim
   satırını isteğe bağlı ek/bölüm olarak üç çıktıya ekle (metin aynı olmalı).
3. **Görev yazısından soru önerisi:** deterministik değil; LLM olmadan yalnız
   “öneri” ve insan onayıyla sunulmalı. Yapılmadı.

## EK DÜZELTME (v2.313) — Hızlı etiket sözlüğü (metin içi)

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.313** (`assets/app.js` → `APP_VERSION`) |
| Testler | **2291 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.314 yeni gözlem işaretleri (`notAudible`, `distance`, `distortion`, `foreignLanguage`); sonra A‑1 Dosya görünümü |

### Ne yapıldı

- **Hızlı ekle menüsü gruplu + aranabilir:** Anlaşılırlık · Ortam/teknik ·
  Konuşma biçimi · İçerik notu. **30 etiket** (7’den). Üstte “son kullanılan 5”.
- **`[duyulmuyor]`** (ses yok/kısık) ile **`[anlaşılmaz]`** (ses var, kelimeler
  seçilemiyor) ayrıldı; **Anlaşılmadı** bölümün kontrol durumudur.
- **`[belirsiz]` etiketi YOKTUR:** belirsizlik **Belirsiz okuma** kontrol
  durumudur (klavye `4`); tek kelime şüphesinde `[şüpheli]` / `[tahmin]`.
- **Hukuki yorum etiketi yoktur** (`[tehdit]`, `[ikrar]`, `[hakaret]`,
  `[montaj]`); ifade birebir alıntılanır, yorum rapor metnindedir.
- `label` = `text` (görünen ad = metne giren değer); `obsKey` olan etiketler
  `OBS_KEYS` ile doğrulanır, ipucu `OBS_HINT`ten gelir (TEK KAYNAK).
- Menü `max-height: min(60vh, 440px); overflow-y: auto` → **kırpma yok**.
- Test: `birim [154]`, `tasarim [2cu]`, `surum` yardım konuları.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Etiket metni `s.text` içinde yaşar; şemaya yazılmaz.** Inline etiket ile
   gözlem işareti otomatik dönüşmez (istenirse ileride tek tık).
2. **`label` = `text`.** Görünen ad ile metne giren değer ayrışırsa rapor
   sözlükle uyuşmaz (v2.312’ye kadar `[uzaktan konuşma]` metne
   `[uzaktan/zayıf konuşma]` yazıyordu).
3. **Ortak kavram TEK KAYNAK:** önce `OBS_DEFS`, sonra `QUICK_TAG_DEFS` içinde
   `obsKey` ile bağla; ipucunu kopyalama.
4. **Kontrol durumu ≠ etiket:** “Belirsiz”, “Anlaşılmadı”, “Yeniden dinle”
   durumdur; bunlar için inline etiket eklemeyin.
5. **Arama yalnız görünürlük süzer;** etiket metnini/veriyi değiştirmez.
6. Yeni etiket eklerken: `QUICK_TAG_DEFS` satırı + grup + (varsa) `obsKey` +
   `birim [154]`/`tasarim [2cu]` güncelle.

### Sıradaki iş

1. **v2.314 — Yeni gözlem işaretleri:** `notAudible`, `distance`, `distortion`,
   `foreignLanguage` (+ isteğe bağlı `whisper`, `shouting`); `OBS_DEFS` göçü,
   filtreler, rapor GÖZLEM sütunu, EK-5, birleştirme OR. `OBS_KEYS.length`
   testi güncellenir.
2. **A‑1 — Ayrı “Dosya” görünümü** (çekmece editör kalır).
3. **A‑2 — Yazdırılan teslim kontrol listesi** (üç çıktı aynı metin).

## EK DÜZELTME (v2.314) — Yeni gözlem işaretleri

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.314** (`assets/app.js` → `APP_VERSION`) |
| Testler | **2325 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | A‑1 Ayrı “Dosya” görünümü; A‑2 yazdırılan teslim kontrol listesi |

### Ne yapıldı

- `OBS_DEFS` +4: **`notAudible`** (duyulmuyor), **`distance`** (uzaktan/zayıf),
  **`distortion`** (bozuk ses), **`foreignLanguage`** (dil değişimi) → toplam **12**.
- **`OBS_PRIMARY_KEYS`** (8): noise, overlap, inaudible, notAudible, music,
  phone, noSpeech, dropout. Alt şeritte **8 birincil** düğme; **“Gözlem” paneli
  TÜM 12’yi** gösterir (panel `max-height` + `overflow-y:auto`).
- Yeni **koşullu filtreler** (`notAudible`, `distance`, `distortion`,
  `foreignLanguage`); `segCounts` + `segMatchesFilter` aynı kaynaktan.
- `segmentWorkSummary` yeni bayrakları “İş” çiplerinde gösterir.
- Hızlı etiketler `obsKey` ile bağlandı; **etiket eklemek gözlemi OTOMATİK
  açmaz**.
- Rapor GÖZLEM/EK-5, yardım listesi, düğmeler **`OBS_DEFS`ten otomatik**;
  birleştirme gözlemleri **OR**’lar.
- Test: `birim [155]`, `tasarim [2cv]`.

### ÖLÇÜM (gerçek Chromium)

12 bayrak alt şeritte **1100 px’te 4 satıra** çıkıyordu (88 px, metni eziyordu).
Birincil 8 + panel ile: 1100 px’te **3 satır**; 1440/1280/1200/1000/900/760’ta
1–2 satır; ≤600 px’te satır gizli, panel tek erişim. Panel 12 düğme, kaydırılır.
Metin alanı **120 px** sabit; kırpılma/yatay taşma **0**; JS hatası **0**.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Gözlem = uzman beyanı.** Otomatik sınıflandırma yok; `[duyulmuyor]` teknik
   gözlemdir, **kontrol durumu değildir** (gerekirse “Anlaşılmadı” seçilir).
2. **12 bayrağın hepsi erişilebilir:** birincil 8 görünür, kalan 4 panelde;
   panel tümünü gösterir. Yeni bayrak eklerken `OBS_PRIMARY_KEYS`’e koymazsanız
   panelde kalır (gizli değil).
3. **Sayaç = filtre = tek kaynak:** `segCounts` + `segMatchesFilter` aynı
   `segmentHasObs` yardımcısını kullanır; yeni filtre eklerken `SEG_FILTERS` +
   `CONDITIONAL_FILTERS` + `segCounts` birlikte güncellenir.
4. **Eski kayıt göçü gerekmez:** `emptyObs` eksik anahtarı `false` yapar;
   bilinmeyen anahtar silinmez.
5. **Panel kaydırılır, kırpılmaz:** `max-height` + `overflow-y:auto`; sessiz
   kesme yasak.

## EK DÜZELTME (v2.315) — Dosya görünümü (ayrı sayfa)

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.315** (`assets/app.js` → `APP_VERSION`) |
| Testler | **2342 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | A‑2 Yazdırılan teslim kontrol listesi; A‑3 gecikme açılış uyarısı; A‑4 iş günü |

### Ne yapıldı

- Ray’daki **Dosya** artık **ayrı sayfa** (`#view-case`) açar: künye, taraflar,
  bilirkişi, görevlendirme, **teslim paneli** ve **eksikler** tek ekranda.
- **Düzenleme tek çekmecede** kalır (form kimlikleri çoğaltılmaz). Sayfadaki
  **✎ Düzenle** çekmeceyi açar; **Git ›** ilgili görünüme/çekmeceye gider;
  **Rapor kontrolü →** raporu Kontrol modunda açar.
- `deliveryPanelHtml(c)` **tek kaynak** (dashboard + Dosya sayfası);
  `caseIdentityRows` / `caseMissingItems` saf; `renderCasePage` sayfayı çizer.
- `switchView('case')` artık **sayfa** açar; eski erken “çekmece aç” dalı
  kaldırıldı. Çekmece kapanınca Dosya sayfası ve ray aktifliği korunur.
- Test: `birim [156]`, `tasarim [2cw]`, `surum` kimlikleri (`view-case`,
  `casePageBody`, `casePageStatus`).

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Tek düzenleyici:** form yalnız `#caseDrawer` içinde. Dosya sayfası salt
   okunur özettir; sayfada `id="court"` vb. **bulunmaz** (test [2cw]).
2. **Teslim paneli tek kaynak:** `deliveryPanelHtml`; dashboard ve sayfa aynı
   HTML’i kullanır. Ayrı kopya yazmayın.
3. **`switchView('case')` = sayfa.** “Düzenle” için çekmeceyi açın
   (`setCaseDrawer(true)`); `data-goto="case"` artık sayfaya gider.
4. **Ray aktifliği:** Dosya sayfasında `#navCase` aktif; çekmece açıkken diğer
   nav öğeleri soluklaşır, kapanınca `body.dataset.view`’e göre geri gelir.
5. **Eksik listesi sınırlıdır:** zorunlu künye + kayıt/soru. Rapor hazırlığının
   tam listesi Rapor ekranındaki Kontrol panelindedir.

## EK DÜZELTME (v2.316) — Menü kırpılması ve alt şerit düzeni

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.316** (`assets/app.js` → `APP_VERSION`) |
| Testler | **2342 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | A‑2 Yazdırılan teslim kontrol listesi; A‑3 gecikme açılış uyarısı |

### ÖLÇÜLEN HATA (1100×900)

`Etiket` ve `Gözlem` menüleri `position:absolute` idi; atalarında
`.seg-detail` (overflow:auto), `.seg-workspace`/`.audio-card`/`#view-audio`
(overflow:hidden) olduğu için menü **kırpılıyordu**:
- Etiket menüsü: top 280 < `.seg-detail` top 383 → üst kısmı görünmüyordu.
- Gözlem paneli: sağ kenar **1223 > 1100** → sağ kısmı görünmüyordu.

### Yapılan

- **`position: fixed` + JS konum:** `placeFloatingMenu(menu, trigger, align)`
  görünür alana oturtur (üst/alt, sol/sağ kırpma yok); `closeFloatingMenus`
  diğer menüyü kapatır. Dış tıklama + `scroll` (menü içi hariç) + `resize`
  kapatır.
- **Sıra:** solda **“Etiket ekle”** (metne), sağda **“Gözlem işaretle”**
  (rapora GÖZLEM). CSS `order` + `margin-left/right:auto`.
- **Düğme metinleri ne işe yaradığını söyler**; ayrıntı `title` ipucunda.
- **Yinelenenler kaldırıldı:** gözlem karşılığı olan 12 etiket
  `QUICK_TAG_DEFS`ten çıkarıldı → **18 metin etiketi**; `OBS_DEFS` **12**.
- Test: `birim [154]/[155]`, `tasarim [2cu]/[2cx]`.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Açılır menü ata `overflow` kutusuna hapsolmaz.** Menü `position:fixed`
   olmalı ve JS ile görünür alana oturtulmalı; `position:absolute` + ata
   `overflow:hidden` = **sessiz kırpma** (v2.316'da ölçüldü).
2. **Menü içi kaydırma kapatmaz:** `scroll` dinleyicisi menü içindeki
   kaydırmayı yok sayar; yalnız dış kaydırma kapatır.
3. **Etiket ≠ Gözlem:** solda Etiket (metne, `s.text`), sağda Gözlem (rapora,
   GÖZLEM sütunu). **Aynı kavram iki yerde tekrarlanmaz**; gözlem karşılığı
   olan etiket hızlı etiketlerde bulunmaz.
4. **Sıra rapor tablosuyla uyumlu:** GÖZLEM sağ sütun → düğme sağda.
5. **Yeni bir menü eklerken:** `placeFloatingMenu` + `closeFloatingMenus`
   kullanın; `position:absolute` ile ata kutusuna bırakmayın.

### Ölçüm (gerçek Chromium)

| Ölçüm | Sonuç |
|---|---|
| Etiket menüsü | 18 etiket, `[duyulmuyor]` **yok**, rect görünür alanda |
| Gözlem paneli | 12 düğme, sağ kenar **1029 ≤ 1100** |
| Sayfa yatay kayması | **yok** (`bodyScroll = innerWidth`) |
| Sıra | Etiket sol (653), Gözlem sağ (919/1029) |
| 1440/1100/900/760/600/360 | menü **inViewport**, hOverflow yok |
| JS hatası | **0** |

## EK DÜZELTME (v2.317) — Etiket menüsü kapatma + sade gözlem şeridi

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.317** (`assets/app.js` → `APP_VERSION`) |
| Testler | **2342 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | A‑2 Yazdırılan teslim kontrol listesi; A‑3 gecikme açılış uyarısı |

### ÖLÇÜLEN UX HATASI

- Etiket menüsünde **kapatma yolu yoktu**; tek eylem “Temizle” idi ve
  **metni hemen siliyordu** (yanlışlıkla veri kaybı riski).
- “Gözlem işaretle” paneli varken yanında **8 gözlem düğmesi** tekrarlanıyordu.
- Metin alanı 120 px (≈5 satır) idi; kullanıcı ~3 satır istedi.

### Yapılan

- **× Kapat** (sağ üst) + **Esc** + dış tıklama + düğmeye tekrar basma menüyü
  kapatır. `data-quick-close`.
- **“Metni temizle” onay ister** (`askConfirm`); “Vazgeç” veriyi değiştirmez.
- **Metin alanı ~3 satır:** `min-height: calc(3 * 1.7em + 16px)` ≈ 87 px.
- **8 gözlem düğmesi kaldırıldı**; tümü “Gözlem işaretle” panelinde. **Etkin**
  işaretler alt şeritte **çip**; çipe tıkla = kaldır.
- `activeObsChipsHtml(i, s)` **tek kaynak**: ilk çizim + gözlem tıklaması
  sonrası yerinde tazeleme.
- `OBS_PRIMARY_KEYS` ve `obsBtns` kaldırıldı; panel `obsAllBtns` (12).
- Test: `birim [154]/[155]`, `tasarim [2cu]/[2cx]`.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Her açılır menüde KAPATMA yolu olmalı:** görünür düğme (×) + Esc + dış
   tıklama + tetikleyiciye tekrar basma. “Tek eylem = Temizle” olamaz.
2. **Yıkıcı eylem onay ister:** “Metni temizle” `askConfirm` kullanır; onay
   yoksa veri değişmez. Geri alma Ctrl+Z’dir.
3. **Aynı işi iki denetimle sunma:** gözlem işaretleri tek panelde; alt şeritte
   yalnız **etkin** çipler (tek kaynak `activeObsChipsHtml`).
4. **Etkin çipler yerinde tazelenir:** `data-obs` tıklaması hem paneli hem alt
   şerit çiplerini hem durum satırını günceller; aksi hâlde çip görünmez.
5. **Metin alanı 3 satır tabanı:** `calc(3 * 1.7em + 16px)`; uzun metin kendi
   içinde kayar, panel kaymaz.

### Ölçüm (gerçek Chromium)

| Ölçüm | Sonuç |
|---|---|
| Metin alanı | **87 px** (6 genişlikte) |
| Etiket menüsü | 18 etiket + **Kapat** |
| Kapatma | düğme ✓ · Esc ✓ · dış tıklama ✓ |
| Temizleme | onay açıldı; “Vazgeç” → metin **korundu** |
| Gözlem satırı | **yok** |
| Gözlem paneli | 12 düğme; etkin çip 1 → çipe tıkla 0 |
| Menü görünürlüğü | tüm genişliklerde viewport içinde; hOverflow 0 |
| JS hatası | **0** |

## EK DÜZELTME (v2.318) — Envanter bütünlüğü + menü kapatma

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.318** (`assets/app.js` → `APP_VERSION`) |
| Testler | **2354 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | A‑2 Yazdırılan teslim kontrol listesi; A‑3 gecikme açılış uyarısı |

### ÖLÇÜLEN HATA

- **EK-5 “Metin işaretleri”** tablosu menüde olmayan **dört eski etiketi**
  (`[anlaşılmıyor]`, `[kısmen anlaşılmıyor]`, `[eşzamanlı konuşma]`,
  `[konuşma dışı ses]`) listeliyordu; menüdeki 18 etiketin çoğu anahtarda yoktu.
  Kullanıcı “bazıları kaybolmuş” dedi — haklıydı.
- Etiket menüsünde kapatma güvenilir değildi; **tarayıcının kendi arama ×’i**
  menüyü kapatmıyordu (yanlış × izlenimi).

### Yapılan

- EK-5 `Metin işaretleri` satırları **`QUICK_TAG_DEFS.map`** ile üretilir →
  **18 etiket** menüyle birebir. Gözlem satırları `OBS_DEFS.map` → **12**.
- **Backdrop** (`#sdPopBackdrop`, z 1190) + `syncFloatingBackdrop()`: menü
  açıkken görünür; dışarı tıklama güvenilir kapatır.
- Etiket menüsünde **üst `Kapat ×` + alt `Kapat`**; gözlem panelinde
  **`Kapat ×`** (`data-obs-close`).
- **Native arama × gizlendi** (`::-webkit-search-cancel-button`).
- Açık tetikleyici `[aria-expanded="true"]` ile vurgulanır.
- Test: `birim [157]`, `tasarim [2cu]/[2cy]`.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Rapor anahtarı = menü tanımı.** EK-5 metin işaretleri `QUICK_TAG_DEFS`ten,
   gözlem işaretleri `OBS_DEFS`ten üretilir; sabit liste yazmayın. Aksi hâlde
   anahtar menüden ayrışır (v2.318'de ölçüldü).
2. **Her menüde iki kapatma yolu + backdrop:** görünür `Kapat` (üst/alt),
   `Esc`, dış tıklama/backdrop. Tek “×” yeterli değildir; tarayıcının kendi
   arama ×’i gizlenir.
3. **Envanter testi:** 18 metin + 12 gözlem; menü, EK-5 ve `REPORT_TEXT.obsLabels`
   aynı sayıyı vermeli (`birim [157]`).
4. Yeni etiket/gözlem eklerken: `QUICK_TAG_DEFS`/`OBS_DEFS` + EK-5 otomatik +
   test sayıları birlikte güncellenir.

### Ölçüm (gerçek Chromium)

| Ölçüm | Sonuç |
|---|---|
| Menü metin etiketi | **18/18** |
| Gözlem paneli | **12/12** |
| EK-5 metin anahtarı | **18** (eski 4 etiket yok) |
| EK-5 gözlem anahtarı | **12** |
| Kapatma | üst/alt Kapat ✓ · Esc ✓ · backdrop ✓ |
| Native arama × | gizli |
| JS hatası | **0** |

## EK DÜZELTME (v2.319) — Görünür sürüm + tek tık “Yenile”

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.319** (`assets/app.js` → `APP_VERSION`) |
| Testler | **2354 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | A‑2 Yazdırılan teslim kontrol listesi; A‑3 gecikme açılış uyarısı |

### KÖK NEDEN (ölçüldü)

Kullanıcı “yeni etiketlerin hiçbiri yok, yalnız Temizle var” dedi. Bu **v2.311
arayüzü** (7 etiket + Temizle). Canlı site **v2.318** ile **birebir aynıydı**:
`assets/app.js` SHA-256 yerel = canlı; canlı `RUNNING=2.318`; yeni işaretler
20 kez vardı. Yani kod doğru; **açık sayfa eski kopya/önbellek**ti.
Kullanıcı hangi sürümde olduğunu göremediği için sorun “kod bozuk” sanıldı.

### Yapılan

- Üst barda **`⟳ vX.Y`** düğmesi (`#reloadVersionBtn` + `#topVersion`).
  Tıklama: `location.replace(...?t=Date.now())` → **önbelleği kırar**.
- `init()` → `#topVersion` = `v${APP_VERSION}`.
- Bootstrap: **ilk denetim hemen** (`setTimeout(check, 0)`), sonra 30 sn’de bir
  + sekmeye dönüşte. Fark varsa boştaysa yenile, değilse “Yeni sürüm hazır”.
- Test: `tasarim [2cz]`, `surum` kimlikleri.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Kullanıcı sürümü görebilmeli:** üst bar + sol alt `vX.Y`.
2. **Tek tık yenile olmalı:** `?t=` ile HTML önbelleğini kır. “Ctrl+Shift+R”
   tek yol olamaz.
3. **İlk sürüm denetimi hemen**; 60 sn beklemek “yeni sürüm gelmedi”
   izlenimi verir.
4. **Çok eski sayfa yeni düğmeyi gösteremez:** bir kez `git pull` / canlı URL
   ile güncellenmeli. Bu dürüst sınırdır; kodla geriye dönük çözülemez.
5. Yerel sunucu (`run.ps1`) `Cache-Control: no-store` verir; yine de `?t=`
   güvenli yoldur.

### Ölçüm

| Ölçüm | Sonuç |
|---|---|
| Canlı app.js SHA-256 = yerel | **eşit** |
| Canlı `RUNNING` | **2.319** |
| Üst bar sürüm düğmesi | **⟳ v2.319** |
| Tıklama | URL `?t=...`, sayfa yenilendi |
| İlk denetim | **0 sn** |
| JS hatası | **0** |

## EK DÜZELTME (v2.320) — Etiket menüsünde 30 etiket + kapatma garantisi

### Durum (2026-11-25)

| | |
|---|---|
| Sürüm | **v2.320** (`assets/app.js` → `APP_VERSION`) |
| Testler | **2366 birim + 522 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | A‑2 Yazdırılan teslim kontrol listesi; A‑3 gecikme açılış uyarısı |

### KÖK NEDEN

Kullanıcı v2.319’da Etiket menüsünde **18 etiket** görünce “yeni etiketler
eksik” dedi. Plan **30 etiket** içeriyordu; v2.316’da “gözlemde varsa kaldır”
yorumuyla **12 gözlem kavramı** Etiket menüsünden çıkarılmıştı. Ayrıca menü
uzun olduğunda **alt Kapat** görünür alandan çıkabiliyordu.

### Yapılan

- `QUICK_TAG_DEFS` → **30** (Anlaşılırlık 6 · Ortam/teknik 9 · Konuşma biçimi
  10 · İçerik 5). 12 gözlem kavramı **Etiket menüsünde de** var.
- Başlık: **“Etiket ekle · 30”** (kullanıcı sayıyı görür).
- `.sd-quick-menu` `max-height: min(72vh, 560px)`; **`.qt-foot` sticky bottom**
  → alt Kapat her an görünür.
- **Yakalama aşamasında kapatma:** `document.addEventListener('click', …,
  true)` → `[data-quick-close]` / `[data-obs-close]` her katmanda çalışır.
- EK-5 metin tablosu `QUICK_TAG_DEFS` (30), gözlem `OBS_DEFS` (12).
- Test: `birim [154]/[155]/[157]`, `tasarim [2cu]/[2cy]`.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Planın tamamı görünür:** 30 metin etiketi Etiket menüsünde; 12 gözlem
   işareti Gözlem panelinde. Aynı kavramın iki katmanda olması **bilinçlidir**
   (Etiket = metne, Gözlem = rapora).
2. **Başlıkta sayı:** “Etiket ekle · 30”; eksik olduğu izlenimi doğmaz.
3. **Alt Kapat sticky:** menü kaydırılsa da kapatma görünür.
4. **Kapatma yakalama aşamasında:** başka dinleyici olayı yutsa bile çalışır.
5. Yeni etiket eklerken `QUICK_TAG_DEFS` + EK-5 otomatik + test sayıları.

### Ölçüm (gerçek Chromium)

| Ölçüm | Sonuç |
|---|---|
| Etiket menüsü | **30/30** |
| Gözlem paneli | **12/12** |
| EK-5 metin / gözlem | **30 / 12** |
| Kapatma (gerçek fare) | üst × ✓ · alt Kapat ✓ · backdrop ✓ |
| Alt Kapat görünür | **sticky** (kaydırmada sabit) |
| JS hatası | **0** |


## YENİ OTURUM DEVRİ (v2.330) — Fizikî dosya teslim ve iade

| | |
|---|---|
| Sürüm | **v2.330** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → birim + şema + rapor + sürüm + tasarım yeşil |
| Açık konu | Yok (tur kapandı) |

### Ne yapıldı

Mahkemenin **fizikî olarak** teslim ettiği dava dosyası ve ayrı materyaller
(USB, CD, DVD, harici disk, mühürlü zarf) **Dosya** alanında kaydedilir.
Teslim ve iade **ayrı tarih/saat**; iade ekranına ilk liste aynen gelir.
**Hiçbir materyal kendiliğinden iade edilmiş sayılmaz**; eksik materyal uyarı
olarak görünür. **Ayrı teslim ve iade tutanakları** UDF/DOCX (imza alanlı).
**EK-1** bu kayıttan üretilir. Belge kopyaları `.akis` paketine girer.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **Fizikî teslim zorunlu değildir.** UYAP erişimi fizikî teslim sayılmaz;
   bölüm boş kalabilir. EK-1 bu durumda dürüst açıklama yazar (uydurma satır yok).
2. **Varsayılan "iade edilmedi"dir.** Materyal iadesi açık işaret ister;
   "hepsi iade edildi" varsayımı yasak. `physicalReturnComplete` eksik varsa false.
3. **Aynı bilgi tek yerde.** EK-1 kaydın çıktısıdır; ayrı kopya tutulmaz.
   Ses kaydı kökeni (`origin`) ile fizikî dosya (`physicalFile`) karışmaz.
4. **Belge kopyaları iki paket yolunda da taşınır** (`belge/<dosyaId>/`);
   tekil ve arşiv paketi aynı sözleşmeyi kullanır (v2.132 dersi).
5. **Kalıcı silme belgeleri de siler** (`purgeCaseMedia`); kopya temizlik kodu
   yazmayın.
6. **E-imza üretilmez**, mahkeme onayı iddia edilmez; tutanakta imza ALANI vardır.

### Ölçüm (gerçek Chromium + CDP, 1440×900)

| Ölçüm | Sonuç |
|---|---|
| Kayıt yokken panel | "Kayıt yok" + UYAP notu (zorunlu değil) |
| Çekmecede 3 materyal + teslim/iade | çip **"1 materyal iade edilmedi"** |
| Eksik uyarısı / dizi pusulası uyarısı | **var / var** |
| İade sütunu | `İade edildi · İade edilmedi · İade edildi` |
| Yenileme sonrası | **korundu** |
| Kırpılan öğe / yatay taşma (1440→600) | **0 / 0** |
| Tutanak UDF indirme | `Tutanak_Teslim_…udf`, `Tutanak_Iade_…udf` |
| Tutanak belgesi | başlıkla başlar; **"EKLER" başlığı ve ek girişi YOK**, "Rapor eki" YOK, imza alanı var, AKİS/uygulama yok, ZWSP yok |
| Belge ekleme (gerçek dosya girdisi) | `dizi-pusulasi.pdf` eklendi, panelde göründü |
| Paket (.akis) | `case.json` + `belge/<dosyaId>/<belgeId>_ad`; **bayt bayt aynı** |
| Rapor önizlemesi EK-1 | teslim tablosu + materyal + eksik uyarısı + dizi uyarısı |
| Rapor hazırlığı | "İade edilmeyen fizikî materyal" maddesi |
| JS hatası | **0** |

### Sıradaki iş (adaylar)

- Fizikî dosya için **teslim/iade hatırlatması** (rapor hazırlığında).
- Birden çok fizikî dosya (klasör bazında ayrı kayıt) — talep olursa.
- Materyal ↔ ses kaydı bağının raporda ayrı sütun olarak gösterimi.


## YENİ OTURUM DEVRİ (v2.331) — Belge paketi: UDF + DOCX

| | |
|---|---|
| Sürüm | **v2.331** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → birim + şema + rapor (47) + sürüm + tasarım yeşil |
| Açık konu | Yok |

### Ne yapıldı

Kullanıcı: *"Raporda tüm belgeleri ZIP olarak indirirken sadece UDF geliyor;
Word kopyaları da alınsın."* `buildDocumentsZip()` artık **her belgeyi iki
biçimde** üretir: `.udf` (UYAP) + `.docx` (Word). Ayrıca manifest v2
(`akis.documents.v2`) ve `SHA256SUMS.txt` eklendi — `docs/UST_YAZI_STANDARDI.md`
§7.2–§7.4 zaten bunu öngörüyordu.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)

1. **ZIP = arşiv seti:** her belge UDF **ve** DOCX; birincil çıktı yine UDF'dir,
   ZIP'in UYAP'a tek belge gibi gönderildiği iddia edilmez.
2. **Her dosya ayrı manifest satırı + ayrı SHA-256.** UDF ve DOCX aynı metni
   taşısa da baytları farklıdır; tek özet paylaştırmayın.
3. **Fail-closed:** `blobSha256Hex` boş özet döndürmez (hata yükseltir) ve bir
   biçim üretilemezse paket **eksik indirilmez**; hangi belge/biçim söylenir.
4. **ZIP'e dosya ArrayBuffer olarak eklenir** (`out.blob.arrayBuffer()`):
   JSZip'in Blob desteği ortama göre değişir; ArrayBuffer tarayıcı + Node'da aynı.
5. `belgeler.json` ve `SHA256SUMS.txt` **belge metnine girmez**; hash metne
   yazılmaz (yalnız manifest/kontrol listesi).
6. Düğme adı ne indirileceğini söyler: **⤓ Tüm belgeler (UDF + DOCX)**.

### Ölçüm (gerçek Chromium + CDP)

| Ölçüm | Sonuç |
|---|---|
| ZIP içeriği | `UstYazi_….udf` + `UstYazi_….docx`, rapor/ekler iki biçimde |
| `belgeler.json` | `akis.documents.v2`, 6 satır, `format`/`sha256`/`bytes` dolu |
| `SHA256SUMS.txt` | 6 satır, `<hash>  <dosya>` |
| Manifest özetleri | dosyaların **gerçek baytlarıyla** eşleşti |
| DOCX / UDF yapısı | `word/document.xml` / `content.xml` var |
| JS hatası | **0** |

### Sıradaki iş (adaylar)

- ZIP'e `SHA256SUMS.txt`'in kendi özetini ayrı `.sha256` yan dosyası olarak
  eklemek (standart §7.3 "istenirse").
- Belge adlarında tarih/saat standardı (§7.1) — bugün yalnız dosya numarası.

## YENİ OTURUM DEVRİ (v2.332) — Depolama yazma hatası görünür

| | |
|---|---|
| Sürüm | **v2.332** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2532 birim + 555 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.333 (silme hatası görünür), v2.334 (bozuk arşiv dosyası bildirilir), v2.335 (toplu işlem/aktarma bildirimleri) |

**Ölçülen hata (v2.331):** IndexedDB `audio` yazması `QuotaExceededError` ile
zorlandığında toast **"1 kayıt eklendi"**, durum **"● Kayıt güncel"** diyor,
uyarı şeridi çıkmıyordu; yenilemeden sonra kayıt listede kalıyor ama
`audio.src=''`, süre 00:00 ve **hiçbir uyarı yoktu**. `storeBlob` catch'i yalnız
`console.warn` yazıyordu.

**DEĞİŞMEZ KURALLAR (bu sürümde doğdu)**

1. **Yazma sonucu kontrol edilmeden başarı bildirilmez.** `storeBlob` true/false
   döner; çağıran yol `false` ise kullanıcıya **role=alert** ile söyler ve
   günlüğe yazar.
2. **"Bulundu" ≠ "yazıldı".** Paketten geri yüklemede ses bulundu diye
   `found`'a eklenmez; **yazıldıysa** eklenir. Yazılamayan ses "eksik ses"tir.
3. **Ses durumu bölümden bağımsızdır.** `audioPersistWarningHtml(hasUrl, stored)`
   kayıt detayında **her zaman** çizilir (bölüm yoksa da). Yeni bir uyarı
   eklerken bölüm detayına hapsetmeyin.
4. **Fizikî belge dosyasız açılmaz:** `savePhysicalDoc` yazamazsa `null` döner;
   `attachPhysicalDoc` kaydı oluşturmaz ve hata bildirir.
5. Sahte IndexedDB testte `__idbFail` ile yazma/silme hatası simüle edilir;
   `birim [159]` sözleşmeyi korur.

## YENİ OTURUM DEVRİ (v2.333) — Ses silme hatası görünür

| | |
|---|---|
| Sürüm | **v2.333** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2541 birim + 555 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.334 (bozuk arşiv dosyası bildirilir), v2.335 (toplu işlem/aktarma bildirimleri) |

**Ölçülen hata (v2.331):** silme zorla bozulduğunda toast "Ses kaydı kaldırıldı."
diyor, kayıt listeden gidiyor, fakat IndexedDB blob sayısı **11 → 11** kalıyordu
(ses tarayıcıda duruyor, arayüzden erişilemiyor). `deleteBlob` catch'i boştu.

**DEĞİŞMEZ KURALLAR**

1. **Silme sonucu kontrol edilmeden "silindi" denmez.** `deleteBlob` true/false
   döner; `discardMaterialMedia` iletir; `purgeCaseMedia` `{failed[]}` döndürür.
2. **Dört silme yolu aynı sözleşme:** kayıt kaldır · kalıcı sil · test dosyalarını
   kaldır · fizikî belge kaldır. Kısmi başarısızlık **role=alert** + "tarayıcı
   verilerini temizleyin" yönlendirmesi.
3. Yeni bir silme yolu eklerken `discardMaterialMedia`/`purgeCaseMedia` kullanın;
   doğrudan `deleteBlob` çağırıp sonucu yok saymayın.
4. Test: `birim [160]` (sahte silme hatası).

## YENİ OTURUM DEVRİ (v2.334) — Bozuk paket dosyası bildirilir

| | |
|---|---|
| Sürüm | **v2.334** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2551 birim + 555 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.335 (toplu çalıştırma/aktarma bildirimleri) |

**Ölçülen hata (v2.331):** 2 dosyalı pakette birinin ses girdisi bozukken onay
"Bunlardan 2 tanesi EKLENİR" diyor, sonuçta 1 dosya geliyor, atlanan dosya
**hiç söylenmiyordu** (catch yalnız `console.error`).

**DEĞİŞMEZ KURALLAR**

1. **İçe aktarmada okuma hatası sessiz atlanmaz.** `failed[]` toplanır, ham kayıt
   `akis.rescue.failedImport`'a yazılır; yükleme/kurtarma yollarıyla aynı sözleşme.
2. **Toast tek başına yetmez:** kalıcı şerit (`#importFailureBanner`, role=alert)
   kapatılana kadar ekranda kalır. Başarı toast'ı onu örtemez (en son çağrılır).
3. Hepsi başarısızsa da şerit gösterilir; hata açık metinle bildirilir.
4. Test: `birim [161]`.

## YENİ OTURUM DEVRİ (v2.335) — Toplu işlem/aktarma bildirimleri

| | |
|---|---|
| Sürüm | **v2.335** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2559 birim + 555 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Önerilen dörtlü (v2.332–v2.335) kapandı |

**Ölçülen hata (v2.331):** `runQueue` her hatayı `catch (e) {}` ile yutuyor,
son mesajı koşulsuz "Toplu çözümleme tamamlandı." yazıyordu. Paketten yükleme
hatası `role=status` (nazik) idi.

**DEĞİŞMEZ KURALLAR**

1. **Toplu iş sonucu tek kaynak:** `queueResultText(cancelled, done, failed)`;
   hata varsa metin sayı verir ve bildirim **role=alert** olur.
2. **Aktarma hatası kritik bildirimdir** (`showToast(..., true)`).
3. Yeni bir toplu işlem eklerken başarısız sayısını tutun; "tamamlandı" demek
   için hata sayısının 0 olduğunu doğrulayın.
4. Test: `birim [162]`.

**Dürüst sınır:** Toplu çözümleme bu ortamda gerçek model indirilmeden
çalıştırılamadı; `queueResultText` ve sayaç kaynak düzeyinde test edildi.

## YENİ OTURUM DEVRİ (v2.336) — Rapor künyesi tek bölüm + alan görünürlüğü

| | |
|---|---|
| Sürüm | **v2.336** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2584 birim + 555 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | Rapor ön bölüm tipografisi/başlık tutarlılığı ayrı sürümde sürer |

**Ölçülen durum (v2.335):** Künye iki tabloda tekrar ediyordu; uzmanlık alanı
aynı raporda iki farklı değer gösteriyordu (“56.12 – …” / “56.12”); özet
süreleri birimsizdi (“02:03”); HTML etiketleri CSS ile büyük harfe çevriliyor,
DOCX/UDF karışık harf basıyordu.

**DEĞİŞMEZ KURALLAR**

1. **Tek künye:** `coverFields` = “RAPOR KÜNYESİ”. Ayrı `kunye` bölümü YOKTUR;
   göç `normalizeReportSections` içinde (kunye açıksa coverFields açık kalır).
2. **Alan görünürlüğü tek kaynak:** `REPORT_FIELD_DEFS` + `normalizeReportFieldVisibility`
   + `reportFieldVisible`; `case.report.fields`. Üç çıktı `frontRowsFor()` kullanır;
   ayrı süzgeç yazmayın.
3. **Etiketler VERİDE büyük harf**; CSS `text-transform` yazılmaz. Ekran/DOCX/UDF
   aynı metni gösterir.
4. **Uzmanlık alanı tek kaynak:** `DEFAULT_EXPERT_FIELD` (schema). Dosyada
   değiştirilebilir; raporda tam metin, üst satır/üst bilgide kısa kod.
5. **“Raporun ekleri” elle yazılmaz:** `reportAttachmentLines(c)` (EKLER) otomatik.
6. **“Keşif” sözcüğü kullanılmaz:** tek anlam `inspectionDate` → “İNCELEME TARİHİ”.
7. **İnceleme konusu boşsa** `reportReadiness` `subject` maddesi **blocking**.
8. Test: `birim [163]`, `rapor` Senaryo 20, `tasarim [2bs]`.

## YENİ OTURUM DEVRİ (v2.337) — Ölü kod + yanlış test/yardım cümlesi

| | |
|---|---|
| Sürüm | **v2.337** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2590 birim + 555 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.338 (A‑3 gecikme açılış uyarısı), v2.339 (A‑2 teslim kontrol listesi) |

### Ne yapıldı
- `segPriorityBadge` (v2.186'dan sonra çağrılmıyordu) ve `letterPageCount`
  (yerini `estimateDocumentPages` aldı) **silindi**.
- `tasarim-testi`'nin "öncelik rozeti korunur" kontrolü yalnız fonksiyon
  **varlığına** bakıyordu; **davranışa** çevrildi: çip detayın Durum satırında,
  listede rozet yok.
- Yardım EKRANI (`index.html`) ile sürüm notu (`app.js` `VERSION_NOTICES`)
  AYRI dosyalardadır. İlk denemede yalnız app.js düzeltildi, ekran eski cümleyi
  göstermeye devam etti (tarayıcıda ölçüldü) → **ikisi birlikte** düzeltilir.

### DEĞİŞMEZ DERS (v2.337)
- **`function X` var mı?** testi özellik koruması DEĞİLDİR. Ölçüt: öğe
  **ekranda/çıktıda** var mı. Yeni test yazarken davranışı sınayın.
- Kullanıcıya görünen bir metin değişecekse **iki yer**: `index.html` (yardım
  ekranı) + `assets/app.js` (`VERSION_NOTICES`). Yalnız birini düzeltmek
  "düzeltildi" sanılan ama ekranda süren hatadır.

### Ölçüm (gerçek Chromium + CDP, 1440×900)
`v2.337` · elle bölüm (boş metin) → liste rozeti `.badge.prio` **0** · durum
çipleri `Ses: hazır · Anlamlı metin yok · **Öncelik: Yüksek**` · yardım
ekranı eski cümle **yok**, yeni cümle **var**, v2.337 notu **var** · kırpılan 0 ·
yatay taşma 0 · JS hatası **0**.

## YENİ OTURUM DEVRİ (v2.338) — Gecikme açılışta bildirilir (A‑3)

| | |
|---|---|
| Sürüm | **v2.338** |
| Testler | **2608 birim + 555 şema** + rapor/sürüm/tasarım yeşil |
| Açık konu | v2.339 (A‑2 yazdırılan teslim kontrol listesi) |

### Ne yapıldı
- `overdueNotice(c, {today, lastShown, others})` — **saf karar**; `deliveryInfo`
  `level==='late'` TEK ölçüt. `overdueCaseNames(cases, activeId)` diğer
  gecikmişlerin **görünen adlarını** verir (arşivli/tarihsiz girmez).
- `#dueNotice` kırmızı şerit (role=alert) + kritik toast; **günde bir kez**
  (`akis.dueNotice.<dosyaId>`; dosyaya YAZILMAZ). "Dosyayı aç" → Dosya sayfası.
- Yardım ekranı + sürüm notu + OZELLIKLER güncellendi; `surum` `#dueNotice`
  kimliğini denetler.

### DEĞİŞMEZ DERS (v2.338 — üst üste binme)
`positionDueNotice` sürüm şeridinin **yüksekliğini ölçer**. Sürüm şeridi init
sırasında **sonradan** açıldığı için ilk konumlama `top:0` veriyordu ve iki şerit
üst üste biniyordu (ölçüm: ikisi de 0–115/136). Düzeltme: (a) init'te sürüm
şeridinden SONRA `positionDueNotice()`, (b) `#versionNotice` `hidden` değişimini
`MutationObserver` ile izleyip yeniden konumla. **Sabit piksel varsayımı yok.**

### Ölçüm (gerçek Chromium + CDP)
`v2.338` · şerit metni doğru (25 gün, tarih, "Başka 3 dosya da gecikmiş") ·
role=alert/assertive · aynı gün 2. açılışta **görünmez** · ertesi gün kuralı
birim testinde · sürüm şeridi açıkken `dueTop=136 = verBottom` (gap 0,
**örtüşme yok**) · sürüm şeridi kapanınca `dueTop=0` · "Dosyayı aç" →
`dataset.view='case'` · 1440/1100/900/760/600/360: yatay taşma 0, kırpma 0
(360'ta şerit 202 px'e sarar) · JS hatası **0**.

## YENİ OTURUM DEVRİ (v2.339) — Teslim kontrol listesi (A‑2)

| | |
|---|---|
| Sürüm | **v2.339** |
| Testler | **2632 birim + 555 şema** + rapor (48) + sürüm + tasarım yeşil |
| Açık konu | AGENTS backlog'undaki A‑2/A‑3 kapandı; yeni konu seçimi kullanıcıda |

### Ne yapıldı
- `deliveryChecklistRows(c)` — **saf**; 14 satır, durum **Tamam / Eksik / Bilgi**.
  Kaynaklar: `pendingBreakdown`, `speakerCodeIssues`, `segmentCoverage`,
  `deliveryInfo`, `physicalCounts`, `reportChecklistRows` (sayısal tablo).
- **EK-5 “SON KONTROL LİSTESİ”** artık `kind:'blocks'`: açıklama + **TESLİM
  KONTROLÜ** tablosu + **SAYISAL KONTROL** tablosu. Üç çıktı aynı satırlar.
- Metinler `REPORT_TEXT` (`deliveryCheckNote`, `checklistTitle` …) — kopya yok.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)
1. **“Bilgi” eksik DEĞİLDİR.** Alan isteğe bağlı ya da ölçüm yapılmamışsa
   “Bilgi” yazılır; **uydurma “Eksik” üretilmez** (tarih/süre yok → hesaplanamadı).
2. **Kontrol listesi = rapor hazırlığı.** Aynı yardımcılar kullanılır; iki araç
   ayrışırsa kullanıcı hangisine güveneceğini bilemez (v2.156 dersi).
3. **Durum metindir** (Tamam/Eksik/Bilgi); renk tek başına anlam taşımaz.
4. **Tek yerde tek liste:** yeni bir “kontrol listesi” eklemek yerine EK-5
   genişletildi; ikinci bir liste kullanıcıyı iki gerçeğe inandırır.
5. Yeni bir satır eklerken `deliveryChecklistRows` + `birim [165]` + `rapor`
   Senaryo 48 birlikte güncellenir.

### Ölçüm (gerçek Chromium + CDP)
`v2.339` · rapor önizlemesinde **TESLİM KONTROLÜ** var; satırlar (dosya no,
kontrol bekleyen, SHA-256, son teslim, fizikî iade) görünür; durum dağılımı
**Tamam 9 · Eksik 4 · Bilgi 4**; **SAYISAL KONTROL** tablosu var; 12 tablo ·
kırpılan tablo **0**; 1440/1100/900/760/600 → clip 0, yatay taşma 0; JS hatası **0**.

## YENİ OTURUM DEVRİ (v2.340) — Rapor içi ekler: ad ve biçim

| | |
|---|---|
| Sürüm | **v2.340** |
| Testler | **2641 birim + 555 şema** + rapor (49 senaryo) + sürüm + tasarım yeşil |
| Açık konu | Yok |

### Neden
Kullanıcı iki listeyi karşılaştırdı: rapor kapağında **“RAPORUN EKLERİ →
Rapor eki 1…6”**, üst yazıda **“EK-1 Bilirkişi Raporu / EK-2 Teknik Bilgiler”**.
İkisi **ayrı şeydir** (raporun kendi ekleri ↔ üst yazının belge seti) ama ad
benzerliği karışıklık üretiyordu; ayrıca kapakta “Rapor eki” öneki 6 kez
tekrarlanıp **259 karakterlik** tek satır oluşuyordu.

### Yapılan
- Kapak etiketi **“RAPOR İÇİ EKLER”** (üst yazının EK-N'siyle karışmaz).
- `reportAttachmentLines` → **“1. BAŞLIK · 2. BAŞLIK…”** (önek tekrarı yok);
  **259 → 199** karakter. Numaralar `reportAnnexList`'ten; kapak + EK LİSTESİ +
  üç çıktı aynı metni kullanır.
- **İçeriksiz ek filtresi UYGULANMADI** (önerinin bu kısmı yanlıştı): fizikî
  kayıt yokken EK-1 **beyan** basıyor (“kayıt girilmemiştir; bu bir eksiklik
  değildir”). Filtrelemek rapordan bir beyan silerdi.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)
1. **İki numara alanı ayrıdır:** rapor içi ekler `Rapor eki N.` (EKLER bölümü),
   üst yazı belge seti `EK-N`. Kapakta **“RAPOR İÇİ EKLER”** denir; “EK” adı
   yalnız üst yazıda kullanılır (v2.323 kuralının görünür adı).
2. **Kapakta numara tekrarı yok:** “1. BAŞLIK” biçimi; tam başlık EKLER
   bölümünde “Rapor eki N. …” olarak durur.
3. **Boş vaat yok:** EKLER bloğu kapalıysa liste yazılmaz.
4. **“İçeriksiz görünen” ek silinmez:** içerik yerine **beyan** basan ekler
   (EK-1 “kayıt yok”, EK-3 “günlük boş”) listede kalır; filtrelemeden önce
   ek metnini okuyun.

### Ölçüm (gerçek Chromium + CDP, 1440×900)
`v2.340` · kapak satırı: etiket **RAPOR İÇİ EKLER**, değer **199 karakter**,
“Rapor eki” öneki **yok**, eski etiket **yok**; EKLER bölümünde **6** adet
“Rapor eki N.” başlığı duruyor; üst yazı **EK-1** listesi değişmedi.
1440/1100/900/760/600 → kırpma **0**, yatay taşma **0**, hücre sarar (65→97 px);
JS hatası **0**.

## YENİ OTURUM DEVRİ (v2.341) — Tarafsızlık beyanı (56.12 hâl beyanı)

| | |
|---|---|
| Sürüm | **v2.341** |
| Testler | **2653 birim + 556 şema** + rapor (50 senaryo) + sürüm + tasarım yeşil |
| Açık konu | İstenirse “Metin şablonları kitaplığı” (kopyala-ekle) ayrı sürüm |

### Neden (kullanıcı sorusu)
Künyede **“TARAFSIZLIK / BAĞIMSIZLIK BEYANI”** alanı vardı ve yer tutucusu
**taahhüt** cümlesiydi (“görüşler tarafsız ve bağımsız olarak…”). Oysa depodaki
**56.12 künyesi** şunu ister: *“Tarafsızlık / bağımsızlığı etkileyebilecek hâl
beyanı: [Engel bulunmadığı / varsa açıklama ve merciye bildirim]”*. Yani alan
**beyandır, taahhüt değildir**; ayrıca sağ panel başlığı “(ekler · tarafsızlık)”
diyordu ama **ek alanı yoktu** (ekler otomatik).

### Yapılan
- Etiket/yer tutucu/ipucu 56.12 anlamına çekildi — TEK KAYNAK `REPORT_TEXT`
  (`impartialityHeading`, `impartialityPlaceholder`, `impartialityHint`).
- Panel başlığı: **“Künye: tarafsızlığı etkileyebilecek hâl beyanı”**.
- **“Engel bulunmadığını yaz”** düğmesi: hazır cümle **yalnız açık tıklamayla**
  girer; alan doluysa **ezilmez** (uyarı). Varsayılan **boş**; boşsa **satır
  basılmaz**.
- **Ölü alan temizliği:** `report.annexList` birleştirme ve önizlemeden
  çıkarıldı (hiçbir çıktıya girmiyordu, ama **görünmez çakışma** üretiyordu).
  Eski değer dosyada korunur, kullanılmaz; revizyon geri yüklemesindeki yazım
  kaldırıldı.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)
1. **Beyan ≠ taahhüt.** Bu alan çıkar çatışması **beyanıdır**; uygulama
   kendiliğinden “engel yoktur” yazmaz (rapor bilirkişi adına; uydurma yok).
2. **Hazır metin yalnız açık eylemle** ve **dolu alanı ezmeden** yazılır.
3. **Boş alan satır üretmez** (“—” uydurulmaz).
4. **Görünmeyen alan birleştirmeye girmez.** Çıktıya girmeyen bir alanı
   `mergeCases`/`compareCases` listesine koymak “görünmez çakışma” üretir.
5. Panel başlığı **ne düzenlendiğini** söyler; olmayan alanı (“ekler”) anmaz.

### Ölçüm (gerçek Chromium + CDP)
`v2.341` · panel başlığı ve etiket 56.12 metniyle; düğme → alan dolar, kapak
satırı **“TARAFSIZLIĞI ETKİLEYEBİLECEK HÂL BEYANI” + cümle** olarak görünür;
ikinci tıklama değeri **değiştirmedi**, “alan dolu” uyarısı çıktı; alan
boşaltılınca satır **kalktı**; kırpma 0 · yatay taşma 0 · JS hatası **0**.

## YENİ OTURUM DEVRİ (v2.342) — Kendi varsayılan metinlerim

| | |
|---|---|
| Sürüm | **v2.342** |
| Testler | **2674 birim + 556 şema** + rapor (51 senaryo) + sürüm + tasarım yeşil |
| Açık konu | İstenirse “Kayıtlı metinlerim” (tıkla-dolsun kitaplık) ayrı sürüm |

### Neden
Kullanıcı: “bu alanları değiştirmek için kod mu gerekiyor?” Ölçüm: **evet** —
`DEFAULT_METHOD` (959 krkt), `defaultLimitations`, `defaultConclusion`,
`impartialityTemplate` **kodda sabitti**. Dosya içindeki metin düzenlenebiliyordu
ama **her yeni dosyada ne geleceği** değiştirilemiyordu; bilirkişi her dosyada
aynı metni silip yeniden yazıyordu.

### Yapılan
- **Ayarlar → Kendi varsayılan metinlerim**: 3 metin (yöntem · sınırlılıklar ·
  sonuç). Depo **yalnız tarayıcı** (`akis.defaults`), **pakete girmez**.
- `defaultTextFor(field)` **etkin varsayılan** (kullanıcı → kod). `saveUserDefaults`
  boş değeri **siler**, 20.000 karakterde kırpar, sayı/nesne yok sayar.
- **“Uygulama varsayılanını yükle”** mevcut metni alana kopyalar; **onaylı**
  “Uygulama varsayılanlarına dön” sıfırlar (dosyalara dokunmaz).
- Bölüm düzenleyicide **“VARSAYILAN METİN”** rozeti (alan boşsa) ve
  **“Varsayılana dön”** (alan doluysa; alanı boşaltır, dosyadaki metin silinir).

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)
1. **Varsayılan metin DOSYAYA YAZILMAZ** (yöntem hariç, o zaten türetimde
   saklanıyordu). Sınırlılık/sonuç alanları **boş kalır**, metin boş alanın
   yerine basılır → **boş taslak kayda yazılmaz** (v2.109) bozulmaz.
2. **Tarafsızlık beyanı varsayılan DEĞİLDİR.** Kişisel beyandır; kapsam dışı
   tutulur, kendiliğinden dolmaz (v2.341).
3. **Kod varsayılanı geri dönüş yoludur**: kullanıcı metni yoksa uygulama metni
   kullanılır (geriye uyum).
4. Depo tarayıcıdır → **paketle taşınmaz**; başka bilgisayarda kod varsayılanı
   geçerlidir (dürüst sınır, sessiz iddia yok).

### Ölçüm (gerçek Chromium + CDP)
`v2.342` · panel 3 alan; “Uygulama varsayılanını yükle” → **962** karakter;
kendi metin yazıldı → **yenileme sonrası** yeni dosyada s4 = “BENİM STANDART
YÖNTEM METNİM”, kod metni **yok**; s6 boşken **rozet var**, yazınca rozet kalkıp
**Varsayılana dön** çıkıyor, basınca metin varsayılana dönüp **rozet geri
geliyor**; kırpma 0 · yatay taşma 0 · JS hatası **0**.

### ÖLÇÜM NOTU
“— Yeni dosya —” **açık taslağı** yeniden kullanır; varsayılanı değiştirdikten
sonra o taslak eski metni taşır. Doğrulama için **sayfa yenilenir** (yeni boş
dosya oluşur). Tasarım gereği: açık taslağın metni geriye dönük değiştirilmez.

## YENİ OTURUM DEVRİ (v2.343) — Kayıtlı metinlerim (tıkla-dolsun)

| | |
|---|---|
| Sürüm | **v2.343** |
| Testler | **2692 birim + 556 şema** + rapor (51) + sürüm + tasarım yeşil |
| Açık konu | Yok (varsayılan + kitaplık turu kapandı) |

### Yapılan
- **Rapor bölümü düzenleyicisinde** (yöntem · sınırlılıklar · sonuç) kapalı
  **“Kayıtlı metinlerim (N)”** kutusu: kaydet (kısa ad) · **tek tıkla alana
  ekle** · onaylı sil.
- Depo `akis.textLibrary` (**yalnız tarayıcı**, en çok 40 kayıt / 20.000 krkt).
  **Dosyaya ve pakete girmez** → birleştirme/revizyon çakışması yok.
- Ekleme **mevcut yazma yolunu** kullanır: `data-rse-field` + `input` olayı →
  `persist()`; ayrı model yolu yok. Canlı bağ yok (kopya).

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)
1. **Kütüphane = kopya, referans değil.** Ekleme metni alana yazar; sonrası
   normal düzenlemedir. Canlı bağ olsaydı eski raporların metni sonradan değişir,
   birleştirme/revizyon ayrışırdı.
2. **Dosyaya/pakete girmez.** Kütüphane cihaza özgüdür; paket = dava verisi.
   (Dürüst sınır: başka bilgisayarda kayıt yok.)
3. **Sessiz ezme yok:** alanda **dosyaya kaydedilmiş** metin varsa ekleme
   `askConfirm` ister. Boş alan (yalnızca varsayılan görünüyor) onay istemez —
   çünkü dosyada metin yoktur.
4. **Kişisel beyan kütüphanede olmaz:** tarafsızlık beyanı için v2.341’deki
   “Engel bulunmadığını yaz” düğmesi kullanılır.

### Ölçüm (gerçek Chromium + CDP)
`v2.343` · kutu **(0)** → metin yaz + “Kısa sonuç” adıyla kaydet → **(1)**,
satır “Kısa sonuç”; alan değiştirilip satıra tıklanınca **onay** çıktı, kabul →
alan = “BENİM SONUÇ METNİM”, **önizleme güncellendi**; silme **onay** istedi →
**(0)**; kırpma 0 · yatay taşma 0 · JS hatası **0**.

## YENİ OTURUM DEVRİ (v2.344) — Metin envanteri (danışmanlık için tek liste)

| | |
|---|---|
| Sürüm | **v2.344** |
| Testler | **2692 birim + 556 şema** + rapor (51) + sürüm + tasarım yeşil |
| Belge | `docs/METIN_ENVANTERI.md` — **koddan üretilir** |

### Neden
Kullanıcı “hangi metin nerede, hangisini değiştirebilirim, hukuk danışmanına ne
göstereceğim?” diye sordu; ekranda da kayboldu (“metin alanını bulamadım”).
Metinler 171 `REPORT_TEXT` anahtarı + `LETTER_TEXT` + `DEFAULT_METHOD` içinde
dağınık duruyordu.

### Yapılan
- **`tools/metin-envanteri.mjs`**: app.js’i vm içinde yükleyip `REPORT_TEXT`,
  `LETTER_TEXT`, `DEFAULT_METHOD` değerlerini çıkarır; `docs/METIN_ENVANTERI.md`
  üretir. `--check` modu farkı bildirir.
- Belge bölümleri: **1) Ekranda nerede**, 2) uygulamadan düzenlenebilenler,
  3) 64 uzun metin (grup grup), 4) üst yazı metinleri, 5) kısa etiketler,
  6) **danışmana sorulacaklar** (yöntem, sınırlılık beyanı, hukuki dayanak,
  gizlilik, ASR sınırı, tarafsızlık, sonuç çerçevesi, teslim kontrolü notu).
- `surum-testi` **[10b]**: belge **güncel değilse test KALIR** (belge eskimesi
  sessizce oluşamaz). Yeni sürüm → `VERSION_NOTICES` zorunluluğu (mevcut test).

### DEĞİŞMEZ KURALLAR
1. **Belge elle düzenlenmez**; `node tools/metin-envanteri.mjs` ile üretilir.
2. **Metin değişirse belge yenilenir**; aksi hâlde `surum-testi` kalır.
3. Danışmanlık metni **doğrulanmadan** rapora yazılmaz (mevzuat atfı kuralı).

### Ölçüm
`node tools/metin-envanteri.mjs --check` → **GEÇTİ**; belge **512 satır**,
**65** “Düzenlenebilir?” satırı; `bash tools/test.sh` → hepsi yeşil.

## YENİ OTURUM DEVRİ (v2.345) — Tek düzenleme yeri

| | |
|---|---|
| Sürüm | **v2.345** |
| Testler | **2692 birim + 556 şema** + rapor (51) + sürüm + tasarım yeşil |
| Açık konu | Yok |

### Bulgu (ölçüldü)
Kullanıcı “İnceleme alanında da düzenleyebiliyorum, çift mi?” diye sordu.
Ölçüm: **evet, çift** —
- `#view-questions` (İnceleme → “03 Yöntem ve değerlendirme”) içinde
  `#methodText`, `#limitationsText`, `#conclusionText` textarea’ları vardı;
- Rapor → **Bölüm düzenle** aynı üç alanı yazıyordu.
Ayrıca **görüntü çelişkisi**: İnceleme’de `limitationsText/conclusionText`
`|| ''` ile **boş** görünürken rapora v2.342’deki **varsayılan cümle**
basılabiliyordu (yöntem alanı ise varsayılanı gösteriyordu).

### Yapılan
- İnceleme’deki üç textarea **kaldırıldı**; yerine `.single-home-note`
  (açıklama + 3 yönlendirme düğmesi). **“Mesleki sınır” kutusu korundu.**
- `[data-open-report-section]` → `switchView('report')` +
  `setReportEditSection(key)`.
- `populateQuestionsForm` / `readQuestionsForm` artık bu metinleri okumaz/yazar.
- Sekme ipucu: “Rapor görünümünde düzenlenir”.

### DEĞİŞMEZ KURAL (bu sürümde doğdu)
**Bir metnin TEK düzenleme yeri olur.** Aynı alanı iki görünümde düzenlenebilir
bırakmak, biri boş/varsayılan gösterirken diğeri dolu gösterebildiği için
“çelişki” üretir. İkinci yer gerekiyorsa **salt okunur + yönlendirme** olur.

### Ölçüm (gerçek Chromium + CDP)
`v2.345` · Yöntem sekmesinde **textarea 0**, not var, 3 düğme, “Mesleki sınır”
kutusu duruyor; “İnceleme yöntemini aç ›” → `dataset.view='report'`, düzenleyici
açık (`methodText` dolu); kırpma 0 · yatay taşma 0 · JS hatası **0**.

## YENİ OTURUM DEVRİ (v2.347) — Rapor dili: bilirkişi anlatımı

| | |
|---|---|
| Sürüm | **v2.347** |
| Testler | **2718 birim + 556 şema** + rapor (52) + sürüm + tasarım yeşil |
| Belge | `docs/METIN_ENVANTERI.md` (koddan; §9 danışman listesi) |

### Neden
Kullanıcı talimatı: rapor **yazılımın yaptıklarını sıralayan teknik belge** değil,
**bilirkişinin kendi incelemesini anlatan** metin olmalı. ASR/model/embedding gibi
terimler ana anlatımın zorunlu dili olmamalı; yapılmayan iş yazılmamalı.

### Yapılan (metinler)
- `DEFAULT_METHOD`: **birinci kişi**; SHA-256 **koşullu** (“hesaplanmışsa …
  hesaplanmamışsa belirtilir”).
- `asrIntro/asrLocal/asrVerify`: jargon çıktı; **kontrol durumu kanıt tablosuna**
  bağlandı (“kontrolü tamamlanmamış bölümler onaylanmış sayılmaz”). Bölüm başlığı
  **İNCELEME VE ÇÖZÜMLEME YÖNTEMİ** (schema).
- `speakerMethodNote`: “anonim kümeleme” → **ön gruplama/yazılım desteği**;
  `speakerCodeNote`: tek S/K açıklaması + “kimlik tespiti değildir”;
  `speakerFootnote`: yalnız süre/aralık.
- `integrityNote`: **“yardımcı olur; tek başına kanıtlamaz”**.
- `physicalNoIndexWarning`: “mahkemece sayılmadı” iddiası → **bilinmiyor**.
- `physicalSignatureNote`: imza/nüsha **merciin işleyişine** bırakıldı.
- `warnHallucination`: “elle doldurulmalıdır” → **ses kaydından değerlendirme**.
- `embeddedIntro`: “cihaz beyanı” → **dosyaya gömülü metadata**.
- `levelIntro`: **tahmini** düzey; “kalibre edilmiş ölçüm değildir”.
- `werIntro`: “otomatik çıktı” → **yazılımın ürettiği ilk metin**.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)
1. **Raporun anlatıcısı bilirkişidir.** Ana metin birinci kişi olabilir; “sistem/
   otomatik olarak yaptı” dili varsayılan değildir.
2. **Jargon ana anlatıma zorunlu değil:** ASR · yapay zekâ · model çıktısı ·
   diarizasyon · embedding · pipeline · otomatik ön atama. Teknik kayıtta ve
   gerektiğinde kullanılabilir (ör. asr/tech/qc bölümleri).
3. **Yapılmayan iş yazılmaz:** SHA-256, doğrulama, sayım, imza, kümeleme
   iddiaları **koşullu**; bilinmeyen “bilinmiyor”.
4. **Kontrol durumu gerçek:** onaylanmamış bölüm “onaylandı” sayılmaz; kanıt
   tablosu esastır.
5. **Tekrar yok:** S/K açıklaması tek yerde; aynı sınır cümlesi iki bölümde
   yinelenmez.
6. **Ürün adı yok:** rapor metinlerinde “uygulama/AKİS” geçmez (mevcut test).

### Ölçüm
`bash tools/test.sh` yeşil; gerçek Chromium: rapor önizlemesinde yeni yöntem
cümlesi **var**, eski “her dosyanın SHA-256 özeti hesaplanır” **yok**, jargon
**yok**; JS hatası **0**.

## YENİ OTURUM DEVRİ (v2.348–v2.349) — Metinler düzenlenebilir + dil tamamlandı

| | |
|---|---|
| Sürüm | **v2.349** |
| Testler | **2742 birim + 556 şema** + rapor (53) + sürüm + tasarım yeşil |
| Açık konu | 7 ölü metnin kanıtlı silinmesi; dosya bazında kapsam/dayanak alanı (gerekirse) |

### v2.348 — 15 metin düzenlenebilir (global varsayılan)
- `TEXT_DEFAULT_ITEMS` (15) **tek kaynak**; `USER_DEFAULT_FIELDS` bundan türetilir.
  Kapsam: yöntem · sınırlılık · sonuç · **kapsam beyanı** · **hukuki dayanak** ·
  **gizlilik** · bütünlük notu · yazılım desteği (4) · WER · seviye · teslim
  kontrolü · gömülü metadata.
- Üç çıktı `defaultTextFor(key)` okur; metin **dosyaya yazılmaz**, bölümü açık
  **tüm** raporlarda kullanılır (panelde açıkça yazar).
- Panel: tek metin sıfırlama (onaylı), hukuki metin uyarısı, teknik grup katlanır.
  **Tarafsızlık beyanı kapsam dışı** (kişisel beyan).
- Test: `birim [171]`, `rapor` Senaryo 53, `tasarim [2dp]`.

### v2.349 — Dil tamamlama (7 ifade)
`asrNone` · `acqIntro` · `integrityIntro` · `summaryIntro` ·
`deliveryCheckNote` · `speakerCodeConflict` · `asrHeaders` düzeltildi
(jargon, kanıt iddiası, zorunluluk dili). Test: `birim [172]`.

### DEĞİŞMEZ KURALLAR
1. **Global varsayılan ≠ dosya metni.** Varsayılan dosyaya yazılmaz; dosyaya özel
   metin yalnız `methodText/limitationsText/conclusionText` (+ beyan) alanlarında.
2. **Global metin değişince eski dosyaların çıktısı da yeni metinle basılır** —
   panelde uyarı var; metin geri alınabilir (“varsayılana döndür”).
3. **Hukuki metinlerde doğrulanmamış atıf yasak**; uyarı panelde durur.
4. Yeni bir katalog metni eklerken: `TEXT_DEFAULT_ITEMS` + render sitesi
   (`defaultTextFor`) + `birim [171]`/`[172]` + envanter yenileme.

### ÖLÇÜM
`node tools/metin-envanteri.mjs --check` **GEÇTİ** (1030 satır, v2.349);
`bash tools/test.sh` yeşil.

## YENİ OTURUM DEVRİ (v2.350–v2.351) — Boş tablo, göç, demo paketi

| | |
|---|---|
| Sürüm | **v2.351** |
| Testler | **2746 birim + 556 şema** + rapor (54) + sürüm + tasarım yeşil |
| Demo | `sample_data/demo/AKIS_Demo_Kurgusal.akis` (kurgusal, ≈2,7 MB) |

### v2.350 — Boş tablo ve eski yöntem metni
- **Veri yoksa tablo basılmaz:** envanter/köken/konuşmacı/EK-2/EK-3 yalnız
  “kayıt yok” cümlesi; `—` satırları ve ZWSP kaldırıldı; üç çıktı aynı
  (`rapor` Senaryo 54).
- **`asr`:** yazılım desteği yoksa yalnız `asrNone`; “yararlandım” ve doğrulama
  cümlesi basılmaz.
- **`PREV_DEFAULT_METHOD`:** düzenlenmemiş eski yöntem metni yeni anlatıma
  çevrilir (`birim [173]`).
- KURAL: **satır yoksa tablo yok**; başlık satırını da basmayın. Boş hücreye
  görünmez karakter koymayın.

### v2.351 — Kurgusal demo paketi
- Paket: 2 gerçek WAV, 12 bölüm (onaylı · belirsiz · bekleyen · anlaşılmadı),
  S/K eşleştirmesi, 3 soru, köken, fizikî teslim/iade, üst yazı.
- **Kurgusal**: kişi/dosya/konuşmalar örnektir; gerçek veri değildir.
- `.gitignore` `*.akis` kuralına **`!sample_data/demo/*.akis`** istisnası.
- Test: `surum-testi [10c]` (9).
- Gerçek tarayıcıda açıldı: 2 kayıt, ses 47,7 sn, 7 bölüm (m1), rapor 19.887
  karakter, diyalog/K1/belirsiz/teslim kontrolü var, ZWSP ve `—` satırı yok,
  JS hatası 0.

### DERS
Kullanıcının “boş dosya” çıktısı **eski ayarlarla** üretilmişti (18 bölüm,
eski yöntem metni, boş tablolar). Güncel kodla yeniden üretmek gerçek durumu
gösterdi; sorunların bir kısmı eski kayıt, bir kısmı gerçek hataydı. **Ayrım
ölçümle yapılır:** aynı senaryoyu güncel kodla üret, iki çıktıyı karşılaştır.

## YENİ OTURUM DEVRİ (v2.352) — Okunmayan ipucu satırı + ölçüm tuzağı

| | |
|---|---|
| Sürüm | **v2.352** |
| Testler | `bash tools/test.sh` → 2746 birim + 556 şema + rapor/sürüm/tasarım yeşil |
| Açık konu | Ölü kod temizliği (v2.353 adayı); ayrıntısı aşağıda |

### Ne yapıldı
- `assets/app.css` → `.upload-zone.compact small` metin rengi **ham hex**
  (`#9aa6b2`) taşıyordu. Okuma katmanının `.upload-zone small` token kuralı
  (0,1,1) bu kuraldan (0,2,1) **zayıf** olduğu için ezemiyordu.
- Ölçüm (gerçek Chromium, 11 px, hesaplanan renk): açık **2.48:1**, sepya
  **2.30:1** (AA altı) → `var(--ink-3)` ile **5.93 / 6.11**; koyu 6.44 (değişmedi).
- Test: `tasarim [2dq]` — kural token rengi kullanmalı, ham hex taşımamalı,
  token üç temada AA üstü olmalı. Düzeltme yokken **2 kontrol KALDI**.

### DEĞİŞMEZ DERS: tema denetiminde `data-theme` BOYAMADAN ÖNCE uygulanır
Bu turda önce yanlış bir "koyu temada beyaz üzerine beyaz" bulgusu çıktı.
Sebep ölçüm hatasıydı: `data-theme` sayfa yüklendikten **sonra** değiştirildi;
`--virtual-time-budget` altında CSS `transition` ilerlemediği için geçişin
**başlangıç** değeri (açık tema beyazı) ölçüldü. Doğrusu:
`localStorage.setItem('akis.theme', …)` → sayfayı **yeniden yükle** → ölç.
Ekran görüntüsüyle doğrulamadan "kontrast hatası" yazmayın.

### SIRADAKİ İŞ (v2.353'te YAPILDI — aşağıdaki devir notuna bakın)
Yalnız **testlerde** yaşayan 9 ölü fonksiyon: `buildExportPlan`,
`isEmptyWorkspace`, `saveCaseNow`, `isHumanApproved`, `profileById`,
`karaokeSentences`, `activeSentenceIndex`, `segmentSilenceFlag`, `isDefaultText`.
**Riskli olan `buildExportPlan`:** AGENTS.md "paket yolu eklerken bu beş
fonksiyondan geçin" diyor ama canlı yol `exportPlanFor` (kapsam/`scope` taşıyan
sürüm). Belgeyi de düzeltin; yoksa v2.124 sınıfı "kapsam kaybı" geri gelir.

## YENİ OTURUM DEVRİ (v2.353) — Ölü kod temizliği (davranış değişmedi)

| | |
|---|---|
| Sürüm | **v2.353** |
| Testler | `bash tools/test.sh` → 2724 birim + 556 şema + rapor/sürüm/tasarım yeşil |
| Ölçüm | Gerçek Chromium (CDP, gerçek zaman): demo paketi içe aktarıldı, 7 bölüm, **Paket oluştur** kapsam diyaloğu açıldı (`1 dosya + ses kayıtları`), **JS hatası 0** |

### Ne yapıldı
- Yalnız testlerde yaşayan **9 fonksiyon** silindi: `buildExportPlan` ·
  `isEmptyWorkspace` · `saveCaseNow` · `isHumanApproved` · `profileById` ·
  `karaokeSentences` · `activeSentenceIndex` · `segmentSilenceFlag` ·
  `isDefaultText` (+ yalnız onlara hizmet eden `SENTENCE_GAP`/`SENTENCE_END`).
- Testler **canlı karşılıklara** çevrildi: `exportPlanFor(..., 'all')`,
  `casesForStorage(...).length === 0`, `isHumanApprovedReview(segReview(s))`,
  `asrProfile(id)`. `birim`: 2746 → **2724** kontrol (22'si ölü koda aitti).
- **Belge tuzağı kapatıldı:** AGENTS.md paket sözleşmesi artık
  `exportPlanFor(cases, activeCaseId, scope)` diyor; "kapsam (`scope`)
  taşımayan plan fonksiyonu yazma" kuralı eklendi (v2.124 hatasının kaynağı).

### DEĞİŞMEZ DERS: "testte var" ≠ "üretimde kullanılıyor"
Bir fonksiyonun yalnız `typeof X === 'function'` testiyle ayakta tutulması onu
canlı tutmaz; **ölü kodu gizler**. Yeni test yazarken **davranışı** sınayın ve
çağrı yerini `grep` ile doğrulayın. Ölü kod silinirken testler canlı karşılığa
taşınır (davranış kaybı olmadan).

### ÖLÇÜM NOTU (CDP, tekrar kullanılabilir)
Bu ortamda `--virtual-time-budget` + `--dump-dom` **IndexedDB/paket içe
aktarma** gibi gerçek zamana bağlı akışları tamamlatmıyor (init yarıda kalır,
"boş ekran" görünür). Güvenilir yol: `chromium --remote-debugging-port=9333` +
Node 24'ün yerleşik `WebSocket`'i ile CDP (`Runtime.evaluate`, `awaitPromise`).
Geçici sürücü `/tmp`'de tutulur, depoya girmez.

## YENİ OTURUM DEVRİ (v2.354) — Dava konusu ≠ inceleme konusu

| | |
|---|---|
| Sürüm | **v2.354** |
| Testler | `bash tools/test.sh` → 2730 birim + 556 şema + rapor (55) + sürüm + tasarım yeşil |
| Ölçüm | Gerçek Chromium + CDP, demo paketi, 4 rapor türü: künye ve §1 **ayrı metinler**; boşaltınca satır kalkıyor; yenileme sonrası **korundu**; JS hatası **0** |

### Ölçülen hata (kullanıcı, canlı inceleme)
Hukuk türünde **künyede "DAVA KONUSU"**, gövdede **"İnceleme konusu:"** olarak
**aynı cümle** yazılıyordu (demo raporunda metin 4 kez geçiyordu: künye + §1 +
EK-5 + kapsam cümlesi). Tek alan (`subject`) iki kavramı taşıyordu.

### DEĞİŞMEZ MODEL (bu sürümde doğdu)
| Kavram | Alan | Nerede | Etiket |
|---|---|---|---|
| Dava/soruşturma/takip konusu | `subject` | Rapor künyesi | **türe göre** (`REPORT_TYPES[t].subject`) |
| İnceleme konusu (teknik görev) | `examinationSubject` (**yeni**) | §1 tek satır | `İnceleme konusu:` |
| Görevlendirme kapsamı ve sınırları | `assignmentScope` | §1 birinci paragraf | Görevlendirme kapsamı ve sınırları |

Kurallar:
1. **Boş alan satır üretmez:** `examinationSubject` boşsa §1'de satır **hiç
   yazılmaz**; `subject`'e **geri düşme (fallback) YOK** — düşme, düzeltilen
   tekrarı geri getirirdi.
2. **Üç çıktı tek kaynak:** `examinationSubjectText(c)`; HTML/DOCX/UDF aynı
   cümleyi basar (`rapor` Senaryo 55 üçünü de sınar).
3. **Etiket tutarlılığı:** künye etiketi türe göre değişiyorsa gövde etiketi
   sabit "İnceleme konusu" OLMAMALI; ayrı alan ya da türe uygun etiket gerekir.
   Aynı hata sınıfı: form etiketi "DAVA KONUSU" iken yer tutucunun
   "İncelemenin konusunu…" demesi (düzeltildi: yer tutucu türe göre).
4. **Tek düzenleme yeri:** iki alan da **Dosya bilgileri** çekmecesinde;
   İnceleme görünümünde yalnız yönlendirme satırı var.
5. **Terim birliği:** "Görevlendirme / inceleme talebi" adı kaldırıldı →
   **"Görevlendirme kapsamı ve sınırları"** (sekme + alan aynı ad).
6. **EK-5** satırı **"Konu (künye)"**; gövdedeki inceleme konusuyla karışmaz.
7. Birleştirme/önizleme `examinationSubject` alanını **ayrı** taşır (çakışma
   bildirilir); `subject` ile karıştırılmaz.

### Demo paketi
`sample_data/demo/AKIS_Demo_Kurgusal.akis` güncellendi: künye
*"Depozito iadesi talebi (kira ilişkisi)"*, §1 *"İki ses kaydındaki konuşmaların
metne aktarılması ve depozito iadesine ilişkin beyanların tespiti"*, kapsam
metni sınırları anlatır. Kullanıcı demo üzerinden iki alanı ayırt edebilir.

### ÖLÇÜM NOTU
CDP ile ölçerken **içindekiler** de aynı başlığı taşır; §1 gövdesini bulmak için
başlığın **son** geçişini (`lastIndexOf`) kullanın. İlk geçiş TOC'tur.

## YENİ OTURUM DEVRİ (v2.355) — Başlık tek kaynak + ölü başlık listesi

| | |
|---|---|
| Sürüm | **v2.355** |
| Testler | 2730 birim + 556 şema + rapor/sürüm/tasarım yeşil |
| Ölçüm | Gerçek Chromium: "1. GÖREVLENDİRME, İNCELEMENİN KONUSU VE SINIRLARI" (gövde + içindekiler), JS hatası 0 |

### Ne bulundu (ölçüldü)
Aynı bölümün **üç adı** vardı: `REPORT_UI_LABELS.s1` (iskelet), 
`REPORT_SECTION_DEFS.s1.title` (rapor) ve **hiç okunmayan**
`REPORT_TEXT.sections` (7 satırlık ikinci başlık listesi) + `REPORT_TEXT.sub51`.
Ölü olanlar silindi; canlı başlık 56.12 diliyle hizalandı.

### DEĞİŞMEZ KURAL
**Bölüm başlığı tek kaynaktan gelir:** `reportSectionTitle(c,key)` →
`REPORT_SECTION_DEFS[].title` (kullanıcı başlığı varsa o). İskelet için kısa
`REPORT_UI_LABELS` kullanılabilir ama **aynı dili** taşımalı; başlıkların ikinci
bir listesini (ör. `REPORT_TEXT.sections`) **tutmayın** — kimse okumaz, sessizce
eski kalır.

### Bilinen borç
`assignment.body` şemada var, hiçbir ekran/çıktı okumuyor (ölü alan). Veri
kaybı riski nedeniyle silinmedi; sıradaki temizlik turunda ya kaldırılmalı ya
"görevlendirme yazısı metni" olarak arayüze bağlanmalı.

## YENİ OTURUM DEVRİ (v2.356) — Çalışma notları (kişisel defter)

| | |
|---|---|
| Sürüm | **v2.356** |
| Testler | 2748 birim + 556 şema + rapor (56) + sürüm + tasarım yeşil |
| Ölçüm | Gerçek Chromium + demo: Alt+N açıyor; not zaman damgalı eklendi (badge 1); **rapor önizlemesinde not YOK**; → Soru sayacı 3→4 (not duruyor); sabitleme; arama; 13 notta liste kayıyor, kırpma yok; paket diyaloğu "1 kişisel not" diyor; silme onaylı; **Ctrl+Z 12→13 geri getirdi**; JS hatası 0 |

### Neden "gözlem defteri" DEĞİL
Uygulamada **"Gözlem işaretleri"** (gürültü, üst üste konuşma…) zaten var. İkinci
bir "gözlem" kavramı terim birliğini bozar. Ad: **Çalışma notları**.

### DEĞİŞMEZ KURALLAR (bu sürümde doğdu)
1. **Not bir BULGU DEĞİLDİR.** Rapora, rapor eklerine, UDF/DOCX/ZIP belge
   çıktısına **kendiliğinden girmez**; `rapor` Senaryo 56 üç çıktıda da
   sızmadığını denetler. Yeni bir çıktı yolu eklerken `notebook` alanını
   **okumayın**.
2. **"GÖZLEM" sütununa yazılmaz.** Gözlem işaretleri ayrı kavramdır.
3. **Tek kaynak birleştirme:** `notebookMergePlan(mine, theirs)`; hem
   `mergeCases` hem `compareCases` bunu kullanır (önizleme = birleştirme).
   Aynı id + farklı metin **çakışma**; sessiz ezme yok.
4. **Paket varsayılanı: notlar dâhil.** Dışa aktarma diyaloğunda
   **"Kişisel çalışma notlarını pakete koyma"** anahtarı vardır;
   `caseWithoutNotebook(c)` yalnız **paket kopyasından** çıkarır, kaydı bozmaz
   ve bildirimde "notlar pakete KONMADI" denir.
5. **Sınırlar:** not metni 4.000 karakter, en çok 500 not; boş not atılır,
   metin kırpılır.
6. **Silme** onay ister + `snapshotForUndo` + `logEvent`.
7. **Yeni panel eklerken geri alma listesini unutmayın:** `undoLast()` bilinen
   panelleri tazeler. v2.356'da not defteri eklenince liste bayat kaldı
   (badge 13, liste 12 — ölçüldü); `renderNotebook()` eklendi. Yeni bir panel
   eklerseniz `undoLast` içine tazelemesini de ekleyin.
8. Kısayol **Alt+N** (tarayıcı kısayolu değil); Esc ve karartma kapatır; aynı
   anda tek çekmece açık (Ayarlar/Dosya/Notlar).

### Bilinen sınır
Notlar **kişisel**dir; paketle paylaşılırsa alıcı görür (anahtar bunun için).
Notların hukuken ibraz edilip edilmeyeceği mesleki usul konusudur; uygulama
yalnız "rapora girmez" sınırını garanti eder, ibraz muafiyeti vaat etmez.

## YENİ OTURUM DEVRİ (v2.357) — Notlar dosya verisidir

| | |
|---|---|
| Sürüm | **v2.357** |
| Testler | 2753 birim + 556 şema + rapor/sürüm/tasarım yeşil |
| Ölçüm | Gerçek Chromium: yalnız not yazılan dosya yenilemeden sonra duruyor (önce kaybolurdu) |

### Ölçülen hata (v2.356)
`isEmptyCase` **notebook'u saymıyordu**. Yeni dosyada yalnız not yazılırsa dosya
"boş" sayılıyor, `casesForStorage` onu eliyor → **kayda yazılmıyor**, pakete ve
arşive girmiyordu (sessiz veri kaybı). Aynı açık `examinationSubject` için vardı.

### DEĞİŞMEZ KURAL
**Kullanıcının yazdığı her şey dosya verisidir.** `isEmptyCase` yeni bir alan
eklerken **güncellenmeli**: dolu not, dolu inceleme konusu, dolu fizikî kayıt
vb. dosyayı dolu yapar. Boş metin (yalnız boşluk) dosyayı doldurmaz — hayalet
dosya üretilmez (v2.109).

### Test yazım dersi
Yeni bir alan eklediğinizde üç yeri birlikte düşünün: (1) şema/normalize,
(2) **`isEmptyCase`** (kayıt/paket/arşiv), (3) rapor/çıktı. Yalnız (1)'i yapmak
"yazdım ama kayboldu" üretir.

## YENİ OTURUM DEVRİ (v2.358) — Notu bölüme bağlama

| | |
|---|---|
| Sürüm | **v2.358** |
| Testler | 2762 birim + 556 şema + rapor (56) + sürüm + tasarım yeşil |
| Ölçüm | Gerçek Chromium + demo: bağlam satırı `ses_01…wav · Bölüm 3 · 00:00:13–00:00:20`; rozet **📝 1**; raporda not **yok**; rozet→defter+vurgu; **Git→view=audio, Bölüm 3**; yenilemede korundu; JS hatası 0 |

### Model
`notebook[]` alanları: `materialId`, `segmentId`, `timecode` (anlık kopya) +
`text`, `pinned`, `by`, `at`, `updatedAt`.

### DEĞİŞMEZ KURALLAR
1. **Bağ kimlikle:** `materialId` + `segmentId`. Bölüm sırası değişse de kopmaz;
   indeks veya zaman metniyle bağ KURMAYIN.
2. **Bölüm silinirse not silinmez:** bağ "Bölüm silinmiş · <timecode>" olur,
   "Git" gösterilmez. Not defteri dosya verisidir (v2.357).
3. **Sayaç = rozet:** `notebooksForSegment` tek kaynak; liste rozeti ve
   (ileride) filtre aynı fonksiyonu kullanmalı.
4. **Rapora girmez:** bağlı not da üç çıktıya sızmaz (`rapor` Senaryo 56).
5. **`scrollIntoView` KULLANMAYIN** (v2.193): üst kapları kaydırır. Defter
   listesinde kaydırma `host.scrollTop` ile hesaplanır (v2.358'de test yakaladı).
6. Birleştirmede aynı not + farklı bağ **çakışma**dır (sessiz seçim yok).

## YENİ OTURUM DEVRİ (v2.359) — Rapor özeti girişi düzenlenebilir

| | |
|---|---|
| Sürüm | **v2.359** |
| Testler | 2771 birim + 556 şema + rapor (57) + sürüm + tasarım yeşil |
| Ölçüm | Gerçek Chromium: Ayarlar'da alan görünür; dosyaya özel metin üç çıktıda; "Varsayılana dön" varsayılanı getirir |

### Kural
**Dosya alanı ile katalog anahtarı ayrışabilir.** Özet girişi dosyada
`report.summaryIntroText`, katalogda `summaryIntro` adıyla durur. Eşleme
`FIELD_DEFAULT_ALIAS` + `defaultTextForField()` ile TEK yerde; yeni bir alan
eklerken eşlemeyi de yazın (yoksa düzenleyici boş varsayılan gösterir).

### Sıra (değişmez)
**dosyaya özel → kullanıcı varsayılanı → kod metni.** Üç çıktı tek fonksiyon
(`reportSummaryIntro(c)`); renderer'larda `REPORT_TEXT.summaryIntro` doğrudan
basılmaz (`tasarim [2du]` bunu denetler).

### DERS (ölçüldü): düz alan yazımı iç içe alana YANSIMAZ
Bölüm düzenleyici `c[field]` (düz) yazar. Yeni alan `report.*` içindeyse
`CASE_MIRROR`'a eşleme **şart**; yoksa yazma sessizce kaybolur (v2.359'da
ölçüldü: önizleme değişmedi). Ayrıca `normalizeCase` göçte düz alanı okumalı:
`report.summaryIntroText || c.summaryIntroText` (`??` boş dizeyi geçirmez).
Yeni bir düzenlenebilir alan eklerken üçlüyü birlikte yapın:
(1) şema + normalize, (2) `CASE_MIRROR`, (3) düzenleyici + üç çıktı.

## YENİ OTURUM DEVRİ (v2.360) — Ayarlar sekmeleri

| | |
|---|---|
| Sürüm | **v2.360** |
| Testler | 2773 birim + 556 şema + rapor/sürüm/tasarım yeşil |
| Ölçüm | 1440×900: tek liste **3.453 px / 4,7 ekran** → Görünüm 1,5 · Metinler 1,8 · Model 1,0 · Depolama 1,0 ekran; arama "gizlilik" → 1 madde açık; JS hatası 0 |

### Neden
Kullanıcı: "her şeyi ayar kısmına doldurduk, orası uzamaya karışmaya başlayacak."
Ölçüm doğruladı: **%59**'u 16 metin listesiydi, %27'si model/depolama.

### Yapı
- `[data-settings-tab]` (4) + `[data-settings-section]`; `applySettingsTab`.
- Tercih **`akis.settingsTab`** (tarayıcı; dosyaya yazılmaz).
- 16 metin: `<details class="dflt-item">` (kapalı) + `#defaultsSearch` →
  `filterDefaultsPanel` yalnız **görünürlük** süzer (metin değişmez).
- Arama metni yeniden çizimde korunur (`defaultsSearchText`).

### DEĞİŞMEZ KURALLAR
1. **Sekme = kısa ekran.** Yeni bir ayar eklerken uygun sekmeye koyun; tek
   sekmeyi 2 ekranın üstüne çıkarmayın (ölçün).
2. **Katlanır madde varsayılan KAPALI**; kullanıcı açtığını görür. Arama
   yalnız görünürlük süzer.
3. **Hiçbir metin taşınmaz/silinmez**; düzen değişir, davranış değişmez.
4. Dinamik üretilen kimlikleri (`#defaultsSearch`) **`surum` REQUIRED_IDS**'e
   koymayın (statik HTML'de yok); `tasarim` app.js üzerinden denetler.

### v2.361'de YAPILDI: "Metinler" Ayarlar'dan çıktı
16 varsayılan metin **ayrı pencere** (`#textsDialog`); girişler: Rapor araç
çubuğu **📄 Metinler** ve Ayarlar bağlantı satırı. Ayarlar **üç sekme**
(Görünüm · Model · Depolama). Eski `akis.settingsTab='texts'` görünüme düşer.
`#defaultsHost` pencereye taşındı; işleyiciler delegasyonda olduğu için
kaydetme/iptal değişmedi. Ölçüm: Ayarlar 1,6 ekran; pencere taşmasız.

## YENİ OTURUM DEVRİ (v2.361) — Rapor metinleri ayrı pencere

| | |
|---|---|
| Sürüm | **v2.361** |
| Testler | 2773 birim + 556 şema + rapor/sürüm/tasarım yeşil |
| Ölçüm | Ayarlar 3 sekme, içerik 1.071 px (1,6 ekran); pencere 16 madde, ekrana sığıyor; arama "özet" → 2; Rapor → 📄 Metinler ile yazılan metin raporda; JS hatası 0 |

### Kural
**Ayarlar = uygulama davranışı** (görünüm · model · depolama). **Rapor içeriği**
(16 varsayılan metin) ayrı pencerede; yeni bir rapor metni eklerken Ayarlar'a
değil bu pencereye bağlayın (`#defaultsHost` + `TEXT_DEFAULT_ITEMS`).

### Teknik
`#textsDialog` (native `<dialog>`), `openTextsDialog()` iki girişten çağrılır;
`#defaultsHost` pencerenin içinde; tüm işleyiciler `#defaultsHost` delegasyonunda
(kaydetme/iptal aynı). Sekme tercihi göçü: bilinmeyen/eski değer → 'appearance'.

### Dinamik kimlik dersi (yine)
`#defaultsSearch` gibi JS'in ürettiği kimlikleri `surum` REQUIRED_IDS'e
koymayın; statik HTML'de yoktur. `tasarim` app.js üzerinden denetler.

## YENİ OTURUM DEVRİ (v2.361 → sonraki) — ODAK: RAPOR SAYFASI

> Kullanıcı: *"Artık tamamen rapor sayfasına odaklanabiliriz; yeni oturumda tek
> odak noktamız rapor."* Aşağıdaki not o oturumun başlangıç bağlamıdır.

| | |
|---|---|
| Sürüm | **v2.361** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **2773 birim + 556 şema** + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` = **deb11ab** (push edildi) |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = **2.361** |
| Açık konu | **Rapor sayfası** (aşağıdaki ölçüm ve adaylar) |

### Bu oturumda yapılanlar (v2.352–v2.361)

| Sürüm | Konu | Koruyan test |
|---|---|---|
| v2.352 | Biçim ipucu satırı okunur (ham hex → token; 2.48/2.30 → 5.93/6.11) | `tasarim [2dq]` |
| v2.353 | Ölü kod: 9 fonksiyon + `REPORT_TEXT.sections/sub51` silindi | `birim [32/37]` güncellendi |
| v2.354 | **Dava konusu ≠ inceleme konusu** (`examinationSubject`) | `birim [174]`, `rapor 55`, `tasarim [2dr]` |
| v2.355 | §1 başlığı 56.12 dili; başlığın ikinci kaynağı kaldırıldı | `birim` başlık |
| v2.356 | **Çalışma notları** (📝 / Alt+N; rapora girmez) | `birim [175]`, `rapor 56`, `tasarim [2ds]` |
| v2.357 | Yalnız notlu dosya kaydedilir (`isEmptyCase`) | `birim [176]` |
| v2.358 | Notu bölüme bağlama (↪ Git, 📝 rozet) | `birim [177]`, `tasarim [2dt]` |
| v2.359 | Rapor özeti girişi düzenlenebilir (16. metin) | `birim [178]`, `rapor 57`, `tasarim [2du]` |
| v2.360 | Ayarlar sekmeleri (3.453 px → sekme başına 1,0–1,8 ekran) | `tasarim [2dv]` |
| v2.361 | Rapor metinleri ayrı pencere (`#textsDialog`) | `tasarim [2dv]`, `surum` |

### Bu oturumda doğan DEĞİŞMEZ kurallar
1. **Not bir BULGU DEĞİLDİR.** `case.notebook` rapora/eklerine/UDF-DOCX-ZIP'e
   girmez (`rapor 56`). "Gözlem" sözcüğü gözlem işaretlerine ayrılmıştır.
2. **Kullanıcının yazdığı her şey dosya verisidir.** Yeni alan eklerken
   `isEmptyCase` güncellenir (yoksa "yazdım ama kayboldu").
3. **Düz alan ↔ iç içe alan eşlemesi** (`CASE_MIRROR`) yoksa düzenleyici yazımı
   sessizce kaybolur (v2.359'da ölçüldü).
4. **Bölüm başlığı tek kaynak:** `reportSectionTitle` → `REPORT_SECTION_DEFS`.
   Başlıkların ikinci listesini tutmayın.
5. **Ayarlar = uygulama davranışı** (Görünüm · Model · Depolama). Rapor içeriği
   (16 varsayılan metin) ayrı pencerede (`#textsDialog`).

### Ölçüm tuzakları (bu oturumda yaşandı)
- **Tema denetimi:** `data-theme` **boyamadan önce** uygulanmalı (localStorage →
  yenile); sonradan değiştirmek CSS transition'ı dondurup yanlış "beyaz üzerine
  beyaz" okuması üretir.
- **`--virtual-time-budget` + `--dump-dom`** IndexedDB/paket akışlarını
  tamamlatmaz (init yarıda kalır). Güvenilir yol: `chromium
  --remote-debugging-port` + Node 24 yerleşik `WebSocket` ile CDP.
- **Alan değişikliği `input` olayıyla** işlenir; yalnız `change` göndermek
  "çalışmıyor" yanılgısı verir.
- **`scrollIntoView` kullanılmaz** (üst kapları kaydırır; v2.193).
- **Dinamik kimlik** (`#defaultsSearch`) `surum` REQUIRED_IDS'e konmaz.

### RAPOR SAYFASI — bugünkü ölçüm (1440×900, demo, gerçek Chromium)
| Ölçüm | Değer |
|---|---|
| `#view-report` görünür / içerik | **717 px / 13.695 px** (kaydırır) |
| Kâğıt | 900 × 13.438 px · 20.681 karakter |
| İskelet | 232 px genişlik · **40 satır** · kendi içinde kayar |
| Sağ panel | "Düzenle" modunda **gizli** (tasarım), "Kontrol"de açılır |
| Bölüm | **32** tanım · varsayılan **22 açık** |
| Araç çubuğu (DOM) | **13 düğme** (Rapor/Üst yazı, 📄 Metinler, Düzenle/Kontrol, kontrol çipi, Tam ekran, DOCX, UDF; üst yazı düğmeleri ikinci modda) |
| Hazırlık | "Teslim 10.12.2026 · 13 gün kaldı…" |

### SIRADAKİ İŞ — yalnız rapor sayfası (öneri sırası)
**Önce ölç, sonra yerleştir.** Her adım tek sürüm; üç çıktı eşitliği
(`rapor-tutarlilik-testi`) ve "rapor bilirkişi adına" kuralı bozulmaz.

1. **Araç çubuğu sadeleşmesi:** 13 düğme; hangileri birinci ekranda görünür,
   hangileri ikinci moda saklanabilir? Ölçüt: rapor okurken göz yormayan tek
   satır; çıktı düğmeleri (UDF/DOCX) birincil kalır.
2. **İskelet 40 satır / 32 bölüm:** ek (annex) satırları ve alt ağaç gürültüsü;
   gruplama/katlama ile kısaltma (filtre zaten var).
3. **"Kontrol" paneli:** 2 kontrol maddesi → engelleyen/uzman/öneri grupları
   okunur mu; satıra tıklayınca ilgili yere gitme.
4. **Uzun belge gezinmesi:** 19 ekranlık kâğıtta bölüm içi gezinme (iskelet ↔
   belge eşlemesi, "bu bölüme git"), sayfa/sürekli mod ilişkisi.
5. **Yazdırma sadakati:** `@page` + satır bölünmezliği + ekler yeni sayfa
   (v2.258/v2.259) gerçek yazdırmada doğrulanmalı (PDF çıktısıyla).

**Yapmayın:** kâğıdı `contentEditable` yapmak (üç çıktı eşitliği bozulur);
rapor metnine ürün adı/sürüm eklemek; ölçülmemiş değeri tabloya yazmak.

### İlk komutlar
```bash
bash tools/test.sh
git log --oneline -5; git status --short
curl -s https://azmisahin-gov.github.io/akis/version.json
```
Beklenen: **2773 + 556** yeşil; sürüm **2.361**; git temiz.

## YENİ OTURUM DEVRİ (v2.362) — Rapor çıktısı ve ekran düzeni planı

| | |
|---|---|
| Sürüm | **v2.362** |
| Testler | `bash tools/test.sh` → 2773 birim + 556 şema + rapor/sürüm/tasarım yeşil |
| Ölçüm | Gerçek Chromium `Page.printToPDF`: **1 → 23 sayfa** (286 KB → 4,99 MB), JS hatası 0 |

### v2.362 — Yazdırma/PDF çok sayfalı (TAMAMLANDI)

**Ölçülen hata:** Kâğıt ~13.436 px (~11 A4) ama `printToPDF` **1 sayfa**.
Kök: `body`, `.app-shell`, `.main-area`, `#view-report`
`height:900px; overflow:hidden` ile kilitliydi; yazdırma CSS'i sıfırlamıyordu.
Tek-sayfa modunda `.report-page-window` satır içi yükseklik + kâğıtta
`translateY` de temizlenmiyordu.

**DEĞİŞMEZ KURAL (yazdırma):** Yazdırmada HİÇBİR ata kutu yükseklik dayatmaz,
kaydırma kırpmaz, transform uygulamaz. Sayfa kırılması `@page` + normal akışa
bırakılır. Kural `reading-layer.css` **sonundaki** `@media print` bloğunda;
app.css yazdırma kurallarını ezer. Sabit alt bilgi akışa alınır.

**Nöbetçi değişikliği:** `tasarim [8]` CSS borç sayaçları **medya-duyarlı**:
`@media print` ekran borcuna sayılmaz (ayrı medya; satır içi stili ve ekran
`!important`'ını ezmek zorundadır). Yazdırma için ayrı sınır: `!important <= 6`
(şu an 4). Yeni `[2dw]` yazdırma bloğunu denetler.

### Bu oturumda kullanıcının verdiği yön (sıradaki işler)

1. **PDF/çıktı:** tarayıcı PDF'i artık çalışıyor. Sonraki adım **kapak + üst/alt
   bilgi standardı** (v2.363) ve **DOCX LibreOffice uyumu** (v2.364). Uygulama
   içi tek tık PDF (pdf-lib + gömülü Türkçe font) ayrı ve büyük karar.
2. **Kapak (kullanıcının istediği):**
   `T.C.` · `[GÖREVLENDİREN MAHKEMENİN TAM ADI]` · `ADLİ VE KRİMİNALİSTİK
   İNCELEMELER` · `BİLİRKİŞİ RAPORU` · `56.12 – SES KAYITLARININ METİN HALİNE
   DÖNÜŞTÜRÜLMESİ` · `(Yargı mercilerince Ses ve Görüntü Bilişim Sisteminin
   Kullanılması Hariç)`. Şu an `UZMANLIK ALANI · 56.12` kısa kodu ve farklı alt
   başlık var; içerik `DEFAULT_EXPERT_FIELD`'de mevcut, **yerleşim** değişecek.
3. **Rapor ekranı düzeni (v2.365):** “Ön bölüm alanları” (iskelette
   `Alanlar · N/M`) ile sağ paneldeki “Rapor alanları · tablo sütunları” iki
   ayrı yer → **tek yerde** toplanacak. Sağ panel **çekmeceye** alınacak
   (“Metinler” penceresi deseni). Sol iskelet tek kaydırma olacak; Düzenle/Kontrol
   mod değişimi kâğıdı 142 px yatay kaydırıyor (ölçüldü: `232/786/292` ↔
   `232/1090`), bu zıplama giderilecek.
4. **Bilinen ölçümler:** ≤900 px'te iskelet belgenin ALTINDA (900'de üst kenar
   13.988 px); araç çubuğu 89/122/212 px (1440/900/600); “Tam ekran (F)” ipucu
   var ama F raporda bağlı değil.

### İlk komutlar
```bash
bash tools/test.sh
git log --oneline -3; git status --short
```

## YENİ OTURUM DEVRİ (v2.363) — Kapak + üst/alt bilgi

| | |
|---|---|
| Sürüm | **v2.363** |
| Testler | `bash tools/test.sh` → 2779 birim + 556 şema + rapor/sürüm/tasarım yeşil |
| Ölçüm | Gerçek Chromium + `pdfplumber`: PDF 24 sayfa; üst bilgi her sayfada y=46, içerik y=124 (çakışma yok) |

### Kapak (DEĞİŞMEZ SIRA)
`T.C.` · mahkeme tam adı · `ADLİ VE KRİMİNALİSTİK İNCELEMELER` · `BİLİRKİŞİ
RAPORU` · `56.12 – SES KAYITLARININ METİN HALİNE DÖNÜŞTÜRÜLMESİ` · `(Yargı
mercilerince Ses ve Görüntü Bilişim Sisteminin Kullanılması Hariç)`.

- **TEK KAYNAK:** `coverLines(c)` (app.js) + `expertFieldParts` /
  `REPORT_FAMILY_LINE` (schema.js). Üç üretici aynı satırları basar; kapak
  metnini başka yerde yeniden biçimlendirmeyin.
- Eski `paper-topline` (tür etiketi + kısa uzmanlık kodu) kapaktan KALDIRILDI.
- `DEFAULT_EXPERT_FIELD` yeni metin; `normalizeExpertField` eski tam metni ve
  `56.12` kısa kodunu yeni metne çeker. `expertFieldParts` de normalize eder
  (normalizeCase’ten geçmemiş kayıt/test de tam satırı görür).

### Üst/alt bilgi (DEĞİŞMEZ YERLEŞİM)
- **Üst:** sol `Dosya No: …` · orta boş · sağ `BİLİRKİŞİ RAPORU`.
- **Alt:** orta `Sayfa N / M`.
- DOCX: 3 sütun **tablo** (`w:tblLayout fixed`, `contentTw`); `PAGE` +
  `NUMPAGES`. Word/LibreOffice’te gerçek sayfa numarası.
- Tarayıcı PDF: `#reportPreview` `thead`/`tfoot` tablosuna sarıldı; başlık
  **her sayfada** içeriğin üstünde (çakışma yok). Ekranda tablo düzeni kapatılır
  → görünüm birebir aynı (898 px).

### DEĞİŞMEZ SINIR (ölçüldü)
Tarayıcı yazdırmasında CSS `counter(page)`/`counter(pages)` **çalışmaz**
(“0/0”). Bu yüzden tarayıcı PDF’inde sayfa numarası uygulamadan gelmez; gerçek
numara DOCX (Word/LibreOffice) alanındadır. UDF şablonunda üst/alt bilgi içeriği
doğrulanmadı → UDF’e eklenmedi (kapak metni girer).

### Sıradaki iş
1. **v2.364 — DOCX LibreOffice uyumu** (kullanıcı gerçek dosyayla denemeli).
2. **v2.365 — Rapor sağ panelini tek çekmecede toplama** (alan görünürlüğü +
   tablo sütunları + biçim + ekler + revizyon).
3. Yerleşim sabitliği (kâğıt 142 px zıplaması), ≤900 px iskelet, araç çubuğu.
4. Gerekirse **uygulama içi PDF** (pdf-lib + Türkçe font) — sayfa numarası için.

## YENİ OTURUM DEVRİ (v2.364) — Word/OpenOffice uyumu

| | |
|---|---|
| Sürüm | **v2.364** |
| Testler | `bash tools/test.sh` → 2779 birim + 556 şema + rapor/sürüm/tasarım yeşil |
| Ölçüm | LibreOffice 25.2.3.2 ile DOCX→PDF: **26 sayfa**; üst/alt bilgi doğru; sağa taşma 0 |

### Yapılan
- `word/settings.xml`: `compatibilityMode 15` + `themeFontLang tr-TR`; içerik
  türü (`/word/settings.xml`) + ilişki (`rId4`) eklendi.
- `w:updateFields` **kullanılmadı** (Word’de gereksiz alan güncelleme uyarısı).
- Test: `tasarim [2dy]`.

### Ölçüm (tekrar üretilebilir)
```bash
# DOCX üret (uygulamadan indir) → LibreOffice ile PDF
sudo apt-get install -y --no-install-recommends libreoffice-writer poppler-utils
LD_LIBRARY_PATH=/usr/lib/libreoffice/program soffice --headless \
  -env:UserInstallation=file:///tmp/lo-profile --convert-to pdf --outdir /tmp/x /tmp/x/a.docx
pdftoppm -png -r 90 -f 1 -l 2 /tmp/x/a.pdf /tmp/x/page
```
Sonuç: üst bilgi y=28, gövde y=47, alt bilgi y=807; `Sayfa N / 26`; taşma 0.

### Dürüst sınır
Word bu ortamda yok; Word yolu standart OOXML’e dayanır, kullanıcı doğrulamalı.
TNR yoksa LibreOffice `DejaVu Serif` kullanır (sayfa sayısı değişir).

### Sıradaki iş — v2.365 (kullanıcının açık isteği)
**Rapor sağ panelini tek “Rapor ayarları” çekmecesinde toplama:**
- “Ön bölüm alanları” (iskelette `Alanlar · N/M`) + sağdaki “Rapor alanları ·
  tablo sütunları” + biçim + ekler + teknik + künye + revizyon **tek yerde**.
- “Metinler” penceresi deseni (ayrı çekmece/pencere).
- Kâğıdın mod değişiminde **142 px yatay zıplaması** giderilecek
  (ölçüm: `232/786/292` ↔ `232/1090`).
- Sol iskelet tek kaydırma/odak; ≤900 px'te iskelet belgenin üstünde.

## YENİ OTURUM DEVRİ (v2.365) — Rapor ayarları sekmeleri

| | |
|---|---|
| Sürüm | **v2.365** |
| Testler | `bash tools/test.sh` → 2779 birim + 556 şema + rapor/sürüm/tasarım yeşil |
| Ölçüm | Gerçek Chromium 1440×900: kâğıt **754 px sabit**, 25 alan + 63 sütun, taşma/JS 0 |

### Yapılan
- `#reportSide` sekmeli: **Kontrol · Alanlar · Biçim · Ekler · Revizyon**;
  tercih `akis.reportSideTab` (tarayıcı).
- `reportFieldGroupsHtml(c)` — künye/özet alan görünürlüğü + tablo sütunları
  **tek panelde**. İskeletteki `frontFieldsHtml`/`Alanlar · N/M` kaldırıldı.
- `#reportWorkspace` 3. sütun **sabit 300 px**; `[data-mode]` sütun değiştirmez.
  Düzenleyici açılınca `[data-edit="open"] .report-side { display:none }` ile
  aynı sütunu kaplar → kâğıt yatay zıplamaz.
- Alan kutusu `#reportSide` change delegasyonunda (`data-report-field`).

### DEĞİŞMEZ KURALLAR
1. **Alan/sütun ayarı TEK yerde** (rapor ayarları → Alanlar). İskelete ikinci bir
   alan listesi koymayın.
2. **Kâğıt genişliği moda/seçime göre değişmez.** Yeni bir panel eklerken
   3. sütunu paylaştırın; ek sütun açmayın.
3. Sekme tercihi **oturumluk/tarayıcı**; dosyaya yazılmaz.
4. Yeni sekme eklerken `REPORT_SIDE_TABS` + `data-rside-section` + test [2dz].

### Dürüst bedel
Yan panel her zaman görünür → kâğıt 900 → **754 px** daraldı (önce 786↔900
zıplıyordu). ≤1349 px’te yan panel belgenin altına iner.

### Sıradaki iş
1. **Sol iskelet odağı:** aktif bölüm vurgusu + otomatik kaydırma; ≤900 px’te
   iskelet belgenin üstünde.
2. Araç çubuğu sadeleşmesi (600 px’te 212 px yüksek), “Tam ekran (F)” kısayolu,
   tek durum sayacı.
3. İstenirse sağ paneli **çekmece** yapmak (şu an sütun + sekmeli).
