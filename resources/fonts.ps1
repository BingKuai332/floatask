[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
$collection = New-Object System.Drawing.Text.InstalledFontCollection
$names = @($collection.Families |
  ForEach-Object { $_.Name } |
  Where-Object { $_ -and -not $_.StartsWith('@') } |
  Sort-Object -Unique)
[pscustomobject]@{ fonts = $names } | ConvertTo-Json -Compress -Depth 2
