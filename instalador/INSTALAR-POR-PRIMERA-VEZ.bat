@echo off
cd /d %~dp0..
TITLE Instalador del Sistema CORFO

echo ====================================================================
echo    Instalador del Sistema de Automatizacion CORFO
echo ====================================================================
echo.

:: --- 1. Verificar si ya esta instalado ---
IF EXIST backend\.env (
    echo ¡Error! Ya existe un archivo de configuracion en la carpeta 'backend'.
    echo.
    echo Si quieres arrancar el sistema, usa '2-ARRANCAR-SISTEMA.bat'.
    echo Si quieres reinstalar, borra el archivo '.env' de la carpeta 'backend' primero.
    echo.
    pause
    exit
)

echo.
echo Bienvenido. Este script te pedira tus credenciales para configurar
echo la aplicacion. Solo necesitas hacer esto una vez.
echo.

:: --- 2. Pedir las credenciales al usuario ---
set /p CORFO_USER="Ingresa tu RUT/usuario de CORFO: "
set /p CORFO_PASS="Ingresa tu contrasena de CORFO: "
echo.
echo Ahora, ingresa las 3 claves de Azure OpenAI para los reportes PDF.
set /p AZURE_API_KEY="Ingresa tu AZURE_OPENAI_API_KEY: "
set /p AZURE_ENDPOINT="Ingresa tu AZURE_OPENAI_ENDPOINT: "
set /p AZURE_DEPLOYMENT="Ingresa tu AZURE_OPENAI_DEPLOYMENT_NAME: "

:: --- 3. Escribir el archivo .env ---
set ENV_FILE=backend\.env
echo Creando archivo de configuracion...

:: El primer 'echo' con > CREA el archivo
echo PORT=3001 > %ENV_FILE%

:: Los siguientes 'echo' con >> AGREGAN lineas
echo CORFO_USER=%CORFO_USER% >> %ENV_FILE%
echo CORFO_PASS=%CORFO_PASS% >> %ENV_FILE%
echo AZURE_OPENAI_API_KEY=%AZURE_API_KEY% >> %ENV_FILE%
echo AZURE_OPENAI_ENDPOINT=%AZURE_ENDPOINT% >> %ENV_FILE%
echo AZURE_OPENAI_DEPLOYMENT_NAME=%AZURE_DEPLOYMENT% >> %ENV_FILE%

echo.
echo ====================================================================
echo    CONFIGURACION GUARDADA
echo ====================================================================
echo.
echo Iniciando y construyendo el sistema por primera vez...
echo Esto puede tardar varios minutos. Por favor espera.
echo.

:: --- 4. Levantar Docker Compose (construyendo la imagen) ---
docker-compose up --build -d

echo.
echo ====================================================================
echo    ¡INSTALACION COMPLETA!
echo ====================================================================
echo.
echo El sistema esta corriendo.
echo Abre tu navegador en: http://localhost:5173
echo.
echo Para detener el sistema, ejecuta '3-DETENER-SISTEMA.bat'.
echo.
pause