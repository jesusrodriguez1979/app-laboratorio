Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\jebus\.gemini\antigravity\scratch\lubricant-lab-manager\logo.png"
$destPath = "C:\Users\jebus\.gemini\antigravity\scratch\lubricant-lab-manager\logo_icon.png"

if (Test-Path $srcPath) {
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    
    # Definimos el área a cortar para el engranaje (centrado en X=192, Y=10 con tamaño 640x640)
    $cropX = 192
    $cropY = 10
    $cropW = 640
    $cropH = 640
    
    $dest = New-Object System.Drawing.Bitmap($cropW, $cropH)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    
    # Dibujamos la parte recortada
    $rectSrc = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
    $rectDest = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
    $g.DrawImage($src, $rectDest, $rectSrc, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    
    # Hacemos transparente el fondo gris claro/blanco de la textura
    # Escaneamos cada píxel del recorte
    for ($x = 0; $x -lt $cropW; $x++) {
        for ($y = 0; $y -lt $cropH; $y++) {
            $pixel = $dest.GetPixel($x, $y)
            
            # Si el píxel es gris claro o blanquecino (textura de fondo)
            $isLightGrey = ($pixel.R -gt 190) -and ($pixel.G -gt 190) -and ($pixel.B -gt 190)
            
            # Verificamos que sea un tono grisáceo neutral (poca diferencia entre canales R, G y B)
            $diffRG = [Math]::Abs($pixel.R - $pixel.G)
            $diffGB = [Math]::Abs($pixel.G - $pixel.B)
            $diffBR = [Math]::Abs($pixel.B - $pixel.R)
            $isNeutral = ($diffRG -lt 15) -and ($diffGB -lt 15) -and ($diffBR -lt 15)
            
            if ($isLightGrey -and $isNeutral) {
                # Píxel transparente
                $dest.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
        }
    }
    
    # Guardamos como PNG transparente
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    $src.Dispose()
    
    Write-Host "SUCCESS: cropped and background transparency applied."
} else {
    Write-Host "Source logo not found!"
}
