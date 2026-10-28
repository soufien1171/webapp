@echo off
title Caisse 2.0 PWA - Demarrage
color 0B
echo ==========================================================
echo           Lancement de Caisse 2.0 PWA...
echo ==========================================================
echo Demarrage du serveur web local securise...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
