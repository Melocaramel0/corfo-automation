@echo off
TITLE Actualizar Sistema CORFO

echo ====================================================================
echo    Actualizando el sistema con los ultimos cambios...
echo ====================================================================
echo.

echo.
echo 1. Re-construyendo el sistema con los nuevos cambios (docker-compose build)...
echo.
echo Esto puede tardar unos minutos...
echo.

docker-compose up --build -d

echo.
echo ====================================================================
echo    ¡ACTUALIZACION COMPLETA!
echo ====================================================================
echo.
echo El sistema esta corriendo con la ultima version.
echo Abre tu navegador en: http://localhost:5173
echo.
pause