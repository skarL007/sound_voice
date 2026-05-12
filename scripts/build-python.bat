@echo off
REM Build Python backend into standalone executable using PyInstaller

echo ==========================================
echo  VoiceLaunch TTS - Python Backend Build
echo ==========================================

set PYTHON=python
set SRC_DIR=%~dp0..\src\python
set OUT_DIR=%~dp0..\python_dist

if exist "%OUT_DIR%" (
    echo Cleaning previous build...
    rmdir /S /Q "%OUT_DIR%"
)

echo Installing PyInstaller...
%PYTHON% -m pip install pyinstaller --quiet

echo Building Python backend...
%PYTHON% -m PyInstaller ^
    --name voicelaunch-backend ^
    --onedir ^
    --distpath "%OUT_DIR%" ^
    --workpath "%~dp0..\build-py" ^
    --specpath "%~dp0..\build-py" ^
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
    --collect-data piper ^
    --collect-data TTS ^
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

REM Post-build cleanup to reduce size
echo Cleaning up unnecessary files...
set BACKEND_DIR=%OUT_DIR%\voicelaunch-backend
if exist "%BACKEND_DIR%" (
    for /R "%BACKEND_DIR%" %%G in (__pycache__) do if exist "%%G" rmdir /S /Q "%%G" 2>nul
    for /R "%BACKEND_DIR%" %%G in (test) do if exist "%%G" rmdir /S /Q "%%G" 2>nul
    for /R "%BACKEND_DIR%" %%G in (tests) do if exist "%%G" rmdir /S /Q "%%G" 2>nul
    for /R "%BACKEND_DIR%" %%G in (*.pyc) do if exist "%%G" del /F /Q "%%G" 2>nul
    for /R "%BACKEND_DIR%" %%G in (*.md) do if exist "%%G" del /F /Q "%%G" 2>nul
    for /R "%BACKEND_DIR%" %%G in (*.rst) do if exist "%%G" del /F /Q "%%G" 2>nul
    for /R "%BACKEND_DIR%" %%G in (*.txt) do if exist "%%G" del /F /Q "%%G" 2>nul
    if exist "%BACKEND_DIR%\matplotlib" rmdir /S /Q "%BACKEND_DIR%\matplotlib" 2>nul
    if exist "%BACKEND_DIR%\pygame" rmdir /S /Q "%BACKEND_DIR%\pygame" 2>nul
    if exist "%BACKEND_DIR%\boto3" rmdir /S /Q "%BACKEND_DIR%\boto3" 2>nul
    if exist "%BACKEND_DIR%\botocore" rmdir /S /Q "%BACKEND_DIR%\botocore" 2>nul
    if exist "%BACKEND_DIR%\sklearn" rmdir /S /Q "%BACKEND_DIR%\sklearn" 2>nul
    if exist "%BACKEND_DIR%\spacy" rmdir /S /Q "%BACKEND_DIR%\spacy" 2>nul
    if exist "%BACKEND_DIR%\pandas" rmdir /S /Q "%BACKEND_DIR%\pandas" 2>nul
    if exist "%BACKEND_DIR%\seaborn" rmdir /S /Q "%BACKEND_DIR%\seaborn" 2>nul
    if exist "%BACKEND_DIR%\IPython" rmdir /S /Q "%BACKEND_DIR%\IPython" 2>nul
    if exist "%BACKEND_DIR%\jupyter" rmdir /S /Q "%BACKEND_DIR%\jupyter" 2>nul
    if exist "%BACKEND_DIR%\tkinter" rmdir /S /Q "%BACKEND_DIR%\tkinter" 2>nul
    if exist "%BACKEND_DIR%\tcl" rmdir /S /Q "%BACKEND_DIR%\tcl" 2>nul
    if exist "%BACKEND_DIR%\tcl8" rmdir /S /Q "%BACKEND_DIR%\tcl8" 2>nul
    if exist "%BACKEND_DIR%\plotly" rmdir /S /Q "%BACKEND_DIR%\plotly" 2>nul
    if exist "%BACKEND_DIR%\dash" rmdir /S /Q "%BACKEND_DIR%\dash" 2>nul
)

echo.
if exist "%OUT_DIR%\voicelaunch-backend\voicelaunch-backend.exe" (
    echo Build complete: %OUT_DIR%\voicelaunch-backend\voicelaunch-backend.exe
) else (
    echo Build may have failed. Check logs above.
)
pause
