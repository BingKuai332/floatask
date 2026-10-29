param([string]$Archive)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($Archive, [IO.Compression.ZipArchiveMode]::Create)
try {
    $entry = $zip.CreateEntry('FloatAsk-win32-x64/../../outside.txt')
    $writer = [IO.StreamWriter]::new($entry.Open())
    try { $writer.Write('must not escape staging') } finally { $writer.Dispose() }
} finally { $zip.Dispose() }
