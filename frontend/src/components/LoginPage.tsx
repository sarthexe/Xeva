'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'

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
                    cancel: () => void
                }
                oauth2: {
                    initCodeClient: (config: object) => {
                        requestCode: () => void
                    }
                }
            }
        }
    }
}

export default function LoginPage() {
    const { login, continueAsGuest, isLoading } = useAuth()
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [scriptLoaded, setScriptLoaded] = useState(false)
    const googleButtonRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Load Google Identity Services script
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => {
            setScriptLoaded(true)
        }
        script.onerror = () => {
            setError('Failed to load Google Sign-In. Please refresh the page.')
        }
        document.body.appendChild(script)

        return () => {
            const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
            if (existingScript) {
                existingScript.remove()
            }
        }
    }, [])

    // Initialize Google Sign-In when script is loaded
    useEffect(() => {
        if (!scriptLoaded || !window.google || !GOOGLE_CLIENT_ID) {
            return
        }

        try {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCallback,
                auto_select: false,
                cancel_on_tap_outside: true,
            })

            // Render the hidden Google button for fallback
            if (googleButtonRef.current) {
                window.google.accounts.id.renderButton(googleButtonRef.current, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'pill',
                    width: 300,
                })
            }
        } catch (err) {
            console.error('Failed to initialize Google Sign-In:', err)
            setError('Failed to initialize Google Sign-In.')
        }
    }, [scriptLoaded])

    const handleGoogleCallback = async (response: { credential: string }) => {
        setIsGoogleLoading(true)
        setError(null)

        try {
            const success = await login(response.credential)
            if (!success) {
                setError('Failed to sign in. Please try again.')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setIsGoogleLoading(false)
        }
    }

    const handleGoogleClick = () => {
        // Click the hidden Google button to trigger sign-in
        const googleButton = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement
        if (googleButton) {
            googleButton.click()
        } else if (window.google) {
            // Fallback to prompt
            window.google.accounts.id.prompt()
        }
    }

    const handleGuestContinue = () => {
        continueAsGuest()
    }

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] relative overflow-hidden">
            {/* Background Glow Effects - matching ChatArea */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/5 blur-[120px] pointer-events-none" />

            {/* Navigation */}
            <nav className="w-full px-8 py-5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-8">
                    <NavLink href="#" active>Home</NavLink>
                    <NavLink href="#">Leaderboard</NavLink>
                    <NavLink href="#">About</NavLink>
                    <NavLink href="#">Blog</NavLink>
                </div>

                {/* Logo - centered */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <Image
                        src="/x.png"
                        alt="Xeva Logo"
                        width={120}
                        height={40}
                        className="dark:invert"
                    />
                </div>

                <div className="w-64" /> {/* Spacer for centering */}
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-16 relative z-10">
                {/* Heading */}
                <h1 className="text-center mb-6">
                    <span className="block text-5xl md:text-7xl font-bold text-zinc-900 dark:text-white tracking-tight">
                        Every AI for
                    </span>
                    <span className="block text-5xl md:text-7xl font-bold italic bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent tracking-tight mt-2">
                        everyone
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="text-center text-zinc-500 dark:text-zinc-400 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
                    Check out the best answers from all the latest AIs for free.
                    <br />
                    Win rewards. Shape the future of AI.
                </p>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Hidden Google Button - for triggering sign-in */}
                <div
                    ref={googleButtonRef}
                    className="opacity-0 absolute pointer-events-none"
                    style={{ visibility: 'hidden' }}
                />

                {/* Custom Google Sign In Button */}
                <button
                    onClick={handleGoogleClick}
                    disabled={isGoogleLoading || !scriptLoaded}
                    className={`
            group flex items-center gap-3 px-6 py-4 rounded-full
            bg-zinc-900 dark:bg-white
            hover:bg-zinc-800 dark:hover:bg-zinc-100
            text-white dark:text-zinc-900 font-semibold text-lg
            shadow-xl shadow-zinc-900/20 dark:shadow-black/30
            transition-all duration-200
            disabled:opacity-70 disabled:cursor-not-allowed
            hover:scale-[1.02]
          `}
                >
                    {/* Google Icon */}
                    <div className="w-8 h-8 bg-white dark:bg-zinc-100 rounded-full flex items-center justify-center shadow-inner">
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                    </div>

                    <span>{scriptLoaded ? 'Sign in with Google' : 'Loading...'}</span>

                    <ArrowRight
                        size={20}
                        className="transition-transform group-hover:translate-x-1"
                    />
                </button>

                {/* Loading indicator */}
                {isGoogleLoading && (
                    <div className="mt-4 flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Signing in...</span>
                    </div>
                )}

                {/* Guest Option */}
                <button
                    onClick={handleGuestContinue}
                    disabled={isLoading}
                    className="mt-6 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-sm font-medium transition-colors"
                >
                    Continue as Guest →
                </button>

                {/* Debug info - remove in production */}
                {!GOOGLE_CLIENT_ID && (
                    <p className="mt-8 text-xs text-red-500">
                        ⚠️ NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set in frontend/.env.local
                    </p>
                )}
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-zinc-400 dark:text-zinc-600 text-xs relative z-10">
                © 2026 Xeva. All rights reserved.
            </footer>
        </div>
    )
}

function NavLink({ href, children, active = false }: { href: string; children: React.ReactNode; active?: boolean }) {
    return (
        <a
            href={href}
            className={`
        px-4 py-2 rounded-full text-sm font-medium transition-all
        ${active
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'
                }
      `}
        >
            {children}
        </a>
    )
}
