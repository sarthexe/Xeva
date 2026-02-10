'use client'

import { useState, useEffect, useCallback } from 'react'
import ChatArea from '@/components/ChatArea'
import Sidebar from '@/components/Sidebar'
import LoginPage from '@/components/LoginPage'
import { useAuth } from '@/contexts/AuthContext'
import * as api from '@/lib/api'

export interface Message {
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

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [chats, setChats] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chatsLoaded, setChatsLoaded] = useState(false)

  const isGuest = user?.id === 'guest'

  // Load chats from API when authenticated (non-guest)
  useEffect(() => {
    if (!isAuthenticated || isGuest) {
      setChatsLoaded(true)
      return
    }

    const loadChats = async () => {
      try {
        const serverChats = await api.getChats()
        const mapped: ChatSession[] = serverChats.map(c => ({
          id: c.id,
          title: c.title,
          messages: c.messages as Message[],
          createdAt: new Date(c.createdAt).getTime()
        }))
        setChats(mapped)
        if (mapped.length > 0) {
          setCurrentChatId(mapped[0].id)
        }
      } catch (err) {
        console.error('Failed to load chats:', err)
      } finally {
        setChatsLoaded(true)
      }
    }

    loadChats()
  }, [isAuthenticated, isGuest])

  // Create initial empty chat once chats are loaded and there are none
  useEffect(() => {
    if (isAuthenticated && chatsLoaded && chats.length === 0 && !currentChatId) {
      handleNewChat()
    }
  }, [isAuthenticated, chatsLoaded])

  const currentChat = chats.find(c => c.id === currentChatId) || chats[0]

  const handleNewChat = useCallback(async () => {
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

    // Persist to API (non-guest)
    if (!isGuest) {
      try {
        await api.createChat(newChat.id, newChat.title)
      } catch (err) {
        console.error('Failed to create chat on server:', err)
      }
    }
  }, [chats, isGuest])

  const handleAddMessage = useCallback((message: Message) => {
    if (!currentChatId) return

    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        // Auto-title the chat based on first user message if title is 'New Chat'
        let title = chat.title
        if (title === 'New Chat' && message.role === 'user') {
          title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')

          // Update title on server
          if (!isGuest) {
            api.updateChat(chat.id, title).catch(err =>
              console.error('Failed to update chat title:', err)
            )
          }
        }
        return { ...chat, title, messages: [...chat.messages, message] }
      }
      return chat
    }))

    // Persist message to API (non-guest)
    if (!isGuest) {
      api.addMessage(currentChatId, message).catch(err =>
        console.error('Failed to save message:', err)
      )
    }
  }, [currentChatId, isGuest])

  const handleUpdateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    if (!currentChatId) return

    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        const updatedMessages = chat.messages.map(msg =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
        return { ...chat, messages: updatedMessages }
      }
      return chat
    }))

    // Persist update to API (non-guest)
    if (!isGuest) {
      api.updateMessage(currentChatId, messageId, updates).catch(err =>
        console.error('Failed to update message:', err)
      )
    }
  }, [currentChatId, isGuest])

  const handleRemoveMessagesAfter = useCallback((messageId: string) => {
    if (!currentChatId) return

    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        const messageIndex = chat.messages.findIndex(m => m.id === messageId)
        if (messageIndex === -1) return chat
        return { ...chat, messages: chat.messages.slice(0, messageIndex + 1) }
      }
      return chat
    }))

    // Persist deletion to API (non-guest)
    if (!isGuest) {
      api.deleteMessagesAfter(currentChatId, messageId).catch(err =>
        console.error('Failed to delete messages after:', err)
      )
    }
  }, [currentChatId, isGuest])

  const handleSwitchChat = useCallback((id: string) => {
    setCurrentChatId(id)
  }, [])

  const handleDeleteChat = useCallback(async (chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId))

    if (currentChatId === chatId) {
      const remaining = chats.filter(c => c.id !== chatId)
      setCurrentChatId(remaining.length > 0 ? remaining[0].id : null)
    }

    // Delete from API (non-guest)
    if (!isGuest) {
      try {
        await api.deleteChat(chatId)
      } catch (err) {
        console.error('Failed to delete chat:', err)
      }
    }
  }, [currentChatId, chats, isGuest])

  // Show loading state
  if (isLoading || (isAuthenticated && !chatsLoaded)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSwitchChat={handleSwitchChat}
        onDeleteChat={handleDeleteChat}
      />

      <div className="flex-1 flex flex-col h-full relative ml-[6.5rem]">
        {currentChat && (
          <ChatArea
            key={currentChat.id} // Force remount on chat switch to reset scroll/input
            messages={currentChat.messages}
            chatTitle={currentChat.title}
            onAddMessage={handleAddMessage}
            onUpdateMessage={handleUpdateMessage}
            onRemoveMessagesAfter={handleRemoveMessagesAfter}
            onNewChat={handleNewChat}
          />
        )}
      </div>
    </div>
  )
}
