# Çalışma Standartları

Bu belge, bilirkişinin günlük çalışmasında **tutarlılık** sağlamak için
kullandığı iç standartları tanımlar. Hukuki bir zorunluluk değildir; ekibin
kendi çalışma disiplinidir. Değiştirilecekse burada güncellenir ve sürüm notuna
yazılır.

## 1. Terimler

| Terim | Anlamı | Nerede kullanılır |
|---|---|---|
| **Bölüm** | Zaman damgalı tek kayıt satırı (teknik adı `segment`) | Arayüz + rapor |
| **Zaman penceresi** | ASR'nin 30 sn'lik teknik dilimi | Yalnız teknik açıklama |
| **Paragraf / okuma metni** | Bölümlerden türetilen, salt-okunur okuma biçimi | Görünüm + (ileride) rapor |
| **Ayrıntılı (zaman damgalı) bölüm tablosu** | Kanıt | Rapor |

Kullanıcıya ve rapora "pencere" denmez. "Granüler" yerine **"ayrıntılı /
satır satır"** denir.

## 2. Bölüm uzunluğu standardı

- Hedef: **1–3 cümle veya ~15–30 sn**.
- Tek konuşmacılı uzun monologda üst sınır **~30–45 sn**.
- **Konuşmacı değişiminde** bölüm kesilir.
- **Uzun duraklama (>1–2 sn)** veya konu değişiminde bölüm kesilir.
- **5 dakikalık tek satır yasaktır.** Zaman damgası anlamsızlaşır.
- Yöntem bölümünde bir kez yazılır: *"Bölümler, konuşmacı değişimi ve uzun
  duraklamalar esas alınarak 1–3 cümlelik parçalara ayrılmıştır."*

## 3. Birleştirme ve bölme

- Birleştirme yalnız **komşu** ve **aynı konuşmacı** bölümler arasında yapılır
  (kod farklı konuşmacıyı engeller).
- Birleştirme, modelin cümleyi ortadan böldüğü durumlarda **doğru** araçtır.
- Birleşen bölüm tek satır olur; aradaki cümle zamanı kaybolur. Bu yüzden aşırı
  birleştirme yapılmaz.
- Bölme, metni kesim noktasına göre paylaştırır; `asrText` de paylaştırılır.

## 4. Paragraf görünümü (salt okunur)

- **¶** düğmesi paragraf **görünümü** açar; bölümleri **değiştirmez**.
- Aynı konuşmacının ardışık bölümleri okuma paragrafı olarak gruplanır.
- Kanıt tablosu ve cümle zamanları aynen kalır.
- Görünümde konuşmacı, zaman aralığı, bölüm sayısı ve metin görünür.
- "Panoya kopyala" yalnız okuma metnini kopyalar; kayda yazmaz.
- **Eski yıkıcı "Paragraf oluştur" kaldırıldı.** Veriyi değiştiren bir paragraf
  işlemi yoktur.

## 5. Konuşmacı

- Uygulama **konuşmacı kimliği tespiti (diarization) yapmaz.** Etiketleri uzman
  girer.
- Kodlar (`S1`, `S2`…) **kayıt başınadır**. 1. dosyadaki S1 ile 2. dosyadaki
  S1 aynı kişi **değildir** (aksi belirtilmedikçe).
- Aynı kişi birden çok kayıtta geçiyorsa **aynı etiket adı** kullanılır ve
  rapora not düşülür: *"S1 (1. ve 2. kayıt) aynı kişi olduğu uzman kanaatidir;
  kimlik tespiti yapılmamıştır."*
- Perde ölçümü **tahmindir**; kimlik kanıtı değildir. Kayıtlar arası perde
  karşılaştırması rapora kesin kimlik olarak yazılmaz.
- Müzik, gürültü, telefon sesi **konuşmacı değildir**; gözlem/etiket olarak
  yazılır.

## 6. Gözlemler ve hızlı etiketler

Gözlem düğmeleri: **gürültü · üst üste · anlaşılmaz · müzik**.

Hızlı etiketler: `[sessizlik]`, `[anlaşılmaz]`, `[uzaktan konuşma]`,
`[gürültülü]`, `[üst üste]`, `[müzik/ses]`, `[telefonda konuşma]`.

Örnekler:
- **Uzaktan gelen kadın sesi:** `[uzaktan konuşma]` + gerekirse gözlem
  "gürültü"/"anlaşılmaz" + konuşmacı notu *"uzak/mesafeli, yankılı"*.
- **Telefon görüşmesi:** `[telefonda konuşma]`; karşı tarafın sesi duyuluyorsa
  metne yazılır, duyulmuyorsa not düşülür.
- **Sessizlik:** `[sessizlik]` etiketi + "Sessizlik ölç" sonucu.

Gözlem işaretleri rapordaki **gözlem** sütununa; hızlı etiketler **metne**
girer. İkisi farklı işe yarar, biri diğerinin yerine geçmez.

## 7. Rapor yöntemi (dürüst ve doğrulanabilir)

- Kullanılan ASR aracı açıkça yazılır: **yerel, açık kaynak Whisper tabanlı
  otomatik konuşma tanıma modeli** ve **model adı/sürümü**.
- **Konuşmacı ayrıştırma** veya **kaynak ayırma** yapılmadığı yazılır.
- Uygulamanın adı, sürümü veya varlığı rapora **girmez**; belge bilirkişi
  adına yazılır.
- Otomatik çıktının uzman tarafından dinlenerek doğrulandığı belirtilir.
- Doğrulanmamış iddia yazılmaz; ölçülmeyen büyüklük tabloya girmez.

## 8. Deterministik kurallar ve ML

**Deterministik (kural tabanlı, tekrarlanabilir):**
- Zaman kodu biçimi ve doğrulaması
- Bölme/birleştirme sınırları
- Kapsam ve zaman sorunu denetimi
- Sessizlik/seviye/perde ölçümü (DSP)
- Rapor tablolarının üretimi

**ML (model tabanlı, doğrulanması gerekir):**
- Konuşma tanıma (Whisper)
- Hiçbiri otomatik onay değildir; uzman doğrular.

**Yapılmayanlar:** konuşmacı kimlik tespiti, kaynak ayrıştırma, montaj tespiti.
Bunlar ayrı eğitilmiş modeller gerektirir; yapılmış gibi gösterilmez.

## 9. Geri alma ve yedek

- Geri alma **20 işlem** ile sınırlıdır ve **bellek içidir**.
- **Sayfa yenileme / tarayıcı kapanışı geri alma geçmişini siler.**
- Riskli toplu işlemden (yeniden çözümleme, paketten yükleme, birleştirme)
  önce **paket** alınır.
- Arşivleme veriyi silmez; kalıcı silme iki onay ister.

## 10. LLM kullanımı

- Ham ses veya ham metin LLM'e **verilmez** (uydurma ve veri koruma riski).
- LLM yalnız **doğrulanmış** metinde yardımcı olabilir: biçimlendirme, taslak
  gruplama, başlık önerisi.
- LLM çıktısı **taslaktır**; bilirkişi onayı olmadan rapora girmez.
- Yerel/çevrimdışı model tercih edilir; ses ve metin dışarı çıkmaz.
- LLM'in önerdiği her değişiklik orijinal metinle karşılaştırılır.

## 11. Değişiklik yönetimi

- Bu standartlardan biri değişirse `CHANGELOG.md` ve `AGENTS.md` güncellenir.
- Standart, kodda bir sabitle korunuyorsa (ör. `ASR_WINDOW_SECONDS`), sabit ve
  belge birlikte değiştirilir.
