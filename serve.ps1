$port = 3000
$root = $PSScriptRoot
$dataDir = Join-Path $root "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}
$storeFile = Join-Path $dataDir "shared_store.json"
$global:lastDataChangeTicks = [DateTime]::UtcNow.Ticks

$localIP = "10.216.40.100"
try {
    $lines = ipconfig | Select-String "IPv4"
    foreach ($l in $lines) {
        $val = ($l -split ":")[-1].Trim()
        if ($val -notlike "127.*" -and $val -notlike "169.254.*") {
            $localIP = $val
            break
        }
    }
} catch {
    $localIP = "10.216.40.100"
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
$listener.Start()

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Expense Tracker - Personal Finance (Phone & Desktop)" -ForegroundColor Cyan
Write-Host " PC Local:  http://localhost:$port/" -ForegroundColor Yellow
Write-Host " On Phone:  http://$($localIP):$port/" -ForegroundColor Green
Write-Host " Live Sync: ACTIVE (Instant phone & desktop live data update)" -ForegroundColor Magenta
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
        try {
            $client = $listener.AcceptTcpClient()
            $client.ReceiveTimeout = 4000
            $client.SendTimeout = 4000
            $stream = $client.GetStream()
            
            try {
                $memStream = New-Object System.IO.MemoryStream
                $buffer = New-Object byte[] 16384
                $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
                
                if ($bytesRead -gt 0) {
                    $memStream.Write($buffer, 0, $bytesRead)
                    $initialBytes = $memStream.ToArray()
                    $reqText = [System.Text.Encoding]::UTF8.GetString($initialBytes)
                    $headerEndPos = $reqText.IndexOf("`r`n`r`n")
                    
                    # Read remaining body if Content-Length specified
                    if ($reqText -match "(?i)Content-Length:\s*(\d+)") {
                        $contentLength = [int]$matches[1]
                        if ($headerEndPos -ge 0) {
                            $headerByteCount = [System.Text.Encoding]::UTF8.GetByteCount($reqText.Substring(0, $headerEndPos + 4))
                            $bodyBytesRead = $memStream.Length - $headerByteCount
                            while ($bodyBytesRead -lt $contentLength) {
                                $toRead = [Math]::Min($buffer.Length, $contentLength - $bodyBytesRead)
                                $chunk = $stream.Read($buffer, 0, $toRead)
                                if ($chunk -le 0) { break }
                                $memStream.Write($buffer, 0, $chunk)
                                $bodyBytesRead += $chunk
                            }
                        }
                    }
                    
                    $fullBytes = $memStream.ToArray()
                    $fullReqText = [System.Text.Encoding]::UTF8.GetString($fullBytes)
                    $firstLine = ($fullReqText -split "`r?`n")[0]
                    $parts = $firstLine -split " "
                    
                    if ($parts.Length -ge 2) {
                        $method = $parts[0].ToUpper()
                        $rawUrl = $parts[1]
                        $path = ($rawUrl -split "\?")[0]
                        if ($path -eq "/" -or $path -eq "") { $path = "/index.html" }

                        # CORS preflight
                        if ($method -eq "OPTIONS") {
                            $headers = "HTTP/1.1 204 No Content`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type, Cache-Control`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
                            $hBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                            $stream.Write($hBytes, 0, $hBytes.Length)
                            $stream.Flush()
                        }
                        # Live reload check endpoint
                        elseif ($path -eq "/live-reload-check") {
                            $files = Get-ChildItem -Path $root -File | Where-Object { $_.Name -match '\.(html|css|js|json|svg)$' }
                            $maxTicks = $global:lastDataChangeTicks
                            foreach ($f in $files) {
                                if ($f.LastWriteTimeUtc.Ticks -gt $maxTicks) {
                                    $maxTicks = $f.LastWriteTimeUtc.Ticks
                                }
                            }
                            $body = [System.Text.Encoding]::UTF8.GetBytes("$maxTicks")
                            $headers = "HTTP/1.1 200 OK`r`nContent-Type: text/plain`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-cache, no-store, must-revalidate`r`nPragma: no-cache`r`nExpires: 0`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
                            $hBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                            $stream.Write($hBytes, 0, $hBytes.Length)
                            $stream.Write($body, 0, $body.Length)
                            $stream.Flush()
                        }
                        # Live sync metadata endpoint (lightweight timestamp query)
                        elseif ($path -eq "/api/sync-meta") {
                            $resp = "{`"timestamp`":$($global:lastDataChangeTicks)}"
                            $bBytes = [System.Text.Encoding]::UTF8.GetBytes($resp)
                            $headers = "HTTP/1.1 200 OK`r`nContent-Type: application/json`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-cache, no-store, must-revalidate`r`nPragma: no-cache`r`nExpires: 0`r`nContent-Length: $($bBytes.Length)`r`nConnection: close`r`n`r`n"
                            $hBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                            $stream.Write($hBytes, 0, $hBytes.Length)
                            $stream.Write($bBytes, 0, $bBytes.Length)
                            $stream.Flush()
                        }
                        # Cross-device data sync endpoint
                        elseif ($path -eq "/api/sync-data") {
                            if ($method -eq "POST") {
                                $headerEnd = $fullReqText.IndexOf("`r`n`r`n")
                                if ($headerEnd -ge 0) {
                                    $jsonBody = $fullReqText.Substring($headerEnd + 4)
                                    if ($jsonBody.Trim().Length -gt 2) {
                                        [System.IO.File]::WriteAllText($storeFile, $jsonBody, [System.Text.Encoding]::UTF8)
                                        $global:lastDataChangeTicks = [DateTime]::UtcNow.Ticks
                                    }
                                }
                                $resp = "{`"status`":`"ok`",`"timestamp`":$($global:lastDataChangeTicks)}"
                                $bBytes = [System.Text.Encoding]::UTF8.GetBytes($resp)
                                $headers = "HTTP/1.1 200 OK`r`nContent-Type: application/json`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-cache, no-store`r`nContent-Length: $($bBytes.Length)`r`nConnection: close`r`n`r`n"
                                $hBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                                $stream.Write($hBytes, 0, $hBytes.Length)
                                $stream.Write($bBytes, 0, $bBytes.Length)
                                $stream.Flush()
                            } else {
                                # GET
                                $content = if (Test-Path $storeFile) { [System.IO.File]::ReadAllText($storeFile, [System.Text.Encoding]::UTF8) } else { "{`"empty`":true}" }
                                $bBytes = [System.Text.Encoding]::UTF8.GetBytes($content)
                                $headers = "HTTP/1.1 200 OK`r`nContent-Type: application/json`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-cache, no-store, must-revalidate`r`nPragma: no-cache`r`nExpires: 0`r`nContent-Length: $($bBytes.Length)`r`nConnection: close`r`n`r`n"
                                $hBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                                $stream.Write($hBytes, 0, $hBytes.Length)
                                $stream.Write($bBytes, 0, $bBytes.Length)
                                $stream.Flush()
                            }
                        }
                        # Static file serving
                        else {
                            $rel = $path.TrimStart('/').Replace('/', '\')
                            $filePath = Join-Path $root $rel
                            if (Test-Path $filePath -PathType Leaf) {
                                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                                $mime = if ($mimeMap.ContainsKey($ext)) { $mimeMap[$ext] } else { "application/octet-stream" }
                                $headers = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-cache, no-store, must-revalidate`r`nPragma: no-cache`r`nExpires: 0`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
                                $hBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                                $stream.Write($hBytes, 0, $hBytes.Length)
                                $stream.Write($bytes, 0, $bytes.Length)
                                $stream.Flush()
                            } else {
                                $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                                $headers = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($notFound.Length)`r`nConnection: close`r`n`r`n"
                                $hBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                                $stream.Write($hBytes, 0, $hBytes.Length)
                                $stream.Write($notFound, 0, $notFound.Length)
                                $stream.Flush()
                            }
                        }
                    }
                }
            } catch {
                # Ignore connection errors
            } finally {
                try { $stream.Flush() } catch {}
                try { $client.Client.Shutdown([System.Net.Sockets.SocketShutdown]::Send) } catch {}
                try { $client.Close() } catch {}
            }
        } catch {
            Start-Sleep -Milliseconds 50
        }
    }
} finally {
    $listener.Stop()
}
