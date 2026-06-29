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
import DownloadsPage from './pages/Downloads'
import DisplayPage from './pages/Display'
import ProcessesPage from './pages/ProcessesPage'
import NotesPage from './pages/NotesPage'
import BookmarksPage from './pages/BookmarksPage'
import Layout from './components/layout/Layout'
import { PermissionsProvider } from './hooks/usePermissions'
import JokeTimeNotice from './pages/JokeTimeNotice'
import JokeDashboard from './pages/JokeDashboard'
import JokeFileManager from './pages/JokeFileManager'
import JokeCocomelon from './pages/JokeCocomelon'

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>ALPHA</div>
  if (user?.role === 'joke') {
    return (
      <Routes>
        <Route path="/joke/time-notice" element={<JokeTimeNotice />} />
        <Route path="/joke/dashboard" element={<JokeDashboard />} />
        <Route path="/joke/file-manager" element={<JokeFileManager />} />
        <Route path="/joke/cocomelon" element={<JokeCocomelon />} />
        <Route path="*" element={<Navigate to="/joke/time-notice" />} />
      </Routes>
    )
  }
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
              <Route path="/storage/*" element={<StoragePage />} />
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
              <Route path="/downloads" element={<DownloadsPage />} />
              <Route path="/profile" element={<Navigate to="/settings" />} />
              <Route path="/network" element={<Navigate to="/devices" />} />
              <Route path="/network/*" element={<Navigate to="/devices" />} />
              <Route path="/music" element={<Navigate to="/" />} />
              <Route path="/music/*" element={<Navigate to="/" />} />
              <Route path="/admin" element={<Navigate to="/settings" />} />
              <Route path="/processes" element={<ProcessesPage />} />
              <Route path="/firewall" element={<Navigate to="/system-tools" />} />
              <Route path="/dns" element={<Navigate to="/devices" />} />
              <Route path="/proxy" element={<Navigate to="/devices" />} />
              <Route path="/videos" element={<Navigate to="/" />} />
              <Route path="/photos" element={<Navigate to="/" />} />
              <Route path="/podcasts" element={<Navigate to="/" />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/calendar" element={<Navigate to="/" />} />
              <Route path="/calculator" element={<Navigate to="/" />} />
              <Route path="/recent" element={<Navigate to="/" />} />
              <Route path="/favorites" element={<Navigate to="/" />} />
              <Route path="/files" element={<Navigate to="/" />} />
              <Route path="/permissions" element={<Navigate to="/users" />} />
              <Route path="/audit" element={<Navigate to="/" />} />
              <Route path="/backup" element={<Navigate to="/storage" />} />
              <Route path="/encryption" element={<Navigate to="/settings" />} />
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
      <PermissionsProvider>
        <AppRoutes />
      </PermissionsProvider>
    </AuthProvider>
  )
}
