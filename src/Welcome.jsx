import { useState } from 'react'
import { getApiBaseUrl } from './apiBase'

export default function Welcome() {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const apiBase = getApiBaseUrl()

  async function doLogin(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    setError('')
    if (!user || !user.toString().trim() || !pass) { setError('username and password required'); return }
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: user, password: pass }) })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('username', data.user.username)
        history.pushState({}, '', '/app')
        window.dispatchEvent(new PopStateEvent('popstate'))
      } else {
        setError(data.error || 'Error iniciando sesión')
      }
    } catch (err) {
      setError(`No se pudo conectar con la API (${apiBase}).`)
    }
    setLoading(false)
  }

  async function doRegister(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    setError('')
    if (!user || !user.toString().trim() || !pass) { setError('username and password required'); return }
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: user, password: pass }) })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('username', data.user.username)
        history.pushState({}, '', '/app')
        window.dispatchEvent(new PopStateEvent('popstate'))
      } else {
        setError(data.error || 'Error en registro')
      }
    } catch (err) {
      setError(`No se pudo conectar con la API (${apiBase}).`)
    }
    setLoading(false)
  }

  return (
    <div className="welcome-root">
      <div className="welcome-card">
        <h1 className="welcome-title">Bienvenido a Blog Notas XL</h1>
        <p className="welcome-subtitle">Crea y gestiona tus notas y registros horarios. Inicia sesión para continuar.</p>
        <p className="welcome-api">API activa: {apiBase}</p>
        <form onSubmit={doLogin} className="welcome-form">
          <input placeholder="usuario" value={user} onChange={e=>{ setUser(e.target.value); setError('') }} />
          <input placeholder="contraseña" type="password" value={pass} onChange={e=>{ setPass(e.target.value); setError('') }} onKeyDown={e => { if (e.key === 'Enter') doLogin(e) }} />
          {error && <div className="welcome-error">{error}</div>}
          <div className="welcome-actions">
            <button className="welcome-primary" type="button" onClick={doLogin} disabled={loading || !user.toString().trim() || !pass}>Entrar</button>
            <button className="welcome-secondary" type="button" onClick={doRegister} disabled={loading || !user.toString().trim() || !pass}>Registro</button>
          </div>
        </form>
      </div>
    </div>
  )
}
