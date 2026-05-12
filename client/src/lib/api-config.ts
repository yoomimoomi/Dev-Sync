export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const TOKEN_STORAGE_KEY = 'devsync_access_token'
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://mdacciknqnhpqswwishp.supabase.co'

export function avatarUrl(path?: string | null): string {
  if (!path) return ''
  return `${SUPABASE_URL}/storage/v1/object/public/${path}`
}

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
