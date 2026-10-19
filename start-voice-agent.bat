@echo off
title SaveCall AI Voice Agent
echo Starting Voice Agent...
cd /d "%~dp0agent"
if exist "venv\Scripts\python.exe" (
  "venv\Scripts\python.exe" agent.py dev
) else (
  ".venv\Scripts\python.exe" agent.py dev
)
