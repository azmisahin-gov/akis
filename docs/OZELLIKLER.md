# Özellikler (v1 — mevcut durum)

Bu belge, AKİS v1'de **hâlihazırda çalışan** özellikleri listeler. Yol haritası
ve tamamlanma durumu için [`YOL_HARITASI.md`](YOL_HARITASI.md) dosyasına bakın.

## Çalışma dosyası yönetimi

- Birden fazla inceleme dosyası; kenar çubuğundan dosya değiştirme.
- Dosya bilgileri `localStorage`, ses kayıtları IndexedDB içinde saklanır.
- `.akis` yedek dışa/içe aktarma (dosya bilgileri, sorular, bölümler, teknik
  envanter, SHA-256 ve tüm ses blob'ları).
- Eski MİHENK `.mihenk` yedekleri de içe aktarılabilir (depolama anahtarları
  geriye dönük uyumlu tutulur).

## Dosya tanımı

- Dört merci türü: Hukuk/İdare-Vergi, Ceza, Cumhuriyet Başsavcılığı, İcra.
- Merci türüne göre kapak terminolojisi ve rol etiketleri:
  - Dosya numarası: hukuk/ceza/icra "DOSYA NO", savcılık "SORUŞTURMA NO".
  - Taraflar: davacı/davalı, müşteki-mağdur/katılan ve sanık, müşteki/şüpheli,
    alacaklı/borçlu (+ vekil karşılıkları).
  - Konu/tarih: dava, inceleme, soruşturma, takip konusu ve tarihi.
- Rapor başlığındaki yönelme eki Türkçe ünlü uyumuna göre hesaplanır
  ("MAHKEMESİ'NE", "BAŞSAVCILIĞI'NA", "MÜDÜRLÜĞÜ'NE").
- Görevlendirme tarihi, verilen süre (gün) ve son teslim tarihi alanları.

## Ses kayıtları

- Sürükle-bırak veya dosya seçme; WAV, MP3, M4A, OGG, FLAC, AAC.
- Toplu dosya ekleme.
- Kayıt başına teknik envanter: dosya adı, biçim, boyut, süre, codec, kanal
  sayısı, örnekleme frekansı, bit derinliği, SHA-256 özeti.
- WAV başlığı chunk yürüyerek okunur (sabit offset varsayımı kullanılmaz).
- Canvas tabanlı dalga formu: tıklayarak konuma gitme, bölüm aralıklarının
  görsel işaretlenmesi, oynatma imleci.
- Kayıt kaldırma.

## Konuşma çözümleme (deşifre)

- Tarayıcıda çalışan Whisper modelleri (Transformers.js): temel, küçük, orta,
  large-v3-turbo.
- Kaynak dil Türkçe, görev "transcribe" olarak sabitlenir (çeviri yapılmaz).
- WebGPU algılama; yoksa otomatik WASM (CPU) geri dönüşü.
- Kayıtlar 30 saniyelik pencerelere bölünür; her pencere sonunda ilerleme
  kaydedilir, işlem kesintiye uğrarsa kalan bölümler korunur.
- Çözümleme iptal edilebilir.
- Toplu çözümleme kuyruğu: sıralı işlem, genel ilerleme, tahmini kalan süre,
  hatalı kaydı tekrar deneme.
- Dolgu/halüsinasyon tespiti: "(Konuşma)" gibi anlamsız çıktılar işaretlenir.
- Pencere dayanıklılığı: tek pencere hatası tüm kaydı çökertmez.
- Türkçe dışı çıktı olasılığı için dil uyarısı.

## Deşifre editörü

- Zaman damgalı bölümler; başlangıç/bitiş zamanı ve metin düzenleme.
- Konuşmacı etiketi (uzman tarafından girilir; otomatik kimlik tespiti yoktur).
- Dört kontrol durumu: Onaylandı, Kontrol bekliyor, Anlaşılmadı, Yeniden
  dinlenecek. Yalnızca "Onaylandı" ve "Anlaşılmadı" denetlenmiş sayılır.
- "▶" düğmesiyle bölümü kayıttan dinleme (başlangıçta başlar, bitişte durur).
- Bölüm metni değişiklik geçmişi.
- Elle bölüm ekleme.

## Deşifre ve kontrol çalışma alanı

Uzmanın en çok zaman geçirdiği alan olduğu için hızlı ve hatasız kontrol
hedefiyle tasarlanmıştır. **İki panel** kullanır: solda bölüm listesi (gezinme),
sağda aktif bölüm detayı (çalışma). Aktif bölüm değişince DOM yeniden çizilmez;
yalnızca işaret ve detay alanları güncellenir. Böylece kaydırma, odak ve ok
tuşları bozulmaz.

- **Klavye kısayolları** (eller metinden ayrılmadan):
  - `Boşluk` oynat/durdur
  - `↑` `↓` önceki/sonraki bölüm
  - `Enter` aktif bölümü onayla ve sonrakine geç
  - `Y` aktif bölümü dinle
  - `[` `]` oynatma hızını düşür/artır
  - `←` `→` 5 saniye geri/ileri
  - Metin alanındayken `Esc` ile alandan çık, klavye gezinmesine dön
- **Bölüm listesi:** numara, başlangıç, metin özeti, konuşmacı, öncelik ve
  kontrol durumu tek satırda. Aktif bölüm işaretlenir.
- **Bölüm filtresi:** Tümü / Bekleyen / Onaylandı / Anlaşılmadı / Yeniden
  dinlenecek; her birinin sayısı görünür.
- **İnceleme önceliği:** hangi bölümün önce dinlenmesi gerektiğini gösteren
  şeffaf, gerekçeli işaret (anlamlı metin yok, süre sıfır, çok kısa/uzun bölüm,
  öncekiyle çakışma). "Öncelikliye git" düğmesi en yüksek öncelikli bekleyen
  bölüme atlar.
- **Bölüm işlemleri:** oynatıcı konumundan böl, sonrakiyle birleştir, sil.
- **Oynatma hızı** 0,75× – 2× arası; kayda bağlı saklanır.
- **Denetim ilerlemesi** çubuğu ve durum renkleri.
- Uzun kayıtta liste paneli kayar, sağ panel sabit kalır.

## Konuşmacı yönetimi ve ses özellikleri

- Her konuşmacı için **rol** (davacı, davalı, müşteki, sanık, şüpheli, alacaklı,
  borçlu, tanık, bilirkişi…), **cinsiyet** (uzman beyanı), **yaş aralığı** ve
  **not** alanları. Bu bilgiler rapora "Konuşmacılar" tablosu olarak akar.
- **Perde (temel frekans) ölçümü:** otokorelasyon yöntemiyle gerçek DSP ölçümü.
  Her konuşmacının bölümlerinden örnekler alınır, ortanca perde hesaplanır ve
  kaba bir yönlendirme gösterilir (ör. "düşük perde, genellikle erkek").
  Ölçüm otomatik değildir; uzman "Konuşmacı perdesini ölç" düğmesiyle başlatır.
- **Konuşmacı eşleştirme önerisi:** benzer perdede görünen etiketler uzmana
  "aynı kişi olabilir" diye hatırlatılır. Bu bir **öneridir**; kimlik tespiti
  değildir ve arayüzde açıkça belirtilir.
- **Sınır:** uygulama konuşmacı kimliğini kendiliğinden tespit etmez. Etiketler
  ve öznitelikler uzman beyanına dayanır; perde değeri kayıt koşullarına bağlı
  bir tahmindir.

## Dijital delil güvenliği

- SHA-256 sonradan doğrulama; fark çıkarsa açık uyarı.
- Delil işlem günlüğü (ekleme, çözümleme, doğrulama) tarih-saat damgalı.
- Orijinal ses dosyası değiştirilmez.

## Model yöneticisi

- İndirilen modellerin listelenmesi; dosya sayısı ve disk boyutu.
- Yapısal bütünlük kontrolü (config, tokenizer, encoder, decoder mevcut mu).
- Model silme; tüm önbelleği temizleme.
- Donanıma göre model önerisi (WebGPU varsa large-v3-turbo, yoksa küçük model).

## Rapor

- Üç çıktı yolu: HTML önizleme, DOCX, UDF.
- Bakanlığın yayımladığı hukuk örneğine göre yedi bölümlü yapı:
  1. İncelemenin konusu, kapsam ve sınırları
  2. Bilirkişinin cevaplaması gereken sorular
  3. Gözlemlenmesi/incelenmesi istenen maddi unsurlar
  4. İnceleme yöntemi, bilimsel ve teknik dayanaklar
  5. Analiz, tespit ve değerlendirme
  6. Gerekçeli sonuç
  7. Ekler
- Kapak ve içindekiler ilk sayfada; ana rapor sonraki sayfadan başlar.
- **Konuşmacılar tablosu:** her konuşmacı için etiket, rol, cinsiyet, yaş
  aralığı, ölçülen perde ve ilgili kayıt/bölüm bilgisi. Üç çıktıda da yer alır.
- Rapor öncesi kontrol uyarıları (eksik alan, denetlenmemiş bölüm, dolgu metni).
- DOCX çıktısında üst bilgi, alt bilgi ve sayfa numarası.
- UDF çıktısı `templates/BOS.udf` sayfa ayarları ve stillerini korur.

## Mesleki sınırlar (uygulama bunları yapmaz)

- Hukuki değerlendirme ve bilirkişi kanaati üretmez.
- Konuşmacı kimliği, kayıt orijinalliği veya montaj tespiti yapmaz.
- E-imza üretmez, UYAP'a belge göndermez.
- Kontrol edilmemiş deşifreyi doğrulanmış gibi göstermez.
- Yapılmayan incelemeyi rapora yazmaz.
