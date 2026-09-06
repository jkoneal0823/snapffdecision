@echo off
REM ============================================
REM  SnapFFDecision - One-Click Deploy
REM  Double-click this file OR run: deploy
REM  It commits all changes and pushes to GitHub.
REM  Netlify auto-deploys in ~30 seconds.
REM ============================================

echo.
echo  ============================================
echo   SnapFFDecision Deploy
echo  ============================================
echo.

REM Move to the folder this script lives in
cd /d "%~dp0"

REM Stage everything
git add .

REM Ask for a short description of the change
set /p msg="What did you change? (press Enter for default): "
if "%msg%"=="" set msg=update site

REM Commit
git commit -m "%msg%"

REM Push
echo.
echo  Pushing to GitHub...
git push

echo.
echo  ============================================
echo   Done! Live at snapffdecision.com in ~30 sec
echo  ============================================
echo.
pause
