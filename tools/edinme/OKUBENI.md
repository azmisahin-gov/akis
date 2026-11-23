# Edinim 1.2 — Delil Edinme (Windows, Tier 1)

> **Durum:** Deneysel. Bu araç **doğrulanmış adli araç değildir**. Kurgusal bir
> USB'de test edilmeden gerçek delile uygulanmamalıdır. Donanım write-blocker
> yoksa çıktı **"adli imaj" değil**, "belgelenmiş dosya kopyası"dır.

Bu araç, USB/flaş/SD içindeki dosyaları kopyalar, her dosyanın **SHA-256**
özetini hesaplar ve AKİS'in okuyabileceği bir **delil paketi** üretir.
Tarayıcı USB'yi göremez; edinme burada yapılır, AKİS yalnız doğrular.

## Hızlı başlangıç (soru-cevap)

1. Zip'i bir klasöre açın. **Eski zip'i kullanmayın**; v2.214 öncesi zip'te
   betiğin UTF-8 işareti kayboluyordu ve PowerShell 5.1 sözdizimi hatası veriyordu.
   Aracı AKİS'ten yeniden indirin.
2. **`BASLAT.bat`** dosyasına **sağ tık → Yönetici olarak çalıştır**.
3. Soruları yanıtlayın: kaynak, hedef, operatör, teslim zinciri.
4. Özet ekranında **E** (evet) deyin.
5. Oluşan `.zip` dosyasını AKİS'te **Ses → Delil paketi yükle** ile açın.

Sürücüyü **`E`**, **`E:`** veya **`E:\`** diye yazabilirsiniz; üçü de aynıdır.
Hedef klasör kaynak sürücüde olamaz (ör. kaynak `E`, hedef `E:\yedek` → durur).

## Ne üretir?

```
Edinim_20261122_101500/
  delil.json      # cihaz, etiket, yöntem, operatör, teslim zinciri, hash'ler
  disk.json       # disk/bölüm/birim özeti + dizin ağacı (raw sektör YOK)
  delil.log       # adım adım kayıt
  icerik/
    4C530001/     # cihaz kökü: SERİ NO (yoksa etiket, yoksa model)
      DCIM/Voice/001.mp3   # KAYNAKTAKİ yol BİREBİR korunur
      Music/album/02.flac
Edinim_20261122_101500.zip
```

- **Yapay `ses/` klasörü yoktur.** Dosyalar cihazdaki dizin yapısıyla kopyalanır.
- `delil.json` içinde her dosya için iki yol vardır:
  - `relPath` — **kaynak cihazdaki** yol (ör. `DCIM/Voice/001.mp3`)
  - `packagePath` — **paket içindeki** yol (ör. `icerik/4C530001/DCIM/Voice/001.mp3`)
- **`disk.json`** disk numarası, bölüm tablosu (offset/boyut/tür), birim bilgisi
  (dosya sistemi, etiket, birim seri no) ve dizin listesini taşır. **Raw sektör,
  boş alan veya silinmiş veri içermez**; bu bir imaj değildir.

`delil.json` şeması: [`docs/DELIL_EDINME.md`](../../docs/DELIL_EDINME.md).

## Hangi dosyalar kopyalanır?

- **Varsayılan: TÜM dosyalar.** Disk/flash yapısı birebir korunur; `bilgi.txt`,
  video, belge vb. de kopyalanır ve manifestte kayıtlı kalır.
- **Yalnız ses:** `-AudioOnly` ekleyin (wav, mp3, m4a, ogg, flac, aac).
  `-IncludeAll` geriye uyumluluk için kabul edilir (varsayılan zaten tümü).
- AKİS yalnız **ses** dosyalarını materyal yapar; ses dışı dosyalar doğrulama
  penceresinde **“Ses dışı (atlandı)”** görünür.

## Operatör ≠ teslim eden

| Alan | Kim | Zorunlu |
|---|---|---|
| **Operatör** | Edinmeyi fiilen yapan (genellikle bilirkişi) | **Evet** |
| **Teslim eden** | Kaydı/flash'ı size veren kişi/kurum (ör. mahkeme kalemi) | Hayır |
| Teslim eden sicili / kayıt no | Kurum sicili veya kayıt no | Hayır |
| Teslim tarihi / yeri | Ör. 2026-11-21 · Ankara 3. Sulh Ceza Mahkemesi | Hayır |

- **TCKN istenmez.** Kurum sicili veya kayıt numarası yeterlidir.
- Boş bırakılan alan **uydurulmaz**; raporda “—” veya “bilinmiyor” görünür.
- Bu bilgiler raporda **ayrı** gösterilir.

## Aynı dosya zaten dosyada varsa?

AKİS aynı sesi **SHA-256** ile tanır. Paket mevcut dosyaya yüklenirse **yeni
kayıt açılmaz**; düzenlemeler ve onaylar korunur. **Yalnız boş alanlar**
doldurulur (teslim bilgisi dahil); elle girdiğiniz değer **ezilmez**.

## Gereksinimler

- Windows 10/11, PowerShell 5.1+
- **Yönetici** yetkisi (`diskpart` için)
- Harici hedef klasör (kaynak sürücüde **olamaz**)

## SD kart / SCSI

SD kart okuyucular sık sık `BusType=SCSI` bildirir. Araç yalnız `BusType`'a
bakmaz: birim **`DriveType=Removable`** ise kabul eder. Sistem/boot diski her
durumda reddedilir. Log'da `Sürücü türü · BusType` yazılır.

## Elle kullanım (parametrelerle)

```powershell
.\edinme.ps1 -SourcePath E -OutDir D:\delil -Operator "Ad Soyad" -Registry 1234
```

Teslim zinciriyle birlikte:

```powershell
.\edinme.ps1 -SourcePath E -OutDir D:\delil -Operator "Ad Soyad" -Registry 1234 `
  -DeliveredBy "Mehmet Kaya" -DeliveredByRegistry "K-77" `
  -DeliveredAt 2026-11-21 -DeliveryPlace "Ankara 3. Sulh Ceza Mahkemesi"
```

Tüm dosyalar (yalnız ses değil):

```powershell
.\edinme.ps1 -SourcePath E -OutDir D:\delil -Operator "Ad Soyad" -IncludeAll
```

Soruları atlamak için `-NonInteractive` (zorunlu alan boşsa hata verir).

## Kurgusal test (gerçek delil değil)

Diskpart ve cihaz bilgisi atlanır; bir klasörden paket üretir:

```powershell
.\edinme.ps1 -SourcePath C:\test-veri -OutDir C:\test-cikti -Operator "Ad Soyad" -Simulate
```

Gerçek delilde `-Simulate` **kullanılmaz**.

## Raporda ne görünür?

| Alan | Nereden |
|---|---|
| ARAÇ | `Edinim v1.2` (ürün adı yazılmaz) |
| OPERATÖR | `Ad Soyad · Sicil` |
| TESLİM EDEN | `Ad Soyad · Sicil` (köken tablosu) |
| TESLİM TARİHİ / YERİ | Paketten veya elle |
| CİHAZ / ETİKET / SERİ | Marka-model, birim etiketi, seri no |
| KAYIT CİHAZI / KAYIT TARİHİ | Dosya metadata'sından okunamazsa **bilinmiyor**; uzman girer |

Sürücü harfi (`E:`, `D:`) **rapora yazılmaz**: kanıt kimliği değildir ve işletim
sistemi değişince değişir. Harf yalnız `delil.json` teknik izinde kalır.

## Güvenlik kuralları

1. Kaynağa **asla yazmaz**; yalnız okur.
2. Önce diski `diskpart` ile **salt-okunur** yapar; doğrulayamazsa **durur**.
3. İş bitince salt-okunurluğu kaldırır (`finally`).
4. Hedef klasör kaynak sürücüdeyse **durur**.
5. Hata olursa devam etmez; `İŞLEM DURDURULDU` yazar.
6. Orijinali mühürleyin; kopyayla çalışın.

## Dürüst sınırlar

- **Donanım write-blocker yok.** Yazılımsal salt-okunur, donanımın yerini
  tutmaz; Windows cihazı taktığı ilk saniyelerde yazmış olabilir.
- **Tier 1**: silinmiş dosya, boş alan ve dosya sistemi metadata'sı gelmez.
  Tam DD imajı (Tier 2) ayrı bir adımdır ve henüz uygulanmadı.
- Seri no klonlanabilir; tek başına kimlik kanıtı değildir.
- Çıktı "adli imaj" diye sunulmaz; raporda **"belgelenmiş dosya kopyası"**
  olarak yazılır.
- Ses dosyasının metadata'sından **kayıt cihazı** güvenilir biçimde okunamaz;
  bilinmiyorsa raporda “bilinmiyor” yazar.

## Test edilmesi gerekenler (gerçek delilden önce)

- [ ] Kurgusal USB'de `diskpart` salt-okunur doğrulaması
- [ ] 100 MB ses dosyası kopyası + hash
- [ ] AKİS'te "doğrulandı"
- [ ] Hash elle bozulunca "uyuşmuyor"
- [ ] Pakette dosya eksikse "pakette yok"
- [ ] `finally` sonrası disk yeniden yazılabilir
- [ ] Sürücü `E` (iki noktasız) yazıldığında çalışır
