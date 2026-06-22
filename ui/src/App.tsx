import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StoragePage from './pages/Storage'
import AIStudio from './pages/AIStudio'
import DevicesPage from './pages/Devices'
import ExtensionsPage from './pages/Extensions'
import AppsPage from './pages/Apps'
import NotificationsPage from './pages/Notifications'
import SettingsPage from './pages/Settings'
import UsersPage from './pages/Users'
import TrashPage from './pages/TrashPage'
import SharesPage from './pages/SharesPage'
import ToolsPage from './pages/ToolsPage'
import SystemToolsPage from './pages/SystemToolsPage'
import DisplayPage from './pages/Display'
import Layout from './components/layout/Layout'

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>ALPHA</div>
  return (
    <Routes>
      <Route path="/display" element={<DisplayPage />} />
      {!user ? (
        <Route path="*" element={<Login />} />
      ) : (
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/storage" element={<StoragePage />} />
              <Route path="/ai" element={<AIStudio />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/extensions" element={<ExtensionsPage />} />
              <Route path="/apps" element={<AppsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/trash" element={<TrashPage />} />
              <Route path="/shares" element={<SharesPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/system-tools" element={<SystemToolsPage />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </Layout>
        } />
      )}
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
