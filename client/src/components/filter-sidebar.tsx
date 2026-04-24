"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const categories = [
  { id: "web-dev", label: "Web Development" },
  { id: "mobile", label: "Mobile App" },
  { id: "ai-ml", label: "AI/ML" },
  { id: "data-science", label: "Data Science" },
  { id: "game-dev", label: "Game Development" },
  { id: "blockchain", label: "Blockchain" },
]

const skillLevels = [
  { id: "beginner", label: "Beginner Friendly" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
]

const teamSizes = [
  { id: "solo", label: "Solo (1 person)" },
  { id: "small", label: "Small (2-3 people)" },
  { id: "medium", label: "Medium (4-6 people)" },
  { id: "large", label: "Large (7+ people)" },
]

export function FilterSidebar() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSkillLevels, setSelectedSkillLevels] = useState<string[]>([])
  const [selectedTeamSizes, setSelectedTeamSizes] = useState<string[]>([])

  const toggleFilter = (
    id: string,
    selected: string[],
    setSelected: (value: string[]) => void
  ) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id))
    } else {
      setSelected([...selected, id])
    }
  }

  return (
    <aside className="rounded-2xl border-2 border-primary/30 bg-card p-6">
      <div className="space-y-6">
        <div>
          <h3 className="mb-4 font-semibold text-foreground">Category</h3>
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-2">
                <Checkbox
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() =>
                    toggleFilter(category.id, selectedCategories, setSelectedCategories)
                  }
                />
                <Label
                  htmlFor={category.id}
                  className="text-sm font-normal text-muted-foreground cursor-pointer"
                >
                  {category.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-semibold text-foreground">Skill Level</h3>
          <div className="space-y-3">
            {skillLevels.map((level) => (
              <div key={level.id} className="flex items-center gap-2">
                <Checkbox
                  id={level.id}
                  checked={selectedSkillLevels.includes(level.id)}
                  onCheckedChange={() =>
                    toggleFilter(level.id, selectedSkillLevels, setSelectedSkillLevels)
                  }
                />
                <Label
                  htmlFor={level.id}
                  className="text-sm font-normal text-muted-foreground cursor-pointer"
                >
                  {level.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-semibold text-foreground">Team Size</h3>
          <div className="space-y-3">
            {teamSizes.map((size) => (
              <div key={size.id} className="flex items-center gap-2">
                <Checkbox
                  id={size.id}
                  checked={selectedTeamSizes.includes(size.id)}
                  onCheckedChange={() =>
                    toggleFilter(size.id, selectedTeamSizes, setSelectedTeamSizes)
                  }
                />
                <Label
                  htmlFor={size.id}
                  className="text-sm font-normal text-muted-foreground cursor-pointer"
                >
                  {size.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
