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
RAG_TOP_K = 10  # Number of chunks to retrieve
RAG_SIMILARITY_THRESHOLD = 0.3  # Minimum similarity score (lowered for better recall)
RAG_CHUNK_SIZE = 1000  # Characters per chunk (larger for better context)
RAG_CHUNK_OVERLAP = 100  # Overlap between chunks

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

# Database
DATABASE_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "xeva.db"))

# App settings
APP_NAME = "Xeva"
APP_VERSION = "1.0.0"
