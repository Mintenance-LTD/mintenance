@echo off
REM Setup and start SAM3 microservice

echo ========================================
echo SAM3 Microservice Setup
echo ========================================
echo.

cd ..\apps\sam3-service

REM Check if venv exists
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
    echo.
)

echo Activating virtual environment...
call venv\Scripts\activate
echo.

REM Check if requirements are installed
if not exist venv\Lib\site-packages\fastapi (
    echo Installing dependencies...
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
    pip install fastapi uvicorn pillow transformers huggingface_hub opencv-python
    pip install segment-anything
    echo.
)

echo ========================================
echo Starting SAM3 microservice on port 8001
echo ========================================
echo.
echo Press Ctrl+C to stop
echo.

python main.py
