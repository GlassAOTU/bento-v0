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
                url: "https://bentoanime.com/images/Updated%20Link%20Preview%20Thumbnail.png",
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
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{var d=document.documentElement,c=d.classList;c.remove('light','dark');var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){c.add('dark')}else{c.add('light')}}catch(e){}})();`,
                    }}
                />
            </head>
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