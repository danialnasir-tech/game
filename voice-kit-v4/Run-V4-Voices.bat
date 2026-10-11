@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org then double-click this file again. & pause & exit /b)
node generate-v4-voices.js
