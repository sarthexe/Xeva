'use client'

import { Message } from '@/app/page'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, FileText, File, Image, FileType } from 'lucide-react'
import { useState } from 'react'

interface MessageBubbleProps {
  message: Message
  isLast?: boolean
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

export default function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isUser) {
    const { files, text } = parseAttachedFiles(message.content)

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
          <p className="text-base text-zinc-900 dark:text-zinc-200 leading-relaxed">
            {text}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col animate-fadeIn space-y-3 mb-4">
      {/* Answer Content - Clean Text */}
      <div className="prose dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => <h1 className="text-xl font-semibold mt-5 mb-3 text-zinc-900 dark:text-zinc-100 underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mt-4 mb-2 text-zinc-900 dark:text-zinc-100 underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-base font-semibold mt-3 mb-2 text-zinc-900 dark:text-zinc-100" {...props} />,
            p: ({ node, ...props }) => <p className="mb-3 text-[15px] text-zinc-700 dark:text-zinc-300 leading-[1.7]" {...props} />,
            strong: ({ node, ...props }) => <strong className="font-semibold text-zinc-900 dark:text-zinc-100" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-zinc-700 dark:text-zinc-300" {...props} />,
            li: ({ node, ...props }) => <li className="text-[15px] leading-[1.7]" {...props} />,
            a: ({ node, ...props }) => <a className="text-blue-600 dark:text-zinc-400 hover:text-blue-800 dark:hover:text-zinc-200 underline decoration-blue-300 dark:decoration-zinc-600 underline-offset-2" {...props} />,
            code({ node, inline, className, children, ...props }: any) {
              return !inline ? (
                <div className="my-3 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0a0a0a]">
                  <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500 font-mono">code</span>
                    <button onClick={handleCopy} className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition-colors">
                      <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto text-sm text-zinc-800 dark:text-zinc-300 font-mono leading-relaxed">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              ) : (
                <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono text-zinc-800 dark:text-zinc-200" {...props}>
                  {children}
                </code>
              )
            }
          }}
        >
          {message.content}
        </ReactMarkdown>
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
