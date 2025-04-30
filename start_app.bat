@echo off
echo Starting Telecom L1 Monitoring Application with ClickHouse DB...
echo.

:: Check if virtual environment exists, if not create it
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate
    echo Installing requirements...
    pip install -r windows_requirements.txt
) else (
    call venv\Scripts\activate
)

:: Check if ClickHouse is installed by looking for clickhouse-client executable
where /q clickhouse-client
if %ERRORLEVEL% neq 0 (
    echo WARNING: ClickHouse client not found in PATH
    echo Please make sure ClickHouse is installed and correctly set up.
    echo See CLICKHOUSE_WINDOWS_SETUP.md for installation instructions.
    echo.
    echo Checking for ClickHouse in common installation locations...
    
    if exist "C:\Program Files\ClickHouse\bin\clickhouse-client.exe" (
        echo Found ClickHouse in C:\Program Files\ClickHouse\bin
        echo Please add this path to your system PATH or run from this directory.
    ) else if exist "C:\ClickHouse\bin\clickhouse-client.exe" (
        echo Found ClickHouse in C:\ClickHouse\bin
        echo Please add this path to your system PATH or run from this directory.
    ) else (
        echo ClickHouse not found in common locations.
        echo Please install ClickHouse following the instructions in CLICKHOUSE_WINDOWS_SETUP.md
    )
    echo.
)

:: Check ClickHouse connection
echo Checking ClickHouse connection...
set CLICKHOUSE_FOUND=0

:: Try running clickhouse-client (may be in PATH)
clickhouse-client --query "SELECT 1" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set CLICKHOUSE_FOUND=1
    goto :check_database
)

:: Try common installation paths
if exist "C:\Program Files\ClickHouse\bin\clickhouse-client.exe" (
    "C:\Program Files\ClickHouse\bin\clickhouse-client.exe" --query "SELECT 1" >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set CLICKHOUSE_FOUND=1
        goto :check_database
    )
)

if exist "C:\ClickHouse\bin\clickhouse-client.exe" (
    "C:\ClickHouse\bin\clickhouse-client.exe" --query "SELECT 1" >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set CLICKHOUSE_FOUND=1
        goto :check_database
    )
)

:check_database
if %CLICKHOUSE_FOUND% equ 1 (
    echo ClickHouse connection successful. 
) else (
    echo WARNING: Could not connect to ClickHouse server.
    echo Make sure ClickHouse server is running and properly configured.
    echo See CLICKHOUSE_WINDOWS_SETUP.md for more details.
    echo Continuing with application startup, but database features may not work.
    echo.
)

:: Check if .env file exists, if not create a template
if not exist .env (
    echo Creating .env file template with ClickHouse connection...
    echo DATABASE_URL=clickhouse://default:password@localhost:8123/telecom > .env
    echo Please update your ClickHouse credentials in the .env file.
    echo See CLICKHOUSE_WINDOWS_SETUP.md for more details.
    echo.
)

:: Run the application
echo Starting the application...
python -m flask run --host=0.0.0.0 --port=5000

:: Keep the window open in case of errors
pause