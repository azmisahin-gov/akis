# İskelet Yeniden Yapım Planı (yeni oturum için)

> Bu belge, **rapor iskeleti + bölüm listesi + rapor modeli** alanını SIFIRDAN
> yeniden yapmak için hazırlandı. v2.369–v2.379 arası çok sayıda yama yapıldı;
> kullanıcı "bozdun, düzeltmiyorsun, bazıları çalışmıyor" dedi. **Yamayı bırak;
> temiz yeniden yap.** Tek konu = tek sürüm; test → gerçek tarayıcı → push.

## 1. Kullanıcının NET isteği (değişmez)

- **TEK DÜZ LİSTE:** Raporu oluşturan TÜM bölümler tek listede, ideal sırada.
- **Gruplama YOK:** "Ön bölüm / Gövde / Ekler / İmza" başlıkları **istemiyor**.
- **EK (annex) kavramı GÖRÜNMESİN:** "EKLER", "EK listesi", "EK-N", "ekte basılıyor"
  yazıları **istemiyor**. (Ek kavramını "şimdilik unut" dedi.)
- **HEPSİ VARSAYILAN KAPALI:** yeni dosyada tüm bölümler kapalı; rapor boş başlar.
- **Kullanıcı kendi açar/kapatır/sıralar.** Sürükle-bırak + ↑↓ ile.
- **Üst yazı** için de aynı sadeleştirme yapılacak (sonraki iş).
- "HTML oyunu yapma" = geçici CSS/HTML yaması değil, **modeli temiz yaz**.

## 2. Bugünkü durum (v2.379) ve ÇELİŞKİLER (yeni oturum önce ölçmeli)

İskelet (görünen): `#reportSections` = ~30 bölüm, tek düz liste, her satırda
kutucuk + ad + **Düzenle** + ↑↓. `annex` (EKLER) ve `s7` (EK listesi) satırları
**gizlendi**. Sağ çekmecede **Ekler sekmesi kaldırıldı** (4 sekme). `freshCase`
tüm bölümleri **kapalı** başlatıyor.

**AMA model hâlâ "ek" içeriyor (görünmez ama canlı):**
- `REPORT_SECTION_DEFS`/`REPORT_BODY_ORDER` içinde `annex` ve `s7` **duruyor**.
- `annexPlacement`, `reportAnnexList`, `reportAnnexBlocks`, `reportMovedSections`,
  grup ekleri (`ek7…ek10`), `reportGroupSections` **duruyor** (rapor çıktısı hâlâ
  bunları kullanıyor). app.js'te ~65 referans.
- **"Varsayılan düzen" düğmesi** `emptyReportSections()` (def → `annex` AÇIK) +
  `defaultAnnexPlacement()` uyguluyor → **EKLER'i geri getiriyor** (çelişki!).
- **Mevcut (eski) dosyalar** `annex` açık kayıtlıysa raporda **EKLER** görünür.
- Bu yüzden kullanıcı hâlâ "bir şeyler eke bağlı" görüyor; "bazıları çalışmıyor".

## 3. HEDEF model (temiz yeniden yapım — öneri)

**Tek kaynak: sıralı düz "belge parçası" listesi.** Her parça:
`{ id, title, on (varsayılan false), kind }`. **parent/ağaç YOK, placement YOK,
grup YOK, ek listesi YOK.** Sıra tek dizi (`order`).

Parçalar (öneri — içerik korunur, ekler DÜZ BÖLÜM olur):
1. Kapak · 2. Rapor künyesi · 3. İçindekiler
4. Görevlendirme/konu/sınırlar (s1) · 5. Sorular (s2) · 6. Maddi unsurlar (s3)
7. İnceleme yöntemi (s4) · 8. Kayıt bazında bulgular/transkript (s5) · 9. Cevaplar
10. Sınırlılıklar · 11. Okuma metni · 12. Gerekçeli sonuç (s6)
13. Kayıt kökeni · 14. Gömülü metadata · 15. Edinme/doğrulama · 16. Konuşmacılar ·
17. Konuşmacı süreleri · 18. WER · 19. Seviye · 20. İnceleme özeti · 21. Bütünlük ·
22. Teknik ortam · 23. Kalite · 24. Kapsam dışı · 25. Gizlilik · 26. Terimler ·
27. İyileştirme · 28. Çözümleme yöntemi
**29–34: ESKİ EK İÇERİKLERİ (düz bölüm olarak):** Materyal teslim/iade tutanağı ·
Dosya teknik envanteri · Zincirleme muhafaza/işlem günlüğü · Transkript gösterim
anahtarı · Son kontrol listesi · Hukuki/yöntemsel dayanaklar
35. İmza

> Karar (yeni oturum kullanıcıya sorabilir): 29–34'ü **düz bölüm** yap (içerik
> korunur, ÖNERİLEN) **veya** tamamen kaldır (içerik kaybı). Varsayılan: düz bölüm.

**Çıktı (HTML/DOCX/UDF):** tek listeyi sırayla bas; her parça kendi üreticisiyle.
"EKLER" sarmalayıcısı YOK; eski ek içerikleri normal numaralı bölüm olur.

## 4. Kod haritası (mevcut — yeniden yazarken bakılacak yerler)

- `assets/schema.js`
  - `REPORT_SECTION_DEFS` (704) · `REPORT_BODY_ORDER` (760) · `REPORT_ANNEX_DEFS` (794)
  - `emptyReportSections` (1462) · `normalizeReportLayout` (919) · `normalizeCase`/`emptyReport`
- `assets/app.js`
  - İskelet: `renderReportSections` (15448), `row()` içinde, `reportSectionOn` (14860),
    `reportBlockRenders` (15025), `reportBodyOrder` (14880), `reportMovedSections` (14889)
  - Ek modeli: `reportAnnexList` (15099), `reportAnnexBlocks` (16273), `reportGroupSections`,
    `annexPlacementOf`, `moveSectionIntoAnnex`, `unplaceAndReorder`, `toggleAnnexPlacement`,
    `buildDefaultReportLayout`, `applyDefaultReportLayout`
  - Üreticiler: **HTML** front 17836 / body 17869 / annex 18080; **DOCX** front 18414 /
    blocks 18457 / annex 18722; **UDF** front 19114 / blocks 19162 / annex 19447
  - `REPORT_SIDE_TABS` (14372) · `renderReport` (17751) · `freshCase` (1569)
- Testler: `tools/rapor-tutarlilik-testi.mjs` (22 yerde "Rapor eki" varsayımı),
  `tools/tasarim-testi.mjs` (annex/sekme kontrolleri), `tools/birim-testleri.mjs`
  (`reportAnnex*`, `annexPlacement` — ~55 satır).

## 5. Yeniden yapım adımları (öneri)

1. **Ölç:** `bash tools/test.sh`; gerçek Chromium'da raporu aç, iskelet + çıktıyı
   gör; "çalışmayan" düğmeleri tek tek dene ve not et.
2. **Model:** yeni düz liste modelini `schema.js`'te tanımla (id/title/on/kind).
   `normalizeCase` eski kayıtları bu modele **göç** etsin (sections/layout/annexPlacement
   → düz `on`+`order`). Eski dosyalar bozulmasın.
3. **Üreticiler:** 3 üreticiyi tek döngüye çevir; ek sarmalayıcıyı kaldır; eski ek
   içeriklerini normal bölüm üreticisi olarak bağla. Üç çıktı AYNI metni vermeli
   (`rapor-tutarlilik-testi`).
4. **İskelet:** tek düz liste; kutucuk + başlık + ↑↓ (+ gerekli Düzenle). Sürükle-bırak
   tek sıra içinde. Ek/grup/rozet yok. Varsayılan kapalı.
5. **Kaldır:** `annexPlacement`, grup ekleri, `reportAnnex*`, `moveSectionIntoAnnex`,
   `buildDefaultReportLayout` (veya yeniden tanımla), "Varsayılan düzen" düğmesi
   (EKLER'i geri getirmemeli), `s7`/`annex` sarmalayıcıları.
6. **Testleri güncelle:** "Rapor eki N." → düz bölüm başlığı; sekme sayıları; birim
   annex testlerini yeni modele çevir. Testler DAVRANIŞI sınasın (imza değil).
7. **Doğrula:** `bash tools/test.sh` yeşil + gerçek Chromium (3 tema, 5 genişlik,
   JS 0) + push + Pages `built` + canlı `version.json`.

## 6. BU OTURUMDA YAŞANAN TUZAKLAR (tekrar etmesin)

- **Kodlama bozulması:** Bir metin-editörü aracı `app.js`'in UTF-8'ini çift kodladı
  (`sayısal` → mojibake). **Türkçe metin düzenlerken** değişiklikleri `python3`
  `io.open(..., encoding='utf-8')` ile yap ve **mojibake tara**. Testlerde
  Testlerde Türkçe harfler bozuk görünürse (ör. "ı" yerine anlamsız harf dizileri) kodlama bozulmuştur.
- **index.html panel kaldırma:** REGEX (`.+?</div></div>`) div yapısını bozdu
  (revision paneli gitti). **Birebir metin** kaldır + `div open==close` doğrula.
- **İndeks tabanlı Python düzenlemesi:** `s.index('const groups =')` YANLIŞ (ilk)
  eşleşmeyi yakaladı. **Benzersiz bağlam çıpası** kullan + `assert count==1`.
- **İmza tabanlı testler:** `transcribe(id)` gibi imzalar değişince testler kırıldı.
  Testler **davranışı** sınasın.
- **CDP ölçüm:** `--virtual-time-budget` IndexedDB/paket akışlarını tamamlatmaz.
  Gerçek zamanlı: `chromium --remote-debugging-port` + Node 24 `WebSocket` (CDP).
  Profil önbelleği için `Network.setCacheDisabled(true)`.
- **Sahte DOM:** `renderReport` sahte DOM'da çalışır; `setAttribute`/`requestAnimationFrame`/
  `CSS.escape` olmayabilir → savunmacı yaz (`typeof ... === 'function'`).

## 7. Kabul ölçütleri (yeni sürüm "bitti" sayılır)

- İskelet: **tek düz liste**, grup başlığı 0, "EK" metni 0, tüm bölümler tek tek
  aç/kapa + ↑↓ + sürükle; **varsayılan hepsi kapalı**.
- Rapor çıktısı: HTML/DOCX/UDF **aynı metin** (`rapor-tutarlilik-testi` yeşil);
  "EKLER" sarmalayıcısı yok; içerik kaybı yok.
- Eski dosyalar açılınca bozulmaz (göç doğru).
- Gerçek Chromium: JS hatası 0, yatay taşma 0, 3 tema okunur, 5 genişlik kırılmasız.
- `bash tools/test.sh` yeşil; push + Pages `built` + canlı `version.json` yeni sürüm.

## 8. Sürüm/dal

- **v2.380’de UYGULANDI.** 36 düz bölüm, EK kavramı yok, yeni dosya tümü kapalı.
- Kullanıcı tercihi: doğrudan `main`'e push (özellik dalı açma), commit Türkçe.
- "Ölçülemeyen iddia yok": her düzeltmede önce/sonra ölçümü göster.
