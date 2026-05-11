"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { getWebSocketBaseUrl, TOKEN_STORAGE_KEY } from "@/lib/api-config"
import { useAuth } from "@/lib/auth-context"

type WsListener = (payload: unknown) => void

type ChatRealtimeContextValue = {
  /** True when /ws/chat is connected. */
  ready: boolean
  /** Register for all parsed JSON frames (shared connection). Returns unsubscribe. */
  subscribe: (listener: WsListener) => () => void
  /** Current socket for sending (same as server expects). */
  getSocket: () => WebSocket | null
}

const ChatRealtimeContext = createContext<ChatRealtimeContextValue | null>(null)

export function ChatRealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const listenersRef = useRef<Set<WsListener>>(new Set())
  const [ready, setReady] = useState(false)

  const subscribe = useCallback((listener: WsListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const getSocket = useCallback(() => wsRef.current, [])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      wsRef.current?.close()
      wsRef.current = null
      setReady(false)
      return
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setReady(false)
      return
    }

    const url = `${getWebSocketBaseUrl()}/ws/chat?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setReady(true)
    ws.onclose = () => {
      setReady(false)
      if (wsRef.current === ws) wsRef.current = null
    }
    ws.onerror = () => setReady(false)
    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data as string) as unknown
        listenersRef.current.forEach((fn) => {
          try {
            fn(payload)
          } catch {
            /* listener fault isolation */
          }
        })
      } catch {
        /* ignore malformed */
      }
    }

    return () => {
      ws.close()
      if (wsRef.current === ws) wsRef.current = null
      setReady(false)
    }
  }, [isAuthenticated, user?.id])

  const value = useMemo(
    () => ({ ready, subscribe, getSocket }),
    [ready, subscribe, getSocket],
  )

  return (
    <ChatRealtimeContext.Provider value={value}>{children}</ChatRealtimeContext.Provider>
  )
}

export function useChatRealtime(): ChatRealtimeContextValue {
  const ctx = useContext(ChatRealtimeContext)
  if (!ctx) {
    throw new Error("useChatRealtime must be used within ChatRealtimeProvider")
  }
  return ctx
}
