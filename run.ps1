$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $PSScriptRoot).Path
$listener = $null
for ($p = 8787; $p -le 8817; $p++) {
    try {
        $candidate = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
        $candidate.Start()
        $listener = $candidate
        $port = $p
        break
    } catch {
        if ($candidate) { try { $candidate.Stop() } catch {} }
    }
}
if (-not $listener) { throw 'Yerel uygulama için boş bir bağlantı noktası bulunamadı.' }
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$url = "http://127.0.0.1:$port/"
Write-Host ''
Write-Host '  AKİS - Adli Konuşma İnceleme Sistemi' -ForegroundColor Cyan
Write-Host "  Uygulama adresi: $url" -ForegroundColor Green
Write-Host '  Bu pencereyi kapatmak uygulama sunucusunu durdurur.' -ForegroundColor Yellow
Write-Host ''
try {
    $edge = Get-Command msedge.exe -ErrorAction SilentlyContinue
    if ($edge) { Start-Process -FilePath $edge.Source -ArgumentList "--app=$url" }
    else { Start-Process $url }
} catch { Write-Host 'Tarayıcı otomatik açılamadı. Adresi elle açın: ' $url -ForegroundColor Yellow }
$mime = @{
    '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8';
    '.json'='application/json; charset=utf-8'; '.wav'='audio/wav'; '.mp3'='audio/mpeg'; '.m4a'='audio/mp4';
    '.ogg'='audio/ogg'; '.flac'='audio/flac'; '.txt'='text/plain; charset=utf-8'; '.svg'='image/svg+xml';
    '.png'='image/png'; '.jpg'='image/jpeg'; '.ico'='image/x-icon'
}
try {
    while ($listener.Server.IsBound) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $stream.ReadTimeout = 5000
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $request = $reader.ReadLine()
            if (-not $request) { $client.Close(); continue }
            while ($true) { $line = $reader.ReadLine(); if ($null -eq $line -or $line -eq '') { break } }
            $parts = $request.Split(' ')
            $method = $parts[0]
            $rawPath = $parts[1].Split('?')[0]
            $path = [System.Uri]::UnescapeDataString($rawPath).TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }
            $path = $path.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $full = [System.IO.Path]::GetFullPath((Join-Path $root $path))
            if (-not $full.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
                $status = '404 Not Found'; $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found'); $contentType='text/plain; charset=utf-8'
            } else {
                $bytes = [System.IO.File]::ReadAllBytes($full)
                $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
                $contentType = $mime[$ext]; if (-not $contentType) { $contentType='application/octet-stream' }
                $status = '200 OK'
            }
            $head = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
            $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
            $stream.Write($headBytes, 0, $headBytes.Length)
            if ($method -ne 'HEAD') { $stream.Write($bytes, 0, $bytes.Length) }
            $stream.Flush()
        } catch {
            # A browser tab can close a request while the local server is writing; continue serving the next request.
        } finally {
            if ($reader) { $reader.Dispose() }
            $client.Close()
        }
    }
} finally {
    if ($listener) { $listener.Stop() }
}
