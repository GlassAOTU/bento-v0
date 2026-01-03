'use client'

import { useTheme as useNextTheme } from 'next-themes'

type Theme = 'light' | 'dark'

export function useTheme() {
    const { theme, setTheme, resolvedTheme } = useNextTheme()

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
    }

    return {
        theme: (resolvedTheme || 'light') as Theme,
        setTheme: (t: Theme) => setTheme(t),
        toggleTheme
    }
}
