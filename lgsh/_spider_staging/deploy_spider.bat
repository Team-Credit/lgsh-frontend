@echo off
chcp 65001 >nul
echo =============================================
echo  Spider App Deployment Script
echo =============================================
echo.

set TARGET=C:\LGSH_DEV_V2\lgsh-backend-analytics\lgsh\apps\spider
set SOURCE=%~dp0apps\spider

echo [1/3] Copying spider app files...
if exist "%TARGET%" rmdir /s /q "%TARGET%"
xcopy "%SOURCE%" "%TARGET%" /E /I /Y /Q
echo   Done.

echo.
echo [2/3] Patching config files...
python "%~dp0deploy_spider.py"

echo.
echo =============================================
echo  Deployment complete!
echo =============================================
pause
