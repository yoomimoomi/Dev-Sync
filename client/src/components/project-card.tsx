import { Link } from "react-router-dom"
import { UserProfileLink } from "@/components/user-profile-link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatTimeAgo } from "@/lib/datetime-display"

export interface Project {
  project_id: string
  owner?: {
    user_id?: string
    name?: string
    avatar?: string | null
  } | null
  title: string
  description: string
  status: string
  grade: string
  roles: string[]
  skills: string[]
  technologies: string[]
  created_at: string
  applicant_user_names: Array<string | null>
  /** Roles filled by accepted team members. */
  filled_roles?: string[]
  /** Users with Accepted join applications (from API). */
  accepted_team_members?: Array<{
    user_id: string
    name?: string | null
    email?: string | null
    avatar?: string | null
    project_role?: string | null
  }>
  comments: Array<{
    comment_id: string
    user_id: string
    project_id: string
    content: string | null
    created_at: string | null
    reply_to: string | null
    user: {
      name: string
      avatar?: string | null
    } | null
  }>
}

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const tags = [...project.roles, ...project.skills, ...project.technologies]
  const ownerName = project.owner?.name?.trim() || 'Unknown'
  const ownerAvatar = project.owner?.avatar || undefined

  const ownerUserId = project.owner?.user_id

  return (
    <Card className="transition-all hover:border-primary/50 hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {ownerUserId ? (
              <UserProfileLink
                userId={ownerUserId}
                name={ownerName}
                avatar={ownerAvatar}
                size="lg"
              />
            ) : (
              <span className="font-medium text-foreground">{ownerName}</span>
            )}
            <span>{formatTimeAgo(project.created_at)}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-secondary text-secondary-foreground text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <Link
          to={`/project/${project.project_id}`}
          className="mt-4 block cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <h3 className="text-lg font-semibold text-foreground">{project.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
        </Link>
      </CardContent>
    </Card>
  )
}
