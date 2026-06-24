import React, { useEffect, useState, useCallback } from 'react'
import {
  HardDrive, Folder, File, Upload, Download, Trash2,
  Plus, Search, ChevronRight, ArrowLeft, RefreshCw,
  Image, FileText, Music, Film, Archive, Grid, List,
  X, Copy, Move, Edit3, Database, Server, FolderPlus,
  Share2, Star, Lock, Unlock
} from 'lucide-react'
import api from '../utils/api'
import { FileItem, StorageDrive } from '../types'

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0; let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString()
}

function FileIcon({ ext, type }: { ext?: string; type: string }) {
  if (type === 'directory') return <Folder size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
  const iconMap: Record<string, React.ReactNode> = {
    '.jpg': <Image size={20} />, '.jpeg': <Image size={20} />, '.png': <Image size={20} />, '.gif': <Image size={20} />, '.svg': <Image size={20} />,
    '.txt': <FileText size={20} />, '.md': <FileText size={20} />, '.json': <FileText size={20} />, '.csv': <FileText size={20} />,
    '.mp3': <Music size={20} />, '.wav': <Music size={20} />, '.flac': <Music size={20} />,
    '.mp4': <Film size={20} />, '.mkv': <Film size={20} />, '.mov': <Film size={20} />,
    '.zip': <Archive size={20} />, '.tar': <Archive size={20} />, '.gz': <Archive size={20} />, '.rar': <Archive size={20} />,
    '.pdf': <FileText size={20} />, '.doc': <FileText size={20} />, '.docx': <FileText size={20} />,
    '.alpha-encrypted': <Lock size={20} style={{ color: 'var(--warning)' }} />
  }
  return iconMap[ext || ''] || <File size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
}

export default function StoragePage() {
  const [currentPath, setCurrentPath] = useState('/')
  const [files, setFiles] = useState<FileItem[]>([])
  const [drives, setDrives] = useState<StorageDrive[]>([])
  const [pool, setPool] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null)
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [storageInfo, setStorageInfo] = useState<any>(null)

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true)
      const [filesRes, drivesRes, poolRes, infoRes] = await Promise.all([
        api.get(`/storage/files?path=${encodeURIComponent(currentPath)}&search=${encodeURIComponent(search)}`),
        api.get('/storage/drives'),
        api.get('/storage/pool'),
        api.get('/storage/status')
      ])
      setFiles(filesRes.data)
      setDrives(drivesRes.data)
      setPool(poolRes.data)
      setStorageInfo(infoRes.data)
    } catch {} finally { setLoading(false) }
  }, [currentPath, search])

  useEffect(() => { loadFiles() }, [loadFiles])

  const navigate = (path: string) => setCurrentPath(path)
  const goUp = () => {
    const parent = currentPath.split('/').filter(Boolean).slice(0, -1).join('/')
    setCurrentPath('/' + parent)
  }

  const breadcrumbs = currentPath.split('/').filter(Boolean)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const form = new FormData()
    for (const f of e.target.files) form.append('file', f)
    await api.post(`/storage/files/upload?path=${encodeURIComponent(currentPath)}`, form, { headers: { 'Content-Type': 'multipart/form-data' }})
    loadFiles()
  }

  const [favorites, setFavorites] = useState<string[]>([])
  useEffect(() => {
    api.get('/favorites').then(r => setFavorites(r.data.map((f: any) => f.file_path))).catch(() => {})
  }, [])

  const toggleFav = async (path: string) => {
    const r = await api.post('/favorites/toggle', { file_path: path })
    if (r.data.favorited) setFavorites(prev => [...prev, path])
    else setFavorites(prev => prev.filter(p => p !== path))
  }

  const handleDelete = async (file: FileItem) => {
    await api.delete('/storage/files/delete', { data: { path: file.path } })
    loadFiles()
  }

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return
    await api.post('/storage/files/mkdir', { path: currentPath, name: newFolderName.trim() })
    setNewFolderName(''); setShowNewFolder(false); loadFiles()
  }

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return
    await api.put('/storage/files/rename', { path: renameTarget.path, new_name: renameValue.trim() })
    setRenameTarget(null); setRenameValue(''); loadFiles()
  }

  const handlePreview = async (file: FileItem) => {
    if (file.type === 'directory') { navigate(file.path); return }
    setPreviewFile(file)
    try {
      const res = await api.get(`/storage/files/preview?path=${encodeURIComponent(file.path)}`)
      if (res.data.content) setPreviewContent(res.data.content)
    } catch { setPreviewContent('Preview not available for this file type') }
  }

  const scanDrives = async () => {
    await api.post('/storage/drives/scan')
    loadFiles()
  }

  const createPool = async () => {
    await api.post('/storage/pool/create')
    loadFiles()
  }

  const handleEncrypt = async (file: FileItem) => {
    const pw = prompt('Enter encryption password:')
    if (!pw) return
    try {
      await api.post('/crypto/encrypt', { path: file.path, password: pw })
      loadFiles()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Encryption failed')
    }
  }

  const handleDecrypt = async (file: FileItem) => {
    const pw = prompt('Enter decryption password:')
    if (!pw) return
    try {
      await api.post('/crypto/decrypt', { path: file.path, password: pw })
      loadFiles()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Decryption failed')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Storage Info Bar */}
      {storageInfo && (
        <div className="glass-card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={16} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Storage</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{formatSize(storageInfo.used)} / {formatSize(storageInfo.total)}</span>
          </div>
          <div style={{ flex: 1, maxWidth: 200, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${storageInfo.percent}%`, height: '100%', background: storageInfo.percent > 85 ? 'var(--danger)' : 'var(--accent)', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{storageInfo.percent}% used</span>
          {pool?.exists ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <Server size={14} /> Pool: {pool.name}
              <span style={{ color: pool.health === 'healthy' ? 'var(--success)' : 'var(--danger)', fontSize: 11 }}>({pool.health})</span>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={createPool}><Database size={14} /> Create Pool</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={scanDrives}><RefreshCw size={14} /> Scan Drives</button>
          <button className="btn btn-ghost btn-sm"><Share2 size={14} /> SMB Share</button>
        </div>
      )}

      {/* External Drives */}
      {drives.filter(d => d.is_external).length > 0 && (
        <div className="glass-card" style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>External Drives</div>
          {drives.filter(d => d.is_external).map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
              <HardDrive size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ flex: 1 }}>{d.name || d.device}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{d.size ? formatSize(d.size) : '?'}</span>
              <span style={{ fontSize: 11, color: d.health === 'healthy' ? 'var(--success)' : 'var(--danger)' }}>{d.health}</span>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => unmountDrive(d.id)} style={{ fontSize: 10, color: 'var(--text-muted)' }}
                title="Safely remove"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '2px' }}>
          <button className={`btn btn-ghost btn-sm btn-icon ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}><Grid size={16} /></button>
          <button className={`btn btn-ghost btn-sm btn-icon ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}><List size={16} /></button>
        </div>

        <div style={{ flex: 1, maxWidth: 300, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input style={{ paddingLeft: 32, height: 34, fontSize: 13 }} placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ flex: 1 }} />

        <button className="btn btn-secondary btn-sm" onClick={() => setShowNewFolder(!showNewFolder)}><FolderPlus size={14} /> New Folder</button>
        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
          <Upload size={14} /> Upload
          <input type="file" multiple style={{ display: 'none' }} onChange={handleUpload} />
        </label>
        <button className="btn btn-ghost btn-sm" onClick={loadFiles}><RefreshCw size={14} /></button>
      </div>

      {showNewFolder && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={{ height: 34, fontSize: 13, maxWidth: 250 }} placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNewFolder()} autoFocus />
          <button className="btn btn-primary btn-sm" onClick={handleNewFolder}>Create</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>Cancel</button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ padding: '4px 8px' }}>Root</button>
        {currentPath !== '/' && <button className="btn btn-ghost btn-sm btn-icon" onClick={goUp}><ArrowLeft size={14} /></button>}
        {breadcrumbs.map((part, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/' + breadcrumbs.slice(0, i + 1).join('/'))} style={{ padding: '4px 8px' }}>{part}</button>
          </React.Fragment>
        ))}
      </div>

      {/* File Grid/List */}
      {loading ? (
        <div className="empty-state"><RefreshCw size={32} /><h3>Loading...</h3></div>
      ) : files.length === 0 ? (
        <div className="empty-state"><Folder size={48} /><h3>Empty folder</h3><p style={{ fontSize: 13 }}>Upload files or create a folder</p></div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {files.map(f => (
            <div key={f.path} className="glass-card" style={{ padding: 12, cursor: 'pointer', textAlign: 'center', position: 'relative' }}
              onDoubleClick={() => handlePreview(f)}
              onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file: f }) }}>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ position: 'absolute', top: 4, right: 4, color: favorites.includes(f.path) ? 'var(--warning)' : 'var(--text-muted)' }}
                onClick={e => { e.stopPropagation(); toggleFav(f.path) }}>
                <Star size={12} fill={favorites.includes(f.path) ? 'var(--warning)' : 'none'} />
              </button>
              <div style={{ fontSize: 32, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                <FileIcon ext={f.ext} type={f.type} />
              </div>
              <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.type === 'directory' ? 'Folder' : formatSize(f.size)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '24px auto 1fr 100px 160px 80px', gap: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--glass-border)' }}>
            <span></span><span></span><span>Name</span><span>Size</span><span>Modified</span><span></span>
          </div>
          {files.map(f => (
            <div key={f.path} style={{ display: 'grid', gridTemplateColumns: '24px auto 1fr 100px 160px 80px', gap: 8, padding: '8px 12px', alignItems: 'center', cursor: 'pointer', borderRadius: 4 }}
              onDoubleClick={() => handlePreview(f)}
              onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file: f }) }}>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: favorites.includes(f.path) ? 'var(--warning)' : 'var(--text-muted)' }}
                onClick={e => { e.stopPropagation(); toggleFav(f.path) }}>
                <Star size={12} fill={favorites.includes(f.path) ? 'var(--warning)' : 'none'} />
              </button>
              <FileIcon ext={f.ext} type={f.type} />
              {renameTarget?.path === f.path ? (
                <input value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename()} onBlur={() => setRenameTarget(null)} autoFocus style={{ height: 28, fontSize: 13 }} />
              ) : (
                <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.type === 'directory' ? '-' : formatSize(f.size)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(f.modified)}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setRenameTarget(f); setRenameValue(f.name) }}><Edit3 size={12} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(f)}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 40 }}
          onClick={() => setPreviewFile(null)}>
          <div className="glass" style={{ maxWidth: 700, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16 }}>{previewFile.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setPreviewFile(null)}><X size={18} /></button>
            </div>
            <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '60vh', overflow: 'auto', color: 'var(--text-secondary)' }}>{previewContent}</pre>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: 4, zIndex: 1000, minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          onClick={() => setContextMenu(null)}>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => { handlePreview(contextMenu.file); setContextMenu(null) }}>
            {contextMenu.file.type === 'directory' ? 'Open' : 'Preview'}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => { setRenameTarget(contextMenu.file); setRenameValue(contextMenu.file.name); setContextMenu(null) }}>
            Rename
          </button>
          {contextMenu.file.type === 'file' && (
            <>
              <div style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
              {contextMenu.file.name.endsWith('.alpha-encrypted') ? (
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}
                  onClick={() => { handleDecrypt(contextMenu.file); setContextMenu(null) }}>
                  <Unlock size={14} /> Decrypt
                </button>
              ) : (
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}
                  onClick={() => { handleEncrypt(contextMenu.file); setContextMenu(null) }}>
                  <Lock size={14} /> Encrypt
                </button>
              )}
            </>
          )}
          <div style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}
            onClick={() => handleDelete(contextMenu.file)}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
