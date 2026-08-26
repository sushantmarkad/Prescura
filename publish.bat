@echo off
echo Adding all changes...
git add .
echo.

set /p message="Enter commit message (or press enter for default): "
if "%message%"=="" set message="Auto-publish update"

echo Committing...
git commit -m "%message%"
echo.

echo Pushing to GitHub...
git push origin main
echo.

echo Successfully published to https://github.com/sushantmarkad/Prescura.git
pause
