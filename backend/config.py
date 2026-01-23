import os
from dotenv import load_dotenv

load_dotenv()

# OpenAI API
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Model configurations
MODELS = {
    "nano": "gpt-5-nano",
    "mini": "gpt-5-mini", 
    "full": "gpt-5.2"
}

# Complexity to model mapping
COMPLEXITY_MODEL_MAP = {
    "simple": "nano",
    "medium": "mini", 
    "complex": "full"
}

# Max output tokens per model
MAX_TOKENS = {
    "nano": 16384,
    "mini": 16384,
    "full": 16384
}

# App settings
APP_NAME = "Xeva"
APP_VERSION = "1.0.0"
