@echo off
chcp 65001 >nul
setlocal
set "PS1=%~dp0edinme.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList @('-NoExit','-NoProfile','-ExecutionPolicy','Bypass','-File','%PS1%')"
endlocal
