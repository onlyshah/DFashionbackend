# Create placeholder face images
Add-Type -AssemblyName System.Drawing

function Create-PlaceholderImage {
    param(
        [string]$FilePath,
        [string]$Name
    )
    
    $width = 200
    $height = 200
    
    # Create bitmap
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Set background color (light blue gradient)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 220, 240))
    $graphics.FillRectangle($brush, 0, 0, $width, $height)
    
    # Draw circle (face)
    $faceBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 200, 150))
    $graphics.FillEllipse($faceBrush, 20, 20, 160, 160)
    
    # Draw eyes
    $eyeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
    $graphics.FillEllipse($eyeBrush, 70, 70, 15, 20)
    $graphics.FillEllipse($eyeBrush, 115, 70, 15, 20)
    
    # Draw mouth (simple smile)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 2)
    $graphics.DrawArc($pen, 80, 95, 40, 30, 0, 180)
    
    # Draw name text
    $font = New-Object System.Drawing.Font("Arial", 20, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
    $stringFormat = New-Object System.Drawing.StringFormat
    $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $textRect = New-Object System.Drawing.RectangleF(0, 160, $width, 30)
    $graphics.DrawString($Name, $font, $textBrush, $textRect, $stringFormat)
    
    # Save
    $bitmap.Save($FilePath)
    
    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "✅ Created: $(Split-Path $FilePath -Leaf)"
}

# Create all placeholder images
Create-PlaceholderImage "d:\NikunjShah\Fashion\DFashionbackend\backend\uploads\faces\face2.jpg" "Face 2"
Create-PlaceholderImage "d:\NikunjShah\Fashion\DFashionbackend\backend\uploads\faces\face3.jpg" "Face 3"
Create-PlaceholderImage "d:\NikunjShah\Fashion\DFashionbackend\backend\uploads\faces\face4.jpg" "Face 4"

Write-Host "`n✅ All placeholder images created successfully!"
