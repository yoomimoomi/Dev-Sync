"use client"

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { ArrowLeft, MessageSquare, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  API_BASE_URL,
  getWebSocketBaseUrl,
  readApiErrorMessage,
  TOKEN_STORAGE_KEY,
} from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import type { ApplicationChatRow } from '@/components/application-chat-dialog'

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversationRow = {
  project_id: string
  project_title: string
  peer_user_id: string
  peer_name: string
  last_message: string | null
  last_message_at: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function trimId(v: string | null | undefined): string {
  return (v ?? '').trim()
}

function appliesToThread(
  msg: ApplicationChatRow,
  projectId: string,
  selfId: string,
  peerId: string,
): boolean {
  if (trimId(msg.project_id) !== trimId(projectId)) return false
  const self = trimId(selfId)
  const peer = trimId(peerId)
  const s = trimId(msg.sender_id)
  const r = trimId(msg.receiver_id)
  return (s === self && r === peer) || (s === peer && r === self)
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MessagingHub() {
  const { isAuthenticated, user } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'list' | 'chat'>('list')

  // Conversation list
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [convLoading, setConvLoading] = useState(false)
  const [convError, setConvError] = useState<string | null>(null)

  // Active chat
  const [activeConv, setActiveConv] = useState<ConversationRow | null>(null)
  const [messages, setMessages] = useState<ApplicationChatRow[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [wsReady, setWsReady] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Fetch conversation list ──────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return
    setConvLoading(true)
    setConvError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setConvError(await readApiErrorMessage(res))
        return
      }
      const data = (await res.json()) as ConversationRow[]
      setConversations(Array.isArray(data) ? data : [])
    } catch {
      setConvError('Failed to load conversations.')
    } finally {
      setConvLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && view === 'list' && isAuthenticated) {
      void fetchConversations()
    }
  }, [isOpen, view, isAuthenticated, fetchConversations])

  // ── WebSocket + history for active chat ────────────────────────────────────

  useEffect(() => {
    if (!activeConv || !isAuthenticated || !user?.id) {
      wsRef.current?.close()
      wsRef.current = null
      setWsReady(false)
      setHistoryLoaded(false)
      setMessages([])
      setLoadError(null)
      setSendError(null)
      return
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setLoadError('You are not logged in.')
      return
    }

    let cancelled = false

    const connect = async () => {
      setLoadError(null)
      setSendError(null)
      setHistoryLoaded(false)
      setWsReady(false)

      try {
        const res = await fetch(
          `${API_BASE_URL}/messages/application/${encodeURIComponent(activeConv.project_id)}/${encodeURIComponent(activeConv.peer_user_id)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) {
          setLoadError(await readApiErrorMessage(res))
          setHistoryLoaded(true)
          return
        }
        const data = (await res.json()) as ApplicationChatRow[]
        if (cancelled) return
        setMessages(Array.isArray(data) ? data : [])
        setHistoryLoaded(true)
      } catch {
        if (!cancelled) {
          setLoadError('Failed to load messages.')
          setHistoryLoaded(true)
        }
        return
      }

      if (cancelled) return

      const wsUrl = `${getWebSocketBaseUrl()}/ws/chat?token=${encodeURIComponent(token)}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => { if (!cancelled) setWsReady(true) }

      ws.onmessage = (ev) => {
        try {
          const raw = JSON.parse(ev.data as string) as unknown
          if (
            typeof raw === 'object' && raw !== null &&
            (raw as { type?: string }).type === 'error'
          ) {
            const detail = (raw as { detail?: unknown }).detail
            setSendError(typeof detail === 'string' ? detail : String(detail))
            return
          }
          if (
            typeof raw === 'object' && raw !== null &&
            (raw as { type?: string }).type === 'application_message'
          ) {
            const msg = raw as ApplicationChatRow & { type?: string }
            if (!user?.id || !activeConv) return
            if (!appliesToThread(msg, activeConv.project_id, user.id, activeConv.peer_user_id)) return
            setMessages((prev) => {
              if (prev.some((m) => m.message_id === msg.message_id)) return prev
              return [...prev, msg]
            })
          }
        } catch { /* ignore malformed frames */ }
      }

      ws.onerror = () => { if (!cancelled) setSendError('Connection error.') }
      ws.onclose = () => { if (!cancelled) setWsReady(false) }
    }

    void connect()

    return () => {
      cancelled = true
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [activeConv, isAuthenticated, user?.id])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSend = (e: FormEvent) => {
    e.preventDefault()
    setSendError(null)
    const trimmed = draft.trim()
    if (!trimmed || !activeConv) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setSendError('Not connected. Please wait or reopen the chat.')
      return
    }
    ws.send(JSON.stringify({
      project_id: activeConv.project_id,
      receiver_id: activeConv.peer_user_id,
      content: trimmed,
    }))
    setDraft('')
  }

  const openConversation = (conv: ConversationRow) => {
    setActiveConv(conv)
    setView('chat')
  }

  const backToList = () => {
    wsRef.current?.close()
    wsRef.current = null
    setActiveConv(null)
    setView('list')
    void fetchConversations()
  }

  const closePanel = () => {
    wsRef.current?.close()
    wsRef.current = null
    setIsOpen(false)
    setView('list')
    setActiveConv(null)
  }

  if (!isAuthenticated) return null

  return (
    <>
      {/* ── Floating action button ── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Open messages"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
          style={{ width: 360, height: 520 }}
        >
          {/* ════ CONVERSATION LIST ════ */}
          {view === 'list' && (
            <>
              <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Messages</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {convLoading && (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading…
                  </div>
                )}

                {convError && !convLoading && (
                  <div className="m-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {convError}
                  </div>
                )}

                {!convLoading && !convError && conversations.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Apply to a project or receive an application to start chatting.
                      </p>
                    </div>
                  </div>
                )}

                {!convLoading && conversations.map((conv) => (
                  <button
                    key={`${conv.project_id}-${conv.peer_user_id}`}
                    onClick={() => openConversation(conv)}
                    className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 transition-colors hover:bg-muted/40"
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {initials(conv.peer_name)}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{conv.peer_name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{conv.project_title}</p>
                      {conv.last_message && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                          {conv.last_message}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ════ CHAT THREAD ════ */}
          {view === 'chat' && activeConv && (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 border-b px-3 py-2.5 shrink-0">
                <button
                  onClick={backToList}
                  aria-label="Back"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {initials(activeConv.peer_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">{activeConv.peer_name}</p>
                  <p className="truncate text-[11px] leading-tight text-muted-foreground">{activeConv.project_title}</p>
                </div>
              </div>

              {/* Error */}
              {loadError && (
                <p className="mx-3 mt-2 shrink-0 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {loadError}
                </p>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 px-3 py-2">
                <div className="flex flex-col gap-2">
                  {!historyLoaded && !loadError && (
                    <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
                  )}
                  {historyLoaded && messages.length === 0 && !loadError && (
                    <p className="py-6 text-center text-xs text-muted-foreground">No messages yet. Say hello!</p>
                  )}
                  {messages.map((m) => {
                    const mine = trimId(m.sender_id) === trimId(user?.id)
                    return (
                      <div
                        key={m.message_id}
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          mine
                            ? 'ml-auto rounded-br-sm bg-primary text-primary-foreground'
                            : 'mr-auto rounded-bl-sm bg-muted text-foreground'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content ?? ''}</p>
                        {m.created_at && (
                          <p className={`mt-0.5 text-[10px] opacity-60 ${mine ? 'text-right' : ''}`}>
                            {formatTime(m.created_at)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              {!loadError && (
                <form
                  onSubmit={handleSend}
                  className="shrink-0 border-t px-3 py-2"
                >
                  {sendError && (
                    <p className="mb-1 text-[11px] text-destructive">{sendError}</p>
                  )}
                  <div className="flex items-end gap-2">
                    <Textarea
                      placeholder={wsReady ? 'Message…' : 'Connecting…'}
                      className="min-h-[38px] max-h-[96px] flex-1 resize-none py-2 text-sm"
                      rows={1}
                      value={draft}
                      disabled={!wsReady}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend(e as unknown as FormEvent)
                        }
                      }}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      disabled={!wsReady || !draft.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {wsReady ? 'Connected · Enter to send' : 'Connecting…'}
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
