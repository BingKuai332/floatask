param([Parameter(Mandatory=$true)][string]$TaskFile, [switch]$NoRestart)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskPath = [IO.Path]::GetFullPath($TaskFile)
$workDir = [IO.Path]::GetDirectoryName($taskPath)
$report = Join-Path $workDir 'update-result.json'
$changed = [Collections.Generic.List[object]]::new()
$success = $false
$parentExited = $false
try {
    # Node writes UTF-8 without a BOM; Windows PowerShell otherwise assumes ANSI.
    $task = Get-Content -LiteralPath $taskPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $destination = [IO.Path]::GetFullPath($task.destination).TrimEnd('\')
    $archive = [IO.Path]::GetFullPath($task.archive)
    $exe = [IO.Path]::GetFullPath($task.executable)
    if ([IO.Path]::GetDirectoryName($exe) -ne $destination -or [IO.Path]::GetFileName($exe) -ne 'FloatAsk.exe') { throw 'Invalid executable destination' }
    if ($destination -eq [IO.Path]::GetPathRoot($destination).TrimEnd('\')) { throw 'Cannot update a drive root' }
    if ([IO.Path]::GetDirectoryName($archive) -ne $workDir) { throw 'Archive must be in the update directory' }
    $hashAlgorithm = [Security.Cryptography.SHA256]::Create()
    $archiveStream = [IO.File]::OpenRead($archive)
    try { $actualHash = [BitConverter]::ToString($hashAlgorithm.ComputeHash($archiveStream)).Replace('-', '').ToLowerInvariant() }
    finally { $archiveStream.Dispose(); $hashAlgorithm.Dispose() }
    if ($actualHash -ne $task.sha256) { throw 'Checksum mismatch' }
    if ($task.readyFile) {
        $readyFile = [IO.Path]::GetFullPath($task.readyFile)
        if ([IO.Path]::GetDirectoryName($readyFile) -ne $workDir -or [IO.Path]::GetFileName($readyFile) -notmatch '^update-ready-[a-f0-9]+\.json$') { throw 'Invalid readiness file' }
        @{ready=$true} | ConvertTo-Json | Set-Content -LiteralPath $readyFile -Encoding UTF8
    }
    if ($task.parentPid -gt 0 -and (Get-Process -Id $task.parentPid -ErrorAction SilentlyContinue)) {
        Wait-Process -Id $task.parentPid -Timeout 120 -ErrorAction Stop
    }
    $parentExited = $true
    $stage = Join-Path $workDir ('stage-' + [Guid]::NewGuid().ToString('N'))
    $backup = Join-Path $workDir ('backup-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $stage,$backup | Out-Null
    # Verify every archive entry before extraction, including directory entries.
    $zip = [IO.Compression.ZipFile]::OpenRead($archive)
    try {
        foreach ($entry in $zip.Entries) {
            $name = $entry.FullName.Replace('/', '\')
            if ($name.Contains(':') -or [IO.Path]::IsPathRooted($name)) { throw 'Invalid archive path' }
            $resolved = [IO.Path]::GetFullPath((Join-Path $stage $name))
            if (-not $resolved.StartsWith($stage + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Archive path escapes staging directory' }
            if (-not $name.StartsWith('FloatAsk-win32-x64\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected package layout' }
        }
    } finally { $zip.Dispose() }
    [IO.Compression.ZipFile]::ExtractToDirectory($archive, $stage)
    $source = Join-Path $stage 'FloatAsk-win32-x64'
    if (-not (Test-Path -LiteralPath (Join-Path $source 'FloatAsk.exe')) -or -not (Test-Path -LiteralPath (Join-Path $source 'resources\app.asar'))) { throw 'Incomplete package' }
    $dataPath = [IO.Path]::GetFullPath($task.userData).TrimEnd('\')
    foreach ($file in Get-ChildItem -LiteralPath $source -Recurse -File) {
        $relative = $file.FullName.Substring($source.Length + 1)
        if ($relative.Split('\')[0] -in @('userdata','.userdata','FloatAskData','.git','node_modules')) { throw 'Package contains unexpected data' }
        $target = [IO.Path]::GetFullPath((Join-Path $destination $relative))
        if (-not $target.StartsWith($destination + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Target escapes application directory' }
        if ($target -eq $dataPath -or $target.StartsWith($dataPath + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Package would overwrite user data' }
        # Reparse points could redirect a scoped write outside the installation.
        $ancestor = [IO.Path]::GetDirectoryName($target)
        while ($ancestor -and $ancestor.StartsWith($destination, [StringComparison]::OrdinalIgnoreCase)) {
            if ((Test-Path -LiteralPath $ancestor) -and ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Reparse point in installation path' }
            if ($ancestor -eq $destination) { break }; $ancestor = [IO.Path]::GetDirectoryName($ancestor)
        }
        if ((Test-Path -LiteralPath $target) -and ((Get-Item -LiteralPath $target -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Reparse point target' }
        $saved = Join-Path $backup $relative
        $existed = Test-Path -LiteralPath $target
        if ($existed) { New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($saved)) | Out-Null; Copy-Item -LiteralPath $target -Destination $saved }
        $changed.Add(@{ target=$target; saved=$saved; existed=$existed })
        New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($target)) | Out-Null
        Copy-Item -LiteralPath $file.FullName -Destination $target -Force
    }
    $success = $true
    @{ok=$true} | ConvertTo-Json | Set-Content -LiteralPath $report -Encoding UTF8
} catch {
    $failure = $_.Exception.Message
    for ($index = $changed.Count - 1; $index -ge 0; $index--) {
        $item = $changed[$index]
        try { if ($item.existed) { Copy-Item -LiteralPath $item.saved -Destination $item.target -Force } else { Remove-Item -LiteralPath $item.target -Force } } catch { $failure += '; rollback failed: ' + $_.Exception.Message }
    }
    @{ok=$false; message=$failure} | ConvertTo-Json | Set-Content -LiteralPath $report -Encoding UTF8
} finally {
    # All recursive cleanup targets are checked against this task's update folder.
    $cleanup = @($stage)
    if ($success) { $cleanup += $backup }
    foreach ($candidate in $cleanup) {
        if ($candidate) {
            $resolvedCleanup = [IO.Path]::GetFullPath($candidate)
            if ($resolvedCleanup.StartsWith($workDir + '\', [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedCleanup)) { Remove-Item -LiteralPath $resolvedCleanup -Recurse -Force -ErrorAction SilentlyContinue }
        }
    }
    if (-not $NoRestart -and $parentExited -and $exe -and (Test-Path -LiteralPath $exe)) {
        $env:FLOATASK_USER_DATA = $task.userData
        Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
        if ($task.launchArgs -and $task.launchArgs.Count -gt 0) { Start-Process -FilePath $exe -ArgumentList @($task.launchArgs) -WorkingDirectory $destination -WindowStyle Hidden }
        else { Start-Process -FilePath $exe -WorkingDirectory $destination -WindowStyle Hidden }
    }
}
if (-not $success) { exit 1 }
