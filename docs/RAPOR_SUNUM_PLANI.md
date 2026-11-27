# Rapor Sunumu ve İçerik Planı (v2.369+)

Bu belge, raporun **ilk girişten (kapak) imzaya kadar** uçtan uca okunaklı,
mantıklı sıralı ve profesyonel olması için yapılacak işleri tanımlar. Yeni oturum
**önce ölçer** (ekran görüntüsü + PDF/DOCX/UDF), sonra uygular. Her adım tek
sürüm; üç çıktı (HTML/DOCX/UDF) **aynı metni** üretmeye devam eder.

## 1. Amaç ve değişmez ilkeler

- Rapor **bilirkişi adına** yazılır; uygulama adı/sürümü çıktıda geçmez.
- **İnceleyen kişi** (hâkim/savcı/avukat) belgeyi baştan sona **bir kez**
  okuduğunda: kimlik → kapsam → yöntem → bulgu → cevap → sınır → sonuç
  akışını görmeli; teknik tablolar okumayı kesmemeli.
- **Üç çıktı aynı metin**; yalnız biçim (font, çizgi, sayfa) değişebilir.
- **Ölçülmeyen değer yazılmaz**; boş alan “—” ile uydurulmaz.
- **Kırpma yok**: sığmayan öğe sarar; gizli yatay kaydırma yok.
- **Tek kaynak**: bölüm/ek tanımı, numara, TOC, üç çıktı aynı yerden.
- **Sürükle-bırak tek yol değildir**; düğme/menü ve klavye korunur.

## 2. Bugünkü envanter (v2.368, koddan)

| Katman | Tanım | Varsayılan |
|---|---|---|
| Ön bölüm | **4** (`cover`, `coverFields`, `summary`, `toc`) | 3 açık (`summary` kapalı) |
| Gövde | **27** anahtar (`s1…s7`, `origin`, `embedded`, `acquisition`, `integrity`, `speakers`, `speakerDurations`, `reading`, `terms`, `answers`, `limits`, `wer`, `levels`, `reviewSummary`, `qc`, `scopeNote`, `privacy`, `annex`) | **18 açık**, 9 kapalı |
| Yerleşik ek | **6** (`ek1…ek6`) | hepsi açık |
| İmza | **1** (`signature`, gövde sırası dışında, sonda) | açık |

**Varsayılan kapalı olanlar:** `summary`, `terms`, `integrity`, `s7`, `enhance`,
`asr`, `tech`, `scopeNote`, `qc`, `privacy`.

**Mevcut gövde sırası:** `s1, s2, s3, origin, embedded, acquisition, integrity,
speakers, speakerDurations, s4, tech, enhance, asr, s5, answers, limits, reading,
terms, wer, levels, reviewSummary, qc, scopeNote, privacy, s6, s7, annex`.

**Mevcut yerleşik ek sırası:** EK-1 teslim/iade · EK-2 teknik envanter ·
EK-3 işlem günlüğü · EK-4 gösterim anahtarı · EK-5 son kontrol listesi ·
EK-6 hukuki/yöntemsel dayanaklar.

**Bugünkü ölçüm (v2.368, gerçek Chromium 1440×900):** kâğıt **898 px sabit**,
araç çubuğu **50 px**, sağ çekmece **440 px**, sol iskelet **232 px**, yatay
taşma **0**, JS hatası **0**.

## 3. Önerilen varsayılan sıra (yeni dosyalar)

> Mevcut dosyaların sırası **korunur**; yeni varsayılan yalnız yeni dosyada
> uygulanır (`normalizeReportLayout` eksik anahtarı doldurur, mevcut sırayı
> değiştirmez).

### Öneri A — “Sunum” (okunaklı, inceleyen odaklı) — **önerilen**

**Ön bölüm (3):** Kapak → Rapor künyesi → İçindekiler.

**Gövde (9):**
1. Görevlendirme, incelemenin konusu ve sınırları
2. Bilirkişinin cevaplaması gereken sorular
3. Bilirkişiden gözlemlenmesi ve incelenmesi istenen maddi unsurlar
4. İnceleme yöntemi, bilimsel ve teknik dayanaklar
5. Kayıt bazında bulgular ve transkript
6. Görevlendirme sorularına cevaplar
7. Anlaşılabilirlik ve teknik sınırlılıklar
8. Okuma metni *(isteğe bağlı; varsayılan açık)*
9. Gerekçeli sonuç
10. EK LİSTESİ (yalnız başlıklar)
11. EKLER (içerik)

**Ekler (6 yerleşik + taşınanlar gruplanmış):**

| Ek | İçerik |
|---|---|
| EK-1 | Materyal teslim ve iade tutanağı |
| EK-2 | Dosya teknik envanteri |
| EK-3 | Zincirleme muhafaza / işlem günlüğü |
| EK-4 | Transkript gösterim anahtarı |
| EK-5 | Son kontrol listesi |
| EK-6 | Hukuki ve yöntemsel dayanaklar |
| EK-7 | Kayıt kökeni · edinme/doğrulama · gömülü metadata |
| EK-8 | Konuşmacılar · süreleri · ölçümler (WER, seviye) · inceleme özeti |
| EK-9 | Teknik ortam · kalite kontrolü · bütünlük · gizlilik · kapsam dışı |
| EK-10 | Terim listesi · ses iyileştirme · çözümleme yöntemi ayrıntısı |

> **Not:** Bugün her taşınan bölüm **kendi ekini** açar. EK-7…EK-10 gibi
> **gruplu ekler** için `annexPlacement` alanının **grup kimliği** taşıması
> gerekir (bkz. §5). Bu yapılmadan taşıma yapılırsa 16+ ayrı ek oluşur ve
> inceleyen için okunmaz olur.

**İmza:** en sonda, tek blok (ad, unvan, sicil, tarih, imza alanı).

### Öneri B — “Mevcut korunur”

Yalnız gövde içi sıra iyileştirilir (teknik tablolar bulgulardan **önce**
gelmeye devam eder); taşıma yapılmaz. Daha az risk, daha az kazanç.

**Karar:** Öneri A, ancak §5 (ek gruplama) tamamlandıktan sonra uygulanmalı.

## 4. Gövde ↔ ek ayrımı (öneri)

| Bölüm | Öneri | Gerekçe |
|---|---|---|
| s1 kapsam, s2 sorular, s3 maddi unsurlar | **Gövde** | İnceleyenin ilk okuduğu çerçeve |
| s4 yöntem | **Gövde** | Yöntem özeti; ayrıntı EK-10 |
| s5 bulgular/transkript | **Gövde** | **Kanıtın kendisi**; eke taşınmaz |
| answers cevaplar | **Gövde** | Sorularla birebir eşleşir |
| limits sınırlılıklar | **Gövde** | Sonuçtan önce okunmalı |
| reading okuma metni | **Gövde (isteğe bağlı)** | Okunabilirlik; kanıt tablosu değişmez |
| s6 sonuç | **Gövde** | Belgenin hedefi |
| origin köken, acquisition edinme | **Ek (EK-7)** | Zincir kanıtı; gövdeyi kesmemeli |
| embedded metadata | **Ek (EK-7)** | Beyan; teknik |
| speakers, speakerDurations | **Ek (EK-8)** | Tablo; gövdede yalnız kısa satır kalabilir |
| wer, levels, reviewSummary | **Ek (EK-8)** | Ölçüm tabloları |
| tech, qc, integrity, privacy, scopeNote | **Ek (EK-9)** | Teknik/beyan |
| terms, enhance, asr | **Ek (EK-10)** | Yardımcı/teknik ayrıntı |
| s7 ek listesi | **Gövde sonu** | İçindekilerle karışmasın; yalnız başlıklar |

## 5. Ek gruplama (yeni yetenek — ön koşul)

Bugün: `case.report.annexPlacement[key] = true` → bölüm **kendi ekini** açar.

Öneri: `annexPlacement[key] = 'ek2' | 'x1' | true` olsun.

- **`'ekN'`**: bölüm, yerleşik ek **N**’in içinde (başlığının altında) basılır.
- **`'xN'`**: kullanıcı eki (başlık `annexMeta`ten).
- **`true`**: eski davranış (kendi eki) — geri uyum.

Kurallar:
1. **Tek kopya:** bir bölüm ya gövdede ya **bir** ekin içinde. İki yerde olmaz.
2. **Numara bitişik:** açık ekler EK-1…EK-N; kapalı ek numara tüketmez.
3. **Alt başlık:** ek içinde bölüm başlığı `EK-N.1`, `EK-N.2`… (alt ağaç korunur).
4. **Üç çıktı aynı:** HTML/DOCX/UDF aynı grup/numara/sırayı basar.
5. **Göç:** `true` → kendi eki (davranış değişmez); `'ekN'` yeni.
6. **Boş ek:** içinde bölüm yoksa ve yerleşik gövdesi yoksa çizilmez.

## 6. Sürükle-bırak (gövde ↔ ek)

Bugün: her gövde satırında **EK** düğmesi (`data-report-place`) bölümü kendi
ekine taşır; sürükleme yalnız **gövde içi sıralama** için var.

Öneri:
- **Gövde satırını ek başlığına sürükle** → o ekin içine taşı.
- **Ek içindeki satırı gövdeye sürükle** → geri al.
- Sürükleme sırasında hedef **vurgulanır**; bırakınca **onay** (yanlış taşıma
  olmasın), `snapshotForUndo` + `logEvent`.
- **Yedek yol korunur:** EK düğmesi/menüsü ve klavye (ör. `Alt+E`) çalışmaya
  devam eder (erişilebilirlik; sürükleme tek yol olamaz).
- Filtre açıkken sürükleme **kapalı** (komşuluk yanıltıcı olur) — v2.178 kuralı.

## 7. Tablo, çizgi ve font alternatifleri

`case.report.format` bugün: `fontFamily`, `fontSizePt (11–14)`, `marginsMm`,
`orientation`. Öneri (görsel; **metin değişmez**):

| Ayar | Seçenekler | Etki |
|---|---|---|
| `tableStyle` | `grid` (tam çerçeve) · `lines` (yalnız yatay) · `plain` (çizgisiz) | HTML yazdırma + DOCX kenarlık; UDF sınırlı |
| `density` | `comfortable` · `compact` | Satır dolgusu/aralık; ekran + yazdırma + DOCX |
| `fontFamily` | Times · Arial | Üç çıktı (UDF resmî kısıtı korunur) |
| `fontSizePt` | 11–14 | Üç çıktı |
| `lineHeight` | 1.3 · 1.5 · 1.7 | Ekran + DOCX |

**İki gösterim önerisi:**
1. **Belge (varsayılan):** A4, geniş kenar, transkript 14 pt, satır 1.7 —
   yazdırma/PDF ile birebir.
2. **Yoğun inceleme (ekran):** daha sıkı satır/dolgu, tablo yoğun; **çıktıyı
   etkilemez** (yalnız okuma). Tercih `akis.reportView` (dosyaya yazılmaz).

**Dürüst sınır:** UDF (UYAP) tablo kenarlığı/font konusunda kısıtlıdır; “üç
çıktı birebir aynı görünür” denmez. Hedef: **aynı metin + aynı başlık
hiyerarşisi**; görsel fark belgelenir.

## 8. Sol iskelet daraltma (paralel iş)

- İskelet başlığına **‹ / ›** düğmesi: daraltınca 48 px ince ray (yalnız
  “Bölümler” düğmesi), kâğıt genişler; tercih `akis.reportSkeletonCollapsed`.
- Dar ekranda mevcut **Bölümler** paneli korunur.
- Kâğıt genişliği ölçülür; kırpma/taşma 0 olmalı.

## 9. Ölçüm ve test ölçütleri

Her adımda:
1. **Görsel:** 1440/1100/900/760/600 px ekran görüntüsü; kapak, gövde, ek, imza.
2. **Taşma:** `scrollWidth > clientWidth` + `overflow` görünür değilse **kesme**
   sayılır; 0 olmalı.
3. **Üç çıktı:** `rapor-tutarlilik-testi` — aynı başlık/sıra/numara/metin.
4. **PDF:** `Page.printToPDF` sayfa sayısı; üst/alt bilgi her sayfada.
5. **DOCX:** LibreOffice ile PDF’e çevir (v2.364 tarifi); üst/alt bilgi, taşma.
6. **TOC = gövde:** her çizilen bölüm TOC’ta; numara boşluğu yok.
7. **JS hatası 0**; `bash tools/test.sh` yeşil.

## 10. Faz planı

| Sürüm | İş | Not |
|---|---|---|
| **v2.369** | **Sunum denetimi + varsayılan sıra** | Önce ölç; yeni dosya varsayılanı; mevcut dosya korunur |
| **v2.370** | **Ek gruplama** | `annexPlacement = 'ekN'`; EK-7…EK-10; üç çıktı + test |
| **v2.371** | **Sürükle-bırak** gövde ↔ ek | Onay + geri alma + günlük; düğme/klavye yedeği |
| **v2.372** | **Tablo/font/görünüm alternatifleri** | `tableStyle`, `density`; UDF sınırı belgelenir |
| **v2.373** | **Sol iskelet daraltma** | İnce ray; tercih tarayıcıda |
| **v2.374** | **Uçtan uca doğrulama** | PDF/DOCX/UDF + 3 tema + 5 genişlik + ekran görüntüleri |

## 11. Açık kararlar (kullanıcıya)

1. **Varsayılan sıra:** Öneri A (sunum) mı, Öneri B (mevcut) mi?
2. **Eke taşınacaklar:** §4 tablosundaki öneri onaylanıyor mu?
3. **Ek gruplama:** EK-7…EK-10 grupları uygun mu, yoksa her bölüm kendi eki mi?
4. **Tablo stili varsayılanı:** `grid` mı, `lines` mı?
5. **Yoğun inceleme görünümü:** yalnız ekran mı, çıktıya da yansısın mı?
6. **Sol iskelet:** varsayılan açık mı, daraltılmış mı?

## 12. Riskler ve sınırlar

- Varsayılan sıra değişikliği **yeni dosyaları** etkiler; mevcut dosyaların
  sırası korunmalı (test: eski `layout.order` aynen kalır).
- Ek gruplama numara/TOC’u değiştirir; üç çıktı ayrışırsa inceleyen yanılır.
- UDF tablo/font kısıtı: görsel birebir eşitlik **vaat edilmez**.
- Sürükleme tek yol olamaz; düğme/klavye korunur.
- Yoğun görünüm çıktıya yansırsa “resmî biçim” beklentisiyle çelişebilir;
  varsayılan **ekran-only** önerilir.

## 13. Başlangıç komutları

```bash
bash tools/test.sh
git log --oneline -3; git status --short
curl -s https://azmisahin-gov.github.io/akis/version.json
```

İlk iş: **mevcut raporun tamamını** (kapak → imza) gerçek Chromium’da aç,
her bölümün ekran görüntüsünü al ve §2’deki envanterle karşılaştır. Sonra
§11 kararlarını kullanıcıya sor; onay olmadan varsayılan sıra değiştirilmez.
