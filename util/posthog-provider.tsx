"use client"

import { useEffect } from 'react';
import posthog from 'posthog-js';

// Create a wrapper component that provides PostHog context
export default function PostHogProvider({
    children
}: {
    children: React.ReactNode
}) {
    useEffect(() => {
        // Check if we're in the browser
        if (typeof window !== 'undefined') {
            // Use your project API key from environment variables
            const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

            if (apiKey) {
                posthog.init(apiKey, {
                    api_host: 'https://us.i.posthog.com',
                    capture_pageview: true, // Enable automatic page view tracking
                    loaded: (posthog) => {
                        if (process.env.NODE_ENV === 'development') {
                            posthog.debug();
                            console.log('PostHog initialized successfully');
                        }
                    },
                    persistence: 'localStorage',
                    autocapture: true,
                    capture_pageleave: true,
                    disable_session_recording: false,
                    session_recording: {
                        blockClass: 'ph-no-capture', // add this to iframe or wrapper
                    },
                    debug: process.env.NODE_ENV === 'development'
                });
            } else {
                console.warn('PostHog API key is missing. Add NEXT_PUBLIC_POSTHOG_KEY to your .env.local file.');
            }
        }
    }, []);

    return <>{children}</>;
}