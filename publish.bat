@echo off
REM ============================================================
REM  publish.bat - Publie l'IOR Viewer sur GitHub
REM  Repo: https://github.com/surrendrart-hub/Surr-MiniTool-ior-Viewer
REM ============================================================

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo === Surr IOR Viewer - Publication GitHub ===
echo Dossier : %CD%
echo.

REM --- Verifie que git est installe ---
where git >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Git n'est pas installe ou pas dans le PATH.
    echo Telecharge-le ici : https://git-scm.com/download/win
    pause
    exit /b 1
)

REM --- Initialise le repo si necessaire ---
if not exist ".git" (
    echo Initialisation du depot Git local...
    git init
    git branch -M main
) else (
    echo Depot Git deja initialise.
)

REM --- Configure le remote (ajoute ou met a jour) ---
git remote get-url origin >nul 2>nul
if errorlevel 1 (
    echo Ajout du remote origin...
    git remote add origin https://github.com/surrendrart-hub/Surr-MiniTool-ior-Viewer.git
) else (
    echo Mise a jour du remote origin...
    git remote set-url origin https://github.com/surrendrart-hub/Surr-MiniTool-ior-Viewer.git
)

REM --- Demande un message de commit ---
echo.
set "commit_msg="
set /p commit_msg="Message de commit (Entree pour 'Update IOR Viewer') : "
if "!commit_msg!"=="" set "commit_msg=Update IOR Viewer"

REM --- Stage + commit ---
echo.
echo Ajout des fichiers...
git add -A

git diff --cached --quiet
if errorlevel 1 (
    echo Commit : "!commit_msg!"
    git commit -m "!commit_msg!"
) else (
    echo Aucun changement a committer.
)

REM --- Push ---
echo.
echo Push vers origin/main...
git push -u origin main
if errorlevel 1 (
    echo.
    echo [ERREUR] Le push a echoue.
    echo - Verifie tes identifiants GitHub (token / SSH).
    echo - Si le repo distant a deja des commits, fais :  git pull --rebase origin main
    pause
    exit /b 1
)

echo.
echo === Publication terminee avec succes ! ===
echo Repo  : https://github.com/surrendrart-hub/Surr-MiniTool-ior-Viewer
echo Pages : https://surrendrart-hub.github.io/Surr-MiniTool-ior-Viewer/
echo.
echo (Active GitHub Pages dans Settings -^> Pages si ce n'est pas deja fait.)
echo.
pause
endlocal
