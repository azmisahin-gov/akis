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

Biçim `MAJOR.MINOR`. **Güncel sürüm: v2.151.**

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

## Yeni oturuma devir notu (v2.129)

Bu dosya yeni oturumda otomatik yüklenir; aşağıdakiler **durum** bilgisidir.

### Durum tablosu

| | |
|---|---|
| Sürüm | **v2.148** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **782 birim + 404 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Uzak dal | `main` = kod commit `c71b374` (bu devir notu ayrı bir belge commit'idir) |
| Pages | `built` · kod commit `c71b374` (canlı doğrulandı) |
| Canlı | https://azmisahin-gov.github.io/akis/ → `APP_VERSION = '2.129'`, `version.json` = 2.129 |
| Açık konu | **Yok** |

### v2.102–v2.129 turunda ne yapıldı (28 sürüm)

Her sürüm: **kıran test → düzeltme → gerçek Chromium → push → canlı doğrulama**.
Test sayısı 441 → **782**.

| Sürüm | Konu | Koruyan test |
|---|---|---|
| v2.102 | Boş dosya yedeğe girmiyor; arşiv birleştirilebiliyor; kopya birikmiyor | `birim` [32] |
| v2.103 | Yeniden çözümleme onaysız/geri alınamaz silme | `birim` [33] |
| v2.104 | Punto kaçakları (7px sürüm etiketi), sürüm geçmişi | `tasarim` [2b] |
| v2.105 | Üst bar başlığı sessizce kesiliyordu | `tasarim` [2c] |
| v2.106 | Otomatik onay ≠ bilirkişi onayı (`machine`/Çözümlendi) | `birim` [34] |
| v2.107 | Arşivleme + iki aşamalı kalıcı silme | `birim` [35] |
| v2.108 | Arşivde boş dosya birikmesi, görünmeyen kimlik | `birim` [36] |
| v2.109 | İlk açılış gerçekten boş (boş taslak kaydedilmiyordu) | `birim` [37] |
| v2.110 | Dışa aktarma kapsamı soruluyor; ad tarih+saat | `birim` [38] |
| v2.111 | Profil kayıt başına sabit + görünür | `birim` [39] |
| v2.112 | A–B döngüsü (3 hata: Dinle öldürüyordu, tuş yok, gösterge yok) | `birim` [40] |
| v2.113 | Liste kaydırma `scrollTop +=` birikmesi | `birim` [41] |
| v2.114 | "%100 olmuyor" açıklaması (`pendingBreakdown`) | `birim` [42] |
| v2.115 | Belirsiz okuma (`ambiguous`) + bölüm spektrogramı | `birim` [43] |
| v2.116 | Karaoke titremesi (25 DOM değişikliği → 0) | `birim` [44] |
| **v2.117** | **ACİL:** canlı site açılmıyordu (`schema.js` import sürümsüz) | `surum` [2b] |
| **v2.118** | **Kendini güncelleyen sayfa** (`version.json`, `__akisIdle`) | `surum` [2c] |
| v2.119 | Takip iki moda ayrıldı; karaoke kutusu kaldırıldı | `birim` [45] |
| v2.120 | Liste yüksekliği kabı aşıyordu (137px kırpılıyordu) | `tasarim` [2d] |
| v2.121 | Sağ panel kaydırma çubuğu; spektrogram dalganın yerine | `tasarim` [2d]/[2e] |
| **v2.122** | **Birleştirmede onay kaybı** (onayın sahibi yoktu; sessiz düşüyordu) | `birim` [46] · `sema` [7f] |
| **v2.123** | **Terim birliği + paket adı** (dışa/içe aktar → paket) | `birim` [38] · `surum` [11] |
| **v2.124** | **"Tüm dosyalar" seçimi adda görünmüyordu** (ad dosya sayısına bağlıydı) | `birim` [38] |
| **v2.125** | **Takip şeridi sabit + cümle penceresi** (5 satır atlama, reflow) | `birim` [47] · `tasarim` [2f] |
| **v2.126** | **Spektrogram tam genişlik + etkileşim** (tıkla/sürükle/Alt/okuma) | `birim` [48] · `tasarim` [2g] |
| **v2.127** | **Yerleşim: metin listeye bitişik + kontroller yanında** | `birim` [49] · `tasarim` [2h] |
| **v2.128** | **Katmanlı analiz kutusu** (dalga+spek aynı yerde, 3 mod) | `birim` [50] · `tasarim` [2g] |
| **v2.129** | **Ses görünümü tek kaydırma** (taşma, kısayol/araç görünmüyordu) | `tasarim` [2i] |
| **v2.130** | **Bölüm rozeti: durum her zaman görünür** (96 px kapta kırpılıyordu) | `tasarim` [2j] |
| **v2.131** | **Görünüm kutusu içerikle büyür** (yapışkan bar 635 px sonra bırakıyordu; durum çubuğu tıklamayı yutuyordu) | `tasarim` [2k] |
| **v2.132** | **Kurtarma kopyasında sessiz düşme** (bozuk dosya bildirilmiyordu) | `birim` [51] |
| **v2.133** | **Durum çubuğu yazıları kesilmiyor** (≤1100 px'te 6/6 öğe kırpılıyordu) | `tasarim` [2l] |
| **v2.134** | **İlk açılışta hayalet kayıt** (boş çalışma alanı yazılıyordu) | `birim` [52] |
| **v2.135** | **Kritik uyarılar ekran okuyucuya duyurulur** (aria-live yoktu) | `birim` [53] |
| **v2.136** | **Sekme simgesi** (favicon 404) | `tasarim` [4b] |
| **v2.137** | **Rapor kâğıdı dar ekranda kırpılıyordu** (760 px'te 26 px) | `tasarim` [2m] |
| **v2.138** | **CSS borcu ölçümü + nöbetçi** (temizlik kanıt tutmadığı için yayınlanmadı) | `tasarim` [8] |
| **v2.139** | **Uzun listede detay yapışkan** (362 bölümde panel ekran dışında kalıyordu) | `tasarim` [2n] |
| **v2.140** | **Masaüstü kabuğu** (tek uzun sayfa → sabit çerçeve, paneller kendi kaydırır) | `tasarim` [2o] |
| **v2.141** | **Masaüstünde çalışma modu kaldırıldı** (kayıt sütunu kalıcıyken gereksizdi) | `tasarim` [2p] |
| **v2.142** | **Çalışma modu kaldırıldı; kayıt listesi dikey** (yanyana çipler, gizli başlık) | `tasarim` [2p]/[2q] |
| **v2.143** | **Detay panelinin alt kısmı kırpılıyordu** (`sd-meta`, gözlem düğmeleri) | `tasarim` [2r] |
| **v2.144** | **Zaman çakışmaları görünür** (⚠ rozet + "Zaman sorunları" filtresi) | `birim` [54] |
| **v2.145** | **Takip vurgusu çakışmada geri atlamıyor** (`segmentIndexAtTime`) | `birim` [55] |
| **v2.146** | **Zaman sorunu düzenlerken anında görünür** (⚠/çip yenilemeden çıkmıyordu) | `birim` [56] |
| **v2.147** | **Takip şeridi eski bölüme dönmüyor** (timeupdate eski indeksi kullanıyordu) | `birim` [57] |
| **v2.148** | **Oynatma başlarken sayfa zıplamıyor** (şerit yer tutucu, başlık tek kaynak) | `birim` [58] · `tasarim` [2s] |

### v2.117–v2.122'de öğrenilen dört kritik ders

1. **`?v=` tek dosyayı kırar, import zincirini KIRMAZ.** `app.js` içindeki
   `import './schema.js'` sürümsüzdü; tarayıcı eski `schema.js`'i kullandı →
   `AMBIGUOUS_REVIEW` bulunamadı → **canlı site açılmadı**. Artık import
   `?v=${APP_VERSION}` taşır; `surum-testi` [2b] zorunlu kılar.
2. **Önbelleği kullanıcıya kırdırma.** GitHub Pages her dosyaya `max-age=600`
   verir. `version.json` (`no-store`) + dakikalık denetim + `__akisIdle()`
   ile sayfa **kendini yeniler** (çalışırken değil). `surum-testi` [2c].
3. **Yerleşim düzeltmesi BAŞKA paneli bozar.** `height:100%` verince liste
   düzeldi ama sağ panel 351px'e sıkışıp kaydırma çubuğu çıktı. Kural:
   kap yükseklik dayatmaz (`height:auto`), **tek kaydırma** (`.seg-list`),
   `overflow:hidden` ile çocuk kırpılmaz.
4. **Onayı veren ≠ metni yazan.** Birleştirme "kim onayladı" sorusunu
   `lastEditBy` ile tahmin ederse, dinleyip onaylayan bilirkişinin onayı
   sahipsiz kalır ve sessizce düşer. Ayrı alan (`reviewedBy`) şart; ayrıca
   düşürme **bildirilir**. `birim` [46].

### Sürüm gönderme — 6 yer birlikte (test zorunlu kılar)

1. `assets/app.js` → `APP_VERSION`
2. `assets/app.js` → `import ... from './schema.js?v=X.Y'` (AYNI sürüm)
3. `index.html` → `var RUNNING = 'X.Y'` + dört `?v=X.Y`
4. `version.json` → `{"version":"X.Y"}`
5. `CHANGELOG.md` başlığı + `docs/YOL_HARITASI.md` başlığı
6. `README.md`, `docs/OZELLIKLER.md`, `AGENTS.md` sürüm satırları

Sonra: `bash tools/test.sh` → commit (Türkçe) → **push** → `git ls-remote`
hash eşit mi → Pages `built` + commit bizimki mi → **canlı `version.json`
ve `APP_VERSION`** doğru mu.

### Kullanıcı bilgilendirmesi — 3 yer (her sürümde)

1. `VERSION_NOTICES['x.y']` (açılışta bir kez, `akis.seenNotice.*`)
2. `index.html` yardım → "Son değişiklikler (vX.Y)"
3. `CHANGELOG.md` → "KULLANICI NE GÖRECEK"

### Kullanıcı tercihleri (bu turdan çıkan, değişmez)

- **Ekran etiketleri KISA**; ayrıntı **ipucunda** (`title`). Liste kalabalık olmaz.
- **Mimari:** tarayıcıda çalışsa da **masaüstü uygulaması gibi** hissettirmeli.
- **Tek düğme iki iş yapmaz.** Ör. takip: `Otomatik geçiş (F)` ve
  `Canlı vurgu (G)` ayrı; varsayılan **kapalı**.
- **Kırpma yasak:** sığmayan öğe kesilmez; **sarar** veya **kaydırır** (görünür).
- **Aynı veri tek yerde** gösterilir (karaoke + sd-follow ikilemi kaldırıldı).
- **Ölçülemeyen iddia yok:** "düzeltildi" demek için önce/sonra ölçümü verilir.

### Tarayıcı doğrulaması (zorunlu — sahte DOM yetmez)

- `/usr/bin/chromium` + CDP (headless). Gerekli bayraklar:
  `--autoplay-policy=no-user-gesture-required` (ses testleri için).
- Uygulama fonksiyonları `window`'da **değil** (modül kapsamı). **Gerçek UI'ı
  tıklayın**; `evaluate` ile iç fonksiyon çağırmayın.
- Veri tohumlama: IndexedDB `mihenk-pro-assets` → `state` anahtarı
  `mihenk.pro.cases.v1`; ses `audio` store'unda `<dosyaId>::<kayıtId>`.
- Ölçüm ölçütleri: `scrollHeight > clientHeight` (kırpma/taşma),
  `getBoundingClientRect().bottom` (gerçek görünürlük),
  `MutationObserver` (titreme), `getComputedStyle` (punto/kırpma).
- Geçici dosyalar (`/tmp/*.mjs`) iş bitince **silinir**.

### Bilinen dürüst sınırlar (hata değil)

- Perde oktav hatası **düzeltilmiyor**, `detectPitchAmbiguity()` ile bildiriliyor.
- Kaynak ayrıştırma, konuşmacı kimlik tespiti, montaj tespiti **yapılmaz**.
- `date`/`fs`/`vm` sandbox farkı: `instanceof Date` güvenilmez; davranıştan anla.
- Ölçüm şemaları: `LEVELS_SCHEMA` (3), `SILENCE_SCHEMA` (2).

### Yeni oturumda ilk adımlar

1. `bash tools/test.sh` → tümü yeşil mi (782 + 404 + diğerleri)
2. `git log --oneline -3` ve `git status --short` → temiz mi
3. `curl -s https://azmisahin-gov.github.io/akis/version.json` → 2.129 mi
4. Kullanıcının talebini al. Soru ise **yalnız cevap ver** (kod değişmez).
   Değişiklik ise yukarıdaki disiplin: **tek konu = tek sürüm**.

## Yeni oturuma devir notu (v2.151) — SIRADAKİ İŞLER

Bu oturumda (v2.130–v2.149) **görünürlük, tutarlılık ve kapsama** sorunları kapatıldı.
Aşağıdaki liste bir sonraki oturumun iş sırasıdır; her madde **tek konu = tek
sürüm** kuralıyla, kıran test → düzeltme → gerçek tarayıcı → push disipliniyle
yapılır.

### Durum (2026-11-21, kapanış)

| | |
|---|---|
| Sürüm | **v2.151** (`assets/app.js` → `APP_VERSION`) |
| Testler | `bash tools/test.sh` → **922 birim + 404 şema** + rapor/sürüm/tasarım, hepsi yeşil |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = 2.151 |
| Açık konu | **P4 — listede bitiş zamanı** (P1–P3 bitti) |

### Bu oturumda ne değişti (kısa)

| Sürüm | Konu | Koruyan test |
|---|---|---|
| v2.130 | Bölüm listesinde durum rozeti görünmüyordu | `tasarim` [2j] |
| v2.131 | Görünüm kutusu: yapışkan bar + durum çubuğu örtüşmesi | `tasarim` [2k] |
| v2.132 | Kurtarma kopyasında sessiz dosya düşmesi | `birim` [51] |
| v2.133 | Durum çubuğu kesmesi | `tasarim` [2l] |
| v2.134 | İlk açılışta hayalet kayıt | `birim` [52] |
| v2.135 | Kritik uyarılar ekran okuyucuya duyurulmuyor | `birim` [53] |
| v2.136 | favicon 404 | `tasarim` [4b] |
| v2.137 | Rapor kâğıdı dar ekranda kırpılıyordu | `tasarim` [2m] |
| v2.138 | CSS borcu ölçümü + nöbetçi (temizlik yayınlanmadı) | `tasarim` [8] |
| v2.139 | Uzun listede detay paneli ekran dışında kalıyordu | `tasarim` [2n] |
| v2.140 | **Masaüstü kabuğu**: sabit çerçeve, paneller kendi kaydırır | `tasarim` [2o] |
| v2.141 | Masaüstünde çalışma modu kaldırıldı | `tasarim` [2p] |
| v2.142 | Çalışma modu tamamen kaldırıldı; kayıt listesi **dikey** | `tasarim` [2p]/[2q] |
| v2.143 | Detay panelinin alt kısmı (`sd-meta`) kırpılıyordu | `tasarim` [2r] |
| v2.144 | **Zaman çakışmaları görünür** (⚠ + "Zaman sorunları") | `birim` [54] |
| v2.145 | Takip vurgusu çakışmada geri atlıyordu | `birim` [55] |
| v2.146 | Zaman sorunu düzenlerken anında görünmüyordu | `birim` [56] |
| v2.147 | Takip şeridi eski bölüme dönüyordu (gerçek sesle kanıt) | `birim` [57] |
| v2.148 | Oynatma başlarken sayfa zıplıyordu (şerit + başlık) | `birim` [58] · `tasarim` [2s] |

### Mevcut mimari (bilinmesi gerekenler)

- **≥901 px masaüstü kabuğu:** üst bar + durum çubuğu sabit; kayıtlar (220 px)
  · bölüm listesi (320 px) · düzenleme paneli. Liste ve panel kendi kaydırır.
  `reading-layer.css` sonundaki `@media (min-width: 901px)` bloğu.
- **≤900 px:** eski tek-kaydırma yedeği (detay listenin altında).
- **Çalışma modu YOK** (v2.142): `workspaceBar`, `workspaceBtn`, `setWorkspace`,
  `ws-mode` kaldırıldı; geri getirmeyin.
- **Zaman bütünlüğü:** `segmentTimeIssues` / `segmentTimeIssueAt` /
  `segmentTimeIssueIndexes`; ⚠ rozeti + "Zaman sorunları" filtresi.
- **Takip:** `segmentIndexAtTime` (çakışmada aktif bölüm) ve `followStripIndex`
  (şerit aktif bölümü gösterir). `followState` iki ayrı mod: `autoAdvance` (F),
  `liveHighlight` (G); ikisi de **varsayılan kapalı**.
- **Yerleşim kararlılığı:** `segHeadParts` (başlık tek kaynak);
  `ensureFollowStrip` (canlı vurgu açıkken şerit **yer tutucu** olarak önceden
  kurulur; oynatma yalnız metni değiştirir).
- **CSS borcu nöbetçisi:** `tasarim-testi` [8] eşikleri 26/68/98/507/15
  (`!important` / ölü bildirim / `.main-area`). Borç artarsa test kalır.

### Bilinen sınırlar (hata değil)

- **≤900 px:** tek sütun; uzun listede detay aşağıda. Ayrı düzen gerekir.
- **Detay paneli kaydırır:** panel ~385 px, içerik ~795 px (v2.143'te kırpma
  bitti, kaydırma kaldı). Kayıt başlığı sıkıştırılırsa ~100 px kazanılır.
- **Canlı vurgu açılırken** şerit bir kez 64 px yerleşir (bilinçli eylem);
  oynatma sırasında zıplama yok.
- Perde oktav hatası düzeltilmez, bildirilir. Kaynak ayrıştırma/konuşmacı
  kimliği/montaj tespiti yapılmaz.

### SIRADAKİ İŞLER (öncelik sırasıyla)

#### P1 — Kapsama denetimi (TAMAMLANDI, v2.149)

`segmentCoverage()` + "Kapsam %98 · 2 boşluk" düğmesi + panel + "Git".
Koruyan test: `birim` [59]. Ayrıntı: Aşama 10au.

#### P2 — Rapor hazırlık denetimi (TAMAMLANDI, v2.150)

`reportReadiness()` + `#reportReadiness` kartı + satır tıklama. Koruyan test:
`birim` [60]. Ayrıntı: Aşama 10av.

#### P3 — Onay sonrası sonraki bekleyene geç (TAMAMLANDI, v2.151)

`nextPendingIndex()` + Ayarlar → "Onay davranışı" anahtarı (varsayılan kapalı).
Koruyan test: `birim` [61]. Ayrıntı: Aşama 10aw.

#### P4 — Listede bitiş zamanı (kullanıcının sorusu)

- Zaman hücresinde iki satır: `00:00:03.000` / `→ 00:00:06.000` (A seçeneği).
- Satır 37 → ~51 px; liste uzar (kabul edildi). Bitiş ≤ başlangıç anında görünür.
- **Kıran test:** `tasarim` — `.seg-time` iki satır, satır yüksekliği ölçümü;
  bitiş metni doğru biçimde (ms).

#### P5 — Detay paneli yüksekliği (kozmetik, en son)

- Kayıt başlığını sıkıştır (hız/filtre satırları), panel içeriğini ~100 px
  azalt; hedef: kaydırma olmadan `sd-meta` ve gözlem düğmeleri görünsün.
- **Kıran test:** `tasarim` — panel içeriği yüksekliği ve görünürlük.

### Bu oturumun en pahalı dersleri (tekrar etmeyin)

1. **`textContent =` çocukları siler.** İçinde ` / N` span'ı olan `.sd-idx`
   güncellenince toplam kayboldu (v2.148). Etiket + toplam **kardeş span** ve
   tek saf fonksiyondan (`segHeadParts`).
2. **"Oynatınca beliren" kutu yerleşimi kaydırır.** Kutu önceden **yer tutucu**
   olarak kurulmalı (v2.148).
3. **`timeupdate` kapanış indeksini taşımamalı.** Şerit eski bölüme dönüyordu
   (v2.147); indeks her çağrıda aktif durumdan okunur.
4. **Yerinde satır güncellemesi TÜM rozet girdilerini geçmeli.** ⚠ yalnız tam
   çizimde görünüyordu (v2.146); `segItemHtml` çağrılarının hepsini gözden geçir.
5. **`overflow: visible !important` + ata `overflow:hidden` = sessiz kırpma.**
   Panelin kaydırıp kaydırmadığını `overflow-y` + `clientHeight/scrollHeight`
   ile ölç (v2.143).
6. **CSS özgüllüğü:** `#view-audio>.panel:not(.detail-panel) .audio-list`
   (1,3,0) kuralını `#view-audio .audio-list` (1,1,0) **ezmez** (v2.142).
7. **Gerçek sesle test mümkün, "ses yok" bahanesi geçersiz.** `sample_data/audio`
   WAV'ı IndexedDB'ye (`<caseId>::<materialId>`) konur, `--autoplay-policy=
   no-user-gesture-required` ile oynatılır; ASR gerekmez (v2.147).
8. **Boş ekran ölçümü yanıltır.** "Kırpma 0" ölçümü boş çalışma alanında
   yapılmıştı; gerçek bölümlerle rozet kırpılması ortaya çıktı (v2.130).

### Kapanış doğrulaması (bu oturum)

- `bash tools/test.sh` → tümü yeşil (843 + 404 + rapor/sürüm/tasarım).
- `git status --short` → temiz; `main` = `origin/main`.
- Canlı `version.json` = **2.148**; Pages `built`.
