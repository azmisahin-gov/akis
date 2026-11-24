# Alan Tanımlama Sistemi

Bu belge, AKİS'te yeni alanların (gözlem işareti, sınıflandırma seçeneği,
rapor başlığı…) **tek bir tanım noktasından** eklenebilmesi için kullanılan
deseni ve sınırlarını açıklar. Amaç büyük bir yeniden yazım değil; mevcut
mimariyi bozmadan tekrarı azaltmaktır.

## 1. Sorun: aynı alan, dört ayrı liste

v2.202'ye kadar bir gözlem bayrağı (`noise`, `overlap`, …) için şu yerlerde
**ayrı ayrı** değişiklik gerekiyordu:

| Yer | Ne tutuyordu |
|---|---|
| `schema.js` → `OBS_KEYS` | Anahtar listesi |
| `schema.js` → `OBS_LABEL` | Rapor etiketleri |
| `schema.js` → `emptySegment.obs` | Varsayılan nesne (4 anahtar sabit) |
| `app.js` → `REPORT_TEXT.obsLabels` | Rapor etiketlerinin **kopyası** |
| `app.js` → `segDetailHtml` (`obsBtns`) | Düğme listesi (4 sabit) |
| `app.js` → `segObsText` / gözlem sayacı | Anahtarları geziyordu |
| `index.html` | Yardım metni |
| Testler | Etiket/anahtar çiftleri |

Birini güncelleyip diğerini unutmak **sessiz** hata üretiyordu: düğme
görünmüyor, rapor ham `phone` kodu basıyor veya yeni anahtar kaydetmede
siliniyordu.

## 2. İlke: tek tanım, türetilmiş tüketiciler

v2.203'te gözlem bayrakları için tek kaynak:

```js
// schema.js
export const OBS_DEFS = [
  { key: 'noise', label: 'arka plan gürültüsü', short: 'gürültü', hint: '…' },
  …
  { key: 'echo', label: 'yankı / oda akustiği', short: 'yankı', hint: '…' },   // v2.272
  { key: 'dropout', label: 'kesinti / kopukluk', short: 'kesinti', hint: '…' }  // v2.272
];
```

`defineOptions(defs)` bu listeden şunları üretir:

```js
{ defs, keys, label, short, hint }
```

ve şu sabitler **türetilir** (elle kopya yok):

- `OBS_KEYS` — kayda yazılan ASCII kodlar
- `OBS_LABEL` — rapor/ipucu tam etiketleri
- `OBS_SHORT` — arayüz düğmesi kısa etiketleri
- `OBS_HINT` — fare ipucu / erişilebilirlik açıklamaları
- `emptyObs()` — tüm bilinen anahtarları `false` taşıyan nesne

Tüketiciler:

| Tüketici | Kaynak |
|---|---|
| `emptySegment.obs` | `emptyObs()` |
| `normalizeSegment` | `emptyObs()` + bilinmeyen anahtarı korur |
| Arayüz gözlem düğmeleri | `OBS_DEFS.map(...)` |
| Rapor GÖZLEM hücresi | `OBS_KEYS` + `OBS_LABEL` |
| Gözlem sayacı | `OBS_KEYS` |
| Yardım listesi (`#obsHelpList`) | `OBS_DEFS` (çalışma anında doldurulur) |
| Testler | `OBS_DEFS` / `OBS_KEYS` / `OBS_LABEL` |
| Dosya birleştirme (`mergeCases`) | bilinen + bilinmeyen anahtarları OR'lar |

### Yeni bir gözlem bayrağı eklemek

**Tek zorunlu değişiklik:** `OBS_DEFS`'e bir satır. (v2.272'de tam olarak bu
yapıldı: `echo` ve `dropout` eklendi; düğmeler, yardım listesi, rapor sütunu ve
**EK-5 gözlem tablosu** kendiliğinden güncellendi.)

```js
{ key: 'lineNoise', label: 'hat gürültüsü', short: 'hat', hint: 'Telefon hattı gürültüsü' }
```

Bununla birlikte:

- arayüz düğmesi,
- rapor etiketi,
- yardım listesi,
- `emptySegment` varsayılanı,
- `normalizeSegment` tamamlaması,
- gözlem sayacı,
- test kapsamı

kendiliğinden gelir. İsteğe bağlı olarak `OZELLIKLER.md`/`CHANGELOG.md` gibi
**statik belgelere** bir cümle eklenir; bunlar çalışma anında üretilemez.

## 3. Geriye ve ileriye uyumluluk

### Eski kayıtlar
Eksik bilinen anahtar `normalizeSegment` içinde `false` olur. Kayıt açılmazsa
hiçbir şey değişmez; açıldığında veri kaybı olmaz.

### Bilinmeyen (ileri sürüm) anahtarları
`normalizeSegment` artık **bilinmeyen anahtarları silmez**; `!!` ile boolean
olarak korur. Böylece daha yeni bir sürümün eklediği bayrak, bu sürümde
tanınmasa bile kaydetmede kaybolmaz.

Rapor ve sayaç yalnız **bilinen** anahtarları kullanır (`OBS_KEYS`). Bu sayede
eski sürüm, yeni bir dosyayı açtığında rapora ham `lineNoise` gibi kodlar
basmaz.

### Şema sürümü
Gözlem bayrağı eklemek **eklemeli** bir değişikliktir; `SCHEMA_VERSION`
artırılmaz. Kırıcı bir değişiklik (alan silme/anlam değiştirme) yapılırsa
artırılır ve göç yazılır.

### Bilinen sınır
v2.203 **öncesi** bir uygulama, yeni bir paketi açıp kaydederse bilinmeyen
anahtarları hâlâ siler (o sürümün kodu bilinçli olarak yalnız 4 anahtarı
tutuyordu). Bu nedenle yeni gözlem bayrakları içeren paketler **eski sürümle
paylaşılmamalıdır**. Bu, geriye dönük olarak düzeltilemez bir sınırdır; yeni
sürümlerde bilinmeyen anahtarlar korunur.

## 4. Dosya birleştirmede gözlemler

v2.203 öncesinde `mergeCases` bölüm bazında `obs` alanını **hiç okumuyordu**;
gelen tarafın işaretleri sessizce kayboluyordu. Artık:

- iki tarafın bilinen ve bilinmeyen anahtarları **OR**'lanır,
- gelen taraftan eklenen anahtarlar `applied` günlüğüne yazılır,
- gözlemler "çakışma" değildir (eklemeli bilgidir).

## 5. Diğer alan aileleri — kademeli plan

Aynı desen her alana uygulanabilir; ancak her birinin kendi özel arayüzü ve
rapor üretimi vardır. Bu nedenle **tek seferde evrensel bir motor** yazılmaz.

### A. Sınıflandırma / rol seçenekleri — v2.204'te TAŞINDI
Aşağıdaki sabit listeler artık `*_DEFS` tek kaynağından türetilir:

| Defs | Türetilenler |
|---|---|
| `CASE_STATUS_DEFS` | `CASE_STATUS`, `CASE_STATUS_LABEL` |
| `MATERIAL_STATUS_DEFS` | `MATERIAL_STATUS`, `STATUS_LABEL` |
| `REVIEW_DEFS` | `REVIEW_STATE`, `REVIEW_LABEL`, `REVIEW_SHORT`, `REVIEW_HINT`, `REVIEW_TONE` |
| `SPEAKER_ROLE_DEFS` | `SPEAKER_ROLE`, `SPEAKER_ROLE_LABEL` |
| `SPEAKER_GENDER_DEFS` | `SPEAKER_GENDER`, `SPEAKER_GENDER_LABEL` |
| `MEDIUM_TYPE_DEFS` | `MEDIUM_TYPE`, `MEDIUM_TYPE_LABEL` |
| `TEAM_ROLE_DEFS` | `TEAM_ROLE`, `TEAM_ROLE_LABEL`, `SECOND_EYES_ROLES`, `APPROVER_ROLES` |

`defineOptions` artık `byKey` de döndürür; `REVIEW_TONE` gibi tanıma özgü alan
`REVIEW_DEFS` satırında durur. Rol yetkileri ayrı liste değil, `TEAM_ROLE_DEFS`
bayraklarıdır (`approver`, `secondEyes`). Uygulamadaki kopya etiketler
(`REVIEW_SHORT_LABEL`, `badgeFor` metinleri, `SEG_FILTERS` kontrol etiketleri)
kaldırıldı. **Görünür davranış değişmedi.**

### B. Dosya (case) alanları (orta risk)
`CASE_FIELD_DEFS` ile etiket, sıra, zorunluluk ve doğrulama tek yerde
tanımlanabilir. Metin/tarih alanlarının form HTML'i üretilebilir; özel
denetimler (taraf, ekip, sorular) kendi üreticisini korur. `reportRows` ve
`normalizeCase` aynı tanımdan beslenir. Büyük ama kademeli yapılabilir.

### C. Rapor bölümleri / başlıkları (yüksek risk)
`REPORT_SECTION_DEFS` ile bölüm kimliği, başlık ve sıra tek yerde tutulabilir;
TOC ve üç çıktı (HTML/DOCX/UDF) buradan üretilir. Ancak her bölümün **içeriği**
özel koddur; bu yüzden yalnız başlık/sıra/TOC ortaklaştırılır, içerik
renderer'ları korunur. Bu, üç oluşturucuyu birlikte değiştirmeyi gerektirir;
ayrı ve dikkatli bir sürüm konusudur.

### Yapılmayacaklar
- Evrensel şema motoru / dinamik form üreteci: mevcut üç rapor oluşturucusunu
  ve özel denetimleri yeniden yazmak gerekir; veri kaybı riski yüksektir.
- Alan tanımını veritabanına taşımak: sunucu yok ilkesiyle çelişir.
- Etiketleri yalnızca çalışma anında üretip statik belgeleri otomatik
  güncellemek: belgeler depoda metin olarak durur; testle hatırlatılır.

## 6. Değişmez kurallar

1. Yeni bir seçenek = **ilgili `*_DEFS` listesine satır** (gözlem için
   `OBS_DEFS`, rol için `TEAM_ROLE_DEFS`…); etiket kopyası yazma.
2. Arayüz düğmeleri `OBS_DEFS`ten, rapor etiketleri `OBS_LABEL`den türetilir;
   kontrol/rol etiketleri `REVIEW_*`/`*_LABEL`den gelir.
3. `emptySegment` ve `normalizeSegment` bilinen anahtarları tamamlar; bilinmeyen
   anahtarı **silmez**.
4. Rapor ve sayaç yalnız **bilinen** anahtarları basar/sayar.
5. `mergeCases` gözlemleri OR'lar ve gelen eklemeleri günlüğe yazar.
6. Testler `OBS_DEFS`i gezer; yeni anahtar otomatik sınanır.
7. Eklemeli alanlar `SCHEMA_VERSION`ı artırmaz; kırıcı değişiklik artırır.
8. Eski sürümle paket paylaşımı yeni anahtarları korumaz (bilinen sınır).

## 7. İlgili testler

- `sema-testi` [3e] — `OBS_DEFS`/`OBS_KEYS`/`OBS_LABEL`/`OBS_SHORT`/`OBS_HINT`,
  `emptyObs`, `emptySegment`, bilinmeyen anahtarın korunması.
- `birim-testleri` [75] — `mergeCases` gözlem OR'u ve günlük.
- `rapor-tutarlilik-testi` Senaryo 6 — üç çıktıda telefon/sessizlik etiketleri;
  bilinmeyen anahtarın rapora basılmaması.
- `tasarim-testi` [2bc] — düğmelerin/etiketlerin/yardımın tek kaynaktan
  türetilmesi.
- `sema-testi` [3f] — sınıflandırma/rol `*_DEFS` listeleri, `REVIEW_SHORT`/
  `REVIEW_TONE`, rol yetkilerinin türetilmesi, ortam etiketi göçü.
- `tasarim-testi` [2bd] — uygulamadaki kopya etiketlerin kaldırılması;
  rozet/filtre etiketlerinin tek kaynaktan gelmesi.

## 8. İlişkisel alan: dosya geneli kişi (v2.205)

Gözlem bayrakları ve rol seçenekleri birer **seçenek listesi**dir; dosya geneli
kişi farklı bir türdür: **ilişki**. Bu yüzden `defineOptions` ile modellenmez.

- **Tek kaynak:** `case.speakers[]` (K1, K2…) kişiyi tanımlar; kayıt içi
  konuşmacı yalnız `personId` ile bu kayda bağlanır. Yerel `S1/S2` kodları
  kayıt başına ayrı kalır.
- **Otomatik eşleştirme yok:** ad, perde veya benzerlik bağ kurmaz. Bağ yalnız
  uzmanın açık seçimiyle kurulur; bu bir **kimlik tespiti değildir**.
- **Rapor:** bağlı kişiler tek satırda; bağsız konuşmacılar ayrı satırda.
  BÖLÜM/NOT hücresi kayıt + yerel kod + bölüm sayısı ve "uzman eşleştirmesi"
  notunu taşır.
- **Silme:** kişi kaydı silinince yalnız `personId` bağları temizlenir; ses,
  metin ve yerel konuşmacı etiketleri korunur.
- **Birleştirme:** kişi alanları boşsa doldurulur; iki farklı dolu değer
  `case-speaker`, aynı konuşmacının iki farklı kişiye bağlanması
  `speaker-person` çakışması olarak bildirilir. Önizleme aynı kuralı kullanır.
- **Genişletme:** yeni bir ilişki türü eklerken aynı deseni kullanın: kayıt
  kimliği + `personId` benzeri bağ + rapor gruplaması + birleştirme çakışması +
  silmede yalnız bağın kaldırılması.
