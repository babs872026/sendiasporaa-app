import { useState } from 'react'
import { API } from './apiBase'

export default function Welcome() {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function doLogin(e) {
    e.preventDefault()
    setError('')
    if (!user || !user.toString().trim() || !pass) { setError('username and password required'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: user, password: pass }) })
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
      setError(`No se pudo conectar con la API (${API}).`)
    }
    setLoading(false)
  }

  async function doRegister(e) {
    e.preventDefault()
    setError('')
    if (!user || !user.toString().trim() || !pass) { setError('username and password required'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: user, password: pass }) })
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
      setError(`No se pudo conectar con la API (${API}).`)
    }
    setLoading(false)
  }

  return (
    <div className="welcome-root">
      <div className="welcome-card">
        <h1 className="welcome-title">Bienvenido a BLOG NOTE XL</h1>
        <p>Crea y gestiona tus notas y registros horarios. Inicia sesión para continuar.</p>
        <form onSubmit={doLogin} style={{display:'flex',flexDirection:'column',gap:8}}>
          <input placeholder="usuario" value={user} onChange={e=>{ setUser(e.target.value); setError('') }} />
          <input placeholder="contraseña" type="password" value={pass} onChange={e=>{ setPass(e.target.value); setError('') }} />
          {error && <div style={{color:'#ffb4b4',marginBottom:8}}>{error}</div>}
          <div style={{display:'flex',gap:8}}>
            <button type="submit" disabled={loading || !user.toString().trim() || !pass}>Entrar</button>
            <button type="button" onClick={doRegister} disabled={loading || !user.toString().trim() || !pass}>Registro</button>
          </div>
        </form>
      </div>
    </div>
  )
}
