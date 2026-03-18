import { Navigate, Route, Routes } from 'react-router-dom'
import { Suspense, lazy } from 'react'

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'))
const Projects = lazy(() => import('./pages/Projects.tsx'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail.tsx'))
const ProjectPage = lazy(() => import('./pages/ProjectPage.tsx'))
const BOQBuilder = lazy(() => import('./pages/BOQBuilder.tsx'))
const Claims = lazy(() => import('./pages/Claims.tsx'))
const Materials = lazy(() => import('./pages/Materials.tsx'))
const Settings = lazy(() => import('./pages/Settings.tsx'))
const Login = lazy(() => import('./pages/Login.tsx'))

// Layout components
const Layout = lazy(() => import('./components/Layout.tsx'))
const LoadingSpinner = lazy(() => import('./components/LoadingSpinner.tsx'))
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute.tsx'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="project" element={<ProjectPage />} />
            <Route path="boq-builder" element={<BOQBuilder />} />
            <Route path="claims" element={<Claims />} />
            <Route path="materials" element={<Materials />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App 
