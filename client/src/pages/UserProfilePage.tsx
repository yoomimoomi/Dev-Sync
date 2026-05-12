import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Navbar } from '@/components/navbar'
import { ProjectCard, type Project } from '@/components/project-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { avatarUrl, API_BASE_URL } from '@/lib/api-config'

type PublicProfile = {
  user: {
    user_id: string
    name: string
    email: string
    grade: string | null
    bio: string | null
    roles: string[]
    skills: string[]
    technologies: string[]
    avatar_path?: string | null
  }
  stats: {
    created_projects: number
    joined_projects: number
    total_projects: number
  }
  created_projects: Project[]
  joined_projects: Project[]
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

export function UserProfilePage() {
  const { userId = '' } = useParams()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${userId}/public-profile`)
        if (!res.ok) throw new Error('Failed to load user profile')
        const data: PublicProfile = await res.json()
        setProfile(data)
      } catch (error) {
        console.error('Error loading public profile:', error)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }
    if (!userId) {
      setLoading(false)
      return
    }
    void fetchProfile()
  }, [userId])

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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">User not found</h1>
          <p className="mt-2 text-muted-foreground">This user does not exist.</p>
          <Link to="/" className="mt-6 inline-block text-primary hover:underline">
            Back to projects
          </Link>
        </main>
      </div>
    )
  }

  const tags = [...profile.user.roles, ...profile.user.skills, ...profile.user.technologies]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-4xl font-bold text-primary">
                    {profile.user.avatar_path ? (
                      <img
                        src={avatarUrl(profile.user.avatar_path)}
                        alt={profile.user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(profile.user.name)
                    )}
                  </div>
                  <h1 className="mt-4 text-xl font-bold text-foreground">{profile.user.name}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {profile.user.grade ? `${profile.user.grade} developer` : 'DevSync user'}
                  </p>
                </div>
                <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                  <p>{profile.user.email}</p>
                  <p>{profile.user.bio || 'No bio yet'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{profile.stats.created_projects}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{profile.stats.joined_projects}</p>
                    <p className="text-xs text-muted-foreground">Joined</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{profile.stats.total_projects}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tags yet</p>
                  ) : (
                    tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8 lg:col-span-2">
            <section>
              <h2 className="mb-4 text-xl font-bold text-foreground">Created Projects</h2>
              <div className="space-y-4">
                {profile.created_projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No created projects.</p>
                ) : (
                  profile.created_projects.map((project) => (
                    <ProjectCard key={project.project_id} project={project} />
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-bold text-foreground">Joined Projects</h2>
              <div className="space-y-4">
                {profile.joined_projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No joined projects.</p>
                ) : (
                  profile.joined_projects.map((project) => (
                    <ProjectCard key={project.project_id} project={project} />
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
