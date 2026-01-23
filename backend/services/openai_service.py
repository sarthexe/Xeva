import time
import asyncio
from typing import List, Optional
from openai import AsyncOpenAI
import sys
from pathlib import Path
from config import OPENAI_API_KEY, MODELS, COMPLEXITY_MODEL_MAP, MAX_TOKENS
from services.classifier import classifier

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

class OpenAIService:
    """OpenAI API service with automatic model selection."""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    
    async def chat(
        self,
        message: str,
        conversation_history: Optional[List[dict]] = None
    ) -> dict:
        """
        Send a message to OpenAI with automatic model selection.
        
        Args:
            message: The user's message
            conversation_history: Previous messages in the conversation
            
        Returns:
            dict with response, model used, complexity, and timing
        """
        start_time = time.time()
        
        # Step 1: Classify complexity (run sync classifier in executor to not block)
        loop = asyncio.get_event_loop()
        complexity = await loop.run_in_executor(None, classifier.classify, message)
        
        # Step 2: Get appropriate model
        model_key = COMPLEXITY_MODEL_MAP[complexity]
        model_id = MODELS[model_key]
        
        # Step 3: Build messages
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant for Neolytix. Be concise, professional, and helpful."}
        ]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": message})
        
        # Step 4: Call OpenAI (async)
        # Note: gpt-5-nano/mini may not support max_tokens parameter or have different limits
        response = await self.client.chat.completions.create(
            model=model_id,
            messages=messages
        )
        
        # Extract response text
        response_text = response.choices[0].message.content or ""
        
        # Get finish reason
        finish_reason = response.choices[0].finish_reason
        if finish_reason == "content_filter":
            response_text = "I'm unable to help with that request."
        elif finish_reason == "length":
            response_text += "\n\n[Response truncated due to length limit]"
        
        end_time = time.time()
        response_time_ms = int((end_time - start_time) * 1000)
        
        return {
            "response": response_text,
            "model": model_key,
            "model_id": model_id,
            "complexity": complexity,
            "response_time_ms": response_time_ms,
            "stop_reason": finish_reason,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens
            }
        }


# Singleton instance
openai_service = OpenAIService()
