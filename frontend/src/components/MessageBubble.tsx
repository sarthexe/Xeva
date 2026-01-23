'use client'

import { Message } from '@/app/page'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy } from 'lucide-react'
import { useState } from 'react'

interface MessageBubbleProps {
  message: Message
  isLast?: boolean
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
    return (
      <div className="flex items-start gap-3 animate-fadeIn mb-2">
        <div className="w-7 h-7 rounded-full bg-[#8b6d5c] flex items-center justify-center flex-shrink-0 text-white font-medium text-xs">
          S
        </div>
        <p className="text-base text-zinc-900 dark:text-zinc-200 leading-relaxed pt-0.5">
          {message.content}
        </p>
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
    </div>
  )
}
