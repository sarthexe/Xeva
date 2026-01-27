'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/components/ThemeProvider'
import {
    X,
    User,
    Settings,
    Palette,
    Bell,
    Shield,
    Keyboard,
    HelpCircle,
    LogOut,
    Moon,
    Sun,
    Monitor,
    Check,
    ChevronRight,
    Sparkles,
    Zap,
    Crown
} from 'lucide-react'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    defaultTab?: string
}

type TabId = 'profile' | 'appearance' | 'notifications' | 'privacy' | 'shortcuts' | 'about'

interface Tab {
    id: TabId
    label: string
    icon: React.ReactNode
}

const tabs: Tab[] = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'privacy', label: 'Privacy & Data', icon: <Shield size={18} /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={18} /> },
    { id: 'about', label: 'About', icon: <HelpCircle size={18} /> },
]

export default function SettingsModal({ isOpen, onClose, defaultTab = 'profile' }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<TabId>(defaultTab as TabId)
    const { user, logout } = useAuth()
    const { theme, setTheme } = useTheme()

    if (!isOpen) return null

    const handleLogout = () => {
        logout()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl h-[85vh] max-h-[700px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-scaleIn flex">
                {/* Sidebar */}
                <div className="w-64 bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Settings</h2>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${activeTab === tab.id
                                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                                    }
                `}
                            >
                                <span className={activeTab === tab.id ? 'text-violet-600 dark:text-violet-400' : ''}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    {/* User Card & Logout */}
                    <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-800/50 mb-2">
                            {user?.picture ? (
                                <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                    {user?.name?.charAt(0) || 'G'}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                    {user?.name || 'Guest'}
                                </div>
                                <div className="text-xs text-zinc-500 truncate">
                                    {user?.id === 'guest' ? 'Guest Mode' : user?.email}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {activeTab === 'profile' && <ProfileTab user={user} />}
                        {activeTab === 'appearance' && <AppearanceTab theme={theme} setTheme={setTheme} />}
                        {activeTab === 'notifications' && <NotificationsTab />}
                        {activeTab === 'privacy' && <PrivacyTab />}
                        {activeTab === 'shortcuts' && <ShortcutsTab />}
                        {activeTab === 'about' && <AboutTab />}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Profile Tab
function ProfileTab({ user }: { user: any }) {
    const isGuest = user?.id === 'guest'

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Profile</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Manage your account settings and preferences</p>
            </div>

            {/* Profile Card */}
            <div className="bg-gradient-to-br from-violet-500/10 via-indigo-500/10 to-purple-500/10 dark:from-violet-500/20 dark:via-indigo-500/20 dark:to-purple-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-6">
                    {user?.picture ? (
                        <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-2xl shadow-lg" />
                    ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                            {user?.name?.charAt(0) || 'G'}
                        </div>
                    )}
                    <div>
                        <h4 className="text-xl font-bold text-zinc-900 dark:text-white">{user?.name || 'Guest'}</h4>
                        <p className="text-zinc-500 dark:text-zinc-400">
                            {isGuest ? 'Sign in to save your data' : user?.email}
                        </p>
                        {!isGuest && (
                            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                <Check size={12} />
                                Verified
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Plan Section */}
            <div className="space-y-4">
                <h4 className="text-lg font-semibold text-zinc-900 dark:text-white">Current Plan</h4>
                <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <Crown className="text-white" size={24} />
                            </div>
                            <div>
                                <div className="font-semibold text-zinc-900 dark:text-white">Free Plan</div>
                                <div className="text-sm text-zinc-500">Basic access to Xeva</div>
                            </div>
                        </div>
                        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-medium text-sm hover:opacity-90 transition-opacity">
                            Upgrade
                        </button>
                    </div>
                </div>
            </div>

            {/* Usage Stats */}
            <div className="space-y-4">
                <h4 className="text-lg font-semibold text-zinc-900 dark:text-white">Usage This Month</h4>
                <div className="grid grid-cols-3 gap-4">
                    <StatCard icon={<Zap size={20} />} label="Messages" value="127" color="violet" />
                    <StatCard icon={<Sparkles size={20} />} label="Tokens Used" value="45.2K" color="indigo" />
                    <StatCard icon={<Crown size={20} />} label="Premium Queries" value="12" color="amber" />
                </div>
            </div>
        </div>
    )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    const colorClasses = {
        violet: 'from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400',
        indigo: 'from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400',
        amber: 'from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400',
    }[color] || 'from-zinc-500/10 to-zinc-500/5 text-zinc-600'

    return (
        <div className={`bg-gradient-to-br ${colorClasses} rounded-xl p-4`}>
            <div className="mb-2">{icon}</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</div>
            <div className="text-sm text-zinc-500">{label}</div>
        </div>
    )
}

// Appearance Tab
function AppearanceTab({ theme, setTheme }: { theme: string; setTheme: (t: 'light' | 'dark' | 'system') => void }) {
    const themes = [
        { id: 'light', label: 'Light', icon: <Sun size={20} />, description: 'Clean and bright' },
        { id: 'dark', label: 'Dark', icon: <Moon size={20} />, description: 'Easy on the eyes' },
        { id: 'system', label: 'System', icon: <Monitor size={20} />, description: 'Follow OS preference' },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Appearance</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Customize how Xeva looks and feels</p>
            </div>

            {/* Theme Selection */}
            <div className="space-y-4">
                <h4 className="text-lg font-semibold text-zinc-900 dark:text-white">Theme</h4>
                <div className="grid grid-cols-3 gap-4">
                    {themes.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id as 'light' | 'dark' | 'system')}
                            className={`
                relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all
                ${theme === t.id
                                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800/50'
                                }
              `}
                        >
                            {theme === t.id && (
                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                                    <Check size={12} className="text-white" />
                                </div>
                            )}
                            <div className={theme === t.id ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400'}>
                                {t.icon}
                            </div>
                            <div>
                                <div className="font-semibold text-zinc-900 dark:text-white">{t.label}</div>
                                <div className="text-xs text-zinc-500">{t.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Font Size */}
            <div className="space-y-4">
                <h4 className="text-lg font-semibold text-zinc-900 dark:text-white">Font Size</h4>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-zinc-500">Aa</span>
                    <input
                        type="range"
                        min="12"
                        max="20"
                        defaultValue="16"
                        className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-violet-500"
                    />
                    <span className="text-lg text-zinc-500">Aa</span>
                </div>
            </div>
        </div>
    )
}

// Notifications Tab
function NotificationsTab() {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Notifications</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Manage how you receive notifications</p>
            </div>

            <div className="space-y-4">
                <ToggleSetting
                    label="Push Notifications"
                    description="Receive notifications about important updates"
                    defaultChecked={true}
                />
                <ToggleSetting
                    label="Email Updates"
                    description="Get weekly summaries and product updates"
                    defaultChecked={false}
                />
                <ToggleSetting
                    label="Sound Effects"
                    description="Play sounds for new messages"
                    defaultChecked={true}
                />
            </div>
        </div>
    )
}

// Privacy Tab
function PrivacyTab() {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Privacy & Data</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Control your data and privacy settings</p>
            </div>

            <div className="space-y-4">
                <ToggleSetting
                    label="Save Chat History"
                    description="Keep your conversation history for future reference"
                    defaultChecked={true}
                />
                <ToggleSetting
                    label="Usage Analytics"
                    description="Help improve Xeva by sharing anonymous usage data"
                    defaultChecked={true}
                />
                <ToggleSetting
                    label="Personalization"
                    description="Allow Xeva to learn from your interactions"
                    defaultChecked={false}
                />
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <button className="px-4 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-sm transition-colors">
                    Delete All My Data
                </button>
            </div>
        </div>
    )
}

// Shortcuts Tab
function ShortcutsTab() {
    const shortcuts = [
        { keys: ['Ctrl', 'K'], action: 'Open command menu' },
        { keys: ['Ctrl', 'N'], action: 'New chat' },
        { keys: ['Ctrl', '/'], action: 'Focus input' },
        { keys: ['Ctrl', 'Shift', 'C'], action: 'Copy last response' },
        { keys: ['Esc'], action: 'Close modal / Cancel' },
        { keys: ['↑'], action: 'Edit last message' },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Keyboard Shortcuts</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Speed up your workflow with these shortcuts</p>
            </div>

            <div className="space-y-2">
                {shortcuts.map((shortcut, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                        <span className="text-zinc-600 dark:text-zinc-400">{shortcut.action}</span>
                        <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, keyIdx) => (
                                <kbd
                                    key={keyIdx}
                                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                                >
                                    {key}
                                </kbd>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// About Tab
function AboutTab() {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">About Xeva</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Learn more about this application</p>
            </div>

            {/* Logo & Version */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <Sparkles className="text-white" size={32} />
                </div>
                <div>
                    <h4 className="text-xl font-bold text-zinc-900 dark:text-white">Xeva</h4>
                    <p className="text-zinc-500">Version 1.0.0</p>
                </div>
            </div>

            {/* Description */}
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Xeva is an intelligent AI assistant that automatically routes your queries to the most appropriate AI model,
                optimizing for both cost and performance. Built with cutting-edge technology to provide you with the best possible experience.
            </p>

            {/* Links */}
            <div className="space-y-2">
                <LinkButton label="Documentation" href="#" />
                <LinkButton label="Privacy Policy" href="#" />
                <LinkButton label="Terms of Service" href="#" />
                <LinkButton label="Report a Bug" href="#" />
            </div>

            {/* Credits */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-zinc-400">
                    © 2026 Neolytix. All rights reserved.
                </p>
            </div>
        </div>
    )
}

function ToggleSetting({ label, description, defaultChecked }: { label: string; description: string; defaultChecked: boolean }) {
    const [checked, setChecked] = useState(defaultChecked)

    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl">
            <div>
                <div className="font-medium text-zinc-900 dark:text-white">{label}</div>
                <div className="text-sm text-zinc-500">{description}</div>
            </div>
            <button
                onClick={() => setChecked(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-violet-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'left-6' : 'left-1'}`} />
            </button>
        </div>
    )
}

function LinkButton({ label, href }: { label: string; href: string }) {
    return (
        <a
            href={href}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
        >
            <span className="text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white">{label}</span>
            <ChevronRight size={16} className="text-zinc-400" />
        </a>
    )
}
