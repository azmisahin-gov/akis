# Konuşmacı Ön-Atama (diyarizasyon benzeri) — Plan

> **Durum:** **v2.301 UYGULANDI** (dosya bazında otomatik ön-atama) ve **v2.302
> UYGULANDI** (bölüm bazında tahmin ≈S2 + belirsiz işareti). **v2.303** (opsiyon:
> rapor yöntem notu + K eşleştirme) planlıdır. Çerçeve/kararlar geçerlidir.
> **Öncelik: 1** (kullanıcı isteği, 2026-11-25).

## 1. İstek

Kullanıcı: *"Ses ve video çözümlemeyi 'tümünü çözümle', ses dosyası bazında
'yeniden çözümle' ve bölümü 'yeniden çözümle' diyerek çok rahatlattı; yalnız
hatalı olanlara odaklanıyoruz. Aynı rahatlığı **konuşmacılarda** da istiyoruz:
bölümlenen yerlerdeki konuşmacılar **önceden belirlensin**, biz yalnız hataları
düzeltelim."*

Yani hedef: deşifre geldiğinde her bölümün konuşmacısı **makul bir başlangıç
olarak** dolu gelsin; uzman yalnız yanlışları düzeltsin.

## 2. Dürüst çerçeve (DEĞİŞMEZ)

- Bu **kimlik tespiti DEĞİLDİR.** "Kim olduğu" değil, "hangi bölümler **aynı
  sese benziyor**" sorusu yanıtlanır. Kodlar anonimdir: **S1, S2, S3…** (kayıt
  içi).
- ASR modeli **diyarizasyon yapmaz.** Ayrı bir **konuşmacı gömme (embedding)**
  modeli kullanılır: `Xenova/wavlm-base-plus-sv` (q8 ≈ 97 MB; isteğe bağlı
  indirme — mevcut v2.279 altyapısı).
- Çıktı **ön-atama / öneri**dir; **uzman doğrular**. Rapora "diyarizasyon
  yaptık / konuşmacı ayrıştırma yaptık" **yazılmaz** (v2.244 kuralı). Raporda
  görünen etiketler **uzman onaylı** nihai etiketlerdir.
- Kısa bölüm (< 1,2 sn) güvenilmez; **belirsiz** benzerlik (0,72–0,88) kör
  atanmaz, işaretlenir. Ölçülmemiş iddia yok.

### v2.292 "otomatik atama yok" kuralıyla ilişkisi

v2.292'de "otomatik atama yok" kuralı **sessiz/arka plan** atamayı yasaklar.
Bu plan, **kullanıcının açıkça tetiklediği**, **onay isteyen**, **geri alınabilir**
ve **uzmanın düzelttiği** bir **ön-atama**dır. İkisi çelişmez:

| Kural | Bu plan |
|---|---|
| Sessiz/arka plan otomatik atama YOK | Kullanıcı düğmeye basar, onay verir |
| Onaylı/doğrulanmış atama ezilmez | Varsayılan yalnız **boş** bölümler dolar |
| Karar uzmanın | Ön-atama **öneri**dir; `review` (onay) değişmez |

## 3. Kullanıcı deneyimi — çözümleme ile aynı üç düzey

| Düzey | Düğme | Ne yapar |
|---|---|---|
| **Dosya** | **Konuşmacıları önceden belirle** | Tüm bölümleri gömer, kümelere ayırır, **S1…Sk** oluşturur, **boş** bölümlere atar |
| **Bölüm** | **Bu bölümün konuşmacısını tahmin et** | Seçili bölüm için en yakın konuşmacıyı **önerir**; tek tıkla uygulanır |
| **Yeniden** | **Konuşmacıları yeniden kümele** | Düzenlemelerden sonra; yine yalnız boşları doldurur (varsayılan) |

- İşlem sonunda **özet**: `S1 · 12 bölüm · 00:00:00.000–00:01:10.000`,
  `S2 · 8 bölüm …`, belirsiz bölüm sayısı; her grupta **Git** (ilk bölüme).
- Ön-atama yapılan bölümde küçük **“≈ otomatik”** rozeti; uzman dokununca
  kalkar. Onay durumu **değişmez** (Kontrol hâlâ “Bekliyor”).
- İlerleme çubuğu + **İptal** (bölüm başına ~1–3 sn; 100 bölüm ~3–5 dk).

## 4. Veri modeli (eklemeli; SCHEMA_VERSION artmaz)

- `segment.speakerAuto` (bool) — otomatik ön-atama işareti. Uzman atamayı
  değiştirince **temizlenir**.
- `segment.speakerMatch` — `'certain' | 'uncertain'` (sayı uydurulmaz; yalnız
  iki hâl). Belirsizde atama yapılmaz, bölüm “elle seç” kalır.
- `material.speakerAutoAt` (ISO zaman) + `logEvent` kaydı.
- `voiceEmbed` özeti korunur; **vektörler saklanmaz** (yeniden ölçüm gerekir).
  Ön-atama vektörleri yalnız işlem sırasında bellekte tutulur.
- `normalizeSegment`/`normalizeMaterial` yeni alanları korur; `mergeCases`
  `speakerAuto`’yu taşır, çakışmada uzman ataması kazanır.

## 5. Fonksiyonlar

**Saf (schema.js / report-model.js; test edilir):**
- `assignClustersToSpeakers(points, {threshold, minSize})` → kümelere **ilk
  görülme sırasına göre** `S1, S2…` verir; `[{code, segIndexes, first, last}]`.
- `nearestSpeaker(points, targetIndex, speakers)` → `{code, match:'certain'|'uncertain'}`.
- `protectedSpeakerAssignment(seg)` → doğrulanmış/onaylı atama korunur mu.

**Tarayıcı (app.js):**
- `autoAssignSpeakers(m, {overwrite=false})` — onay → `snapshotForUndo` →
  gömme → kümeleme → `setSegmentSpeakerByName` (ad + kimlik) → `speakerAuto` →
  `logEvent` → özet.
- `suggestSpeakerForSegment(m, idx)` — tek bölüm önerisi + uygula düğmesi.
- Model indirme **her oturumda onay** (v2.279 deseni); çift çalışma kilidi.

## 6. Kurallar / koruma

1. **Onay + snapshot + Ctrl+Z + log** (mevcut desen).
2. **Doğrulanmış (kilitli) konuşmacı ve onaylı bölüm ataması EZİLMEZ**
   (varsayılan). "Hepsini yeniden ata" ayrı ve **ikinci onay** ister.
3. **Onay (`review`) değişmez**: ön-atama yalnız `speaker`/`speakerId` yazar.
4. **Belirsiz eşleşme atanmaz**, işaretlenir (kör atama yok).
5. **Kimlik değil, benzerlik**: UI ve raporda bu açıkça yazar.
6. Yeni konuşmacı adları **“Konuşmacı 1/2…”** (etiket uzman tarafından
   değiştirilebilir); kod salt-okunur S1/S2 (v2.262 kuralı).

## 7. Riskler ve dürüst sınırlar

- **Kalite:** kısa bölüm, benzer perde, müzik/gürültü → yanlış gruplama.
  Uzman düzeltir; bu bir **başlangıç**tır.
- **Performans:** bölüm başına ~1–3 sn; uzun kayıtta dakikalar. İlerleme+iptal.
- **İndirme:** ~97 MB model, her oturumda onay.
- **Yanlış izlenim:** “kimlik buldu” sanılmasın diye “anonim ön-atama / öneri”
  vurgusu zorunlu.
- **Kanıt:** ön-atama kanıtı değiştirmez; yalnız etiket önerir.

## 8. Testler

- `birim`: `assignClustersToSpeakers` (ilk görülme sırası, S1..Sk), `nearestSpeaker`,
  korunan atama (verified/approved ezilmez), `speakerAuto` temizliği.
- `sema`: yeni alanların normalize/merge davranışı.
- **Gerçek Chromium + etiketli ses:** ön-atama → S1/S2 dağılımı; elle düzelt →
  rapor; Ctrl+Z; kırpma/taşma 0; JS hatası 0.
- `rapor`: nihai etiketler üç çıktıda aynı (yöntem notu eklenirse üçü birlikte).

## 9. Faz planı

| Faz | Kapsam |
|---|---|
| **v2.301** | Saf fonksiyonlar + **dosya bazında ön-atama** + onay/geri alma + özet + testler |
| **v2.302** | **Bölüm bazında tahmin** + “yeniden kümele” + belirsiz işaretleri |
| **v2.303** | (opsiyon) rapor **dürüst yöntem notu** + dosyalar arası kişi (K) ile birleştirme |

## 10. Karar soruları

1. Varsayılan **yalnız boş** bölümleri mi doldursun, yoksa “hepsini yeniden”
   seçeneği de olsun mu? (öneri: yalnız boş; “hepsi” ayrı onay)
2. Ön-atama **onaylı** bölümlere dokunsun mu? (öneri: hayır)
3. Rapora **dürüst yöntem notu** (“konuşmacı grupları benzerlikle ön-atandı,
   uzman doğruladı”) eklensin mi? (öneri: isteğe bağlı, varsayılan **kapalı**)
4. Kümeleme eşiği mevcut **0,88** mi, yoksa yeni ölçüm mü? (öneri: önce mevcut
   eşikle ölç, gerekirse ayrı sürümde kalibre et)
5. Etiket adı **“Konuşmacı 1…”** mi, **“Kişi 1…”** mi? (öneri: “Konuşmacı”)
