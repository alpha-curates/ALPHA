import React, { useEffect, useState, useCallback } from 'react'
import {
  Folder, File, FileText, Image, Music, Video, Archive,
  ChevronRight, Home, Upload, Plus, Search, X, Trash2,
  Edit3, Copy, ArrowRight, Loader, AlertCircle, Check, Info,
  Grid3X3, List, RefreshCw, Download,
  AlertTriangle, Eye, Scissors, Square, CheckSquare, ArrowUpDown, Clipboard
} from 'lucide-react'
import api from '../utils/api'

interface FileEntry {
  name: string; path: string; type: 'file' | 'directory'
  ext?: string; mime?: string; size: number; modified: number
}

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

const typeIcons: Record<string, any> = {
  txt: FileText, md: FileText, py: FileText, js: FileText, ts: FileText,
  html: FileText, css: FileText, json: FileText, xml: FileText,
  jpg: Image, jpeg: Image, png: Image, gif: Image, webp: Image, svg: Image,
  mp3: Music, wav: Music, flac: Music, ogg: Music,
  mp4: Video, mov: Video, avi: Video, mkv: Video,
  zip: Archive, tar: Archive, gz: Archive, rar: Archive, '7z': Archive,
  pdf: FileText, doc: FileText, docx: FileText,
}

function getFileIcon(ext: string, type: string) {
  if (type === 'directory') return Folder
  return typeIcons[ext?.toLowerCase()] || File
}

function formatBytes(b: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0; let size = b
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

const toastStyle = (t: ToastData['type']) => ({
  padding: '10px 14px', borderRadius: 10,
  background: t === 'error' ? 'var(--danger-dim)' : t === 'success' ? 'var(--success-dim)' : t === 'warning' ? 'var(--warning-dim)' : 'var(--info-dim)',
  color: t === 'error' ? 'var(--danger)' : t === 'success' ? 'var(--success)' : t === 'warning' ? 'var(--warning)' : 'var(--info)',
  fontSize: 13, fontWeight: 500, animation: 'smoothSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
  boxShadow: 'var(--shadow-md)', border: `1px solid ${t === 'error' ? 'var(--danger)' : t === 'success' ? 'var(--success)' : t === 'warning' ? 'var(--warning)' : 'var(--info)'}`,
  display: 'flex', alignItems: 'center', gap: 8,
})

function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
      {toasts.map(t => (
        <div key={t.id} style={toastStyle(t.type)}>
          {t.type === 'error' ? <AlertCircle size={14} /> : t.type === 'success' ? <Check size={14} /> : t.type === 'warning' ? <AlertTriangle size={14} /> : <Info size={14} />}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2, opacity: 0.6 }}><X size={12} /></button>
        </div>
      ))}
    </div>
  )
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ padding: 24, maxWidth: 400, width: '90%' }}>
        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</h4>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'])

export default function FileManagerPage() {
  const [currentPath, setCurrentPath] = useState('/')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{ file: FileEntry | null; multiple: boolean }>({ file: null, multiple: false })
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null)
  const [clipboard, setClipboard] = useState<{ paths: string[]; action: 'copy' | 'cut' } | null>(null)

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const loadDir = useCallback(async (path: string) => {
    setLoading(true)
    setError('')
    setSelected(new Set())
    try {
      const r = await api.get('/storage/files', { params: { path } })
      setFiles(r.data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load directory')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadDir(currentPath) }, [currentPath, loadDir])

  const navigate = (path: string) => {
    setCurrentPath(path)
    setSearch('')
  }

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const form = new FormData()
      form.append('file', file)
      await api.post('/storage/files/upload', form, {
        params: { path: currentPath },
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      addToast('File uploaded', 'success')
      loadDir(currentPath)
    } catch { addToast('Upload failed', 'error') }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await api.post('/storage/files/mkdir', { path: currentPath, name: newFolderName.trim() })
      setNewFolderName(''); setShowNewFolder(false)
      addToast('Folder created', 'success')
      loadDir(currentPath)
    } catch { addToast('Failed to create folder', 'error') }
  }

  const deleteFile = async (file: FileEntry) => {
    try {
      await api.delete('/storage/files/delete', { data: { path: `${currentPath}/${file.name}` } })
      addToast('Moved to trash', 'success')
      loadDir(currentPath)
    } catch { addToast('Failed to delete', 'error') }
  }

  const batchDelete = async () => {
    const paths = Array.from(selected).map(name => `${currentPath}/${name}`)
    setConfirmDelete({ file: null, multiple: false })
    try {
      await Promise.all(paths.map(path => api.delete('/storage/files/delete', { data: { path } })))
      addToast(`${paths.length} items moved to trash`, 'success')
      setSelected(new Set())
      loadDir(currentPath)
    } catch { addToast('Failed to delete some items', 'error') }
  }

  const startRename = (file: FileEntry) => {
    setRenaming(file.name)
    setRenameValue(file.name)
  }

  const doRename = async () => {
    if (!renaming || !renameValue.trim()) return
    try {
      await api.put('/storage/files/rename', { path: `${currentPath}/${renaming}`, new_name: renameValue.trim() })
      setRenaming(null)
      addToast('Renamed', 'success')
      loadDir(currentPath)
    } catch { addToast('Failed to rename', 'error') }
  }

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filteredFiles.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredFiles.map(f => f.name)))
    }
  }

  const handleCopyCut = async () => {
    if (!clipboard || selected.size === 0) return
    const sourcePaths = Array.from(selected).map(name => `${currentPath}/${name}`)
    setClipboard(prev => prev ? { ...prev, paths: sourcePaths } : null)
    addToast(`${sourcePaths.length} item${sourcePaths.length !== 1 ? 's' : ''} ${clipboard.action === 'copy' ? 'copied' : 'cut'}`, 'info')
  }

  const handlePaste = async () => {
    if (!clipboard) return
    const destination = currentPath
    try {
      if (clipboard.action === 'copy') {
        await Promise.all(clipboard.paths.map(source => api.post('/storage/files/copy', { source, destination })))
        addToast('Pasted', 'success')
      } else {
        await Promise.all(clipboard.paths.map(source => api.post('/storage/files/move', { source, destination })))
        addToast('Moved', 'success')
      }
      setClipboard(null)
      loadDir(currentPath)
    } catch { addToast('Failed to paste', 'error') }
  }

  const filteredFiles = files.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.ext?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortBy === 'name') return dir * a.name.localeCompare(b.name)
    if (sortBy === 'size') return dir * (a.size - b.size)
    return dir * (a.modified - b.modified)
  })

  const toggleSort = (field: 'name' | 'size' | 'modified') => {
    if (sortBy === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }

  const sortLabel = sortDir === 'asc' ? ' ▲' : ' ▼'

  const breadcrumbs = currentPath.split('/').filter(Boolean)
  const pathParts = [{ label: 'Root', path: '/' }]
  let acc = ''
  for (const part of breadcrumbs) {
    acc += '/' + part
    pathParts.push({ label: part, path: acc })
  }

  const isPreviewableImage = previewFile && imageExts.has(previewFile.ext?.toLowerCase() || '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Folder size={18} /> File Manager
        </h3>
        {selected.size > 0 && (
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
            {selected.size} selected
          </span>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 180 }} />
        </div>
        <button className={`btn btn-ghost btn-icon btn-sm`} onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} title={viewMode === 'grid' ? 'List view' : 'Grid view'}>
          {viewMode === 'grid' ? <List size={16} /> : <Grid3X3 size={16} />}
        </button>
        {selected.size > 0 && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => { setClipboard({ paths: [], action: 'copy' }); handleCopyCut() }} title="Copy">
              <Copy size={14} /> Copy
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setClipboard({ paths: [], action: 'cut' }); handleCopyCut() }} title="Cut">
              <Scissors size={14} /> Cut
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete({ file: null, multiple: true })}>
              <Trash2 size={14} /> Delete
            </button>
          </>
        )}
        {clipboard && (
          <button className="btn btn-secondary btn-sm" onClick={handlePaste}>
            <Clipboard size={14} /> Paste
          </button>
        )}
        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={14} /> Upload
          <input type="file" style={{ display: 'none' }} onChange={uploadFile} />
        </label>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowNewFolder(!showNewFolder)}>
          <Plus size={14} /> New Folder
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => loadDir(currentPath)}><RefreshCw size={14} /></button>
      </div>

      {/* Breadcrumbs */}
      <div className="glass-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {pathParts.map((p, i) => (
          <React.Fragment key={p.path}>
            {i > 0 && <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '2px 6px', height: 'auto' }}
              onClick={() => navigate(p.path)}>
              {i === 0 ? <Home size={14} /> : p.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Sort controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>Sort:</span>
        <button className={`btn btn-ghost btn-sm`} style={{ fontSize: 11 }} onClick={() => toggleSort('name')}>
          Name{sortBy === 'name' ? sortLabel : ''}
        </button>
        <button className={`btn btn-ghost btn-sm`} style={{ fontSize: 11 }} onClick={() => toggleSort('size')}>
          Size{sortBy === 'size' ? sortLabel : ''}
        </button>
        <button className={`btn btn-ghost btn-sm`} style={{ fontSize: 11 }} onClick={() => toggleSort('modified')}>
          Modified{sortBy === 'modified' ? sortLabel : ''}
        </button>
      </div>

      {showNewFolder && (
        <div className="glass-card" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createFolder()}
            style={{ flex: 1, height: 32, fontSize: 13 }} autoFocus />
          <button className="btn btn-primary btn-sm" onClick={createFolder}>Create</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowNewFolder(false)}>Cancel</button>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading...</h3></div>
      ) : error ? (
        <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>
      ) : filteredFiles.length === 0 ? (
        <div className="empty-state"><Folder size={48} /><h3>{search ? 'No matching files' : 'Empty folder'}</h3></div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {filteredFiles.map(f => {
            const Icon = getFileIcon(f.ext || '', f.type)
            const isSelected = selected.has(f.name)
            return (
              <div key={f.name} className={`card-liquid ${isSelected ? 'selected' : ''}`} style={{
                padding: 16, cursor: f.type === 'directory' ? 'pointer' : 'pointer',
                textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                outline: isSelected ? '2px solid var(--accent)' : undefined,
                position: 'relative'
              }}>
                <div style={{ position: 'absolute', top: 4, left: 4 }} onClick={(e) => { e.stopPropagation(); toggleSelect(f.name) }}>
                  {isSelected ? <CheckSquare size={14} style={{ color: 'var(--accent)' }} /> : <Square size={14} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <div onClick={() => {
                  if (f.type === 'directory') navigate(`${currentPath}/${f.name}`)
                  else if (f.ext && imageExts.has(f.ext.toLowerCase())) setPreviewFile(f)
                }}>
                  <Icon size={28} style={{ color: f.type === 'directory' ? 'var(--accent)' : 'var(--text-muted)' }} />
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {f.type === 'directory' ? '' : formatBytes(f.size)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredFiles.map(f => {
            const Icon = getFileIcon(f.ext || '', f.type)
            const isDir = f.type === 'directory'
            const isSelected = selected.has(f.name)
            return (
              <div key={f.name} className={`glass-card ${isSelected ? 'selected' : ''}`} style={{
                padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
                cursor: isDir ? 'pointer' : 'default',
                outline: isSelected ? '2px solid var(--accent)' : undefined,
              }}>
                <div onClick={(e) => { e.stopPropagation(); toggleSelect(f.name) }} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  {isSelected ? <CheckSquare size={14} style={{ color: 'var(--accent)' }} /> : <Square size={14} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }} onClick={() => {
                  if (isDir) navigate(`${currentPath}/${f.name}`)
                  else if (f.ext && imageExts.has(f.ext.toLowerCase())) setPreviewFile(f)
                }}>
                  <Icon size={18} style={{ color: isDir ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                  {renaming === f.name ? (
                    <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                      <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && doRename()}
                        style={{ flex: 1, height: 28, fontSize: 12 }} autoFocus />
                      <button className="btn btn-primary btn-sm" onClick={doRename} style={{ height: 28, fontSize: 11 }}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setRenaming(null)} style={{ height: 28, fontSize: 11 }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
                        {isDir ? '—' : formatBytes(f.size)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
                        {new Date(f.modified * 1000).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
                {renaming !== f.name && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    {!isDir && (
                      <button className="btn btn-ghost btn-icon btn-sm" title="Download"
                        onClick={(e) => { e.stopPropagation(); window.open(`/api/storage/files/download?path=${currentPath}/${f.name}`, '_blank') }}>
                        <Download size={12} />
                      </button>
                    )}
                    {!isDir && (
                      <button className="btn btn-ghost btn-icon btn-sm" title="Preview"
                        onClick={(e) => { e.stopPropagation(); setPreviewFile(f) }}>
                        <Eye size={12} />
                      </button>
                    )}
                    <button className="btn btn-ghost btn-icon btn-sm" title="Rename"
                      onClick={(e) => { e.stopPropagation(); startRename(f) }}>
                      <Edit3 size={12} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Delete"
                      style={{ color: 'var(--danger)' }}
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete({ file: f, multiple: false }) }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPreviewFile(null)}>
          <div className="glass-card" style={{ maxWidth: '90vw', maxHeight: '90vh', padding: 24, overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontSize: 15, fontWeight: 600 }}>{previewFile.name}</h4>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPreviewFile(null)}><X size={16} /></button>
            </div>
            {isPreviewableImage ? (
              <img src={`/api/storage/files/download?path=${currentPath}/${previewFile.name}`} alt={previewFile.name}
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, display: 'block' }} />
            ) : (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <File size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Preview not available for this file type.</p>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  <div>Size: {formatBytes(previewFile.size)}</div>
                  <div>Modified: {new Date(previewFile.modified * 1000).toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete.file || confirmDelete.multiple}
        title={confirmDelete.multiple ? 'Delete Items' : 'Delete File'}
        message={
          confirmDelete.multiple
            ? `Are you sure you want to delete ${selected.size} selected items? They will be moved to trash.`
            : `Are you sure you want to delete "${confirmDelete.file?.name}"? It will be moved to trash.`
        }
        onConfirm={() => {
          if (confirmDelete.multiple) batchDelete()
          else if (confirmDelete.file) { deleteFile(confirmDelete.file); setConfirmDelete({ file: null, multiple: false }) }
        }}
        onCancel={() => setConfirmDelete({ file: null, multiple: false })}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
