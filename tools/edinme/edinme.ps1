#Requires -Version 5.1
<#
.SYNOPSIS
  AKİS Delil Edinme - Tier 1 (yazılımsal salt-okunur + dosya kopyası + SHA-256).

.DESCRIPTION
  USB/flaş/SD kaynağından ses dosyalarını (varsayılan) kopyalar, her dosyanın
  SHA-256 özetini hesaplar ve AKİS'in okuyabileceği bir delil paketi üretir:
    AKIS_Delil_<tarih>_<saat>/
      delil.json
      delil.log
      ses/...
    AKIS_Delil_<tarih>_<saat>.zip

  GÜVENLİK:
  - Kaynağa ASLA yazmaz; yalnız okur.
  - Önce diski `diskpart` ile salt-okunur yapar; başarısızsa DURUR.
  - İş bitince salt-okunurluğu kaldırır (finally).
  - Hedef klasör kaynak sürücüde olamaz.

  DÜRÜST SINIR:
  - Donanım write-blocker YOKSA bu "adli imaj" değildir; "belgelenmiş dosya
    kopyası"dır. Raporda yöntem böyle yazılır.
  - Bu araç doğrulanmış adli araç değildir; kurgusal USB'de test edilmeden
    gerçek delile uygulanmamalıdır.

.PARAMETER SourcePath
  Kaynak sürücü kökü veya klasör (ör. E:\).

.PARAMETER OutDir
  Paketin yazılacağı klasör (ör. D:\delil). Kaynak sürücüde OLAMAZ.

.PARAMETER Operator
  Operatör adı - edinmeyi FİİLEN yapan kişi (genellikle bilirkişi).
  "Teslim eden" ile aynı kişi DEĞİLDİR; ikisi ayrı kaydedilir.

.PARAMETER Registry
  Operatör sicil no (isteğe bağlı).

.PARAMETER Organization
  Kurum (isteğe bağlı).

.PARAMETER OperatorRegistry
  Operatör sicil no için kısa ad (Registry ile aynı alana yazılır).

.PARAMETER DeliveredBy
  Teslim eden: flash'ı bilirkişiye veren kişi/kurum (isteğe bağlı; sorulur).

.PARAMETER DeliveredByRegistry
  Teslim edenin sicili/kayıt no (isteğe bağlı). TCKN YAZILMAZ.

.PARAMETER DeliveredAt
  Teslim tarihi, YYYY-AA-GG (isteğe bağlı; sorulur).

.PARAMETER DeliveryPlace
  Teslim yeri, ör. "Ankara 3. Sulh Ceza Mahkemesi" (isteğe bağlı; sorulur).

.PARAMETER NonInteractive
  Soruları atla (betikli kullanım). Boş bırakılan isteğe bağlı alan boş kalır.

.PARAMETER AudioOnly
  Yalnız ses dosyalarını kopyala. Varsayılan TÜM dosyalardır (disk yapısı korunur).

.PARAMETER IncludeAll
  Geriye uyumluluk için kabul edilir; varsayılan zaten TÜM dosyalardır.

.PARAMETER Simulate
  Kurgusal test: diskpart/cihaz bilgisi atlanır; bir klasörden paket üretilir.
  Gerçek delilde KULLANILMAZ.

.EXAMPLE
  .\edinme.ps1 -SourcePath E:\ -OutDir D:\delil -Operator "Ad Soyad" -Registry 1234

.EXAMPLE
  .\edinme.ps1 -SourcePath C:\test-veri -OutDir C:\test-cikti -Operator "Ad Soyad" -Simulate
#>
[CmdletBinding()]
param(
  [string]$SourcePath = '',
  [string]$OutDir = '',
  [string]$Operator = '',
  [string]$Registry = '',
  [string]$Organization = '',
  [string]$OperatorRegistry = '',
  [string]$DeliveredBy = '',
  [string]$DeliveredByRegistry = '',
  [string]$DeliveredAt = '',
  [string]$DeliveryPlace = '',
  [switch]$IncludeAll,
  [switch]$AudioOnly,
  [switch]$Simulate,
  [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'
# Windows PowerShell 5.1: konsol kod sayfasını UTF-8 yap; aksi hâlde Türkçe
# karakterler bozuk görünür. Linux'ta chcp yoktur; hata yutulur.
try { chcp.com 65001 | Out-Null } catch {}
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$OutputEncoding = [System.Text.Encoding]::UTF8
# Alet adı ÜRÜN MARKASI DEĞİL, aletin kendisidir. Raporda "Edinim v1.1".
$ToolName = 'Edinim'
$ToolVersion = '1.3'
$ToolEngine = 'PowerShell'
$Schema = 'akis.delil.v1'
$script:LogPath = $null

function Write-Log {
  param([string]$Message)
  $line = '{0} {1}' -f (Get-Date).ToString('s'), $Message
  Write-Host $line
  if ($script:LogPath) {
    Add-Content -LiteralPath $script:LogPath -Value $line -Encoding UTF8
  }
}

function Fail {
  param([string]$Message)
  Write-Log ("HATA: " + $Message)
  throw $Message
}

# --- 0. Sihirbaz -----------------------------------------------------------
# Parametre verilmezse adım adım sorar. Boş bırakılan isteğe bağlı alan boş
# kalır; hiçbir bilgi uydurulmaz.
function Normalize-DrivePath {
  param([string]$Path)
  $p = [string]$Path
  if (-not $p) { return '' }
  $p = $p.Trim().Trim([char[]]@('"', "'"))
  if ($p -match '^[A-Za-z]$') { return ($p.ToUpperInvariant() + ':\') }
  if ($p -match '^[A-Za-z]:$') { return ($p.ToUpperInvariant() + '\') }
  return $p
}

# Cihaz/klasör adını dosya sistemi güvenli klasör adına çevirir. Türkçe
# harfler korunur; Windows'ta yasak karakterler '_' olur.
function ConvertTo-SafeName {
  param([string]$Name, [string]$Fallback = 'cihaz')
  $n = [string]$Name
  if (-not $n) { return $Fallback }
  $n = $n -replace '[<>:"/\\|?*]', '_'
  $n = $n.Trim().TrimEnd('.')
  $n = $n -replace '\s+', '_'
  if (-not $n) { return $Fallback }
  if ($n.Length -gt 64) { $n = $n.Substring(0, 64) }
  return $n
}

function Read-Answer {
  param([string]$Prompt, [string]$Default = '')
  if ($NonInteractive) { return $Default }
  $suffix = if ($Default) { " [$Default]" } else { '' }
  $answer = Read-Host ($Prompt + $suffix)
  if (-not $answer -and $Default) { return $Default }
  return [string]$answer
}

function Read-Required {
  param([string]$Prompt)
  if ($NonInteractive) { return '' }
  while ($true) {
    $answer = Read-Host $Prompt
    if ($answer) { return [string]$answer }
    Write-Host '  Bu alan zorunlu; boş bırakılamaz.' -ForegroundColor Yellow
  }
}

function Show-Banner {
  Write-Host ''
  Write-Host '==========================================================' -ForegroundColor Cyan
  Write-Host ("  EDİNİM {0} - Delil Edinme (Tier 1)" -f $ToolVersion) -ForegroundColor Cyan
  if ($Simulate) { Write-Host '  KURGUSAL TEST - gerçek cihaz okunmaz' -ForegroundColor Yellow }
  Write-Host '==========================================================' -ForegroundColor Cyan
  Write-Host '  Kaynak salt-okunur yapılır, dosyalar kopyalanır,' -ForegroundColor Gray
  Write-Host '  SHA-256 hesaplanır ve delil paketi üretilir.' -ForegroundColor Gray
  Write-Host ''
}

if (-not $NonInteractive) {
  Show-Banner
  Write-Host '[1/4] Kaynak ve hedef' -ForegroundColor Cyan
  if (-not $SourcePath) { $SourcePath = Read-Answer '  Kaynak sürücü/klasör (ör. E, E: veya C:\veri)' }
  if (-not $OutDir) { $OutDir = Read-Answer '  Hedef klasör (ör. D:\delil)' }

  Write-Host ''
  Write-Host '[2/4] Operatör (edinmeyi yapan kişi)' -ForegroundColor Cyan
  if (-not $Operator) { $Operator = Read-Required '  Operatör ad soyad' }
  if (-not ($Registry -or $OperatorRegistry)) { $Registry = Read-Answer '  Operatör sicil no (boş = yok)' }
  if (-not $Organization) { $Organization = Read-Answer '  Kurum (boş = yok)' }

  Write-Host ''
  Write-Host '[3/4] Teslim zinciri (isteğe bağlı; boş bırakılabilir)' -ForegroundColor Cyan
  Write-Host '  Teslim eden = kaydı size veren kişi/kurum (ör. mahkeme kalemi).' -ForegroundColor Gray
  if (-not $DeliveredBy) { $DeliveredBy = Read-Answer '  Teslim eden ad / birim' }
  if (-not $DeliveredByRegistry) { $DeliveredByRegistry = Read-Answer '  Teslim edenin sicili/kayıt no (TCKN yazmayın)' }
  if (-not $DeliveredAt) { $DeliveredAt = Read-Answer '  Teslim tarihi (YYYY-AA-GG veya GG.AA.YYYY)' }
  if (-not $DeliveryPlace) { $DeliveryPlace = Read-Answer '  Teslim yeri (ör. Ankara 3. Sulh Ceza Mahkemesi)' }

  $opRegShown = if ($OperatorRegistry) { $OperatorRegistry } else { $Registry }
  Write-Host ''
  Write-Host '[4/4] Özet' -ForegroundColor Cyan
  Write-Host ("  Kaynak       : {0}" -f $SourcePath)
  Write-Host ("  Hedef        : {0}" -f $OutDir)
  Write-Host ("  Operatör     : {0}{1}" -f $Operator, $(if ($opRegShown) { ' | ' + $opRegShown } else { '' }))
  Write-Host ("  Teslim eden  : {0}{1}" -f $(if ($DeliveredBy) { $DeliveredBy } else { '(bilinmiyor)' }), $(if ($DeliveredByRegistry) { ' | ' + $DeliveredByRegistry } else { '' }))
  Write-Host ("  Teslim yeri  : {0}" -f $(if ($DeliveryPlace) { $DeliveryPlace } else { '(bilinmiyor)' }))
  Write-Host ("  Teslim tarihi: {0}" -f $(if ($DeliveredAt) { $DeliveredAt } else { '(bilinmiyor)' }))
  Write-Host ("  Kapsam       : {0}" -f $(if ($AudioOnly) { 'yalnız ses dosyaları' } else { 'TÜM dosyalar (disk yapısı korunur)' }))
  Write-Host ''
  $go = Read-Answer 'Başlasın mı? (E/h)' 'E'
  if ($go -match '^(h|hayir|hayır|n|no)$') {
    Write-Host 'Vazgeçildi. Hiçbir dosya kopyalanmadı.' -ForegroundColor Yellow
    exit 0
  }
}

$SourcePath = Normalize-DrivePath $SourcePath
$OutDir = Normalize-DrivePath $OutDir
if (-not $SourcePath) { Fail 'Kaynak belirtilmedi. Örnek: -SourcePath E' }
if (-not $OutDir) { Fail 'Hedef klasör belirtilmedi. Örnek: -OutDir D:\delil' }
if (-not $Operator) { Fail 'Operatör belirtilmedi (-Operator). Boş bırakılamaz.' }

# --- 1. Yollar -------------------------------------------------------------
$source = (Resolve-Path -LiteralPath $SourcePath).Path.TrimEnd([char[]]@('\', '/'))
if (-not (Test-Path -LiteralPath $source -PathType Container)) {
  Fail "Kaynak klasör bulunamadı: $SourcePath"
}
if (-not (Test-Path -LiteralPath $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}
$outDir = (Resolve-Path -LiteralPath $OutDir).Path.TrimEnd([char[]]@('\', '/'))
if (-not $Simulate -and $outDir.ToLowerInvariant().StartsWith($source.ToLowerInvariant())) {
  Fail 'Hedef klasör kaynak sürücünün içinde olamaz. Harici bir hedef seçin.'
}

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$pkgName = "Edinim_$stamp"
$pkgDir = Join-Path $outDir $pkgName
New-Item -ItemType Directory -Path $pkgDir -Force | Out-Null
$script:LogPath = Join-Path $pkgDir 'delil.log'

Write-Log "Edinim $ToolVersion başladı."
Write-Log "Kaynak: $source"
Write-Log "Hedef: $pkgDir"
Write-Log ("Kip: " + $(if ($Simulate) { 'SİMÜLASYON (kurgusal)' } else { 'GERÇEK (yazılımsal salt-okunur)' }))

# --- 2. Cihaz bilgisi / salt-okunur ---------------------------------------
$device = [ordered]@{
  busType   = ''
  model     = ''
  serial    = ''
  # Birim etiketi (varsa). Uydurulmaz; boşsa boş kalır.
  label     = ''
  sizeBytes = 0
  volumes   = @()
  removable = $false
}
$readOnlyMethod = 'yok (Simulate)'
$diskNumber = $null
$readOnlySet = $false

try {
  if ($Simulate) {
    $device.busType = 'USB (simulate)'
    $device.model = 'Kurgusal cihaz'
    $device.serial = 'SIM-0001'
    $device.label = 'KURGUSAL'
    $device.sizeBytes = 0
    $device.volumes = @()
    $device.removable = $true
    Write-Log 'Simülasyon: diskpart ve cihaz bilgisi atlandı.'
  }
  else {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
      [Security.Principal.WindowsBuiltInRole]::Administrator
    )
    if (-not $isAdmin) {
      Fail 'Yönetici olarak çalıştırın (diskpart için gerekli). PowerShell''i "Yönetici olarak çalıştır" ile açın.'
    }

    $qualifier = Split-Path -Qualifier $source
    if (-not $qualifier) { Fail 'Kaynak bir sürücü harfiyle belirtilmeli (ör. E:\).' }
    $driveLetter = $qualifier.TrimEnd(':')

    $part = Get-Partition -DriveLetter $driveLetter -ErrorAction Stop
    $disk = Get-Disk -Number $part.DiskNumber -ErrorAction Stop
    # USB okuyucular ve SD kart okuyucular sık sık BusType=SCSI bildirir.
    # Bu yüzden yalnız BusType'a bakmayız: birim "Removable" ise de kabul ederiz.
    $vol = Get-Volume -DriveLetter $driveLetter -ErrorAction SilentlyContinue
    $driveType = if ($vol) { [string]$vol.DriveType } else { '' }
    $allowedBus = @('USB', 'SD', 'MMC')
    $isRemovable = ($driveType -eq 'Removable')
    Write-Log "Sürücü türü: $driveType | BusType: $($disk.BusType)"
    if ($disk.IsBoot -or $disk.IsSystem) {
      Fail 'Kaynak sistem/boot diski. Edinme durduruldu; yanlış diski seçmeyin.'
    }
    if (($allowedBus -notcontains $disk.BusType) -and -not $isRemovable) {
      Fail "Kaynak çıkarılabilir USB/SD değil (BusType=$($disk.BusType), DriveType=$driveType). Edinme durduruldu."
    }

    $diskNumber = $disk.Number
    $device.busType = [string]$disk.BusType
    $device.model = [string]$disk.FriendlyName
    $device.serial = [string]$disk.SerialNumber
    $device.label = if ($vol) { [string]$vol.FileSystemLabel } else { '' }
    $device.sizeBytes = [int64]$disk.Size
    $device.volumes = @("$driveLetter`:")
    $device.removable = $isRemovable
    Write-Log "Cihaz: $($device.model) | seri: $($device.serial) | etiket: $($device.label) | $($device.sizeBytes) bayt | $($device.busType)"

    # Önce salt-okunur; başarısızsa devam etme.
    $dp = @"
select disk $diskNumber
attributes disk set readonly
attributes disk
"@
    $dpOut = $dp | diskpart
    # Komut çalıştıysa temizlik (finally) her durumda denenmeli.
    $readOnlySet = $true
    Write-Log ('diskpart çıktısı: ' + (($dpOut | Out-String).Trim() -replace "`r?`n", ' | '))
    $after = Get-Disk -Number $diskNumber -ErrorAction Stop
    if (-not $after.IsReadOnly) {
      Fail 'Disk salt-okunur yapılamadı. Edinme durduruldu; kaynağa yazma riski var.'
    }
    $readOnlyMethod = "diskpart: select disk $diskNumber; attributes disk set readonly"
    Write-Log 'Disk salt-okunur: EVET (doğrulandı).'
  }

  # --- 2b. Teslim tarihi ---------------------------------------------------
  # Değerler sihirbazdan/parametrelerden gelir; burada yalnız tarih normalize
  # edilir. Boş alan UYDURULMAZ.
  $deliveredBy = $DeliveredBy
  $deliveredByRegistry = $DeliveredByRegistry
  $deliveryPlace = $DeliveryPlace
  $deliveredAtIso = ''
  if ($DeliveredAt) {
    try {
      $deliveredAtIso = ([datetime]::Parse($DeliveredAt)).ToString('yyyy-MM-dd')
    }
    catch {
      Write-Log "UYARI: teslim tarihi okunamadı, boş bırakıldı: $DeliveredAt"
    }
  }
  Write-Log ("Teslim: eden='" + $deliveredBy + "' sicil='" + $deliveredByRegistry + "' yer='" + $deliveryPlace + "' tarih='" + $deliveredAtIso + "'")

  # --- 3. Dosyaları seç ----------------------------------------------------
  # VARSAYILAN: TÜM dosyalar (disk/flash yapısı birebir korunur). Yalnız ses
  # istenirse -AudioOnly. -IncludeAll geriye uyumluluk için kabul edilir.
  $audioExt = @('.wav', '.mp3', '.m4a', '.ogg', '.flac', '.aac')
  if ($AudioOnly -and $IncludeAll) { Fail '-AudioOnly ve -IncludeAll birlikte kullanılamaz.' }
  $files = @(Get-ChildItem -LiteralPath $source -Recurse -File -ErrorAction Stop | Where-Object {
    (-not $AudioOnly) -or ($audioExt -contains $_.Extension.ToLowerInvariant())
  })
  if ($files.Count -eq 0) {
    Fail 'Kopyalanacak dosya bulunamadı.'
  }
  Write-Log ("Kopyalanacak dosya: " + $files.Count)

  # --- 3b. İçerik kökü -----------------------------------------------------
  # Paket yapısı: icerik/<cihaz-kökü>/<KAYNAKTAKİ yol>. Cihaz kökü seri no
  # (yoksa etiket, yoksa model) olur; klasör kaynağında klasör adı kullanılır.
  $rootSeed = if ($Simulate) {
    Split-Path -Leaf $source
  }
  elseif ($device.serial) { $device.serial }
  elseif ($device.label) { $device.label }
  else { $device.model }
  $safeRoot = ConvertTo-SafeName $rootSeed 'cihaz'
  $contentRoot = 'icerik/' + $safeRoot
  $rootDir = Join-Path (Join-Path $pkgDir 'icerik') $safeRoot
  Write-Log ("İçerik kökü: $contentRoot")

  # --- 4. Kopyala + SHA-256 ------------------------------------------------
  $entries = New-Object System.Collections.Generic.List[object]
  $n = 0
  foreach ($f in $files) {
    $n++
    Write-Progress -Activity 'Kopyalanıyor' -Status ("{0} / {1}  {2}" -f $n, $files.Count, $f.Name) -PercentComplete (($n / $files.Count) * 100)
    # KAYNAKTAKİ göreli yol (orijinal). "ses/" gibi yapay klasör EKLENMEZ.
    $rel = $f.FullName.Substring($source.Length).TrimStart([char[]]@('\', '/'))
    $relPosix = $rel.Replace('\', '/')
    $dest = Join-Path $rootDir $rel
    $destDir = Split-Path -Parent $dest
    if (-not (Test-Path -LiteralPath $destDir)) {
      New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item -LiteralPath $f.FullName -Destination $dest -Force
    $hash = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant()
    $entries.Add([ordered]@{
        name        = $f.Name
        relPath     = $relPosix
        packagePath = ($contentRoot + '/' + $relPosix)
        sizeBytes   = [int64]$f.Length
        sha256      = $hash
        modifiedAt  = $f.LastWriteTime.ToString('o')
      })
    Write-Log ("[$n/$($files.Count)] $relPosix | SHA-256 $hash")
  }

  # Dizin listesi: her dosyanın üst klasörleri (disk yapısı).
  $dirSet = New-Object System.Collections.Generic.HashSet[string]
  foreach ($e in $entries) {
    $p = [string]$e.relPath
    while (($idx = $p.LastIndexOf('/')) -gt 0) {
      $p = $p.Substring(0, $idx)
      [void]$dirSet.Add($p)
    }
  }
  $dirs = @($dirSet | Sort-Object)

  # --- 4b. Disk / bölüm / birim anlık görüntüsü (raw sektör YOK) -----------
  $deviceMeta = [ordered]@{
    model     = $device.model
    serial    = $device.serial
    label     = $device.label
    busType   = $device.busType
    sizeBytes = $device.sizeBytes
    removable = $device.removable
  }
  $partitionMeta = @()
  $volumeMeta = @()
  if (-not $Simulate -and $diskNumber -ne $null) {
    $afterDisk = Get-Disk -Number $diskNumber -ErrorAction SilentlyContinue
    if ($afterDisk) {
      $deviceMeta.number = [int]$afterDisk.Number
      $deviceMeta.partitionStyle = [string]$afterDisk.PartitionStyle
      $deviceMeta.isReadOnly = [bool]$afterDisk.IsReadOnly
      $deviceMeta.isBoot = [bool]$afterDisk.IsBoot
      $deviceMeta.isSystem = [bool]$afterDisk.IsSystem
    }
    $partitionMeta = @(Get-Partition -DiskNumber $diskNumber -ErrorAction SilentlyContinue | ForEach-Object {
        [ordered]@{
          number      = [int]$_.PartitionNumber
          offsetBytes = [int64]$_.Offset
          sizeBytes   = [int64]$_.Size
          type        = [string]$_.Type
          driveLetter = ([string]$_.DriveLetter).TrimEnd(':')
          isActive    = [bool]$_.IsActive
          isHidden    = [bool]$_.IsHidden
        }
      })
    $volumeMeta = @($partitionMeta | Where-Object { $_.driveLetter } | ForEach-Object {
        $v = Get-Volume -DriveLetter $_.driveLetter -ErrorAction SilentlyContinue
        $volSerial = ''
        try {
          $ld = Get-CimInstance -ClassName Win32_LogicalDisk -Filter ("DeviceID='" + $_.driveLetter + ":'") -ErrorAction Stop
          $volSerial = [string]$ld.VolumeSerialNumber
        }
        catch {}
        [ordered]@{
          driveLetter   = $_.driveLetter
          fileSystem    = if ($v) { [string]$v.FileSystem } else { '' }
          label         = if ($v) { [string]$v.FileSystemLabel } else { '' }
          driveType     = if ($v) { [string]$v.DriveType } else { '' }
          sizeBytes     = if ($v) { [int64]$v.Size } else { 0 }
          sizeRemaining = if ($v) { [int64]$v.SizeRemaining } else { 0 }
          volumeSerial  = $volSerial
        }
      })
  }

  # --- 5. delil.json -------------------------------------------------------
  $notes = if ($Simulate) {
    'KURGUSAL TEST: gerçek cihaz okunmadı; yalnız paket/şema testi.'
  }
  else {
    'Donanım write-blocker kullanılmadı; disk yazılımsal olarak salt-okunur yapıldı. Bu bir adli imaj değil, belgelenmiş dosya kopyasıdır.'
  }
  $opRegistry = if ($OperatorRegistry) { $OperatorRegistry } else { $Registry }
  $manifest = [ordered]@{
    schema     = $Schema
    acquiredAt = (Get-Date).ToString('o')
    operator   = [ordered]@{
      name         = $Operator
      registry     = $opRegistry
      organization = $Organization
    }
    # Teslim zinciri: teslim eden != operatör. Boş alan boş kalır.
    delivery   = [ordered]@{
      deliveredBy = $deliveredBy
      registry    = $deliveredByRegistry
      deliveredAt = $deliveredAtIso
      place       = $deliveryPlace
    }
    device     = $device
    # Paket içeriğinin kökü: icerik/<cihaz-kökü>
    content    = [ordered]@{
      root      = $contentRoot
      fileCount = $entries.Count
    }
    method     = [ordered]@{
      readOnly             = $readOnlyMethod
      hardwareWriteBlocker = $false
      copyType             = 'logical-file-copy'
      image                = $null
      tool                 = [ordered]@{
        name    = $ToolName
        version = $ToolVersion
        engine  = $ToolEngine
      }
    }
    files      = $entries.ToArray()
    notes      = $notes
  }
  $json = $manifest | ConvertTo-Json -Depth 10
  $utf8 = New-Object System.Text.UTF8Encoding -ArgumentList $false
  try {
    [System.IO.File]::WriteAllText((Join-Path $pkgDir 'delil.json'), $json, $utf8)
  }
  catch {
    Fail ('delil.json yazılamadı: ' + $_.Exception.Message)
  }
  Write-Log 'delil.json yazıldı.'

  # --- 5b. disk.json (disk/bölüm/birim + dizin ağacı; raw sektör YOK) ------
  $diskDoc = [ordered]@{
    schema     = 'akis.disk.v1'
    capturedAt = (Get-Date).ToString('o')
    source     = [ordered]@{
      type = $(if ($Simulate) { 'simulate' } else { 'device' })
      path = $source
    }
    device     = $deviceMeta
    partitions = @($partitionMeta)
    volumes    = @($volumeMeta)
    content    = [ordered]@{
      root        = $contentRoot
      directories = @($dirs)
      fileCount   = $entries.Count
    }
  }
  $diskJson = $diskDoc | ConvertTo-Json -Depth 10
  try {
    [System.IO.File]::WriteAllText((Join-Path $pkgDir 'disk.json'), $diskJson, $utf8)
  }
  catch {
    Fail ('disk.json yazılamadı: ' + $_.Exception.Message)
  }
  Write-Log 'disk.json yazıldı.'


  # --- 6. ZIP --------------------------------------------------------------
  $zipPath = Join-Path $outDir ($pkgName + '.zip')
  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
  try {
    # .NET ZipFile, Compress-Archive modülüne bağımlı değildir; Windows
    # PowerShell 5.1 ve PowerShell 7'de çalışır.
    try { Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop } catch {}
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
      $pkgDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false
    )
  }
  catch {
    try {
      Compress-Archive -Path (Join-Path $pkgDir '*') -DestinationPath $zipPath -CompressionLevel Optimal
    }
    catch {
      Fail ('ZIP oluşturulamadı: ' + $_.Exception.Message)
    }
  }
  Write-Log "Paket: $zipPath"

  Write-Progress -Activity 'Kopyalanıyor' -Completed

  $opRegOut = if ($OperatorRegistry) { $OperatorRegistry } else { $Registry }
  Write-Host ''
  Write-Host '==========================================================' -ForegroundColor Green
  Write-Host '  TAMAM - Delil paketi hazır' -ForegroundColor Green
  Write-Host '==========================================================' -ForegroundColor Green
  Write-Host ("  Paket        : {0}" -f $zipPath)
  Write-Host ("  Dosya        : {0} (her biri SHA-256 ile)" -f $entries.Count)
  Write-Host ("  Yapı         : {0}/<kaynak yolu>" -f $contentRoot)
  Write-Host ("  Cihaz        : {0} | seri {1}{2}" -f $device.model, $device.serial, $(if ($device.label) { ' | etiket ' + $device.label } else { '' }))
  Write-Host ("  Operatör     : {0}{1}" -f $Operator, $(if ($opRegOut) { ' | ' + $opRegOut } else { '' }))
  Write-Host ("  Teslim eden  : {0}{1}" -f $(if ($DeliveredBy) { $DeliveredBy } else { '(bilinmiyor)' }), $(if ($DeliveredByRegistry) { ' | ' + $DeliveredByRegistry } else { '' }))
  Write-Host ("  Teslim yeri  : {0}" -f $(if ($DeliveryPlace) { $DeliveryPlace } else { '(bilinmiyor)' }))
  Write-Host ''
  Write-Host '  Sonraki adım: AKİS > Ses > "Delil paketi yükle"' -ForegroundColor Cyan
  Write-Host '==========================================================' -ForegroundColor Green
}
catch {
  Write-Host ''
  Write-Host 'İŞLEM DURDURULDU.' -ForegroundColor Red
  Write-Host ('  ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host '  Ayrıntı: delil.log' -ForegroundColor Yellow
  if ($script:LogPath) { Write-Log ('DURDURULDU: ' + $_.Exception.Message) }
  exit 1
}
finally {
  if ($readOnlySet -and $diskNumber -ne $null) {
    try {
      $dp = @"
select disk $diskNumber
attributes disk clear readonly
"@
      $dp | diskpart | Out-Null
      Write-Log 'Salt-okunur kaldırıldı.'
    }
    catch {
      Write-Log ('UYARI: salt-okunur kaldırılamadı. Diski elle kontrol edin: ' + $_)
    }
  }
}
