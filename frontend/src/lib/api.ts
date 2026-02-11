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

// ==================== Suggestion Operations ====================

export async function suggestTitleAndFollowups(
    message: string,
    response: string
): Promise<{ title: string; followups: string[] }> {
    const res = await fetch(`${API_URL}/api/chat/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, response }),
    })
    if (!res.ok) return { title: message.slice(0, 30), followups: [] }
    return res.json()
}

// ==================== Streaming Chat ====================

export interface ChatStreamRequest {
    message: string
    history?: { role: string; content: string }[]
    use_rag?: boolean
    doc_ids?: string[]
}

export type ChatStreamEvent =
    | { type: 'thinking' }
    | {
        type: 'start'
        model: string
        model_id?: string
        complexity: string
        rag_enabled?: boolean
        sources?: string[]
    }
    | { type: 'content'; text: string }
    | {
        type: 'done'
        response_time_ms: number
        model?: string
        finish_reason?: string
        usage?: { input_tokens: number; output_tokens: number }
    }
    | {
        type: 'suggestions'
        title?: string
        followups?: string[]
    }
    | { type: 'error'; message: string }

function parseSSEEvent(rawEvent: string): ChatStreamEvent | null {
    const lines = rawEvent.split(/\r?\n/)
    const dataLines = lines
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart())

    if (dataLines.length === 0) return null

    const payload = dataLines.join('\n')
    if (!payload) return null
    if (payload === '[DONE]') {
        return { type: 'done', response_time_ms: 0 }
    }

    try {
        return JSON.parse(payload) as ChatStreamEvent
    } catch {
        return null
    }
}

export async function streamChat(
    request: ChatStreamRequest,
    options: {
        onEvent: (event: ChatStreamEvent) => void
        signal?: AbortSignal
    }
): Promise<void> {
    const token = getToken()
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: options.signal,
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Streaming failed (${res.status})`)
    }

    if (!res.body) {
        throw new Error('Streaming response body is missing')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        let boundaryMatch = buffer.match(/\r?\n\r?\n/)
        while (boundaryMatch) {
            const boundaryIndex = boundaryMatch.index ?? -1
            if (boundaryIndex < 0) break

            const rawEvent = buffer.slice(0, boundaryIndex)
            buffer = buffer.slice(boundaryIndex + boundaryMatch[0].length)

            const event = parseSSEEvent(rawEvent)
            if (event) options.onEvent(event)

            boundaryMatch = buffer.match(/\r?\n\r?\n/)
        }
    }

    buffer += decoder.decode()
    const trailingEvent = parseSSEEvent(buffer)
    if (trailingEvent) options.onEvent(trailingEvent)
}
