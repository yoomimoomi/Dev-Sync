import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Navbar } from '@/components/navbar'
import { ProfileProjectsPanel } from '@/components/profile-projects-panel'
import type { Project } from '@/components/project-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { Calendar, GraduationCap } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

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

export function UserProfilePage() {
  const { userId = '' } = useParams()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [createdProjects, setCreatedProjects] = useState<Project[]>([])
  const [joinedProjects, setJoinedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const isOwnProfile = authUser?.id === userId

  useEffect(() => {
    if (!userId) return
    if (isOwnProfile) {
      navigate('/profile', { replace: true })
      return
    }

    const fetchProfile = async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const [profileResponse, createdResponse, joinedResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/users/${userId}`),
          fetch(`${API_BASE_URL}/projects/user/${userId}`),
          fetch(`${API_BASE_URL}/projects/user/${userId}/joined`),
        ])

        if (profileResponse.status === 404) {
          setNotFound(true)
          setProfile(null)
          setCreatedProjects([])
          setJoinedProjects([])
          return
        }

        if (!profileResponse.ok) throw new Error('Failed to fetch profile')
        if (!createdResponse.ok) throw new Error('Failed to fetch created projects')
        if (!joinedResponse.ok) throw new Error('Failed to fetch joined projects')

        const profileData: Profile = await profileResponse.json()
        const createdData: Project[] = await createdResponse.json()
        const joinedData: Project[] = await joinedResponse.json()
        setProfile(profileData)
        setCreatedProjects(createdData)
        setJoinedProjects(joinedData)
      } catch (error) {
        console.error('Error fetching user profile:', error)
        setProfile(null)
        setCreatedProjects([])
        setJoinedProjects([])
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId, isOwnProfile, navigate])

  const profileTags = profile ? [...profile.roles, ...profile.skills, ...profile.technologies] : []

  if (isOwnProfile) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </main>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">User not found</h1>
          <p className="mt-2 text-muted-foreground">This profile does not exist.</p>
          <Button className="mt-6" asChild>
            <Link to="/">Back to home</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary">
                      {firstInitial(profile.name)}
                    </div>
                  )}
                  <h1 className="mt-4 text-xl font-bold text-foreground">{profile.name}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {profile.roles.length > 0
                      ? profile.roles.join(' · ')
                      : profile.grade
                        ? `${profile.grade} developer`
                        : 'DevSync member'}
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {profile.school?.trim() ? profile.school : 'School not set'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {profile.grade ? `Grade: ${profile.grade}` : 'Grade not set'}
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
                {profile.bio?.trim() ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{profile.bio}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">No bio yet.</p>
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
                {profileTags.length > 0 ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground">No skills listed yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <ProfileProjectsPanel
              createdProjects={createdProjects}
              joinedProjects={joinedProjects}
              createdHeading={`${profile.name}'s Created Projects`}
              joinedHeading={`${profile.name}'s Collaborations`}
              createdDescription="Projects this user started"
              joinedDescription="Projects this user joined as a team member"
              emptyCreatedMessage="This user hasn't created any projects yet."
              emptyJoinedMessage="This user isn't collaborating on any projects yet."
            />
          </div>
        </div>
      </main>
    </div>
  )
}
