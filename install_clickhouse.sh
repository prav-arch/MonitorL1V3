#!/bin/bash
# Script to install and configure ClickHouse locally
# Usage: ./install_clickhouse.sh

set -e

echo "====== ClickHouse Local Installation Script ======"
echo "This script will install ClickHouse on your local machine."

# Determine OS
if [ -f /etc/os-release ]; then
    # freedesktop.org and systemd
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
elif type lsb_release >/dev/null 2>&1; then
    # linuxbase.org
    OS=$(lsb_release -si)
    VER=$(lsb_release -sr)
elif [ -f /etc/lsb-release ]; then
    # For some versions of Debian/Ubuntu without lsb_release command
    . /etc/lsb-release
    OS=$DISTRIB_ID
    VER=$DISTRIB_RELEASE
else
    # Fall back to uname, e.g. "Linux <version>", also works for BSD, etc.
    OS=$(uname -s)
    VER=$(uname -r)
fi

echo "Detected OS: $OS $VER"

install_debian_ubuntu() {
    echo "Installing ClickHouse on Debian/Ubuntu..."
    
    # Add ClickHouse repository
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates dirmngr
    
    # Import key
    sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 8919F6BD2B48D754
    
    # Add repository
    echo "deb https://packages.clickhouse.com/deb stable main" | sudo tee /etc/apt/sources.list.d/clickhouse.list
    
    # Install ClickHouse
    sudo apt-get update
    sudo apt-get install -y clickhouse-server clickhouse-client
    
    # Start ClickHouse server
    sudo service clickhouse-server start
    
    # Wait for server to start
    echo "Waiting for ClickHouse server to start..."
    sleep 5
    
    # Check if server is running
    if systemctl is-active --quiet clickhouse-server; then
        echo "ClickHouse server is running."
    else
        echo "ClickHouse server is not running. Starting it..."
        sudo service clickhouse-server start
    fi
}

install_rhel_centos() {
    echo "Installing ClickHouse on RHEL/CentOS..."
    
    # Add ClickHouse repository
    sudo yum install -y yum-utils
    sudo yum-config-manager --add-repo https://packages.clickhouse.com/rpm/clickhouse.repo
    
    # Install ClickHouse
    sudo yum install -y clickhouse-server clickhouse-client
    
    # Start ClickHouse server
    sudo systemctl start clickhouse-server
    
    # Enable ClickHouse server to start on boot
    sudo systemctl enable clickhouse-server
    
    # Wait for server to start
    echo "Waiting for ClickHouse server to start..."
    sleep 5
    
    # Check if server is running
    if systemctl is-active --quiet clickhouse-server; then
        echo "ClickHouse server is running."
    else
        echo "ClickHouse server is not running. Starting it..."
        sudo systemctl start clickhouse-server
    fi
}

install_windows() {
    echo "For Windows installation, please follow these steps:"
    echo "1. Download the latest ClickHouse Windows installer from https://clickhouse.com/docs/en/getting-started/install#windows"
    echo "2. Run the installer and follow the installation wizard"
    echo "3. Start the ClickHouse server service from the Windows Services console"
    echo "4. Test the connection using the ClickHouse client"
    echo ""
    echo "See CLICKHOUSE_WINDOWS_SETUP.md for detailed instructions."
}

# Create required database
create_database() {
    echo "Creating default database..."
    
    # Create the database and tables
    clickhouse-client -q "CREATE DATABASE IF NOT EXISTS default"
    
    echo "Database created successfully."
}

# Install based on OS
case "$OS" in
    *Ubuntu*|*Debian*)
        install_debian_ubuntu
        create_database
        ;;
    *RHEL*|*CentOS*|*Fedora*)
        install_rhel_centos
        create_database
        ;;
    *Windows*)
        install_windows
        ;;
    *)
        echo "Unsupported OS: $OS"
        echo "Please install ClickHouse manually following the official documentation:"
        echo "https://clickhouse.com/docs/en/getting-started/install"
        exit 1
        ;;
esac

echo "ClickHouse installation complete."
echo "You can connect to the server using: clickhouse-client"
echo ""
echo "To verify the installation, run: clickhouse-client -q 'SELECT version()'"
echo ""
echo "ClickHouse is now configured to run on localhost:8123"