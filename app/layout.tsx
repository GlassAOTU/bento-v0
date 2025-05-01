import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Bento Anime',
    description: 'A new way to anime',
    generator: 'v0.dev',
    openGraph: {
        title: "Bento Anime",
        description: "A new way to anime",
        url: "https://bentoanime.com",
        type: "website",
        images: [
            {
                url: "/preview.png",
                width: 1200,
                height: 630,
                alt: "Bento Site Preview",
            },
        ],
    }
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
