import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type OpenRolesBadgesProps = {
  roles: string[]
  filledRoles?: string[]
  className?: string
}

export function OpenRolesBadges({ roles, filledRoles = [], className }: OpenRolesBadgesProps) {
  if (roles.length === 0) return null

  const filledSet = new Set(filledRoles)

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Open roles</p>
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => {
          const filled = filledSet.has(role)
          return (
            <Badge
              key={role}
              variant={filled ? 'secondary' : 'default'}
              className={cn(
                filled &&
                  'bg-muted text-muted-foreground opacity-60 line-through decoration-muted-foreground',
              )}
              title={filled ? `${role} — filled` : undefined}
            >
              {role}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
