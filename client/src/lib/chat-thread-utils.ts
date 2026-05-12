/** Shared helpers for applicant ↔ peer DM threads (WebSocket + list UI). */

export function trimChatId(v: string | null | undefined): string {
  return (v ?? "").trim()
}

export function appliesToThread(
  msg: {
    project_id?: string | null
    sender_id?: string | null
    receiver_id?: string | null
  },
  projectId: string,
  selfId: string,
  peerId: string,
): boolean {
  if (trimChatId(msg.project_id) !== trimChatId(projectId)) return false
  const self = trimChatId(selfId)
  const peer = trimChatId(peerId)
  const s = trimChatId(msg.sender_id)
  const r = trimChatId(msg.receiver_id)
  return (s === self && r === peer) || (s === peer && r === self)
}

export type ConversationPatchRow = {
  project_id: string
  project_title: string
  peer_user_id: string
  peer_name: string
  last_message: string | null
  last_message_at: string | null
}

/** Update or detect missing row for sidebar list when a live message arrives. */
export function patchConversationsFromMessage(
  prev: ConversationPatchRow[],
  msg: {
    project_id?: string | null
    sender_id?: string | null
    receiver_id?: string | null
    content?: string | null
    created_at?: string | null
  },
  selfId: string,
): { next: ConversationPatchRow[]; found: boolean } {
  const pid = trimChatId(msg.project_id)
  const s = trimChatId(msg.sender_id)
  const r = trimChatId(msg.receiver_id)
  const self = trimChatId(selfId)
  if (!pid || !s || !r || !self) return { next: prev, found: false }
  const peer = s === self ? r : s
  const at =
    typeof msg.created_at === "string" && msg.created_at.trim()
      ? msg.created_at.trim()
      : new Date().toISOString()

  let found = false
  const next = prev.map((c) => {
    if (trimChatId(c.project_id) === pid && trimChatId(c.peer_user_id) === peer) {
      found = true
      return {
        ...c,
        last_message: msg.content ?? null,
        last_message_at: at,
      }
    }
    return c
  })

  if (!found) return { next: prev, found: false }

  const sorted = [...next].sort((a, b) => {
    const ta = new Date(a.last_message_at ?? 0).getTime()
    const tb = new Date(b.last_message_at ?? 0).getTime()
    return tb - ta
  })
  return { next: sorted, found: true }
}

export function newOptimisticMessageId(): string {
  return `local-${crypto.randomUUID()}`
}
