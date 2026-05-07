import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Settings, Trash2, Eye, Users } from 'lucide-react'
import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/navbar'
import { type Project } from '@/components/project-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  API_BASE_URL,
  APPLICATION_SUBMITTED_EVENT,
  TOKEN_STORAGE_KEY,
} from '@/lib/api-config'

type JoinRequest = {
  user_id: string
  user_name: string
  project_id: string
  project_title: string
  status: string
  created_at: string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : parts[0]?.[1] ?? ''
  return (first + second).toUpperCase() || '??'
}

export function ManageProjectsPage() {
  const [mounted, setMounted] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [requestActionKey, setRequestActionKey] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadDashboard = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setProjects([])
      setJoinRequests([])
      return
    }

    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [projRes, appRes] = await Promise.all([
        fetch(`${API_BASE_URL}/projects/me`, { headers }),
        fetch(`${API_BASE_URL}/applications/my-projects`, { headers }),
      ])

      if (projRes.ok) {
        setProjects((await projRes.json()) as Project[])
      } else {
        setProjects([])
      }

      if (appRes.ok) {
        setJoinRequests((await appRes.json()) as JoinRequest[])
      } else {
        setJoinRequests([])
      }
    } catch (error) {
      console.error('Error loading manage projects:', error)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const onSubmitted = () => {
      void loadDashboard()
    }
    window.addEventListener(APPLICATION_SUBMITTED_EVENT, onSubmitted)
    return () =>
      window.removeEventListener(APPLICATION_SUBMITTED_EVENT, onSubmitted)
  }, [loadDashboard])

  const handleAccept = async (req: JoinRequest) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return
    const key = `${req.user_id}-${req.project_id}-accept`
    setRequestActionKey(key)
    try {
      const res = await fetch(
        `${API_BASE_URL}/applications/${req.project_id}/${req.user_id}/accept`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) throw new Error('Failed to accept request')
      void loadDashboard()
    } catch (error) {
      console.error('Error accepting request:', error)
    } finally {
      setRequestActionKey(null)
    }
  }

  const handleDelete = async (req: JoinRequest) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return
    const key = `${req.user_id}-${req.project_id}-delete`
    setRequestActionKey(key)
    try {
      const res = await fetch(
        `${API_BASE_URL}/applications/${req.project_id}/${req.user_id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) throw new Error('Failed to delete request')
      void loadDashboard()
    } catch (error) {
      console.error('Error deleting request:', error)
    } finally {
      setRequestActionKey(null)
    }
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
            <p className="mt-1 text-muted-foreground">Manage and track your created projects</p>
          </div>
          <Button asChild>
            <Link to="/create-project">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <div className="mb-4 text-muted-foreground">You haven&apos;t created any projects yet</div>
              <Button asChild>
                <Link to="/create-project">Create Your First Project</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <Card key={project.project_id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" alt={project.owner.name} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {project.owner.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          <Link
                            to={`/project/${project.project_id}`}
                            className="transition-colors hover:text-primary"
                          >
                            {project.title}
                          </Link>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">Created on {project.created_at}</p>
                      </div>
                    </div>
                    {mounted ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                            <span className="sr-only">Project settings</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/project/${project.project_id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Project
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Users className="mr-2 h-4 w-4" />
                            Manage Team
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Project settings</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {[...project.roles, ...project.skills, ...project.technologies].slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {project.roles.length + project.skills.length + project.technologies.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.roles.length + project.skills.length + project.technologies.length - 4} more
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {project.applicant_user_names.length} request{project.applicant_user_names.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Join Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {joinRequests.length === 0 ? (
                <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
                  No join requests yet.
                </div>
              ) : (
                joinRequests.map((req) => (
                  <div
                    key={`${req.user_id}-${req.project_id}`}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials(req.user_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{req.user_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Wants to join &quot;{req.project_title}&quot;
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={requestActionKey !== null}
                        onClick={() => void handleAccept(req)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={requestActionKey !== null}
                        onClick={() => void handleDelete(req)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
    </AuthGuard>
  )
}
