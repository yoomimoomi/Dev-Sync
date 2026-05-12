import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Bell,
  UserPlus,
  CheckCircle,
  MessageSquare,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Notification } from "@/lib/mock-data"
import { API_BASE_URL, readApiErrorMessage, TOKEN_STORAGE_KEY } from "@/lib/api-config"
import { useAuth } from "@/lib/auth-context"
import { useChatRealtime } from "@/lib/chat-realtime-context"
import { formatSmartDayTime } from "@/lib/datetime-display"
import { cn } from "@/lib/utils"

type ApiNotification = {
  id: string
  project_id: string
  title?: string | null
  content?: string | null
  read: boolean
  created_at?: string | null
}

function inferNotificationType(title: string): Notification["type"] {
  const t = title.toLowerCase()
  if (t.includes("join request") || t.includes("applied")) return "join_request"
  if (t.includes("message from") || t.startsWith("message")) return "message"
  if (t.includes("new comment") || t.startsWith("comment:")) return "comment"
  if (t.includes("declined")) return "declined"
  if (t.includes("accepted")) return "accepted"
  return "update"
}

function formatNotifTime(iso: string | null | undefined): string {
  const s = formatSmartDayTime(iso)
  return s || (iso?.trim() ?? "")
}

function mapApiToUi(a: ApiNotification): Notification {
  const title = (a.title ?? "").trim() || "Notification"
  return {
    id: a.id,
    type: inferNotificationType(title),
    title,
    description: (a.content ?? "").trim(),
    time: formatNotifTime(a.created_at ?? null),
    read: a.read,
    projectId: a.project_id?.trim() || undefined,
  }
}

function NotificationIcon({ type }: { type: Notification["type"] }) {
  switch (type) {
    case "join_request":
      return <UserPlus className="h-4 w-4 text-primary" />
    case "accepted":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "declined":
      return <XCircle className="h-4 w-4 text-destructive" />
    case "message":
      return <MessageSquare className="h-4 w-4 text-blue-500" />
    case "comment":
      return <MessageSquare className="h-4 w-4 text-violet-500" />
    case "update":
      return <RefreshCw className="h-4 w-4 text-orange-500" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

export function NotificationPopover() {
  const { isAuthenticated } = useAuth()
  const { subscribe } = useChatRealtime()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setNotifications([])
      return
    }
    setLoadError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setLoadError(await readApiErrorMessage(res))
        return
      }
      const data = (await res.json()) as ApiNotification[]
      setNotifications(Array.isArray(data) ? data.map(mapApiToUi) : [])
    } catch {
      setLoadError("Could not load notifications.")
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void fetchNotifications()
  }, [open, fetchNotifications])

  useEffect(() => {
    if (!isAuthenticated) return
    void fetchNotifications()
    const id = setInterval(() => void fetchNotifications(), 20_000)
    return () => clearInterval(id)
  }, [isAuthenticated, fetchNotifications])

  useEffect(() => {
    return subscribe((raw) => {
      if (typeof raw !== "object" || raw === null) return
      if ((raw as { type?: string }).type !== "notification") return
      const n = raw as {
        id?: string
        project_id?: string
        title?: string | null
        content?: string | null
        read?: boolean
        created_at?: string | null
      }
      if (!n.id) return
      const mapped = mapApiToUi({
        id: n.id,
        project_id: (n.project_id ?? "").trim(),
        title: n.title,
        content: n.content,
        read: Boolean(n.read),
        created_at: n.created_at,
      })
      setNotifications((prev) => {
        if (prev.some((p) => p.id === mapped.id)) return prev
        return [mapped, ...prev]
      })
    })
  }, [subscribe])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: unreadIds }),
      })
      if (!res.ok) return
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      /* ignore */
    }
  }

  const markAsRead = async (id: string) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: [id] }),
      })
      if (!res.ok) return
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
    } catch {
      /* ignore */
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void markAllAsRead()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all as read
            </Button>
          )}
        </div>
        {loadError && (
          <p className="border-b border-border px-4 py-2 text-xs text-destructive">
            {loadError}
          </p>
        )}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                to={notification.projectId ? `/project/${notification.projectId}` : "#"}
                onClick={() => {
                  void markAsRead(notification.id)
                  setOpen(false)
                }}
                className={cn(
                  "flex items-start gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/50",
                  !notification.read && "bg-primary/5",
                )}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <NotificationIcon type={notification.type} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p
                      className={cn(
                        "text-sm",
                        !notification.read && "font-medium",
                      )}
                    >
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notification.time}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
