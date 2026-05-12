@echo off
REM Build Python backend into standalone executable using PyInstaller in a clean venv

echo ==========================================
echo  VoiceLaunch TTS - Python Backend Build
echo ==========================================

set PYTHON=python
set SRC_DIR=%~dp0..\src\python
set OUT_DIR=%~dp0..\python_dist
set VENV_DIR=%~dp0..\build-py-venv

if exist "%OUT_DIR%" (
    echo Cleaning previous build...
    rmdir /S /Q "%OUT_DIR%"
)

if exist "%VENV_DIR%" (
    echo Cleaning previous venv...
    rmdir /S /Q "%VENV_DIR%"
)

echo Creating clean virtual environment...
%PYTHON% -m venv "%VENV_DIR%"

echo Installing dependencies...
"%VENV_DIR%\Scripts\pip.exe" install --upgrade pip --quiet
"%VENV_DIR%\Scripts\pip.exe" install pyinstaller --quiet
"%VENV_DIR%\Scripts\pip.exe" install -r "%SRC_DIR%\requirements.txt" --quiet

echo Building Python backend...
"%VENV_DIR%\Scripts\pyinstaller.exe" ^
    --name voicelaunch-backend ^
    --onedir ^
    --distpath "%OUT_DIR%" ^
    --workpath "%~dp0..\build-py" ^
    --specpath "%~dp0..\build-py" ^
    --hidden-import fastapi ^
    --hidden-import uvicorn ^
    --hidden-import uvicorn.logging ^
    --hidden-import uvicorn.loops.auto ^
    --hidden-import uvicorn.protocols.http.auto ^
    --hidden-import uvicorn.lifespan.auto ^
    --hidden-import sounddevice ^
    --hidden-import soundfile ^
    --hidden-import numpy ^
    --hidden-import psutil ^
    --hidden-import piper ^
    --hidden-import piper.voice ^
    --hidden-import TTS ^
    --hidden-import TTS.api ^
    --hidden-import kokoro ^
    --hidden-import kokoro.pipeline ^
    --hidden-import melo ^
    --hidden-import melo.api ^
    --hidden-import bark ^
    --hidden-import bark.generation ^
    --hidden-import websockets ^
    --hidden-import python_multipart ^
    --collect-all piper ^
    --collect-all TTS ^
    --collect-all kokoro ^
    --collect-all melo ^
    --collect-all bark ^
    --collect-all sounddevice ^
    --collect-all soundfile ^
    "%SRC_DIR%\main.py"

echo.
if exist "%OUT_DIR%\voicelaunch-backend\voicelaunch-backend.exe" (
    echo Build complete: %OUT_DIR%\voicelaunch-backend\voicelaunch-backend.exe
) else (
    echo Build may have failed. Check logs above.
)

echo Cleaning venv...
rmdir /S /Q "%VENV_DIR%"

pause
