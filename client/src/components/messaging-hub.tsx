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
  OPEN_CHAT_EVENT,
  type OpenChatPayload,
  readApiErrorMessage,
  TOKEN_STORAGE_KEY,
} from '@/lib/api-config'
import { useChatRealtime } from '@/lib/chat-realtime-context'
import { useAuth } from '@/lib/auth-context'
import type { ApplicationChatRow } from '@/components/application-chat-dialog'
import {
  appliesToThread,
  newOptimisticMessageId,
  patchConversationsFromMessage,
  trimChatId,
} from '@/lib/chat-thread-utils'
import { formatSmartDayTime } from '@/lib/datetime-display'

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

// ─── Component ────────────────────────────────────────────────────────────────

export function MessagingHub() {
  const { isAuthenticated, user } = useAuth()
  const { ready: wsReady, subscribe, getSocket } = useChatRealtime()

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

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const activeConvRef = useRef<ConversationRow | null>(null)
  const userRef = useRef(user)
  const pendingLocalIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' })
  }, [messages])

  // ── Fetch conversation list ──────────────────────────────────────────────────

  const fetchConversations = useCallback(async (opts?: { silent?: boolean }) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return
    const silent = opts?.silent ?? false
    if (!silent) {
      setConvLoading(true)
      setConvError(null)
    }
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
      if (!silent) setConvLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && view === 'list' && isAuthenticated) {
      void fetchConversations()
    }
  }, [isOpen, view, isAuthenticated, fetchConversations])

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return
    const timer = window.setInterval(() => {
      void fetchConversations({ silent: true })
    }, 4000)
    return () => window.clearInterval(timer)
  }, [isOpen, isAuthenticated, fetchConversations])

  activeConvRef.current = activeConv
  userRef.current = user

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    return subscribe((raw) => {
      if (typeof raw !== 'object' || raw === null) return
      const typed = raw as {
        type?: string
        project_id?: string | null
        peer_user_id?: string | null
        message_ids?: string[]
      }
      const type = typed.type

      if (type === 'error') {
        pendingLocalIdsRef.current.clear()
        setMessages((prev) => prev.filter((m) => !String(m.message_id).startsWith('local-')))
        const detail = (raw as { detail?: unknown }).detail
        setSendError(typeof detail === 'string' ? detail : String(detail))
        return
      }

      if (type === 'application_message') {
        const msg = raw as ApplicationChatRow & { type?: string }
        const u = userRef.current
        if (u?.id) {
          setConversations((prev) => {
            const { next, found } = patchConversationsFromMessage(prev, msg, u.id)
            if (!found) {
              queueMicrotask(() => void fetchConversations())
            }
            return found ? next : prev
          })
        }
        const conv = activeConvRef.current
        if (!conv || !u?.id) return
        if (!appliesToThread(msg, conv.project_id, u.id, conv.peer_user_id)) return
        setMessages((prev) => {
          if (prev.some((m) => m.message_id === msg.message_id)) return prev
          const self = trimChatId(u.id)
          const fromSelf = trimChatId(msg.sender_id) === self
          let base = prev
          if (fromSelf) {
            const optimisticIdx = prev.findIndex(
              (m) =>
                String(m.message_id).startsWith('local-') &&
                trimChatId(m.sender_id) === self &&
                m.content === msg.content,
            )
            if (optimisticIdx >= 0) {
              const oid = prev[optimisticIdx]!.message_id
              pendingLocalIdsRef.current.delete(oid)
              base = prev.filter((_, i) => i !== optimisticIdx)
            }
          }
          return [...base, msg]
        })
        return
      }

      if (type === 'read_receipt') {
        const conv = activeConvRef.current
        if (!conv) return
        if (trimChatId(typed.project_id) !== trimChatId(conv.project_id)) return
        if (trimChatId(typed.peer_user_id) !== trimChatId(conv.peer_user_id)) return
        const ids = new Set((typed.message_ids ?? []).map((id) => trimChatId(id)))
        if (ids.size === 0) return
        setMessages((prev) =>
          prev.map((m) =>
            ids.has(trimChatId(m.message_id)) ? { ...m, is_read: true } : m,
          ),
        )
      }
    })
  }, [isAuthenticated, user?.id, subscribe, fetchConversations])

  // Listen for external "open to specific chat" requests (from project/manage pages)
  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent<OpenChatPayload>).detail
      setActiveConv({
        project_id: payload.project_id,
        project_title: payload.project_title,
        peer_user_id: payload.peer_user_id,
        peer_name: payload.peer_name,
        last_message: null,
        last_message_at: null,
      })
      setView('chat')
      setIsOpen(true)
    }
    window.addEventListener(OPEN_CHAT_EVENT, handler)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, handler)
  }, [])

  // ── Load history for active chat (shared WebSocket stays open via ChatRealtimeProvider) ──
  const loadActiveConversationHistory = useCallback(
    async (conv: ConversationRow, opts?: { markRead?: boolean }) => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)
      if (!token) {
        setLoadError('You are not logged in.')
        return
      }

      const res = await fetch(
        `${API_BASE_URL}/messages/application/${encodeURIComponent(conv.project_id)}/${encodeURIComponent(conv.peer_user_id)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) {
        setLoadError(await readApiErrorMessage(res))
        setHistoryLoaded(true)
        return
      }
      const data = (await res.json()) as ApplicationChatRow[]
      setMessages(Array.isArray(data) ? data : [])
      setHistoryLoaded(true)
      setLoadError(null)

      if (opts?.markRead) {
        const sock = getSocket()
        if (sock?.readyState === WebSocket.OPEN) {
          sock.send(
            JSON.stringify({
              type: 'mark_read',
              project_id: conv.project_id,
              peer_user_id: conv.peer_user_id,
            }),
          )
        }
      }
    },
    [getSocket],
  )

  useEffect(() => {
    if (!activeConv || !isAuthenticated || !user?.id) {
      setHistoryLoaded(false)
      setMessages([])
      setLoadError(null)
      setSendError(null)
      return
    }

    let cancelled = false

    ;(async () => {
      setLoadError(null)
      setSendError(null)
      setHistoryLoaded(false)

      try {
        await loadActiveConversationHistory(activeConv, { markRead: true })
        if (cancelled) return
      } catch {
        if (!cancelled) {
          setLoadError('Failed to load messages.')
          setHistoryLoaded(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeConv, isAuthenticated, user?.id, loadActiveConversationHistory])

  useEffect(() => {
    if (!isOpen || view !== 'chat' || !activeConv || !isAuthenticated || !user?.id) return
    const timer = window.setInterval(() => {
      void loadActiveConversationHistory(activeConv)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [isOpen, view, activeConv, isAuthenticated, user?.id, loadActiveConversationHistory])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSend = (e: FormEvent) => {
    e.preventDefault()
    setSendError(null)
    const trimmed = draft.trim()
    if (!trimmed || !activeConv || !user?.id) return
    const ws = getSocket()
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setSendError('Not connected. Please wait or reopen the chat.')
      return
    }
    const tid = newOptimisticMessageId()
    pendingLocalIdsRef.current.add(tid)
    const now = new Date().toISOString()
    setMessages((prev) => [
      ...prev,
      {
        message_id: tid,
        project_id: activeConv.project_id,
        sender_id: user.id,
        receiver_id: activeConv.peer_user_id,
        content: trimmed,
        created_at: now,
        is_read: false,
      },
    ])
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
    setActiveConv(null)
    setView('list')
    void fetchConversations()
  }

  const closePanel = () => {
    setIsOpen(false)
    setView('list')
    setActiveConv(null)
  }

  if (!isAuthenticated) return null

  return (
    <>
      {/* ── Floating action button ── */}
      <button
        onClick={() => (isOpen ? closePanel() : setIsOpen(true))}
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

              <div className="min-h-0 flex-1 overflow-y-auto">
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
                          {formatSmartDayTime(conv.last_message_at)}
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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

              {/* Messages — min-h-0 so flex-1 can shrink and scroll; otherwise the composer is clipped */}
              <ScrollArea className="min-h-0 flex-1 px-3 py-2">
                <div className="flex flex-col gap-2">
                  {!historyLoaded && !loadError && (
                    <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
                  )}
                  {historyLoaded && messages.length === 0 && !loadError && (
                    <p className="py-6 text-center text-xs text-muted-foreground">No messages yet. Say hello!</p>
                  )}
                  {messages.map((m) => {
                    const mine = trimChatId(m.sender_id) === trimChatId(user?.id)
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
                            {formatSmartDayTime(m.created_at)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Input — keep visible even if history GET failed (Realtime may still deliver). */}
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
            </div>
          )}
        </div>
      )}
    </>
  )
}
