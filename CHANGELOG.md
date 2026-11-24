# Değişiklik Günlüğü

Bu dosya AKİS'in sürüm geçmişini özetler. Kayıtlar, uygulamanın geliştirme
sürecinde tutulan eski `VERSION.txt` dosyasından tekrarlar ayıklanarak
derlenmiştir. Önceki dosya tek bir sürüm başlığı altında yüzden fazla maddeyi
(yaklaşık 13'ü birebir tekrar) sıralıyordu; burada aynı bilgiler konuya göre
gruplanmıştır.

**Güncel sürüm: v2.255.** Sürüm numarası `MAJOR.MINOR` biçimindedir ve tek
kaynaktan gelir: `assets/app.js` içindeki `APP_VERSION`. Her güncellemede o
değer, bu dosyadaki yeni başlık ve `docs/YOL_HARITASI.md` birlikte artırılır.

Kayıtlar en yeniden en eskiye doğru sıralanır. Yol haritası:
[`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md).

## v2.255 — Kenar boşluğu: varsayılan 25 mm + şablon ilişkisi netleşti

Kullanıcı: "UDF'de kenar boşlukları, boş bıraktığımdan farklı; böyle mi olmalı?"
**Açıklama:** UDF kenar boşluğu, **"Rapor biçimi → kenar boşluğu"** değerinden gelir
ve **boş UYAP şablonunun kendi marjını (~42,5 mm) geçersiz kılar**. Bu yüzden boş
şablondan farklı görünür — beklenen davranış, ama değer seçimi önemli.

### KULLANICI NE GÖRECEK
- **Varsayılan kenar boşluğu 20 mm → 25 mm** (yeni dosyalar için). 25 mm resmî
  yazışmada yaygın, okunaklı bir dengedir; **üç çıktıya da** (UDF/DOCX/PDF) uygulanır.
- Panelde not: "Kenar boşluğu, UYAP boş şablonunun kendi marjını geçersiz kılar
  (varsayılan 25 mm)."
- **Mevcut kayıtlı dosyada** değer eskisi gibi kalır (20 mm). Değiştirmek için
  **Rapor biçimi → kenar boşluğu** alanlarını 25 yap; **hemen** UDF/DOCX/PDF'e yansır.

### Neden 42,5 mm (şablon) değil?
- Boş UYAP şablonunun ~42,5 mm marjı çok geniştir (metin alanı daralır). Resmî
  yazışmada yaygın **~2,5 cm (25 mm)** daha okunaklı. İsterseniz panelden 10–50 mm
  arası (ör. 42) ayarlayabilirsiniz.

### Koruyan test
- `birim [93]` (varsayılan marj 25 mm).

## v2.254 — Üç çıktı aynı yazı tipi (varsayılan Times New Roman)

Kullanıcı: "UDF farklı, DOCX farklı, PDF farklı çıkıyor." Üç dosya incelendi:
**içerik aynı** (aynı bölüm kümesi), ama **yazı tipi farklıydı**: UDF **Times New
Roman**, DOCX/PDF **Arial**. Kenar boşlukları zaten 20 mm'de eşitti.

### KULLANICI NE GÖRECEK
- **Yazı tipi ayarı artık ÜÇ çıktıya da uygulanır** (UDF/DOCX/PDF/ekran).
- **Varsayılan: Times New Roman** (resmî UYAP standardı) → UDF/DOCX/PDF aynı
  tipografiyle gelir. İsterseniz Arial/Segoe seçin; üçü de değişir.
- Ekran önizlemesi de varsayılan serif (Times) olduğundan UDF ile aynı görünür.

### Ne değişti
- `emptyReportFormat().fontFamily` varsayılanı `'times'`.
- `makeUdf` yazı tipini `REPORT_FONT_DOCX[fmt.fontFamily]` ile yazar (sabit Times
  değil). Böylece Arial seçilirse UDF de Arial üretir.

### Dürüst sınır
- Üç motor (UYAP/Word/tarayıcı) **pixel-pixel aynı** olamaz; hedef **aynı içerik +
  aynı yazı tipi + aynı 20 mm marj + aynı başlık hiyerarşisi**. Üst/alt bilgi ve
  sayfa numarası motora göre değişir (DOCX `PAGE`; HTML/UDF editöre bağlı).

### Koruyan test
- `birim [93]` (varsayılan Times) + `rapor` Senaryo 26 (Arial seçilince UDF Arial).

## v2.253 — Rapor kâğıdı biçimi (kurumsal görünüm)

Rapor önizlemesi/yazdırma daha resmî ve okunaklı görünür. **Yalnız GÖRSEL**: metin
değişmez → üç çıktı (HTML/DOCX/UDF) aynı metni üretmeye devam eder.

### KULLANICI NE GÖRECEK
- **Kapak bandı:** T.C. / mahkeme / "BİLİRKİŞİ RAPORU" bloğu çerçeveli, üstten kalın
  çizgili, hafif zeminli bir bant olarak çizilir.
- **Bölüm başlıkları:** sol tarafta kalın vurgu çubuğu; alt kural korunur.
- **Tablolar:** başlık bandı (lacivert) + **çift satır zebra**; ilk sütun vurgusu.
- **İmza:** ad üstünde ince çizgi.
- **Yazdırma/PDF:** tablo satırları bölünmez, tablo başlığı her sayfada yinelenir,
  bölüm başlığı tek başına sayfa sonunda kalmaz; kapak zemini yazdırmada beyaz.

### Ölçüm (gerçek Chromium, 1440×900)
- Kapak: `border-top 4px solid`, zemin `rgb(246,248,251)`, `radius 4px`.
- Bölüm başlığı: `border-left 4px`, `padding-left 10px`.
- Tablo zebra: tek satır beyaz, çift satır `paper-band` (farklı).
- Alt bilgi `font-weight 600`. **Metin içeriği değişmedi** (`rapor` testi yeşil).

### Dürüst sınır (sayfa numarası)
- **DOCX:** alt bilgide `PAGE` alanı var (Word/PDF sayfa numarası basar).
- **HTML/yazdırma:** tarayıcı `@page` çoğu sürümde sayfa numarası kutusu desteklemez;
  numara tarayıcının yazdırma başlık/altlık ayarına bağlıdır. Ekranda "Sayfa N/M"
  A4 penceresinde görünür.
- **UDF:** sayfa numarası UYAP editörünün sayfa düzenine bırakılır.

### Koruyan test
- `birim [104]` (kapak bandı, bölüm vurgusu, zebra, yazdırma kuralları).

## v2.252 — UDF ZWSP: yalnız SHA-256 içinde (metin/saat/sözcük kesinlikle temiz)

v2.251 kuralı hâlâ "24+ karakterlik herhangi bir kesintisiz dizi"yi sarıyordu. Yeni
gerçek UDF (`Bilirkisi_Raporu_Tumunu_Sec.udf`) incelendi: 173 ZWSP; bir kısmı
**zaman kodunda** (`:59␣:48`) ve **uzun sözcükte** (`ılı␣kla`) idi — yani metne
hâlâ görünmez karakter giriyordu.

### KULLANICI NE GÖRECEK
- UDF'te **zaman kodları, tarihler, deşifre metni ve uzun sözcükler TAMAMEN temiz**.
- Görünmez karakter (ZWSP) **yalnız 48+ karakterlik saf hex dizilerde** (SHA-256)
  satır kırma amacıyla; oradan kopyalanan hash'te görünmez karakter olabileceğini
  unutmayın (hash'i tercihen uygulamadan kopyalayın).

### Ne değişti
- `zwspWrapLongHex(text)`: `\b[0-9a-fA-F]{48,}\b` eşleşen tokenların içine 16'da bir
  ZWSP; **başka hiçbir metne dokunmaz**. `makeUdf` tablo hücresi bunu kullanır.

### Koruyan test
- `birim [103]`: zaman aralığı + uzun sözcük + kısa metin **değişmez**; hash ZWSP
  içerir ama ZWSP'ler atılınca **orijinalle aynı**.

## v2.251 — UDF'te deşifre metnine görünmez karakter (ZWSP) enjeksiyonu kaldırıldı

Gerçek bir uçtan uca UDF (`Bilirkisi_Raporu.udf`, video + deşifre) incelendi:
içinde **377 adet U+200B (zero-width space)** vardı — `Belirtil\u200Bmemiş`,
`00:00:00\u200B.000`, `24.11.20\u200B26`. Eski kod UDF tablo hücrelerinde **her 8
karakterde bir** görünmez karakter ekliyordu (satır kırma için). Bu, **deşifre
metnine görünmez karakter sokar**; adli metin bütünlüğü, kopyala/ara için sakıncalı.

### KULLANICI NE GÖRECEK
- UDF'te **deşifre metni, zaman kodları ve tarihler artık temiz** (görünmez karakter
  yok). Yalnız **çok uzun kesintisiz tokenlar** (ör. 64 karakterlik SHA-256) satır
  kırılabilsin diye içeriden sarılır.

### Ne değişti
- `makeUdf` tablo hücresi: `(\S{8})(?=\S)` → **yalnız `\S{24,}`** içinde ZWSP.
  Normal sözcük/zaman/tarih dokunulmadan bırakılır.

### Ölçüm
- Gerçek UDF: 377 ZWSP → düzeltme sonrası yalnız hash'lerde (örnek e2e: 17, hepsi
  hash). **Deşifre metni/saat temiz.**

### Koruyan test
- `rapor` Senaryo 28: deşifre metni/zaman kodunda ZWSP yok; uzun SHA-256 sarılır.

## v2.250 — "Ses / Video" başlığı + raporda "yalnız ses" notu

Video hikâyesini 56.12 kapsamında tutarlı kapatır: adı kapsayıcı, raporu dürüst.

### KULLANICI NE GÖRECEK
- Sol raydaki **"Ses"** bölümünün başlığı **"Ses ve video kayıtları"** oldu (nav
  ipucu + panel başlığı). Davranış aynı.
- **Video** materyal varsa raporun **envanter** bölümünün notuna şu cümle eklenir:
  *"Kesitteki video dosyalarından yalnızca ses kanalı çözümlenmiştir; görüntü
  incelenmemiştir."* **Üç çıktıda (HTML/DOCX/UDF) aynı metin.**
- Video yoksa bu cümle **girmez** (gereksiz yer kaplamaz).

### Ne değişti
- `REPORT_TEXT.videoAudioNote` + `reportVideoNote(c)`/`videoNoteSuffix(c)` (tek
  kaynak); HTML/DOCX/UDF envanter notu bu eki birlikte kullanır.

### Koruyan test
- `birim [102]` (video varsa not, yoksa boş) + `rapor` Senaryo 27 (üç çıktı aynı,
  video yoksa yok).

## v2.249 — Analiz sekmesi kırpılmıyor (kendi içinde kayar)

Kullanıcı: "Analiz kısmında 'Konuşmacılar ve ses özellikleri' etiketini görüyorum,
altını göremiyorum; boş alan var ama sığmamış." **Gerçek Chromium ölçümü (1440×900)**
kanıtladı: içerik 810 px, görünür 673 px, `overflow: visible`; `#audioDetail
overflow:hidden` alttaki bölümü (725–988) **kesiyordu**, kaydırma yoktu.

### KULLANICI NE GÖRECEK
- **Analiz** ve **Kayıt bilgileri** sekmeleri artık **kendi içinde kayar**; en
  alttaki **Konuşmacılar ve ses özellikleri** içeriğine ulaşılır.
- **Deşifre sekmesi DEĞİŞMEDİ** (kendi iç kaydırması korunur).

### Ne değişti
- v2.129'un `#view-audio .card-pane.on { overflow:visible }` kuralı bu iki sekmeyi
  de kapsıyordu. Daha yüksek özgüllükle **yalnız** `[data-pane="listen"]` ve
  `[data-pane="record"]` sekmelerine `overflow-y:auto; max-height:100%` verildi.

### Ölçüm (sonra)
- Analiz sekmesi: `overflow-y:auto`, 673/810; aşağı kaydırınca son bölüm
  **görünür** (`lastBottomVisible=true`). Deşifre: pane `overflow hidden`, liste
  `overflow auto` (492/492) → bozulmadı.

### Koruyan test
- `birim [101]`.

## v2.248 — Video dosyalarından ses çözümü (yalnız ses)

56.12 kapsamında video konteynerindeki **ses** metne dönüştürülür. **Görüntü
incelenmez.** Fizibilite **gerçek Chromium'da ölçüldü**: mp4/mov (AAC) ve webm
(Opus) dosyalarının sesi `decodeAudioData` ile çözüldü (süre/kanal/örnekleme
alındı). Yetki aşılmaz: sessizce "yapıldı" denmez.

### KULLANICI NE GÖRECEK
- "Ses dosyası ekle" artık **MP4 · MOV · M4V · WEBM · OGV** da kabul eder (video).
- Video eklenince kayıt **materyal** olur; **çözümle/deşifre** ses üzerinden
  çalışır. **Görüntü analiz edilmez.**
- Envanterde **DOSYA BİÇİMİ** "MP4 (video)" gibi açıkça yazar; materyal kartında
  **"Video dosyası: yalnızca SES çözülür; görüntü incelenmez."** uyarısı ve delil
  günlüğüne "Video (yalnız ses)" kaydı düşer.
- Delil paketindeki video dosyaları da materyal olur (yalnız ses).

### Dürüst sınır
- **Tarayıcının çözebildiği ses kodekleri** desteklenir (AAC/Opus/MP3…). Kodek
  çözülemezse çözümleme **açık hata** verir; "çözüldü" denmez.
- Video konteynerinde ses yoksa deşifre edilemez.
- **Rapor:** envanter biçimi "(video)" der; raporda ayrıca "yalnız ses" notu
  eklemek bir sonraki adımdır (şu an UI + günlük + biçim sütunu).

### Ne değişti
- `isVideoFileName/isMediaFileName/isMediaFileObject/isVideoMaterial`; kabul
  filtresi ve delil sınıflandırması medyayı (ses+video) kapsar; biçim etiketleri
  video konteynerlerini gösterir. Test `birim [100]`.

## v2.247 — "Sayfaya sığdır" düğmesi gerçekten çalışıyor

Kullanıcı: "Sayfaya sığdır çalışmıyor gibi." **Gerçek Chromium ölçümü** haklı
gösterdi: tek-sayfa A4 modunda düğme **ölüydü** — `applyReportPageView` her
çizimde `if(!reportFitPref()) setReportFit(true)` diyerek sığdırmayı **zorla
açıyordu**; aç/kapa hiçbir şeyi değiştirmiyordu. Ayrıca sürekli modda etiket
gizliydi.

### KULLANICI NE GÖRECEK
- **Tek-sayfa A4 görünümünde** (Sürekli'yi kapatınca) **"Sayfaya sığdır"** artık
  gerçekten aç/kapa: **açık** → sayfa ekrana sığar (kâğıt ~507 px); **kapalı** →
  kâğıt doğal genişlikte (~900 px) gösterilir. (Ölçüm: kapatınca 507→900, açınca
  900→507.)
- **Varsayılan: sığdır AÇIK** (A4 moduna girince sayfa ekrana sığar).
- **Sürekli modda gizli** (sürekli yüksekliği olan belgede "sayfaya sığdırma"
  anlamsızdır); "Sürekli" anahtarının ipucu bunu söyler: kapatınca A4 + sığdır.

### Ne değişti
- `reportFitPref()` varsayılan **açık** (`'0'` → kapalı).
- `applyReportPageView` içindeki **zorla `setReportFit(true)` kaldırıldı**;
  kullanıcı seçimi geçerli. Tek-sayfa `pageH`/pencere yüksekliği kâğıt
  genişliğinden yeniden hesaplanır (sığdır açık/kapalı fark eder).

### Koruyan test
- `birim [99]`: tercih varsayılanı + "zorla setReportFit(true)" kalıbının
  bulunmadığı davranış sözleşmesi.

## v2.246 — Rapor ekranı: sürekli okuma varsayılan

Kullanıcı: "Rapor sayfası web'de çok garip; kaydırma, sayfa kesmeleri, ölçek."
**Gerçek Chromium (1440×900) ölçümü** kök nedeni gösterdi: varsayılan **tek-sayfa
+ zorla "Sayfaya sığdır"** idi; kâğıt **320 px**'e (min) sıkışıyor, ince-uzun bir
şerit oluyor ve satırlar sayfa sınırında kesiliyordu.

### KULLANICI NE GÖRECEK
- Rapor **artık normal bir belge gibi kayar** (varsayılan **Sürekli**). Kâğıt
  **900 px** genişlikte okunaklı; `#view-report` içinde tek kaydırma.
- **Sayfaya sığdırma yalnız tek-sayfa (A4) modunda** anlamlıdır; sürekli modda
  gizlenir (boşuna küçültmez).
- **A4 sayfa görünümü isteğe bağlı:** "Sürekli" anahtarını kapatınca tek-sayfa A4
  penceresi + ‹ › sayfa gezinme açılır (ölçüm: Sayfa 1/10, genişlik 507).
- Yatay/dikey biçim de sürekli modda doğru; yatay taşma yok.

### Ne değişti
- `reportContinuousPref()` VARSAYILAN `true` (yalnız `'0'` tek-sayfa yapar).
- `applyReportFit` sürekli modda `maxWidth` temizler (fit uygulamaz);
  `applyReportPageView` sürekli modda sığdırma etiketini gizler ve eski genişliği
  temizler; `setReportContinuous` mod değişiminde fit+guide'ı tazeler.

### Koruyan test
- `birim [98]`: tercih varsayılanı + sürekli modda fit uygulanmadığı sözleşmesi.

## v2.245 — UDF yatay/dikey yön (doğrulandı)

Kullanıcı, UYAP Doküman Editörü'nde boş sayfayı **yatay** yapıp kaydetti
(`yatay.udf`). `content.xml`'de `paperOrientation` değeri **"0"** çıktı; dikey
**"1"** (mediaSizeName A4 = "1" sabit). Böylece UDF yönü **tahmin olmadan**
uygulanabilir hâle geldi.

### KULLANICI NE GÖRECEK
- **Kontrol → Rapor biçimi → Yön = Yatay** seçilince üretilen **UDF de yatay**
  olur (önceden yalnız ekran/PDF/Word etkileniyordu; UDF dikey kalıyordu).
- Dikey seçim `paperOrientation="1"`, yatay `"0"` yazar. UDF yazı tipi yine
  resmî **Times New Roman**'dır; punto ve kenar boşluğu da biçimden gelir.

### Ne değişti
- `makeUdf` `paperOrientation` değerini `case.report.format.orientation`'dan
  yazar. Panel notu ve şema yorumu güncellendi.

### Koruyan test
- `rapor` Senaryo 26: UDF yatay `paperOrientation="0"`, dikey `"1"`.

## v2.244 — İş yükü özeti: anlamlı hâle getirildi

Kullanıcı geri bildirimi: "Sayılar var ama tam olarak bir şey ifade etmiyor;
2 saatlik kayıt ama bir haftadır uğraşıyorum." — Buna göre panel **hikâye** anlatır
hâle geldi ve yanıltıcı öğe ayrıldı.

### KULLANICI NE GÖRECEK
- Panelin başında **tek satır özet**: *"2 sa 40 dk ses · 9 kayıt · 645 bölüm ·
  %99 kontrol edildi · kalan 5 bölüm."*
- Yeni KPI'lar: **Ortalama bölüm** (hedef 15–30 sn) ve **Kapsam %**.
- **"Kapsam boşluğu" artık "Zorluk"ta değil, ayrı "Kapsam" bölümünde.** Açıklama:
  *bölümlenmemiş aralık = bölümler arası süre (çoğu zaman sessizlik); "konuşma
  yok" demek değildir; otomatik düzeltilmez.* (Önceki "300 boşluk = 300 sorun"
  izlenimi yanıltıcıydı.)
- "Kontrol bekleyen" → **"Kalan iş (bölüm)"** olarak öne çıktı; kalan yoksa özet
  satırı "kalan yok" der.

### Ne değişti
- `caseWorkload` → `avgSegmentSec`, `coveragePct`, `coverageUnknown`;
  `workloadSummaryHtml` başlık satırı + kapsam ayrımı. Test `birim [97]` genişledi.

### Dürüst sınır
- Bu panel **ingredients** gösterir, **harcanan takvim/zaman** göstergesi DEĞİL.
  Gerçek "kaç saat uğraştım" ancak **etkin çalışma süresi** izlenerek ölçülür;
  o ayrı bir özellik olarak planlanabilir (geçmiş geri kazanılamaz).

## v2.243 — İş yükü özeti (ölçülen göstergeler)

Kullanıcı: "Raporlarımızda/dashboard'da iş yükünü gösteriyor muyuz? Süreler hangi
birimde, nasıl ölçülür?" — Özet sayfasına **ölçülen** iş yükü göstergeleri eklendi.

### KULLANICI NE GÖRECEK
- **Özet (dashboard)** sayfasına **"İş yükü göstergeleri (ölçülen)"** kartı.
- **KPI'lar:** Toplam ses süresi (**sa/dk/sn** biçiminde; ör. "1 sa 12 dk"),
  kayıt sayısı, bölüm sayısı, **kontrol bekleyen toplam**, konuşmacı etiketi,
  yanıtlanan/toplam soru.
- **Kontrol dağılımı** (karşılıklı-dışlayan; toplamı bölüm sayısı): Onaylandı ·
  Anlaşılmadı · Yeniden dinle · Belirsiz · Çözümlendi (makine) · Hiç dokunulmadı.
- **Emek göstergeleri:** onay oranı %, **elle düzeltilen bölüm** sayısı/%, hızlı
  onaya uygun sayısı. **Zorluk işaretleri:** üst üste, anlaşılmayan, sessizlik,
  telefon, müzik, gürültü, zaman sorunu, uzun bölüm, birleştirme adayı, kapsam
  boşluğu (yalnız >0).
- **Dürüst sınır yazılı:** "Bu sayılar ölçümdür; **süre veya ücret tahmini
  değildir**."

### Ölçüm birimi
- Süreler kayıtta **saniye** olarak tutulur (`material.duration`, yoksa bölüm
  zamanlarından toplanır). Gösterimde `formatWorkloadDuration` → "sa/dk/sn".
  "TOPLAM SÜRE" kartı da artık bu net biçimi kullanır.

### Ne değişti
- `caseWorkload(c)` + `formatWorkloadDuration(sec)` saf fonksiyonları;
  `workloadSummaryHtml`/`renderWorkload`. Sayaçlar `segCounts` ile **tek kaynak**
  (makine/belirsiz/yeniden ve gözlemler tutarlı). Yeni test `birim [97]`.

## v2.242 — Karar rehberi: üst üste · belirsiz · tek kelime

Kullanıcı: "Üst üste konuşmaya Onaylandı demek doğru mu? Belirsiz kelimeyi nasıl
işaretleyeyim? Anlaşılmaz bölümde tek kelime varsa ne yapayım?" — Bunlar
uygulamanın içinde **yazılı rehber** hâline getirildi (davranış değişmedi).

### KULLANICI NE GÖRECEK
- **Yardım (?)** ekranında yeni **"Karar rehberi: üst üste · belirsiz · tek
  kelime"** bölümü: kontrol durumu ile gözlem işaretini ayırır; "Onaylandı"nın
  ne demek olduğunu, üst üste ile çelişmediğini, belirsizin ayrı bir durum
  olduğunu, tek kelimede Onaylandı/Anlaşılmadı/Belirsiz seçimini açıklar.
- Aynı rehber belgede: [`docs/STANDARTLAR.md`](docs/STANDARTLAR.md) **§12**.
- `STANDARTLAR.md` §6 gözlem listesi güncel 6 işarete çekildi (telefon +
  sessizlik eklendi) ve hızlı etiketin **imleç konumuna** eklendiği yazıldı.

### Ne değişti
- Yalnız belge + yardım metni. Kod davranışı ve veri değişmedi.

### Koruyan
- `surum-testi` (yardım/doküman sürüm tutarlılığı) ve mevcut tüm testler.

## v2.241 — Aktif bölümde "İş durumu" satırı

Kullanıcı: "Çalışırken bu bölüm ne istiyor? Bekle mi, onayla mı, birleştir mi,
böl mı?" — filtreler toplu çalışmayı sağlıyor; bu sürüm **seçili bölümün** ne
istediğini tek satırda söyler.

### KULLANICI NE GÖRECEK
- Bölüm detayında, teknik "Durum" satırının üstünde **"İş"** satırı: önerilen tek
  eylemi yazar (ör. **"Dinleyip onayla (makine çözümledi)"**, **"İki okumadan
  birini seç"**, **"Yeniden dinle"**, **"Tamam — onaylandı"**).
- Yanında bağlama göre **işaretler**: **Birleştirilebilir**, **Zaman sorunu**,
  **Üst üste gözlem**, **Anlaşılmayan gözlem**, **Sessizlik/Telefon gözlem**,
  belirsizde **Okuma seçilmedi**. Her birinin ipucu (title) ne yapılacağını yazar.
- Durum/öneri değişince (onayla, gözlem ekle, zaman düzelt) satır **yerinde**
  güncellenir.

### Ne değişti
- `segmentWorkSummary(s, opts)` saf fonksiyonu (durum → eylem + işaretler);
  `workStatusHtml` onu çizer; `syncSegDetailInPlace` `.sd-work`'ü yerinde tazeler.

### Koruyan test
- `birim [96]`: her durum için eylem + işaret bayrakları (birleştir/zaman/gözlem).

## v2.240 — Bölüm iş durumu: eksik filtreler + "Bekleyen" netliği

Kullanıcı: "Çalışırken kararsız kalıyorum: beklesin mi, çözümlendi mi, yeniden mi
dinleyecek, birleştirilsin mi, bölünsün mü, ses üst üste mi biniyor, anlaşılmaz
mı? Filtreden dolayı bölümler yanlış listelenmesin, doğru tanımlayalım."

### KULLANICI NE GÖRECEK
- **"Bekleyen" → "Kontrol bekleyen"**: bu çipin ipucu, makine **"Çözümlendi"** ve
  **"Belirsiz"** bölümlerin de onay gerektirdiği için burada olduğunu söyler
  (kafa karışıklığının kaynağı buydu).
- **Yeni filtreler** (yalnız sayı > 0 iken görünür, sığmazsa sarar):
  **Çözümlendi (makine)**, **Belirsiz okuma**, **Uzun · bölünmeli** (45 sn üstü),
  **Üst üste (gözlem)**, **Anlaşılmayan (gözlem)**. Böylece "onay bekleyenleri",
  "belirsizleri", "bölünmesi gerekenleri", "üst üste konuşmaları" tek tıkla
  listeleyebilirsiniz.
- Her çipin **ipucu (title)** ne anlama geldiğini ve ne yapılacağını yazar.

### Ne değişti
- `SEG_FILTERS` genişledi; `CONDITIONAL_FILTERS` = machine/ambiguous/merge/long/
  overlap/inaudibleObs/time. Sayaç (`segCounts`) ve filtre (`segMatchesFilter`)
  **TEK KAYNAK** (`segmentHasObs`, `segmentIsLong`); ayrışırsa test kırar.

### Koruyan test
- `birim [95]`: her filtre anahtarı için **sayaç = eşleşen bölüm sayısı**.

## v2.239 — Hızlı etiket imleç konumuna eklenir

Kullanıcı: "Bu etiketler her zaman sona konuyor; cümle içine, farenin olduğu
noktaya koymak istesek yapamıyoruz."

### KULLANICI NE GÖRECEK
- **+ Hızlı ekle** etiketleri (ör. `[anlaşılmaz]`, `[üst üste konuşma]`) artık
  metnin **sonuna değil, imlecin olduğu yere** eklenir. Bir kelimeyi seçtiyseniz
  etiket seçimin **yerine** yazılır.
- Ekledikten sonra imleç etiketin **hemen ardına** konur; yazmaya kaldığınız
  yerden devam edersiniz.
- İmleç bilgisi yoksa (ör. yeni bölüm) eski davranış korunur: sona eklenir.

### Ne değişti
- `insertTagAt(full, token, start, end)` saf fonksiyonu (v2.239): seçim/konum
  varsa oraya, yoksa sona ekler; komşu karakter boşluk değilse tek boşluk koyar.
- Tıklama işleyicisi imleci yeniden çizimden ÖNCE okur, sonra odağı ve imleci
  geri verir (`requestAnimationFrame` + `setSelectionRange`).

### Koruyan test
- `birim [94]`: sona/başa/ortaya/seçim/boş/metin yok/aralık dışı/bitiş<başlangıç.

## v2.238 — Rapor biçimi: sayfa · font · punto · marj · yön

Kullanıcı: "Raporun hem ekranda hem UDF/DOCX/PDF çıktısında daha iyi görünmesi
için font, punto, sayfa marjı ve yatay/dikey ayarlanabilsin."

### KULLANICI NE GÖRECEK
- **Kontrol → Rapor biçimi** panelinden yazı tipi (Arial/Times New Roman/Segoe
  UI), gövde puntosu (11–14), kenar boşlukları (10–50 mm) ve yön (dikey/yatay)
  seçilir.
- Seçim **ekran önizlemesinde**, **yazdırma/PDF'te** ve **Word (DOCX)** çıktısında
  uygulanır. PDF/yazdırma artık **A4 + ölçülü kenar boşluğu** ile çıkar (önceden
  sayfa ayarı yoktu; tarayıcı varsayılanı kullanılıyordu).
- **UDF (UYAP) resmî çıktı**: yazı tipi **Times New Roman**, yön **dikey A4**
  olarak korunur (resmî standart); yalnız gövde puntosu ve kenar boşlukları
  biçimden gelir.
- **Varsayılan** 11 pt · 20 mm simetrik kenar boşluğu · dikey. UDF kenar
  boşluğu önceki 60 mm'den 20 mm'ye çekildi (çok genişti); gerekirse panelden
  ayarlanır.

### Ne değişti
- `case.report.format` TEK KAYNAK (fontFamily, fontSizePt, marginsMm, orientation).
- HTML: `--paper-font`, `--paper-scale`, `--paper-margin`; A4 kılavuz/sığdırma
  yönü dikkate alır. Yazdırma: dinamik `@page { size: A4 <yön>; margin: …mm }`.
- DOCX: `w:rFonts`, `w:sz` (ölçek), `w:pgSz` (yatay), `w:pgMar` (mm→twip).
- UDF: gövde `size` ölçeklenir, `pageFormat` marjları mm'den; font/yön resmî.

### Koruyan test
- `birim [93]` (şema/aralık/@page), `rapor` Senaryo 26 (üç çıktıya yansır).

## v2.237 — Bölüm listesi etkileşimi: hız ve satır menüsü

Kullanıcı (canlı kullanım): "Hız göstergesine basınca liste başa atıyor,
dinlediğim yeri kaybediyorum." ve "Listenin sonundaki satıra sağ tıklayınca
menünün yarısı görünmüyor; hızlı çözümlemeye tıklanamıyor."

### KULLANICI NE GÖRECEK
- Dinlerken **oynatma hızını** değiştirmek artık bölüm listesini başa
  sarmıyor; seçili bölüm ve kaydırma yerinde kalıyor. Dinlediğiniz yeri
  kaybetmezsiniz.
- Listenin en altındaki bir bölümün **⋮ menüsü** artık ekranda tam görünür;
  ekranın altına taşarsa menü **yukarı açılır**. "Bu aralığı çözümle" gibi
  öğelere her satırda erişilir.

### Ne değişti
- Hız düğmesi dalı artık tam yeniden çizim (`renderSegments`) YAPMAZ; yalnız
  hız göstergelerinin `on` sınıfını günceller (`cycleSpeed` ile aynı).
- Satır menüsü konumu saf `clampSegMenuPosition` fonksiyonuyla viewport'a göre
  hesaplanır (önce ölç, sonra konumla).

### Koruyan test
- `birim [92]`: menü konumu (orta/alt/aşırı/sağ/sol) + hız dalının
  `renderSegments()` çağırmadığı kaynak sözleşmesi.

## v2.236 — Kanıt tablosunda da sütun aç/kapa

Kullanıcı: "Analiz tespit değerlendirme tablosuna da yapamıyor muyuz?" Evet.

### KULLANICI NE GÖRECEK

- **Analiz / kanıt tablosu** (deşifre) için de sütun aç/kapa:
  **Konuşmacı**, **Kontrol durumu**, **Gözlem** isteğe bağlı.
- **Zaman aralığı** ve **Çözümlenen konuşma** **ZORUNLU**dur; panelde kilitli
  görünür ve kapatılamaz. Gerekçe: bunlar kanıtın çekirdeğidir; kapatılırsa
  tablo adli kayıt olarak anlamını yitirir.
- **EK-2 envanter** tablosu artık ana envanterle **aynı** sütun seçimini izler
  (ör. SHA-256 kapatıldıysa ekte de yoktur).

### Teknik

- `REPORT_COLUMN_TABLES.segments = ['time','speaker','text','review','obs']`;
  `REPORT_COLUMN_LOCKED = { segments: ['time','text'] }` (schema.js).
- `reportColumnLocked()` + `reportTableColumns` kilitli sütunları **her zaman**
  basar; panelde kilitli onay kutuları `disabled` + ipucu.
- Kanıt tablosu üç çıktıda (HTML/DOCX/UDF) aynı filtreyi kullanır;
  `EK-2` (`reportAnnexBlocks`) ana envanter filtresinden beslenir.
- Test: `birim [91]`, `rapor` Senaryo 25, `tasarim [2cg]`.

## v2.235 — Rapor alanları: tablo sütunları aç/kapa

Kullanıcı: "bazı tablolardaki alanları bilirkişi istemeyebilir; açıp kapatabilsek
daha temiz olur." Uygulandı.

### KULLANICI NE GÖRECEK

- **Kontrol → Rapor alanları** panelinde **5 tablo** için sütun aç/kapa:
  **Envanter** (ör. SHA-256, örnekleme hızı), **Kayıt kökeni**, **Delil edinme**,
  **WER**, **Ses seviyesi**.
- Kapatılan sütun **üç çıktıda da** (HTML/DOCX/UDF) görünmez; tablo kalan
  sütunlarla yeniden düzenlenir.
- **Veri silinmez**; yalnız gösterim değişir. Tüm sütunlar kapatılırsa boş tablo
  yerine "Bu tablo için alan seçilmedi." yazılır.
- Tercih dosyayla saklanır ve **rapor revizyonuna** dâhil edilir (geri yükleme
  sütun seçimini de geri alır).

### Teknik

- `assets/schema.js` → **TEK KAYNAK**: `REPORT_COLUMN_TABLES`,
  `REPORT_COLUMN_LABELS`, `REPORT_COLUMN_TABLE_LABELS`, `emptyReportColumns`,
  `normalizeReportColumns`; `case.report.columns` alanı eklendi (varsayılan tümü
  açık, eksik alan açık varsayılır, bilinmeyen tablo korunur).
- `app.js` → `reportColumnOn`, `reportTableColumns` (başlık/satır/genişlik
  filtreleme), `werTableRows`, `setReportColumn`, `renderReportColumns`;
  HTML/DOCX/UDF üreticileri aynı filtreyi kullanır.
- Rapor revizyonu: `reportSnapshot`/`applyReportSnapshot` + `REPORT_SNAPSHOT_LABELS`
  artık `columns` alanını taşır.
- Test: `birim [90]`, `rapor` Senaryo 24, `tasarim [2cf]`, `surum` kimlikleri.

## v2.234 — Okuma metni bağımsız bölüm

Kullanıcı: "okuma metni üst bölüm (5) açılmadan açılamıyor; tek başına
gösterilebilmeli." Düzeltildi.

### KULLANICI NE GÖRECEK

- **Okuma metni** artık **kendi satırı** olan bağımsız bir rapor bölümü.
- **5. bölüm kapalı olsa bile** okuma metni tek başına açılıp rapora girebilir
  (ve tersi: yalnız 5. bölüm açık, okuma metni kapalı olabilir).
- Kanıt tablosu ve cümle zamanları **değişmedi**; okuma metni yine türetilmiş
  sunumdur (bölümleri birleştirmez/bölmez).
- Üç çıktı (HTML/DOCX/UDF) aynı metni üretir.

### Teknik

- `reading` **`REPORT_BODY_ORDER`** içine alındı (`s5`'ten hemen sonra). Eski
  kayıtlarda sırada yoktur; `normalizeReportLayout` onu **sonda değil, `s5`
  hemen ardına** yerleştirir. Kullanıcı sonradan taşırsa konumu korunur.
- Okuma metni üç çıktıda `s5` bloğundan **çıkarıldı**, ayrı `reading` bloğu
  oldu (çok kayıtta kayıt adı alt başlığı ile).
- `reportBlockRenders('reading')`: okuma grubu yoksa blok ve TOC satırı
  çizilmez.
- İskelette `reading` artık `s5`'in alt çocuğu değil, normal gövde satırı
  (↑↓ ile sıralanır).
- Test: `rapor` Senaryo 12 (bağımsız okuma), `birim [89]`, `tasarim [2ce]`.

## v2.233 — Rapor: sayfa görüntüleyici (Word/PDF gibi)

Sürekli uzun kâğıt + sayfa kaydırma yerine **tek A4 sayfa penceresi** ve
**sayfa sayfa gezinme**.

### KULLANICI NE GÖRECEK

- Rapor **tek A4 sayfa** hâlinde görünür; **‹ ›** ve **PageUp/PageDown** ile
  sayfalar arasında dolaşılır; **"Sayfa N / M"** görünür.
- **"Sürekli"** anahtarı eski uzun kâğıt akışını korur (okumak/yazmak için).
- Üstteki **A4 / Sığdır / sayfa gezinme** çubuğu **kaymaz** (sabit).
- **"04 / RAPORLAMA"** tanıtımı rapor görünümünde **gizlendi** (kaymıyor,
  yer kazandırıyor).
- **Tablolar sayfaya sığar**: sabit düzen + hücre sarma; sağdan taşma yok.
- Tam ekranda da aynı kontroller ve sayfa gezinme çalışır.

### Teknik

- Kâğıt DOM'u **bölünmez** (risk); `.report-page-window` sabit yükseklikte
  kırpar, kâğıt `translateY(-sayfa×pageH)` ile kaydırılır.
- `reportPageHeight` (A4: genişlik×297/210), `reportPageCountFor`,
  `reportPageCountValue`, `applyReportPageView`, `setReportPage`,
  `setReportContinuous`; sayfa indeksi **oturumluk**.
- Sayfa modu **sığdırmayı gerektirir** (tek sayfa tam görünsün diye); okumak
  için "Sürekli" + istenirse sığdırma kapatılır.
- Tercih `akis.reportContinuous`; dosyaya yazılmaz.
- `.report-stage-bar` `top: var(--report-toolbar-h)` ile araç çubuğunun altında
  yapışır; `syncReportToolbarHeight` yüksekliği ölçer.
- Tablolar: `table-layout: fixed; width:100%` + `overflow-wrap:anywhere`.

### Koruyan testler

- `birim [88]`: `reportPageCountFor` (sayfa sayısı, geçersiz pageH → 1).
- `tasarim [2cd]`: sayfa penceresi/nav/sürekli anahtarı, sabit stage-bar,
  tanıtım gizli, tablo sabit düzen + sarma, token stil.
- `surum`: `reportPageWindow` / `reportPageNav` / `reportContinuousToggle`.

## v2.232 — Tam A4 görünümü, tam ekran kontrolleri, sabit iskelet

Kullanıcı geri bildirimi: "tam A4 göremiyorum, sol menü yukarıda kalıyor, tam
ekranda hiç kontrol yok." Üçü de ölçülüp düzeltildi.

### KULLANICI NE GÖRECEK

- **Sayfaya sığdır** anahtarı (A4 kâğıt çubuğunda): tek bir **A4 sayfası
  ekrana sığar**; okumak için kapatın. A4 oranı (297/210) korunur; kâğıt
  ortalanır. Sayfa sayısı (`A4 · N sayfa`) görünür.
- **Tam ekranda kontroller var:** üstte **← Çalışmaya dön · Yazdır · UDF**;
  ayrıca **A4 / Sayfaya sığdır** anahtarları görünür ve kaydırırken kaybolmaz.
- **Sol rapor iskeleti kaydırırken görünür kalır** (kendi içinde kayar); artık
  yukarı kayıp gitmiyor.

### Teknik (ölçüm)

- **Kök neden 1:** `#view-report` flex; `.report-workspace` `flex:0 1 auto`
  olduğu için **573 px'e sıkışıyordu** (içerik 3180). Sticky iskeletin kabı
  573 px olduğundan yapışma çalışmıyordu (500 px kaydırınca üst **202 → −298**).
  Düzeltme: `.report-workspace { flex: 0 0 auto; height: auto }` → kaydırınca
  iskelet üstü **126** (görünür) kalıyor.
- **Kök neden 2:** tam ekranda kaydırma `#view-report`'ta; `window.scrollTo`
  etkisizdi ve çubuk ekran dışına çıkıyordu. Düzeltme: `setReportFull`
  `#view-report.scrollTop = 0`; `#reportFullbar` **sticky top:0**; tam ekranda
  `.report-stage-bar` **gizlenmiyor** (kontroller kalır).
- **Sığdır:** `reportFitWidth(availH)` = `clamp(320, 900, (availH-8)×210/297)`.
  Ölçüm 1440×900: normal **486 px** (sayfa 687 ≤ 695); tam ekran **578 px**
  (817 ≤ 826). Kâğıt genişliği görünüm yüksekliğinden türetilir, uydurulmaz.
- Tercih `localStorage('akis.reportFit')`; dosyaya yazılmaz.

### Koruyan testler

- `birim [87]`: `reportFitWidth` oran/kırpma.
- `tasarim [2cc]`: çalışma alanı flex düzeltmesi, fullbar sticky, tam ekranda
  stage-bar gizlenmez, sığdır anahtarı, `setReportFull` kaydırma sıfırlama,
  token stil.
- `surum`: `reportFitToggle` kimliği.

## v2.231 — Belge odaklı bölüm düzenleme

Rapor belgesi artık düzenleme için giriş noktası: bölüme tıkla, sağda düzenle.

### KULLANICI NE GÖRECEK

- **Belgede bir bölüme tıklayın:** sağda **odaklı düzenleyici** açılır; belge
  görünür kalır. Seçili bölüm iskelette ve belgede **vurgulanır**.
- **Yöntem (4)**, **Sınırlılıklar (5)** ve **Sonuç (6)** serbest metinleri
  burada yazılır; alandan çıkınca önizleme tazelenir. Üç çıktı (HTML/DOCX/UDF)
  aynı metni üretir.
- **Diğer bölümler veriden üretilir:** düzenleyici "İlgili yeri aç" der
  (Dosya / İnceleme / Ses). Teknik, künye ve kalite alanları Kontrol panelinde.
- **A4 kâğıdı doğrudan düzenlenebilir DEĞİLDİR.** Böylece üç çıktının aynı
  metni üretmesi korunur (contentEditable riski alınmadı).

### Teknik

- Belge blokları `data-report-key` ile sarılır; `.paper-block { display:contents }`
  sayesinde yerleşim **değişmez**, tıklama olayı kabarcıklanır.
- `reportEditKey` (oturumluk), `reportSectionEditableFields`,
  `reportSectionDerivedTarget`, `renderReportSectionEditor`,
  `setReportEditSection`.
- `#reportSectionEditor` sağ aside; Düzenle modunda seçim varsa 3. sütun;
  ≤1349 px'te alta iner, ≤900 px'te tek sütun. Yazdırma/tam ekranda gizli.
- Test: `birim [86]`, `tasarim [2cb]`, `surum` kimlikleri.

## v2.230 — Tek kayıt durumu + dahil/kontrol ayrımı

Rapor ekranındaki dağınık durum/istatistik göstergeleri sadeleştirildi.

### KULLANICI NE GÖRECEK

- **Tek ve sade durum çipi:** "Engelleyen eksik: N" · "Kontrol bekliyor: N" ·
  "Hazır". Renk tek başına anlam taşımaz; metin de yazar (renk körlüğü).
- **Dahil / kontrol ayrıldı:** İskelet başlığı **"N dahil · M hariç"**; rapora
  girmeyen bölümler **soluk** görünür. Kontrol panelinde kısa açıklama:
  *Dahil = rapora girer (iskelet) · Kontrol = bölüm dinlenip onaylandı (ses
  görünümü).*
- **Tekrar azaldı:** Rapor görünümünde alt çubuktaki yinelenen bölüm/denetim
  sayaçları gizlenir; durum tek yerde (araç çubuğu çipi).

### Teknik

- `reportRecordStatus(c)` saf fonksiyon: `readinessSummary` + `pendingBreakdown`
  ile `blocked` / `review` / `ready`. Uydurma yüzde yok; "Hazır" bile denetim
  listesidir (ipucu bunu söyler).
- `switchView` artık `document.body.dataset.view` yazar; CSS rapor görünümünde
  `#sbSegmentsWrap` / `#sbCheckWrap` gizler.
- İskelet satırına `is-excluded` sınıfı; başlık sayacı "dahil/hariç".
- Test: `birim [85]`, `tasarim [2ca]`, `surum` kimlikleri.

## v2.229 — Rapor iskeleti: arama, kategori filtresi, yalnız açık

Uzun rapor iskeleti yönetilebilir hâle geldi.

### KULLANICI NE GÖRECEK

- **Bölüm arama** kutusu: yazdıkça liste süzülür (odak kaybolmaz).
- **Kategori çipleri:** Tümü · Kapak · Ana · Teknik · Beyan · Kapanış.
- **"Yalnız açık"** anahtarı: yalnız rapora giren bölümleri gösterir.
- Bunlar yalnız **görünürlüğü** süzer; **rapor sırası ve içeriği değişmez**.
  Sıra yine ↑↓ ile belirlenir. Filtreler oturumluktur; dosyaya yazılmaz.

### Teknik

- `REPORT_SECTION_CATEGORY` (kategori haritası), `reportOutlineState`
  (oturumluk filtre), `reportOutlineMatch`, `syncReportOutlineControls`.
- `renderReportSections` filtreyi uygular; arama kutusu statik HTML'de olduğu
  için yeniden çizimde odak korunur. Kategoriye göre **yeniden sıralama
  yapılmaz** (çıktı sırasını sessizce bozardı).
- Test: `birim [84]` (kategori), `tasarim [2bz]`, `surum` kimlikleri.

## v2.228 — Rapor çalışma alanı: Düzenle / Kontrol modları ve önem gruplu kontrol

Rapor ekranı artık **iki çalışma modu** ve **önem sırasına göre gruplanmış**
kontrol maddeleri sunar.

### KULLANICI NE GÖRECEK

- **İki mod:** **Düzenle** (belge + bölüm iskeleti; kontrol paneli **kapalı**) ve
  **Kontrol** (kontrol paneli açık). Rapor açılınca belge odakta kalır; sağdaki
  kontrol paneli kendiliğinden açılmaz.
- **Kontrol maddeleri önem sırasına göre gruplanır:** **Engelleyen eksikler** ·
  **Uzman kontrolü gerekli** · **İyileştirme önerileri**. Böylece "dosya numarası
  boş" (engelleyici) ile "konuşmacı atanmamış" (uzman kontrolü) aynı ağırlıkta
  görünmez.
- **Geniş sarı uyarı belgenin üstünden kalktı.** Uyarılar Kontrol panelinde.
  Düzenle modunda küçük **"⚠ N engelleyen eksik"** çipi tek tıkla Kontrol'e
  götürür.
- **Mod tercihi hatırlanır** (dosyaya yazılmaz; yalnız bu tarayıcıda).

### Teknik

- `#reportModes` (Düzenle/Kontrol) + `#reportCheckChip`; `#reportWorkspace`
  `data-mode` ile düzenlenir. `setReportMode`/`applyReportMode`;
  tercih `localStorage('akis.reportMode')`.
- `READINESS_SEVERITY` **tek kaynak**; `reportReadiness` her maddeye `severity`
  yazar; `readinessSummary` sayar; `readinessRowsHtml` üç gruba böler.
  Bilinmeyen madde `expert` sayılır (ileri uyum).
- `#reportWarning` sahne üstünden **sağ panele** taşındı; belge alanı temiz.
- Düzenle modunda sağ panel gizlenir; ≤900 px'te tek sütun korunur; yazdırma/
  tam ekranda yalnız kâğıt (değişmedi).

### Koruyan testler

- `birim [60]`: her maddenin `severity` taşıması, `readinessSummary` sayımı,
  `readinessRowsHtml` grup başlıkları.
- `tasarim [2by]`: mod düğmeleri HTML'de, `data-mode="edit"` paneli gizler,
  gruplu kontrol stilleri token kullanır, ham hex yok.
- `surum`: `reportModes` / `reportCheckChip` kimlikleri; sürüm v2.228.

## v2.227 — Rapor ekranı ve şablon yeniden tasarımı

Rapor ekranı **üç bölgeye** ayrıldı ve raporun tüm parçaları (ekler dâhil) tek
iskeletten organize edilebilir hâle geldi.

### KULLANICI NE GÖRECEK

- **Rapor ilk ekranda görünür.** Önizlemenin üstündeki panel yığını kalktı:
  solda **rapor iskeleti**, ortada **A4 önizleme**, sağda **rapor kontrolü ve
  revizyon**. (Ölçüm: önizleme üst kenarı 901 → ekran içinde.)
- **Tek iskelet:** bütün bölümler ve ekler tek listede; **↑↓ ile sıralanır**,
  tek tek açılıp kapatılır. Kapatılan bölüm rapora ve üç çıktıya da girmez.
- **Numara boşluğu yok:** ana bölüm numaraları açık ve sıralı bölümlere göre
  yeniden verilir (ör. 3. bölüm kapatılınca 4 → 3 olur).
- **İçindekiler gövdeyi izler:** TOC artık yalnız 7 ana başlığı değil, çizilen
  tüm bölümleri gövde sırasıyla listeler.
- **Ekler ayrı kayıt ve düzenlenebilir:** her ek tek tek açılır/kapanır ve
  sıralanır. EK numarası **EK-1…EK-N** olarak bitişiktir (eski **EK-4 boşluğu**
  kapandı; kapalı ek numarada boşluk bırakmaz). Sağdaki **Ekler · başlık /
  içerik / not** panelinden ek başlığı ve notu düzenlenir; **＋ Yeni ek** ile
  özel ek eklenir/kaldırılır. Yerleşik ek gövdesi veriden üretilir; boş alan
  “—” olarak girer, uydurulmaz.
- **Rapor revizyonu:** “Revizyon kaydet” o anki bölüm düzenini ve rapor
  metinlerini saklar; “Geri yükle” farkları söyleyerek geri alır. İki revizyon
  seçilip **Farkları karşılaştır** ile alan grupları bazında fark görülür.
  **Ses ve deşifre kanıtı revizyona girmez.**
- **A4 önizleme** sayfa sayısını gösterir (`A4 · N sayfa`); kılavuz niteliği
  korunur (kesin kırılma yazdırma/PDF’te oluşur).
- Yazdırmada ve tam ekranda yalnız rapor kâğıdı çıkar; iskelet/kontrol/revizyon
  panelleri gizlenir.

### Teknik

- `assets/schema.js`: `REPORT_SECTION_DEFS` her bölüme **numarasız başlık**
  (`title`) kazandı; `REPORT_FRONT_KEYS`, `REPORT_MAIN_KEYS`, `REPORT_BODY_ORDER`,
  `REPORT_ANNEX_DEFS` ve `case.report.layout { order, annexOrder, annexes,
  annexMeta }` eklendi. `normalizeReportLayout` bozuk/eksik düzeni güvenli hâle
  getirir; yerleşik ek ve **özel ek (x1, x2…)** korunur, geçersiz anahtar düşer,
  eksik bölüm sona eklenir (veri kaybı yok).
- **Yeni saf model `assets/report-model.js`:** `moveInList`,
  `mainSectionNumbers`, `revisionDigest`, `compareRevisionGroups`, `stableJson`.
  DOM yok; uygulama ve test AYNI dosyayı kullanır (tek kaynak).
- `assets/app.js`: rapor HTML/DOCX/UDF üreticileri **blok sözlüğü + tek sıra
  döngüsü** ile çalışır; sıra/numara/TOC/başlık tek kaynaktan
  (`reportBodyOrder`, `reportNumberMap`, `reportHeadingText`,
  `reportTocEntries`). 5.1/5.2/5.3 alt başlıkları da ana numaradan türetilir.
  UDF metni/offsetleri bloklar sırayla üretildiği için yeniden hesaplanmaz.
- Ek blokları `reportAnnexList` ile **açık eklere göre** numaralanır; her blok
  başlık + gövde + isteğe bağlı **not** taşır. Özel ek gövdesi kullanıcı
  içeriğinden, yerleşik ek gövdesi veriden gelir.
- Rapor revizyonu `case.report.revisions[]` (en çok 10; yalnız düzen + rapor
  metinleri + `digest`). `normalizeCase` korur; kanıt dışıdır. İki revizyon
  `compareRevisionGroups` ile karşılaştırılır.
- `index.html`: `#reportWorkspace` üç sütun; `#reportSectionsBox` iskelet,
  `#reportReadiness`/teknik/künye/qc/**ek düzenleyici**/`#reportRevisions` sağ
  sütun; `#reportPageViewToggle`/`#reportEmbeddedToggle` sahne çubuğunda.
- `assets/reading-layer.css`: üç bölgeli ızgara, iskelet satırları, ek
  düzenleyici, revizyon ve karşılaştırma kartı, yazdırma/tam ekran gizlemeleri.
  Yeni `!important` eklenmedi; yüzey/metin renkleri token.
- **Test koşumu sağlamlaştırıldı:** `node:vm` koşumu `app.js`'in **tüm** ES
  import bloklarını (`schema.js` + `report-model.js`) sıyırır; sıyrılamayan
  import kalırsa koşum **açık hatayla durur** (v2.227'de bir taslakta ikinci
  import sessizce testleri çökertmişti).

### Koruyan testler

- `rapor-tutarlilik`: Senaryo 22 (sıra/numara/ek, üç çıktı) + **Senaryo 23**
  (özel ek başlık/içerik/not üç çıktıda aynı).
- `birim [82]` (sıra/numara/TOC/ek/revizyon/özel ek + normalize) ve **[83]**
  (saf model: moveInList, mainSectionNumbers, revisionDigest,
  compareRevisionGroups).
- `tasarim [2bn]`: bölüm kapısı, tek sıra döngüsü, TOC tek kaynağı, tech/qc
  bloklarının üç çıktıda bulunması yeni mimariye göre sınanır.
- `surum`: APP_VERSION + dört `?v=` + `version.json` + bootstrap + belgeler +
  **`report-model.js` importunun sürümlü olması**.

## v2.226 — Kalite kontrolü ve denetlenebilirlik

Yeni **isteğe bağlı** rapor bölümü `qc` (varsayılan KAPALI). Otomatik denetim
sayaçları + **ikinci göz** alanları.

### Otomatik (veriden)

- İncelenen kayıt · toplam bölüm · uzman onaylı · anlaşılmadı · kontrol bekleyen
  · 45 sn üstü · SHA-256 doğrulanmış kayıt
- **Zaman sorunu olan bölüm**, **bölümlenmemiş ses aralığı** (kayıt başına toplanır)
- **Delil günlüğü zinciri** (kırık yok / N kayıtta kırık)
- **Ekip (görev)** ve **birleştirme kaydı** sayısı

### Elle (ikinci kontrol)

- İkinci kontrolü yapan · kapsamı · tarihi — boşsa rapora "—".

Üç çıktı (HTML/DOCX/UDF) aynı satırları üretir. `case.report.qcBy/qcScope/qcDate`
şemada; `normalizeCase` korur; birleştirme boş alanı doldurur.

**Ölçüm:** `rapor [Senaryo 21]` üç çıktıda başlık + satırlar + değerler aynı;
`sema [3h]` (517); `tasarim [2bt]`. `bash tools/test.sh` yeşil.

## v2.225 — Künye ek alanları: ekler + tarafsızlık

RAPOR KÜNYESİ'nde şu ana kadar "—" duran iki gerçek alan **elle
doldurulabilir** oldu: **Raporun ekleri** ve **Tarafsızlık / bağımsızlık
beyanı**. Boş bırakılırsa rapora yine "—" yazılır (uydurma yok).

- Rapor görünümünde **"Rapor künyesi ek alanları (ekler · tarafsızlık)"**
  paneli; yazarken model güncellenir, alandan çıkınca önizleme tazelenir.
- `case.report.impartiality` / `case.report.annexList`; `normalizeCase` korur;
  birleştirme boş alanı doldurur (dolu farklı değer sessizce ezilmez).
- Değerler yalnız **Rapor künyesi** bölümü açıkken görünür (o bölüm varsayılan
  kapalı).
- Üç çıktı (HTML/DOCX/UDF) aynı satırları basar.

**Ölçüm:** `rapor [Senaryo 20]` üç çıktıda ekler + beyan aynı; `sema [3h]` (514);
`tasarim [2bs]`. `bash tools/test.sh` yeşil.

## v2.224 — Yazdırma: yalnız rapor kâğıdı

v2.219–v2.223'te rapora eklenen **bölüm paneli, teknik ortam paneli, hazırlık
kartı ve anahtarlar** yazdırmada gizlenmiyordu. Ölçüm (print medya):
`#reportSectionsBox`, `#reportTechBox`, `#reportReadiness` **block**;
`.report-toggle` **flex** → bu araçlar kâğıda basılıyordu.

### Düzeltme

- `@media print` bloğu **dosya sonuna** taşındı (aynı özgüllükteki
  `.report-toggle` temel kuralı daha önce tanımlı olduğu için bloğu eziyordu).
- Yazdırmada gizlenenler: bölüm paneli, teknik ortam paneli, hazırlık kartı,
  anahtarlar ve A4 sayfa kılavuzu. Yalnız `.report-paper` kalır.

### Ölçüm (gerçek Chromium, `Emulation.setEmulatedMedia: print`)

| Öğe | Önce | Sonra |
|---|---|---|
| `#reportSectionsBox` | block | **none** |
| `#reportTechBox` | block | **none** |
| `#reportReadiness` | block | **none** |
| `.report-toggle` (2) | flex | **none** |
| `.paper-pageguides` | — | **none** |
| `#reportPreview` | block | **block** (kalır) |

### KULLANICI NE GÖRECEK

- **Yazdır / PDF** artık yalnız rapor belgesini verir; ekran araçları (bölüm
  paneli, teknik alanlar, hazırlık kartı, anahtarlar) kâğıda basılmaz.

**Koruyan test:** `tasarim-testi` [2br] (6 kontrol) — düzeltme yokken KALDI.

## v2.223 — Rapor profilleri: Yalın · Standart · Tam 56.12

27 bölümü tek tek açmak yerine **tek tıkla hazır kümeler**. Profil yalnız bölüm
görünürlüğünü ayarlar; **veri değişmez**; bilirkişi sonra ince ayar yapabilir.

### Profiller

| Profil | Bölüm | Ne zaman |
|---|---|---|
| **Yalın (asgari)** | **7** (kapak, künye, konu, sorular, analiz, sonuç, imza) | en kısa/tek sayfalık sunum |
| **Standart** | **19** (mevcut varsayılan) | günlük kullanım |
| **Tam 56.12** | **27** (tüm bölüm + EK-1…EK-7) | ayrıntılı/denetime elverişli rapor |

- Profil tanımları ve saf fonksiyon `schema.js`'te (`reportSectionsForPreset`).
- Panelde "Hazır profil" satırı; tıklayınca bölüm kutuları ve önizleme anında
  güncellenir; tercih dosyayla saklanır.

### Ölçüm (gerçek Chromium)

| Profil | İşaretli kutu | Ekler bölümü |
|---|---|---|
| Tam 56.12 | **27 / 27** | var |
| Yalın | **7 / 27** | yok |
| Standart | **19 / 27** | yok |
| Yenile (standart) | **19** (korundu) | — |

900 / 600 px taşma **0**; JS hatası **0**.

**Koruyan test:** `sema-testi` [3h] (511), `tasarim-testi` [2bq].

## v2.222 — Teknik ortam alanları

56.12 şablonunun 4. bölümünü (teknik özellikler ve inceleme ortamı) besleyen
**elle düzenlenebilir** alanlar eklendi. Otomatik doldurulmaz; boş alan rapora
**"—"** yazılır (uydurma yok).

### Ne yapıldı

- **7 alan:** iş istasyonu/bilgisayar, işletim sistemi ve sürümü, ses çözümleme
  yazılımı ve sürümü, meta veri okuma aracı ve sürümü, dinleme donanımı,
  inceleme ortamı, diğer donanım/yazılım.
- Rapor görünümünde **"Teknik özellikler ve inceleme ortamı"** katlanır paneli;
  yazarken model güncellenir (odak kaybolmaz), alandan çıkınca önizleme tazelenir.
- **Yeni rapor bölümü `tech`** (varsayılan **KAPALI**). Üç çıktı (HTML/DOCX/UDF)
  aynı satırları basar.
- `case.report.tech` şemada; `normalizeCase` korur; **birleştirme** boş alanı
  doldurur, dolu farklı değeri sessizce ezmez; önizleme aynı kuralı gösterir.

### Ölçüm (gerçek Chromium)

| Adım | Sonuç |
|---|---|
| Panel | **7** alan |
| "Windows 11 Pro" yaz → bölümü aç | önizlemede **göründü** |
| Sayfa yenile | değer **korundu** |
| 900 / 600 px | yatay taşma **0** |
| JS hatası | **0** |

**Koruyan test:** `rapor-tutarlilik-testi` [Senaryo 19], `sema-testi` [3h]
(505), `tasarim-testi` [2bp].

## v2.221 — Sayfalı önizleme (A4)

Kullanıcı: *"Sayfa önizlemesi A4 yapısı muhtemelen olur; bu alanlarda da
kullanıcı tarafından ayarlanabilsin; biz en temiz hâlde verelim, parametreden
açarsa görünsün."*

### Ne yapıldı

- **"Sayfalı önizleme (A4)"** anahtarı (Rapor görünümü). **Varsayılan KAPALI**:
  en temiz hâl sürekli kâğıttır.
- Açıldığında kâğıt üzerine **A4 sayfa çizgileri** ve **"Sayfa N / M"**
  etiketleri çizilir. Sayfa sayısı kâğıt genişliğinden (A4: yükseklik =
  genişlik × 297/210) hesaplanır; genişlik değişince yeniden hesaplanır.
- Tercih `case.report.pageView` olarak dosyayla saklanır.
- **İçerik kırpılmaz:** kılavuz `pointer-events:none` bir kaplamadır; metin
  akmaz. **Yazdırmada gizlenir** (`@media print`), çünkü kesin sayfa kırılması
  yazdırma/PDF sırasında oluşur.

### Dürüst sınır

Bu bir **ekran kılavuzudur**: sayfa sınırlarını gösterir, "tam sayfa" iddiası
yoktur. Kesin kırılma yazdırma/PDF'te oluşur; UDF/DOCX çıktısı etkilenmez.

### Ölçüm (gerçek Chromium, 14 bölümlük kayıt)

| Durum | Sonuç |
|---|---|
| Kapalı | çizgi **0**, etiket **0** |
| Açık | **3 çizgi**, **4 sayfa** ("Sayfa 1/4 … 4/4"), taşma **0** |
| 900 / 600 px | yeniden hesaplanır (4 / 7 çizgi), yatay taşma **0** |
| Yeniden kapat | çizgi **0** |
| JS hatası | **0** |

**Koruyan test:** `sema-testi` [3h] (pageView varsayılan kapalı/korunur),
`tasarim-testi` [2bo].

## v2.220 — 56.12 şablon bölümleri (isteğe bağlı)

Eklediğiniz 56.12 rapor şablonundaki bölümlerin **veriyle beslenebilen** kısmı
eklendi. Yeni bölümler **VARSAYILAN KAPALI**; mevcut rapor görünümü değişmez,
bilirkişi isterse açar.

### Yeni bölümler (7)

- **Rapor künyesi (ayrıntılı):** dosya no, makam, karar tarihi, süre/son tarih,
  bilirkişi, sicil, uzmanlık, rapor tarihi.
- **Raporun kısa özeti:** dosya sayısı, toplam süre, deşifre aralığı, konuşmacı
  kodu sayısı, anlaşılmadı/belirsiz bölüm, ASR ve iyileştirme kullanımı.
- **Ses iyileştirme / filtreleme:** dürüst metin — uygulanmadı, orijinal
  değiştirilmedi.
- **Otomatik konuşma tanıma / yapay zekâ:** model + çözümleme zamanı; yerel
  çalışma ve insan doğrulaması notu.
- **Görev alanı dışı / sınırlılık beyanı:** 56.12 sınırı; kimlik/montaj/cihaz
  analizinin yapılmadığı açıkça yazar.
- **Kişisel veri / gizlilik:** yerel işlem, harici aktarım yok.
- **Ekler:** EK-1 teslim/iade, EK-2 teknik envanter, EK-3 işlem günlüğü,
  EK-5 gösterim anahtarı, EK-6 son kontrol, EK-7 hukuki/yöntemsel dayanak.

### Kurallar

- **Otomatik doldur, uydurma yok:** veri yoksa "—" yazılır.
- **Üç çıktı aynı:** HTML/DOCX/UDF aynı satırları üretir.
- **Varsayılan kapalı:** `reportSectionOn` eksik anahtarda tanımdaki varsayılana
  düşer; eski kayıt sessizce değişmez.
- **Profil rapora yazılmaz** (v2.111 kuralı korunur).

### Ölçüm (gerçek Chromium)

| Adım | Sonuç |
|---|---|
| Varsayılan rapor | yeni başlıklar **yok** (üç çıktı) |
| 7 bölüm açık | başlıklar **üç çıktıda da** var |
| ASR modeli / EK-1 / EK-3 / EK-5 | üç çıktıda aynı |
| 900 / 600 px | taşma/kırpılma **0** |
| JS hatası | **0** |

**Koruyan test:** `rapor-tutarlilik-testi` [Senaryo 18], `sema-testi` [3h],
`tasarim-testi` [2bn].

## v2.219 — Parametrik rapor: bölümleri aç/kapa

Kullanıcı, eklediği 56.12 rapor şablonunu (HTML + UDF) inceledikten sonra
raporun **çok modüler** olmasını istedi: *"Raporun tüm bölümlerini seve seve
açıp kapatabileceğim; hepsini hazır tutalım ama bilirkişi isterse en az bölüm
yapısıyla sunabilsin, isterse bir sayfalık bölüm bile alabilsin."*

### Ne yapıldı

- **Bölüm modeli tek kaynak:** `schema.js` → `REPORT_SECTION_DEFS` (19 anahtar,
  varsayılan açık). `emptyReportSections` / `normalizeReportSections` eklendi.
- **Kalıcı tercih:** `case.report.sections` (anahtar → açık mı). `emptyCase` ve
  `normalizeCase` güncellendi; eksik anahtar varsayılana döner, bilinmeyen
  anahtar korunur. (v2.212 dersi: normalize beyaz listesi güncellenmezse alan
  ilk kaydetmede sessizce düşer — burada düşmüyor.)
- **Arayüz:** Rapor görünümünde **"Rapor bölümleri (aç/kapa)"** paneli; beş
  grupta 19 onay kutusu + "Tümünü aç / Tümünü kapat". Kapalı bölüm rapora ve
  **üç çıktıya da** girmez.
- **Üç çıktı aynı anahtarı onurlandırır:** HTML önizleme, DOCX ve UDF aynı
  `reportSectionOn()` kapısını kullanır. İçindekiler yalnız açık bölümleri
  listeler.
- **Canlı önizleme:** Bir kutu işaretlenince rapor anında yeniden çizilir.

### Ölçüm (gerçek Chromium + CDP, 1440×900)

| Adım | Sonuç |
|---|---|
| Panel | **19** onay kutusu, 5 grup, taşma **yok** |
| "Kayıt kökeni" kapat | Önizlemede **başlık yok**, diğer bölümler duruyor |
| Yeniden aç | Başlık **geri geldi** |
| 900 / 600 px | Taşma/kırpılma **0** |
| JS hatası | **0** |

Üç çıktı için `rapor-tutarlilik-testi` **Senaryo 17**: kapalı bölüm üç çıktıda
da yok, açık kalan bölüm var. Kıran test kanıtı: `reportSectionOn` daima `true`
yapılınca 5 kontrol **KALDI**.

### KULLANICI NE GÖRECEK

- Rapor ekranında **"Rapor bölümleri (aç/kapa)"** bölümü var. İstediğiniz
  bölümü kapatın; rapor önizlemesi ve UDF/DOCX çıktısı **o bölüm olmadan**
  üretilir.
- Varsayılan **hepsi açık**: mevcut rapor görünümü değişmez.
- "Tümünü kapat" ile en yalın iskeletten başlayıp istediğinizi açabilirsiniz.
- Bölüm tercihi dosyayla birlikte saklanır; paketleyince taşınır.

**Koruyan test:** `rapor-tutarlilik-testi` [Senaryo 17], `sema-testi` [3h],
`tasarim-testi` [2bn].

## v2.218 — Tasarım denetimi: delil envanteri yerleşimi

Kullanıcı, delil envanteri eklendikten sonra "bazı tutarsız görünümler olmaya
başladı" dedi. Ölçüm (gerçek Chromium, 1440×900) tek bir kök gösterdi:
`#delilInventory` masaüstü ızgarasına **yerleştirilmemişti**.

### Ölçülen hata (v2.217, 1440×900)

- Envanter **220px sol sütunda, örtük 3. satırda**, 418px yüksekliğindeydi.
- Kayıt listesi **194px'e** sıkışıyordu (3 satır yerine ~2).
- Detay paneli yalnız **356px** yüksekliğinde kalıyor, sağda **~448px boş bant**
  bırakıyordu.
- Envanter genişletilince detay paneli kısalıyor; `.sd-right` `min-height:0`
  yüzünden metin alanı analiz kutusunun **üstüne biniyordu** (textarea alt 823 >
  dalga üst 742).

### Düzeltme

- Masaüstü ızgarası **üç satıra** ayrıldı: (1) delil envanteri tam genişlik,
  (2) yükleme alanı, (3) kayıt listesi; detay paneli 2–3. satırı kaplar.
- Envanter panel diliyle hizalandı (`--r-lg`, `--shadow-sm`).
- Sağ sütun **içeriğinden aşağı inmez** (`min-height:auto`); sığmazsa panel
  kayar, öğe ezilmez (v2.179/v2.191 ilkesi).

### Ölçüm (v2.218, gerçek Chromium)

| Genişlik | Liste | Detay | Yatay taşma | Örtüşme |
|---|---|---|---|---|
| 1440 (envanter kapalı) | 580px | **742px** | yok | yok |
| 1440 (envanter gizli) | 624px | **786px** | yok | yok |
| 1440 (envanter açık) | 331px | 493px | yok | **yok** |
| 900 / 600 | dar düzen korunur | — | yok | yok |

Üç temada envanter/köken/rapor yüzeyleri WCAG AA üstü (en düşük 5.93).
Köken paneli ve rapor 1440/900/600'de kırpılmıyor.

### KULLANICI NE GÖRECEK

- **Delil envanteri artık üstte, tam genişlikte** açılır bir şerittir; dosya
  ağacı okunaklıdır. Kapalıyken tek satır yer kaplar.
- **Kayıt listesi ve düzenleme paneli eski (doğru) yüksekliğine döndü**; sağda
  boş bant kalmaz.
- Envanteri açtığınızda metin alanı analiz kutusunun üstüne binmez; gerekirse
  panel kayar.

**Koruyan test:** `tasarim-testi` [2bm] (7 kontrol) — düzeltme yokken KALDI.

## v2.217 — Gömülü metadata (cihaz beyanı)

Kullanıcı "gömülü cihaz beyanına ihtiyacımız var mı bilmiyorum ama ekleyelim;
gerekirse rapora yansıtmayı açıp kapatabiliriz" dedi. Bu sürüm metadata'yı
okur, gösterir ve rapora **isteğe bağlı** olarak ekler.

### DÜZELTME

- **Ayrıştırıcılar:** ID3v2.3/2.4 (`TDRC`, `TDEN`, `TDRL`, `TSSE`), MP4/M4A
  (`mvhd` oluşturma zamanı, `©day`, `©too`), WAV (`bext` tarih/saat/köken,
  `LIST-INFO` `ICRD`/`ISFT`), FLAC (Vorbis `DATE`, `ENCODER`).
- **Kayıt:** `origin.embedded = { source, recordingAt, encodingAt, releaseAt,
  software, readAt }`. Dosya eklenince ve delil paketi içe aktarılınca okunur.
- **Arayüz:** Kayıt kökeni panelinde özet + **Dosyadan oku** düğmesi (yeniden
  okur, delil günlüğüne yazar).
- **Rapor anahtarı:** Rapor görünümünde **"Gömülü metadata (cihaz beyanı)
  raporda görünsün"**. **Varsayılan KAPALI.** Açılınca üç çıktıda
  "GÖMÜLÜ METADATA (CİHAZ BEYANI)" bölümü: dosya · kayıt zamanı · yazılım ·
  kaynak. Açıklama metni değerlerin **beyan** olduğunu söyler.

### KULLANICI NE GÖRECEK

- Kayıt seçince köken panelinde "kayıt: 2026-03-12T14:20 · yazılım: … (MP4/M4A)"
  satırı; yoksa "Okunmadı veya dosyada yok".
- Raporda **varsayılan olarak bu bölüm yok**; kutu işaretlenince girer.
- Metin açıkça "cihaz beyanı, doğrulanmamış" der; kayıt zamanı kanıtı sayılmaz.

### KORUYAN TESTLER

- `birim` **[83]** (dört biçim ayrıştırma, epoch dönüşümü, özet, satırlar,
  şema koruması, rapor anahtarı varsayılanı).
- `rapor` **Senaryo 16** (açıkken üç çıktıda, kapalıyken hiçbirinde yok).
- `tasarim` **[2bl]** (anahtar, ayrıştırıcılar, panel düğmesi, stil).

### DÜRÜST SINIR

Metadata **beyandır**: değiştirilebilir, cihaz saati yanlış olabilir, çoğu
dosyada hiç yoktur. Bu yüzden "kayıt zamanı" alanına yazılmaz ve rapora
kendiliğinden girmez. Ayrıştırma yalnız ilk 8 MB'a bakar.

## v2.216 — Delil envanteri ve dosya zamanları

Kullanıcı şunu sordu: *"USB'ye ne zaman kaydedildi, dosya hangi cihazda ne zaman
oluşturuldu, bunları tutmalı mıyız?"* Cevap üç katmanı ayırmaktı: **kayıt**
(beyan, genelde bilinmiyor), **ortam** (gözlenen dosya sistemi zamanı) ve
**edinme** (bizim, kesin). Bu sürüm ikinci katmanı görünür ve dürüst hale
getiriyor; ayrıca paketteki tüm dosyaları gezilebilir kılıyor.

### DÜZELTME

- **Delil envanteri paneli (Ses görünümü):** paketteki **tüm** dosyalar (ses +
  ses dışı) klasör ağacıyla listelenir; arama ve çoklu paket seçimi vardır.
  Ses satırına tıklamak ilgili kaydı açar.
- **Envanter verisi:** `case.disks[].files` — ad, kaynak yolu, paket yolu,
  boyut, SHA-256, rol (ses/ses dışı), durum ve materyal bağı. v1 paketlerde de
  dosya listesi oluşur (disk metadata'sı olmasa bile).
- **Gözlenen dosya zamanları:** `origin.fileTimes` = oluşturulma/değiştirilme/
  erişim. Bunlar **kayıt zamanı değildir**; kopyalama ve saat dilimiyle
  değişebilir. `disk.json` kaynağına saat dilimi/UTC farkı eklenir.
- **Rapor notu:** köken tablosunun altında "bu zamanlar kayıt zamanı değildir;
  kayıt cihazı/tarihi yalnız beyan varsa yazılır" açıklaması **üç çıktıda**.
- Edinim aracı 1.3: her dosya için `createdAt`/`accessedAt` de yazılır.

### KULLANICI NE GÖRECEK

- Ses görünümünde **Delil envanteri** başlığı: kaç dosya, kaçı ses, kaçı diğer.
- Klasör ağacı flash'taki yapıyla aynı; arama kutusu ile dosya bulunur.
- Raporda "kayıt tarihi: bilinmiyor" yazıyorsa nedeni açıkça belirtilir; dosya
  sistemi tarihi kayıt tarihi gibi sunulmaz.

### KORUYAN TESTLER

- `birim` **[82]** (envanter sayıları, ağaç kurulumu/sıralama, dosya zamanları,
  şema koruması).
- `rapor` **Senaryo 14** (not üç çıktıda aynı).
- `tasarim` **[2bk]** (panel, ağaç, filtre, kayıt bağlantısı, token/sarma).

### DÜRÜST SINIR

Dosya sistemi zamanları **gözlem**dir; kayıt anını kanıtlamaz. Gömülü metadata
(MP4/ID3) okuma bu sürümde **yok**; sonraki adım.

## v2.215 — Paket v2: disk yapısı ve disk.json

Kullanıcı paket içindeki yolları inceledi: dosyalar yapay `ses/` klasörüne
kopyalanıyordu; kaynak cihazdaki dizin yapısı kayboluyordu. Ayrıca disk/bölüm
bilgisi hiç kaydedilmiyordu. İleriye dönük "sanal imaj" fikri için yapının
birebir korunması gerekiyor.

### DÜZELTME

- **Paket yapısı v2:** `icerik/<cihaz-kökü>/<kaynak yolu>`.
  - Kök = **seri no** (yoksa etiket, yoksa model); klasör kaynağında klasör adı.
  - **Yapay `ses/` klasörü kaldırıldı**; cihazdaki dizin yapısı birebir korunur.
- **İki yol alanı:** `relPath` = **kaynak cihazdaki** yol;
  `packagePath` = **paket içindeki** yol. Eski v1 paketler (`ses/...`) açılmaya
  devam eder; AKİS `packagePath || relPath` sırasıyla arar.
- **Varsayılan tüm dosyalar:** `bilgi.txt`, video, belge vb. de kopyalanır.
  Yalnız ses için `-AudioOnly`. `-IncludeAll` geriye uyumluluk için kabul edilir.
- **`disk.json` (`akis.disk.v1`):** disk numarası, bölüm tablosu (offset, boyut,
  tür, sürücü harfi, aktif/gizli), birim bilgisi (dosya sistemi, etiket, birim
  seri no, kapasite) ve dizin listesi. **Raw sektör, boş alan, silinmiş veri
  yoktur**; "imaj" değildir.
- **AKİS:** `case.disks[]` alanında envanter saklanır; materyal
  `origin.acquisition.diskId` ile bağlanır. Birleştirmede disk **kimlikle**
  eşleşir; aynı kimlikte farklı içerik **çakışma** bildirir (sessiz ezme yok).
  Önizleme "eklenecek disk" sayısını gösterir.
- Sürüm: uygulama **2.215**; Edinim aracı **1.3** (paket v2 biçimi).
  Not: 1.2 = eski (v1) paket biçimi; 1.3 = v2. Rapor ARAÇ sütununda hangi
  sürümün paket ürettiği görünür.

### KULLANICI NE GÖRECEK

- Paket içinde `ses/` yerine `icerik/<seri no>/...` görürsünüz; dosyalar
  flash'taki klasörlerle aynı yerde durur.
- Artık **ses dışı dosyalar da** pakete girer (varsayılan). Yalnız ses
  isterseniz `-AudioOnly`.
- Paket kökünde **`disk.json`** vardır; disk/bölüm/birim özetini taşır.

### KORUYAN TESTLER

- `birim` **[81]** (packagePath çözümü, disk.json bulma/doğrulama, v2 paket,
  disk normalizasyonu/birleştirme/önizleme).
- `tasarim` **[2bj]** (ps1 `icerik/`, `packagePath`, `disk.json`, `-AudioOnly`;
  uygulama disk okuma; şema `disks`; yardım metni).

### DÜRÜST SINIR

`edinme.ps1` bu ortamda çalıştırılmadı. `disk.json` **metadata**dır; raw sektör
içermez, bu yüzden tek başına "adli imaj" değildir. Sanal imaj/geri yazma fikri
ileride ayrı bir adımdır.

## v2.214 — Edinim 1.2: zip'te BOM korunur

Kullanıcı aracı Windows PowerShell 5.1'de çalıştırdı ve **sözdizimi hatası**
aldı. Ekranda `EDÄ°NÄ°M {0} â€” Delil Edinme` görünüyordu: dosya UTF-8, ama
PowerShell onu **ANSI** okuyordu.

### KÖK NEDEN (ölçüldü)

Depodaki `edinme.ps1` **UTF-8 BOM** taşıyor. Ancak uygulama zip'i üretirken
`fetch().text()` kullanıyor; **UTF-8 çözücüsü baştaki BOM'u siler**. JSZip de
BOM'suz yazınca indirilen dosyada BOM kalmıyordu. PowerShell 5.1 BOM'suz
dosyayı cp1252 okur; `—` karakteri `”` (akıllı tırnak) olur ve PowerShell onu
**dize sınırı** sanıp betiği erken kapatır:

```
+ Write-Host ("  EDÄ°NÄ°M {0} â€” Delil Edinme ...")
Unexpected token 'Delil' in expression or statement.
```

### DÜZELTME

- **Zip'e yazarken BOM geri konur:** `acquisitionToolFileContent(name, text)`
  `.ps1` içeriğinin başına `U+FEFF` ekler (varsa ikizlemez); `.bat`/`.md`
  dosyalarına dokunmaz.
- **Betikte tipografik işaret kalmadı:** `—`, `→`, `≠`, `·`, `…` ASCII
  karşılıklarına çevrildi. Böylece BOM bir daha kaybolsa bile betik **çalışır**
  (yalnız Türkçe harfler bozuk görünür, sözdizimi bozulmaz).
- **Alet sürümü 1.2.**
- Uygulama sürümü 2.214; `?v=` parametreleri güncellendi.

### KULLANICI NE GÖRECEK

- **Edinme aracını yeniden indirin** (Ses → Edinme aracını indir). Yeni zip'te
  `edinme.ps1` BOM'ludur; PowerShell 5.1'de sorunsuz açılır.
- Eski zip'i kullanmayın.

### KORUYAN TESTLER

- `birim` **[80]** (BOM eklenir, ikizlenmez; `.bat`/`.md` değişmez).
- `tasarim` **[2bi]** (ps1 BOM taşır, tipografik tire/akıllı tırnak yok,
  sürüm 1.2, zip BOM yardımcısı var).

### DÜRÜST SINIR

PowerShell bu ortamda çalıştırılamadı (Linux, `pwsh` yok). Düzeltme, zip'in
**bayt düzeyinde** BOM taşıdığı ölçümüne dayanır; Windows'ta son doğrulama
kullanıcıya aittir.

## v2.213 — Delil tabloları ayrıştı, Edinim 1.1

Kullanıcı aracı Windows'ta denedi ve rapor tablolarını inceledi. Üç sınıf sorun
vardı: **(1)** edinme aracı kullanımı zordu, `E` yazınca hata veriyordu ve
Türkçe karakterler bozuktu; **(2)** envanter tablosu sütunları birleşikti ve
delil paketinden gelen kayıtlarda biçim/kanal/örnekleme **“bilinmiyor”**
görünüyordu; **(3)** köken tablosunda kayıt cihazı/tarihi ayrılmamış, oraya
**edinme yöntemi** yazılmıştı; edinme tablosunda cihaz ve etiket karışmıştı.

### DÜZELTME

- **Edinim 1.1 (araç):** soru-cevap sihirbazı — kaynak, hedef, operatör, teslim
  zinciri; **özet + onay**; ilerleme çubuğu; sonuç özeti. Sürücü `E`, `E:` veya
  `E:\` yazılabilir (normalize edilir). Dosya **UTF-8 BOM** ile kaydedilir
  (Windows PowerShell 5.1 Türkçeyi doğru okur). Hata olursa `İŞLEM DURDURULDU`
  yazar, yığın izi basmaz.
- **Envanter tablosu 7 ayrı sütun:** DOSYA ADI · DOSYA BİÇİMİ · DOSYA BOYUTU ·
  SÜRE · SES KANALI · ÖRNEKLEME HIZI · SHA-256. Biçim **uzantıdan** okunur
  (MP3/WAV/M4A…), kanal ve örnekleme hızı dosya çözülerek **ölçülür**. Tek
  kaynak `inventoryRows` (HTML/DOCX/UDF aynı hücreler).
- **Köken tablosu 8 sütun:** KAYIT CİHAZI ve KAYIT TARİHİ **ayrı**; bilinmiyorsa
  **“bilinmiyor”**. Edinme yöntemi/aracı bu alanlara **artık yazılmaz**. Eski
  kayıtlardaki gerçek cihaz metni yeni alana göç eder; edinme metni yok sayılır.
- **Edinme tablosu 9 sütun:** CİHAZ ve ETİKET **ayrı**.
- **Alet adı:** `Edinim v1.1` (ürün adı yazılmaz). Yöntem etiketi
  “Mantıksal kopya”.
- **Delil paketinden gelen kayıtlarda** biçim/kanal/örnekleme artık dolu:
  dosya adı `audioTech`'e geçirilir; MIME `audio/*` olsa da uzantı kullanılır.

### KULLANICI NE GÖRECEK

- Envanter tablosu, örnekteki gibi **her bilgi ayrı sütunda**; “bilinmiyor”
  yalnız gerçekten ölçülemeyen alanda yazar.
- Raporda **kayıt cihazı** ve **kayıt tarihi** ayrı sütun; bilinmiyorsa
  “bilinmiyor”. Edinme yöntemi artık buraya karışmaz.
- Edinme tablosunda **cihaz** ve **etiket** ayrı.
- ARAÇ sütununda **Edinim v1.1**.
- Edinim aracı sorularla ilerler; `E` yazmak yeterlidir; Türkçe düzgün görünür.

### KORUYAN TESTLER

- `birim` **[78]** (9 sütunlu edinme satırı, etiket sütunu, “Edinim v1.1”,
  yöntemin cihaz alanına yazılmaması, 8 sütunlu köken, 7 sütunlu envanter,
  biçim/hz biçimlendirme) ve **[79]** (köken koruma, birleştirme).
- `rapor` **Senaryo 14** (üç çıktıda etiket, “bilinmiyor”, envanter sütunları,
  “Edinim v1.1”) ve **Senaryo 15** (ürün kimliği yok).
- `tasarim` **[2bh]/[2bi]** (sütunlar, ayrı alanlar, sihirbaz, `E` normalizasyonu,
  UTF-8 BOM).

### DÜRÜST SINIR

`edinme.ps1` bu ortamda (Linux, USB yok, `pwsh` yok) **çalıştırılmadı**; yalnız
şema/import/rapor tarafı otomatik sınandı. Windows'ta `-Simulate` ve gerçek
USB'de denenmelidir.

## v2.212 — Delil teslim zinciri: teslim eden, operatör ve alet

Kullanıcı gerçek akışı anlattı: *flash disk mahkeme kaleminden kapalı zarf
içinde elden teslim alınıyor*. v2.208–v2.211 bu bilgiyi **taşımıyordu**:
`deliveredBy` her zaman boş kalıyor, rapor "—" yazıyor, operatörün sicili
görünmüyordu. Ayrıca raporda **sürücü harfi (D:)** ve **ürün adı** vardı.

### ÖLÇÜM (düzeltmeden önce)

| Ölçüm | Sonuç |
|---|---|
| `normalizeMaterial` yeni köken alanları | `deliveredByRegistry` / `deliveryPlace` → **undefined** (sessiz kayıp) |
| Delil verili raporda "uygulama" | **true** (Senaryo 10 bunu yakalamıyordu) |
| Raporda ARAÇ hücresi | `AKIS Edinme 1.0` (ürün markası) |
| Raporda cihaz hücresi | `SanDisk · E:` (sürücü harfi) |
| İki özdeş edinme tutanağı birleştirme | **1 çakışma** + ekranda `[object Object]` |
| Önizleme ↔ birleştirme | önizleme "alınacak alan", birleştirme "çakışma" (ayrışma) |

### DÜZELTME

- **Teslim eden ≠ operatör.** `delil.json` → `delivery { deliveredBy, registry,
  deliveredAt, place }`; AKİS → `origin.deliveredBy`,
  `origin.deliveredByRegistry`, `origin.deliveredAt`, `origin.deliveryPlace`.
  Operatör ayrı alanda (`acquisition.operator`) kalır. Alanlar **isteğe
  bağlıdır**, boşsa **uydurulmaz**.
- **TCKN istenmez.** Alan "sicil / kayıt no (varsa)" olarak adlandırıldı;
  kurumdan kuruma değiştiği için serbest metindir ve doğrulanmaz.
- **Sürücü harfi rapora yazılmaz.** `device.volumes` yalnız `delil.json`
  teknik izinde kalır. (v2.211'de cihaz hücresine yazılıyordu; kaldırıldı.)
- **Operatör hücresi** `Ad Soyad · Sicil`; **köken tablosu** 7 sütun oldu
  (`TESLİM YERİ` eklendi), teslim eden hücresi sicili taşır.
- **Alet adı ürün adı değil.** `method.tool = { name: 'edinme.ps1', version,
  engine: 'PowerShell' }`; rapor `edinme.ps1 1.0 · PowerShell` yazar. Eski
  paketler kendi alet adlarını **olduğu gibi** taşır (kanıt tahrif edilmez).
- **Rapor metni** ürün kimliği taşımaz: `acqIntro` yeniden yazıldı.
- **Yeniden yükleme ezmez:** aynı SHA-256 varsa yalnız **boş** köken/teslim
  alanları doldurulur; dolu değer korunur ve günlüğe yazılır.
- **Birleştirme nesneyi okunur karşılaştırır:** aynı tutanak çakışma sayılmaz;
  farklıysa `SanDisk · seri SN999 · operatör …` gibi **okunur metinle**
  bildirilir. Önizleme ve birleştirme aynı kuralı kullanır.
- **Araç indirme:** Ses → **Edinme aracını indir** → tek zip
  (`edinme.ps1`, `BASLAT.bat`, `OKUBENI.md`). Windows'ta `BASLAT.bat`'a sağ
  tık → **Yönetici olarak çalıştır**; parametreleri sorar.
- **Edinme aracı:** `-OperatorRegistry`, `-DeliveredBy`,
  `-DeliveredByRegistry`, `-DeliveredAt`, `-DeliveryPlace`, `-NonInteractive`;
  birim etiketi (`Get-Volume.FileSystemLabel`) manifeste eklenir.

### KULLANICI NE GÖRECEK

- Raporda **teslim eden, sicili, teslim yeri ve tarihi** görünür; operatör ayrı
  sütunda **siciliyle** yazar.
- Cihaz sütununda artık **`E:`/`D:` yok**; marka/model, seri ve etiket var.
- ARAÇ sütununda **ürün adı değil alet** yazar (`edinme.ps1 1.0 · PowerShell`).
- Edinme aracını uygulamadan **tek tıkla** indirebilirsiniz.
- Aynı paketi yeniden yüklemek **hiçbir elle girilmiş bilgiyi ezmez**.

### KORUYAN TESTLER

- `birim` **[78]** (alet metni, teslim alanları, etiket, köken satırı, rapor
  metinlerinde ürün kimliği yok) ve **[79]** (normalize koruması, nesne
  karşılaştırma, ezmeme kuralı).
- `rapor` **Senaryo 14** (üç çıktıda alet/operatör/teslim satırı, sürücü harfi
  yok) ve **Senaryo 15** (delil verili çıktıda "AKİS/uygulama/tarayıcı" yok).
- `tasarim` **[2bh]** (alanlar, indirme düğmesi, yardım metni).

### DÜRÜST SINIR

`edinme.ps1` bu ortamda (Linux, USB yok, `pwsh` yok) **çalıştırılmadı**; yalnız
şema/import/rapor tarafı otomatik sınandı. Yeni teslim parametreleri Windows'ta
kurgusal klasörde denenmelidir.

## v2.211 — Delil paketi: yinelenen dosya ve ses dışı dosya

Kullanıcı gerçekçi senaryoyu denedi: dosyada elle eklenmiş, düzenlenmiş ve
onaylanmış bir kayıt varken aynı sesi içeren delil paketini yükledi. Sonuç:
**12 kayıt** (2 elle + 10 paket) ve paket kopyalarında **düzenleme/onay yok**.

### KÖK NEDEN

Paket içe aktarma **her zaman yeni materyal** ekliyordu; aynı ses olup
olmadığını **SHA-256 ile karşılaştırmıyordu**. Ayrıca `-IncludeAll` ile
paketlenen `bilgi.txt` gibi ses dışı dosyalar materyal sanılıyordu.

### DÜZELTME

- **Yinelenen koruması:** Aynı SHA-256 dosyada zaten varsa **yeni kayıt
  açılmaz**. Mevcut kayıt, düzenlemeler ve onaylar korunur.
- **Edinme bilgisi mevcut kayda işlenir:** Paket doğrulandıysa cihaz/seri/
  yöntem/operatör bilgisi mevcut materyalin `origin.acquisition` alanına
  yazılır; delil günlüğüne “Delil paketinden edinme bilgisi işlendi” girer.
- **Ses dışı dosyalar:** `bilgi.txt`, video vb. materyal olarak **eklenmez**;
  manifestte kayıtlı kalır ve doğrulama penceresinde **“Ses dışı (atlandı)”**
  görünür. Böylece `-IncludeAll` güvenlidir.
- **Birim bilgisi:** Cihaz satırında **Birim: D:** gösterilir; raporda cihaz
  hücresi `model · D:` olur.
- **Özet:** “N doğrulandı · N zaten vardı (atlandı) · N ses dışı (atlandı)”.

### ÖLÇÜM (gerçek Chromium)

- Dosyada onaylı/düzenlenmiş materyal + aynı WAV'ı ve `bilgi.txt`'i içeren ZIP:
  - kayıt sayısı **1** (artmadı),
  - `review` **approved**, metin **düzenlenmiş metin** korundu,
  - `origin.acquisition.hashState` **verified**, birim **D:**,
  - günlük: **“Delil paketinden edinme bilgisi işlendi”**,
  - pencere: **1 zaten vardı (atlandı) · 1 ses dışı (atlandı)**.
- Boş dosyaya aynı ZIP: **1 doğrulandı · 1 ses dışı**; kayıt 1; JS hatası **0**.
- Rapor: cihaz + birim + operatör göründü.

### KULLANICI NE GÖRECEK

- Aynı paketi mevcut dosyaya yüklediğinizde **kopya oluşmaz**; düzenlediğiniz
  kayıt korunur ve edinme bilgisi ona eklenir.
- `bilgi.txt` gibi dosyalar listeye **girmez**; doğrulama penceresinde
  “Ses dışı (atlandı)” yazar.
- **v2.211 öncesi** oluşmuş kopyalar silinmez; onları **Kaldır** ile temizleyin
  veya yeni bir dosyaya paketi yeniden yükleyin.

### DÜRÜST SINIR

- Eşleştirme **SHA-256** iledir. Eski kayıtta hash yoksa eşleşme olmaz; yeni
  kayıt açılır. (Yeni eklenen dosyalarda hash vardır.)
- Aynı ses farklı sürümlerde (yeniden kodlanmış) farklı hash taşır; kopya
  sayılmaz. Bu doğrudur: içerik değişmiştir.

### Koruyan testler

- `birim-testleri` **[78]**: `duplicate`/`skipped` özeti, `isAudioFileName`,
  `delilDuplicateOf`, cihaz+birim hücresi.
- `bash tools/test.sh` tümü yeşil.

## v2.210 — Delil paketi içe aktarma: Windows ZIP ayırıcısı

Kullanıcı Brave'de (sıfır profil) SD paketini yükledi: **0 doğrulandı,
10 pakette yok**. Paket sağlamdı; sorun uygulama tarafındaydı.

### KÖK NEDEN

Windows .NET `ZipFile.CreateFromDirectory` girdi adlarını **`\`** ile
yazabiliyor (`ses\00-bozuk.aac`). Uygulama yalnız **`/`** ile eşleştiriyordu
(`ses/00-bozuk.aac`); bu yüzden `delil.json` bulundu (kök), ama ses dosyaları
"pakette yok" sayıldı.

### DÜZELTME

- ZIP girdi adları ve `relPath` değerleri **`/` üzerinden normalize** edilir;
  eşleşme büyük/küçük harf duyarsız yedekle de denenir.
- `delil.json` yolu `\` içerse de kök/nested bulunur.
- Kart okuyucu modeli "Card Reader" ise ortam türü **Hafıza kartı** eşlenir
  (SCSI + Removable olsa bile).
- Edinme aracı başında `chcp.com 65001`: Windows PowerShell 5.1'de Türkçe
  konsol çıktısı düzelir (Linux'ta yok sayılır).

### ÖLÇÜM

- `\` ayırıcılı ZIP (1 WAV) → AKİS'te **1/1 Doğrulandı**; onay penceresi yok;
  JS hatası **0**.
- Normal `/` ayırıcılı ZIP ve PowerShell `-Simulate` çıktısı: **2/2 Doğrulandı**
  (önceki ölçüm).
- `birim-testleri` **[78]**: backslash `delil.json` + "Card Reader" eşlemesi
  eklendi.

### KULLANICI NE GÖRECEK

- Aynı ZIP'i yeniden yükleyin; **10/10 Doğrulandı** görmelisiniz. Yeniden
  edinme gerekmez.
- SD kart artık **Hafıza kartı** olarak görünür (modelde "Card Reader" varsa).
- Konsolda Türkçe karakterler düzgün görünür.

### DÜRÜST SINIR

- Windows'un ürettiği gerçek ZIP bu ortamda yok; aynı ayırıcıyla **yeniden
  üretilmiş** ZIP ile ölçüldü. Kullanıcı denemesi bekleniyor.
- Tier 1 hâlâ imaj değildir; silinmiş veri/boş alan gelmez.

## v2.209 — Edinme aracı düzeltmeleri (v2.208 geri bildirimi)

Kullanıcı denemesi iki gerçek hata gösterdi:

1. **SD kart reddedildi:** SD okuyucu `BusType=SCSI` bildirdi; araç yalnız
   USB/SD/MMC kabul ettiği için durdu.
2. **USB'de kopyalama bitti, paket oluşmadı:** `Bağımsız değişken türleri
   eşleşmiyor` (ArgumentException). Kök: `files = @($entries)` (PowerShell
   7.7'de `List[object]` üzerinde hata) ve `Compress-Archive` modül bağımlılığı.

### DÜZELTMELER

- **SD/SCSI kabul:** `Get-Volume.DriveType = Removable` ise SCSI de kabul
  edilir; sistem/boot diski **reddedilir**. Log'da `Sürücü türü · BusType`
  yazılır.
- **`files = $entries.ToArray()`**: ArgumentException giderildi.
- **ZIP:** `Compress-Archive` yerine **.NET `ZipFile.CreateFromDirectory`**;
  modül yüklenemezse `Compress-Archive` yedeği.
- **Operatör zorunlu:** `-Operator` artık zorunlu; boş künye ile paket
  oluşmaz.
- **Konsol UTF-8:** `chcp 65001` + `[Console]::OutputEncoding`; Türkçe
  karakterler bozulmaz.
- **`device.removable`:** manifest'e eklendi; AKİS'te SCSI+removable → `usb`,
  SD/MMC → `memory_card` eşlemesi.
- **Yol ayırıcı:** `TrimStart/TrimEnd` hem `\` hem `/` kabul eder (test
  kolaylığı; Windows davranışı değişmez).

### ÖLÇÜM

- PowerShell 7.7 `-Simulate` uçtan uca: 2 dosya → `delil.json` + ZIP →
  AKİS'te **2/2 Doğrulandı**, operatör/seri/cihaz rapora girdi, JS hatası **0**.
- Windows `diskpart` yolu bu ortamda (Linux) çalıştırılamadı; kullanıcı
  denemesi bekleniyor.

### DÜRÜST SINIR

- `diskpart`/salt-okunur ve SD/USB algılama yalnız Windows'ta denenebilir.
- Tier 1 hâlâ imaj değildir; silinmiş veri/boş alan gelmez.
- Yazılımsal salt-okunur, donanım write-blocker değildir.

### Koruyan testler

- `birim-testleri` **[78]**: SCSI+removable → `usb`, SD → `memory_card`
  eklendi (40 kontrol).
- `bash tools/test.sh` tümü yeşil.

## v2.208 — Delil paketi (Tier 1) ve doğrulama

Kullanıcı: *"USB'den dosya kopyalamak delil güvenliği açısından zayıf; kendi
standardımızı kuralım. Edinme ayrı bir araçla olsun, AKİS yalnız doğrulasın."*

### KULLANICI NE GÖRECEK

- **Ses → Delil paketi yükle** düğmesi (ZIP). Paket içinde `delil.json` ve
  `ses/` dosyaları vardır.
- Yükleme sonunda **doğrulama penceresi**: cihaz modeli, seri no, yöntem, araç,
  operatör, alınma zamanı ve her dosyanın SHA-256 durumu.
- Üç dürüst durum: **Doğrulandı** / **Uyuşmuyor** / **Doğrulanamadı**.
  Hash yoksa "Doğrulandı" **denmez**.
- Hash uyuşmazsa yükleme **onay ister**; kabul edilirse raporda "Uyuşmuyor"
  yazar.
- Raporun **"DELİL EDİNME VE DOĞRULAMA"** bölümü: kayıt, cihaz, seri no,
  yöntem, araç, operatör, alınma, doğrulama. HTML/DOCX/UDF **aynı metni** üretir.
- Delil günlüğüne **"Delil paketinden alındı"** ve **"SHA-256 doğrulandı /
  UYUŞMUYOR / doğrulanamadı"** girdileri zincirle yazılır.

### EDİNME ARACI

- `tools/edinme/edinme.ps1` (Windows, yönetici): USB'yi listeler, `diskpart`
  ile **salt-okunur** yapar, dosyaları kopyalar, SHA-256 hesaplar,
  `delil.json` + `delil.log` + ZIP üretir.
- `tools/edinme/BASLAT.bat` yönetici PowerShell açar.
- Kurgusal test: `-Simulate` (diskpart/cihaz bilgisi atlanır).
- Ayrıntı: [`docs/DELIL_EDINME.md`](docs/DELIL_EDINME.md) ve
  [`tools/edinme/OKUBENI.md`](tools/edinme/OKUBENI.md).

### DEĞİŞMEZ KURALLAR

1. **Tarayıcı cihazı görmez.** `delil.json`'daki cihaz bilgisi **edinme
   aracının beyanıdır**; arayüz bunu açıkça yazar.
2. **Hash yoksa doğrulanmış sayılmaz.** `verifyHashState` üç hâllidir:
   `verified` / `mismatch` / `unavailable`.
3. **Uyuşmazlık sessizce geçmez.** Onay istenir; raporda "Uyuşmuyor" yazılır.
4. **Tier 1 imaj değildir.** Silinmiş dosya/boş alan gelmez; raporda
   "belgelenmiş dosya kopyası" olarak yazılır.
5. **Yazılımsal salt-okunur, donanım write-blocker değildir.** Yöntem raporda
   açıkça yazılır.
6. **Paket yoksa rapor bölümü çizilmez.** Yapılmayan edinme rapora yazılmaz.

### DÜRÜST SINIR

- PowerShell edinme aracı bu ortamda (Linux, USB yok) **çalıştırılmadı**;
  yalnız şema/import/rapor tarafı test edildi. Gerçek delilden önce kurgusal
  USB'de 3–5 deneme şart.
- Tier 2 (tam DD imajı) henüz yok; plan [`docs/GELECEK_PLANI.md`](docs/GELECEK_PLANI.md).

### Koruyan testler

- `birim-testleri` **[78]** (38 kontrol): şema, manifest yolu, hash üçlüsü,
  origin eşlemesi, özet, rapor satırı.
- `rapor-tutarlilik-testi` **Senaryo 14**: üç çıktı aynı edinme satırını üretir;
  paket yoksa bölüm yok.
- `tasarim-testi` **[2bg]**: düğme/pencere, beyan metni, hash doğrulaması,
  delil günlüğü, üç çıktı, kırpma yok.

## v2.207 — Yerel LLM denemesi kaldırıldı (ölçüm sonrası)

Kullanıcı: *"Deneyelim; olmazsa bırakırız."* Denendi, ölçüldü ve **kaldırıldı**.

### ÖLÇÜM (gerçek tarayıcı)

| Deneme | Sonuç |
|---|---|
| Qwen2.5-0.5B · q4f16 · WebGPU | Çıktı **çöp**: `Кызета / 8.о / 8о` (Kiril), yavaş |
| Qwen2.5-1.5B · q4f16 · WebGPU | **`Aborted()`** — 6 GB kartta bellek/GPU hatası |
| Qwen2.5-0.5B · int8 · WASM | Türkçe ama **sadakatsiz**: metinde olmayan içerik uyduruyor, özetlemiyor, araya Çince karakter karıştırıyor |
| Qwen2.5-1.5B · int8 · WASM | Türkçe ama **konuyla ilgisiz**: "belirli bir şekilde düzenlenip…" gibi genel metin |

**Sonuç:** Tarayıcıda çalışan 0,5–1,5B modeller Türkçe hukuki metinde güvenilir
taslak üretmiyor. Kuantizasyon değiştirmek (q4f16 → int8) çöp çıktıyı
düzeltmiyor; yalnızca "anlamsız"dan "sadakatsiz"e taşıyor. Bu, rapora
girebilecek bir araç için kabul edilemez.

### KULLANICI NE GÖRECEK

- **Yardımcı taslak düğmesi ve LLM penceresi kaldırıldı.** Rapor ekranı eski
  sade hâline döndü.
- Hiçbir model indirilmez, GPU kullanılmaz, ek risk yok.
- Mevcut çözümleme, deşifre, onay, rapor ve paket akışları **değişmedi**.

### NEDEN YÜKSELTMEDİK (dürüst sınır)

- Uygulama `transformers.js 3.7.2` kullanıyor (Whisper için ölçülerek sabit).
  Qwen3/Qwen3.5/Gemma 4 mimarileri **4.x** istiyor; yükseltme Whisper'ı bozma
  riski taşır.
- Gemma 4 E2B tarayıcı için **~3,3 GB** (multimodal); E4B ~5,2 GB.
- Qwen3.5-0.8B-Text int8 umut verici bir adaydır ama **ölçülmeden** ürüne
  alınmaz. İleride araştırma konusu olarak not edildi.

### Koruyan testler

- `bash tools/test.sh` → tümü yeşil (LLM'e ait testler ve arayüz kaldırıldı).
- Sürüm: `APP_VERSION`, `version.json`, dört `?v=`, `schema.js` import'u,
  CHANGELOG, YOL_HARITASI, README, OZELLIKLER ve AGENTS birlikte **2.207**.

## v2.206 — Yerel LLM yardımcısı (deneysel; v2.207'de kaldırıldı)

Kısa süreli deneme: rapor ekranına "Yardımcı taslak" düğmesi ve yerel yazı
modeli (Qwen2.5 0.5B/1.5B) eklendi. Yalnız onaylı metin gönderiliyordu; çıktı
taslaktı ve rapora girmiyordu. **Ölçüm sonrası kullanılamaz bulundu** ve
v2.207'de tamamen kaldırıldı. Ayrıntılı ölçüm: v2.207 bölümü.

## v2.205 — Dosyalar arası konuşmacı kaydı (case-level registry)

Kullanıcı: *"Aynı kişi birden çok kayıtta geçiyorsa bunu bir kez tanımlayıp
rapora tek satırda yazalım."*

### KULLANICI NE GÖRECEK

- **Analiz → Konuşmacılar** panelinde yeni **"Dosyalar arası kişiler"** bölümü:
  kişi kodu **K1, K2…**, etiket, rol, cinsiyet, yaş, not.
- Her kayıt içi konuşmacı kartında **"Aynı kişi (dosyalar arası)"** seçicisi:
  mevcut bir kişiye bağla veya **＋ Yeni kişi** oluştur.
- Aynı kişiye bağlı konuşmacılar raporda **TEK satırda** gösterilir:
  `K1 · Kiracı`; BÖLÜM/NOT hücresinde **hangi kayıtta hangi yerel kodla**
  geçtiği (`A.wav: S1 · 12 bölüm · B.wav: S1 · 8 bölüm`) ve
  **"uzman eşleştirmesi"** notu yazılır.
- **Bağsız** konuşmacılar eski davranışla ayrı satır kalır.
- Kişi kaydı silinirse **ses, metin ve yerel konuşmacı etiketleri KORUNUR**;
  yalnız eşleştirme kaldırılır.

### DEĞİŞMEZ KURALLAR

1. **Bu bir kimlik tespiti değildir.** Eşleştirme **uzman kanaatidir**; uygulama
   ses biyometrisiyle kimlik doğrulamaz. Rapor açıklaması bunu yazar.
2. **Yerel kodlar ayrı kalır.** Bir kayıttaki `S1` ile başka kayıttaki `S1`
   otomatik olarak aynı kişi sayılmaz. Dosya geneli kişi kodu **K1**'dir.
3. **Ad benzerliğiyle otomatik birleştirme YOK.** Yalnız açık seçim bağlar.
4. **Silme veri silmez:** kişi kaydı silinince yalnız `personId` bağları
   temizlenir.
5. **Birleştirme sessiz ezmez:** dosya geneli kişi alanları boşsa doldurulur;
   iki farklı dolu değer **çakışma** olarak bildirilir. Aynı konuşmacı iki ayrı
   kişiye bağlıysa `speaker-person` çakışması çıkar.
6. Önizleme (`compareCases`) birleştirmeyle **aynı** kuralı kullanır.

### Ölçüm (gerçek Chromium + CDP)

| Adım | Sonuç |
|---|---|
| m1'de ＋ Yeni kişi | **K1 · Kiracı**, “1 kayıt: a.wav (S1)” |
| m2'yi K1'e bağla | “2 kayıt: a.wav (S1) · b.wav (S1)” |
| Rapor | **tek** `K1 · Kiracı` satırı; `a.wav` ve `b.wav` aynı satırda; “uzman eşleştirmesi” |
| m2 bağını kes | m2 ayrı satır; K1 satırında yalnız a.wav |
| Kişiyi sil | `K1` satırı **kalktı**; yerel etiketler/metinler korundu |
| 1440 / 900 / 360 | kişi paneli taşma **0**, kırpılan **0** |
| JS hatası | **0** |

**KORUYAN TEST:** `sema` [3g] (17) + `birim` [76] (9) + `rapor` Senaryo 13 (8) +
`tasarim` [2be] (8).

### Bilinen sınırlar (hata değil)

- Eşleştirme **uzman beyanıdır**; otomatik doğrulanmaz.
- Aynı kişi farklı kayıtlarda farklı **rol/cinsiyet** ile işaretlenmişse kişi
  kaydındaki değer kullanılır; çelişki birleştirmede çakışma olarak bildirilir.
- Eski kayıtlarda dosya geneli kişi yoktur; istenirse sonradan bağlanır.
- Perde kayıt başına ölçülür; kişi satırında kayıt adıyla listelenir.

## v2.204 — Sınıflandırma/rol seçenekleri tek kaynakta

Kullanıcı: *"Sınıflandırma/rol seçeneklerini de aynı desene taşı."* v2.203'te
gözlem bayrakları için kurulan `OBS_DEFS` + `defineOptions` deseni, sabit
seçenek listelerine uygulandı.

### Ne yapıldı

Şu listeler artık **`*_DEFS` tek kaynağından** türetilir:

| Defs | Türetilenler |
|---|---|
| `CASE_STATUS_DEFS` | `CASE_STATUS`, `CASE_STATUS_LABEL` |
| `MATERIAL_STATUS_DEFS` | `MATERIAL_STATUS`, `STATUS_LABEL` |
| `REVIEW_DEFS` | `REVIEW_STATE`, `REVIEW_LABEL`, `REVIEW_SHORT`, `REVIEW_HINT`, `REVIEW_TONE` |
| `SPEAKER_ROLE_DEFS` | `SPEAKER_ROLE`, `SPEAKER_ROLE_LABEL` |
| `SPEAKER_GENDER_DEFS` | `SPEAKER_GENDER`, `SPEAKER_GENDER_LABEL` |
| `MEDIUM_TYPE_DEFS` | `MEDIUM_TYPE`, `MEDIUM_TYPE_LABEL` |
| `TEAM_ROLE_DEFS` | `TEAM_ROLE`, `TEAM_ROLE_LABEL`, `SECOND_EYES_ROLES`, `APPROVER_ROLES` |

- `defineOptions(defs)` artık `byKey` de döndürür (tone gibi tanıma özgü alan).
- Rol yetkileri ayrı liste değil, `TEAM_ROLE_DEFS` bayrakları
  (`approver`, `secondEyes`) ile tanımlanır.
- Uygulamadaki kopyalar kaldırıldı: `REVIEW_SHORT_LABEL`, `badgeFor` metinleri,
  `SEG_FILTERS` kontrol etiketleri artık schema'dan gelir.
- **Görünür davranış değişmedi**: aynı kodlar, aynı sıra, aynı etiketler.

### Neden önemli

Yeni bir rol/cinsiyet/ortam/durum seçeneği eklemek için artık ilgili
`*_DEFS` listesine bir satır eklenir; `*_KEYS`, `*_LABEL`, seçenek listeleri,
rozet/filtre etiketleri ve testler buradan beslenir. Ayrı haritaları elle
güncellemek gerekmez.

### Doğrulama

- `bash tools/test.sh` → **1096 birim + 465 şema** + rapor/sürüm/tasarım,
  hepsi yeşil.
- `sema` [3f] (41 kontrol): her `*_DEFS` benzersiz, anahtar/etiket birebir,
  `REVIEW_SHORT`/`REVIEW_TONE`, rol yetkileri türetilmiş, ortam etiketi göçü.
- `tasarim` [2bd] (13 kontrol): kopya etiket kalmadı, rozet/filtre tek kaynak.
- Rapor tutarlılığı ve tarayıcı davranışı değişmedi.

Ayrıntı ve kalan alan aileleri: [`docs/ALAN_SISTEMI.md`](docs/ALAN_SISTEMI.md).

## v2.203 — Alan tanımlama sistemi ve iki yeni gözlem işareti

Kullanıcı: *"Yeni gözlem seçenekleri, değerlendirme alanları, kategoriler, rapor
başlıkları eklemek istediğimde schema.js, app.js, raporlar, testler ve belgeler
arasında elle çok sayıda değişiklik yapmak zorunda kalmamalıyım."*

### Ne yapıldı

Gözlem bayrakları **tek tanım noktasına** taşındı:

```js
// schema.js
export const OBS_DEFS = [
  { key: 'noise', label: 'arka plan gürültüsü', short: 'gürültü', hint: '…' },
  …
];
```

`defineOptions(defs)` bu listeden `OBS_KEYS`, `OBS_LABEL`, `OBS_SHORT`,
`OBS_HINT` ve `emptyObs()` üretir. Şunlar artık **elle kopyalanmaz**:

- arayüz gözlem düğmeleri (`OBS_DEFS.map`),
- rapor GÖZLEM etiketleri (`OBS_LABEL`),
- yardım listesi (`#obsHelpList`, çalışma anında doldurulur),
- `emptySegment` varsayılanı,
- `normalizeSegment` tamamlaması,
- gözlem sayacı,
- testler.

**Yeni bir gözlem bayrağı eklemek için yalnız `OBS_DEFS`'e bir satır** eklenir.

### Yeni işaretler

- **telefon görüşmesi** (`phone`) — teslim ortamı "Telefon"dan ayrıdır.
- **sessizlik (konuşma yok)** (`noSpeech`) — **ölçülen** sessizlik oranından
  (`s.silence`) ayrıdır; etiket bunu açıkça söyler.

### Geriye / ileriye uyumluluk

- Eski kayıtta eksik bilinen anahtar `false` olur; veri kaybı yok.
- `normalizeSegment` artık **bilinmeyen anahtarı silmez**; ileri sürümün bayrağı
  kaydetmede korunur. Rapor ve sayaç yalnız **bilinen** anahtarları basar/sayar.
- `mergeCases` gözlemleri **OR**'lar; gelen eklemeler `applied` günlüğüne yazılır.
  (Önceden `ts.obs` hiç okunmuyordu → sessiz kayıp.)
- Eklemeli alan olduğu için `SCHEMA_VERSION` artırılmadı.

### Dar ekran

6 düğme 360 px'te 4 satıra çıkıp metni eziyordu. ≤600 px'te tek **Gözlem**
düğmesi aynı düğmeleri açılır panelde gösterir; geniş ekranda düğmeler görünür.

**Ölçüm (gerçek Chromium + CDP):**

| Genişlik | Alt şerit | Düğmeler | Kırpılan |
|---|---|---|---|
| 1440 / 900 | **30 px**, tek satır | 6 görünür | 0 |
| 360 | **31 px**, "Gözlem" düğmesi | panelde 6, 2 satır | 0 |

Rapor GÖZLEM hücresi: `telefon görüşmesi, sessizlik (konuşma yok)`; bilinmeyen
`futureFlag` **basılmadı**; yardım listesi 6 işareti gösterdi; JS hatası **0**.

**KORUYAN TEST:** `sema` [3e] (16) + `birim` [75] (7) + `rapor` Senaryo 6 +
`tasarim` [2bc] (11).

Ayrıntılı desen, sınırlar ve diğer alan aileleri için kademeli plan:
[`docs/ALAN_SISTEMI.md`](docs/ALAN_SISTEMI.md).

### Bilinen sınır

v2.203 **öncesi** bir uygulama, yeni paketi açıp kaydederse bilinmeyen gözlem
anahtarlarını hâlâ siler. Yeni işaretleri içeren paketler eski sürümle
paylaşılmamalıdır; bu geriye dönük düzeltilemez.

## v2.202 — Rapora "Okuma metni"

Kullanıcı: *"Paragraf görünümünü rapora da koyalım; kanıt tablosu değişmesin."*
`paragraphGroups` çıktısı artık **her kayıt için** rapora ayrı bir **"Okuma
metni"** alt bölümü olarak ekleniyor.

### KULLANICI NE GÖRECEK

- Raporun **5.1** bölümünde, ayrıntılı (zaman damgalı) kanıt tablosundan
  **sonra** **"Okuma metni"** gelir: aynı konuşmacının ardışık bölümleri tek
  paragraf olarak okunur.
- Her paragrafın başında **konuşmacı kodu/etiketi · zaman aralığı · bölüm
  sayısı** yazar; kontrol bekleyen grupta **"kontrol bekliyor"** görünür.
- **Kanıt tablosu ve cümle zamanları değişmez.** Okuma metni türetilmiş,
  salt okunur bir sunumdur.
- HTML önizleme, DOCX ve UDF **aynı metni** üretir.

### Teknik

- `readingGroupsFor(m)` — `paragraphGroups` + `paragraphSpeakerLabel` + `tcRange`;
  `paragraphViewText` de aynı kaynağı kullanır.
- `REPORT_TEXT.readingHeading` / `readingIntro`.
- Üç oluşturucuda da (HTML/DOCX/UDF) kanıt tablosundan sonra eklenir.
- `m.segments`e dokunulmaz; `paragraphize` yok.

**Ölçüm:** üç çıktıda da başlık, açıklama, "merhaba dünya", "2 bölüm" ve kanıt
tablosu başlığı var (Senaryo 12). `birim` [74] (11), `tasarim` [2bb] (6).

**KORUYAN TEST:** `rapor` Senaryo 12 + `birim` [74] + `tasarim` [2bb].

## v2.201 — Rapor hazırlığı: zaman sayacı kayıt başına

v2.200 ölçümünde bulunan hata. Çok kayıtlı dosyada **Rapor hazırlığı**
kartındaki "Zaman sorunu" sayısı, tüm kayıtların bölümlerini **tek zaman
çizgisi** gibi sayıyordu. Her kayıt 0'dan başladığı için aralarında olmayan
"çakışma" üretiliyordu (ölçüm: iki geçerli kayıt → 4 zaman sorunu).

### KULLANICI NE GÖRECEK

- Hazırlık kartındaki **"Zaman sorunu olan bölüm"** sayısı artık **kayıt
  başına** hesaplanır; ses görünümündeki **Zaman sorunları** filtresiyle
  **aynı** sayıyı gösterir.
- Aynı kayıt içindeki **gerçek** çakışma yine iki tarafıyla görünür (2).
- İki ayrı kayıt da 0'dan başlasa da artık "çakışma" sayılmaz.

### Teknik

- `reportReadiness` → `materials.reduce((n,m)=>n+segmentTimeIssueIndexes(m.segments||[]).size,0)`.
- Kayıtların zaman çizgileri ayrıdır; düzleştirilmiş (`flatMap`) sayım yanlıştı.
- `segCounts(m).time` (filtre) ile aynı kural.

**Ölçüm (gerçek Chromium + CDP):** m1 (0–10, 10–20), m2 (0–10, 10–20), m3
(0–10, 5–15) → hazırlık **"2 Zaman sorunu"** (yalnız m3'ün iki tarafı);
m1'de zaman çipi **yok**, m3'te **"Zaman sorunları 2"** ve filtre **2 satır**;
JS hatası 0.

**KORUYAN TEST:** `birim` [73] (5 kontrol) + `tasarim` [2ba] (3).

## v2.200 — 45 saniye üstü bölüm uyarısı

Kullanıcı: *"Birleştirme sonucu çok uzun olursa uyarsın."* Standart:
**1–3 cümle veya 15–30 sn**, üst sınır **45 sn**.

### KULLANICI NE GÖRECEK

- Birleştirme sonucu **45 sn**'yi aşarsa işlem **engellenmez**; uyarı çıkar.
- Uyarı üç yerde **kalıcı** görünür: liste satırında **⏱**, Durum satırında
  **"Uzun bölüm 01:12 — 45 sn üstü"** çipi, raporda **"Rapor öncesi kontrol"**
  satırı (N bölüm 45 sn üstünde).
- **Rapor hazırlığı** kartında **"45 sn üstü bölüm"** maddesi; tıklayınca ses
  görünümü açılır.
- Gerekirse bölüm **Böl** ile ikiye ayrılır; veri değişmez.

### Teknik

- `segmentLengthInfo(seconds)` saf fonksiyon: `SEG_LENGTH = {targetMaxSec:30,
  hardMaxSec:45}`. `>45` → `level:'long'`, metin ve `short` (01:12).
- `mergeSegmentWithNext` sonunda uyarı: `showToast(..., true)` (role=alert).
  **Erken `return` YOK**; birleştirme engellenmez.
- `segItemHtml` ⏱ rozeti; `statusRowHtml` kalıcı çip; `reportReadiness`
  `longSegments` maddesi; `renderReport` uyarı satırı.
- Toast kaybolsa da durum satırda/raporda kalır (v2.158 dersi).

**Ölçüm (gerçek Chromium + CDP):** iki bölüm birleştirildi → 72 sn; satırda ⏱,
Durum'da "Uzun bölüm 01:12 — 45 sn üstü", raporda "1 bölüm 45 sn üstünde (en
uzun 01:12)"; veri korundu (bölüm sayısı 2→1), JS hatası 0. 44 sn'lik birleştirme
uyarı üretmedi.

**KORUYAN TEST:** `birim` [72] (15 kontrol) + `tasarim` [2az] (8).

## v2.199 — Dar ekranda karar çubuğu (Kontrol + ↓)

Kullanıcı: *"≤900 px'te Dinle/Kontrol ekran dışında; karar için kaydırmak
gerekiyor."* Ölçüm (v2.198, 900×900): ayrıntı başlığı **y=1112** (ekran
dışında); yapışkan çubukta **Kontrol seçicisi yoktu**.

### KULLANICI NE GÖRECEK

- ≤900 px'te kartın altındaki yapışkan çubukta artık **Kontrol** seçicisi var:
  **▶ Dinle · Kontrol · ↑/↓ · ✓ Onayla**.
- Dinledikten sonra **Onaylandı / Anlaşılmadı / Yeniden dinle / Belirsiz**
  seçimi kaydırmadan yapılır; **↓** ile sonraki bölüme geçilir.
- Çubuk sığmazsa **alt satıra sarar**; hiçbir düğme gizlenmez.
- "Bekleyen" filtresinde bir bölümü onaylayınca satır **listeden düşer** ve
  başlıktaki seçici **anında** güncellenir (önceden satır kalıyor, başlık eski
  değeri gösteriyordu).

### Teknik

- `narrowBarHtml` → Kontrol seçicisi (`data-key="review"`), kısa etiketler
  (`reviewSelectOptions(rev, true)`). Ayrıntı başlığı tam etiketleri kullanır;
  ikisi **aynı kaynak**.
- Karar **tek kapıdan**: `applyReviewChoice(m, i, el.value)`. Böylece ikinci göz
  koruması, "Bekleyen" filtresinden düşme, ayrıntı paneli ve çubuk aynı anda
  tazelenir.
- `flex-wrap: wrap` (kırpma yasak).
- Bildirim çubuğun **gerçek** yüksekliğinin üstünde: `--narrow-bar-h`
  (`syncNarrowBarHeight` + `ResizeObserver`). Sabit 66 px 360 px'te yetmiyordu.

**Ölçüm (gerçek Chromium + CDP, 900/760/600/480/360/320):**

| Genişlik | Çubuk | Kırpılan | Toast çakışması |
|---|---|---|---|
| 900/760/600 | 54 px, tek satır | 0 | yok (20 px boşluk) |
| 480/360 | 100 px, iki satır | 0 | yok (20 px) |
| 320 | 146 px, üç satır | 0 | yok (18 px) |

Akış (360 px): Kontrol'den **Anlaşılmadı** → satır `st-inaudible`, başlık ve
çubuk aynı; "Bekleyen" filtresinde **↓** → sonraki; **Onaylandı** → satır
listeden düştü (9 → 8); **✓ Onayla** → sonraki bölüme geçti. JS hatası **0**.

**KORUYAN TEST:** `birim` [71] (13 kontrol) + `tasarim` [2ay] (7) + [2ac]
(güncellendi).

## v2.198 — Birleştirme adayı (⇄ rozet + filtre)

Kullanıcı: *"Birleştirilecek gibi bir şey koysak."*

Bölüm listesinde birleştirmeye **uygun görünen** satırlar **⇄** rozetiyle
işaretlenir ve araç çubuğunda **Birleştirme adayı** filtresi görünür.

**Aday ölçütü — uydurma skor YOK, yalnız gözlemlenebilir işaretler:**

- aynı konuşmacı (birleştirme zaten farklı konuşmacıyı reddeder),
- bölüm kısa: **< 2 sn VEYA < 5 kelime**,
- cümle sonu noktalaması yok (`. ! ? …`),
- sonraki bölümle boşluk **≤ 0,5 sn**.

**Otomatik birleştirme YOK.** Rozet yalnız işarettir; tıklanınca bir şey
birleştirmez. Birleştirme ⋮ menüsünden, **M** tuşundan veya sürükleyerek
yapılır; kararı bilirkişi verir.

**Onaylı bölüm aday gösterilmez:** birleştirme onayı "Kontrol bekliyor"a
düşürür; sessiz onay kaybı olmasın diye denetlenmiş bölüm rozet almaz.

**Boşalan filtre:** aday sayısı sıfıra düşünce çip kalkar ve liste
kendiliğinden **Tümü**'ye döner (çipi olmayan bir filtrede kalmak listeyi boş
gösteriyordu).

### KULLANICI NE GÖRECEK

- Birleştirilmesi gereken kısa/yarım cümle parçaları listede **⇄** ile görünür.
- Araç çubuğunda **Birleştirme adayı N** çipi; tıklayınca yalnız adaylar listelenir.
- Hiçbir şey kendiliğinden birleşmez; veri değişmez.

**KORUYAN TEST:** `birim` [70] (47 kontrol): eşikler, cümle sonu, konuşmacı,
boşluk/çakışma, onaylı bölüm, tek kaynak sayaç/filtre/çip, 5 tuşu kararı, veri
değişmezliği. `tasarim` [2ax] (5 kontrol).

### Düzeltme — 5 tuşu (aynı sürüm, yeni commit)

Kullanıcı **5 ve 8**'i 1–4 gibi bir "karar" kısayolu sandı; 5'e basınca
birleştirme rozeti konacağını düşündü. **Rozet otomatik hesaplanır; tuşla
konmaz.**

- **5 = "Birleştirme adayı" filtresini aç/kapa.** Veri **DEĞİŞTİRMEZ**; yalnız
  adayları gösterir. Akış: **5 → adaylar → M (birleştir) → 5 (Tümü)**.
- **Aday yoksa filtre açılmaz:** boş liste "veri gitti" izlenimi verir; neden
  aday olmadığı ölçütle birlikte söylenir.
- **6–9 (ve 8) tanımlı değildir.** Birleştirme kısayolu **M**'dir; uydurma tuş
  eklenmez.
- Ölçüm (gerçek Chromium): 5 → **5 satır** (hepsi aday), tekrar 5 → **10 satır**;
  aday yokken 5 → **filtre değişmedi + açıklama**; 8 → **değişiklik yok**;
  JS hatası **0**.

## v2.197 — Belirsiz okuma rapor hücresi kısaldı

Kullanıcı: *"Belirsiz harika olmuş ama rapor aynı böyle mi yazacağız, çok uzun
değil mi?"*

Rapor hücresinde **"Belirsiz okuma — Belirsiz:"** tekrarı vardı. Artık:

```
Belirsiz okuma: "geldi" / "kaldı" (seçilen: geldi)
```

İki okuma ve seçim **korunur**; belirsizlik gizlenmez. Yalnız yinelenen etiket
kaldırıldı.

**KORUYAN TEST:** `birim` [43] (hücrede "Belirsiz okuma" tek kez, "—" yok,
iki okuma korunur).

## v2.196 — Hızlı karar: Kontrol Dinle yanında, 1/2/3/4 kısayolları

Kullanıcı: *"Dinle → Kontrol → en sola dön turu yavaş. Kontrol'ü Play'in yanına
koysak? Ritmi kısaltabilir miyiz?"*

### KULLANICI NE GÖRECEK

- **Kontrol seçicisi artık Dinle düğmesinin yanında** (Konuşmacı'nın önünde).
- **1/2/3/4 kısayolları:** 1 onay · 2 anlaşılmadı · 3 yeniden dinle ·
  4 belirsiz. Metin alanında yazarken çalışmaz.
- Önerilen ritim yardımda: **bölüm seç → Y (Dinle) → 1–4 karar → ↓ sonraki**.
- İkinci göz kuralı korunur: yardımcı `1` ile onaylayamaz.

### ÖLÇÜM (gerçek Chromium, 1440×900)

| Tur | Önce | Sonra |
|---|---|---|
| Liste → Dinle | 439 px | 439 px |
| Dinle → Kontrol | 373 px | **159 px** |
| Kontrol → sonraki (↓) | 426 px | **212 px** |
| **Tur toplamı (fare)** | **1.624 px** | **1.196 px** (−%26) |
| Klavye turu | — | **0 px** (↓ · Y · 1 · ↓) |

Kısayol testi: `1` → Onaylandı, `3` → Yeniden dinle; metin alanında `1`
kontrolü DEĞİŞTİRMEDİ.

### KORUYAN TEST

`tasarim` [2av] (Kontrol Dinle yanında, 1/2/3/4, tek kapı, ikinci göz, ipucu).

## v2.195 — Paragraf görünümü artık salt okunur

Kullanıcı: *"Salt-okunur paragraf görünümü yapalım. ¶ bölümleri değiştiriyordu;
cümle zamanları kayboluyordu."*

### KULLANICI NE GÖRECEK

- **¶ düğmesi artık veriyi değiştirmiyor.** Aynı konuşmacının ardışık
  bölümlerini **okuma paragrafı** olarak gösteren **salt-okunur** bir pencere
  açar.
- **Kanıt tablosu ve cümle zamanları aynen kalır.** Bölüm sayısı değişmez
  (ölçüm: 6 → 6).
- Her paragrafta **konuşmacı · zaman aralığı · bölüm sayısı** ve metin görünür;
  "kontrol bekliyor" uyarısı taşınır.
- **Panoya kopyala** ile okuma metni alınabilir.
- Pencere içinde standart yazar: **1–3 cümle veya 15–30 sn**.
- Hızlı ekle etiketlerine **`[telefonda konuşma]`** eklendi.

### ÖLÇÜM (gerçek Chromium)

| Konu | Sonuç |
|---|---|
| Bölüm sayısı (¶ öncesi → sonrası) | 6 → **6** (değişmedi) |
| Paragraf grubu | **3** (S1×2, S2×3, S1×1) |
| Grup metni | bölüm metinleri boşlukla birleşik |
| Kopyalama metni | başlık + metin, doğru |
| JS hatası | 0 |

### KORUYAN TEST

`birim` [7b]/[28] (salt-okunur; segment/asrText değişmez), `sema` (¶ yıkıcı
değil), `tasarim` [2au] (¶ → görünüm, diyalog, standart metni, telefon etiketi).

## v2.194 — Yeniden çözümleme sonrası liste başa dönmüyor

Kullanıcı: *"Çözümleye bastığımda bölüm listesi yenileniyor; bu kullanım
deneyimini etkiliyor."*

Bir bölümü **yeniden çözümle** (`↻ Bu aralığı çözümle`) kartı yeniden
kuruyordu (`renderAudioList`), bu da liste/detay kaydırmasını sıfırlıyordu.
Artık işlem öncesi kaydırma yakalanır, işlem sonrası geri yüklenir; yeniden
çözümlenen bölüm görünür kalır. (v2.193 birleştirme/bölme/paragraf için aynı
korumayı getirmişti.)

**KORUYAN TEST:** `tasarim` [2at].

## v2.193 — Birleştirme sonrası kaydırma korunur; listede metin önizlemesi

Kullanıcı: *"Birleştirme yaptıktan sonra sayfa başa geliyor; kullanım deneyimini
etkiliyor. Ayrıca daha önce listeden kaldırdığımız, yalnız ipucunda gösterdiğimiz
metin başlıkları birleştirme/bölme sırasında satırları ayırt etmeyi
zorlaştırıyor; geri getirilmesini öneriyorum."*

### KULLANICI NE GÖRECEK

- Birleştirme/bölme/paragraf sonrası **liste konumu korunur**; sayfa başa dönmez.
  Birleşen satır **görünür kalır**.
- Liste satırında **tek satır metin önizlemesi** geri geldi; tam metin satır
  ipucunda ve editörde. Boş metin "—" ile gösterilir.
- Satır yüksekliği 34 → **50 px** (üstte numara/zaman/rozetler, altta metin).

### ÖLÇÜM (gerçek Chromium, 30 bölüm)

| Konu | Sonuç |
|---|---|
| Liste kaydırma (birleştirme öncesi → sonrası) | 800 → **704** (başa dönme yok; birleşen satır görünür) |
| Sayfa / ana alan kaydırma | 0 → **0** |
| Satır | **50 px**, metin önizlemesi var, tam metin ipucunda |
| JS hatası | 0 |

### KORUYAN TEST

`tasarim` [2ap] (metin önizlemesi, iki satırlı ızgara) + [2as] (kaydırma
yakalanır/geri yüklenir, `scrollIntoView` kullanılmaz).

## v2.192 — Konuşmacı silme ve rapor filtresi

Kullanıcı: *"Bölümde konuşmacı seçilmedi yapıyorum ama raporda ve ses dosyasında
yine görünüyor; bunları silemiyor muyuz?"*

### NEDEN OLDU

Uygulama konuşmacı **kimliği tespit etmez**; yalnız bölümlerdeki konuşmacı
etiketlerini listeler. `K`, `E`, `S1`, `S2` gibi kayıtlar **eski/elle girilmiş
etiketlerden** gelir; `Konuşmacı 1` elle bölüm eklenince oluşur. Bölümde
"seçilmedi" yapılınca yalnız **atama** kalkıyordu; **kayıt silinmiyordu** ve
rapor tüm kayıtları listeliyordu.

### KULLANICI NE GÖRECEK

- Hiçbir bölüme atanmamış konuşmacı **raporda görünmez** (özet sayacı da saymaz).
- Konuşmacı panelinde her kartta **Sil**; ayrıca **"Kullanılmayanları temizle (N)"**.
- Silme **ses ve metni silmez**; atanmış bölümler "Konuşmacı seçilmedi" olur.
- Panelde *"hiçbir bölüme atanmamış — raporda görünmez"* uyarısı görünür.

### ÖLÇÜM (gerçek Chromium)

| Adım | Sonuç |
|---|---|
| 5 atanmamış konuşmacı | raporda **0 satır** (yalnız "konuşmacı etiketi girilmedi"), panelde 5 kart + temizle (5) |
| Tek tek **Sil** | 5 → **4** kart |
| **Kullanılmayanları temizle** | 4 → **0** kart |
| Bölüm metinleri | **korundu** |
| JS hatası | 0 |

### KORUYAN TEST

`birim` [69] (isim/kimlik eşleşmesi, rapor filtresi, silme atamaları temizler,
metin korunur) + `tasarim` [2ar] (Sil/Temizle düğmeleri).

## v2.191 — Sağ panel kaymıyor; metin kendi içinde kayıyor

Kullanıcı: *"E alan çok yüksek olmamış mı? Scroll çıkıyor gereksiz yere;
birazcık daha wave yukarıda duramaz mı ya da eşit? Bölüm listesiyle çalışırken
sağ menüyü scroll yapmayalım."*

### KULLANICI NE GÖRECEK

- Sağdaki bölüm paneli artık **kaymıyor**; dalga bölümü **her zaman görünür**.
- Metin alanı kalan yüksekliği alır (en az **120 px**) ve **kendi içinde kayar**.
  Uzun metinde okunan kelime vurgusu, metin kaydırıldığında da **hizalı** kalır.
- Dalga bölümü metnin hemen altında; gereksiz panel kaydırması yok.

### ÖLÇÜM (gerçek Chromium + gerçek WAV)

| Genişlik | Panel (görünen/kaydırılan) | Panel kayması | Metin (görünen/içerik) |
|---|---|---|---|
| 1440 | 577 / 577 | **yok** | 178 / 468 px |
| 1280 | 552 / 552 | **yok** | 120 / 563 px |
| 1100 | 509 / 509 | **yok** | 120 / 778 px |
| 900 | 527 / 527 | **yok** | 120 / 444 px |
| 760 | 563 / 563 | **yok** | 120 / 540 px |

Vurgu eşlemesi: textarea `scrollTop` 120 → katman `scrollTop` 120; yükseklik
142 = 142. JS hatası **0**.

### KORUYAN TEST

`tasarim` [2aq]/[2u]/[2al]/[2v] (gövde `flex:1` + `min-height:0`, metin 120 px,
kendi içinde kayar, satır içi yükseklik dayatılmaz).

## v2.190 — Dalga menüleri görünür; metin dalganın üstüne binmiyor

Kullanıcı: *"Yalnız wave kısmındaki menüler kaybolmuş, kontrol et; her şey
görünüyor mu, orası biraz karışmış."*

### KULLANICI NE GÖRECEK

- Dalga çubuğundaki **Dalga / Spek / İkisi** düğmeleri artık **kaybolmuyor**;
  sığmayınca **alt satıra iniyor**. (Önce gizli yatay kaydırma vardı; 1100 px'te
  bu üç düğme görünmüyordu.)
- Uzun metin artık **dalga araçlarının üstüne binmiyor**; metin bittikten sonra
  dalga bölümü geliyor, panel kaydırılarak erişiliyor.
- Dalga ipucu kısaldı: *"Tıkla: git · Sürükle: sınır · Tekerlek: zoom"*; tam
  açıklama fare ipucunda. Kesilme yok.
- "🔁 Döngü" ve "✂ Böl" düğmelerindeki **görünmeyen simgeler** kaldırıldı;
  metin sade: **Döngü**, **Böl**.

### ÖLÇÜM

| Konu | Önce (v2.189) | Sonra (v2.190) |
|---|---|---|
| Metin ↔ dalga | **çakışıyor** (metin 745, dalga 595) | **ayrı** (metin 751, dalga 759) |
| 1100 px araç satırı | 470 / 372, **3 düğme gizli** | 372 / 372, **gizli 0** |
| 600 px | "İkisi" gizli | **gizli 0** |
| İpucu | 1280/760/600'de kesik | **kesik 0** |
| Yatay taşma | — | **0** (1440→600) |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`tasarim` [2aq] (gövde içeriğe göre büyür, araç satırı sarar, ipucu tam metni
`title` taşır) + güncellenen araç satırı kontrolü.

## v2.189 — Zamanlar dalganın üstünde

Kullanıcı: *"sd-canvas-wrap kısmına da üzerine gelecek şekilde hafif şeffaf sol
alt taraf time-input (Başlangıç — ortaya Süre — sağ alt Bitiş time-input)
taşı."*

### KULLANICI NE GÖRECEK

- **Başlangıç, Süre ve Bitiş** artık dalga/spektrogram kutusunun **altında
  yarı saydam bir şeritte**: solda **Başlangıç**, ortada **Süre**, sağda
  **Bitiş**. Ayrı satır kalktığı için ~**44 px** dikey yer kazanılır.
- Şerit **hafif şeffaftır** ve **tıklamayı geçirir**; yalnız zaman kutuları
  tıklamayı yakalar. Dalga sürükleme, zoom ve spektrogram tıklaması bozulmaz.

### ÖLÇÜM (gerçek Chromium + gerçek WAV)

| Konu | Sonuç |
|---|---|
| Şerit konumu | `.sd-canvas-wrap` içinde, `position:absolute`, alt kenardan 6 px |
| Yükseklik | **46 px** (kanvas 160 px), 1440→600 px aynı |
| Sıra | Başlangıç < Süre < Bitiş (sol → orta → sağ) |
| Zemin | `color-mix(surface 76%)` — temaya bağlı yarı saydam |
| Tıklama | şerit zemini `pointer-events:none` → altındaki tuval; kutular `auto` |
| Kırpılma / yatay taşma | **0 / 0** (1440/1280/1100/900/760/600) |
| JS hatası | 0 |

### KORUYAN TEST

`tasarim` [2u] (şerit kanvas içinde, yarı saydam, tıklamayı geçirir, sıra
başlangıç→süre→bitiş) + [2t] (ms'li değerler korunur).

## v2.188 — Metin kutusu: tek kutu, dört köşe

Kullanıcı: *"Vurguyu text box içinde yaptır; quick-insert'leri buton olarak
yapmayalım, textbox alanına koyalım; sd-obs'u text box içine sol alt köşeye
koy; model çıktısını sağ üst köşeye koy; Profil'i sil; 'Henüz çözümlenmedi'
kısmını Durum'a koy."*

### KULLANICI NE GÖRECEK

- **Okunan kelime artık metnin İÇİNDE vurgulanır.** Metnin üstündeki ayrı
  vurgu şeridi kaldırıldı; aynı metin iki yerde gösterilmiyor.
- **Gözlem işaretleri** (gürültü · üst üste · anlaşılmaz · müzik) **metin
  kutusunun ALT SOLUNDA.** Rapora aktarılan işaretler elin altında, yer
  kaplamıyor.
- **Hızlı ekle etiketleri tek düğmede:** "+ Hızlı ekle" → açılır menü (ALT SAĞ).
- **Modelin ham çıktısı metin kutusunun SAĞ ÜSTÜNDE:** "Model çıktısı" düğmesi
  → açılır kutu. Yalnız metinden farklıysa görünür.
- **Profil alanı kaldırıldı.** "Henüz çözümlenmedi" bilgisi **Durum** satırında.

### ÖLÇÜM (gerçek Chromium + gerçek WAV)

| Konu | Sonuç |
|---|---|
| Vurgu hizası | katman `scrollHeight` 611 = textarea 611; genişlik 582 = 582; kelime metnin içinde |
| Canlı vurgu (gerçek ses) | t=1,08 sn → "mi?" vurgulandı; t=1,73 → ikinci "Ali" |
| Uzun metin | textarea 587 px'e büyür (240 px'te kırpılmaz), panel kayar |
| Hızlı ekle menüsü | 340×64, tam görünür; etiket eklenince menü kapanır |
| Model çıktısı | düğme → kutu açılır/kapanır; durum çipi de açar |
| Genişlikler | 1440/1280/1100/900/760/600 → kırpılan 0, yatay taşma 0 |
| JS hatası | 0 |

### KORUYAN TEST

`birim` [68] (kelime konumu: sıralı arama, bulunamayan kelime null),
`tasarim` [2f]/[2s]/[2al]/[2am]/[2an]/[2ao] (vurgu katmanı ölçüleri, dört köşe
yerleşimi, ASR açılır kutusu, profil kaldırıldı).

## v2.187 — Liste sağa yaslı; "✓ Onayla" düğmesi kaldırıldı

Kullanıcı: *"Liste kocaman görünüyor; `st-approved` kısmını sağa yasasan daha
düzgün olmaz mı? Listede başka bir şey yazıyor muyuz, düzenli olsun. Ayrıca
detaydaki **Onayla** düğmesine gerek var mı? Zaten açılır listede bu seçenekler
var."*

### LİSTE: rozetler sağa yaslı, durum EN SAĞDA

| | Önce (v2.186) | Sonra (v2.187) |
|---|---|---|
| Rozet hizası | sola | **sağa** |
| Durum rozeti (`Bekliyor`/`Onaylandı`) | ilk sırada | **en sağda** (sağ kenardan 8 px) |
| Satır | 34 px | 34 px (değişmedi) |
| 1440 / 1280 / 1100 / 900 | 34 / 34 / 34 / 34 | **34 / 34 / 34 / 34** |

Satırda yalnız şunlar var: **numara · başlangıç–bitiş · (⚠) · (konuşmacı) ·
(öneri) · ⋮⋮ · ⋮ · durum**. Başka yazı yok; metin editörde.

### "✓ Onayla" düğmesi kaldırıldı

Onay **durum** değil **eylem**dir (sonraki bölüme geçer). Durum seçicide
(`Onaylandı`) var; eylem iki yerde kaldı:
- **Satır menüsü:** "✓ Onayla (sonrakine geç)" (⋮ veya sağ tık).
- **Enter** kısayolu.

Böylece başlıkta tekrar eden düğme yok. Başlık: `Bölüm X/N · ↑ ↓ ▶ Dinle ⏹ ·
Konuşmacı · Kontrol`.

### ÖLÇÜM

- Liste: 34 px (dört genişlikte), durum rozeti sağ kenardan **8 px**, kırpılma
  ve yatay taşma yok.
- Başlık: **78 px** (1440/1280'de iki satır — iki etiketli seçici + gezinme
  621 px'e sığmıyor), **42 px** (900'de tek satır).
- JS hatası: 0.

### KORUYAN TEST

`tasarim-testi` [2j] (durum en sağda + rozetler sağa yaslı), [2v]/[2ao] (onay
eylemi menüde ve Enter'da).

## v2.186 — Bölüm listesi tek satır; Teknik düğmesi kaldırıldı

Kullanıcı: *"Segment listesi dağınık görünüyor, iki satır mı tek satır mı belli
değil; tek satır yap, hepsini hizala, başlangıç ve bitişi yan yana koy. Bence
Teknik düğmesine de gerek kalmadı."*

### LİSTE: tek satır, hizalı

| | Önce (v2.185) | Sonra (v2.186) |
|---|---|---|
| Satır | 50 px (zaman iki satır) | **34 px, her genişlikte aynı** |
| Zaman | başlangıç üstte, → bitiş altta | **yan yana** `00:00:12 – 00:00:18` |
| Milisaniye | listede | **detayda** (düzenlenebilir girdiler) |
| Öncelik rozeti | satırda (sığmayınca satırı büyütüyordu) | **detayın durum satırında** çip |
| 1440 / 1280 / 1100 / 900 | 50 / 50 / 66 / 50 | **34 / 34 / 34 / 34** |

Dar listelerde ikincil öğeler çıkar (satır yine tek satır kalır): ≤1280
**konuşmacı rozeti** (satır ipucunda ve detayda var), 901–1200 **⋮ ve tutamak**
(sağ tık aynı menüyü açar). **Durum rozeti asla çıkmaz.**

### TEKNİK: düğme kalktı, analiz her zaman görünür

- **Teknik** düğmesi kaldırıldı; dalga/spektrogram + zamanlar + profil + ASR
  kökeni artık **her zaman** görünür.
- Sıra: **önce metin, sonra analiz** (yazma birincil iş).
- Metin alanı tabanı **260 px**; sığmazsa **panel kaydırır**.

**Dürüst bedel:** metin alanı 359 → **260 px** (−99) ve panel kaydırması
0 → **141 px**. Karşılığında analiz gizli kalmıyor ve tek düğme eksiliyor.
Düğme geri istenirse metin alanı yeniden 359 px olur.

### ÖLÇÜM

- Liste: 4 genişlikte **34 px**, kırpılma yok, yatay taşma yok.
- Detay (1440): başlık 77 · durum 28 · metin **260** · analiz 313 (altında) ·
  panel kaydırması 141 · kırpılma yok.
- 900 px: metin 180, analiz görünür, ana alan kaydırıyor.
- JS hatası: 0.

### KORUYAN TEST

`tasarim-testi` [2t] (yenilendi: tek satır + kısa saat + ms detayda), [2ap]
(ızgara 26/132), [2v] (Teknik düğmesi yok, bölüm her zaman görünür).

## v2.185 — Bölüm listesi dizin oldu (metin tek yerde)

Kullanıcı: *"Segmente neden metin gösteriyoruz? Neden bunu detayda da
gösteriyoruz? Segment kısmını biraz küçültürsün; yer yoksa hem orası
güzelleşir."*

Ölçüm (1440×900, v2.184): satır **74 px**; bölüm metni **hem listede hem
editörde** vardı. Aynı veriyi iki yerde göstermek hem yer kaplıyor hem bakım
yükü doğuruyordu (metin değişince iki yerin tutarlı kalması gerekir).

### KULLANICI NE GÖRECEK

- Bölüm listesi artık **dizin**: `numara · başlangıç–bitiş · durum rozetleri`
  (konuşmacı, öncelik, öneri). **Metin listede yok**; tek kaynak sağdaki
  editör. Metin, satırın **ipucunda** (fareyle üzerine gelince) görünür.
- Satır **74 → 50 px**; aynı yükseklikte **daha çok bölüm** görünür.
- Rozetler **görünür ve kırpılmaz** (v2.130 kuralı korunuyor).

### ÖLÇÜM

| | Önce (v2.184) | Sonra (v2.185) |
|---|---|---|
| Satır yüksekliği (1440) | 74 px | **50 px** (−%32) |
| Metin listede | var (tekrar) | **yok** |
| Metin ipucunda | yok | **var** |
| Rozetler (durum/konuşmacı/öncelik) | görünür | **görünür** |
| Rozet kırpılması | yok | **yok** |
| Yatay taşma | yok | **yok** |
| 900 px satır | 74 px | **50 px** |

Not: 1100 px'te rozetler iki satıra sarar (satır 66 px) — kırpma değil, sarma.

### KORUYAN TEST

`tasarim-testi` [2ap] (5 kontrol): satırda metin yok, metin ipucunda, ızgara
3 sütun, rozetler solda, rozet kutusu kırpmaz.

## v2.184 — Tek durum satırı: her zaman görünür, yeri sabit

Kullanıcı: *"gizli bir şey olmasın, yeri dursun, ne işe yaradığı ekranda yazsın."*

Ölçüm (1440×900, v2.183): aynı dikey alanda **üç ayrı şerit** vardı ve her biri
başka koşulda çıkıyordu: `sd-audio-state` (ses yok, 31 px), `sd-notes`
("anlamlı metin yok" / "model tekrarı" / sessizlik, 19 px), `asr-hint`
("model çıktısı farklı", 19 px). Üstelik `sd-notes` bazı bölümlerde **boş**
görünüyordu (v2.181'de "öncelik" ekrandan kaldırıldı ama koşulda sayılıyordu).

### KULLANICI NE GÖRECEK

- Bölüm başlığının altında **tek "Durum" satırı** var ve **her bölümde** duruyor.
  İçinde en az **"Ses: hazır"** (ya da **"Ses: yok — paketten yükle"**) çipi
  bulunur; sorun varsa yanına çipler eklenir: **Anlamlı metin yok**,
  **Model tekrarı**, **Sessizlik %N**, **Model çıktısı farklı — karşılaştır**
  (tıklanınca Teknik açılır).
- **Etiketler ekranda**: "Konuşmacı", "Kontrol" ve onay düğmesi **"✓ Onayla"**
  (yalnız ikon değil). Ne işe yaradığını görmek için fareyle üzerine gelmek
  gerekmez.
- Başlık **bilinçli iki satır**: 1) bölüm no · gezinme · ✓ Onayla · Teknik,
  2) Konuşmacı · Kontrol. Gizemli sarma/3. satır yok.

### ÖLÇÜM

| | Önce (v2.183) | Sonra (v2.184) |
|---|---|---|
| Durum satırı — normal | yok (0 px) | **28 px** |
| Durum satırı — ses yok | 31 px (ayrı şerit) | **28 px** (aynı satır) |
| Durum satırı — model farkı | 19 px (ayrı şerit) | **28 px** (aynı satır) |
| Boş şerit (artık) | olabiliyordu | **yok** |
| Başlık | 42 px | 77 px (etiketler görünür) |
| Metin alanı | 160 px | **359 px** |

**Dürüst değerlendirme:** üst bölge **büyüdü** (42 → 77 px) çünkü etiketler ve
"Onayla" yazısı geri geldi; karşılığında **hiçbir öğe gizlenmiyor** ve
**yerleşim zıplamıyor**. Kullanıcı bu turda alan yerine **açıklığı** seçti.

### KORUYAN TEST

`tasarim-testi` [2ai] (6 kontrol) — satır koşulsuz çizilir, eski üç şerit yok,
"Ses:" çipi var, yükseklik sabit; `birim` [64] — çip metni + ipucu.

## v2.183 — Başlıkta birleşik işlem satırı (üç düğme yerine seçici + ikon)

Ölçüm (1440×900): başlıkta **üç düğme** (Onayla / Yeniden dinle /
Anlaşılmadı) vardı ve **hemen altındaki Kontrol seçicisi** aynı işleri
yapıyordu; konuşmacı seçicisi de ayrı satırdaydı. Üst bölge **76 px** (1440) ve
**78 px** (900).

### KULLANICI NE GÖRECEK

- **Yeniden dinle** ve **Anlaşılmadı** düğmeleri kaldırıldı; bu durumlar
  **Kontrol** seçicisinde (Onaylandı / Anlaşılmadı / Yeniden dinle / Belirsiz).
- **Onayla** düğmesi ikon oldu: **✓** — ipucu "Onayla ve sonraki bölüme geç
  (Enter)"; Enter kısayolu aynı.
- **Konuşmacı** ve **Kontrol** seçicileri **başlıkta**, gezinmenin yanında.
  Etiketleri ipucu/ekran okuyucuda (yer kazanımı).
- **Profil** bilgisi **Teknik**'te (köken bilgisi).
- **Belirsiz okuma** paneli yalnız gerektiğinde çizilir (boş satır yok).

### ÖLÇÜM

| | Önce (v2.182) | Sonra (v2.183) |
|---|---|---|
| Üst bölge 1440 | 76 px | **42 px** |
| Üst bölge 1280 | 103 px | **79 px** |
| Üst bölge 1100 | 128 px | **73 px** |
| Üst bölge 900 | 78 px | **42 px** |
| Metin alanı | 160 px | 160 px (900'de 180) |
| Yatay taşma | yok | yok |

Seçici gerçekten çalışıyor (tarayıcı ölçümü): "Anlaşılmadı" → rozet +
`st-inaudible` + %100; "Onaylandı" → rozet + %100; onay ikonunun erişilebilir
adı var; JS hatası **0**.

### KORUYAN TEST

`tasarim-testi` [2ao] (6 kontrol).

## v2.182 — Dikey yer kazanımı: etiketler satır içi, "ses yok" tek satır

Ölçüm (1440×900, v2.181): `.sd-field` `flex-direction: column` olduğu için
"Konuşmacı"/"Kontrol" etiketleri seçimin **üstünde** duruyordu; her alan 57 px,
meta satırı **63 px**. "Ses yok" satırı uzun metinle **47 px** (2 satır).

### KULLANICI NE GÖRECEK

- Konuşmacı ve Kontrol **tek satırda**; değerler kendini anlatıyor
  ("S1 · Konuşmacı 1", "Kontrol bekliyor"). Görsel etiket kaldırıldı ama
  **`aria-label` + `title`** olarak korunuyor (ekran okuyucu ve fare ipucu).
- **Profil** kısa etiketiyle aynı satırda kalır.
- "Ses dosyası yok — paketten yükle" **tek satır**; tam açıklama ipucunda.
- **Metin alanı küçültülmedi**: 160 px = 6,7 satır.

### ÖLÇÜM

| | Önce (v2.181) | Sonra (v2.182) |
|---|---|---|
| Meta satırı | 63 px (2 satır) | **40 px (1 satır)** |
| "Ses yok" satırı | 47 px | **31 px** |
| Metin alanı | 160 px (6,7 satır) | 160 px (6,7 satır) |
| Teknik açık kaydırma | 84 px | **63 px** |
| 900 px | — | meta 40 px, yatay taşma yok |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`birim-testleri` [64] (kısa metin ≤ 40 karakter, ayrıntı ipucunda) ve
`tasarim-testi` [2am].

## v2.181 — ASR kökeni Teknik'te; metinde yalnız ince ipucu

Ölçüm (1440×900): "Otomatik çözümleme çıktısı (model … · tarih)" bloğu metin
alanının **üstündeydi**; notlarla birleşince metin bölgesini aşağı itiyor,
quick-insert'i görünür alandan çıkarabiliyordu. Köken bilgisi **analizdir**.

### KULLANICI NE GÖRECEK

- Metnin üstünde yalnız **tek satır ipucu**: *"Model çıktısı farklı —
  karşılaştır (Teknik)"*. Tıklayınca **Teknik** açılır ve **model adı + tarih +
  ham çıktı** görünür.
- Karşılaştırma bloğu artık **Teknik** panelinde (analiz bölgesi).
- Bölüm listesindeki **"Öncelik"** rozeti duruyor; notlardaki tekrar eden
  "öncelik" satırı kaldırıldı (aynı bilgi iki yerdeydi).

### ÖLÇÜM

| | Önce (v2.180) | Sonra (v2.181) |
|---|---|---|
| Metin üstünde köken bloğu | ~30 px katlanmış blok | **19 px tek satır ipucu** |
| Metin alanı | 371 px | **344 px** (ipucu görünürken) |
| Köken bloğu yeri | metin bölgesi | **Teknik** |
| İpucuna tıklama | — | Teknik açılır, blok açık, **panel içinde** |
| Notlarda "öncelik" | var (rozetle tekrar) | **yok**, rozet duruyor |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`tasarim-testi` [2an] (6 kontrol): köken bloğu Teknik'te, ipucu metinde,
notlarda öncelik yok, öncelik rozeti korunuyor, ipucu Teknik'i açıyor.

## v2.180 — Konuşmacı, kontrol ve gözlem artık her zaman görünür

Ölçüm (1440×900, v2.179): Teknik paneli açıkken **konuşmacı + kontrol y=822**,
**gözlem düğmeleri y=884**; panel 248–827 → **kaydırmadan erişilemiyordu**.
Oysa üçü de analiz değil: konuşmacı/kontrol **düzenleme bilgisi**, gözlem
**metne ilişkin işarettir**. Ayrıca notlar/ASR kökeni satırı çıkınca metin
bölgesi aşağı itiliyor, quick-insert görünmez olabiliyordu.

### KULLANICI NE GÖRECEK

- **Konuşmacı** ve **Kontrol** seçimleri başlığın hemen altında, **her zaman
  görünür** (Teknik kapalı ya da açık — fark etmez).
- **Gözlem düğmeleri** (gürültü / üst üste / anlaşılmaz / müzik) metnin
  altında, quick-insert ile aynı bölgede.
- **Teknik** artık yalnız analiz: dalga/spektrogram, zamanlar, ölçümler.

### ÖLÇÜM

| | Önce (v2.179) | Sonra (v2.180) |
|---|---|---|
| Konuşmacı/kontrol (Teknik açık) | y=822 — **panel dışında** | y=303 — **panel içinde** |
| Gözlem (Teknik açık) | y=884 — **panel dışında** | y=642 — **panel içinde** |
| quick-insert | görünür | görünür |
| Metin alanı | 160 px | 160 px (Teknik açık) / 371 px (kapalı) |
| Canlı vurgu | 48 px | 48 px |
| Panel kaydırması (Teknik açık) | 81 px | 55 px |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`tasarim-testi` [2am] (6 kontrol): konuşmacı/kontrol Teknik **dışında** (önce),
gözlem Teknik **dışında** ve quick-insert yanında; Teknik ipucu artık
konuşmacı/gözlem anmıyor.

## v2.179 — Bölüm detayı: canlı vurgu artık ezilmiyor

Ölçüm (1440×900): **Teknik** paneli açıkken (360 px) canlı vurgu şeridi
**48 → 14 px**'e, metin alanı **448 → 120 px**'e eziliyordu. Sebep: gövde ve
sağ sütun `min-height: 0` ile küçülebiliyor, metin alanının masaüstü tabanı
120 px'ti. Araya bir satır (notlar, "ses yok" uyarısı, öneri bandı veya ölçüm
sonucu) girdiğinde aynı ezilme oluyordu.

### KULLANICI NE GÖRECEK

- Canlı vurgu şeridi **her zaman 2 satır (48 px)**; Teknik açıkken de küçülmez.
- Metin alanı **en az 160 px**; içerik daha fazlaysa **panel kaydırır** —
  metin ve vurgu ezilmez.
- Notlar, "ses yok" uyarısı ve öneri bandı çıktığında düzen **zıplamaz**.

### ÖLÇÜM

| | Önce (v2.178) | Sonra (v2.179) |
|---|---|---|
| Vurgu şeridi (Teknik açık) | **14 px** (scroll 30 / görünen 12) | **48 px** |
| Metin alanı (Teknik açık) | **120 px** | **160 px** |
| Panel kaydırması | yok — çocuklar eziliyordu | **81 px** — panel kaydırıyor |
| 900 px | — | vurgu 48 · metin 180 |
| Kırpılma / yatay taşma | — | yok |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`tasarim-testi` [2al] (5 kontrol): vurgu şeridi `flex: 0 0 auto` + 2 satır
tabanı, metin alanı 160 px tabanı, gövde/sağ sütun alt sınırı.

## v2.178 — Sürükleyerek birleştirme (yalnız komşu, geri alınabilir)

Ölçüm: birleştirme **2 etkileşimdi** (⋮ → tık). Kullanıcı önerisi: listede iki
komşu satırı **sürükleyip bırakarak** birleştirmek.

### KULLANICI NE GÖRECEK

Her satırın rozet şeridinde **⋮⋮** tutamağı var. Tutamağı **komşu** satıra
sürükleyip bırakınca iki bölüm birleşir; hedef satır **kesikli çerçeveyle**
vurgulanır. Uzak satıra bırakma hiçbir şey yapmaz. Filtre "Tümü" değilse
sürükleme **kapalıdır** (filtreli listede komşu görünen satırlar gerçekte
komşu olmayabilir) ve nedeni söylenir. **M tuşu** ve **⋮ menüsü** aynen durur —
sürükleme yalnız hızlandırıcıdır.

### ÖLÇÜM

| | Önce (v2.177) | Sonra (v2.178) |
|---|---|---|
| Birleştirme | 2 etkileşim (⋮ → tık) | **1 sürükleme** (veya 2: ⋮ → tık) |
| Komşu olmayan hedef | — | **reddedilir** (vurgu yok, değişiklik yok) |
| Filtre "Tümü" değilken | — | **kapalı**, nedeni yazılır |
| Satır yüksekliği | 72 px | **74 px** (+2) |
| Kırpılma / yatay taşma | yok | yok |
| JS hatası | 0 | 0 |

Birleştirme kuralları v2.176'dan gelir: ham çıktı `mergedFrom`'da saklanır,
farklı konuşmacı ve ikinci göz reddedilir, delil günlüğüne yazılır ve Ctrl+Z ile
geri alınır.

### KORUYAN TEST

`tasarim-testi` [2aj] (9 kontrol): tutamak, filtre kilidi, komşu hedef, aynı
birleştirme fonksiyonu, klavye ve menü yolları korunur.

## v2.177 — Satır işlemleri menüsü (⋮ / sağ tık); "Diğer işlemler" kalktı

Ölçüm (gerçek Chromium): birleştirme **3 etkileşimdi** (satırı seç → "Diğer
işlemler" katlamasını aç → tıkla) ve bölme, çözümleme, geçmiş, sil aynı
katlamada saklıydı; katlama açılmadan hiçbiri görünmüyordu.

### KULLANICI NE GÖRECEK

Her bölüm satırının sonunda **⋮** var; **sağ tık** da aynı menüyü açar:

- Sonrakine ekle (birleştir)
- Oynatıcı konumundan böl
- ↻ Bu aralığı çözümle
- Metin geçmişi (N) — geçmiş varsa
- Sessizlik ölç
- Bölümü sil

**Esc** veya dışarı tıklama menüyü kapatır. Detay panelindeki "Diğer işlemler"
katlaması kaldırıldı; **aynı işler kaybolmadı**, satır menüsüne taşındı.

### ÖLÇÜM

| | Önce (v2.176) | Sonra (v2.177) |
|---|---|---|
| Görünür kontrol (1440) | 54 | **47** |
| Birleştirme | 3 etkileşim | **2** (⋮ → tık) |
| Katlama açmadan erişim | yok | **var** |
| Satır yüksekliği | 72 px | 72 px (değişmedi) |
| Menü konumu | — | ekran içinde; Esc kapatır |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`tasarim-testi` (güncellendi): ikincil araçlar satır menüsünde, aynı işler
korunur, detayda katlama kalmadı.

## v2.176 — Birleştirme adli olarak eksiksiz (ham çıktı korunur, günlüğe yazılır)

Ölçüm (kod okuması + gerçek tarayıcı): "sonrakine ekle" / **M** ile yapılan
birleştirme, ikinci bölümün **`asrText`'ini, `words`'ünü, model ve zaman
bilgisini sessizce siliyordu** (bölüm `splice` ile kaldırılıyordu) ve **delil
günlüğüne yazmıyordu**. Ayrıca **farklı konuşmacılı** iki bölüm sessizce
birleşiyor, sözler ilk konuşmacıya yazılıyordu. Bölme de günlüğe yazmıyordu.

### KULLANICI NE GÖRECEK

- Birleştirme artık **ikinci bölümün ham çıktısını saklar** (`mergedFrom`):
  model adı, çözümleme zamanı, ham metin, kelime zamanları, gözlemler, öneri.
  "Model ne dedi" kaybolmaz.
- Birleşik bölümün **kelime zamanları** ve **gözlem işaretleri** birleşir.
- **Farklı konuşmacı** varsa birleştirme **yapılmaz**; nedeni yazılır.
- **İkinci göz** (yardımcı) birleştiremez: yapı değişikliği dosya sorumlusunun işidir.
- Birleştirme ve bölme **delil günlüğüne** yazılır (hash zinciri korunur).
- Bildirim: "İkinci bölümün ham çıktısı saklandı."

### ÖLÇÜM

| | Önce (v2.175) | Sonra (v2.176) |
|---|---|---|
| İkinci bölümün `asrText`'i | **kaybolur** | `mergedFrom`'da korunur |
| Kelime zamanları | kaybolur | birleşir |
| Gözlem işaretleri | kaybolur | birleşir |
| Delil günlüğü | yazılmıyor | yazılır (zincir doğrulanır) |
| Farklı konuşmacı | sessizce birleşir | **reddedilir**, nedeni yazılır |
| İkinci göz | birleştirebilir | **reddedilir** |
| Tarayıcı ölçümü | — | S1/S2 reddedildi; aynı konuşmacı birleşti; günlük 1 → 2; hata **0** |

### KORUYAN TEST

`birim-testleri` [67] (13 kontrol) ve `sema-testi` (geri alma kaydı, yıkıcı
`splice`'ten **önce** alınır).

## v2.175 — "Ses yok" uyarısı İLK açılışta da görünüyor (v2.174 tamamlandı)

v2.174 uyarıyı Teknik panelinin dışına taşıdı; ancak ölçüm şunu gösterdi:
uyarı **ilk kart çiziminde** yazılmıyordu. `renderSegments` yalnız HTML
kuruyor, `refreshAudioState` çağırmıyordu; bu yüzden uyarı ancak bir bölüme
tıklanınca veya Teknik açılıp kapanınca ortaya çıkıyordu.

### KULLANICI NE GÖRECEK

Sesi bulunmayan kaydı açtığınız **anda** uyarı görünür (Teknik kapalı olsa da):
"Ses dosyası bu tarayıcıda yok — dalga ve spektrogram çizilemez. Paketten yükle
veya dosyayı yeniden ekleyin."

### ÖLÇÜM

| | Önce (v2.174) | Sonra (v2.175) |
|---|---|---|
| Teknik kapalı, taze sayfa | uyarı **boş/gizli** | **görünür ve dolu** |
| Teknik açık | görünür | görünür |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`tasarim-testi` [2ai] (5 kontrol): ilk çizim yolu (`renderSegments`) da
`refreshAudioState` çağırır.

## v2.174 — "Ses yok" uyarısı artık Teknik kapalıyken de görünüyor

Ölçüm (gerçek Chromium): ses blob'u silinmiş bir kayıtta (kalıcı silme → geri
alma → arşivden geri yükleme) uyarı metni **yalnız Teknik paneli açılınca**
yazılıyordu. Panel varsayılan kapalı olduğu için kullanıcı "ses yok" durumunu
**hiç görmüyordu**; dalga boş, oynatıcı sessiz kalıyordu. Bu, v2.158'in
"kalıcı uyarı" garantisinin gerilemesiydi.

### KULLANICI NE GÖRECEK

Sesi bulunmayan bir kaydı açtığınızda, **Teknik kapalı olsa da** şu satır
görünür: "Ses dosyası bu tarayıcıda yok — dalga ve spektrogram çizilemez.
Paketten yükle veya dosyayı yeniden ekleyin." Ses varsa satır görünmez.
Bölüm değiştirdiğinizde de durum tazelenir.

### ÖLÇÜM

| | Önce (v2.173) | Sonra (v2.174) |
|---|---|---|
| Teknik kapalı, ses yok | uyarı **görünmüyor** | **görünüyor** |
| Teknik açık, ses yok | görünüyor | görünüyor |
| Bölüm değişince | tazelenmiyordu | **tazeleniyor** |
| Ses varsa | gizli | gizli |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`tasarim-testi` [2ai] (4 kontrol): uyarı öğesi Teknik panelinin **dışında**,
her çizimde ve bölüm değişiminde tazelenir.

## v2.173 — Paket adı saniye taşıyor (aynı dakikada iki paket karışmıyor)

Ölçüm (gerçek Chromium, ekip senaryosu): sahip ve yardımcı paketi **aynı
dakikada** üretildiğinde iki dosya da
`AKIS_Paket_2026-777_E_2026-11-21_09-58.akis` adını aldı; tarayıcı ikincisine
" (1)" ekledi. Hangi paketin kimden geldiği **addan anlaşılmıyordu** — adli
dosyada paketlerin karışma riski.

### KULLANICI NE GÖRECEK

Paket adı artık **saniye** de taşıyor:
`AKIS_Paket_2026-777_E_2026-11-21_10-00-40.akis`. Aynı dakikada üretilen iki
paket (sahip + yardımcı) birbirinden ayrılır; dosya adından hangisinin ne zaman
alındığı okunur. Diğer her şey aynı: tarih, saat, dosya numarası ve
"yalnız bu dosya / tüm dosyalar" ayrımı.

### ÖLÇÜM

| | Önce (v2.172) | Sonra (v2.173) |
|---|---|---|
| Aynı dakikada iki paket | aynı ad | **farklı ad** (saniye) |
| Ad örneği | `…_09-58.akis` | `…_10-00-40.akis` |
| Ekip akışı (paket → öneri → birleştir → kabul) | çalışıyor | çalışıyor (yeniden ölçüldü) |

### KORUYAN TEST

`birim-testleri` [66] (5 kontrol): aynı dakikada iki ad farklı, saniye değeri
doğru, dakika korunur.

## v2.172 — Rapor önizlemesi artık kırpılmıyor (196 px → tam sayfa)

Ölçüm (100 bölüm, 1440×900): rapor görünümü 804 px; üstteki tanıtım (63) +
araç çubuğu (38) + hazırlık kartı (303) + uyarı (56) + çıktı notu (77) =
537 px alıyordu. Kâğıda **196 px** kalıyordu; kâğıdın içeriği **6.452 px**.
Yani rapor önizlemesi, iki satırlık bir kutuda kaydırılıyordu.

### KULLANICI NE GÖRECEK

Rapor önizlemesi artık **tek kaydırma**: kâğıt kendi yüksekliğinde akıyor
(196 → **6.438 px**), sayfayı normal bir belge gibi kaydırıyorsunuz. Araç
çubuğu (önizleme durumu, Tam ekran, Word, UDF) **yapışkan**; sayfanın
aşağısındayken de indirme düğmeleri görünür kalır.

### ÖLÇÜM

| | Önce (v2.171) | Sonra (v2.172) |
|---|---|---|
| Kâğıt yüksekliği | 196 px (6.452 px içerik) | **6.438 px** (tam) |
| Kâğıt kendi içinde kaydırma | var | **yok** |
| Görünüm kaydırması | yok | **6.254 px** |
| Araç çubuğu (1.200 px aşağıda) | — | **yapışkan**, indirme görünür |
| 900 px | kâğıt 86 px | **6.390 px** |
| Yatay kırpılma | yok | yok |

### NOT — ÖZGÜLLÜK TUZAĞI

`app.css` içinde `#view-report #reportPreview { flex:1 1 auto; overflow-y:auto }`
(özgüllük 2,0,0) vardı; okuma katmanındaki `.report-paper` (1,1,0) onu
**ezemiyordu**. Kural id seçicisiyle yazıldı. Ezilen `app.css` bildirimleri
silindi (borç artmadı: app.css kural 980 → 979).

### KORUYAN TEST

`tasarim-testi` [2ah] (4 kontrol): görünüm kaydırır, kâğıt küçülmez, kâğıt
kendi içinde kırpılmaz, araç çubuğu yapışkan.

## v2.171 — CSS borcu: 12 ölü bildirim daha silindi (görünür değişiklik yok)

Ölçüm: `#view-audio .seg-detail` için aynı özellikler (`display`,
`flex-direction`, `gap`, `overflow`, `height`, `padding`…) **yedi ayrı
katmanda** yeniden tanımlanmıştı; sonraki tanım öncekini eziyordu. 12 bildirim
etkisizdi ve silindi. Tamamı ölen kural blokları da kaldırıldı.

### KULLANICI NE GÖRECEK

**Görünür değişiklik yok.** Kanıt: aynı veri (künye + ses + bir bölüm) ve
**aynı kimliklerle** 4 görünüm × 3 tema, görünüm başına 400–425 öğe ve 33
hesaplanan özellik karşılaştırıldı → **0 fark**.

### ÖLÇÜM

| | Önce (v2.170) | Sonra (v2.171) |
|---|---|---|
| reading-layer kural | 828 | **825** |
| `!important` (app + katman) | 26 + 58 | **26 + 55** |
| ölü bildirim (katman içi) | 72 | **60** |
| ölü bildirim (app → katman) | 500 | 500 |
| hesaplanan stil farkı | — | **0** |

### KORUYAN TEST

`tasarim-testi` [8] nöbetçi eşikleri düşürüldü: `!important` **55**, ölü
bildirim **60** / 500. Borç artarsa test kalır.

## v2.170 — CSS borcu azaltıldı (görünür değişiklik yok)

Ölçüm: `reading-layer.css` içinde, uygulamanın **hiç üretmediği** altı eski
sınıfa (`.seg-meta-row`, `.seg-times`, `.seg-text-wrap`, `.seg-actions`,
`.seg-obs-row`, `.seg-ops-row`) ait **18 kural** duruyordu. v2.62'de bölüm
detayı `sd-*` sınıflarına taşınmış, bu kurallar etkisiz kalmıştı; dosyanın
kendi notu da bunu söylüyordu ama silinmemişti.

### KULLANICI NE GÖRECEK

**Görünür değişiklik yok.** Silme kanıtlandı: 4 görünüm × 3 tema, görünüm
başına 400–425 öğe ve 33 hesaplanan özellik karşılaştırıldı → **0 fark**.
Kurallar yalnız DOM'da hiç bulunmayan sınıflara aitti.

### ÖLÇÜM

| | Önce (v2.169) | Sonra (v2.170) |
|---|---|---|
| reading-layer kural | 852 | **828** |
| `!important` (app + katman) | 26 + 62 | **26 + 58** |
| ölü bildirim (katman içi) | 95 | **72** |
| ölü bildirim (app → katman) | 507 | **500** |
| hesaplanan stil farkı | — | **0** |

### KORUYAN TEST

`tasarim-testi` [2ag] (12 kontrol): bu altı sınıf geri gelirse test kalır
(kanıtlandı: sınıf geçici geri eklendi → test KALDI). Borç eşikleri
düşürüldü: `!important` 58, ölü bildirim 72 / 500.

## v2.169 — Raporda 8 piksellik metin kalmadı; kâğıt belge fontuyla

Ölçüm (gerçek Chromium, 3 bölümlü örnek dosya): rapor kâğıdındaki 152 metin
düğümünden **1 tanesi 8 pikseldi** — SHA-256 hücresi, satır içi stille
küçültülmüştü. Okunması en kritik dize (delil özeti) belgenin en küçük yazısıydı.
Ayrıca kâğıt, belge fontu yerine **arayüz fontuyla** (Segoe UI) çiziliyordu;
okuma katmanındaki `font-family: var(--font-ui)` kuralı app.css'in Arial'ini
eziyordu.

### KULLANICI NE GÖRECEK

Rapor kâğıdı artık **Arial** (belge fontu) ile çiziliyor. SHA-256 özeti
**11 piksel**, tek aralıklı yazıyla ve satır kırılarak gösteriliyor; kopyalarken
karışmıyor. Rapor metni **değişmedi**: HTML önizleme, DOCX ve UDF aynı metni
üretmeye devam ediyor.

### ÖLÇÜM

| | Önce (v2.168) | Sonra (v2.169) |
|---|---|---|
| 11 px altı metin | 1 (8 px) | **0** |
| SHA-256 puntosu | 8 px | **11 px** (tek aralıklı) |
| Kâğıt fontu | Segoe UI (arayüz) | **Arial** (belge) |
| Kırpılma (1440 / 900) | yok | yok |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`tasarim-testi` [2af] (7 kontrol): `app.js` içinde 11 px altı satır içi punto
yok, `--paper-font` belge fontu, kâğıt onu kullanıyor, `paper-hash` 11 px
tabanlı.

## v2.168 — Dar ekranda bölüme geçince metin görünür alana gelir

Ölçüm (gerçek Chromium 900×900, **100 bölüm**): liste 7.224 px, metin alanı
listenin **7.349 px** altında. Bir satıra dokununca düzenleme alanı ekranda
değildi; kullanıcı binlerce piksel kaydırmak zorundaydı. Masaüstünde metin
listenin yanında (107 px) — sorun yoktu.

### KULLANICI NE GÖRECEK

900 pikselden dar ekranda bir bölüme dokunduğunuzda (veya yapışkan çubuktan
**↑ ↓** / **✓ Onayla** kullandığınızda) uygulama **düzenleme alanını görünür
alana getirir**; metni görmek için kaydırmanız gerekmez. Masaüstünde **hiçbir
kaydırma yapılmaz** (zıplama olmaz). Takip modu kendiliğinden kaydırmaz.

### ÖLÇÜM

| | Önce (v2.167) | Sonra (v2.168) |
|---|---|---|
| 900 px, satıra dokunma | metin 7.929 px'te | metin **587 px** — ekranda |
| 900 px, çubuktan ↓ | metin ekranda değil | ekranda |
| 1440 px, satıra dokunma | kaydırma yok | kaydırma yok (0) |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`tasarim-testi` [2ae] (6 kontrol): `revealSegDetail` yalnız ≤900 px'te çalışır;
satır tıklaması, önceki/sonraki ve onay yollarından çağrılır.

## v2.167 — Dosya künyesi her görünümden tek tıkla

Ölçüm (gerçek Chromium, Ses görünümünde çalışırken): künyeye ulaşmak
**4 tık + 2 görünüm değişimi** (Ses → Özet → aç → kapat → Ses). Üst barda
dosya seçici vardı ama künye düğmesi yoktu; bilgi yalnız Genel görünümden
açılabiliyordu.

### KULLANICI NE GÖRECEK

Üst barda, dosya seçicinin yanında **✎ künye düğmesi** var. Hangi görünümde
olursanız olun tek tıkla dosya bilgileri açılır; kapattığınızda **aynı
görünümde, aynı yerde** kalırsınız. Deşifre yazarken mahkeme veya esas no
düzeltmek için ekran değiştirmek gerekmez.

### ÖLÇÜM

| | Önce (v2.166) | Sonra (v2.167) |
|---|---|---|
| Künyeyi açmak | 2 tık + görünüm değişimi | **1 tık** |
| Gidiş-dönüş | 4 tık | **2 tık** |
| Görünüm değişimi | 2 | **0** |
| Üst bar kırpılması (1280/1100/900) | yok | yok |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`tasarim-testi` [2ad] (3 kontrol): düğme üst barda, erişilebilir adı var,
çekmeceyi açar (görünüm değişmez).

## v2.166 — Ses kaydını kaldırma artık onay istiyor (veri kaybı)

Ölçüm (gerçek Chromium): kayıt kartındaki **"Kaldır"** düğmesi **hiç onay
sormadan** ses dosyasını IndexedDB'den siliyordu. Ölçüm: tıklamadan önce ses
anahtarı (`c::m`) vardı, sonrasında **yoktu**; açık onay diyaloğu **0**.
**Ctrl+Z kaydı geri getiriyor, ses anahtarı boş kalıyordu** → ekran "Geri
alındı" diyor, ses dosyası kayboluyordu.

### KULLANICI NE GÖRECEK

"Kaldır" artık **önce sorar**: kaydın adı, kaç bölümün kalkacağı, sesin
**KALICI** silineceği ve **geri almanın sesi getirmediği** yazılı. "Vazgeç"
derseniz hiçbir şey silinmez. Onaylarsanız davranış eskisi gibi: ses silinir.
Uyarı ayrıca "önce paket oluşturmanız önerilir" der.

### ÖLÇÜM

| | Önce (v2.165) | Sonra (v2.166) |
|---|---|---|
| Onay diyaloğu | yok | var |
| "Vazgeç" → ses | — | korunur (anahtar 1) |
| "Devam et" → ses | silinir | silinir |
| JS hatası | 0 | 0 |

### KORUYAN TEST

`birim-testleri` [65] (9 kontrol): uyarı metni kaydın adını, KALICI ifadesini,
"ses dosyası geri gelmez" cümlesini ve bölüm sayısını taşır; silme **onaydan
önce** yapılmaz.

## v2.165 — Dar ekranda onay ve dinleme her zaman erişilebilir

Ölçüm (gerçek Chromium 900×900, v2.164, 10 bölüm): bölüm listesi 554–1290 px
arasında; **"✓ Onayla" düğmesi y=1313**, yani ekranın **413 px altında**.
Liste uzadıkça (100 bölümde) onay ve dinleme erişilemez hâle geliyordu.

### KULLANICI NE GÖRECEK

900 pikselden dar ekranda, kayıt kartının altında **ince bir işlem çubuğu**
durur: **↑ ↓ · ▶ Dinle · ✓ Onayla · "3/10"**. Kaydırma yapmadan aktif bölümü
dinleyebilir, onaylayabilir ve bölümler arasında gezebilirsiniz. Çubuk
**yapışkan**: içeriği kaplamaz, kendi yerini ayırır. Bildirimler çubuğun
**üstünde** çıkar. **Masaüstü (≥901 px) değişmedi**: çubuk orada görünmez.

### ÖLÇÜM

| | Önce (v2.164) | Sonra (v2.165) |
|---|---|---|
| "✓ Onayla" konumu | y=1313 — ekran dışı | y=820–874 — ekranda |
| Kaydırmadan onay | yok | var |
| Bildirim ↔ çubuk | — | çakışma yok (toast 757–800, çubuk 820–874) |
| Masaüstü | değişmez | değişmez (`display:none`) |

Uçtan uca (gerçek ses): ↓ 1/10 → 2/10, ↑ 2/10 → 1/10, ✓ onay (1 bölüm),
▶ Dinle (çalıyor, t=6,13 sn), JS hatası **0**.

### KORUYAN TEST

`tasarim-testi` [2ac] (6 kontrol): çubuk kartın içinde, aynı `data-*`
işleyicilerini kullanır, bölüm yoksa çizilmez, masaüstünde gizli, ≤900 px'te
yapışkan ve görünür, bildirim çubuğun üstünde.

## v2.164 — Künye: zorunlu alanlar ilk ekranda

Senaryo ölçümü (gerçek Chromium 1440×900, v2.163): dosya bilgileri
çekmecesinde **17 alan** vardı, ilk ekranda **8**'i görünüyordu. Zorunlu
alanlardan **bilirkişi adı 454 px**, **inceleme konusu 166 px** aşağıdaydı.
Yeni dosya açan bilirkişi künyeyi tamamlamak için çekmeceyi kaydırmak
zorundaydı.

### KULLANICI NE GÖRECEK

Dosya bilgileri çekmecesi açıldığında **beş zorunlu alan** (rapor türü,
mahkeme, esas no, bilirkişi adı, inceleme konusu) **ilk ekranda** durur.
İsteğe bağlı alanlar (görevlendirme tarihleri, taraf bilgileri, sicil/uzmanlık,
ekip, arşivle) aşağıda kalır. Künyeyi tamamlamak için kaydırma gerekmez.
Alanların kimlikleri ve otomatik kayıt davranışı **değişmedi**.

### ÖLÇÜM

| | Önce (v2.163) | Sonra (v2.164) |
|---|---|---|
| Zorunlu alan ilk ekranda | 3 / 5 | **5 / 5** |
| `#expertName` | 454 px aşağıda | 356 px — görünür |
| `#subject` | 166 px aşağıda | 426 px — görünür |
| Çekmece içeriği | 1.924 px | 1.983 px (isteğe bağlı alanlar) |

Ölçüm (gerçek Chromium): beş zorunlu alan da görünür, girilen künye
yenilemeden sonra korunur, JS hatası **0**.

### KORUYAN TEST

`tasarim-testi` [2ab] (3 kontrol): beş zorunlu alan çekmecede var, hepsi
isteğe bağlı alanlardan **önce**, "Zorunlu bilgiler" başlığı altında.

## v2.163 — Durum renkleri tek anlama indi

Kullanıcı gözlemi: *"`seg-tool play-main` siyah zemin/mavi yazı, `mini-button
follow-btn on` kahverengi zemin/beyaz yazı."* Ölçüm bunu doğruladı.

### ÖLÇÜLEN HATALAR

| Bileşen / durum | Ölçüm | Kök neden |
|---|---|---|
| `#view-audio .seg-tool.play-main` | **1.1:1** | zemin `--navy` (siyah), yazı ID kapsamlı kuraldan `--accent` (mavi) |
| `#view-audio .follow-btn.on` | **3.03:1** | altın zemin (`var(--gold)`) + koyu yazı `#2b1d06` |
| `#view-audio .play-main.on` | 3.44:1 | sabit `#2c8062` zemin + tema yazısı |
| `.seg-tool.on` (ses görünümü) | renk değişmiyordu | `#view-audio .seg-tool` (ID) `.on` rengini eziyordu |
| `.mini-button.primary` | "birincil" ama gri | `--surface-3` zemin |
| `.karaoke span.on` | sabit `#ffd479` | tema dışı vurgu |

### KURAL — DURUM RENKLERİ TEK TABLO

| Rol | Zemin | Yazı | Nerede |
|---|---|---|---|
| **Birincil (dolu)** | `--accent` | `--accent-ink` | Onayla · Çal/Dinle · UDF · split numarası |
| **Açık / seçili** | `--accent-soft` | `--accent` | filtre · hız · analiz modu · takip · split adımı |
| **Çalıyor** | `--green` | `--surface` | bölüm "Dinle" düğmesi |
| **Uyarı / gözlem** | `--gold-soft` | `--gold` | gürültü/üst üste işaretleri, uyarı kutuları |
| **Nötr** | `--surface-2` | `--ink-2` | temel düğme/çip |

Altın artık **yalnız uyarı/gözlem** için; "açık" durumun rengi değil.

### YAPILAN

- `--navy` tabanlı durum kuralları (`play-main`, `seg-tool.on`, `follow-btn.on`,
  `obs-btn.on`, `mini-button.on`, `split-item.on`, `split-no`) tek tabloya çekildi.
- ID kapsamlı renk kuralı `:not(.on):not(.play-main)` ile daraltıldı; `.on`
  durumu artık ezilmiyor.
- `.mini-button.primary` dolu accent oldu.
- Takip vurgusu: ağır altın blok yerine **altın-soft zemin + alt çizgi**.
- Karaoke vurgusu da token'a bağlandı.

### DOĞRULAMA (gerçek Chromium)

| Kontrol | Sonuç |
|---|---|
| **Durum matrisi**: 19 bileşen × 6 (2 görünüm × 3 tema) | **0** düşük kontrast |
| Metin kontrastı (4 görünüm × 3 tema) | **0** hata |
| Koyu/sepya'da açık yüzey | **0** |
| Gerçek UI: takip + hız + filtre + Dinle açıkken ekran görüntüsü | tutarlı |
| JS hatası | 0 |

### KORUYAN TEST

`tasarim-testi` **[2aa]** (6 kontrol): açık durumda altın zemin yok, açık
durumda ham hex zemin yok, takip = accent-soft, çalıyor = yeşil, seg-tool =
accent-soft, birincil = dolu accent.

## v2.162 — Temalar baştan sona uygulandı

Kullanıcı: *"diğer temalara da baksaydın, onlarda da sorunlar vardı."* Haklıydı.

### ÖLÇÜLEN HATALAR (koyu tema, v2.161)

| Öğe | Ölçüm | Neden |
|---|---|---|
| "▶ Çal" düğmesi | **1.16:1** (beyaz yazı, açık zemin) | `background: var(--navy)`; `--navy` tema ile `--ink`e bağlanınca açık kaldı |
| Bölüm metni | **1.67:1** | `.seg-text` rengi sabit `#3a5069` |
| Zaman sütunu | **2.71:1** | sabit `#5a7089` |
| Sorular paneli | **beyaz** | `.split-nav` / `.split-body` sabit `#fff` |
| Split numarası | **1.16:1** | `background: var(--navy)` + beyaz yazı |
| Uyarı kutusu | **2.79:1** | koyu kahve metin, koyu zeminde |
| Rozetler | açık çip | `#e8f5ef`, `#fdf3f3`, `#fff4e3` sabit |

Kök neden: `app.css` içinde **151 sabit `background:#hex`** (40'ı saf beyaz) ve
onlarca sabit metin rengi vardı; tema yalnız bir kısmına uygulanıyordu.

### YAPILAN

- **86 kural** yüzey rengi, **75 kural** metin rengi token'a bağlandı
  (`--surface/2/3`, `--ink/2/3`, `--accent`, `--gold`, `--green`, `--red`).
- Dolu düğmeler (`main-play`, `button-primary`, `split-no`, aktif satır) artık
  `--accent` + `--accent-ink`; uyarı kutusu `--gold-soft`; klavye tuşları
  `--surface-3`.
- **Tuval (dalga) renkleri** `themeVar()` ile temadan okunur; tema değişince
  `__segWaveRedraw` + `renderAudioList` ile **yeniden çizilir**.
- Spektrogram renk skalası bilinçli olarak tema bağımsız (veri görselleştirme).

### DOĞRULAMA (gerçek Chromium, 1440×900)

| Kontrol | Sonuç |
|---|---|
| Metin kontrastı (4 görünüm × 3 tema) | **0 hata** (eşik 4.5) |
| Koyu/sepya'da açık yüzey (8 kombinasyon) | **0** |
| Seçici bazlı kontrast (65 bileşen × koyu/sepya) | gerçek hata **0** (rail öğeleri yanlış pozitif: zemin gradyan; ölçülen rail kontrastı 12.61 / 7.16 / 15.19) |
| JS hatası | 0 |

### KORUYAN TEST

`tasarim-testi` **[2z]** (11 kontrol): paper/print dışında `#fff` zemin yok,
rozet yüzeyleri token, dolu düğmeler accent, tuval renkleri token'dan,
tema değişince tuval tazeleniyor.

## v2.161 — Tasarım sistemi: palet, tema, punto ölçeği

Tasarım katmanı gözden geçirildi. Bu turda **işlev değil, okunabilirlik ve
kimlik** düzeltildi.

### ÖLÇÜLEN HATA: KOYU TEMA OKUNMUYOR

`tokens.css` tema blokları `[data-theme=…]` özgüllüğünde (0,1,0) tanımlıydı;
`app.css` içindeki `:root` da (0,1,0) ve **sonra** yükleniyor. Bu yüzden yedi
ortak ad (`--bg`, `--ink`, `--line`, `--gold`, `--green`, `--red`, `--paper`)
her temada **açık temanın** değerini alıyordu.

| Öğe (koyu tema) | Önce | Sonra |
|---|---|---|
| Sayfa zemini | `#f4f6f9` (açık) | `#0d131a` |
| Kart başlığı kontrastı | **1.16:1** (okunmuyor) | **14.05:1** |
| Gövde metni kontrastı | **1.11:1** | 14.15:1 |
| DOSYA DURUMU değerleri | ham `#30465d` (koyu) | `--ink-2` (temalı) |

Düzeltme: tema seçicileri `html[data-theme=…]` (0,1,1) yapıldı; `app.css`'in
kendi adları (`--navy`, `--navy2`, `--blue`, `--muted`, `--pale`, `--shadow`)
temaya bağlandı.

### PALET VE TEMALAR

- **Açık:** zemin `#eef2f7`, çizgiler biraz daha belirgin, kartlar **iki
  katmanlı yumuşak gölge** ile yükseldi.
- **Koyu:** zemin `#0d131a`, kart `#18212b`, yüzeyler arasında gerçek
  yükseklik farkı.
- **Sepya:** zemin `#ece2d0`, kart `#fbf6ec` — kâğıt hissi güçlendi.
- **Rapor kâğıdı:** lacivert `#1c426b` → **`#16324f`** (kurumsal, daha derin);
  bant `#f6f8fb`. Kâğıt yine temadan bağımsız (koyu temada da açık).

### PUNTO ÖLÇEĞİ

| | Önce | Sonra |
|---|---|---|
| Ölçek | 11/12/13/14/16/19/24 | **11/12/14/15/17/20/25/30** |
| Okuma katmanında ham `font-size` | **13** | **0** |
| Deşifre metni | 13 px | **14 px** (belgelenen değer) |
| Büyük sayı (KPI) | 30 px (ham) | `--fs-3xl` |

Büyütme kademeleri (büyük/çok büyük) yeni tabana göre güncellendi; en küçük
kademe 12/13 px'in altına inmiyor.

### DOĞRULAMA (gerçek Chromium)

- **4 görünüm × 3 tema** metin kontrast taraması: **0 başarısız** (eşik 4.5).
- 1440/1100/900: sayfa başlığı kırpılması **yok**; durum çubuğu 24/34/45 px,
  kırpılan öğe **0**; detay panelinde kaydırma **0**; yatay taşma **yok**.
- JS hatası **0**.

### KORUYAN TEST

`tasarim-testi` **[2y]** (13 kontrol): tema seçicilerinin özgüllüğü, eski
adların temaya bağlılığı, ölçeğin eksiksiz/artan olması, 11 px tabanı, okuma
katmanında ham `font-size` olmaması, büyütme kademelerinin tabanı düşürmemesi.

## v2.160 — Görsel düzen (kozmetik)

İşlev değişmedi; yalnız hiyerarşi, boşluk ve yüzey dili toparlandı.

### ÖLÇÜM (v2.159 → v2.160, 1440×900)

| Öğe | Önce | Sonra |
|---|---|---|
| İş akışı kartındaki boş alan | ~**265 px** | **0** (kart içeriği kadar) |
| İstatistik kartı | düz metin, 27 px sayı | **ikon yuvası + 30 px sayı** |
| İş akışı adımı | düz satır, açıklama gizli | **yuvarlak numara + durum rozeti + açıklama** |
| Hızlı erişim | çizgisiz satır | **çerçeveli kart, hover'da vurgu** |
| İnceleme yazı yüzeyi | 1344 px'e yayılıyor | **920 px, ortalı** |
| CSS borcu | 98 / 507 | **98 / 507** (artmadı) |

### KULLANICI NE GÖRECEK

- Genel bakışta kartlar arasında **boşluk kalmaz**; sayılar daha okunur.
- İş akışı adımları **tıklanabilir kart** gibi görünür; durumu rozetle söyler.
- Hızlı erişim düğmeleri çerçeveli; üzerine gelince belirginleşir.
- İnceleme sayfasında yazı alanı **ortada ve ölçülü**; göz satırı kaybolmaz.
- Ses listesinde satır üzerine gelince ve aktifken **yüzey** değişir.

### DÜZELTİLEN YAN HATA (ölçümle)

`align-items:start` verildiğinde, sabit yükseklikli genel bakış alanında kartlar
**altlarındaki karta biniyordu** (900×700'de görüldü). `flex-shrink:0` +
`flex-grow:0` ile alan içeriğe göre boyutlanır; görünüm kendi içinde kayar.

### KORUYAN TEST

`tasarim-testi` **[2x]** (8 kontrol): içeriğe göre hizalama, büyümeme/kısalmama,
ikon yuvası, 30 px sayı, adım açıklamalarının geniş ekranda görünmesi, ölçülü ve
ortalı yazı yüzeyi, yeni bölümde ham hex olmaması.

## v2.159 — Dar ekranda yinelenen başlık

Tüm sayfa taramasında bulundu: 900 px'ten dar ekranda **tek kayıt için dört
başlık** vardı — sayfa başlığı "Ses kayıtları", panel "MATERYAL LİSTESİ / Ses
kayıtları", panel "SEÇİLİ KAYIT / <dosya adı>" ve kartın kendi dosya adı.

### KULLANICI NE GÖRECEK

- Dar ekranda "SEÇİLİ KAYIT" panel başlığı **kaldırıldı**; kart zaten dosya
  adını ve düğmelerini taşıyor. Tek kayıt için **3 başlık** kalır.
- **Masaüstünde değişiklik yok** (≥901 px'te iki panel yan yana; etiket ayırt
  edici olduğu için korunur).

### ÖLÇÜM (v2.159, gerçek Chromium)

| Genişlik | Başlık yüksekliği | Kart | Yatay taşma |
|---|---|---|---|
| 900 | **0 px** (gizli) | görünür | yok |
| 1440 | 0 px (masaüstü kabuğunda zaten gizli) | görünür | yok |

### KORUYAN TEST

`tasarim-testi` **[2w]** (2 kontrol): ≤900 px'te gizli, ≥901 px'te bu kural
uygulanmıyor.

## v2.158 — Bildirim yerleşimi ve ses yok durumu

İki denetim bulgusu kapatıldı.

### KULLANICI NE GÖRECEK

- **Bildirim artık durum çubuğunu kapatmıyor.** Ölçüm (v2.157): toast 835–878,
  durum çubuğu 876–900 → üst üste biniyordu. Artık toast
  `bottom: calc(var(--status-h) + 12px)` ile çubuğun **üstünde** durur.
- **Ses dosyası yoksa kalıcı uyarı.** Önce yalnız kaybolan bir toast sebebi
  söylüyordu; analiz kutusu boş beyaz kalıyordu. Artık teknik bölümde kalıcı
  satır: *"Ses dosyası bu tarayıcıda yok — dalga ve spektrogram çizilemez.
  Paketten yükle veya dosyayı yeniden ekleyin."* Ses varsa satır **gizlenir**.

### ÖLÇÜM (v2.158, gerçek Chromium)

| Durum | Sonuç |
|---|---|
| Toast / durum çubuğu | toast alt **854**, çubuk üst **876** → **çakışma yok** |
| Ses yok | uyarı **görünür**, metin çözümü de söylüyor |
| Gerçek WAV eklendi | uyarı **gizli**, `src` var, süre **47,7 sn** |
| JS hatası | 0 |

### KORUYAN TEST

`birim-testleri` **[64]** (7 kontrol): `audioStateText` (ses varsa boş, yoksa
sebep + çözüm), toast'ın `--status-h` ile konumlanması, uyarı satırının
biçimi ve DOM'a yazılması.

## v2.157 — Test verisi koruması

Tüm sayfa taramasında bulundu: "Hazır test dosyalarını yükle" **onay sormadan**
4 kurgusal dosyayı ve 10 sentetik ses kaydını gerçek çalışma alanına ekliyordu.
Bu dosyalar pakete de giriyordu.

### KULLANICI NE GÖRECEK

- Düğme artık önce **ne ekleneceğini söyleyip onay istiyor**: "4 KURGUSAL
  dosya ve 10 sentetik ses kaydı eklenecek; gerçek dosyalarınızla birlikte
  görünürler ve pakete de girerler."
- Yükleme bitince **aynı düğme** şuna dönüşür: **"Test dosyalarını kaldır (4)"**.
  Basınca onay ister ve dosyaları **ses kayıtlarıyla birlikte** siler.
- Gerçek dosyalarınıza **dokunulmaz**; düğme metni de bunu söyler.

### ÖLÇÜM (v2.157, gerçek Chromium)

| Adım | Sonuç |
|---|---|
| İlk durum | düğme "Hazır test dosyalarını yükle" (mod `load`) |
| Tıkla | onay diyaloğu açıldı, metin ne ekleneceğini söylüyor |
| Onayla | 4 dosya yüklendi; düğme **"Test dosyalarını kaldır (4)"** (mod `remove`) |
| Tekrar tıkla | onay diyaloğu; onayla → dosyalar ve sesleri silindi; düğme geri döndü |
| JS hatası | 0 |

### KORUYAN TEST

`birim-testleri` **[63]** (9 kontrol): `sampleCases` yalnız `sampleKey` taşıyanları
seçer (null güvenli), yükleme `askConfirm` çağırır, `removeSamples` vardır ve
onay ister, ses bloblarını siler, düğme iki modu bildirir.

## v2.156 — Rapor hazırlığı kapsamayı da sayar

Tüm sayfa taramasında bulundu: aynı dosya için iki araç **farklı gerçek**
söylüyordu. Araç çubuğu "Kapsam %68 · 16 boşluk" derken "Rapor hazırlığı" kartı
"1 konu eksik" diyordu.

### KULLANICI NE GÖRECEK

- Hazırlık kartında yeni satır: **"Bölümlenmemiş ses aralığı"** — kaç boşluk
  olduğu ve toplam süresi (ör. "16 boşluk · 16,9 sn").
- Satıra tıklayınca ses görünümü açılır ve **boşluk listesi kendiliğinden**
  gelir; "Git" ile oynatıcı boşluğun başına gider.
- Boşluk yoksa satır **çıkmaz**.
- **Dürüst sınır:** boşluk "konuşma yok" demek değildir; yalnız bölümlenmemiş
  aralıktır. Kayıt süresi bilinmiyorsa boşluk **üretilmez** (uydurma yok).

### TEK KAYNAK

`reportReadiness` artık kapsamayı `segmentCoverage` ile hesaplar; ayrı bir
formül yok. Böylece düğme ile kart ayrışamaz.

### ÖLÇÜM (v2.156, gerçek Chromium)

| Adım | Sonuç |
|---|---|
| 16 boşluklu dosya | kart: "1 konu eksik · **16** Bölümlenmemiş ses aralığı" |
| Satıra tıkla | `view-audio` açıldı, kapsam paneli **açık**, **16** boşluk satırı |
| JS hatası | 0 |

### KORUYAN TEST

`birim-testleri` **[62]** (6 kontrol): tam kapsamda madde yok, boşlukta sayı ve
hedef doğru, ayrıntı saniye taşır, satır kapsam panelini açar, süre yoksa
madde yok.

## v2.155 — Dil tutarlılığı ve paket diyaloğu onarımı

Tüm sayfaları gözden geçirirken bulundu: **paket diyaloğunda bozuk bir satır**
vardı (bir otomatik düzenleme iki cümleyi iç içe geçirmişti). Tarayıcı aynı
cümleyi iki kez gösteriyor, arada `lt;dosya no` gibi çöp metin çıkıyordu.
Ayrıca diyaloğun düğmesi "Yedeği oluştur" diyordu; sözlük (v2.123) "Yedek"
kavramını kaldırmıştı.

### KULLANICI NE GÖRECEK

- "Paket oluştur" diyaloğu artık **tek ve doğru** metin gösterir:
  `Paket adı: AKIS_Paket_<dosya no>_tarih_saat.akis` ve tek bir açıklama satırı.
- Diyaloğun düğmesi **"Paketi oluştur"** (önce "Yedeği oluştur").
- Arşiv notu **"Pakete dâhil edilirler"** der (önce "Yedeğe dâhil edilirler").
- Boş çalışma alanında "Paket oluştur"a basınca ne yapılacağı yazılı:
  *"Pakete girecek dosya yok: … Önce bir dosyaya bilgi girin veya ses kaydı ekleyin."*

### NEDEN TEST YAKALAMADI

Etiket sayısı **dengeli**ydi (bozuk satır iki tam paragraf içeriyordu), bu yüzden
yalnız denge kontrolü yetmez. Yeni nöbetçi **yapısal**: satır içi etiketin
(`code`, `b`, `span`, `label`, `small`) içine blok etiket (`p`, `div`) giremez.

### KORUYAN TESTLER

`surum-testi` [11] + [11b] — 8 yeni/keskinleşen kontrol:

| Kontrol | Ne der |
|---|---|
| Kullanıcı metninde "Yedek" yok | `index.html` (yardım geçmişi hariç) + `app.js` (VERSION_NOTICES ve yorumlar hariç) |
| Kapsam düğmesi "Paketi oluştur" | düğme metni |
| Kapsam notu bozulmamış | `<code>…<p` deseni yok |
| Arşiv notu "pakete dâhil" | metin |
| Satır içi etiket içine blok girmemiş | yapısal |
| `<p>` ve `<code>` dengesi | yapısal |

## v2.154 — Tek panel, iki bölge

Kullanıcı: *"bu iş sıkıştırma sorunu değil, başka gözden bakmak gerek; tek
panelden yanayım, masaüstü gibi olsun."*

### ÖLÇÜM — neden sıkıştırma yetmiyordu (v2.153, 1440×900)

| | |
|---|---|
| Detay panelinde etkileşimli öğe | **38** |
| Kaydırmadan görünen | **22** (16 gizli) |
| Onay düğmesi | **90 px aşağıda** |
| Gözlem düğmeleri | **44 px aşağıda** |
| Konuşmacı / Kontrol | **13 px aşağıda** |

Panel aynı anda altı iş yapıyordu (dinle · böl · yaz · sınıflandır · onayla ·
analiz et). Hangi öğe nereye konsa başka biri aşağı itiliyordu.

### KARAR — tek panel, iki bölge

- **Sabit başlık (asla kaymaz):** Bölüm X / N · ↑ ↓ · ▶ Dinle · ⏹ ·
  **✓ Onayla** · Yeniden dinle · Anlaşılmadı · Diğer işlemler · **Teknik ▾**
- **Metin:** kalan **tüm** yükseklik (deşifre = asıl iş)
- **Teknik (istenince):** dalga, başlangıç/bitiş, konuşmacı, kontrol, gözlem
- Alt eylem satırı **kaldırıldı** (başlığa taşındı): bir satır, bir kez.

### KULLANICI NE GÖRECEK

- Yazarken **metin alanı 160 → 446 px** (1440×900). Panelde **kaydırma yok**.
- **Onayla** her zaman görünür; onaydan sonra sıradaki bölüme geçer.
- Dalga/zaman/konuşmacı/gözlem **Teknik** düğmesiyle açılır; **açıkken de**
  panelde kaydırma yok (34 kontrolün tamamı görünür). Tercih hatırlanır.

### ÖLÇÜM (v2.154, gerçek Chromium)

| Genişlik | Durum | Gizli kontrol | Kaydırma | Metin alanı |
|---|---|---|---|---|
| 1440 | Teknik kapalı | **0** | **0** | **446 px** |
| 1440 | Teknik açık | **0** | **0** | 120 px |
| 1280 | kapalı / açık | 0 / 0 | 0 / 0 | 396 / 120 |
| 1100 | kapalı / açık | 0 / 0 | 0 / 0 | 329 / 120 |
| 900 | kapalı / açık | 0 / 0 | 0 / 0 | 180 / 180 |
| 760 | kapalı / açık | 0 / 0 | 0 / 0 | 180 / 180 |

Onay akışı: bekleyen bölüm → **Onaylandı**, aktif bölüm ilerledi. Bölüm
değişiminde başlık ve metin güncelleniyor; dalga yeni bölüm için çiziliyor.

### BULUNAN YAN HATA (gerçek tarayıcıda)

Teknik bölüm **açıkken sayfa yenilenirse** dalga **boş** kalıyordu
(ölçüm: `painted=0`, bölüm değiştirince 3020). Sebep: görünüm gizliyken
çizilen tuvalin genişliği 0'dır ve sonraki çizim eski tuvale bağlı kalıyordu.
Düzeltme: ses görünümü **görünür olduktan sonra** detay bir kez yeniden
çizilir. Ölçüm (sonrası): `painted=3020`.

### KORUYAN TEST

`tasarim-testi` **[2v]** (9 kontrol): birincil eylemler başlıkta, teknik
anahtarı, `.sd-tech` + varsayılan kapalı, alt eylem satırının kaldırılması,
gizli teknik bölümün `display:none` olması, metin alanının esnemesi, gizli
tuvalin çizilmemesi ve tercihin saklanması.

## v2.153 — Detay paneli sıkıştırıldı

P5 (kozmetik). Hedef: bölüm detayında **kaydırmadan** `Konuşmacı / Kontrol`
satırını ve gözlem düğmelerini görmek.

### KULLANICI NE GÖRECEK

- Başlangıç / bitiş etiketleri kutuların **yanına** geçti.
- **Konuşmacı · Kontrol · Profil** tek satırda.
- "geçmiş", "sessizlik ölç", "buradan böl", "↻ Bu aralığı çözümle",
  "sonrakine ekle", "sil" araçları **"Diğer işlemler"** başlığı altında
  katlandı. Başlık her zaman görünür; açınca araçlar çıkar. Onay düğmeleri
  (Onayla / Yeniden dinle / Anlaşılmadı) **görünür kalır**.
- **Metin alanı ve analiz kutusu KÜÇÜLTÜLMEDİ** (metin 180 → 160 px yalnız
  masaüstünde; ~7 satır kalır).

### ÖLÇÜM (v2.153, gerçek Chromium, 1440×900)

| Öğe | v2.152 | v2.153 |
|---|---|---|
| Zaman satırı | 52 px | **40 px** |
| Konuşmacı/Kontrol/Profil | 101 px | **54 px** |
| Onay + araç satırı | 74 px | **38 px** |
| Panel içeriği | **795 px** | **680 px** |
| `Konuşmacı/Kontrol` üstü | 818 | **786** |
| Gözlem düğmeleri üstü | 927 | **848** |

Gözlem düğmelerine kalan kaydırma **125 → 46 px**.

### DÜRÜST SINIR — hedef tam karşılanmadı

Panel yüksekliği 577 px, içerik 680 px: **46 px eksik**. "Kaydırmasız" hedefi
kapatmak için metin alanını 180 → 120 veya analiz kutusunu 160 → 120 px
küçültmek gerekir. İkisi de bilinçli korundu (metin alanı en çok bakılan yer;
analiz kutusu kullanıcı isteğiyle büyütülmüştü). **Karar kullanıcıya bırakıldı.**

### ÖLÇÜM — dar ekran

1440 / 1280 / 1100 / 900 / 760 / 640 / 480 px: yatay taşma **0**, kırpılma
**0**. ≤640 px'te konuşmacı/kontrol/profil yeniden alt alta (3 sütun sığmaz).

### KORUYAN TEST

`tasarim-testi` **[2u]** (6 kontrol) + CSS borç nöbetçisi değişmedi
(ölü bildirim 98 / 498, `!important` 26/70).

## v2.152 — Listede bitiş zamanı

Kullanıcı: *"listedeki saat başlangıç mı bitiş mi belli değil."*

### KULLANICI NE GÖRECEK

- Bölüm listesindeki zaman hücresi artık **iki satır**:
  `00:00:03.000` ve altında `→ 00:00:06.000`.
- Hangi saatin başlangıç, hangisinin bitiş olduğu **tahmin edilmez**.
- Zaman sütunu milisaniye için genişletildi (84 → 96 px); **hiçbir saat
  kesilmez**. Dar ekranda da kırpılma yok.
- Bedeli: satır yüksekliği **59 → 72 px** (+13). Liste uzar ama kendi içinde
  kaydığı için sayfa uzamaz. Bu bedel bilinçli kabul edildi: bilgi eksikliği
  yerleşimden daha pahalıdır.

### ÖLÇÜM (v2.152, gerçek Chromium)

| Genişlik | Satır | Zaman hücresi | Kırpılma | Yatay taşma |
|---|---|---|---|---|
| 1440 | 72 px | 35 px / 2 satır | yok | yok |
| 1280 | 72 px | 35 px / 2 satır | yok | yok |
| 1100 | 72 px | 35 px / 2 satır | yok | yok |
| 900 | 72 px | 35 px / 2 satır | yok | yok |
| 760 | 72 px | 35 px / 2 satır | yok | yok |

Bitiş metni: `→ 00:00:02.000` (ms biçimi, kayıttaki değerden).

### KORUYAN TEST

`tasarim-testi` **[2t]** (6 kontrol): iki satır (flex column), `.seg-start` ve
`.seg-end` sınıfları, bitişin kayıttaki değerden yazılması, zaman hücresinde
`text-overflow` (ellipsis) bulunmaması ve sütunun 96 px olması.

## v2.151 — Onaydan sonra sonraki bekleyene geç

**İSTEĞE BAĞLI, VARSAYILAN KAPALI.** Takip modlarından (F/G) ayrı bir tercihtir.

### KULLANICI NE GÖRECEK

- Ayarlar çekmecesinde **"Onay davranışı"** bölümü ve **AÇIK/KAPALI** yazan bir
  anahtar. Durum yalnız renkle değil **metinle** de yazılır.
- **Kapalıyken (varsayılan):** eskisi gibi onaydan sonra bir sonraki bölüme
  geçilir.
- **Açıkken:** onaydan sonra sıradaki **kontrol edilmemiş** bölüme geçilir;
  onaylanmış/anlaşılmadı işaretli bölümler atlanır. Bekleyen bölüm yoksa
  **bulunduğunuz yerde kalırsınız** (başa dönülmez).
- Tercih yalnız bu tarayıcıda saklanır; **kayda ve rapora yazılmaz**.

### HESAP (saf fonksiyon)

`nextPendingIndex(segments, from)` → `from` sonrasındaki ilk `!isReviewed`
bölümün indeksi, yoksa `-1`. `isReviewed` ölçütü rapor hazırlığıyla aynıdır:
`machine` (çözümlendi), `ambiguous` (belirsiz), `relisten` ve `pending`
bekleyen sayılır.

### ÖLÇÜM (v2.151, gerçek Chromium)

4 bölüm (bekleyen, onaylı, onaylı, bekleyen):

| Durum | Onaylanan | Sonuç |
|---|---|---|
| Anahtar KAPALI (varsayılan) | 1. bölüm | **2. bölüm** (eski davranış) |
| Anahtar AÇIK | 1. bölüm | **4. bölüm** (onaylı 2–3 atlandı) |
| Anahtar AÇIK | son bekleyen (4.) | **yerinde kaldı** |

Kırpılma 0 · `aria-pressed` doğru · JS hatası 0.

### KORUYAN TEST

`birim-testleri` **[61]** (9 kontrol): aradaki onaylıları atlama, makine
işaretinin bekleyen sayılması, son bekleyenden sonra `-1`, hiç bekleyen yokken
`-1`, "anlaşılmadı"nın kontrol edilmiş sayılması, boş liste, geçersiz `from`
(baştan arar) ve tercihin varsayılanının kapalı olması.

## v2.150 — Rapor hazırlık denetimi: eksikler tek listede

Kullanıcı: *"eksikle rapor üretmeyi engelle."* Rapor görünümünde **"Rapor
hazırlığı"** kartı eklendi.

### KULLANICI NE GÖRECEK

- Rapor görünümünde kart, eksikleri **sayıyla** listeler: kontrol edilmemiş
  bölüm, seçilmemiş belirsiz okuma, konuşmacı atanmamış bölüm, zaman sorunu,
  SHA-256 hesaplanmamış kayıt, teslim/köken bilgisi girilmemiş kayıt, boş künye
  (dosya no/mahkeme/bilirkişi) ve inceleme sorusu yokluğu.
- Satıra tıklayınca ilgili yere gider. **"Kontrol edilmemiş bölüm"** satırı ses
  görünümünü **Bekleyen** filtresiyle açar; **"Zaman sorunu"** satırı **Zaman
  sorunları** filtresiyle.
- Eksik yoksa **"Eksik görünmüyor"** yazar.
- **Uydurma "hazırlık yüzdesi" YOKTUR.** Kart bir **denetim listesidir, onay
  değildir**; bu cümle kartın üstünde yazılıdır.

### HESAP (saf fonksiyon)

`reportReadiness(c)` → `{ ok, items: [{ key, label, count, target, detail,
filter }] }`. Sayımlar mevcut tek kaynaklardan gelir: `pendingBreakdown`
(bekleyen), `segmentTimeIssueIndexes` (zaman), `isSha256Hex` (bütünlük),
`logChainState` (delil zinciri). Sentetik kayıtlarda teslim bilgisi istenmez.

### ÖLÇÜM (v2.150, gerçek Chromium)

4 bölümlük eksik dosya (2 bekleyen + 1 belirsiz, çakışan zaman, SHA-256 yok,
köken yok, bilirkişi adı boş, soru yok):

| Adım | Sonuç |
|---|---|
| Kart | "8 konu eksik" + 8 satır (pending 3 · zaman 2 · konuşmacı 3 …) |
| "Kontrol edilmemiş bölüm"e tıkla | `view-audio` açıldı, filtre **"Bekleyen 3"**, 3 satır |
| Eksikler tamamlanınca | **"Eksik görünmüyor"** |
| Kırpılma / punto | 0 · 11px |
| JS hatası | 0 |

### KORUYAN TEST

`birim-testleri` **[60]** (33 kontrol): her madde için pozitif/negatif vaka,
hedef ve filtre alanları, sentetik kayıt istisnası, "yüzde alanı yok" ve HTML
satırlarının tıklanabilirliği.

## v2.149 — Kapsama denetimi: sesin bölümlenmemiş aralığı

Kullanıcı: *"bölerken/çözümlerken parça kaçabiliyor mu, sesin hiç bölüme
girmemiş aralığı var mı, listeden göremiyoruz."* Bu bir **ölçüm aracıdır**;
hiçbir zamanı kendiliğinden düzeltmez.

### KULLANICI NE GÖRECEK

- Araç çubuğunda **"Kapsam %98 · 2 boşluk"** düğmesi. Boşluk yoksa
  **"Kapsam %100"** yazar.
- Tıklayınca panel açılır: her boşluk **zaman aralığıyla** listelenir
  (`00:00:06.000 – 00:00:08.000 · 2,0 sn`) ve **Git** düğmesi oynatıcıyı o
  aralığın başına getirir.
- Bir bölümün süresini değiştirdiğinizde yüzde ve liste **yenilemeden**
  güncellenir.
- Kayıt sonunu aşan bölüm ve sıfır süreli bölüm ayrı satırda bildirilir.
- **Dürüst sınır:** boşluk "konuşma yok" demek değildir; sessizlik, müzik veya
  henüz bölünmemiş konuşma olabilir. Uygulama yalnız "bölümlenmemiş" der.

### HESAP (saf fonksiyon)

`segmentCoverage(segments, duration)` → `{ ok, totalSec, coveredSec, pct, gaps,
outside, zero }`.

- `coveredSec` **birleşim** uzunluğudur: çakışan bölüm iki kez sayılmaz.
- Bitişik bölüm boşluk sayılmaz (1 ms tolerans).
- Aralıklar `[0, duration]` içine kırpılır; dışarı taşan bölüm `outside`'ta
  bildirilir, sessizce yutulmaz.
- Süre bilinmiyorsa `ok:false`, `pct:null`; **uydurma yüzde yazılmaz**.

### ÖLÇÜM (v2.149, gerçek Chromium)

4 bölüm (0–3, 3–6, 8–10, 14–16) / 16 sn:

| Adım | Sonuç |
|---|---|
| Düğme | "Kapsam %62 · 2 boşluk" (kırpılma yok) |
| Panel | 2 satır: 06–08 ve 10–14 |
| "Git" | oynatıcı `currentTime = 6` |
| 2. bölümün bitişi 08.000 yapıldı | düğme **"Kapsam %75 · 1 boşluk"** (yenilemeden) |
| JS hatası | 0 |

Genişlikler 1440/1280/1100/900/760: düğme **hiçbirinde kırpılmıyor**, yatay
sayfa taşması yok.

### KORUYAN TEST

`birim-testleri` **[59]** (28 kontrol): tam kapsam, boşluk, baş/son boşluğu,
çakışmanın iki kez sayılmaması, sırasız giriş, kayıt dışı bölüm, sıfır süre,
süre bilinmiyorken uydurma yüzde yazılmaması, 1 ms toleransı, geçersiz zaman ve
etiket biçimi.

## v2.148 — Oynatma başlarken sayfa zıplamıyor

CANLI VERİ. Kullanıcı: *"sd-follow normalde kapalı; play'e basınca açılıyor ve
sayfada ani bir değişiklik yaratıyor. Bölüm 1 yazıyor ama play'e basınca
Bölüm 1 / 100 oluyor, orada bir değişiklik oluyor."*

### ÖLÇÜM (v2.147, gerçek ses)

| Durum | Metin alanı üstü | Başlık |
|---|---|---|
| Canlı vurgu kapalı | 305 px | "Bölüm 1 / 16" |
| Canlı vurgu açık, oynatmadan | **369 px** (+64) | "Bölüm 1 / 16" |
| Oynatma başladı | 369 px | **"Bölüm 1"** ( `/ 16` kayboldu) |

İki ayrı hata:
1. Şerit yalnız oynatma anında DOM'a ekleniyordu → metin 64 px aşağı itiliyordu.
2. `syncSegDetailInPlace`, `.sd-idx`in textContent'ini yazıp **içindeki
   ` / N` span'ını siliyordu** → oynatma anında başlık kısalıyordu.

### DÜZELTME

- `segHeadParts(i, total)` — etiket ve toplam TEK KAYNAK; `.sd-idx` ve `.sd-of`
  artık **kardeş** span'lar (biri diğerini silemez).
- `ensureFollowStrip(m, idx)` — canlı vurgu açıkken şerit **yer tutucu** olarak
  önceden kurulur ("Canlı vurgu açık — oynatınca okunan cümle burada görünür.").
  Oynatma yalnız METNİ değiştirir; yükseklik sabit kalır.
- Metin yoksa şerit **silinmez**, yer tutucuya döner (yerleşim sabit).

### ÖLÇÜM (v2.148, aynı ses)

| Durum | Metin alanı üstü | Başlık |
|---|---|---|
| Canlı vurgu açık, oynatmadan | 369 px (yer tutucu) | "Bölüm 1 / 16" |
| Oynatma başladı | **369 px (değişmedi)** | **"Bölüm 1 / 16"** |
| Oynatma 1,5 sn sonra | 369 px | "Bölüm 1 / 16" |

### KULLANICI NE GÖRECEK

- Canlı vurguyu açtığınızda şerit bir kez yerleşir (bilinçli eylem).
- **Oynat'a bastığınızda sayfa zıplamaz**; yalnız şeritteki metin değişir.
- Bölüm başlığı her zaman "Bölüm X / N" — oynatmayla değişmez.

### TASARIM NOTU (neden head'e taşımadık)

Şerit başlığa taşınsaydı, iki satırlık metin başlık yüksekliğini oynatma
anında büyütür ve **aynı zıplama** başlıkta olurdu. Yer tutucu çözümü
zıplamayı tümüyle kaldırır; maliyeti canlı vurgu açıkken 48 px'lik sabit alan.

Koruyan test: `birim-testleri` [58] (4) + `tasarim-testi` [2s] (3).

## v2.147 — Takip şeridi önceki bölüme dönmüyor

CANLI VERİ. Kullanıcı: *"Otomatik geçiş + canlı vurgu açıkken bir önceki
segment bir sonrakiyle mi karışıyor; vurgu sürekli değişiyor."* Bu kez
**gerçek örnek sesle** ölçüldü (`sample_data/audio/ses_01…wav`, 47 sn,
16 bölüm, F+G açık).

### ÖLÇÜM (v2.146, gerçek ses, 50 ms aralıkla)

| Zaman | Aktif bölüm | Şerit anahtarı | Şerit metni |
|---|---|---|---|
| 3,26 | Bölüm 2 | `1|0|Bölüm 2…` | "Bölüm 2:" |
| **3,31** | Bölüm 2 | **`0|0|Bölüm 1…`** | **"Bölüm 1:"** |
| 3,41 | Bölüm 2 | `1|0|Bölüm 2…` | "Bölüm 2:" |
| **3,62** | Bölüm 2 | **`0|0|Bölüm 1…`** | **"Bölüm 1:"** |
| … | | 1,3 sn'de **5 geri dönüş** | |

Kök neden: `ensureSegStopListener`'ın `timeupdate`i `renderKaraoke(mm,
st.index)` çağırıyordu; `st.index` **çalmanın başladığı** indekstir (0). Otomatik
geçiş 1'e geçince şerit 0'a geri çekiliyordu.

### DÜZELTME

- `followStripIndex(m, idx, autoAdvance)` — saf fonksiyon: otomatik geçiş
  açıkken şerit **aktif bölümü** gösterir.
- `markTextFollow` indeksi bu fonksiyonla sabitler.
- Bölüm oynatıcısının `timeupdate`i `activeSegIndex(mm)` kullanır (eski indeks
  değil) — hem şerit hem spektrogram kaplaması.

### ÖLÇÜM (v2.147, aynı gerçek ses)

| Durum | Sonuç |
|---|---|
| Aktif bölüm 2 iken şerit anahtarı | **her örnekte `1|…`** |
| Eski bölüme geri dönüş | **0** |
| JS hatası | 0 |

### DÜRÜST SINIR

Bu düzeltme, **zaman çakışması olmayan** veride de görülen bir hatayı kapatır
(eski indeks kullanımı). Kullanıcı verisinde "Zaman sorunları" boşsa karışmanın
kaynağı buydu; doluysa v2.145'teki çakışma koruması da devreye girer.

Koruyan test: `birim-testleri` [57] (4).

## v2.146 — Zaman sorunu düzenlerken anında görünüyor

CANLI VERİ. Kullanıcı: *"Boş bir kayıt açtım, ilk bölümün sonunu bilerek
uzattım; otomatik olarak zaman sorunu göstermedi, sayfayı yenileyince sorun var
dedi."*

### ÖLÇÜM (v2.145, gerçek Chromium)

| Adım | Sonuç |
|---|---|
| 1. bölümün bitişi 00:00:04.000 yapıldı (2. bölümle çakışır) | çip **yok**, ⚠ **yok** |
| Sayfa yenilendi | çip "Zaman sorunları 2", ⚠ 2 satır |

Kök neden: zaman değişiminde `updateSegListItem` satırı yeniden çiziyordu ama
**⚠ parametresini geçmiyordu**; "Zaman sorunları" çipi ise yalnız tam çizimde
oluşturuluyordu (sayaç güncellemesi çipi ekleyemiyordu).

### DÜZELTME

- `segmentTimeIssueAt(segments, i)` — çakışmanın/yinelenmenin **iki tarafı da**
  kendi satırında işaretlenir.
- Zaman düzenlemesinden sonra **kendisi + önceki + sonraki** satır tazelenir.
- Filtre çipleri tek kaynak (`segFilterChipsHtml`); "Zaman sorunları" çipi sorun
  oluşunca **eklenir**, sorun bitince **kaldırılır**.

### ÖLÇÜM (v2.146, gerçek Chromium)

| Adım | Sonuç |
|---|---|
| Aynı düzenleme, sayfa yenilemeden | çip **"Zaman sorunları 2"** |
| ⚠ rozetli satır | **2** (1 ve 2; ipuçları birbirini gösterir) |
| JS hatası | 0 |

Koruyan test: `birim-testleri` [56] (5).

## v2.145 — Takip vurgusu çakışan bölümlerde geri atlamıyor

CANLI VERİ. Kullanıcı: *"Çal'a basınca otomatik geçiş ve canlı vurgu açık;
bir önceki segment bir sonrakiyle mi karışıyor, vurgu sürekli değişiyor."*

### KÖK NEDEN (kod okuması + saf fonksiyon testi)

`followTick` zamanı tarayıp **t'yi içeren İLK bölümü** seçiyordu. Aralıklar
çakışıyorsa (ör. 0–5 ve 3–8), oynatma sonraki bölüme geçtiğinde zaman 5 → 3'e
**geri atlıyor**; tarama yine ilk bölümü buluyor ve vurgu önceki bölüme
dönüyordu. Kullanıcının gördüğü "karışma" budur.

### DÜZELTME

- `segmentIndexAtTime(segments, t, preferIdx)` — saf fonksiyon.
  **t hâlâ aktif bölümün aralığındaysa aktif kalır**; değilse t'yi içeren ilk
  bölüm; o da yoksa t'den sonra başlayan ilk bölüm.
- `followTick` bu fonksiyonu kullanır.

### ÖLÇÜM (birim, v2.145)

| Durum | Sonuç |
|---|---|
| Temiz veri, t=4 | 2. bölüm |
| Boşluk, t=3 | sonraki bölüm |
| Çakışma, t=4, tercih yok | ilk bölüm (eski davranış) |
| Çakışma, t=4, **aktif=2** | **2. bölüm korunur** |
| Aktif bölüm dışına çıkış | normal seçim |
| Kayıt sonu | −1 |

### KULLANICI NE GÖRECEK

- Çakışan aralıklarda vurgu artık komşu bölüme atlamaz.
- Çakışma **veride varsa** "Zaman sorunları" filtresinde görünür; düzeltmeyi
  siz yaparsınız.

### DÜRÜST SINIR

Saf seçim mantığı birim testiyle doğrulandı. **Gerçek sesle** uçtan uca takip
denemesi bu ortamda yapılamadı (sentetik kayıtta ses yok); kullanıcı verisinde
"Zaman sorunları" filtresi boşsa bu düzeltme devreye girmez ve karışma başka bir
kaynakta aranmalıdır.

Koruyan test: `birim-testleri` [55] (8).

## v2.144 — Zaman çakışmaları görünür oldu

CANLI VERİ. Kullanıcı: *"82 bölüm var; yanlışlıkla aynı zamanı mı böldük,
aralıklar birbirine giriyor mu, listeden göremiyoruz."*

### EKLENEN

- `segmentTimeIssues(segments)` — saf fonksiyon. Bildirdiği durumlar:
  **önceki bölümle çakışma**, **aynı aralığın yinelenmesi**, **sıfır süre**,
  **ters aralık**, **okunamayan zaman**. Hiçbir zamanı DÜZELTMEZ.
- Liste satırında **⚠** rozeti; ipucunda hangi bölümle çakıştığı yazar
  (ör. "önceki bölümle çakışıyor (bölüm 11)").
- Araç çubuğunda **"Zaman sorunları N"** filtresi; yalnız sorunlu bölümleri
  listeler. Sorun yoksa çip görünmez.
- Çakışmanın **iki tarafı da** işaretlenir (filtrede rozetsiz satır kalmaz).

### ÖLÇÜM (v2.144, 82 bölüm, gerçek Chromium)

| Durum | Sonuç |
|---|---|
| 1 çakışma + 1 yinelenen + 1 sıfır süre | çip **"Zaman sorunları 5"** |
| ⚠ rozetli satır | **5** (11, 12, 21, 22, 31) |
| Filtre tıklanınca | **5 satır** (yalnız sorunlular) |
| JS hatası | 0 |

### KULLANICI NE GÖRECEK

- Sorunlu bölümler listede **⚠** ile görünür; üzerine gelince nedeni yazar.
- "Zaman sorunları" filtresiyle yalnız onları görürsünüz.
- Uygulama karar vermez; hangi bölümün çakıştığını söyler.

Koruyan test: `birim-testleri` [54] (8 kontrol).

## v2.143 — Bölüm detayının alt kısmı kırpılmıyor

CANLI VERİ. Kullanıcı: *"sd-left diye bir şey görüyorum; sd-meta'nın yarısı
görünmüyor, ondan sonrası yok."*

### ÖLÇÜM (v2.142, 1440×900)

| Ölçüm | Sonuç |
|---|---|
| Detay paneli | **385 px** yüksek, içerik **795 px** |
| Panel `overflow-y` | **visible** (kaydırmıyor) |
| `sd-meta` | 818–919 (panel 635'te bitiyor → **görünmüyor**) |
| `sd-obs` (gözlem düğmeleri) | 927–950 (**görünmüyor**) |

Kök neden: v2.129'un `#view-audio .seg-detail { overflow: visible !important }`
kuralı masaüstü panelinin kaydırmasını eziyordu; taşan içerik
`.seg-workspace`in `overflow:hidden`ı tarafından **kırpılıyordu**.

### DÜZELTME

- Masaüstünde `.seg-detail { overflow-y: auto !important; max-height: none }`.
- Panel kendi içinde kayar; alt içerik erişilebilir.

### ÖLÇÜM (v2.143, gerçek Chromium)

| Durum | Sonuç |
|---|---|
| Panel | 385 px, `overflow-y: auto`, içerik 795 px |
| Sona kaydırınca | `sd-meta` 408–509, `sd-obs` 517–540 → **görünür** |
| JS hatası | 0 |

### KULLANICI NE GÖRECEK

- Bölüm detayında **hiçbir alan kesilmiyor**: başlangıç/bitiş, konuşmacı,
  kontrol, profil ve gözlem düğmeleri panelde kaydırılarak erişilir.
- Panelin sağında ince bir kaydırma çubuğu görünür.

Koruyan test: `tasarim-testi` [2r] (2).

## v2.142 — Çalışma modu kaldırıldı; kayıt listesi dikey

CANLI VERİ. Kullanıcı devtools'ta baktı ve üç şeyi bildirdi: (1) gizli
`workspaceBar` ("önceki/sonraki") artık gereksiz, (2) kayıt sütununun başlığı
("9 kayıt") görünmüyor, (3) dosyalar **yanyana** duruyor — alt alta listelensin.

### ÖLÇÜM (v2.141)

| Bulgu | Ölçüm |
|---|---|
| `#workspaceBar` | DOM'da duruyor (gizli), mantığı hâlâ kodda |
| Kayıt sütunu başlığı | `display:none` (gizlenmişti) |
| `#audioList` | `display:flex` → **yatay çip şeridi**; 100 kayıt yanyana |
| `#audioList` max-height | 190 px → liste **kendi içinde** ayrıca kayıyordu |

### DÜZELTME

- **Çalışma modu tamamen kaldırıldı:** `workspaceBar`, `workspaceBtn`,
  `setWorkspace`, `updateWorkspaceBar`, W/L kısayolları, otomatik giriş,
  `ws-mode` CSS'i. Dar ekranda da ayrı mod yok; kayıt listesi her zaman görünür.
- **Kayıt listesi dikey:** `#audioList` artık `display:grid`, tek sütun.
- **Tek kaydırma:** listenin `max-height` sınırı kaldırıldı; kaydırma **kayıt
  sütununda** (100 kayıtta ikinci çubuk yok).
- **Başlık görünür:** "Ses kayıtları" + "N kayıt" sayısı sütunun üstünde.

### ÖLÇÜM (v2.142, gerçek Chromium)

| Durum | Sonuç |
|---|---|
| 100 kayıt, 1440 px | liste **5.711 px dikey**, sütun 569/5.762 → **tek kaydırma** |
| 9 kayıt, 1440 px | liste 516 px, sütun 569/569 (kaydırma yok) |
| 900 px | dikey liste, sayfa kaymıyor (900/900) |
| `#workspaceBar` / `#workspaceBtn` | **DOM'da yok** |
| JS hatası | **0** |

### KULLANICI NE GÖRECEK

- Dosyalar solda **alt alta**; 100 kayıt olsa da tek kaydırma çubuğu.
- "Kayıt listesine dön" ve "Çalışma modu" **yok**.
- Kayıt sütununda "Ses kayıtları · N kayıt" başlığı görünür.

Koruyan test: `tasarim-testi` [2p] (4) + [2q] (2). CSS borcu düştü:
`!important` 70 → 59, ölü bildirim 98 → 96, app→layer 507 → 496.

## v2.141 — Masaüstünde çalışma modu ve "Kayıt listesine dön" kaldırıldı

Kullanıcı: *"o kayıt listesi kısmı… ilk açılınca 'kayıt listesine geri dön'
diye bir buton var, o gereksiz olmuş; kaldıralım; madem dosyaları alt alta
listelesin."* Haklı: v2.140 kabuğunda kayıtlar **sürekli solda**, çalışma modu
ise kayıt sütununu gizleyip geri dönme düğmesi gösteriyordu — çelişki.

### DÜZELTME (≥901 px)

- Otomatik çalışma moduna giriş **kaldırıldı**; Ses görünümü doğrudan masaüstü
  düzeninde açılır.
- `.workspace-bar` ve `#workspaceBtn` masaüstünde **gizli**.
- `ws-mode` bir şekilde açık kalsa bile (dar ekrandan genişletme) **kayıt
  sütunu görünür** kalır.
- W/L kısayolu masaüstünde bilgilendirme gösterir: "Masaüstü düzeninde kayıtlar
  solda; çalışma modu gerekmiyor."
- ≤900 px: çalışma modu **eskisi gibi** çalışır (dar ekran yedeği).

### ÖLÇÜM (v2.141, 362 bölüm)

| Genişlik | ws-mode | Çalışma çubuğu | Kayıt sütunu | Liste |
|---|---|---|---|---|
| 1440 | **kapalı** | gizli | **görünür (148–719)** | 385 px, kendi kaydırması |
| 900 | açık (otomatik) | görünür (110–168) | gizli (çalışma modu) | sayfa kaydırması |

JS hatası 0.

### KULLANICI NE GÖRECEK

- Masaüstünde Ses görünümü açılınca **"← Kayıt listesine dön" yok**; dosyalar
  solda alt alta durur.
- "⛶ Çalışma modu" düğmesi masaüstünde görünmez.
- Dar ekranda bu düğme ve mod eskisi gibi çalışır.

Koruyan test: `tasarim-testi` [2p] (4 kontrol).

## v2.140 — Masaüstü kabuğu: sabit çerçeve, paneller kendi kaydırır

CANLI VERİ. Bilirkişi: *"aşağı doğru uzayıp gitmesi çok garip; uygulama
masaüstü uygulaması havasında olmalı."* Haklı: v2.129'da seçilen "tek uzun
sayfa" kararı 362 bölümde çalışmıyor.

### ÖLÇÜM (v2.139, 362 bölüm, 1440×900)

| Ölçüm | Sonuç |
|---|---|
| Ses görünümü yüksekliği | **14.156 px** (tek sayfa) |
| Bölüm listesi | 13.441 px, sayfayla birlikte akıyor |
| Düzenleme paneli | aşağı kaydırınca ekran dışında |

### DÜZELTME (≥901 px)

- Kabuk sabit: `html/body/.app-shell/.main-area` taşmıyor; üst bar ve durum
  çubuğu sabit.
- Ses görünümü üç bölmeli ızgara: **kayıtlar (220 px) · bölüm listesi (320 px)
  · düzenleme paneli**.
- Bölüm listesi ve düzenleme paneli **kendi içinde kayar**; panel her zaman
  görünür.
- Kayıt başlığı kompakt; **oynatıcı korunur**, yalnız kayıt düzeyi dalga
  gizlenir (bölüm dalgası panelde durur).
- Liste paneli dar olduğu için satırlar iki satır: metin + **durum rozeti**.
- Düzenleme panelinde metin üstte, teknik panel altta (tam genişlik) → hiçbir
  düğme kesilmiyor.

### ÖLÇÜM (v2.140, 362 bölüm, 1440×900)

| Ölçüm | Sonuç |
|---|---|
| Belge / ana alan | **900 / 900 px** (sayfa kaymıyor) |
| Üst bar | 0–60 (sabit) |
| Durum çubuğu | 876–900 (sabit) |
| Bölüm listesi | 528 px, **kendi kaydırması** (21.473 px içerik) |
| Düzenleme paneli | 248–778, **hep görünür**; kendi kaydırması (783) |
| 181. bölüme tıklama | panelde "Bölüm 181 / 362" görünür |
| Yatay taşma / JS hatası | yok / 0 |

### KULLANICI NE GÖRECEK

- Sayfa artık **aşağı doğru uzamıyor**; üst bar ve durum çubuğu yerinde kalır.
- Bölüm listesinde tekerlekle gezinirken **düzenleme paneli sağda durur**.
- Kayıt değiştirmek için soldaki kayıt sütunu kullanılır.

### BİLİNEN SINIR

- **≤900 px:** eski tek-kaydırma düzeni (dar ekran yedeği). Bu genişlikte
  uzun listelerde panel yine aşağıda kalır.

Koruyan test: `tasarim-testi` [2o] (6 kontrol). CSS borcu nöbetçisi [8]
güncellendi (26/68/98/507/15).

## v2.139 — Uzun listede düzenleme paneli hep görünür

CANLI VERİ. Bilirkişinin kaydında **362 bölüm** var. Ölçüm: listede %45'e
kaydırıp 181. bölüme tıklayınca detay "Bölüm 181 / 362" olarak güncelleniyor
ama blok **−5.899 px**'te (ekranın 5,9 bin px üstünde) kalıyordu; editör
görünmüyordu. Tıklama "hiçbir şey olmadı" gibiydi — çalışma modu açık ve
kapalı, ikisinde de.

### DÜZELTME

- `.seg-detail` artık **yapışkan** (`position: sticky; top: 8px`); çalışma
  modunda yapışkan çubuğun altında (`top: 53px`).
- Yükseklik ekranla sınırlı (`max-height: calc(100vh - …)`); panel ekrandan
  uzunsa yalnız o zaman kendi içinde kayar. Kısa listede davranış değişmez.
- Yapışkanlığı engelleyen `overflow:hidden` sarmalayıcılar (segments-root,
  transcript-editor, card-pane, audio-content-zone, audio-card) yalnız
  **deşifre sekmesi** kapsamında görünür yapıldı; diğer sekmelerin kendi
  kaydırması korunur. `!important` eklenmedi.

### ÖLÇÜM (v2.139, 362 bölüm, 1440×900)

| Durum | Detay paneli | Editör görünür |
|---|---|---|
| Önce, %45 kaydırma | **−5.899 … −5.364** | ❌ |
| Sonra, %45 (çalışma modu) | **53 … 588** | ✅ |
| Sonra, %75 (çalışma modu) | **53 … 588** | ✅ |
| Sonra, 181. bölüme tıklama | **53 … 588** ("Bölüm 181 / 362") | ✅ |
| Sonra, %45 (mod kapalı) | **8 … 543** | ✅ |

Çubukla çakışma: yok. Yatay taşma: yok. JS hatası: 0.

### KULLANICI NE GÖRECEK

- Uzun listede aşağıdayken bir bölüme tıkladığınızda **metni hemen sağda
  görürsünüz**; sayfa başına dönmeniz gerekmez.
- Dinleme/onay düğmeleri de panelde, hep elinizin altında.

### BİLİNEN SINIR

- **≤900 px (tek sütun):** detay listenin altında kalır; yapışkanlık orada
  devreye girmez. Dar ekranda uzun listeler için ayrı bir düzen gerekir.

Koruyan test: `tasarim-testi` [2n] (4) + [2e] güncellendi. CSS borcu nöbetçisi
[8] yeni eşiklerle (26/59/98/507/14) geçiyor.

## v2.138 — CSS borcu: ölçüm ve nöbetçi (görünür değişiklik yok)

DENETİM. Stil katmanı yama üstüne yama birikmişti. Bu sürüm **davranışı
değiştirmez**; borcu ölçer, belgeler ve artışını engeller.

### ÖLÇÜM (v2.138)

| Ölçüm | Değer |
|---|---|
| app.css kural | 980 |
| reading-layer kural | 691 |
| `!important` | 26 + 63 |
| `.main-area` tanımı | 14 |
| Ölü bildirim (reading-layer içi) | 97 |
| Ölü bildirim (app.css → layer) | 494 |

### NEDEN TEMİZLİK YAYINLANMADI

Otomatik silme denendi; kanıt olarak "son değer haritası"nın değişmediği
gösterilecekti. Kendi ayrıştırıcımız kaldırma sonrası yapıyı bozdu (4.284 →
26.494 anahtar). Dış paket yasak. **Kanıtsız 500 bildirim silinmedi** —
bu, deponun tekrar eden "bir düzeltme başka paneli bozar" hatasını üretirdi.

### NÖBETÇİ

`tasarim-testi` **[8]**: `!important` 26/63, ölü bildirim 97/494,
`.main-area` 14 eşiklerini aşan değişiklik testi **kırar**.
Kanıt: tek bir `!important` eklendi → KALDI; geri alındı → geçti.

### KULLANICI NE GÖRECEK

- **Görünür değişiklik yok.** Ekran, davranış, çıktı aynı.
- Kazanç: bundan sonraki düzeltmelerde "başka panel bozuldu" riskini azaltan
  bir ölçüm ve nöbetçi var.

Ayrıntı: [`docs/CSS_BORCU.md`](docs/CSS_BORCU.md).

## v2.137 — Rapor kâğıdı dar ekranda kırpılmıyor

DENETİM (v2.136 kapanış taraması). `#view-report` `overflow-x: hidden`;
kâğıdın en küçük genişliği tablo içeriğinden geliyordu.

### ÖLÇÜM (v2.136, 40 bölüm)

| Genişlik | Görünüm | Kâğıt | Kesilen |
|---|---|---|---|
| 900 | 782 | 782 | 0 |
| **760** | **642** | **678** | **26 px** |
| **600** | **538** | **590** | **40 px** |

Kesilen kısım kaydırılamıyordu (overflow hidden) → kâğıdın sağ kenarı
görünmüyordu.

### DÜZELTME

- ≤900 px: `#view-report .report-paper { padding: 26px 16px }` (iç boşluk azalır).
- ≤900 px: tablo başlığı/hücreleri `overflow-wrap: anywhere` → **sarar**.
- Yalnız ekran; `@media print` ve UDF/DOCX üretimi etkilenmez.

### KULLANICI NE GÖRECEK

- Dar ekranda rapor önizlemesinin **sağ kenarı görünür**; metin kesilmez.
- Kâğıt genişliği 1440 px'te değişmedi (900 px); yazdırma çıktısı aynı.

### ÖLÇÜM (v2.137, gerçek Chromium)

| Genişlik | Görünüm | Kesilen |
|---|---|---|
| 1440 | 1310/1310 | 0 |
| 900 | 782/782 | 0 |
| 760 | 642/642 | 0 (önce 26) |
| 600 | 538/538 | 0 (önce 40) |

Koruyan test: `tasarim-testi` [2m] (2 kontrol) — düzeltme yokken **KALDI**.

## v2.136 — Sekme simgesi (favicon)

DENETİM. Tarayıcı her açılışta `/favicon.ico` istiyor, **404** dönüyordu;
sekmede kırık/boş simge görünüyordu.

### DÜZELTME

- `assets/favicon.svg` — raylı marka ile aynı dil (lacivert zemin, altın "A").
- `favicon.ico` (32×32, 4.286 bayt) — tarayıcının varsayılan isteği için.
- `index.html`: `<link rel="icon" type="image/svg+xml">` + `rel="alternate icon"`.

### KULLANICI NE GÖRECEK

- Sekmede uygulamanın simgesi görünür.
- Konsolda `favicon 404` uyarısı kalmaz (ölçüldü: 0).

Koruyan test: `tasarim-testi` [4b] (3 kontrol) — düzeltme yokken **KALDI**.
Gerçek Chromium: `favicon.svg` 200, `favicon.ico` 200, sunucu günlüğünde 404: 0.

## v2.135 — Kritik uyarılar ekran okuyucuya duyuruluyor

DENETİM. Görsel uyarılar yerindeydi ama işitme/ekran okuyucu tarafı boştu:
sayfada **aria-live bölgesi 0**'dı. `#toast` ve "KAYDEDİLMİYOR" şeridi
`role`/`aria-live` taşımıyordu.

### ÖLÇÜM (v2.134, erişilebilirlik ağacı)

| Öğe | Önce | Sonra |
|---|---|---|
| `#toast` | rol yok | **status · live=polite · atomic** |
| `#versionNotice` | rol yok | **status · live=polite** |
| Kayıt hatası şeridi | rol yok | **alert · live=assertive** |
| Depolama şeridi | rol yok | **alert · live=assertive** |

### DÜZELTME

- `showToast(msg, urgent)`: normal bildirim `role=status/aria-live=polite`;
  kritik bildirim `role=alert/aria-live=assertive`.
- Kritik yollar (kayıt okunamadı, dosya atlandı) `urgent=true` ile çağırır.
- Kayıt hatası ve depolama şeritleri `role=alert` + `aria-live=assertive`
  (her çağrıda tazelenir).
- `#toast` ve `#versionNotice` HTML'de de canlı bölge olarak tanımlı; JS
  çalışmadan önce de doğru.

### KULLANICI NE GÖRECEK

- Görsel olarak hiçbir şey değişmedi.
- Ekran okuyucu kullanan bilirkişi, veri kaybı riskini **duyar** (kesintili);
  sıradan bilgiler (ör. "2 dosya geri yüklendi") bekleyen işi bölmez.

Koruyan test: `birim-testleri` [53] (14 kontrol) + `tasarim-testi` [6]
(2 canlı bölge kontrolü) — düzeltme yokken **KALDI**.
Gerçek Chromium: erişilebilirlik ağacında `role=status`, `live=polite`,
`atomic=true` doğrulandı; JS hatası 0.

## v2.134 — İlk açılışta hayalet kayıt oluşmuyor

DENETİM. v2.109 "boş taslak kayda yazılmaz" diyordu ve `casesForStorage` boş
dosyayı eliyordu; ancak `persistNow` **yine de** `{cases: []}` kaydını yazıyordu.

### ÖLÇÜM (v2.133, temiz profil)

| Adım | IndexedDB `state` |
|---|---|
| İlk açılış | **1 kayıt**, `cases: []` |
| Yeni sekme | aynı kayıt görünüyor (hayalet) |

Ayrıca aynı hata bir **veri geri gelmesi** riski taşıyordu: tüm dosyalar
silinirse boş kayıt yazmak eski kaydı diskte bırakır → silinen dosyalar
yeniden yüklenir.

### DÜZELTME

- `persistPayloadFor(state)` — yazılacak gövde; kullanıcı verisi yoksa `null`.
- `persistNow`: gövde `null` ise **yazmaz, kaydı SİLER**. Böylece hem ilk
  açılışta hayalet oluşmaz hem silinen veri geri gelmez.
- `flushPersist`: boş çalışma alanında anlık kopyayı **siler**
  (`akis.lastSnapshot`); bayat kopya kalmaz.

### KULLANICI NE GÖRECEK

- Yeni tarayıcıda/sekmede **"zaten dosya var" görünmez**; seçici
  "— Yeni dosya —" der.
- Bir bilgi yazdığınız anda dosya gerçek olur ve kaydedilir.
- Tüm dosyaları silerseniz, sayfayı yenilediğinizde **geri gelmez**.

### ÖLÇÜM (v2.134, gerçek Chromium, temiz profil)

| Adım | `state` kaydı | Seçici |
|---|---|---|
| İlk açılış | **0** | — Yeni dosya — |
| Yeniden yükleme | **0** | — Yeni dosya — |
| `2026/999` yazıldı | **1** (`2026/999`) | 2026/999 |
| Yeniden yükleme | **1** (`2026/999`) | 2026/999 |

Anlık kopya: boş açılışta `null`. JS hatası 0.

Koruyan test: `birim-testleri` [52] (8 kontrol) — düzeltme yokken **KALDI**.

## v2.133 — Durum çubuğu yazıları kesilmiyor

DENETİM. Durum çubuğu öğeleri `white-space:nowrap; overflow:hidden;
text-overflow:ellipsis` ile kırpılıyordu. 1440 px'te sığıyor, **1100 px ve
altında 6 öğenin 6'sı** da kesiliyordu.

### ÖLÇÜM (v2.132, 60 bölüm)

| Öğe | 1440 px | 1100 px |
|---|---|---|
| Dosya · mahkeme | 273/273 | **241/273** |
| 1 kayıt | 38/38 | **34/38** |
| 60 bölüm | 53/53 | **47/53** |
| Denetim + eksik özeti | 280/280 | **248/280** |
| Model | 102/102 | **90/102** |
| Bilimsel sınır notu | 246/246 | **217/246** |

### DÜZELTME

- ≤1200 px'te `.statusbar` → `flex-wrap: wrap`, `height: auto`,
  `min-height: var(--status-h)`, satır aralığı 2 px.
- `.statusbar .sb-item` → `white-space: normal`, `overflow: visible`,
  `text-overflow: clip`. Öğe kesilmez; gerekirse **sarar**.
- Çalışma modundaki kayıt başlığı (`#wsTitle`) tek satır kalır ama **tam ad
  `title` ipucunda** durur (dosya adı tanımlayıcıdır; kart başlığında da tam
  görünür).

### KULLANICI NE GÖRECEK

- Küçük ekranda dosya/mahkeme, "30 bölüm eksik…" ve model bilgisi **tam**
  okunur; "…" ile kesilmez.
- Durum çubuğu gerekirse iki satıra çıkar (26 → 34 px). Listenin altında
  olduğu için hiçbir satırı örtmez.

### ÖLÇÜM (v2.133, gerçek Chromium)

| Genişlik | Çubuk | Kesilen öğe | Örtülen satır | Yatay taşma |
|---|---|---|---|---|
| 1440 | 26 px | 0 | 0 | yok |
| 1100 | 34 px | 0 | 0 | yok |
| 1000 | 34 px | 0 | 0 | yok |
| 900 | 34 px | 0 | 0 | yok |
| 760 | 34 px | 0 | 0 | yok |
| 600 | 34 px | 0 | 0 | yok |

Koruyan test: `tasarim-testi` [2l] (4 kontrol) — düzeltme yokken **KALDI**.

## v2.132 — Kurtarma kopyasında sessiz dosya düşmesi kapatıldı

DENETİM. İki yükleme yolu **ayrı sözleşme** kullanıyordu:

| Yol | Bozuk dosya davranışı |
|---|---|
| Ana yükleme (`loadState`) | `failed` listesi + `reportLoadFailures` (v2.84) |
| Kurtarma kopyası (depo boşken) | **`catch (e) {}` — sessiz atlama** |

Kurtarma kopyasında 3 dosya varken biri okunamazsa ekran **"2 dosya geri
yüklendi"** diyor, üçüncünün kaybolduğunu söylemiyordu.

### DÜZELTME

- `normalizeRescueCases(rawCases)` — saf fonksiyon; dosyaları **ayrı**
  normalleştirir, `{ cases, failed }` döndürür.
- Kurtarma dalı artık `failed` varsa `reportLoadFailures` çağırır: durum
  çubuğu + bildirim + ham kayıt (`akis.rescue.failedCases`). Kopya **silinmez**.
- Kimlik okuması da korunur (`raw.id` fırlatırsa boş kalır, bildirim yine olur).

### KULLANICI NE GÖRECEK

- Kurtarma kopyasından geri yüklemede bir dosya okunamazsa **kaç dosyanın
  atlandığı** yazılır; "her şey geri geldi" izlenimi oluşmaz.
- Ham kayıt kurtarma alanında tutulur; kopya korunur (elle kurtarma mümkün).

### DÜRÜST SINIR

Bu yol, geçerli JSON verisiyle **yeniden üretilemez**: `normalizeCase`
savunmacı yazıldığı için sıradan bozuk alanları tolere eder. Test, fırlatan bir
kayıt (Proxy) ile sözleşmeyi sınar; tarayıcıda ise normal akış doğrulandı
(2 dosyalık kopya → soru → geri yükleme → bildirim). Yani kapatılan şey
**kanıtlanmış bir sessiz kayıp sınıfı**, sık görülen bir hata değil.

Koruyan test: `birim-testleri` [51] (10 kontrol) — düzeltme yokken **KALDI**.
Gerçek Chromium: kurtarma sorusu çıktı, 2 dosya geri yüklendi, bildirim
göründü, kopya korundu, JS hatası 0.

## v2.131 — Görünüm kutusu içerikle büyür (yapışkan üst bar, taşmayan durum çubuğu)

DENETİM. v2.129'un "çalışma modunda üst bar yapışkan" vaadi **yalnız ilk 635
pikselde** geçerliydi; durum çubuğu ise bölüm satırlarının üstüne biniyordu.

### ÖLÇÜM (v2.130, 60 bölüm, 1440×900)

| Ölçüm | Önce | Sonra |
|---|---|---|
| `#view-audio` kutusu / içerik | **635 / 2582 px** | **2592 / 2592 px** |
| `flex` | `1 1 auto` | `0 0 auto` |
| Çalışma çubuğu `top` (scroll 700) | **−42** | **0** |
| Çalışma çubuğu `top` (scroll 1200 / 1900 / 2400) | −542 / −1242 / −1245 | **0 / 0 / 0** |
| Durum çubuğu konumu | 713–739 (listenin ÜSTÜNDE) | 2670 (listenin ALTINDA) |
| Örtülen bölüm satırı | **2** | **0** |
| Durum çubuğunda tıklama | `elementFromPoint` → `.sb-item` (yutuluyor) | örtüşme yok |

Kök neden: görünüm kutusu `flex: 1 1 auto` ile 635 px'e sabitleniyor, içerik
taşıyordu. Yapışkan çocuk, kutusunun bittiği yerde bırakıyor; durum çubuğu da
kutunun bittiği yerde içeriğin üstüne biniyordu.

### DÜZELTME

- `#view-audio.active { flex: 0 0 auto }` — kutu içeriği kadar uzar.
- Kaydırma yine **tek yerde** (`.main-area`, v2.129 kuralı korunur).
- Durum çubuğu artık listenin **altında**; hiçbir satırın üstüne binmez,
  tıklamayı yutmaz.

### KULLANICI NE GÖRECEK

- Çalışma modunda **önceki/sonraki kayıt** düğmeleri listenin **sonuna kadar**
  üstte kalır; kaybolmaz.
- Liste satırlarının üstüne hiçbir çubuk binmez; tıklamalar hedefe gider.
- Durum çubuğu listenin altına taşındı; sayfa sonuna gelince görünür. Kayıt ve
  depolama durumu üst barda okunmaya devam eder.

Koruyan test: `tasarim-testi` [2k] — düzeltme yokken **KALDI**.
Gerçek Chromium: 1440/1280/1200/1100/900/760 → son bölüm ve kısayollar görünür,
yatay taşma yok, JS hatası 0.

## v2.130 — Bölüm listesinde onay durumu artık görünüyor

DENETİM. v2.129 sonrası gerçek veriyle (60 bölüm, 1440×900) yapılan tarayıcı
ölçümü, bölüm listesinde **durum rozetinin hiç görünmediğini** ortaya çıkardı.

### ÖLÇÜM (v2.129, 60 bölüm)

| Ölçüm | Sonuç |
|---|---|
| `#view-audio .seg-badges` | `max-width: 96px; overflow: hidden` |
| Rozet sağ kenarları | **591** ve **656** |
| Kap sağ kenarı | **582** |
| Görünen | yalnız "Öncelik: Düşü…" |
| Görünmeyen | **"Bekliyor / Onaylandı / Çözümlendi"** |

Rozet sırası konuşmacı → öneri → öncelik → **durum** idi. Sabit 96 px'lik kap
dolunca **en önemli bilgi (durum) ilk kesilen** oldu.

### DÜZELTME

- Durum rozeti **ilk sıraya** alındı (`segItemHtml`).
- Rozet kutusu sabit genişliğe kilitlenmiyor: `max-width: none`,
  `overflow: visible`, `flex-wrap: wrap`. Sığmayan rozet **sarar**, kesilmez.
- ≤1200 px'te rozetler **metnin altına** iner; metin sütunu daralmıyor.

### KULLANICI NE GÖRECEK

- Bölüm listesinde her satırda **onay durumu** (Bekliyor / Onaylandı /
  Çözümlendi / Anlaşılmadı / Yeniden / Belirsiz) artık **görünüyor**.
- Rozetler kesilmiyor; sığmazsa alt satıra geçiyor. Dar ekranda satır biraz
  uzuyor, bilgi eksilmiyor.

### ÖLÇÜM (v2.130, gerçek Chromium)

| Genişlik | Satır | Metin | Rozetler | Durum görünür |
|---|---|---|---|---|
| 1440 | 37 px | 181 px | 170 px | ✅ |
| 1280 | 37 px | 120 px | 170 px | ✅ |
| 1200 | 59 px | 267 px | 267 px (alt satır) | ✅ |
| 1100 | 59 px | 229 px | 229 px (alt satır) | ✅ |
| 900 | 59 px | 181 px | 181 px (alt satır) | ✅ |
| 760 | 59 px | 181 px | 181 px (alt satır) | ✅ |

Kesilen rozet: **0** (önce: durum rozeti hiç görünmüyordu).

Koruyan test: `tasarim-testi` [2j] (5 kontrol) — düzeltme yokken **KALDI**.

## v2.129 — Ses görünümü: tek kaydırma, taşma yok

CANLI VERİ. Bilirkişi: *"çalışma modunu kapattığımızda aşağıda yer alan her şey
sayfadan taşıyor ve hiçbir şey görünmüyor… 36 öğe var ama 28'ini görüyorum…
onayla/yeniden dinle görünmüyor."*

### ÖLÇÜM (v2.128, 36 bölüm, 1440×900)

| Ölçüm | Sonuç |
|---|---|
| `html/body` overflow | **hidden** (sayfa kaymıyor) |
| `.main-area` overflow | **hidden** |
| `#audioDetail` | `overflow: visible` |
| `.seg-workspace` / `.seg-list` | **285 px / 612 px** (liste kabı taşıyor) |
| kbd-fold / `.sd-actions` | listenin **ÜSTÜNE** (y817 / y1038) |
| Son erişilebilen öğe | 28–29 (ws kapalı), 32–33 (ws açık) |

Kök neden: sabit `100vh` kabuk + iç içe kaydırma + listenin `max-height: 68vh`
değerinin kabı aşması. Alt içerik ne sayfa ne panel tarafından
kaydırılabiliyordu.

### DÜZELTME

- Kaydırma **yalnız `.main-area`**'da (`overflow-y: auto`).
- `#view-audio`, `.detail-panel`, `#audioDetail`, `.audio-card`,
  `.seg-workspace`, `.seg-list`: **içeriği kadar uzar**; hiçbiri kendi içinde
  kaymaz (iç içe kaydırma yok).
- `.seg-list` `height/max-height` kaldırıldı (`auto/none/visible`).
- Çalışma modunda üst bar **yapışkan** (önceki/sonraki kayıt görünür).
- v2.128 analiz kutusu korunur.

### ÖLÇÜM (v2.129, gerçek Chromium)

| Ölçüm | Kapalı | Açık |
|---|---|---|
| main scroll / client | **1922 / 900** | **1720 / 900** |
| Son öğe (alt) | y805–841 | y825–861 |
| kbd-fold | y861–880 (**altında**) | y881–900 (**altında**) |
| `.sd-actions` | y16–54 (**görünür**) | y37–75 (**görünür**) |
| İç kaydırma (detay) | yok (1597=1597) | yok (1587=1587) |

### KULLANICI NE GÖRECEK

- 36 bölümün **tamamı** kaydırılarak görülür; son öğe ile klavye kısayolları
  **üst üste binmez**.
- **Onayla / Yeniden dinle / Anlaşılmadı** ve alt araçlar görünür.
- Çalışma modu açık/kapalı fark etmez.

### Koruyan testler

`tasarim` [2i] (ana alan kaydırır, iç içe kaydırma yok, yapışkan üst bar).
Gerçek Chromium: 36 bölümle iki modda da son öğe + araçlar + kısayollar
erişilebilir.

## v2.128 — Katmanlı analiz kutusu (dalga + spektrogram aynı yerde)

CANLI VERİ. Bilirkişi: *"spektrogram kısmı olmamış… wave ile aynı yerde
durmalı… altında açılması gereksiz yer kaplamış, tasarımı da bozmuş…
profesyoneller nasıl kullanıyorsa öyle olsun."*

### ÖLÇÜM (v2.127)

- Spektrogram **alt blokta**, tam genişlik; gövde tek sütuna düşüyor, **metin
  aşağı kayıyor**.
- Dalga ve spektrogram **farklı zaman pencereleri** kullanıyordu (dalga
  bölüm ±0,5 sn, spek yalnız bölüm aralığı) → çizgiler hizalanmıyordu.

### DÜZELTME — profesyonel araç düzeni (Praat / Audacity / RX)

- **AYNI kutu**, sabit **160 px**; mod değişince yerleşim zıplamaz.
- Üç mod: **Dalga** (160 px) · **Spek** (160 px) · **İkisi** (48 px dalga +
  112 px spek). Varsayılan **İkisi**; tercih oturumda hatırlanır, kayda yazılmaz.
- **Ortak zaman ekseni** (`analysisView`): iki katman aynı `[a,b]` penceresini
  çizer; zoom/kaydırma ikisini birlikte günceller, spektrogram yeniden hesaplanır.
- **Kaplama katmanı**: S/B sınırları, oynatma çizgisi, A–B aralığı ve imleç
  spektrogramın **ÜSTÜNDE**; her harekette spektrogram yeniden çizilmez.
- Etkileşim iki katmanda da: tıkla = konuma git · sürükle = A–B · Alt+tıkla =
  sınır · tekerlek = zoom · Shift+sürükle = kaydır.
- v2.126’daki **tam genişlik-altı düzen geri alındı**.

### ÖLÇÜM (v2.128, gerçek Chromium)

| Ölçüm | Sonuç |
|---|---|
| Kutu yüksekliği (üç mod) | **160 px sabit** |
| Metin kayması (mod değişimi) | **0 px** |
| Dalga/spek aynı x ve genişlik | **evet** |
| Tıkla (%50) | **3,0 sn** |
| Sürükle | **A 2,403 → B 3,601** |
| Zoom (tekerlek) | **1,5–4,5 → 1,8–4,2** |

### KULLANICI NE GÖRECEK

- Spektrogram **dalganın yerinde**; altına açılmıyor, yer kaplamıyor.
- **İkisi** ile dalga + spek birlikte; **Spek** ile yalnız spektrogram.
- Çizgiler spektrogramın üstünde; zoom iki katmanı birlikte büyütür.

### Koruyan testler

`birim` [50] (mod düzeni, ortak pencere), `tasarim` [2g] (sabit 160 px, mode
sınıfları, kaplama). Gerçek Chromium: mod geçişlerinde metin kayması 0, zoom
ile ortak pencere daralıyor.

## v2.127 — Yerleşim: yazı listeye bitişik, kontroller yanında

CANLI VERİ. Bilirkişi: *"bölüm yazan yer detaydaki player ve ok tuşları sağda
kalmış ama segment listesi solda biraz git gel uzak oluyor…"*

### ÖLÇÜM (v2.126, 1440 px)

| Ölçüm | Sonuç |
|---|---|
| Liste sağ kenarı → metin sol | **361 px** |
| Liste → oynat düğmesi | **699 px** |
| 1280 / 1100 px | 600 / 488 px |

Ayrıca: detay ilk bölümü gösterirken `activeSeg` tanımsızdı; **bölüm seçmeden
"▶ Dinle" hiçbir şey yapmıyordu** (`paused:true`, `segStop:false`).

### DÜZELTME

- Gövde sütunları görsel olarak ters: **metin solda**, teknik (dalga/zaman/
  konuşmacı) sağda. `order` ile; DOM okunabilirliği metin önce.
- Başlık `justify-content: flex-start`: oynat/ok düğmeleri **solda**.
- `activeSegIndex(m)`: tanımsız/aralık dışı `activeSeg` → 0; `playActiveSegment`
  bunu kullanır ve `activeSeg`'i yazar.

### ÖLÇÜM (v2.127, gerçek Chromium)

| Ölçüm | Önce | Sonra |
|---|---|---|
| Liste → metin | 361 px | **23 px** |
| Liste → oynat | 699 px | **186 px** |
| 1280 / 1100 / 900 px | 600/488/348 | **186 / 186 / 186** |
| Yatay taşma | — | **0 px** |
| Bölüm seçmeden oynat | çalmıyor | **çalıyor** (`t 0.81`) |

### KULLANICI NE GÖRECEK

- Yazı alanı liste ile aynı hizada; göz gidiş-gelişi kısalıyor.
- Oynat/ok düğmeleri metnin hemen yanında.
- Bölüm seçmeden "▶ Dinle" görünen bölümü çalar.

### Koruyan testler

`birim` [49] (`activeSegIndex`), `tasarim` [2h] (sütun sırası, başlık).
Gerçek Chromium: 1440/1280/1100/900 ölçümleri.

## v2.126 — Spektrogram: tam genişlik analiz yüzeyi

CANLI VERİ. Bilirkişi: *"spektrograma basınca … herhangi bir işlem
yapamıyorum … burası analiz için çok işlevsel olabilir … wave yerine sadece
spektrogram mı gösterseydik ama üzerinde yine işlem yapabilmeliyiz."*

### ÖLÇÜM (v2.125)

| Ölçüm | Sonuç |
|---|---|
| İç tuval / ekranda | 900 px → **323 px** (2,8× yatay küçültme) |
| Yükseklik | 88 px |
| Tıklama | oynatıcı konumu **değişmiyor** |
| Klavye odağı | `tabIndex = -1` |

### DÜZELTME

- **Tam genişlik**: spektrogram açıkken gövde tek sütun (`spec-mode`); tuval
  **773 px** (detay 801), yükseklik **200 px**. Dalga gizlenir.
- **Etkileşim**: tıkla = konuma git · sürükle = A–B seç (döngü açılır) ·
  Alt+tıkla = en yakın sınırı taşı · fare = zaman/frekans okuması.
- **Kaplama katmanı**: imleç ve A–B ayrı tuvalde çizilir; spektrogram her
  harekette YENİDEN HESAPLANMAZ.
- **Okuma**: `00:00:01.000 · 1,8 kHz` (log ölçek, örnekleme hızından).
- Bölüm değişince dalgaya döner; kapatınca dalga geri gelir.

### KULLANICI NE GÖRECEK

- Spektrogram artık **geniş ve büyük**; ayrıntı kaybolmuyor.
- Üzerinde **tıklayıp dinleyebilir**, zor aralığı **sürükleyip A–B döngüsüne**
  alabilir, sınırı **Alt+tıkla** ile taşıyabilirsiniz.
- Fareyi gezdirince **zaman ve frekans** yazar.

### Koruyan testler

`birim` [48] (zaman/frekans/sınır eşlemesi), `tasarim` [2g] (tam genişlik,
200 px, kaplama). Gerçek Chromium: genişlik **773 px**, tıkla → `currentTime
1.5`, sürükle → `A 0.6 → B 1.2`, Alt+tıkla → `end 1.8`.

## v2.125 — Takip şeridi sabit: cümle penceresi

CANLI VERİ. Bilirkişi: *"sd-follow sürekli yüksekliği değiştiği için yazıyı
düzgün takip edemiyorum."*

### ÖLÇÜM (v2.124)

| Ölçüm | 1440 px | 1280 px | 1100 px |
|---|---|---|---|
| Kutu yüksekliği | 120 (tavan) | 120 | 120 |
| İçerik yüksekliği | 202 | 239 | 314 |
| 60 kelime → satır | 10 | 12 | 15 |
| Kaydırma sıçraması | 2 × 74 px | 2 × 74 px | 3 × 74 px |
| `span.on` (kalın+dolgu) | 0 kelime kaydı | 0 | **8 kelime kaydı** |

Üç sorun: (1) kutu içeriğe göre uzayıp kısalıyordu, (2) iç kaydırma 5 satır
birden atlıyordu, (3) aktif kelime kalın+dolgu ile satır sonlarını
kaydırıyordu.

### DÜZELTME

- **Sabit 2 satır** (`height`, `overflow:hidden`); iç çubuk yok.
- **O anki cümle** gösterilir (`karaokeSentences`): sınır = bitiş noktalaması
  veya ≥0,4 sn sessizlik. Cümle değişince içerik bir kez yenilenir.
- **Metrik sabit vurgu**: yalnız arka plan + ince çerçeve; kalın/dolgu yok.
- **Bir satır** ilerleme: aktif kelime alttan çıkınca ikinci satıra, üstten
  çıkınca ilk satıra gelir; konum mutlak hesaplanır.
- ASR `words` yalnız kelime veriyorsa aralara **boşluk** konur (yoksa metin
  tek kelime gibi taşıyordu).

### KULLANICI NE GÖRECEK

- Takip şeridi **hep aynı yükseklikte**; göz aynı yerde kalır.
- Uzun cümlede metin **birer satır** kayar (5 satır atlamaz).
- Aktif kelime vurgulanırken **satır sonları oynamaz**.
- Cümle bitince şerit yeni cümleye geçer; yükseklik değişmez.

### Koruyan testler

`birim` [47] (cümle bölme/aktif cümle), `tasarim` [2f] (sabit yükseklik,
metrik sabit vurgu). Gerçek Chromium (1440/1100/900): yükseklik **48 px sabit**,
reflow **0 kelime**, en büyük kaydırma **18 px (1 satır)**.

## v2.124 — "Tüm dosyalar" seçimi paket adında görünüyor

CANLI VERİ. Bilirkişi: *"tüm dosyalar'ı seçim yaptığında tam paket diye
gelmedi, yani senin gösterdiğin formatta değil."*

### ÖLÇÜM (v2.123)

| Seçim | Ad |
|---|---|
| 1 dosya · Tüm dosyalar | `AKIS_Paket_2024-108_2026-11-20_16-45.akis` |
| 2 dosya · Tüm dosyalar | `AKIS_Paket_Tam_2dosya_2026-11-20_16-45.akis` |
| 1 dosya · Yalnız bu dosya | `AKIS_Paket_2024-108_2026-11-20_16-45.akis` |

Ad, kullanıcının **seçimine** değil dosya **sayısına** göre belirleniyordu.
Tek dosya varken iki seçim **aynı adı** üretiyordu: hangisinin alındığı
sonradan anlaşılmıyordu ve "tam paket" beklentisi boşa çıkıyordu.

### DÜZELTME

- `exportPlanFor` seçimi (`scope`) taşır; `backupFileName` adı **seçime** göre
  yazar. Paket **biçimi** (`case.json` / `archive.json`) değişmedi; o dosya
  sayısına bağlıdır.
- Tek dosya + **Tüm dosyalar** → `AKIS_Paket_Tam_1dosya_…`
- Tek dosya + **Yalnız bu dosya** → `AKIS_Paket_2024-108_…`
- Sonuç bildirimi de seçimi söyler: "TÜM dosyalar (1 dosya)" / "yalnız …".

### KULLANICI NE GÖRECEK

- "Tüm dosyalar" dediyseniz paket adı **Tam** der; "Yalnız bu dosya" dediyseniz
  dosya numarasını taşır. Tek dosyada bile iki seçim **farklı ad** üretir.
- Hangi paketi aldığınız adından anlaşılır; karışma olmaz.

### Koruyan test

`birim` [38] (5 yeni kontrol) + gerçek Chromium: tek dosya, iki seçim,
indirilen adlar ve bildirim metni ölçüldü.

## v2.123 — Terim birliği ve paket adı

CANLI VERİ. Bilirkişi: *"yedek alırken … kaydedilen dosya adı ile tanımlanan
dosya adında bir karışıklık var… paket diyeceksek paket de yazabiliriz; hem
arayüzde hem çıktılarda kavram karmaşası olmasın… dışa aktar demek paket
oluştur demekse menüye paket oluştur yazalım… arşiv yerine gizle mi diyoruz,
o güvenli yol mu?"*

### ÖLÇÜM (v2.122)

| Durum | Ad |
|---|---|
| Tek dosya | `AKIS_2024_108_2026-11-20_16-55.akis` (paket olduğu belli değil) |
| Tüm dosyalar | `AKIS_TUM_3dosya_…` |
| Boş | `AKIS_YEDEK_bos_…` |

Üç ayrı sözcük; "tam" yok; tek dosya adında paket işareti yok. Yardım metni
gerçek adla uyuşmayan `AKIS_Yedek_N_dosya_tarih.akis` örneğini gösteriyordu.
Ayrıca "Dışa aktar" (index.html 4 + app.js 16), "yedek", "paket", "arşiv" iç
içeydi.

**Arşiv güvenli mi?** Evet, ölçüldü: `archiveCase` yalnız `status='archived'`
+ `archivedAt` + günlük yazar; kayıtlar ve sesler durur, pakete girmeye devam
eder (`birim` [35]). Kalıcı silme ayrı ve iki onaylıdır.

### DÜZELTME — tek kavram, tek terim

| Terim | Anlamı |
|---|---|
| Dosya | Tek dava/çalışma alanı |
| Paket (.akis) | 1+ dosya + ses kayıtları |
| Paket oluştur | Paketi indir (eski "Dışa aktar") |
| Paketten yükle | Paketi ekle, kopya açar (eski "İçe aktar") |
| ⇄ Birleştir | Paketi açık dosyayla birleştir |
| Arşivle | Gizle; silmez |

Yeni adlar: `AKIS_Paket_2024-108_2026-11-20_16-55.akis` (tek dosya) ·
`AKIS_Paket_Tam_3dosya_…` (tüm dosyalar) · `AKIS_Paket_bos_…`. Dosya
numarasındaki eğik çizgi `-` olur. Durum yazıları "Paket yok" / "Son paket 3
gün önce". Yardım sözlüğü tek kaynak; eski sürüm notlarında geçen "Dışa aktar"
için "bugünkü adı Paket oluştur" notu vardır.

### KULLANICI NE GÖRECEK

- Menüde **Paket oluştur** ve **Paketten yükle** yazar; "dışa/içe aktar"
  kavram karmaşası biter.
- İndirdiğiniz dosyanın adı ne olduğunu söyler:
  `AKIS_Paket_2024-108_2026-11-20_16-55.akis`; tüm dosyalar için
  `AKIS_Paket_Tam_3dosya_…`.
- Üst barda "Yedek yok" yerine **"Paket yok"**, "Yedek 3 gün önce" yerine
  **"Son paket 3 gün önce"** yazar.
- **Arşivle** aynı kaldı: yalnız gizler; veri ve ses silinmez.

### Koruyan testler

`birim` [38] (ad biçimi), `surum` [11] (düğme/yardım/sözlük terimleri, bayat
ad örneği yok). Gerçek Chromium: düğme adları, kapsam diyaloğu ve indirilen
paket adı ölçüldü.

## v2.122 — Birleştirmede bilirkişi onayları aktarılıyor

CANLI VERİ. Bilirkişi: *"bilirkişinin onayladığı şeyler bekliyor olarak
görünüyor"*. Senaryo: A bilgisayarı dışa aktar → B bilgisayarı içe aktar →
A'da düzenle+onayla → dışa aktar → B'de **⇄ Birleştir** → onaylı bölümler
"Kontrol bekliyor" görünüyor.

### ÖLÇÜM (v2.121)

`mergeCases` dört senaryoda çalıştırıldı:

| Senaryo | Sonuç | Bildirim |
|---|---|---|
| Metne dokunmadan onay (`lastEditBy` boş) | `approved` → **`pending`** | **yok** (sessiz) |
| Metni düzenleyip onay | `approved` korunur | — |
| Tek kişilik dosya (ekip listesi boş) | korunur | — |
| Yardımcı onayı | `pending` (doğru) | **yok** (sessiz) |

Kök neden: onaylama yalnız `review` yazıyordu; birleştirme "kim onayladı"
sorusunu `lastEditBy` (metin düzenleyen) ile tahmin ediyordu. Dinleyip
onaylayan bilirkişi metne dokunmadığı için onay "kaynaksız" sayılıp
düşürülüyordu — üstelik önizleme "Çakışma yok" diyordu.

### DÜZELTME

- `segment.reviewedBy` + `reviewedAt` (şema). `setSegReview()` tek yazma
  noktası: insan kararı (`approved/inaudible/relisten/ambiguous`) kimin
  verdiğini yazar, "bekliyor" atfı temizler. `machine` atıf taşımaz.
- Birleştirme atfı `reviewedBy` → (eski kayıt) `lastEditBy` sırasıyla çözer;
  ekip listesi boşsa eski davranış korunur.
- **Sessiz düşürme yasak:** aktarılamayan onay `approval-not-attributed` olarak
  bildirilir; önizlemede "Aktarılmayan onay" satırı, sonuç bildiriminde
  "N onay aktarılamadı" yazar.
- Gelen metin alınınca `lastEditBy`/`reviewedBy` birlikte taşınır.
- `İçe aktar` ve arşivden geri yükleme sonrası `lastEditedBy` temizlenir;
  kullanıcıdan kendini seçmesi istenir (devralınan kimlik, onayları yanlış
  kişiye yazardı).
- Eski Türkçe kontrol kodları (`yeniden`, `anlasilmadi`) düğme yolunda da koda
  çevrilir; saklanan değer artık daima ASCII kod.

### KULLANICI NE GÖRECEK

- Bilirkişi başka bilgisayarda onayladıysa, birleştirmeden sonra o bölümler
  **"Onaylandı"** görünür; yeniden onaylamanız gerekmez.
- Onay aktarılamıyorsa (ör. onayı veren kişi ekipte tanımlı değilse) uygulama
  **susmaz**: birleştirme ekranında satır + neden, sonuçta "N onay aktarılamadı".
- İçe aktarılan dosyada "Şu an bu bilgisayarda çalışan" **boş gelir**; kendinizi
  seçin. Böylece verdiğiniz onaylar doğru kişiye yazılır.

### Koruyan testler

`birim-testleri` [46] (29 kontrol) ve `sema-testi` [7f] (d2/d3). Gerçek
Chromium: içe aktar → onayla → birleştir (onay aktarıldı, rozet "Onaylandı");
kaynaksız onay (önizleme 1, sonuç "1 onay aktarılamadı", rozet "Bekliyor").

## v2.121 — Sağ panelde kaydırma çubuğu; spektrogram dalganın yerine

CANLI VERİ. Bilirkişi: *"bu sefer sağ taraftaki segment detay kısmına kaydırma
çubuğu gelmiş, o neden geldi? … spektrogram düğmesini belki böl düğmesinin
yanına koyabilirsin… wav yerine spektrogramı koyabilir misin… bizim için detay
çok önemli, orası."*

### ÖLÇÜM (v2.120 — önceki sürümün yan etkisi)

```
.seg-detail : height 351px · scrollHeight 496px  → TAŞIYOR
```

v2.120'de liste kırpılmasını düzeltirken `.seg-workspace { height:100% }`
verilmişti. Bu, sağ detay panelini 351px'e sıkıştırdı; içeriği 496px olduğu
için **ayrı bir kaydırma çubuğu** çıktı. Ayrıca spektrogram ayrı satırdaydı ve
açılınca paneli daha da uzatıyordu.

### DÜZELTME

**1. Doğru yerleşim mimarisi**

```css
.seg-workspace { height: auto !important; align-items: start; overflow: visible; }
.seg-list      { height: auto; max-height: 68vh; overflow-y: auto; }
.seg-detail    { max-height: none; overflow: visible; }   /* iç kaydırma YOK */
```

Kap **yükseklik dayatmaz**; sütunlar içeriği kadar uzar. Kaydırma **yalnız**
soldaki bölüm listesinde (tek kaydırma kuralı).

**2. Spektrogram: düğme araç çubuğunda, görünüm aynı alanda**

- `▤ Spektrogram` düğmesi **dalga araç çubuğuna** taşındı (Böl'ün yanına)
- Basınca **dalga ↔ spektrogram** geçişi: biri gizlenir, diğeri görünür
- **Aynı alan** (88px) → panel uzamaz, zıplama yok
- Bölüm sınırları korunur; **bölümün kendi aralığının** spektrogramı çizilir
- Düğme açıkken görsel durum (`on`) gösterilir

### DEĞİŞMEZ KURALLAR

1. **Kap yükseklik dayatmaz** (`height:auto`); çocuk içeriği kadar uzar.
2. **`overflow:hidden` ile çocuk kırpılmaz**; kaydırma kullanılır.
3. **Tek kaydırma**: yalnız `.seg-list`. Sağ panel kendi içinde kaymaz.
4. **Dalga ve spektrogram aynı alanda geçişir** (biri açılınca diğeri kapanır).
5. Bölüm değişince görünüm **dalgaya döner** (eski bölümün spektrogramı kalmaz).

### KORUYAN TEST

`tasarim-testi` **[2d]** (3 kontrol) + **[2e]** (2 kontrol):
- liste kendi içinde kayabiliyor, `height:100%` ile kaba bağlanmıyor
- `seg-workspace` `overflow:hidden` ile kırpmıyor
- `seg-detail` kendi içinde kaydırmıyor, yüksekliği sabitlenmiyor

### DOĞRULAMA (gerçek Chromium)

```
82 bölüm  : listHasScroll=true · sona kaydır → lastFullyVisible=true
DETAY     : hasScroll=FALSE (önce TRUE) · h=510 · scrollH=508
Spektrogram: waveHidden=true · specHidden=false · drawn=true · panel 598px
Geri dalga: waveHidden=false · specHidden=true · btnOn=false
```

## v2.120 — Bölüm listesinin altı sessizce kesiliyordu

CANLI VERİ. Bilirkişi: *"segment listesinde şu an 82 kayıt var ama ben listede
78'inci kayda kadar görebiliyorum; 79'un yarısını görüyorum."* — Ölçüm doğruladı.

### ÖLÇÜM (v2.119, gerçek Chromium, 82 bölüm)

```
.seg-list       : height 497px   (max-height: 62vh)
.seg-workspace  : height 360px   overflow: hidden   ← KIRPAN
Kırpılan        : 137px ≈ 3,8 bölüm
```

Liste **497px** istiyor, kabı **360px** ve `overflow:hidden` → alt **137px**
sessizce kesiliyor. Kullanıcının "78'i görüyorum, 79 yarım" tespiti birebir.

### KÖK NEDEN

`reading-layer.css`'te `#view-audio .seg-list { max-height: 62vh !important }`
vardı (v2.64'te "200 bölümde scroll yok" hatasını düzeltmek için eklenmişti).
Ama `.seg-list`'i saran `.seg-workspace` **daha kısaydı** ve `overflow:hidden`
olduğu için liste kabından taşınca **sessizce kırpılıyordu**. v2.113'te
`scrollTop` hesabı düzeltildi ama görünürlük sorunu ayrı bir katmandaydı.

### DÜZELTME

```css
#view-audio .seg-list { height: 100% !important; max-height: none !important; }
#view-audio .seg-workspace { overflow: visible !important; height: 100% !important; }
```

Liste artık **kabına uyar**; viewport tabanlı sabit yükseklik kullanmaz.

### DEĞİŞMEZ KURALLAR

1. **Liste yüksekliği KABINDAN türetilir**, viewport'tan (`vh`) değil.
   `vh` tabanlı sabit yükseklik, kap daha kısaysa sessizce kırpılır.
2. **`overflow:hidden` ile çocuk kırpılmaz.** Kırpma gerekiyorsa kaydırma
   kullanılır (kullanıcı görebilir). Sessiz kesme yasak.
3. Dar ekran (`@media`) kısa liste **makuldür** (dikey alan yok); test bunu
   ayrı tutar.

### KORUYAN TEST

`tasarim-testi` **[2d]** — 2 kontrol: (a) `seg-list` `vh` tabanlı sabit
yükseklik kullanmıyor, (b) `seg-workspace` `overflow:hidden` ile kırpmıyor.
Yorumlar ve `@media` blokları test dışında tutulur (yanlış pozitif önlenir).

### DOĞRULAMA (gerçek Chromium, 82 bölüm)

```
ÖNCE : listH=497 · parentH=360 · parentOverflow=hidden · kırpılan=137px
SONRA: listH=351 · parentH=351 · parentOverflow=visible · kırpılan=0
Sona kaydır → lastFullyVisible: true · overflowPx: -15 (15px pay)
```

## v2.119 — Takip iki ayrı özellik; karaoke kutusu kaldırıldı

CANLI VERİ. Bilirkişi: *"başlarken ana play'a bastığım otomatikmen takip modu
çalışıyor ancak ben açmadıysam açılmamalı… takip modu açıldığında iki durum
olacak… ikinci konu karaoke… sürekli güncellediği için bozuluyor… orayı tam bir
düzenlememiz gerekiyor."*

### ÖLÇÜLEN ÜÇ HATA (v2.118)

| # | Hata | Kanıt |
|---|---|---|
| 1 | Ana oynat/Dinle takibi **kendiliğinden açıyordu** | `if (!followState.on) setFollow(true)` — **2 yerde** (4481, 5579) |
| 2 | Aynı metin **iki yerde** gösteriliyordu | `.karaoke` + `.sd-follow` |
| 3 | `.karaoke` **her `timeupdate`'te** `innerHTML` yazıyordu → bozuluyordu | `renderKaraoke` (satır 5126) |

### KULLANICI NE GÖRECEK

**1. Takip varsayılan KAPALI.** Ana oynata/Dinle'ye basmak takibi **açmaz**.

**2. İki ayrı özellik, iki ayrı düğme:**
| Düğme | Kısayol | Ne yapar |
|---|---|---|
| **Otomatik geçiş** | `F` | Çalarken sol listede bir sonraki bölüme geçer |
| **Canlı vurgu** | `G` | Sağ panelde okunan kelimeyi vurgular |

İkisi bağımsız. Açtığınız hatırlanır (`akis.followPref`), ama **varsayılan kapalı**.

**3. Karaoke kutusu tamamen kaldırıldı.** Tek görsel alan `.sd-follow` ve
sınıf-tabanlı (DOM yeniden yazılmaz) → **bozulma imkânsız**.

### DEĞİŞMEZ KURALLAR

1. `followState = { on, autoAdvance, liveHighlight }` — üçü de **false** başlar.
2. `followShouldAutoStart(pref)` → yalnız `pref.autoFollow === true` ise `true`.
   Bilinmeyen/eksik değerde **false** (temkinli).
3. `setFollow(on, mode)` — `mode` verilirse yalnız o mod; verilmezse ikisi.
4. `followTick` yalnız `followState.autoAdvance` iken çalışır (liste gezinmesi).
5. `markTextFollow` yalnız `followState.liveHighlight` iken çizer; kapalıysa
   `.sd-follow` **kaldırılır** (kalıntı görünmez).
6. `renderKaraoke` artık `innerHTML` **yazmaz**; `markTextFollow`'a delege eder.
   `.karaoke` div'i markup'tan **kaldırıldı**.

### DOĞRULAMA (gerçek Chromium)

```
1) Başlangıç : iki düğme de on=false · follow-on YOK · karaoke 0
2) Ana play  : followOn=false (KENDİLİĞİNDEN AÇILMIYOR)   ✅
3) Karaoke   : document.querySelectorAll('.karaoke').length === 0  ✅
4) Canlı vurgu aç → .sd-follow oluştu · pref kaydedildi   ✅
```

`birim-testleri` **[45]** — 10 kontrol.

## v2.118 — Sürüm güncellemesi artık kendiliğinden geliyor

CANLI VERİ. Bilirkişi: *"bu tarz önbellek sorunlarından kurtulmak için…
bir push attıktan sonra… düşün ki bir sürü kullanıcı var, hepsine tuşa bas
diyemeyiz. Ne yapabiliriz?"*

### ÖLÇÜM (v2.117)

```
GitHub Pages  index.html : cache-control: max-age=600
              assets/*   : cache-control: max-age=600
```

GitHub Pages **her dosyaya** 10 dakika önbellek veriyor. Push sonrası kullanıcı
10 dakika **eski `index.html`** görür; o dosyadaki `?v=` de eski kalır → yeni
sürüm hiç gelmez. "Ctrl+Shift+R bas" ölçeklenmez.

### ÇÖZÜM: kendini güncelleyen sayfa

1. `version.json` — tek satır: `{"version":"2.118"}`. `no-store` ile istenir,
   yani **her zaman günceldir** (önbelleğe takılmaz).
2. `index.html` içinde küçük bir denetleyici: **dakikada bir** (ve sekmeye geri
   dönüldüğünde) `version.json` okur.
3. Sürüm farklıysa:
   - **Boştaysa** (yazmıyor, çözümlemiyor, oynatmıyor) → **kendini yeniler**
     (`?t=<zaman>` ile, önbelleği kırarak). Kullanıcı hiçbir şey yapmaz.
   - **Çalışıyorsa** → çalışmayı **bölmez**; ekran altında
     **"Yeni sürüm hazır — Şimdi yenile"** bildirimi çıkar.

### GÜVENLİK KURALI (iş kaybı yok)

`window.__akisIdle()` **yalnız** şu durumlarda `true`:
- bekleyen kayıt yok (`persistPending` false),
- toplu çözümleme yok (`queueRunning` false),
- çözümleme süren kayıt yok (`transcribing` yok),
- ses çalmıyor,
- odakta metin alanı yok (yazmıyor),
- açık diyalog yok.

Aksi hâlde **yenileme yapılmaz**. Bilinmeyen durumda temkinli davranır (`false`).

### DOĞRULAMA (gerçek Chromium)

```
version.json          : {"ok":true,"version":"2.117"}     ✅ no-store
__akisIdle() boşta    : true                              ✅
yazarken              : false (activeTag INPUT)            ✅ yenileme yok
banner                : display=flex, "Şimdi yenile" var   ✅
```

`surum-testi` **2c** — 7 kontrol: `version.json` var/geçerli/`APP_VERSION` ile
aynı; `index.html` denetleyici taşır; `RUNNING` sürümü doğru; yenileme `?t=`
ile önbelleği kırar; `app.js` `__akisIdle` kancası tanımlar.

### DEĞİŞMEZ KURALLAR

1. `version.json` **`APP_VERSION` ile aynı** olmalı (test zorunlu kılar).
2. `index.html` içindeki `RUNNING` sabiti de aynı olmalı.
3. Yenileme **yalnız** `__akisIdle() === true` iken yapılır.
4. Yenileme URL'i **`?t=<zaman>`** taşır (HTML önbelleğini kırar).
5. `version.json` isteği **`cache: 'no-store'`** olmalı.

## v2.117 — ACİL: canlı site açılmıyordu (önbellek uyuşmazlığı)

CANLI VERİ. Bilirkişi bildirdi:

```
Uncaught SyntaxError: The requested module './schema.js' does not provide
an export named 'AMBIGUOUS_REVIEW' (at app.js?v=2.116:25:3)
```

Uygulama **hiç açılmıyordu**. En yüksek öncelikli hata sınıfı.

### KÖK NEDEN (ölçüldü)

```
index.html : <script src="assets/app.js?v=2.116">    ← sürümlü
assets/app.js:40:  } from './schema.js';              ← SÜRÜMSÜZ
GitHub Pages: cache-control: max-age=600              ← 10 dakika önbellek
```

`?v=` **yalnız** `index.html`'deki `<script>` etiketini kırar. `app.js`
**içindeki** `import` sürümsüz olduğu için tarayıcı **eski** `schema.js`'i
önbellekten kullandı. `app.js` yeni (`AMBIGUOUS_REVIEW` istiyor), `schema.js`
eski (o export yok) → modül yüklenemedi → uygulama açılmadı.

**Bu hata v2.115'te de vardı**, ama o sürümde `schema.js` değişmediği için
önbellek uyuşmazlığı görünmedi. v2.116'da `schema.js`'e `ambiguous` eklenince
ortaya çıktı.

### DÜZELTME

```js
} from './schema.js?v=2.117';   // artık sürümlü
```

### KORUYAN TEST (yeni, zorunlu)

`surum-testi` **2b**: `app.js` içindeki `schema.js` import'u `?v=` taşımak
**zorunda** ve bu sürüm `APP_VERSION` ile **aynı** olmalı. Test, düzeltme
yokken **KALDI** (kanıtlandı), düzeltmeyle geçti.

### DEĞİŞMEZ KURAL

**Sürümlenen her modül, import eden dosya tarafından da sürümlenmelidir.**
`?v=` bir dosyaya verildiğinde onun **tüm import zinciri** de sürümlenmelidir;
aksi hâlde tarayıcı karışık sürüm yükler. Bu, ES modüllerinde sessiz bir
"versiyon uyuşmazlığı" sınıfıdır ve yalnız canlıda görünür.

## v2.116 — Takip modu: metin titriyordu, aynı metin üç yerde

CANLI VERİ. Bilirkişi: *"sağ detayda metnini karaoke dediğimiz bir bölüm var…
o sırada metni işlem yaparken metin titriyor, o hareket ederse takip edemeyiz…
yani orada neden iki tane alan koyduk bilemiyorum."*

### ÖLÇÜM (v2.115, gerçek Chromium + MutationObserver)

```
3 saniyedeki DOM değişikliği : 25   (saniyede ~8 kez metin baştan yazılıyor)
Metin alanı sayısı           : 3    (.karaoke + .sd-follow + textarea)
  .karaoke   : "Bu bölümde uzun bir metin var…"
  .sd-follow : "Bu bölümde uzun bir metin var…"   ← AYNI METİN
```

### KÖK NEDEN

`markTextFollow` **her 120 ms'de** `bar.innerHTML = …` yazıyordu. `followKaraoke`
de aynısını **ikinci bir kutuya** yapıyordu. İki ayrı yer, aynı metni, saniyede
8 kez baştan yazınca **titreme** kaçınılmazdı.

### KULLANICI NE GÖRECEK

- Takip açıkken metin **titremiyor**; yalnız okunan kelime vurgulanıyor.
- **Tek takip alanı** (`.sd-follow`). "Karaoke" kutusu kaldırıldı (gizli).
- Düzenleme alanı ayrı ve sabit: yazarken metin kaymıyor.
- Uzun metinde vurgu görünür alanda kalır (yalnız kutu içi kayar).

### DEĞİŞMEZ KURALLAR

1. `karaokeSegments(s)` — TEK KAYNAK: kelime zamanı varsa kelime, yoksa metin
   parçaları (oransal). Boşluk parçaları korunur (kelimeler bitişik yazılmaz).
2. `karaokeActiveIndex(segs, t)` — TEK KAYNAK: zaman → aktif indeks, `-1` yok.
3. **DOM bir kez çizilir**; her tick'te yalnız `on`/`done` **sınıfı** değişir.
   `innerHTML` döngü içinde YAZILMAZ (titreme yasak).
4. Takip metni **tek yerde** gösterilir. İkinci bir kutu açmak yasak.
5. Metin/bölüm değişince anahtar (`__karaokeKey`) değişir → yeniden çizilir.

### DOĞRULAMA (gerçek Chromium)

```
3 saniyedeki DOM değişikliği : 25 → 0      ✅ (titreme bitti)
.karaoke  : hidden=true, içi boş            ✅ (ikinci alan kaldırıldı)
.sd-follow: metin var, sınıf ile vurgu      ✅
textarea  : ayrı, sabit                     ✅
```

`birim-testleri` **[44]** — 16 kontrol.

## v2.115 — Belirsiz okuma etiketi + bölüm spektrogramı

CANLI VERİ. Bilirkişi: *"uzman aynı kelimeyi farklı olarak yorumluyor: onaylamalı
mı, anlaşılmadı olarak mı etiketlemeli, yoksa farklı bir etiket mi? Mahkemeye
sunarken burayı nasıl ele almalıyız?"* ve *"o segmente sadece wav gösteriyoruz
ama acaba spektrogram koymak daha mı iyi olur?"*

### ADLİ AYRIM (yeni)

| Durum | Etiket | Anlamı |
|---|---|---|
| Ses anlaşılmıyor | **Anlaşılmadı** | teknik yetersizlik |
| Ses duyuldu, iki okuma mümkün | **Belirsiz okuma** | "geldi" / "kaldı" |
| Bilirkişi karar verdi | **Onaylandı** | seçilen okuma |

"Belirsiz okuma" **onay değildir** (`isReviewed` false) → sayaçta eksik görünür.

### KULLANICI NE GÖRECEK

- Bölüm panelinde **iki okuma alanı** + **seçilen** listesi
- Rozette kısa etiket **"Belirsiz"** (onay yeşili değil)
- **Rapor belirsizliği GİZLEMEZ**:
  `Belirsiz okuma — Belirsiz: "geldi" / "kaldı" (seçilen: geldi)`
- Seçim yapılmadıysa raporda **"seçilmedi"** yazar (uydurma yok)
- **Bölüm spektrogramı**: dalganın altında frekans görünümü (aç/kapa)

### DEĞİŞMEZ KURALLAR

1. `ambiguous` **onay değildir**: `isReviewed()` false, `isHumanApproved()` false.
2. `ambiguousReportText(s)` — TEK KAYNAK: iki okuma + seçim. Seçim yoksa
   "seçilmedi". **Belirsizlik gizlenmez.**
3. Rapor hücreleri `reviewCellText()` kullanır — **`reviewLabel()` DEĞİL**.
   (v2.115'te bulundu: rapor `reviewLabel` çağırıyordu, `reviewCellText` hiç
   kullanılmıyordu → iki okuma rapora girmiyordu.)
4. Spektrogram: dalga **zaman/ritim**, spektrogram **frekans** içindir; biri
   diğerinin yerine geçmez. Bölüm aralığı hesaplanır (tüm kayıt değil).
5. Bölüm değişince eski bölümün spektrogramı **gizlenir** (yanlış izlenim olmaz).

### DOĞRULAMA (gerçek Chromium + gerçek WAV)

```
Panel   : reading1=geldi · reading2=kaldı · chosen=geldi · kontrol=ambiguous
Rozet   : "Belirsiz"                       (eski: "Bekliyor")
Rapor   : Belirsiz okuma — Belirsiz: "geldi" / "kaldı" (seçilen: geldi)
Spektro : hidden=false · drawn=true (piksel dolu)
```

`birim-testleri` **[43]** — 19 kontrol.

## v2.114 — "%100 olmuyor" sorusunun cevabı görünür oldu

CANLI VERİ. Bilirkişi: *"çalışma alanımızdaki bir davadaki bir sese girip tüm
onaylarımızı yaptıktan sonra yine de bazıları %100 olmuyor. Acaba gözden
kaçırdığımız bir şey mi var?"*

### ÖLÇÜM (v2.113)

```
97 approved + 2 relisten + 1 machine  →  sayaç 97/100 = %97
```

**Sayı DOĞRU.** Kural: yalnız `approved` (Onaylandı) ve `inaudible`
(Anlaşılmadı) "kontrol edildi" sayılır. `relisten` (Yeniden dinlenecek) ve
`machine` (Çözümlendi) **kasten** sayılmaz — ikisi de yeniden bakılması
gereken bölümlerdir.

**HATA: kullanıcı hangi bölümlerin eksik olduğunu GÖREMİYORDU.** Sayı doğru,
açıklama yoktu. Sessiz sayı = sessiz hata.

### KULLANICI NE GÖRECEK

- Durum çubuğunda: **"· 3 bölüm eksik: 2 yeniden dinlenecek · 1 çözümlendi"**
- Kayıt kartındaki `2/5` sayısının **üzerine gelince** aynı açıklama (ipucu)
- Açıklamaya **tıklayınca** yalnız eksik bölümler listelenir (filtre `pending`)
- Eksik yoksa açıklama **görünmez** (gürültü yapmaz)

### DEĞİŞMEZ KURALLAR

1. `isReviewed()` = `approved` veya `inaudible`. `machine` **değildir** (v2.106).
2. `pendingBreakdown(segs)` — TEK KAYNAK: toplam/pending/relisten/machine/
   approved/inaudible sayıları. Sayaç, filtre ve toplu onay aynı tabloyu kullanır.
3. `pendingSummaryText(segs)` — TEK KAYNAK metin; eksik yoksa `''`.
4. Türkçe tekil/çoğul: "1 bölüm" (bölümler değil).

### DOĞRULAMA (gerçek Chromium)

```
Durum çubuğu : "%40" + "· 3 bölüm eksik: 2 yeniden dinlenecek · 1 çözümlendi"
Kayıt kartı  : "2/5" + aynı açıklama (title)
Tıklayınca   : 3 bölüm listelendi (5 değil) + toast
```

`birim-testleri` **[42]** — 17 kontrol.

## v2.113 — Bölüm listesinde son bölüm görünmüyordu

CANLI VERİ. Bilirkişi: *"100 kayıt varsa scroll ile sona geldiğimizde yaklaşık
3 kayıt görünmüyor. Sanırım yükseklik hesaplama hatamız var."* — Ölçüm doğruladı.

### ÖLÇÜM (v2.112, gerçek Chromium, 100 bölüm)

```
Son öğeye gidince:  scrollTop = 3184 · maxScroll = 3227
                    → 43px eksik · son öğe 28px GÖRÜNMÜYOR
Takip modunda:      activeOverflowPx = 28 (taşıyor)
```

### KÖK NEDEN

```js
list.scrollTop += et.bottom - lt.bottom;   // ARTIMLI ekleme
```

`scrollTop` tarayıcıda **tam sayıya yuvarlanır**. Artımlı eklemede yuvarlama
hatası her adımda **birikir**; uzun listede son öğe görünür alana oturmaz.

### DÜZELTME

`nextScrollTop({...})` — saf fonksiyon:
- hedef **mutlak** hesaplanır (`cur ± taşma`), artımlı ekleme yok,
- `[0, maxScroll]` aralığına **kırpılır** (son öğe dibe oturur),
- **idempotent**: aynı öğe için tekrar çağrılırsa sonuç değişmez.

### DOĞRULAMA (gerçek Chromium, 100 bölüm, takip modu)

```
Takip açık + sona çal → activeIdx = 100 · activeOverflowPx = 0
                        scrollTop = 3212 / maxScroll = 3227
→ Son bölüm TAM GÖRÜNÜR (eski: 28px taşıyordu)  ✅
```

`birim-testleri` **[41]** — 8 kontrol (mutlak hesap, kırpma, idempotentlik).

### NOT: kullanıcı gözlemi haklıydı ama "3 kayıt" değil

Ölçüm **1 öğenin 28px'i** görünmüyor dedi; kullanıcı 3 kayıt olarak algıladı.
Algı farkı: kaydırma çubuğu dibe dayanmış görünüyor ama içerik oturmamış.
Sayı farklı olsa da **hata gerçekti ve düzeltildi**.

## v2.112 — A–B döngüsü üç yerden bozuktu

CANLI VERİ. Bilirkişi: *"A–B aralığı dinleme diye bir özelliğimiz var ama onu tam
kullanamadık, yada tuşlar yanlış, emin değilim."* — Haklıydı; üç ayrı hata vardı.

### ÖLÇÜM (v2.111)

```
1) playSegmentRange():  loopRange/__loop eşleşmesi = 0
   → her "▶ Dinle" çağrısı stopAt = bölüm sonu yazar → DÖNGÜ ÖLÜR
2) handleSegKey:        'b' tuşu → splitSegmentAtPlayer (BÖLME)
   → A–B için hiç kısayol yok
3) paintLoop():         yalnız draw() içinde çalışıyor
   → klavyeden A/B basılınca ekranda geri bildirim yok
```

Ayrıca yazdığım ilk düzeltmede `handleSegKey` kapsamında **olmayan** `player`
değişkenini kullandım; tuşlar sessizce hiçbir şey yapmadı. Doğrusu
`card.querySelector('audio')`.

### KULLANICI NE GÖRECEK

- **"▶ Dinle" artık döngüyü öldürmüyor**: döngü açıksa B'de sarıp tekrar çalar.
- **Kısayollar**: `A` = başlangıç, `B` = bitiş, `K` = döngü aç/kapa.
  **Bölme `S` tuşuna taşındı** (eski `B`).
- **Anında geri bildirim**: A/B basınca aralık yazısı (`A 00:00:01.000 → B 00:00:03.000`)
  ve düğme durumu güncellenir.
- Düğme ipuçlarında kısayol yazar.

### DEĞİŞMEZ KURALLAR

1. `loopStopTarget(m, segmentEnd)` — **TEK KAYNAK**: döngü açık ve geçerliyse
   durma noktası **B**'dir; bölüm sonu değil. `playSegmentRange` ve ana oynat
   (2 yol) bunu kullanır.
2. `toggleLoop(m, player, index)` — **TEK KAYNAK**: 🔁 düğmesi ve `K` tuşu aynı
   fonksiyonu çağırır.
3. `paintLoopIndicators(m)` — gösterge `draw()`'a bağımlı değil; DOM'dan tazelenir.
4. `LOOP_KEYS = {a:'a', b:'b', toggle:'k'}`; bölme `S`.
5. Döngü **şemaya yazılmaz** (`m.__loop` oturumluktur, `stripDerivedFields` atar);
   bölüm sınırlarına (`start`/`end`) dokunmaz.

### DOĞRULAMA (gerçek Chromium, gerçek WAV)

```
1) Düğmeler: A / B / 🔁 var; ipuçlarında kısayollar          ✅
2) A (t=1.0) + B (t=3.0) tuşları → "A 00:00:01.000 → B 00:00:03.000"  ✅
3) K → döngü açık, toast doğru                                ✅
4) "▶ Dinle" → stillOn = true (ESKİ HATA: false), curTime 2.51 < 3.0  ✅
```

`birim-testleri` **[40]** — 12 kontrol.

## v2.111 — Çözümleme profili kayıt başına sabitlenir ve görünür

CANLI VERİ. Bilirkişi: *"tek çözümlemelerde bir bölüme gelip çözümle dediğimde
hangi profili kullanıyor, en son seçtiğim profil mi, ondan emin olamadım."*

### ÖLÇÜM (v2.110)

```
transcribeWindow() içinde:  const attempts = asrProfileOptions(savedProfilePref());
transcribe() döngüsü:       for (const win of asrWindows(total)) { ... transcribeWindow(...) }
```

Yani **her pencere ayrı ayrı** `localStorage`'dan profil okuyordu. Uzun bir
çözümleme sürerken kullanıcı profili değiştirirse aynı kaydın farklı bölümleri
**farklı profille** çözümlenirdi. Ayrıca kayıtta hangi profilin kullanıldığı
saklanmıyordu (`transcribedWithModel` var, profil yok) ve bölüm panelinde
hiçbir yerde yazmıyordu.

### KULLANICI NE GÖRECEK

- **Kayıt kartında** kısa rozet: `Standart` · `Şive/aksan` · `Gürültülü` · `Telefon`
- **Bölüm panelinde** "Profil" alanı (aynı kısa etiket)
- Üzerine gelince **ne anlama geldiği** yazar (uzun açıklama ipucunda)
- **Profil adı rapora yazılmaz** (yalnız çözümleme ayarıdır)

### DEĞİŞMEZ KURALLAR

1. **Profil çözümleme BAŞINDA bir kez sabitlenir.** `transcribe()` içinde
   `runProfile` alınır, `transcribeWindow(pipe, window, offset, runProfile)`'a
   geçirilir. `transcribeWindow` kendi başına `localStorage` OKUMAZ (yalnız
   parametre verilmezse geriye dönük uyum için okur).
2. Kayda yazılır: `material.transcribedWithProfile`.
3. Bölüm yeniden çözümlemesi de **kendi** profilini sabitler (`segProfile`).
4. **Dil kilidi değişmez**: `PROFILE_LOCK = { language: 'turkish', task: 'transcribe' }`.
   Profil bunu gevşetmez (test: 4 profil × 2 kontrol).
5. Profil RAPORA yazılmaz (`REPORT_TEXT` içinde "profil" geçmez).

### DOĞRULAMA (gerçek Chromium)

```
Kayıt kartı rozeti   : "Şive/aksan" + ipucu            ✅
Bölüm paneli "Profil": "Şive/aksan" + ipucu            ✅
Model rozeti         : "Küçük model" (yanında)          ✅
Raporda profil adı   : YOK  (hasSive=false, hasProfil=false) ✅
```

`birim-testleri` **[39]** — 22 kontrol.

## v2.110 — "Dışa aktar" sessizce TÜM dosyaları alıyordu

CANLI VERİ. Bilirkişi: *"dışa aktar derken bu çalışma alanını mı dışa aktarıyoruz
yoksa tüm çalışmalarımızı mı? netleştirelim… çıkan dosyalar alındığı andaki
zaman bilgileri ile alırsa iyi olur… terim karmaşası da var."*

### ÖLÇÜM (v2.109, 3 dosya varken AKTİF = 2024/A)

```
Düğme : "Dışa aktar"     ← ne yapacağı yazmıyor
İpucu : (title YOK)      ← fareyle üzerine gelince bile açıklama yok
Sonuç : AKIS_Yedek_3_dosya_2026-11-20.akis   ← 3 dosyanın HEPSİ indi
```

Yani **tek dosya yedeklemek isteyen kullanıcı 3 dosyalık paket alıyordu** ve
bunu söyleyen hiçbir şey yoktu. Dosya adında **saat de yoktu**: aynı gün iki
yedek birbirinin üzerine yazılıyordu.

### KULLANICI NE GÖRECEK

**1. Dışa aktar artık sorar**
```
Neyi dışa aktaracaksınız?
 ○ Yalnız bu dosya      2024/A
 ● Tüm dosyalar         3 dosya + ses kayıtları
```
Aktif dosya boşsa "yalnız bu dosya" **seçilemez** (açıklaması görünür).

**2. Dosya adı tarih + saat taşır**
```
AKIS_2024-A_2026-11-20_16-55.akis      (tek dosya)
AKIS_TUM_3dosya_2026-11-20_16-56.akis  (tümü)
```

**3. Düğmelerin üzerine gelince ne yaptıkları yazar**
- **Dışa aktar** → yedek paketi oluştur
- **İçe aktar** → paketi EKLE (kopya açar, birleştirmez)
- **⇄ Birleştir** → paketi bu dosyayla BİRLEŞTİR

**4. Yardım ekranına terim sözlüğü** (Dosya / Yedek paketi / Dışa aktar /
İçe aktar / Birleştir / Arşivle).

### TERİM SÖZLÜĞÜ (tek anlam, tek terim)

| Terim | Anlamı |
|---|---|
| **Dosya** | Tek dava / çalışma alanı |
| **Yedek paketi (.akis)** | Bir veya daha fazla dosya + ses kayıtları |
| **Dışa aktar** | Paket oluştur (yedek al) |
| **İçe aktar** | Paketi ekle (kopya açar) |
| **Birleştir** | Paketi mevcut dosyayla birleştir |
| **Arşivle** | Dosyayı gizle (silmez) |

"Arşiv" kelimesi **paket** anlamında kullanılmıyor (yalnız arşivlenmiş dosyalar
için); iki anlam karışıklığı bitti.

### DEĞİŞMEZ KURALLAR

1. `exportPlanFor(cases, activeId, scope)` — kapsam **açık** parametredir;
   sessiz varsayılan yok. `'current'` yalnız aktif dosya, `'all'` hepsi.
2. Arşivli dosyalar `'all'` kapsamına **girer** (yedekte kaybolmaz).
3. `backupFileName(plan, when)` — tarih **ve saat**; aynı gün üzerine yazmaz.
4. Aktif dosya boşsa `'current'` kapsamı `none` döner (sessizce tümüne dönmez).

### DOĞRULAMA (gerçek Chromium)

```
1) "Dışa aktar" → diyalog açıldı: "Neyi dışa aktaracaksınız?"
   "Yalnız bu dosya 2024/A" · "Tüm dosyalar 3 dosya + ses kayıtları"
2) "Yalnız bu dosya" → AKIS_2024_A_2026-11-20_16-55.akis
   paket: case.json var, archive.json YOK · içindeki dosya = 2024/A  ✅
3) "Tüm dosyalar"    → AKIS_TUM_3dosya_2026-11-20_16-56.akis        ✅
   2 ayrı dosya adı (saat farkı) → üzerine yazma yok                 ✅
```

`birim-testleri` **[38]** — 22 kontrol.

## v2.109 — İlk açılış artık gerçekten boş (boş taslak kaydedilmiyordu)

CANLI VERİ. Bilirkişi: *"boş bir tarayıcı açtım, içinde hiçbir şey yoktu ama bana
otomatikmen yeni çalışma sayfası varmış gibi getirdi. İlk açtığımız boş olmalı
ama değil?"* — Haklıydı.

### ÖLÇÜM (v2.108, tam boş profil)

```
localStorage: yalnız "akis.seenNotice.2.108"
IndexedDB   : 1 kayıt → { fileNo:"", name:"Yeni inceleme dosyası", mats:0 }
Seçici      : "Yeni inceleme dosyası #r1a4wb"
```

Uygulama, arayüz `currentCase()`'e bağlı olduğu için **bellekte** boş bir taslak
tutuyordu (bu gerekli). Hata: bu taslağı **kayda da yazıyordu.** Sonuç: yeni
tarayıcıda/sekmende "zaten bir dosya var" yanılgısı.

### ÖLÇÜLEN YANLIŞ ÇÖZÜM

"Boş kurulumda dosya oluşturmayı tamamen kaldır" denendi:

```
TypeError: Cannot read properties of null (reading 'reportDate')
```

Yani nesne bellekte **gerekli**. Doğru çözüm: nesne kalsın, **kayda yazılmasın.**

### KULLANICI NE GÖRECEK

- İlk açılışta seçicide **"— Yeni dosya —"** yazar (dosya adı değil).
- Alt durum çubuğu: **"Henüz dosya yok — bilgi girin veya içe aktarın"**.
- Yeni sekmede **hayalet dosya yok**.
- Bir bilgi yazdığınız veya ses eklediğiniz anda dosya **gerçek** olur ve
  kaydedilir; yenilemede durur.
- Yedek, arşiv ve silme yalnız **gerçek** dosyalarla çalışır.

### DEĞİŞMEZ KURALLAR

1. `casesForStorage(cases)` → yalnız `isEmptyCase` olmayan dosyalar. `persistNow`
   ve `flushPersist` (kurtarma kopyası) bunu kullanır.
2. `isEmptyWorkspace(cases)` → `casesForStorage(...).length === 0`.
3. Boş taslak **seçicide "— Yeni dosya —"** olarak görünür, dosya adıyla değil.
4. Arayüz `currentCase()` null'a dayanmaz; bellek nesnesi korunur (ölçüldü:
   kaldırılırsa `reportDate` hatası).

### DOĞRULAMA (uçtan uca, gerçek Chromium)

```
1) TAM BOŞ tarayıcı  → seçici ["— Yeni dosya —"] · DEPO []      ✅
2) Yeni sekme        → ["— Yeni dosya —"] (hayalet yok)          ✅
3) Veri gir          → DEPO [{"no":"2024/109"}]                  ✅
4) Yenile            → seçici ["2024/109"] · veri korundu        ✅
   JS hatası: 0
```

`birim-testleri` **[37]** — 14 kontrol.

## v2.108 — Arşiv/silme: boş dosya birikmesi ve görünmeyen kimlik

CANLI VERİ. Bilirkişi v2.107'yi denedi ve üç hata bildirdi: *"her şeyi arşive
aldım… aynı butona tekrar bastım tekrar arşivlendi, arşivde iki tane var…
silerken bana kendi atadığı numarayı sordu… bu id'leri ekranda görmüyoruz."*

### ÖLÇÜM (v2.107, gerçek Chromium) — üçü de DOĞRULANDI

```
1) Boş dosyada "Arşivle"  → Arşiv (1)   [0 kayıt, dosya no boş — yine de girdi]
2) Aynı butona tekrar bas → Arşiv (2)   [ikisi de "Yeni inceleme dosyası · 0 kayıt"]
3) Silme 2. onay metni    → "mwp6t1x5-fdist0v"  [ekranda HİÇ görünmeyen ham kimlik]
```

### KULLANICI NE GÖRECEK

- **Boş çalışma alanı arşivlenmez:** *"Arşivlenecek veri bulunmuyor"* denir.
  Artık her basışta yeni boş dosya arşive girmez.
- **Dosyalar ayırt edilir:** dosya numarası yoksa adın yanında **kısa kimlik**
  görünür → `Yeni inceleme dosyası #39tuib`.
- **Kalıcı silmede EKRANDA GÖRDÜĞÜNÜZ ad sorulur** (`2024/108` veya
  `Yeni inceleme dosyası #39tuib`). Ham kimlik yazdırılmaz — görünmeyen bir şeyi
  yazmak imkânsızdı.

### DEĞİŞMEZ KURALLAR

1. `canArchiveCase(c)` → arşivli değil **ve** `isEmptyCase` değil.
2. `caseDisplayName(c)` → dosya no varsa o; yoksa `ad #kısaKimlik`. Seçici,
   arşiv paneli ve tüm bildirimler **bunu** kullanır.
3. `deleteConfirmPhrase(c)` = `caseDisplayName(c)` — **ekranda görünen** ifade.
4. `caseShortId(c)` = kimliğin son 6 karakteri (okunabilir, yazılabilir).
5. Yeni bir yerde dosya adı gösterilecekse `caseDisplayName()` kullanın; ham
   `c.id` göstermeyin.

### DOĞRULAMA

- `birim-testleri` **[36]** — 15 kontrol (boş dosya, kısa kimlik, görünen ad,
  onay ifadesi ham uuid içermez).
- **Gerçek Chromium:** boş dosyada arşivle → engellendi; 4 kez bas → Arşiv (0);
  dolu dosya arşivlendi → panelde `2024/108`; silme onayı `2024/108` istedi.

## v2.107 — Arşivleme ve (isteğe bağlı) kalıcı silme

CANLI VERİ. Bilirkişi: *"çalışma alanlarının karışmasını istemiyorum… illa
silmek istiyorsa arşivden silebilir… hepsini yapalım… güzel bir kırılganlık
testi olur."*

### ÖLÇÜLEN RİSK (önce)

`snapshotForUndo` yalnız `appState.cases` kopyalar (satır 464). Ses IndexedDB'de
**ayrı** durur ve `deleteBlob` **kalıcıdır**. Yani "yanlışlıkla sildim" →
**Ctrl+Z metni getirir, sesi GETİRMEZ.** Adli kayıtta ses asıl delildir. Bu
yüzden silme tek tıkla yapılamaz.

### KULLANICI NE GÖRECEK

**Arşivle (güvenli, ana yol)**
- Dosya bilgileri çekmecesi → **Bu dosyayı arşivle**
- Dosya listeden gizlenir; **verisi ve ses kayıtları SİLİNMEZ**
- Üst barda **Arşiv (N)** düğmesi: aç, geri al
- Arşivdeki dosyalar **yedeğe dâhil** (kaybolmaz)

**Kalıcı sil (isteğe bağlı, iki aşamalı)**
- Arşiv → **Kalıcı sil**
- **1. onay:** *"1 ses kaydı ve tüm veri silinecek. Ctrl+Z geri getirmez."*
- **2. onay:** dosya numarasını **elle yaz** (`2024/A`). Yanlış yazarsan düğme
  kapalı kalır, silme yapılmaz.
- Silmede **ses blobları da** IndexedDB'den silinir.

### DEĞİŞMEZ KURALLAR

1. Arşiv **veri silmez**; yalnız gizler. Yedeğe girmeye devam eder.
2. Silme **yalnız arşivli** dosyada (iki bilinçli adım).
3. Silme **iki onay** ister; ikincisi dosya numarasını elle yazdırır.
4. Son görünür dosya arşivlenirse **yeni boş çalışma alanı** açılır (seçici boş
   kalmaz; boş seçici "verim gitti" izlenimi verirdi).
5. Silinen dosyanın sesi **geri gelmez**; bu kullanıcıya açıkça söylenir.

### DOĞRULAMA (gerçek Chromium — kırılganlık testi)

Seed: `2024/A` + `2024/B`, sesler `cA::mcA` + `cB::mcB`.

```
Başlangıç : seçici [2024/A, 2024/B] · Arşiv (0) devre dışı
Arşivle A : seçici [2024/B] · Arşiv (1) · "verisi ve sesleri SİLİNMEDİ"
Panel     : 1 satır · Geri al + Kalıcı sil var
Geri al   : seçici [2024/A, 2024/B] · panel boş
Sil (A)   : 1. onay çıktı · yanlış yazımda düğme KAPALI
            "2024/A" yazılınca düğme açıldı
Sonuç     : dosyalar [2024/B] · sesler [cB::mcB]
            → A'nın sesi silindi, B'nin sesi KORUNDU (doğru dosya!)
```

`birim-testleri` **[35]** — 24 kontrol (arşiv durumu, görünürlük, yedek kapsamı,
onay ifadesi, arşivsiz dosyanın silinememesi).

## v2.106 — Otomatik onay ile bilirkişi onayı aynı görünüyordu (adli ayrım)

CANLI VERİ. Bilirkişi: *"otomatik onay yap dediğimizde onaylandı yazıyor ama
yine de biz tekrar kontrol ediyoruz… orada başka bir kontrol etiketi olabilir,
mesela 'çözümlendi' gibi."*

### ÖLÇÜM (v2.105)

`bulkApproveQuick` bölüme `review = 'approved'` yazıyordu; rapor
`reviewLabel()` ile **"Onaylandı"** basıyordu. Yani makinenin "uygun" işareti ile
bilirkişinin dinleyerek verdiği onay **ayırt edilemiyordu**. Rapor "Onaylandı"
diyorsa o bölüm dinlenmiş olmalıdır; dinlenmemiş metni onaylı göstermek adli
belgede kabul edilemez.

### KULLANICI NE GÖRECEK

- Toplu **hızlı onayla** artık bölümleri **"Çözümlendi"** olarak işaretler
  (gri rozet). **Bu bilirkişi onayı değildir.**
- Raporda da **"Çözümlendi"** yazar; **"Onaylandı" yazmaz**.
- Dinleyip onayladığınız bölüm yeşil **"Onaylandı"** olur ve rapora öyle girer.
- Rozetin üzerine gelince ne anlama geldiği yazar (uzun açıklama **ipucunda**,
  ekranda değil — segment listesi sade kalır).
- Kontrol sayacı (x/y) otomatik işaretlenen bölümleri **saymaz**: onlar henüz
  kontrol edilmedi.
- Toplu işlemden sonra uyarı çıkar: *"BUNLAR ONAYLANMADI… dinleyip
  onaylamanız gerekir."*

### TASARIM KARARI (kullanıcı isteği)

Etiketler **kısa** tutulur; ayrıntı ipucuna taşınır. Böylece segment listesi
kalabalıklaşmaz ve yeni etiket eklendiğinde karışmaz. Etiket/ipucu/renk
**tek kaynaktan** (`assets/schema.js` → `REVIEW_LABEL`, `REVIEW_HINT`,
`REVIEW_TONE`) gelir; ekran ve rapor ayrışamaz.

### DEĞİŞMEZ KURALLAR

1. `machine` **onay değildir**: `isReviewed()` false, `isHumanApproved()` false.
2. Rapora "Onaylandı" yalnız `approved` için yazılır.
3. Birleştirmede `machine` = `pending` seviyesi (0); gelen `approved` onu geçer.
4. Rozet rengi onayla aynı olamaz (yeşil "Onaylandı" ≠ gri "Çözümlendi").
5. Yeni kontrol durumu eklerken: `REVIEW_STATE` + `REVIEW_LABEL` + `REVIEW_HINT`
   + `REVIEW_TONE` dördü birlikte tanımlanır.

### DOĞRULAMA

- `birim-testleri` **[34]** — 18 kontrol (etiket, ipucu, sayım, rapor hücresi).
- `sema-testi` — rozet sınıf/etiket eşleşmesi davranışa çevrildi.
- **Gerçek Chromium**: 3 bölüm → "✓ 3 hızlı onayla" → rozetler
  **"Çözümlendi"** (3 `auto`, 0 `done`), sayaç **0/3**, rapor "Onaylandı" **yok**.
  Sonra tek bölüm elle onaylandı → **"Onaylandı"** (1 `done`, 2 `auto`),
  raporda `onayCount = 1`. Makine→insan geçişi çalışıyor.

## v2.105 — Üst bar başlığı sessizce kesiliyordu

CANLI VERİ. v2.104'te tespit edilip **ayrı konu** olarak not edilen hata.

### ÖLÇÜM (v2.104, gerçek Chromium)

`#pageTitle` beş görünümün **hepsinde** kesiliyordu:

```
Genel görünüm        164px içerik / 95px kutu
Ses kayıtları        133px / 95px
İnceleme ve sorular  211px / 95px   ← yarısı görünmüyor
Rapor oluştur         146px / 95px
```

Sebep ölçüldü: `.top-actions` `flex:none` ile **922px** yer kaplıyordu
(depolama göstergesi tek başına 304px), `.top-title`'e 95px kalıyordu ve
`overflow:hidden` + `text-overflow:ellipsis` yazıyı **sessizce** kırpıyordu.
Hiçbir uyarı yoktu — AGENTS.md'nin "sığmayan öğe sessizce kesilmez" kuralının
tam ihlali.

### KULLANICI NE GÖRECEK

- **Sayfa başlığı artık tam görünür** ("İnceleme ve sorular" dâhil).
- Sığmadığında üst bar **alt satıra sarar** — düğmeler aşağı iner, yazı
  kesilmez. Sarma **görünür** bir davranıştır; sessiz kırpma değildir.
- Durum yazıları kısaltıldı: "● Yerel kayıt güncellendi" → **"● Kayıt güncel"**,
  "Hiç yedek alınmadı" → **"Yedek yok"**, "Dava verisi: … · Model: … · Kota: …"
  → **"Dava: … · Model: … · %n dolu"**. Ayrıntı fareyle üzerine gelince görünür.
- **UYARI yazıları kısaltılmadı**: "KAYDEDİLMİYOR — yedek alın!",
  "DEPOLAMA DOLU — yedek alın!", "KAYIT OKUNAMADI" aynen duruyor. Kullanıcının
  görmesi gereken uyarı, yer kazanmak için kısaltılamaz.

### ÖLÇÜM (v2.105, sonra)

| Genişlik | Üst bar | Başlık kesik |
|---|---|---|
| 1280px ve üzeri (5 görünüm) | 60px (değişmedi) | **hayır** |
| 1100–900px | 92px (sarar) | hayır |
| 760–600px | 125px (sarar) | hayır |

5 görünümde **kesilen metin: 0**.

### KENDİ KURALIMI İHLAL ETTİM (düzeltildi)

İlk denemede depolama göstergesine `max-width: 22ch` + `text-overflow:
ellipsis` verdim. Ölçüm: **201px metin 152px'e kırpıldı** — yani "sessiz kesme"
yasağını kendi düzeltmem ihlal ediyordu. Kırpma kaldırıldı; metin tek satır
kalır, sığmazsa üst bar sarar. `tasarim-testi` [2c] artık bunu da denetler
(*"depolama göstergesi kırpılmıyor: max-width/text-overflow yok"*).

### KORUYAN TEST

`tasarim-testi` **[2c]** — 5 kontrol: üst bar `flex-wrap:wrap`, `.top-title`
sıkışmaz, başlıkta `overflow:hidden` yok, depolama göstergesi tek satır,
depolama göstergesi kırpılmıyor. Asıl kanıt gerçek tarayıcı ölçümüdür
(`scrollWidth <= clientWidth`).

## v2.104 — "Hiçbir metin 11px altında olamaz" kuralı ekranda tutmuyordu

CANLI VERİ. Bilirkişi: *"sen versiyon yaptıkça sol barda yazdığımız versiyon
bilgisi okunaklı değil."* Haklıydı; ölçüm daha kötüsünü gösterdi.

### ÖLÇÜM (v2.103, gerçek Chromium)

```
SÜRÜM ETİKETİ: font-size = 7px   ("AKİS • v2.103 • Yerel sürüm")
11px altı görünür metin: 11 (Genel görünüm) · 15 (Ses) · 14 (İnceleme) · 14 (Rapor)
  7px  .version        ×1
  8px  .eyebrow, .split-n
  9px  .info-i (×5-6), .split-no
 10px  .subtle-pill
```

Yani v2.50'de konulan **"hiçbir metin 11px'in altında olamaz"** kuralı ekranda
TUTMUYORDU. Sebep: `tasarim-testi` yalnız `reading-layer.css`'e bakıyordu;
`app.css`'teki 154 küçük punto tanımının bir kısmını katman ezmiyordu ve test
bunu göremedi.

### KULLANICI NE GÖRECEK

- Sol alttaki sürüm yazısı artık **yalnız "v2.104"** yazar ve **okunaklıdır**
  (7px → 11px). "AKİS • Yerel sürüm" kalabalığı kaldırıldı.
- **Sürüm yazısına tıklayınca SÜRÜM GEÇMİŞİ açılır**: her sürümde sizin için ne
  değiştiği sade dille listelenir (tek kaynak: `VERSION_NOTICES`).
- Ekranın her yerinde **11px altı yazı kalmadı**: bölüm numaraları (8→11), bilgi
  simgeleri (9→11), küçük etiketler (10→11), zaman alanları (9,5→11), deşifre
  metni (10,5→14, satır aralığı 1,7).
- Metinler büyüdüğü için **hiçbir yazı kesilmedi**; 5 görünümde ölçüldü.

### DÜZELTME

1. `app.css`: 116 `font-size` + 38 `font` kısayolu 11px tabanına çekildi
   (kaynak temizlendi; kaçakları tek tek yamamak yerine kök düzeltildi).
2. `reading-layer.css`: kaçak seçiciler için açık ezme kuralları + sürüm etiketi
   stili (tıklanabilir, odak halkası, tema token'ı).
3. `index.html`: sürüm etiketi `<div>` → `<button>` (erişilebilir, klavyeyle
   açılır); `#versionDialog` geçmiş diyaloğu.
4. `app.js`: `versionHistoryEntries()` + `renderVersionHistory()` —
   `VERSION_NOTICES`'ten türetilir, ikinci liste tutulmaz.

### TEST DÜZELTMESİ (test de hatalıydı)

`tasarim-testi` [2b] eklendi: *app.css'teki her 11px altı kural, okuma
katmanınca eziliyor mu?* İlk sürümü **yanlış negatif** verdi (`.notice-box b`
seçicisi jenerik `b` kuralıyla "kapsandı" sanıldı; 10px metin ekranda kaldı).
Eşleştirme katılaştırıldı: tam seçici ya da seçicinin **tüm** sınıf/id
bileşenlerini taşıyan kural. Jenerik etiket tek başına kapsam sayılmaz.

### AYRI KONU (bu sürüme dahil değil)

`H1#pageTitle` ("Genel görünüm") `overflow:hidden` altında 164>95 px kesiliyor.
**v2.103'te de aynıydı** (ölçüldü, bu değişiklikten gelmiyor); ayrı bir sürümde
ele alınacak.

### DOĞRULAMA

- `bash tools/test.sh` → 490 birim + 396 şema + rapor/sürüm/**tasarım**.
- Gerçek Chromium, 5 görünüm: **11px altı = 0**, sürüm etiketi 11px ve kesiksiz,
  sürüm geçmişi açılıyor (17 sürüm satırı).

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
