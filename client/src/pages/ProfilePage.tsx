import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '@/components/navbar'
import { ProjectCard, type Project } from '@/components/project-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Calendar, Edit, User } from 'lucide-react'
import { API_BASE_URL, authFetch } from '@/lib/api-config'

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

export function ProfilePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const fetchProfilePageData = async () => {
      try {
        const [profileResponse, projectsResponse] = await Promise.all([
          authFetch(`${API_BASE_URL}/user/me`),
          authFetch(`${API_BASE_URL}/projects/me`),
        ])

        if (!profileResponse.ok) throw new Error('Failed to fetch profile')
        if (!projectsResponse.ok) throw new Error('Failed to fetch projects')

        const profileData: Profile = await profileResponse.json()
        const projectData: Project[] = await projectsResponse.json()

        setProfile(profileData)
        setProjects(projectData)
      } catch (error) {
        console.error('Error fetching profile page data:', error)
      }
    }
    fetchProfilePageData()
  }, [])

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
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary">
                    {profile ? initials(profile.name) : '??'}
                  </div>
                  <h1 className="mt-4 text-xl font-bold text-foreground">{profile?.name ?? 'Profile'}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {profile?.grade ? `${profile.grade} developer` : 'Logged-in DevSync user'}
                  </p>
                  <Button className="mt-4 w-full" variant="outline">
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
    </div>
  )
}
