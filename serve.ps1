$port = 3000
$root = $PSScriptRoot
$dataDir = Join-Path $root "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}
$storeFile = Join-Path $dataDir "shared_store.json"

# Auto-detect local Wi-Fi IP address
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

$csharp = @"
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

public class LiveSyncServer {
    private TcpListener _listener;
    private string _root;
    private string _storeFile;
    private long _lastTicks;
    private bool _running;

    public LiveSyncServer(int port, string rootDir, string storeFilePath) {
        _root = rootDir;
        _storeFile = storeFilePath;
        _lastTicks = DateTime.UtcNow.Ticks;
        _listener = new TcpListener(IPAddress.Any, port);
    }

    public void Start() {
        _running = true;
        _listener.Start(100);
        ThreadPool.QueueUserWorkItem((state) => {
            while (_running) {
                try {
                    TcpClient client = _listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem((cObj) => {
                        HandleClient((TcpClient)cObj);
                    }, client);
                } catch (Exception) {
                    if (!_running) break;
                    Thread.Sleep(50);
                }
            }
        });
    }

    public void Stop() {
        _running = false;
        try { _listener.Stop(); } catch {}
    }

    private void HandleClient(TcpClient client) {
        client.ReceiveTimeout = 6000;
        client.SendTimeout = 6000;
        using (client) {
            try {
                using (NetworkStream stream = client.GetStream()) {
                    byte[] buffer = new byte[16384];
                    int read = stream.Read(buffer, 0, buffer.Length);
                    if (read <= 0) return;

                    string reqHeader = Encoding.UTF8.GetString(buffer, 0, read);
                    int headerEnd = reqHeader.IndexOf("\r\n\r\n");
                    if (headerEnd < 0) return;

                    string firstLine = reqHeader.Substring(0, reqHeader.IndexOf("\r\n"));
                    string[] parts = firstLine.Split(' ');
                    if (parts.Length < 2) return;

                    string method = parts[0].ToUpper();
                    string url = parts[1];
                    string path = url.Split('?')[0];
                    if (path == "/" || string.IsNullOrEmpty(path)) path = "/index.html";

                    // CORS Preflight
                    if (method == "OPTIONS") {
                        byte[] corsHeaders = Encoding.ASCII.GetBytes(
                            "HTTP/1.1 204 No Content\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT\r\n" +
                            "Access-Control-Allow-Headers: *\r\n" +
                            "Content-Length: 0\r\n" +
                            "Connection: close\r\n\r\n"
                        );
                        stream.Write(corsHeaders, 0, corsHeaders.Length);
                        stream.Flush();
                        return;
                    }

                    // /api/sync-meta (Fast timestamp check)
                    if (path == "/api/sync-meta") {
                        byte[] metaBody = Encoding.UTF8.GetBytes("{\"timestamp\":" + Interlocked.Read(ref _lastTicks) + "}");
                        byte[] metaHdr = Encoding.ASCII.GetBytes(
                            "HTTP/1.1 200 OK\r\n" +
                            "Content-Type: application/json\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Cache-Control: no-cache, no-store, must-revalidate\r\n" +
                            "Content-Length: " + metaBody.Length + "\r\n" +
                            "Connection: close\r\n\r\n"
                        );
                        stream.Write(metaHdr, 0, metaHdr.Length);
                        stream.Write(metaBody, 0, metaBody.Length);
                        stream.Flush();
                        return;
                    }

                    // /api/sync-data (Read / Write shared store)
                    if (path == "/api/sync-data") {
                        if (method == "POST") {
                            int contentLength = 0;
                            var match = System.Text.RegularExpressions.Regex.Match(reqHeader, @"(?i)Content-Length:\s*(\d+)");
                            if (match.Success) {
                                int.TryParse(match.Groups[1].Value, out contentLength);
                            }

                            int headerBytesCount = Encoding.UTF8.GetByteCount(reqHeader.Substring(0, headerEnd + 4));
                            using (var ms = new MemoryStream()) {
                                if (read > headerBytesCount) {
                                    ms.Write(buffer, headerBytesCount, read - headerBytesCount);
                                }
                                while (ms.Length < contentLength) {
                                    int toRead = (int)Math.Min((long)buffer.Length, contentLength - ms.Length);
                                    int cRead = stream.Read(buffer, 0, toRead);
                                    if (cRead <= 0) break;
                                    ms.Write(buffer, 0, cRead);
                                }
                                string jsonBody = Encoding.UTF8.GetString(ms.ToArray());
                                if (!string.IsNullOrWhiteSpace(jsonBody) && jsonBody.Trim().Length > 2) {
                                    File.WriteAllText(_storeFile, jsonBody, Encoding.UTF8);
                                    long newTicks = DateTime.UtcNow.Ticks;
                                    Interlocked.Exchange(ref _lastTicks, newTicks);
                                    Console.WriteLine("[" + DateTime.Now.ToString("HH:mm:ss") + "] Live Sync Saved (" + jsonBody.Length + " bytes)");
                                }
                            }

                            byte[] postResp = Encoding.UTF8.GetBytes("{\"status\":\"ok\",\"timestamp\":" + Interlocked.Read(ref _lastTicks) + "}");
                            byte[] postHdr = Encoding.ASCII.GetBytes(
                                "HTTP/1.1 200 OK\r\n" +
                                "Content-Type: application/json\r\n" +
                                "Access-Control-Allow-Origin: *\r\n" +
                                "Cache-Control: no-cache, no-store\r\n" +
                                "Content-Length: " + postResp.Length + "\r\n" +
                                "Connection: close\r\n\r\n"
                            );
                            stream.Write(postHdr, 0, postHdr.Length);
                            stream.Write(postResp, 0, postResp.Length);
                            stream.Flush();
                            return;
                        } else {
                            string content = File.Exists(_storeFile) ? File.ReadAllText(_storeFile, Encoding.UTF8) : "{\"empty\":true}";
                            byte[] dataBytes = Encoding.UTF8.GetBytes(content);
                            byte[] dataHdr = Encoding.ASCII.GetBytes(
                                "HTTP/1.1 200 OK\r\n" +
                                "Content-Type: application/json\r\n" +
                                "Access-Control-Allow-Origin: *\r\n" +
                                "Cache-Control: no-cache, no-store, must-revalidate\r\n" +
                                "Content-Length: " + dataBytes.Length + "\r\n" +
                                "Connection: close\r\n\r\n"
                            );
                            stream.Write(dataHdr, 0, dataHdr.Length);
                            stream.Write(dataBytes, 0, dataBytes.Length);
                            stream.Flush();
                            return;
                        }
                    }

                    // /live-reload-check
                    if (path == "/live-reload-check") {
                        long maxTicks = Interlocked.Read(ref _lastTicks);
                        var dir = new DirectoryInfo(_root);
                        foreach (var f in dir.GetFiles()) {
                            string ext = f.Extension.ToLower();
                            if (ext == ".html" || ext == ".css" || ext == ".js" || ext == ".json" || ext == ".svg") {
                                if (f.LastWriteTimeUtc.Ticks > maxTicks) {
                                    maxTicks = f.LastWriteTimeUtc.Ticks;
                                }
                            }
                        }
                        byte[] ticksBytes = Encoding.UTF8.GetBytes(maxTicks.ToString());
                        byte[] ticksHdr = Encoding.ASCII.GetBytes(
                            "HTTP/1.1 200 OK\r\n" +
                            "Content-Type: text/plain\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Cache-Control: no-cache, no-store, must-revalidate\r\n" +
                            "Content-Length: " + ticksBytes.Length + "\r\n" +
                            "Connection: close\r\n\r\n"
                        );
                        stream.Write(ticksHdr, 0, ticksHdr.Length);
                        stream.Write(ticksBytes, 0, ticksBytes.Length);
                        stream.Flush();
                        return;
                    }

                    // Static file serving
                    string relPath = path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                    string filePath = Path.Combine(_root, relPath);
                    if (File.Exists(filePath)) {
                        byte[] fileBytes = File.ReadAllBytes(filePath);
                        string ext = Path.GetExtension(filePath).ToLower();
                        string mime = "application/octet-stream";
                        if (ext == ".html") mime = "text/html; charset=utf-8";
                        else if (ext == ".css") mime = "text/css; charset=utf-8";
                        else if (ext == ".js") mime = "application/javascript; charset=utf-8";
                        else if (ext == ".json") mime = "application/json; charset=utf-8";
                        else if (ext == ".svg") mime = "image/svg+xml";
                        else if (ext == ".png") mime = "image/png";
                        else if (ext == ".jpg" || ext == ".jpeg") mime = "image/jpeg";
                        else if (ext == ".ico") mime = "image/x-icon";

                        byte[] fileHdr = Encoding.ASCII.GetBytes(
                            "HTTP/1.1 200 OK\r\n" +
                            "Content-Type: " + mime + "\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Cache-Control: no-cache, no-store, must-revalidate\r\n" +
                            "Content-Length: " + fileBytes.Length + "\r\n" +
                            "Connection: close\r\n\r\n"
                        );
                        stream.Write(fileHdr, 0, fileHdr.Length);
                        stream.Write(fileBytes, 0, fileBytes.Length);
                        stream.Flush();
                    } else {
                        byte[] notFound = Encoding.ASCII.GetBytes("404 Not Found");
                        byte[] notFoundHdr = Encoding.ASCII.GetBytes(
                            "HTTP/1.1 404 Not Found\r\n" +
                            "Content-Type: text/plain\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Content-Length: " + notFound.Length + "\r\n" +
                            "Connection: close\r\n\r\n"
                        );
                        stream.Write(notFoundHdr, 0, notFoundHdr.Length);
                        stream.Write(notFound, 0, notFound.Length);
                        stream.Flush();
                    }
                }
            } catch {}
            finally {
                try { client.Client.Shutdown(SocketShutdown.Send); } catch {}
                try { client.Close(); } catch {}
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csharp

$server = New-Object LiveSyncServer($port, $root, $storeFile)
$server.Start()

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Expense Tracker - Live Multi-Device Server Active" -ForegroundColor Cyan
Write-Host " PC Local:  http://localhost:$port/" -ForegroundColor Yellow
Write-Host " On Phone:  http://$($localIP):$port/" -ForegroundColor Green
Write-Host " Multi-Threaded Async Core: READY" -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Green

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    $server.Stop()
}
