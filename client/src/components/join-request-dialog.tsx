import {
  type FormEvent,
  type ReactNode,
  useState,
} from 'react'
import { CheckCircle, Send, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  APPLICATION_SUBMITTED_EVENT,
  API_BASE_URL,
  readApiErrorMessage,
  TOKEN_STORAGE_KEY,
} from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

interface JoinRequestDialogProps {
  projectId: string
  projectTitle: string
  projectOwner: string
  /** Open roles still available to apply for. */
  projectRoles?: string[]
  /** Roles already filled by accepted members. */
  filledRoles?: string[]
  intent?: 'join' | 'contact'
  children: ReactNode
}

export function JoinRequestDialog({
  projectId,
  projectTitle,
  projectOwner,
  projectRoles = [],
  filledRoles = [],
  children,
}: JoinRequestDialogProps) {
  const { isAuthenticated, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  const filledSet = new Set(filledRoles.map((r) => r.trim()).filter(Boolean))
  const offeredRoles = projectRoles.map((r) => r.trim()).filter(Boolean)
  const selectableRoles = offeredRoles.filter((r) => !filledSet.has(r))

  const resetFormAndCloseSoon = () => {
    setSubmitted(true)
    setTimeout(() => {
      setOpen(false)
      setSubmitted(false)
      setSubmitError(null)
      setDescription('')
      setSelectedRole('')
    }, 2000)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setSubmitError('You are not logged in.')
      return
    }

    const trimmedProjectId = projectId.trim()
    if (!trimmedProjectId) {
      setSubmitError('Missing project identifier.')
      return
    }

    if (!user?.id) {
      setSubmitError('Could not determine current user.')
      return
    }

    const content = description.trim()
    if (content.length < 8) {
      setSubmitError('Please fill in enough detail before sending.')
      return
    }

    const role = selectedRole.trim()
    if (selectableRoles.length > 0 && !role) {
      setSubmitError('Please select which role you are applying for.')
      return
    }
    if (role && filledSet.has(role)) {
      setSubmitError('This role is no longer available.')
      return
    }

    const requestPayload = {
      user_id: user.id,
      project_id: trimmedProjectId,
      status: 'Pending',
      content,
      ...(role ? { role } : {}),
    }

    setPending(true)
    try {
      const res = await fetch(`${API_BASE_URL}/application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload),
      })

      if (!res.ok) {
        setSubmitError(await readApiErrorMessage(res))
        return
      }

      window.dispatchEvent(new CustomEvent(APPLICATION_SUBMITTED_EVENT))
      resetFormAndCloseSoon()
    } catch {
      setSubmitError('Unable to submit. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSubmitError(null)
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={
          isAuthenticated
            ? 'max-h-[90vh] overflow-y-auto sm:max-w-lg'
            : 'sm:max-w-md'
        }
      >
        {!isAuthenticated ? (
          <>
            <DialogHeader>
              <DialogTitle>Login Required</DialogTitle>
              <DialogDescription>
                Please log in to request to join this project.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <User className="h-16 w-16 text-muted-foreground" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Use the login button in the navigation bar to sign in to your
              account.
            </p>
          </>
        ) : submitted ? (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle>Request Sent!</DialogTitle>
            <DialogDescription>
              Your request to join &quot;{projectTitle}&quot; has been sent to{' '}
              {projectOwner}. You&apos;ll receive a notification when they
              respond.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request to Join Project</DialogTitle>
              <DialogDescription>
                Tell the project owner of &quot;{projectTitle}&quot; why you
                want to join.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-4">
              {submitError && (
                <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </p>
              )}
              {offeredRoles.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="jr-role">Role you&apos;re applying for</Label>
                  {selectableRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      All open roles are currently filled.
                    </p>
                  ) : (
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger id="jr-role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="jr-motivation">Why do you want to join?</Label>
                <Textarea
                  id="jr-motivation"
                  placeholder="What excites you about this project? What do you hope to learn or contribute?"
                  className="min-h-[80px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  <Send className="mr-2 h-4 w-4" />
                  {pending ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
