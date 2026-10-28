param(
  [Parameter(Mandatory = $true)][string]$Path
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and
  $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

[Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.DataWriter, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime] | Out-Null

$bytes = [System.IO.File]::ReadAllBytes($Path)
$stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
$writer = New-Object Windows.Storage.Streams.DataWriter($stream)
$writer.WriteBytes($bytes)
$null = Await ($writer.StoreAsync()) ([uint32])
$writer.DetachStream() | Out-Null
$stream.Seek(0)
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) {
  foreach ($tag in @('zh-Hans-CN', 'en-US')) {
    try {
      $language = New-Object -TypeName Windows.Globalization.Language -ArgumentList $tag
      $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
      if ($null -ne $engine) { break }
    } catch { }
  }
}
if ($null -eq $engine) {
  throw 'No Windows OCR language pack is available.'
}

$result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

$sb = New-Object System.Text.StringBuilder
$prevBottom = $null
$prevHeight = 0
foreach ($line in $result.Lines) {
  $prevEnd = $null
  $lineHeight = 0
  $lineTop = [double]::MaxValue
  $lineBottom = 0
  foreach ($w in $line.Words) {
    $r = $w.BoundingRect
    if ($r.Height -gt $lineHeight) { $lineHeight = $r.Height }
    if ($r.Y -lt $lineTop) { $lineTop = $r.Y }
    if (($r.Y + $r.Height) -gt $lineBottom) { $lineBottom = $r.Y + $r.Height }
  }
  if ($null -ne $prevBottom) {
    [void]$sb.AppendLine()
  }
  foreach ($w in $line.Words) {
    $r = $w.BoundingRect
    if ($null -ne $prevEnd) {
      $gap = $r.X - $prevEnd
      $threshold = [Math]::Max(2.0, $lineHeight * 0.18)
      if ($gap -gt $threshold) { [void]$sb.Append(' ') }
    }
    [void]$sb.Append($w.Text)
    $prevEnd = $r.X + $r.Width
  }
  $prevBottom = $lineBottom
  $prevHeight = $lineHeight
}

$text = $sb.ToString().Trim()
if (-not $text) {
  $text = [string]$result.Text
  $text = $text.Trim()
}

$obj = [pscustomobject]@{
  text      = $text
  lang      = $engine.RecognizerLanguage.LanguageTag
  lineCount = @($result.Lines).Count
  width     = $bitmap.PixelWidth
  height    = $bitmap.PixelHeight
}
$obj | ConvertTo-Json -Compress -Depth 3
