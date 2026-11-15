@echo off
setlocal
cd /d "%~dp0"
title AKIS - Adli Konusma Inceleme Sistemi
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
if errorlevel 1 (
  echo.
  echo Uygulama baslatilamadi. README_TR.txt dosyasindaki sorun giderme adimlarina bakin.
  pause
)
