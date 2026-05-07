import { useEffect, useMemo, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { FilterSidebar } from '@/components/filter-sidebar'
import { ProjectCard, type Project} from '@/components/project-card'

import { useSearch } from '@/lib/search-context'

export function HomePage() {
  const { searchQuery } = useSearch()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Replace with your real backend endpoint
        //http://127.0.0.1:8000/projects
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



  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects

    const query = searchQuery.toLowerCase()
    return projects.filter((project) => {
      const tags = [...project.roles, ...project.skills, ...project.technologies]
      return (
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        tags.some((tag) => tag.toLowerCase().includes(query)) ||
        project.owner.name.toLowerCase().includes(query)
      )
    })
  }, [searchQuery, projects])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="w-full shrink-0 lg:w-72">
            <FilterSidebar />
          </div>
          <div className="flex-1 space-y-6">
            {searchQuery && (
              <p className="text-sm text-muted-foreground">
                {filteredProjects.length} result{filteredProjects.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
              </p>
            )}
            {filteredProjects.length > 0 ? (
              <div className="space-y-4">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.project_id} project={project} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground">No projects found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
