@echo off
echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

echo Creating virtual environment if it doesn't exist...
if not exist venv (
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing backend requirements...
cd backend
pip install -r requirements.txt

echo Starting backend server...
python app.py

echo Deactivating virtual environment...
deactivate

pause 