import { useEffect, useRef } from 'react'

export function useSessionStorageRestore<T>(
    key: string,
    setter: (value: T) => void,
    options?: { clearAfterRestore?: boolean }
): void {
    const restoredRef = useRef(false)

    useEffect(() => {
        if (restoredRef.current) return

        try {
            const stored = sessionStorage.getItem(key)
            if (stored) {
                const parsed = JSON.parse(stored)
                setter(parsed)
                if (options?.clearAfterRestore) {
                    sessionStorage.removeItem(key)
                }
            }
        } catch (error) {
            console.error(`Failed to restore ${key} from sessionStorage:`, error)
        }

        restoredRef.current = true
    }, [key, setter, options?.clearAfterRestore])
}

export function useSessionStorageSync<T>(
    key: string,
    value: T,
    enabled: boolean = true
): void {
    useEffect(() => {
        if (!enabled) return

        try {
            sessionStorage.setItem(key, JSON.stringify(value))
        } catch (error) {
            console.error(`Failed to sync ${key} to sessionStorage:`, error)
        }
    }, [key, value, enabled])
}
