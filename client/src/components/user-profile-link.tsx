import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type UserProfileLinkProps = {
  userId: string
  name: string
  avatar?: string | null
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  nameClassName?: string
  className?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

const avatarSizes = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
} as const

export function UserProfileLink({
  userId,
  name,
  avatar,
  size = 'md',
  showName = true,
  nameClassName,
  className,
  onClick,
}: UserProfileLinkProps) {
  const displayName = name.trim() || 'Unknown'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <Link
      to={`/profile/${userId}`}
      className={cn(
        'inline-flex items-center gap-3 rounded-md transition-opacity hover:opacity-80',
        className,
      )}
      onClick={onClick}
    >
      <Avatar className={cn(avatarSizes[size], 'shrink-0')}>
        <AvatarImage src={avatar || undefined} alt={displayName} />
        <AvatarFallback
          className={cn(
            size === 'sm' ? 'text-xs' : 'text-sm',
            'bg-secondary text-secondary-foreground',
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {showName ? (
        <span className={cn('font-medium text-sm text-foreground', nameClassName)}>{displayName}</span>
      ) : null}
    </Link>
  )
}
