import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Plus, Settings, Trash2, Eye, Users, Pencil } from 'lucide-react'
import { EditProjectDialog } from '@/components/edit-project-dialog'
import { ManageTeamDialog } from '@/components/manage-team-dialog'
import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/navbar'
import { type Project } from '@/components/project-card'
import { UserProfileLink } from '@/components/user-profile-link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge, type badgeVariants } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  openChatHub,
  readApiErrorMessage,
  TOKEN_STORAGE_KEY,
} from '@/lib/api-config'
import { OpenRolesBadges } from '@/components/open-roles-badges'
import { formatTimeAgo } from '@/lib/datetime-display'
import type { VariantProps } from 'class-variance-authority'

type JoinRequest = {
  user_id: string
  user_name: string
  user_avatar?: string | null
  project_id: string
  project_title: string
  role?: string | null
  status: string
  created_at: string
}

type OutgoingApplication = {
  project_id: string
  project_title: string
  role?: string | null
  status: string
  created_at: string
}

type StatusBadge = {
  label: string
  variant: NonNullable<VariantProps<typeof badgeVariants>['variant']>
}

function applicationStatusBadge(status: string): StatusBadge {
  const s = status.trim().toLowerCase()
  if (s === 'declined') return { label: 'Rejected', variant: 'destructive' }
  if (s === 'pending') return { label: 'Pending', variant: 'secondary' }
  if (s === 'accepted') return { label: 'Accepted', variant: 'default' }
  return { label: status.trim() || 'Unknown', variant: 'outline' }
}

export function ManageProjectsPage() {
  const [mounted, setMounted] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [outgoingApplications, setOutgoingApplications] = useState<OutgoingApplication[]>([])
  const [requestActionKey, setRequestActionKey] = useState<string | null>(null)
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null)
  const [projectToManageTeam, setProjectToManageTeam] = useState<Project | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadDashboard = useCallback(async (): Promise<Project[]> => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setProjects([])
      setJoinRequests([])
      setOutgoingApplications([])
      return []
    }

    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [projRes, appRes, outgoingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/projects/me`, { headers }),
        fetch(`${API_BASE_URL}/applications/my-projects`, { headers }),
        fetch(`${API_BASE_URL}/applications/me`, { headers }),
      ])

      let projData: Project[] = []
      if (projRes.ok) {
        projData = (await projRes.json()) as Project[]
        setProjects(projData)
      } else {
        setProjects([])
      }

      if (appRes.ok) {
        setJoinRequests((await appRes.json()) as JoinRequest[])
      } else {
        setJoinRequests([])
      }

      if (outgoingRes.ok) {
        setOutgoingApplications((await outgoingRes.json()) as OutgoingApplication[])
      } else {
        setOutgoingApplications([])
      }
      return projData
    } catch (error) {
      console.error('Error loading manage projects:', error)
      return []
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

  const handleDecline = async (req: JoinRequest) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return
    const key = `${req.user_id}-${req.project_id}-decline`
    setRequestActionKey(key)
    try {
      const res = await fetch(
        `${API_BASE_URL}/applications/${req.project_id}/${req.user_id}/decline`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) throw new Error('Failed to decline request')
      void loadDashboard()
    } catch (error) {
      console.error('Error declining request:', error)
    } finally {
      setRequestActionKey(null)
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return

    setDeletingProjectId(projectToDelete.project_id)
    setDeleteError(null)
    try {
      const res = await fetch(
        `${API_BASE_URL}/project/${projectToDelete.project_id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) {
        const message = await readApiErrorMessage(res)
        throw new Error(message)
      }
      setProjectToDelete(null)
      void loadDashboard()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete project'
      setDeleteError(message)
      console.error('Error deleting project:', error)
    } finally {
      setDeletingProjectId(null)
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
            {projects.map((project) => {
              const ownerName = project.owner?.name?.trim() || 'Unknown'
              const ownerAvatar = project.owner?.avatar || undefined
              return (
              <Card key={project.project_id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={ownerAvatar} alt={ownerName} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {ownerName.slice(0, 2).toUpperCase()}
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
                        <p className="text-sm text-muted-foreground">Created {formatTimeAgo(project.created_at)}</p>
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
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault()
                              setProjectToManageTeam(project)
                            }}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Manage Team
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault()
                              setProjectToEdit(project)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={(e) => {
                              e.preventDefault()
                              setDeleteError(null)
                              setProjectToDelete(project)
                            }}
                          >
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
                  {project.roles.length > 0 ? (
                    <OpenRolesBadges
                      roles={project.roles}
                      filledRoles={project.filled_roles ?? []}
                      className="mb-4"
                    />
                  ) : null}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {[...project.skills, ...project.technologies].slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {project.skills.length + project.technologies.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.skills.length + project.technologies.length - 4} more
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
            )})}
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
                      <UserProfileLink
                        userId={req.user_id}
                        name={req.user_name}
                        avatar={req.user_avatar}
                        size="md"
                      />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Wants to join &quot;{req.project_title}&quot;
                          {req.role ? (
                            <>
                              {' '}
                              as <span className="font-medium text-foreground">{req.role}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        onClick={() =>
                          openChatHub({
                            project_id: req.project_id,
                            project_title: req.project_title,
                            peer_user_id: req.user_id,
                            peer_name: req.user_name,
                            peer_avatar: req.user_avatar ?? null,
                          })
                        }
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                      </Button>
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
                        onClick={() => void handleDecline(req)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Outgoing Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {outgoingApplications.length === 0 ? (
                <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
                  No applications yet.
                </div>
              ) : (
                outgoingApplications.map((app) => {
                  const statusBadge = applicationStatusBadge(app.status)
                  return (
                    <div
                      key={app.project_id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-4"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          <Link
                            to={`/project/${app.project_id}`}
                            className="transition-colors hover:text-primary"
                          >
                            {app.project_title}
                          </Link>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Applied {formatTimeAgo(app.created_at)}
                          {app.role ? (
                            <>
                              {' '}
                              as <span className="font-medium text-foreground">{app.role}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <EditProjectDialog
          project={projectToEdit}
          open={projectToEdit !== null}
          onOpenChange={(open) => {
            if (!open) setProjectToEdit(null)
          }}
          onSaved={() => {
            setProjectToEdit(null)
            void loadDashboard()
          }}
        />

        <ManageTeamDialog
          project={projectToManageTeam}
          open={projectToManageTeam !== null}
          onOpenChange={(open) => {
            if (!open) setProjectToManageTeam(null)
          }}
          onUpdated={() => {
            void loadDashboard().then((list) => {
              setProjectToManageTeam((prev) => {
                if (!prev) return null
                return list.find((p) => p.project_id === prev.project_id) ?? prev
              })
            })
          }}
        />

        <AlertDialog
          open={projectToDelete !== null}
          onOpenChange={(open) => {
            if (!open && deletingProjectId === null) {
              setProjectToDelete(null)
              setDeleteError(null)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove &quot;{projectToDelete?.title}&quot; from
                Dev-Sync. Join requests and applications for this project will no longer
                appear. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError ? (
              <p className="text-sm text-destructive">{deleteError}</p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingProjectId !== null}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={deletingProjectId !== null}
                onClick={(e) => {
                  e.preventDefault()
                  void handleDeleteProject()
                }}
              >
                {deletingProjectId !== null ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
    </AuthGuard>
  )
}
