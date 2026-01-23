from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from pathlib import Path

from services.openai_service import openai_service
from config import APP_NAME, APP_VERSION

# Get the project root directory (parent of backend)
PROJECT_ROOT = Path(__file__).parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# Create FastAPI app
app = FastAPI(
    title=APP_NAME,
    description="AI Assistant with automatic model selection for Neolytix",
    version=APP_VERSION
)

# Add CORS middleware to allow frontend to call API directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    response: str
    model: str
    complexity: str
    response_time_ms: int
    usage: dict


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the chat page."""
    # For Next.js, the frontend should be running separately
    # This endpoint can redirect or return a simple message
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Neolytix AI Assistant</title>
        <meta http-equiv="refresh" content="0; url=http://localhost:3000">
    </head>
    <body>
        <p>Redirecting to frontend... If not redirected, please start the Next.js dev server:</p>
        <p><code>cd frontend && npm run dev</code></p>
        <p>Or visit <a href="http://localhost:3000">http://localhost:3000</a></p>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message and get an auto-routed response."""
    result = await openai_service.chat(
        message=request.message,
        conversation_history=request.history
    )
    
    return ChatResponse(
        response=result["response"],
        model=result["model"],
        complexity=result["complexity"],
        response_time_ms=result["response_time_ms"],
        usage=result["usage"]
    )


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "app": APP_NAME, "version": APP_VERSION}
