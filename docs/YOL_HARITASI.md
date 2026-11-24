# Yol Haritası

AKİS sürüm numarasını `MAJOR.MINOR` biçiminde tutar. Tek kaynak
`assets/app.js` içindeki `APP_VERSION` değeridir; arayüzdeki etiket oradan
yazılır. **Güncel sürüm: v2.260.**

Her güncellemede üç yer birlikte artırılır: `APP_VERSION`, bu dosyadaki ilgili
başlık ve `CHANGELOG.md`. Ayrıntılı sürüm geçmişi:
[`../CHANGELOG.md`](../CHANGELOG.md).

## v2.260 — DOCX tablo sola çıkıntı (OpenOffice) giderildi (TAMAMLANDI)

- Hücre yatay dolgusu 110→0; dolgu paragraf girintisiyle (90). Kenarlık metinle hizalı.
- LibreOffice yok → kural düzeltildi, görsel doğrulama kullanıcıda; gerekirse `tblInd=110`.
- Koruyan: `rapor` 29.

## v2.259 — Resmîleştirme: DOCX tablo genişliği + ana bölüm yeni sayfa + PDF (TAMAMLANDI)

- DOCX tablo `tblW=contentTw` (15mm'de 10206) + `tblInd=0` → metin genişliğine oturur.
- Her ana bölüm (1–7) + ekler yeni sayfa (DOCX/UDF/yazdırma).
- "Yazdır" → "PDF / Yazdır" (üst/alt bilgi kapat notu). Gerçek PDF motoru YOK (dürüst sınır).
- Koruyan: `rapor` 29.

## v2.258 — Sayfa ayırımı: cantSplit + ekler yeni sayfa (TAMAMLANDI)

- DOCX tablo satırları bölünmez (`cantSplit`); ekler (EK-1…) DOCX/UDF/yazdırmada yeni sayfa.
- Kapak ayrı sayfa. Sayfa kırılması motora bağlı (dürüst sınır).
- Koruyan: `rapor` 29.

## v2.257 — UDF kenar boşluğu birim hatası (mm→punto) (TAMAMLANDI)

- UDF marjı **punto** saklar (boş şablon 42,525 pt = 15 mm = 1,5 cm). Biz mm'yi ham
  yazıyorduk → 20 pt = 7 mm → dar. Artık `mm × 72/25,4` punto yazılır.
- Varsayılan 15 mm (1,5 cm) = boş şablon; üç çıktı aynı. Koruyan: `rapor` 26, `birim [93]`.

## v2.256 — Kenar boşluğu UYAP boş dokümanıyla aynı (42,5 mm) (TAMAMLANDI)

- Kanıt: bos.udf = 42,525 mm (= templates/BOS.udf); bizimki 20 idi (override).
- Varsayılan 42,5 mm (üç çıktı); 0,5 adım, 10–50 mm. Mevcut dosya panelden ayarlanır.
- Koruyan: `birim [93]`, `rapor` 26 (`leftMargin="42.5"`).

## v2.255 — Kenar boşluğu varsayılanı 25 mm + şablon netliği (TAMAMLANDI)

- UDF marjı "Rapor biçimi → kenar boşluğu"ndan gelir ve boş şablonun ~42,5 mm'sini ezer.
- Varsayılan 20→25 mm (yeni dosyalar). Mevcut dosya 20'de kalır; panelden 25 yap.
- Panel notu eklendi. Koruyan: `birim [93]`.

## v2.254 — Üç çıktı aynı yazı tipi (TAMAMLANDI)

- Fark: UDF Times, DOCX/PDF Arial idi. Artık `fontFamily` **üç çıktıya da** uygulanır;
  varsayılan **Times New Roman** (resmî). Arial seçilirse UDF de Arial.
- Marjl 20 mm eşit; pixel-pixel aynılık motorlara bağlı (dürüst sınır).
- Koruyan: `birim [93]`, `rapor` 26.

## v2.253 — Rapor kâğıdı biçimi (TAMAMLANDI)

- Görsel: kapak bandı, bölüm sol vurgu, tablo zebra, imza çizgisi, alt bilgi.
- Yazdırma: tablo satırı bölünmez, thead yinelenir, başlık yalnız kalmaz.
- Metin değişmedi (üç çıktı aynı). Ölçüm: 4px bant/çizgi, zebra farklı. Koruyan: `birim [104]`.
- Sayfa no: DOCX PAGE var; HTML/UDF editöre bağlı (dürüst sınır).

## v2.252 — UDF ZWSP yalnız SHA-256 içinde (TAMAMLANDI)

- v2.251 hâlâ uzun zaman aralığı/sözcükleri sarıyordu (173 ZWSP, kısmı saat/kelimede).
- `zwspWrapLongHex`: yalnız `\b[0-9a-fA-F]{48,}\b`; metin/saat/tarih/sözcük **değişmez**.
- Koruyan: `birim [103]`.

## v2.251 — UDF ZWSP enjeksiyonu kaldırıldı (TAMAMLANDI)

- Gerçek UDF'te 377 U+200B (her 8 karakterde) → deşifre metni/saat/tarih kirleniyordu.
- Artık yalnız `\S{24,}` (ör. SHA-256) içinde satır kırma ZWSP'si; metin/saat temiz.
- Koruyan: `rapor` 28.

## v2.250 — "Ses / Video" başlığı + raporda "yalnız ses" notu (TAMAMLANDI)

- Sol ray/başlık "Ses ve video kayıtları" oldu.
- Video materyal varsa envanter notuna "yalnız ses, görüntü incelenmedi" eklenir;
  üç çıktı aynı metin. Video yoksa girmez.
- Koruyan: `birim [102]`, `rapor` 27.

## v2.249 — Analiz sekmesi kırpılmıyor, kendi içinde kayar (TAMAMLANDI)

- Ölçüm: Analiz içeriği 810/görünür 673; `#audioDetail overflow:hidden` alttaki
  "Konuşmacılar" bölümünü kesiyordu.
- Yalnız `[data-pane=listen]/[data-pane=record]` sekmelerine `overflow-y:auto`.
  Deşifre sekmesi değişmedi. Koruyan: `birim [101]`.

## v2.248 — Video dosyalarından ses çözümü (yalnız ses) (TAMAMLANDI)

- mp4/mov/m4v/webm/ogv kabul edilir; yalnız **ses** çözülür (görüntü incelenmez).
- Fizibilite: Chromium mp4/mov(AAC)/webm(Opus) sesini decodeAudioData ile çözdü.
- UI: kart uyarısı + günlük "Video (yalnız ses)" + biçim "MP4 (video)".
- Sınır: kodek çözülemezse açık hata; raporda ayrı "yalnız ses" notu sıradaki adım.
- Koruyan test: `birim [100]`.

## v2.247 — "Sayfaya sığdır" düğmesi çalışıyor (TAMAMLANDI)

- Ölçüm: tek-sayfa modda düğme ölüydü (`applyReportPageView` zorla `setReportFit(true)`).
- Zorlama kaldırıldı; `reportFitPref` varsayılan açık. Aç→507 px, kapat→900 px.
- Sürekli modda gizli; "Sürekli"yi kapatınca A4 + sığdır. Koruyan: `birim [99]`.

## v2.246 — Rapor ekranı: sürekli okuma varsayılan (TAMAMLANDI)

- Ölçüm (1440×900): varsayılan tek-sayfa+fit kâğıdı 320px'e sıkıştırıyordu.
- Artık varsayılan **Sürekli** (900px, normal kaydırma); A4/‹ › isteğe bağlı.
- Sürekli modda "Sayfaya sığdır" gizli (uygulanmıyor). Koruyan: `birim [98]`.

## v2.245 — UDF yatay/dikey yön (doğrulandı) (TAMAMLANDI)

- `paperOrientation`: "1" dikey, "0" yatay (yatay.udf ile doğrulandı). Rapor biçimi
  → Yön seçimi artık **UDF'e de** uygulanır (font resmî Times New Roman kalır).
- Koruyan test: `rapor` 26 (yatay "0", dikey "1").

## v2.244 — İş yükü özeti: anlamlı hâle getirildi (TAMAMLANDI)

- Tek satır özet başlığı; Ortalama bölüm + Kapsam % KPI'ları.
- "Kapsam boşluğu" ayrı **Kapsam** bölümüne taşındı (yanıltıcı "sorun" izlenimi kalktı).
- "Kalan iş (bölüm)" öne çıktı. Dürüst sınır: harcanan zamanı göstermez.
- Koruyan test: `birim [97]` (genişledi).

## v2.243 — İş yükü özeti (ölçülen göstergeler) (TAMAMLANDI)

- Özet/dashboard'a "İş yükü göstergeleri (ölçülen)": toplam süre (sa/dk/sn), kayıt,
  bölüm, kontrol bekleyen, konuşmacı etiketi, sorular; kontrol dağılımı; emek
  (onay %, elle düzeltme, hızlı onay); zorluk işaretleri.
- Süre **saniye** tutulur, "sa/dk/sn" gösterilir. **Süre/ücret tahmini YOK.**
- Saf `caseWorkload` + `formatWorkloadDuration`; `birim [97]`.

## v2.242 — Karar rehberi: üst üste · belirsiz · tek kelime (TAMAMLANDI)

- Yardım ekranına "Karar rehberi" bölümü; `docs/STANDARTLAR.md` §12.
- Kontrol durumu ≠ gözlem; Onaylandı ne demek; belirsiz ayrı durum; tek kelime.
- Yalnız belge + yardım; davranış değişmedi.

## v2.241 — Aktif bölümde "İş durumu" satırı (TAMAMLANDI)

- Detayda "İş" satırı: durum → tek eylem (onayla/dinle/seç) + birleştir/zaman/
  gözlem/belirsiz işaretleri; `segmentWorkSummary` saf + yerinde tazelenir.
- Koruyan test: `birim [96]`.

## v2.240 — Bölüm iş durumu: eksik filtreler + "Bekleyen" netliği (TAMAMLANDI)

- "Bekleyen" → "Kontrol bekleyen" (ipucu: makine "Çözümlendi" ve "Belirsiz" de
  onay beklediği için buradadır).
- Yeni koşullu filtreler: Çözümlendi(machine), Belirsiz(ambiguous),
  Uzun·bölünmeli(long), Üst üste(overlap), Anlaşılmayan(inaudibleObs).
- Sayaç = filtre TEK KAYNAK (`segmentIsLong`/`segmentHasObs`).
- Koruyan test: `birim [95]`.

## v2.239 — Hızlı etiket imleç konumuna eklenir (TAMAMLANDI)

- `insertTagAt` saf fonksiyonu: etiket imlecin olduğu yere (seçim varsa yerine);
  yoksa sona. Ekledikten sonra imleç etiketin ardına konur.
- Koruyan test: `birim [94]`.

## v2.238 — Rapor biçimi: sayfa · font · punto · marj · yön (TAMAMLANDI)

- `case.report.format` TEK KAYNAK: ekran önizlemesi + yazdırma/PDF (`@page`) +
  DOCX + UDF. Font, gövde puntosu (11–14), kenar boşluğu (mm), yön.
- UDF resmî olarak Times New Roman + dikey A4 korunur.
- Kontrol → **Rapor biçimi** paneli.
- Koruyan test: `birim [93]`, `rapor` 26.

## v2.237 — Bölüm listesi etkileşimi: hız ve satır menüsü (TAMAMLANDI)

- Oynatma hızı değişince liste yeniden çizilmez; kaydırma ve odak korunur.
- Satır (⋮) menüsü ekranda kalır: alt satırda yukarı açılır, dikey kırpılmaz.
- Koruyan test: `birim [92]`.

## v2.236 — Kanıt tablosunda da sütun aç/kapa (TAMAMLANDI)

- Analiz/kanıt tablosu: Konuşmacı/Kontrol/Gözlem aç/kapa; **zaman + metin
  ZORUNLU** (kilitli). EK-2 envanter ana envanter filtresini izler.
- Koruyan test: `birim [91]`, `rapor` 25, `tasarim [2cg]`.

## v2.235 — Rapor alanları: tablo sütunları aç/kapa (TAMAMLANDI)

- 5 tablo için sütun aç/kapa (envanter, köken, edinme, WER, seviye);
  kapatılan sütun üç çıktıda da yok. Veri silinmez.
- `REPORT_COLUMN_TABLES` tek kaynak; `case.report.columns`; revizyona dâhil.
- Koruyan test: `birim [90]`, `rapor` 24, `tasarim [2cf]`, `surum` kimlikleri.

## v2.234 — Okuma metni bağımsız bölüm (TAMAMLANDI)

- `reading` `REPORT_BODY_ORDER` içinde (`s5` sonrası); 5. bölüm kapalı olsa da
  tek başına açılır. Üç çıktı ayrı `reading` bloğu üretir.
- Eski kayıtlarda normalize onu `s5` hemen ardına koyar.
- Koruyan test: `rapor` Senaryo 12, `birim [89]`, `tasarim [2ce]`.

## v2.233 — Rapor: sayfa görüntüleyici (TAMAMLANDI)

- Tek A4 sayfa penceresi + ‹ › / PageUp-PageDown gezinme + "Sayfa N/M".
- "Sürekli" anahtarı eski uzun kâğıt akışını korur.
- Sabit üst çubuk (A4/Sığdır/gezinme); tanıtım gizli.
- Tablolar sayfaya sığar (fixed düzen + sarma).
- Koruyan test: `birim [88]`, `tasarim [2cd]`, `surum` kimlikleri.

## v2.232 — Tam A4 + tam ekran kontrolleri + sabit iskelet (TAMAMLANDI)

- **Sayfaya sığdır**: tek A4 sayfası ekrana sığar (A4 oranı korunur).
- **Tam ekranda kontroller** (dön/yazdır/UDF + A4/sığdır) görünür ve sticky.
- **Sol iskelet** kaydırırken görünür kalır (workspace `flex:0 0 auto` düzeltmesi).
- Koruyan test: `birim [87]`, `tasarim [2cc]`, `surum` kimlikleri.

## v2.231 — Belge odaklı bölüm düzenleme (TAMAMLANDI)

- Belgede bölüme tıkla → sağda **odaklı düzenleyici**; belge görünür kalır,
  seçili bölüm vurgulanır.
- **Yöntem (4) · Sınırlılıklar (5) · Sonuç (6)** serbest metinleri burada.
  Diğer bölümler veriden üretilir; "ilgili yeri aç" yönlendirir.
- **A4 kâğıdı contentEditable DEĞİL**; üç çıktı aynı metni üretir.
- Koruyan test: `birim [86]`, `tasarim [2cb]`, `surum` kimlikleri.

## v2.230 — Tek kayıt durumu + dahil/kontrol ayrımı (TAMAMLANDI)

- Araç çubuğunda **tek durum çipi**: "Engelleyen eksik: N" / "Kontrol bekliyor: N"
  / "Hazır" (renk + metin). `reportRecordStatus` tek kaynak.
- İskelet başlığı **"N dahil · M hariç"**; kapalı bölüm soluk. Kontrol panelinde
  "Dahil = rapora girer · Kontrol = dinlenip onaylandı" açıklaması.
- Rapor görünümünde alt çubuktaki yinelenen bölüm/denetim sayaçları gizli.
- Koruyan test: `birim [85]`, `tasarim [2ca]`, `surum` kimlikleri.

## v2.229 — Rapor iskeleti: arama, kategori, yalnız açık (TAMAMLANDI)

- İskelette **bölüm arama**, **kategori çipleri** (Kapak · Ana · Teknik · Beyan ·
  Kapanış) ve **"Yalnız açık"** anahtarı. Yalnız görünürlüğü süzer; **rapor
  sırası/içeriği değişmez**. Filtre oturumluktur.
- Kategoriye göre **yeniden sıralama YOK** (çıktı sırasını bozardı).
- Koruyan test: `birim [84]`, `tasarim [2bz]`, `surum` kimlikleri.

## v2.228 — Rapor çalışma alanı: Düzenle / Kontrol (TAMAMLANDI)

- **İki mod:** Düzenle (belge + iskelet, kontrol paneli kapalı) · Kontrol
  (panel açık). Mod hatırlanır; dosyaya yazılmaz.
- **Kontrol maddeleri önem sırasına göre gruplanır:** engelleyen · uzman
  kontrolü · iyileştirme. `READINESS_SEVERITY` tek kaynak.
- **Geniş sarı uyarı belgeden kalktı**; uyarılar Kontrol panelinde. Düzenle
  modunda "⚠ N engelleyen eksik" çipi Kontrol'e götürür.
- Koruyan test: `birim [60]`, `tasarim [2by]`, `surum` kimlikleri.

## v2.227 — Rapor ekranı ve şablon yeniden tasarımı (TAMAMLANDI)

- Rapor ekranı **üç bölge**: rapor iskeleti · A4 önizleme · kontrol/revizyon.
- Tüm bölümler ve **ekler** tek iskelette; ↑↓ sıralama, tek tek aç/kapa.
- **Numara türetilir** (kapatınca boşluk yok); **TOC gövde sırasını izler**.
- **Ekler ayrı ve düzenlenebilir kayıt**, EK-1…EK-N bitişik (eski EK-4 boşluğu
  kapandı); başlık/içerik/not düzenlenir, özel ek eklenir.
- **Rapor revizyonu**: düzen + rapor metinleri (kanıt dışı), en çok 10 kayıt;
  iki revizyon karşılaştırılabilir.
- **Saf model** `assets/report-model.js` (sıra/numara/revizyon); uygulama ve
  test aynı dosyayı kullanır.
- Üç çıktı (HTML/DOCX/UDF) **aynı sıra ve metni** üretir.
- Ayrıntı: `CHANGELOG.md` v2.227; plan: `RAPOR_EKRANI_PLANI.md`.

## Planlanan çalışmalar (uygulanmadı)

Ayrıntılı seçenekler ve öneriler: [`GELECEK_PLANI.md`](GELECEK_PLANI.md).
Delil standardı ve `delil.json`: [`DELIL_EDINME.md`](DELIL_EDINME.md).

Öncelik sırası (kullanıcı kararı):

> **SIRADAKİ İŞ (v2.226 sonrası): Rapor ekranı + şablon yeniden tasarımı.**
> Kullanıcı: "Rapor ekranı kullanışlı olmalı; tüm rapor parçaları **ekler dahil**
> organize edilebilmeli; rapor tutarlı, düzenli ve okunaklı sırayla hazırlanmalı.
> Bölümler · A4 önizlemesi · rapor kontrolü · revizyon ayrı ayrı planlanmalı."
> **Önce plan, sonra kod.** Plan: [`RAPOR_EKRANI_PLANI.md`](RAPOR_EKRANI_PLANI.md)
> (ekran mimarisi, sıra/ek veri modeli, karar soruları, v2.227+ faz planı).

1. ~~**Delil edinme — Tier 1**, envanter ve gömülü metadata~~
   **v2.208–v2.217 arasında yapıldı.**
2. ~~**v2.218 — Tasarım denetimi:**~~ **yapıldı.** Delil envanteri masaüstü
   ızgarasına yerleştirildi (tam genişlik üst satır); kayıt listesi ve detay
   paneli doğru yüksekliğe döndü; envanter açıkken metin/analiz örtüşmesi
   giderildi. Yeni özellik yok; `tasarim-testi` [2bm] korur.
   ~~**v2.219 — Parametrik rapor (bölüm aç/kapa):**~~ **yapıldı.** 19 bölüm
   anahtarı; Rapor görünümünde "Rapor bölümleri" paneli; üç çıktı (HTML/DOCX/
   UDF) aynı anahtarı onurlandırır; içindekiler açık bölümleri listeler.
   `rapor-tutarlilik-testi` [Senaryo 17] + `sema-testi` [3h] + `tasarim` [2bn].
   ~~**v2.220 — 56.12 şablon bölümleri:**~~ **yapıldı.** Künye, kısa özet, ses
   iyileştirme, ASR, sınırlılık beyanı, gizlilik ve EK-1…EK-7 **varsayılan
   kapalı** olarak eklendi; üç çıktı aynı metni üretir.
   `rapor-tutarlilik-testi` [Senaryo 18].
   ~~**v2.221 — Sayfalı önizleme (A4):**~~ **yapıldı.** Varsayılan kapalı
   "Sayfalı önizleme (A4)" anahtarı; açınca A4 sayfa çizgileri + "Sayfa N/M".
   Ekran kılavuzudur; yazdırmada gizlenir. `sema-testi` [3h], `tasarim` [2bo].
   ~~**v2.222 — Teknik ortam alanları:**~~ **yapıldı.** 7 elle düzenlenebilir
   alan (iş istasyonu/OS/yazılım/meta aracı/dinleme/ortam/diğer); rapor `tech`
   bölümü varsayılan kapalı; boşsa "—". `rapor` [Senaryo 19], `sema` [3h].
   ~~**v2.223 — Rapor profilleri:**~~ **yapıldı.** Yalın (7) · Standart (19) ·
   Tam 56.12 (27) hazır bölüm kümeleri; tek tıkla, veri değişmez.
   `sema` [3h], `tasarim` [2bq].
   ~~**v2.224 — Yazdırma temizliği:**~~ **yapıldı.** Yazdırmada yalnız rapor
   kâğıdı; bölüm/teknik/hazırlık panelleri ve anahtarlar gizli (print bloğu
   dosya sonunda). `tasarim` [2br].
   ~~**v2.225 — Künye ek alanları:**~~ **yapıldı.** Raporun ekleri + tarafsızlık
   beyanı elle doldurulur (boşsa "—"); üç çıktı aynı. `rapor` [Senaryo 20],
   `sema` [3h], `tasarim` [2bs].
   ~~**v2.226 — Kalite kontrolü:**~~ **yapıldı.** `qc` bölümü (kapalı): otomatik
   denetim sayaçları + ikinci kontrol alanları. `rapor` [Senaryo 21], `sema` [3h],
   `tasarim` [2bt].
3. **Kanıt tutarlılığı:** dosya zamanı ↔ gömülü metadata çelişkisi, envanterde
   dosya zamanları, hazırlık kartı maddesi.
4. **Hızlı yardımcılar (LLM'siz):** soru↔bölüm eşleştirme, terim/konu listesi,
   seçmeli özet.
5. **Rapor (ODAK):** bölüm/başlık tek kaynak + kurumsal biçim.
6. **Delil araçları:** `-AudioOnly` eşiği → Rust CLI → Tier 2 / sanal imaj →
   yerel ajan.
7. **LLM (isteğe bağlı):** tarayıcı küçük modeller kapalı; Ollama/native 4B
   ancak ölçümden sonra. Çıktı taslak; rapora kendiliğinden girmez.
8. **Uzun vade:** Tauri; tam Rust yeniden yazım en son.

Ayrıntılı tablo, emek/risk ve karar bekleyen sorular:
[`GELECEK_PLANI.md` §11](GELECEK_PLANI.md).

Kalan maddeler **uygulanmadı**; sürüm numarası verilmedi.

## v1 — Yayımlanmış sürüm (tamamlandı)

v1 kapsamındaki çalışmalar tamamlanmış ve `main` dalında yayındadır.

| Alt sürüm | Çalışma | Durum |
|-----------|---------|-------|
| 1.1 | Mevcut sistemin korunması | Tamamlandı |
| 1.2 | Mercie özel raporlar, DOCX ve UDF | Tamamlandı |
| 1.3 | Konuşma çözümleme motoru ve modeller | Tamamlandı |
| 1.4 | Model yöneticisi, GPU/CPU, toplu çözümleme | Tamamlandı |
| 1.5 | Uzun kayıt yönetimi | Tamamlandı |
| 1.6 | Gelişmiş deşifre editörü | Tamamlandı |
| 1.7 | Dijital delil güvenliği | Tamamlandı |

Mevcut özelliklerin tam listesi için [`OZELLIKLER.md`](OZELLIKLER.md) dosyasına
bakın.

## v2 — Sıradaki çalışma

### v2.217 — Gömülü metadata (cihaz beyanı) (tamamlandı)

- ID3v2.3/2.4, MP4/M4A, WAV (bext/INFO), FLAC ayrıştırıcıları.
- `origin.embedded` (kaynak, kayıt/kodlama/sürüm zamanı, yazılım, okunma).
- Köken panelinde gösterim + **Dosyadan oku**.
- Rapor: **varsayılan kapalı** `report.includeEmbedded`; açılınca üç çıktıda
  "GÖMÜLÜ METADATA (CİHAZ BEYANI)" bölümü.
- Koruyan testler: `birim` [83], `rapor` 16, `tasarim` [2bl].

### v2.216 — Delil envanteri ve dosya zamanları (tamamlandı)

- Ses görünümünde **Delil envanteri** paneli: tüm dosyalar ağaç olarak,
  arama + paket seçimi; ses satırı kaydı açar.
- `case.disks[].files`: ad, yol, boyut, SHA-256, rol (ses/ses dışı), materyal bağı.
- `origin.fileTimes`: oluşturulma/değiştirilme/erişim (gözlem).
- Rapor: "bu zamanlar kayıt zamanı değildir" notu üç çıktıda.
- Koruyan testler: `birim` [82], `rapor` 14, `tasarim` [2bk].

### v2.215 — Paket v2: disk yapısı ve disk.json (tamamlandı)

- Paket: `icerik/<cihaz-kökü>/<kaynak yolu>`; yapay `ses/` yok. Kök = seri no
  (yoksa etiket/model), klasör kaynağında klasör adı.
- `relPath` = kaynak yolu; `packagePath` = paket içi yol. v1 uyumlu.
- Varsayılan **tüm dosyalar**; `-AudioOnly` yalnız ses.
- `disk.json` (`akis.disk.v1`): disk/bölüm/birim + dizin ağacı; raw sektör yok.
- AKİS: `case.disks[]`, materyal `origin.acquisition.diskId`; birleştirme
  kimlikle, farklı içerik çakışma.
- Alet sürümü **1.3** (v1 paket = 1.2).
- Koruyan testler: `birim` [81], `tasarim` [2bj].

### v2.214 — Edinim 1.2: zip'te BOM korunur (tamamlandı)

- Kök neden: `fetch().text()` BOM'u siler; PowerShell 5.1 ANSI okur; `—` → `”`
  dize sınırı sanılır → sözdizimi hatası.
- Düzeltme: zip'e yazarken `.ps1` başına BOM; betikte tipografik işaret yok.
- Alet sürümü **1.2**; uygulama **2.214**.
- Koruyan testler: `birim` [80], `tasarim` [2bi].

### v2.213 — Delil tabloları ayrıştı, Edinim 1.1 (tamamlandı)

- **Envanter 7 sütun:** biçim · boyut · süre · kanal · örnekleme · SHA-256;
  tek kaynak `inventoryRows`. Biçim uzantıdan, kanal/örnekleme ölçümden.
- **Köken 8 sütun:** KAYIT CİHAZI ve KAYIT TARİHİ ayrı; bilinmiyorsa
  “bilinmiyor”; edinme yöntemi bu alana yazılmaz (göç: gerçek cihaz metni taşınır).
- **Edinme 9 sütun:** CİHAZ ve ETİKET ayrı; OPERATÖR `Ad · Sicil`.
- **Alet adı:** `Edinim v1.1`; yöntem “Mantıksal kopya”.
- **Edinim 1.1:** soru-cevap sihirbazı, özet + onay, ilerleme, `E`/`E:`/`E:\`
  normalizasyonu, UTF-8 BOM, `İŞLEM DURDURULDU` çıkışı.
- Koruyan testler: `birim` [78]/[79], `rapor` 14/15, `tasarim` [2bh]/[2bi].

### v2.212 — Delil teslim zinciri: teslim eden, operatör ve alet (tamamlandı)

- **Teslim eden ≠ operatör.** `delil.json` `delivery` bloğu (eden, sicil/kayıt
  no, tarih, yer) ve AKİS `origin` alanları; ikisi raporda ayrı.
- **Sürücü harfi raporda yok:** yalnız `delil.json` teknik izinde.
- **Operatör hücresi** `Ad · Sicil`; köken tablosu **7 sütun** (`TESLİM YERİ`).
- **Alet adı ürün adı değil:** `edinme.ps1 1.0 · PowerShell`.
- **Rapor metni** ürün kimliği taşımaz (delil bölümü dahil).
- **Yeniden yükleme ezmez:** yalnız boş alan dolar; günlüğe yazılır.
- **Birleştirme** nesneyi okunur karşılaştırır; `[object Object]` yok.
- **Araç indirme:** Ses → **Edinme aracını indir** (tek zip).
- Koruyan testler: `birim` [78]/[79], `rapor` 14/15, `tasarim` [2bh].

### v2.211 — Delil paketi: yinelenen dosya ve ses dışı dosya (tamamlandı)

Aynı ses (aynı SHA-256) dosyada zaten varsa **yeni kayıt açılmaz**; mevcut
düzenlemeler/onaylar korunur ve edinme bilgisi mevcut kayda işlenir. `bilgi.txt`
gibi ses dışı dosyalar listeye girmez; manifestte kalır ve **“Ses dışı
(atlandı)”** görünür. Cihaz satırında **Birim: D:** gösterilir. Ölçüm: onaylı/
düzenlenmiş materyal + aynı WAV + `bilgi.txt` → kayıt **1**, `review` approved,
metin korundu, edinme bilgisi işlendi; boş dosyada 1 doğrulandı + 1 ses dışı;
JS hatası 0. Koruyan test: `birim` [78].

### v2.210 — Delil paketi içe aktarma: Windows ZIP ayırıcısı (tamamlandı)

Windows .NET ZIP'i girdi adlarını `\` ile yazdığı için AKİS dosyaları
"pakette yok" sayıyordu (0/10). ZIP girdi adları ve `relPath` `/` üzerinden
normalize edildi; büyük/küçük harf yedeği eklendi. Kart okuyucu modeli
"Card Reader" ise ortam türü **Hafıza kartı** eşlenir. Edinme aracı başında
`chcp.com 65001` (Türkçe konsol). Ölçüm: `\` ayırıcılı ZIP → **1/1
Doğrulandı**; JS hatası 0. Koruyan test: `birim` [78].

### v2.209 — Edinme aracı düzeltmeleri (tamamlandı)

Kullanıcı denemesi iki hata gösterdi: SD kart `BusType=SCSI` diye reddedildi;
USB'de kopyalama bitti ama `Bağımsız değişken türleri eşleşmiyor` hatası
verdi. Düzeltmeler: SCSI+Removable kabul (sistem diski hariç), `files`
dizisi `$entries.ToArray()`, ZIP için .NET `ZipFile`, `-Operator` zorunlu,
konsol UTF-8, `device.removable` ve AKİS eşlemesi. PowerShell 7.7 `-Simulate`
uçtan uca → AKİS'te 2/2 **Doğrulandı**. Windows `diskpart` yolu kullanıcıda
denenecek. Koruyan test: `birim` [78].

### v2.208 — Delil paketi (Tier 1) (tamamlandı)

`delil.json` şeması, `tools/edinme/edinme.ps1` (yazılımsal salt-okunur +
dosya kopyası + SHA-256) ve AKİS'te **Delil paketi yükle** akışı eklendi.
Dosya hash'leri yeniden hesaplanır; üç durum: **Doğrulandı / Uyuşmuyor /
Doğrulanamadı**. Cihaz bilgisi edinme aracının beyanıdır; uygulama cihazı
görmez. Raporun **DELİL EDİNME VE DOĞRULAMA** bölümü üç çıktıda aynı metni
üretir. Koruyan test: `birim` [78] + `rapor` Senaryo 14 + `tasarim` [2bg].
**Dürüst sınır:** PowerShell aracı bu ortamda çalıştırılmadı; kurgusal USB'de
test edilmeden gerçek delile uygulanmaz. Tier 2 (DD imajı) henüz yok.

### v2.207 — Yerel LLM denemesi kaldırıldı (tamamlandı)

v2.206'da eklenen deneysel yerel LLM yardımcısı ölçüldü ve **kaldırıldı**.
Gerçek tarayıcı ölçümü: 0.5B q4f16 WebGPU çöp çıktı (Kiril), 1.5B q4f16
WebGPU `Aborted()` (bellek), 0.5B/1.5B int8 WASM ise Türkçe ama **sadakatsiz**
(metinde olmayan içerik uyduruyor). Sonuç: tarayıcıdaki 0,5–1,5B modeller
Türkçe hukuki metinde güvenilir taslak üretmiyor. Arayüz ve kod kaldırıldı;
hiçbir model indirilmez, ek risk yok. Mevcut akışlar değişmedi.
İleride araştırma adayı: transformers.js 4.3.2 + Qwen3.5-0.8B-Text int8 +
açık GPU seçici; **ölçülmeden** ürüne alınmaz.

### v2.206 — Yerel LLM yardımcısı (deneysel; v2.207'de kaldırıldı)

Kısa süreli deneme. Yalnız onaylı metinle çalışan, çıktısı rapora girmeyen bir
taslak yardımcısı eklendi. Ölçüm sonrası kullanılamaz bulundu; v2.207'de
tamamen kaldırıldı.

### v2.205 — Dosyalar arası konuşmacı kaydı (tamamlandı)

`case.speakers[]` dosya geneli kişi kaydı (K1, K2…) ve kayıt içi konuşmacıda
`personId` bağı eklendi. Aynı kişiye bağlı konuşmacılar raporda **tek satırda**
gösterilir; BÖLÜM/NOT hücresinde kayıt + yerel kod + bölüm sayısı ve **uzman
eşleştirmesi** notu yazılır. Bağsız konuşmacılar ayrı satır kalır. Kişi silme
yalnız bağı kaldırır; ses/metin korunur. Birleştirmede kişi alanları doldurulur,
farklı değer/bağ **çakışma** olarak bildirilir. Koruyan test: `sema` [3g] +
`birim` [76] + `rapor` Senaryo 13 + `tasarim` [2be].

### v2.204 — Sınıflandırma/rol seçenekleri tek kaynakta (tamamlandı)

`CASE_STATUS_DEFS`, `MATERIAL_STATUS_DEFS`, `REVIEW_DEFS`, `SPEAKER_ROLE_DEFS`,
`SPEAKER_GENDER_DEFS`, `MEDIUM_TYPE_DEFS`, `TEAM_ROLE_DEFS` tek kaynak oldu;
`*_KEYS`/`*_LABEL`/`REVIEW_SHORT`/`REVIEW_HINT`/`REVIEW_TONE` bunlardan türetilir.
Rol yetkileri (`SECOND_EYES_ROLES`, `APPROVER_ROLES`) `TEAM_ROLE_DEFS`
bayraklarından gelir. Uygulamadaki kopya etiketler kaldırıldı. **Görünür
davranış değişmedi.** Koruyan test: `sema` [3f] + `tasarim` [2bd].

### v2.203 — Alan tanımlama sistemi ve iki yeni gözlem işareti (tamamlandı)

Gözlem bayrakları `schema.js` → `OBS_DEFS` **tek tanım noktasına** taşındı;
`defineOptions()` anahtar/etiket/kısa etiket/ipucu haritalarını üretir. Arayüz
düğmeleri, rapor etiketleri, yardım listesi, `emptySegment`/`normalizeSegment`,
gözlem sayacı ve testler buradan beslenir. **Yeni bayrak = tek satır.**
Yeni işaretler: **telefon görüşmesi** ve **sessizlik (konuşma yok)**.
Bilinmeyen (ileri sürüm) anahtarlar kayıtta korunur, rapora basılmaz;
`mergeCases` gözlemleri OR'lar. ≤600 px'te tek "Gözlem" düğmesi + panel.
Ölçüm: 1440/900 alt şerit 30 px; 360 31 px; kırpılan 0; JS hatası 0.
Koruyan test: `sema` [3e] + `birim` [75] + `rapor` Senaryo 6 + `tasarim` [2bc].
Ayrıntı: [`ALAN_SISTEMI.md`](ALAN_SISTEMI.md).

### v2.202 — Rapora "Okuma metni" (tamamlandı)

Raporun 5.1 bölümünde, ayrıntılı kanıt tablosundan **sonra** her kayıt için
**"Okuma metni"** alt bölümü eklendi: aynı konuşmacının ardışık bölümleri tek
paragraf; başında konuşmacı kodu/etiketi, zaman aralığı ve bölüm sayısı. Kontrol
bekleyen grup işaretlenir. **Kanıt tablosu ve cümle zamanları değişmez.** HTML,
DOCX ve UDF aynı metni üretir. Koruyan test: `rapor` Senaryo 12 + `birim` [74] +
`tasarim` [2bb].

### v2.201 — Rapor hazırlığı: zaman sayacı kayıt başına (tamamlandı)

Çok kayıtlı dosyada hazırlık kartındaki "Zaman sorunu" sayısı tüm bölümleri tek
zaman çizgisi gibi sayıyordu; her kayıt 0'dan başlayınca olmayan çakışma
üretiyordu. Artık **kayıt başına** toplanır ve ses görünümündeki `Zaman
sorunları` filtresiyle aynı sayıyı verir. Gerçek çakışma iki tarafıyla kalır.
Koruyan test: `birim` [73] + `tasarim` [2ba].

### v2.200 — 45 saniye üstü bölüm uyarısı (tamamlandı)

Birleştirme sonucu 45 sn'yi aşarsa işlem **engellenmez**; liste satırında **⏱**,
Durum satırında **"Uzun bölüm"** çipi ve raporun **Rapor öncesi kontrol**
satırında sayı görünür. Rapor hazırlığında **"45 sn üstü bölüm"** maddesi vardır.
Standart: 1–3 cümle veya 15–30 sn; üst sınır 45 sn. Koruyan test: `birim` [72] +
`tasarim` [2az].

### v2.199 — Dar ekranda karar çubuğu (tamamlandı)

≤900 px'te yapışkan çubuğa **Kontrol** seçicisi eklendi: **▶ Dinle · Kontrol ·
↑/↓ · ✓ Onayla**. Karar kaydırmadan verilir; çubuk sığmazsa sarar. Karar tek
kapıdan (`applyReviewChoice`) işlenir; "Bekleyen" filtresindeki satır onaylanınca
listeden düşer. Ölçüm: 900/760/600'de 54 px tek satır, 480/360'ta 100 px iki
satır, 320'de 146 px; kırpılan 0, toast çakışması yok. Koruyan test: `birim`
[71] + `tasarim` [2ay].

### v2.198 — Birleştirme adayı (tamamlandı)

Aynı konuşmacı + kısa bölüm (<2 sn veya <5 kelime) + cümle sonu noktalaması yok
+ sonrakiyle boşluk ≤0,5 sn koşullarını sağlayan bölümler listede **⇄** rozetiyle
işaretlenir; araç çubuğunda **Birleştirme adayı** filtresi görünür. **Otomatik
birleştirme yok**; rozet yalnız işarettir. Denetlenmiş bölüm aday gösterilmez
(birleştirme onayı düşürür). Aday sayısı sıfıra düşünce filtre "Tümü"ye döner.
Koruyan test: `birim` [70].

### v2.197 — Belirsiz okuma rapor hücresi (tamamlandı)

`reviewCellText` belirsiz okumada `reviewLabel — ambiguousReportText` yazıyordu
("Belirsiz okuma — Belirsiz:"). Artık yalnız `ambiguousReportText` yazılır:
`Belirsiz okuma: "geldi" / "kaldı" (seçilen: geldi)`. İki okuma/seçim korunur.
Koruyan test: `birim` [43].

### v2.196 — Hızlı karar şeridi (tamamlandı)

Kontrol seçicisi Dinle'nin yanına alındı; 1/2/3/4 karar kısayolları eklendi.
Ölçüm (1440): fare turu 1.624 → **1.196 px** (−%26); Dinle→Kontrol 373 → 159;
Kontrol→↓ 426 → 212. Klavye turu 0 px. Kısayolda ikinci göz onayı engellenir;
metin alanında çalışmaz. Koruyan test: `tasarim` [2av].

### v2.195 — Paragraf görünümü salt okunur (tamamlandı)

Yıkıcı `paragraphize` kaldırıldı. ¶ düğmesi `openParagraphView` açar:
`paragraphGroups` aynı konuşmacının ardışık bölümlerini gruplar; `segments`
DEĞİŞMEZ. Kanıt tablosu/cümle zamanları korunur. Diyalogda konuşmacı, zaman,
bölüm sayısı, metin ve "1–3 cümle veya 15–30 sn" standardı görünür; panoya
kopyalama vardır. Hızlı ekle'ye `[telefonda konuşma]` eklendi. Ölçüm: 6 → 6
bölüm, 3 grup, JS hatası 0. Koruyan test: `birim` [7b]/[28], `sema`,
`tasarim` [2au].

### v2.194 — Yeniden çözümleme sonrası kaydırma korunur (tamamlandı)

`retranscribeSegment` işlem sonunda `renderAudioList()` çağırıyor, kart yeniden
kurulup liste başa dönüyordu. Artık `captureSegScroll`/`restoreSegScroll` ile
kaydırma korunur (`await renderAudioList()` sonrası geri yükleme). Koruyan
test: `tasarim` [2at].

### v2.193 — Birleştirme sonrası kaydırma korunur; metin önizlemesi (tamamlandı)

`renderSegments` listeyi yeniden kurunca `scrollTop` sıfırlanıyor, sayfa başa
dönüyordu. Artık `captureSegScroll`/`restoreSegScroll` ile liste, detay, ana
alan ve pencere kaydırması korunur; birleşen satır görünür tutulur
(`scrollIntoView` kaldırıldı). Liste satırına **tek satır metin önizlemesi**
geri geldi (tam metin ipucunda/editörde); satır 50 px. Ölçüm: liste 800 → 704
(başa dönme yok), sayfa 0 → 0, JS hatası 0. Koruyan test: `tasarim` [2ap] +
[2as].

### v2.192 — Konuşmacı silme ve rapor filtresi (tamamlandı)

Atanmamış konuşmacı kaydı silinmiyordu ve rapor tüm kayıtları listeliyordu
(`S1 Konuşmacı 1`, `K`, `E`, `S1`, `S2`). Artık `speakerRows` yalnız bölüme
atanmış konuşmacıyı yazar; panelde **Sil** ve **Kullanılmayanları temizle**
vardır. `speakerSegments` isim VE `speakerId` ile eşleşir (v3 kaydı). Silme ses
ve metni silmez; atanan bölümler "seçilmedi" olur. Ölçüm: 5 kart → tek tek Sil
4 → temizle 0; rapor 0 satır; JS hatası 0. Koruyan test: `birim` [69] +
`tasarim` [2ar].

### v2.191 — Sağ panel kaymıyor; metin kendi içinde kayıyor (tamamlandı)

Metin alanı autoGrow ile büyüyünce sağ panel kayıyordu. Artık gövde/sağ sütun
`flex:1` + `min-height:0`, metin alanı `flex:1` + **120 px** taban ve
`overflow-y:auto` (kendi içinde kayar). Vurgu katmanı `scrollTop` ile eşlenir.
Ölçüm: 1440/1280/1100/900/760 → panel kayması **0**, dalga her zaman görünür;
vurgu scrollTop 120=120. Koruyan test: `tasarim` [2aq]/[2u]/[2al]/[2v].

### v2.190 — Dalga menüleri görünür; metin dalgaya binmiyor (tamamlandı)

Ölçüm: 1100 px'te araç satırı 470 px, kap 372 px; gizli yatay kaydırma yüzünden
**Dalga / Spek / İkisi** düğmeleri görünmüyordu. Ayrıca autoGrow metni flex
kabuğa sığmayıp **dalga çubuğunun üstüne** biniyordu (metin 745, dalga 595).
Düzeltme: gövde/sağ sütun/metin `flex:0 0 auto` (içeriğe göre büyür, panel
kayar); araç satırı `flex-wrap:wrap` (sığmayan düğme alt satıra iner); ipucu
kısaltıldı, tam metin `title`'da. 1440→600 px gizli düğme 0, kesik ipucu 0.
Koruyan test: `tasarim` [2aq].

### v2.189 — Zamanlar dalganın üstünde (tamamlandı)

Başlangıç/Süre/Bitiş alanları ayrı satırdan çıkıp dalga/spektrogram kutusunun
altına **yarı saydam şerit** olarak bindirildi (solda Başlangıç, ortada Süre,
sağda Bitiş). Şerit 46 px; kanvas 160 px. Şerit tıklamayı geçirir
(`pointer-events:none`), yalnız kutular tıklamayı yakalar → dalga sürükleme ve
zoom bozulmaz. 1440→600 px kırpılma/yatay taşma 0. Koruyan test: `tasarim` [2u].

### v2.188 — Metin kutusu: tek kutu, dört köşe (tamamlandı)

Okunan kelime artık metnin **İÇİNDE** vurgulanır; ayrı vurgu şeridi kaldırıldı.
Gözlem işaretleri (rapora aktarılır) kutunun **alt solunda**, "+ Hızlı ekle"
menüsü **alt sağında**, modelin ham çıktısı **sağ üstünde** (düğme → açılır
kutu). Profil alanı kaldırıldı; "Henüz çözümlenmedi" **Durum** satırına taşındı.
Metin alanı içeriği kadar büyür (uzun metin kırpılmaz; panel kayar). Ölçüm:
vurgu katmanı ile textarea aynı yükseklik/genişlik (611/611, 582/582); gerçek
WAV ile t=1,08'de "mi?", t=1,73'te ikinci "Ali" vurgulandı; 1440→600 px
kırpılan 0. Koruyan test: `birim` [68], `tasarim` [2f]/[2s]/[2al]/[2am]/[2an]/[2ao].

### v2.187 — Liste sağa yaslı; Onayla düğmesi kalktı (tamamlandı)

Rozetler sağa yaslandı, **durum rozeti en sağda** (sağ kenardan 8 px); satır
34 px (dört genişlikte). Detaydaki "✓ Onayla" düğmesi kaldırıldı: durum
Kontrol seçicisinde, eylem **satır menüsünde** ("✓ Onayla (sonrakine geç)") ve
**Enter**'da. Başlık 78 px (≥1100; iki satır), 42 px (900). Koruyan test:
`tasarim` [2j] + [2v]/[2ao].

### v2.186 — Liste tek satır; Teknik düğmesi kaldırıldı (tamamlandı)

Liste satırı **34 px** ve her genişlikte aynı; başlangıç–bitiş **yan yana**
(kısa saat; ms detayda). Öncelik rozeti detayın durum satırına taşındı. Dar
listelerde ikincil öğeler (konuşmacı rozeti ≤1280, ⋮/tutamak 901–1200) çıkar;
durum rozeti asla çıkmaz. **Teknik** düğmesi kaldırıldı: analiz her zaman
görünür, metnin ALTINDA; metin tabanı 260 px, panel kaydırır (141 px).
Koruyan test: `tasarim` [2t] + [2ap] + [2v].

### v2.185 — Bölüm listesi dizin oldu (tamamlandı)

Bölüm metni hem listede hem editörde gösteriliyordu (tekrar). Liste dizine
indirildi: numara · zaman · rozetler; metin yalnız editörde (ve satır
ipucunda). Ölçüm: satır **74 → 50 px**; rozetler görünür, kırpılma ve yatay
taşma yok; 1100 px'te rozetler sarar (66 px). Koruyan test: `tasarim` [2ap].

### v2.184 — Tek durum satırı: her zaman görünür (tamamlandı)

Üç ayrı şerit (ses yok · notlar · model ipucu) tek "Durum" satırında toplandı;
satır her bölümde çizilir, en az "Ses: …" çipi taşır, yüksekliği sabittir
(28 px) → hiçbir öğe gizlenmez, yerleşim zıplamaz. Etiketler ("Konuşmacı",
"Kontrol") ve "✓ Onayla" yazısı ekranda geri geldi; başlık bilinçli iki satır
(77 px). Ölçüm: durum satırı üç durumda da **28 px**; boş şerit artık yok;
metin alanı 359 px. Koruyan test: `tasarim` [2ai] + `birim` [64].

### v2.183 — Başlıkta birleşik işlem satırı (tamamlandı)

Üç düğme (Onayla/Yeniden dinle/Anlaşılmadı) ile hemen altındaki Kontrol
seçicisi aynı işleri yapıyordu. İki düğme kaldırıldı, onay ikon oldu (✓ +
erişilebilir ad), konuşmacı+kontrol başlığa alındı, profil Teknik'e, boş meta
çizilmiyor. Ölçüm: üst bölge 76 → **42** (1440), 128 → **73** (1100),
78 → **42** (900); metin 160; taşma yok. Koruyan test: `tasarim` [2ao].

### v2.182 — Dikey yer kazanımı (tamamlandı)

Etiketler seçimin üstünde duruyordu (`.sd-field` column): meta satırı 63 px.
Etiketler satır içi yapıldı; Konuşmacı/Kontrol etiketleri görsel olarak
kaldırıldı ama `aria-label` + `title` ile korundu (değerler kendini anlatıyor).
"Ses yok" satırı tek satıra indi, ayrıntı ipucunda. Ölçüm: meta 63 → **40**,
ses yok 47 → **31**, metin 160 (değişmedi), Teknik açık kaydırma 84 → **63**;
900 px'te taşma yok. Koruyan test: `birim` [64] + `tasarim` [2am].

### v2.181 — ASR kökeni Teknik'te (tamamlandı)

"Otomatik çözümleme çıktısı (model …)" bloğu metin üstünden **Teknik**'e
taşındı; metinde **19 px tek satır ipucu** kaldı ("Model çıktısı farklı —
karşılaştır"). İpucu tıklanınca Teknik açılır, blok açık ve panel içinde
görünür. Notlardaki tekrar eden "öncelik" satırı kaldırıldı (liste rozeti
korunuyor). Ölçüm: metin alanı 371 → **344 px** (ipucu varken), hata 0.
Koruyan test: `tasarim` [2an].

### v2.180 — Konuşmacı/kontrol/gözlem her zaman görünür (tamamlandı)

Ölçüm: Teknik açıkken konuşmacı+kontrol y=822, gözlem y=884 → panel (248–827)
dışında. İkisi de analiz değil. Konuşmacı/kontrol başlığın altına, gözlem
düğmeleri metnin altına (quick-insert yanına) taşındı. Ölçüm: meta y=303,
gözlem y=642 — **panel içinde**; metin 160 (Teknik açık) / 371 (kapalı);
panel kaydırması 81 → **55 px**. Koruyan test: `tasarim` [2am].

### v2.179 — Detay paneli: canlı vurgu ezilmiyor (tamamlandı)

Ölçüm: Teknik açıkken canlı vurgu 48 → 14 px, metin 448 → 120 px'e eziliyordu
(`min-height: 0` + 120 px taban). Artık vurgu şeridi `flex: 0 0 auto` + 2 satır
tabanı, metin alanı 160 px tabanı, gövde/sağ sütun 236 px alt sınırı; sığmazsa
panel kaydırır (81 px). 900 px'te vurgu 48, metin 180; kırpılma yok.
Koruyan test: `tasarim` [2al].

### v2.178 — Sürükleyerek birleştirme (tamamlandı)

Satırdaki **⋮⋮** tutamağından **komşu** satıra sürükle-bırak birleştirme.
Hedef kesikli çerçeveyle vurgulanır; uzak satır reddedilir; filtre "Tümü"
değilse kapalıdır (nedeni yazılır). Klavye (M) ve satır menüsü korunur.
Ölçüm: birleştirme 1 sürükleme; komşu olmayan → değişiklik yok; satır
72 → **74 px**; kırpılma/taşma yok; hata 0. Koruyan test: `tasarim` [2aj].

### v2.177 — Satır işlemleri menüsü (tamamlandı)

Birleştirme 3 etkileşimdi ve ikincil araçlar katlamada saklıydı. Her satıra
**⋮** (ve sağ tık) menüsü eklendi: birleştir, oynatıcı konumundan böl,
aralığı çözümle, metin geçmişi, sessizlik ölç, sil. Menü öğeleri mevcut
`data-*` işleyicilerini kullanır. "Diğer işlemler" katlaması kaldırıldı.
Ölçüm: görünür kontrol 54 → **47**, birleştirme 3 → **2** etkileşim, satır
72 px (aynı), Esc kapatır, hata 0. Koruyan test: `tasarim` (güncellendi).

### v2.176 — Birleştirme adli olarak eksiksiz (tamamlandı)

Ölçüm: birleştirme ikinci bölümün asrText/words/model bilgisini siliyor,
günlüğe yazmıyor, farklı konuşmacıyı sessizce birleştiriyordu. Artık
`mergedFrom` ham çıktıyı saklar; kelime zamanları ve gözlemler birleşir;
farklı konuşmacı ve ikinci göz reddedilir; birleştirme/bölme `logEvent` ile
günlüğe yazılır. Ölçüm: S1/S2 reddedildi, aynı konuşmacı birleşti, günlük
1 → 2, hata 0. Koruyan test: `birim` [67] + `sema` (geri alma sırası).

### v2.175 — "Ses yok" uyarısı ilk açılışta (tamamlandı)

v2.174'ün eksiği: `renderSegments` yalnız HTML kuruyordu, `refreshAudioState`
çağırmıyordu; uyarı ilk çizimde boş kalıyordu. Çağrı eklendi. Ölçüm: Teknik
kapalı + taze sayfa → uyarı görünür ve dolu, JS hatası 0. Koruyan test:
`tasarim` [2ai] (5 kontrol).

### v2.174 — "Ses yok" uyarısı her zaman görünür (tamamlandı)

Ölçüm: ses blob'u silinmiş kayıtta uyarı yalnız Teknik paneli açılınca
yazılıyordu; panel kapalıyken kullanıcı durumu görmüyordu. Uyarı öğesi
`segDetailHtml` içinde Teknik panelinin DIŞINA alındı; bölüm değişiminde de
tazeleniyor. Ölçüm: Teknik kapalıyken uyarı görünür, ses varsa gizli, JS
hatası 0. Koruyan test: `tasarim` [2ai].

### v2.173 — Paket adına saniye (tamamlandı)

Ölçüm (ekip senaryosu): sahip ve yardımcı paketi aynı dakikada üretilince iki
dosya da `…_09-58.akis` oldu; tarayıcı " (1)" ekledi. Ad artık saniye taşıyor
(`…_10-00-40.akis`). Ölçüm: aynı dakikada iki paket **farklı ad**; ekip akışı
(paket → öneri → onay reddi → birleştir → kabul) yeniden ölçüldü ve doğru
çalışıyor. Koruyan test: `birim` [66].

### v2.172 — Rapor önizlemesi kırpılmıyor (tamamlandı)

Ölçüm (100 bölüm): rapor görünümü 804 px; üstteki tanıtım + araç çubuğu +
hazırlık kartı + uyarı + çıktı notu 537 px alıyor, kâğıda 196 px kalıyordu
(içerik 6.452 px). Kâğıt, `app.css`'in `#view-report #reportPreview`
(2,0,0) kuralı yüzünden küçülüyordu; okuma katmanındaki `.report-paper`
(1,1,0) yetmiyordu. Kural id seçicisiyle yazıldı; ezilen app.css bildirimleri
silindi. Ölçüm: kâğıt 196 → **6.438 px**, görünüm kaydırması 6.254 px, araç
çubuğu yapışkan, 900 px'te 6.390 px, yatay kırpılma yok. Koruyan test:
`tasarim` [2ah].

### v2.171 — CSS borcu: ölü bildirimler (tamamlandı, görünür değişiklik yok)

`#view-audio .seg-detail` aynı özellikleri yedi katmanda yeniden tanımlıyordu;
sonraki tanım öncekini eziyordu. 12 ölü bildirim ve tamamen ölen kural blokları
silindi. Kanıt: aynı veri ve aynı kimliklerle 4 görünüm × 3 tema × 400–425 öğe
× 33 özellik → **0 fark**. Ölçüm: kural 828 → **825**, `!important` 58 → **55**,
ölü bildirim 72 → **60**. Eşikler düşürüldü ([8]).

### v2.170 — CSS borcu azaltıldı (tamamlandı, görünür değişiklik yok)

Ölçüm: `reading-layer.css` içinde uygulamanın üretmediği altı eski sınıfa ait
18 kural vardı (v2.62'de `sd-*` yapısına geçilince etkisiz kalmış). Birebir
metin eşleşmesiyle silindi; parantez dengesi ve kural sayısı doğrulandı.
Kanıt: 4 görünüm × 3 tema, 400–425 öğe × 33 özellik → **0 fark**.
Ölçüm: kural 852 → **828**, `!important` 62 → **58**, ölü bildirim 95 → **72**,
app→katman 507 → **500**. Eşikler düşürüldü; `tasarim` [2ag] geri gelmeyi
engeller.

### v2.169 — Rapor kâğıdı: punto tabanı ve belge fontu (tamamlandı)

Ölçüm: raporda 152 metin düğümünden 1'i 8 px'ti (SHA-256 hücresi, satır içi
stil); kâğıt Segoe UI (arayüz fontu) ile çiziliyordu. Satır içi stil
`class="paper-hash"` oldu (11 px, mono, satır kırar); `--paper-font` token'ı
eklendi ve `.report-paper` onu kullanıyor. Ölçüm: 11 px altı metin **0**,
kâğıt fontu **Arial**, kırpılma yok. Rapor metni değişmedi (üç çıktı aynı).
Koruyan test: `tasarim` [2af].

### v2.168 — Dar ekranda metin görünür alana gelir (tamamlandı)

Ölçüm (900×900, 100 bölüm): liste 7.224 px, metin alanı 7.349 px altında.
`revealSegDetail(m)` eklendi: yalnız ≤900 px'te çalışır, satır tıklaması,
önceki/sonraki ve onay sonrası çağrılır; `scrollIntoView` ile düzenleme
alanını getirir. Masaüstünde kaydırma yapılmaz; takip modu kendiliğinden
kaydırmaz. Ölçüm: 900 px'te metin 7.929 → **587 px** (ekranda), 1440'ta
kaydırma **0**. Koruyan test: `tasarim` [2ae].

### v2.167 — Künye her görünümden tek tıkla (tamamlandı)

Ölçüm: Ses görünümünden künyeye ulaşmak 4 tık + 2 görünüm değişimiydi. Üst
bara dosya seçicinin yanına **✎ künye düğmesi** eklendi; `setCaseDrawer(true)`
çağırır, görünüm değişmez. Ölçüm: 1 tık (gidiş-dönüş 2), görünüm değişimi 0;
1280/1100/900'de başlık kırpılması ve yatay taşma yok. Koruyan test:
`tasarim` [2ad].

### v2.166 — Ses kaydını kaldırma onay ister (tamamlandı)

Ölçüm (gerçek Chromium): "Kaldır" onaysız çalışıyor, ses blob'u kalıcı
siliniyor, Ctrl+Z yalnız kaydı geri getiriyordu (ses anahtarı boş). Artık
`askConfirm` + `removeAudioWarning(m)`: ad, bölüm sayısı, KALICI silme ve
"ses dosyası geri gelmez" yazar. Ölçüm: diyalog açılıyor; Vazgeç → ses
korunur; Devam et → silinir; JS hatası 0. Koruyan test: `birim` [65].

### v2.165 — Dar ekranda onay/dinle çubuğu (tamamlandı)

Ölçüm (900×900, 10 bölüm): "✓ Onayla" y=1313 → ekranın 413 px altında. Kartın
içine **yapışkan işlem çubuğu** eklendi (↑ ↓ · ▶ Dinle · ✓ Onayla · 3/10).
Düğmeler mevcut `data-*` işleyicilerini kullanır; yeni mantık yok. Yalnız
≤900 px görünür, masaüstü değişmez. Bildirim çubuğun üstüne alındı (v2.158
dersi). Ölçüm: onay y=820–874 (ekranda), çakışma yok, JS hatası 0.
Koruyan test: `tasarim` [2ac].

### v2.164 — Künye: zorunlu alanlar ilk ekranda (tamamlandı)

Senaryo ölçümü: çekmecede 17 alan, ilk ekranda 8; zorunlu bilirkişi adı
454 px, inceleme konusu 166 px aşağıdaydı. Çekmece yeniden sıralandı:
**01 Zorunlu bilgiler** (rapor türü, mahkeme, esas no, bilirkişi adı,
inceleme konusu) → 02 tarihler → 03 taraf → 04 bilirkişi künyesi → 05 ekip →
06 arşivle. Ölçüm: zorunlu alan **5/5 görünür**; `#expertName` 356 px,
`#subject` 426 px (ekran içinde). Kimlikler ve otomatik kayıt değişmedi.
Koruyan test: `tasarim` [2ab].

### v2.163 — Durum renkleri tek anlam (tamamlandı)

Kullanıcı gözlemi: "seg-tool play-main siyah zemin/mavi yazı", "follow-btn on
kahverengi zemin/beyaz yazı". Ölçüm: `.play-main` **1.1:1**,
`#view-audio .follow-btn.on` altın zemin + koyu yazı **3.03:1**, `.seg-tool.on`
ID kapsamlı kural yüzünden `--ink-2` yazı. Kök: durum sınıfları `--navy` +
beyaz kullanıyordu ve ID kapsamlı renk kuralları `.on` durumunu eziyordu.
Durum tablosu: birincil `--accent`+`--accent-ink`, seçili `--accent-soft`+
`--accent`, çalıyor `--green`+`--surface`, uyarı/gözlem `--gold-soft`+`--gold`.
Ölçüm: 19 bileşen × 6 (görünüm×tema) → **0** düşük kontrast.
Koruyan test: `tasarim` [2aa].

### v2.162 — Tema tam uygulama (tamamlandı)

app.css'te 151 sabit `background:#hex` ve onlarca sabit metin rengi vardı; tema
yalnız bir kısmına uygulanıyordu. Koyu temada ölçülen hatalar: "▶ Çal" **1.16:1**,
bölüm metni **1.67:1**, sorular paneli **beyaz**, rozetler açık çipte. 86 + 75
kural token'a bağlandı; dolu düğme, split numarası, uyarı kutusu ve klavye
tuşları ayrıca düzeltildi. Tuval renkleri `themeVar()` ile temadan okunur;
tema değişince `__segWaveRedraw` + `renderAudioList` ile yeniden çizilir.
Ölçüm: 4 görünüm × 3 tema kontrast **0 hata**; koyu/sepya'da açık yüzey **0**.
Koruyan test: `tasarim` [2z].

### v2.161 — Tasarım sistemi: palet, tema, punto ölçeği (tamamlandı)

**KOYU TEMA ONARILDI:** tema blokları `[data-theme=…]` (0,1,0) idi; app.css
`:root` da (0,1,0) ve sonra yüklendiği için 7 ortak token (bg, ink, line, gold,
green, red, paper) her temada AÇIK değeri alıyordu. Koyu temada başlık
kontrastı **1.16:1** ölçüldü. Seçiciler `html[…]` (0,1,1) yapıldı; app.css'in
kendi adları (--navy/--blue/--muted/--pale) temaya bağlandı. Ayrıca yüzey,
çizgi ve gölge rafine edildi; kâğıt laciverti `#16324f`.

**PUNTO:** ölçek 11/12/14/15/17/20/25/30 (+mono 14, ikon 16/18). Okuma
katmanındaki 13 ham `font-size` token'a çevrildi (ham 0). Deşifre metni
13 → **14 px** (belgelenen değer).

**Ölçüm:** 4 görünüm × 3 tema metin kontrast taraması → **0 başarısız**
(eşik 4.5). 1440/1100/900: başlık kırpılması yok, durum çubuğu 24/34/45 px ve
0 kırpma, detay panelinde kaydırma 0. Koruyan test: `tasarim` [2y] (13 kontrol).

### v2.160 — Görsel düzen (kozmetik) (tamamlandı)

Genel bakış: kartlar içeriği kadar (`align-items:start`, `flex-grow:0`,
`flex-shrink:0` — taşma/üst üste binme yok), istatistik kartlarında ikon yuvası
+ 30 px sayı, iş akışı adımlarında yuvarlak numara ve durum rozeti, hızlı
erişimde çerçeveli kartlar. İnceleme: yazı yüzeyi 920 px ve ortalı. Rapor:
kâğıt gölgesi ve hazırlık satırları. Ses: satır hover/aktif yüzeyi.
CSS borcu artmadı (98/507). Koruyan test: `tasarim` [2x].

### v2.159 — Dar ekranda yinelenen başlık (tamamlandı)

≤900 px'te "SEÇİLİ KAYIT" panel başlığı gizlenir (kart adı ve eylemleri taşır);
masaüstünde korunur. Ölçüm: 900 px'te başlık **0 px**, kart görünür, yatay
taşma yok. Koruyan test: `tasarim` [2w].

### v2.158 — Bildirim yerleşimi ve ses yok durumu (tamamlandı)

Toast `bottom: calc(var(--status-h) + 12px)` ile durum çubuğunun üstünde durur
(ölçüm: toast 854 / çubuk 876 → çakışma yok). Ses blob'u yokken
`[data-audio-state]` kalıcı uyarı yazar; ses varsa gizlenir. Koruyan test:
`birim` [64].

### v2.157 — Test verisi koruması (tamamlandı)

"Hazır test dosyalarını yükle" onay sormadan 4 kurgusal dosyayı gerçek çalışma
alanına ekliyordu. Artık `askConfirm` ile ne ekleneceğini söyler; yükleme
sonrası aynı düğme **"Test dosyalarını kaldır (N)"** olur, `removeSamples()`
dosyaları **ses bloblarıyla** birlikte siler (gerçek dosyalara dokunmaz).
`sampleCases()` saf fonksiyon. Koruyan test: `birim` [63].

### v2.156 — Rapor hazırlığı kapsamayı sayar (tamamlandı)

`reportReadiness` artık `segmentCoverage` kullanır: boşluk varsa
"Bölümlenmemiş ses aralığı" satırı çıkar (sayı + toplam saniye). Satır
tıklanınca ses görünümü açılır ve kapsam paneli kendiliğinden gelir.
Süre bilinmiyorsa boşluk üretilmez (uydurma yok). Koruyan test: `birim` [62].

### v2.155 — Dil tutarlılığı ve paket diyaloğu onarımı (tamamlandı)

Kapsam diyaloğunda bozulmuş bir satır vardı (aynı cümle iki kez + `lt;dosya no`);
onarıldı. Düğme "Yedeği oluştur" → **"Paketi oluştur"**, arşiv notu "Pakete dâhil
edilirler". Yeni nöbetçiler: kullanıcı metninde "Yedek" yasak (tarihsel notlar
hariç), satır içi etiket içine blok etiket giremez, `<p>`/`<code>` dengesi.
Koruyan test: `surum` [11b] + [11] (8 kontrol).

### v2.154 — Tek panel, iki bölge (tamamlandı)

Detay paneli iki bölgeye ayrıldı: **sabit başlık** (gezinme, dinle, onayla,
Teknik) + **metin** (kalan yükseklik) + **Teknik** (dalga/zaman/konuşmacı/
gözlem; istenince açılır). Ölçüm (1440×900): kapalıyken metin alanı
160 → **446 px**, kaydırma **0**; açıkken **34/34** kontrol görünür, kaydırma
**0**. Dar ekran (900/760): 0 gizli, 0 kaydırma. Koruyan test: `tasarim` [2v].

### v2.153 — Detay paneli sıkıştırma (tamamlandı, hedef kısmen)

Zaman etiketleri satır içi, `.sd-meta` tek satır (3 sütun), ikincil araçlar
`<details class="sd-more">` altında. Panel içeriği 795 → **680 px** (−115).
Kalan: gözlem düğmeleri için 46 px kaydırma (önce 125). "Kaydırmasız" hedef
tam karşılanmadı; kapatmak metin alanını (180→120) veya analiz kutusunu
(160→120) küçültmeyi gerektirir; ikisi de bilinçli korundu. Koruyan test:
`tasarim` [2u].

### v2.152 — Listede bitiş zamanı (tamamlandı)

Zaman hücresi iki satır: `.seg-start` / `.seg-end` ("→ 00:00:06.000"). Zaman
sütunu 84 → 96 px; **kesme yok**. Ölçüm (1440 px): satır 59 → **72 px** (+13).
1440/1280/1100/900/760 px: zaman hücresi kırpılmıyor, yatay taşma yok.
Koruyan test: `tasarim` [2t].

### v2.151 — Onaydan sonra sonraki bekleyene geç (tamamlandı)

`nextPendingIndex(segments, from)` saf fonksiyonu onay sonrası hedefi belirler
(onaylıları atlar, bekleyen yoksa -1 = yerinde kal). Ayarlar → "Onay davranışı"
anahtarı; tercih `akis.nextPending` ile saklanır, **varsayılan kapalı**, kayda ve
rapora yazılmaz. Koruyan test: `birim` [61].

### v2.150 — Rapor hazırlık denetimi (tamamlandı)

`reportReadiness(c)` saf fonksiyonu rapor öncesi eksikleri **sayıyla** listeler:
kontrol edilmemiş bölüm, seçilmemiş belirsiz okuma, konuşmacı atanmamış bölüm,
zaman sorunu, SHA-256 yok, teslim/köken bilgisi yok, boş künye, soru yok.
Rapor görünümünde "Rapor hazırlığı" kartı; satır tıklanınca ilgili görünüme
gider (bekleyen/zaman satırları filtreyi de kurar). Uydurma yüzde yoktur.
Koruyan test: `birim` [60].

### v2.149 — Kapsama denetimi (tamamlandı)

Araç çubuğunda "Kapsam %98 · 2 boşluk" düğmesi. `segmentCoverage()` saf fonksiyonu
bölüm aralıklarının **birleşimini** ölçer (çakışma iki kez sayılmaz), boşlukları,
kayıt sonunu aşan bölümleri ve sıfır süreli bölümleri bildirir. Panel boşlukları
zaman aralığıyla listeler; "Git" oynatıcıyı o ana getirir. Düğme etiketi ve panel
düzenleme sonrası **yerinde** tazelenir. Dürüst sınır: boşluk "konuşma yok"
demek değildir; zaman otomatik düzeltilmez. Koruyan test: `birim` [59].

### v2.148 — Oynatma başlarken sayfa zıplamıyor (tamamlandı)

Şerit yer tutucu olarak önceden kurulur; başlık `segHeadParts` ile her zaman
"Bölüm X / N". `birim` [58] + `tasarim` [2s].

### v2.147 — Takip şeridi önceki bölüme dönmüyor (tamamlandı)

Bölüm oynatıcısının timeupdate'i eski indeksi kullanıyordu. `followStripIndex`
ve `activeSegIndex` ile düzeltildi; gerçek örnek sesle ölçüldü (5→0).
`birim` [57].

### v2.146 — Zaman sorunu düzenlerken anında görünür (tamamlandı)

Satır güncellemesi ⚠'yı geçmiyordu ve çip yalnız tam çizimde oluşuyordu.
Artık iki taraf da işaretlenir, çip eklenir/kalkar. `birim` [56].

### v2.145 — Takip vurgusu çakışmada geri atlamıyor (tamamlandı)

`segmentIndexAtTime` saf fonksiyonu; t aktif bölümün aralığındaysa aktif
kalır. `birim` [55].

### v2.144 — Zaman çakışmaları görünür (tamamlandı)

Çakışma/yinelenme/sıfır süre/ters aralık/okunamayan zaman için ⚠ rozet ve
"Zaman sorunları" filtresi. Uygulama düzeltmez, bildirir. `birim` [54].

### v2.143 — Bölüm detayının alt kısmı kırpılmıyor (tamamlandı)

Panel 385 px, içerik 795 px idi ve kaydırmıyordu; `sd-meta`/gözlem
düğmeleri kırpılıyordu. Panel artık kendi içinde kayar. `tasarim` [2r].

### v2.142 — Çalışma modu kaldırıldı; kayıt listesi dikey (tamamlandı)

Gizli workspaceBar/butonu ve mod mantığı tamamen kaldırıldı. Kayıt listesi
dikey; kaydırma kayıt sütununda (100 kayıtta tek çubuk). `tasarim` [2p]/[2q].

### v2.141 — Masaüstünde çalışma modu kaldırıldı (tamamlandı)

Kayıtlar sürekli solda olduğu için çalışma modu ve geri dönme düğmesi
gereksizdi. ≥901 px'te gizli; ≤900'de korunur. `tasarim` [2p].

### v2.140 — Masaüstü kabuğu (tamamlandı)

Ses görünümü tek uzun sayfa yerine sabit çerçeve: kayıtlar solda, liste ve
düzenleme paneli kendi kaydırır. ≥901 px; ≤900 eski düzen. `tasarim` [2o].

### v2.139 — Uzun listede detay paneli yapışkan (tamamlandı)

362 bölümde detay ekran dışında kalıyordu (tıklama görünür etki bırakmıyordu).
Panel yapışkan + ekranla sınırlı; deşifre sekmesi sarmalayıcıları görünür.
`tasarim` [2n]. Dar ekran (≤900) tek sütun sınırı belgelendi.

### v2.138 — CSS borcu: ölçüm ve nöbetçi (tamamlandı)

Borç ölçüldü (980/691 kural, 26+63 !important, 97/494 ölü bildirim) ve
belgelendi. Otomatik temizlik kanıt tutmadığı için YAYINLANMADI. Nöbetçi:
`tasarim` [8]. Ayrıntı: `docs/CSS_BORCU.md`.

### v2.137 — Rapor kâğıdı dar ekranda kırpılmıyor (tamamlandı)

760 px'te kâğıdın 26 px'i, 600 px'te 40 px'i sessizce kesiliyordu. Dar ekranda
iç boşluk azalır, tablo hücreleri sarar. `tasarim` [2m].

### v2.136 — Sekme simgesi (tamamlandı)

`/favicon.ico` 404 dönüyordu. SVG + ICO simge eklendi; 404 sayısı 0.
`tasarim` [4b].

### v2.135 — Kritik uyarılar ekran okuyucuya duyuruluyor (tamamlandı)

Bildirim ve şeritlerde `role`/`aria-live` yoktu. Kritik uyarılar assertive,
normal bilgiler polite; erişilebilirlik ağacında doğrulandı. `birim` [53].

### v2.134 — İlk açılışta hayalet kayıt oluşmuyor (tamamlandı)

Boş çalışma alanı `{cases: []}` olarak yazılıyordu. Artık yazacak veri yoksa
kayıt silinir; silinen dosyalar yeniden yüklenmez. `birim` [52].

### v2.133 — Durum çubuğu yazıları kesilmiyor (tamamlandı)

≤1100 px'te durum çubuğundaki 6 öğenin 6'sı ellipsis ile kırpılıyordu. Çubuk
artık sarar ve içerikle büyür; kayıt başlığında tam ad ipucu olarak durur.
`tasarim` [2l].

### v2.132 — Kurtarma kopyasında sessiz dosya düşmesi (tamamlandı)

Kurtarma kopyasından geri yüklemede bozuk dosya `catch (e) {}` ile sessizce
atlanıyordu. Artık `normalizeRescueCases` + `reportLoadFailures`; kopya korunur.
`birim` [51].

### v2.131 — Görünüm kutusu içerikle büyür (tamamlandı)

Yapışkan çalışma çubuğu ilk 635 px'ten sonra kayboluyor, durum çubuğu bölüm
satırlarının üstüne binip tıklamayı yutuyordu. Görünüm kutusu artık içeriği
kadar uzar (`flex: 0 0 auto`); kaydırma tek yerde kalır. `tasarim` [2k].

### v2.130 — Bölüm rozeti: durum her zaman görünür (tamamlandı)

Listede durum rozeti sabit 96 px'lik kapta kırpılıyordu ve hiç görünmüyordu.
Durum rozeti ilk sıraya alındı; rozetler sarar, dar ekranda metnin altına iner.
`tasarim` [2j].

### v2.129 — Ses görünümü: tek kaydırma (tamamlandı)

Kaydırma yalnız `.main-area`'da; liste/detay içeriği kadar uzar, iç içe
kaydırma yok. 36 bölümün tamamı, onay/araçlar ve klavye kısayolları erişilir;
kısayollar listenin altında. Çalışma modunda üst bar yapışkan. `tasarim` [2i].

### v2.128 — Katmanlı analiz kutusu (tamamlandı)

Dalga + spektrogram **aynı kutuda**, sabit 160 px; üç mod (Dalga/Spek/İkisi).
Ortak zaman ekseni; zoom ikisini birlikte günceller. Çizgiler spektrogramın
üstünde. v2.126’nın alt-tam-genişlik düzeni geri alındı. `birim` [50],
`tasarim` [2g].

### v2.127 — Yerleşim: metin listeye bitişik, kontroller yanında (tamamlandı)

Gövde sütunları ters: metin solda (liste→metin **361 → 23 px**), teknik sağda.
Başlık kontrolleri solda (liste→oynat **699 → 186 px**). `activeSegIndex`:
seçmeden "▶ Dinle" görünen bölümü çalar. `birim` [49], `tasarim` [2h].

### v2.126 — Spektrogram: tam genişlik + etkileşim (tamamlandı)

Spektrogram açıkken gövde tek sütun; tuval 773 px / 200 px. Tıkla = konuma git,
sürükle = A–B (döngü açılır), Alt+tıkla = sınır, fare = zaman/frekans okuması.
İmleç/A–B ayrı kaplamada. `birim` [48], `tasarim` [2g].

### v2.125 — Takip şeridi sabit: cümle penceresi (tamamlandı)

Sabit 2 satır; o anki cümle (noktalama veya ≥0,4 sn boşluk); vurgu yalnız
arka plan (metrik sabit); kaydırma birer satır. `birim` [47], `tasarim` [2f].

### v2.124 — "Tüm dosyalar" seçimi paket adında (tamamlandı)

Ad, seçime göre yazılır (dosya sayısına göre değil): tek dosya + "Tüm
dosyalar" → `AKIS_Paket_Tam_1dosya_…`; "Yalnız bu dosya" →
`AKIS_Paket_2024-108_…`. Paket biçimi değişmedi. `birim` [38].

### v2.123 — Terim birliği ve paket adı (tamamlandı)

Aynı şeye iki ad veriliyordu ("dışa aktar" / "yedek" / "paket"). Tek sözlük:
**Dosya** (tek dava) · **Paket** (.akis) · **Paket oluştur** · **Paketten
yükle** · **⇄ Birleştir** · **Arşivle** (gizler, silmez). Paket adı ne
olduğunu söyler: `AKIS_Paket_<no>_<tarih>_<saat>.akis`,
`AKIS_Paket_Tam_<N>dosya_…`. Bayat `AKIS_Yedek_N_dosya` örneği kaldırıldı.
`birim` [38], `surum` [11].

### v2.122 — Birleştirmede onaylar aktarılıyor (tamamlandı)

Onaylama yalnız `review` yazıyordu; birleştirme "kim onayladı" sorusunu
`lastEditBy` (metin düzenleyen) ile tahmin ediyordu. Dinleyip onaylayan
bilirkişi metne dokunmadığı için onay "kaynaksız" sayılıp **sessizce**
`pending`e düşürülüyordu. Artık `reviewedBy`/`reviewedAt` kaydedilir, tek yazma
noktası `setSegReview()`'dir ve aktarılamayan onay **bildirilir**
(`approval-not-attributed`). İçe aktarmada devralınan kimlik temizlenir.
`birim-testleri` [46], `sema-testi` [7f].

### v2.121 — Sağ panel kaydırma çubuğu + spektrogram geçişi (tamamlandı)

v2.120'de `.seg-workspace{height:100%}` sağ detayı 351px'e sıkıştırdı; içerik
496px olduğu için ayrı kaydırma çubuğu çıktı. Artık kap yükseklik dayatmaz
(`height:auto`, `overflow:visible`); kaydırma yalnız `.seg-list`'te.
Spektrogram düğmesi dalga araç çubuğunda ve **aynı alanda** dalga↔spektrogram
geçişi yapar. `tasarim-testi` [2d]/[2e].

### v2.120 — Bölüm listesinin altı kesilmiyordu (tamamlandı)

`.seg-list` 497px (62vh) ama saran `.seg-workspace` 360px + `overflow:hidden`
→ alt 137px (≈4 bölüm) sessizce kırpılıyordu. Artık liste kabına uyar
(`height:100%`), kap kırpmaz (`overflow:visible`). `tasarim-testi` [2d].

### v2.119 — Takip iki özelliğe ayrıldı; karaoke kaldırıldı (tamamlandı)

Ana oynat/Dinle takibi kendiliğinden açıyordu (2 yer). Aynı metin `.karaoke` ve
`.sd-follow` olmak üzere iki yerde gösteriliyor, karaoke her `timeupdate`'te
yeniden yazıldığı için bozuluyordu. Artık: varsayılan kapalı; **Otomatik geçiş (F)**
ve **Canlı vurgu (G)** ayrı düğmeler; karaoke kutusu tamamen kaldırıldı.
`birim-testleri` [45].

### v2.118 — Kendini güncelleyen sayfa (tamamlandı, canlı veri)

GitHub Pages her dosyaya `max-age=600` verir; push sonrası kullanıcı eski
`index.html` görür. `version.json` (`no-store`) + dakikalık denetim eklendi:
yeni sürüm varsa ve kullanıcı boştaysa sayfa **kendini yeniler**; çalışıyorsa
"Yeni sürüm hazır" bildirimi çıkar. `__akisIdle()` iş kaybını önler.
`surum-testi` 2c korur.

### v2.117 — ACİL: canlı site açılmıyordu (tamamlandı)

`app.js` içindeki `import './schema.js'` sürümsüzdü; `index.html` ise
`app.js?v=` ile sürümlüyordu. GitHub Pages `max-age=600` verdiği için tarayıcı
eski `schema.js`'i kullandı → `AMBIGUOUS_REVIEW` bulunamadı → uygulama açılmadı.
Import artık `?v=APP_VERSION` taşır; `surum-testi` 2b bunu zorunlu kılar.

### v2.116 — Takip modu: titreme + yinelenen alan (tamamlandı, canlı veri)

`markTextFollow` ve `followKaraoke` her 120 ms'de `innerHTML` yazıyordu: 3 saniyede
25 DOM değişikliği → metin titriyordu. Aynı metin 3 yerde gösteriliyordu. Artık
`karaokeSegments`/`karaokeActiveIndex` ile **bir kez** çizilir, yalnız sınıf
değişir (0 değişiklik/3sn); takip **tek alan**. `birim-testleri` [44].

### v2.115 — Belirsiz okuma + bölüm spektrogramı (tamamlandı, canlı veri)

"Anlaşılmadı" (ses anlaşılmıyor) ile "Belirsiz okuma" (ses duyuldu, iki okuma
mümkün) ayrıldı; `ambiguous` onay sayılmaz. İki okuma + seçim saklanır ve
rapora GİZLENMEDEN yazılır. Bölüm panelinde spektrogram (dalga + frekans).
Bulunan yan hata: rapor `reviewLabel()` çağırıyordu, `reviewCellText()` hiç
kullanılmıyordu → düzeltildi. `birim-testleri` [43].

### v2.114 — "%100 olmuyor" açıklaması (tamamlandı, canlı veri)

Sayaç 97/100 gösteriyordu; eksik 3 bölüm (2 relisten + 1 machine) kasten
sayılmıyordu ama HANGİ bölümler olduğu görünmüyordu. `pendingBreakdown()` +
`pendingSummaryText()` eklendi; durum çubuğu ve kayıt kartı ipucu aynı metni
kullanır, tıklayınca yalnız eksikler listelenir. `birim-testleri` [42].

### v2.113 — Bölüm listesi kaydırması (tamamlandı, canlı veri)

`scrollListToItem` artımlı ekleme yapıyordu (`scrollTop += ...`); `scrollTop`
tam sayıya yuvarlandığı için hata birikiyor ve 100 bölümde son öğe 28px
görünmüyordu. `nextScrollTop()` mutlak hesap + kırpma + idempotentlik.
`birim-testleri` [41] + gerçek Chromium (takip modunda 100. bölüm tam görünür).

### v2.112 — A–B döngüsü onarıldı (tamamlandı, canlı veri)

Üç hata: (1) `playSegmentRange` döngüyü hiç kontrol etmiyordu → "▶ Dinle" döngüyü
öldürüyordu; (2) A–B kısayolu yoktu, `B` bölmeye bağlıydı; (3) gösterge yalnız
`draw()` içinde tazeleniyordu. `loopStopTarget` (tek kaynak), `toggleLoop`
(düğme+tuş aynı), `paintLoopIndicators` (draw'dan bağımsız) eklendi. Kısayollar
A/B/K; bölme S. `birim-testleri` [40] + gerçek WAV ile Chromium korur.

### v2.111 — Çözümleme profili kayıt başına sabit (tamamlandı, canlı veri)

`transcribeWindow()` her pencerede `savedProfilePref()` okuyordu: uzun çözümleme
sürerken profil değişirse aynı kaydın bölümleri farklı profille çözümlenirdi.
Profil artık çözümleme başında sabitlenir, `material.transcribedWithProfile`'a
yazılır ve kayıt kartı + bölüm panelinde kısa rozetle görünür. Dil kilidi
(`PROFILE_LOCK`) korunur; profil rapora yazılmaz. `birim-testleri` [39] +
gerçek Chromium korur.

### v2.110 — Dışa aktarma kapsamı ve dosya adı (tamamlandı, canlı veri)

"Dışa aktar" sessizce TÜM dosyaları paketliyordu (3 dosya varken tek dosya sanan
kullanıcı 3 dosya indirdi); dosya adında saat yoktu. Artık kapsam SORULUR
(`exportPlanFor`), ad tarih+saat taşır (`backupFileName`), düğmelerin ipucu var,
yardımda terim sözlüğü. `birim-testleri` [38] + gerçek Chromium korur.

### v2.109 — İlk açılış gerçekten boş (tamamlandı, canlı veri)

Boş kurulumda oluşturulan taslak dosya KAYDA YAZILIYORDU; yeni tarayıcıda
"zaten dosya var" görünüyordu. Arayüz `currentCase()`'e bağlı olduğu için nesne
bellekte gerekli (kaldırınca `reportDate` hatası — ölçüldü). Çözüm:
`casesForStorage()` yalnız gerçek dosyaları yazar; seçicide "— Yeni dosya —".
`birim-testleri` [37] + uçtan uca Chromium korur.

### v2.108 — Arşivde boş dosya birikmesi ve görünmeyen kimlik (tamamlandı)

Boş dosya arşivlenebiliyordu (her basışta yeni boş kayıt); silme onayı ekranda
görünmeyen ham kimliği yazdırıyordu. `canArchiveCase`, `caseShortId`,
`caseDisplayName` eklendi; seçici/arşiv/bildirimler görünen adı kullanır.
`birim-testleri` [36] + gerçek Chromium korur.

### v2.107 — Arşivleme ve iki aşamalı silme (tamamlandı, canlı veri)

`snapshotForUndo` sesi kopyalamıyor; `deleteBlob` kalıcı → Ctrl+Z sesi
getirmez. Bu yüzden arşiv (veri silmez, gizler, yedeğe girer) ana yol; silme
yalnız arşivden ve iki onayla (ses uyarısı + dosya numarasını elle yazma).
Gerçek Chromium'da doğrulandı: A silindi, B'nin sesi korundu.

### v2.106 — Otomatik onay ≠ bilirkişi onayı (tamamlandı, canlı veri)

`bulkApproveQuick` `approved` yazıyordu; rapor "Onaylandı" basıyordu. Artık
`machine` durumu var: ekranda ve raporda **"Çözümlendi"**, gri rozet, ipucunda
"bilirkişi onayı sayılmaz". `isReviewed()` false → sayaç onu saymaz.
Bilirkişi dinleyip onaylayınca `approved` olur. Etiket/ipucu/renk tek kaynak
(`schema.js`). `birim-testleri` [34] + gerçek Chromium korur.

### v2.105 — Üst bar başlığı kesilmiyor (tamamlandı, canlı veri)

`#pageTitle` 5 görünümün hepsinde kırpılıyordu (211px içerik / 95px kutu);
`.top-actions` flex:none ile 922px yer kaplıyordu ve `overflow:hidden` yazıyı
sessizce kesiyordu. Düzeltme: üst bar `flex-wrap:wrap`, `.top-title` sıkışmaz,
başlıkta kırpma yok, durum yazıları kısa (uyarı yazıları DEĞİL). Ölçüm: 1280px+
tek satır (60px), altında sarar. `tasarim-testi` [2c] korur.

### v2.104 — Punto kaçakları ve okunaklı sürüm etiketi (tamamlandı, canlı veri)

"Hiçbir metin 11px altında olamaz" kuralı ekranda tutmuyordu: sürüm etiketi 7px,
`.eyebrow` 8px, `.split-n` 8px, `.info-i` 9px, `.subtle-pill` 10px. Sebep:
`tasarim-testi` yalnız `reading-layer.css`'e bakıyordu; `app.css`'teki 154 küçük
tanımın bir kısmı ezilmiyordu. Düzeltme kökten: app.css 11px tabanına çekildi
(116 `font-size` + 38 `font` kısayolu) + kaçak seçiciler için açık ezme.
Sürüm etiketi yalnız "v2.104" yazar, tıklanınca `VERSION_NOTICES`'ten üretilen
**sürüm geçmişi** açılır. `tasarim-testi` [2b] kaçağı artık yakalar (katı
eşleştirme; jenerik etiket kapsam sayılmaz).

### v2.103 — Yeniden çözümleme koruması (tamamlandı, canlı veri)

`transcribe()` mevcut bölümlerin üzerine yazar; v2.102'de koruma yalnız "elle
düzeltilmiş/onaylanmış" bölüme bağlıydı ve modelin dokunulmamış metni
SORULMADAN, GERİ ALINAMADAN siliniyordu (ölçüm: askConfirm=0, snapshot=0).
`reprocessPlan()` tek kural kurar: bölüm varsa sor + snapshot al.
`queueReprocessSummary()` toplu yolda tek soru üretir. `birim-testleri` [33]
ve gerçek Chromium akışı korur.

### v2.102 — Yedek, geri yükleme ve birleştirme sözleşmesi (tamamlandı, canlı veri)

Yedek başka bilgisayarda "2 dosya" diyordu, geri yükleme sonrası 3 kayıt
oluşuyordu ve ⇄ Birleştir arşiv paketini "uyumsuz" diye reddediyordu. Tek kök:
**boş çalışma alanı "dosya" sayılıyordu** ve iki paket biçimi (yedek/birleştirme)
ayrı kurallarla okunuyordu. `isEmptyCase`, `buildExportPlan`,
`selectCaseFromArchive`, `dropEmptyCases`, `matchAudioEntries` tek sözleşmeyi
kurar; `birim-testleri` [32] ve gerçek JSZip uçtan uca ölçümü korur.

### v2.101 — Perde oktav belirsizliği bildirilir (tamamlandı, canlı veri)

Zayıf temelde otokorelasyon perdeyi 2 katına çıkarıyordu (120 → 239 Hz) ve
rapor "genellikle kadın" diyordu. Klasik oktav düzeltmesi denendi ve normal
sesleri bozdu (210 → 105). Bu yüzden düzeltme değil BİLDİRİM yapılır:
`detectPitchAmbiguity()` f/2'de enerji arar; `pitchCellText()` belirsizse
aralık yazar, cinsiyet ipucu vermez. `birim-testleri` [31] korur.

### v2.100 — Türkçe büyük İ terim tutarlılığını bozuyordu (tamamlandı, canlı veri)

`contentWords` düz `toLowerCase()` kullanıyordu; Türkçe `İ` → `i` + birleşik
nokta olup kelime "stanbul"a parçalanıyordu. "İstanbul" ile "istanbul"
eşleşmiyordu. `trLowerCase()` tek kaynak yapıldı; `normalizeForWer` ve
`contentWords` onu kullanır. `birim-testleri` [30] korur.

### v2.99 — Hızlı onay sayacı = filtresi (tamamlandı, canlı veri)

`segCounts` hızlı onayı `segQuickCheck(s, prev)` ile (çakışma dahil) sayarken
`segMatchesFilter` `segQuickCheck(s)` (prev yok) çağırıyordu: sayaç 1, filtre
listesi 2. `quickApproveTargets()` tek kaynak yapıldı; sayaç, filtre ve toplu
onay aynı listeyi kullanır. `birim-testleri` [29] korur.

### v2.98 — Paragraf/bölme model çıktısını silmiyor (tamamlandı, canlı veri)

`paragraphize` yeni bölüm nesnesine asrText/asrModel/asrAt alanlarını hiç
taşımıyordu (tam kayıp). `splitSegmentAt` ise `{...s}` ile TAM asrText'i iki
yarıya kopyalıyordu (iki bölüm de "model tüm metni söyledi"). Artık paragrafta
birleştirilir, bölmede paylaştırılır; farklı modeller karışırsa model adı
boşaltılır. `birim-testleri` [28] korur.

### v2.97 — Zaman alanı doğrulanır (tamamlandı, canlı veri)

Zaman alanları hiç doğrulanmıyordu. `secondsFromTimecode` çözemeyince 0
döndüğü için "bozuk girdi" ile "gerçek 0" ayırt edilemiyordu; raporda sessizce
`00:00:00.000` yazılıyordu (Türkçe virgül, 99 saniye, harf, ters aralık).
`parseTimecodeStrict()` + `normalizeTimeInput()` eklendi; geçersiz değer
REDDEDİLİR ve kullanıcıya söylenir. `birim-testleri` [27] korur.

### v2.96 — SHA-256 doğrulaması sahte "eşleşti" verebiliyordu (tamamlandı, canlı veri)

`sha256()` hata durumunda METİN döndürüyordu; eski sürüm bu metni özet olarak
kaydettiği için `now === m.sha256` eşit çıkıyor ve "SHA-256 doğrulandı" diyordu.
Güvenli olmayan bağlamda (http:// LAN IP) her doğrulama sahteydi.
`sha256()` artık null döner; `isSha256Hex()` + `verifyHashState()` üç hâl
(verified/mismatch/unavailable). `birim-testleri` [26] korur.

### v2.95 — updatedAt tazelenir (tamamlandı, canlı veri)

`updatedAt` yalnız dosya oluşturma ve birleştirmede yazılıyordu; normal
düzenleme tazelemiyordu. Birleştirme "daha yeni kazanır" kuralını bu alanla
uyguladığı için bugün düzenlenmiş bir dosya "eski" sayılıp sessizce
eziliyordu. `touchCaseUpdated()` + `persist()` tek kapı; yükleme yolu
`persist({touch:false})`. `birim-testleri` [25] korur.

### v2.94 — Birleştirmede kayıt bilgileri kayboluyordu (tamamlandı, canlı veri)

`mergeCases` aynı kayıtta yalnız bölümleri işliyordu; `speakers`, `levels`,
`origin`, `spectrogramReviewed`, `expectedText`, `sha256`, `tech`, `log`
alanları gelen dosyada dolu olsa bile hiç aktarılmıyor, çakışma da
bildirilmiyordu (8 alan kaybı, 0 çakışma). `mergeMaterialFields()` +
`diffMaterialFields()` eklendi; önizleme ve birleştirme tek kuralı kullanır.
`applyMerge` sonrası `defineCaseMirrors` de çağrılır. `sema-testi` [7k] korur.

### v2.93 — Gerçek cümleler "dolgu" sayılıyordu (tamamlandı, canlı veri)

Dolgu deseni `[\s\S]*?` ile "etiket kelimesiyle BAŞLAYAN her metni"
yakalıyordu: "Konuşma sırasında bağırdı", "Nefes alıyor", "Müzik kutusu
çalındı" gibi gerçek cümleler dolgu sayılıp deşifreden çöpe atılıyordu.
Desen tam eşleşmeye daraltıldı. `birim-testleri` [24] korur.

### v2.92 — Sessizlik/perde tüm kanalları görür (tamamlandı, canlı veri)

`measureSegmentSilence` ve `measureSpeakerPitch` yalnız `getChannelData(0)`
okuyordu. Konuşma sağ kanalda ise bölüm "tamamen sessiz" sanılıyor (oran 1,0)
ve perde ölçülemiyordu. `pickActiveChannel()` + `analyzeSilenceChannelAware()`
eklendi: en yüksek enerjili kanal kullanılır, kanal numarası yazılır.
`SILENCE_SCHEMA = 2`; eski ölçümler atılır. `birim-testleri` [23] korur.

### v2.91 — Seviye/kırpılma kanal kanal ölçülür (tamamlandı, canlı veri)

`measureLevels` tüm kanalları ortalamayla mono'ya indiriyordu. Ses tek kanalda
ise tepe −6 dB düşük, tek kanaldaki kırpılma tamamen görünmez, ters fazda tepe
sıfır oluyordu. `analyzeChannelLevels()` eklendi: tepe/kırpılma en kötü
kanaldan (hangi kanal olduğu yazılarak), gürültü/SNR/bant mono karışımdan.
Ölçüm şeması 2 → 3. `birim-testleri` [22] korur.

### v2.90 — WER ters çalışıyordu (tamamlandı, canlı veri)

Rapordaki "çözümleme doğruluğu (WER)" tablosu hipotez olarak `s.text`
(bilirkişinin düzelttiği metin) kullanıyordu; modelin ham çıktısı `s.asrText`
ölçüme girmiyordu. Sonuç TERS: model %100 hatalıyken rapor %0, model
mükemmelken %100 diyordu. Hipotez artık yalnız `asrText`; model çıktısı yoksa
satır yazılmaz. `werMeasuredCount()` ile özet sayacı tabloyla eşlendi.
`birim-testleri` [21] ve `rapor-tutarlilik-testi` Senaryo 7b korur.

### v2.89 — Eski dosyalardaki onaylar yüklenirken siliniyordu (tamamlandı, canlı veri)

v2 dosyalarında kontrol durumu Türkçe kodla saklanıyordu ('onaylandi' vb.);
`normalizeSegment` bunları `pick()` ile okuyup tanımadığı için sessizce
'pending'e düşürüyordu. Dosya açılır açılmaz bilirkişinin onayları siliniyordu.
`REVIEW_LEGACY` + `normalizeReviewState()` şemaya tek kaynak olarak eklendi;
app.js'teki kopya tablo kaldırıldı. `sema-testi` [4b] korur.

### v2.88 — Onay metne bağlı değildi (tamamlandı, canlı veri)

Adli bütünlük hatası: onaylanmış bir bölümün metni tamamen değiştirilse bile
rozet "Onaylandı" kalıyor ve kontrol edilmemiş metin rapora onaylı giriyordu.
`setSegmentText()` tek darboğazında düzeltildi; onay düşünce kullanıcı anında
bilgilendirilir. `birim-testleri` [20] korur.

### v2.87 — Kayıt tamamen duruyordu (tamamlandı, canlı veri)

Bilirkişi "yaptığım tüm değişiklikleri kaybettim, uyarıyı görmedim" dedi.
İki hata birleşmişti: (1) bölüme tıklayınca `attachSegWave` malzemeye fonksiyon
yazıyor, IndexedDB `structuredClone` yapamadığı için **her kayıt iptal
ediliyordu**; (2) yazma hatası büyük uyarı göstermiyordu (şerit yalnız kota
hatasında çıkıyordu). `sanitizeForStorage()` eklendi; her yazma hatası görünür
şerit üretir. `birim-testleri` [17]/[18] korur.

### Açık konular — sırayla ele alınacak (tek konu = tek sürüm)

Aşağıdakiler ölçülerek tespit edildi; her biri **kıran test + düzeltme** ile
ayrı bir sürümde ele alınacak. Sıra, veri doğruluğuna etkisine göre:

| Sıra | Konu | Durum |
|---|---|---|
| 1 | Kayıt tamamen duruyordu + uyarı görünmüyordu | **v2.87 tamamlandı** |
| 2 | Onay metne bağlı değil: metin değişse de "Onaylandı" kalıyor | **v2.88 tamamlandı** |
| 3 | v2 onay kodları yüklemede sessizce `pending`'e düşüyor | **v2.89 tamamlandı** |
| 4 | WER, modelin çıktısı yerine bilirkişinin metnini ölçüyor | **v2.90 tamamlandı** |
| 5 | Seviye/kırpılma ölçümü mono karışımdan (kırpılma görünmüyor) | **v2.91 tamamlandı** |
| 6 | Sessizlik/perde ölçümü yalnız kanal 0 (stereo'da yanlış) | **v2.92 tamamlandı** |
| 7 | `isHallucination` gerçek cümleleri dolgu sayıyor | **v2.93 tamamlandı** |
| 8 | Birleştirmede kayıt düzeyi alanlar sessizce düşüyor | **v2.94 tamamlandı** |
| 9 | `updatedAt` hiç güncellenmiyor (yenilik ölçütü ölü) | **v2.95 tamamlandı** |
| 10 | Önizleme ile birleştirme farklı alan kümesi kullanıyor | bekliyor |
| 11 | SHA-256 hesaplanamazsa "doğrulandı" deniyor | **v2.96 tamamlandı** |
| 12 | Zaman alanı doğrulanmıyor (`00:00:05,100` → `00:00:00.000`) | **v2.97 tamamlandı** |
| 13 | `paragraphize` asrText/asrModel'i siliyor | **v2.98 tamamlandı** |
| 14 | Hızlı onay sayacı ile filtresi ayrışıyor | **v2.99 tamamlandı** |
| 15 | Türkçe büyük İ terim tutarlılığını bozuyor | **v2.100 tamamlandı** |

### v2.86 — Eksik ses uyarısı + yazma akıcılığı (tamamlandı)

Ses blobu kaybolduğunda dışa aktarma **sessizce** atlıyor, yedek "tam"
görünüyordu. Artık eksik sesler `EKSIK_SES_UYARISI.txt` olarak pakete yazılır
ve bildirim açıkça söyler. Ayrıca her tuş vuruşunda çalışan `segCounts` +
`renderOverview` 250 ms geciktirildi (ölçüm: 500 bölümde 8,5 ms/tuş → 0).

### v2.85 — Rapor çıktısı denetimi (tamamlandı)

Mahkemeye giden belge denetlendi. **Gerçek hata:** şema konuşmacıyı `label`'da
tutuyor, arayüzün 15+ yeri `name` okuyor; yükleme sonrası eşleşme kopuyor ve
raporda `S1` kodu kayboluyordu. `normalizeSpeaker` artık `name` ve `label`
alanlarını tek kaynaktan türetir. Ayrıca rapor testi yalnız metne bakıyordu;
ZIP yapısı, XML dengesi, kaçış ve Türkçe karakter denetimi eklendi
([Senaryo 11], 20 kontrol).

### v2.84 — Veri güvenliği denetimi, canlı veri (tamamlandı)

Bilirkişi gerçek veriye geçti; denetim veri kaybına odaklandı. Dört kritik hata:
(1) `loadState` içindeki tek hata **tüm arşivi** siliyordu (kanıtlandı), (2)
`beforeunload` yoktu, son 400 ms kayboluyordu, (3) iki sekme birbirinin işini
eziyordu (kanıtlandı), (4) dışa aktarma yalnız **aktif** dosyayı yedekliyor,
diğerleri sessizce dışarıda kalıyordu (kanıtlandı). Dördü de düzeltildi;
`surum-testi` [10] ve `sema-testi` [3d] korur.

### v2.83 — Otomatik çıktı ayrımı + depolama iki havuz (tamamlandı)

Harici bir analiz metni geldi. Maddelerin çoğu zaten vardı; iki gerçek boşluk
düzeltildi. (1) Model çıktısı yalnız `history`'de tutuluyor ve 10 sürümden
sonra siliniyordu; artık `asrText/asrModel/asrAt` alanlarında **değişmez**
saklanır ve arayüzde karşılaştırma bloğu olarak görünür. (2) Depolama
göstergesi model önbelleğini dava verisiyle topluyordu; artık iki havuz ayrı
yazılır. Test: `sema-testi` [3c], `birim-testleri` [16].

### v2.82 — Yerleşim düzeltmeleri (tamamlandı)

Kullanıcı görsel bozulma bildirdi. Headless Chromium ile **ölçülerek** üç hata
bulundu: (1) `sd-field > span` kuralı yeni konuşmacı seçicisini de yakalıyordu
(seçim kutusu ve ＋ düğmesi etiket stiline düşüyordu), (2) `.compact-bar`
`nowrap+hidden` olduğu için yeni filtre çipi ve toplu onay düğmesi kesiliyordu,
(3) dalga çubuğu `wrap` ile **5 satıra** kırılıyordu (ölçüm: 84px). Dalga
çubuğu iki satırlı grid'e çevrildi (84px → 57px). `tasarim-testi.mjs`
[Yerleşim] bu sınıfı korur.

### v2.81 — Çözümleme profilleri (tamamlandı)

Kullanıcı şive, kıcırtı ve malzeme sesi gibi farklı çözümlemeler istedi. Bunlar
**ayrı eğitilmiş model** gerektirir; depo öyle bir model içermez ve yapılmış gibi
gösterilmez. Bunun yerine aynı modelin yönlendirilebilir ayarı profil olarak
sunuldu (`ASR_PROFILES`): standart, şive/ağır aksan, gürültülü/kıcırtılı,
telefon/dar bant. Dil Türkçe ve görev transkripsiyon **sabit** kalır. Seçim
`akis.asrProfile` ile hatırlanır, rapora yazılmaz. Test: `birim-testleri.mjs`
[13] (19 kontrol; dil kilidinin bozulmadığını da doğrular).

### v2.80 — Hızlı onaya uygun filtresi + toplu onay (tamamlandı)

Kullanıcı: "otomatik onaylayabileceğimiz, doğrulukları yüksek olanları
belirleyelim". Model güven skoru vermediği için **uydurma doğruluk yüzdesi
üretilmez**; ölçüt yalnız gözlemlenebilir işaretlere dayanır (`segQuickCheck`):
anlamlı metin var mı, süre ≥1,2 sn mi, model tekrarı var mı, üst üste/anlaşılmaz
işaretli mi, öncekiyle çakışıyor mu. Sol panelde **Hızlı onaya uygun** filtresi
ve `✓ N hızlı onayla` toplu onay düğmesi eklendi. Toplu onay yalnız uygun
bölümlere dokunur, geri alınabilir, delil günlüğüne yazılır; onay yetkisi
kuralı (ikinci göz onaylayamaz) korunur. Test: `birim-testleri.mjs` [12].

### v2.79 — Konuşmacı standardı: rol/cinsiyet sessizce kayboluyordu (tamamlandı)

Kanıtlanmış **veri kaybı**: arayüz rol/cinsiyeti Türkçe etiket olarak yazıyordu
(`Davacı`, `Kadın`), şema ASCII kod bekliyordu (`complainant`, `female`). Etiket
kayda yazılınca `normalizeSpeaker` değeri `unspecified`'a düşürüyordu — her
yenilemede bilirkişinin girdiği rol ve cinsiyet siliniyordu.

Çözüm: standart konuşmacı kodu **S1, S2, S3…** (`assignSpeakerCodes`). Kod bir
kez verilir, değişmez; silinen konuşmacının kodu yeniden kullanılır. Bölümdeki
konuşmacı alanı serbest metin değil **listedit** (`S2 · Kiracı`); **＋** düğmesi
yeni konuşmacı ekler ve sıradaki boş kodu verir. Seçenek `value`'su kod, görünen
metin etikettir. Eski kayıtlar `normalizeSpeakerRole`/`normalizeSpeakerGender`
göç tablolarıyla kurtarılır. Raporun üç çıktısı `segSpeakerCell` ile tek
kaynaktan beslenir. Test: `sema-testi.mjs` [3b] (16 kontrol).

### v2.78 — Dinlerken bölme çizgisi bozulmuyor + A–B döngü (tamamlandı)

Kullanıcı: "dinlerken bölme çizgileri bozuluyor, tekrar düzeltmem gerekiyor"
ve "bir aralığı takip ederek dinlesek anlayamıyoruz".

İki gerçek hata:
- `nudgeBoundary` başlangıcı kaydırınca **bitişi de sessizce** taşıyordu;
  bölüm sıfır uzunlukta kalabiliyordu.
- Dalgaya **düz tıklamak** "en yakın sınırı" taşıyordu. Uzman dinlemek için
  tıkladığında bölme çizgisi bozuluyordu.

Çözüm: karşı sınır artık sürüklenmez (en az 0,1 sn kalır, nedenini söyler).
Düz tıklama yalnız **konuma gider**; sınırı taşımanın iki açık yolu var:
sınırı sürüklemek ya da **Alt+tıkla**. Yeni **A–B döngüsü** eklendi: yalnız
oynatmayı sarar, bölüm sınırlarına dokunmaz, kayda yazılmaz (oturumluk).
Test: `birim-testleri.mjs` [11] (11 kontrol).

### v2.77 — Belge koruması, buton hiyerarşisi, takip modu (tamamlandı)

Belge boşluğu bulundu: son 10 sürümün özellikleri OZELLIKLER.md'de yoktu.
Üç yeni bölüm eklendi; `surum-testi.mjs` artık 7 konuyu ve 4 yardım başlığını
denetliyor (yeni özellik belgeye yazılmazsa test kalır). 26 buton 5 renkli
aileye ayrıldı (onay yeşil, gözlem altın, yapısal mavi, yıkıcı kırmızı,
gezinme gri). Takip modu düzeltildi: `markTextFollow()` sağ paneldeki metni
canlı vurgular; bölüm dinlenince takip otomatik açılır. Model seçimi v2.73'ten
sonra hatırlanıyor (önce her açılışta öneri uygulanıyordu).

### v2.76 — Bölüm aralığını yeniden çözümle (tamamlandı)

Bölme sonrası metin kaybolabiliyordu. `retranscribeSegment()` eklendi: bölümün
başlangıç–bitiş aralığı ses dosyasından kesilir, yalnız o parça modele verilir;
diğer bölümlere dokunulmaz. Metin varsa onay sorulur, Ctrl+Z ile geri alınır,
eski metin geçmişe yazılır, işlem delil günlüğüne girer. Test [13]:
317 → 329.

### v2.75 — Geri alma (Ctrl+Z) + dalga kaydırma + bölme netliği (tamamlandı)

Geri alma hiç yoktu; yıkıcı işlemler kurtarılamıyordu. Her işlemden önce
anlık görüntü saklanır (son 20 adım), Ctrl+Z veya ↶ düğmesiyle geri dönülür.
Dalga: sürükle=sınır, Shift+sürükle=kaydır, tekerlek=zoom (üç işlev ayrı).
Bölme açıklığa kavuştu: aktif bölümü böler, metin yeniden çözümlenmez
(v2.74'teki paylaştırma kullanılır), bölünen bölümler "Kontrol bekliyor"a
döner. İpuçları ve Yardım ekranı güncellendi. Test [12]: 299 → 317.

### v2.74 — Bölme: metin paylaştırılıyor + tam noktadan bölme (tamamlandı)

Bölme `{...s}` ile metni iki tarafa kopyalıyordu: iki bölümde aynı metin
kalıyordu. `splitSegmentText()` eklendi: kelime zamanlaması varsa kesim
noktasına göre böler; yoksa oran tahminiyle kelime sınırından; hiçbiri
olmazsa kopyalar ve uyarır. Dalga üzerinde imleç zamanı gösterilir ve
"✂ Böl" düğmesi imlecin olduğu yerden böler. Bölünen bölümler "Kontrol
bekliyor"a döner, ayrı kimlik alır. Test [11]: 283 → 299.

### v2.73 — Veri 5 MB'lık yere sıkışmıştı; 10 GB'lık alana taşındı (tamamlandı)

Mimari hataydı: dava verisi localStorage'a (5 MB) yazılıyordu, oysa tarayıcı
kotası 10 GB. v2.72'de "küçültme" yanlış yaklaşımdı. Veri IndexedDB'ye
(`STATE_STORE`) taşındı; eski localStorage kaydı otomatik göç eder. Kalite
geri geldi: kelime zamanlaması yine saklanıyor (karaoke), geçmiş 3 → 10.
Üst barda "Depolama: X / Y (%)" göstergesi.

### v2.72 — Depolama bir davada doluyordu (%76 küçültüldü) (tamamlandı)

Üç suçlu ölçüldü: (1) `words` kelime zamanlaması kalıcı yazılıyordu (~320 KB),
(2) geçmiş 20 kayıt her biri tam metin (~770 KB), (3) v2.71'in
`previousSegments` yedeği bölümlerin tam kopyasını tutuyordu (dosyayı 2 katına
çıkarıyordu). Tek dava 3.74 MB (kota %75) idi. Çözüm: words yazılmaz, geçmiş
20→3, yedek yalnız metin. Sonuç: 1.25 MB → 0.30 MB (%76 küçük); 4 dava yerine
16 dava sığıyor.

### v2.71 — "Yeniden çözümle" tüm elle düzeltmeleri siliyordu (tamamlandı)

`m.segments = collected` mevcut bölümlerin üzerine yazıyordu: elle düzeltmeler
ve onaylar uyarısız siliniyordu. Artık elle düzeltme varsa onay sorulur, eski
bölümler `previousSegments`'e saklanır ve "Önceki bölümleri geri yükle"
düğmesiyle dönülebilir.

### v2.70 — Yarıda kalan çözümleme dosyaya yazılıyordu (tamamlandı)

`transcribing` ve `progress` geçici işlem durumları dosyaya yazılıyordu.
Çözümleme sürerken dışa aktarılan dosya, başka bilgisayarda açılınca sonsuza
kadar "%70 çözümlüyor" görünüyor, İptal çalışmıyordu (okuyan döngü yok).
`normalizeMaterial()` artık `transcribing`i `partial`/`pending`e çeviriyor;
`stripDerivedFields()` açılışta eski kayıtları da temizliyor. Test [7j]:
273 → 283.

### v2.69 — Veri güvenliği: sessiz kayıp önlendi + model hatırlanıyor (tamamlandı)

Depolama dolduğunda yalnız küçük bir yazı değişiyordu; kullanıcı yazmaya
devam edip veri kaybediyordu. Büyük uyarı şeridi + "Dışa aktar" düğmesi
eklendi. Üst barda yedek durumu göstergesi (hiç / güncel / 3+ gün eski).
Model seçimi `akis.model` ile saklanıyor; her açılışta öneri onu ezmiyor.
İçe aktarmada çözümleme korunuyor (ölçümle doğrulandı).

### v2.68 — Yardımcı kendi yazdığını göremiyordu (tamamlandı)

`applyTextEdit()` öneriyi `proposal`'a yazıyor, `text` değişmiyordu — doğru.
Ama textarea `s.text` gösteriyordu: yardımcı yazıyor, panel yenilenince kendi
yazdığını göremiyordu. "Hiçbir şey değişmiyor" hissi buydu. Artık ikinci göz
textarea'da öneriyi görür. Ayrıca: aynı dosya açıkken İçe aktar onay sorar
(kopya açacağını söyler), "Şu an çalışan" seçilince rol bildirilir
(onaylayabilir / öneri verir).

### v2.67 — Ekip çalışması akışı Yardım ekranına yazıldı (tamamlandı)

Akış hiçbir yerde yazmıyordu; kullanıcı tahmin ediyordu. Simülasyonla iki
yanlış anlama bulundu: (1) yardımcı "Onaylandı" basamaz — uygulama engeller,
(2) birleştirme için "İçe aktar" değil "⇄ Birleştir" kullanılır (içe aktar
kopya açar). 9 adımlı akış Yardım ekranına eklendi.

### v2.66 — Gözlemci onaylayabiliyordu (tamamlandı)

Rol tablosu ölçüldü: `observer` (Gözlemci) ikinci göz sayılmıyordu, TAM
YETKİLİYDİ. Ölçüm: gözlemcinin onayı birleşmede "approved" olarak kabul
edildi. Gözlemci sadece bakar; onayı adli belgede kabul edilemez.
`SECOND_EYES_ROLES`'a `observer` eklendi; `APPROVER_ROLES = [owner, expert]`
ve `canApproveRole()` tanımlandı; iki küme ayrık. Test [7i]: 250 → 273.

### v2.65 — Dosya bilgileri birleşmeye girmiyordu (tamamlandı)

`mergeCases()` yalnız 7 düz alanı birleştiriyordu; arayüzdeki 17 alanın 10'u
(parties/expert/assignment/report içinde) birleştirmeye hiç girmiyordu.
Ölçüm: yardımcının doldurduğu davacı, davalı, bilirkişi adı, sicil no, tarihler
KAYBOLDU — ne uygulandı ne çakışma bildirildi. İç içe gruplar eklendi. Kural:
boş alan dolar, ikisi de doluysa gelen yeniyse o alınır / değilse çakışma,
boş gelen dolu değeri asla ezmez. Test [7h]: 231 → 250 kontrol.

### v2.64 — Sol liste kaydırması geri geldi (tamamlandı)

`app.css:918` kuralı `max-height:none!important` taşıyordu; v2.63'teki
`max-height:62vh` onu ezemedi. Ölçüm: 200 bölümde liste 6816px uzuyor,
SCROLL YOK. `!important` ile sabitlendi: görünen 670px, içerik 6814px,
scroll ÇALIŞIYOR. Sağ detay da 78vh ile kendi içinde kayar.

### v2.63 — Panel iki sütuna bölündü; sabit yükseklik kaldırıldı (tamamlandı)

KÖK NEDEN: `#view-audio .seg-workspace { height: clamp(280px,52vh,620px) }`
panel ekranın %52'sine sabitlenmişti. İçerik 642px istiyor → her ekranda
taşıyordu (1080px'te 80px, 800px'te 226px). Önceki üç deneme bu yüzden
"bir türlü olmuyor"du. Sabit yükseklik kaldırıldı; panel iki sütuna bölündü
(sol: dalga/zaman/konuşmacı, sağ: metin, alt: onay+araçlar). Ölçüm: panel
642 → 415px, taşma yok, çakışma yok.

### v2.62 — Bölüm detayı sıfırdan; segment dalgası geri (tamamlandı)

v2.61'de zoom dalgası yanlışlıkla kaldırılmıştı; ana dalga tüm kaydı gösterdiği
için bölüm sınırlarını hassas ayarlamaya yetmiyordu ve elle saat yazmak
zorlayıcıydı. `attachSegWave()` eklendi: bölümün ±0,5 sn penceresinde
sürüklenebilir B/S sınırları, tekerlek zoom, canlı konum çizgisi. Yapı yeni
`sd-*` sınıf adlarıyla sıfırdan yazıldı; eski 21 CSS katmanı artık uymuyor.
Ölçümle doğrulandı: taşma yok, çakışma yok.

### v2.61 — Bölüm detayı sadeleştirildi (tamamlandı)

`app.css`'te `seg-detail` için 21 çakışan kural vardı; ikisi `height:100%!important`
zorluyor, içerik taşıyor ve düğmeler üst üste biniyordu. Zoom dalgası, zaman
hassas kaydırma ve hız düğmeleri kaldırıldı (~35 → ~18 düğme); gözlem/araçlar
katlanır bölmeye alındı. `reading-layer.css` sonuna tek yetkili v2.61 katmanı
eklendi. Ölçümle doğrulandı: taşma yok, çakışma yok (normal ve 420px).

### v2.60 — Öneri görünür oldu + bölüm detayı düzenlendi (tamamlandı)

İkinci göz yazdığında öneri saklanıyordu ama panel yeniden çizilmediği için
görünmüyordu; yardımcı "hiçbir şey olmuyor" sanıyordu. `refreshProposalBand()`
bandı yerinde tazeler, listede "Öneri" rozeti çıkar. Yerleşik ses player
gizlendi (dalga formu hem konumu gösterir hem tıklanınca gider); süre metin
olarak yazılır. Bölüm detayı bölgelere ayrıldı; kaydırma yalnız liste ve detay
paneline hapsedildi. Ayrıntı: `CHANGELOG.md`.

### v2.59 — Onay çalışıyordu ama ekranda görünmüyordu (tamamlandı)

Şema v3 ASCII kod üretiyordu (`approved`), liste çizimi v2 Türkçe kod arıyordu
(`onaylandi`). Onaylama veriyi doğru yazıyordu ama rozet hep "Bekliyor"
görünüyor, sayaçlar artmıyordu; kullanıcı "değişmiyor" sanıyordu. Altı
karşılaştırma v3 koduna çevrildi. Ayrıntı: `CHANGELOG.md`.

### v2.58 — "Onayla" sessizce başarısız oluyordu (tamamlandı)

Bölüm yoksa `approveActiveSegment()` hiçbir şey yapmadan dönüyordu; kullanıcı
düğmeye basıp yanıt alamıyor, sistem bozuk sanıyordu. Sessiz çıkışlar
kaldırıldı: bölüm yoksa ve seçili bölüm yoksa açıklayıcı uyarı gösterilir.

### v2.57 — Teslim alma: kod ≠ etiket + rapor uyarıları (tamamlandı)

v2.56'da diyalog Türkçe etiket ("USB flaş bellek") yazıyordu, şema ASCII kod
("usb") bekliyordu: kayıt yeniden yüklenince teslim bilgisi geçersiz oluyordu.
Seçenek değeri artık kod, görünen metin etiket; eski Türkçe değerler
`normalizeMediumType()` ile koda çevriliyor. Rapor öncesi "teslim bilgisi
eksik" ve "zincir kırığı" uyarıları eklendi. Ayrıntı: `CHANGELOG.md`.

### v2.56 — Delil zinciri gerçekten çalışıyor + teslim alma kaydı (tamamlandı)

Belgeler "kurcalama tespit edilir" diyordu ama uygulama günlüğü elle
`{at,event}` yazıyordu: `logEntry()` çağrısı 0, `verifyLogChain()` çağrısı 0,
8 ham `m.log.push`, gerçek günlük **kırık**. Sekiz nokta `logEvent()`e
bağlandı; girdiler `prevHash`+`hash`+`actor` taşıyor. Üç hâlli durum
(`verified`/`legacy`/`broken`) ve eski kayıt göçü eklendi; eski kayıt "kırık"
diye suçlanmıyor. Dosya eklemeden önce "Delil teslim alma" diyaloğu açılıyor.
Ayrıntı: `CHANGELOG.md`.

### v2.55 — Kaynağı tanımsız düzenleme onaylı sayılmaz (tamamlandı)

Yardımcı ekip bölümünü doldurmayı atlarsa eski kod onun onayını kabul ediyordu
(rapor "Onaylandı" diyordu). Kural: ekip listesi doluysa ve düzenleyen
eşleşmiyorsa onay kabul edilmez; bölüm "Kontrol bekliyor"a çekilir ve çakışma
olarak bildirilir. Ekip boşsa (tek kişilik dosya) eski davranış korunur.
Ayrıca dışa aktarmadan önce "kim olarak çalışıyorsunuz?" sorulur. Ayrıntı:
`CHANGELOG.md`.

### v2.54 — İkinci göz: yardımcı önerir, bilirkişi onaylar (tamamlandı)

Gönüllü yardım senaryosu: bilirkişinin dosyası kendi bilgisayarında; yardımcı
başka bilgisayardan metne ikinci göz olarak bakar. Kararı bilirkişi verir.

Risk: rapor "Kontrol" sütununa `reviewLabel()` yazıyor; yardımcı onaylarsa
rapor "Onaylandı" derdi. Çözüm: `assistant`/`reviewer` rolleri ikinci göz
sayılır; düzeltmeleri `segment.proposal` olarak saklanır, ana metin değişmez.
Bilirkişi öneriyi kabul veya reddeder. İkinci göz onay veremez; birleştirmede
ikinci gözün onayı "Kontrol bekliyor"a çekilir. Ayrıntı: `CHANGELOG.md`.

### v2.53 — Yardımcı düzeltmesi birleştirmede korunuyor (tamamlandı)

Gerçek kullanım senaryosu: bilirkişi kendi bilgisayarında çözümlemeyi yapar,
işi bitmez; yardımcısı **başka bilgisayardan** metni kontrol edip düzeltir.
İki hata bulundu ve giderildi:

1. `mergeCases()` metin çakışmasında her zaman yerel metni tutuyordu; yardımcının
   düzeltmesi sessizce kayboluyor, "onaylandı" damgası yanlış metne vuruluyordu.
2. Deşifre bölümleri kimliksiz üretiliyordu; iki bilgisayarda ayrı kimlikler
   oluştuğu için birleştirme bölümleri hiç eşleştiremiyordu.

Çözüm: kimlik üretim anında verilir; metne insan eli değdiğinde `textRev`
işareti konur. Birleştirmede yalnız bir taraf düzenlemişse o taraf alınır; iki
taraf da düzenlemişse **sessiz seçim yapılmaz**, çakışma bilirkişiye bildirilir.
Kaybeden metin geçmişe yazılır. Onay metne bağlıdır. Ayrıntı: `CHANGELOG.md`.

### v2.52 — Ekip çalışması: dosya birleştirme (tamamlandı)

İki bilirkişi aynı davada çalıştığında her biri kendi `.akis` dosyasında
ilerler; dosyalar **⇄ Birleştir** ile birleştirilir. Kimlik (id) ile eşleşme,
çakışma ekranı, işlem günlüğü. Sunucu/eşzamanlı düzenleme yok. Ayrıntı:
`CHANGELOG.md`.

### v2.51 — v3 veri şeması (tamamlandı)

Kimlikli, kod tabanlı, sürümlü şema (`assets/schema.js`): bölüm/soru/konuşmacı
id ile; durum kodları ASCII sabit, Türkçe yalnız etiket; iç içe `parties/
assignment/expert/report`; delil günlüğünde `prevHash`+`hash` zinciri; id ile
çakışma raporlayan birleştirme. Dosya çekmecesine "İnceleme ekibi" bölümü
eklendi (rapora girmez). 87 şema testi. Ayrıntı: `CHANGELOG.md`.

### v2.50 — Okuma katmanı (tamamlandı)

Üç tema (açık/koyu/sepya), yoğunluk ve yazı boyutu; token tabanlı tipografi ve
kontrast (WCAG AA); rapor kâğıdı temadan bağımsız. Ayrıntı: `CHANGELOG.md`.

### v2.49 — Rapor bilirkişi adına, seviye ölçümü, sürüm disiplini (tamamlandı)

Rapor çıktılarından uygulama kimliği çıkarıldı (alt bilgi, yöntem metni, UDF
tablo adları); kapak ve Word üst bilgisi dosyada girilen uzmanlık alanını
gösteriyor. Ses seviyesi/kırpılma ölçümü (`analyzeLevels`) eklendi ve üç rapor
oluşturucusuna tek kaynaktan bağlandı; ölçülmemiş kayıt tabloya girmiyor.
v2.32–v2.48 sürüm kayması giderildi ve `tools/surum-testi.mjs` ile kalıcı
denetime bağlandı. Ayrıntı: `CHANGELOG.md`.

### v2.0 — Rapor metni tutarlılığı (tamamlandı)

v1 incelemesinde üç rapor oluşturucu arasında dokuz metin sapması bulundu;
en ciddisi "Çözümleme uyarısı" bilgisinin yalnızca önizlemede görünüp DOCX ve
UDF çıktısında kaybolmasıydı. Tüm sapmalar giderildi ve tekrar oluşmasını
önlemek için `tools/rapor-tutarlilik-testi.mjs` eklendi. Ayrıntı:
[`BILINEN_SORUNLAR.md`](BILINEN_SORUNLAR.md).

### v2.1 — Deşifre ve kontrol çalışma alanı (tamamlandı)

Uzmanın en çok zaman geçirdiği alan yeniden tasarlandı. Klavye kısayolları,
aktif bölüm odağı, bölüm filtresi, oynatma hızı ve denetim ilerlemesi eklendi.
Ayrıca metin geçmişinin her tuş vuruşunda kaydedilmesi hatası ve kirlenmiş
geçmiş giderildi. Ayrıntı: [`../CHANGELOG.md`](../CHANGELOG.md).

### v2.2–v2.8 — Araç ve doğruluk katmanı (tamamlandı)

Ayrıntı [`../CHANGELOG.md`](../CHANGELOG.md) ve
[`OZELLIKLER.md`](OZELLIKLER.md) dosyalarında:

- v2.2: hassas sınır ayarı, yakınlaştırılmış dalga formu, odak modu.
- v2.3: kanal seçimi (sol/sağ/stereo), gözlem işaretleri, böl/birleştir.
- v2.4: spektrogram (FFT, doğruluğu birim testiyle kanıtlandı).
- v2.5: inceleme özeti (denetim kaydı).
- v2.6: çözümleme doğruluk ölçümü (WER).
- v2.7: kayıt kökeni ve teslim zinciri.
- v2.8: sayfa sıçramasının kök nedeninin giderilmesi.

### v2.9–v2.13 — Deşifre deneyimi (tamamlandı)

Dinleme denetimleri (akıllı Dinle/Duraklat + Durdur), milisaniye zaman kodu,
yakınlaştırılmış dalga formu etkileşimi, hızlı etiketler, paragraf oluşturma,
karaoke vurgulama, DSP dinleme yardımcıları ve odak modu çıkışı. Ayrıntı:
`CHANGELOG.md`.

### v2.14 — Kayıt listesi (master–detail) (tamamlandı)

Çok kayıtlı dosyalarda sayfa uzaması giderildi: üstte kompakt kayıt listesi,
altta yalnızca seçili kaydın detayı.

### v2.15–v2.17 — NLP ölçümleri (tamamlandı)

Sessizlik/boşluk ölçümü, terim yazım tutarlılığı, tekrar/dolgu tespiti.
Hepsi deterministik; uydurma skor üretilmez.

### v2.18 — Akış test kapsamı (tamamlandı)

Yedekleme, model yöneticisi ve deşifre motoru karar mantığı saf fonksiyonlara
ayrılıp otomatik teste bağlandı.

### v2.27–v2.48 — Arayüz yenilemesi (tamamlandı)

Dar ray + üst bar + durum çubuğu; ayarlar ve dosya bilgileri sağ çekmecede;
uzun açıklamalar ⓘ ipucunda; rapor tam ekran modu; kayıt kartı sekmeleri,
çalışma modu, tek kaydırma katmanı, ana oynat şeridi ve dinleme yardımcısının
şeride taşınması. Ayrıntı: `CHANGELOG.md`.

### v2.19–v2.26 — Model ve çözümleme düzeltmeleri (tamamlandı)

Model görünürlüğü ve yükleme ilerlemesi; timestamp token sızıntısı ("- - - -");
dtype/bellek sorunları; GPU→CPU geri dönüşü; gerçek model boyutları;
cache-busting. Ayrıntı: `CHANGELOG.md`.

## Planlanan çalışmalar (henüz uygulanmadı)

Bu maddeler henüz kodlanmadı; sürüm numarası verilmedi.

### Düşük güvenli bölüm vurgusu

Kütüphane (transformers.js) güven skoru vermediği için uydurma skor üretilmedi.
Model skoru dışa aktarılırsa gerçek skor; aksi halde gerekçeli alternatif
değerlendirilecek.

### Mercie özel rapor alanları

Bölüm yapısı dört merci türünde aynıdır; fark yalnızca kapak alanlarındadır.
Ceza, savcılık ve icra için bölüm içi alanların uzmanlaştırılması değerlendirilecek.

### Model karşılaştırma aracı

Aynı kaydı birden çok modelle çözümleyip WER ve metni yan yana göstermek.
WER yalnızca referans metni bulunan kayıtlarda hesaplanabilir.

## Değişmez kurallar

Bu kurallar her sürümde korunur:

- Python yok.
- Node.js yok (yalnızca tarayıcı ve isteğe bağlı PowerShell yerel sunucusu).
- GitHub Pages üzerinden `main` kök dizininden çalışma korunur.
- DOCX ve UDF üretimi korunur.
- Orijinal ses dosyaları değiştirilmez.
- Kontrol edilmeyen deşifre, kontrol edilmiş gibi gösterilmez.
- Yapılmayan inceleme raporu, yapılmış gibi yazılmaz.
- Her aşama test edilmeden sonraki aşamaya geçilmez.
