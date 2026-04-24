import { useMemo } from 'react'
import { Navbar } from '@/components/navbar'
import { FilterSidebar } from '@/components/filter-sidebar'
import { ProjectCard } from '@/components/project-card'
import { mockProjects } from '@/lib/mock-data'
import { useSearch } from '@/lib/search-context'

export function HomePage() {
  const { searchQuery } = useSearch()

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return mockProjects

    const query = searchQuery.toLowerCase()
    return mockProjects.filter(
      (project) =>
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        project.author.name.toLowerCase().includes(query),
    )
  }, [searchQuery])

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
              filteredProjects.map((project) => <ProjectCard key={project.id} project={project} />)
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
