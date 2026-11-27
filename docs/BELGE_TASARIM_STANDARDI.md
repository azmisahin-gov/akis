# AKİS — Kurumsal Belge Tasarım Standardı (v2.386)

Bu belge, AKİS'in **56.12 ve diğer uzmanlık raporları** için **kurumsal varsayılan
belge tasarımını** tanımlar. Mevzuatın zorunlu kıldığı tek tip şablon değildir;
bilirkişinin kullandığı varsayılan görsel dildir. **İçerik, bölüm sırası ve
hesaplar değişmez.**

## 1. Üst bilgi

A4 dikey, tüm sayfalarda:

- Sol: `Dosya No: {dosya numarası}` — kullanıcı verisinden **aynen** (E./Esas/K. dönüştürülmez).
- Sağ: `BİLİRKİŞİ RAPORU`.
- Orta: boş. İnce gri ayırıcı çizgi. 8–9 punto, koyu gri. Logo/ürün adı/sürüm yok.

DOCX: `header1.xml` (2 sütun, `BFC7CF` çizgi). HTML yazdırma: `@page { @top-left/@top-right }`.

## 2. Alt bilgi

- Sol: `{uzmanlık kodu} – {uzmanlık adı}` (dosyadaki uzmanlık alanından; yoksa yazılmaz).
- Sağ: `Sayfa {PAGE} / {NUMPAGES}` — **gerçek** sayfa numarası; ilk sayfa 1.
- Orta: boş. 8–9 punto, koyu gri, ince çizgi.

DOCX: `PAGE`/`NUMPAGES` alanları + `w:pgNumType w:start="1"`.
HTML yazdırma: `counter(page)` / `counter(pages)` (Chrome/Edge 131+; uydurma yok).
UDF: **şemada doğrulanmış üst/alt bilgi ve sayfa numarası alanı yok**; statik metinle
taklit edilmez. UYAP editöründe gerçek sonuç kontrol edilmelidir.

## 3. Kapak

Sıra: `T.C.` · mahkeme tam adı · `ADLİ VE KRİMİNALİSTİK İNCELEMELER` ·
`BİLİRKİŞİ RAPORU` · uzmanlık alanı · parantezli not.

- Mahkeme ortalı ve kalın; **ek kesme işaretiyle ayrılmaz** (`MAHKEMESİNE`).
- `BİLİRKİŞİ RAPORU` en belirgin başlık; uzmanlık ve not daha küçük.
- Çerçeve, renkli bant, kart, gölge yok.

## 4. Rapor künyesi

İki sütunlu sade yerleşim (varsayılan): kısa alanlar eşleşir, uzun alanlar tam
genişlikte (etiket üstte, değer altta). Etiket küçük/gri/büyük harf; değer koyu.
Dikey bölme, renkli hücre, kart, yuvarlatılmış köşe, gölge yok.

- Eşleşenler: dosya no/görevlendirme tarihi · görevlendiren merci/rapor tarihi ·
  bilirkişi adı/sicil no · davacı/davalı · dava tarihi/inceleme tarihi ·
  verilen süre/son teslim tarihi.
- Tam genişlik: vekiller, dava konusu, uzmanlık alanı, tarafsızlık beyanı ve
  eşleşmeyen diğer alanlar.
- Boş alan satır üretmez; mevcut künye bilgilerinin hiçbiri kaybolmaz.
- "İncelemenin konusu" §1'de tek yerde kalır (v2.354 kuralı); künyede yinelenmez.

## 5. Tablolar ve bölüm başlıkları

- Bölüm başlığı: arka plansız, kalın, ince alt çizgi; sol vurgu çubuğu yok.
- Tablo (varsayılan **nötr gri**): açık gri başlık, koyu kalın başlık metni,
  ince açık gri çizgiler, beyaz gövde. Koyu mavi büyük dolgu yok.
- Durum metinleri (Onaylandı/Anlaşılmadı/Belirsiz okuma) görünür kalır; anlam
  renge bağlı değildir.

## 6. Kullanıcı tercihleri (Rapor → Ayarlar → Biçim)

| Tercih | Varsayılan | Alternatif |
|---|---|---|
| Künye düzeni | İki sütunlu sade | Klasik tablo |
| Tablo görünümü | Nötr gri | Koyu mavi (klasik) |

Tercihler yalnız **görsel**dir; içerik, denetim durumları ve hesaplar değişmez.
`case.report.format.coverFields` / `tableTheme` alanında saklanır.

## 7. Dürüst sınırlar

- **UDF** üst/alt bilgi ve sayfa numarası: şemada doğrulanmış alan yok; eklenmedi.
- **HTML yazdırma** sayfa numarası `@page` margin box'larına dayanır (Chrome/Edge).
  Desteklemeyen tarayıcıda numara görünmez; uygulama **uydurma numara yazmaz**.
- DOCX/HTML/UDF sayfa kırılımları aynı olmak zorunda değildir; bilgi hiyerarşisi
  ve görünüm dili ortaktır.
