import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '@/components/navbar'
import { ProjectCard, type Project } from '@/components/project-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mail, Calendar, Edit, User, Camera } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const TOKEN_STORAGE_KEY = 'devsync_access_token'
const AVATAR_STORAGE_PREFIX = 'devsync_avatar_'

const GRADE_OPTIONS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate']

type Profile = {
  user_id: string
  name: string
  email: string
  grade: string | null
  roles: string[]
  skills: string[]
  technologies: string[]
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getStoredAvatar(userId: string): string | null {
  return localStorage.getItem(`${AVATAR_STORAGE_PREFIX}${userId}`)
}

function saveStoredAvatar(userId: string, dataUrl: string) {
  localStorage.setItem(`${AVATAR_STORAGE_PREFIX}${userId}`, dataUrl)
}

export function ProfilePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [grade, setGrade] = useState('')
  const [picturePreview, setPicturePreview] = useState<string | null>(null)
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProfilePageData = async () => {
      try {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (!token) return

        const [profileResponse, projectsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/projects/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (!profileResponse.ok) throw new Error('Failed to fetch profile')
        if (!projectsResponse.ok) throw new Error('Failed to fetch projects')

        const profileData: Profile = await profileResponse.json()
        const projectData: Project[] = await projectsResponse.json()

        setProfile(profileData)
        setProjects(projectData)
        setAvatarUrl(getStoredAvatar(profileData.user_id))
      } catch (error) {
        console.error('Error fetching profile page data:', error)
      }
    }
    fetchProfilePageData()
  }, [])

  const openEditDialog = () => {
    if (!profile) return
    const parts = profile.name.trim().split(' ')
    setFirstName(parts[0] ?? '')
    setLastName(parts.slice(1).join(' '))
    setEmail(profile.email)
    setGrade(profile.grade ?? '')
    setPicturePreview(avatarUrl)
    setPictureFile(null)
    setSaveError(null)
    setEditOpen(true)
  }

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPictureFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPicturePreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setSaveError(null)

    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')

      const body: Record<string, string | null> = {}
      if (fullName !== profile.name) body.name = fullName
      if (email !== profile.email) body.email = email
      if ((grade || null) !== profile.grade) body.grade = grade || null

      if (Object.keys(body).length > 0) {
        const res = await fetch(`${API_BASE_URL}/user/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail ?? 'Failed to update profile')
        }
        const updated: Profile = await res.json()
        setProfile(updated)
      }

      if (pictureFile && picturePreview) {
        saveStoredAvatar(profile.user_id, picturePreview)
        setAvatarUrl(picturePreview)
      }

      setEditOpen(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const profileTags = profile ? [...profile.roles, ...profile.skills, ...profile.technologies] : []

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      profile ? initials(profile.name) : '??'
                    )}
                  </div>
                  <h1 className="mt-4 text-xl font-bold text-foreground">{profile?.name ?? 'Profile'}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {profile?.grade ? `${profile.grade} developer` : 'Logged-in DevSync user'}
                  </p>
                  <Button className="mt-4 w-full" variant="outline" onClick={openEditDialog}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{profile?.email ?? 'No email available'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{profile?.user_id ?? 'No user id available'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {profile?.grade ? `Grade: ${profile.grade}` : 'Grade not set'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Activity Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{projects.length}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{profile?.roles.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Roles</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{profileTags.length}</p>
                    <p className="text-xs text-muted-foreground">Tags</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profileTags.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">My Projects</h2>
              <p className="text-sm text-muted-foreground">Projects you&apos;ve created and are collaborating on</p>
            </div>

            <div className="space-y-4">
              {projects.map((project) => (
                <ProjectCard key={project.project_id} project={project} />
              ))}
            </div>

            {projects.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">You haven&apos;t created any projects yet.</p>
                  <Button className="mt-4" asChild>
                    <Link to="/create-project">Create Your First Project</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Profile picture */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary overflow-hidden ring-2 ring-border hover:ring-primary transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                {picturePreview ? (
                  <img src={picturePreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <span>{firstName || lastName ? initials(`${firstName} ${lastName}`) : '??'}</span>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                Change picture
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePictureChange}
              />
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {/* Grade */}
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
