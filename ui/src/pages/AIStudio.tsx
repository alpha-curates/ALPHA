import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  Brain, Send, Trash2, Download, Cpu, MessageSquare,
  FileSearch, Settings, ChevronDown, Plus, X, Activity,
  Wifi, Upload, FileCode, Github, Save, Server,
  Paperclip, Zap, Globe, Bot, ExternalLink, Key,
  ToggleLeft, ToggleRight, Check, Edit3, Unlink,
  FolderOpen
} from 'lucide-react'
import api from '../utils/api'
import { ChatMsg } from '../types'

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  ollama: <Bot size={14} />,
  openai: <Zap size={14} />,
  gemini: <Globe size={14} />,
  claude: <Brain size={14} />,
}

const PROVIDER_COLORS: Record<string, string> = {
  ollama: 'var(--accent)',
  openai: 'var(--success)',
  gemini: 'var(--warning)',
  claude: 'var(--info)',
}

export default function AIStudio() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [activeProvider, setActiveProvider] = useState<any>(null)
  const [providers, setProviders] = useState<any[]>([])
  const [activeModel, setActiveModel] = useState('')
  const [aiStatus, setAiStatus] = useState<any>(null)
  const [tab, setTab] = useState('chat')
  const [loading, setLoading] = useState(false)
  const [showProviderDropdown, setShowProviderDropdown] = useState(false)
  const [attachments, setAttachments] = useState<any[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([])
  const chatEnd = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const loadStatus = useCallback(async () => {
    try {
      const [statusRes, provRes, histRes] = await Promise.all([
        api.get('/ai/status'),
        api.get('/ai/providers'),
        api.get('/ai/history')
      ])
      setAiStatus(statusRes.data)
      setProviders(provRes.data)
      if (statusRes.data.active_provider && !activeProvider) {
        setActiveProvider(statusRes.data.active_provider)
        setActiveModel(statusRes.data.active_provider.model || '')
      }
      setMessages(histRes.data)
    } catch {}
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    api.get('/ai/attachments').then(r => setPendingAttachments(r.data)).catch(() => {})
  }, [])

  const selectProvider = (p: any, model: string) => {
    setActiveProvider({ id: p.id, name: p.name, type: p.type, model })
    setActiveModel(model)
    setShowProviderDropdown(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    const userMsg: ChatMsg = { id: 'temp-' + Date.now(), role: 'user', content: input, model: activeModel, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    const attIds = attachments.map(a => a.id)
    const msgText = input
    setInput(''); setAttachments([])
    try {
      const res = await api.post('/ai/chat', {
        message: msgText, model: activeModel,
        provider_id: activeProvider?.id || '',
        attachments: attIds
      })
      setMessages(prev => [...prev, {
        id: res.data.id || 'resp-' + Date.now(), role: 'assistant',
        content: res.data.response, model: activeModel || res.data.provider,
        created_at: new Date().toISOString()
      }])
    } catch {
      setMessages(prev => [...prev, { id: 'err-' + Date.now(), role: 'assistant', content: 'AI unavailable', model: activeModel, created_at: new Date().toISOString() }])
    }
    setLoading(false)
  }

  const clearHistory = async () => {
    await api.post('/ai/clear')
    setMessages([])
    setAttachments([])
  }

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post('/ai/attach', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAttachments(prev => [...prev, res.data])
    } catch {}
    if (fileInput.current) fileInput.current.value = ''
  }

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id))

  const fmtSize = (b: number) => {
    if (!b) return '0B'
    const u = ['B', 'KB', 'MB']; let i = 0; let s = b
    while (s >= 1024 && i < u.length - 1) { s /= 1024; i++ }
    return `${s.toFixed(0)}${u[i]}`
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', minHeight: 0 }}>
      {/* Sidebar */}
      <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="glass-card" style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'providers', label: 'Providers', icon: Cpu },
            { id: 'generate', label: 'Generate', icon: FileCode },
            { id: 'github', label: 'GitHub', icon: Github },
            { id: 'intel', label: 'File Intel', icon: FileSearch },
            { id: 'system', label: 'System', icon: Activity },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(t => (
            <button key={t.id} className={`btn btn-ghost btn-sm ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              style={{ justifyContent: 'flex-start', background: tab === t.id ? 'var(--accent-dim)' : 'transparent', color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)' }}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {/* Active provider indicator */}
        {activeProvider && (
          <div className="glass-card" style={{ padding: '8px 10px', fontSize: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: PROVIDER_COLORS[activeProvider.type] || 'var(--accent)' }}>
                {PROVIDER_ICONS[activeProvider.type] || <Bot size={14} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 12 }}>{activeProvider.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeModel || activeProvider.model}</div>
              </div>
            </div>
          </div>
        )}
        <div className="glass-card" style={{ padding: '8px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: aiStatus?.ollama ? 'var(--success)' : 'var(--danger)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Ollama {aiStatus?.ollama ? 'OK' : 'Off'}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, minWidth: 0 }}>
        {/* Chat Tab */}
        {tab === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {messages.length === 0 ? (
                <div className="empty-state" style={{ flex: 1 }}>
                  <Brain size={48} />
                  <h3>AI Studio</h3>
                  <p style={{ fontSize: 13 }}>Chat with multiple AI providers — Ollama, OpenAI, Gemini, Claude</p>
                </div>
              ) : messages.map(m => (
                <div key={m.id} style={{
                  display: 'flex', gap: 10, padding: '10px 14px',
                  background: m.role === 'assistant' ? 'rgba(108,92,231,0.04)' : 'transparent',
                  borderRadius: 12, border: '1px solid var(--glass-border)'
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: m.role === 'assistant' ? 'var(--accent-dim)' : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {m.role === 'assistant' ? <Brain size={14} /> : <MessageSquare size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, display: 'flex', gap: 8 }}>
                      <span>{m.role === 'assistant' ? 'ALPHA AI' : 'You'}</span>
                      {m.model && <span style={{ opacity: 0.6 }}>· {m.model}</span>}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  </div>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>

            {/* Attachments bar */}
            {attachments.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {attachments.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 8px', background: 'rgba(108,92,231,0.1)',
                    borderRadius: 8, fontSize: 12, border: '1px solid rgba(108,92,231,0.2)'
                  }}>
                    <Paperclip size={12} />
                    <span>{a.file_name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>({fmtSize(a.file_size)})</span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeAttachment(a.id)} style={{ padding: 2 }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                  style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                  {activeProvider ? (
                    <>{PROVIDER_ICONS[activeProvider.type] || <Bot size={12} />} {activeProvider.name}</>
                  ) : 'AI Provider'} <ChevronDown size={10} />
                </button>
                {showProviderDropdown && (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
                    background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                    borderRadius: 8, padding: 4, zIndex: 20, minWidth: 200, maxHeight: 300, overflow: 'auto'
                  }}>
                    {providers.map(p => (
                      <div key={p.id}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 600 }}>
                          {PROVIDER_ICONS[p.type] || <Bot size={11} />} {p.name}
                        </div>
                        {(p.models || []).map((m: string) => (
                          <button key={m} className="btn btn-ghost btn-sm"
                            style={{ width: '100%', justifyContent: 'flex-start', fontSize: 11, paddingLeft: 24 }}
                            onClick={() => selectProvider(p, m)}>
                            {m}
                          </button>
                        ))}
                      </div>
                    ))}
                    {providers.length === 0 && (
                      <div style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                        No providers configured. Go to Providers tab.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <input style={{ flex: 1, height: 38, fontSize: 13 }} placeholder="Message AI..." value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => fileInput.current?.click()} title="Attach file">
                <Paperclip size={16} />
              </button>
              <input ref={fileInput} type="file" style={{ display: 'none' }} onChange={uploadFile} />
              <button className="btn btn-primary" onClick={sendMessage} disabled={loading} style={{ height: 38 }}>
                <Send size={16} />
              </button>
              <button className="btn btn-ghost btn-icon" onClick={clearHistory} title="Clear history">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Providers Tab */}
        {tab === 'providers' && <ProvidersTab providers={providers} onUpdate={loadStatus} />}

        {/* Generate Tab */}
        {tab === 'generate' && <GenerateTab provider={activeProvider} />}

        {/* GitHub Tab */}
        {tab === 'github' && <GitHubTab provider={activeProvider} />}

        {/* File Intel Tab */}
        {tab === 'intel' && <FileIntelTab provider={activeProvider} />}

        {/* System Tab */}
        {tab === 'system' && <SystemTab provider={activeProvider} />}

        {/* Settings Tab */}
        {tab === 'settings' && <AISettingsTab onUpdate={loadStatus} />}
      </div>
    </div>
  )
}

// ===== Providers Tab =====
function ProvidersTab({ providers, onUpdate }: { providers: any[]; onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [type, setType] = useState('openai')
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [model, setModel] = useState('')
  const [testResult, setTestResult] = useState('')

  const addProvider = async () => {
    try {
      const r = await api.post('/ai/providers', {
        type, name: name || type, api_key: apiKey,
        api_url: apiUrl, default_model: model, enabled: true, force: true
      })
      setShowAdd(false); setName(''); setApiKey(''); setApiUrl(''); setModel('')
      onUpdate()
    } catch (e: any) {
      if (e.response?.status === 409) {
        await api.post('/ai/providers', {
          type, name: name || type, api_key: apiKey,
          api_url: apiUrl, default_model: model, enabled: true, force: true
        })
        setShowAdd(false); onUpdate()
      }
    }
  }

  const testProvider = async () => {
    setTestResult('Testing...')
    try {
      const r = await api.post('/ai/providers/test', { type, api_key: apiKey, api_url: apiUrl, default_model: model })
      setTestResult(r.data.success ? '✅ Connected!' : `❌ Failed: ${r.data.response || r.data.error}`)
    } catch (e: any) { setTestResult(`❌ ${e.message}`) }
  }

  const removeProvider = async (id: string) => {
    await api.delete(`/ai/providers/${id}`)
    onUpdate()
  }

  const providerDefaults: Record<string, { url: string; models: string[] }> = {
    openai: { url: 'https://api.openai.com', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'] },
    gemini: { url: '', models: ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'] },
    claude: { url: '', models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229', 'claude-3-5-sonnet-20241022'] },
    ollama: { url: 'http://localhost:11434', models: ['llama3.2:1b', 'llama3.2:3b', 'llama3.1:8b', 'mistral:7b', 'codellama:7b'] },
  }

  const typeChanged = (t: string) => {
    setType(t); setApiUrl(providerDefaults[t]?.url || '')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={16} /> AI Providers
        </h3>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={14} /> {showAdd ? 'Cancel' : 'Add Provider'}
        </button>
      </div>

      {showAdd && (
        <div className="glass-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['ollama', 'openai', 'gemini', 'claude'].map(t => (
              <button key={t} className={`btn btn-sm ${type === t ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => typeChanged(t)} style={{ textTransform: 'capitalize' }}>
                {PROVIDER_ICONS[t] || <Bot size={12} />} {t}
              </button>
            ))}
          </div>
          <input placeholder="Display name" value={name} onChange={e => setName(e.target.value)} style={{ height: 32, fontSize: 13 }} />
          {type !== 'ollama' && (
            <input placeholder="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" style={{ height: 32, fontSize: 13 }} />
          )}
          {['openai', 'ollama'].includes(type) && (
            <input placeholder="API URL" value={apiUrl} onChange={e => setApiUrl(e.target.value)} style={{ height: 32, fontSize: 13 }} />
          )}
          <input placeholder="Default model" value={model} onChange={e => setModel(e.target.value)} style={{ height: 32, fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={addProvider}><Plus size={12} /> Add</button>
            <button className="btn btn-secondary btn-sm" onClick={testProvider}><Zap size={12} /> Test</button>
          </div>
          {testResult && <div style={{ fontSize: 12, color: testResult.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{testResult}</div>}
        </div>
      )}

      {providers.length === 0 && (
        <div className="empty-state"><Cpu size={48} /><h3>No providers</h3><p style={{ fontSize: 13 }}>Add OpenAI, Gemini, Claude, or use local Ollama</p></div>
      )}
      {providers.map(p => (
        <div key={p.id} className="glass-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: PROVIDER_COLORS[p.type] || 'var(--accent)' }}>{PROVIDER_ICONS[p.type] || <Bot size={18} />}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {p.type} · {p.has_key ? 'Key set' : 'No key'} · {p.enabled ? 'Enabled' : 'Disabled'}
              {p.default_model && ` · ${p.default_model}`}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeProvider(p.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  )
}

// ===== Generate Tab =====
function GenerateTab({ provider }: { provider: any }) {
  const [prompt, setPrompt] = useState('')
  const [fileType, setFileType] = useState('txt')
  const [result, setResult] = useState('')
  const [filename, setFilename] = useState('')
  const [savePath, setSavePath] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saved, setSaved] = useState(false)

  const generate = async () => {
    if (!prompt.trim()) return
    setGenerating(true); setSaved(false)
    try {
      const r = await api.post('/ai/generate-file', { prompt, file_type: fileType, provider_id: provider?.id || '' })
      setResult(r.data.content)
      setFilename(r.data.filename)
      setSavePath(`/ai_generated/${r.data.filename}`)
    } catch {} finally { setGenerating(false) }
  }

  const saveFile = async () => {
    if (!result || !savePath) return
    try {
      await api.post('/ai/generate-file', { prompt, file_type: fileType, save_path: savePath, provider_id: provider?.id || '' })
      setSaved(true)
    } catch {}
  }

  const copyContent = () => navigator.clipboard.writeText(result)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
      <div className="glass-card" style={{ padding: 14 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>AI File Generator</h4>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {[
            { id: 'txt', label: 'Text' }, { id: 'md', label: 'Markdown' },
            { id: 'html', label: 'HTML' }, { id: 'css', label: 'CSS' },
            { id: 'js', label: 'JavaScript' }, { id: 'py', label: 'Python' },
            { id: 'json', label: 'JSON' }, { id: 'sh', label: 'Shell' },
            { id: 'sql', label: 'SQL' }, { id: 'yaml', label: 'YAML' },
          ].map(t => (
            <button key={t.id} className={`btn btn-sm ${fileType === t.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFileType(t.id)} style={{ fontSize: 11 }}>{t.label}</button>
          ))}
        </div>
        <textarea placeholder="Describe what you want the AI to generate..."
          value={prompt} onChange={e => setPrompt(e.target.value)}
          style={{ width: '100%', height: 80, fontSize: 13, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button className="btn btn-primary btn-sm" onClick={generate} disabled={generating}>
            <FileCode size={14} /> {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {result && (
        <div className="glass-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{filename}</span>
            <div style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-sm" onClick={copyContent}><Download size={12} /> Copy</button>
            <button className="btn btn-primary btn-sm" onClick={saveFile}><Save size={12} /> {saved ? 'Saved!' : 'Save to Storage'}</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Save path: /storage{savePath}
          </div>
          <pre style={{
            fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: 400, overflow: 'auto', padding: 12,
            background: '#0a0a0a', borderRadius: 8, fontFamily: 'monospace'
          }}>{result}</pre>
        </div>
      )}
    </div>
  )
}

// ===== GitHub Tab =====
function GitHubTab({ provider }: { provider: any }) {
  const [repos, setRepos] = useState<any[]>([])
  const [token, setToken] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [selectedRepo, setSelectedRepo] = useState<any>(null)
  const [files, setFiles] = useState<any[]>([])
  const [filePath, setFilePath] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => { api.get('/ai/github/repos').then(r => setRepos(r.data)).catch(() => {}) }, [])

  const connect = async () => {
    if (!token || !repo) return
    await api.post('/ai/github/connect', { token, repo: repo.replace('https://github.com/', ''), branch })
    setToken(''); setRepo('')
    const r = await api.get('/ai/github/repos'); setRepos(r.data)
  }

  const disconnect = async (id: string) => {
    await api.delete(`/ai/github/${id}/disconnect`)
    setRepos(prev => prev.filter(r => r.id !== id))
    if (selectedRepo?.id === id) { setSelectedRepo(null); setFiles([]) }
  }

  const loadFiles = async (r: any, path = '') => {
    setSelectedRepo(r)
    setFilePath(path)
    try {
      const res = await api.get(`/ai/github/${r.id}/files?path=${encodeURIComponent(path)}`)
      setFiles(Array.isArray(res.data) ? res.data : [res.data])
    } catch {}
  }

  const openFile = async (item: any) => {
    if (item.type === 'dir') {
      loadFiles(selectedRepo, item.path)
    } else {
      try {
        const res = await api.get(`/ai/github/${selectedRepo.id}/files?path=${encodeURIComponent(item.path)}`)
        setFileContent(atob(res.data.content || ''))
      } catch {}
    }
  }

  const analyzeCode = async () => {
    if (!selectedRepo || !filePath) return
    setAnalyzing(true)
    try {
      const res = await api.post(`/ai/github/${selectedRepo.id}/analyze`, {
        path: filePath, query: 'Analyze this code. What does it do, and are there any issues?',
        provider_id: provider?.id || ''
      })
      setAnalysis(res.data.analysis)
    } catch {} finally { setAnalyzing(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto', height: '100%' }}>
      <div className="glass-card" style={{ padding: 14 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Github size={16} /> GitHub Connection
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input placeholder="GitHub Personal Access Token" value={token} onChange={e => setToken(e.target.value)} type="password" style={{ height: 32, fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <input placeholder="Repository (owner/repo)" value={repo} onChange={e => setRepo(e.target.value)} style={{ flex: 1, height: 32, fontSize: 13 }} />
            <input placeholder="Branch" value={branch} onChange={e => setBranch(e.target.value)} style={{ width: 100, height: 32, fontSize: 13 }} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={connect}><Github size={14} /> Connect</button>
        </div>
      </div>

      {repos.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {repos.map(r => (
            <button key={r.id} className={`btn btn-sm ${selectedRepo?.id === r.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => loadFiles(r)}>
              <Github size={12} /> {r.repo}
            </button>
          ))}
        </div>
      )}

      {selectedRepo && (
        <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
          <div style={{ width: 250, flexShrink: 0, overflow: 'auto', fontSize: 12 }}>
            <div style={{ padding: '4px 0', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => loadFiles(selectedRepo)} style={{ padding: '2px 0' }}>📁 /</button>
              {filePath && <span> / {filePath}</span>}
            </div>
            {files.map((f: any, i: number) => (
              <div key={i} style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 4 }}
                onClick={() => openFile(f)}>
                {f.type === 'dir' ? '📁' : '📄'} {f.name}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fileContent && (
              <div className="glass-card" style={{ padding: 12, flex: 1, overflow: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{filePath}</span>
                  <div style={{ flex: 1 }} />
                  <button className="btn btn-primary btn-sm" onClick={analyzeCode} disabled={analyzing}>
                    <Brain size={12} /> {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                  </button>
                </div>
                <pre style={{ fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{fileContent}</pre>
              </div>
            )}
            {analysis && (
              <div className="glass-card" style={{ padding: 12, borderLeft: '3px solid var(--accent)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>AI Analysis</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{analysis}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ===== File Intel Tab =====
function FileIntelTab({ provider }: { provider: any }) {
  const [path, setPath] = useState('')
  const [result, setResult] = useState('')

  const analyze = async () => {
    if (!path.trim()) return
    setResult('Analyzing...')
    try {
      const res = await api.post('/ai/file-intel', { path, provider_id: provider?.id || '' })
      setResult(res.data.analysis)
    } catch { setResult('Analysis failed') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="glass-card" style={{ padding: 14 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>File Intelligence</h4>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Analyze, summarize, or explain any file in storage.</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <input placeholder="File path (e.g. /notes/meeting.txt)" value={path} onChange={e => setPath(e.target.value)} style={{ flex: 1, height: 34, fontSize: 13 }} />
          <button className="btn btn-primary btn-sm" onClick={analyze}><FileSearch size={14} /> Analyze</button>
        </div>
      </div>
      {result && (
        <div className="glass-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result}</div>
        </div>
      )}
    </div>
  )
}

// ===== System Tab =====
function SystemTab({ provider }: { provider: any }) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')

  const ask = async () => {
    if (!query.trim()) return
    setResult('Analyzing system...')
    try {
      const res = await api.post('/ai/system-assistant', { query, provider_id: provider?.id || '' })
      setResult(res.data.response)
    } catch { setResult('System assistant unavailable') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="glass-card" style={{ padding: 14 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>System Assistant</h4>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Ask about system performance, diagnose issues, get recommendations.</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <input placeholder='e.g. "Why is CPU high?" or "Check disk health"' value={query}
            onChange={e => setQuery(e.target.value)} style={{ flex: 1, height: 34, fontSize: 13 }} />
          <button className="btn btn-primary btn-sm" onClick={ask}><Activity size={14} /> Ask</button>
        </div>
      </div>
      {result && (
        <div className="glass-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result}</div>
        </div>
      )}
    </div>
  )
}

// ===== Settings Tab =====
function AISettingsTab({ onUpdate }: { onUpdate: () => void }) {
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [remoteAI, setRemoteAI] = useState(false)

  useEffect(() => {
    api.get('/users/settings').then(r => {
      setRemoteAI(r.data?.remote_ai || false)
    }).catch(() => {})
  }, [])

  const toggleRemoteAI = async () => {
    const newVal = !remoteAI
    setRemoteAI(newVal)
    await api.put('/users/settings', { remote_ai: newVal })
  }

  const updateOllamaUrl = async () => {
    await api.put('/users/settings', { ollama_url: ollamaUrl })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Remote AI</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Use external AI APIs as fallback</div>
        </div>
        <button className={`btn btn-sm ${remoteAI ? 'btn-primary' : 'btn-secondary'}`} onClick={toggleRemoteAI}>
          <Wifi size={14} /> {remoteAI ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Ollama Connection</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input defaultValue="http://localhost:11434" onChange={e => setOllamaUrl(e.target.value)} style={{ flex: 1, height: 34, fontSize: 13 }} />
          <button className="btn btn-primary btn-sm" onClick={updateOllamaUrl}>Update</button>
        </div>
      </div>
    </div>
  )
}
