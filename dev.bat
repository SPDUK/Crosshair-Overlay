@echo off
echo Starting Crosshair Overlay in development mode...
echo.

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    exit /b 1
)

echo Starting development server...
call npm run tauri dev