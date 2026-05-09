"use client"

import {
  type FormEvent,
  type ReactNode,
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
  getWebSocketBaseUrl,
  readApiErrorMessage,
  TOKEN_STORAGE_KEY,
} from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

export type ApplicationChatRow = {
  message_id: string
  project_id?: string | null
  sender_id?: string | null
  receiver_id?: string | null
  content?: string | null
  created_at?: string | null
}

interface ApplicationChatDialogProps {
  projectId: string
  peerUserId: string
  peerDisplayName: string
  title?: string
  children: ReactNode
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

export function ApplicationChatDialog({
  projectId,
  peerUserId,
  peerDisplayName,
  title = 'Messages',
  children,
}: ApplicationChatDialogProps) {
  const { isAuthenticated, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ApplicationChatRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [wsReady, setWsReady] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!open || !isAuthenticated || !user?.id) {
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
          `${API_BASE_URL}/messages/application/${encodeURIComponent(projectId)}/${encodeURIComponent(peerUserId)}`,
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

      ws.onopen = () => {
        if (!cancelled) setWsReady(true)
      }

      ws.onmessage = (ev) => {
        try {
          const raw = JSON.parse(ev.data as string) as unknown
          if (
            typeof raw === 'object' &&
            raw !== null &&
            (raw as { type?: string }).type === 'error'
          ) {
            const detail = (raw as { detail?: unknown }).detail
            setSendError(typeof detail === 'string' ? detail : String(detail))
            return
          }
          if (
            typeof raw === 'object' &&
            raw !== null &&
            (raw as { type?: string }).type === 'application_message'
          ) {
            const msg = raw as ApplicationChatRow & { type?: string }
            if (!user?.id) return
            if (!appliesToThread(msg, projectId, user.id, peerUserId)) return
            setMessages((prev) => {
              if (prev.some((m) => m.message_id === msg.message_id)) return prev
              return [...prev, msg]
            })
          }
        } catch {
          // ignore malformed frames
        }
      }

      ws.onerror = () => {
        if (!cancelled) setSendError('WebSocket connection error.')
      }

      ws.onclose = () => {
        if (!cancelled) setWsReady(false)
      }
    }

    void connect()

    return () => {
      cancelled = true
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [open, isAuthenticated, user?.id, projectId, peerUserId])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSendError(null)
    const trimmed = draft.trim()
    if (!trimmed) return

    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setSendError('Not connected. Wait for the connection or refresh.')
      return
    }

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
                  const mine = m.sender_id === user?.id
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
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {!loadError && (
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
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
