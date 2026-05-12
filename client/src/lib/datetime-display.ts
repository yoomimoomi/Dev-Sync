/**
 * Parse message / notification timestamps from the API or WebSocket.
 * Naive ISO strings (no Z / offset) are treated as UTC — matching Postgres
 * `timestamp` values written as UTC and our `to_iso_utc_z` wire format.
 */
export function parseChatTimestamp(raw: string | null | undefined): Date | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null

  const hasTz =
    /Z$/i.test(s) ||
    /[+-]\d{2}:\d{2}$/.test(s) ||
    /[+-]\d{2}\d{2}$/.test(s)

  const naiveUtcLike = /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/i.test(s)

  if (naiveUtcLike && !hasTz) {
    const iso = s.replace(" ", "T").replace(/t/g, "T")
    const d = new Date(`${iso}Z`)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatChatDateTime(
  raw: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = parseChatTimestamp(raw)
  if (!d) return ""
  return d.toLocaleString(undefined, options ?? { dateStyle: "short", timeStyle: "short" })
}

function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Chat-friendly line: **time only** if the instant falls on **today** (local calendar);
 * otherwise **day + time** (e.g. `Yesterday, 3:45 PM`, `Mon, May 5, 3:45 PM`).
 */
export function formatSmartDayTime(raw: string | null | undefined): string {
  const d = parseChatTimestamp(raw)
  if (!d) return ""

  const now = new Date()
  const timePart = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })

  if (isSameLocalCalendarDay(d, now)) {
    return timePart
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameLocalCalendarDay(d, yesterday)) {
    return `Yesterday, ${timePart}`
  }

  if (d.getFullYear() === now.getFullYear()) {
    const datePart = d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    return `${datePart}, ${timePart}`
  }

  const datePart = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  return `${datePart}, ${timePart}`
}

/**
 * Compact "time ago" string used on project cards and project pages
 * (e.g. "just now", "5m", "3h", "2d", "4w"). Falls back to the original
 * input when it can't be parsed.
 */
export function formatTimeAgo(raw: string | null | undefined): string {
  if (raw == null) return ""
  const d = parseChatTimestamp(raw)
  if (!d) return String(raw)

  const diffMs = Math.max(0, Date.now() - d.getTime())
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day

  if (diffMs < minute) return "just now"
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m`
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h`
  if (diffMs < week) return `${Math.floor(diffMs / day)}d`
  return `${Math.floor(diffMs / week)}w`
}
