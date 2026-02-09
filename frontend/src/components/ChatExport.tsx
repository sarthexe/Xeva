'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileJson, FileText, X } from 'lucide-react'
import { Message } from '@/app/page'

interface ChatExportProps {
    messages: Message[]
    chatTitle: string
}

export default function ChatExport({ messages, chatTitle }: ChatExportProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const formatDate = () => {
        return new Date().toISOString().split('T')[0]
    }

    const sanitizeFilename = (name: string) => {
        return name.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50)
    }

    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setIsOpen(false)
    }

    const exportAsMarkdown = () => {
        let markdown = `# ${chatTitle}\n\n`
        markdown += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`

        messages.forEach((msg) => {
            if (msg.role === 'user') {
                markdown += `## 👤 You\n\n${msg.content}\n\n`
            } else {
                markdown += `## 🤖 Assistant`
                if (msg.model) {
                    markdown += ` *(${msg.model})*`
                }
                markdown += `\n\n${msg.content}\n\n`

                if (msg.sources && msg.sources.length > 0) {
                    markdown += `**Sources:** ${msg.sources.join(', ')}\n\n`
                }
            }
            markdown += `---\n\n`
        })

        const filename = `${sanitizeFilename(chatTitle)}_${formatDate()}.md`
        downloadFile(markdown, filename, 'text/markdown')
    }

    const exportAsJSON = () => {
        const exportData = {
            title: chatTitle,
            exportedAt: new Date().toISOString(),
            messageCount: messages.length,
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                ...(msg.model && { model: msg.model }),
                ...(msg.complexity && { complexity: msg.complexity }),
                ...(msg.responseTime && { responseTimeMs: msg.responseTime }),
                ...(msg.usage && { usage: msg.usage }),
                ...(msg.sources && msg.sources.length > 0 && { sources: msg.sources }),
                ...(msg.reaction && { reaction: msg.reaction })
            }))
        }

        const filename = `${sanitizeFilename(chatTitle)}_${formatDate()}.json`
        downloadFile(JSON.stringify(exportData, null, 2), filename, 'application/json')
    }

    if (messages.length === 0) return null

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 
          hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                title="Export chat"
            >
                <Download size={18} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-white dark:bg-zinc-900 
          border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 animate-fadeIn">
                    <div className="px-3 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Export As
                    </div>

                    <button
                        onClick={exportAsMarkdown}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 
              hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <FileText size={16} className="text-violet-500" />
                        <span>Markdown (.md)</span>
                    </button>

                    <button
                        onClick={exportAsJSON}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 
              hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <FileJson size={16} className="text-amber-500" />
                        <span>JSON (.json)</span>
                    </button>
                </div>
            )}
        </div>
    )
}
