"use client"

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { MessageSquare, Send, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  API_BASE_URL,
  readApiErrorMessage,
  TOKEN_STORAGE_KEY,
} from '@/lib/api-config'
import { useChatRealtime } from '@/lib/chat-realtime-context'
import { useAuth } from '@/lib/auth-context'
import {
  appliesToThread,
  newOptimisticMessageId,
  trimChatId,
} from '@/lib/chat-thread-utils'
import { formatSmartDayTime } from '@/lib/datetime-display'

export type ApplicationChatRow = {
  message_id: string
  project_id?: string | null
  sender_id?: string | null
  receiver_id?: string | null
  content?: string | null
  created_at?: string | null
  is_read?: boolean | null
}

interface ApplicationChatDialogProps {
  projectId: string
  peerUserId: string
  peerDisplayName: string
  title?: string
  children: ReactNode
}

export function ApplicationChatDialog({
  projectId,
  peerUserId,
  peerDisplayName,
  title = 'Messages',
  children,
}: ApplicationChatDialogProps) {
  const { isAuthenticated, user } = useAuth()
  const { ready: wsReady, subscribe, getSocket } = useChatRealtime()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ApplicationChatRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const projectIdRef = useRef(projectId)
  const peerUserIdRef = useRef(peerUserId)
  projectIdRef.current = projectId
  peerUserIdRef.current = peerUserId
  const userRef = useRef(user)
  userRef.current = user
  const pendingLocalIdsRef = useRef<Set<string>>(new Set())

  const loadHistory = useCallback(
    async (opts?: { markRead?: boolean }) => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)
      if (!token) {
        setLoadError('You are not logged in.')
        return
      }

      const res = await fetch(
        `${API_BASE_URL}/messages/application/${encodeURIComponent(projectId)}/${encodeURIComponent(peerUserId)}`,
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
              project_id: projectId,
              peer_user_id: peerUserId,
            }),
          )
        }
      }
    },
    [projectId, peerUserId, getSocket],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' })
  }, [messages])

  useEffect(() => {
    if (!open || !isAuthenticated || !user?.id) {
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
        await loadHistory({ markRead: true })
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
  }, [open, isAuthenticated, user?.id, loadHistory])

  useEffect(() => {
    if (!open || !isAuthenticated || !user?.id) return
    const timer = window.setInterval(() => {
      void loadHistory()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [open, isAuthenticated, user?.id, loadHistory])

  useEffect(() => {
    if (!open || !isAuthenticated || !user?.id) return
    return subscribe((raw) => {
      if (typeof raw !== 'object' || raw === null) return
      const type = (raw as { type?: string }).type
      if (type === 'error') {
        pendingLocalIdsRef.current.clear()
        setMessages((prev) => prev.filter((m) => !String(m.message_id).startsWith('local-')))
        const detail = (raw as { detail?: unknown }).detail
        setSendError(typeof detail === 'string' ? detail : String(detail))
        return
      }
      if (type === 'application_message') {
        const pid = projectIdRef.current
        const peer = peerUserIdRef.current
        const u = userRef.current
        if (!u?.id) return
        const msg = raw as ApplicationChatRow & { type?: string }
        if (!appliesToThread(msg, pid, u.id, peer)) return
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
        const r = raw as {
          project_id?: string | null
          peer_user_id?: string | null
          message_ids?: string[]
        }
        if (trimChatId(r.project_id) !== trimChatId(projectIdRef.current)) return
        if (trimChatId(r.peer_user_id) !== trimChatId(peerUserIdRef.current)) return
        const ids = new Set((r.message_ids ?? []).map((id) => trimChatId(id)))
        if (ids.size === 0) return
        setMessages((prev) =>
          prev.map((m) =>
            ids.has(trimChatId(m.message_id)) ? { ...m, is_read: true } : m,
          ),
        )
      }
    })
  }, [open, isAuthenticated, user?.id, subscribe])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSendError(null)
    const trimmed = draft.trim()
    if (!trimmed || !user?.id) return

    const ws = getSocket()
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setSendError('Not connected. Wait for the connection or refresh.')
      return
    }

    const tid = newOptimisticMessageId()
    pendingLocalIdsRef.current.add(tid)
    const now = new Date().toISOString()
    setMessages((prev) => [
      ...prev,
      {
        message_id: tid,
        project_id: projectId,
        sender_id: user.id,
        receiver_id: peerUserId,
        content: trimmed,
        created_at: now,
        is_read: false,
      },
    ])
    ws.send(
      JSON.stringify({
        project_id: projectId,
        receiver_id: peerUserId,
        content: trimmed,
      }),
    )
    setDraft('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setSendError(null)
          setLoadError(null)
          setDraft('')
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 sm:max-w-lg">
        {!isAuthenticated ? (
          <>
            <DialogHeader>
              <DialogTitle>Login Required</DialogTitle>
              <DialogDescription>
                Sign in to message {peerDisplayName} about this project.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <User className="h-16 w-16 text-muted-foreground" />
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {title}
              </DialogTitle>
              <DialogDescription>
                Conversation with {peerDisplayName}. Messages are saved and delivered in real time when you&apos;re online.
              </DialogDescription>
            </DialogHeader>

            {loadError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {loadError}
              </p>
            )}

            <ScrollArea className="mt-2 max-h-[45vh] rounded-md border bg-muted/20 p-3">
              <div className="flex flex-col gap-2 pr-2">
                {!historyLoaded && !loadError && (
                  <p className="text-sm text-muted-foreground">Loading history…</p>
                )}
                {historyLoaded && messages.length === 0 && !loadError && (
                  <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
                )}
                {messages.map((m) => {
                  const mine = trimChatId(m.sender_id) === trimChatId(user?.id)
                  return (
                    <div
                      key={m.message_id}
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        mine
                          ? 'ml-auto bg-primary text-primary-foreground'
                          : 'mr-auto bg-muted'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content ?? ''}</p>
                      {m.created_at && (
                        <p
                          className={`mt-1 text-[10px] opacity-70 ${mine ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                        >
                          {formatSmartDayTime(m.created_at)}
                        </p>
                      )}
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 flex flex-col gap-2">
              {sendError && (
                <p className="text-sm text-destructive">{sendError}</p>
              )}
              <Textarea
                placeholder={wsReady ? 'Write a message…' : 'Connecting…'}
                className="min-h-[72px] resize-none"
                value={draft}
                disabled={!wsReady}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {wsReady ? 'Connected' : historyLoaded ? 'Connecting…' : ' '}
                </p>
                <Button type="submit" size="sm" disabled={!wsReady || !draft.trim()}>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
