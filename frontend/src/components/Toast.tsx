'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { Check, X, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: string
    message: string
    type: ToastType
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
    const context = useContext(ToastContext)
    // Return a no-op if context is not available (SSR or before provider mounts)
    if (!context) {
        return { showToast: () => { } }
    }
    return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Date.now().toString()
        setToasts(prev => [...prev, { id, message, type }])
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onRemove={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onRemove, 3000)
        return () => clearTimeout(timer)
    }, [onRemove])

    const icons = {
        success: <Check size={16} className="text-emerald-400" />,
        error: <X size={16} className="text-red-400" />,
        info: <Info size={16} className="text-blue-400" />
    }

    const bgColors = {
        success: 'bg-emerald-500/10 border-emerald-500/30',
        error: 'bg-red-500/10 border-red-500/30',
        info: 'bg-blue-500/10 border-blue-500/30'
    }

    return (
        <div
            className={`
        pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
        backdrop-blur-xl border shadow-lg shadow-black/10
        animate-slideIn
        ${bgColors[toast.type]}
        bg-white/90 dark:bg-zinc-900/90
      `}
        >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800">
                {icons[toast.type]}
            </div>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {toast.message}
            </span>
            <button
                onClick={onRemove}
                className="ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    )
}
