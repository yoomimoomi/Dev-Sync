import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Search, User, LogOut, LogIn, X, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NotificationPopover } from "@/components/notification-popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useSearch } from "@/lib/search-context"
import { useTheme } from "@/lib/theme-context"

export function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, login, register, logout } = useAuth()
  const { searchQuery, setSearchQuery } = useSearch()
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  const navLinks = [
    { href: "/manage-projects", label: "Manage Projects" },
    { href: "/create-project", label: "Create New Project" },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (pathname !== "/") {
      navigate("/")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    const success =
      authMode === "login" ? await login(email, password) : await register(name, email, password)
    if (success) {
      setShowLoginDialog(false)
      setAuthMode("login")
      setName("")
      setEmail("")
      setPassword("")
    } else {
      setLoginError(authMode === "login" ? "Invalid credentials" : "Unable to create account")
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-bold text-foreground">
              DevSync
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname === link.href
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {showSearch ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <Input
                  type="search"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 md:w-64"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery("")
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearch(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>
            )}

            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground"
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            )}

            {mounted && isAuthenticated && <NotificationPopover />}

            {mounted ? (
              isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full border-2 border-primary text-primary hover:bg-primary/10"
                    >
                      <User className="h-5 w-5" />
                      <span className="sr-only">Profile</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLoginDialog(true)}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Log in
                </Button>
              )
            ) : (
              <div className="w-16 h-8" />
            )}
          </div>
        </div>
      </header>

      <Dialog
        open={showLoginDialog}
        onOpenChange={(open) => {
          setShowLoginDialog(open)
          if (!open) {
            setAuthMode("login")
            setLoginError("")
            setName("")
            setEmail("")
            setPassword("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {authMode === "login" ? "Log in to DevSync" : "Create your DevSync account"}
            </DialogTitle>
            <DialogDescription>
              {authMode === "login"
                ? "Enter your credentials to access your account"
                : "Enter your details to get started"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={authMode === "login" ? "default" : "outline"}
                onClick={() => {
                  setAuthMode("login")
                  setLoginError("")
                }}
              >
                Log in
              </Button>
              <Button
                type="button"
                variant={authMode === "register" ? "default" : "outline"}
                onClick={() => {
                  setAuthMode("register")
                  setLoginError("")
                }}
              >
                Register
              </Button>
            </div>

            {authMode === "register" && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {loginError && (
              <p className="text-sm text-destructive">{loginError}</p>
            )}
            <Button type="submit" className="w-full">
              {authMode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
