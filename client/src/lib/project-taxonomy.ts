/**
 * Single source of truth for project category, skill level, and team size values.
 * CreateProjectPage sends: grade = skillLevel id, roles = [category id], skills = [team size id].
 * Filter sidebar and project-list-utils must use these same ids.
 */
export const PROJECT_CATEGORIES = [
  { id: "web-dev", label: "Web Development" },
  { id: "mobile", label: "Mobile App" },
  { id: "ai-ml", label: "AI/ML" },
  { id: "data-science", label: "Data Science" },
  { id: "game-dev", label: "Game Development" },
  { id: "blockchain", label: "Blockchain" },
] as const

export const PROJECT_SKILL_LEVELS = [
  { id: "beginner", label: "Beginner Friendly" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
] as const

export const PROJECT_TEAM_SIZES = [
  { id: "solo", label: "Solo (1 person)" },
  { id: "small", label: "Small (2-3 people)" },
  { id: "medium", label: "Medium (4–6 people)" },
  { id: "large", label: "Large (7+ people)" },
] as const

export type ProjectCategoryId = (typeof PROJECT_CATEGORIES)[number]["id"]
export type ProjectSkillLevelId = (typeof PROJECT_SKILL_LEVELS)[number]["id"]
export type ProjectTeamSizeId = (typeof PROJECT_TEAM_SIZES)[number]["id"]

/** Canonical category ids (for exact match in roles or technologies). */
export const PROJECT_CATEGORY_ID_SET = new Set<string>(
  PROJECT_CATEGORIES.map((c) => c.id),
)

/** Canonical team size ids (for exact match in skills). */
export const PROJECT_TEAM_SIZE_ID_SET = new Set<string>(
  PROJECT_TEAM_SIZES.map((t) => t.id),
)
