# ClickHouse Windows Setup Guide

This guide provides detailed instructions for installing and configuring ClickHouse on Windows systems for use with the L1 Monitoring Application.

## Prerequisites

- Windows 10 or later / Windows Server 2016 or later
- Administrative privileges
- At least 2GB of RAM
- At least 10GB of free disk space

## Installation Steps

### 1. Download ClickHouse

1. Visit the official ClickHouse download page: https://clickhouse.com/docs/en/getting-started/install#windows
2. Download the latest Windows installer (`clickhouse-setup.exe`)

### 2. Install ClickHouse

1. Run the downloaded `clickhouse-setup.exe` with administrator privileges
2. Follow the installation wizard:
   - Accept the license agreement
   - Choose installation location (default is `C:\Program Files\ClickHouse`)
   - Select components (ensure both `Server` and `Client` are selected)
   - Configure service settings (default settings are usually fine)
   - Set the data and log directories (default settings are recommended)
   - Complete the installation

### 3. Verify ClickHouse Service

1. Open the Windows Services management console:
   - Press `Win + R`, type `services.msc`, and press Enter
2. Find the "ClickHouse Server" service in the list
3. Verify that the service status is "Running"
4. If not running, right-click on the service and select "Start"

### 4. Test ClickHouse Connection

1. Open Command Prompt or PowerShell as administrator
2. Navigate to the ClickHouse installation bin directory:
   ```
   cd "C:\Program Files\ClickHouse\bin"
   ```
3. Test the connection to the ClickHouse server:
   ```
   clickhouse-client -q "SELECT version()"
   ```
4. This should return the installed ClickHouse version

### 5. Configure ClickHouse for L1 Monitoring Application

1. Create the database required by the application:
   ```
   clickhouse-client -q "CREATE DATABASE IF NOT EXISTS default"
   ```

2. Update the .env file in your application directory with the ClickHouse connection details:
   ```
   DATABASE_URL=clickhouse://default:@localhost:8123/default
   ```

## Troubleshooting

### ClickHouse Service Not Starting

If the ClickHouse service fails to start:

1. Check the Windows Event Viewer for error logs:
   - Press `Win + R`, type `eventvwr.msc`, and press Enter
   - Navigate to Windows Logs > Application
   - Look for errors related to ClickHouse

2. Check ClickHouse logs located at:
   - `C:\Program Files\ClickHouse\logs`

3. Common issues:
   - Port 8123 is already in use: Change the HTTP port in the ClickHouse configuration
   - Insufficient permissions: Ensure the ClickHouse service runs with administrative privileges

### Connection Refused Errors

If the application cannot connect to ClickHouse:

1. Verify the ClickHouse server is running
2. Check firewall settings to ensure port 8123 is open for internal connections
3. Confirm the connection URL format is correct
4. Try connecting manually using the clickhouse-client to rule out authentication issues

## Advanced Configuration

### Changing Default Ports

By default, ClickHouse uses:
- Port 8123 for HTTP requests
- Port 9000 for native TCP protocol

To change these ports:

1. Edit the configuration file at `C:\Program Files\ClickHouse\conf\config.xml`
2. Modify the `<http_port>` and `<tcp_port>` values
3. Restart the ClickHouse server service

### Setting Up User Authentication

For enhanced security:

1. Edit `C:\Program Files\ClickHouse\conf\users.xml`
2. Modify the default user or create new users with passwords
3. Update your application's DATABASE_URL to include credentials:
   ```
   DATABASE_URL=clickhouse://username:password@localhost:8123/default
   ```

## Additional Resources

- [ClickHouse Official Documentation](https://clickhouse.com/docs/en/intro)
- [ClickHouse Client Configuration](https://clickhouse.com/docs/en/interfaces/cli)
- [ClickHouse SQL Reference](https://clickhouse.com/docs/en/sql-reference)