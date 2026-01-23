'use client'

import { ChatSession } from '@/app/page'
import { useTheme } from '@/components/ThemeProvider'
import { MessageSquare, Moon, Sun, Edit2, Plus } from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onNewChat: () => void
  chats: ChatSession[]
  currentChatId: string | null
  onSwitchChat: (id: string) => void
  onRenameChat: (id: string, newTitle: string) => void
}

export default function Sidebar({ 
  isOpen, 
  onClose, 
  onNewChat, 
  chats, 
  currentChatId, 
  onSwitchChat,
  onRenameChat 
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const startEditing = (chat: ChatSession) => {
    setEditingId(chat.id)
    setEditTitle(chat.title)
  }

  const saveTitle = () => {
    if (editingId && editTitle.trim()) {
      onRenameChat(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-surface-secondary dark:bg-surface-tertiary border-r border-border dark:border-border
          flex flex-col
          transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Area */}
        <div className="p-4 pt-6">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-surface-secondary border border-border dark:border-border flex items-center justify-center shadow-subtle">
                <img
                  src="/Logo_transparent.svg"
                  alt="Neolytix logo"
                  className="w-5 h-5 object-contain"
                />
              </div>
              <span className="text-xl font-serif text-gray-800 dark:text-gray-100 tracking-tight">Neolytix</span>
            </div>
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          
          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="w-full group flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-secondary border border-border dark:border-border hover:border-primary/50 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg shadow-subtle hover:shadow-card transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <Plus className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
              <span className="font-medium text-sm">New chat</span>
            </div>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 px-3 py-2 overflow-y-auto">
          <div className="text-xs font-medium text-gray-400 px-3 mb-2 uppercase tracking-wider">Recents</div>
          <div className="flex flex-col gap-0.5">
            {chats.map(chat => (
              <div 
                key={chat.id}
                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                  ${chat.id === currentChatId 
                    ? 'bg-white dark:bg-surface-secondary shadow-sm text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
                onClick={() => onSwitchChat(chat.id)}
              >
                <MessageSquare size={16} className="opacity-50 flex-shrink-0" />
                
                {editingId === chat.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                    className="flex-1 bg-transparent border-none outline-none text-sm p-0 focus:ring-0"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 text-sm truncate">{chat.title}</span>
                )}

                {/* Edit Button (visible on hover) */}
                {editingId !== chat.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing(chat)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-opacity"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-border dark:border-border bg-surface-secondary dark:bg-surface-tertiary">
          <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white dark:hover:bg-surface-secondary hover:shadow-subtle transition-all duration-200 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-light to-white border border-primary/20 flex items-center justify-center text-primary font-medium text-sm">
              NU
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">Neolytix User</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Pro Plan</div>
            </div>
          </button>
        </div>
      </aside>
    </>
  )
}
