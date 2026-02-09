'use client'

import { useState, useRef, useEffect } from 'react'
import type { Message } from '@/app/page'
import MessageBubble from './MessageBubble'
import ChatExport from './ChatExport'
import { ArrowUp, Paperclip, Search, Square, Loader2, Check, X, FileText } from 'lucide-react'

interface ChatAreaProps {
  messages: Message[]
  chatTitle: string
  onAddMessage: (message: Message) => void
  onUpdateMessage: (messageId: string, updates: Partial<Message>) => void
  onRemoveMessagesAfter: (messageId: string) => void
  onNewChat: () => void
}

// Track uploaded file status
interface UploadedFile {
  id: string
  name: string
  size: number
  status: 'uploading' | 'ready' | 'error'
  error?: string
  docId?: string
  chunksIndexed?: number
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
  uploadedFiles: UploadedFile[]
  onFileSelect: (files: FileList) => void
  onRemoveFile: (id: string) => void
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

function InputBox({
  centered = false,
  input,
  setInput,
  uploadedFiles,
  onFileSelect,
  onRemoveFile,
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
    // Enter sends, Shift+Enter for new line, Ctrl+Enter also sends
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files)
      e.target.value = '' // Reset so same file can be selected again
    }
  }

  const hasUploadingFiles = uploadedFiles.some(f => f.status === 'uploading')
  const canSubmit = input.trim() && !isLoading && !hasUploadingFiles

  return (
    <div className={centered ? 'w-full max-w-2xl mx-auto px-4' : 'w-full'}>
      {/* File previews with status */}
      {uploadedFiles.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap px-1">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium animate-fadeIn shadow-sm
                ${file.status === 'error'
                  ? 'bg-red-900/30 border border-red-700/50 text-red-300'
                  : file.status === 'ready'
                    ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300'
                    : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-300'
                }
              `}
            >
              {file.status === 'uploading' && <Loader2 size={12} className="animate-spin" />}
              {file.status === 'ready' && <Check size={12} />}
              {file.status === 'error' && <X size={12} />}
              <FileText size={12} />
              <span className="max-w-[100px] truncate">{file.name}</span>
              {file.status === 'ready' && file.chunksIndexed && (
                <span className="text-emerald-400 text-[10px]">({file.chunksIndexed} chunks)</span>
              )}
              <button
                onClick={() => onRemoveFile(file.id)}
                className="text-zinc-400 hover:text-white transition-colors ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="relative group z-20">
        <div className={`
          relative flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 rounded-[32px] py-3 pl-4 pr-4
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
            placeholder={hasUploadingFiles ? "Uploading files..." : "What can I help with?"}
            rows={1}
            disabled={hasUploadingFiles}
            className="w-full bg-transparent resize-none outline-none text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-lg py-1 max-h-[200px] leading-normal disabled:opacity-50"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800/50 rounded-full transition-all duration-200 disabled:opacity-50"
              title="Attach files (PDF, DOCX, Images, Text)"
            >
              <Paperclip size={20} strokeWidth={2} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.gif,.bmp,.webp"
              className="hidden"
              onChange={handleFileChange}
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
                disabled={!canSubmit}
                className={`
                    p-2 rounded-full transition-all duration-200 flex items-center justify-center
                    ${canSubmit
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-200'
                    : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'}
                  `}
              >
                <ArrowUp size={20} strokeWidth={2.5} />
              </button>
            )}

          </div>
        </div>
      </form>
    </div>
  )
}

export default function ChatArea({ messages, chatTitle, onAddMessage, onUpdateMessage, onRemoveMessagesAfter, onNewChat }: ChatAreaProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [prompts, setPrompts] = useState<string[]>([])
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasMessages = messages.length > 0 || isLoading

  useEffect(() => {
    const shuffled = [...RANDOM_PROMPTS].sort(() => 0.5 - Math.random())
    setPrompts(shuffled.slice(0, 3))
  }, [])

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current
      messagesContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    // Immediate scroll on first load/layout change to prevent jump
    if (messages.length === 1 && isLoading) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    } else {
      scrollToBottom()
    }
  }, [messages, isLoading])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // '/' to focus input when not already focused
      if (e.key === '/' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        textareaRef.current?.focus()
      }
      // Escape to clear input
      if (e.key === 'Escape' && document.activeElement === textareaRef.current) {
        setInput('')
        textareaRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle regenerate response
  const handleRegenerate = async (messageId: string) => {
    // Find the message and the user message before it
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex < 1) return

    const userMessage = messages[messageIndex - 1]
    if (userMessage.role !== 'user') return

    setRegeneratingId(messageId)
    setIsLoading(true)

    try {
      // Get history up to but not including the user message
      const history = messages.slice(0, messageIndex - 1).map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history,
          use_rag: false
        })
      })

      const data = await response.json()

      if (response.ok) {
        onUpdateMessage(messageId, {
          content: data.response,
          model: data.model,
          complexity: data.complexity,
          responseTime: data.response_time_ms,
          usage: data.usage,
          sources: data.sources || [],
          reaction: null
        })
      }
    } catch (error) {
      console.error('Regenerate failed:', error)
    }

    setRegeneratingId(null)
    setIsLoading(false)
  }

  // Handle edit user message
  const handleEdit = async (messageId: string, newContent: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    // Update the message content
    onUpdateMessage(messageId, { content: newContent })

    // Remove all messages after this one
    onRemoveMessagesAfter(messageId)

    // Re-submit
    setIsLoading(true)

    try {
      const history = messages.slice(0, messageIndex).map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newContent,
          history,
          use_rag: false
        })
      })

      const data = await response.json()

      if (response.ok) {
        onAddMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: data.response,
          model: data.model,
          complexity: data.complexity,
          responseTime: data.response_time_ms,
          usage: data.usage,
          sources: data.sources || []
        })
      }
    } catch (error) {
      console.error('Edit submission failed:', error)
    }

    setIsLoading(false)
  }

  // Handle reaction
  const handleReaction = (messageId: string, reaction: 'up' | 'down' | null) => {
    onUpdateMessage(messageId, { reaction })
  }

  // Upload file immediately when selected
  const handleFileSelect = async (fileList: FileList) => {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const fileId = `${Date.now()}-${i}`

      // Add to state as uploading
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        status: 'uploading'
      }
      setUploadedFiles(prev => [...prev, newFile])

      // Upload immediately
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name)
        formData.append('source', 'chat-attachment')

        const response = await fetch('http://localhost:8000/api/rag/upload', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const result = await response.json()
          console.log(`[Chat] File ${file.name} ready: ${result.chunks_indexed} chunks`)
          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId ? {
              ...f,
              status: 'ready',
              docId: result.doc_id,
              chunksIndexed: result.chunks_indexed
            } : f
          ))
        } else {
          const error = await response.json()
          console.error(`[Chat] Upload failed for ${file.name}:`, error.detail)
          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'error', error: error.detail } : f
          ))
        }
      } catch (err) {
        console.error(`[Chat] Upload error for ${file.name}:`, err)
        setUploadedFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, status: 'error', error: 'Network error' } : f
        ))
      }
    }
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const hasUploadingFiles = uploadedFiles.some(f => f.status === 'uploading')
    if (!input.trim() || isLoading || hasUploadingFiles) return

    // Get ready files for context
    const readyFiles = uploadedFiles.filter(f => f.status === 'ready')
    const currentInput = input.trim()

    // Get document IDs from uploaded files for filtering
    const docIds = readyFiles.map(f => f.docId).filter(Boolean) as string[]

    // Build user display message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: readyFiles.length > 0
        ? `📎 ${readyFiles.map(f => f.name).join(', ')}\n\n${currentInput}`
        : currentInput
    }

    // Build message for API (include file context info)
    let apiMessage = currentInput
    if (readyFiles.length > 0) {
      const fileInfo = readyFiles.map(f => `[Document: ${f.name}]`).join(', ')
      apiMessage = `Context: User has uploaded these documents: ${fileInfo}. Please use them to answer the following question.\n\nQuestion: ${currentInput}`
    }

    onAddMessage(userMessage)
    setInput('')
    setUploadedFiles([]) // Clear files after sending
    setIsLoading(true)

    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: apiMessage,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          // Only enable RAG if documents were uploaded in this session
          use_rag: docIds.length > 0,
          // Pass document IDs to filter - only search within uploaded docs
          doc_ids: docIds.length > 0 ? docIds : undefined
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
          usage: data.usage,
          sources: data.sources || []
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
                uploadedFiles={uploadedFiles}
                onFileSelect={handleFileSelect}
                onRemoveFile={handleRemoveFile}
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
          {/* Header with export button */}
          <div className="fixed top-0 left-[6.5rem] right-0 z-10 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800/50">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
              <h1 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-md">
                {chatTitle}
              </h1>
              <ChatExport messages={messages} chatTitle={chatTitle} />
            </div>
          </div>

          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto bg-white dark:bg-[#09090b] scroll-smooth relative z-0"
          >
            <div className="max-w-3xl mx-auto px-4 pt-20 pb-32 space-y-6">
              {/* Top padding 10 ensures breathable top space. Bottom padding 40 allows scroll past the floating input */}

              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={regeneratingId === message.id ? { ...message, content: 'Regenerating...' } : message}
                  isLast={index === messages.length - 1}
                  onRegenerate={message.role === 'assistant' ? handleRegenerate : undefined}
                  onEdit={message.role === 'user' ? handleEdit : undefined}
                  onReaction={message.role === 'assistant' ? handleReaction : undefined}
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
          <div className="fixed bottom-6 left-[6.5rem] right-0 z-20 pointer-events-none px-4">
            <div className="max-w-3xl mx-auto pointer-events-auto">
              <InputBox
                input={input}
                setInput={setInput}
                uploadedFiles={uploadedFiles}
                onFileSelect={handleFileSelect}
                onRemoveFile={handleRemoveFile}
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
