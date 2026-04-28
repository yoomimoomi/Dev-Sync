import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Users, Calendar, MapPin } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockProjects, mockComments } from '@/lib/mock-data'
import { CommentSection } from '@/components/comment-section'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import type { Project } from '@/components/project-card'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export function ProjectPage() {
  const { id = '' } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  
  useEffect(() => { 
    const fetchProject = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/project/${id}`)
        if (!response.ok) throw new Error('Failed to fetch project')
        const data: Project = await response.json()
        setProject(data)  
      } catch (error) {
        console.error('Error fetching projects:', error)
      }
    }
    fetchProject()
  }, [id])

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

  const projectComments = mockComments.filter((c) => c.projectId === id)

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

                  <h3 className="font-semibold text-foreground">What We&apos;re Building</h3>

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
