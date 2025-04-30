# Telecom L1 Monitoring Tool - Windows Deployment Guide

## Feature Overview

The Telecom L1 Monitoring Tool is a sophisticated log analysis application specifically designed for telecom environments, featuring:

- **Local AI Processing**: Uses a locally simulated LLM for telecom-specific analysis without requiring external API calls
- **5G Core & OpenRAN Support**: Specialized knowledge base and processing for both 5G and OpenRAN components
- **ML-Based Anomaly Detection**: Identifies unusual patterns in telecom logs using machine learning
- **Domain-Specific Log Processing**: Extracts metadata like network functions, interfaces, and procedures from telecom logs
- **RAG (Retrieval-Augmented Generation)**: Enhances troubleshooting with contextually relevant information

## Quick Start (Easiest Method)

1. Download the application ZIP file from this Replit project
2. Extract to a folder of your choice (e.g., `C:\TelecomMonitor`)
3. Install ClickHouse from [clickhouse.com](https://clickhouse.com/docs/en/install)
4. Double-click `start_app.bat` to automatically set up and run the application
5. Open `http://localhost:5000` in your browser

For detailed ClickHouse setup instructions, see [CLICKHOUSE_WINDOWS_SETUP.md](CLICKHOUSE_WINDOWS_SETUP.md)

## Manual Setup (Advanced)

### Option 1: Download ZIP File
1. Download the application ZIP file from this Replit project
2. Extract the ZIP to a folder of your choice (e.g., `C:\TelecomMonitor`)

### Option 2: Clone with Git
If you have Git installed, run:
```
git clone https://github.com/yourusername/telecom-l1-monitoring.git
cd telecom-l1-monitoring
```

## Setting Up the Environment

1. Open Command Prompt as Administrator
2. Navigate to your project directory:
   ```
   cd C:\path\to\TelecomMonitor
   ```

3. Create a virtual environment:
   ```
   python -m venv venv
   ```

4. Activate the virtual environment:
   ```
   venv\Scripts\activate
   ```

5. Install the required packages:
   ```
   pip install -r windows_requirements.txt
   ```

## Database Configuration

### ClickHouse Setup (Recommended)

1. Install ClickHouse following the instructions in [CLICKHOUSE_WINDOWS_SETUP.md](CLICKHOUSE_WINDOWS_SETUP.md)
2. Create a `.env` file in your project directory with the following content:
   ```
   DATABASE_URL=clickhouse://default:password@localhost:8123/telecom
   ```
   Replace `password` with your ClickHouse password (set during installation).

3. Alternatively, you can run `init_database.bat` which will:
   - Check for ClickHouse installation
   - Create the necessary database and tables
   - Initialize the application

## Running the Application

1. Initialize the database:
   ```
   python db_init.py
   ```
   
   Or use the provided batch file:
   ```
   init_database.bat
   ```

2. Start the application:
   ```
   python -m flask run --host=0.0.0.0 --port=5000
   ```
   
   Or use the provided batch file:
   ```
   start_app.bat
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## Understanding the Local LLM Implementation

This application uses a sophisticated simulated LLM specifically tailored for telecom use cases:

- **Why this approach?** Allows for specialized telecom knowledge without requiring heavy LLM resources
- **How it works:** The system has been pre-programmed with telecom-specific responses based on 5G Core and OpenRAN knowledge
- **Benefits:** Faster responses, no external API dependencies, highly specialized for telecom log analysis
- **Extensibility:** The knowledge base can be expanded by adding more patterns and responses in `utils/llm_interface.py`

## Troubleshooting

### ClickHouse Database Connection Issues
- Verify ClickHouse server is running (`clickhouse-client` should connect)
- Check your ClickHouse credentials in the `.env` file
- Make sure the database `telecom` exists (created by the `init_database.bat` script)
- For HTTP interface issues, verify port 8123 is accessible
- For native protocol issues, verify port 9000 is accessible

### Package Installation Issues
- If pip install fails for some packages, try installing them individually
- If ClickHouse packages fail to install, try: `pip install clickhouse-connect clickhouse-sqlalchemy clickhouse-driver` separately

### ClickHouse Installation Issues
- For detailed ClickHouse troubleshooting, see [CLICKHOUSE_WINDOWS_SETUP.md](CLICKHOUSE_WINDOWS_SETUP.md)
- Verify ClickHouse service is running using Windows Services
- Check ClickHouse logs in the installation directory

### Port Already in Use
- If port 5000 is already in use, change the port number in the run command
- Example: `python -m flask run --host=0.0.0.0 --port=5001`

### Vector Store Warnings
- If you see `FAISS not available` warnings, this is normal - the application falls back to a simpler vector store
- This doesn't affect functionality but may slightly reduce search performance