export interface Comment {
  id: string
  projectId: string
  author: {
    user_id?: string
    name: string
    avatar?: string
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

// export const mockProjects: Project[] = [
//   {
//     project_id: "1",
//     owner: { name: "Sarah Chen" },
//     title: "AI-Powered Study Assistant",
//     description: "Building a smart study assistant that uses AI to create personalized learning paths, generate flashcards, and provide instant explanations for complex topics.",
//     status: "open",
//     grade: "",
//     roles: [],
//     skills: [],
//     technologies: ["AI/ML", "React", "Python", "OpenAI", "Next.js"],
//     created_at: "Mar 25, 2026",
//   },
//   {
//     project_id: "2",
//     owner: { name: "Marcus Johnson" },
//     title: "Campus Event Finder",
//     description: "A mobile-first web app to discover and share campus events. Features real-time updates, social sharing, and calendar integration for students.",
//     status: "open",
//     grade: "",
//     roles: [],
//     skills: [],
//     technologies: ["React", "Node.js", "MongoDB", "PWA", "TypeScript"],
//     created_at: "Mar 24, 2026",
//   },
//   {
//     project_id: "3",
//     owner: { name: "Emma Wilson" },
//     title: "Sustainable Campus Tracker",
//     description: "Track and visualize your campus carbon footprint. Gamified sustainability challenges with leaderboards and rewards for eco-friendly choices.",
//     status: "open",
//     grade: "",
//     roles: [],
//     skills: [],
//     technologies: ["Vue.js", "D3.js", "Firebase", "IoT", "GraphQL"],
//     created_at: "Mar 23, 2026",
//   },
//   {
//     project_id: "4",
//     owner: { name: "Alex Rivera" },
//     title: "Peer Code Review Platform",
//     description: "A collaborative platform for students to submit code, receive peer reviews, and improve their programming skills through constructive feedback.",
//     status: "open",
//     grade: "",
//     roles: [],
//     skills: [],
//     technologies: ["TypeScript", "PostgreSQL", "Docker", "Git", "WebSocket"],
//     created_at: "Mar 22, 2026",
//   },
//   {
//     project_id: "5",
//     owner: { name: "David Park" },
//     title: "Virtual Lab Simulator",
//     description: "Interactive 3D simulations for chemistry and physics labs. Practice experiments safely in a virtual environment before real lab sessions.",
//     status: "open",
//     grade: "",
//     roles: [],
//     skills: [],
//     technologies: ["Three.js", "WebGL", "React", "Physics", "Education"],
//     created_at: "Mar 21, 2026",
//   },
//   {
//     project_id: "6",
//     owner: { name: "Lisa Thompson" },
//     title: "Student Budget Manager",
//     description: "A simple but powerful budgeting app designed for college students. Track expenses, split bills with roommates, and set savings goals.",
//     status: "open",
//     grade: "",
//     roles: [],
//     skills: [],
//     technologies: ["React Native", "SQLite", "Charts", "FinTech", "Mobile"],
//     created_at: "Mar 20, 2026",
//   },
// ]

// export const myProjects: Project[] = [
//   {
//     project_id: "1",
//     owner: { name: "You" },
//     title: "AI-Powered Study Assistant",
//     description: "Building a smart study assistant that uses AI to create personalized learning paths, generate flashcards, and provide instant explanations for complex topics.",
//     status: "open",
//     grade: "",
//     roles: [],
//     skills: [],
//     technologies: ["AI/ML", "React", "Python", "OpenAI", "Next.js"],
//     created_at: "Mar 25, 2026",
//   },
//   {
//     project_id: "3",
//     owner: { name: "You" },
//     title: "Sustainable Campus Tracker",
//     description: "Track and visualize your campus carbon footprint. Gamified sustainability challenges with leaderboards and rewards for eco-friendly choices.",
//     status: "open",
//     grade: "",
//     roles: [],
//     skills: [],
//     technologies: ["Vue.js", "D3.js", "Firebase", "IoT", "GraphQL"],
//     created_at: "Mar 23, 2026",
//   },
// ]
