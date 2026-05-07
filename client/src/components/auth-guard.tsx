import { type ReactNode, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, login, register } = useAuth()
  const navigate = useNavigate()
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const result =
      authMode === "login"
        ? await login(email, password)
        : await register(name, email, password)
    if (!result.success) {
      setError(result.error ?? "Authentication failed")
    }
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <>
      {children}

      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) navigate("/")
        }}
      >
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              {authMode === "login"
                ? "Please log in to access this page."
                : "Create an account to get started."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={authMode === "login" ? "default" : "outline"}
                onClick={() => {
                  setAuthMode("login")
                  setError("")
                }}
              >
                Log in
              </Button>
              <Button
                type="button"
                variant={authMode === "register" ? "default" : "outline"}
                onClick={() => {
                  setAuthMode("register")
                  setError("")
                }}
              >
                Register
              </Button>
            </div>

            {authMode === "register" && (
              <div className="space-y-2">
                <label htmlFor="ag-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="ag-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="ag-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="ag-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ag-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="ag-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full">
              {authMode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
