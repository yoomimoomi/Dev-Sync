import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import './index.css'
import { AuthProvider } from './lib/auth-context'
import { ChatRealtimeProvider } from './lib/chat-realtime-context'
import { SearchProvider } from './lib/search-context'
import { ThemeProvider } from './lib/theme-context'
import { MessagingHub } from './components/messaging-hub'
import { CreateProjectPage } from './pages/CreateProjectPage'
import { HomePage } from './pages/HomePage'
import { ManageProjectsPage } from './pages/ManageProjectsPage'
import { PopularPage } from './pages/PopularPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProjectPage } from './pages/ProjectPage'
import { ShowcasePage } from './pages/ShowcasePage'

function RootLayout() {
  return (
    <>
      <Outlet />
      <MessagingHub />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/popular', element: <PopularPage /> },
      { path: '/showcase', element: <ShowcasePage /> },
      { path: '/create-project', element: <CreateProjectPage /> },
      { path: '/manage-projects', element: <ManageProjectsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/project/:id', element: <ProjectPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ChatRealtimeProvider>
          <SearchProvider>
            <RouterProvider router={router} />
          </SearchProvider>
        </ChatRealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
