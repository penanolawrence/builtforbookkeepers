'use client'

import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

;(window as unknown as Record<string, unknown>).Pusher = Pusher

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createEcho(token: string): Echo<any> {
  return new Echo({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY!,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST!,
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 6001),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 6001),
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    auth: {
      headers: { Authorization: `Bearer ${token}` },
    },
    authEndpoint:
      process.env.NEXT_PUBLIC_API_URL!.replace('/api', '') + '/broadcasting/auth',
  })
}
