AKİS – ADLİ KONUŞMA İNCELEME SİSTEMİ
Windows 11 | Sürüm 2026.11.15

BAŞLATMA
1. ZIP dosyasını normal bir klasöre çıkarın. ZIP dosyasının içinden çalıştırmayın.
2. START.bat dosyasına çift tıklayın.
3. Microsoft Edge açılır. Açılmazsa açılan PowerShell penceresinde yazan 127.0.0.1 adresini Edge'e yazın.
4. Uygulama Python veya Node.js kurulumu gerektirmez. Yerel sunucu Windows PowerShell ile başlatılır.

İLK KULLANIM
1. Genel görünüm ekranında “Hazır test dosyalarını yükle” seçeneğine basın.
2. Dört kurgusal dosya ve on sentetik WAV kaydı çalışma alanına eklenir.
3. Ses Kayıtları bölümünde model olarak çok dilli küçük modeli seçin ve “Modeli yükle”ye basın.
4. İlk model indirmesi internet bağlantısı gerektirir. İndirme tamamlandıktan sonra kayıtlar tarayıcıda, yerel bilgisayarda çözümlenir.
5. Her ses kaydının yanında “Çözümle”ye basın. Çıkan zaman damgalı metni kaydı dinleyerek düzeltin.
6. Dinleyerek kontrol ettiğiniz bölümlerin onay kutusunu işaretleyin. Konuşmacı etiketlerini uzman olarak siz girin; otomatik çözümleme konuşmacı kimliğini ayırt etmez.
7. Dosya bilgilerini, görevlendirme kapsamını, mahkeme sorularını, teknik değerlendirmeyi ve sonuç bölümünü tamamlayın.
8. Rapor oluştur bölümünde doğrudan UYAP UDF (.udf) çıktısı alın. İsteğe bağlı Word (.docx) kopyası da oluşturulabilir; portal için esas çıktı UDF’dir.

RAPOR TASARIMI
Rapor çıktısı; kapak ve dosya bilgileri, görevlendirme kapsamı, dijital materyal envanteri, inceleme yöntemi, kayıt bazında zaman damgalı çözümleme tabloları, mahkeme soruları, teknik değerlendirme, sonuç-kanaat ve ekler bölümlerini içerir. DOCX çıktısında üst bilgi, alt bilgi ve sayfa numarası da bulunur. UDF çıktısında boş UYAP belgesinden alınan sayfa ayarları ve yazı tipleri korunur.

UDF / BİLİRKİŞİ PORTALI / UYAP EDİTÖRÜ
Uygulama DOCX ve doğrudan UDF üretir. UDF üretiminde templates\BOS.udf içindeki format_id=1.8 yapısı, sayfa ayarları ve stil tanımları temel alınır. İlk oluşturulan UDF dosyasını kendi UYAP Doküman Editörü sürümünüzde açarak metin, tablolar, sayfa taşmaları ve yazı tiplerini kontrol edin. Bu sürümde UDF dosyasına e-imza verisi eklenmez; uygulama UYAP'a bağlanmaz ve belge göndermez. UDF üretimi UYAP Editöründe doğrulanana kadar resmî sunumdan önce editörde açılıp gözden geçirilmelidir.

TÜRKÇE ÇÖZÜMLEME
Konuşma modeli çağrısında kaynak dil açıkça Türkçe (turkish), görev ise konuşmayı yazıya dökme (transcribe) olarak gönderilir. Çeviri görevi kullanılmaz. Bu, İngilizceye çeviri olarak çalışmasını önlemeyi hedefler; ancak modelin Türkçe kelimeleri her kayıtta doğru tanıyacağını garanti etmez. Özel adlar, sayılar, tarihler, olumsuzluklar, üst üste konuşmalar ve anlaşılmayan bölümler mutlaka kayıttan kontrol edilmelidir.

MODEL / İNTERNET / GİZLİLİK
İlk kullanımda Transformers.js kitaplığı jsDelivr üzerinden, model dosyaları Hugging Face üzerinden indirilir. ZIP/DOCX/UDF dosya işlemlerinde kullanılan JSZip kitaplığı uygulama paketinin içindedir ve ayrıca internet istemez. Model yüklendikten sonra konuşma çözümleme tarayıcıda WASM ile yürütülür; ses uzak bir konuşma tanıma API'sine gönderilmez. Sonraki çevrimdışı kullanım, model ve kitaplık önbelleğinin tarayıcıda kalmasına bağlıdır. Kurumunuzun bilgi güvenliği kurallarını gerçek yargısal materyal yüklemeden önce değerlendirin.

DOSYA SAKLAMA VE YEDEKLEME
Dosya bilgileri tarayıcı localStorage alanında, ses kayıtları IndexedDB içinde saklanır. Tarayıcı verisini temizlemek kayıtları silebilir. Her çalışma için “Dosyayı dışa aktar” ile .akis yedeği oluşturun. Önceki MİHENK sürümünden alınmış .mihenk yedekleri de içe aktarılabilir.

MESLEKİ SINIRLAR
Uygulama sesleri çözümlemeye yardımcı olur ve rapor belgesini düzenler. Hukuki değerlendirme, konuşmacı kimliği, kayıt orijinalliği, montaj tespiti veya bilirkişi kanaatini kendiliğinden belirlemez. Otomatik metin, uzman tarafından dinlenerek doğrulanmadan kesin bulgu olarak kabul edilmemelidir. Kullanılmayan filtre, inceleme veya doğrulama işlemleri raporda yapılmış gibi gösterilmemelidir.

TEST DOSYALARI
Paket içinde dört kurgusal dosya türü (hukuk, ceza, Cumhuriyet Başsavcılığı, icra) ve on sentetik Türkçe WAV kaydı vardır. Sesler sentetik konuşma üretimidir; gerçek kişi veya gerçek dava kaydı değildir. “Profesyonel_Rapor_Tasarim_Ornegi.docx” rapor tasarımını gösteren kurgusal bir Word örneğidir.

RESMÎ ŞABLONLAR
Bakanlığın yayımladığı dört rapor türü için resmî DOCX bağlantıları SABLONLAR_VE_UYAP.txt dosyasındadır. Uygulama rapor türü seçimi sunar; ancak oluşturduğu DOCX, Bakanlığın indirme bağlantısındaki resmî DOCX'in piksel düzeyinde birebir kopyası değildir. Merci tarafından belirli şablonun aynısı isteniyorsa resmî şablonu esas alın.

SORUN GİDERME
- START.bat çalışmıyorsa Windows PowerShell'in çalıştırılmasına izin verildiğini kontrol edin.
- Sayfa açılmıyorsa Edge adres çubuğuna PowerShell penceresindeki 127.0.0.1 adresini yazın.
- Model indirilmiyorsa internet bağlantısını ve kurumsal güvenlik duvarını kontrol edin.
- DOCX/UDF indirme çalışmıyorsa assets\vendor\jszip.min.js ve templates\BOS.udf dosyalarının pakette bulunduğunu kontrol edin.
- Ses okunmuyorsa WAV veya MP3 biçimine dönüştürüp tekrar deneyin.

TEKNİK NOT
Bu sürüm, önceki MİHENK Pro paketinin AKİS markasıyla devam eden güncellemesidir. Eski tarayıcı depolama anahtarları korunmuştur; böylece aynı tarayıcıdaki önceki çalışmaların görünmesi hedeflenir. Kullanıcının sağladığı BOS.udf dosyası templates\BOS.udf içine eklenmiş; DOCX yanında doğrudan UDF indirme seçeneği oluşturulmuştur. UDF çıktısı ZIP arşivi, content.xml XML yapısı ve tüm startOffset/length aralıkları bakımından otomatik kontrol edilmiştir. UYAP Doküman Editörünün gerçek Windows kurulumunda açılış ve sayfa düzeni doğrulaması bu ortamda yapılamamıştır.


RAPOR ŞABLONU GÜNCELLEMESİ
- Hukuk/İdare-Vergi rapor çıktısı Bakanlığın yayımladığı örnek şablondaki bölüm sırasına göre hazırlanır: 1) İncelemenin konusu, kapsam ve sınırları 2) Bilirkişinin cevaplaması gereken sorular 3) Gözlemlenmesi/incelenmesi istenen maddi unsurlar 4) İnceleme yöntemi, bilimsel ve teknik dayanaklar 5) Analiz, tespit ve değerlendirme 6) Gerekçeli sonuç 7) Ekler.
- Rapor kapak alanlarında dosya numarası, taraflar, dava konusu ve tarihler bulunur. Verilen süre gün olarak girilebilir.
- DOCX ve UDF çıktısında kapak, içindekiler ve ana rapor sayfa geçişleri eşitlenmiştir.
- UDF tablolarında kenarlık ve hücre boşlukları daha hafif ayarlanmıştır.

GÜNCEL RAPOR DÜZENİ – HUKUK / İDARE-VERGİ
Kapak bilgileri ve kısa İçindekiler ilk sayfada birlikte yer alır; ana rapor bir sonraki sayfadan başlar. Ana rapor, Bakanlığın yayımladığı hukuk mahkemeleri örneğindeki yedi ana başlık sırasını izler:
1. İncelemenin konusu, kapsam ve sınırları
2. Bilirkişinin cevaplaması gereken sorular
3. Bilirkişiden gözlemlenmesi ve incelenmesi istenen maddi unsurlar
4. İnceleme yöntemi, bilimsel ve teknik dayanaklar
5. Analiz, tespit ve değerlendirme
6. Gerekçeli sonuç
7. Ekler

UDF GÖRSEL DÜZENİ
UDF tablolarında kenarlık kalınlığı azaltılmış, daha açık çizgi rengi ve hafif satır dolguları kullanılmıştır. Kapak ile İçindekiler aynı ilk sayfada birleştirilmiş; ana rapor öncesine sayfa sonu eklenmiştir. Sayfa kenar boşlukları DOCX çıktısındaki A4 ölçülerine yaklaştırılmıştır. UYAP Editörünün sayfa düzeni Word/LibreOffice ile birebir aynı olmayabilir; son görünüm UYAP Editöründe incelenmelidir.

RESMÎ FORMAT HAKKINDA
Adalet Bakanlığının Bilirkişilik Temel Eğitimi Kaynak Kitabı, bilirkişi raporları için tek ve zorunlu bir özel şablon bulunmadığını; buna karşılık görevlendiren merci, dosya numarası, taraflar, görevlendirme tarihi ve süresi, inceleme konusu, maddi unsurlar, yöntem, bilimsel/teknik dayanak, gerekçeli sonuç, rapor tarihi ve bilirkişi bilgileri gibi unsurların bulunması gerektiğini açıklar. Bakanlığın internet sitesindeki hukuk şablonu bölüm sırası ve kapak bilgileri bu nedenle örnek alınmıştır. Mahkeme ayrıca özel bir biçim istemişse o talimat esas alınmalıdır.

KAPSAM SINIRI
Bu sürümün rapor tasarımı Hukuk/İdare-Vergi örneğine göre iyileştirilmiştir. Ceza, Cumhuriyet Başsavcılığı ve İcra dosyaları için rol alanları ve rapor bölümleri ayrı ayrı uzmanlaştırılmamıştır; bu sonraki geliştirme kapsamındadır.


MARKA VE ÇIKTI ÖNCELİĞİ
Uygulamanın adı AKİS (Adli Konuşma İnceleme Sistemi) olarak güncellenmiştir. Bilirkişi Portalı için birincil ve zorunlu çıktı UDF’dir. DOCX yalnızca isteğe bağlı yardımcı kopyadır.


UDF GÖRÜNÜM DÜZELTMESİ
- Tablo başlıkları koyu lacivert yazı ve açık zeminle oluşturulur; başlıkların beyaz zeminde kaybolması önlenir.
- Tablo hücrelerinin iç boşlukları ve satır aralıkları azaltılarak daha dengeli hâle getirilmiştir.
- Uzun kesintisiz teknik dizilerde (özellikle SHA-256) görünmez satır kırma noktaları eklenerek hücre taşmaları azaltılmıştır.
- Paragraflarda iki yana yaslamanın kelime aralıklarını gereğinden fazla açması önlenmiş, sol hizalama esas alınmıştır.
- Sol ve sağ sayfa kenar boşlukları eşitlenmiştir.
Not: UYAP Editörü sürümleri arasında tablo sayfa bölünmesi ve hücre davranışı farklılık gösterebilir; nihai UDF mutlaka kullanılan editörde kontrol edilmelidir.
