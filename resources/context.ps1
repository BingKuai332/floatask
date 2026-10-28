param(
  [int]$IgnorePid = 0
)

$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class FloatAskWin32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@

$title = ''
$processName = ''
$processId = 0
$hwnd = [IntPtr]::Zero

for ($i = 0; $i -lt 8; $i++) {
  $hwnd = [FloatAskWin32]::GetForegroundWindow()
  $sb = New-Object System.Text.StringBuilder 1024
  $null = [FloatAskWin32]::GetWindowText($hwnd, $sb, $sb.Capacity)
  $title = $sb.ToString().Trim()
  $pidValue = [uint32]0
  $null = [FloatAskWin32]::GetWindowThreadProcessId($hwnd, [ref]$pidValue)
  $processId = [int]$pidValue
  if ($processId -gt 0 -and $processId -ne $IgnorePid) {
    $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -ne $proc) { $processName = $proc.ProcessName }
    break
  }
  Start-Sleep -Milliseconds 80
}

$rect = New-Object FloatAskWin32+RECT
$null = [FloatAskWin32]::GetWindowRect($hwnd, [ref]$rect)

$obj = [pscustomobject]@{
  title   = $title
  process = $processName
  pid     = $processId
  rect    = [pscustomobject]@{
    x      = $rect.Left
    y      = $rect.Top
    width  = [Math]::Max(0, $rect.Right - $rect.Left)
    height = [Math]::Max(0, $rect.Bottom - $rect.Top)
  }
}
$obj | ConvertTo-Json -Compress -Depth 3
