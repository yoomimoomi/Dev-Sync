import { useEffect, useMemo, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { FilterSidebar } from '@/components/filter-sidebar'
import { ProjectCard, type Project } from '@/components/project-card'
import { API_BASE_URL } from '@/lib/api-config'
import { useSearch } from '@/lib/search-context'

export function HomePage() {
  const { searchQuery } = useSearch()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const response = await fetch(`${API_BASE_URL}/projects`)
        if (!response.ok) {
          setLoadError(`Could not load projects (${response.status}).`)
          setProjects([])
          return
        }
        const data: unknown = await response.json()
        setProjects(Array.isArray(data) ? (data as Project[]) : [])
      } catch (error) {
        console.error('Error fetching projects:', error)
        setLoadError(
          `Unable to reach the API at ${API_BASE_URL}. Is the backend running?`,
        )
        setProjects([])
      } finally {
        setLoading(false)
      }
    }
    void fetchProjects()
  }, [])



  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects

    const query = searchQuery.toLowerCase()
    return projects.filter((project) => {
      const tags = [...project.roles, ...project.skills, ...project.technologies]
      const ownerName = project.owner?.name ?? ''
      return (
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        tags.some((tag) => tag.toLowerCase().includes(query)) ||
        ownerName.toLowerCase().includes(query)
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
            {loading && (
              <p className="text-sm text-muted-foreground">Loading projects…</p>
            )}
            {loadError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                <p>{loadError}</p>
                <p className="mt-2 text-muted-foreground">
                  Set <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_API_BASE_URL</code> in{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">client/.env</code> if your API is not at{' '}
                  {API_BASE_URL}.
                </p>
              </div>
            )}
            {!loading && !loadError && searchQuery && (
              <p className="text-sm text-muted-foreground">
                {filteredProjects.length} result{filteredProjects.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
              </p>
            )}
            {!loading && !loadError && filteredProjects.length > 0 && (
              <div className="space-y-4">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.project_id} project={project} />
                ))}
              </div>
            )}
            {!loading && !loadError && filteredProjects.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground">
                  {searchQuery.trim()
                    ? 'No projects found matching your search.'
                    : 'No projects yet. Create one after signing in.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
