# Değişiklik Günlüğü

Bu dosya AKİS'in sürüm geçmişini özetler. Kayıtlar, uygulamanın geliştirme
sürecinde tutulan eski `VERSION.txt` dosyasından tekrarlar ayıklanarak
derlenmiştir. Önceki dosya tek bir sürüm başlığı altında yüzden fazla maddeyi
(yaklaşık 13'ü birebir tekrar) sıralıyordu; burada aynı bilgiler konuya göre
gruplanmıştır.

Sürüm numaralandırması iki parçalıdır: `v1` yayımlanmış sürüm, `v2` sıradaki
büyük çalışma. Yol haritası için [`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md).

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

## v2 — Sıradaki çalışma

Henüz başlanmadı. Kapsam ve öncelikler için
[`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md) dosyasına bakın.
