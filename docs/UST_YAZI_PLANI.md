# Üst yazı ve belge ekleri — düzenleme önerisi

**Durum:** ÖNERİ (kod yazılmadı). Karar soruları §15'te.
**Tarih:** 2026-11-25 · **Taban sürüm:** v2.322.

---

## 1. Amaç ve ilke

Bugün tek bir belge üretiliyor: **bilirkişi raporu**. Raporun içinde hem
değerlendirme hem de teknik ayrıntı (köken, edinme, envanter, seviye, WER,
kalite kontrol, işlem günlüğü) ve "EK-1…EK-6" adıyla rapor içi ekler var.

Kullanıcının istediği:

1. Mahkemeye sunulan **bir sayfalık üst yazı** (sunuş yazısı) **ayrı bir belge**
   olarak hazırlanabilsin.
2. Rapor **üst yazının eki** olsun: **EK-1 = Bilirkişi raporu**.
3. Teknik ayrıntılar rapordan çıkıp **üst yazının ekleri** olsun
   (ör. **EK-2 = Teknik bilgiler**); gerektiğinde **yeni ek** eklenebilsin.
4. Rapor böylece **daha yalın ve okunaklı** kalsın.

**İlke:** Üst yazı, rapor ve ekler **aynı veriden** üretilir; üç çıktı
(HTML önizleme, DOCX, UDF) **aynı metni** verir. Uygulama adı hiçbir belgede
geçmez (v2.83 kuralı). Ölçülmeyen değer yazılmaz; boş alan satır üretmez.

---

## 2. Bugünkü durum (koddan ölçüm)

| Öğe | Bugün |
|---|---|
| Belge sayısı | **1** (rapor) |
| Rapor içi ekler | `REPORT_ANNEX_DEFS`: EK-1 Materyal teslim tutanağı · EK-2 Dosya teknik envanteri · EK-3 Zincirleme muhafaza günlüğü · EK-4 Transkript gösterim anahtarı · EK-5 Son kontrol listesi · EK-6 Hukuki/yöntemsel dayanaklar (+ `xN` özel ekler) |
| Bölüm → ek taşıma | `annexPlacement` (bölüm **aynı rapor dosyası içinde** EKLER altına taşınır) |
| Çıktı | `makeUdf()` (tek `content.xml`, `templates/BOS.udf`) · `makeDocx()` · yazdır/PDF |
| Dosya adı | `<dosya no>.udf` / `.docx` |
| Üst yazı | **yok** |

**Ölçülen mükerrerlik (kod düzeyinde):** dosya envanteri tablosu bugün **iki kez**
basılıyor — `s3` gövdesinde (`inventoryRows`) ve rapor içi **EK-2** ekinde
(`reportAnnexBlocks.ek2`, aynı `inventoryRows`). Aynı içerik iki yerde
durduğu için rapor hem uzuyor hem "hangisi geçerli" sorusu doğuyor. Öneri bu
mükerrerliği de kaldırır (bkz. §10).

**Sorun:** "EK" sözcüğü bugün *rapor içi ek* anlamında kullanılıyor. Yeni
kavram gelirse aynı sözcük iki numaralandırmayı anlatır (EK-1 rapor mu, EK-1
teslim tutanağı mı?) — bu, v2.123'te kapatılan terim karışıklığının tekrarıdır.

---

## 3. Terim sözlüğü (DEĞİŞMEZ — karışıklık önlenir)

| Terim | Anlamı | Kod |
|---|---|---|
| **Üst yazı** | Mahkemeye hitaben bir sayfalık sunuş yazısı | `case.letter` |
| **Belge eki** | Üst yazıya eklenen **ayrı belge** (EK-1, EK-2…) | `case.letterAnnexes[]` |
| **Rapor içi ek** | Raporun **kendi içinde** basılan ek (bugünkü EK-1…EK-6) | `report.layout.annexes` |
| **Bölüm** | Raporun numaralı gövde bölümü (1..N) | `report.layout.order` |
| **Son teslim** | Raporun teslim **tarihi** (mevcut `deliveryInfo`) | `case.assignment.dueDate` |
| **Paket (.akis)** | Yedek/taşıma dosyası (mevcut) | `exportProject` |

> **Kural:** "Teslim" sözcüğü **tarih** için ayrılmıştır (mevcut `deliveryInfo`,
> `deliveryPanelHtml`). Belge kümesi için "teslim" **kullanılmaz**; "belge ekleri"
> veya "üst yazı ekleri" denir. "Paket" yalnız `.akis` yedeği içindir.

---

## 4. Kavramsal model — üç katman

```
ÜST YAZI  (1 sayfa, ayrı belge)
 ├─ EK-1  Bilirkişi raporu            ← RAPOR (mevcut belge, yalınlaştırılmış)
 ├─ EK-2  Teknik bilgiler             ← rapordan ÇIKARILAN bölümler
 ├─ EK-3  Dosya teknik envanteri      ← eski "rapor içi ek", artık ayrı belge
 └─ EK-4  (kullanıcı eki / dosya)     ← serbest metin veya ham dosya

RAPOR (EK-1)
 ├─ 1..N numaralı bölümler            ← değerlendirme + bulgular + sonuç
 └─ (isteğe bağlı) rapor içi ekler    ← yalnız gerçekten rapora ait olanlar
```

**Kural:** Bir içerik **ya** raporun gövdesinde **ya** bir belge ekinde bulunur —
**ikisinde birden bulunmaz** (çift üretim yok, çelişki yok).

---

## 5. Veri modeli (eklemeli; `SCHEMA_VERSION` artmaz)

```js
case.letter = {
  enabled: false,            // kapalıysa hiçbir şey değişmez (göç güvenliği)
  place: '',                 // "Antalya" — boşsa yazılmaz
  date: '',                  // boşsa reportDate
  addressee: '',             // boşsa mahkeme adından türetilir
  subject: '',               // boşsa DEFAULT ("Bilirkişi raporunun sunulması")
  bodyText: '',              // boşsa LETTER_TEXT.body (tek kaynak, düzenlenebilir)
  showRegistry: false,       // sicil no üst yazıda görünsün mü
  showPageCounts: false,     // ek listesinde (≈) sayfa sayısı
  signerTitle: ''            // boşsa "Bilirkişi"
};

case.letterAnnexes = [       // SIRALI; EK numarası buradan TÜRETİLİR
  { id: 'a1', kind: 'report' },                     // EK-1 — tek, zorunlu
  { id: 'a2', kind: 'sections',
    label: 'TEKNİK BİLGİLER',
    sections: ['origin', 'embedded', 'acquisition', 'inventory', 'levels', 'wer', 'qc', 'integrity'] },
  { id: 'a3', kind: 'reportAnnex', key: 'ek2' },    // rapordaki eki belgeye çıkar
  { id: 'a4', kind: 'custom', title: '', content: '' },
  { id: 'a5', kind: 'file', name: '', sizeBytes: 0, blobId: '' }
];
```

| `kind` | Ne üretir | Notlar |
|---|---|---|
| `report` | Mevcut rapor belgesi | **Tek** olabilir; daima EK-1. Silinemez; yalnız "göster" kapatılabilir (o zaman numaralar kayar). |
| `sections` | Seçilen rapor bölümlerinden **yeni belge** | Bölümler raporda **çizilmez** (taşıma). Envanter/seviye gibi tablolar burada. |
| `reportAnnex` | Rapor içi ekin (EK-2 envanter gibi) **ayrı belge** hâli | Rapor içi kopya kapanır. |
| `custom` | Başlık + serbest metin | Bugünkü `xN` özel ekinin belge hâli. |
| `file` | Ham dosya (ör. taranmış tebligat PDF) | Yalnız ZIP içinde taşınır; **PDF birleştirme yok** (dürüst sınır). |

`normalizeLetter` / `normalizeLetterAnnexes` bilinmeyen alanı **korur**, geçersiz
`kind`'ı düşürür, `report` yoksa başa ekler.

---

## 6. Ek numaralandırma kuralları (DEĞİŞMEZ)

1. **Numara yalnız üst yazıda**: EK-1, EK-2 … **bitişik** (silinen/kapatılan ek
   numarada boşluk bırakmaz) — `mainSectionNumbers` deseninin aynısı.
2. **Rapor içinde "EK-N" adı kullanılmaz.** Rapor içi ekler ya ayrı belgeye
   taşınır ya da **"Rapor içi tablolar"** olarak adlandırılır.
3. Rapordaki **`s7 EK LİSTESİ`** bölümü kaldırılır; yerine istenirse tek satır:
   "Bu rapor, üst yazının EK-1'idir."
4. Üst yazı ek listesi = `case.letterAnnexes` sırası; TOC benzeri liste aynı
   kaynaktan üretilir (kopya yok).

---

## 7. Üst yazı içeriği (A4, 1 sayfa)

```
T.C.
<MAHKEME>’NE                                    Sayı : <dosya no>
                                                Konu : Bilirkişi raporunun sunulması
──────────────────────────────────────────────────────────────────────
                    Sayın <Mahkeme> Hâkimliğine

<Görevlendirme cümlesi>  (assignmentDate + duration varsa otomatik, yoksa yazılmaz)
<İnceleme cümlesi>       (rapor EK-1'de sunulmuştur)
<EK-2/EK-3 açıklaması>   (yalnız ek varsa)

Gereğini bilgilerinize arz ederim. <tarih>

                                        <Bilirkişi>
                                        <Ad Soyad>
                                        <imza çizgisi>

EKLER
EK-1  Bilirkişi raporu            (≈ N sayfa)
EK-2  Teknik bilgiler
```

Kurallar:
- **Boş alan satır üretmez**; "—" bile yazılmaz (üst yazıda boş satır olmaz).
- Metin **tek kaynak**: `LETTER_TEXT` (başlık/gövde/kapanış) + kullanıcı
  düzenlemesi (`letter.bodyText`). Şablon metni `LEGACY_*` deseniyle
  sürümlenir (eski kayıt sessizce değişmez).
- **İmza**: ad soyad + görev + çizgi. **E-imza üretilmez** (depo kuralı).
- **Sayfa sayısı varsayılan KAPALI**; açılırsa "≈" ve dipnot:
  "Sayfa sayıları belge düzenine göre değişebilir."
- Üst yazı **kendi künyesini** taşır (dosya no, mahkeme, tarih); raporun kapağını
  tekrar etmez.

---

## 8. Ekran tasarımı (IA)

**Yeni ray öğesi YOK.** Rapor görünümünde **üst sekme**:

```
┌ Rapor görünümü ──────────────────────────────────────────────────────┐
│  [ Rapor ]  [ Üst yazı ]                              UDF · DOCX · 🖨 │
├──────────────┬──────────────────────────────┬────────────────────────┤
│ Sol:         │  Orta: A4 önizleme           │ Sağ:                   │
│  Rapor iskeleti (Rapor sekmesi)             │  Rapor → Kontrol paneli │
│  Üst yazı alanları (Üst yazı sekmesi)       │  Üst yazı → Belge ekleri│
└──────────────┴──────────────────────────────┴────────────────────────┘
```

| Sekme | Sol | Orta | Sağ |
|---|---|---|---|
| **Rapor** | mevcut iskelet (bölüm/ek ağacı) | rapor kâğıdı | Kontrol + Revizyon + **Rapor içi ekler** |
| **Üst yazı** | yer · tarih · muhatap · konu · gövde | **üst yazı kâğıdı** | **Belge ekleri** (EK listesi, sürükle-bırak + ↑↓) |

- Aynı **A4 önizleme** bileşeni, aynı biçim (font/punto/marj), aynı yazdırma.
- **Belge ekleri** panelinde her satır: `EK-N · ad · tür` + "Rapordan çıkar"
  anahtarı + ⋮ (yukarı/aşağı/sil/düzenle).
- **Mevcut "＋ Yeni ek" (rapor içi)** kalır ama adı **"Rapor içi ek"** olur ve
  ikincil konuma iner; asıl ekleme **Belge ekleri** panelindedir.
- ≤900 px: tek sütun; sekmeler üstte kalır, paneller alt alta (mevcut desen).

---

## 9. Çıktı biçimleri ve dosya adları

| Kip | Ne iner | Öneri |
|---|---|---|
| **İki dosya** | `UstYazi_<no>.udf` + `EK-1_Rapor_<no>.udf` | **Varsayılan** (kullanıcının istediği) |
| **Tümü ayrı** | Üst yazı + rapor + her belge eki | Ek varsa |
| **Tek ZIP** | `UstYazi.udf`, `EK-1_Rapor.udf`, `EK-2_Teknik.udf`…, `belgeler.json` | İsteğe bağlı |
| **Tek UDF** | Üst yazı → sayfa sonu → EK-1 → EK-2… | **Önerilmez** (UYAP'ta ek ayrımı ve sayfa numarası karışır); istenirse sunulur |

- Her belge için **DOCX** yardımcı kopya ve **yazdır/PDF** aynı şekilde.
- `belgeler.json` (manifest): sıra, tür, dosya adı, sha256 — delil paketi
  deseninin (v2.208) aynısı. Üst yazıdaki EK numarası ile **birebir** eşleşir.
- Dosya adları: `safeName(fileNo)` + ek numarası. ZIP adı:
  `UstYazi_Belgeler_<no>_<tarih>_<saat>.zip` ("Paket" sözcüğü kullanılmaz).
- **Teknik gerçek:** UDF dosyaları **ayrı ayrı** üretilir; her biri kendi
  `content.xml`'idir. "Tek dosya" istenirse **bizim ürettiğimiz** tek UDF içine
  sayfa sonlarıyla yazılır (mevcut `pageBreak()` deseni).

---

## 10. Raporu temizleme — hangi bölüm nereye

Öneri: **"Yalın rapor + belge ekleri"** tek tık düzeni (hazır profil dayatması
değil; kullanıcı sonra tek tek değiştirebilir).

| Rapor gövdesinde KALIR (EK-1) | **EK-2 Teknik bilgiler**'e ÇIKAR |
|---|---|
| Kapak · künye · içindekiler | `origin` (köken/teslim zinciri) |
| 1 kapsam ve sınırlar | `embedded` (gömülü metadata) |
| 2 cevaplanacak sorular | `acquisition` (delil edinme) |
| 3 maddi unsurlar (**envanter tablosu dâhil**) | — (envanter `s3` içinde KALIR; rapor içi **EK-2** kopyası kaldırılır) |
| Konuşmacılar (+ süreler) | `levels` (seviye/kırpılma) |
| 4 yöntem ve dayanaklar | `wer` (çözümleme doğruluğu) |
| 5 kayıt bazında bulgular + transkript | `qc` (kalite kontrol) |
| Okuma metni | `integrity` (bütünlük kaydı) |
| Cevaplar · sınırlılıklar | `tech` (teknik ortam) |
| Gerekçeli sonuç · imza | Rapor içi ekler: envanter/günlük/kontrol listesi |

- Taşınan bölüm **raporda çizilmez** → `reportBlockRenders`'a "belge ekine
  taşındı" koşulu eklenir; TOC ve numaralar buna göre üretilir (v2.289 kuralı).
- **Envanter özel durumu:** `inventory` ayrı bir bölüm anahtarı **değildir**;
  `s3` gövdesinin içinde basılır. Bu yüzden iki seçenek var:
  (a) **öneri** — `s3` tablosu raporda kalır, rapor içi `ek2` kopyası kaldırılıp
  **belge eki** olur (mükerrerlik biter, refactor gerekmez);
  (b) tablo rapordan **tamamen** çıksın istenirse `s3` ikiye ayrılır
  (`s3` metni + yeni `inventory` bölümü) — v2.324'te küçük ve kanıtlı refactor.
- **Karıştırılmaması gereken:** `annexPlacement` = bölüm **aynı rapor içinde**
  EKLER altına iner. `letterAnnexes.sections` = bölüm **ayrı belgeye** çıkar.
  İkisi aynı bölüm için aynı anda açılamaz (çakışma uyarısı).

---

## 11. Mevcut "rapor içi ek" özelliğiyle ilişki

Kullanıcı: *"rapor sayfasındaki ek ekleme özelliği olarak karıştırmayalım,
gerekirse o kısmı da revize edebilirsin."*

- **Silinmez.** Rapor içi ekler gerçekten gerekli olabilir (gösterim anahtarı,
  dayanaklar) ve sürükle-bırak düzeni çalışıyor.
- **İki liste, tek kural:** "Rapor içi ekler" ve "Belge ekleri" ayrı panellerde;
  aynı ek iki yerde **gösterilmez** (taşındığında diğer tarafta kapanır).
- **Varsayılanlar:** envanter · günlük · kontrol listesi rapor içinde **kapalı**,
  belge eki olarak **önerilir**; gösterim anahtarı ve dayanaklar rapor içinde kalır.
- Sürükle-bırak ve ↑↓ korunur (erişilebilirlik).

---

## 12. Göç, birleştirme, revizyon

| Konu | Kural |
|---|---|
| **Eski kayıt** | `letter` yok → üst yazı kapalı; rapor **birebir** aynı çıktı. Sessiz davranış değişikliği yok. |
| **normalize** | `emptyLetter` varsayılanı; bilinmeyen alan korunur; geçersiz `kind` düşer. |
| **Birleştirme** | Ekler `id` ile eşleşir; aynı id farklı içerik → `letter-annex` **çakışması** (sessiz ezme yok). `letter` metni `textRev` deseniyle. |
| **Revizyon** | `reportSnapshot`'a `letter` + `letterAnnexes` eklenir (kanıt/ses girmez). |
| **Yedek** | `.akis` paketine `letter` alanları girer (yeni alan, ek dosya yok). |

---

## 13. Testler

| Test | Ne denetler |
|---|---|
| `birim` | Ek numaralandırma bitişik; `normalizeLetter` bilinmeyeni korur; taşınan bölüm raporda **çizilmez**; üst yazı metni boş alanı atlar (uydurma yok) |
| `rapor` | Üst yazı **HTML/DOCX/UDF aynı metin**; EK numaraları üç çıktıda aynı; uygulama adı yok; ek listesi = `letterAnnexes` |
| `tasarim` | İki sekme, A4 önizleme, panel kırpma yok; 1440/1100/900/760 |
| `surum` | `#letterTab`, `#letterPaper`, `#letterAnnexes`, `#letterExportBtn` kimlikleri; yardım konusu |

Kural: yeni test **düzeltme/özellik yokken KALMALI** (depo disiplini).

---

## 14. Faz planı (her faz tek sürüm)

| Sürüm | Kapsam | Ölçüt |
|---|---|---|
| **v2.323** | Veri modeli (`letter`, `letterAnnexes`) + **üst yazı sekmesi** + A4 önizleme + **üst yazı UDF/DOCX** + **iki dosya indirme** (EK-1 = rapor) | Üst yazı tek sayfa; EK listesinde EK-1; iki dosya iner; rapor çıktısı **değişmez** |
| **v2.324** | **Belge ekleri paneli**: ek ekle/sırala/sil (`sections`, `reportAnnex`, `custom`) + "rapordan çıkar" + raporda çizilmeme | EK-2 Teknik bilgiler ayrı belge; raporda o bölümler yok; çift üretim yok |
| **v2.325** | **ZIP + `belgeler.json`**, sayfa sayısı (opt-in), yazdırma, yardım/OZELLİKLER, "yalın rapor" düzeni | Paket açıldığında ek sırası manifestle birebir; kırpma 0 |

---

## 15. Karar soruları (önce bunlar netleşmeli)

1. **Üst yazıda sayfa sayısı** yazılsın mı? — *öneri: varsayılan kapalı, açılırsa "≈" + dipnot.*
2. **EK-2 Teknik bilgiler** hangi bölümleri içersin? — *öneri: §10'daki sağ sütun.*
   Ek olarak: **envanter tablosu** raporda kalsın mı (§10 seçenek a), yoksa tamamen
   EK-2'ye mi taşınsın (seçenek b)? — *öneri: (a).*
3. Varsayılan indirme **iki dosya** mı, **ZIP** mi? — *öneri: iki dosya; ZIP isteğe bağlı.*
4. Rapor içi teknik ekler **kapatılsın mı**? — *öneri: kapatılıp EK-2'ye taşınsın; gösterim anahtarı ve dayanaklar raporda kalsın.*
5. Muhatap **mahkeme adından otomatik** mı, elle mi? — *öneri: otomatik + düzenlenebilir.*
6. İmza: ad soyad + "Bilirkişi" + çizgi, **e-imza yok** — onay?
7. Üst yazı **tarihi** ayrı mı, rapor tarihi mi? — *öneri: ayrı alan; boşsa rapor tarihi.*
8. "Tek UDF" (üst yazı + ekler tek dosya) **gerekli mi**? — *öneri: sunulur ama varsayılan değil.*

---

## 16. Dürüst sınırlar

- **Gerçek PDF motoru yok**: PDF = tarayıcı "Yazdır → PDF". Üst/alt bilgi tarayıcıya bağlı.
- **UDF sayfa düzeni UYAP editörüne bağlı**: sayfa sayısı ve kırılma yeri birebir garanti edilemez.
- **PDF/dosya birleştirme yok**: `kind:'file'` yalnız ZIP içinde ham dosya olarak taşınır; UDF'e gömülmez.
- **Sayfa numarası** motora bağlı (Word `PAGE`, UYAP editörü, tarayıcı) — uydurulmaz.
- **İki belge iki ayrı dosyadır**: tek UDF'te birleştirmek teknik olarak mümkün ama ek ayrımı ve numaralandırma karışır.
