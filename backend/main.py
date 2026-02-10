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
from services.document_parser import document_parser
from database import database
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
    doc_ids: Optional[List[str]] = None  # Filter RAG to specific document IDs


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


class CreateChatRequest(BaseModel):
    id: str
    title: Optional[str] = "New Chat"


class UpdateChatRequest(BaseModel):
    title: str


class AddMessageRequest(BaseModel):
    id: str
    role: str
    content: str
    model: Optional[str] = None
    complexity: Optional[str] = None
    responseTime: Optional[int] = None
    usage: Optional[dict] = None
    sources: Optional[List[str]] = None
    reaction: Optional[str] = None


class UpdateMessageRequest(BaseModel):
    content: Optional[str] = None
    reaction: Optional[str] = None
    model: Optional[str] = None
    complexity: Optional[str] = None
    responseTime: Optional[int] = None
    usage: Optional[dict] = None
    sources: Optional[List[str]] = None


class DeleteMessagesAfterRequest(BaseModel):
    after_message_id: str


async def get_user_id_from_request(request: Request) -> str:
    """Extract user_id from JWT token in the Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


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
        use_rag=request.use_rag,
        doc_ids=request.doc_ids
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
            use_rag=request.use_rag,
            doc_ids=request.doc_ids
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
    user = await auth_service.get_or_create_user(google_user)
    
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
        user = await auth_service.get_user_by_id(payload["sub"])
        
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
    Upload and index a document file.
    
    Supported formats:
    - Text files: .txt, .md, .csv, .json, .xml, .html
    - PDF documents: .pdf (with OCR fallback for scanned documents)
    - Word documents: .docx
    - Images: .png, .jpg, .jpeg, .gif, .bmp, .webp, .tiff (OCR text extraction)
    
    The file content will be extracted, chunked, and indexed into the knowledge base.
    """
    # Check if file type is supported
    if not document_parser.is_supported(file.filename):
        supported = ", ".join(document_parser.get_supported_extensions())
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported formats: {supported}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size (max 50MB)
    max_size = 50 * 1024 * 1024  # 50MB
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 50MB."
        )
    
    # Parse the document
    try:
        text_content, parse_metadata = await document_parser.parse(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Check if any text was extracted
    if not text_content or len(text_content.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Could not extract meaningful text from the file. "
                   "For images, ensure they contain readable text. "
                   "For PDFs, ensure they are not password protected."
        )
    
    # Use filename as title if not provided
    doc_title = title or file.filename
    
    # Merge parse metadata with custom metadata
    metadata = {
        **parse_metadata,
        "original_size_bytes": len(content),
        "extracted_chars": len(text_content)
    }
    
    result = await rag_service.index_document(
        content=text_content,
        source=source,
        title=doc_title,
        metadata=metadata
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Add parser info to response
    result["parser_used"] = parse_metadata.get("parser_used", "unknown")
    result["extracted_chars"] = len(text_content)
    
    return result


@app.get("/api/rag/supported-types")
async def get_supported_file_types():
    """
    Get list of supported file types for upload.
    """
    return {
        "supported_extensions": document_parser.get_supported_extensions(),
        "categories": {
            "text": document_parser.SUPPORTED_TEXT,
            "pdf": document_parser.SUPPORTED_PDF if hasattr(document_parser, '_parse_pdf') else [],
            "documents": document_parser.SUPPORTED_DOCX if hasattr(document_parser, '_parse_docx') else [],
            "images": document_parser.SUPPORTED_IMAGES if hasattr(document_parser, '_parse_image') else []
        }
    }


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
    """Initialize database and RAG service on startup."""
    try:
        await database.initialize()
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
    
    try:
        await rag_service.initialize()
        print("✅ RAG Service initialized successfully")
    except Exception as e:
        print(f"⚠️ RAG Service initialization warning: {e}")


# ==================== Chat History Endpoints ====================

@app.get("/api/chats")
async def list_chats(request: Request):
    """List all chats for the authenticated user."""
    user_id = await get_user_id_from_request(request)
    chats = await database.get_chats(user_id)
    
    # Transform to frontend format
    result = []
    for chat in chats:
        result.append({
            "id": chat["id"],
            "title": chat["title"],
            "createdAt": chat["created_at"],
            "messages": chat.get("messages", [])
        })
    return result


@app.post("/api/chats")
async def create_chat(request: Request, body: CreateChatRequest):
    """Create a new chat session."""
    user_id = await get_user_id_from_request(request)
    chat = await database.create_chat(body.id, user_id, body.title)
    return {
        "id": chat["id"],
        "title": chat["title"],
        "createdAt": chat["created_at"],
        "messages": []
    }


@app.put("/api/chats/{chat_id}")
async def update_chat(chat_id: str, request: Request, body: UpdateChatRequest):
    """Update a chat's title."""
    user_id = await get_user_id_from_request(request)
    chat = await database.update_chat(chat_id, user_id, body.title)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"id": chat["id"], "title": chat["title"]}


@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str, request: Request):
    """Delete a chat and all its messages."""
    user_id = await get_user_id_from_request(request)
    deleted = await database.delete_chat(chat_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"deleted": True}


@app.post("/api/chats/{chat_id}/messages")
async def add_message(chat_id: str, request: Request, body: AddMessageRequest):
    """Add a message to a chat."""
    user_id = await get_user_id_from_request(request)
    
    message_data = body.model_dump(exclude_none=True)
    result = await database.add_message(chat_id, message_data)
    return result


@app.put("/api/chats/{chat_id}/messages/{message_id}")
async def update_message(chat_id: str, message_id: str, request: Request, body: UpdateMessageRequest):
    """Update a message (content, reaction, etc)."""
    await get_user_id_from_request(request)
    
    updates = body.model_dump(exclude_none=True)
    updated = await database.update_message(message_id, chat_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"updated": True}


@app.post("/api/chats/{chat_id}/messages/delete-after")
async def delete_messages_after(chat_id: str, request: Request, body: DeleteMessagesAfterRequest):
    """Delete all messages after a given message in a chat."""
    await get_user_id_from_request(request)
    
    count = await database.delete_messages_after(chat_id, body.after_message_id)
    return {"deleted_count": count}
