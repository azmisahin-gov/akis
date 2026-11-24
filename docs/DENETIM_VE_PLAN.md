# Rapor Biçimi Denetimi, Eski Notlar Durumu ve Yapılacaklar

Bu belge, 2026-11-24 tarihli oturumda yapılan **ölçümsüz analiz** (kaynak
okuma) sonucu hazırlanmıştır. Amaç: (1) raporun ekran görünümü ve UDF/DOCX/PDF
çıktılarındaki **biçim ayarlarının** bugünkü durumunu saptamak, (2) geçmişte
alınan **eski notların** uygulanıp uygulanmadığını kanıtla göstermek, (3)
öncelikli bir **yapılacaklar listesi** üretmek.

> Her madde "ÖLÇÜLDÜ" değil, "KAYNAKTAN SAPTANDI" olarak okunmalıdır. Bu
> oturumda tarayıcı ölçümü yalnız temel yükleme için yapıldı; piksel ölçümleri
> bir sonraki kod sürümünde (v2.238+) yapılacaktır.

---

## 1. Rapor biçimi — bugünkü gerçek (koddan)

Raporun üç çıktısı vardır: **HTML önizleme** (ekran + tarayıcı yazdırma = PDF),
**DOCX** (isteğe bağlı yardımcı kopya), **UDF** (UYAP için birincil çıktı).
Biçim ayarları BUGÜN kullanıcıya açık DEĞİLDİR ve üç çıktı birbirinden
farklıdır:

| Öğe | HTML önizleme | DOCX | UDF (birincil) | Kullanıcı ayarı |
|---|---|---|---|---|
| Yazı tipi | Arial (`--paper-font`) | Arial (sabit `w:rFonts`) | **Times New Roman** (sabit) | **YOK** |
| Gövde puntosu | 11px token (`--fs-2xs`) | 11pt (`w:sz 22`) | 11pt (sabit) | **YOK** |
| Sayfa boyutu | A4 oranı (ekran) | A4 `w:pgSz 11906×16838` | A4 `mediaSizeName="1"` | **YOK** |
| Kenar boşluğu | padding 58/66px | 2cm / 2.25cm (`w:pgMar`) | **60mm / 56.7mm** | **YOK** |
| Yön (dikey/yatay) | yalnız dikey | yalnız dikey | `paperOrientation="1"` | **YOK** |
| Yazdırma `@page` | **TANIMSIZ** | — | — | **YOK** |

### Saptanan açıklar

1. **PDF/yazdırma sayfa ayarı yok.** `@page` kuralı hiçbir CSS'te yok
   (`grep "@page"` = 0). Tarayıcının varsayılan kâğıt/marjı kullanılır; A4 +
   ölçülü marj garanti değildir. Bu, "resmî standarda uyum" için en somut
   eksiktir.
2. **Üç çıktı farklı biçim kullanır.** HTML/DOCX Arial, UDF Times New Roman;
   kenar boşlukları 2cm/2.25cm (DOCX) ile 60mm/56.7mm (UDF) arasında
   tutarsızdır. Resmî 56.12 referans UDF şablonu **Times New Roman · 10.5pt ·
   48/48/42/42mm** kullanır; mevcut UDF bunu 11pt · 60/60/56.7/56.7mm'ye
   zorlar.
3. **Punto ve font kullanıcıya kapalı.** "Punto", "gövde", "geçerli font"
   seçilemez; hiçbiri ayarlanabilir değildir.
4. **Yön (yatay/dikey) yok.** `reportFitWidth` ve `reportPageHeight` A4
   **dikey** oranını (297/210) sabit varsayar; yatay desteklenmez.

### Önerilen tasarım (v2.238 "Rapor biçimi")

`case.report.format` altında tek kaynak; üç çıktı ve yazdırma aynı değerleri
okur:

```js
case.report.format = {
  fontFamily: 'arial' | 'times' | 'segoe',  // HTML/DOCX; UDF kendi resmî
                                            // varsayılanını (times) korur
  fontSizePt: 11,                            // gövde puntosu (8–14)
  marginsMm: { top:20, right:20, bottom:20, left:20 },
  orientation: 'portrait' | 'landscape'
};
```

- **HTML:** `--paper-font`, `--paper-scale` (punto/11), paper padding (mm→px),
  yatayda genişlik/oran. `reportFitWidth`/`reportPageHeight` yönü dikkate alır.
- **Yazdırma/PDF:** dinamik `<style>@page { size: A4 <yön>; margin: …mm }`.
- **DOCX:** `w:rFonts`, `w:sz` (ölçek), `w:pgSz` (yön), `w:pgMar` (mm→twip).
- **UDF:** `family`, `size`, `pageFormat` marj/yön.

### KARAR BEKLEYEN SORULAR (kullanıcıya)

1. **Varsayılan kenar boşluğu kaç mm olsun?** Resmî 56.12 şablonu 48/48/42/42
   (yan/üst-alt) öneriyor; mevcut UDF 60/60/56.7/56.7'ye zorluyor. Hangisi
   esas alınsın?
2. **UDF yazı tipi Times New Roman kalsın mı?** Resmî şablon Times kullanıyor;
   DOCX/HTML Arial. Kullanıcı tek font seçince UDF de değişsin mi, yoksa UDF
   resmî varsayılanını mı korusun?
3. **Yatay (landscape) gerekli mi?** Geniş kanıt tabloları için mantıklı; yoksa
   tablo hücreleri sararak dikeyde de sığar mı?
4. **PDF:** tarayıcı yazdırma yeterli mi, yoksa ayrı bir "PDF indir" düğmesi
   (ör. jsPDF) istenir mi? (Yeni bağımlılık; depo "harici paket yok" ilkesine
   dikkat.)
5. Punto aralığı (8–14 mü, 9–12 mi)? Başlıklar gövdeye göre ölçeklensin mi?

> Bu sorular yanıtlanmadan **resmî UDF çıktısının varsayılanı DEĞİŞTİRİLMEZ**
> (depo kuralı: resmî çıktı sessizce değişmez).

---

## 2. Eski notlar — uygulanma durumu

Kaynak kodundan saptandı. "✅ Var", "⚠️ Kısmen", "❌ Yok" olarak işaretlendi.

| # | Eski not | Durum | Kanıt / Not |
|---|---|---|---|
| 1 | Hız göstergesine basınca liste başa atıyor, odak bozuluyor | **✅ v2.237'de düzeltildi** | Eski `data-seg-speed` dalı `renderSegments` çağırıyordu (kaydırma sıfırlanıyordu). Artık yalnız `.on` sınıfı güncellenir. |
| 2 | Wave'a tıklayıp yavaş dinleyince wave kayboluyor, başa gidiyor | **⚠️ Kısmen** | Wave/spek artık her zaman görünür (v2.186); tıklama `currentTime` ayarlar. "Başa gitme" yeniden üretilemedi; v2.238'de ölçülecek. |
| 3 | Listenin sonundaki satırda sağ-tık menüsünün yarısı görünmüyor | **✅ v2.237'de düzeltildi** | Menü konumu yalnız yatay kırpılıyordu; dikey taşıyordu. `clampSegMenuPosition` + ölçümle düzeltildi. |
| 4 | Üst üste konuşma "üst üste" gözlem etiketi doğru mu? | **✅ Mevcut** | `OBS_DEFS` içinde `overlap` ("üst üste konuşma") var. Kullanım doğru; ayrıca zaman çakışması `segmentTimeIssues` ile de bildirilir. |
| 5 | "Bekleyen" filtresinde "Çözümlendi" (makine) de görünüyor | **⚠️ Tasarım** | `segMatchesFilter('pending') = !isReviewed`; `machine` onay sayılmaz → "Bekleyen"de görünür. Kafa karıştırıcı; ayrım/etiket iyileştirmesi önerilir (karar gerek). |
| 6 | Anlaşılmaz bölümü düzeltirken hız değişti, bölüm "gitti" | **✅ v2.237 (kök)** | Hız değişimi tam yeniden çizim yapıyordu; kaydırma/odak kaybı nedeniyle "kayıp" görünüyordu. #1 ile aynı kök düzeltildi. |
| 7 | Üst üste konuşmaya "Onaylandı" demek doğru mu? | **⚠️ Rehber** | Onay = metni dinleyip doğrulama; üst üste ayrıca gözlem etiketi. İkisi çelişmez; `docs/STANDARTLAR.md`'ye açıklama eklenmeli. |
| 8 | "enişteyi [belirsiz] …" → belirsiz mi işaretlenir, okuma 1'e mi yazılır? | **✅ Mevcut** | `ambiguous` durumu + `reading1/reading2/chosen`. Öneri: iki aday okuma yazılır, biri seçilir. Rehber eklenmeli. |
| 9 | Etiketler hep sona ekleniyor; imleç konumuna eklenebilir mi? | **❌ Yok** | Hızlı etiket `cur + ' ' + text` ile **sona** ekler. İmleç konumuna ekleme yapılmıyor. (v2.238 adayı.) |
| 10 | Tek kelime kısmen anlaşılıyor → belirsiz mi, gözlem mi? | **⚠️ Rehber** | `ambiguous` iki okuma içindir; hızlı etiket/gözlemde "belirsiz" yok. Rehber + istenirse `OBS_DEFS`'e "belirsiz sözcük" eklenebilir (şema göçü). |
| 11 | Anlaşılmaz bölümde tek kelime: "anlaşılmadı" mı, "onaylandı" mı? | **⚠️ Rehber** | Karar bilirkişide: metin çoğu anlaşılmazsa `inaudible` + gözlem; tek kelime netleşmişse o kelime yazılıp `ambiguous`/`approved`. Rehber eklenmeli. |
| 12 | Deşifre yanındaki analiz paneli taşıyor, alanlar düzensiz, boş alanlar boşa gidiyor | **⚠️ Kısmen** | v2.190 (menü sarma) + v2.191 (panel kendi içinde kayar) iyileştirdi; "boş alan" ve düzen hâlâ iyileştirilebilir. |
| 13 | Raporda "belirsiz okuma" nasıl görünmeli? | **✅ v2.197** | `reviewCellText` yalnız `ambiguousReportText` basar: `Belirsiz okuma: "a" / "b" (seçilen: a)`. Yinelenen etiket kaldırıldı. |
| 14 | "Maddi unsur" genelde kapalı zarfta bir flash disk; köken zincirinde işleniyor mu? | **✅ Mevcut** | Ortam türü (USB/hafıza kartı), teslim eden/operatör, `delil.json` köken zinciri; `origin` tablosu. Bilinçli yapılandırılmış. |
| 15 | Bir vakada birden çok flash disk olursa işlenebilir mi? | **✅ Mevcut** | `case.disks[]` çoklu paket destekler (v2.215); her paket ayrı disk kaydı + materyaller. |
| 16 | Edinim aracı yalnız ses alıyor; video da gelebilir (56.12 kapsar mı?), eklenmeli mi? | **❌ Yok** | `isAudioFileName` yalnız wav/mp3/m4a/ogg/flac/aac. Video (mp4/mov/…) "Ses dışı (atlandı)" olur; materyal/deşifre edilmez. `-IncludeAll` videoyu **pakete alır** ama çözümlemez. Karar + ses çıkarma (demux) gerekir. |

---

## 3. Öncelikli yapılacaklar listesi

### Şimdi yapıldı (v2.237)
- **A1.** Hız düğmesi liste kaydırmasını/odağını bozmaz.
- **A2.** Satır menüsü her zaman ekranda kalır (dikey kırpma).
- Koruyan test: `birim [92]` (konum + kaynak sözleşmesi).

### Yüksek değer — karar bekliyor (v2.238 "Rapor biçimi")
- **B1.** Yazdırma/PDF `@page`: A4 + yön + ölçülü marj (en somut eksik).
- **B2.** `case.report.format`: font + punto + marj + yön; HTML/DOCX/UDF birlikte.
- **B3.** Üç çıktı biçim tutarlılığı (UDF resmî varsayılanı korunarak).
- Karar: §1'deki 5 soru.

### Orta değer — hızlı kazanımlar
- **C1.** Hızlı etiket imleç konumuna eklenmeli (#9).
- **C2.** `machine` (Çözümlendi) ile "Bekleyen" ilişkisi netleştirilmeli (#5):
  etiket/ipucu veya filtreden ayırma (karar).
- **C3.** `docs/STANDARTLAR.md`'ye "üst üste / belirsiz / tek kelime" rehberi (#7,8,10,11).
- **C4.** Analiz paneli düzeni ve boş alan değerlendirmesi (#12) — ölçümlü.

### Araştırma / karar
- **D1.** Video (56.12) desteği: video dönüştürme/demux; tarayıcıda `<audio>`
  ile mp4 sesi çözülebiliyor mu? Depo "harici paket yok" ilkesiyle sınırlı.
- **D2.** Wave tıklama "başa gitme" (#2) gerçek tarayıcıda yeniden üretim.
- **D3.** PDF ayrı düğme mi (jsPDF) yoksa yazdırma yeterli mi?

### Kural hatırlatması
- Tek konu = tek sürüm; kıran test önce; gerçek tarayıcıda tıklama; sürüm +
  CHANGELOG + YOL birlikte; resmî çıktı varsayılanı sessizce değişmez.
