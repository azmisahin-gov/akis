# Delil Edinme Standardı — Tier 1 uygulandı

> **Durum:** **Tier 1 uygulandı (v2.208).** Tier 2 (tam DD imajı) hâlâ
> öneridir ve uygulanmamıştır. Tier 1 çıktısı "adli imaj" değil,
> "belgelenmiş dosya kopyası"dır.
>
> **Güncel sürüm:** v2.213.

## 0. v2.209 düzeltmeleri (kullanıcı geri bildirimi)

- **SD/SCSI:** SD kart okuyucular `BusType=SCSI` bildirebilir. Birim
  `DriveType=Removable` ise kabul edilir; sistem/boot diski **reddedilir**.
- **`-Operator` zorunlu:** boş operatörle paket oluşmaz.
- **ZIP:** `Compress-Archive` yerine **.NET `ZipFile`** kullanılır; modül
  bağımlılığı yoktur.
- **`files` dizisi:** `$entries.ToArray()`; PowerShell 7.7'de görülen
  `Bağımsız değişken türleri eşleşmiyor` hatası giderildi.
- **Konsol UTF-8:** `chcp 65001` + `[Console]::OutputEncoding`.
- **`device.removable`:** manifest alanı; AKİS'te SCSI+removable → `usb`,
  SD/MMC → `memory_card`.

## 1. Amaç ve kapsam

56.12 (ses ve görüntü inceleme) kapsamında gelen delilin:

- **değiştirilmeden** alınması,
- **parmak izinin (SHA-256)** kaydedilmesi,
- **kim, ne zaman, hangi araçla** aldığının belgelenmesi,
- AKİS'e alındığında **yeniden doğrulanması**.

AKİS **cihazı edinmez**. Edinme ayrı bir araçla yapılır; AKİS alınan paketi
doğrular, gösterir ve rapora yazar. Bu ayrım, uygulamanın "sunucu yok /
tarayıcıda çalışır" ilkesini bozmaz.

## 2. Temel kavramlar

| Kavram | Anlamı |
|---|---|
| **Mantıksal kopya** | Yalnız erişilebilen dosyalar. Silinmiş veri, boş alan, dosya sistemi yapısı gelmez. |
| **Kullanılan blok imajı** | Dosya sisteminin ayrılmış blokları + metadata. Boş alan gelmez; dosya sistemine bağımlıdır. |
| **Tam imaj (DD/E01)** | Aygıtın tüm sektörleri. Silinmiş veri ve boş alan da içinde. |
| **SHA-256** | Dijital parmak izi. Tek bit değişse değer değişir. |
| **Write-blocker** | Yazmayı engelleyen donanım veya yazılım. Donanım, adli bakımdan referanstır. |
| **Zincir (chain of custody)** | Kim, ne zaman, nereden, hangi araçla, hangi hash ile aldı/teslim etti. |

## 3. İki kademeli standart

| | **Tier 1** | **Tier 2** |
|---|---|---|
| Yöntem | Yazılımsal salt-okunur + mantıksal dosya kopyası | Tam DD imajı (+ sıkıştırma) |
| Ne kapsar | Ses dosyaları + metadata | Tüm sektörler, silinmiş veri, boş alan |
| Boyut | Kullanılan dosya kadar | Aygıt kapasitesi (sıkıştırınca küçülebilir) |
| Silinmiş veri | ❌ | ✅ |
| Risk | Düşük | Orta (raw disk okuma) |
| 56.12 için | **Varsayılan** | Gerekirse |

**Kural:** Tier 1 çıktısı **"imaj" değildir**; "belgelenmiş dosya kopyası"dır.
Raporda böyle yazılır. Tier 2 ancak kurgusal USB'de test edildikten sonra
gerçek delile uygulanır.

## 4. `delil.json` şeması (v1 önerisi)

```json
{
  "schema": "akis.delil.v1",
  "acquiredAt": "2026-11-22T10:15:00+03:00",
  "operator": {
    "name": "Ad Soyad",
    "registry": "Sicil No",
    "organization": "Kurum"
  },
  "delivery": {
    "deliveredBy": "Teslim eden ad / birim",
    "registry": "Sicil veya kayıt no (varsa)",
    "deliveredAt": "2026-11-21",
    "place": "Ankara 3. Sulh Ceza Mahkemesi"
  },
  "device": {
    "busType": "USB",
    "model": "SanDisk Cruzer",
    "serial": "4C530001…",
    "label": "DELIL-7",
    "sizeBytes": 16000000000,
    "volumes": ["E:"]
  },
  "method": {
    "readOnly": "diskpart attributes disk set readonly",
    "hardwareWriteBlocker": false,
    "copyType": "logical-file-copy",
    "image": null,
    "tool": { "name": "Edinim", "version": "1.2", "engine": "PowerShell" }
  },
  "files": [
    {
      "name": "kayit.wav",
      "relPath": "ses/kayit.wav",
      "sizeBytes": 123456,
      "sha256": "…",
      "modifiedAt": "2026-11-20T09:30:00+03:00"
    }
  ],
  "notes": "Donanım write-blocker kullanılmadı; disk yazılımsal olarak salt-okunur yapıldı."
}
```

**Teslim zinciri (v2.212):** `delivery` bloğu **isteğe bağlıdır**; alanlar boş
bırakılabilir ve **uydurulmaz**. `deliveredBy` = flash'ı bilirkişiye veren
kişi/kurum; `operator` = edinmeyi fiilen yapan kişi. İkisi aynı değildir.
`registry` bir **sicil/kayıt no**dur; **TCKN istenmez**. Teslim şekli (kapalı
zarf içinde elden teslim, kargo vb.) ayrı bir alan olarak **henüz yok**; sonraki
sürümde değerlendirilecektir.

**Alet adı (v2.212/v2.213):** `method.tool.name` ürün markası değil, aletin
kendisidir (`Edinim`). Raporun ARAÇ sütununa `Edinim v1.2` yazılır; motor bilgisi
(`PowerShell`/`Rust`) teknik izde kalır. Ürün adı rapora girmez.

`copyType` değerleri:

- `logical-file-copy` — Tier 1
- `full-device-image` — Tier 2, tam DD/E01
- `used-block-image` — dosya sistemi destekliyorsa kullanılan bloklar

## 5. Edinme prosedürü — Windows 11, Tier 1

1. **Hazırlık**
   - Boş hedef klasör (harici disk).
   - Tutanak: tarih/saat, operatör, cihaz.
   - Orijinal cihazı mühürle; kopyayla çalış.
2. **Cihaz bilgisi** (PowerShell):
   ```powershell
   Get-Disk | Format-List Number,FriendlyName,SerialNumber,Size,BusType
   Get-PhysicalDisk | Format-List FriendlyName,SerialNumber,MediaType,Size
   ```
3. **Salt-okunur** (yönetici):
   ```text
   diskpart
   list disk
   select disk N
   attributes disk set readonly
   attributes disk
   ```
   `Read-only : Yes` görülmezse **dur**. Devam etme.
4. **Kopyalama + hash**
   - Dosyaları hedef klasöre kopyala.
   - Her dosya için:
     ```powershell
     Get-FileHash -Algorithm SHA256 "E:\delil\ses\kayit.wav"
     ```
5. **Paket**
   - `delil.json` + `ses/` + `delil.log`.
6. **Doğrulama**
   - Kopyaların hash'lerini yeniden hesapla; manifest ile karşılaştır.
   - Fark varsa paket **geçersizdir**.

## 6. Tier 2 — tam DD imajı (opsiyonel)

Yalnız kurgusal USB'de test edildikten sonra. Örnek (WSL + GNU dd):

```bash
wsl --mount \\.\PHYSICALDRIVE2 --bare
# WSL içinde: lsblk ile /dev/sdX'i bul
sudo dd if=/dev/sdX of=/mnt/e/delil/usb.dd bs=4M status=progress conv=noerror,sync
sha256sum /mnt/e/delil/usb.dd > usb.dd.sha256
gzip -9 /mnt/e/delil/usb.dd
gzip -dc /mnt/e/delil/usb.dd.gz | sha256sum
wsl --unmount \\.\PHYSICALDRIVE2
```

- **Ham imajın** SHA-256'sı ayrı, **sıkıştırılmış dosyanın** SHA-256'sı ayrı
  saklanır.
- Bozuk sektör varsa `ddrescue` tercih edilir; `dd conv=noerror,sync` hataları
  sıfırla doldurur ve gizleyebilir.
- 16 GB ham imaj sıkıştırınca genelde 100 MB–1 GB olur; yine de ham imaj
  oluşturulurken geçici disk alanı gerekir.

## 7. AKİS tarafı (v2.208'de uygulandı)

- **"Delil paketi yükle"** düğmesi (mevcut "Ses dosyası ekle" akışının yanına).
- `delil.json` okunur; **her dosyanın SHA-256'sı** yeniden hesaplanır.
- Durum üçlü:
  - `doğrulandı` — hash tutuyor
  - `uyuşmuyor` — hash farklı; paket geçersiz
  - `doğrulanamadı` — hash yok veya hesaplanamadı
- Cihaz bilgisi **"edinme aracının beyanı"** olarak gösterilir; uygulama cihazı
  görmez. Cihaz satırında **birim (D:)** de görünür.
- **Yinelenen dosya (v2.211):** Aynı ses (aynı SHA-256) dosyada zaten varsa
  **yeni kayıt açılmaz**. Mevcut kayıt, düzenlemeler ve onaylar korunur;
  doğrulanmış paketin edinme bilgisi mevcut kayda işlenir ve günlüğe yazılır.
- **Ses dışı dosya (v2.211):** `bilgi.txt`, video vb. materyal olarak
  **eklenmez**; manifestte kayıtlı kalır, doğrulama penceresinde **"Ses dışı
  (atlandı)"** görünür. Böylece `-IncludeAll` güvenlidir.
- Delil günlüğüne zincir kaydı yazılır (`logEvent`).
- Raporun **"KAYIT KÖKENİ VE TESLİM ZİNCİRİ"** tablosuna cihaz, yöntem, araç,
  operatör ve hash girer.
- Raporda yöntem dürüstçe yazılır: *"Yazılımsal salt-okunur dosya kopyası;
  donanım write-blocker kullanılmadı."*

## 8. Güvenlik kuralları (pazarlıksız)

1. Kaynağa **asla yazma**; yalnız `FileAccess.Read`.
2. **Önce salt-okunur**, sonra oku. Başarısızsa **dur**.
3. **Kurgusal USB'de test** et; gerçek delilde kullanmadan önce 3–5 deneme.
4. Hata olursa **devam etme**.
5. Orijinali mühürle; kopyayla çalış.
6. Donanım write-blocker yoksa raporda yöntemi yaz; **"adli imaj" deme**.

## 9. Dürüst sınırlar

- Yazılımsal salt-okunur, **donanım write-blocker değildir**. Windows cihazı
  taktığı ilk saniyelerde yazmış olabilir.
- Kendi yazdığımız edinme aracı **doğrulanmış adli araç değildir**; "deneysel"
  etiketiyle kullanılır.
- Tier 1'de silinmiş dosya/boş alan **gelmez**.
- Seri no klonlanabilir; tek başına kimlik kanıtı değildir.
- İmaj hash'i tarayıcıda yeniden hesaplanmaz (GB'lar); o hash edinme aracının
  beyanıdır. AKİS dosya hash'lerini doğrular.

## 10. Test planı (kurgusal USB)

1. 1–2 GB kurgusal USB; içine 100 MB ses dosyası.
2. Tier 1: kopyala → hash → `delil.json` → AKİS'e yükle → "doğrulandı".
3. Hash'i elle boz → AKİS "uyuşmuyor" demeli.
4. Tier 2: DD imajı al → ham hash → sıkıştır → geri aç → hash karşılaştır.
5. Süre, boyut, hata sayısı ölçülür; sonuç `CHANGELOG.md`'ye yazılır.

## 11. Açık sorular

- Kapsam: yalnız ses dosyaları mı, tüm dosyalar mı?
- Paket: klasör mü, ZIP mi?
- Operatör bilgisi: her seferinde elle mi, ayarlarda mı?
- Tier 2 gerekli mi, yoksa Tier 1 yeterli mi?
- Donanım write-blocker alınacak mı?

## 12. İlgili belgeler

- [`GELECEK_PLANI.md`](GELECEK_PLANI.md) — tüm konuların seçenekleri ve sırası
- [`YOL_HARITASI.md`](YOL_HARITASI.md) — sürüm planı
- [`BILIRKISILIK_CERCEVESI.md`](BILIRKISILIK_CERCEVESI.md) — mesleki çerçeve
