import { Link } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  /** Users with Accepted join applications (from API). */
  accepted_team_members?: Array<{
    user_id: string
    name?: string | null
    email?: string | null
    avatar?: string | null
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

  return (
    <Link to={`/project/${project.project_id}`} className="block">
      <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={ownerAvatar} alt={ownerName} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {ownerName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{ownerName}</span>
                <span>{formatTimeAgo(project.created_at)}</span>
              </div>
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
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-foreground">{project.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
