@echo off
title SaveCall AI Voice Agent
echo Starting Voice Agent...
cd /d "%~dp0agent"
".venv\Scripts\python.exe" agent.py dev
