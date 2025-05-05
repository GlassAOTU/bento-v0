"use client"
import { useEffect } from 'react';
import posthog from 'posthog-js';

const apiKey = process.env.POSTHOG_API

export default function PostHogInit() {
  useEffect(() => {
    posthog.init(`${apiKey}`, {
      api_host: 'https://us.i.posthog.com',
      capture_pageview: false,
      autocapture: false
    });
  }, []);

  return null;
}
