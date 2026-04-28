import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from 'react'
import {
  Briefcase,
  CheckCircle,
  GraduationCap,
  Send,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
  intent?: 'join' | 'contact'
  children: ReactNode
}

export function JoinRequestDialog({
  projectId,
  projectTitle,
  projectOwner,
  intent = 'join',
  children,
}: JoinRequestDialogProps) {
  const { isAuthenticated, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [formData, setFormData] = useState({
    role: '',
    experience: '',
    motivation: '',
    availability: '',
    portfolio: '',
  })

  useEffect(() => {
    if (!open || !user) return
    setName(user.name ?? '')
    setEmail(user.email ?? '')
  }, [open, user])

  const buildContentPayload = (): string => {
    const body = {
      intent,
      projectTitle,
      projectOwner,
      applicant_name: name.trim(),
      applicant_email: email.trim(),
      role: formData.role,
      experience: formData.experience.trim(),
      motivation: formData.motivation.trim(),
      availability: formData.availability,
      portfolio: formData.portfolio.trim() || undefined,
    }
    return JSON.stringify(body, null, 2)
  }

  const resetFormAndCloseSoon = () => {
    setSubmitted(true)
    setTimeout(() => {
      setOpen(false)
      setSubmitted(false)
      setSubmitError(null)
      setFormData({
        role: '',
        experience: '',
        motivation: '',
        availability: '',
        portfolio: '',
      })
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

    if (!projectId.trim()) {
      setSubmitError('Missing project identifier.')
      return
    }

    if (!formData.role.trim()) {
      setSubmitError('Please select your desired role.')
      return
    }

    const content = buildContentPayload()
    if (content.length < 8) {
      setSubmitError('Please fill in enough detail before sending.')
      return
    }

    setPending(true)
    try {
      const res = await fetch(`${API_BASE_URL}/application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ project_id: projectId, content }),
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
                Introduce yourself to the project owner of &quot;
                {projectTitle}&quot;. A good introduction increases your chances
                of being accepted.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-4">
              {submitError && (
                <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jr-name">Your Name</Label>
                  <Input
                    id="jr-name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jr-email">Email</Label>
                  <Input
                    id="jr-email"
                    type="email"
                    placeholder="john@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jr-role" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Desired Role
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger id="jr-role">
                    <SelectValue placeholder="Select your preferred role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frontend">Frontend Developer</SelectItem>
                    <SelectItem value="backend">Backend Developer</SelectItem>
                    <SelectItem value="fullstack">Full Stack Developer</SelectItem>
                    <SelectItem value="designer">UI/UX Designer</SelectItem>
                    <SelectItem value="mobile">Mobile Developer</SelectItem>
                    <SelectItem value="ml">ML/AI Engineer</SelectItem>
                    <SelectItem value="pm">Project Manager</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="jr-experience"
                  className="flex items-center gap-2"
                >
                  <GraduationCap className="h-4 w-4" />
                  Relevant Experience
                </Label>
                <Textarea
                  id="jr-experience"
                  placeholder="Describe your relevant skills and experience. What technologies are you familiar with? Have you worked on similar projects?"
                  className="min-h-[80px]"
                  value={formData.experience}
                  onChange={(e) =>
                    setFormData({ ...formData, experience: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jr-motivation">Why do you want to join?</Label>
                <Textarea
                  id="jr-motivation"
                  placeholder="What excites you about this project? What do you hope to learn or contribute?"
                  className="min-h-[80px]"
                  value={formData.motivation}
                  onChange={(e) =>
                    setFormData({ ...formData, motivation: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jr-avail">Weekly Availability</Label>
                  <Select
                    value={formData.availability}
                    onValueChange={(value) =>
                      setFormData({ ...formData, availability: value })
                    }
                  >
                    <SelectTrigger id="jr-avail">
                      <SelectValue placeholder="Hours per week" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">{'< 5 hours'}</SelectItem>
                      <SelectItem value="10">5-10 hours</SelectItem>
                      <SelectItem value="20">10-20 hours</SelectItem>
                      <SelectItem value="20+">20+ hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jr-portfolio">Portfolio/GitHub (Optional)</Label>
                  <Input
                    id="jr-portfolio"
                    placeholder="https://github.com/username"
                    value={formData.portfolio}
                    onChange={(e) =>
                      setFormData({ ...formData, portfolio: e.target.value })
                    }
                  />
                </div>
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
