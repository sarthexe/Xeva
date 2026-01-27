'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles, Zap, Brain, Shield, ArrowRight } from 'lucide-react'

// Google Client ID from environment
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: object) => void
                    renderButton: (element: HTMLElement, config: object) => void
                    prompt: () => void
                }
            }
        }
    }
}

export default function LoginPage() {
    const { login, continueAsGuest, isLoading } = useAuth()
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Load Google Identity Services script
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = initializeGoogle
        document.body.appendChild(script)

        return () => {
            // Cleanup script on unmount
            const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
            if (existingScript) {
                existingScript.remove()
            }
        }
    }, [])

    const initializeGoogle = () => {
        if (!window.google || !GOOGLE_CLIENT_ID) {
            console.error('Google Identity Services not loaded or Client ID missing')
            return
        }

        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
            auto_select: false,
        })

        const buttonDiv = document.getElementById('google-signin-button')
        if (buttonDiv) {
            window.google.accounts.id.renderButton(buttonDiv, {
                type: 'standard',
                theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: 300,
            })
        }
    }

    const handleGoogleCallback = async (response: { credential: string }) => {
        setIsGoogleLoading(true)
        setError(null)

        try {
            const success = await login(response.credential)
            if (!success) {
                setError('Failed to sign in. Please try again.')
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setIsGoogleLoading(false)
        }
    }

    const handleGuestContinue = () => {
        continueAsGuest()
    }

    const features = [
        {
            icon: Brain,
            title: 'Intelligent Routing',
            description: 'Automatically selects the optimal AI model for your query',
        },
        {
            icon: Zap,
            title: 'Lightning Fast',
            description: 'Streaming responses for instant perceived performance',
        },
        {
            icon: Shield,
            title: 'Secure & Private',
            description: 'Your conversations are protected and never stored permanently',
        },
    ]

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo and Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25 mb-4">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white bg-clip-text text-transparent">
                        Welcome to Xeva
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                        Your intelligent AI assistant with automatic model selection
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl shadow-xl shadow-zinc-900/5 dark:shadow-zinc-950/50 p-8">
                    {/* Features List */}
                    <div className="space-y-4 mb-8">
                        {features.map((feature, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20 flex items-center justify-center">
                                    <feature.icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                                        {feature.title}
                                    </h3>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">
                                Sign in to continue
                            </span>
                        </div>
                    </div>

                    {/* Google Sign In Button */}
                    <div className="flex flex-col items-center gap-4">
                        {error && (
                            <div className="w-full p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div
                            id="google-signin-button"
                            className={`transition-opacity ${isGoogleLoading ? 'opacity-50 pointer-events-none' : ''}`}
                        />

                        {isGoogleLoading && (
                            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                Signing in...
                            </div>
                        )}
                    </div>

                    {/* Guest Option */}
                    <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                        <button
                            onClick={handleGuestContinue}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
                        >
                            Continue as Guest
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-2">
                            Guest mode doesn't save your chat history
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-6">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    )
}
