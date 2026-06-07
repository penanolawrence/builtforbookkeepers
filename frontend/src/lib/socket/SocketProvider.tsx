'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type Echo from 'laravel-echo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EchoInstance = Echo<any>

interface SocketContextValue {
  echo: EchoInstance | null
  connected: boolean
}

const SocketContext = createContext<SocketContextValue>({ echo: null, connected: false })

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [echo, setEcho] = useState<EchoInstance | null>(null)
  const [connected, setConnected] = useState(false)
  const echoRef = useRef<EchoInstance | null>(null)

  function connect() {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('sofia_token')
    if (!token) return

    import('@/lib/socket/socket').then(({ createEcho }) => {
      const instance = createEcho(token)
      echoRef.current = instance
      setEcho(instance)
      setConnected(true)
    })
  }

  function disconnect() {
    if (echoRef.current) {
      echoRef.current.disconnect()
      echoRef.current = null
      setEcho(null)
      setConnected(false)
    }
  }

  useEffect(() => {
    connect()

    const handleLogin = () => {
      disconnect()
      connect()
    }
    const handleLogout = () => disconnect()

    window.addEventListener('sofia:login', handleLogin)
    window.addEventListener('sofia:logout', handleLogout)

    return () => {
      window.removeEventListener('sofia:login', handleLogin)
      window.removeEventListener('sofia:logout', handleLogout)
      disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ echo, connected }}>
      {children}
    </SocketContext.Provider>
  )
}
