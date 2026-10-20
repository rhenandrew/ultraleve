@echo off
cd /d "%~dp0"
set "ULTRA_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%ULTRA_NODE%" (
  "%ULTRA_NODE%" server.cjs --open
) else (
  node server.cjs --open
)
pause
