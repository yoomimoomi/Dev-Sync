"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export type FilterOption = { id: string; label: string }

export const FILTER_CATEGORIES: FilterOption[] = [
  { id: "web-dev", label: "Web Development" },
  { id: "mobile", label: "Mobile App" },
  { id: "ai-ml", label: "AI/ML" },
  { id: "data-science", label: "Data Science" },
  { id: "game-dev", label: "Game Development" },
  { id: "blockchain", label: "Blockchain" },
]

export const FILTER_SKILL_LEVELS: FilterOption[] = [
  { id: "beginner", label: "Beginner Friendly" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
]

export const FILTER_TEAM_SIZES: FilterOption[] = [
  { id: "solo", label: "Solo (1 person)" },
  { id: "small", label: "Small (2-3 people)" },
  { id: "medium", label: "Medium (4-6 people)" },
  { id: "large", label: "Large (7+ people)" },
]

interface FilterSidebarProps {
  selectedCategories: string[]
  onCategoryToggle: (id: string) => void
  selectedSkillLevels: string[]
  onSkillLevelToggle: (id: string) => void
  selectedTeamSizes: string[]
  onTeamSizeToggle: (id: string) => void
  onClear?: () => void
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: FilterOption[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div>
      <h3 className="mb-4 font-semibold text-foreground">{title}</h3>
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-2">
            <Checkbox
              id={option.id}
              checked={selected.includes(option.id)}
              onCheckedChange={() => onToggle(option.id)}
            />
            <Label
              htmlFor={option.id}
              className="text-sm font-normal text-muted-foreground cursor-pointer"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FilterSidebar({
  selectedCategories,
  onCategoryToggle,
  selectedSkillLevels,
  onSkillLevelToggle,
  selectedTeamSizes,
  onTeamSizeToggle,
  onClear,
}: FilterSidebarProps) {
  const hasAnyFilter =
    selectedCategories.length + selectedSkillLevels.length + selectedTeamSizes.length > 0

  return (
    <aside className="rounded-2xl border-2 border-primary/30 bg-card p-6">
      <div className="space-y-6">
        {hasAnyFilter && onClear ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Filters active</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onClear}
            >
              Clear
            </Button>
          </div>
        ) : null}

        <FilterGroup
          title="Category"
          options={FILTER_CATEGORIES}
          selected={selectedCategories}
          onToggle={onCategoryToggle}
        />
        <FilterGroup
          title="Skill Level"
          options={FILTER_SKILL_LEVELS}
          selected={selectedSkillLevels}
          onToggle={onSkillLevelToggle}
        />
        <FilterGroup
          title="Team Size"
          options={FILTER_TEAM_SIZES}
          selected={selectedTeamSizes}
          onToggle={onTeamSizeToggle}
        />
      </div>
    </aside>
  )
}
