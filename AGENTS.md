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
| `buildExportPlan(cases)` | `none` / `single` / `archive`. Boş dosyalar `skipped` ile **bildirilir**, sessizce atılmaz. |
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
- `isHumanApproved()` → yalnız `approved`.
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
- Arşivli dosyalar `buildExportPlan` içinde **kalır** (yedek eksik olmaz).
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

Biçim `MAJOR.MINOR`. **Güncel sürüm: v2.120.**

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

## Yeni oturuma devir notu (v2.101)

Bu dosya yeni oturumda otomatik yüklenir; aşağıdakiler **durum** bilgisidir.

- **Güncel sürüm:** `v2.120` (`assets/app.js` → `APP_VERSION`).
- **Tüm testler:** `bash tools/test.sh` → 441 + 395 + diğerleri, **hepsi geçer**.
- **Uzak dal:** `main` = `803c353` (yerel = uzak = Pages commit).
- **Açık konu yok.** Yeni konu gelirse aynı disiplin: **tek konu = tek sürüm**,
  önce kıran test (düzeltme yokken KALDI), sonra düzeltme, gerçek tarayıcı,
  push + hash + Pages + canlı doğrulama, kullanıcıyı 3 yerden haberdar et.
- **Kullanıcı arada başka taleplerle gelebilir** (soru sorabilir, başka bir
  özellik isteyebilir). Bu, disiplini **bozmaz**: soru sorulduğunda yalnız
  cevap verilir (kod değişmez); değişiklik istenirse yukarıdaki akış aynen
  uygulanır ve yine **tek sürüm** gönderilir.
- **Sürüm artırma üç yerde birlikte:** `APP_VERSION` + `CHANGELOG.md` başlığı +
  `docs/YOL_HARITASI.md`. Ayrıca `index.html` `?v=` parametreleri, `README.md`,
  `docs/OZELLIKLER.md`, `AGENTS.md` sürüm satırı.
- **Her sürümde kullanıcı bilgilendirmesi üç yerde:**
  1. `VERSION_NOTICES['x.y']` (açılışta bir kez; `akis.seenNotice.*`)
  2. `index.html` yardım ekranı → "Son değişiklikler (vX.Y)"
  3. `CHANGELOG.md` → "KULLANICI NE GÖRECEK"
- **Tarayıcı doğrulaması:** `/usr/bin/chromium` + CDP (headless). Modül
  kapsamı nedeniyle uygulama fonksiyonları `window`'da değildir; **gerçek UI
  akışını** tıklayın (düğme/dosya girişi), `evaluate` ile iç fonksiyon
  çağırmayın. Geçici dosyalar iş bitince silinir (depoya girmez).
