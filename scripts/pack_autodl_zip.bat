@echo off
REM Pack ai-toolkit-gl.zip (bypasses PowerShell execution policy)
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0pack_autodl_zip.ps1"
pause
