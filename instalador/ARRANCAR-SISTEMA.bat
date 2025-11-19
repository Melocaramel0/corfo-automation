@echo off
cd /d %~dp0..
TITLE Arrancar Sistema CORFO

:: --- 1. Verificar si esta instalado ---
IF NOT EXIST backend\.env (
    echo.
    echo ¡Error! El sistema no esta instalado.
    echo Por favor, ejecuta '1-INSTALAR-POR-PRIMERA-VEZ.bat' primero.
    echo.
    pause
    exit
)

echo Iniciando servicios de Docker (Backend y Frontend)...
echo.
docker-compose up -d

echo.
echo ====================================================================
echo    ¡LISTO!
echo ====================================================================
echo.
echo El sistema esta corriendo.
echo Abre tu navegador en: http://localhost:5173
echo.
pause