Add-Type -AssemblyName System.Drawing
$imagePath = "C:\Users\jebus\.gemini\antigravity\scratch\lubricant-lab-manager\logo.png"
if (Test-Path $imagePath) {
    $img = [System.Drawing.Image]::FromFile($imagePath)
    Write-Host "WIDTH: $($img.Width)"
    Write-Host "HEIGHT: $($img.Height)"
    $img.Dispose()
} else {
    Write-Host "File not found!"
}
