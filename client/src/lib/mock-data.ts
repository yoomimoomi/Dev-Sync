import type { Project } from '@/components/project-card'

export interface Comment {
  id: string
  projectId: string
  author: {
    name: string
    avatar?: string
  }
  content: string
  createdAt: string
  replies?: Comment[]
}

export const mockComments: Comment[] = [
  {
    id: "1",
    projectId: "1",
    author: { name: "Marcus Johnson" },
    content: "This looks like an amazing project! I have experience with Python and OpenAI APIs. Would love to contribute to the AI model integration.",
    createdAt: "2 hours ago",
    replies: [
      {
        id: "1-1",
        projectId: "1",
        author: { name: "Sarah Chen" },
        content: "Thanks Marcus! Your experience would be perfect for this. Feel free to submit a join request!",
        createdAt: "1 hour ago",
      },
    ],
  },
  {
    id: "2",
    projectId: "1",
    author: { name: "Emma Wilson" },
    content: "Have you considered adding a spaced repetition algorithm for the flashcards? I implemented something similar in a previous project.",
    createdAt: "5 hours ago",
  },
  {
    id: "3",
    projectId: "1",
    author: { name: "David Park" },
    content: "Great concept! What tech stack are you planning to use for the backend?",
    createdAt: "1 day ago",
    replies: [
      {
        id: "3-1",
        projectId: "1",
        author: { name: "Sarah Chen" },
        content: "We are thinking FastAPI for the backend with PostgreSQL. Open to suggestions though!",
        createdAt: "23 hours ago",
      },
    ],
  },
]

export interface Notification {
  id: string
  type: "join_request" | "accepted" | "message" | "update"
  title: string
  description: string
  time: string
  read: boolean
  projectId?: string
}

export const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "join_request",
    title: "New Join Request",
    description: "Marcus Johnson wants to join AI-Powered Study Assistant",
    time: "5 min ago",
    read: false,
    projectId: "1",
  },
  {
    id: "2",
    type: "accepted",
    title: "Request Accepted",
    description: "You were accepted to Campus Event Finder",
    time: "1 hour ago",
    read: false,
    projectId: "2",
  },
  {
    id: "3",
    type: "message",
    title: "New Message",
    description: "Emma Wilson commented on your project",
    time: "3 hours ago",
    read: true,
    projectId: "3",
  },
  {
    id: "4",
    type: "update",
    title: "Project Update",
    description: "Peer Code Review Platform was updated",
    time: "Yesterday",
    read: true,
    projectId: "4",
  },
]

export const mockProjects: Project[] = [
  {
    project_id: "1",
    owner: { name: "Sarah Chen" },
    title: "AI-Powered Study Assistant",
    description: "Building a smart study assistant that uses AI to create personalized learning paths, generate flashcards, and provide instant explanations for complex topics.",
    status: "open",
    grade: "",
    roles: [],
    skills: [],
    technologies: ["AI/ML", "React", "Python", "OpenAI", "Next.js"],
    created_at: "Mar 25, 2026",
  },
  {
    project_id: "2",
    owner: { name: "Marcus Johnson" },
    title: "Campus Event Finder",
    description: "A mobile-first web app to discover and share campus events. Features real-time updates, social sharing, and calendar integration for students.",
    status: "open",
    grade: "",
    roles: [],
    skills: [],
    technologies: ["React", "Node.js", "MongoDB", "PWA", "TypeScript"],
    created_at: "Mar 24, 2026",
  },
  {
    project_id: "3",
    owner: { name: "Emma Wilson" },
    title: "Sustainable Campus Tracker",
    description: "Track and visualize your campus carbon footprint. Gamified sustainability challenges with leaderboards and rewards for eco-friendly choices.",
    status: "open",
    grade: "",
    roles: [],
    skills: [],
    technologies: ["Vue.js", "D3.js", "Firebase", "IoT", "GraphQL"],
    created_at: "Mar 23, 2026",
  },
  {
    project_id: "4",
    owner: { name: "Alex Rivera" },
    title: "Peer Code Review Platform",
    description: "A collaborative platform for students to submit code, receive peer reviews, and improve their programming skills through constructive feedback.",
    status: "open",
    grade: "",
    roles: [],
    skills: [],
    technologies: ["TypeScript", "PostgreSQL", "Docker", "Git", "WebSocket"],
    created_at: "Mar 22, 2026",
  },
  {
    project_id: "5",
    owner: { name: "David Park" },
    title: "Virtual Lab Simulator",
    description: "Interactive 3D simulations for chemistry and physics labs. Practice experiments safely in a virtual environment before real lab sessions.",
    status: "open",
    grade: "",
    roles: [],
    skills: [],
    technologies: ["Three.js", "WebGL", "React", "Physics", "Education"],
    created_at: "Mar 21, 2026",
  },
  {
    project_id: "6",
    owner: { name: "Lisa Thompson" },
    title: "Student Budget Manager",
    description: "A simple but powerful budgeting app designed for college students. Track expenses, split bills with roommates, and set savings goals.",
    status: "open",
    grade: "",
    roles: [],
    skills: [],
    technologies: ["React Native", "SQLite", "Charts", "FinTech", "Mobile"],
    created_at: "Mar 20, 2026",
  },
]

export const myProjects: Project[] = [
  {
    project_id: "1",
    owner: { name: "You" },
    title: "AI-Powered Study Assistant",
    description: "Building a smart study assistant that uses AI to create personalized learning paths, generate flashcards, and provide instant explanations for complex topics.",
    status: "open",
    grade: "",
    roles: [],
    skills: [],
    technologies: ["AI/ML", "React", "Python", "OpenAI", "Next.js"],
    created_at: "Mar 25, 2026",
  },
  {
    project_id: "3",
    owner: { name: "You" },
    title: "Sustainable Campus Tracker",
    description: "Track and visualize your campus carbon footprint. Gamified sustainability challenges with leaderboards and rewards for eco-friendly choices.",
    status: "open",
    grade: "",
    roles: [],
    skills: [],
    technologies: ["Vue.js", "D3.js", "Firebase", "IoT", "GraphQL"],
    created_at: "Mar 23, 2026",
  },
]
