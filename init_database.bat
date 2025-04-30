@echo off
echo Initializing Telecom L1 Monitoring Database with ClickHouse...
echo.

:: Activate virtual environment
call venv\Scripts\activate

:: Check if ClickHouse is installed and running
echo Checking ClickHouse connection...
set CLICKHOUSE_FOUND=0

:: Try running clickhouse-client (may be in PATH)
clickhouse-client --query "SELECT 1" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set CLICKHOUSE_FOUND=1
    goto :check_complete
)

:: Try common installation paths
if exist "C:\Program Files\ClickHouse\bin\clickhouse-client.exe" (
    "C:\Program Files\ClickHouse\bin\clickhouse-client.exe" --query "SELECT 1" >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set CLICKHOUSE_FOUND=1
        goto :check_complete
    )
)

if exist "C:\ClickHouse\bin\clickhouse-client.exe" (
    "C:\ClickHouse\bin\clickhouse-client.exe" --query "SELECT 1" >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set CLICKHOUSE_FOUND=1
        goto :check_complete
    )
)

:check_complete
if %CLICKHOUSE_FOUND% equ 1 (
    echo ClickHouse connection successful.
    
    :: Initialize the ClickHouse database and tables
    echo Creating ClickHouse database and tables...
    
    :: Try with clickhouse-client in PATH
    clickhouse-client --query "CREATE DATABASE IF NOT EXISTS telecom" >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        clickhouse-client --query "CREATE TABLE IF NOT EXISTS telecom.log_entries (id UInt32, timestamp String, level String, message String, service String, additional_fields String, created_at DateTime) ENGINE = MergeTree() ORDER BY timestamp" >nul 2>&1
        clickhouse-client --query "CREATE TABLE IF NOT EXISTS telecom.analysis_queries (id UInt32, query_text String, suggestion String, confidence_score UInt32, created_at DateTime) ENGINE = MergeTree() ORDER BY id" >nul 2>&1
        clickhouse-client --query "CREATE TABLE IF NOT EXISTS telecom.analysis_log_associations (analysis_id UInt32, log_id UInt32) ENGINE = MergeTree() ORDER BY (analysis_id, log_id)" >nul 2>&1
        goto :db_init
    )
    
    :: Try with common installation paths
    if exist "C:\Program Files\ClickHouse\bin\clickhouse-client.exe" (
        "C:\Program Files\ClickHouse\bin\clickhouse-client.exe" --query "CREATE DATABASE IF NOT EXISTS telecom" >nul 2>&1
        "C:\Program Files\ClickHouse\bin\clickhouse-client.exe" --query "CREATE TABLE IF NOT EXISTS telecom.log_entries (id UInt32, timestamp String, level String, message String, service String, additional_fields String, created_at DateTime) ENGINE = MergeTree() ORDER BY timestamp" >nul 2>&1
        "C:\Program Files\ClickHouse\bin\clickhouse-client.exe" --query "CREATE TABLE IF NOT EXISTS telecom.analysis_queries (id UInt32, query_text String, suggestion String, confidence_score UInt32, created_at DateTime) ENGINE = MergeTree() ORDER BY id" >nul 2>&1
        "C:\Program Files\ClickHouse\bin\clickhouse-client.exe" --query "CREATE TABLE IF NOT EXISTS telecom.analysis_log_associations (analysis_id UInt32, log_id UInt32) ENGINE = MergeTree() ORDER BY (analysis_id, log_id)" >nul 2>&1
        goto :db_init
    )
    
    if exist "C:\ClickHouse\bin\clickhouse-client.exe" (
        "C:\ClickHouse\bin\clickhouse-client.exe" --query "CREATE DATABASE IF NOT EXISTS telecom" >nul 2>&1
        "C:\ClickHouse\bin\clickhouse-client.exe" --query "CREATE TABLE IF NOT EXISTS telecom.log_entries (id UInt32, timestamp String, level String, message String, service String, additional_fields String, created_at DateTime) ENGINE = MergeTree() ORDER BY timestamp" >nul 2>&1
        "C:\ClickHouse\bin\clickhouse-client.exe" --query "CREATE TABLE IF NOT EXISTS telecom.analysis_queries (id UInt32, query_text String, suggestion String, confidence_score UInt32, created_at DateTime) ENGINE = MergeTree() ORDER BY id" >nul 2>&1
        "C:\ClickHouse\bin\clickhouse-client.exe" --query "CREATE TABLE IF NOT EXISTS telecom.analysis_log_associations (analysis_id UInt32, log_id UInt32) ENGINE = MergeTree() ORDER BY (analysis_id, log_id)" >nul 2>&1
        goto :db_init
    )
    
) else (
    echo WARNING: Could not connect to ClickHouse server.
    echo Make sure ClickHouse server is running and properly configured.
    echo See CLICKHOUSE_WINDOWS_SETUP.md for installation and setup instructions.
    echo.
    echo Skipping ClickHouse database initialization.
    echo.
)

:db_init
:: Initialize the application database
echo Running application database initialization...
python db_init.py

echo.
echo Database initialization complete.
echo.

pause