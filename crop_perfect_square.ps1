Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\jebus\.gemini\antigravity\scratch\lubricant-lab-manager\logo.png"
$destPath = "C:\Users\jebus\.gemini\antigravity\scratch\lubricant-lab-manager\logo_icon.png"

if (Test-Path $srcPath) {
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    
    # Recortamos un área cuadrada perfecta de 570x570 centrada en el engranaje
    $cropX = 130
    $cropY = 85
    $cropW = 570
    $cropH = 570
    
    $dest = New-Object System.Drawing.Bitmap($cropW, $cropH)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    
    $rectSrc = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
    $rectDest = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
    $g.DrawImage($src, $rectDest, $rectSrc, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    
    # Limpiamos el fondo del recorte para dejarlo 100% transparente
    for ($x = 0; $x -lt $cropW; $x++) {
        for ($y = 0; $y -lt $cropH; $y++) {
            $pixel = $dest.GetPixel($x, $y)
            
            $maxVal = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
            $minVal = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
            $diff = $maxVal - $minVal
            
            # Criterio para detectar el fondo texturado gris/blanco y removerlo
            $isBg = ($diff -lt 32) -or (($pixel.R -gt 180) -and ($pixel.G -gt 180) -and ($pixel.B -gt 180) -and ($diff -lt 45))
            
            if ($isBg) {
                $dest.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
        }
    }
    
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    $src.Dispose()
    Write-Host "Perfect square crop completed successfully!"
} else {
    Write-Host "Source image not found!"
}
