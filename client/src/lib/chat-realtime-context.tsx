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
import { getWebSocketBaseUrl, isSupabaseRealtimeConfigured } from "@/lib/api-config"
import { useAuth } from "@/lib/auth-context"
import { getSupabaseRealtimeClient, mapMessageInsertToApplicationMessage } from "@/lib/supabase-realtime"

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

    const baseUrl = `${getWebSocketBaseUrl()}/ws/chat`
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    const wireSocket = (ws: WebSocket) => {
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
    }

    const connect = () => {
      if (cancelled) return
      const ws = new WebSocket(baseUrl)
      wsRef.current = ws
      wireSocket(ws)

      ws.onopen = () => {
        attempt = 0
        setReady(true)
      }
      ws.onerror = () => setReady(false)
      ws.onclose = () => {
        setReady(false)
        if (wsRef.current === ws) wsRef.current = null
        if (cancelled) return
        const delayMs = Math.min(8000, Math.round(350 * 1.55 ** Math.min(attempt, 8)))
        attempt += 1
        retryTimer = setTimeout(connect, delayMs)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (retryTimer != null) clearTimeout(retryTimer)
      const w = wsRef.current
      if (w) {
        w.onclose = null
        w.close()
      }
      wsRef.current = null
      setReady(false)
    }
  }, [isAuthenticated, user?.id])

  // Supabase Realtime: INSERT on `messages` (same payload shape as WebSocket echo; UI dedupes by message_id).
  useEffect(() => {
    if (!isSupabaseRealtimeConfigured() || !isAuthenticated || !user?.id) return
    const supabase = getSupabaseRealtimeClient()
    if (!supabase) return

    const channel = supabase
      .channel(`devsync-messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new
          if (!row || typeof row !== "object") return
          const msg = mapMessageInsertToApplicationMessage(row as Record<string, unknown>)
          listenersRef.current.forEach((fn) => {
            try {
              fn(msg)
            } catch {
              /* listener fault isolation */
            }
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
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
