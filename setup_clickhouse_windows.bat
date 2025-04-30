@echo off
echo ========================================
echo ClickHouse Setup Script for Windows
echo ========================================
echo This script will help you set up and configure ClickHouse for the L1 Monitoring Application
echo.

echo Checking if ClickHouse is already installed...
IF EXIST "C:\Program Files\ClickHouse\bin\clickhouse-client.exe" (
    echo ClickHouse is installed.
) ELSE (
    echo ClickHouse is not installed.
    echo.
    echo Please download and install ClickHouse from:
    echo https://clickhouse.com/docs/en/getting-started/install#windows
    echo.
    echo After installation, run this script again.
    pause
    exit /b
)

echo.
echo Checking if ClickHouse service is running...
sc query "ClickHouse" | find "RUNNING" >nul
if %ERRORLEVEL% == 0 (
    echo ClickHouse service is running.
) else (
    echo ClickHouse service is not running. Starting the service...
    net start ClickHouse
    if %ERRORLEVEL% == 0 (
        echo ClickHouse service started successfully.
    ) else (
        echo Failed to start ClickHouse service. Please start it manually.
        echo Open Services (services.msc), find ClickHouse, and click Start.
        pause
    )
)

echo.
echo Creating database for L1 Monitoring Application...
"C:\Program Files\ClickHouse\bin\clickhouse-client" -q "CREATE DATABASE IF NOT EXISTS default" >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo Database created/verified successfully.
) else (
    echo Failed to create database. Please check ClickHouse logs.
    echo See CLICKHOUSE_WINDOWS_SETUP.md for troubleshooting steps.
    pause
    exit /b
)

echo.
echo Testing ClickHouse connection...
for /f "tokens=*" %%a in ('"C:\Program Files\ClickHouse\bin\clickhouse-client" -q "SELECT version()"') do set VERSION=%%a
echo Connected to ClickHouse version: %VERSION%

echo.
echo Setting environment variables...
echo DATABASE_URL=clickhouse://default:@localhost:8123/default > .env.clickhouse
type .env.clickhouse >> .env
echo Environment variables updated.

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo Your L1 Monitoring Application is now configured to use ClickHouse.
echo.
echo For more detailed information and troubleshooting,
echo please refer to CLICKHOUSE_WINDOWS_SETUP.md
echo.
pause