#Requires -Version 5.1
<#
.SYNOPSIS
  AKİS Delil Edinme — Tier 1 (yazılımsal salt-okunur + dosya kopyası + SHA-256).

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
  Operatör adı — edinmeyi FİİLEN yapan kişi (genellikle bilirkişi).
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

.PARAMETER IncludeAll
  Yalnız ses dosyaları yerine TÜM dosyaları kopyala.

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
  [Parameter(Mandatory = $true)][string]$SourcePath,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [Parameter(Mandatory = $true)][string]$Operator,
  [string]$Registry = '',
  [string]$Organization = '',
  [string]$OperatorRegistry = '',
  [string]$DeliveredBy = '',
  [string]$DeliveredByRegistry = '',
  [string]$DeliveredAt = '',
  [string]$DeliveryPlace = '',
  [switch]$IncludeAll,
  [switch]$Simulate,
  [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'
# Windows PowerShell 5.1: konsol kod sayfasını UTF-8 yap; aksi hâlde Türkçe
# karakterler "Ã¼" gibi görünür. Linux'ta chcp yoktur; hata yutulur.
try { chcp.com 65001 | Out-Null } catch {}
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$OutputEncoding = [System.Text.Encoding]::UTF8
# Alet adı ÜRÜN MARKASI DEĞİL, çalışan dosyanın kendisidir. Rapor ARAÇ
# sütununa bu yazılır (ör. "edinme.ps1 1.0 · PowerShell").
$ToolName = 'edinme.ps1'
$ToolVersion = '1.0'
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
$pkgName = "AKIS_Delil_$stamp"
$pkgDir = Join-Path $outDir $pkgName
New-Item -ItemType Directory -Path $pkgDir -Force | Out-Null
$script:LogPath = Join-Path $pkgDir 'delil.log'

Write-Log "AKİS Delil Edinme $ToolVersion başladı."
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
    Write-Log "Sürücü türü: $driveType · BusType: $($disk.BusType)"
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
    Write-Log "Cihaz: $($device.model) · seri: $($device.serial) · etiket: $($device.label) · $($device.sizeBytes) bayt · $($device.busType)"

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

  # --- 2b. Teslim zinciri (isteğe bağlı) -----------------------------------
  # Teslim eden = flash'ı bilirkişiye veren kişi/kurum. Operatör = edinmeyi
  # fiilen yapan. İkisi AYRI kaydedilir. Boş alan UYDURULMAZ.
  function Read-Optional {
    param([string]$Value, [string]$Prompt)
    if ($Value) { return $Value }
    if ($NonInteractive -or $Simulate) { return '' }
    try { return [string](Read-Host $Prompt) } catch { return '' }
  }
  $deliveredBy = Read-Optional $DeliveredBy "Teslim eden (flash'i veren kisi/kurum; bos = bilinmiyor)"
  $deliveredByRegistry = Read-Optional $DeliveredByRegistry "Teslim edenin sicili/kayit no (varsa; TCKN yazmayin)"
  $deliveryPlace = Read-Optional $DeliveryPlace "Teslim yeri (or. Ankara 3. Sulh Ceza Mahkemesi)"
  $deliveredAtRaw = Read-Optional $DeliveredAt "Teslim tarihi (YYYY-AA-GG veya GG.AA.YYYY; bos = bilinmiyor)"
  $deliveredAtIso = ''
  if ($deliveredAtRaw) {
    try {
      $deliveredAtIso = ([datetime]::Parse($deliveredAtRaw)).ToString('yyyy-MM-dd')
    }
    catch {
      Write-Log "UYARI: teslim tarihi okunamadi, bos birakildi: $deliveredAtRaw"
    }
  }
  Write-Log ("Teslim: eden='" + $deliveredBy + "' sicil='" + $deliveredByRegistry + "' yer='" + $deliveryPlace + "' tarih='" + $deliveredAtIso + "'")

  # --- 3. Dosyaları seç ----------------------------------------------------
  $audioExt = @('.wav', '.mp3', '.m4a', '.ogg', '.flac', '.aac')
  $files = Get-ChildItem -LiteralPath $source -Recurse -File -ErrorAction Stop | Where-Object {
    $IncludeAll -or ($audioExt -contains $_.Extension.ToLowerInvariant())
  }
  if (-not $files -or $files.Count -eq 0) {
    Fail 'Kopyalanacak dosya bulunamadı. (Tüm dosyalar için -IncludeAll kullanın.)'
  }
  Write-Log ("Kopyalanacak dosya: " + $files.Count)

  # --- 4. Kopyala + SHA-256 ------------------------------------------------
  $entries = New-Object System.Collections.Generic.List[object]
  $n = 0
  foreach ($f in $files) {
    $n++
    $rel = $f.FullName.Substring($source.Length).TrimStart([char[]]@('\', '/'))
    $relPosix = $rel.Replace('\', '/')
    $dest = Join-Path (Join-Path $pkgDir 'ses') $rel
    $destDir = Split-Path -Parent $dest
    if (-not (Test-Path -LiteralPath $destDir)) {
      New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item -LiteralPath $f.FullName -Destination $dest -Force
    $hash = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant()
    $entries.Add([ordered]@{
        name       = $f.Name
        relPath    = ('ses/' + $relPosix)
        sizeBytes  = [int64]$f.Length
        sha256     = $hash
        modifiedAt = $f.LastWriteTime.ToString('o')
      })
    Write-Log ("[$n/$($files.Count)] $relPosix · SHA-256 $hash")
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
    # Teslim zinciri: teslim eden ≠ operatör. Boş alan boş kalır.
    delivery   = [ordered]@{
      deliveredBy = $deliveredBy
      registry    = $deliveredByRegistry
      deliveredAt = $deliveredAtIso
      place       = $deliveryPlace
    }
    device     = $device
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

  Write-Host ''
  Write-Host 'TAMAM.' -ForegroundColor Green
  Write-Host "Paket: $zipPath"
  Write-Host 'AKİS → Ses → "Delil paketi yükle" ile açın.'
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
