"""
RAG Service - Retrieval Augmented Generation with Pinecone and OpenAI

This service handles:
- Document chunking and embedding generation
- Vector storage in Pinecone
- Semantic search for relevant context retrieval
- Context augmentation for improved chat responses
"""

import hashlib
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
import tiktoken

from openai import AsyncOpenAI
from pinecone import Pinecone, ServerlessSpec

from config import (
    OPENAI_API_KEY,
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSION,
    RAG_TOP_K,
    RAG_SIMILARITY_THRESHOLD,
    RAG_CHUNK_SIZE,
    RAG_CHUNK_OVERLAP
)


class RAGService:
    """
    RAG Service for document indexing and context retrieval.
    
    Uses Pinecone for vector storage and OpenAI for embeddings.
    """
    
    _instance = None
    _openai_client = None
    _pinecone_client = None
    _index = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def initialize(self):
        """Initialize Pinecone and OpenAI clients."""
        if self._initialized:
            return
        
        # Initialize OpenAI client
        self._openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        # Initialize Pinecone client
        if PINECONE_API_KEY:
            self._pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
            
            # Check if index exists, create if not
            existing_indexes = [idx.name for idx in self._pinecone_client.list_indexes()]
            
            if PINECONE_INDEX_NAME not in existing_indexes:
                self._pinecone_client.create_index(
                    name=PINECONE_INDEX_NAME,
                    dimension=EMBEDDING_DIMENSION,
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region="us-east-1"
                    )
                )
            
            self._index = self._pinecone_client.Index(PINECONE_INDEX_NAME)
            self._initialized = True
        else:
            print("Warning: PINECONE_API_KEY not set. RAG functionality disabled.")
    
    def _chunk_text(self, text: str, chunk_size: int = None, overlap: int = None) -> List[str]:
        """
        Split text into overlapping chunks for better context retrieval.
        
        Uses sentence-aware splitting to avoid breaking mid-sentence.
        """
        chunk_size = chunk_size or RAG_CHUNK_SIZE
        overlap = overlap or RAG_CHUNK_OVERLAP
        
        if len(text) <= chunk_size:
            return [text.strip()]
        
        chunks = []
        sentences = text.replace('\n', ' ').split('. ')
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # Add period back if it was removed
            if not sentence.endswith('.'):
                sentence += '.'
            
            # Check if adding this sentence would exceed chunk size
            if len(current_chunk) + len(sentence) + 1 > chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    # Start new chunk with overlap from previous
                    overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                    current_chunk = overlap_text + " " + sentence
                else:
                    # Single sentence is too long, split by words
                    words = sentence.split()
                    current_chunk = ""
                    for word in words:
                        if len(current_chunk) + len(word) + 1 > chunk_size:
                            chunks.append(current_chunk.strip())
                            current_chunk = word
                        else:
                            current_chunk += " " + word
            else:
                current_chunk += " " + sentence
        
        # Don't forget the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text using OpenAI."""
        if not self._openai_client:
            await self.initialize()
        
        response = await self._openai_client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text
        )
        
        return response.data[0].embedding
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts in batch."""
        if not self._openai_client:
            await self.initialize()
        
        response = await self._openai_client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texts
        )
        
        return [item.embedding for item in response.data]
    
    def _generate_doc_id(self, content: str, metadata: Dict = None) -> str:
        """Generate a unique document ID based on content hash."""
        hash_input = content + str(metadata or {})
        return hashlib.sha256(hash_input.encode()).hexdigest()[:16]
    
    async def index_document(
        self,
        content: str,
        source: str = "manual",
        title: str = None,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Index a document into Pinecone.
        
        Args:
            content: The document text content
            source: Source identifier (e.g., "upload", "url", "manual")
            title: Optional document title
            metadata: Additional metadata to store
            
        Returns:
            Dict with indexing results including chunk count and IDs
        """
        if not self._initialized:
            await self.initialize()
        
        if not self._index:
            return {"error": "Pinecone not initialized. Check PINECONE_API_KEY."}
        
        # Generate document ID
        doc_id = self._generate_doc_id(content, metadata)
        
        # Chunk the document
        chunks = self._chunk_text(content)
        
        if not chunks:
            return {"error": "No content to index"}
        
        # Generate embeddings for all chunks
        embeddings = await self.generate_embeddings(chunks)
        
        # Prepare vectors for Pinecone
        vectors = []
        chunk_ids = []
        
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_id = f"{doc_id}_{i}"
            chunk_ids.append(chunk_id)
            
            vector_metadata = {
                "doc_id": doc_id,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "text": chunk,  # Store text for retrieval
                "source": source,
                "title": title or "Untitled",
                "indexed_at": datetime.utcnow().isoformat(),
                **(metadata or {})
            }
            
            vectors.append({
                "id": chunk_id,
                "values": embedding,
                "metadata": vector_metadata
            })
        
        # Upsert to Pinecone (batch of 100 max)
        batch_size = 100
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            self._index.upsert(vectors=batch)
        
        return {
            "success": True,
            "doc_id": doc_id,
            "chunks_indexed": len(chunks),
            "chunk_ids": chunk_ids,
            "title": title or "Untitled",
            "source": source
        }
    
    async def search(
        self,
        query: str,
        top_k: int = None,
        filter_metadata: Dict[str, Any] = None,
        min_score: float = None
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant document chunks.
        
        Args:
            query: The search query
            top_k: Number of results to return
            filter_metadata: Optional Pinecone metadata filter
            min_score: Minimum similarity score threshold
            
        Returns:
            List of matching chunks with scores and metadata
        """
        if not self._initialized:
            await self.initialize()
        
        if not self._index:
            return []
        
        top_k = top_k or RAG_TOP_K
        min_score = min_score or RAG_SIMILARITY_THRESHOLD
        
        # Generate query embedding
        query_embedding = await self.generate_embedding(query)
        
        # Search in Pinecone
        results = self._index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter_metadata
        )
        
        # Filter by minimum score and format results
        relevant_chunks = []
        for match in results.matches:
            if match.score >= min_score:
                relevant_chunks.append({
                    "id": match.id,
                    "score": match.score,
                    "text": match.metadata.get("text", ""),
                    "title": match.metadata.get("title", ""),
                    "source": match.metadata.get("source", ""),
                    "doc_id": match.metadata.get("doc_id", ""),
                    "chunk_index": match.metadata.get("chunk_index", 0),
                    "metadata": match.metadata
                })
        
        return relevant_chunks
    
    async def get_context_for_query(
        self,
        query: str,
        top_k: int = None,
        max_tokens: int = 2000
    ) -> str:
        """
        Get formatted context string for augmenting LLM prompts.
        
        Args:
            query: The user's query
            top_k: Number of chunks to retrieve
            max_tokens: Maximum tokens for context (approximate)
            
        Returns:
            Formatted context string ready to inject into prompts
        """
        chunks = await self.search(query, top_k=top_k)
        
        if not chunks:
            return ""
        
        # Build context string with source citations
        context_parts = []
        total_chars = 0
        max_chars = max_tokens * 4  # Rough estimate: 4 chars per token
        
        for i, chunk in enumerate(chunks, 1):
            chunk_text = chunk["text"]
            source_info = f"[Source: {chunk['title']}]" if chunk['title'] else ""
            
            formatted_chunk = f"**Context {i}** {source_info}:\n{chunk_text}\n"
            
            if total_chars + len(formatted_chunk) > max_chars:
                break
                
            context_parts.append(formatted_chunk)
            total_chars += len(formatted_chunk)
        
        if context_parts:
            return (
                "---\n"
                "**Relevant Knowledge Base Context:**\n\n"
                + "\n".join(context_parts)
                + "\n---\n"
            )
        
        return ""
    
    async def delete_document(self, doc_id: str) -> Dict[str, Any]:
        """Delete all chunks for a specific document."""
        if not self._initialized:
            await self.initialize()
        
        if not self._index:
            return {"error": "Pinecone not initialized"}
        
        # Delete by metadata filter
        self._index.delete(filter={"doc_id": {"$eq": doc_id}})
        
        return {"success": True, "deleted_doc_id": doc_id}
    
    async def list_documents(self) -> List[Dict[str, Any]]:
        """List all indexed documents (unique doc_ids with metadata)."""
        if not self._initialized:
            await self.initialize()
        
        if not self._index:
            return []
        
        # Get index stats
        stats = self._index.describe_index_stats()
        
        return {
            "total_vectors": stats.total_vector_count,
            "index_name": PINECONE_INDEX_NAME,
            "dimension": EMBEDDING_DIMENSION
        }
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get Pinecone index statistics."""
        if not self._initialized:
            await self.initialize()
        
        if not self._index:
            return {"error": "Pinecone not initialized"}
        
        stats = self._index.describe_index_stats()
        
        return {
            "total_vectors": stats.total_vector_count,
            "index_name": PINECONE_INDEX_NAME,
            "dimension": EMBEDDING_DIMENSION,
            "embedding_model": EMBEDDING_MODEL
        }


# Singleton instance
rag_service = RAGService()
