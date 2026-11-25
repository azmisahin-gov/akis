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

Gözlem düğmeleri (12, v2.314): **gürültü · üst üste · anlaşılmayan ·
duyulmuyor · müzik · telefon · sessizlik · kesinti · yankı · uzaktan/zayıf ·
bozuk ses · dil değişimi**. Tümü **“Gözlem işaretle” panelindedir** (v2.317);
etkin işaretler alt şeritte **çip** olarak görünür ve çipe tıklayınca kaldırılır.
Gözlem işaretleri raporun **GÖZLEM** sütununa ve EK-5’e yazılır.

Hızlı etiketler **metne** girer; gözlem işaretleri **raporun GÖZLEM sütununa**.
İkisi farklı işe yarar, biri diğerinin yerine geçmez.

### 6.1 Üç ayrı şey: duyulmuyor · anlaşılmaz · Anlaşılmadı

| Durum | Anlamı | Doğru yer |
|---|---|---|
| **Duyulmuyor** | Ses yok/çok kısık; kayıtta **işitilmiyor** | **Gözlem işareti** (teknik) |
| **Anlaşılmaz** | Ses **duyuluyor** ama kelimeler seçilemiyor | **Gözlem işareti** “anlaşılmayan” |
| **Anlaşılmadı** | Bölümün **kontrol durumu**: dinlendi, metin doğrulanamadı | Kontrol durumu (klavye `2`) |
| **`[sessizlik]`** | Gerçekten konuşma yok (ortam sessiz) | Metin içi etiket + gözlem “sessizlik” |

**`[belirsiz]` diye hızlı etiket YOKTUR.** “Belirsiz” bir **kontrol durumudur**
(Belirsiz okuma, klavye `4`); tek kelime şüphesinde `[şüpheli]` / `[tahmin]`
kullanılır.

### 6.2 Hızlı etiket sözlüğü (v2.316)

**Anlaşılırlık (metin):** `[şüpheli]`, `[tahmin]`, `[kesik]`

**Ortam / teknik (metin):** `[mikrofon teması]`, `[rüzgar]`, `[trafik/araç]`

**Konuşma biçimi (metin):** `[fısıltı]`, `[bağırma]`, `[gülüşme]`, `[öksürük]`,
`[ağlama]`, `[alkış]`, `[karşı taraf]`

**İçerik notu (yorum değil, belirsizlik):** `[isim belirsiz]`, `[yer belirsiz]`,
`[rakam belirsiz]`, `[tarih belirsiz]`, `[küfür]`


**Rapor anahtarı (EK-5):** “Metin işaretleri” tablosu menüdeki **18 etiketten**
(`QUICK_TAG_DEFS`), “Gözlem işaretleri” tablosu **12 bayraktan** (`OBS_DEFS`)
üretilir; anahtar ile menü ayrışmaz (v2.318).

**Gözlem işaretleri ayrı menüdedir (v2.316):** gürültü · üst üste · anlaşılmayan ·
duyulmuyor · müzik · telefon · sessizlik · kesinti · yankı · uzaktan/zayıf ·
bozuk ses · dil değişimi. Bunlar **“Gözlem işaretle”** menüsündedir ve hızlı
etiketlerde **tekrarlanmaz**. Hızlı etiket **metne** girer; gözlem işareti
**rapora** (GÖZLEM sütunu) gider.

**Kural:** Etiket **imlecin olduğu yere** eklenir (v2.239); bir kelimeyi
seçtiyseniz seçimin yerine yazılır. `label` ve metne giren değer **aynıdır**
(v2.313’te eşitlendi). Menü **gruplu ve aranabilir**; “son kullanılan” 5 etiket
üstte görünür (kayda yazılmaz).

**Hukuki yorum etiketi yoktur:** `[tehdit]`, `[ikrar]`, `[hakaret]`, `[suç]`,
`[montaj]` gibi etiketler **önerilmez**; bunlar hukuki/teknik değerlendirmedir.
Bilirkişi ifadeyi **birebir alıntılar** ve yorumunu rapor metninde yazar.

### 6.3 Örnekler

- **Uzaktan gelen kadın sesi:** `[uzaktan konuşma]` + gerekirse gözlem
  **“yankı”**/“gürültü”/“anlaşılmayan” + konuşmacı notu *“uzak/mesafeli”*.
- **Kayıtta kopma:** gözlem **“kesinti”**; içeriğin eksik olabileceği
  zaman aralığıyla birlikte yazılır.
- **Telefon görüşmesi:** `[telefon]`; karşı tarafın sesi duyuluyorsa
  `[karşı taraf]` ile işaretlenir, duyulmuyorsa not düşülür.
- **Sessizlik:** `[sessizlik]` etiketi + “Sessizlik ölç” sonucu.
- **Duyulmuyor:** `[duyulmuyor]`; bölümün tamamı işitilmiyorsa ayrıca kontrol
  durumu **Anlaşılmadı** seçilir.

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

## 12. Karar rehberi: üst üste · belirsiz · tek kelime · birleştir/böl

Bu bölüm, çalışırken en çok kararsız kalınan durumlar için **iç çalışma
rehberidir** (hukuki zorunluluk değil). Temel ayrım:

| Kavram | Tek mi / çoklu mu | Anlamı |
|---|---|---|
| **Kontrol durumu** | tek (bölüm başına) | Bilirkişinin kararı: Onaylandı · Anlaşılmadı · Yeniden dinle · Belirsiz okuma · Çözümlendi (makine) · Kontrol bekliyor |
| **Gözlem işareti** | çoklu olabilir | Ortam/içerik notu: gürültü · üst üste · anlaşılmayan · müzik · telefon · sessizlik |
| **Hızlı etiket** | metin içinde | Metne yazılan `[...]` ifadesi (imleç konumuna eklenir) |

**"Onaylandı" ne demektir?** = *"Bu bölümü dinledim ve metni (anlaşılmayan
kısımlar metinde `[anlaşılmaz]` olarak işaretli kalmak üzere) doğruladım."*
Körü körüne "doğru" demek değildir; belirsizliği gizlemez. **"Çözümlendi"
(makine)** ise onay DEĞİLDİR; dinlenmesi ve onaylanması gerekir.

### 12.1 Üst üste konuşma (çakışan konuşmalar)

- **Gözlem işareti "üst üste"** konur. Bu bir gözlemdir, kontrol durumu değildir.
- Metne **duyulan kelimeler yazılır**; ayırt edilemeyen yer `[anlaşılmaz]` ile
  işaretlenir.
- Metni dinleyip doğruladıysanız kontrol durumu **Onaylandı** olur. "Onaylandı"
  ile "üst üste" gözlemi **çelişmez**: metni doğrularsınız, çakışmayı gözlem
  olarak belirtirsiniz. (Yaygın hata: üst üste diye onaylamamak. Onay, çakışmayı
  gizlemez; yalnız metni doğrular.)
- Çakışma nedeniyle metin güvenilir değilse **Belirsiz okuma** veya **Yeniden
  dinle** kullanın.
- **Ayrım:** "üst üste" = konuşma **içeriğinin** çakışması (gözlem). "Zaman
  sorunu" = iki bölümün **sınırlarının** çakışması (zaman). İkisi farklıdır;
  ikisi de işaretlenebilir.

### 12.2 Belirsiz okuma (iki olası kelime/cümle)

- İki okuma mümkünse (ör. "geldi" / "kaldı"): kontrol durumu **Belirsiz okuma**;
  **okuma 1** ve **okuma 2** yazılır, sonra **seçilen** okuma belirlenir.
- Bu bir **gözlem değil**, ayrı bir **durumdur**. Hızlı etiketlerde "belirsiz"
  yoktur; doğrusu Belirsiz okuma durumudur (klavyeden **4**).
- Raporda **gizlenmez**: `Belirsiz okuma: "okuma1" / "okuma2" (seçilen: …)`.

### 12.3 Tek kelime kısmen anlaşılıyor / anlaşılmaz bölümde tek kelimeler

- **İki olasılık varsa** → Belirsiz okuma (12.2).
- **Hiç anlaşılmıyorsa** → metne `[anlaşılmaz]` + gözlem **"anlaşılmayan"**.
- **Bölümün büyük kısmı anlaşılmıyorsa** → kontrol durumu **Anlaşılmadı**
  (+ gözlem "anlaşılmayan"). Duyulan tek kelimeler **kanıt olarak metne**
  yazılabilir; bölüm statüsü yine "Anlaşılmadı"dır.
- **Yalnız o kelime eksik, gerisi dinlenip doğrulandıysa** → **Onaylandı**
  diyebilirsiniz; metinde `[anlaşılmaz]` işareti kalır. "Onaylandı", anlaşılmayan
  kısmı gizlemek değil, kalanı doğrulamaktır.
- **Dürüstlük kuralı:** bölüm gerçekten anlaşılmıyorsa "Onaylandı" demek
  yanıltıcıdır; **Anlaşılmadı** daha doğrudur. Emin değilseniz **Yeniden dinle**.

### 12.4 Birleştir mi, böl mü?

- **Birleştir:** model cümleyi ortadan böldüyse (komşu + aynı konuşmacı).
  Birleştirme onayı "Kontrol bekliyor"a düşürür; birleştirdikten sonra dinleyip
  onaylayın.
- **Böl:** tek bölüm **45 sn** üstündeyse (hedef 1–3 cümle / 15–30 sn).
- "İş" satırı (bölüm detayında) ve filtreler (**Birleştirme adayı**, **Uzun ·
  bölünmeli**, **Belirsiz okuma**, **Üst üste/Anlaşılmayan gözlem**) bu kararları
  tek tıkla bulmanızı sağlar.

### 12.5 Hızlı karar sırası (öneri)

1. Bölümü dinle (▶ / **Y**).
2. İki okuma varsa **Belirsiz** + seç (4).
3. Cümle ortadan bölünmüşse **Birleştir** (M / ⋮).
4. 45 sn üstündeyse **Böl** (S / ⋮).
5. Üst üste / gürültü / telefon gibi durumları **gözlem** olarak işaretle.
6. Metni doğruladıysan **Onayla** (1/Enter); anlaşılmıyorsa **Anlaşılmadı** (2);
   emin değilsen **Yeniden dinle** (3).
