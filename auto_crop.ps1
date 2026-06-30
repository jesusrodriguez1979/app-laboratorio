Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\jebus\.gemini\antigravity\scratch\lubricant-lab-manager\logo.png"
$destPath = "C:\Users\jebus\.gemini\antigravity\scratch\lubricant-lab-manager\logo_icon.png"

if (Test-Path $srcPath) {
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    
    $width = $src.Width
    $height = $src.Height
    
    # Buscaremos los límites del logo (píxeles que no sean el fondo blanquecino/grisáceo)
    $minX = $width
    $maxX = 0
    $minY = $height
    $maxY = 0
    
    # Escaneamos los píxeles para encontrar la caja contenedora del logo (engranaje)
    # Buscamos en la mitad superior del archivo (donde está el símbolo)
    for ($x = 0; $x -lt $width; $x++) {
        for ($y = 0; $y -lt ($height * 0.7); $y++) {
            $pixel = $src.GetPixel($x, $y)
            
            # Un píxel es del fondo si es claro y tiene tonos balanceados (gris/blanco)
            $isBg = ($pixel.R -gt 180) -and ($pixel.G -gt 180) -and ($pixel.B -gt 180)
            
            # Si no es del fondo, es parte del logotipo
            if (-not $isBg) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    
    Write-Host "Auto-Detected Bounding Box: MinX=$minX, MaxX=$maxX, MinY=$minY, MaxY=$maxY"
    
    if ($maxX -gt $minX -and $maxY -gt $minY) {
        # Añadimos un pequeño margen de 10 píxeles
        $padding = 10
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
        # Todo píxel que sea claro y grisáceo se remueve.
        # Además, para remover las sombras oscuras suaves en los bordes del engranaje, 
        # cualquier píxel que tenga un color blanquecino/grisáceo con cierto margen de color se vuelve transparente.
        for ($x = 0; $x -lt $cropW; $x++) {
            for ($y = 0; $y -lt $cropH; $y++) {
                $pixel = $dest.GetPixel($x, $y)
                
                # Criterio para detectar fondo:
                # 1. Píxeles muy claros
                $isVeryLight = ($pixel.R -gt 160) -and ($pixel.G -gt 160) -and ($pixel.B -gt 160)
                
                # 2. Píxeles que son casi neutros (grisáceos de la pared)
                $diffRG = [Math]::Abs($pixel.R - $pixel.G)
                $diffGB = [Math]::Abs($pixel.G - $pixel.B)
                $diffBR = [Math]::Abs($pixel.B - $pixel.R)
                $isNeutral = ($diffRG -lt 25) -and ($diffGB -lt 25) -and ($diffBR -lt 25)
                
                if ($isVeryLight -and $isNeutral) {
                    $dest.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                }
            }
        }
        
        $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $dest.Dispose()
        Write-Host "Auto-crop and cleanup done successfully!"
    } else {
        Write-Host "Failed to detect bounding box!"
    }
    
    $src.Dispose()
} else {
    Write-Host "Source image not found!"
}
