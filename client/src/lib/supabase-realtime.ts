import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { API_BASE_URL, SUPABASE_ANON_KEY, SUPABASE_URL, TOKEN_STORAGE_KEY } from "@/lib/api-config"

let cachedClient: SupabaseClient | null = null

/** In-memory broker JWT; cleared on logout. */
let brokerJwt: { token: string; expMs: number } | null = null

/** Drop broker JWT and tear down the singleton Realtime client (call on logout / login). */
export function resetSupabaseRealtimeClient(): void {
  brokerJwt = null
  const c = cachedClient
  cachedClient = null
  if (c) void c.removeAllChannels()
}

function parseJwtExpMs(jwt: string): number | null {
  try {
    const parts = jwt.split(".")
    if (parts.length < 2) return null
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { exp?: number }
    return typeof payload.exp === "number" ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * Fetches a short-lived JWT from the API, signed with Supabase's JWT secret (server-only).
 * The browser never sees `SUPABASE_JWT_SECRET`; login still uses `JWT_SECRET_KEY`.
 */
export async function fetchSupabaseRealtimeAccessToken(): Promise<string | null> {
  const api = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!api) {
    brokerJwt = null
    return null
  }
  const now = Date.now()
  if (brokerJwt && brokerJwt.expMs > now + 60_000) {
    return brokerJwt.token
  }

  const res = await fetch(`${API_BASE_URL}/realtime/token`, {
    headers: { Authorization: `Bearer ${api}` },
  })
  if (!res.ok) {
    brokerJwt = null
    return null
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  const tok = data.access_token
  if (!tok) {
    brokerJwt = null
    return null
  }
  const expMs = parseJwtExpMs(tok) ?? now + (data.expires_in ?? 3300) * 1000
  brokerJwt = { token: tok, expMs }
  return tok
}

/**
 * Browser Supabase client for Realtime only. Uses `realtime.accessToken` so reconnects
 * refresh the broker JWT from `/realtime/token`.
 */
export function getSupabaseRealtimeClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        accessToken: fetchSupabaseRealtimeAccessToken,
      },
    })
  }
  return cachedClient
}

/** Map `postgres_changes` row to the same shape as FastAPI WebSocket `application_message`. */
export function mapMessageInsertToApplicationMessage(row: Record<string, unknown>): {
  type: "application_message"
  message_id: string
  project_id: string | null
  sender_id: string | null
  receiver_id: string | null
  content: string | null
  is_read: boolean | null
  created_at: string
} {
  const trim = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim())
  const created = row.created_at
  let createdStr = ""
  if (created instanceof Date) createdStr = created.toISOString()
  else if (typeof created === "string") createdStr = created
  else if (created != null) createdStr = String(created)

  return {
    type: "application_message",
    message_id: trim(row.message_id),
    project_id: trim(row.project_id) || null,
    sender_id: trim(row.sender_id) || null,
    receiver_id: trim(row.receiver_id) || null,
    content: row.content != null ? String(row.content) : null,
    is_read:
      typeof row.is_read === "boolean"
        ? row.is_read
        : row.is_read === null || row.is_read === undefined
          ? null
          : Boolean(row.is_read),
    created_at: createdStr,
  }
}
