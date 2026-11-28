# Metin Envanteri (uygulamadaki tüm belge metinleri)

**Üretildiği uygulama sürümü:** v2.399 (kaynaktan okunur)

Bu dosya **koddaki güncel metinleri** tek yerde toplar. Amacı hukuk danışmanlığı ve
denetimde “hangi metin, hangi belgede, hangi koşulda, kim düzenleyebilir” sorusunu
yanıtlamaktır. **Elle düzenlenmez:** `node tools/metin-envanteri.mjs` ile üretilir;
`surum-testi` güncelliğini denetler.

**Ana ilke:** Rapor, yazılımın çalışma biçimini değil **bilirkişinin yaptığı incelemeyi**
anlatır. Teknik terimler ana anlatımın zorunlu dili değildir; gerekli teknik bilgi
ölçüsünde ve gerektiğinde verilir.

## 1) Ekranda nerede?

| Ne | Yol |
|---|---|
| Kendi varsayılan metinlerim (3 metin) | Üst bar **⚙ Ayarlar** → **“Kendi varsayılan metinlerim”** |
| Bir dosyada yöntem/sınırlılık/sonuç | **Rapor** → belgede bölüme tıkla → **Bölüm düzenle** |
| Kayıtlı metinlerim (tıkla-dolsun) | Aynı panelde, alanın altındaki **“Kayıtlı metinlerim (N)”** |
| Tarafsızlık beyanı | **Rapor → Kontrol** → **“Künye: tarafsızlığı etkileyebilecek hâl beyanı”** |
| Bölüm başlıkları / sıra | **Rapor** sol iskelet: kalem · ↑↓ · aç/kapa |
| Üst yazı metni | **Rapor → Üst yazı** sekmesi |

> **Tek düzenleme yeri (v2.345):** Yöntem, sınırlılık ve sonuç metinleri **yalnız**
> Rapor görünümünde düzenlenir; İnceleme görünümünde yalnız yönlendirme vardır.

## 2) Düzenlenebilirlik ayrımı

| Katman | Ne | Nerede |
|---|---|---|
| Kod varsayılanı | Uygulamanın kendi metni | `assets/app.js` |
| Kullanıcı varsayılanı | Yeni dosyada ne gelsin | **Ayarlar** (yalnız bu tarayıcı) |
| Dosya metni | O dosyada yazılan | **Rapor → Bölüm düzenle** (dosyaya yazılır) |

Kod varsayılanı **dosyaya yazılmaz**; alan boşsa basılır. Eski dosyanın metni, varsayılan
değişince kendiliğinden değişmez.

## 3) Yöntem metni — `DEFAULT_METHOD`

- **Belge/bölüm:** Rapor · İnceleme yöntemi (s4)
- **Koşul:** Bölüm açık ve dosyada metin yoksa (varsayılan)
- **Düzenlenebilir:** Kod varsayılanı; **Ayarlar → Kendi varsayılan metinlerim**; dosya bazında **Rapor → Bölüm düzenle**.
- **Tür:** beyan/otomatik
- **Durum:** Aktif

> İnceleme kapsamında tarafıma sunulan ses kayıtlarını ayrı ayrı ele aldım. Dosyaların tanımlayıcı bilgilerini ve teknik özelliklerini kaydettim. Orijinal kayıtları koruyarak inceleme çalışmalarını bunların çalışma kopyaları üzerinde yürüttüm. Konuşma içeriklerini zaman bilgileriyle birlikte yazılı hâle getirdim. İlk metin taslağının hazırlanmasında bir yazılım desteğinden yararlandıysam, bu taslağı incelemem ve gerçekleştirdiğim kontroller doğrultusunda düzenledim. Kontrolü tamamlanmamış veya anlaşılamayan bölümleri ayrıca belirttim. Duyulmayan konuşmaları tahmin yoluyla tamamlamadım. Konuşmacı etiketlerini kayıt içindeki kişileri ayırt etmek amacıyla kullandım. İncelemeyi etkileyen teknik sınırlılıkları somut bulgular ve ilgili zaman aralıklarıyla açıkladım.
>
> Dosyalar için SHA-256 özeti hesaplanmışsa bu değer ve doğrulama durumu gösterilir; özet hesaplanmamışsa bu durum açıkça belirtilir.

## 4) Katalog metinleri (rapora/üst yazıya giren cümleler)

Her metin için belge/bölüm, koşul, düzenlenebilirlik, tür ve **durum** yazılır.
“Kullanılmıyor” metinler **silinmez**; önce doğrulanır.

### Künye / kapak

**`subtitle`**

- **Belge/bölüm:** Rapor · Künye / kapak
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> SES KAYITLARININ TEKNİK İNCELEMESİ VE KONUŞMA İÇERİĞİNİN ÇÖZÜMLENMESİ

**`defaultField`**

- **Belge/bölüm:** Rapor · Künye / kapak
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> 56.12 – Ses Kayıtlarının Metin Haline Dönüştürülmesi (Yargı mercilerince Ses ve Görüntü Bilişim Sisteminin Kullanılması Hariç)

### Kapsam, sorular, yöntem, sonuç

**`defaultScope`**

- **Belge/bölüm:** Rapor · Kapsam, sorular, yöntem, sonuç
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Görevlendirme yazısında belirtilen kapsam ve sınırlar burada açıklanır.

**`defaultQuestions`**

- **Belge/bölüm:** Rapor · Kapsam, sorular, yöntem, sonuç
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Görevlendirme yazısında bilirkişiye yöneltilen sorular, yazıdaki sırasıyla bu bölümde gösterilir.

**`defaultEvaluation`**

- **Belge/bölüm:** Rapor · Kapsam, sorular, yöntem, sonuç
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Teknik sorulara ilişkin değerlendirme, görevlendirme yazısında yer alan sorular doğrultusunda eklenir.

**`s5Intro`**

- **Belge/bölüm:** Rapor · Kapsam, sorular, yöntem, sonuç
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Her kayıt için sırasıyla: (a) kısa kayıt bilgisi, (b) o kayıtta konuşanların tablosu, (c) zaman damgalı deşifre tablosu verilir. Bu açıklama her kayıtta yinelenmez.

**`answersIntro`**

- **Belge/bölüm:** Rapor · Kapsam, sorular, yöntem, sonuç
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Görevlendirme kararındaki sorular, sorulma sırası korunarak aşağıda cevaplanmıştır. Her cevap, ilgili kayıt ve zaman aralığıyla ilişkilendirilir; cevaplanamayan sorunun nedeni açıkça yazılır. Sorular metni değiştirilmeden aktarılır.

**`limitsIntro`**

- **Belge/bölüm:** Rapor · Kapsam, sorular, yöntem, sonuç
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Aşağıda inceleme sırasında gerçekten karşılaşılan teknik sınırlılıklar açıklanmıştır. Sınırlılık yoksa bu açıkça belirtilir; ölçülmeyen değer yazılmaz ve konuşmanın anlamı bağlamdan tamamlanmaz.

**`defaultLimitations`**

- **Belge/bölüm:** Rapor · Kapsam, sorular, yöntem, sonuç
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod varsayılanı; **Ayarlar → Kendi varsayılan metinlerim** ile kullanıcı varsayılanı olur; dosya bazında **Rapor → Bölüm düzenle**.
- **Tür:** beyan/otomatik
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> İncelemede karşılaşılan teknik sınırlılıklar varsa, somut kayıt ve zaman aralıklarıyla açıklanır.

**`defaultConclusion`**

- **Belge/bölüm:** Rapor · Kapsam, sorular, yöntem, sonuç
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod varsayılanı; **Ayarlar → Kendi varsayılan metinlerim**; dosya bazında **Rapor → Bölüm düzenle**.
- **Tür:** beyan/otomatik
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Sonuç, yalnızca inceleme kapsamında tespit edilen ve gerekçelendirilen teknik bulgulara dayanılarak bilirkişi tarafından yazılır.

**`summaryIntro`**

- **Belge/bölüm:** Rapor · Kapsam, sorular, yöntem, sonuç
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Aşağıdaki özet, raporu inceleyen mercie teknik sonucu hızlıca görmesi için hazırlanmıştır; ayrıntı ve görevlendirme sorularına cevaplar ilgili bölümlerdedir. Özet ile ayrıntılı bölümler aynı veriden üretilir.

### Envanter ve kayıtlar

**`inventoryNote`**

- **Belge/bölüm:** Rapor · Envanter ve kayıtlar
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Envanterdeki biçim, kanal ve örnekleme hızı bilgileri dosya konteynerinden okunmuştur; SHA-256 özeti ise dosyanın hesaplama anındaki dijital özetidir. Bu bilgiler tek başına kaydın gerçekliğini, kayıt tarihini, kayıt tarihçesini veya montaj yapılıp yapılmadığını doğrulamaz.

**`videoAudioNote`**

- **Belge/bölüm:** Rapor · Envanter ve kayıtlar
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Kesitteki video dosyalarından yalnızca ses kanalı çözümlenmiştir; görüntü incelenmemiştir.

### Konuşmacı

**`speakerIntro`**

- **Belge/bölüm:** Rapor · Konuşmacı
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Kayıtta konuşan kişiler, bilirkişinin verdiği etiketlere göre aşağıda listelenmiştir. Etiketler ve öznitelikler bilirkişi beyanına dayanır; konuşmacı kimliği kendiliğinden tespit edilmemiştir. Perde değeri hesaplanan bir tahmindir ve kayıt koşullarına bağlıdır.

**`speakerFootnote`**

- **Belge/bölüm:** Rapor · Konuşmacı
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Süre, ilgili konuşmacının bölümlerinin toplamı; ilk–son, kayıtta duyulduğu zaman aralığıdır. Ölçülmeyen değer “—” olarak yazılır.

**`speakerVerifiedNote`**

- **Belge/bölüm:** Rapor · Konuşmacı
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Konuşmacı künyesi doğrulanmıştır (etiket/rol bilgisi bilirkişi tarafından kontrol edilmiştir). Bu, bölümlerin dinlenerek onaylandığı anlamına gelmez.

**`speakerMethodNote`**

- **Belge/bölüm:** Rapor · Konuşmacı
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Konuşmacı etiketlerinin ilk taslağında yazılım desteğinden yararlanıldıysa bu yalnızca ön gruplama içindir; nihai konuşmacı etiketleri bilirkişi değerlendirmesinin ürünüdür. Bu yöntem konuşmacı kimlik tespiti değildir.

**`speakerCodeNote`**

- **Belge/bölüm:** Rapor · Konuşmacı
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Bu raporda S kodları (S1, S2…) KAYIT İÇİ etiketlerdir: her kayıtta S1'den başlar ve kayıtlar arasında aynı kişiyi göstermez. Aynı kişi birden çok kayıtta konuşuyorsa K koduyla (K1, K2…) tek satırda gösterilir (dosyalar arası eşleştirme); bu eşleştirme bilirkişi kanaatidir; kimlik tespiti değildir.

**`speakerCodeConflict`**

- **Belge/bölüm:** Rapor · Konuşmacı
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> UYARI: Aynı konuşmacı kodu (ör. S1) birden çok kişiye verilmiş. Bu durumda kod, hangi bölümün kime ait olduğunu göstermez; rapor yayımlanmadan önce konuşmacı kodlarının düzeltilmesi önerilir.

### Köken, edinme, metadata

**`originIntro`**

- **Belge/bölüm:** Rapor · Köken, edinme, metadata
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Kayıtların hangi ortamdan geldiği, kim tarafından ve ne zaman teslim edildiği aşağıda gösterilmiştir. Bu bilgiler bilirkişi beyanına ve teslim tutanağına dayanır; ortam türü kendiliğinden tespit edilmemiştir.

**`originFileTimeNote`**

- **Belge/bölüm:** Rapor · Köken, edinme, metadata
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Ortamdaki dosya zamanları (oluşturulma/değiştirilme/erişim) yalnız edinme sırasında okunan gözlemlerdir; kayıt zamanı değildir. Kopyalama, dosya sistemi ve saat dilimi bu değerleri değiştirebilir. Kayıt cihazı ve kayıt tarihi yalnız beyan varsa yazılır; yoksa “bilinmiyor” yazar.

**`acqIntro`**

- **Belge/bölüm:** Rapor · Köken, edinme, metadata
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Aşağıdaki bilgiler, delilin alındığı cihazdan edinme aracıyla çıkarılan tutanağa dayanır. Cihaz bilgisi tutanaktaki beyandır; cihaz bu ortamda okunmaz. Dosya özetleri (SHA-256) hesaplanabildiği ölçüde yeniden hesaplanarak karşılaştırılır. "Doğrulandı" yalnız özet tutuyorsa yazılır; özet yoksa veya hesaplanamazsa "Doğrulanamadı" yazılır.

**`embeddedIntro`**

- **Belge/bölüm:** Rapor · Köken, edinme, metadata
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Aşağıdaki değerler ses dosyasına gömülü metadata bilgilerinden okunmuştur. Bu bilgiler dosyanın kendi kaydından gelir; kaynağı ve doğruluğu ayrıca doğrulanmadıkça cihaz tarafından doğrulanmış beyan olarak kabul edilmez ve tek başına kayıt zamanı kanıtı sayılmaz.

**`mediumTypes`**

- **Belge/bölüm:** Rapor · Köken, edinme, metadata
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Belirtilmedi · CD / DVD · USB flaş bellek · Taşınabilir disk · Sabit disk / imaj · E-posta eki · Bulut / ağ paylaşımı · Hafıza kartı · Telefon · Diğer

### Ölçümler (WER, seviye)

**`werIntro`**

- **Belge/bölüm:** Rapor · Ölçümler (WER, seviye)
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Aşağıdaki oranlar, referans metni bulunan kayıtlarda yazılımın ürettiği ilk metnin (bilirkişi düzeltmesinden önceki hâli) referansla karşılaştırılmasıyla hesaplanmıştır. WER (kelime hata oranı) düşük olan daha iyidir; yerine koyma, silme ve ekleme hatalarını referans kelime sayısına böler. Ölçüm, düzeltilmiş metni değil ilk metni ölçer; bu yüzden bilirkişi düzeltmeleri oranı değiştirmez. İlk metni saklanmamış eski kayıtlar ile referans metni bulunmayan kayıtlar bu tabloya girmez.

**`werNoRows`**

- **Belge/bölüm:** Rapor · Ölçümler (WER, seviye)
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Ölçüm yapılabilecek kayıt yok (referans metni ve çözümleme gerekir).

**`levelIntro`**

- **Belge/bölüm:** Rapor · Ölçümler (WER, seviye)
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Aşağıdaki değerler, kayıtların örneklerinden türetilen tahmini düzey değerleridir; kalibre edilmiş akustik ölçüm sonucu değildir. Tepe ve RMS düzeyleri dBFS (0 dBFS = tam ölçek) cinsindendir; tepe kırpılma oranı, örneklerin tam ölçek sınırına dayandığı sürenin örnek sayısına oranıdır. Gürültü tabanı ve sinyal/gürültü oranı, kısa pencerelerin RMS dağılımından okunur. Bu değerler kaydın içeriğini değil, yalnızca düzey ve kırpılma durumunu gösterir; ölçüm yapılmamış kayıt bu tabloya girmez.

### İnceleme özeti, QC, bütünlük

**`reviewSummaryIntro`**

- **Belge/bölüm:** Rapor · İnceleme özeti, QC, bütünlük
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Aşağıdaki özet, inceleme sırasında gerçekten yapılan işlemleri ve kalan eksikleri gösterir. Yapılmayan bir işlem raporda yapılmış gibi gösterilmez.

**`qcIntro`**

- **Belge/bölüm:** Rapor · İnceleme özeti, QC, bütünlük
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Aşağıdaki sayılar inceleme sırasında gerçekten yapılan işlemleri ve kalan eksikleri gösterir. Bunlar bir ONAY değil, denetim listesidir; son kararı bilirkişi verir.

**`qcNote`**

- **Belge/bölüm:** Rapor · İnceleme özeti, QC, bütünlük
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> İkinci kontrol (varsa) bilirkişi beyanıdır; boş alan "—" olarak yazılır.

**`integrityIntro`**

- **Belge/bölüm:** Rapor · İnceleme özeti, QC, bütünlük
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Orijinal dosya üzerine yazılmamıştır; inceleme, dosyanın değiştirilmeyen kopyası üzerinde yürütülmüştür. Dinleme yardımcıları (hız, filtre, kanal seçimi) kaydı değiştirmez ve deşifre metnini etkilemez. Aşağıdaki özetler, hesaplandıkları andaki içerikle karşılaştırma yapılmasına yarar.

**`integrityNote`**

- **Belge/bölüm:** Rapor · İnceleme özeti, QC, bütünlük
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> İşlem günlüğü, bu inceleme ortamında kaydedilen işlemlerin mevcut kayıtlar arasındaki tutarlılığını denetlemeye yardımcı olur. Bu kontrol tek başına kayıtların sonradan değiştirilemediğini veya işlemlerin belirtilen kişi ve zamanda gerçekleştiğini kanıtlamaz. Hesaplanan dosya özetleri ve doğrulama durumları ayrıca gösterilir. Özet hesaplanmadıysa “hesaplanmadı” yazılır; eski (hash taşımayan) günlük kayıtları “eski kayıt” olarak işaretlenir.

### Beyan, gizlilik, dayanak, otomatik çözümleme

**`scopeNoteText`**

- **Belge/bölüm:** Rapor · Beyan, gizlilik, dayanak, otomatik çözümleme
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Bu rapor 56.12 (ses kayıtlarının metin hâline dönüştürülmesi) kapsamındadır. Ayrıca ve açıkça istenip uygun uzmanlıkla görevlendirilmedikçe; konuşmacının gerçek kimliğinin ses biyometrisiyle tespiti, ses benzerliğine dayalı otomatik eşleştirme, sesin özgünlüğü/kaynağı, montaj veya tahrifat incelemesi, kayıt cihazı/ortamı tespiti ve akustik olay analizi yapılmamıştır. Raporda görülen dosyalar arası kişi eşleştirmesi (K kodları) varsa bu, bilirkişinin dinleyerek yaptığı uzman kanaatidir; kimlik tespiti değildir. Bu nitelikteki sorular ilgili başka uzmanlık alanında ayrıca değerlendirilmelidir. Bu rapor, Yargı mercilerince SEGBİS kullanılarak yapılan kayıt/tutanak işlemlerinin yerine geçmez.

**`privacyText`**

- **Belge/bölüm:** Rapor · Beyan, gizlilik, dayanak, otomatik çözümleme
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Ses içeriği ve inceleme işlemleri bu ortamda yerel olarak yürütülmüştür; kayıt harici bir hizmete yüklenmemiştir. Dosyalar ve proje verisi yerel depolamada tutulur. Kayıtta kişisel veri veya gizli bilgi bulunabileceğinden rapor ve ekleri yalnızca yetkili mercie sunulmalı; üçüncü kişilerle paylaşılmamalıdır.

**`annexLegalText`**

- **Belge/bölüm:** Ek/tutanak belgesi · Beyan, gizlilik, dayanak, otomatik çözümleme
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Yöntemsel dayanaklar dosyaya ve görevlendirme kararına göre bilirkişi tarafından değerlendirilir. Bu raporda doğrulanmamış mevzuat maddesi, standart sürümü veya künye bilgisi kullanılmamıştır. Uluslararası teknik rehberler ancak gerçekten kullanıldıysa tam başlık, sürüm ve tarihle belirtilmelidir; aksi hâlde anılmaz.

**`asrIntro`**

- **Belge/bölüm:** Rapor · Beyan, gizlilik, dayanak, otomatik çözümleme
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Konuşma içeriklerinin ilk metin taslağını hazırlarken ilgili yazılımdan yardımcı olarak yararlandım. Oluşan metni ses kayıtlarıyla karşılaştırarak incelemem kapsamında gerekli düzeltmeleri yaptım. Nihai metin ve değerlendirme kendi incelemem doğrultusunda oluşturulmuştur.

**`asrLocal`**

- **Belge/bölüm:** Rapor · Beyan, gizlilik, dayanak, otomatik çözümleme
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> İşlem, kayıt harici bir hizmete aktarılmadan bu bilgisayarda yürütülmüştür.

**`asrVerify`**

- **Belge/bölüm:** Rapor · Beyan, gizlilik, dayanak, otomatik çözümleme
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Bölümlerin kontrol durumu raporun kanıt tablosunda gösterilir; kontrolü tamamlanmamış bölümler onaylanmış sayılmaz.

**`enhanceText`**

- **Belge/bölüm:** Rapor · Beyan, gizlilik, dayanak, otomatik çözümleme
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Ses iyileştirme uygulanmamıştır; orijinal kayıt değiştirilmemiştir. Dinleme yardımcıları (hız, filtre, kanal seçimi) yalnızca dinlemeyi kolaylaştırır, kaydı değiştirmez ve deşifre metnini etkilemez. İşlenmiş bir kopya oluşturulmamıştır.

**`techIntro`**

- **Belge/bölüm:** Rapor · Beyan, gizlilik, dayanak, otomatik çözümleme
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> İncelemenin yürütüldüğü iş istasyonu, yazılım ve dinleme donanımı aşağıda bilirkişi beyanına göre gösterilmiştir. Boş alan rapora "—" olarak yazılır; uydurulmaz.

**`techNote`**

- **Belge/bölüm:** Rapor · Beyan, gizlilik, dayanak, otomatik çözümleme
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Teknik araçların adı ve sürümü yalnız fiilen kullanıldığı ölçüde yazılır; aracın dosyayı açabilmesi tek başına bilimsel doğrulama değildir.

### Okuma metni / terim

**`readingIntro`**

- **Belge/bölüm:** Rapor · Okuma metni / terim
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Aşağıdaki okuma metni, aynı konuşmacının ardışık bölümlerinden türetilmiş salt okunur bir okuma biçimidir. Ayrıntılı (zaman damgalı) bölüm tablosu ve cümle zamanları değişmez; bu bölüm yalnız okunabilirliği artırır.

**`termsIntro`**

- **Belge/bölüm:** Rapor · Okuma metni / terim
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Transkriptte en sık geçen anlamlı sözcükler (parantezdeki sayı = geçiş sayısı). Yazım tutarlılığı ve hızlı tarama içindir; bir özet ya da yorum değildir. Sıra: sıklık, eşitlikte alfabetik.

### Teslim kontrolü / beyan alanı

**`deliveryCheckNote`**

- **Belge/bölüm:** Rapor · Teslim kontrolü / beyan alanı
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Bu tablo teslimden önce otomatik denetimdir; elle işaretlenen satır yoktur. "Eksik" satırının teslimden önce gözden geçirilmesi önerilir. "Bilgi" satırı eksik değildir: alan isteğe bağlıdır ya da ölçüm yapılamamıştır.

**`impartialityHint`**

- **Belge/bölüm:** Rapor · Teslim kontrolü / beyan alanı
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (panel ipucu).
- **Tür:** arayüz
- **Durum:** Aktif

> Bu alan taahhüt değil BEYANdır: tarafsızlığı/bağımsızlığı etkileyebilecek bir hâl yoksa “engel bulunmadığı”, varsa açıklama ve bildirilen merci yazılır. Boş bırakılırsa rapora satır basılmaz.

**`impartialityTemplate`**

- **Belge/bölüm:** Rapor · Teslim kontrolü / beyan alanı
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti; beyan alanındaki **“Engel bulunmadığını yaz”** düğmesi yazar.
- **Tür:** beyan
- **Durum:** Aktif

> Tarafsızlığı ve bağımsızlığı etkileyebilecek bir hâl bulunmamaktadır.

### Uyarılar

**`warnLanguage`**

- **Belge/bölüm:** Rapor · Uyarılar
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> En az bir kaydın transkriptinde dil tutarsızlığı olasılığı bulundu.

**`warnHallucination`**

- **Belge/bölüm:** Rapor · Uyarılar
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Bazı bölümlerde konuşma içeriğini güvenilir biçimde belirlemeye elverişli olmayan metinler bulunmaktadır. Bu bölümler ses kaydı üzerinden ayrıca değerlendirilmelidir. Duyulmayan veya anlaşılamayan içerik tahmin yoluyla tamamlanmamıştır.

### Fizikî dosya (tutanak metinleri)

**`physicalAnnexEmpty`**

- **Belge/bölüm:** Ek/tutanak belgesi · Fizikî dosya (tutanak metinleri)
- **Koşul:** Ek/tutanak açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif · tutanak/ek belgesi

> Fizikî dosya teslim ve iade kaydı girilmemiştir. Dosya yalnız elektronik (UYAP) erişimle incelendiyse bu bölüm boş kalır; bu bir eksiklik değildir.

**`physicalIntro`**

- **Belge/bölüm:** Ek/tutanak belgesi · Fizikî dosya (tutanak metinleri)
- **Koşul:** Ek/tutanak açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif · tutanak/ek belgesi

> Aşağıdaki kayıt, bilirkişiye fizikî olarak teslim edilen dava dosyası ve materyaller ile inceleme sonunda yapılan iadeyi gösterir. Dosya içeriği tek tek sayılmadıysa bu durum açıkça yazılır; sayılmadığı hâlde sayılmış gibi gösterilmez. Materyallerin içeriği bu bölümün kapsamı dışındadır.

**`physicalMissingWarning`**

- **Belge/bölüm:** Ek/tutanak belgesi · Fizikî dosya (tutanak metinleri)
- **Koşul:** Ek/tutanak açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif · tutanak/ek belgesi

> UYARI: Teslim alınan materyallerden biri veya birkaçı iade edilmemiş olarak kayıtlıdır. İade işlemi tamamlanmış sayılmaz.

**`physicalNoIndexWarning`**

- **Belge/bölüm:** Ek/tutanak belgesi · Fizikî dosya (tutanak metinleri)
- **Koşul:** Ek/tutanak açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif · tutanak/ek belgesi

> Dizi pusulası teslim edilmediği kaydedilmiştir. Bilirkişi dosya içeriğini tek tek saymamıştır. Mahkemece ayrıca sayım yapılıp yapılmadığı bu kayıttan anlaşılamamaktadır.

**`physicalSignatureNote`**

- **Belge/bölüm:** Ek/tutanak belgesi · Fizikî dosya (tutanak metinleri)
- **Koşul:** Ek/tutanak açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif · tutanak/ek belgesi

> İmza, nüsha sayısı ve teslim yöntemi ilgili merciin yerleşik işleyişine ve somut işlem koşullarına göre belirlenir. Elektronik imza üretilmez; imzalı nüshanın taranmış kopyası dosyaya eklenebilir.

### Diğer uzun metinler

**`inventoryPointer`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Dosyaların biçim, boyut, süre, kanal, örnekleme hızı ve SHA-256 bilgileri ayrı “Dosya teknik envanteri” bölümündedir.

**`custodyLogIntro`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Bu inceleme ortamında kaydedilen işlemlerin günlüğü aşağıdadır.

**`notationKeyIntro`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Raporda kullanılan konuşmacı kodları, metin işaretleri ve gözlem işaretlerinin anlamları aşağıdadır.

**`attachmentsText`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Bu bölüm yalnız eklerin listesini verir; ek içerikleri EKLER bölümündedir.

**`inventoryHeaders`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> DOSYA ADI · DOSYA BİÇİMİ · DOSYA BOYUTU · SÜRE · SES KANALI · ÖRNEKLEME HIZI · SHA-256

**`speakerHeaders`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> KOD · ETİKET · KAYIT · ROL · CİNSİYET · YAŞ ARALIĞI · ÖLÇÜLEN PERDE · BÖLÜM / NOT

**`obsLabels`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> noise: arka plan gürültüsü; overlap: üst üste konuşma; inaudible: anlaşılmaz bölüm; music: müzik/ses efekti; phone: telefon görüşmesi; noSpeech: sessizlik (konuşma yok); echo: yankı / oda akustiği; dropout: kesinti / kopukluk; notAudible: duyulmuyor (ses yok/kısık); distance: uzaktan/zayıf konuşma; distortion: bozuk ses / artefakt; foreignLanguage: dil değişimi (farklı dil/lehçe)

**`segmentHeadersObs`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> ZAMAN ARALIĞI · KONUŞMACI KODU · KONUŞMACI ETİKETİ · ÇÖZÜMLENEN KONUŞMA · KONTROL DURUMU · GÖZLEM

**`levelHeaders`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> KAYIT · TEPE (dBFS) · RMS (dBFS) · TEPE KIRPILMA · GÜRÜLTÜ TABANI · SİNYAL / GÜRÜLTÜ · EK ÖLÇÜMLER

**`originHeaders`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> KAYIT · ORTAM TÜRÜ · ORTAM ETİKETİ · TESLİM EDEN · TESLİM TARİHİ · TESLİM YERİ · KAYIT CİHAZI · KAYIT TARİHİ

**`acqHeaders`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> KAYIT · CİHAZ · ETİKET · SERİ NO · YÖNTEM · ARAÇ · OPERATÖR · ALINMA · DOĞRULAMA

**`reviewSummaryNote`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> Uzman denetiminden geçen = onaylanan + anlaşılmadı işaretlenen bölümler.

**`segmentHeaders`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> ZAMAN ARALIĞI · KONUŞMACI KODU · KONUŞMACI ETİKETİ · ÇÖZÜMLENEN KONUŞMA · KONTROL DURUMU

**`asrNone`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli

> Bu dosyada yazılım desteğiyle elde edilmiş bir metin kaydı bulunmamaktadır.

**`physicalItemHeaders`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> SIRA · TÜR · MARKA / ETİKET · SERİ NO · MÜHÜR / AMBALAJ · TESLİM DURUMU · İLGİLİ · İADE

**`physicalDocKinds`**

- **Belge/bölüm:** Rapor · Diğer uzun metinler
- **Koşul:** Bölüm açıksa
- **Düzenlenebilir:** Kod sabiti (dosya bazında düzenlenemez).
- **Tür:** otomatik açıklama
- **Durum:** Aktif

> index: Dizi pusulası; handover: Teslim tutanağı; return: İade tutanağı; other: Diğer

## 5) Üst yazı metinleri (`LETTER_TEXT`)

**`subject`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> Bilirkişi Raporunun Sunulması

**`closing`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> Bilgilerinize arz ederim.

**`annexHeading`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> Ek:

**`signerTitle`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> Bilirkişi

**`registryLabel`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> Bilirkişilik Sicil No:

**`fileNoLabel`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> Dosya No:

**`subjectLabel`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> Konu:

**`referenceLabel`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> İlgi:

**`reportAnnexLabel`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> Bilirkişi Raporu

**`defaultSectionsLabel`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> Teknik Bilgiler

**`fallbackAnnexLabel`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> Ek

**`referenceFromAssignment`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> —

**`missing`**

- **Belge:** Üst yazı
- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**
- **Tür:** otomatik/koşullu
- **Durum:** Aktif

> court: Mahkeme adı girilmedi — üst yazı yazılamaz.; fileNo: Dosya numarası girilmedi — üst yazı yazılamaz.; expert: Bilirkişi adı girilmedi — üst yazı yazılamaz.

## 6) Gömülü metinler (katalogda değil, üretici içinde)

Rapor/üst yazı/tutanak üreticilerinde **doğrudan yazılmış** cümleler; katalog
sabitlerinden gelmediği için gözden kaçabilir. Tarama bunu engeller.

| Üretici | Satır | Tür | Metin (kısaltıldı) |
|---|---|---|---|
| `letterDefaultBody` | 17861 | belge metni | İncelemeye ilişkin teknik destek belgeleri EK-2 ve devamındaki eklerde sunulmuştur. |
| `letterPaperHtml` | 17936 | belge metni | Bu alanları Dosya bilgileri çekmecesinden tamamlayın; eksik bilgiyle üst yazı üretilmez. |
| `renderReport` | 18634 | parça (dinamik) | gün önce geçti; rapor gecikmeli teslim ediliyor. |
| `renderReport` | 18645 | parça (dinamik) | kaydın teslim bilgisi (ortam türü/teslim eden) girilmedi; raporda "—" olarak görünecek. |
| `renderReport` | 18651 | parça (dinamik) | kaydın delil günlüğünde zincir kırığı var; günlük sonradan değiştirilmiş olabilir. |
| `renderReport` | 18654 | parça (dinamik) | deşifre bölümü henüz uzman tarafından kontrol edilmedi. |
| `renderReport` | 18657 | parça (dinamik) | bölüm "anlaşılmadı" olarak işaretlendi; bu bölümler için metin iddia edilmemelidir. |
| `renderReport` | 18661 | parça (dinamik) | deşifre bölümünde anlamlı metin yok (dolgu/boş). |
| `renderReport` | 18663 | parça (dinamik) | deşifre bölümünde model tekrarı olasılığı var; kaydı dinleyerek doğrulayın. |
| `renderReport` | 18671 | parça (dinamik) | önerilen 1–3 cümle veya 15–30 sn, üst sınır 45 sn. |
| `makeDocx` | 19884 | hata/arayüz | DOCX oluşturma bileşeni yüklenemedi. İnternet bağlantısını kontrol edin. |
| `udfDocument` | 20033 | hata/arayüz | UDF oluşturma bileşeni yüklenemedi. Sayfayı yenileyip tekrar deneyin. |
| `udfDocument` | 20036 | hata/arayüz | Boş UYAP UDF şablonu bulunamadı. templates/BOS.udf dosyasını kontrol edin. |
| `udfDocument` | 20041 | belge metni | Boş UYAP UDF şablonunun sayfa veya stil tanımları okunamadı. |
| `udfDocument` | 20802 | hata/arayüz | UDF XML yapısı doğrulanamadı; çıktı oluşturulmadı. |
| `udfDocument` | 20815 | hata/arayüz | Üst yazı UDF oluşturuldu. UYAP Editöründe son görünümü kontrol edin. |
| `udfDocument` | 20816 | hata/arayüz | UDF raporu oluşturuldu. UYAP Editöründe son görünümü kontrol edin. |

## 7) Kısa etiket ve başlıklar (60 karakterden kısa)

Hukuki cümle değil; sütun adı/boş durum metni gibi **etiketler**.

| Anahtar | Değer |
|---|---|
| `synthetic` | KURGUSAL TEST MATERYALİDİR · RESMÎ BELGE DEĞİLDİR |
| `tocHeading` | İÇİNDEKİLER |
| `readingHeading` | OKUMA METNİ |
| `emptyCourt` | ……………………………… MAHKEMESİ |
| `emptyFileNo` | — |
| `defaultQuestion` | Soru metni girilmemiştir. |
| `defaultAnswer` | Bu soruya ilişkin teknik cevap henüz girilmemiştir. |
| `defaultBasis` | Belirtilmemiş |
| `defaultExpert` | BİLİRKİŞİ |
| `toplineField` | UZMANLIK ALANI · |
| `expertFieldHeading` | UZMANLIK ALANI |
| `expertTitleHeading` | BİLİRKİŞİ UNVANI |
| `defaultTitle` | Bilirkişi |
| `defaultInventoryIntro` | İncelemeye sunulan dijital ses materyalleri aşağıdadır. |
| `fileInventoryIntro` | İncelemeye sunulan dosyaların teknik envanteri aşağıdadır. |
| `noMaterials` | İncelemeye sunulan ses kaydı bulunmamaktadır. |
| `codecFallback` | Ses dosyası |
| `segmentCountLabel` | Deşifre bölümü |
| `noTranscript` | Bu kayıt için henüz deşifre metni oluşturulmamıştır. |
| `noColumns` | Bu tablo için alan seçilmedi. |
| `noAttachments` | Ek listesi boş: EKLER bölümü kapalı veya ek yok. |
| `annexIntro` | Raporun denetlenebilirliği için sunulan ekler aşağıdadır. |
| `noSpeakerText` | Konuşmacı etiketi girilmemiştir. |
| `spectrogramLabel` | Spektrogram incelendi |
| `werHeading` | KELİME HATA ORANI ÖLÇÜMÜ (WER) |
| `werHeaders` | KAYIT · MODEL · REFERANS KELİME · ÇIKTI KELİME · HATA · WER |
| `levelHeading` | SES SEVİYESİ VE KIRPILMA ÖLÇÜMÜ |
| `rsLevel` | Seviyesi ölçülen kayıt |
| `originHeading` | KAYIT KÖKENİ VE TESLİM ZİNCİRİ |
| `originUnknown` | bilinmiyor |
| `originEmpty` | — |
| `acqHeading` | DELİL EDİNME VE DOĞRULAMA |
| `embeddedHeading` | DOSYAYA GÖMÜLÜ BİLGİLER (CİHAZ BEYANI) |
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
| `noInventoryRow` | İncelemeye sunulan ses kaydı bulunmamaktadır. |
| `summaryHeading` | RAPORUN KISA ÖZETİ |
| `enhanceHeading` | SES İYİLEŞTİRME / FİLTRELEME İŞLEMLERİ |
| `asrHeading` | KONUŞMANIN METNE DÖNÜŞTÜRÜLMESİ YÖNTEMİ |
| `asrHeaders` | KAYIT · KULLANILAN YAZILIM · ÇÖZÜMLEME ZAMANI |
| `scopeNoteHeading` | GÖREV ALANI DIŞINDA KALAN KONULAR VE SINIRLILIK BEYANI |
| `privacyHeading` | KİŞİSEL VERİ, GİZLİLİK VE BİLGİ GÜVENLİĞİ |
| `annexHeading` | EKLER |
| `annexNoLog` | Kayıtlı işlem günlüğü yok. |
| `annexNoInventory` | Teknik envanter kaydı yok. |
| `techHeading` | TEKNİK ÖZELLİKLER VE İNCELEME ORTAMI |
| `techEmpty` | Teknik ortam bilgisi girilmedi. |
| `qcHeading` | KALİTE KONTROLÜ VE DENETLENEBİLİRLİK |
| `limitsMeasuredPrefix` | Bölüm işaretlerinden ölçülen: |
| `integrityHeaders` | KAYIT · SHA-256 · DOĞRULAMA · DELİL GÜNLÜĞÜ |
| `integrityNoHash` | hesaplanmadı |
| `integrityNotVerified` | Doğrulanmadı |
| `recordSpeakersPrefix` | Bu kaydın konuşmacıları: |
| `recordSpeakersHeading` | Konuşmacılar (bu kayıt) |
| `recordTranscriptHeading` | Deşifre (zaman damgalı) |
| `speakerDurationHeading` | KONUŞMACI SÜRELERİ |
| `speakerDurationHeaders` | KOD · ETİKET · KAYIT · BÖLÜM · SÜRE · İLK – SON |
| `speakerVerifiedSuffix` | doğrulandı |
| `speakerRecordLegendPrefix` | KAYIT NUMARALARI |
| `ambiguousNotePrefix` | Belirsiz okumalar |
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

## 8) Arayüz / yardım metinleri (rapora girmez)

Buton, ipucu, uyarı ve sürüm notları rapor metni değildir: `index.html` (yardım
penceresi) ve `assets/app.js` → `VERSION_NOTICES` içinde tutulur. Bu envanterin
kapsamı **belge çıktısıdır**.

## 9) Danışmana sorulacaklar

Aşağıdakiler **hukuki/etik beyan** niteliğinde; metin değişikliğinden önce netleşmeli:

1. `DEFAULT_METHOD` — yapılan/yapılmayan işi anlatan yöntem paragrafı.
2. `scopeNoteText` — 56.12 kapsamı ve yapılmayan incelemeler.
3. `annexLegalText` — **kullanılan dayanakların künyesi**: metin, doğrulanmamış mevzuat/standart atfı kullanılmamasını söyler; danışmana soru, gerçekten kullanılan rehber/standart varsa tam künyesinin (başlık, sürüm, tarih) ne olacağıdır.
4. `privacyText` — kişisel veri/gizlilik sınırı.
5. Otomatik çözümleme metinleri (`asrIntro`, `asrLocal`, `asrVerify`) — bilirkişi anlatımıyla sadeleştirme ve gerçek kontrol durumuna bağlama.
6. `impartialityTemplate` / beyan alanı — tarafsızlığı etkileyebilecek hâl.
7. `defaultLimitations`, `defaultConclusion` — sınırlılık ve sonuç çerçevesi.
8. `integrityNote` — işlem günlüğü ve hash iddialarının sınırı.

> **Not:** Uygulama hukuki görüş üretmez; bu metinler bilirkişinin beyanı/teknik
> açıklamasıdır. Mevzuat maddesi ve uzmanlık alanı künyesi **doğrulanmadan** yazılmaz.
