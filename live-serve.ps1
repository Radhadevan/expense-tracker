$port = 3000
$root = $PSScriptRoot

$localIP = "10.216.40.100"
try {
    $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -notlike '127.*' -and $_.IPAddressToString -notlike '169.254*' }
    if ($ips) { $localIP = $ips[0].IPAddressToString }
} catch {
    $localIP = "10.216.40.100"
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
$listener.Start()

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " SpendFlow - Live Reload Server (Phone & Desktop)" -ForegroundColor Cyan
Write-Host " PC Local:  http://localhost:$port/" -ForegroundColor Yellow
Write-Host " On Phone:  http://$($localIP):$port/" -ForegroundColor Green
Write-Host " Live Reload: ACTIVE (Changes auto-reflect on phone/PC)" -ForegroundColor Magenta
Write-Host " Press Ctrl+C in this window to stop the server." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green

$mimeMap = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $client.ReceiveTimeout = 3000
        $client.SendTimeout = 3000
        $stream = $client.GetStream()
        
        try {
            $buffer = New-Object byte[] 8192
            $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
            if ($bytesRead -gt 0) {
                $reqText = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $bytesRead)
                $firstLine = ($reqText -split "`r?`n")[0]
                $parts = $firstLine -split " "
                if ($parts.Length -ge 2) {
                    $rawUrl = $parts[1]
                    $path = ($rawUrl -split "\?")[0]
                    if ($path -eq "/" -or $path -eq "") { $path = "/index.html" }

                    if ($path -eq "/live-reload-check") {
                        $files = Get-ChildItem -Path $root -File | Where-Object { $_.Name -match '\.(html|css|js|json|svg)$' }
                        $maxTicks = 0
                        foreach ($f in $files) {
                            if ($f.LastWriteTimeUtc.Ticks -gt $maxTicks) {
                                $maxTicks = $f.LastWriteTimeUtc.Ticks
                            }
                        }
                        $body = [System.Text.Encoding]::UTF8.GetBytes("$maxTicks")
                        $headers = "HTTP/1.1 200 OK`r`nContent-Type: text/plain`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-cache, no-store, must-revalidate`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
                        $hBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                        $stream.Write($hBytes, 0, $hBytes.Length)
                        $stream.Write($body, 0, $body.Length)
                        $stream.Flush()
                    } else {
                        $rel = $path.TrimStart('/').Replace('/', '\')
                        $filePath = Join-Path $root $rel
                        if (Test-Path $filePath -PathType Leaf) {
                            $bytes = [System.IO.File]::ReadAllBytes($filePath)
                            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                            $mime = if ($mimeMap.ContainsKey($ext)) { $mimeMap[$ext] } else { "application/octet-stream" }
                            $headers = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-cache`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
                            $hBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                            $stream.Write($hBytes, 0, $hBytes.Length)
                            $stream.Write($bytes, 0, $bytes.Length)
                            $stream.Flush()
                        } else {
                            $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                            $headers = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($notFound.Length)`r`nConnection: close`r`n`r`n"
                            $hBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                            $stream.Write($hBytes, 0, $hBytes.Length)
                            $stream.Write($notFound, 0, $notFound.Length)
                            $stream.Flush()
                        }
                    }
                }
            }
        } catch {
            # Ignore client connection drops
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
