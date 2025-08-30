@echo off
echo Building Crosshair Overlay (Tauri)...
echo.

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    exit /b 1
)

echo Building application...
call npm run tauri build
if %errorlevel% neq 0 (
    echo Failed to build application
    exit /b 1
)

echo.
echo Build completed successfully!
echo Executable can be found in src-tauri\target\release\
pause