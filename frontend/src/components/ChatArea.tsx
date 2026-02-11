'use client'

import { useState, useRef, useEffect } from 'react'
import type { Message } from '@/app/page'
import MessageBubble from './MessageBubble'
import ChatExport from './ChatExport'
import { ArrowUp, Paperclip, Search, Square, Loader2, Check, X, FileText, Repeat, CornerDownRight, Plus } from 'lucide-react'
import * as api from '@/lib/api'

interface ChatAreaProps {
  messages: Message[]
  chatId: string
  chatTitle: string
  onAddMessage: (message: Message) => void
  onUpdateMessage: (messageId: string, updates: Partial<Message>, options?: { persist?: boolean }) => void
  onRemoveMessagesAfter: (messageId: string) => void
  onUpdateTitle: (title: string) => void
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

const DEFAULT_FOLLOWUPS = [
  "Can you explain that more simply?",
  "What are the key takeaways?",
  "What should I do next?"
]

function getTopicFromQuestion(question: string): string {
  const cleaned = question
    .replace(/^Context:\s*User has uploaded[\s\S]*?Question:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return 'this topic'

  const words = cleaned.split(' ')
  return words.slice(0, 8).join(' ')
}

function buildFallbackFollowups(question: string): string[] {
  const q = question.toLowerCase()
  const topic = getTopicFromQuestion(question)

  if (q.includes('code') || q.includes('bug') || q.includes('error') || q.includes('debug')) {
    return [
      `Can you break ${topic} into implementation steps?`,
      `Can you show a minimal example for ${topic}?`,
      `What edge cases should I test for ${topic}?`
    ]
  }

  if (q.includes('write') || q.includes('draft') || q.includes('email')) {
    return [
      `Can you rewrite ${topic} in a shorter tone?`,
      `Can you create 3 alternatives for ${topic}?`,
      `What style works best for ${topic}?`
    ]
  }

  return DEFAULT_FOLLOWUPS.map((template, index) => {
    if (index === 0) return `Can you go deeper into ${topic}?`
    if (index === 1) return `What should I do next for ${topic}?`
    return `What tradeoffs should I consider for ${topic}?`
  })
}

// Input Box Component
interface InputBoxProps {
  centered?: boolean
  input: string
  setInput: (value: string) => void
  uploadedFiles: UploadedFile[]
  onFileSelect: (files: FileList) => void
  onRemoveFile: (id: string) => void
  isLoading: boolean
  onStop?: () => void
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
  onStop,
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
                onClick={onStop}
                className="p-2 text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                title="Stop generation"
              >
                <Square size={20} fill="currentColor" strokeWidth={0} />
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

export default function ChatArea({ messages, chatId, chatTitle, onAddMessage, onUpdateMessage, onRemoveMessagesAfter, onUpdateTitle, onNewChat }: ChatAreaProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [prompts, setPrompts] = useState<string[]>([])
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamAbortRef = useRef<AbortController | null>(null)

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

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort()
    }
  }, [])

  const toHistory = (items: Message[]) => items.map(m => ({ role: m.role, content: m.content }))

  const stopStreaming = () => {
    streamAbortRef.current?.abort()
  }

  const applySuggestions = (question: string, response: string, canUpdateTitle: boolean) => {
    api.suggestTitleAndFollowups(question, response)
      .then(({ title, followups }) => {
        const cleaned = (followups || [])
          .map(q => q.trim())
          .filter(Boolean)
          .slice(0, 3)

        if (canUpdateTitle && chatTitle === 'New Chat' && title) {
          onUpdateTitle(title)
        }

        if (cleaned.length > 0) {
          setFollowupQuestions(cleaned)
          return
        }

        setFollowupQuestions(buildFallbackFollowups(question))
      })
      .catch(err => {
        console.error('Suggest failed:', err)
        setFollowupQuestions(buildFallbackFollowups(question))
      })
  }

  const applyStreamOrFallbackSuggestions = (
    result: { title?: string; followups: string[]; content: string },
    question: string,
    canUpdateTitle: boolean
  ) => {
    if (canUpdateTitle && chatTitle === 'New Chat' && result.title) {
      onUpdateTitle(result.title)
    }

    if (result.followups.length > 0) {
      setFollowupQuestions(result.followups)
      return
    }

    applySuggestions(question, result.content, canUpdateTitle)
  }

  const streamAssistantResponse = async ({
    assistantMessageId,
    message,
    history,
    useRag,
    docIds,
    resetReaction = false
  }: {
    assistantMessageId: string
    message: string
    history: { role: 'user' | 'assistant'; content: string }[]
    useRag: boolean
    docIds?: string[]
    resetReaction?: boolean
  }): Promise<{
    content: string
    aborted: boolean
    failed: boolean
    title?: string
    followups: string[]
  }> => {
    setIsLoading(true)

    const controller = new AbortController()
    streamAbortRef.current = controller

    const startedAt = Date.now()
    let content = ''
    let model: string | undefined
    let complexity: string | undefined
    let sources: string[] = []
    let usage: { input_tokens: number; output_tokens: number } | undefined
    let responseTime = 0
    let finishReason: string | undefined
    let suggestionTitle: string | undefined
    let suggestionFollowups: string[] = []
    let streamError: string | null = null
    let aborted = false

    onUpdateMessage(
      assistantMessageId,
      {
        content: '',
        model: undefined,
        complexity: undefined,
        responseTime: undefined,
        usage: undefined,
        sources: [],
        reaction: resetReaction ? null : undefined
      },
      { persist: false }
    )

    try {
      await api.streamChat(
        {
          message,
          history,
          use_rag: useRag,
          doc_ids: docIds && docIds.length > 0 ? docIds : undefined
        },
        {
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === 'start') {
              model = event.model
              complexity = event.complexity
              sources = event.sources || []
              onUpdateMessage(
                assistantMessageId,
                {
                  model,
                  complexity,
                  sources
                },
                { persist: false }
              )
              return
            }

            if (event.type === 'content') {
              content += event.text
              onUpdateMessage(assistantMessageId, { content }, { persist: false })
              return
            }

            if (event.type === 'done') {
              responseTime = event.response_time_ms || 0
              if (event.model) model = event.model
              if (event.finish_reason) finishReason = event.finish_reason
              if (event.usage) usage = event.usage
              return
            }

            if (event.type === 'error') {
              streamError = event.message
              return
            }

            if (event.type === 'suggestions') {
              suggestionTitle = event.title
              suggestionFollowups = (event.followups || [])
                .map(q => q.trim())
                .filter(Boolean)
                .slice(0, 3)
            }
          }
        }
      )
    } catch (error) {
      aborted = error instanceof DOMException && error.name === 'AbortError'
      if (!aborted) {
        streamError = error instanceof Error ? error.message : 'Streaming failed'
      }
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null
      }
    }

    let finalContent = content
    if (!finalContent) {
      if (aborted) {
        finalContent = 'Generation stopped.'
      } else if (streamError) {
        finalContent = `Error: ${streamError}`
      } else if (finishReason === 'content_filter') {
        finalContent = "I'm unable to help with that request."
      } else if (finishReason === 'length') {
        finalContent = '[Response truncated due to length limit]'
      } else {
        finalContent = 'No response generated.'
      }
    }
    const finalResponseTime = responseTime || (Date.now() - startedAt)

    onUpdateMessage(
      assistantMessageId,
      {
        content: finalContent,
        model,
        complexity,
        responseTime: finalResponseTime,
        usage,
        sources,
        ...(resetReaction ? { reaction: null } : {})
      }
    )

    setIsLoading(false)

    return {
      content: finalContent,
      aborted,
      failed: !aborted && !!streamError,
      title: suggestionTitle,
      followups: suggestionFollowups
    }
  }

  // Handle regenerate response
  const handleRegenerate = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex < 1) return

    const userMessage = messages[messageIndex - 1]
    if (userMessage.role !== 'user') return

    const result = await streamAssistantResponse({
      assistantMessageId: messageId,
      message: userMessage.content,
      history: toHistory(messages.slice(0, messageIndex - 1)),
      useRag: false,
      resetReaction: true
    })

    if (!result.aborted && !result.failed && messageIndex === messages.length - 1) {
      applyStreamOrFallbackSuggestions(result, userMessage.content, true)
    }
  }

  // Handle edit user message
  const handleEdit = async (messageId: string, newContent: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    onUpdateMessage(messageId, { content: newContent })
    onRemoveMessagesAfter(messageId)
    setFollowupQuestions([])

    const assistantMessageId = (Date.now() + 1).toString()
    onAddMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: ''
    })

    const result = await streamAssistantResponse({
      assistantMessageId,
      message: newContent,
      history: toHistory(messages.slice(0, messageIndex)),
      useRag: false
    })

    if (!result.aborted && !result.failed) {
      applyStreamOrFallbackSuggestions(result, newContent, true)
    }
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

        const response = await fetch(`${API_URL}/api/rag/upload`, {
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
    setFollowupQuestions([]) // Clear follow-ups when sending new message

    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const assistantMessageId = (Date.now() + 1).toString()
    onAddMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: ''
    })

    const result = await streamAssistantResponse({
      assistantMessageId,
      message: apiMessage,
      history: toHistory(messages),
      useRag: docIds.length > 0,
      docIds
    })

    if (!result.aborted && !result.failed) {
      applyStreamOrFallbackSuggestions(result, currentInput, true)
    }
  }

  // Handle follow-up chip click
  const handleFollowupClick = async (question: string) => {
    if (isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question
    }
    onAddMessage(userMessage)
    setInput('')
    setFollowupQuestions([])

    const assistantMessageId = (Date.now() + 1).toString()
    onAddMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: ''
    })

    const result = await streamAssistantResponse({
      assistantMessageId,
      message: question,
      history: toHistory(messages),
      useRag: false
    })

    if (!result.aborted && !result.failed) {
      applyStreamOrFallbackSuggestions(result, question, false)
    }
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
                onStop={stopStreaming}
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
                  message={message}
                  isLast={index === messages.length - 1}
                  onRegenerate={message.role === 'assistant' ? handleRegenerate : undefined}
                  onEdit={message.role === 'user' ? handleEdit : undefined}
                  onReaction={message.role === 'assistant' ? handleReaction : undefined}
                />
              ))}

              {/* Follow-up / Related Questions */}
              {followupQuestions.length > 0 && !isLoading && (
                <div className="w-full max-w-3xl mx-auto mt-8 mb-4 animate-fadeIn px-1">
                  <div className="flex items-center gap-2 mb-3 text-zinc-500 dark:text-zinc-400 ml-1">
                    <Repeat size={18} />
                    <span className="font-medium text-lg">Related</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {followupQuestions.map((question, i) => (
                      <button
                        key={i}
                        onClick={() => handleFollowupClick(question)}
                        className="
                          group flex items-center justify-between w-full py-3 px-4
                          bg-transparent
                          hover:bg-zinc-100 dark:hover:bg-zinc-800/50
                          border-t border-zinc-200 dark:border-zinc-800
                          first:border-t-0
                          transition-all duration-200 text-left
                        "
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <CornerDownRight size={16} className="shrink-0 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                          <span className="text-zinc-700 dark:text-zinc-300 font-medium text-base truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                            {question}
                          </span>
                        </div>
                        <Plus size={18} className="shrink-0 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors ml-4" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                onStop={stopStreaming}
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
