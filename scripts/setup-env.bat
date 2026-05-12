@echo off
REM Setup development environment for VoiceLaunch TTS

echo ==========================================
echo  VoiceLaunch TTS - Environment Setup
echo ==========================================

echo Installing Node.js dependencies...
call npm install

echo.
echo Installing Python dependencies...
python -m pip install -r src\python\requirements.txt

echo.
echo Downloading model registry...
if not exist "assets\model-registry.json" (
    echo Model registry already exists.
)

echo.
echo Setup complete! Run 'npm run dev' to start development.
pause
