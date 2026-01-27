'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
    id: string
    email: string
    name: string
    picture: string
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (credential: string) => Promise<boolean>
    logout: () => void
    continueAsGuest: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check for existing session on mount
        const storedUser = localStorage.getItem('xeva_user')
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser)
                setUser(parsedUser)
            } catch (e) {
                localStorage.removeItem('xeva_user')
            }
        }
        setIsLoading(false)
    }, [])

    const login = async (credential: string): Promise<boolean> => {
        try {
            setIsLoading(true)

            const response = await fetch(`${API_URL}/api/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: credential }),
            })

            if (!response.ok) {
                throw new Error('Authentication failed')
            }

            const data = await response.json()

            const userData: User = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                picture: data.user.picture,
            }

            setUser(userData)
            localStorage.setItem('xeva_user', JSON.stringify(userData))
            localStorage.setItem('xeva_token', data.token)

            return true
        } catch (error) {
            console.error('Login error:', error)
            return false
        } finally {
            setIsLoading(false)
        }
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('xeva_user')
        localStorage.removeItem('xeva_token')
    }

    const continueAsGuest = () => {
        const guestUser: User = {
            id: 'guest',
            email: '',
            name: 'Guest',
            picture: '',
        }
        setUser(guestUser)
        localStorage.setItem('xeva_user', JSON.stringify(guestUser))
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                continueAsGuest,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
