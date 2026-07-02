$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$wallpaperOut = Join-Path $root 'Theme/Preload/OOBE/wallpapers'
$avatarOut = Join-Path $root 'Theme/Preload/OOBE/avatars'
[IO.Directory]::CreateDirectory($wallpaperOut) | Out-Null
[IO.Directory]::CreateDirectory($avatarOut) | Out-Null

function Save-JpegPreview {
    param(
        [string]$Source,
        [string]$Destination,
        [int]$Width,
        [int]$Height,
        [int]$Quality = 84,
        [switch]$CenterCrop
    )

    $sourceImage = [Drawing.Image]::FromFile($Source)
    try {
        $canvas = [Drawing.Bitmap]::new($Width, $Height, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
        try {
            $graphics = [Drawing.Graphics]::FromImage($canvas)
            try {
                $graphics.Clear([Drawing.Color]::Black)
                $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality

                if ($CenterCrop) {
                    $side = [Math]::Min($sourceImage.Width, $sourceImage.Height)
                    $sourceRect = [Drawing.RectangleF]::new(
                        ($sourceImage.Width - $side) / 2,
                        ($sourceImage.Height - $side) / 2,
                        $side,
                        $side
                    )
                } else {
                    $sourceRatio = $sourceImage.Width / $sourceImage.Height
                    $targetRatio = $Width / $Height
                    if ($sourceRatio -gt $targetRatio) {
                        $cropWidth = $sourceImage.Height * $targetRatio
                        $sourceRect = [Drawing.RectangleF]::new(($sourceImage.Width - $cropWidth) / 2, 0, $cropWidth, $sourceImage.Height)
                    } else {
                        $cropHeight = $sourceImage.Width / $targetRatio
                        $sourceRect = [Drawing.RectangleF]::new(0, ($sourceImage.Height - $cropHeight) / 2, $sourceImage.Width, $cropHeight)
                    }
                }

                $destinationRect = [Drawing.RectangleF]::new(0, 0, $Width, $Height)
                $graphics.DrawImage($sourceImage, $destinationRect, $sourceRect, [Drawing.GraphicsUnit]::Pixel)
            } finally {
                $graphics.Dispose()
            }

            $jpegCodec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
            $encoderParams = [Drawing.Imaging.EncoderParameters]::new(1)
            try {
                $encoderParams.Param[0] = [Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality, [long]$Quality)
                $canvas.Save($Destination, $jpegCodec, $encoderParams)
            } finally {
                $encoderParams.Dispose()
            }
        } finally {
            $canvas.Dispose()
        }
    } finally {
        $sourceImage.Dispose()
    }
}

1..6 | ForEach-Object {
    $source = Get-ChildItem -LiteralPath (Join-Path $root 'Theme/Picture') -File |
        Where-Object BaseName -eq "Fluent-$_" |
        Select-Object -First 1
    if (-not $source) { throw "Missing Fluent-$_ wallpaper" }
    Save-JpegPreview -Source $source.FullName -Destination (Join-Path $wallpaperOut "Fluent-$_.jpg") -Width 1280 -Height 720
}

$avatarSources = @((Join-Path $root 'Theme/Profile_img/UserAva.png'))
$avatarSources += 1..10 | ForEach-Object { Join-Path $root "Theme/Profile_img/$_.jpg" }
foreach ($source in $avatarSources) {
    $name = [IO.Path]::GetFileNameWithoutExtension($source)
    Save-JpegPreview -Source $source -Destination (Join-Path $avatarOut "$name.jpg") -Width 256 -Height 256 -Quality 86 -CenterCrop
}

Write-Host 'Generated 6 OOBE wallpaper previews (1280x720) and 11 avatar previews (256x256).'
