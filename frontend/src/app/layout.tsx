import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Xeva',
  description: 'AI Assistant with automatic model selection',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var c=t||(d?'dark':'light');document.documentElement.classList.add(c);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
