"use client"

import { useEffect, useState } from "react"
import { MessageCircle, Reply, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { avatarUrl } from "@/lib/api-config"
import type { Comment } from "@/lib/mock-data"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
const TOKEN_STORAGE_KEY = "devsync_access_token"

type ApiComment = {
  user_id: string
  project_id: string
  content: string | null
  created_at: string | null
  user: {
    name: string
    avatar_path?: string | null
  } | null
}

interface CommentSectionProps {
  projectId: string
  initialComments: Comment[]
}

function CommentItem({ 
  comment, 
  onReply,
  isAuthenticated 
}: { 
  comment: Comment
  onReply: (commentId: string, content: string) => void
  isAuthenticated: boolean
}) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState("")

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onReply(comment.id, replyContent)
      setReplyContent("")
      setShowReplyForm(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={avatarUrl(comment.author.avatar_path)} alt={comment.author.name} />
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            {comment.author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
          </div>
          <p className="text-sm text-foreground">{comment.content}</p>
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowReplyForm(!showReplyForm)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}
        </div>
      </div>

      {showReplyForm && (
        <div className="ml-11 flex gap-2">
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="min-h-[60px] text-sm"
          />
          <div className="flex flex-col gap-1">
            <Button size="sm" onClick={handleSubmitReply} disabled={!replyContent.trim()}>
              <Send className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowReplyForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-border pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={avatarUrl(reply.author.avatar_path)} alt={reply.author.name} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                  {reply.author.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{reply.author.name}</span>
                  <span className="text-xs text-muted-foreground">{reply.createdAt}</span>
                </div>
                <p className="text-sm text-foreground">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CommentSection({ projectId, initialComments }: CommentSectionProps) {
  const { isAuthenticated, user } = useAuth()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setError("You need to be logged in to post a comment.")
      return
    }

    setIsPosting(true)
    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          content: newComment.trim(),
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { detail?: string } | null
        throw new Error(body?.detail || "Failed to post comment")
      }

      const savedComment = (await response.json()) as ApiComment
      const comment: Comment = {
        id: `${savedComment.user_id}-${savedComment.project_id}`,
        projectId: savedComment.project_id,
        author: { name: savedComment.user?.name ?? user.name, avatar_path: savedComment.user?.avatar_path ?? user.avatar_path },
        content: savedComment.content ?? "",
        createdAt: savedComment.created_at ?? "Just now",
      }
      setComments((prev) => [comment, ...prev])
      setNewComment("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment")
    } finally {
      setIsPosting(false)
    }
  }

  const handleReply = (commentId: string, content: string) => {
    if (!user) return
    
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        const newReply: Comment = {
          id: `reply-${Date.now()}`,
          projectId,
          author: { name: user.name, avatar_path: user.avatar_path },
          content,
          createdAt: "Just now",
        }
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply],
        }
      }
      return comment
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Discussion ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isAuthenticated ? (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={avatarUrl(user?.avatar_path)} alt={user?.name ?? "Current user"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user?.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Ask a question or share your thoughts..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end">
                <Button onClick={handleAddComment} disabled={!newComment.trim() || isPosting}>
                  <Send className="h-4 w-4 mr-2" />
                  {isPosting ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Please log in to join the discussion
            </p>
          </div>
        )}

        <div className="space-y-6 pt-4 border-t">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                isAuthenticated={isAuthenticated}
              />
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              No comments yet. Be the first to start the discussion!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
