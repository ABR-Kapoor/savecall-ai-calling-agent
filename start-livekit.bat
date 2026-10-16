@echo off
title LiveKit Server (Port 7880)
echo Starting LiveKit Server on port 7880...
"%~dp0bin\livekit\livekit-server.exe" --dev
