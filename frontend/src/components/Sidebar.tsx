'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChatSession } from '@/app/page'
import {
  MessageSquare,
  User,
  Crown,
  History,
  MoreHorizontal,
  Home,
  Settings,
  X,
  Search,
  Gift,
  ChevronDown,
  Menu,
  LogOut
} from 'lucide-react'

import { useTheme } from '@/components/ThemeProvider'
import { useAuth } from '@/contexts/AuthContext'
import SettingsModal from '@/components/SettingsModal'

interface SidebarProps {
  onNewChat: () => void
  chats: ChatSession[]
  currentChatId: string | null
  onSwitchChat: (id: string) => void
}

export default function Sidebar({
  onNewChat,
  chats,
  currentChatId,
  onSwitchChat,
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsDefaultTab, setSettingsDefaultTab] = useState('profile')
  const { toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'G'
  const userName = user?.name || 'Guest'
  const isGuest = user?.id === 'guest'

  const openSettings = (tab: string = 'profile') => {
    setSettingsDefaultTab(tab)
    setShowSettings(true)
    setShowUserMenu(false)
  }

  return (
    <>
      <aside
        className={`
        flex flex-col bg-surface-secondary dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800/50
        transition-[width] ease-in-out z-50 
        ${isExpanded ? 'duration-[800ms]' : 'duration-[400ms]'}
        fixed left-4 top-4 bottom-4 rounded-[2rem] shadow-2xl backdrop-blur-xl
        ${isExpanded ? 'w-80' : 'w-[4.5rem]'}
        overflow-hidden font-sans
      `}
      >
        <div className={`flex flex-col h-full ${isExpanded ? 'px-5 py-6' : 'items-center py-6'} w-full transition-all ${isExpanded ? 'duration-[700ms]' : 'duration-[600ms]'}`}>

          {/* Header: Logo and Close (Only Visible when Expanded) */}
          {isExpanded ? (
            <div className="flex items-center justify-between mb-6 animate-fadeIn">
              <Image
                src="/x.png"
                alt="Xeva Logo"
                width={80}
                height={28}
                className="dark:invert"
              />
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            /* Collapsed Logo/Icon placeholder */
            <div className="mb-6">
              <button
                onClick={() => setIsExpanded(true)}
                className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 dark:text-zinc-400 transition-colors"
              >
                <Menu size={20} />
              </button>
            </div>
          )}

          {/* Navigation Section */}
          <div className={`flex flex-col gap-1 w-full ${!isExpanded && 'items-center gap-4'}`}>
            {/* Home Icon */}
            <NavItem
              icon={<Home size={20} />}
              label="Home"
              isExpanded={isExpanded}
              onClick={onNewChat}
              active={!currentChatId}
            />

            {/* Chat Icon */}
            <NavItem
              icon={<MessageSquare size={20} />}
              label="New Chat"
              isExpanded={isExpanded}
              onClick={onNewChat}
            />

            {/* Fav Models Icon */}
            <NavItem
              icon={<Crown size={20} />}
              label="Fav Models"
              isExpanded={isExpanded}
              onClick={() => { }}
            />

            {/* Profile Icon */}
            <NavItem
              icon={<User size={20} />}
              label="Profile"
              isExpanded={isExpanded}
              onClick={() => openSettings('profile')}
            />

            {/* Settings Icon */}
            <NavItem
              icon={<Settings size={20} />}
              label="Settings"
              isExpanded={isExpanded}
              onClick={() => openSettings('appearance')}
            />
          </div>

          {/* Search and History (Visible only when Expanded) */}
          {isExpanded && (
            <div className="mt-6 flex-1 flex flex-col min-h-0 animate-fadeIn delay-100">
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="text"
                  placeholder="Search conversations"
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all placeholder:text-zinc-400"
                />
              </div>

              {/* History List */}
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                <div className="mb-2 px-1 text-xs font-bold text-zinc-500 uppercase tracking-wider">Today</div>
                <div className="space-y-1">
                  {chats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => onSwitchChat(chat.id)}
                      className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors
                      ${chat.id === currentChatId
                          ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 font-semibold'}
                    `}
                    >
                      {chat.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Spacer for Collapsed State */}
          {!isExpanded && <div className="flex-1" />}

          {/* Bottom User Card */}
          <div className={`mt-auto relative ${isExpanded ? 'animate-fadeIn delay-200' : ''}`}>
            {/* User Menu Dropdown */}
            {showUserMenu && isExpanded && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl animate-fadeIn">
                <button
                  onClick={() => { toggleTheme(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Settings size={16} />
                  <span>Toggle Theme</span>
                </button>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            {isExpanded ? (
              <div
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={userName}
                    className="w-10 h-10 rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                    {userInitial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{userName}</div>
                  <div className="text-xs text-zinc-500 font-semibold truncate">
                    {isGuest ? 'Guest Mode' : user?.email || 'Free Plan'}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            ) : (
              /* Collapsed Avatar */
              <button
                onClick={logout}
                title="Sign Out"
                className="relative group w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold mx-auto transition-transform hover:scale-105"
              >
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={userName}
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  userInitial
                )}
                <div className="absolute inset-0 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

        </div>

      </aside>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        defaultTab={settingsDefaultTab}
      />
    </>
  )
}

function NavItem({
  icon,
  label,
  isExpanded,
  onClick,
  active = false,
  className = ""
}: {
  icon: React.ReactNode,
  label: string,
  isExpanded: boolean,
  onClick: () => void,
  active?: boolean,
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
        ${isExpanded ? 'w-full' : 'w-10 justify-center px-0'}
        ${active
          ? 'bg-amber-100/50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100 font-bold'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold'
        }
        ${className}
      `}
      title={!isExpanded ? label : undefined}
    >
      <div className={`flex-shrink-0 transition-colors ${active ? 'text-amber-700 dark:text-amber-400' : ''}`}>
        {icon}
      </div>

      {isExpanded && (
        <span className="text-sm font-bold whitespace-nowrap animate-fadeIn">
          {label}
        </span>
      )}
    </button>
  )
}

