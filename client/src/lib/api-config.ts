export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

/** Build ws/wss URL from the HTTP API base (used by applicant-owner chat WebSocket). */
export function getWebSocketBaseUrl(): string {
  const base = API_BASE_URL.trim()
  if (base.startsWith('https://')) return base.replace(/^https:\/\//, 'wss://')
  if (base.startsWith('http://')) return base.replace(/^http:\/\//, 'ws://')
  return `ws://${base.replace(/^\/\//, '')}`
}

export const TOKEN_STORAGE_KEY = 'devsync_access_token'

/** Fired after a successful POST /application so dependent pages can refresh. */
export const APPLICATION_SUBMITTED_EVENT = 'devsync-application-submitted'

export async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as unknown
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      const detail = (body as { detail?: unknown }).detail
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0] as unknown
        if (typeof first === 'object' && first !== null && 'msg' in first) {
          const msg = (first as { msg?: unknown }).msg
          if (typeof msg === 'string') return msg
        }
      }
    }
  } catch {
    // ignore parse errors, fall back below
  }
  return `${res.status} ${res.statusText}`.trim()
}
