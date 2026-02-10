/**
 * API helper for chat persistence.
 * Wraps fetch with JWT auth headers and typed methods.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('xeva_token')
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = getToken()
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(`${API_URL}${path}`, { ...options, headers })
}

// ==================== Chat Operations ====================

export interface ChatFromAPI {
    id: string
    title: string
    createdAt: string
    messages: MessageFromAPI[]
}

export interface MessageFromAPI {
    id: string
    role: 'user' | 'assistant'
    content: string
    model?: string
    complexity?: string
    responseTime?: number
    usage?: { input_tokens: number; output_tokens: number }
    sources?: string[]
    reaction?: 'up' | 'down' | null
}

export async function getChats(): Promise<ChatFromAPI[]> {
    const res = await authFetch('/api/chats')
    if (!res.ok) throw new Error('Failed to load chats')
    return res.json()
}

export async function createChat(id: string, title: string = 'New Chat'): Promise<ChatFromAPI> {
    const res = await authFetch('/api/chats', {
        method: 'POST',
        body: JSON.stringify({ id, title }),
    })
    if (!res.ok) throw new Error('Failed to create chat')
    return res.json()
}

export async function updateChat(chatId: string, title: string): Promise<void> {
    await authFetch(`/api/chats/${chatId}`, {
        method: 'PUT',
        body: JSON.stringify({ title }),
    })
}

export async function deleteChat(chatId: string): Promise<void> {
    await authFetch(`/api/chats/${chatId}`, { method: 'DELETE' })
}

// ==================== Message Operations ====================

export async function addMessage(chatId: string, message: MessageFromAPI): Promise<void> {
    await authFetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify(message),
    })
}

export async function updateMessage(chatId: string, messageId: string, updates: Partial<MessageFromAPI>): Promise<void> {
    await authFetch(`/api/chats/${chatId}/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    })
}

export async function deleteMessagesAfter(chatId: string, afterMessageId: string): Promise<void> {
    await authFetch(`/api/chats/${chatId}/messages/delete-after`, {
        method: 'POST',
        body: JSON.stringify({ after_message_id: afterMessageId }),
    })
}
