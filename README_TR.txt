AKİS – ADLİ KONUŞMA İNCELEME SİSTEMİ
Kullanım ve Sorun Giderme Kılavuzu
Sürüm: 2026.11.15-AKIS-UDF-STANDART

Bu dosya, START.bat çalışmadığında veya uygulama beklenen şekilde
açılmadığında izlenecek adımları içerir.

--------------------------------------------------------------------
1. BAŞLATMA
--------------------------------------------------------------------
1. ZIP dosyasını normal bir klasöre çıkarın. ZIP dosyasının içinden
   çalıştırmayın; Windows geçici klasöründen çalıştırma sorun çıkarır.
2. START.bat dosyasına çift tıklayın.
3. Microsoft Edge açılır. Açılmazsa, açılan PowerShell penceresinde
   yazan 127.0.0.1 adresini Edge adres çubuğuna elle yazın.
4. Uygulama Python veya Node.js kurulumu gerektirmez. Yerel sunucu
   Windows PowerShell ile başlatılır.

--------------------------------------------------------------------
2. SORUN GİDERME
--------------------------------------------------------------------
START.bat çalışmıyor
- Windows PowerShell'in çalıştırılmasına izin verildiğini kontrol edin.
- START.bat'a sağ tıklayıp "Yönetici olarak çalıştır" seçeneğini deneyin.
- Klasör yolunda Türkçe karakter veya çok uzun yol varsa, klasörü
  örneğin C:\AKIS gibi kısa bir yola taşıyıp tekrar deneyin.

Sayfa açılmıyor
- PowerShell penceresinde yazan 127.0.0.1:PORT adresini Edge adres
  çubuğuna yazın.
- 8787–8817 aralığındaki tüm bağlantı noktaları doluysa uygulama
  başlamaz. PowerShell penceresini kapatıp tekrar açın.

Model indirilmiyor
- İnternet bağlantısını ve kurumsal güvenlik duvarını kontrol edin.
- İlk model indirmesi jsDelivr ve Hugging Face adreslerine erişim
  gerektirir. Bu adresler engelliyse model yüklenemez.
- İndirme yarıda kalırsa "Modeli yükle" düğmesine tekrar basın;
  tarayıcı önbelleği kalan dosyaları yeniden indirmez.

Ses çözümlemesi çalışmıyor veya sonuç anlamsız
- Çözümleme modeli olarak "Küçük model – önerilen doğruluk" seçeneğini
  kullanın. "Temel model" hızlıdır ancak doğruluğu belirgin şekilde
  düşüktür ve yalnızca deneme amaçlıdır.
- Tarayıcıda WebGPU yoksa çözümleme WASM (CPU) ile yürür ve uzun
  kayıtlarda belirgin şekilde yavaşlar.
- Kayıt uzunsa (birkaç dakikanın üzerinde) tarayıcı belleği yetersiz
  kalabilir. Kaydı daha küçük parçalara bölerek ayrı dosyalar hâlinde
  ekleyin.
- Çıktı yalnızca "(Konuşma)" gibi dolgu ifadelerinden oluşuyorsa
  uygulama bunu uyarı olarak işaretler. Bu durumda sonucu rapora
  aktarmayın; kaydı elle dinleyip bölümleri kendiniz girin.

DOCX / UDF indirme çalışmıyor
- assets\vendor\jszip.min.js ve templates\BOS.udf dosyalarının pakette
  bulunduğunu kontrol edin.
- İndirme engelliyse tarayıcının indirme izinlerini kontrol edin.

Ses okunmuyor
- WAV veya MP3 biçimine dönüştürüp tekrar deneyin. Tarayıcının
  çözemediği bazı codec'ler (örneğin bazı FLAC profilleri) sessizce
  atlanabilir.

--------------------------------------------------------------------
3. VERİ SAKLAMA VE YEDEKLEME
--------------------------------------------------------------------
Dosya bilgileri tarayıcı localStorage alanında, ses kayıtları IndexedDB
içinde saklanır. Tarayıcı verisini temizlemek kayıtları silebilir.
Her çalışma için "Dosyayı dışa aktar" ile .akis yedeği oluşturun.
Önceki MİHENK sürümünden alınmış .mihenk yedekleri de içe aktarılabilir.

--------------------------------------------------------------------
4. RAPOR ÇIKTISI
--------------------------------------------------------------------
Bilirkişi Portalı için birincil ve zorunlu çıktı UDF'dir (.udf). DOCX
yalnızca isteğe bağlı yardımcı kopyadır. UDF üretimi, templates\BOS.udf
içindeki sayfa ayarları ve stil tanımları esas alınarak yapılır.
Oluşturulan ilk UDF dosyasını kendi UYAP Doküman Editörü sürümünüzde
açıp sayfa düzenini kontrol edin. Uygulama e-imza üretmez ve belgeyi
UYAP'a göndermez.

Rapor türü seçimi (hukuk, ceza, Cumhuriyet Başsavcılığı, icra) kapak
alanlarının terminolojisini ve rol etiketlerini değiştirir. Bölüm
sırası Bakanlığın yayımladığı hukuk örneği esas alınarak hazırlanmıştır;
merci belirli bir biçim istemişse o talimat esas alınmalıdır.

--------------------------------------------------------------------
5. MESLEKİ SINIRLAR
--------------------------------------------------------------------
Uygulama seslerin çözümlenmesine yardımcı olur ve rapor belgesini düzenler.
Hukuki değerlendirme, konuşmacı kimliği, kayıt orijinalliği, montaj
tespiti veya bilirkişi kanaatini kendiliğinden belirlemez. Otomatik
metin, uzman tarafından dinlenerek doğrulanmadan kesin bulgu olarak
kabul edilmemelidir. Kullanılmayan filtre, inceleme veya doğrulama
işlemleri raporda yapılmış gibi gösterilmemelidir.
