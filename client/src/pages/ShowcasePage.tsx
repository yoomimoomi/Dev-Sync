import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Plus } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { API_BASE_URL } from '@/lib/api-config'
import { useSearch } from '@/lib/search-context'
import { cn } from '@/lib/utils'
import type { Project } from '@/components/project-card'

const GRADIENTS = [
  'from-rose-200 via-purple-200 to-cyan-200',
  'from-amber-200 via-orange-200 to-purple-200',
  'from-sky-200 via-indigo-200 to-purple-200',
  'from-emerald-200 via-teal-200 to-sky-200',
  'from-fuchsia-200 via-pink-200 to-rose-200',
  'from-violet-200 via-purple-200 to-blue-200',
]

function gradientFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return GRADIENTS[hash % GRADIENTS.length]
}

function ShowcaseCard({ project }: { project: Project }) {
  const [bookmarked, setBookmarked] = useState(false)
  const ownerName = project.owner?.name?.trim() || 'Unknown'
  const cover = project.image_url ?? project.images?.[0] ?? null
  const gradient = gradientFor(project.project_id || project.title)

  return (
    <Card className="group overflow-hidden p-0 transition-all hover:shadow-lg">
      <Link to={`/project/${project.project_id}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {cover ? (
            <img
              src={cover}
              alt={project.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className={cn(
                'h-full w-full bg-gradient-to-br transition-transform duration-300 group-hover:scale-105',
                gradient,
              )}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />

          <button
            type="button"
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark project'}
            onClick={(e) => {
              e.preventDefault()
              setBookmarked((v) => !v)
            }}
            className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-foreground backdrop-blur-sm transition-colors hover:bg-white"
          >
            <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-current')} />
          </button>

          <h3 className="absolute bottom-3 left-3 right-12 truncate text-lg font-semibold text-white drop-shadow">
            {project.title}
          </h3>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-3">
        <p className="truncate text-sm text-muted-foreground">
          By <span className="font-medium text-foreground">{ownerName}</span>
        </p>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {[...project.roles, ...project.technologies].slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  )
}

export function ShowcasePage() {
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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Project Showcase
            </h1>
            <p className="mt-1 text-muted-foreground">
              Explore projects built by the DevSync community.
            </p>
          </div>
          <Button asChild>
            <Link to="/create-project">
              <Plus className="h-4 w-4" />
              Add New Project
            </Link>
          </Button>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
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

        {!loading && !loadError && searchQuery.trim() && (
          <p className="mb-4 text-sm text-muted-foreground">
            {filteredProjects.length} result
            {filteredProjects.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}

        {!loading && !loadError && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ShowcaseCard key={project.project_id} project={project} />
            ))}
          </div>
        )}

        {!loading && !loadError && filteredProjects.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery.trim()
                ? 'No projects found matching your search.'
                : 'No projects yet. Create one to get started.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
