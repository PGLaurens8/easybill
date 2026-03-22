import { Navigate, Route, Routes } from 'react-router-dom'
import { Suspense, lazy } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const BOQBuilder = lazy(() => import('./pages/BOQBuilder'))
const Claims = lazy(() => import('./pages/Claims'))
const Certificates = lazy(() => import('./pages/Certificates'))
const Materials = lazy(() => import('./pages/Materials'))
const Settings = lazy(() => import('./pages/Settings'))
const Login = lazy(() => import('./pages/Login'))

const Layout = lazy(() => import('./components/Layout'))
const LoadingSpinner = lazy(() => import('./components/LoadingSpinner'))
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<ProjectDetail />} />
            <Route path="boq-builder" element={<BOQBuilder />} />
            <Route path="claims" element={<Claims />} />
            <Route path="certificates" element={<Certificates />} />
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
