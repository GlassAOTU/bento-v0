import html2canvas from 'html2canvas'

export async function fetchImageAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(`/api/images/proxy?url=${encodeURIComponent(url)}`)
        if (!response.ok) return null
        const data = await response.json()
        return data.dataUrl || null
    } catch {
        return null
    }
}

export async function generateScreenshot(element: HTMLElement): Promise<Blob> {
    const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
    })

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob)
            } else {
                reject(new Error('Failed to generate screenshot'))
            }
        }, 'image/png', 1.0)
    })
}

export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
    try {
        if (!navigator.clipboard?.write) {
            return false
        }
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ])
        return true
    } catch {
        return false
    }
}

export async function downloadImage(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export function truncateText(text: string, maxLength: number = 280): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength - 3).trim() + '...'
}
