"""
OpenAI Service with Streaming and Connection Pooling

Optimizations:
- Singleton pattern with persistent HTTP client
- Connection pooling for reduced latency
- Streaming support for instant perceived response
"""

import time
import json
from typing import List, Optional, AsyncGenerator
import httpx
from openai import AsyncOpenAI
from config import OPENAI_API_KEY, MODELS
from services.classifier import route_prompt


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
        conversation_history: Optional[List[dict]] = None
    ) -> dict:
        """
        Send a message with automatic model selection.
        Uses fast rule-based routing instead of LLM classification.
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
        
        # Step 2: Build messages
        messages = [
            {"role": "system", "content": "You are Xeva, a helpful AI assistant. Be concise, professional, and helpful."}
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
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens
            }
        }
    
    async def chat_stream(
        self,
        message: str,
        conversation_history: Optional[List[dict]] = None
    ) -> AsyncGenerator[dict, None]:
        """
        Stream response chunks for instant perceived response.
        Yields chunks as they arrive from OpenAI.
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
        
        # Build messages
        messages = [
            {"role": "system", "content": "You are Xeva, a helpful AI assistant. Be concise, professional, and helpful."}
        ]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": message})
        
        # Yield routing info immediately
        yield {
            "type": "start",
            "model": model_tier,
            "model_id": model_id,
            "complexity": complexity
        }
        
        # Stream from OpenAI
        stream = await self._client.chat.completions.create(
            model=model_id,
            messages=messages,
            stream=True
        )
        
        total_tokens = 0
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                total_tokens += 1  # Approximate
                yield {
                    "type": "content",
                    "text": content
                }
        
        # Final stats
        end_time = time.time()
        yield {
            "type": "done",
            "response_time_ms": int((end_time - start_time) * 1000),
            "model": model_tier
        }


# Singleton instance
openai_service = OpenAIService()
