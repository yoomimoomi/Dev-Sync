import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Project } from '@/components/project-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { API_BASE_URL, readApiErrorMessage, TOKEN_STORAGE_KEY } from '@/lib/api-config'

const suggestedOpenRoles = [
  'Frontend',
  'Backend',
  'Full Stack',
  'Designer',
  'Product Manager',
  'DevOps',
  'QA / Testing',
  'Data Engineer',
  'Mobile',
  'ML Engineer',
]

const suggestedTags = [
  'React',
  'Next.js',
  'TypeScript',
  'Python',
  'Node.js',
  'AI/ML',
  'Mobile',
  'Web',
  'Backend',
  'Frontend',
  'Full Stack',
  'Database',
  'Firebase',
  'AWS',
  'Docker',
  'GraphQL',
  'REST API',
]

const CATEGORY_VALUES = new Set([
  'web-dev',
  'mobile',
  'ai-ml',
  'data-science',
  'game-dev',
  'blockchain',
])

const TEAM_SIZE_VALUES = new Set(['solo', 'small', 'medium', 'large'])

const SKILL_LEVEL_VALUES = new Set(['beginner', 'intermediate', 'advanced'])

function projectToFormState(project: Project) {
  const skills = project.skills ?? []
  let teamSize = ''
  let category = ''
  if (skills.length >= 1 && TEAM_SIZE_VALUES.has(skills[0])) {
    teamSize = skills[0]
    category = skills[1] && CATEGORY_VALUES.has(skills[1]) ? skills[1] : ''
  } else if (skills.length >= 1 && CATEGORY_VALUES.has(skills[0])) {
    category = skills[0]
    teamSize = skills[1] && TEAM_SIZE_VALUES.has(skills[1]) ? skills[1] : ''
  }

  const grade = (project.grade ?? '').trim()
  const skillLevel = SKILL_LEVEL_VALUES.has(grade) ? grade : ''

  return {
    title: project.title ?? '',
    description: project.description ?? '',
    category,
    skillLevel,
    teamSize,
    openRoles: [...(project.roles ?? [])],
    tags: [...(project.technologies ?? [])],
    filledRoles: [...(project.filled_roles ?? [])],
  }
}

type EditProjectDialogProps = {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function EditProjectDialog({ project, open, onOpenChange, onSaved }: EditProjectDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [skillLevel, setSkillLevel] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [openRoles, setOpenRoles] = useState<string[]>([])
  const [filledRoles, setFilledRoles] = useState<string[]>([])
  const [roleInput, setRoleInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!project || !open) return
    const state = projectToFormState(project)
    setTitle(state.title)
    setDescription(state.description)
    setCategory(state.category)
    setSkillLevel(state.skillLevel)
    setTeamSize(state.teamSize)
    setOpenRoles(state.openRoles)
    setFilledRoles(state.filledRoles)
    setRoleInput('')
    setTags(state.tags)
    setTagInput('')
    setError('')
  }, [project, open])

  const addOpenRole = (role: string) => {
    const trimmed = role.trim()
    if (trimmed && !openRoles.includes(trimmed) && openRoles.length < 8) {
      setOpenRoles([...openRoles, trimmed])
      setRoleInput('')
    }
  }

  const removeOpenRole = (roleToRemove: string) => {
    if (filledRoles.includes(roleToRemove)) return
    setOpenRoles(openRoles.filter((role) => role !== roleToRemove))
  }

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < 6) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return
    setError('')

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setError('You need to be logged in to edit a project.')
      return
    }

    if (!category || !skillLevel || !teamSize) {
      setError('Please choose a category, skill level, and team size.')
      return
    }

    if (openRoles.length === 0) {
      setError('Add at least one open role collaborators can apply for.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_BASE_URL}/project/${project.project_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          grade: skillLevel,
          roles: openRoles,
          skills: [teamSize, category].filter(Boolean),
          technologies: tags,
        }),
      })

      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }

      onOpenChange(false)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update your project post. Roles already filled by team members cannot be removed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="-mr-2 min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
            {error ? (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="edit-title">Project Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                className="min-h-28"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web-dev">Web Development</SelectItem>
                    <SelectItem value="mobile">Mobile App</SelectItem>
                    <SelectItem value="ai-ml">AI/ML</SelectItem>
                    <SelectItem value="data-science">Data Science</SelectItem>
                    <SelectItem value="game-dev">Game Development</SelectItem>
                    <SelectItem value="blockchain">Blockchain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-skill-level">Skill Level</Label>
                <Select value={skillLevel} onValueChange={setSkillLevel}>
                  <SelectTrigger id="edit-skill-level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner Friendly</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-team-size">Team Size</Label>
                <Select value={teamSize} onValueChange={setTeamSize}>
                  <SelectTrigger id="edit-team-size">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo (1)</SelectItem>
                    <SelectItem value="small">Small (2-3)</SelectItem>
                    <SelectItem value="medium">Medium (4-6)</SelectItem>
                    <SelectItem value="large">Large (7+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-open-roles">Open roles</Label>
              <div className="mb-2 flex flex-wrap gap-2">
                {openRoles.map((role) => {
                  const isFilled = filledRoles.includes(role)
                  return (
                    <Badge key={role} variant={isFilled ? 'default' : 'secondary'} className="gap-1">
                      {role}
                      {isFilled ? (
                        <span className="ml-1 text-[10px] opacity-80">(filled)</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeOpenRole(role)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  )
                })}
              </div>
              <Input
                id="edit-open-roles"
                placeholder="Add a role and press Enter"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addOpenRole(roleInput)
                  }
                }}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestedOpenRoles
                  .filter((role) => !openRoles.includes(role))
                  .slice(0, 8)
                  .map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => addOpenRole(role)}
                      className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
                    >
                      + {role}
                    </button>
                  ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <div className="mb-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                id="edit-tags"
                placeholder="Add a tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag(tagInput.trim())
                  }
                }}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestedTags
                  .filter((tag) => !tags.includes(tag))
                  .slice(0, 8)
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
