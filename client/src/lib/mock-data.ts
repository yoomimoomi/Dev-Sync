export interface Comment {
  id: string
  projectId: string
  author: {
    name: string
    avatar_path?: string | null
  }
  content: string
  createdAt: string
  replies?: Comment[]
}

export interface Notification {
  id: string
  type: 'join_request' | 'accepted' | 'message' | 'update'
  title: string
  description: string
  time: string
  read: boolean
  projectId?: string
}

/** Placeholder until notifications are loaded from the API. */
export const mockNotifications: Notification[] = []