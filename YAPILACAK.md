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

| Sürüm | Yapılacak çalışma                          |
| ----- | ------------------------------------------ |
| 1.1   | Mevcut sistemi koruma                      |
| 1.2   | Mahkemeye özel raporlar, DOCX ve UDF       |
| 1.3   | Whisper motoru ve modeller                 |
| 1.4   | Model yöneticisi, GPU/CPU, toplu çözümleme |
| 1.5   | Uzun kayıt yönetimi                        |
| 1.6   | Gelişmiş deşifre editörü                   |
| 1.7   | Dijital delil güvenliği                    |
| 2.0   | Yeni AKİS PRO arayüzü                      |

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

Başlangıç noktası

**İlk olarak 1.1 ve 1.2 sürümlerini tamamlayacağız.**

Önce mevcut sistemi güvenceye alacağız, ardından dört ayrı mahkeme türüne uygun rapor mimarisini kuracağız. Sonra ses motoruna geçeceğiz.

Hedefimiz: **AKİS – Adli Ses İnceleme, Deşifre ve Raporlama Sistemi.**