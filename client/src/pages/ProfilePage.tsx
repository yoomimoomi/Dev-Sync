import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '@/components/navbar'
import { ProjectCard, type Project } from '@/components/project-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, MapPin, Link as LinkIcon, Calendar, Edit, Github, Linkedin } from 'lucide-react'

const userProfile = {
  name: 'Sarah Chen',
  email: 'sarah.chen@university.edu',
  location: 'San Francisco, CA',
  website: 'sarahchen.dev',
  joinDate: 'September 2024',
  bio: 'Computer Science student passionate about AI/ML and building tools that help students learn more effectively. Looking to collaborate on impactful projects.',
  skills: [
    'React',
    'Python',
    'TypeScript',
    'Next.js',
    'AI/ML',
    'Node.js',
    'PostgreSQL',
    'Docker',
  ],
  github: 'sarahchen',
  linkedin: 'sarahchen',
  stats: {
    projectsCreated: 2,
    projectsJoined: 5,
    collaborators: 12,
  },
}

export function ProfilePage() {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/projects')
        if (!response.ok) throw new Error('Failed to fetch projects')
        const data: Project[] = await response.json()
        setProjects(data)
      } catch (error) {
        console.error('Error fetching projects:', error)
      }
    }
    fetchProjects()
  }, [])

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
                    {userProfile.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <h1 className="mt-4 text-xl font-bold text-foreground">{userProfile.name}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{userProfile.bio}</p>
                  <Button className="mt-4 w-full" variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{userProfile.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{userProfile.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <a href={`https://${userProfile.website}`} className="text-primary hover:underline">
                      {userProfile.website}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Joined {userProfile.joinDate}</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-center gap-4">
                  <a
                    href={`https://github.com/${userProfile.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                  <a
                    href={`https://linkedin.com/in/${userProfile.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
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
                    <p className="text-2xl font-bold text-primary">{userProfile.stats.projectsCreated}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{userProfile.stats.projectsJoined}</p>
                    <p className="text-xs text-muted-foreground">Joined</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{userProfile.stats.collaborators}</p>
                    <p className="text-xs text-muted-foreground">Collaborators</p>
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
                  {userProfile.skills.map((skill) => (
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
