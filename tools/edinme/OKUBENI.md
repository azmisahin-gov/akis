# AKİS Delil Edinme — Tier 1 (Windows)

> **Durum:** Deneysel. Bu araç **doğrulanmış adli araç değildir**. Kurgusal bir
> USB'de test edilmeden gerçek delile uygulanmamalıdır. Donanım write-blocker
> yoksa çıktı **"adli imaj" değil**, "belgelenmiş dosya kopyası"dır.

Bu araç, USB/flaş/SD içindeki ses dosyalarını kopyalar, her dosyanın
**SHA-256** özetini hesaplar ve AKİS'in okuyabileceği bir **delil paketi**
üretir. Tarayıcı USB'yi göremez; edinme burada yapılır, AKİS yalnız doğrular.

## Ne üretir?

```
AKIS_Delil_20261122_101500/
  delil.json      # cihaz, etiket, yöntem, operatör, TESLİM zinciri, dosya hash'leri
  delil.log       # adım adım kayıt
  ses/...         # kopyalanan dosyalar
AKIS_Delil_20261122_101500.zip
```

`delil.json` şeması: [`docs/DELIL_EDINME.md`](../../docs/DELIL_EDINME.md).

## Hangi dosyalar kopyalanır?

- **Varsayılan:** yalnız ses dosyaları (wav, mp3, m4a, ogg, flac, aac).
- **Tüm dosyalar:** `-IncludeAll` ekleyin. `bilgi.txt`, video vb. de kopyalanır
  ve manifestte kayıtlı kalır.
- AKİS yalnız **ses** dosyalarını materyal yapar; ses dışı dosyalar doğrulama
  penceresinde **“Ses dışı (atlandı)”** görünür.

## Aynı dosya zaten dosyada varsa?

AKİS aynı sesi **SHA-256** ile tanır. Paket mevcut dosyaya yüklenirse **yeni
kayıt açılmaz**; düzenlemeler ve onaylar korunur, edinme bilgisi mevcut kayda
işlenir. v2.211 öncesi oluşmuş kopyaları **Kaldır** ile temizleyin.

## Gereksinimler

- Windows 10/11, PowerShell 5.1+
- **Yönetici** yetkisi (`diskpart` için)
- Harici hedef klasör (kaynak sürücüde **olamaz**)

> **Operatör zorunlu:** `-Operator` verilmezse PowerShell sorar. Boş bırakılamaz.
> Operatör = edinme işlemini fiilen yapan kişi (genellikle bilirkişi).

> **Teslim eden ≠ operatör.** Teslim eden, flash'ı/kaydı bilirkişiye veren
> kişi veya kurumdur (ör. mahkeme kalemi). İkisi `delil.json` içinde **ayrı**
> alanlarda tutulur ve raporda ayrı gösterilir. Teslim alanları **isteğe
> bağlıdır**; boş bırakılırsa **uydurulmaz**.
>
> **TCKN istenmez.** Teslim edenin kimliği ad + birimle bellidir; kurum sicili
> veya kayıt numarası yeterlidir.

## SD kart / SCSI

SD kart okuyucular sık sık `BusType=SCSI` bildirir. Araç yalnız `BusType`'a
bakmaz: birim **`DriveType=Removable`** ise kabul eder. Sistem/boot diski her
durumda reddedilir. Log'da `Sürücü türü · BusType` yazılır.

## İndirme

AKİS'te **Ses → Edinme aracını indir** düğmesi bu klasörü **tek zip** olarak
indirir (`edinme.ps1`, `BASLAT.bat`, `OKUBENI.md`). Ayrıca depodan da alınabilir:
`tools/edinme/`.

## Kullanım

1. Zip'i bir klasöre açın.
2. `BASLAT.bat` → **Yönetici olarak** PowerShell açılır (sağ tık → Yönetici
   olarak çalıştır). Parametreler sorulur; boş bırakılan isteğe bağlı alan boş
   kalır.
3. İsterseniz komutu elle çalıştırın:

```powershell
.\edinme.ps1 -SourcePath E:\ -OutDir D:\delil -Operator "Ad Soyad" -Registry 1234
```

Teslim zinciriyle birlikte:

```powershell
.\edinme.ps1 -SourcePath E:\ -OutDir D:\delil -Operator "Ad Soyad" -Registry 1234 `
  -DeliveredBy "Mehmet Kaya" -DeliveredByRegistry "K-77" `
  -DeliveredAt 2026-11-21 -DeliveryPlace "Ankara 3. Sulh Ceza Mahkemesi"
```

Tüm dosyalar (yalnız ses değil):

```powershell
.\edinme.ps1 -SourcePath E:\ -OutDir D:\delil -Operator "Ad Soyad" -IncludeAll
```

4. Oluşan `.zip` dosyasını AKİS'te **Ses → Delil paketi yükle** ile açın.

## Raporda ne görünür?

| Alan | Nereden |
|---|---|
| ARAÇ | `edinme.ps1 1.0 · PowerShell` (ürün adı yazılmaz) |
| OPERATÖR | `Ad Soyad · Sicil` |
| TESLİM EDEN | `Ad Soyad · Sicil` (köken tablosu) |
| TESLİM TARİHİ / YERİ | Paketten veya elle |
| CİHAZ / SERİ | Marka-model, seri no, etiket |

Sürücü harfi (`E:`, `D:`) **rapora yazılmaz**: kanıt kimliği değildir ve işletim
sistemi değişince değişir. Harf yalnız `delil.json` teknik izinde kalır.

## Kurgusal test (gerçek delil değil)

Diskpart ve cihaz bilgisi atlanır; bir klasörden paket üretir:

```powershell
.\edinme.ps1 -SourcePath C:\test-veri -OutDir C:\test-cikti -Operator "Ad Soyad" -Simulate
```

Gerçek delilde `-Simulate` **kullanılmaz**.

## Güvenlik kuralları

1. Kaynağa **asla yazmaz**; yalnız okur.
2. Önce diski `diskpart` ile **salt-okunur** yapar; doğrulayamazsa **durur**.
3. İş bitince salt-okunurluğu kaldırır (`finally`).
4. Hedef klasör kaynak sürücüdeyse **durur**.
5. Hata olursa devam etmez.
6. Orijinali mühürleyin; kopyayla çalışın.

## Dürüst sınırlar

- **Donanım write-blocker yok.** Yazılımsal salt-okunur, donanımın yerini
  tutmaz; Windows cihazı taktığı ilk saniyelerde yazmış olabilir.
- **Tier 1**: silinmiş dosya, boş alan ve dosya sistemi metadata'sı gelmez.
  Tam DD imajı (Tier 2) ayrı bir adımdır ve henüz uygulanmadı.
- Seri no klonlanabilir; tek başına kimlik kanıtı değildir.
- Çıktı "adli imaj" diye sunulmaz; raporda **"belgelenmiş dosya kopyası"**
  olarak yazılır.

## Test edilmesi gerekenler (gerçek delilden önce)

- [ ] Kurgusal USB'de `diskpart` salt-okunur doğrulaması
- [ ] 100 MB ses dosyası kopyası + hash
- [ ] AKİS'te "doğrulandı"
- [ ] Hash elle bozulunca "uyuşmuyor"
- [ ] Pakette dosya eksikse "pakette yok"
- [ ] `finally` sonrası disk yeniden yazılabilir
