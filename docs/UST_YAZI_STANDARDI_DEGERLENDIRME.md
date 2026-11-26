# Üst yazı standardı — değerlendirme ve uyarlama

**Kaynak:** [`UST_YAZI_STANDARDI.md`](UST_YAZI_STANDARDI.md) (AKİS-ÜY-01 v1.0,
26.11.2026 — dışarıdan gelen öneri).
**Durum:** §2 (görsel standart) **v2.327'de UYGULANDI**; §4–§7 (dosya adları,
manifest v2, `SHA256SUMS.txt`) v2.328 adayı. Bu belge standardın kendisi değildir; **neyi alıp neyi almadığımızı** ve
**neden** aldığımızı yazar.

> **Çerçeve:** Standardın kendi notu doğru: bu bir **ürün standardıdır**, kamu
> kurumu EBYS yazışma kurallarının bilirkişiye doğrudan uygulanması değildir.
> Bu yüzden hiçbir maddesi "mevzuat zorunluluğu" diye sunulmaz; biçim referansı
> olarak kullanılır. Depo ilkesi korunur: **uydurma yok, ölçülmeyen değer
> yazılmaz, uygulama adı çıktıda geçmez.**

## 1. Zaten uyumlu olanlar (değişiklik gerekmez)

| Standart maddesi | Bizdeki durum |
|---|---|
| Üç katman (üst yazı · belge ekleri · rapor içi ekler) | v2.323–324 ile aynı |
| `EK-1` daima rapor, silinemez, sıra sabit | `normalizeLetterAnnexes` aynı kuralı uygular |
| EK numarası türetilir, boşluk/tekrar yok | `letterAnnexNumbering` |
| Rapor içi ekler `Rapor eki N` adlandırılır | v2.325'te yapıldı |
| Aynı içerik iki yerde olmaz (tek kopya) | v2.324 `sections[k]=false` + `annex` kapatma |
| Sayfa sayısı belgeye yazılmaz | v2.325: yalnız ekranda `≈ N`, panelde uyarı |
| Sahte imza izlenimi / e-imza iddiası yok | imza çizgisi dışında bir şey yok; e-imza üretilmiyor |
| Uygulama adı/sürümü/URL çıktıda yok | `rapor-tutarlilik-testi` denetler |
| ZIP + `belgeler.json` + SHA-256 | v2.325 (`akis.belgeler.v1`) |

## 2. Alınması önerilenler (v2.327 kapsamı)

| # | Madde | Neden / not |
|---|---|---|
| 1 | **Üst yazıya özgü biçim** (`case.letter.format`): Times New Roman **12 pt**, A4 dikey, 15 mm, satır aralığı 1,15, ilk satır girintisi **1,25 cm**, iki yana yaslı | Rapor biçimi kullanıcıya açık (11 pt varsayılan); üst yazı ondan bağımsız olmalı. **Rapor biçimi değişmeyecek.** |
| 2 | **`T.C.` satırı ve `Sayı:` kaldırılır**; `Dosya No:` kullanılır | Bağımsız bilirkişi yazısı kamu anteti taşımaz; `Sayı:` EBYS numarası izlenimi verir |
| 3 | **`İlgi:` alanı** (`letter.referenceText`) — boşsa satır yok | Gerçek ara karar tarih/sayısı varsa yazılır; uydurulmaz |
| 4 | **Muhatap eki bitişik**: `MAHKEMESİNE`, `BAŞSAVCILIĞINA`, `MÜDÜRLÜĞÜNE` (kesme işareti yok) | Bugün `MAHKEMESİ'NE` üretiliyor. Ünlü uyumlu ek + elle düzeltme alanı; testli |
| 5 | **Tekrar eden `Sayın Hâkimliğine` satırı kaldırılır** | Muhatap başlığı zaten var |
| 6 | **İmza bloğu**: `Ad SOYADI` (soyadı büyük), unvan, `Bilirkişilik Sicil No:`; **imza çizgisi yok** | Standart: sahte imza izlenimi üretilmez. Islak imza için ayrı görünüm seçeneği (`signatureMode`) |
| 7 | **Ek listesi `Ek:` etiketiyle**, `EK-1 – Bilirkişi Raporu` (kısa çizgi), sol hizalı, 2 boşluk girinti | Bugün `EKLER` + çift boşluk |
| 8 | **Üst yazı tarihi kendi alanı**; ilk oluşturmada **kayda yazılır**, her açılışta bugüne dönmez | Bugün boşsa rapor tarihine düşüyor (sessiz eşitleme) |
| 9 | **Dosya adları**: `UstYazi_<no>_<tarih>.udf`, `EK-01_Bilirkisi_Raporu_<no>.udf`, `EK-02_…` (iki haneli), küçük harf uzantı | Sıralama ve ayırt edilebilirlik; çakışmada `_02` soneki |
| 10 | **`belgeler.json` v2**: `format`, `annexNo`, `sequence`, `hashAlgorithm`, `appVersion` + **`SHA256SUMS.txt`** | Bugünkü manifest daha yalın; v2 geriye uyumlu biçimde genişletilir |
| 11 | **Hash üretilemezse ZIP durur** (boş sha256 ile devam etmez) | Bugün `blobSha256Hex` boş dönebiliyor; sertleştirilir |
| 12 | **Ek belgesinin ilk sayfasında sağ üstte `EK-N`** | Üst yazı listesiyle birebir eşleşme |

## 3. Kısmen alınacaklar

| Madde | Neden kısmen |
|---|---|
| "Gövde bir-iki kısa paragraf" | Varsayılan metin zaten iki paragraf; **kullanıcı metni kısıtlanmaz** (uzman kendi cümlesini yazabilmeli) |
| "İlk satır girintisi 1,25 cm" | Yalnız üst yazıda uygulanır; rapor ve ekler etkilenmez |
| "Ek listesi sığmazsa ayrı EK LİSTESİ sayfası" | Uç durum; önce ek listesinin **sarması** (depo kuralı: kırpma yok) doğrulanır, gerekirse ayrı sayfa |
| `signatureMode` (elektronik/ıslak) | Varsayılan "elektronik" = çizgi yok; ıslak imza **fiziksel çıktı** için ayrı görünüm |

## 4. Alınmayacaklar

| Madde | Neden |
|---|---|
| "Her kural mevzuat gereğidir" çerçevesi | Yönetmelik kamu kurumlarını bağlar; bağımsız bilirkişinin kendi yazısına doğrudan uygulanması savunulamaz. Belge bunu kendisi de söylüyor; sunumda da böyle kalacak |
| `file` (haricî PDF/görsel) eki | Bayt saklama + hash + UYAP uyumu ayrı iş; **desteklenmiyor** olarak yazıldı (plan belgesi güncellendi) |
| Rapor biçiminin (`case.report.format`) üst yazıyı etkilemesi | Ters yönde olmalı: üst yazı **kendi** biçimini taşır |
| Alt bilgiye sürüm/URL/debug metni | Depo kuralı: çıktıda uygulama kimliği yok |

## 5. Açık sorular (kullanıcıya)

1. **Muhatap eki**: otomatik ünlü uyumu yeterli mi, yoksa her dosyada elle mi
   yazılsın? (Öneri: otomatik + düzenlenebilir alan; üç merci türü test edilir.)
2. **İmza çizgisi**: standart "çizgi yok" diyor. Islak imza için **ayrı görünüm**
   ister misiniz, yoksa tek görünüm (çizgisiz) yeterli mi?
3. **Dosya adı tarihi**: üst yazı tarihi dosya adına girsin mi? (Standart: evet.)
4. **`EK-01` iki hane**: dosya adında iki hane, belgede tek hane (`EK-1`) —
   onaylıyor musunuz?
5. **`SHA256SUMS.txt`** ZIP'e eklensin mi? (Manifest zaten var; ikinci kontrol
   dosyası bazı kurumlarda isteniyor.)

## 6. Önerilen sıra

| Sürüm | Kapsam |
|---|---|
| **v2.326** (bu sürüm) | Ek satırı taşması düzeltildi (sayfa tahmini açılınca sağ panel bozuluyordu) + bu değerlendirme + standart `docs/`'a alındı |
| **v2.327** | Üst yazı görsel standardı: kendi biçimi (12 pt, girinti, 15 mm), `T.C.`/`Sayı:`/hitap kaldırma, `Dosya No:`/`Konu:`/`İlgi:`, imza bloğu, `Ek:` listesi, muhatap eki, tarih alanı |
| **v2.328** | Dosya adları (`EK-0N`, tarih), `belgeler.json` v2 + `SHA256SUMS.txt`, hash hatasında durma, ek belgesinde `EK-N` başlığı |
