@echo off
REM Build Python backend into standalone executable using PyInstaller in a clean venv
setlocal

echo ==========================================
echo  VoiceLaunch TTS - Python Backend Build
echo ==========================================

set "PYTHON=python"
set "SRC_DIR=%~dp0..\src\python"
set "OUT_DIR=%~dp0..\python_dist"
set "VENV_DIR=%~dp0..\build-py-venv"
set "BUILD_DIR=%~dp0..\build-py"
set "TMP_BASE=%~dp0..\build-py-temp"
set "TMP_DIR=%TMP_BASE%\run-%RANDOM%-%RANDOM%"
set "PYTHON_HOOKS_DIR=%~dp0python-build-hooks"
set "REQUIREMENTS_FILE=%SRC_DIR%\requirements-packaged.txt"
set "EXIT_CODE=0"

if exist "%OUT_DIR%" (
    echo Cleaning previous build...
    rmdir /S /Q "%OUT_DIR%"
)

if exist "%BUILD_DIR%" (
    echo Cleaning previous PyInstaller workdir...
    rmdir /S /Q "%BUILD_DIR%"
)

if exist "%VENV_DIR%" (
    echo Cleaning previous venv...
    rmdir /S /Q "%VENV_DIR%"
)

if not exist "%TMP_BASE%" mkdir "%TMP_BASE%"
mkdir "%TMP_DIR%"
if errorlevel 1 (
    set "EXIT_CODE=1"
    goto cleanup
)

set "TMP=%TMP_DIR%"
set "TEMP=%TMP_DIR%"
set "PYTHONPATH=%PYTHON_HOOKS_DIR%"
set "PIP_NO_CACHE_DIR=1"
set "PIP_DISABLE_PIP_VERSION_CHECK=1"

echo Creating clean virtual environment...
%PYTHON% -m venv "%VENV_DIR%" --without-pip
if errorlevel 1 (
    set "EXIT_CODE=1"
    goto cleanup
)

echo Bootstrapping pip...
"%VENV_DIR%\Scripts\python.exe" -m ensurepip --upgrade --default-pip
if errorlevel 1 (
    set "EXIT_CODE=1"
    goto cleanup
)

echo Installing dependencies...
"%VENV_DIR%\Scripts\python.exe" -m pip install pyinstaller --quiet --no-cache-dir
if errorlevel 1 (
    set "EXIT_CODE=1"
    goto cleanup
)
"%VENV_DIR%\Scripts\python.exe" -m pip install -r "%REQUIREMENTS_FILE%" --quiet --no-cache-dir
if errorlevel 1 (
    set "EXIT_CODE=1"
    goto cleanup
)

set "PYTHONPATH="

echo Building Python backend...
"%VENV_DIR%\Scripts\python.exe" -m PyInstaller ^
    --name voicelaunch-backend ^
    --onedir ^
    --distpath "%OUT_DIR%" ^
    --workpath "%BUILD_DIR%" ^
    --specpath "%BUILD_DIR%" ^
    --hidden-import fastapi ^
    --hidden-import uvicorn ^
    --hidden-import uvicorn.logging ^
    --hidden-import uvicorn.loops ^
    --hidden-import uvicorn.loops.auto ^
    --hidden-import uvicorn.protocols ^
    --hidden-import uvicorn.protocols.http ^
    --hidden-import uvicorn.protocols.http.auto ^
    --hidden-import uvicorn.lifespan ^
    --hidden-import uvicorn.lifespan.auto ^
    --hidden-import sounddevice ^
    --hidden-import soundfile ^
    --hidden-import numpy ^
    --hidden-import psutil ^
    --hidden-import piper ^
    --hidden-import piper.voice ^
    --hidden-import kokoro_onnx ^
    --hidden-import websockets ^
    --hidden-import python_multipart ^
    --collect-all piper ^
    --collect-all kokoro_onnx ^
    --collect-all sounddevice ^
    --collect-all soundfile ^
    --collect-data piper ^
    --exclude-module TTS ^
    --exclude-module melo ^
    --exclude-module bark ^
    --exclude-module fish_speech ^
    --exclude-module torch_directml ^
    --exclude-module matplotlib ^
    --exclude-module pygame ^
    --exclude-module boto3 ^
    --exclude-module botocore ^
    --exclude-module sklearn ^
    --exclude-module spacy ^
    --exclude-module pandas ^
    --exclude-module seaborn ^
    --exclude-module plotly ^
    --exclude-module dash ^
    --exclude-module jupyter ^
    --exclude-module IPython ^
    --exclude-module tkinter ^
    --exclude-module PIL.ImageQt ^
    --exclude-module PIL.ImageTk ^
    "%SRC_DIR%\main.py"
if errorlevel 1 (
    set "EXIT_CODE=1"
    goto cleanup
)

echo.
if exist "%OUT_DIR%\voicelaunch-backend\voicelaunch-backend.exe" (
    echo Build complete: %OUT_DIR%\voicelaunch-backend\voicelaunch-backend.exe
) else (
    echo Build may have failed. Check logs above.
    set "EXIT_CODE=1"
)

:cleanup
echo Cleaning venv...
if exist "%VENV_DIR%" rmdir /S /Q "%VENV_DIR%" >nul 2>&1
echo Cleaning temp workdir...
if exist "%TMP_DIR%" rmdir /S /Q "%TMP_DIR%" >nul 2>&1
endlocal & exit /b %EXIT_CODE%
