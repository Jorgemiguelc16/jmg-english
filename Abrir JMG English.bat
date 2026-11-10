@echo off
title JMG English
cd /d "%~dp0"
start "JMG English (servidor - no cerrar mientras estudias)" /min node server.js
timeout /t 1 /nobreak >nul
start "" msedge "http://localhost:5180" 2>nul || start "" "http://localhost:5180"
exit
