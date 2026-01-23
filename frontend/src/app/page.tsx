'use client'

import { useState, useEffect } from 'react'
import ChatArea from '@/components/ChatArea'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  complexity?: string
  responseTime?: number
  usage?: { input_tokens: number; output_tokens: number }
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

export default function Home() {
  const [chats, setChats] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)

  // Initialize with one empty chat if none exist
  useEffect(() => {
    if (chats.length === 0 && !currentChatId) {
      handleNewChat()
    }
  }, [])

  const currentChat = chats.find(c => c.id === currentChatId) || chats[0]

  const handleNewChat = () => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
    }
    setChats(prev => [newChat, ...prev])
    setCurrentChatId(newChat.id)
  }

  const handleAddMessage = (message: Message) => {
    if (!currentChatId) return

    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        // Auto-title the chat based on first user message if title is 'New Chat'
        let title = chat.title
        if (title === 'New Chat' && message.role === 'user') {
          title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
        }
        return { ...chat, title, messages: [...chat.messages, message] }
      }
      return chat
    }))
  }

  return (
    <div className="flex h-screen w-screen bg-background transition-colors duration-200 overflow-hidden">

      {currentChat && (
        <ChatArea
          key={currentChat.id} // Force remount on chat switch to reset scroll/input
          messages={currentChat.messages}
          onAddMessage={handleAddMessage}
          onNewChat={handleNewChat}
        />
      )}
    </div>
  )
}
