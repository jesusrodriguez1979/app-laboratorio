# Servidor Web Estático en PowerShell usando .NET HttpListener
# Permite servir la aplicación localmente sin errores de CORS de ES6 Modules

$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "=========================================================" -ForegroundColor DarkYellow
    Write-Host "  LubeLab Portal - Servidor Local Iniciado" -ForegroundColor Green
    Write-Host "  Abrir navegador en: http://localhost:$port/" -ForegroundColor Cyan
    Write-Host "  Presione CTRL+C en esta terminal para apagar el servidor" -ForegroundColor Yellow
    Write-Host "=========================================================" -ForegroundColor DarkYellow

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $url = $request.Url.LocalPath
        if ($url -eq "/") { $url = "/index.html" }
        
        # Eliminar barra inicial para usar Join-Path
        $relPath = $url.TrimStart("/")
        $filePath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $relPath))
        
        # Validar que el archivo esté dentro de la carpeta del proyecto para seguridad
        $currentDir = [System.IO.Path]::GetFullPath((Get-Location))
        if (-not $filePath.StartsWith($currentDir)) {
            Write-Host "ACCESO RECHAZADO (403): $url -> Fuera del directorio raíz" -ForegroundColor Red
            $response.StatusCode = 403
            $response.Close()
            continue
        }

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Content Type Mapping
            if ($url.EndsWith(".html")) { 
                $response.ContentType = "text/html; charset=utf-8" 
            }
            elseif ($url.EndsWith(".css")) { 
                $response.ContentType = "text/css" 
            }
            elseif ($url.EndsWith(".js")) { 
                $response.ContentType = "application/javascript; charset=utf-8" 
            }
            elseif ($url.EndsWith(".json")) { 
                $response.ContentType = "application/json" 
            }
            else { 
                $response.ContentType = "application/octet-stream" 
            }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "SERVIT (200): $url -> Mime: $($response.ContentType)" -ForegroundColor Green
        } else {
            Write-Host "NO ENCONTRADO (404): $url ($filePath)" -ForegroundColor Red
            $response.StatusCode = 404
            $html404 = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 - Archivo No Encontrado</h1>")
            $response.ContentType = "text/html; charset=utf-8"
            $response.ContentLength64 = $html404.Length
            $response.OutputStream.Write($html404, 0, $html404.Length)
        }
        $response.Close()
    }
}
catch {
    Write-Host "Error al iniciar el servidor: $_" -ForegroundColor Red
}
finally {
    $listener.Stop()
    $listener.Close()
}
