import { useState, useEffect, createContext, useContext } from 'react'
import api from '../utils/api'

interface PermissionContext {
  permissions: any
  can: (page: string, action?: string) => boolean
  loading: boolean
}

const DEFAULT_PERMS = {
  pages: {} as Record<string, Record<string, boolean>>,
  features: {} as Record<string, boolean>,
  limits: { storageQuotaMb: 0, maxDevices: 0, maxShares: 50, maxNotifications: 200 }
}

const PermContext = createContext<PermissionContext>({
  permissions: DEFAULT_PERMS,
  can: () => true,
  loading: false,
})

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<any>(DEFAULT_PERMS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    api.get('/permissions/me').then(r => {
      setPermissions(r.data)
      setLoading(false)
    }).catch(() => {
      setPermissions(DEFAULT_PERMS)
      setLoading(false)
    })
  }, [])

  const can = (page: string, action: string = 'view'): boolean => {
    if (!permissions) return true
    return permissions?.pages?.[page]?.[action] ?? true
  }

  return (
    <PermContext.Provider value={{ permissions, can, loading }}>
      {children}
    </PermContext.Provider>
  )
}

export const usePermissions = () => useContext(PermContext)
