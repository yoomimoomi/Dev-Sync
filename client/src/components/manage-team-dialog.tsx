import { useState } from 'react'
import { UserMinus } from 'lucide-react'
import type { Project } from '@/components/project-card'
import { UserProfileLink } from '@/components/user-profile-link'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { API_BASE_URL, readApiErrorMessage, TOKEN_STORAGE_KEY } from '@/lib/api-config'

type TeamMember = NonNullable<Project['accepted_team_members']>[number]

type ManageTeamDialogProps = {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function ManageTeamDialog({ project, open, onOpenChange, onUpdated }: ManageTeamDialogProps) {
  const [error, setError] = useState('')
  const [removingKey, setRemovingKey] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)

  const members = project?.accepted_team_members ?? []

  const handleRemoveMember = async () => {
    if (!project || !memberToRemove) return

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setError('You need to be logged in to manage your team.')
      return
    }

    const key = `${project.project_id}-${memberToRemove.user_id}`
    setRemovingKey(key)
    setError('')

    try {
      const res = await fetch(
        `${API_BASE_URL}/applications/${project.project_id}/${memberToRemove.user_id}/decline`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }
      setMemberToRemove(null)
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove team member')
    } finally {
      setRemovingKey(null)
    }
  }

  const displayName = (member: TeamMember) =>
    member.name?.trim() || member.email?.trim() || 'Team member'

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setError('')
            setMemberToRemove(null)
          }
          onOpenChange(next)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage team</DialogTitle>
            <DialogDescription>
              {project ? (
                <>
                  Accepted members on <span className="font-medium text-foreground">{project.title}</span>.
                  Removing someone frees their role for new applicants.
                </>
              ) : (
                'View and remove collaborators from your project.'
              )}
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {members.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No team members yet. Accept join requests to add collaborators.
              </p>
            ) : (
              members.map((member) => {
                const name = displayName(member)
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <UserProfileLink
                        userId={member.user_id}
                        name={name}
                        avatar={member.avatar}
                        size="md"
                      />
                      {member.project_role?.trim() ? (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {member.project_role}
                        </Badge>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={removingKey !== null}
                      onClick={() => setMemberToRemove(member)}
                    >
                      <UserMinus className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(next) => {
          if (!next && removingKey === null) setMemberToRemove(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove ? (
                <>
                  Remove <span className="font-medium text-foreground">{displayName(memberToRemove)}</span>
                  {memberToRemove.project_role?.trim() ? (
                    <> from the <span className="font-medium">{memberToRemove.project_role}</span> role</>
                  ) : null}{' '}
                  on this project? They can apply again later if you have an open slot.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingKey !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={removingKey !== null}
              onClick={(e) => {
                e.preventDefault()
                void handleRemoveMember()
              }}
            >
              {removingKey !== null ? 'Removing…' : 'Remove member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
