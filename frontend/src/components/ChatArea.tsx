'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/app/page'
import MessageBubble from './MessageBubble'
import { ArrowUp, Paperclip, Settings, Moon, Sun, Search, Square, Home } from 'lucide-react'
import { useTheme } from './ThemeProvider'

interface ChatAreaProps {
  messages: Message[]
  onAddMessage: (message: Message) => void
  onNewChat: () => void
}

const RANDOM_PROMPTS = [
  "Explain quantum computing like I'm 5",
  "Write a python script to scrape data",
  "Analyze the latest market trends",
  "Debug this React component",
  "Write a haiku about artificial intelligence",
  "Summarize this long article",
  "Create a workout plan for beginners",
  "Explain the theory of relativity",
  "Write a SQL query for user retention",
  "Draft a professional email"
]

// Input Box Component
interface InputBoxProps {
  centered?: boolean
  input: string
  setInput: (value: string) => void
  files: File[]
  setFiles: React.Dispatch<React.SetStateAction<File[]>>
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

function InputBox({
  centered = false,
  input,
  setInput,
  files,
  setFiles,
  isLoading,
  onSubmit,
  textareaRef,
  fileInputRef
}: InputBoxProps) {

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className={centered ? 'w-full max-w-2xl mx-auto px-4' : 'w-full'}>
      {/* File previews with glass effect */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap px-1">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 backdrop-blur-md border border-zinc-700/50 rounded-lg text-xs font-medium text-zinc-300 animate-fadeIn shadow-sm">
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button onClick={() => removeFile(i)} className="text-zinc-400 hover:text-white transition-colors">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="relative group z-20">
        <div className={`
          relative flex items-center gap-3 bg-zinc-100 dark:bg-[#1e1e1e] rounded-[32px] py-3 pl-4 pr-4
          transition-all duration-300 ease-out border border-zinc-200 dark:border-zinc-800/60 focus-within:border-zinc-400 dark:focus-within:border-zinc-700
          ${centered ? 'shadow-xl shadow-black/10 dark:shadow-black/40' : 'shadow-lg'}
        `}>
          {/* Search Icon Left */}
          <div className="text-zinc-500 dark:text-zinc-400">
            <Search size={20} />
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="What can I help with?"
            rows={1}
            className="w-full bg-transparent resize-none outline-none text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-lg py-1 max-h-[200px] leading-normal"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800/50 rounded-full transition-all duration-200"
              title="Attach files"
            >
              <Paperclip size={20} strokeWidth={2} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {isLoading ? (
              <button
                type="button"
                disabled
                className="p-2 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
              >
                <Square size={20} fill="currentColor" strokeWidth={0} className="animate-pulse" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className={`
                    p-2 rounded-full transition-all duration-200 flex items-center justify-center
                    ${input.trim()
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-200'
                    : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'}
                  `}
              >
                {input.trim() ? <ArrowUp size={20} strokeWidth={2.5} /> : <ArrowUp size={20} strokeWidth={2.5} />}
              </button>
            )}

          </div>
        </div>
      </form>
    </div>
  )
}

export default function ChatArea({ messages, onAddMessage, onNewChat }: ChatAreaProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [prompts, setPrompts] = useState<string[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme, toggleTheme } = useTheme()

  const hasMessages = messages.length > 0 || isLoading

  useEffect(() => {
    const shuffled = [...RANDOM_PROMPTS].sort(() => 0.5 - Math.random())
    setPrompts(shuffled.slice(0, 3))
  }, [])

  // Removed auto-scroll to prevent content from being pushed above viewport

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    onAddMessage(userMessage)
    setInput('')
    setFiles([])
    setIsLoading(true)

    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      const data = await response.json()

      if (response.ok) {
        onAddMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          model: data.model,
          complexity: data.complexity,
          responseTime: data.response_time_ms,
          usage: data.usage
        })
      } else {
        onAddMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${data.detail || 'Something went wrong.'}`,
        })
      }
    } catch {
      onAddMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Unable to connect to server.',
      })
    }

    setIsLoading(false)
  }

  return (
    <main className="h-full w-full flex flex-col bg-white dark:bg-[#09090b] relative font-sans text-zinc-900 dark:text-zinc-200 overflow-hidden">

      {/* Background Glow (Subtle) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/5 blur-[120px] pointer-events-none" />

      {/* Header - Fixed to viewport */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-sm">
        {/* Home Icon - Left */}
        <button
          onClick={onNewChat}
          className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-200"
          title="New Chat"
        >
          <Home size={20} />
        </button>

        <div className="relative">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-200"
          >
            <Settings size={20} />
          </button>

          {settingsOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-fadeIn backdrop-blur-xl">
              <div className="p-2 space-y-1">
                <div className="px-3 py-2 text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Appearance</div>
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {!hasMessages ? (
        /* CENTERED LAYOUT - Ask a question */
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <div className="w-full max-w-2xl flex flex-col items-center animate-fadeIn gap-10">

            <h2 className="text-5xl md:text-6xl font-medium text-zinc-900 dark:text-white tracking-tighter text-center leading-tight drop-shadow-sm">
              {(() => {
                const hour = new Date().getHours();
                if (hour >= 5 && hour < 12) return 'good morning.';
                if (hour >= 12 && hour < 17) return 'good afternoon.';
                if (hour >= 17 && hour < 22) return 'good evening.';
                return 'good late evening.';
              })()}
            </h2>

            {/* Centered Input Box */}
            <div className="w-full transform transition-all hover:scale-[1.01] duration-500">
              <InputBox
                centered
                input={input}
                setInput={setInput}
                files={files}
                setFiles={setFiles}
                isLoading={isLoading}
                onSubmit={handleSubmit}
                textareaRef={textareaRef}
                fileInputRef={fileInputRef}
              />
            </div>

            {/* Random Floating Prompts */}
            <div className="flex flex-wrap justify-center gap-3 max-w-xl">
              {prompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="
                      px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 
                      hover:border-zinc-300 dark:hover:border-zinc-600 
                      text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-sm transition-all duration-300 
                      hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5
                      animate-float
                    "
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* CONVERSATION LAYOUT */
        <>
          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#09090b] scroll-smooth relative z-0">
            <div className="max-w-3xl mx-auto px-4 pt-20 pb-32 space-y-6">
              {/* Top padding 10 ensures breathable top space. Bottom padding 40 allows scroll past the floating input */}

              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                />
              ))}

              {isLoading && (
                <div className="py-0">
                  <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin"></div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

          {/* Bottom Input Area - Floating */}
          <div className="fixed bottom-6 left-0 right-0 z-20 pointer-events-none px-4">
            <div className="max-w-3xl mx-auto pointer-events-auto">
              <InputBox
                input={input}
                setInput={setInput}
                files={files}
                setFiles={setFiles}
                isLoading={isLoading}
                onSubmit={handleSubmit}
                textareaRef={textareaRef}
                fileInputRef={fileInputRef}
              />
            </div>
          </div>
        </>
      )}
    </main>
  )
}