import type { Project } from "@/components/project-card"
import {
  PROJECT_CATEGORY_ID_SET,
  PROJECT_TEAM_SIZE_ID_SET,
} from "@/lib/project-taxonomy"

export type ProjectSortKey = "newest" | "oldest" | "title_asc" | "title_desc"

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase()
}

export function parseProjectTimestampMs(iso: string | null | undefined): number {
  if (!iso?.trim()) return 0
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : 0
}

export function sortProjects(projects: Project[], key: ProjectSortKey): Project[] {
  const copy = [...projects]
  switch (key) {
    case "newest":
      return copy.sort(
        (a, b) => parseProjectTimestampMs(b.created_at) - parseProjectTimestampMs(a.created_at),
      )
    case "oldest":
      return copy.sort(
        (a, b) => parseProjectTimestampMs(a.created_at) - parseProjectTimestampMs(b.created_at),
      )
    case "title_asc":
      return copy.sort((a, b) =>
        (a.title ?? "").localeCompare(b.title ?? "", undefined, { sensitivity: "base" }),
      )
    case "title_desc":
      return copy.sort((a, b) =>
        (b.title ?? "").localeCompare(a.title ?? "", undefined, { sensitivity: "base" }),
      )
    default:
      return copy
  }
}

/** Text search across title, description, tags, owner (matches CreateProject tag merge). */
export function projectMatchesSearch(project: Project, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const tags = [
    ...(project.roles ?? []),
    ...(project.skills ?? []),
    ...(project.technologies ?? []),
  ]
  const ownerName = norm(project.owner?.name)
  return (
    norm(project.title).includes(q) ||
    norm(project.description).includes(q) ||
    tags.some((tag) => norm(tag).includes(q)) ||
    ownerName.includes(q)
  )
}

/**
 * Sidebar filters aligned with CreateProjectPage (see `project-taxonomy.ts`):
 * - category id in `roles` (API: roles = [category]) and optionally same id in `technologies` for legacy rows
 * - skill level in `grade` (beginner | intermediate | advanced)
 * - team size id in `skills` (solo | small | medium | large), and in `technologies` only if it is a canonical team id
 *
 * Within each dimension, multiple selections mean OR. Empty dimension = no constraint.
 */
export function projectMatchesSidebar(
  project: Project,
  selectedCategories: string[],
  selectedSkillLevels: string[],
  selectedTeamSizes: string[],
): boolean {
  if (selectedCategories.length > 0) {
    const fromRoles = (project.roles ?? []).map((r) => (r ?? "").trim())
    const fromTech = (project.technologies ?? [])
      .map((t) => (t ?? "").trim())
      .filter((t) => PROJECT_CATEGORY_ID_SET.has(t))
    const pool = [...fromRoles, ...fromTech]
    const hit = selectedCategories.some((id) => pool.includes(id.trim()))
    if (!hit) return false
  }
  if (selectedSkillLevels.length > 0) {
    const g = norm(project.grade)
    const hit = selectedSkillLevels.some((id) => norm(id) === g)
    if (!hit) return false
  }
  if (selectedTeamSizes.length > 0) {
    const fromSkills = (project.skills ?? []).map((sk) => (sk ?? "").trim())
    const fromTech = (project.technologies ?? [])
      .map((t) => (t ?? "").trim())
      .filter((t) => PROJECT_TEAM_SIZE_ID_SET.has(t))
    const pool = [...fromSkills, ...fromTech]
    const hit = selectedTeamSizes.some((id) => pool.includes(id.trim()))
    if (!hit) return false
  }
  return true
}

export function filterAndSortProjects(
  projects: Project[],
  searchQuery: string,
  selectedCategories: string[],
  selectedSkillLevels: string[],
  selectedTeamSizes: string[],
  sortKey: ProjectSortKey,
): Project[] {
  const filtered = projects.filter(
    (p) =>
      projectMatchesSearch(p, searchQuery) &&
      projectMatchesSidebar(p, selectedCategories, selectedSkillLevels, selectedTeamSizes),
  )
  return sortProjects(filtered, sortKey)
}
