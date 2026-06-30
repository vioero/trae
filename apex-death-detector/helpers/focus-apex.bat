@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Apex Death Detector - 切换回 Apex 窗口
REM 通过 PowerShell 查找 r5apex.exe 并激活窗口

powershell -Command "& {
    Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport(\"user32.dll\")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport(\"user32.dll\")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
'@

    # 尝试查找 r5apex.exe
    $apexProcesses = Get-Process -Name 'r5apex' -ErrorAction SilentlyContinue

    if ($apexProcesses) {
        foreach ($p in $apexProcesses) {
            if ($p.MainWindowHandle -ne [IntPtr]::Zero) {
                [Win32]::ShowWindow($p.MainWindowHandle, 9)
                [Win32]::SetForegroundWindow($p.MainWindowHandle)
                Write-Host 'Apex 窗口已激活'
                exit 0
            }
        }
    }

    # 如果没找到 r5apex，尝试查找其他常见进程名
    $otherNames = @('Apex Legends', 'apex legends', 'RespawnApex')
    foreach ($name in $otherNames) {
        $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
        if ($procs) {
            foreach ($p in $procs) {
                if ($p.MainWindowHandle -ne [IntPtr]::Zero) {
                    [Win32]::ShowWindow($p.MainWindowHandle, 9)
                    [Win32]::SetForegroundWindow($p.MainWindowHandle)
                    Write-Host 'Apex 窗口已激活 (备用方式)'
                    exit 0
                }
            }
        }
    }

    Write-Host '未找到 Apex 进程'
    exit 1
}"

exit /b %errorlevel%