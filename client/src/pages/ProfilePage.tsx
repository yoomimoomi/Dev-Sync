import { useEffect, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { ProfileProjectsPanel } from '@/components/profile-projects-panel'
import type { Project } from '@/components/project-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Calendar, Edit, GraduationCap } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const TOKEN_STORAGE_KEY = 'devsync_access_token'

type Profile = {
  user_id: string
  name: string
  email: string
  grade: string | null
  roles: string[]
  skills: string[]
  technologies: string[]
  avatar: string | null
  school: string | null
  bio: string | null
}

function firstInitial(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

// UI uses comma-separated text for list fields; we round-trip through these helpers
// so the user can type "react, fastapi" and we send ["react","fastapi"] to the API.
function listToText(values: string[] | null | undefined) {
  return (values ?? []).join(', ')
}

function textToList(text: string) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// FastAPI returns `detail: string` for most errors and `detail: ValidationError[]` for 422.
// Flatten both into one human-readable line so the dialog can show the real cause.
type ValidationIssue = { loc?: Array<string | number>; msg?: string }

async function extractErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { detail?: string | ValidationIssue[] }
    | null
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((issue) => {
        const field = (issue.loc ?? []).filter((p) => p !== 'body').join('.')
        return field ? `${field}: ${issue.msg ?? 'invalid'}` : (issue.msg ?? 'invalid')
      })
      .join('; ')
  }
  return `Request failed (${response.status})`
}

export function ProfilePage() {
  const [createdProjects, setCreatedProjects] = useState<Project[]>([])
  const [joinedProjects, setJoinedProjects] = useState<Project[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editGrade, setEditGrade] = useState('')
  const [editSchool, setEditSchool] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [editRoles, setEditRoles] = useState('')
  const [editSkills, setEditSkills] = useState('')
  const [editTechnologies, setEditTechnologies] = useState('')
  const [editError, setEditError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchProfilePageData = async () => {
      try {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (!token) return

        const profileResponse = await fetch(`${API_BASE_URL}/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!profileResponse.ok) throw new Error('Failed to fetch profile')

        const profileData: Profile = await profileResponse.json()

        const [createdResponse, joinedResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/projects/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/projects/user/${profileData.user_id}/joined`),
        ])

        if (!createdResponse.ok) throw new Error('Failed to fetch created projects')
        if (!joinedResponse.ok) throw new Error('Failed to fetch joined projects')

        const createdData: Project[] = await createdResponse.json()
        const joinedData: Project[] = await joinedResponse.json()

        setProfile(profileData)
        setCreatedProjects(createdData)
        setJoinedProjects(joinedData)
      } catch (error) {
        console.error('Error fetching profile page data:', error)
      }
    }
    fetchProfilePageData()
  }, [])

  const openEditDialog = () => {
    if (!profile) return
    setEditName(profile.name ?? '')
    setEditGrade(profile.grade ?? '')
    setEditSchool(profile.school ?? '')
    setEditBio(profile.bio ?? '')
    setEditAvatar(profile.avatar ?? '')
    setEditRoles(listToText(profile.roles))
    setEditSkills(listToText(profile.skills))
    setEditTechnologies(listToText(profile.technologies))
    setEditError('')
    setIsEditOpen(true)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError('')

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setEditError('You need to be logged in to edit your profile.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/user/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          grade: editGrade.trim() || null,
          school: editSchool.trim() || null,
          bio: editBio.trim() || null,
          avatar: editAvatar.trim() || null,
          roles: textToList(editRoles),
          skills: textToList(editSkills),
          technologies: textToList(editTechnologies),
        }),
      })

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response))
      }

      const updated: Profile = await response.json()
      setProfile(updated)
      setIsEditOpen(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
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
                  {profile?.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary">
                      {profile ? firstInitial(profile.name) : '?'}
                    </div>
                  )}
                  <h1 className="mt-4 text-xl font-bold text-foreground">{profile?.name ?? 'Profile'}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {profile && profile.roles.length > 0
                      ? profile.roles.join(' · ')
                      : profile?.grade
                        ? `${profile.grade} developer`
                        : 'Logged-in DevSync user'}
                  </p>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={openEditDialog}
                    disabled={!profile}
                  >
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
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {profile?.school?.trim() ? profile.school : 'School not set'}
                    </span>
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
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.bio?.trim() ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No bio yet. Click <span className="font-medium">Edit Profile</span> to add one.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Activity Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{createdProjects.length}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{joinedProjects.length}</p>
                    <p className="text-xs text-muted-foreground">Joined</p>
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
            <ProfileProjectsPanel
              createdProjects={createdProjects}
              joinedProjects={joinedProjects}
              createdHeading="Created Projects"
              joinedHeading="Collaborating On"
              createdDescription="Projects you started"
              joinedDescription="Projects you joined as a team member"
              emptyCreatedMessage="You haven't created any projects yet."
              emptyJoinedMessage="You aren't collaborating on any projects yet."
              showCreateButton
            />
          </div>
        </div>
      </main>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your public profile details.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSaveProfile}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="-mr-2 min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
            {editError ? (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {editError}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-grade">Grade</Label>
              <Input
                id="edit-grade"
                placeholder="e.g. Sophomore"
                value={editGrade}
                onChange={(e) => setEditGrade(e.target.value)}
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-school">School / University</Label>
              <Input
                id="edit-school"
                placeholder="e.g. Stanford University"
                value={editSchool}
                onChange={(e) => setEditSchool(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                placeholder="A short blurb about yourself, what you're working on, what you're looking to learn..."
                className="min-h-24"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-avatar">Avatar URL</Label>
              <Input
                id="edit-avatar"
                placeholder="https://..."
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
              />
              {editAvatar.trim() ? (
                <img
                  src={editAvatar}
                  alt="Avatar preview"
                  className="mt-2 h-16 w-16 rounded-full object-cover"
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-roles">Intended Roles</Label>
              <Input
                id="edit-roles"
                placeholder="Comma-separated, e.g. Frontend, Designer"
                value={editRoles}
                onChange={(e) => setEditRoles(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Roles you&apos;d like to take on in projects. Shown on your profile.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-skills">Skills</Label>
              <Input
                id="edit-skills"
                placeholder="Comma-separated, e.g. UI, Testing"
                value={editSkills}
                onChange={(e) => setEditSkills(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-technologies">Technologies</Label>
              <Input
                id="edit-technologies"
                placeholder="Comma-separated, e.g. React, FastAPI"
                value={editTechnologies}
                onChange={(e) => setEditTechnologies(e.target.value)}
              />
            </div>
            </div>

            <DialogFooter className="mt-4 shrink-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
