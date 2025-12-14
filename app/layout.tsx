import type { Metadata } from 'next'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

import PostHogProvider from '@/util/posthog-provider'
import { AuthProvider } from '@/lib/auth/AuthContext'
import { Providers } from './providers'

export const metadata: Metadata = {
    title: 'Bento Anime',
    description: 'A new way to anime',
    generator: 'v0.dev',
    metadataBase: new URL('https://bentoanime.com'),
    openGraph: {
        title: "Bento Anime",
        description: "A new way to anime",
        url: "https://bentoanime.com",
        type: "website",
        images: [
            {
                url: "https://bentoanime.com/images/og-image.png",
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
            <body>
                <PostHogProvider>
                    <AuthProvider>
                        <Providers>
                            {children}
                            <Analytics />
                            <SpeedInsights />
                        </Providers>
                    </AuthProvider>
                </PostHogProvider>
            </body>
        </html>
    )
}