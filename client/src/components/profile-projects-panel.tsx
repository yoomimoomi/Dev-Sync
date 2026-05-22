import { Link } from 'react-router-dom'
import { ProjectCard, type Project } from '@/components/project-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type ProfileProjectsPanelProps = {
  createdProjects: Project[]
  joinedProjects: Project[]
  createdHeading: string
  joinedHeading: string
  createdDescription: string
  joinedDescription: string
  emptyCreatedMessage: string
  emptyJoinedMessage: string
  showCreateButton?: boolean
}

function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <ProjectCard key={project.project_id} project={project} />
      ))}
    </div>
  )
}

export function ProfileProjectsPanel({
  createdProjects,
  joinedProjects,
  createdHeading,
  joinedHeading,
  createdDescription,
  joinedDescription,
  emptyCreatedMessage,
  emptyJoinedMessage,
  showCreateButton = false,
}: ProfileProjectsPanelProps) {
  return (
    <div className="space-y-10">
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">{createdHeading}</h2>
          <p className="text-sm text-muted-foreground">{createdDescription}</p>
        </div>
        {createdProjects.length > 0 ? (
          <ProjectList projects={createdProjects} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{emptyCreatedMessage}</p>
              {showCreateButton ? (
                <Button className="mt-4" asChild>
                  <Link to="/create-project">Create Your First Project</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">{joinedHeading}</h2>
          <p className="text-sm text-muted-foreground">{joinedDescription}</p>
        </div>
        {joinedProjects.length > 0 ? (
          <ProjectList projects={joinedProjects} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{emptyJoinedMessage}</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
