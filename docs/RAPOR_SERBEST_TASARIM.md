# Rapor: serbest tasarım ve numaralandırma (karar belgesi)

Bu belge, kullanıcının 2026-11-25 geri bildirimi üzerine yazıldı:

> "Sonuçta biz raporu sıfırdan istediğimiz gibi taraylayabiliyoruz… her alanı
> kullanıcı sıfırdan yapabilsin, bir şablon yapısı olmasın. İster numaralı yapar,
> ister numarasız, ister A B C'li… gerekli alanları sürükler bırakır, üste
> çıkartır. Biz ham veri verelim."

## 1. Bugünkü durum neden böyle? (belgelerdeki dayanak)

| Karar | Sürüm | Gerekçe (özet) |
|---|---|---|
| 56.12 bölümleri (künye, özet, ASR, sınırlılık, gizlilik, ekler) | v2.220 | 56.12 uzmanlık alanının resmî rapor iskeletine yaklaşmak |
| **Rapor profilleri** (Yalın 7 · Standart 19 · Tam 56.12 27) | v2.223 | Tek tıkla "hangi bölümler açık" seçimi |
| **Numara türetilir; boşluk bırakmaz** | v2.228 | Kapalı bölüm numarada boşluk bırakıyordu (1,2,4) |
| **Ana bölümler numaralı, alt bloklar numarasız** | v2.259 | 56.12'nin "9 bölüm + alt blok" yapısı; "tümüne numara ayrı şema kararı" notu |
| Profil **sıra da yazar** | v2.261 | 56.12 sırasına birebir yaklaşmak |

Ayrıntı: `CHANGELOG.md` (v2.220–v2.283), `docs/RAPOR_EKRANI_PLANI.md` §2/§5,
`docs/YOL_HARITASI.md` v2.259 notu.

**Sonuç:** Bu yapı "resmî şablona yakınlık" için kuruldu; kullanıcı ise
**kendi düzenini** istiyor. İkisi çelişiyor. Bu belge, şablonu **zorunlu
olmaktan çıkarıp** serbest tasarıma geçiş planını verir.

## 2. Değişmez ilkeler (serbest tasarımda da korunur)

1. Rapor **bilirkişi adına** yazılır; uygulama adı/sürümü çıktıda geçmez.
2. **Üç çıktı (HTML/DOCX/UDF) aynı metni** üretir.
3. **Ölçülmeyen değer yazılmaz**; boş alan "—".
4. Kanıt tablosunda **zaman + metin zorunlu** (kapatılamaz).
5. Kırpma yasak; sığmayan öğe sarar.
6. Tek kaynak: bölüm/ek tanımı, numara, TOC, üç çıktı aynı yerden.

## 3. Aşamalı plan

### v2.284 — Numaralandırma kullanıcıya bırakıldı (YAPILDI)

- `case.report.numbering`: `auto` | `none`. Panelde **"Numaralar"** anahtarı
  (rapor iskeletinin üstünde).
- `none`: tüm başlıklar ve İÇİNDEKİLER **numarasız** yazılır (kullanıcı kendi
  numarasını bölüm metnine yazar). `auto`: bugünkü davranış (ana bölümler 1…N,
  alt bloklar TOC'ta "–").
- Ayrıca kayıt altı bloklara **kısa etiket** eklendi: "Konuşmacılar (bu kayıt)"
  ve "Deşifre (zaman damgalı)"; uzun açıklama bölüm başında **bir kez**.
- "Git" düğmeleri onarıldı: panel hangi sekmede olursa olsun **Deşifre**
  sekmesine geçip bölümü açar.

### v2.285 — Başlıklar düzenlenebilir + numara biçimi

- `case.report.titles[key]` — bölüm başlığını kullanıcı yazar (boşsa varsayılan).
- `case.report.numbering`: `auto` | `none` | `letters` (A, B, C…) | `manual`
  (kullanıcı başlığa numarayı kendisi koyar).
- TOC otomatik güncellenir; üç çıktı aynı başlığı basar.
- İskelette her satırda **kalem** düğmesi (başlığı düzenle).

### v2.286 — Profil/preset düğmeleri kaldırılır

- "Yalın / Standart / Tam 56.12" düğmeleri **kaldırılır** (istenirse "Şablonlar"
  altında saklanır, varsayılan uygulanmaz).
- Varsayılan: mevcut bölüm kümesi **olduğu gibi** açık (mevcut raporlar
  değişmez); kullanıcı istediğini kapatır/sıralar.
- Yeni dosyalar için "boş iskelet" seçeneği: yalnız kapak + kanıt (isteğe bağlı).

### v2.287 — Serbest blok ekleme

- "＋ Bölüm ekle": **başlık + serbest metin** (isteğe bağlı tablo).
- Blok, diğer bölümler gibi sıralanır/açılır/kapanır; üç çıktıya girer.
- Böylece kullanıcı 56.12 dışında kendi başlıklarını yazabilir.

### v2.288 — Kullanıcı profilleri (isteğe bağlı)

- "Bu düzeni profil olarak kaydet" (ad verir), "Profili uygula".
- Profil **yalnız** kullanıcı tanımlıdır; yerleşik 56.12 profili yok.

### Sürükle-bırak

- v2.285'te ↑↓ düğmeleri **korunur** (erişilebilirlik); sürükle-bırak ayrı
  sürümde eklenir (HTML5 drag; dokunmatik için uzun basma). Depo kuralı:
  sürükleme tek yol olamaz.

## 4. Riskler ve koruma

| Risk | Koruma |
|---|---|
| Mevcut raporlar bozulur | `normalizeCase`/`normalizeReportLayout` eski kayıtları okur; `numbering` yoksa `auto` |
| Üç çıktı ayrışır | `rapor-tutarlilik-testi` her senaryoda üç metni karşılaştırır |
| Başlık düzenleme veri kaybı | `titles` bilinmeyen anahtar korunur; boş = varsayılan |
| 56.12 uyumu | Profil **isteğe bağlı** kalır; varsayılan dayatılmaz |
| Test borcu | Her adımda `birim` + `rapor` + `tasarim` yeşil olmadan sürüm çıkmaz |

## 5. Karar bekleyen sorular

1. **Numara biçimi** hangi seçenekler olsun: `auto` / `none` / `A,B,C` / `elle`?
2. **Varsayılan** hangisi olsun: `auto` (bugünkü) mu, `none` mu? (Yeni dosyalar)
3. **Profil düğmeleri** tamamen silinsin mi, "Şablonlar" altında kalsın mı?
4. **Serbest blok** (başlık + metin) gerekli mi; tablo desteği de olsun mu?
5. **Sürükle-bırak** önceliği: v2.285 mi, sonra mı?

---

## Ek: Konuşmacı akışı (ayrı belge: aşağıdaki bölüm)

Kullanıcı geri bildirimi: *"Git düğmeleri işe yaramıyor; illa konuşmacı seçmem mi
gerek? Seçmediklerime bu işlemi yapamıyor muyum? Bölüm listesinde bir şey
göstersin… kolaylaştır."*

- **v2.284:** Git onarıldı (Deşifre sekmesine geçiş).
- **v2.285 (öneri):** *Atama yapılmadan* gömme ölçümü → **benzer bölüm
  kümeleme** (eşik 0,88). Panelde "Grup A · 12 bölüm · 00:00–01:10" listesi;
  bölüm satırında **≈A** rozeti. Kümeleme **atama yapmaz**; "Grubu S1'e ata"
  düğmesi onay ister, geri alınabilir ve günlüğe yazılır.
- **Kişi birleştirme (K):** Analiz sekmesinden **Dosya bilgileri çekmecesine**
  taşınması önerildi (dosya düzeyinde iş). Per-kayıt "Aynı kişi" seçici kalır.
