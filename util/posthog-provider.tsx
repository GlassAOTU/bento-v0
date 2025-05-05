"use client"
import { useEffect } from 'react';
import posthog from 'posthog-js';

export default function PostHogInit() {
  useEffect(() => {
    posthog.init('phc_fbzueaTgEy8vc3jTgiv5rRagZwoy7xjt3MQrOIXfy8P', {
      api_host: 'https://us.i.posthog.com',
      capture_pageview: false,
      autocapture: false
    });
  }, []);

  return null;
}
