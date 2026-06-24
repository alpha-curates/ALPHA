export interface User {
  id: string
  username: string
  role: string
  email: string
  avatar?: string
  created_at?: string
}

export interface SystemStatus {
  platform: string
  hostname: string
  python: string
  cpu: { percent: number; cores: number }
  memory: { total: number; used: number; percent: number }
  temperature: number | string
  uptime: string
  time: string
}

export interface StorageInfo {
  total: number
  used: number
  free: number
  percent: number
}

export interface StorageDrive {
  id: string
  device: string
  name: string
  size: number
  used: number
  mount_point: string
  health: string
  is_external?: boolean
  storage_path?: string
  uuid?: string
}

export interface FileItem {
  name: string
  path: string
  type: 'file' | 'directory'
  size: number
  modified: number
  ext?: string
}

export interface Device {
  id: string
  name: string
  type: string
  ip: string
  mac: string
  status: string
  last_seen: string
}

export interface ChatMsg {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model?: string
  created_at: string
}

export interface Extension {
  id: string
  name: string
  display_name: string
  description: string
  version: string
  author: string
  installed: boolean
  enabled: boolean
  permissions: string[]
}

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}

export interface Download {
  id: string
  url: string
  filename: string
  status: 'downloading' | 'completed' | 'failed' | 'cancelled'
  total_bytes: number
  downloaded_bytes: number
  speed: number
  error?: string
  created_at: string
  completed_at?: string
}

export interface MetricPoint {
  timestamp: string
  cpu: number
  memory: number
  disk: number
  net_sent: number
  net_recv: number
}

export interface Backup {
  id: string
  filename: string
  size: number
  includes_storage: boolean
  created_at: string
}
