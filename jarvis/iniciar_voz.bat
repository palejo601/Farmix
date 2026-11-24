@echo off
cd /d "%~dp0"
rem En PCs con poca RAM (4 GB) el modelo "base" de Whisper va mucho mejor que "small".
rem Para usar otro: setx JARVIS_WHISPER_MODELO small
if not defined JARVIS_WHISPER_MODELO set JARVIS_WHISPER_MODELO=base
py voz.py
pause
