import os
from dotenv import load_dotenv

load_dotenv()

# OpenAI API
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# ChromaDB Configuration
CHROMA_PERSIST_DIRECTORY = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_data")
CHROMA_COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "xeva-knowledge")

# Embedding Configuration
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536

# RAG Configuration
RAG_TOP_K = 5  # Number of chunks to retrieve
RAG_SIMILARITY_THRESHOLD = 0.7  # Minimum similarity score
RAG_CHUNK_SIZE = 500  # Characters per chunk
RAG_CHUNK_OVERLAP = 50  # Overlap between chunks

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
