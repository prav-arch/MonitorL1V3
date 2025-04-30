# OLLAMA Setup Guide for L1 Monitoring Application

This guide explains how to set up OLLAMA to work with the L1 Monitoring application. OLLAMA provides a way to run large language models (LLMs) locally on your machine without requiring cloud services.

## Install OLLAMA

1. **Download and Install OLLAMA:**
   
   Visit the [OLLAMA website](https://ollama.ai/) and download the appropriate version for your operating system:
   - macOS (Apple Silicon or Intel)
   - Windows
   - Linux

   Follow the installation instructions for your platform.

2. **Verify OLLAMA Installation:**
   
   Open a terminal/command prompt and run:
   ```
   ollama --version
   ```
   
   You should see the version of OLLAMA installed.

## Set Up a Model

1. **Pull a Model:**
   
   OLLAMA supports various models. For the L1 Monitoring application, we recommend using `llama2` as it offers a good balance between performance and resource usage.

   Run the following command to download the model:
   ```
   ollama pull llama2
   ```

   This will download the Llama 2 model, which is approximately 4GB in size. The download may take a few minutes depending on your internet connection.

   Alternatively, you can use other models like:
   - `mistral` - A high-quality 7B parameter model
   - `gemma` - Google's lightweight 2B parameter model
   - `orca-mini` - A smaller model suitable for machines with limited resources

2. **Test the Model:**
   
   Verify that the model is working correctly:
   ```
   ollama run llama2 "What is the role of logging in system monitoring?"
   ```

   You should see a response about logging and monitoring.

## Configure the L1 Monitoring Application

The application is pre-configured to use OLLAMA with the `llama2` model. If you want to use a different model, you can change it by editing the configuration:

1. **Configure the Model:**
   
   Edit the `config.py` file and update the `OLLAMA_MODEL` variable:
   ```python
   # Change from
   OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama2")
   # to your preferred model, e.g.
   OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral")
   ```

2. **Configure the OLLAMA URL:**
   
   By default, the application connects to OLLAMA at `http://localhost:11434`. If you're running OLLAMA on a different machine or port, you can update the URL:
   ```python
   OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://your-ollama-server:11434")
   ```

3. **Environment Variables (Optional):**
   
   Alternatively, you can set environment variables before starting the application:
   ```
   export OLLAMA_MODEL=mistral
   export OLLAMA_URL=http://your-ollama-server:11434
   ```

## Troubleshooting

1. **OLLAMA Not Responding:**
   
   If the application shows "LLM model not available" in the health check, ensure that OLLAMA is running by opening a terminal and executing:
   ```
   ollama serve
   ```

2. **Model Not Found:**
   
   If you get a "Model not found" error, make sure you've pulled the model:
   ```
   ollama pull model_name
   ```

3. **Performance Issues:**
   
   If the model is responding slowly, consider:
   - Using a smaller model like `orca-mini`
   - Configuring lower parameters in `config.py`:
   ```python
   LLM_PARAMS = {
       "max_tokens": 128,  # Lower value for faster responses
       "temperature": 0.7,
       "top_p": 0.95,
   }
   ```

## RAG Functionality

The L1 Monitoring application uses Retrieval-Augmented Generation (RAG) to provide context-aware responses to queries. The application:

1. Stores log entries in a vector database
2. When you ask a question, it retrieves the most relevant logs
3. These logs are sent to the OLLAMA model along with your query
4. The model generates a response based on the logs and your query

This approach ensures that the AI suggestions are based on your actual log data rather than generic advice.

## Using Your Own Training Data

To improve the quality of suggestions for your specific environment:

1. Upload your log files using the "Upload Logs" feature
2. The more relevant logs you provide, the better the system can provide targeted suggestions
3. Consider including logs that contain known issues and their resolutions to help the system learn from past incidents