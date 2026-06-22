import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login, register } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (isRegister) {
        await register(username, password)
      } else {
        await login(username, password)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred')
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>ALPHA</h1>
        <p>Personal Cloud Operating System</p>
        <form onSubmit={handleSubmit}>
          {error && <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary">
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: 13 }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  )
}
