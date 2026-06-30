Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\jebus\.gemini\antigravity\scratch\lubricant-lab-manager\logo.png"
$destPath = "C:\Users\jebus\.gemini\antigravity\scratch\lubricant-lab-manager\logo_icon.png"

if (Test-Path $srcPath) {
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    
    $width = $src.Width
    $height = $src.Height
    
    $minX = $width
    $maxX = 0
    $minY = $height
    $maxY = 0
    
    # Escaneamos los píxeles para encontrar la caja contenedora del logo (engranaje)
    for ($x = 0; $x -lt $width; $x++) {
        for ($y = 0; $y -lt ($height * 0.75); $y++) {
            $pixel = $src.GetPixel($x, $y)
            
            # Calculamos la diferencia máxima de color para ignorar los grises del fondo
            $maxVal = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
            $minVal = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
            $diff = $maxVal - $minVal
            
            # Si hay diferencia de color, es parte del logotipo (azul o amarillo)
            $isLogo = ($diff -gt 25) -and ($maxVal -lt 250 -or $diff -gt 40)
            
            if ($isLogo) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    
    Write-Host "Color-Detected Bounding Box: MinX=$minX, MaxX=$maxX, MinY=$minY, MaxY=$maxY"
    
    if ($maxX -gt $minX -and $maxY -gt $minY) {
        $padding = 15
        $cropX = [Math]::Max(0, $minX - $padding)
        $cropY = [Math]::Max(0, $minY - $padding)
        $cropW = [Math]::Min($width - $cropX, ($maxX - $minX) + (2 * $padding))
        $cropH = [Math]::Min($height - $cropY, ($maxY - $minY) + (2 * $padding))
        
        Write-Host "Cropping Tight Area: X=$cropX, Y=$cropY, W=$cropW, H=$cropH"
        
        $dest = New-Object System.Drawing.Bitmap($cropW, $cropH)
        $g = [System.Drawing.Graphics]::FromImage($dest)
        
        $rectSrc = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
        $rectDest = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
        $g.DrawImage($src, $rectDest, $rectSrc, [System.Drawing.GraphicsUnit]::Pixel)
        $g.Dispose()
        
        # Limpieza del fondo para dejarlo 100% transparente en el recorte
        for ($x = 0; $x -lt $cropW; $x++) {
            for ($y = 0; $y -lt $cropH; $y++) {
                $pixel = $dest.GetPixel($x, $y)
                
                $maxVal = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
                $minVal = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
                $diff = $maxVal - $minVal
                
                # Si el píxel es neutro (gris/blanco) o muy claro
                $isBg = ($diff -lt 35) -or (($pixel.R -gt 210) -and ($pixel.G -gt 210) -and ($pixel.B -gt 210))
                
                if ($isBg) {
                    $dest.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                }
            }
        }
        
        $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $dest.Dispose()
        Write-Host "Color-based crop and transparency completed successfully!"
    } else {
        Write-Host "Failed to detect colored bounding box!"
    }
    
    $src.Dispose()
} else {
    Write-Host "Source image not found!"
}
