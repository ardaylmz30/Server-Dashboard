$ErrorActionPreference = "Stop"

$port = 8765
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$listener.Start()

Write-Host "Server Dashboard Windows metrics agent listening on port $port"

function Get-Metrics {
    $cpu = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"
    $os = Get-CimInstance Win32_OperatingSystem
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"

    $totalMemoryBytes = [double]$os.TotalVisibleMemorySize * 1024
    $freeMemoryBytes = [double]$os.FreePhysicalMemory * 1024
    $usedMemoryBytes = $totalMemoryBytes - $freeMemoryBytes

    $ramPercent = if ($totalMemoryBytes -gt 0) {
        ($usedMemoryBytes / $totalMemoryBytes) * 100
    } else { 0 }

    $diskPercent = if ($disk.Size -gt 0) {
        (($disk.Size - $disk.FreeSpace) / $disk.Size) * 100
    } else { 0 }

    return @{ 
        cpu = [math]::Round([double]$cpu.PercentProcessorTime, 1)
        ram = [math]::Round($ramPercent, 1)
        ram_total_gb = [math]::Round($totalMemoryBytes / 1GB, 1)
        disk = [math]::Round($diskPercent, 1)
        source = "windows-host"
    } | ConvertTo-Json -Compress
}

function Send-Response($stream, [int]$statusCode, [string]$statusText, [string]$body) {
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $headers = "HTTP/1.1 $statusCode $statusText`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($bodyBytes, 0, $bodyBytes.Length)
}

try {
    while ($true) {
        try {
            if (-not $listener.Pending()) {
                Start-Sleep -Milliseconds 50
                continue
            }

            $client = $listener.AcceptTcpClient()
            try {
                $stream = $client.GetStream()
                $buffer = New-Object byte[] 8192
                $read = $stream.Read($buffer, 0, $buffer.Length)
                $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
                $requestLine = ($request -split "`r?`n")[0]
                $parts = $requestLine.Split(" ")

                if ($parts.Count -ge 2 -and $parts[0] -eq "GET" -and $parts[1] -eq "/metrics") {
                    Send-Response $stream 200 "OK" (Get-Metrics)
                } else {
                    Send-Response $stream 404 "Not Found" '{"detail":"Not found"}'
                }
            } catch {
                try { Send-Response $stream 500 "Internal Server Error" '{"detail":"Metrics agent error"}' } catch {}
            } finally {
                if ($stream) { $stream.Dispose() }
                $client.Dispose()
            }
        } catch {
            # Accept-loop seviyesinde bir hata (soket, CIM/WMI hiccup, vb.) olursa
            # tüm agent'ı öldürmek yerine logla ve devam et.
            Write-Host "[host-metrics-agent] loop error: $($_.Exception.Message)"
            Start-Sleep -Milliseconds 200
        }
    }
} finally {
    $listener.Stop()
}