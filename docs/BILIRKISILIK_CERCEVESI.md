# Bilirkişilik çerçevesi ve 56.12 uzmanlık alanı

Bu belge, AKİS'in hangi hukuki ve mesleki çerçeve içinde çalıştığını ve raporun
hangi sınırları korumak zorunda olduğunu kaydeder. Amaç, uygulamanın ürettiği
belgenin bilirkişilik mevzuatına uygun bir **teknik** belge olmasını sağlamak;
hukuki değerlendirme üretmemek.

> **Doğrulama notu.** Aşağıdaki mevzuat adları yerleşik çerçevedir; ancak
> **madde numaraları, uzmanlık alanı kodu (56.12) ve alan adının resmî
> yazımı** bu belge yazılırken resmî kaynaktan (mevzuat.gov.tr, Adalet
> Bakanlığı Bilirkişilik Daire Başkanlığı) teyit edilememiştir: çalışma
> ortamında ilgili sitelere ağ erişimi yoktu. Rapora yazılan alan kodu ve
> mevzuat atfı, kullanımdan önce resmî kaynaktan doğrulanmalıdır. Doğrulanmamış
> bir künye rapora yazılmaz.

## Dayanak mevzuat (adlar doğrulanabilir, madde numarası verilmez)

| Mevzuat | İlgili olduğu konu |
|---|---|
| 6100 sayılı Hukuk Muhakemeleri Kanunu | Bilirkişiliğe ilişkin usul hükümleri (bilirkişinin görevlendirilmesi, raporun kapsamı, süre) |
| 5271 sayılı Ceza Muhakemesi Kanunu | Ceza muhakemesinde bilirkişilik |
| 6754 sayılı Bilirkişilik Kanunu | Bilirkişilik mesleğinin çerçevesi, sicil, uzmanlık alanları, etik ilkeler |
| Bilirkişilik Yönetmeliği | Uzmanlık alanları listesi, başvuru ve sicil işlemleri, rapor düzeni |
| Bilirkişilik Asgari Ücret Tarifesi | Ücretlendirme (rapor içeriğini etkilemez) |

Uygulama bu mevzuatın **hiçbir maddesine atıf yazmaz**. Raporda mevzuat atfı
gerekiyorsa bilirkişi kendisi ekler; uygulama doğrulanmamış künye üretmez.

## Uzmanlık alanı

Varsayılan alan kodu `REPORT_TEXT.defaultField` ve `freshCase().expertField`
üzerinden gelir: **56.12 — Ses kayıtlarının metin hâline dönüştürülmesi**.

Kurallar:

- Alan kodu **tek kaynaktan** okunur. Kapak üst satırı ve Word üst bilgisi
  sabit sayı yazmaz; `expertFieldShort(c)` dosyada girilen değeri gösterir.
- Kod yanlışsa rapor yanlıştır. Bilirkişi, kendi sicilindeki alan kodu ile
  uygulamadaki varsayılan kodu **karşılaştırmakla** yükümlüdür. Uygulama bunu
  kendiliğinden doğrulayamaz.
- Alan adı resmî listedeki yazımla birebir olmalıdır; kısaltma veya serbest
  çeviri kullanılmaz.

## Raporun sınırları (uygulama tarafından korunur)

1. **Rapor bilirkişi adına yazılır.** Uygulamanın adı, sürümü veya varlığı
   belgeye girmez. Bu ilke otomatik testle denetlenir.
2. **Yapılmayan işlem yazılmaz.** Ölçülmemiş büyüklük tabloya girmez;
   kontrol edilmemiş deşifre "onaylandı" sayılmaz.
3. **Hukuki değerlendirme üretilmez.** Uygulama kanaat yazmaz; sonuç bölümü
   bilirkişinin kendi metnidir.
4. **Kimlik ve montaj tespiti iddia edilmez.** Konuşmacı kimliği, sesin
   gerçekliği, montaj varlığı otomatik olarak tespit edilmez; ölçülen
   büyüklükler (perde, kanal korelasyonu, bant genişliği, kırpılma) yalnızca
   ölçüm olarak sunulur ve yorumu bilirkişiye bırakır.
5. **E-imza üretilmez, UYAP'a gönderim yapılmaz.** Belge indirilir; imza ve
   gönderim bilirkişinin kendi yetkili ortamında yapılır.
6. **Orijinal dosya değiştirilmez.** SHA-256 özeti hesaplanır ve doğrulanabilir;
   ölçümler dosyanın çalışma kopyası üzerinde yürütülür.

## Bilirkişinin doğrulaması gerekenler (uygulama yapamaz)

- Uzmanlık alanı kodunun ve adının resmî listeye uygunluğu.
- Görevlendirme kapsamının ve süresinin ara karara uygunluğu.
- Rapor tarihi, sicil numarası ve imza.
- Delil zinciri beyanının (kimden, ne zaman, hangi ortamdan teslim alındığı)
  doğruluğu — bu bilgiler uzman beyanına dayanır, uygulama tespit etmez.
- Ölçüm sonuçlarının yorumu ve teknik sınırlılıkların yazımı.

## Kaynak

- T.C. Cumhurbaşkanlığı Mevzuat Bilgi Sistemi: <https://www.mevzuat.gov.tr/>
- Adalet Bakanlığı Bilirkişilik Daire Başkanlığı: <https://bilirkisilik.adalet.gov.tr/>

Bu bağlantılar belge yazılırken erişilemedi; künye doğrulaması için kullanın.
