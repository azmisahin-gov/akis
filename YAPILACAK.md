# **AKİS – Yapılacaklar Listesi**

**Ana hedef:** Mevcut AKİS uygulamasını bozmadan, HTML + CSS + JavaScript altyapısı üzerinde profesyonel bir adli ses inceleme ve raporlama sistemine dönüştürmek.

Python, Node.js veya ayrı bir masaüstü uygulaması kullanılmayacak.

## **1. Mevcut sistemin korunması**

1\. öncelik

- Mevcut HTML, CSS ve JavaScript yapısını koruma.
- DOCX rapor üretimini koruma.
- Doğrudan UDF üretimini koruma.
- MİHENK eski çalışma dosyalarıyla uyumluluğu koruma.
- IndexedDB kayıtlarını koruma.
- Mevcut ses kayıtlarını kaybetmeme.
- Mevcut özelliklerin regresyon testlerini yapma.

## **2. Rapor altyapısının geliştirilmesi**

- Ortak rapor çekirdeği oluşturma.
- Mahkeme türüne özel şablon mimarisi kurma.
- Hukuk mahkemesi raporu.
- Ceza mahkemesi raporu.
- Cumhuriyet Başsavcılığı raporu.
- İcra Müdürlüğü raporu.
- Mahkeme türüne göre değişen alanlar.
- Ortak bölüm ve sonuç yapısı.
- DOCX ve UDF biçimlerinin uyumlu olması.

## **3. Whisper ses çözümleme motoru**

- Mevcut WASM altyapısını geliştirme.
- WebGPU desteği.
- Tiny modeli.
- Base modeli.
- Small modeli.
- Medium modeli.
- Large-v3 modeli.
- Large-v3-turbo modeli.
- Türkçe dil desteği.
- Model uyumluluk ve performans testleri.

## **4. Model yöneticisi**

- Model indirme.
- İndirme yüzdesi.
- İndirmeyi duraklatma.
- Kaldığı yerden devam ettirme.
- Model bütünlüğünü doğrulama.
- Model silme.
- Depolama alanı kontrolü.
- Kullanılabilir modelleri listeleme.

## **5. GPU ve CPU yönetimi**

- WebGPU algılama.
- WASM desteği.
- GPU desteklenmiyorsa otomatik CPU geçişi.
- Bellek yönetimi.
- Donanıma göre model önerisi.
- İşlem kaynaklarının izlenmesi.

## **6. Toplu ses çözümleme**

- Birden fazla ses dosyası ekleme.
- İşlem kuyruğu oluşturma.
- Bekleyen dosyaları listeleme.
- Sırayla otomatik çözümleme.
- İşlem iptali.
- Hatalı dosyayı tekrar çalıştırma.
- Genel ilerleme yüzdesi.
- Dosya bazında ilerleme yüzdesi.
- Tahmini kalan süre.

## **7. Uzun kayıt yönetimi**

- Uzun sesleri parçalara ayırma.
- Bellek kullanımını azaltma.
- Parça bazında çözümleme.
- İşlem sonuçlarını aşamalı kaydetme.
- Kesinti sonrası kaldığı yerden devam etme.
- Tamamlanan parçaları yeniden işlememe.

## **8. Gelişmiş deşifre editörü**

- Zaman kodlu deşifre.
- Satıra tıklayınca ilgili ses bölümünü dinleme.
- Başlangıç ve bitiş zamanını düzenleme.
- Konuşmacı tanımlama.
- Metin düzeltme.
- Kontrol edildi durumu.
- Kontrol bekliyor durumu.
- Anlaşılmadı durumu.
- Yeniden dinlenecek durumu.
- Değişiklik geçmişi.
- Eski metinleri görüntüleme.

## **9. Dijital delil güvenliği**

- Dosya adı ve türü.
- Dosya boyutu ve süresi.
- Codec bilgisi.
- Kanal sayısı.
- Örnekleme frekansı.
- Bit derinliği.
- SHA-256 hesaplama.
- Sonradan SHA-256 doğrulama.
- Orijinal dosyanın korunması.
- İşlem günlüğü.
- İşlem tarihi ve saati.
- Delil işlem zinciri.
- Dosya değişikliği tespiti.

## **10. Kullanıcı arayüzü**

- Ana kontrol paneli.
- Modern dosya yönetimi.
- Model yönetim ekranı.
- Toplu işlem ekranı.
- Gelişmiş ses oynatıcı.
- Ses dalga formu.
- Deşifre düzenleme ekranı.
- Rapor önizleme ekranı.
- İşlem geçmişi.
- Kullanılabilirlik ve performans iyileştirmeleri.

## **Geliştirme sürümleri**

| Sürüm | Yapılacak çalışma                          | Durum |
| ----- | ------------------------------------------ | ----- |
| 1.1   | Mevcut sistemi koruma                      | Tamamlandı |
| 1.2   | Mahkemeye özel raporlar, DOCX ve UDF       | Tamamlandı |
| 1.3   | Whisper motoru ve modeller                 | Tamamlandı |
| 1.4   | Model yöneticisi, GPU/CPU, toplu çözümleme | Kısmen tamamlandı |
| 1.5   | Uzun kayıt yönetimi                        | Tamamlandı |
| 1.6   | Gelişmiş deşifre editörü                   | Tamamlandı |
| 1.7   | Dijital delil güvenliği                    | Tamamlandı |
| 2.0   | Yeni AKİS PRO arayüzü                      | Bekliyor |

### Tamamlanan çalışmaların ayrıntısı

**1.2 – Mahkeme türüne özel raporlar**
Dört merci türü için kapak alanları ve rol etiketleri ayrıştırıldı: hukuk (davacı-davalı), ceza (mağdur-katılan/sanık), Cumhuriyet Başsavcılığı (müşteki-şüpheli) ve icra (alacaklı-borçlu). Form etiketleri rapor türü seçimine göre canlı güncellenir. Yedi bölümlü ana rapor sırası Bakanlığın hukuk örneğine göre korunur; ceza, savcılık ve icra için bölüm içi alanların ayrıca uzmanlaştırılması sürüyor.

**1.3 – Konuşma çözümleme motoru**
Tarayıcı ortamında ölçüm yapıldı: int8 kuantizasyon WASM'da yüklenemiyor (ConvInteger çekirdeği yok); q8 kuantizasyon yaklaşık 15 saniyeden uzun kayıtlarda anlamlı metin yerine tekrarlı dolgu ifadeleri üretiyor; fp16 kararlı ve doğru sonuç veriyor. Bu nedenle modeller fp16/fp32 ile yükleniyor. Model listesi genişletildi: temel, küçük, orta ve large-v3-turbo. WebGPU algılama ve WASM (CPU) geri dönüşü eklendi. Dolgu ifadesi üreten bölümler otomatik işaretleniyor.

**1.4 – Toplu çözümleme**
Sıralı işlem kuyruğu eklendi: birden fazla kayıt tek tek çözümlenir, genel ilerleme ve tahmini kalan süre gösterilir, kuyruk durdurulabilir, hatalı kayıtlar tekrar denenebilir. Model indirme duraklatma, bırakılan yerden devam ettirme, bütünlük doğrulama ve depolama alanı kontrolü henüz eklenmedi.

**1.5 – Uzun kayıt yönetimi**
Kayıtlar 30 saniyelik pencerelere bölünerek çözümlenir; her pencere sonunda sonuç kaydedilir. Uzun kayıtlarda bellek şişmez, kesinti hâlinde o ana kadar bulunan bölümler korunur, çözümleme istenildiği an iptal edilebilir.

**1.6 – Deşifre editörü**
Her bölüm dört durumdan biriyle işaretlenir: Onaylandı, Kontrol bekliyor, Anlaşılmadı ve Yeniden dinlenecek. Yalnızca Onaylandı ve Anlaşılmadı denetimden geçmiş sayılır; Yeniden dinlenecek asla doğrulanmış kabul edilmez. Bölüm metni değişiklik geçmişi tutulur ve görüntülenebilir.

**1.7 – Dijital delil güvenliği**
Dosya adı, biçim, boyut, süre, codec, kanal sayısı, örnekleme frekansı, bit derinliği ve SHA-256 özeti kaydedilir. WAV başlığı chunk yürüyerek okunur. Sonradan SHA-256 doğrulama yapılabilir. Kayıt ekleme, çözümleme ve doğrulama işlemleri delil işlem günlüğüne yazılır. Rapor envanterinde kanal ve örnekleme bilgileri gösterilir.

## **Projenin değişmez kuralları**

**Korunacak prensipler**

- Python yok.
- Node.js yok.
- Mevcut JavaScript mimarisi korunacak.
- İnternet zorunluluğu olmadan yerel çalışma hedeflenecek.
- DOCX ve UDF üretimi korunacak.
- Orijinal ses dosyaları değiştirilmeyecek.
- Kontrol edilmeyen deşifre, kontrol edilmiş gibi gösterilmeyecek.
- Yapılmayan inceleme işlemi rapora yapılmış gibi yazılmayacak.
- Her aşama test edilmeden sonraki aşamaya geçilmeyecek.

Durum

1.1, 1.2, 1.3, 1.5, 1.6 ve 1.7 sürümleri tamamlandı. 1.4 kısmen tamamlandı: toplu çözümleme kuyruğu hazır, ancak model yöneticisinin indirme duraklatma, bırakılan yerden devam ettirme, bütünlük doğrulama, silme ve depolama alanı kontrolü bölümleri henüz eklenmedi.

Sıradaki çalışmalar

- 1.4 kalanı: model yöneticisi (duraklat/devam/sil/bütünlük doğrula/depolama kontrolü) ve donanıma göre model önerisi.
- 1.2 derinleştirme: ceza, savcılık ve icra raporları için bölüm içi alanların ayrıca uzmanlaştırılması.
- 2.0: yeni AKİS PRO arayüzü.

Hedefimiz: **AKİS – Adli Ses İnceleme, Deşifre ve Raporlama Sistemi.**