# Rebuild the Insplit three-bar vector mark and native raster exports.
# Run from any directory: powershell -NoProfile -File mobile/scripts/generate-brand-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$mobileRoot = Split-Path $PSScriptRoot -Parent
$workspaceRoot = Split-Path $mobileRoot -Parent
$resRoot = Join-Path $mobileRoot 'android/app/src/main/res'
$background = '#E0DBEE'
$ink = '#242625'

function Write-Icon([string]$destination, [int]$size, [bool]$transparent = $false, [bool]$round = $false, [double]$markScale = 1.33) {
    $supersampling = 3
    $bitmap = New-Object System.Drawing.Bitmap ($size * $supersampling), ($size * $supersampling)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $paperBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($background))
    $inkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($ink))
    $graphics.ScaleTransform(($size * $supersampling / 108), ($size * $supersampling / 108))
    if (-not $transparent) {
        if ($round) { $graphics.FillEllipse($paperBrush, 0, 0, 108, 108) }
        else { $graphics.FillRectangle($paperBrush, 0, 0, 108, 108) }
    }
    $graphics.TranslateTransform(54, 54)
    $graphics.ScaleTransform($markScale, $markScale)
    $graphics.RotateTransform(-12)
    $graphics.TranslateTransform(-54, -54)
    foreach ($bar in @(@(36, 40, 9, 32), @(50, 30, 9, 45), @(64, 42, 9, 23))) {
        $x, $y, $width, $height = $bar
        $shape = New-Object System.Drawing.Drawing2D.GraphicsPath
        $shape.AddArc($x, $y, $width, $width, 180, 180)
        $shape.AddArc($x, ($y + $height - $width), $width, $width, 0, 180)
        $shape.CloseFigure()
        $graphics.FillPath($inkBrush, $shape)
        $shape.Dispose()
    }
    $final = New-Object System.Drawing.Bitmap $size, $size
    $output = [System.Drawing.Graphics]::FromImage($final)
    if (-not $transparent -and -not $round) { $output.Clear([System.Drawing.ColorTranslator]::FromHtml($background)) }
    $output.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $output.DrawImage($bitmap, 0, 0, $size, $size)
    $final.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
    $output.Dispose(); $final.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $paperBrush.Dispose(); $inkBrush.Dispose()
}

$svgMark = '<g fill="#242625" transform="translate(54 54) scale(1.33) rotate(-12) translate(-54 -54)"><rect x="36" y="40" width="9" height="32" rx="4.5"/><rect x="50" y="30" width="9" height="45" rx="4.5"/><rect x="64" y="42" width="9" height="23" rx="4.5"/></g>'
$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><rect width="108" height="108" fill="#E0DBEE"/>' + $svgMark + '</svg>'
Set-Content -Encoding utf8 (Join-Path $mobileRoot 'assets/icon-insplit.svg') $svg
Set-Content -Encoding utf8 (Join-Path $workspaceRoot 'web/public/favicon.svg') $svg
Set-Content -Encoding utf8 (Join-Path $workspaceRoot 'web/public/brand-mark.svg') ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">' + $svgMark + '</svg>')
Write-Icon (Join-Path $mobileRoot 'assets/icon-insplit.png') 1024
Write-Icon (Join-Path $mobileRoot 'assets/icon-insplit-foreground.png') 1024 $true $false 1
Write-Icon (Join-Path $mobileRoot 'assets/icon-insplit-monochrome.png') 1024 $true $false 1
Write-Icon (Join-Path $mobileRoot 'assets/splash-insplit.png') 512 $true $false 1.33

$densities = @(@('mdpi', 48, 108, 128), @('hdpi', 72, 162, 192), @('xhdpi', 96, 216, 256), @('xxhdpi', 144, 324, 384), @('xxxhdpi', 192, 432, 512))
foreach ($density in $densities) {
    $name, $legacySize, $foregroundSize, $splashSize = $density
    $folder = Join-Path $resRoot "mipmap-$name"
    Write-Icon (Join-Path $folder 'ic_launcher.png') $legacySize
    Write-Icon (Join-Path $folder 'ic_launcher_round.png') $legacySize $false $true
    Write-Icon (Join-Path $folder 'ic_launcher_foreground.png') $foregroundSize $true $false 1
    # Android cannot have PNG and WebP resources with the same resource name.
    foreach ($fileName in @('ic_launcher.webp', 'ic_launcher_round.webp', 'ic_launcher_foreground.webp')) {
        $oldResource = Join-Path $folder $fileName
        if (Test-Path -LiteralPath $oldResource) { Remove-Item -LiteralPath $oldResource }
    }
    foreach ($qualifier in @("drawable-$name", "drawable-night-$name")) {
        Write-Icon (Join-Path (Join-Path $resRoot $qualifier) 'splashscreen_logo.png') $splashSize $true $false 1.33
    }
}
Write-Output 'Generated app, adaptive, monochrome, splash, and Android density icons.'
