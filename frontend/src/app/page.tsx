'use client'

import { useState, useEffect } from 'react'
import ChatArea from '@/components/ChatArea'
import Sidebar from '@/components/Sidebar'

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
    // Prevent creating multiple empty chats
    const emptyChat = chats.find(c => c.messages.length === 0)
    if (emptyChat) {
      setCurrentChatId(emptyChat.id)
      return
    }

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

  const handleSwitchChat = (id: string) => {
    setCurrentChatId(id)
  }

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSwitchChat={handleSwitchChat}
      />

      <div className="flex-1 flex flex-col h-full relative ml-[6.5rem]">
        {currentChat && (
          <ChatArea
            key={currentChat.id} // Force remount on chat switch to reset scroll/input
            messages={currentChat.messages}
            onAddMessage={handleAddMessage}
            onNewChat={handleNewChat}
          />
        )}
      </div>
    </div>
  )
}
