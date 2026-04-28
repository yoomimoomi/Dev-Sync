import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Users, Calendar, MapPin } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type Project } from '@/components/project-card'
import { CommentSection } from '@/components/comment-section'
import { Button } from '@/components/ui/button'
import type { Comment } from '@/lib/mock-data'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export function ProjectPage() {
  const { id = '' } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/projects/${id}`)
        if (!response.ok) throw new Error('Failed to fetch project')
        const data: Project = await response.json()
        setProject(data)
      } catch (error) {
        console.error('Error fetching project:', error)
        setProject(null)
      } finally {
        setLoading(false)
      }
    }

    if (!id) {
      setLoading(false)
      return
    }

    fetchProject()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Loading project...</p>
        </main>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">Project not found</h1>
          <p className="mt-2 text-muted-foreground">This project does not exist or was removed.</p>
          <Button className="mt-6" asChild>
            <Link to="/">Back to home</Link>
          </Button>
        </main>
      </div>
    )
  }

  const projectComments: Comment[] = project.comments.map((comment) => ({
    id: `${comment.user_id}-${comment.project_id}`,
    projectId: comment.project_id,
    author: { name: comment.user?.name ?? 'Unknown User' },
    content: comment.content ?? '',
    createdAt: comment.created_at ?? '',
  }))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="mb-4 flex flex-wrap gap-2">
                  {[...project.roles, ...project.skills, ...project.technologies].map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <CardTitle className="text-2xl">{project.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <h3 className="mt-0 font-semibold text-foreground">About This Project</h3>
                  <p>{project.description}</p>
                  <p>
                    This project is looking for passionate students who want to make a difference. We welcome contributors
                    of all skill levels and are committed to providing mentorship and learning opportunities
                    throughout the development process.
                  </p>

                  <h3 className="font-semibold text-foreground">What We&apos;re Building</h3>
                  <ul>
                    <li>User-friendly interface with modern design principles</li>
                    <li>Scalable backend architecture</li>
                    <li>Integration with third-party services and APIs</li>
                    <li>Comprehensive testing and documentation</li>
                  </ul>

                  <h3 className="font-semibold text-foreground">Looking For</h3>
                  <ul>
                    <li>Frontend developers (React/Next.js experience preferred)</li>
                    <li>Backend developers familiar with Node.js or Python</li>
                    <li>UI/UX designers who can help improve the user experience</li>
                    <li>Anyone interested in learning and contributing!</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src="" alt={project.owner.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {project.owner.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{project.owner.name}</p>
                      <p className="text-xs text-muted-foreground">Project Lead</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <CommentSection projectId={id} initialComments={projectComments} />
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Posted:</span>
                    <span className="font-medium">{project.created_at}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Team Size:</span>
                    <span className="font-medium">1-4 members</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">Remote</span>
                  </div>
                </div>
                <div className="mt-6 space-y-3" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Owner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" alt={project.owner.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {project.owner.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{project.owner.name}</p>
                    <p className="text-sm text-muted-foreground">Computer Science, Senior</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
