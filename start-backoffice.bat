@echo off
setlocal enabledelayedexpansion
REM ==============================================================================
REM Iniciar Salminus Backoffice (React + Vite + MongoDB Driver)
REM Banco de Corrientes S.A.
REM ==============================================================================

cd /d "%~dp0"

echo ==============================================================================
echo [SALMINUS BACKOFFICE] Iniciando panel de control React (Auditoria & MongoDB)...
echo ==============================================================================

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no fue encontrado en el PATH del sistema.
    echo Por favor instala Node.js LTS para ejecutar la aplicacion React.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [INFO] Instalando dependencias de React y Vite (primera ejecucion)...
    call npm install
)

echo [INFO] Iniciando API Backend y Conector MongoDB en puerto 3031...
start "Salminus Backend API (3031)" cmd /c "node server.js"

echo [INFO] Iniciando Frontend React (Vite) en http://localhost:3000...
timeout /t 2 /nobreak >nul
start "" http://localhost:3000
call npm run dev

