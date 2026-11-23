# Rapor Ekranı ve Şablon Yeniden Planı

Bu belge, **sıradaki oturumun** üzerine kuracağı planı tanımlar. Kaynak:
kullanıcının 2026-11-23 tarihli devir talimatı ve v2.218–v2.226 arasında
yapılan ölçümlü çalışma.

> **Kullanıcı talimatı (özet, birebir anlam):**
> "Rapor sayfasının hem tasarımsal hem de şablonsal sorunları var. Yeni oturuma
> başlayacak kişi, kullanıcı için **kullanışlı bir rapor ekranı** planlamalı.
> Ayrıca **tüm rapor parçalarının, ekler de dahil tüm eklerin organize
> edilebilmesi** gerekiyor. Rapor gerçekten **tutarlı, düzenli ve okunaklı bir
> sırayla** hazırlanabilmeli. Şu anki yapıda hatalar var: rapor ekranının
> kullanımı sorunlu; rapor ve rapor şablonlarının kullanımı ve uygulama biçimi
> tasarımsal. Özetle **rapor bölümleri · A4 önizlemesi · rapor kontrolü ·
> gerekirse rapor revizyonu** gibi bölümler daha iyi planlanmalı."

---

## 1. Bugünkü durum (v2.226)

| | |
|---|---|
| Sürüm | **v2.226** |
| Testler | `bash tools/test.sh` → 1277 birim + 517 şema + rapor/sürüm/tasarım yeşil |
| Git | `main` = `origin/main` = `d1cc6da` |
| Canlı | <https://azmisahin-gov.github.io/akis/> → `version.json` = 2.226 |

### Bu oturumda eklenenler (v2.218–v2.226)

- **v2.218** Delil envanteri masaüstü ızgara düzeltmesi.
- **v2.219** Parametrik rapor: 19 bölüm anahtarı + "Rapor bölümleri" paneli.
- **v2.220** 56.12 şablon bölümleri (7): künye, kısa özet, ses iyileştirme,
  ASR, sınırlılık beyanı, gizlilik, Ekler (EK-1/2/3/5/6/7).
- **v2.221** A4 sayfalı önizleme (ekran kılavuzu; varsayılan kapalı).
- **v2.222** Teknik ortam alanları (7, elle).
- **v2.223** Rapor profilleri: Yalın (7) · Standart (19) · Tam 56.12 (27).
- **v2.224** Yazdırmada yalnız rapor kâğıdı (UI panelleri gizli).
- **v2.225** Künye ek alanları: raporun ekleri + tarafsızlık beyanı.
- **v2.226** Kalite kontrolü / denetlenebilirlik bölümü (`qc`).

---

## 2. Ölçülen / bilinen sorunlar (yeniden tasarımın gerekçesi)

1. **Rapor ekranı kalabalık ve dikey yığılmış.** Rapor görünümünde önizlemenin
   üstünde art arda paneller var: `#reportSectionsBox`, `#reportTechBox`,
   `#reportKunyeBox`, `#reportQcBox`, `#reportReadiness`, iki anahtar.
   Kullanıcı raporu görmek için aşağı kaydırmak zorunda.
2. **Sıra/organizasyon yok.** Bölümler yalnız **aç/kapa**; **sıralama
   değiştirilemiyor**. İçindekiler yalnız 7 numaralı bölümü listeliyor;
   yardımcı bölümler (köken, konuşmacılar, WER, seviye, özet) ve ekler TOC'te
   yok.
3. **Ekler tek blok ve tek tek organize edilemiyor.** `annex` bölümü
   EK-1/2/3/5/6/7'yi birlikte basıyor; **EK-4 yok** (numarada boşluk), imza
   satırları yok. Kullanıcı "tüm eklerin organize edilebilmesini" istiyor.
4. **Numaralandırma sabit.** Bir bölüm kapatılınca numarada boşluk kalır
   (ör. 1, 2, 4). "Tutarlı sıra" için numaralandırma türetilmeli.
5. **A4 önizlemesi yalnız yaklaşık kılavuz.** Gerçek sayfa kırılması değil;
   çizgiler kâğıt genişliğinden hesaplanıyor. Kullanıcı "A4 önizlemesi"
   beklentisini netleştirmek istiyor.
6. **Rapor kontrolü ayrı kart, raporla bütünleşik değil.** Hazırlık kartı
   önizlemenin üstünde; "rapor kontrolü" akışı (eksik → git → tamamla)
   rapor ekranının parçası olarak planlanmalı.
7. **Revizyon yok.** Rapor düzeyinde sürüm/revizyon/karşılaştırma yok; yalnız
   20 adımlık bellek içi geri alma ve birleştirme kaydı var.
8. **Şablon kullanımı gerçek şablon motoru değil.** Eklenen
   `56_12_ana_bilirkisi_rapor_sablonu.html/.udf` referans alındı; ancak çıktı
   hâlâ AKİS'in kendi 7 bölümlük iskeleti + isteğe bağlı bölümler. Şablonun
   14 bölüm + 7 ek yapısıyla **birebir** eşleme/uygulama biçimi tasarlanmalı.

---

## 3. Tasarım hedefi (tek cümle)

> Bilirkişi rapor ekranında **solda rapor iskeleti (sıralanabilir, aç/kapa)**,
> **ortada gerçek A4 önizleme**, **sağda rapor kontrolü + revizyon** görsün;
> her şey tek akışta, tutarlı numarayla, ekler dahil organize edilebilsin.

### Önerilen ekran mimarisi (3 bölge + araç çubuğu)

```
┌──────────────────────────────────────────────────────────────────────┐
│ RAPOR  [Profil: Yalın|Standart|Tam]  [Kontrol]  [Revizyon]  [Paket]   │
├───────────────┬──────────────────────────────────┬───────────────────┤
│ RAPOR İSKELETİ│        A4 ÖNİZLEME               │ RAPOR KONTROLÜ    │
│ (sıralanabilir│  Sayfa 1/…                       │ eksikler + git    │
│  aç/kapa)     │  ┌──────────────┐                │ ─────────────    │
│ 1 …           │  │  A4 sayfa    │                │ REVİZYON          │
│ 2 …           │  └──────────────┘                │ sürüm/karşılaştır │
│ EK-1 …        │                                  │                   │
│ EK-2 …        │                                  │                   │
└───────────────┴──────────────────────────────────┴───────────────────┘
```

- **Sol: Rapor iskeleti.** Tüm bölüm ve ekler tek listede; sürükle/sırala,
  aç/kapa, numara otomatik. Profil düğmeleri burada.
- **Orta: A4 önizleme.** Gerçek sayfa ayırımı (karar: §5) + sayfa numarası.
- **Sağ: Rapor kontrolü + Revizyon.** Hazırlık maddeleri, tıklayınca ilgili
  yere git; revizyon listesi/karşılaştırma.
- Üstte tek araç çubuğu: profil, kontrol, revizyon, paket/yazdır.

---

## 4. Veri modeli önerisi (sıra ve ekler)

Bugünkü `case.report.sections` (anahtar → açık mı) korunur; **sıra** eklenir.

```js
case.report.layout = {
  order: ['cover', 'coverFields', 'kunye', 'summary', 's1', ...],
  annexes: [
    { key: 'ek1', title: 'EK-1 …', on: true },
    { key: 'ek2', title: 'EK-2 …', on: true },
    ...
  ]
};
```

- **Numara türetilir:** açık ve sıralı bölümlere göre `1, 2, 3…`; TOC aynı
  kaynaktan. Kapatınca boşluk kalmaz.
- **Ekler ayrı kayıt:** her ek tek tek aç/kapa, sırala, başlığı düzenlenebilir.
  `EK-4` kararı verilir (ses işleme/dinleme günlüğü mü, çıkarılsın mı).
- **Tek kaynak:** `REPORT_SECTION_DEFS` + `REPORT_ANNEX_DEFS`; üç çıktı (HTML/
  DOCX/UDF) aynı sırayı kullanır.
- **Göç:** eski `sections` haritası korunur; `layout` yoksa varsayılan sıradan
  üretilir (veri kaybı yok).

---

## 5. Karar bekleyen sorular (yeni oturum kullanıcıya soracak)

1. **A4 önizleme:** gerçek sayfa ayırımı mı (içerik A4 sayfalara bölünür,
   sayfa numarası), yoksa "yaklaşık kılavuz" mu kalsın? (Gerçek ayırım daha
   doğru ama tablo bölme riski var.)
2. **Sıralama:** bölümler ve ekler **sürükle-bırak** ile mi sıralansın, yoksa
   yukarı/aşağı düğmeleri mi? (Erişilebilirlik için düğme de olmalı.)
3. **Şablon bağlılığı:** çıktı, eklenen 56.12 şablonunun **14 bölüm + 7 ek**
   sırasına birebir mi uysun, yoksa AKİS'in mevcut 7 bölümü korunup şablon
   "Tam" profili olarak mı sunulsun?
4. **Revizyon:** rapor düzeyinde kaç sürüm saklansın? (öneri: 10, bellek içi +
   pakete dâhil). Karşılaştırma metin farkı mı, alan farkı mı?
5. **EK-4:** içerik ne olsun? (dinleme/işlem günlüğü zaten EK-3'te; EK-4
   "ses işleme günlüğü" ayrı mı, yoksa numara EK-1…EK-6'ya mı çekilsin?)
6. **İmza:** EK-1 teslim/iade imza satırları elle mi (ad/tarih), yoksa "e-imza
   üretilmez" notu mu korunsun?

---

## 6. Faz planı (her faz = tek sürüm, ölçümlü)

| Sürüm | İş | Ölçüt |
|---|---|---|
| **v2.227** | **Rapor ekranı IA (3 bölge):** sol iskelet · orta A4 · sağ kontrol+revizyon; paneller tek yerde toplanır | 1440/900/600: önizleme ilk ekranda; kontrol sayısı; kaydırma |
| **v2.228** | **Sıra + numara + TOC tek kaynak:** `layout.order`, türetilmiş numara; aç/kapa boşluk bırakmaz | numara 1..N bitişik; TOC = gövde sırası |
| **v2.229** | **Ekler ayrı kayıt:** `REPORT_ANNEX_DEFS`, tek tek aç/kapa/sırala; EK-4 kararı | ek sayısı, sıra, üç çıktı aynı |
| **v2.230** | **A4 önizleme (karar §5.1):** gerçek sayfa ayırımı veya kılavuz; sayfa no | sayfa sayısı, taşma 0 |
| **v2.231** | **Rapor kontrolü entegrasyonu:** hazırlık maddeleri sağ bölgede; tıkla→git | eksik→git akışı |
| **v2.232** | **Revizyon:** rapor sürümü kaydet/karşılaştır/geri yükle | sürüm sayısı, fark |
| **v2.233** | **Şablon birebir (karar §5.3):** 14 bölüm + 7 ek sırası | üç çıktı aynı metin |

> Sıra kullanıcı onayıyla değişebilir. Her fazda: kıran test → düzeltme →
> gerçek Chromium → push (depo disiplini).

---

## 7. Değişmez kısıtlar (bozulmamalı)

- **Rapor bilirkişi adına yazılır**; uygulama adı/sürümü çıktıda geçmez.
- **Üç çıktı (HTML/DOCX/UDF) aynı metni** üretir (`rapor-tutarlilik-testi`).
- **Ölçülmeyen iddia yok:** boş alan "—"; yapılmayan işlem yazılmaz.
- **Kod ≠ etiket:** durum/rol kodları ASCII, Türkçe etiket türetilir.
- **Kayıt-içi S1/S2, dosya-arası K1/K2** ayrımı korunur.
- **Yazdırmada yalnız rapor kâğıdı** (v2.224).
- **Kırpma yasak:** sığmayan öğe sarar; gizli yatay kaydırma yok.
- **Tek kaynak:** bölüm/ek tanımları, numara, TOC, üç çıktı aynı yerden.

---

## 8. Yeni oturum için ilk komutlar

```bash
bash tools/test.sh
git log --oneline -3
git status --short
curl -s https://azmisahin-gov.github.io/akis/version.json
```

Beklenen: **1277 birim + 517 şema** + rapor/sürüm/tasarım yeşil; sürüm 2.226.
Sonra bu belgeyi okuyup **v2.227 rapor ekranı IA** ile başla; §5 sorularını
kullanıcıya sor.

---

## 9. UYGULAMA DURUMU (v2.227 — TAMAMLANDI)

Faz planının **v2.227–v2.233** kapsamı tek sürümde uygulandı:

- **Üç bölge** (sol iskelet · orta A4 · sağ kontrol/revizyon) — §3.
- **Sıra + türetilmiş numara + TOC tek kaynak** — §4; `case.report.layout`.
- **Ekler ayrı kayıt** (`REPORT_ANNEX_DEFS`); EK-1…EK-6 bitişik (EK-4 boşluğu
  kapandı) — §2.3.
- **A4 önizleme** sayfa sayısı gösterir; kılavuz niteliği korunur — §5.1.
- **Rapor kontrolü** sağ bölgeye taşındı — §2.6.
- **Revizyon** (kaydet/geri yükle/sil; en çok 10; kanıt dışı) — §2.7.

Ayrıntı ve ölçümler: `CHANGELOG.md` v2.227; kalıcı kurallar: `AGENTS.md`
"YENİ OTURUM DEVRİ (v2.227)".

**Kalan (bilinçli):** gerçek A4 sayfa kırılması, sürükle-bırak sıralama,
56.12 şablonunun 14+7 yapısına birebir eşleme (şu an 28 bölüm + 6 ek esnek
iskelet).
