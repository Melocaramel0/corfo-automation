@echo off
cd /d %~dp0..
TITLE Detener Sistema CORFO

echo Deteniendo todos los servicios de Docker...
echo.
docker-compose down

echo.
echo ====================================================================
echo    Sistema detenido.
echo ====================================================================
echo.
pause