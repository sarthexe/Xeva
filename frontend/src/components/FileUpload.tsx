'use client'

import { useState, useRef, useCallback } from 'react'
import {
    Upload,
    FileText,
    Image,
    File,
    X,
    Check,
    Loader2,
    AlertCircle,
    FileImage,
    FileType,
    Sparkles
} from 'lucide-react'

interface UploadedFile {
    id: string
    name: string
    size: number
    status: 'pending' | 'uploading' | 'success' | 'error'
    progress: number
    error?: string
    result?: {
        doc_id: string
        chunks_indexed: number
        parser_used: string
        extracted_chars: number
    }
}

interface FileUploadProps {
    onUploadComplete?: (result: any) => void
    className?: string
}

const SUPPORTED_EXTENSIONS = [
    '.txt', '.md', '.csv', '.json', '.xml', '.html',
    '.pdf',
    '.docx',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff'
]

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
    pdf: <FileText className="text-red-500" size={20} />,
    docx: <FileType className="text-blue-500" size={20} />,
    doc: <FileType className="text-blue-500" size={20} />,
    txt: <FileText className="text-zinc-500" size={20} />,
    md: <FileText className="text-zinc-600" size={20} />,
    png: <FileImage className="text-green-500" size={20} />,
    jpg: <FileImage className="text-green-500" size={20} />,
    jpeg: <FileImage className="text-green-500" size={20} />,
    gif: <FileImage className="text-purple-500" size={20} />,
    default: <File className="text-zinc-400" size={20} />
}

function getFileIcon(filename: string): React.ReactNode {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    return FILE_TYPE_ICONS[ext] || FILE_TYPE_ICONS.default
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUpload({ onUploadComplete, className = '' }: FileUploadProps) {
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isValidFile = (filename: string): boolean => {
        const ext = '.' + filename.split('.').pop()?.toLowerCase()
        return SUPPORTED_EXTENSIONS.includes(ext)
    }

    const uploadFile = async (file: File, fileId: string) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name)
        formData.append('source', 'upload')

        try {
            console.log(`[FileUpload] Starting upload for: ${file.name}`)
            setFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, status: 'uploading', progress: 10 } : f
            ))

            const response = await fetch('http://localhost:8000/api/rag/upload', {
                method: 'POST',
                body: formData
            })

            console.log(`[FileUpload] Response status: ${response.status}`)

            setFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, progress: 70 } : f
            ))

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || 'Upload failed')
            }

            const result = await response.json()

            setFiles(prev => prev.map(f =>
                f.id === fileId ? {
                    ...f,
                    status: 'success',
                    progress: 100,
                    result
                } : f
            ))

            onUploadComplete?.(result)
        } catch (error: any) {
            setFiles(prev => prev.map(f =>
                f.id === fileId ? {
                    ...f,
                    status: 'error',
                    error: error.message || 'Upload failed'
                } : f
            ))
        }
    }

    const handleFiles = useCallback((fileList: FileList) => {
        console.log('[FileUpload] handleFiles called with', fileList.length, 'files')
        const newFiles: UploadedFile[] = []
        const filesToUpload: { file: File; fileId: string }[] = []

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i]
            if (!isValidFile(file.name)) continue

            const fileId = `${Date.now()}-${i}`
            newFiles.push({
                id: fileId,
                name: file.name,
                size: file.size,
                status: 'pending',
                progress: 0
            })

            filesToUpload.push({ file, fileId })
        }

        // First add files to state
        setFiles(prev => [...prev, ...newFiles])

        // Then start uploads after state is updated
        setTimeout(() => {
            filesToUpload.forEach(({ file, fileId }) => {
                uploadFile(file, fileId)
            })
        }, 50)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        handleFiles(e.dataTransfer.files)
    }, [handleFiles])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const removeFile = (fileId: string) => {
        setFiles(prev => prev.filter(f => f.id !== fileId))
    }

    const clearCompleted = () => {
        setFiles(prev => prev.filter(f => f.status !== 'success'))
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Drop Zone */}
            <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                    relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragging
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={SUPPORTED_EXTENSIONS.join(',')}
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    className="hidden"
                />

                <div className="flex flex-col items-center gap-3">
                    <div className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center transition-colors
                        ${isDragging
                            ? 'bg-violet-100 dark:bg-violet-900/40'
                            : 'bg-zinc-100 dark:bg-zinc-800'
                        }
                    `}>
                        <Upload className={`
                            w-6 h-6 transition-colors
                            ${isDragging ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-500'}
                        `} />
                    </div>

                    <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                            PDF, DOCX, Images (with OCR), TXT, MD, JSON, CSV
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">PDF</span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">DOCX</span>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs rounded-full">Images</span>
                        <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs rounded-full">Text</span>
                    </div>
                </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Uploaded Files ({files.length})
                        </span>
                        {files.some(f => f.status === 'success') && (
                            <button
                                onClick={clearCompleted}
                                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            >
                                Clear completed
                            </button>
                        )}
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className={`
                                    flex items-center gap-3 p-3 rounded-xl border transition-colors
                                    ${file.status === 'error'
                                        ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20'
                                        : file.status === 'success'
                                            ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20'
                                            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50'
                                    }
                                `}
                            >
                                {/* Icon */}
                                <div className="flex-shrink-0">
                                    {getFileIcon(file.name)}
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                        {file.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-zinc-500">
                                            {formatFileSize(file.size)}
                                        </span>
                                        {file.status === 'success' && file.result && (
                                            <>
                                                <span className="text-xs text-zinc-400">•</span>
                                                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                    <Sparkles size={10} />
                                                    {file.result.chunks_indexed} chunks indexed
                                                </span>
                                            </>
                                        )}
                                        {file.status === 'error' && (
                                            <span className="text-xs text-red-600 dark:text-red-400">
                                                {file.error}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    {file.status === 'uploading' && (
                                        <div className="mt-2 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-violet-500 transition-all duration-300"
                                                style={{ width: `${file.progress}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Status Icon / Actions */}
                                <div className="flex-shrink-0">
                                    {file.status === 'uploading' && (
                                        <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                                    )}
                                    {file.status === 'success' && (
                                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                    {file.status === 'error' && (
                                        <button
                                            onClick={() => removeFile(file.id)}
                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4 text-red-500" />
                                        </button>
                                    )}
                                    {file.status === 'pending' && (
                                        <button
                                            onClick={() => removeFile(file.id)}
                                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4 text-zinc-400" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Section */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-900/50">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 dark:text-amber-300">
                    <p className="font-medium">Note:</p>
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                        <li>Images require Tesseract OCR installed on the server</li>
                        <li>Scanned PDFs will use OCR fallback if no text is found</li>
                        <li>Maximum file size: 50MB</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
