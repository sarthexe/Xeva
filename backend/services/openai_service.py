"""
OpenAI Service with Streaming and Connection Pooling

Optimizations:
- Singleton pattern with persistent HTTP client
- Connection pooling for reduced latency
- Streaming support for instant perceived response
"""

import time
from typing import List, Optional, AsyncGenerator
import httpx
from openai import AsyncOpenAI
from config import OPENAI_API_KEY, MODELS
from services.classifier import route_prompt
from services.rag_service import rag_service


class OpenAIService:
    """OpenAI service with connection pooling and streaming."""
    
    _instance = None
    _client = None
    _http_client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            # Persistent HTTP client with connection pooling
            cls._http_client = httpx.AsyncClient(
                timeout=60.0,
                limits=httpx.Limits(
                    max_keepalive_connections=10,
                    max_connections=20
                )
            )
            cls._client = AsyncOpenAI(
                api_key=OPENAI_API_KEY,
                http_client=cls._http_client
            )
        return cls._instance
    
    @property
    def client(self):
        return self._client
    
    async def chat(
        self,
        message: str,
        conversation_history: Optional[List[dict]] = None,
        use_rag: bool = True,
        doc_ids: Optional[List[str]] = None
    ) -> dict:
        """
        Send a message with automatic model selection and RAG augmentation.
        Uses fast rule-based routing instead of LLM classification.
        
        Args:
            message: User message
            conversation_history: Previous conversation turns
            use_rag: Whether to retrieve relevant context from knowledge base
            doc_ids: Optional list of document IDs to filter RAG search (session-specific)
        """
        start_time = time.time()
        
        # Step 1: Route instantly (~0.1ms)
        model_tier = route_prompt(message)
        model_id = MODELS[model_tier]
        
        # Map tier to complexity for response
        tier_to_complexity = {
            "nano": "simple",
            "mini": "medium",
            "full": "complex"
        }
        complexity = tier_to_complexity[model_tier]
        
        # Step 2: Retrieve RAG context if enabled AND doc_ids provided
        rag_context = ""
        sources_used = []
        if use_rag and doc_ids:
            try:
                # Build filter for specific document IDs
                filter_metadata = {"doc_id": {"$in": doc_ids}} if doc_ids else None
                rag_results = await rag_service.search(message, top_k=5, filter_metadata=filter_metadata)
                if rag_results:
                    rag_context = await rag_service.get_context_for_query(message, doc_ids=doc_ids)
                    sources_used = list(set([r.get('title', 'Unknown') for r in rag_results]))
            except Exception as e:
                print(f"RAG retrieval error: {e}")
        
        # Step 3: Build messages with RAG context
        system_content = "You are Xeva, a helpful AI assistant. Be concise, professional, and helpful."
        if rag_context:
            system_content = """You are Xeva, a helpful AI assistant specialized in answering questions based on uploaded documents.

IMPORTANT RULES:
1. ONLY answer questions using information from the provided document context below. Do not use external knowledge.
2. If the question cannot be answered from the document context, politely state that the information is not available in the uploaded document(s).
3. Do NOT ask follow-up questions in your initial response. Provide a complete, helpful answer directly.
4. When citing information, reference the source document naturally (e.g., "According to the document..." or "The uploaded file states...").
5. Be concise and professional in your responses.

DOCUMENT CONTEXT:
""" + rag_context
        
        messages = [
            {"role": "system", "content": system_content}
        ]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": message})
        
        # Step 3: Call OpenAI (async with connection pooling)
        response = await self._client.chat.completions.create(
            model=model_id,
            messages=messages
        )
        
        # Extract response
        response_text = response.choices[0].message.content or ""
        finish_reason = response.choices[0].finish_reason
        
        if finish_reason == "content_filter":
            response_text = "I'm unable to help with that request."
        elif finish_reason == "length":
            response_text += "\n\n[Response truncated due to length limit]"
        
        end_time = time.time()
        response_time_ms = int((end_time - start_time) * 1000)
        
        return {
            "response": response_text,
            "model": model_tier,
            "model_id": model_id,
            "complexity": complexity,
            "response_time_ms": response_time_ms,
            "stop_reason": finish_reason,
            "rag_enabled": use_rag,
            "sources": sources_used,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens
            }
        }
    
    async def chat_stream(
        self,
        message: str,
        conversation_history: Optional[List[dict]] = None,
        use_rag: bool = True,
        doc_ids: Optional[List[str]] = None
    ) -> AsyncGenerator[dict, None]:
        """
        Stream response chunks for instant perceived response.
        Yields chunks as they arrive from OpenAI.
        
        Args:
            message: User message
            conversation_history: Previous conversation turns
            use_rag: Whether to retrieve relevant context from knowledge base
            doc_ids: Optional list of document IDs to filter RAG search (session-specific)
        """
        start_time = time.time()
        
        # Route instantly
        model_tier = route_prompt(message)
        model_id = MODELS[model_tier]
        
        tier_to_complexity = {
            "nano": "simple",
            "mini": "medium", 
            "full": "complex"
        }
        complexity = tier_to_complexity[model_tier]
        
        # Retrieve RAG context if enabled AND doc_ids provided
        rag_context = ""
        sources_used = []
        if use_rag and doc_ids:
            try:
                # Build filter for specific document IDs
                filter_metadata = {"doc_id": {"$in": doc_ids}} if doc_ids else None
                rag_results = await rag_service.search(message, top_k=5, filter_metadata=filter_metadata)
                if rag_results:
                    rag_context = await rag_service.get_context_for_query(message, doc_ids=doc_ids)
                    sources_used = list(set([r.get('title', 'Unknown') for r in rag_results]))
            except Exception as e:
                print(f"RAG retrieval error: {e}")
        
        # Build messages with RAG context
        system_content = "You are Xeva, a helpful AI assistant. Be concise, professional, and helpful."
        if rag_context:
            system_content = """You are Xeva, a helpful AI assistant specialized in answering questions based on uploaded documents.

IMPORTANT RULES:
1. ONLY answer questions using information from the provided document context below. Do not use external knowledge.
2. If the question cannot be answered from the document context, politely state that the information is not available in the uploaded document(s).
3. Do NOT ask follow-up questions in your initial response. Provide a complete, helpful answer directly.
4. When citing information, reference the source document naturally (e.g., "According to the document..." or "The uploaded file states...").
5. Be concise and professional in your responses.

DOCUMENT CONTEXT:
""" + rag_context
        
        messages = [
            {"role": "system", "content": system_content}
        ]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": message})
        
        # Yield routing info immediately (including RAG sources)
        yield {
            "type": "start",
            "model": model_tier,
            "model_id": model_id,
            "complexity": complexity,
            "rag_enabled": use_rag,
            "sources": sources_used
        }
        
        # Stream from OpenAI
        stream = await self._client.chat.completions.create(
            model=model_id,
            messages=messages,
            stream=True,
            stream_options={"include_usage": True}
        )

        finish_reason = None
        usage = None
        async for chunk in stream:
            if chunk.choices:
                choice = chunk.choices[0]
                if choice.finish_reason:
                    finish_reason = choice.finish_reason
                if choice.delta and choice.delta.content:
                    yield {
                        "type": "content",
                        "text": choice.delta.content
                    }
            if chunk.usage:
                usage = {
                    "input_tokens": chunk.usage.prompt_tokens,
                    "output_tokens": chunk.usage.completion_tokens
                }
        
        # Final stats
        end_time = time.time()
        yield {
            "type": "done",
            "response_time_ms": int((end_time - start_time) * 1000),
            "model": model_tier,
            "finish_reason": finish_reason,
            "usage": usage
        }


# Singleton instance
openai_service = OpenAIService()
