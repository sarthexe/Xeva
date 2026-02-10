"""
SQLite Database for persistent chat history and user storage.

Tables:
- users: Google OAuth user profiles
- chats: Chat sessions per user
- messages: Individual messages within chats
"""
import aiosqlite
import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

from config import DATABASE_PATH


class Database:
    """Async SQLite database manager."""
    
    _instance = None
    _db_path = DATABASE_PATH
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def initialize(self):
        """Create tables if they don't exist."""
        async with aiosqlite.connect(self._db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    name TEXT NOT NULL,
                    picture TEXT DEFAULT '',
                    email_verified INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                );
                
                CREATE TABLE IF NOT EXISTS chats (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT DEFAULT 'New Chat',
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    chat_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    model TEXT,
                    complexity TEXT,
                    response_time INTEGER,
                    input_tokens INTEGER,
                    output_tokens INTEGER,
                    sources TEXT,
                    reaction TEXT CHECK(reaction IN ('up', 'down', NULL)),
                    created_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
                CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
            """)
            await db.commit()
        print(f"✅ Database initialized at {self._db_path}")
    
    async def _get_db(self) -> aiosqlite.Connection:
        db = await aiosqlite.connect(self._db_path)
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON")
        return db
    
    # ==================== User Operations ====================
    
    async def get_user(self, user_id: str) -> Optional[Dict]:
        """Get a user by ID."""
        async with await self._get_db() as db:
            cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    async def upsert_user(self, user_data: Dict) -> Dict:
        """Create or update a user."""
        async with await self._get_db() as db:
            await db.execute("""
                INSERT INTO users (id, email, name, picture, email_verified, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(id) DO UPDATE SET
                    email = excluded.email,
                    name = excluded.name,
                    picture = excluded.picture,
                    updated_at = datetime('now')
            """, (
                user_data["id"],
                user_data.get("email", ""),
                user_data.get("name", ""),
                user_data.get("picture", ""),
                1 if user_data.get("email_verified") else 0
            ))
            await db.commit()
            
            cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_data["id"],))
            row = await cursor.fetchone()
            return dict(row)
    
    # ==================== Chat Operations ====================
    
    async def get_chats(self, user_id: str) -> List[Dict]:
        """Get all chats for a user, ordered by most recent."""
        async with await self._get_db() as db:
            cursor = await db.execute(
                "SELECT * FROM chats WHERE user_id = ? ORDER BY updated_at DESC",
                (user_id,)
            )
            rows = await cursor.fetchall()
            chats = []
            for row in rows:
                chat = dict(row)
                # Load messages for each chat
                msg_cursor = await db.execute(
                    "SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
                    (chat["id"],)
                )
                msg_rows = await msg_cursor.fetchall()
                chat["messages"] = [self._row_to_message(dict(m)) for m in msg_rows]
                chats.append(chat)
            return chats
    
    async def create_chat(self, chat_id: str, user_id: str, title: str = "New Chat") -> Dict:
        """Create a new chat session."""
        async with await self._get_db() as db:
            now = datetime.utcnow().isoformat()
            await db.execute(
                "INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (chat_id, user_id, title, now, now)
            )
            await db.commit()
            return {"id": chat_id, "user_id": user_id, "title": title, "created_at": now, "updated_at": now, "messages": []}
    
    async def update_chat(self, chat_id: str, user_id: str, title: str) -> Optional[Dict]:
        """Update a chat's title."""
        async with await self._get_db() as db:
            await db.execute(
                "UPDATE chats SET title = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
                (title, chat_id, user_id)
            )
            await db.commit()
            cursor = await db.execute("SELECT * FROM chats WHERE id = ? AND user_id = ?", (chat_id, user_id))
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    async def delete_chat(self, chat_id: str, user_id: str) -> bool:
        """Delete a chat and all its messages."""
        async with await self._get_db() as db:
            cursor = await db.execute(
                "DELETE FROM chats WHERE id = ? AND user_id = ?",
                (chat_id, user_id)
            )
            await db.commit()
            return cursor.rowcount > 0
    
    # ==================== Message Operations ====================
    
    async def add_message(self, chat_id: str, message: Dict) -> Dict:
        """Add a message to a chat."""
        sources_json = json.dumps(message.get("sources")) if message.get("sources") else None
        
        async with await self._get_db() as db:
            await db.execute("""
                INSERT INTO messages (id, chat_id, role, content, model, complexity, response_time, input_tokens, output_tokens, sources, reaction)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                message["id"],
                chat_id,
                message["role"],
                message["content"],
                message.get("model"),
                message.get("complexity"),
                message.get("responseTime"),
                message.get("usage", {}).get("input_tokens") if message.get("usage") else message.get("input_tokens"),
                message.get("usage", {}).get("output_tokens") if message.get("usage") else message.get("output_tokens"),
                sources_json,
                message.get("reaction")
            ))
            # Update chat's updated_at timestamp
            await db.execute(
                "UPDATE chats SET updated_at = datetime('now') WHERE id = ?",
                (chat_id,)
            )
            await db.commit()
            return message
    
    async def update_message(self, message_id: str, chat_id: str, updates: Dict) -> bool:
        """Update a message's content, reaction, etc."""
        set_clauses = []
        values = []
        
        if "content" in updates:
            set_clauses.append("content = ?")
            values.append(updates["content"])
        if "reaction" in updates:
            set_clauses.append("reaction = ?")
            values.append(updates["reaction"])
        if "model" in updates:
            set_clauses.append("model = ?")
            values.append(updates["model"])
        if "complexity" in updates:
            set_clauses.append("complexity = ?")
            values.append(updates["complexity"])
        if "responseTime" in updates:
            set_clauses.append("response_time = ?")
            values.append(updates["responseTime"])
        if "sources" in updates:
            set_clauses.append("sources = ?")
            values.append(json.dumps(updates["sources"]) if updates["sources"] else None)
        if "usage" in updates and updates["usage"]:
            set_clauses.append("input_tokens = ?")
            values.append(updates["usage"].get("input_tokens"))
            set_clauses.append("output_tokens = ?")
            values.append(updates["usage"].get("output_tokens"))
        
        if not set_clauses:
            return False
        
        values.extend([message_id, chat_id])
        
        async with await self._get_db() as db:
            cursor = await db.execute(
                f"UPDATE messages SET {', '.join(set_clauses)} WHERE id = ? AND chat_id = ?",
                values
            )
            await db.commit()
            return cursor.rowcount > 0
    
    async def delete_messages_after(self, chat_id: str, message_id: str) -> int:
        """Delete all messages in a chat that come after the given message."""
        async with await self._get_db() as db:
            # Get the created_at of the reference message
            cursor = await db.execute(
                "SELECT created_at FROM messages WHERE id = ? AND chat_id = ?",
                (message_id, chat_id)
            )
            row = await cursor.fetchone()
            if not row:
                return 0
            
            ref_time = row["created_at"]
            
            cursor = await db.execute(
                "DELETE FROM messages WHERE chat_id = ? AND created_at > ?",
                (chat_id, ref_time)
            )
            await db.commit()
            return cursor.rowcount
    
    def _row_to_message(self, row: Dict) -> Dict:
        """Convert a DB row to a frontend-compatible message dict."""
        msg = {
            "id": row["id"],
            "role": row["role"],
            "content": row["content"],
        }
        if row.get("model"):
            msg["model"] = row["model"]
        if row.get("complexity"):
            msg["complexity"] = row["complexity"]
        if row.get("response_time") is not None:
            msg["responseTime"] = row["response_time"]
        if row.get("input_tokens") is not None or row.get("output_tokens") is not None:
            msg["usage"] = {
                "input_tokens": row.get("input_tokens", 0),
                "output_tokens": row.get("output_tokens", 0)
            }
        if row.get("sources"):
            try:
                msg["sources"] = json.loads(row["sources"])
            except (json.JSONDecodeError, TypeError):
                msg["sources"] = []
        if row.get("reaction"):
            msg["reaction"] = row["reaction"]
        return msg


# Singleton instance
database = Database()
