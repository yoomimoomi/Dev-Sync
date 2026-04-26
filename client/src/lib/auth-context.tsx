"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

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

const TOKEN_STORAGE_KEY = "devsync_access_token"
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

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

type TokenResponse = { access_token: string; token_type: string }
type AccountRead = { user_id: string; name: string; email: string }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const fetchMeWithToken = useCallback(async (token: string): Promise<User | null> => {
    const res = await fetch(`${API_BASE_URL}/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const me = (await res.json()) as AccountRead
    return { id: me.user_id, name: me.name, email: me.email }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return
    fetchMeWithToken(token)
      .then((me) => {
        if (me) setUser(me)
        else localStorage.removeItem(TOKEN_STORAGE_KEY)
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      })
  }, [fetchMeWithToken])

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const body = new URLSearchParams()
      body.set("username", email)
      body.set("password", password)

      const res = await fetch(`${API_BASE_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })

      if (!res.ok) return { success: false, error: await readErrorMessage(res) }

      const token = (await res.json()) as TokenResponse
      localStorage.setItem(TOKEN_STORAGE_KEY, token.access_token)

      const me = await fetchMeWithToken(token.access_token)
      if (!me) return { success: false, error: "Could not validate account" }

      setUser(me)
      return { success: true }
    },
    [fetchMeWithToken]
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
    localStorage.removeItem(TOKEN_STORAGE_KEY)
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
