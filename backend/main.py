import json
import re
import jwt
import secrets
import asyncio
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


class SuggestRequest(BaseModel):
    message: str
    response: str


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


def _topic_from_message(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    cleaned = re.sub(r"(?is)^context:\s*user has uploaded[\s\S]*?question:\s*", "", cleaned).strip()
    if not cleaned:
        return "this topic"
    words = cleaned.split()
    topic = " ".join(words[:8])
    return topic[:80].strip()


def _normalize_followups(items: Any) -> List[str]:
    if not isinstance(items, list):
        return []

    normalized: List[str] = []
    seen = set()
    for item in items:
        q = str(item).strip().strip('"').strip("'")
        q = re.sub(r"^\s*(?:[-*]|\d+[.)])\s*", "", q)
        q = re.sub(r"\s+", " ", q).strip()
        if len(q) < 8:
            continue
        if not q.endswith("?"):
            q = f"{q}?"
        key = q.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(q)
        if len(normalized) == 3:
            break
    return normalized


def _fallback_followups(text: str) -> List[str]:
    topic = _topic_from_message(text)
    t = (text or "").lower()

    if any(k in t for k in ["code", "bug", "error", "debug"]):
        return [
            f"Can you break {topic} into concrete implementation steps?",
            f"Can you show a minimal working example for {topic}?",
            f"What edge cases should I test first for {topic}?"
        ]
    if any(k in t for k in ["write", "draft", "email"]):
        return [
            f"Can you rewrite this {topic} in a shorter tone?",
            f"Can you give 3 versions of this {topic} for different audiences?",
            f"What subject line works best for this {topic}?"
        ]
    return [
        f"Can you go deeper into {topic}?",
        f"What are practical next steps for {topic}?",
        f"What risks or tradeoffs should I consider for {topic}?"
    ]


async def _generate_title_and_followups(message: str, response: str) -> Dict[str, Any]:
    """
    Generate a title and follow-ups based on prompt + answer.
    """
    client = openai_service.client
    message_text = message or ""
    response_text = (response or "")[:1000]

    async def generate_title():
        try:
            resp = await client.chat.completions.create(
                model="gpt-5-mini",
                messages=[
                    {"role": "system", "content": "Generate a concise 3-6 word title for this conversation. Return ONLY the title, no quotes or punctuation at the end."},
                    {"role": "user", "content": message_text},
                    {"role": "assistant", "content": response_text}
                ],
                max_completion_tokens=20,
            )
            return resp.choices[0].message.content.strip().strip('"\'')
        except Exception as e:
            print(f"Title generation error: {e}")
            return message_text[:30] + ("..." if len(message_text) > 30 else "")

    async def generate_followups():
        try:
            resp = await client.chat.completions.create(
                model="gpt-5-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Generate exactly 3 follow-up questions tailored to the user's prompt and the assistant answer. "
                            "Return ONLY a JSON array of 3 strings. "
                            "Each question must reference specific details from the answer (terms, steps, constraints, or numbers). "
                            "Avoid generic questions like 'key takeaways'. Keep each question under 90 characters."
                        )
                    },
                    {
                        "role": "user",
                        "content": (
                            f"User prompt:\n{message_text}\n\n"
                            f"Assistant answer:\n{response_text}"
                        )
                    }
                ],
                max_completion_tokens=200,
            )
            raw = resp.choices[0].message.content.strip()
            
            followups: List[str] = []

            # 1) Direct JSON parse
            try:
                followups = _normalize_followups(json.loads(raw))
            except json.JSONDecodeError:
                followups = []

            # 2) Extract JSON array if wrapped with extra text
            if not followups:
                match = re.search(r"\[[\s\S]*\]", raw)
                if match:
                    try:
                        followups = _normalize_followups(json.loads(match.group(0)))
                    except json.JSONDecodeError:
                        followups = []

            # 3) Extract quoted items
            if not followups:
                quoted = re.findall(r'"([^"\n]{8,140})"', raw)
                followups = _normalize_followups(quoted)

            # 4) Parse list-style lines
            if not followups:
                lines = [line.strip() for line in raw.split("\n") if line.strip()]
                followups = _normalize_followups(lines)

            if followups:
                return followups[:3]
            return _fallback_followups(message_text)
        except Exception as e:
            print(f"Follow-up generation error: {e}")
            try:
                print(f"FAILED CONTENT: {resp.choices[0].message.content}")
            except:
                pass
            return _fallback_followups(message_text)

    title, followups = await asyncio.gather(generate_title(), generate_followups())
    return {"title": title, "followups": followups}


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming chat endpoint for real-time tokens and post-stream suggestions.
    
    SSE events:
    - {"type": "start", "model": "...", "complexity": "..."}
    - {"type": "content", "text": "..."}
    - {"type": "done", "response_time_ms": ...}
    - {"type": "suggestions", "title": "...", "followups": ["...", "...", "..."]}
    """
    async def generate():
        yield f"data: {json.dumps({'type': 'thinking'})}\n\n"

        response_parts: List[str] = []
        response_ready = asyncio.Event()

        async def suggestions_worker():
            await response_ready.wait()
            full_response = "".join(response_parts).strip()
            if not full_response:
                return {
                    "title": request.message[:30] + ("..." if len(request.message) > 30 else ""),
                    "followups": _fallback_followups(request.message)
                }
            return await _generate_title_and_followups(request.message, full_response)

        suggestions_task = asyncio.create_task(suggestions_worker())
        stream_finished = False

        try:
            async for chunk in openai_service.chat_stream(
                message=request.message,
                conversation_history=request.history,
                use_rag=request.use_rag,
                doc_ids=request.doc_ids
            ):
                if chunk.get("type") == "content":
                    response_parts.append(chunk.get("text", ""))
                if chunk.get("type") == "done" and not stream_finished:
                    stream_finished = True
                    response_ready.set()

                yield f"data: {json.dumps(chunk)}\n\n"

            if not stream_finished:
                response_ready.set()

            suggestions = await suggestions_task
            yield f"data: {json.dumps({'type': 'suggestions', **suggestions})}\n\n"
        except Exception as e:
            if not response_ready.is_set():
                response_ready.set()
            if not suggestions_task.done():
                suggestions_task.cancel()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/api/chat/suggest")
async def chat_suggest(request: SuggestRequest):
    """
    Generate a chat title and follow-up questions in parallel.
    """
    return await _generate_title_and_followups(request.message, request.response)


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
