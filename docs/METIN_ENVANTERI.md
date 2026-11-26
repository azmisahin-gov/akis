# Metin Envanteri (uygulamadaki tüm rapor metinleri)

Bu dosya **koddaki güncel metinleri** tek yerde toplar; hukuk danışmanlığı alırken
"hangi cümle nerede geçiyor, düzenlenebilir mi" sorusunu cevaplamak için üretildi.
Metinler `assets/app.js` içindeki `REPORT_TEXT`, `LETTER_TEXT` ve `DEFAULT_METHOD`
sabitlerinden **otomatik** çıkarıldı. **Bu dosyayı elle düzenlemeyin:**
`node tools/metin-envanteri.mjs` ile yeniden üretilir; `surum-testi` güncel olup
olmadığını denetler.

## 1) Ekranda nerede?

| Ne | Yol |
|---|---|
| Kendi varsayılan metinlerim (3 metin) | Üst bar **⚙ Ayarlar** → çekmecede **“Kendi varsayılan metinlerim”** |
| Bir dosyada yöntem/sınırlılık/sonuç yazmak | **Rapor** görünümü → belgede bölüme tıkla → sağda **Bölüm düzenle** |
| Kayıtlı metinlerim (tıkla-dolsun) | Aynı **Bölüm düzenle** panelinde, alanın altındaki **“Kayıtlı metinlerim (N)”** |
| Tarafsızlık beyanı | **Rapor → Kontrol** modu → **“Künye: tarafsızlığı etkileyebilecek hâl beyanı”** |
| Bölüm başlıkları / sıra | **Rapor** sol iskelet: kalem (başlık), ↑↓ (sıra), aç/kapa |
| Üst yazı metni | **Rapor → Üst yazı** sekmesi (gövde, yer, ilgi) |

## 2) Şu anda uygulamadan düzenlenebilenler

| Metin | Nerede | Kapsam |
|---|---|---|
| İnceleme yöntemi | Bölüm düzenle + Ayarlar (varsayılan) | Dosya + yeni dosya varsayılanı |
| Teknik sınırlılıklar | Bölüm düzenle + Ayarlar (varsayılan) | Dosya + yeni dosya varsayılanı |
| Sonuç ve kanaat | Bölüm düzenle + Ayarlar (varsayılan) | Dosya + yeni dosya varsayılanı |
| Tarafsızlığı etkileyebilecek hâl beyanı | Rapor → Kontrol | Dosya |
| Üst yazı: yer, ilgi, gövde, imza | Rapor → Üst yazı | Dosya |
| Bölüm başlıkları, sıra, aç/kapa | Rapor iskeleti | Dosya |
| Ek başlığı / içerik / not | Rapor → Kontrol → Ekler | Dosya |
| Tablo sütunları ve başlıkları | Rapor → Kontrol → Rapor alanları | Dosya |
| Punto, kenar boşluğu, yön | Rapor → Kontrol → Rapor biçimi | Dosya |
| Teknik ortam (7 alan), ikinci kontrol (3 alan) | Rapor → Kontrol | Dosya |

## 3) Uzun metinler (rapora giren cümleler)

Her metin **koddadır** (bugün sabit). “Düzenlenebilir?” satırı o metnin bugün
uygulamadan değiştirilip değiştirilemediğini söyler.

### 3.0 İnceleme yöntemi — `DEFAULT_METHOD`

> İnceleme kapsamında tarafıma sunulan dijital ses dosyalarının dosya adları, biçimleri, boyutları, süreleri ve teknik özellikleri kaydedilir. Orijinal dosyanın içerik baytları değiştirilmeden saklanır ve her dosyanın SHA-256 özeti hesaplanır. Kaynak ses dosyası üzerinde düzenleme yapılmaz; çözümleme, dosyanın çalışma kopyası üzerinde yürütülür.
>
> Otomatik konuşma çözümleme çıktısı, dinlemeyi destekleyen bir taslak olarak değerlendirilir ve rapora aktarılmadan önce ilgili ses bölümleriyle karşılaştırılarak uzman tarafından kontrol edilir. Kontrol edilmeyen bölümler ayrıca işaretlenir. Konuşma bölümleri, elde edilen zaman bilgileriyle gösterilir. Konuşmacı etiketleri otomatik kimlik tespiti anlamına gelmez; kayıt içindeki kişileri ayırt etmek amacıyla uzman tarafından girilir. Anlaşılmayan veya üst üste gelen konuşmalar tahmin edilmez; kontrol sırasında uygun biçimde işaretlenir. Kayıt niteliğinin değerlendirmeyi sınırladığı durumlar ayrıca belirtilir.

### Künye / kapak

**`subtitle`** — **Düzenlenebilir?** hayır — kod sabiti

> SES KAYITLARININ TEKNİK İNCELEMESİ VE KONUŞMA İÇERİĞİNİN ÇÖZÜMLENMESİ

**`defaultField`** — **Düzenlenebilir?** hayır — kod sabiti

> 56.12 Ses Kayıtlarının Metin Haline Dönüştürülmesi (Yargı Mercilerince Ses ve Görüntü Bilişim Sisteminin Kullanılması Hariç)

### Kapsam, sorular, yöntem, sonuç

**`defaultScope`** — **Düzenlenebilir?** hayır — kod sabiti

> Görevlendirme yazısında belirtilen inceleme konusu, kapsamı ve sınırları burada açıklanır.

**`defaultQuestions`** — **Düzenlenebilir?** hayır — kod sabiti

> Görevlendirme yazısında bilirkişiye yöneltilen sorular, yazıdaki sırasıyla bu bölümde gösterilir.

**`defaultEvaluation`** — **Düzenlenebilir?** hayır — kod sabiti

> Teknik sorulara ilişkin değerlendirme, görevlendirme yazısında yer alan sorular doğrultusunda eklenir.

**`s5Intro`** — **Düzenlenebilir?** hayır — kod sabiti

> Her kayıt için sırasıyla: (a) kısa kayıt bilgisi, (b) o kayıtta konuşanların tablosu, (c) zaman damgalı deşifre tablosu verilir. Bu açıklama her kayıtta yinelenmez.

**`answersIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Görevlendirme kararındaki sorular, sorulma sırası korunarak aşağıda cevaplanmıştır. Her cevap, ilgili kayıt ve zaman aralığıyla ilişkilendirilir; cevaplanamayan sorunun nedeni açıkça yazılır. Sorular metni değiştirilmeden aktarılır.

**`limitsIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Aşağıda inceleme sırasında gerçekten karşılaşılan teknik sınırlılıklar açıklanmıştır. Sınırlılık yoksa bu açıkça belirtilir; ölçülmeyen değer yazılmaz ve konuşmanın anlamı bağlamdan tamamlanmaz.

**`defaultLimitations`** — **Düzenlenebilir?** kod; **Ayarlar → Kendi varsayılan metinlerim** ile değiştirilebilir (boş alan için)

> İncelemede karşılaşılan teknik sınırlılıklar varsa, somut kayıt ve zaman aralıklarıyla açıklanır.

**`defaultConclusion`** — **Düzenlenebilir?** kod; **Ayarlar → Kendi varsayılan metinlerim** ile değiştirilebilir (boş alan için)

> Sonuç, yalnızca inceleme kapsamında tespit edilen ve gerekçelendirilen teknik bulgulara dayanılarak bilirkişi tarafından yazılır.

**`summaryIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Aşağıdaki özet, raporu inceleyen mercie teknik sonucu hızlıca görmesi için hazırlanmıştır; ayrıntı ve görevlendirme sorularına cevaplar ilgili bölümlerdedir. Özet ile ayrıntılı bölümler birbiriyle tutarlıdır.

**`sections`** — **Düzenlenebilir?** hayır — kod sabiti

> 1. İNCELEMENİN KONUSU, KAPSAM VE SINIRLARI · 2. BİLİRKİŞİNİN CEVAPLAMASI GEREKEN SORULAR · 3. BİLİRKİŞİDEN GÖZLEMLENMESİ VE İNCELENMESİ İSTENEN MADDİ UNSURLAR · 4. İNCELEME YÖNTEMİ, BİLİMSEL VE TEKNİK DAYANAKLAR · 5. ANALİZ, TESPİT VE DEĞERLENDİRME · 6. GEREKÇELİ SONUÇ · 7. EKLER

### Envanter ve kayıtlar

**`defaultInventoryIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> İncelemeye sunulan dijital ses materyalleri aşağıda envanter bilgileriyle gösterilmiştir.

**`inventoryNote`** — **Düzenlenebilir?** hayır — kod sabiti

> Envanterdeki codec, kanal, örnekleme ve bit derinliği bilgileri dosya konteynerinden okunmuştur; SHA-256 özeti ise dosyanın hesaplama anındaki dijital özetidir. Bu bilgiler tek başına kaydın gerçekliğini, kayıt tarihini, kayıt tarihçesini veya montaj yapılıp yapılmadığını doğrulamaz.

**`videoAudioNote`** — **Düzenlenebilir?** hayır — kod sabiti

> Kesitteki video dosyalarından yalnızca ses kanalı çözümlenmiştir; görüntü incelenmemiştir.

### Konuşmacı

**`speakerIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Kayıtta konuşan kişiler, bilirkişinin verdiği etiketlere göre aşağıda listelenmiştir. Etiketler ve öznitelikler bilirkişi beyanına dayanır; konuşmacı kimliği kendiliğinden tespit edilmemiştir. Perde değeri otokorelasyon yöntemiyle hesaplanan bir tahmindir ve kayıt koşullarına bağlıdır.

**`speakerFootnote`** — **Düzenlenebilir?** hayır — kod sabiti

> S kodları kayıt içidir (her kayıtta S1'den başlar); K kodları dosyalar arası kişiyi gösterir ve uzman eşleştirmesidir. Süre, ilgili konuşmacının bölümlerinin toplamı; ilk–son, kayıtta duyulduğu zaman aralığıdır. Ölçülmeyen değer "—" olarak yazılır.

**`speakerVerifiedNote`** — **Düzenlenebilir?** hayır — kod sabiti

> Konuşmacı künyesi doğrulanmıştır (etiket/rol bilgisi bilirkişi tarafından kontrol edilmiştir). Bu, bölümlerin dinlenerek onaylandığı anlamına gelmez.

**`speakerMethodNote`** — **Düzenlenebilir?** hayır — kod sabiti

> Konuşmacı grupları, ses benzerliğine dayalı anonim kümeleme ile ön-atandı; nihai konuşmacı etiketleri uzman değerlendirmesinin ürünüdür. Bu yöntem bir konuşmacı kimlik tespiti değildir.

**`speakerCodeNote`** — **Düzenlenebilir?** hayır — kod sabiti

> Bu raporda S kodları (S1, S2…) KAYIT İÇİ etiketlerdir: her kayıtta S1'den başlar ve kayıtlar arasında aynı kişiyi göstermez. Aynı kişi birden çok kayıtta konuşuyorsa K koduyla (K1, K2…) tek satırda gösterilir (dosyalar arası eşleştirme); bu eşleştirme uzman kanaatidir, otomatik kimlik tespiti değildir.

**`speakerCodeConflict`** — **Düzenlenebilir?** hayır — kod sabiti

> UYARI: Aynı konuşmacı kodu (ör. S1) birden çok kişiye verilmiş. Bu durumda kod, hangi bölümün kime ait olduğunu göstermez; rapor yayımlanmadan önce konuşmacı kodları düzeltilmelidir.

### Köken, edinme, metadata

**`originIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Kayıtların hangi ortamdan geldiği, kim tarafından ve ne zaman teslim edildiği aşağıda gösterilmiştir. Bu bilgiler bilirkişi beyanına ve teslim tutanağına dayanır; ortam türü kendiliğinden tespit edilmemiştir.

**`originFileTimeNote`** — **Düzenlenebilir?** hayır — kod sabiti

> Ortamdaki dosya zamanları (oluşturulma/değiştirilme/erişim) yalnız edinme sırasında okunan gözlemlerdir; kayıt zamanı değildir. Kopyalama, dosya sistemi ve saat dilimi bu değerleri değiştirebilir. Kayıt cihazı ve kayıt tarihi yalnız beyan varsa yazılır; yoksa “bilinmiyor” yazar.

**`acqIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Aşağıdaki bilgiler, delilin alındığı cihazdan edinme aracıyla çıkarılan tutanağa dayanır. Cihaz bilgisi tutanaktaki beyandır; cihaz bu ortamda okunmaz. Dosya özetleri (SHA-256) yeniden hesaplanarak doğrulanır. "Doğrulandı" yalnız özet tutuyorsa yazılır; özet yoksa veya hesaplanamazsa "Doğrulanamadı" yazılır.

**`embeddedIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Aşağıdaki değerler ses dosyasının kendi metadata’sından okunmuştur. Cihaz beyanıdır; doğrulanmamıştır ve değiştirilebilir. Tek başına kayıt zamanı kanıtı değildir.

**`mediumTypes`** — **Düzenlenebilir?** hayır — kod sabiti

> Belirtilmedi · CD / DVD · USB flaş bellek · Taşınabilir disk · Sabit disk / imaj · E-posta eki · Bulut / ağ paylaşımı · Hafıza kartı · Telefon · Diğer

### Ölçümler (WER, seviye)

**`werIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Aşağıdaki oranlar, referans metni bulunan kayıtlarda otomatik çözümlemenin ÜRETTİĞİ HAM ÇIKTININ (bilirkişi düzeltmesinden ÖNCEKİ hâli) referansla karşılaştırılmasıyla hesaplanmıştır. WER (kelime hata oranı) düşük olan daha iyidir; yerine koyma, silme ve ekleme hatalarını referans kelime sayısına böler. Ölçüm, düzeltilmiş metni DEĞİL modelin kendi çıktısını ölçer; bu yüzden bilirkişi düzeltmeleri oranı değiştirmez. Model çıktısı saklanmamış eski kayıtlar ile referans metni bulunmayan kayıtlar bu tabloya girmez.

**`werNoRows`** — **Düzenlenebilir?** hayır — kod sabiti

> Ölçüm yapılabilecek kayıt yok (referans metni ve çözümleme gerekir). ·  ·  ·  ·  · 

**`levelIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Aşağıdaki değerler, kayıtların örneklerinden hesaplanan elektro-akustik ölçümlerdir. Tepe ve RMS düzeyleri dBFS (0 dBFS = tam ölçek) cinsindendir; tepe kırpılma oranı, örneklerin tam ölçek sınırına dayandığı sürenin örnek sayısına oranıdır. Gürültü tabanı ve sinyal/gürültü oranı, kısa pencerelerin RMS dağılımından okunur. Bu ölçümler kaydın içeriğini değil, yalnızca düzey ve kırpılma durumunu gösterir; ölçüm yapılmamış kayıt bu tabloya girmez.

### İnceleme özeti, QC, bütünlük

**`reviewSummaryIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Aşağıdaki özet, inceleme sırasında gerçekten yapılan işlemleri ve kalan eksikleri gösterir. Yapılmayan bir işlem raporda yapılmış gibi gösterilmez.

**`qcIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Aşağıdaki sayılar inceleme sırasında gerçekten yapılan işlemleri ve kalan eksikleri gösterir. Bunlar bir ONAY değil, denetim listesidir; son kararı bilirkişi verir.

**`qcNote`** — **Düzenlenebilir?** hayır — kod sabiti

> İkinci kontrol (varsa) bilirkişi beyanıdır; boş alan "—" olarak yazılır.

**`integrityIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Orijinal dosya üzerine yazılmamıştır; inceleme, dosyanın değiştirilmeyen kopyası üzerinde yürütülmüştür. Dinleme yardımcıları (hız, filtre, kanal seçimi) kaydı değiştirmez ve deşifre metnini etkilemez. Aşağıdaki özetler, hesaplandıkları andaki içeriğin bit düzeyinde bütünlüğünü gösterir.

**`integrityNote`** — **Düzenlenebilir?** hayır — kod sabiti

> SHA-256 özeti tek başına kaydın kim tarafından, hangi cihazla veya ne zaman oluşturulduğunu kanıtlamaz; yalnız hesaplama anındaki içerik bütünlüğünü karşılaştırmaya yarar. Özet hesaplanmadıysa "hesaplanmadı" yazılır, uydurulmaz. Delil günlüğü zinciri, kayıtlı işlemlerin sonradan değiştirilmediğini gösterir; eski (hash taşımayan) kayıtlar "eski kayıt" olarak işaretlenir.

### Beyan, gizlilik, dayanak, ASR

**`scopeNoteText`** — **Düzenlenebilir?** hayır — kod sabiti

> Bu rapor 56.12 (ses kayıtlarının metin hâline dönüştürülmesi) kapsamındadır. Ayrıca ve açıkça istenip uygun uzmanlıkla görevlendirilmedikçe; konuşmacının gerçek kimliğinin sesinden tespiti, iki ayrı kaydın aynı kişiye ait olup olmadığının karşılaştırılması, sesin özgünlüğü/kaynağı, montaj veya tahrifat incelemesi, kayıt cihazı/ortamı tespiti ve akustik olay analizi yapılmamıştır. Bu nitelikteki sorular ilgili başka uzmanlık alanında ayrıca değerlendirilmelidir. Bu rapor, Yargı mercilerince SEGBİS kullanılarak yapılan kayıt/tutanak işlemlerinin yerine geçmez.

**`privacyText`** — **Düzenlenebilir?** hayır — kod sabiti

> Ses içeriği ve çözümleme bu ortamda yerel olarak yürütülmüştür; kayıt harici bir hizmete yüklenmemiştir. Dosyalar ve proje verisi yerel depolamada tutulur. Kayıtta kişisel veri veya gizli bilgi bulunabileceğinden rapor ve ekleri yalnızca yetkili mercie sunulmalı; üçüncü kişilerle paylaşılmamalıdır.

**`annexLegalText`** — **Düzenlenebilir?** hayır — kod sabiti

> Yöntemsel dayanaklar dosyaya ve görevlendirme kararına göre bilirkişi tarafından değerlendirilir. Bu raporda doğrulanmamış mevzuat maddesi, standart sürümü veya künye bilgisi kullanılmamıştır. Uluslararası teknik rehberler ancak gerçekten kullanıldıysa tam başlık, sürüm ve tarihle belirtilmelidir; aksi hâlde anılmaz.

**`asrIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Otomatik konuşma tanıma (ASR) yalnızca yardımcı araç olarak kullanılmıştır. Otomatik çıktının tamamı uzman tarafından ses kaydı dinlenerek karşılaştırılmış; denetlenmeyen otomatik metin nihai transkript olarak kabul edilmemiştir. Otomatik sistemin duyulmayan kelimeyi üretmesi veya özel isimleri yanlış tamamlaması mümkündür; bu yüzden rapora onaylanmış metin girer.

**`asrLocal`** — **Düzenlenebilir?** hayır — kod sabiti

> Çalışma biçimi: yerel/çevrimdışı (kayıt harici bir hizmete aktarılmamıştır).

**`asrVerify`** — **Düzenlenebilir?** hayır — kod sabiti

> İnsan doğrulaması: bölümler dinlenerek kontrol edilmiş; yalnızca uzman onaylı metin rapora aktarılmıştır.

**`enhanceText`** — **Düzenlenebilir?** hayır — kod sabiti

> Ses iyileştirme uygulanmamıştır; orijinal kayıt değiştirilmemiştir. Dinleme yardımcıları (hız, filtre, kanal seçimi) yalnızca dinlemeyi kolaylaştırır, kaydı değiştirmez ve deşifre metnini etkilemez. İşlenmiş bir kopya oluşturulmamıştır.

**`techIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> İncelemenin yürütüldüğü iş istasyonu, yazılım ve dinleme donanımı aşağıda bilirkişi beyanına göre gösterilmiştir. Boş alan rapora "—" olarak yazılır; uydurulmaz.

**`techNote`** — **Düzenlenebilir?** hayır — kod sabiti

> Teknik araçların adı ve sürümü yalnız fiilen kullanıldığı ölçüde yazılır; aracın dosyayı açabilmesi tek başına bilimsel doğrulama değildir.

### Okuma metni / terim

**`readingIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Aşağıdaki okuma metni, aynı konuşmacının ardışık bölümlerinden türetilmiş salt okunur bir okuma biçimidir. Ayrıntılı (zaman damgalı) bölüm tablosu ve cümle zamanları değişmez; bu bölüm yalnız okunabilirliği artırır.

**`termsIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Transkriptte en sık geçen anlamlı sözcükler (parantezdeki sayı = geçiş sayısı). Yazım tutarlılığı ve hızlı tarama içindir; bir özet ya da yorum değildir. Sıra: sıklık, eşitlikte alfabetik.

### Teslim kontrolü / beyan alanı

**`deliveryCheckNote`** — **Düzenlenebilir?** hayır — kod sabiti

> Bu tablo teslimden önce otomatik denetimdir; elle işaretlenen satır yoktur. "Eksik" satırı giderilmeden rapor teslim edilmemelidir. "Bilgi" satırı eksik değildir: alan isteğe bağlıdır ya da ölçüm yapılamamıştır.

**`impartialityHint`** — **Düzenlenebilir?** kod (panel ipucu)

> Bu alan taahhüt değil BEYANdır: tarafsızlığı/bağımsızlığı etkileyebilecek bir hâl yoksa “engel bulunmadığı”, varsa açıklama ve bildirilen merci yazılır. Boş bırakılırsa rapora satır basılmaz.

**`impartialityTemplate`** — **Düzenlenebilir?** kod; beyan alanındaki **“Engel bulunmadığını yaz”** düğmesi bu cümleyi yazar

> Tarafsızlığı ve bağımsızlığı etkileyebilecek bir hâl bulunmamaktadır.

### Uyarılar

**`warnLanguage`** — **Düzenlenebilir?** hayır — kod sabiti

> En az bir kaydın transkriptinde dil tutarsızlığı olasılığı bulundu.

**`warnHallucination`** — **Düzenlenebilir?** hayır — kod sabiti

> En az bir kayıtta model anlamlı konuşma üretemedi veya dolgu ifadesi üretti; bu bölümler rapora aktarılmadan önce elle doldurulmalıdır.

### Fizikî dosya (tutanak metinleri)

**`physicalAnnexEmpty`** — **Düzenlenebilir?** hayır — kod sabiti

> Fizikî dosya teslim ve iade kaydı girilmemiştir. Dosya yalnız elektronik (UYAP) erişimle incelendiyse bu bölüm boş kalır; bu bir eksiklik değildir.

**`physicalIntro`** — **Düzenlenebilir?** hayır — kod sabiti

> Aşağıdaki kayıt, bilirkişiye fizikî olarak teslim edilen dava dosyası ve materyaller ile inceleme sonunda yapılan iadeyi gösterir. Dosya içeriği tek tek sayılmadıysa bu durum açıkça yazılır; sayılmadığı hâlde sayılmış gibi gösterilmez. Materyallerin içeriği bu bölümün kapsamı dışındadır.

**`physicalMissingWarning`** — **Düzenlenebilir?** hayır — kod sabiti

> UYARI: Teslim alınan materyallerden biri veya birkaçı iade edilmemiş olarak kayıtlıdır. İade işlemi tamamlanmış sayılmaz.

**`physicalNoIndexWarning`** — **Düzenlenebilir?** hayır — kod sabiti

> Dizi pusulası verilmediği için dosya içeriği mahkemece sayılarak teslim edilmemiştir; bilirkişi içeriği tek tek saymamıştır.

**`physicalSignatureNote`** — **Düzenlenebilir?** hayır — kod sabiti

> Bu tutanak iki nüsha düzenlenir ve taraflarca imzalanır. Elektronik imza üretilmez; imzalı nüshanın taranmış kopyası dosyaya eklenebilir.

### Diğer uzun metinler

**`attachmentsText`** — **Düzenlenebilir?** hayır — kod sabiti

> Bu bölüm yalnız eklerin listesini verir; ek içerikleri EKLER bölümündedir.

**`inventoryHeaders`** — **Düzenlenebilir?** hayır — kod sabiti

> DOSYA ADI · DOSYA BİÇİMİ · DOSYA BOYUTU · SÜRE · SES KANALI · ÖRNEKLEME HIZI · SHA-256

**`speakerHeaders`** — **Düzenlenebilir?** hayır — kod sabiti

> KOD · ETİKET · KAYIT · ROL · CİNSİYET · YAŞ ARALIĞI · ÖLÇÜLEN PERDE · BÖLÜM / NOT

**`segmentHeadersObs`** — **Düzenlenebilir?** hayır — kod sabiti

> ZAMAN ARALIĞI · KONUŞMACI KODU · KONUŞMACI ETİKETİ · ÇÖZÜMLENEN KONUŞMA · KONTROL DURUMU · GÖZLEM

**`levelHeaders`** — **Düzenlenebilir?** hayır — kod sabiti

> KAYIT · TEPE (dBFS) · RMS (dBFS) · TEPE KIRPILMA · GÜRÜLTÜ TABANI · SİNYAL / GÜRÜLTÜ · EK ÖLÇÜMLER

**`originHeaders`** — **Düzenlenebilir?** hayır — kod sabiti

> KAYIT · ORTAM TÜRÜ · ORTAM ETİKETİ · TESLİM EDEN · TESLİM TARİHİ · TESLİM YERİ · KAYIT CİHAZI · KAYIT TARİHİ

**`acqHeaders`** — **Düzenlenebilir?** hayır — kod sabiti

> KAYIT · CİHAZ · ETİKET · SERİ NO · YÖNTEM · ARAÇ · OPERATÖR · ALINMA · DOĞRULAMA

**`segmentHeaders`** — **Düzenlenebilir?** hayır — kod sabiti

> ZAMAN ARALIĞI · KONUŞMACI KODU · KONUŞMACI ETİKETİ · ÇÖZÜMLENEN KONUŞMA · KONTROL DURUMU

**`physicalItemHeaders`** — **Düzenlenebilir?** hayır — kod sabiti

> SIRA · TÜR · MARKA / ETİKET · SERİ NO · MÜHÜR / AMBALAJ · TESLİM DURUMU · İLGİLİ · İADE

## 4) Üst yazı metinleri (`LETTER_TEXT`)

**`subject`**

> Bilirkişi Raporunun Sunulması

**`closing`**

> Bilgilerinize arz ederim.

**`annexHeading`**

> Ek:

**`signerTitle`**

> Bilirkişi

**`registryLabel`**

> Bilirkişilik Sicil No:

**`fileNoLabel`**

> Dosya No:

**`subjectLabel`**

> Konu:

**`referenceLabel`**

> İlgi:

**`reportAnnexLabel`**

> Bilirkişi Raporu

**`defaultSectionsLabel`**

> Teknik Bilgiler

**`fallbackAnnexLabel`**

> Ek

**`referenceFromAssignment`**

> (dateText) => `Mahkemenizin ${dateText} tarihli görevlendirme yazısı.`

**`missing`**

> [object Object]

## 5) Kısa etiket ve başlıklar (`REPORT_TEXT`, 60 karakterden kısa)

Bunlar hukuki cümle değil, **etiket/başlık**tır (ör. sütun adları, boş durum metinleri).

| Anahtar | Değer |
|---|---|
| `synthetic` | KURGUSAL TEST MATERYALİDİR · RESMÎ BELGE DEĞİLDİR |
| `tocHeading` | İÇİNDEKİLER |
| `sub51` | 5.1. Ses kayıtlarının çözümlenmesi |
| `readingHeading` | OKUMA METNİ |
| `emptyCourt` | ……………………………… MAHKEMESİ |
| `emptyFileNo` | — |
| `defaultQuestion` | Soru metni girilmemiştir. |
| `defaultAnswer` | Bu soruya ilişkin teknik cevap henüz girilmemiştir. |
| `defaultBasis` | Belirtilmemiş |
| `defaultExpert` | BİLİRKİŞİ |
| `toplineField` | UZMANLIK ALANI ·  |
| `expertFieldHeading` | UZMANLIK ALANI |
| `noMaterials` | İncelemeye sunulan ses kaydı bulunmamaktadır. |
| `codecFallback` | Ses dosyası |
| `segmentCountLabel` | Deşifre bölümü |
| `noTranscript` | Bu kayıt için henüz deşifre metni oluşturulmamıştır. |
| `noColumns` | Bu tablo için alan seçilmedi. |
| `noAttachments` | Ek listesi boş: EKLER bölümü kapalı veya ek yok. |
| `annexIntro` | Raporun denetlenebilirliği için sunulan ekler aşağıdadır. |
| `noSpeakerRow` | — · Konuşmacı etiketi girilmemiştir. ·  ·  ·  ·  ·  ·  |
| `obsLabels` | [object Object] |
| `spectrogramLabel` | Spektrogram incelendi |
| `werHeading` | ÇÖZÜMLEME DOĞRULUĞU ÖLÇÜMÜ (WER) |
| `werHeaders` | KAYIT · MODEL · REFERANS KELİME · ÇIKTI KELİME · HATA · WER |
| `levelHeading` | SES SEVİYESİ VE KIRPILMA ÖLÇÜMÜ |
| `rsLevel` | Seviyesi ölçülen kayıt |
| `originHeading` | KAYIT KÖKENİ VE TESLİM ZİNCİRİ |
| `originUnknown` | bilinmiyor |
| `originEmpty` | — |
| `acqHeading` | DELİL EDİNME VE DOĞRULAMA |
| `embeddedHeading` | GÖMÜLÜ METADATA (CİHAZ BEYANI) |
| `embeddedHeaders` | KAYIT · KAYIT ZAMANI (beyan) · YAZILIM (beyan) · KAYNAK |
| `impartialityHeading` | TARAFSIZLIĞI ETKİLEYEBİLECEK HÂL BEYANI |
| `impartialityPlaceholder` | Engel bulunmadığı / varsa açıklama ve bildirilen merci |
| `reviewSummaryHeading` | İNCELEME ÖZETİ (DENETİM KAYDI) |
| `deliveryCheckTitle` | TESLİM KONTROLÜ |
| `deliveryCheckHeaders` | KONTROL · DURUM · AÇIKLAMA |
| `deliveryCheckStateOk` | Tamam |
| `deliveryCheckStateMissing` | Eksik |
| `deliveryCheckStateInfo` | Bilgi |
| `checklistTitle` | SAYISAL KONTROL |
| `checklistHeaders` | KONTROL · DEĞER |
| `rsMaterials` | İncelemeye alınan kayıt |
| `rsSegments` | Çözümlenen bölüm |
| `rsReviewed` | Uzman denetiminden geçen bölüm |
| `rsUnreviewed` | Denetim bekleyen bölüm |
| `rsInaudible` | Anlaşılmadı işaretli bölüm |
| `rsBlank` | Anlamlı metin içermeyen bölüm |
| `rsObservations` | Gözlem işareti konulan bölüm |
| `rsSilence` | Sessizlik oranı ölçülen bölüm |
| `rsSpectrogram` | Spektrogram incelenen kayıt |
| `rsChannel` | Kanal ayrımı yapılan kayıt |
| `rsSpeaker` | Konuşmacı etiketi (kayıt içi) |
| `rsUnassignedSegs` | Konuşmacı atanmamış bölüm |
| `unassignedSpeaker` | Konuşmacı belirtilmedi |
| `rsPitch` | Perdesi ölçülen konuşmacı |
| `rsOriginFilled` | Kökeni belgelenen kayıt |
| `rsOriginMedium` | Ortam türü belirtilen kayıt |
| `rsWerMeasured` | WER ölçümü yapılan kayıt |
| `emptySpeaker` | Belirtilmemiş |
| `timeDash` | — |
| `signatureLabel` | İmza |
| `signatureRegistry` | Sicil No |
| `evidenceWarningPrefix` | Çözümleme uyarısı: |
| `languageWarningPrefix` | Kontrol uyarısı: |
| `fileMissing` | Dosya numarası girilmemiştir |
| `warnMissingFields` | Mahkeme/merci, dosya numarası veya bilirkişi adı eksik. |
| `warnNoMaterials` | Rapora eklenecek ses kaydı bulunmuyor. |
| `warnPreReport` | Rapor öncesi kontrol: |
| `noInventoryRow` | İncelemeye sunulan ses kaydı bulunmamaktadır. ·  ·  ·  ·  |
| `summaryHeading` | RAPORUN KISA ÖZETİ |
| `enhanceHeading` | SES İYİLEŞTİRME / FİLTRELEME İŞLEMLERİ |
| `asrHeading` | OTOMATİK KONUŞMA TANIMA / YAPAY ZEKÂ KULLANIMI |
| `asrHeaders` | KAYIT · MODEL · ÇÖZÜMLEME ZAMANI |
| `asrNone` | Bu dosyada otomatik konuşma tanıma kullanılmamıştır. |
| `scopeNoteHeading` | GÖREV ALANI DIŞINDA KALAN KONULAR VE SINIRLILIK BEYANI |
| `privacyHeading` | KİŞİSEL VERİ, GİZLİLİK VE BİLGİ GÜVENLİĞİ |
| `annexHeading` | EKLER |
| `annexNoLog` | Kayıtlı işlem günlüğü yok. |
| `annexNoInventory` | Teknik envanter kaydı yok. |
| `techHeading` | TEKNİK ÖZELLİKLER VE İNCELEME ORTAMI |
| `qcHeading` | KALİTE KONTROLÜ VE DENETLENEBİLİRLİK |
| `limitsMeasuredPrefix` | Bölüm işaretlerinden ölçülen:  |
| `integrityHeaders` | KAYIT · SHA-256 · DOĞRULAMA · DELİL GÜNLÜĞÜ |
| `integrityNoHash` | hesaplanmadı |
| `integrityNotVerified` | Doğrulanmadı |
| `recordSpeakersPrefix` | Bu kaydın konuşmacıları:  |
| `recordSpeakersHeading` | Konuşmacılar (bu kayıt) |
| `recordTranscriptHeading` | Deşifre (zaman damgalı) |
| `speakerDurationHeading` | KONUŞMACI SÜRELERİ |
| `speakerDurationHeaders` | KOD · ETİKET · KAYIT · BÖLÜM · SÜRE · İLK – SON |
| `speakerVerifiedSuffix` | doğrulandı |
| `physicalHandoverHeading` | Fizikî dosya teslimi |
| `physicalReturnHeading` | Fizikî dosya iadesi |
| `physicalItemsHeading` | Teslim alınan fizikî materyaller |
| `physicalHandoverHeaders` | KONU · KAYIT |
| `physicalReturnHeaders` | KONU · KAYIT |
| `physicalIndexDelivered` | Dizi pusulası verildi |
| `physicalIndexNotDelivered` | Dizi pusulası verilmedi |
| `physicalIndexUnknown` | Dizi pusulası durumu belirtilmedi |
| `physicalNoItems` | Ayrı fizikî materyal teslim alınmamıştır. |
| `physicalNotReturned` | İade edilmedi |
| `physicalReturned` | İade edildi |
| `physicalChanged` | Durum/mühür değişti |
| `physicalDocHeading` | Fizikî dosya belgeleri (taranmış kopyalar) |
| `physicalDocHeaders` | BELGE · TÜR · TARİH |
| `physicalDocKinds` | [object Object] |

## 6) Danışmana sorulacaklar (öneri)

Aşağıdaki metinler **hukuki/etik beyan** niteliğinde; önce bunlar netleşmeli:

1. `DEFAULT_METHOD` (İnceleme yöntemi) — yapılan/yapılmayan işi anlatır.
2. `scopeNoteText` (Görev alanı dışında kalan konular / sınırlılık beyanı).
3. `annexLegalText` (Hukuki ve yöntemsel dayanaklar) — **mevzuat atfı içerir**, doğrulanmalı.
4. `privacyText` (Kişisel veri / gizlilik).
5. `asrIntro`, `asrLocal`, `asrVerify` (otomatik çözümleme ve doğrulama sınırı).
6. `impartialityTemplate` / beyan alanı (tarafsızlığı etkileyebilecek hâl).
7. `defaultLimitations`, `defaultConclusion` (teknik sınırlılık ve sonuç çerçevesi).
8. `deliveryCheckNote` (teslim kontrolü tablosunun anlamı).

> **Not:** Uygulama hukuki görüş üretmez; bu metinler bilirkişinin beyanı/teknik
> açıklamasıdır. Mevzuat maddesi ve uzmanlık alanı künyesi **doğrulanmadan** yazılmaz.
