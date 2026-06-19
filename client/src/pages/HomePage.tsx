import { useEffect, useMemo, useRef, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { FilterSidebar } from '@/components/filter-sidebar'
import { ProjectCard, type Project } from '@/components/project-card'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import { API_BASE_URL } from '@/lib/api-config'
import { useSearch } from '@/lib/search-context'

const PAGE_SIZE = 6

function visiblePageItems(
  current: number,
  total: number,
): Array<number | 'ellipsis'> {
  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const items: Array<number | 'ellipsis'> = []
  const windowStart = Math.max(2, current - 1)
  const windowEnd = Math.min(total - 1, current + 1)
  items.push(1)
  if (windowStart > 2) items.push('ellipsis')
  for (let p = windowStart; p <= windowEnd; p++) items.push(p)
  if (windowEnd < total - 1) items.push('ellipsis')
  items.push(total)
  return items
}

export function HomePage() {
  const { searchQuery } = useSearch()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

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

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

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

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE))
  const effectivePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const prevEffectivePageRef = useRef<number | null>(null)
  useEffect(() => {
    const prev = prevEffectivePageRef.current
    prevEffectivePageRef.current = effectivePage
    if (prev !== null && prev !== effectivePage) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [effectivePage])

  const pageSlice = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE
    return filteredProjects.slice(start, start + PAGE_SIZE)
  }, [filteredProjects, effectivePage])

  const rangeStart =
    filteredProjects.length === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(
    effectivePage * PAGE_SIZE,
    filteredProjects.length,
  )

  const pageButtons = useMemo(
    () => visiblePageItems(effectivePage, totalPages),
    [effectivePage, totalPages],
  )

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
              <>
                <p className="text-sm text-muted-foreground">
                  {totalPages > 1
                    ? `Showing ${rangeStart}–${rangeEnd} of ${filteredProjects.length}`
                    : `${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''}`}
                </p>
                <div className="space-y-4">
                  {pageSlice.map((project) => (
                    <ProjectCard key={project.project_id} project={project} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <Pagination className="border-t border-border pt-6">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (effectivePage <= 1) return
                            setPage((p) => Math.max(1, p - 1))
                          }}
                          className={cn(
                            effectivePage <= 1 && 'pointer-events-none opacity-50',
                          )}
                          aria-disabled={effectivePage <= 1}
                          tabIndex={effectivePage <= 1 ? -1 : undefined}
                        />
                      </PaginationItem>
                      {pageButtons.map((item, idx) =>
                        item === 'ellipsis' ? (
                          <PaginationItem key={`e-${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={item}>
                            <PaginationLink
                              href="#"
                              size="sm"
                              isActive={item === effectivePage}
                              className="min-w-9"
                              onClick={(e) => {
                                e.preventDefault()
                                setPage(item)
                              }}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (effectivePage >= totalPages) return
                            setPage((p) => Math.min(totalPages, p + 1))
                          }}
                          className={cn(
                            effectivePage >= totalPages &&
                              'pointer-events-none opacity-50',
                          )}
                          aria-disabled={effectivePage >= totalPages}
                          tabIndex={effectivePage >= totalPages ? -1 : undefined}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
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
