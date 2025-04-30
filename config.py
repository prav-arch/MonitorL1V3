import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent

# LLM Configuration
# Provider options: 'ollama', 'anthropic', 'openai', 'perplexity'
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "ollama")

# Default model names for each provider
DEFAULT_MODEL_NAMES = {
    "ollama": "llama2",                              # Local OLLAMA model
    "anthropic": "claude-3-5-sonnet-20241022",       # Latest Anthropic Claude model
    "openai": "gpt-4o",                              # Latest OpenAI GPT model
    "perplexity": "llama-3.1-sonar-small-128k-online" # Latest Perplexity AI model
}

# Get the model name based on provider or use the provider-specific default
LLM_MODEL_NAME = os.environ.get(
    "LLM_MODEL_NAME", 
    DEFAULT_MODEL_NAMES.get(LLM_PROVIDER.lower(), "llama2")
)

# OLLAMA-specific configuration (for backward compatibility)
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", LLM_MODEL_NAME if LLM_PROVIDER.lower() == "ollama" else "llama2")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")

# Keep these for backward compatibility
LLM_MODEL_PATH = OLLAMA_MODEL

# Vector database path
VECTOR_DB_PATH = os.environ.get("VECTOR_DB_PATH", str(BASE_DIR / "data" / "vector_index"))

# Embedding model name (using a lightweight model that can run locally)
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# Maximum number of log entries to process at once
MAX_LOG_ENTRIES = int(os.environ.get("MAX_LOG_ENTRIES", 1000))

# Number of top logs to retrieve for RAG
TOP_K_LOGS = int(os.environ.get("TOP_K_LOGS", 5))

# LLM generation parameters
LLM_PARAMS = {
    "max_tokens": int(os.environ.get("LLM_MAX_TOKENS", 256)),
    "temperature": float(os.environ.get("LLM_TEMPERATURE", 0.7)),
    "top_p": float(os.environ.get("LLM_TOP_P", 0.95)),
}

# Available LLM models for selection in the UI
AVAILABLE_MODELS = {
    "ollama": [
        {"id": "llama2", "name": "Llama 2", "description": "Meta's Llama 2 (locally hosted)"},
        {"id": "mistral", "name": "Mistral", "description": "Mistral AI's model (locally hosted)"},
        # Add fine-tuned models
        {"id": "llama2-ft-telecom", "name": "Llama 2 (Fine-tuned)", "description": "Fine-tuned for telecom logs"}
    ],
    "anthropic": [
        {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "description": "Latest Anthropic Claude model (API)"},
        {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "description": "Most powerful Anthropic model (API)"},
        {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet", "description": "Balanced Anthropic model (API)"},
        {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku", "description": "Fastest Anthropic model (API)"}
    ],
    "openai": [
        {"id": "gpt-4o", "name": "GPT-4o", "description": "Latest OpenAI multimodal model (API)"},
        {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "description": "Powerful OpenAI model (API)"}
    ],
    "perplexity": [
        {"id": "llama-3.1-sonar-small-128k-online", "name": "Llama 3.1 Sonar Small", "description": "Smallest Perplexity model (API)"},
        {"id": "llama-3.1-sonar-large-128k-online", "name": "Llama 3.1 Sonar Large", "description": "Mid-size Perplexity model (API)"},
        {"id": "llama-3.1-sonar-huge-128k-online", "name": "Llama 3.1 Sonar Huge", "description": "Largest Perplexity model (API)"}
    ]
}

# Log parsing regex patterns
LOG_PATTERNS = {
    "default": r"(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\s+(?P<level>\w+)\s+(?P<message>.*)",
    "apache": r'(?P<ip>\S+) \S+ \S+ \[(?P<timestamp>[^]]+)\] "(?P<method>\S+) (?P<path>\S+) \S+" (?P<status>\d+) (?P<size>\S+)',
    "nginx": r'(?P<ip>\S+) - \S+ \[(?P<timestamp>[^]]+)\] "(?P<method>\S+) (?P<path>\S+) \S+" (?P<status>\d+) (?P<size>\d+)',
}

# Troubleshooting knowledge sources
KNOWLEDGE_SOURCES = [
    "Common database connection issues often involve network problems, credential errors, or resource limitations.",
    "API timeouts frequently occur due to overloaded servers, network latency, or misconfigured timeout settings.",
    "Web server 500 errors typically indicate server-side application failures or resource constraints.",
    "Authentication failures may be caused by expired credentials, permission issues, or identity service outages.",
    "High CPU usage can result from inefficient queries, background processes, or resource contention.",
    "Memory leaks gradually consume available RAM, often due to objects not being properly garbage collected.",
    "Disk I/O bottlenecks may cause system-wide slowdowns and are typically resolved by optimizing data access patterns.",
    "Network connectivity issues might be related to DNS resolution, firewall rules, or physical infrastructure problems.",
]
