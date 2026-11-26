# AKİS-ÜY-01 — Bilirkişi Üst Yazısı, Ekler ve Dijital Belge Paketi Standardı

**Belge türü:** Geliştirici şartnamesi / kabul kriterleri  
**Sürüm:** 1.0  
**Hazırlanma tarihi:** 26.11.2026  
**Hedef depo:** `azmisahin-gov/akis`  
**İlgili mevcut sürüm:** README ve CHANGELOG'da görülen v2.325  
**Durum:** Önerilen proje standardı. Uygulama mevzuatın zorunlu kıldığı biçim olarak sunulmamalıdır.

---

## 0. Amaç ve bağlayıcılık ayrımı

Bu şartname, AKİS'in mahkemeye sunulan bilirkişi üst yazısını ve ona bağlı belge setini baştan sona tek bir tutarlı standarda bağlar. Kapsam yalnızca sayfa tasarımı değildir. Metin, Türkçe yazım, harf biçimi, girinti, hizalama, imza görünümü, eklerin adlandırılması, dosya adları, UDF/DOCX üretimi, ZIP içeriği, SHA-256 manifesti ve otomatik testler bu standardın parçasıdır.

Her madde aşağıdaki etiketlerden birini taşır:

- **[MEVZUAT REFERANSI]**: İlgili mevzuat veya resmî kılavuzda bulunan kural. Bağımsız bilirkişiye doğrudan uygulanıp uygulanmadığı ayrıca belirtilir.
- **[AKİS STANDARDI]**: Projenin bütün çıktılarında tutarlılık sağlamak için kabul ettiği ürün kararıdır; tek başına kanuni zorunluluk değildir.
- **[TEKNİK KABUL]**: Geliştiricinin testle kanıtlaması gereken uygulama şartıdır.

### Hukuki kapsam notu

10.06.2020 tarihli ve 31151 sayılı Resmî Gazete'de yayımlanan Resmî Yazışmalarda Uygulanacak Usul ve Esaslar Hakkında Yönetmelik'in 1. maddesi bütün kamu kurum ve kuruluşlarını kapsar. Bağımsız, gerçek kişi bilirkişinin mahkemeye kendi adına sunduğu her yazıya, kamu kurumunun EBYS yazısıymış gibi Yönetmeliğin bütün kurallarının doğrudan uygulandığı varsayılmamalıdır. Bu şartname, Yönetmeliğin belge düzeni hükümlerini AKİS için biçim referansı olarak kullanır; bilirkişilik ve yargılama mevzuatının rapor/teslim yükümlülüklerinin yerine geçmez.

Bilirkişi raporunun içeriğine ilişkin zorunlu unsurlar ile üst yazının tasarımı birbirine karıştırılmamalıdır. Üst yazı raporun yerine geçmez. Fiziksel materyal teslimi, iadesi veya dizi pusulası gerektiren hâllerde genel ek listesi bu özel teslim belgesinin yerine kullanılamaz.

---

# 1. Belge mimarisi ve terimler

## 1.1 Üç ayrı katman

1. **Üst yazı:** Mahkemeye hitaben düzenlenen kısa sunuş belgesi. Kendi başına ayrı bir UDF/DOCX dosyasıdır.
2. **Belge ekleri:** Üst yazıya eklenen ve ayrı dosya olarak üretilen belgeler. Numara dizisi `EK-1`, `EK-2`, `EK-3` biçimindedir.
3. **Rapor içi ekler:** Bilirkişi raporunun kendi bünyesinde kalan içeriğidir. Üst yazının belge eki numaralarıyla karışmaması için rapor içindeki adlandırma `Rapor eki 1`, `Rapor eki 2` biçiminde olmalıdır.

**Değişmez kural:** Aynı içerik, aynı belge setinde hem rapor gövdesinde hem de ayrı bir belge ekinde mükerrer yer alamaz. Bir bölüm ayrı belge ekine taşındıysa raporda gösterilmez. Rapor içi ek ayrı belgeye taşındıysa rapordaki kopyası kapatılır.

## 1.2 Ek numarası

- `EK-1` her zaman bilirkişi raporudur.
- `EK-1` silinemez ve başka bir ekle değiştirilemez.
- Diğer ekler sıralı olarak `EK-2`, `EK-3`… şeklinde numaralanır.
- Silinen veya kaldırılan ek sonrasında numaralar yeniden türetilir; boşluk ve tekrar olmaz.
- Numarayı kullanıcı serbest metin olarak yazmaz; tek kaynak `case.letterAnnexes` dizisidir.
- Üst yazının ek listesi, belge ekleri paneli ve ZIP manifesti aynı diziden üretilir.
- Rapor içi eklerin üst yazı ekleriyle aynı `EK-N` adını kullanması yasaktır. Mevcut v2.325'teki `Rapor eki N` ayrımı korunmalıdır.

## 1.3 Desteklenen ek türleri

Mevcut şema şu türleri destekliyor: `report`, `sections`, `reportAnnex`, `custom`.

| Tür | İşlev | Zorunlu alanlar |
|---|---|---|
| `report` | Ana bilirkişi raporu; daima EK-1 | Tek kayıt, sabit ilk sıra |
| `sections` | Seçilen rapor bölümlerinden ayrı teknik belge | En az bir geçerli bölüm anahtarı, görünen ek adı |
| `reportAnnex` | Rapor içi ekin ayrı belgeye taşınmış hâli | Geçerli rapor eki anahtarı |
| `custom` | Kullanıcının oluşturduğu metin belgesi | Başlık ve boş olmayan içerik |
| `file` | Haricî PDF/görsel/dosya ekleme | **Mevcut kodda desteklenmiyor.** Ayrı geliştirme kararı ve dosya baytlarının saklanması/hash'lenmesi gerekir. Sadece eski plan dokümanında geçiyor diye destekleniyor varsayılmamalı. |

Bir `file` türü geliştirilirse orijinal dosya baytları değiştirilmeden korunmalı, dosya adı/uzantısı/boyutu/MIME bilgisi kaydedilmeli ve SHA-256 orijinal baytlar üzerinden hesaplanmalıdır. Haricî dosyanın UDF içine gömüldüğü iddia edilmemeli; UYAP Editörüyle gerçek uyumluluk ayrıca doğrulanmalıdır.

---

# 2. Üst yazının kesin görsel standardı

## 2.1 Sayfa ve yazı karakteri

| Özellik | AKİS varsayılanı | Sınıf |
|---|---|---|
| Kâğıt | A4, 210 × 297 mm | [MEVZUAT REFERANSI] |
| Yön | Dikey (portrait) | [AKİS STANDARDI] |
| Yazı tipi | Times New Roman | [AKİS STANDARDI] |
| Gövde puntosu | 12 pt | [MEVZUAT REFERANSI / AKİS STANDARDI] |
| Alternatif yazı tipi | Arial 11 pt; yalnız açıkça seçilen alternatif profil olarak | [MEVZUAT REFERANSI] |
| Yazı rengi | Siyah (#000000) | [AKİS STANDARDI] |
| Normal yazı stili | Normal; italik ve altı çizili yalnız gerçekten gerekliyse | [MEVZUAT REFERANSI] |
| Üst, alt, sol, sağ kenar boşluğu | 15 mm | Üst/sol/sağ: [MEVZUAT REFERANSI]; alt: [AKİS STANDARDI] |
| Satır aralığı | 1,15 | [AKİS STANDARDI] |
| Paragraf öncesi/sonrası | 0 pt | [AKİS STANDARDI] |
| İlk satır girintisi | 1,25 cm | [MEVZUAT REFERANSI] biçim referansı |
| Gövde hizası | İki yana yaslı | [MEVZUAT REFERANSI] biçim referansı |
| Üst yazı hedef uzunluğu | 1 sayfa | [AKİS STANDARDI], mutlak hukuki zorunluluk değil |

**Önemli uygulama ayrımı:** Mevcut rapor biçimi `case.report.format` varsayılan olarak 11 pt Times New Roman kullanıyor. Üst yazı standardı 12 pt olacaksa yalnızca rapor biçimi sabitini değiştirerek çözülmemelidir. `case.letter.format` gibi üst yazıya ait ayrı, sabit bir biçim kaynağı oluşturulmalı; raporun kullanıcı tarafından değiştirilebilen biçimi üst yazıyı etkilememelidir.

## 2.2 Kurumsal antet ve başlık

**Varsayılan üst yazıda bulunmayacaklar:**

- En üstte bağımsız bir `T.C.` satırı.
- Adalet Bakanlığı, mahkeme veya başka bir kamu kurumunun logosu.
- Bilirkişiyi kamu kurumu gibi gösteren kurum/birim anteti.
- Büyük puntolu, dekoratif `ÜST YAZI` başlığı.
- Uygulama adı, sürümü, web sitesi veya GitHub adresi.

**Muhatap başlığı:** Sayfanın üst bölümünde ortalanmış, kalın, 12 pt, siyah ve tamamı büyük harf olmalıdır. Örnek:

`ANTALYA 4. ASLİYE HUKUK MAHKEMESİNE`

Kurum/mahkeme adına gelen yönelme eki bitişik yazılır; kesme işareti kullanılmaz. Örnek doğru yazımlar:

- `ANTALYA 4. ASLİYE HUKUK MAHKEMESİNE`
- `ANTALYA 2. AĞIR CEZA MAHKEMESİNE`
- `ANTALYA CUMHURİYET BAŞSAVCILIĞINA`
- `ANTALYA ... İCRA MÜDÜRLÜĞÜNE`

Mahkeme adı, dosya kaydındaki gerçek merci metninden alınmalıdır. Otomatik ek üretimi Türkçe ses uyumunu ve özel merci adlarını kapsayan testlerle doğrulanmalı; güvenilir biçimde üretilemeyen durumda elle düzeltilebilir muhatap alanı kullanılmalıdır. `MAHKEMESİ’NE` ve `BAŞSAVCILIĞI’NA` biçimleri üretilmemelidir.

## 2.3 Alan etiketleri ve büyük/küçük harf

| Alan | Yazım biçimi | Değer biçimi | Hizalama |
|---|---|---|---|
| Muhatap | TAMAMI BÜYÜK HARF | Kurum/mahkeme adı + bitişik yönelme eki | Ortalı, kalın |
| `Dosya No:` | Yalnız ilk harfler büyük | Örn. `2026/214 Esas` | Sol |
| `Konu:` | Yalnız ilk harfler büyük | `Bilirkişi Raporunun Sunulması` | Sol |
| `İlgi:` | Yalnız ilk harf büyük | Gerçek karar/yazı tarihi ve sayısı; yoksa satır hiç üretilmez | Sol |
| Gövde | Cümle düzeni | Normal Türkçe yazım; tamamı büyük harf yasak | İki yana yaslı |
| Kapanış | Cümle düzeni | `Bilgilerinize arz ederim.` | Sol |
| Tarih/yer | Normal özel ad yazımı | `Antalya, 26.11.2026` | Sağ |
| İmzalayan adı | Ad ilk harf büyük; soyadı TAMAMI BÜYÜK | `Ayşe YILMAZ` | Sağ blok |
| Unvan | Kelimelerin ilk harfleri büyük | `Bilirkişi` | Sağ blok |
| Ek etiketi | `Ek:` | Tek veya çok ek | Sol |
| Ek numarası | `EK-1`, `EK-2` | Numaradan sonra kısa çizgi ve açıklama | Sol |
| Ek adı | Baş harfleri büyük, geri kalanı normal | `Bilirkişi Raporu`, `Teknik Bilgiler` | Sol |

Alan etiketleri, iki nokta üst üste işaretleri ve devam satırı girintileri bütün çıktılarda aynı olmalıdır. Noktalama işareti kendinden önceki kelimeye bitişik, ardından bir boşlukla yazılır.

## 2.4 Alan sırası ve aralıklar

Üst yazı aşağıdaki sırayı izlemelidir:

1. **Muhatap başlığı** — sayfa üstünde ortalı.
2. **Dosya No:** — sol başlangıç.
3. **Konu:** — Dosya No satırının altında.
4. **İlgi:** — varsa, konu satırının altında. Gerçek dayanak yoksa hiç gösterilmez.
5. **Gövde** — konu/ilgi bloğundan sonra uygun dikey boşluk.
6. **Kapanış** — gövde bitiminde.
7. **Yer ve tarih** — sağa hizalı.
8. **İmza sahibi** — sağa hizalı; ad-soyad, unvan, istenmişse sicil numarası.
9. **Ek listesi** — imza bloğundan sonra, sol hizalı.

Üst yazı bağımsız bilirkişinin kendi adına sunduğu bir belge olduğu için `Sayı:` başlığı kullanılmaz. Mahkemenin esas/soruşturma numarası `Dosya No:` olarak gösterilir. Proje içi veya teknik takip numarası bulunuyorsa EBYS resmî sayı numarası gibi sunulamaz.

## 2.5 Gövde ve paragraf standardı

- Gövde bir veya iki kısa paragraftan oluşmalıdır.
- İlk satır girintisi 1,25 cm; metin iki yana yaslıdır.
- Paragraflar arasında boş satır veya büyük dekoratif boşluk kullanılmaz. Satır/paragraf aralıkları stil tanımından yönetilir.
- Üst yazı yalnızca hangi dosya için hangi rapor ve eklerin sunulduğunu bildirir.
- Ses kaydının çözümlemesi, teknik yöntem, bulgular, bilimsel gerekçe ve kanaat üst yazıda tekrarlanmaz; bunlar bilirkişi raporunda bulunur.
- Tarih, görevlendirme süresi, karar numarası, ek adı, sayfa sayısı ve benzeri bilgiler yalnız gerçek kaynakta bulunuyorsa yazılır. Uydurma veya varsayılan örnek veri gerçek belgeye basılamaz.

**Önerilen varsayılan metin (alanlardan üretilir):**

> Mahkemenizin dosyasında tarafıma tevdi edilen bilirkişilik görevi kapsamında hazırlanan bilirkişi raporu EK-1 olarak sunulmaktadır.
>
> İncelemeye ilişkin teknik destek belgeleri EK-2 ve devamındaki eklerde sunulmuştur.

İkinci paragraf yalnız EK-1 dışında başka ekler varsa üretilmelidir. Kullanıcı gövdeyi değiştirmişse varsayılan metinle birleştirilmemeli; tek bir etkin metin kaynağı olmalıdır.

## 2.6 Konu ve ilgi alanları

Varsayılan konu:

`Konu: Bilirkişi Raporunun Sunulması`

Konu kısa olmalı ve sonunda nokta/virgül bulunmamalıdır. Ek rapor, süre talebi veya açıklama gibi farklı işlem türleri için ayrı metin şablonları tanımlanmalıdır; yalnızca konu başlığını değiştirip aynı gövdeyi kullanmak yeterli değildir.

`İlgi:` alanı mevcut `case.letter` modelinde ayrı alan olarak bulunmuyor; eklenmelidir. Önerilen alan adı `referenceText` veya `reference`. Yalnız gerçek görevlendirme ara kararı/yazısı biliniyorsa kullanılmalıdır. Tarih, sayı ve belgeyi gönderen merci mevcutsa açıkça yazılır; yoksa satır gösterilmez.

## 2.7 Kapanış, tarih ve imza bloğu

Kapanış varsayılanı:

`Bilgilerinize arz ederim.`

Yer ve tarih imza bloğunun üstünde veya aynı sağ blok içinde gösterilir:

`Antalya, 26.11.2026`

Tarih, raporun düzenlenme tarihiyle otomatik olarak aynı kabul edilmemelidir. Üst yazının kendi düzenleme tarihi ayrı saklanmalı ve kullanıcıya gösterilmelidir. İlk oluşturulma anında tarih atanacaksa bu değer kayda yazılmalı; belge her açıldığında sessizce bugünün tarihiyle değişmemelidir.

İmza bloğu sağa hizalı olmalıdır:

```text
                                      Ayşe YILMAZ
                                      Bilirkişi
                                      Bilirkişilik Sicil No: 12345
```

- Ad, soyad ve unvan gerçek profil/dosya bilgilerinden alınır.
- Soyadı büyük harf, ad normal baş harf düzeninde gösterilir.
- Sicil numarası, kullanıcı seçimine veya merciin istediği biçime göre gösterilir; boşsa satır üretilmez.
- Elektronik imzalı belge görünümünde imza çizgisi ve “e-imzalıdır” gibi sahte imza izlenimi veren ibareler üretilmez. Gerçek e-imza işlemi AKİS dışındaki yetkili UYAP/Doküman Editörü akışında yapılır.
- Islak imza için fiziksel çıktı alınacaksa ayrı bir fiziksel imza görünümü seçilebilir. E-imza görünümü ile ıslak imza görünümü aynı şablon olmamalıdır.

## 2.8 Ek listesi

Ek listesi imza bloğundan sonra ve sol hizalı basılır. Proje varsayılanı `Ek:` etiketidir.

Tek ek örneği:

`Ek: EK-1 – Bilirkişi Raporu`

Birden fazla ek örneği:

```text
Ek:
  EK-1 – Bilirkişi Raporu
  EK-2 – Teknik Bilgiler
  EK-3 – Dosya Teknik Envanteri
```

- `EK-N` kodu, görünür listede açıklamadan önce yazılır.
- Her ayrı ek belgesinin ilk sayfasının sağ üst bölümünde aynı ek numarası bulunmalıdır (ör. `EK-2`). Bu işaret, üst yazı listesiyle tam eşleşmelidir.
- Sayfa/adet bilgisi yalnız kesin olarak doğrulanabiliyorsa parantez içinde gösterilir. Ekrandaki yaklaşık sayfa tahmini (`≈ N`) resmî belge metnine yazılmaz.
- Ek listesi üst yazının yazı alanına sığmazsa yazı puntosu küçültülmez, kenar boşluğu daraltılmaz ve metin kırpılmaz. Ayrı `EK LİSTESİ` sayfası/ek belgesi oluşturulur ve üst yazıda `Ek: Ek Listesi` olarak gösterilir.
- Ek listesi boş olamaz; EK-1 rapor eki her zaman bulunmalıdır.
- Fiziksel delil/materyal teslimi söz konusuysa özel teslim/dizi pusulası ayrıca hazırlanır; genel `Ek:` listesi onun yerine kullanılamaz.

## 2.9 Sayfa numarası ve alt bilgi

- Tek sayfalık üst yazıda sayfa numarası basılmaz.
- Üst yazı birden fazla sayfaya çıkarsa sayfa numarası düzeni açıkça tanımlanır ve bütün sayfalarda tutarlı uygulanır.
- Alt bilgiye AKİS adı, uygulama sürümü, GitHub URL'si, dosya yolu veya teknik debug metni yazılmaz.
- UYAP/Word sayfa kırılması kesinleşmeden üst yazıya veya ek listesine tahminî sayfa sayısı eklenmez.

---

# 3. Üst yazının örnek nihai görünümü

Aşağıdaki örnek yalnız yerleşim göstermek içindir; isim, tarih, dosya ve ek bilgileri örnek veridir.

```text

                 ANTALYA 4. ASLİYE HUKUK MAHKEMESİNE

Dosya No: 2026/214 Esas
Konu: Bilirkişi Raporunun Sunulması
İlgi: Mahkemenizin 12.09.2026 tarihli görevlendirme ara kararı.

     Mahkemenizin dosyasında tarafıma tevdi edilen bilirkişilik görevi
     kapsamında hazırlanan bilirkişi raporu EK-1 olarak sunulmaktadır.

     İncelemeye ilişkin teknik destek belgeleri EK-2 ve devamındaki
     eklerde sunulmuştur.

Bilgilerinize arz ederim.

                                            Antalya, 26.11.2026

                                            Ayşe YILMAZ
                                            Bilirkişi
                                            Bilirkişilik Sicil No: 12345

Ek:
  EK-1 – Bilirkişi Raporu
  EK-2 – Teknik Bilgiler
```

Örnek, bağımsız bilirkişi adına yazılmıştır. Üstte `T.C.` anteti, kurum logosu, `Sayı:` veya tekrar eden `Sayın Hâkimliğine` satırı yoktur.

---

# 4. Dosya adlandırma standardı

## 4.1 Genel kurallar

- Dosya adları deterministik, okunabilir ve dosya numarasıyla ilişkilendirilebilir olmalıdır.
- Görünen belge başlıkları Türkçe karakterleri korur; dosya adlarında taşınabilirlik için ASCII sadeleştirmesi tercih edilir.
- Dosya adı güvenli slug fonksiyonundan geçmelidir: `/`, `\\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`, kontrol karakterleri ve yol geçişleri çıkarılır; art arda ayraçlar sadeleştirilir; baştaki/sondaki nokta ve boşluklar silinir.
- Dosya adı çakışması sessiz üzerine yazmaya yol açmamalıdır. Gerekirse deterministik `_02`, `_03` soneki kullanılır.
- Belge eki dosya adında sıralama için `EK-01`, `EK-02` biçimi kullanılır. Belge içindeki resmî görünen numara `EK-1`, `EK-2` olarak kalır.
- Dosya adı uzantıları küçük harf olmalıdır: `.udf`, `.docx`, `.zip`, `.json`, `.txt`.

## 4.2 Önerilen dosya adları

`<dosya-kisa-no>` örneği: `2026-214-Esas`

| Belge | Örnek dosya adı |
|---|---|
| Üst yazı UDF | `UstYazi_2026-214-Esas_2026-11-26.udf` |
| Üst yazı DOCX | `UstYazi_2026-214-Esas_2026-11-26.docx` |
| EK-1 rapor UDF | `EK-01_Bilirkisi_Raporu_2026-214-Esas.udf` |
| EK-1 rapor DOCX | `EK-01_Bilirkisi_Raporu_2026-214-Esas.docx` |
| EK-2 teknik bilgiler UDF | `EK-02_Teknik_Bilgiler_2026-214-Esas.udf` |
| EK-2 teknik bilgiler DOCX | `EK-02_Teknik_Bilgiler_2026-214-Esas.docx` |
| EK-3 özel ek UDF | `EK-03_<KisaBaslik>_2026-214-Esas.udf` |
| EK-3 özel ek DOCX | `EK-03_<KisaBaslik>_2026-214-Esas.docx` |
| Arşiv ZIP | `UstYazi_Belgeler_2026-214-Esas_2026-11-26.zip` |
| Manifest | `belgeler.json` |
| Kontrol toplamları | `SHA256SUMS.txt` |

Üst yazı tarihi ve diğer ek dosyalarının tarih içermesi proje standardı kararıdır. Tarih dosya içeriğinde de aynı olmalıdır. Tarih dosya adında `YYYY-MM-DD` biçiminde yazılmalıdır.

---

# 5. UDF üretim standardı

## 5.1 Paket yapısı

Mevcut AKİS üreticisi `templates/BOS.udf` dosyasını JSZip ile açıyor; şablondan `content.xml`, sayfa özellikleri, stiller, `format_id` ve `resolver` değerlerini alıp yeniden UDF paketi oluşturuyor. Bu mevcut uygulama yaklaşımı korunmalıdır.

**Dikkat:** UYAP UDF'in bütün iç teknik yapısı için kamuya açık ve eksiksiz bir şema bulunduğu varsayılmamalıdır. `BOS.udf` proje tarafından doğrulanmış başlangıç şablonudur; UYAP'ın resmî format dokümantasyonunun yerine geçmez. UDF'in gerçek UYAP Doküman Editörü sürümünde açılması ve kontrol edilmesi zorunlu manuel kabul adımıdır.

## 5.2 UDF içerik kuralları

- UDF `.udf` uzantılı ve UYAP Doküman Editörü tarafından açılabilir olmalıdır.
- Var olan `templates/BOS.udf` şablonunun sayfa özellikleri ve stil tanımları bozulmamalıdır.
- Sayfa A4/dikey; kenar boşlukları 15 mm; üst yazı gövdesi Times New Roman 12 pt olmalıdır.
- UDF `pageFormat` marjları punto cinsindeyse mm→point dönüşümü yapılmalıdır. 15 mm yaklaşık 42,52 pt'tir. Birim karıştırılmamalıdır.
- Metin UTF-8 ve XML açısından geçerli olmalıdır. `&`, `<`, `>` ve CDATA kapanışı `]]>` güvenli kaçış/işleme tabi tutulmalıdır.
- Her paragrafın punto, yazı ailesi, kalınlık, hizalama, girinti, önce/sonra aralığı, satır aralığı değerleri tek bir biçim modelinden gelmelidir.
- Çıktı üretilmeden önce XML parser kontrolü yapılmalıdır.
- XML parser kontrolü tek başına yeterli değildir: gerçek UYAP Doküman Editörü açılış testi zorunludur.
- UDF üst yazısında başlık, alan sırası, metin ve ek listesi DOCX/HTML ile aynı olmalıdır.

## 5.3 Tek dosya / çok dosya kararı

Varsayılan teslim kümesi ayrı UDF dosyalarından oluşur:

1. Üst yazı UDF.
2. EK-1 rapor UDF.
3. EK-2 ve devamındaki her belge eki için ayrı UDF.

Bunlar ZIP içinde arşivlenebilir; ZIP dosyası UYAP'a tek UDF belgesi gibi gönderilemez. UYAP'a gerçek sunumda ilgili evrak türü ve Portalın o an sunduğu yükleme seçenekleri kullanılmalıdır. Tek bir UDF içine çok sayıda belgeyi birleştirme, varsayılan olmamalıdır.

---

# 6. DOCX üretim standardı

- `.docx`, gerçek Office Open XML paketidir; yalnızca HTML metninin `.docx` olarak adlandırılması kabul edilmez.
- Mevcut paket bileşenleri (`[Content_Types].xml`, `_rels`, `word/document.xml`, `word/styles.xml` ve ilişkili parçalar) geçerli olmalıdır.
- Üst yazı DOCX'i Times New Roman 12 pt, A4/dikey, 15 mm kenar boşluğu ve bu şartnamedeki paragraf/başlık düzenini kullanmalıdır.
- DOCX'teki her paragrafın anlamı ve sırası `letterModel` ile aynı olmalıdır.
- DOCX'in imza bloğu, ek listesi ve ek numaraları UDF ile aynı metni taşımalıdır.
- DOCX açılırken Word onarım uyarısı vermemelidir.
- Sayfa sayısı ve sayfa kırılması Word sürümüne göre değişebileceği için kesin sayfa sayısı ancak nihai çıktı gerçekten açılıp doğrulandıktan sonra kaydedilebilir.

**Tek kaynak ilkesi:** `letterModel(c)` belge metninin tek kaynağı olarak kalmalıdır. HTML, UDF ve DOCX ayrı render fonksiyonları kullanabilir; ancak farklı metin, farklı ek sırası veya farklı alan değeri üretemez. Biçim değerleri de dağınık sabitler yerine `letter.format` veya tek bir `LETTER_FORMAT` tanımından gelmelidir.

---

# 7. SHA-256, manifest ve ZIP standardı

## 7.1 Her dosyanın hash'i

- SHA-256, her UDF ve DOCX dosyasının son baytları üzerinden ayrı ayrı hesaplanmalıdır.
- Aynı belgenin UDF ve DOCX sürümleri aynı metni taşısa da dosya baytları farklı olacağı için ayrı SHA-256 değerleri alır.
- Hash küçük harfli 64 onaltılık karakter olmalıdır: `^[0-9a-f]{64}$`.
- Hash üretilemezse boş metin (`""`) yazıp devam etmek yasaktır. ZIP üretimi durmalı ve kullanıcıya açık hata gösterilmelidir.
- Hash, dosyanın hesaplama anındaki bayt bütünlüğünü karşılaştırmaya yarar. Tek başına belgeyi kimin oluşturduğunu kanıtlamaz, e-imza değildir, zaman damgası değildir ve UYAP tarafından kabul edildiğini kanıtlamaz.
- SHA-256 değeri üst yazı metninin içine yazılmamalıdır; manifest/kontrol listesinde tutulmalıdır.

## 7.2 `belgeler.json` manifesti

Önerilen şema:

```json
{
  "schema": "akis.documents.v2",
  "hashAlgorithm": "SHA-256",
  "createdAtUtc": "2026-11-26T03:00:00.000Z",
  "appVersion": "2.325",
  "case": {
    "court": "ANTALYA 4. ASLİYE HUKUK MAHKEMESİ",
    "fileNo": "2026/214 Esas"
  },
  "documents": [
    {
      "sequence": 0,
      "annexNo": null,
      "kind": "letter",
      "format": "udf",
      "label": "Üst yazı",
      "file": "UstYazi_2026-214-Esas_2026-11-26.udf",
      "bytes": 1167,
      "sha256": "<64 karakter SHA-256>"
    },
    {
      "sequence": 1,
      "annexNo": "EK-1",
      "kind": "report",
      "format": "udf",
      "label": "Bilirkişi Raporu",
      "file": "EK-01_Bilirkisi_Raporu_2026-214-Esas.udf",
      "bytes": 9814,
      "sha256": "<64 karakter SHA-256>"
    }
  ]
}
```

Örnek boyut ve hash değerleri temsili yer tutucudur; gerçek paket verisiyle doldurulmalıdır. Her UDF/DOCX dosyası için ayrı manifest kaydı olmalıdır. `format`, `bytes`, `file`, `kind`, `label`, `annexNo` ve `sha256` alanları boş bırakılmamalıdır. Üst yazıda `annexNo:null` kullanılır; rapor ve diğer eklerde numara bulunur.

## 7.3 `SHA256SUMS.txt`

ZIP içinde, manifestte listelenen her dosya için bir satır üretilebilir:

```text
<64-karakter-hash>  UstYazi_2026-214-Esas_2026-11-26.udf
<64-karakter-hash>  EK-01_Bilirkisi_Raporu_2026-214-Esas.udf
<64-karakter-hash>  UstYazi_2026-214-Esas_2026-11-26.docx
```

`SHA256SUMS.txt` kendi hash'ini kendi içinde taşımaz. İstenirse onun hash'i ayrı bir yerde saklanır. ZIP dosyasının kendisinin SHA-256 değeri aynı ZIP'in içine konulamaz; sıkıştırılmış ZIP üretildikten sonra dışarıda `.sha256` yan dosyası veya arşiv kayıt sisteminde ayrı alan olarak tutulmalıdır.

## 7.4 ZIP kapsamı

Önerilen iki çıktı profili:

- **UYAP belge seti:** Üst yazı + rapor + belge eklerinin ayrı UDF dosyaları. Kullanıcı bu UDF'leri Portalda uygun evrak alanlarına kendi yükler.
- **Arşiv seti:** Aynı belgelerin UDF ve DOCX sürümleri + `belgeler.json` + `SHA256SUMS.txt`. ZIP yalnızca bir arşiv/taşıma paketidir; UYAP'a tek belge gibi gönderildiği iddia edilmez.

**v2.331'de uygulandı:** ZIP artık **arşiv seti**ni üretir — her belge hem UDF
hem DOCX olarak, her biri **ayrı manifest satırı ve ayrı SHA-256** ile; ayrıca
`SHA256SUMS.txt`. (v2.325–v2.330 arasında paket yalnız UDF içeriyordu.)

**Fail-closed:** `blobSha256Hex()` başarısız olduğunda boş hash döndürmek yerine hata yükseltmeli; eksik/bozuk hash ile ZIP indirilememelidir.

---

# 8. Veri modeli ve kod hedefleri

## 8.1 `case.letter` için önerilen ek alanlar

Mevcut `emptyLetter()` alanları korunmalı ve aşağıdaki alanlar eklenmelidir:

| Alan | Amaç |
|---|---|
| `referenceText` | İlgi satırı; boşsa hiç basılmaz |
| `format` | Üst yazıya özgü sabit font, punto, yön, marj ve paragraf değerleri |
| `signatureMode` | `electronic` / `physical`; elektronik modda imza çizgisi basılmaz |
| `date` | Üst yazının kendi tarihi; rapor tarihiyle sessizce eşitlenmez |
| `addresseeOverride` | Otomatik Türkçe ek üretimi güvenilir değilse elle doğrulanmış muhatap satırı |

Mevcut `showRegistry` korunabilir; sicil alanı boşsa satır üretilmez. `showPageCounts` ekran tahminini gösterme tercihi olarak kalabilir ancak yaklaşık değerler belge metnine yazılamaz.

## 8.2 Değiştirilecek kod noktaları

| Dosya / fonksiyon | Geliştirici işi |
|---|---|
| `assets/schema.js` → `emptyLetter`, `normalizeLetter` | İlgi, bağımsız biçim, imza kipi ve tarih alanlarını ekle; eski kayıtları güvenli göç ettir |
| `assets/schema.js` → `LETTER_ANNEX_KINDS`, `normalizeLetterAnnexes` | Yalnız gerçekten desteklenen ek türlerini belgele; haricî dosya eki isteniyorsa `file` türünü tam uygula, yoksa eski taslaklardan kaldır |
| `assets/app.js` → `LETTER_TEXT` | Varsayılan metin ve etiketleri tek yerde tut |
| `assets/app.js` → `letterModel` | Mahkeme adı, dosya no, ilgi, tarih, imza ve ek sırasını tek modele dönüştür |
| `assets/app.js` → `letterPaperHtml` | Tüm görsel yazım standardını uygula; `T.C.`, `Sayı`, tekrar eden hitap ve sahte imza çizgisini kaldır |
| `assets/app.js` → `docxLetterXml` | 12 pt TNR ve tek tip paragraf/başlık/ek stili kullan |
| `assets/app.js` → `udfDocument` | Aynı biçim tokenlarını kullan; UDF şablon özelliklerini koru |
| `assets/app.js` → `annexFileName`, `documentsZipName`, `safeName` | Bu şartnamedeki dosya adlarını ve güvenli slug kurallarını uygula |
| `assets/app.js` → `blobSha256Hex`, `buildDocumentsZip` | Hash hatasında dur; her format için ayrı kayıt oluştur; manifest + checksum üret |
| `index.html` | İlgi/tarih/imza modu alanlarını doğru etiketle; sayfa/ek yönetiminde terminolojiyi tutarlı yap |
| `assets/app.css` | A4 üst yazı ölçüleri, tipografi, girinti, boşluk, ek işaretleri ve baskı stili |
| `docs/UST_YAZI_PLANI.md` | Eski “kod yazılmadı” notunu ve eski kapsamı güncelle |
| `docs/UST_YAZI_STANDARDI.md` | Bu şartnameyi kalıcı depo belgesi olarak ekle |
| `CHANGELOG.md`, `README.md`, `docs/KAYNAK.md` | Gerçek sürüm, mevzuat atıfı ve çıktı kapsamını güncelle |

## 8.3 Tek kaynak biçim ilkesi

Şu değerler HTML/CSS, DOCX ve UDF içine ayrı ayrı sabit kodlanmamalıdır:

- `fontFamily = Times New Roman`
- `fontSizePt = 12`
- `page = A4 portrait`
- `marginsMm = { top: 15, right: 15, bottom: 15, left: 15 }`
- `lineSpacing = 1.15`
- `firstLineIndentMm = 12.5`
- paragraf öncesi/sonrası
- renk ve kalınlık

Bunlar `LETTER_FORMAT` veya `case.letter.format` üzerinden okunmalı; UDF/DOCX dönüştürücüleri yalnız hedef biçime çevirmelidir. Raporun biçim tercihi üst yazıyı değiştirmemelidir.

---

# 9. Kabul testleri — geliştirici tamamlandı demeden önce

Aşağıdaki testlerin tamamı geçmeden üst yazı standardı tamamlanmış sayılmaz.

## 9.1 Metin ve Türkçe yazım

- [ ] Mahkeme satırı tamamı büyük harf ve ortalıdır.
- [ ] `MAHKEMESİNE`, `BAŞSAVCILIĞINA`, `MÜDÜRLÜĞÜNE` örnekleri doğru üretilir.
- [ ] Kurum/mahkeme adına gelen ekte kesme işareti yoktur.
- [ ] Üst yazıda `T.C.` anteti ve kamu kurumu logosu varsayılan olarak yoktur.
- [ ] `Sayı:` kullanılmaz; `Dosya No:` yazılır.
- [ ] `Dosya No:` alanı gerçek `case.fileNo` kaynağından gelir.
- [ ] `Konu:` değeri kısa, baş harfleri büyük ve sonunda noktalama olmadan yazılır.
- [ ] `İlgi:` yalnız gerçek veri varsa görünür; boş alanda satır ve boşluk oluşturmaz.
- [ ] `Sayın Hâkimliğine` gibi muhatap başlığını tekrarlayan hitap bulunmaz.
- [ ] Gövde cümle düzeninde; TAMAMI BÜYÜK HARF değildir.
- [ ] Gövde metni yalnız gerçek dosya verilerinden oluşur; tarih/süre/karar numarası uydurulmaz.
- [ ] Varsayılan kapanış `Bilgilerinize arz ederim.` şeklindedir.
- [ ] Ad-soyad biçimi `Ad SOYAD`, unvan `Bilirkişi` biçimindedir.

## 9.2 Görsel düzen

- [ ] A4 dikey sayfa.
- [ ] Times New Roman 12 pt; Arial profili seçilirse 11 pt.
- [ ] Dört kenar boşluğu 15 mm.
- [ ] Gövde 1,25 cm ilk satır girintili ve iki yana yaslıdır.
- [ ] Satır aralığı 1,15 ve paragraf aralıkları ortak biçim kaynağından gelir.
- [ ] Alan etiketleri aynı sol çizgiden başlar; `:` işaretleri tutarlı yerleşir.
- [ ] Tarih ve imza bloğu sağ hizalıdır.
- [ ] Ek listesi sol hizalı ve imza bloğundan sonradır.
- [ ] Tek sayfalık üst yazıda sayfa numarası yoktur.
- [ ] Uzun ek listesi küçültülerek veya kesilerek sığdırılmaz; ayrı ek listesine çıkarılır.
- [ ] Uygulama adı/sürümü, web adresi, debug notu ve boş alanlarda `—` görünmez.

## 9.3 Ek bütünlüğü

- [ ] EK-1 daima bilirkişi raporudur ve kaldırılamaz.
- [ ] EK-2…EK-N numaraları sıralı, benzersiz ve boşluksuzdur.
- [ ] Üst yazıdaki ek adı, paneldeki ek adı, dosya adı ve manifest etiketi birbirini karşılar.
- [ ] Her ek dosyasının ilk sayfasında sağ üstte aynı `EK-N` işareti vardır.
- [ ] Aynı içerik rapor ve belge eki içinde çift basılmaz.
- [ ] Rapor içi ekler `Rapor eki N` olarak adlandırılır; üst yazı EK numarasıyla karışmaz.
- [ ] Sayfa sayıları yaklaşık tahminden resmî belgeye kopyalanmaz.
- [ ] Fiziksel materyal teslimi/dizi pusulası gerektiğinde uygulama genel ek listesini onun yerine göstermez.
- [ ] `file` türü desteklenmiyorsa kullanıcıya haricî dosya eki eklenebildiği izlenimi verilmez.

## 9.4 UDF

- [ ] UDF ZIP/paket açılabilir ve `content.xml` XML parser kontrolünden geçer.
- [ ] `templates/BOS.udf` içindeki gerekli sayfa/stil/resolver özellikleri korunur.
- [ ] UDF A4/dikey, 15 mm marj, TNR 12 pt olarak görünür.
- [ ] Türkçe karakterler (İ, ı, Ş, ş, Ğ, ğ, Ç, ç, Ö, ö, Ü, ü) bozulmaz.
- [ ] UDF gerçek UYAP Doküman Editöründe açılır; onarım/bozuk belge uyarısı vermez.
- [ ] UYAP Editöründe muhatap, dosya no, konu, gövde, imza ve ekler ekran önizlemesiyle karşılaştırılır.
- [ ] Sayfa sonu, boş sayfa, satır taşması veya kesilen ek başlığı yoktur.
- [ ] E-imza, AKİS tarafından üretilmiş gibi gösterilmez.

## 9.5 DOCX

- [ ] DOCX gerçek OOXML paketidir ve Word'de onarım uyarısı olmadan açılır.
- [ ] DOCX A4/dikey, 15 mm marj ve TNR 12 pt kullanır.
- [ ] Başlık, alan sırası, metin, imza ve ek listesi UDF ile aynı içeriktedir.
- [ ] DOCX'te ek numarası, üst yazıdaki numarayla aynıdır.
- [ ] Sayfa kırılmaları, üst yazının bir sayfa hedefini bozmaz; bozulursa ek listesi ayrı sayfaya taşınır.

## 9.6 SHA-256 / ZIP / manifest

- [ ] Her UDF dosyası için SHA-256 gerçek dosya baytlarından hesaplanır.
- [ ] Her DOCX dosyası için ayrı SHA-256 hesaplanır.
- [ ] Hash 64 karakter küçük harf hex formatındadır.
- [ ] Hash hesaplama hatasında ZIP indirmesi durur; boş hash kabul edilmez.
- [ ] Manifestte her dosya için doğru format, dosya adı, bayt boyutu ve hash yer alır.
- [ ] Manifestteki her dosya ZIP içinde vardır; ZIP'teki her belge manifestte kayıtlıdır.
- [ ] ZIP açılıp dosya hash'leri yeniden hesaplandığında manifestteki değerlerle eşleşir.
- [ ] `SHA256SUMS.txt` manifestteki gerçek dosya hash'leriyle eşleşir.
- [ ] ZIP kendi hash'ini kendi içine koymaz; gerekiyorsa hash yan dosya/haricî kayıttadır.
- [ ] UDF ve DOCX hash'leri ayrı kayıtlıdır; aynı dosya gibi kabul edilmez.
- [ ] ZIP, UYAP'a tek UDF belgesi olarak gönderilebilen bir dosya gibi tanımlanmaz.

## 9.7 Veri güvenliği ve geriye uyumluluk

- [ ] Eski `.akis` dosyalarında `letter` alanı yoksa veri kaybı olmadan varsayılan normalize edilir.
- [ ] Mevcut rapor/kanıt verileri üst yazı biçim güncellemesiyle değişmez.
- [ ] Yeni alanlar `.akis` dışa/içe aktarma ve birleştirme akışında korunur.
- [ ] Bilinmeyen ek alanları sessizce silinmez veya başka içerikle ezilmez.
- [ ] Üst yazı alanlarında XSS/HTML enjekte edilmesi engellenir; metin güvenli escape edilir.

---

# 10. Manuel test matrisi

Aşağıdaki örnek dosyalarla hem önizleme hem UDF hem DOCX hem ZIP çıktısı kontrol edilmelidir:

| Senaryo | Beklenen sonuç |
|---|---|
| Hukuk mahkemesi, yalnız EK-1 | Tek UDF üst yazı + tek UDF rapor; üst yazı ek listesinde yalnız EK-1 |
| Ağır ceza mahkemesi | Mahkeme adı doğru büyük harf ve doğru yönelme ekiyle yazılır |
| Cumhuriyet Başsavcılığı | Başsavcılık hitap biçimi doğru; mahkeme hitabı basılmaz |
| İcra müdürlüğü | Müdürlüğü adı doğru; apostrof yok |
| İlgi alanı boş | İlgi satırı ve aradaki boşluk görünmez |
| İlgi alanı dolu | Tarih/sayı yalnız girilen gerçek veriye göre basılır |
| Sicil numarası kapalı/boş | Sicil satırı yok |
| İmza modu elektronik | İmza çizgisi ve sahte e-imza ibaresi yok |
| İmza modu fiziksel | Islak imza için yeterli boşluk var; metin veya ekler çakışmıyor |
| EK-2 silinir | EK-3 varsa EK-2'ye dönüşür; boşluk ve kopya olmaz |
| Çok uzun ek adı | Belge ve dosya adı güvenli biçimde kısaltılır; görünen ad anlamsızlaşmaz |
| Çok uzun ek listesi | Ayrı EK LİSTESİ belgesi üretilir; punto küçültülmez |
| Çok sayfalı rapor | Üst yazıdaki sayfa tahminleri resmî metne otomatik yazılmaz |
| SHA API hatası | ZIP oluşturulmaz ve hata açıkça gösterilir |
| Türkçe karakterli dosya adı | Dosya ismi güvenli; belge içi başlık Türkçe karakterli kalır |
| Aynı isimli iki özel ek | Benzersiz ve sıralı dosya adları oluşur; üzerine yazılmaz |

---

# 11. Tamamlanma tanımı (Definition of Done)

Geliştirme ancak aşağıdakilerin tamamı sağlandığında bitmiş kabul edilir:

1. Bu şartname depo içine `docs/UST_YAZI_STANDARDI.md` adıyla eklenmiştir.
2. `docs/UST_YAZI_PLANI.md` eski “ÖNERİ / kod yazılmadı” durumundan çıkarılmış ve gerçekleşen kodla eşitlenmiştir.
3. HTML, UDF ve DOCX ortak metin modelinden, ortak tipografi tanımından üretilmektedir.
4. `T.C.`, `Sayı:`, apostroflu kurum eki ve tekrarlanan mahkeme hitabı varsayılan üst yazıdan kaldırılmıştır.
5. `Dosya No:`, gerçek `İlgi:` alanı ve bağımsız üst yazı tarihi doğru uygulanmıştır.
6. A4, TNR 12 pt, 15 mm marj, paragraf girintisi ve hizalama üç çıktıda eşittir.
7. İmza görünümü elektronik/fiziksel moda göre doğrudur.
8. Eklerin isimleri, sırası, ilk sayfa ek numarası, dosya adı ve manifest birbiriyle uyumludur.
9. ZIP içinde yer alan her dosyanın SHA-256 değeri doğrulanabilir; hash hatası üretimi engeller.
10. Otomatik testler ve manuel UYAP Editör/Word test matrisi tamamlanmış; sonuçları CHANGELOG veya test raporuna kaydedilmiştir.
11. README ve kullanıcı yardımında AKİS'in e-imza üretmediği ve UYAP'a kendiliğinden gönderim yapmadığı açıkça korunmuştur.

**Geliştirici kapanış raporu zorunlu alanları:** Değiştirilen dosyalar; uygulanan şartname maddeleri; geçen otomatik test sayısı; UYAP Editöründe açma sonucu ve sürümü; Word açma sonucu; örnek ZIP dosya listesi; her UDF/DOCX için SHA-256 doğrulama sonucu; bilinen sınırlılıklar.

---

# 12. Resmî kaynaklar ve depo dayanakları

## Mevzuat / resmî kaynaklar

1. **Resmî Yazışmalarda Uygulanacak Usul ve Esaslar Hakkında Yönetmelik**, 10.06.2020, Resmî Gazete, Sayı 31151. Özellikle m.1 (kapsam), m.6–8 (A4, yazı tipi, yazı alanı), m.10–15 (başlık, sayı, tarih, konu, muhatap, ilgi), m.16–18 (metin, imza, ek).  
   https://www.resmigazete.gov.tr/eskiler/2020/06/20200610-8.pdf
2. **Bilirkişilik Yönetmeliği**, özellikle bilirkişi raporunun içeriğini düzenleyen m.55.  
   https://bilirkisilik.adalet.gov.tr/Resimler/SayfaDokuman/5042023152221Bilirki%C5%9Filik%20Y%C3%B6netmeli%C4%9Fi.pdf
3. **Bilirkişilerin Uyacağı Rehber İlkeler ve Bilirkişi Raporlarında Bulunması Gereken Standartlar**, Adalet Bakanlığı Bilirkişilik Daire Başkanlığı.  
   https://bilirkisilik.adalet.gov.tr/Resimler/SayfaDokuman/18072025143049Bilirki%C5%9Filerin%20Uyaca%C4%9F%C4%B1%20Rehber%20%C4%B0lkeler%20ve%20Bilirki%C5%9Fi%20Raporlar%C4%B1nda%20Bulunmas%C4%B1%20Gereken%20Standartlar.pdf
4. **UYAP Doküman Editörü ve yardım sayfaları.**  
   https://uyap.gov.tr/Uyap-Editor  
   https://uyap.gov.tr/Uyap-Editor-Yardim

## AKİS depo dayanakları

- `README.md` — uygulama kapsamı, UDF/DOCX, e-imza ve gönderim sınırları.
- `CHANGELOG.md` — v2.323 üst yazı, v2.324 belge ekleri, v2.325 ZIP/manifest/SHA-256.
- `assets/schema.js` — `emptyLetter`, `normalizeLetter`, `LETTER_ANNEX_KINDS`, `normalizeLetterAnnexes`, `letterAnnexNumbering`.
- `assets/app.js` — `LETTER_TEXT`, `letterModel`, `letterPaperHtml`, `docxLetterXml`, `udfDocument`, `annexFileName`, `blobSha256Hex`, `buildDocumentsZip`.
- `index.html` — üst yazı alanları, belge ekleri paneli ve çıktı kontrolleri.
- `templates/BOS.udf` — UDF oluşturucusunun kullandığı boş UYAP şablonu.
- `docs/UST_YAZI_PLANI.md` — v2.323–v2.325 öncesi plan; gerçek uygulamaya göre güncellenmeli.

---

**Son ilke:** Üst yazı görünüşte sade, metinde tarafsız, eklerde eksiksiz, dosyalamada öngörülebilir, hash kontrolünde doğrulanabilir ve UYAP/Word ortamında gerçekten açılabilir olmalıdır. Hiçbir çıktı yalnızca ekranda güzel göründüğü için tamamlanmış sayılmaz.
