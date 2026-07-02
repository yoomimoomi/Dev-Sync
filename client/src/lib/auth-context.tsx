"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { API_BASE_URL, authFetch } from "@/lib/api-config"
import { resetSupabaseRealtimeClient } from "@/lib/supabase-realtime"

interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

type AuthResult = { success: boolean; error?: string }

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  register: (name: string, email: string, password: string) => Promise<AuthResult>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as unknown
    if (typeof body === "object" && body !== null && "detail" in body) {
      const detail = (body as { detail?: unknown }).detail
      if (typeof detail === "string") return detail
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0] as unknown
        if (typeof first === "object" && first !== null && "msg" in first) {
          const msg = (first as { msg?: unknown }).msg
          if (typeof msg === "string") return msg
        }
      }
    }
  } catch {
    // ignore
  }
  return `${res.status} ${res.statusText}`.trim()
}

type AccountRead = { user_id: string; name: string; email: string }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const fetchMe = useCallback(async (): Promise<User | null> => {
    const res = await authFetch(`${API_BASE_URL}/user/me`)
    if (!res.ok) return null
    const me = (await res.json()) as AccountRead
    return { id: me.user_id, name: me.name, email: me.email }
  }, [])

  useEffect(() => {
    fetchMe()
      .then((me) => {
        if (me) setUser(me)
      })
      .catch(() => {})
  }, [fetchMe])

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const body = new URLSearchParams()
      body.set("username", email)
      body.set("password", password)

      const res = await authFetch(`${API_BASE_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })

      if (!res.ok) return { success: false, error: await readErrorMessage(res) }

      await res.json().catch(() => null)
      resetSupabaseRealtimeClient()

      const me = await fetchMe()
      if (!me) return { success: false, error: "Could not validate account" }

      setUser(me)
      return { success: true }
    },
    [fetchMe]
  )

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<AuthResult> => {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      if (!res.ok) return { success: false, error: await readErrorMessage(res) }

      // After creating the account, get a token and validate it like login.
      return await login(email, password)
    },
    [login]
  )

  const logout = useCallback(() => {
    void authFetch(`${API_BASE_URL}/auth/logout`, { method: "POST" })
    resetSupabaseRealtimeClient()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
