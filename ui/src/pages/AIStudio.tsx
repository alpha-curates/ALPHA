import React, { useEffect, useState, useRef } from 'react'
import {
  Brain, Send, Trash2, Download, Cpu, MessageSquare,
  FileSearch, Settings, ChevronDown, Plus, X, Activity,
  BarChart3, Wifi
} from 'lucide-react'
import api from '../utils/api'
import { ChatMsg } from '../types'

export default function AIStudio() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [models, setModels] = useState<any[]>([])
  const [activeModel, setActiveModel] = useState('llama3.2:1b')
  const [aiStatus, setAiStatus] = useState<any>(null)
  const [tab, setTab] = useState<'chat' | 'models' | 'file-intel' | 'system' | 'settings'>('chat')
  const [loading, setLoading] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [fileIntelPath, setFileIntelPath] = useState('')
  const [fileIntelResult, setFileIntelResult] = useState('')
  const [systemQuery, setSystemQuery] = useState('')
  const [systemResult, setSystemResult] = useState('')
  const [remoteAI, setRemoteAI] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      api.get('/ai/status').then(r => setAiStatus(r.data)),
      api.get('/ai/models').then(r => setModels(r.data.local)),
      api.get('/ai/history').then(r => setMessages(r.data)),
      api.get('/users/settings').then(r => setRemoteAI(r.data?.remote_ai || false))
    ]).catch(() => {})
  }, [])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    const userMsg: ChatMsg = { id: 'temp', role: 'user', content: input, model: activeModel, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    try {
      const res = await api.post('/ai/chat', { message: userMsg.content, model: activeModel })
      setMessages(prev => [...prev, { id: res.data.id, role: 'assistant', content: res.data.response, model: activeModel, created_at: new Date().toISOString() }])
    } catch { setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: 'AI unavailable', model: activeModel, created_at: new Date().toISOString() }]) }
    setLoading(false)
  }

  const clearHistory = async () => {
    await api.post('/ai/clear')
    setMessages([])
  }

  const pullModel = async (name: string) => {
    try {
      await api.post('/ai/models/pull', { model: name })
      const res = await api.get('/ai/models')
      setModels(res.data.local)
    } catch {}
  }

  const removeModel = async (modelId: string) => {
    try {
      await api.post('/ai/models/remove', { model_id: modelId })
      const res = await api.get('/ai/models')
      setModels(res.data.local)
    } catch {}
  }

  const analyzeFile = async () => {
    if (!fileIntelPath.trim()) return
    setFileIntelResult('Analyzing...')
    try {
      const res = await api.post('/ai/file-intel', { path: fileIntelPath, model: activeModel })
      setFileIntelResult(res.data.analysis)
    } catch { setFileIntelResult('Analysis failed') }
  }

  const askSystem = async () => {
    if (!systemQuery.trim()) return
    setSystemResult('Analyzing system...')
    try {
      const res = await api.post('/ai/system-assistant', { query: systemQuery, model: activeModel })
      setSystemResult(res.data.response)
    } catch { setSystemResult('System assistant unavailable') }
  }

  const toggleRemoteAI = async () => {
    const newVal = !remoteAI
    setRemoteAI(newVal)
    await api.put('/users/settings', { remote_ai: newVal })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Tab Bar */}
      <div className="glass-card" style={{ padding: 4, display: 'flex', gap: 4 }}>
        {[
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'models', label: 'Models', icon: Cpu },
          { id: 'file-intel', label: 'File Intel', icon: FileSearch },
          { id: 'system', label: 'System', icon: Activity },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(t => (
          <button key={t.id} className={`btn btn-ghost btn-sm ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id as any)}
            style={{ flex: 1, justifyContent: 'center', background: tab === t.id ? 'var(--accent-dim)' : 'transparent', color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)' }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: aiStatus?.ollama ? 'var(--success)' : 'var(--danger)' }} />
        <span style={{ color: 'var(--text-muted)' }}>Ollama {aiStatus?.ollama ? 'Connected' : 'Disconnected'}</span>
        <span style={{ color: 'var(--text-muted)' }}>|</span>
        <span style={{ color: 'var(--text-muted)' }}>Model: <strong>{activeModel}</strong></span>
        <span style={{ color: 'var(--text-muted)' }}>|</span>
        <span style={{ color: 'var(--text-muted)' }}>Remote AI: {remoteAI ? 'On' : 'Off'}</span>
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 ? (
              <div className="empty-state" style={{ flex: 1 }}>
                <Brain size={48} />
                <h3>AI Studio</h3>
                <p style={{ fontSize: 13 }}>Ask me anything — files, system, or just chat</p>
              </div>
            ) : messages.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 10, padding: '12px 16px', background: m.role === 'assistant' ? 'rgba(108,92,231,0.05)' : 'transparent', borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.role === 'assistant' ? 'var(--accent-dim)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {m.role === 'assistant' ? <Brain size={14} /> : <MessageSquare size={14} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {m.role === 'assistant' ? 'ALPHA AI' : 'You'} · {m.model}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                </div>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>

          <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModelDropdown(!showModelDropdown)}
                style={{ whiteSpace: 'nowrap' }}>
                {activeModel} <ChevronDown size={12} />
              </button>
              {showModelDropdown && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: 4, marginBottom: 4, zIndex: 10, minWidth: 160, maxHeight: 200, overflow: 'auto' }}>
                  {models.map(m => (
                    <button key={m.model_id || m.id} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}
                      onClick={() => { setActiveModel(m.model_id || m.name); setShowModelDropdown(false) }}>
                      {m.name || m.model_id}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input style={{ flex: 1, height: 40 }} placeholder="Ask AI anything..." value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
            <button className="btn btn-primary" onClick={sendMessage} disabled={loading}>
              <Send size={16} />
            </button>
            <button className="btn btn-ghost" onClick={clearHistory} title="Clear history">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Models Tab */}
      {tab === 'models' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Installed Models</h3>
          {models.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <Cpu size={32} />
              <h3>No models installed</h3>
              <p style={{ fontSize: 13 }}>Pull a model from Ollama to get started</p>
            </div>
          ) : models.map(m => (
            <div key={m.id || m.name} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Cpu size={20} style={{ color: 'var(--accent)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name || m.model_id}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.size || 'Unknown size'}</div>
              </div>
              <button className={`btn btn-sm ${activeModel === (m.model_id || m.name) ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveModel(m.model_id || m.name)}>
                {activeModel === (m.model_id || m.name) ? 'Active' : 'Use'}
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeModel(m.model_id)}><Trash2 size={14} /></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input placeholder="Model name (e.g. llama3.2:1b)" style={{ maxWidth: 300 }} />
            <button className="btn btn-primary btn-sm"><Download size={14} /> Pull Model</button>
          </div>
        </div>
      )}

      {/* File Intel Tab */}
      {tab === 'file-intel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>AI File Intelligence</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ask AI to analyze, summarize, or explain any file in your storage.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Path to file (e.g. /notes/meeting.txt)" value={fileIntelPath}
              onChange={e => setFileIntelPath(e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={analyzeFile}><Search size={14} /> Analyze</button>
          </div>
          {fileIntelResult && (
            <div className="glass-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{fileIntelResult}</div>
            </div>
          )}
        </div>
      )}

      {/* System Tab */}
      {tab === 'system' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>AI System Assistant</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ask about system performance, errors, or get recommendations.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder='e.g. "Why is storage slow?" or "Check system health"'
              value={systemQuery} onChange={e => setSystemQuery(e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={askSystem}><Activity size={14} /> Ask</button>
          </div>
          {systemResult && (
            <div className="glass-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{systemResult}</div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>AI Settings</h3>
          <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Remote AI</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Use external AI APIs instead of local Ollama</div>
            </div>
            <button className={`btn btn-sm ${remoteAI ? 'btn-primary' : 'btn-secondary'}`} onClick={toggleRemoteAI}>
              <Wifi size={14} /> {remoteAI ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Ollama Connection</div>
            <input defaultValue="http://localhost:11434" style={{ maxWidth: 400 }} placeholder="Ollama URL" />
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Update</button>
          </div>
        </div>
      )}
    </div>
  )
}
