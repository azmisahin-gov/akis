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

Biçim `MAJOR.MINOR`. **Güncel sürüm: v2.216.**

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

