'use client'

import type { Message } from '@/app/page'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, FileText, File, Image, FileType, ThumbsUp, ThumbsDown, RefreshCw, Pencil, Check, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useToast } from './Toast'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MessageBubbleProps {
  message: Message
  isLast?: boolean
  onRegenerate?: (messageId: string) => void
  onEdit?: (messageId: string, newContent: string) => void
  onReaction?: (messageId: string, reaction: 'up' | 'down' | null) => void
}

// Helper to parse attached files from message content
function parseAttachedFiles(content: string): { files: string[], text: string } {
  const filePattern = /📎\s*([^\n]+)\n\n/
  const match = content.match(filePattern)

  if (match) {
    const fileNames = match[1].split(',').map(f => f.trim())
    const text = content.replace(filePattern, '')
    return { files: fileNames, text }
  }

  return { files: [], text: content }
}

// Get file icon based on extension
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const iconClass = "w-4 h-4"

  if (['pdf'].includes(ext)) return <FileText className={`${iconClass} text-red-400`} />
  if (['docx', 'doc'].includes(ext)) return <FileType className={`${iconClass} text-blue-400`} />
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return <Image className={`${iconClass} text-emerald-400`} />
  return <File className={`${iconClass} text-zinc-400`} />
}

// Get file type color classes
function getFileTypeColors(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  if (['pdf'].includes(ext)) return 'from-red-500/20 to-red-600/10 border-red-500/30 hover:border-red-400/50'
  if (['docx', 'doc'].includes(ext)) return 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-400/50'
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-400/50'
  return 'from-zinc-500/20 to-zinc-600/10 border-zinc-500/30 hover:border-zinc-400/50'
}

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()

  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''

  const handleCodeCopy = () => {
    // Get text content from children (which is the code string)
    const code = String(children).replace(/\n$/, '')
    navigator.clipboard.writeText(code)
    setCopied(true)
    showToast('Code copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  if (inline) {
    return (
      <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono text-zinc-800 dark:text-zinc-200" {...props}>
        {children}
      </code>
    )
  }

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#1e1e1e] group/code w-full shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-[#252526] border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-xs text-zinc-500 font-mono">
          {language || 'text'}
        </span>
        <button
          onClick={handleCodeCopy}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
          title="Copy code"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="relative w-full text-sm">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.9rem',
            lineHeight: '1.5',
          }}
          codeTagProps={{
            style: {
              fontFamily: "'JetBrains Mono', monospace",
            }
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

export default function MessageBubble({ message, isLast, onRegenerate, onEdit, onReaction }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const { showToast } = useToast()

  // Auto-resize edit textarea
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.style.height = 'auto'
      editTextareaRef.current.style.height = editTextareaRef.current.scrollHeight + 'px'
      editTextareaRef.current.focus()
    }
  }, [isEditing, editContent])

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    showToast('Copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartEdit = () => {
    const { text } = parseAttachedFiles(message.content)
    setEditContent(text)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(message.id, editContent.trim())
    }
    setIsEditing(false)
    setEditContent('')
  }

  const handleReaction = (reaction: 'up' | 'down') => {
    if (!onReaction) return
    // Toggle off if same reaction clicked
    if (message.reaction === reaction) {
      onReaction(message.id, null)
    } else {
      onReaction(message.id, reaction)
    }
  }

  if (isUser) {
    const { files, text } = parseAttachedFiles(message.content)

    // Edit mode
    if (isEditing) {
      return (
        <div className="flex items-start gap-3 animate-fadeIn mb-2">
          <div className="w-7 h-7 rounded-full bg-[#8b6d5c] flex items-center justify-center flex-shrink-0 text-white font-medium text-xs">
            S
          </div>
          <div className="flex-1 space-y-3">
            {/* Attached Documents Display */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((fileName, index) => (
                  <div
                    key={index}
                    className={`
                      group flex items-center gap-2.5 px-3 py-2 rounded-xl
                      bg-gradient-to-br ${getFileTypeColors(fileName)}
                      border backdrop-blur-sm opacity-60
                    `}
                  >
                    <div className="p-1.5 rounded-lg bg-black/10 backdrop-blur-sm">
                      {getFileIcon(fileName)}
                    </div>
                    <span className="text-sm font-medium text-zinc-100 truncate max-w-[180px]">
                      {fileName}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Edit Textarea */}
            <div className="space-y-2">
              <textarea
                ref={editTextareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleSaveEdit()
                  }
                  if (e.key === 'Escape') {
                    handleCancelEdit()
                  }
                }}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 
                  rounded-xl px-4 py-3 text-base text-zinc-900 dark:text-zinc-200 
                  focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500
                  resize-none min-h-[60px] transition-all"
                placeholder="Edit your message..."
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 
                    transition-colors flex items-center gap-1.5"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                  className="px-4 py-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg 
                    transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={14} />
                  Save & Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="group flex items-start gap-3 animate-fadeIn mb-2">
        <div className="w-7 h-7 rounded-full bg-[#8b6d5c] flex items-center justify-center flex-shrink-0 text-white font-medium text-xs">
          S
        </div>
        <div className="flex-1 space-y-3">
          {/* Attached Documents Display */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((fileName, index) => (
                <div
                  key={index}
                  className={`
                    group flex items-center gap-2.5 px-3 py-2 rounded-xl
                    bg-gradient-to-br ${getFileTypeColors(fileName)}
                    border backdrop-blur-sm
                    transition-all duration-300 ease-out
                    hover:scale-[1.02] hover:shadow-lg hover:shadow-black/10
                  `}
                >
                  <div className="p-1.5 rounded-lg bg-black/10 backdrop-blur-sm">
                    {getFileIcon(fileName)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-100 truncate max-w-[180px]">
                      {fileName}
                    </span>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                      {fileName.split('.').pop()} document
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Text Content */}
          <div className="flex items-start gap-2">
            <p className="text-base text-zinc-900 dark:text-zinc-200 leading-relaxed flex-1">
              {text}
            </p>

            {/* Edit button - appears on hover */}
            {onEdit && (
              <button
                onClick={handleStartEdit}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-zinc-600 
                  dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg 
                  transition-all duration-200"
                title="Edit message"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="group flex flex-col animate-fadeIn space-y-3 mb-4">
      {/* Answer Content - Clean Text */}
      <div className="prose dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-zinc-900 dark:text-zinc-100 tracking-tight" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-5 mb-3 text-zinc-900 dark:text-zinc-100 tracking-tight" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-zinc-900 dark:text-zinc-100" {...props} />,
            p: ({ node, ...props }) => <div className="mb-4 text-[15px] text-zinc-700 dark:text-zinc-300 leading-relaxed" {...props} />,
            strong: ({ node, ...props }) => <strong className="font-semibold text-zinc-900 dark:text-zinc-100" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1.5 text-zinc-700 dark:text-zinc-300 marker:text-zinc-400" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-zinc-700 dark:text-zinc-300 marker:text-zinc-400" {...props} />,
            li: ({ node, ...props }) => <li className="pl-1 text-[15px] leading-relaxed" {...props} />,
            a: ({ node, ...props }) => <a className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 underline decoration-violet-300 dark:decoration-violet-700/50 underline-offset-2 transition-colors font-medium" {...props} />,
            blockquote: ({ node, ...props }) => (
              <blockquote className="my-4 pl-4 border-l-4 border-violet-500/50 italic text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 py-2 pr-4 rounded-r-lg" {...props} />
            ),
            table: ({ node, ...props }) => (
              <div className="my-5 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <table className="w-full text-sm text-left border-collapse" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 font-semibold border-b border-zinc-200 dark:border-zinc-800" {...props} />,
            tbody: ({ node, ...props }) => <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950/50" {...props} />,
            tr: ({ node, ...props }) => <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors" {...props} />,
            th: ({ node, ...props }) => <th className="px-4 py-3 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap" {...props} />,
            td: ({ node, ...props }) => <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap" {...props} />,
            code: CodeBlock
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      {/* Actions Bar - appears on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Reactions */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            onClick={() => handleReaction('up')}
            className={`p-1.5 rounded-lg transition-all duration-200 ${message.reaction === 'up'
              ? 'bg-emerald-500/20 text-emerald-500'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            title="Good response"
          >
            <ThumbsUp size={14} fill={message.reaction === 'up' ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => handleReaction('down')}
            className={`p-1.5 rounded-lg transition-all duration-200 ${message.reaction === 'down'
              ? 'bg-red-500/20 text-red-500'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            title="Poor response"
          >
            <ThumbsDown size={14} fill={message.reaction === 'down' ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />

        {/* Copy */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 
            dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
          title="Copy response"
        >
          <Copy size={14} />
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>

        {/* Regenerate */}
        {onRegenerate && (
          <button
            onClick={() => onRegenerate(message.id)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 
              dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
            title="Regenerate response"
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        )}
      </div>

      {/* Sources Section - Beautiful Card Design */}
      {message.sources && message.sources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/10">
              <FileText className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Sources Referenced
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {message.sources.map((source, index) => (
              <div
                key={index}
                className="
                  group flex items-center gap-2 px-3 py-2 rounded-xl
                  bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10
                  border border-violet-500/20 hover:border-violet-400/40
                  backdrop-blur-sm
                  transition-all duration-300 ease-out
                  hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/10
                "
              >
                <div className="p-1 rounded-md bg-violet-500/20">
                  {getFileIcon(source)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-200 truncate max-w-[200px]">
                    {source}
                  </span>
                  <span className="text-[10px] text-violet-400/70 uppercase tracking-wider">
                    Referenced Document
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
