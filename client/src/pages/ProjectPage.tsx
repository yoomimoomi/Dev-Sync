import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Users, Calendar } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { UserProfileLink } from '@/components/user-profile-link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type Project } from '@/components/project-card'
import { CommentSection } from '@/components/comment-section'
import { JoinRequestDialog } from '@/components/join-request-dialog'
import { OpenRolesBadges } from '@/components/open-roles-badges'
import { Button } from '@/components/ui/button'
import { openChatHub } from '@/lib/api-config'
import type { Comment } from '@/lib/mock-data'
import { formatTimeAgo } from '@/lib/datetime-display'

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

  // Flatten the API rows into the UI Comment shape, then nest replies under
  // their parents using `reply_to`. Replies that point at an unknown parent
  // fall back to top-level so they're never silently dropped.
  const flatById = new Map<string, Comment>()
  for (const c of project.comments) {
    flatById.set(c.comment_id, {
      id: c.comment_id,
      projectId: c.project_id,
      author: {
        userId: c.user_id,
        name: c.user?.name ?? 'Unknown User',
        avatar: c.user?.avatar ?? undefined,
      },
      content: c.content ?? '',
      createdAt: c.created_at ?? '',
      replies: [],
    })
  }
  const projectComments: Comment[] = []
  for (const c of project.comments) {
    const node = flatById.get(c.comment_id)
    if (!node) continue
    const parent = c.reply_to ? flatById.get(c.reply_to) : undefined
    if (parent) {
      parent.replies = [...(parent.replies ?? []), node]
    } else {
      projectComments.push(node)
    }
  }

  const ownerName = project.owner?.name?.trim() || 'Unknown'
  const ownerAvatar = project.owner?.avatar || undefined
  const ownerUserId = project.owner?.user_id
  const acceptedMembers = project.accepted_team_members ?? []
  const filledRoles = project.filled_roles ?? []

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
                {project.roles.length > 0 ? (
                  <OpenRolesBadges
                    roles={project.roles}
                    filledRoles={filledRoles}
                    className="mb-3"
                  />
                ) : null}
                <div className="mb-4 flex flex-wrap gap-2">
                  {[...project.skills, ...project.technologies].map((tag) => (
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {ownerUserId ? (
                    <div className="flex flex-col gap-0.5">
                      <UserProfileLink
                        userId={ownerUserId}
                        name={ownerName}
                        avatar={ownerAvatar}
                        size="md"
                      />
                      <p className="pl-11 text-xs text-muted-foreground">Project Lead</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">{ownerName}</p>
                      <p className="text-xs text-muted-foreground">Project Lead</p>
                    </div>
                  )}
                  {acceptedMembers.map((member) => {
                    const display = member.name?.trim() || member.email?.trim() || 'Member'
                    const memberAvatar = member.avatar || undefined
                    return (
                      <div key={member.user_id} className="flex flex-col gap-0.5">
                        <UserProfileLink
                          userId={member.user_id}
                          name={display}
                          avatar={memberAvatar}
                          size="md"
                        />
                        <p className="pl-11 text-xs text-muted-foreground">
                          {member.project_role?.trim() || 'Team member'}
                        </p>
                      </div>
                    )
                  })}
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
                    <span className="font-medium">{formatTimeAgo(project.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {project.applicant_user_names.length} applicant{project.applicant_user_names.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <JoinRequestDialog
                    projectId={project.project_id}
                    projectTitle={project.title}
                    projectOwner={ownerName}
                    projectRoles={project.roles}
                    filledRoles={filledRoles}
                  >
                    <Button type="button" className="w-full">
                      Request to Join
                    </Button>
                  </JoinRequestDialog>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={!ownerUserId}
                    onClick={() => {
                      if (ownerUserId) {
                        openChatHub({
                          project_id: project.project_id,
                          project_title: project.title,
                          peer_user_id: ownerUserId,
                          peer_name: ownerName,
                          peer_avatar: ownerAvatar ?? null,
                        })
                      }
                    }}
                  >
                    Message owner
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Owner</CardTitle>
              </CardHeader>
              <CardContent>
                {ownerUserId ? (
                  <UserProfileLink
                    userId={ownerUserId}
                    name={ownerName}
                    avatar={ownerAvatar}
                    size="lg"
                    nameClassName="text-base"
                  />
                ) : (
                  <p className="font-medium">{ownerName}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
