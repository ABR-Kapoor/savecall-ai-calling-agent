@echo off
title SaveCall Full Stack
echo [1/2] Connecting Voice Agent to VM LiveKit (172.30.160.10:7880)...
start "SaveCall Voice Agent" "%~dp0start-voice-agent.bat"
timeout /t 2 >nul
echo [2/2] Starting Web Application (Vite)...
cd /d "%~dp0"
npm run dev
