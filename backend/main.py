import json
import jwt
import secrets
from datetime import datetime, timedelta
from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from pathlib import Path

from services.openai_service import openai_service
from services.auth_service import auth_service
from services.rag_service import rag_service
from config import APP_NAME, APP_VERSION

# Get the project root directory (parent of backend)
PROJECT_ROOT = Path(__file__).parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# JWT Secret for token signing
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

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
    use_rag: Optional[bool] = True  # Enable/disable RAG for this request


class ChatResponse(BaseModel):
    response: str
    model: str
    complexity: str
    response_time_ms: int
    usage: dict
    rag_enabled: Optional[bool] = None
    sources: Optional[List[str]] = None


class DocumentIndexRequest(BaseModel):
    content: str
    title: Optional[str] = None
    source: Optional[str] = "manual"
    metadata: Optional[Dict[str, Any]] = None


class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    min_score: Optional[float] = 0.7


class GoogleAuthRequest(BaseModel):
    token: str


class AuthResponse(BaseModel):
    token: str
    user: dict


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the chat page."""
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
    """Send a message and get an auto-routed response with optional RAG."""
    result = await openai_service.chat(
        message=request.message,
        conversation_history=request.history,
        use_rag=request.use_rag
    )
    
    return ChatResponse(
        response=result["response"],
        model=result["model"],
        complexity=result["complexity"],
        response_time_ms=result["response_time_ms"],
        usage=result["usage"],
        rag_enabled=result.get("rag_enabled"),
        sources=result.get("sources")
    )


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming chat endpoint for instant perceived response.
    
    Returns Server-Sent Events (SSE) with chunks:
    - {"type": "start", "model": "...", "complexity": "..."}
    - {"type": "content", "text": "..."}
    - {"type": "done", "response_time_ms": ...}
    """
    async def generate():
        # Yield "thinking" indicator immediately for instant feedback
        yield f"data: {json.dumps({'type': 'thinking'})}\n\n"
        
        async for chunk in openai_service.chat_stream(
            message=request.message,
            conversation_history=request.history,
            use_rag=request.use_rag
        ):
            yield f"data: {json.dumps(chunk)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "app": APP_NAME, "version": APP_VERSION}


@app.post("/api/auth/google", response_model=AuthResponse)
async def google_auth(request: GoogleAuthRequest):
    """
    Authenticate a user with their Google ID token.
    
    Returns a JWT token for subsequent API calls.
    """
    # Verify the Google token
    google_user = await auth_service.verify_google_token(request.token)
    
    if not google_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google token"
        )
    
    # Get or create the user
    user = auth_service.get_or_create_user(google_user)
    
    # Create JWT token
    expiration = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    token_payload = {
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
        "exp": expiration
    }
    jwt_token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return AuthResponse(
        token=jwt_token,
        user={
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user["picture"]
        }
    )


@app.get("/api/auth/me")
async def get_current_user(request: Request):
    """Get the current authenticated user from JWT token."""
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = auth_service.get_user_by_id(payload["sub"])
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user["picture"]
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ==================== RAG Endpoints ====================

@app.post("/api/rag/index")
async def index_document(request: DocumentIndexRequest):
    """
    Index a document into the knowledge base.
    
    Accepts text content that will be chunked, embedded, and stored in Pinecone.
    """
    result = await rag_service.index_document(
        content=request.content,
        source=request.source,
        title=request.title,
        metadata=request.metadata
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@app.post("/api/rag/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    source: Optional[str] = Form("upload")
):
    """
    Upload and index a document file (.txt, .md, .json).
    
    The file content will be extracted, chunked, and indexed.
    """
    # Validate file type
    allowed_extensions = [".txt", ".md", ".json", ".csv"]
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Read file content
    content = await file.read()
    try:
        text_content = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be valid UTF-8 text")
    
    # Use filename as title if not provided
    doc_title = title or file.filename
    
    result = await rag_service.index_document(
        content=text_content,
        source=source,
        title=doc_title,
        metadata={"filename": file.filename, "file_type": file_ext}
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@app.post("/api/rag/search")
async def search_knowledge_base(request: SearchRequest):
    """
    Search the knowledge base for relevant content.
    
    Returns matching chunks with similarity scores.
    """
    results = await rag_service.search(
        query=request.query,
        top_k=request.top_k,
        min_score=request.min_score
    )
    
    return {
        "query": request.query,
        "results": results,
        "count": len(results)
    }


@app.delete("/api/rag/document/{doc_id}")
async def delete_document(doc_id: str):
    """
    Delete a document from the knowledge base by its ID.
    """
    result = await rag_service.delete_document(doc_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@app.get("/api/rag/stats")
async def get_rag_stats():
    """
    Get statistics about the knowledge base.
    """
    return await rag_service.get_stats()


@app.on_event("startup")
async def startup_event():
    """Initialize RAG service on startup."""
    try:
        await rag_service.initialize()
        print("✅ RAG Service initialized successfully")
    except Exception as e:
        print(f"⚠️ RAG Service initialization warning: {e}")
