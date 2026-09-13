import { useEffect, useMemo, useState, useRef } from 'react'
import { jsPDF } from 'jspdf'
import './App.css'
import { getApiBaseUrl } from './apiBase'

function App() {
  const [notes, setNotes] = useState([])
  const [page, setPage] = useState(1)
  const [limit] = useState(5)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const [entries, setEntries] = useState([])
  const [entryPage, setEntryPage] = useState(1)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [shift, setShift] = useState('morning')
  const [overtimeDate, setOvertimeDate] = useState('')
  const [overtimeWeekendHours, setOvertimeWeekendHours] = useState('0')
  const [overtimeHolidayHours, setOvertimeHolidayHours] = useState('0')
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'info', showCancel: false, confirmText: 'Aceptar', cancelText: 'Cancelar', onConfirm: null })

  const entryPageSize = 7
  const totalEntryPages = Math.max(1, Math.ceil(entries.length / entryPageSize))
  const paginatedEntries = entries.slice((entryPage - 1) * entryPageSize, entryPage * entryPageSize)

  useEffect(() => {
    if (entryPage > totalEntryPages) {
      setEntryPage(totalEntryPages)
    }
  }, [entryPage, totalEntryPages])

  const [reportMonth, setReportMonth] = useState('')
  const [report, setReport] = useState(null)
  const [reportCompany, setReportCompany] = useState('')
  const [reportCompanyResponsible, setReportCompanyResponsible] = useState('')
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [authUser, setAuthUser] = useState(localStorage.getItem('username') || '')
  const [reportWorkerName, setReportWorkerName] = useState(localStorage.getItem('username') || '')
  const [reportWorkerDni, setReportWorkerDni] = useState('')
  const [reportSchedule, setReportSchedule] = useState('')
  const [authUserField, setAuthUserField] = useState('')
  const [authPassField, setAuthPassField] = useState('')
  const notesRef = useRef(null)
  const entriesRef = useRef(null)
  const reportRef = useRef(null)
  const [activeSection, setActiveSection] = useState('notes')
  const apiBase = getApiBaseUrl()

  useEffect(() => { fetchNotes(); fetchEntries(); }, [page, search, token])

  function authHeaders() {
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  function closeModal() {
    setModal({ open: false, title: '', message: '', type: 'info', showCancel: false, confirmText: 'Aceptar', cancelText: 'Cancelar', onConfirm: null })
  }

  function showModal({ title, message, type = 'info', showCancel = false, confirmText = 'Aceptar', cancelText = 'Cancelar', onConfirm = null }) {
    setModal({ open: true, title, message, type, showCancel, confirmText, cancelText, onConfirm })
  }

  function notify(message, title = 'Aviso') {
    showModal({ title, message, type: 'info', showCancel: false, confirmText: 'Aceptar' })
  }

  function confirmAction(message, onConfirm, title = 'Confirmar') {
    showModal({ title, message, type: 'confirm', showCancel: true, confirmText: 'Aceptar', cancelText: 'Cancelar', onConfirm })
  }

  async function fetchNotes() {
    const q = search ? `&q=${encodeURIComponent(search)}` : ''
    const df = dateFrom ? `&date_from=${encodeURIComponent(dateFrom)}` : ''
    const dt = dateTo ? `&date_to=${encodeURIComponent(dateTo)}` : ''
    const res = await fetch(`${apiBase}/notes?page=${page}&limit=${limit}${q}${df}${dt}`, { headers: { 'Content-Type':'application/json', ...authHeaders() } })
    const data = await res.json()
    setNotes(data.items || [])
    setTotal(data.total || 0)
  }

  async function createNote(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (!token) {
      notify('Debes iniciar sesión para guardar notas.', 'Sesión requerida')
      return
    }
    if (!title.trim()) return notify('Título requerido', 'Error')
    const res = await fetch(`${apiBase}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ title, content })
    })
    if (res.ok) {
      setTitle(''); setContent(''); fetchNotes()
    } else {
      let msg = 'Error creando nota'
      try { const data = await res.json(); if (data && data.error) msg = data.error } catch(e){}
      if (res.status === 401) {
        notify(msg + '. Por favor inicia sesión', 'Error'); logoutAndRedirect(); return
      }
      notify(msg, 'Error')
    }
  }

  async function deleteNote(id) {
    await fetch(`${apiBase}/notes/${id}`, { method: 'DELETE', headers: authHeaders() })
    // refresh current page
    fetchNotes()
  }

  function startEdit(note) {
    setEditingId(note.id)
    setEditingTitle(note.title)
    setEditingContent(note.content)
  }

  async function saveEdit(id) {
    if (!editingTitle.trim()) return notify('Título requerido', 'Error')
    const res = await fetch(`${apiBase}/notes/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ title: editingTitle, content: editingContent })
    })
    if (res.ok) {
      setEditingId(null); setEditingTitle(''); setEditingContent(''); fetchNotes()
    } else {
      let msg = 'Error actualizando'
      try { const data = await res.json(); if (data && data.error) msg = data.error } catch(e){}
      if (res.status === 401) { notify(msg + '. Por favor inicia sesión', 'Error'); logoutAndRedirect(); return }
      notify(msg, 'Error')
    }
  }

  function cancelEdit(){ setEditingId(null); setEditingTitle(''); setEditingContent('') }

  async function fetchEntries() {
    const res = await fetch(`${apiBase}/time-entries`, { headers: authHeaders() })
    if (!res.ok) {
      // not authenticated or other error -> show empty list
      setEntries([])
      return
    }
    const data = await res.json()
    setEntries(Array.isArray(data) ? data : [])
  }

  async function createEntry(e) {
    e.preventDefault()
    if (!date || !startTime || !endTime) return notify('Fecha, entrada y salida son requeridos', 'Error')
    const res = await fetch(`${apiBase}/time-entries`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ date, start_time: startTime, end_time: endTime, shift })
    })
    if (res.ok) {
      setDate(''); setStartTime(''); setEndTime(''); setShift('morning'); fetchEntries()
    } else {
      notify('Error creando registro', 'Error')
    }
  }

  async function createOvertimeEntry(e) {
    e.preventDefault()
    const owWeekend = parseFloat(String(overtimeWeekendHours).replace(',', '.')) || 0
    const owHoliday = parseFloat(String(overtimeHolidayHours).replace(',', '.')) || 0
    if (owWeekend <= 0 && owHoliday <= 0) return notify('Agrega horas extra al menos en fin de semana o festivo', 'Error')
    const body = { overtime_weekend_minutes: owWeekend, overtime_holiday_minutes: owHoliday }
    if (overtimeDate) body.date = overtimeDate
    try {
      const res = await fetch(`${apiBase}/time-entries/overtime`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setOvertimeDate(''); setOvertimeWeekendHours('0'); setOvertimeHolidayHours('0'); fetchEntries()
        return
      }
      let msg = `Error creando horas extra (${res.status})`
      try {
        const data = await res.json()
        if (data && data.error) msg = data.error
      } catch (err) {
        const text = await res.text().catch(() => '')
        if (text) msg = `Error creando horas extra: ${text}`
      }
      notify(msg, 'Error')
    } catch (err) {
      notify(`Error creando horas extra: ${err.message}`, 'Error')
    }
  }

  async function deleteEntry(id) {
    const res = await fetch(`${apiBase}/time-entries/${id}`, { method: 'DELETE', headers: authHeaders() })
    if (res.ok) {
      fetchEntries()
    } else {
      notify('Error eliminando el registro', 'Error')
    }
  }

  function confirmDeleteEntry(id) {
    confirmAction('¿Eliminar este registro de horario?', () => deleteEntry(id), 'Eliminar registro')
  }

  function confirmDeleteNote(id) {
    confirmAction('¿Eliminar esta nota?', () => deleteNote(id), 'Eliminar nota')
  }

  function scrollToSection(ref, name) {
    if (ref && ref.current) {
      // account for sticky nav height so the section is not hidden
      const target = ref.current
      const nav = document.querySelector('.nav-blocks')
      const stickyHeight = nav ? nav.offsetHeight + 20 : 80
      const targetTop = target.getBoundingClientRect().top + window.scrollY
      const scrollTo = Math.max(0, targetTop - stickyHeight)
      window.scrollTo({ top: scrollTo, behavior: 'smooth' })
      setActiveSection(name)
    }
  }

  function formatSpanishDate(dateString) {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-')
    if (!year || !month || !day) return dateString
    return `${day}/${month}/${year}`
  }

  function formatShiftLabel(value) {
    if (value === 'morning') return 'Turno mañana'
    if (value === 'afternoon') return 'Turno tarde'
    if (value === 'night') return 'Turno noche'
    if (value === 'extra') return 'Horas extra'
    return 'Turno N/A'
  }

  function formatHoursLabel(minutes) {
    const value = Number(minutes ?? 0)
    if (Number.isNaN(value) || value <= 0) return '0'
    const hours = value / 60
    return hours.toFixed(2).replace('.', ',').replace(/,00$/, '')
  }

  function formatDuration(minutes) {
    if (minutes == null) return '-'
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  function renderOvertimeText(entry) {
    const parts = []
    if (entry.overtime_weekend_minutes && entry.overtime_weekend_minutes > 0) {
      parts.push(`+${formatHoursLabel(entry.overtime_weekend_minutes)} h fin de semana`)
    }
    if (entry.overtime_holiday_minutes && entry.overtime_holiday_minutes > 0) {
      parts.push(`+${formatHoursLabel(entry.overtime_holiday_minutes)} h festivo`)
    }
    return parts.join(' — ')
  }

  function getNoteTone(noteId = '') {
    const tones = ['tone-mango', 'tone-peach', 'tone-pink', 'tone-mint', 'tone-lavender', 'tone-sky']
    const value = String(noteId)
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash + value.charCodeAt(i)) % tones.length
    }
    return tones[hash]
  }

  function buildChecklist(content = '') {
    const lines = String(content)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
    return lines.length ? lines : ['(Sin contenido)']
  }

  async function fetchReport(e) {
    e.preventDefault()
    if (!reportMonth) return notify('Selecciona mes', 'Error')
    const res = await fetch(`${apiBase}/reports/hours?month=${reportMonth}`, { headers: authHeaders() })
    const data = await res.json()
    setReport(data)
  }

  function formatMonthLabel(monthString) {
    if (!monthString) return ''
    const [year, month] = monthString.split('-')
    return `${month}/${year}`
  }

  function buildReportEntries() {
    const filtered = entries.filter(en => en.date && en.date.startsWith(reportMonth))
    return filtered.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
  }

  async function generateReportPdf() {
    if (!reportMonth) return notify('Selecciona mes antes de generar el PDF', 'Error')

    try {
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const title = `Reporte de horas ${formatMonthLabel(reportMonth)}`

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(title, 40, 50)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const headerData = [
        ['Empresa usuaria:', reportCompany || '___________________________', 'Mes:', formatMonthLabel(reportMonth)],
        ['Responsable de la empresa:', reportCompanyResponsible || '___________________________', 'DNI:', reportWorkerDni || '___________________________'],
        ['Nombre del trabajador:', reportWorkerName || '___________________________', 'Horario habitual:', reportSchedule || '___________________________']
      ]

      autoTable(doc, {
        startY: 70,
        theme: 'grid',
        headStyles: { fillColor: [24, 37, 77], textColor: 255, halign: 'left' },
        bodyStyles: { textColor: 20 },
        styles: { cellPadding: 6, fontSize: 10 },
        head: [['Campo', 'Valor', 'Campo', 'Valor']],
        body: headerData,
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 210 },
          2: { cellWidth: 110 },
          3: { cellWidth: 110 }
        }
      })

      const afterHeaderY = doc.lastAutoTable?.finalY ?? 70
      const summaryStart = afterHeaderY + 20
      const summaryRows = [
        ['Total horas (registro)', report?.total_hours ?? '0'],
        ['Horas extra fin de semana', report?.overtime_weekend_hours ?? '0'],
        ['Horas extra festivos', report?.overtime_holiday_hours ?? '0'],
        ['Total con horas extra', report?.total_with_overtime_hours ?? '0']
      ]
      autoTable(doc, {
        startY: summaryStart,
        theme: 'grid',
        head: [['Concepto', 'Valor']],
        body: summaryRows,
        headStyles: { fillColor: [24, 37, 77], textColor: 255, halign: 'center' },
        styles: { cellPadding: 6, fontSize: 10 },
        columnStyles: { 0: { cellWidth: 270 }, 1: { cellWidth: 120 } }
      })

      const detailsStart = (doc.lastAutoTable?.finalY ?? summaryStart) + 20
      const reportData = buildReportEntries().map(en => ({
        day: en.date ? en.date.slice(8) : '-',
        morning_in: en.shift === 'morning' ? en.start_time : '',
        morning_out: en.shift === 'morning' ? en.end_time : '',
        afternoon_in: en.shift === 'afternoon' ? en.start_time : '',
        afternoon_out: en.shift === 'afternoon' ? en.end_time : '',
        night_in: en.shift === 'night' ? en.start_time : '',
        night_out: en.shift === 'night' ? en.end_time : '',
        normal: en.duration_minutes ? formatHoursLabel(en.duration_minutes) : '0',
        overtime: en.overtime_weekend_minutes ? formatHoursLabel(en.overtime_weekend_minutes) : '',
        holiday: en.overtime_holiday_minutes ? formatHoursLabel(en.overtime_holiday_minutes) : '',
        comment: en.shift === 'extra' ? 'Horas extra' : ''
      }))

      autoTable(doc, {
        startY: detailsStart,
        theme: 'grid',
        headStyles: { fillColor: [24, 37, 77], textColor: 255, halign: 'center' },
        styles: { cellPadding: 5, fontSize: 10 },
        head: [[
          'Día', 'Mañana entrada', 'Mañana salida', 'Tarde entrada', 'Tarde salida', 'Noche entrada', 'Noche salida', 'Horas normales', 'Horas extras', 'Horas festivas'
        ]],
        body: reportData.map(row => [
          row.day, row.morning_in, row.morning_out, row.afternoon_in, row.afternoon_out,
          row.night_in, row.night_out, row.normal, row.overtime, row.holiday
        ]),
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 60 },
          2: { cellWidth: 60 },
          3: { cellWidth: 60 },
          4: { cellWidth: 60 },
          5: { cellWidth: 60 },
          6: { cellWidth: 60 },
          7: { cellWidth: 60 },
          8: { cellWidth: 60 },
          9: { cellWidth: 60 }
        }
      })

      doc.save(`reporte-horas-${reportMonth}.pdf`)
      notify('PDF generado correctamente', 'Éxito')
    } catch (err) {
      notify(`Error generando PDF: ${err.message}`, 'Error')
      console.error('PDF generation error:', err)
    }
  }

  async function register(e){
    e.preventDefault()
    try {
      const res = await fetch(`${apiBase}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: authUserField, password: authPassField }) })
      const data = await res.json()
      if(res.ok){ setToken(data.token); setAuthUser(data.user.username); localStorage.setItem('token', data.token); localStorage.setItem('username', data.user.username); setAuthUserField(''); setAuthPassField('') }
      else notify(data.error || 'register error', 'Error')
    } catch (err) {
      notify(`No se pudo conectar con la API (${apiBase}). Revisa VITE_API_BASE y CORS.`, 'Error de red')
    }
  }

  async function login(e){
    e.preventDefault()
    try {
      const res = await fetch(`${apiBase}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: authUserField, password: authPassField }) })
      const data = await res.json()
      if(res.ok){ setToken(data.token); setAuthUser(data.user.username); localStorage.setItem('token', data.token); localStorage.setItem('username', data.user.username); setAuthUserField(''); setAuthPassField('') }
      else notify(data.error || 'login error', 'Error')
    } catch (err) {
      notify(`No se pudo conectar con la API (${apiBase}). Revisa VITE_API_BASE y CORS.`, 'Error de red')
    }
  }

  function logout(){ setToken(''); setAuthUser(''); localStorage.removeItem('token'); localStorage.removeItem('username'); }
  
  function logoutAndRedirect(){
    logout()
    history.pushState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const dashboardMonth = reportMonth || new Date().toISOString().slice(0, 7)
  const dashboardStats = useMemo(() => {
    const monthEntries = entries.filter(en => en.date && en.date.startsWith(dashboardMonth))
    const totalMinutes = monthEntries.reduce((acc, en) => acc + Number(en.duration_minutes || 0), 0)
    const overtimeWeekend = monthEntries.reduce((acc, en) => acc + Number(en.overtime_weekend_minutes || 0), 0)
    const overtimeHoliday = monthEntries.reduce((acc, en) => acc + Number(en.overtime_holiday_minutes || 0), 0)

    return {
      monthLabel: formatMonthLabel(dashboardMonth),
      noteCount: total,
      shiftCount: monthEntries.filter(en => en.shift !== 'extra').length,
      normalHours: formatHoursLabel(totalMinutes),
      overtimeHours: formatHoursLabel(overtimeWeekend + overtimeHoliday),
    }
  }, [entries, total, dashboardMonth])

  return (
    <div className="app-root">
      <header>
        <div>
          <h1 className="title">Blog de Notas — Cliente</h1>
          <p className="header-subtitle">Panel productivo para notas, turnos y control mensual.</p>
        </div>
        <div>
          {token ? (
            <div className="user-strip">
              <div>Usuario: {authUser}</div>
              <button className="logout-button" onClick={logoutAndRedirect}>Cerrar sesión</button>
            </div>
          ) : (
            <div>
              <a href="/">Ir a bienvenida / iniciar sesión</a>
            </div>
          )}
        </div>
      </header>

      <section className="kpi-grid" aria-label="Resumen del mes">
        <article className="kpi-card">
          <span className="kpi-label">Mes activo</span>
          <strong className="kpi-value">{dashboardStats.monthLabel || '-'}</strong>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Notas totales</span>
          <strong className="kpi-value">{dashboardStats.noteCount}</strong>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Turnos del mes</span>
          <strong className="kpi-value">{dashboardStats.shiftCount}</strong>
        </article>
        <article className="kpi-card highlight">
          <span className="kpi-label">Horas del mes</span>
          <strong className="kpi-value">{dashboardStats.normalHours} h</strong>
          <small className="kpi-foot">Extra: {dashboardStats.overtimeHours} h</small>
        </article>
      </section>

      <div className="nav-blocks">
        <button className={`nav-block ${activeSection === 'notes' ? 'active' : ''}`} onClick={() => scrollToSection(notesRef, 'notes')} aria-label="Crear nota">
          <div className="nav-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M3 21h4.5L20.5 8.99a2 2 0 0 0 0-2.83L17.86 4.5a2 2 0 0 0-2.83 0L3 16.5V21z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 7l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="nav-label">Crear Nota</div>
        </button>
        <button className={`nav-block ${activeSection === 'entries' ? 'active' : ''}`} onClick={() => scrollToSection(entriesRef, 'entries')} aria-label="Registro horario">
          <div className="nav-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
              <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="nav-label">Registro horario</div>
        </button>
        <button className={`nav-block ${activeSection === 'report' ? 'active' : ''}`} onClick={() => scrollToSection(reportRef, 'report')} aria-label="Reporte mensual">
          <div className="nav-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect x="7" y="3" width="10" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M7 11h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M11 7h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="nav-label">Reporte mensual</div>
        </button>
      </div>

      <section ref={notesRef} className="panel">
        <h2 className="title">Crear Nota</h2>
        {!token && (
          <div className="auth-warning">Inicia sesión para crear y guardar notas en tu cuenta.</div>
        )}
        <form onSubmit={createNote} className="create-note-form">
          <input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} disabled={!token} />
          <textarea
            className="note-content-input"
            placeholder="Contenido (cada linea sera un punto en tu bloc)"
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={!token}
          />
          <button className="action-btn action-primary" type="submit" onClick={createNote} disabled={!token}>Crear</button>
        </form>
        <div className="notes-toolbar">
          <input placeholder="Buscar notas..." value={search} onChange={e=>{setSearch(e.target.value); setPage(1)}} />
          <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value); setPage(1)}} />
          <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value); setPage(1)}} />
          <div>{total} resultados</div>
        </div>
        <h3 className="title">Notas</h3>
        <ul>
          {notes.length === 0 && (
            <li className="empty-state">No hay notas en este filtro. Crea la primera para iniciar tu tablero.</li>
          )}
          {notes.map(n => (
            <li key={n.id}>
              {editingId === n.id ? (
                <div className="edit-row">
                  <input value={editingTitle} onChange={e=>setEditingTitle(e.target.value)} />
                  <textarea
                    className="note-content-input compact"
                    value={editingContent}
                    onChange={e=>setEditingContent(e.target.value)}
                  />
                  <button className="action-btn action-success" onClick={()=>saveEdit(n.id)}>Guardar</button>
                  <button className="action-btn action-ghost" onClick={cancelEdit}>Cancelar</button>
                </div>
              ) : (
                <>
                  <article className={`todo-note ${getNoteTone(n.id)}`}>
                    <header className="todo-note-header">
                      <strong>{n.title}</strong>
                    </header>
                    <ul className="todo-checklist">
                      {buildChecklist(n.content).map((line, idx) => (
                        <li key={`${n.id}-${idx}`}>
                          <span className="todo-dot" aria-hidden />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                  <div className="note-actions">
                    <button className="action-btn action-ghost" onClick={() => startEdit(n)}>Editar</button>
                    <button className="action-btn action-danger" onClick={() => confirmDeleteNote(n.id)}>Eliminar</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        <div className="notes-pagination">
          <button className="action-btn action-ghost" onClick={()=>{ if(page>1) setPage(p=>p-1) }} disabled={page<=1}>Anterior</button>
          <div className="page-indicator">{page} / {Math.max(1, Math.ceil(total/limit))}</div>
          <button className="action-btn action-ghost" onClick={()=>{ if(page < Math.ceil(total/limit)) setPage(p=>p+1) }} disabled={page>=Math.ceil(total/limit)}>Siguiente</button>
        </div>
      </section>

      <section ref={entriesRef} className="panel">
        <h2 className="title">Registro horario</h2>
        <form onSubmit={createEntry}>
          <label>
            Fecha
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label>
            Hora inicio
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </label>
          <label>
            Hora fin
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </label>
          <label>
            Turno
            <select value={shift} onChange={e => setShift(e.target.value)}>
              <option value="morning">Turno mañana</option>
              <option value="afternoon">Turno tarde</option>
              <option value="night">Turno noche</option>
            </select>
          </label>
          <button className="action-btn action-primary" type="submit">Agregar registro</button>
        </form>

        <h3 className="title">Horas extra</h3>
        <form onSubmit={createOvertimeEntry} className="overtime-form">
          <label>
            Fecha (opcional)
            <input type="date" value={overtimeDate} onChange={e => setOvertimeDate(e.target.value)} />
          </label>
          <label>
            Horas extra fin de semana
            <input type="number" step="0.25" min="0" value={overtimeWeekendHours} onChange={e => setOvertimeWeekendHours(e.target.value)} placeholder="0,00" />
          </label>
          <label>
            Horas extra festivo
            <input type="number" step="0.25" min="0" value={overtimeHolidayHours} onChange={e => setOvertimeHolidayHours(e.target.value)} placeholder="0,00" />
          </label>
          <button className="action-btn action-secondary" type="submit">Agregar horas extra</button>
        </form>

        <h3 className="title">Entradas</h3>
        <ul>
          {paginatedEntries.length === 0 && (
            <li className="empty-state">Aún no hay registros horarios. Agrega una jornada para empezar a medir el mes.</li>
          )}
          {paginatedEntries.map(en => {
            const overtimeText = renderOvertimeText(en)
            return (
              <li key={en.id}>
                <div className="entry-row">
                  <span>{formatSpanishDate(en.date)}</span>
                  <span>{en.start_time} - {en.end_time}</span>
                </div>
                <div className="entry-meta">
                  <span>Duración: {formatDuration(en.duration_minutes)} h</span>
                  <span>{formatShiftLabel(en.shift)}</span>
                </div>
                {overtimeText && <div className="entry-overtime">{overtimeText}</div>}
                <button className="entry-delete action-btn action-danger" onClick={() => confirmDeleteEntry(en.id)}>Eliminar</button>
              </li>
            )
          })}
        </ul>
        {entries.length > entryPageSize && (
          <div className="entry-pagination">
            <button className="action-btn action-ghost" onClick={() => setEntryPage(p => Math.max(1, p - 1))} disabled={entryPage <= 1}>Anterior</button>
            <span>Página {entryPage} / {totalEntryPages}</span>
            <button className="action-btn action-ghost" onClick={() => setEntryPage(p => Math.min(totalEntryPages, p + 1))} disabled={entryPage >= totalEntryPages}>Siguiente</button>
          </div>
        )}
      </section>

      <section ref={reportRef} className="panel">
        <h2 className="title">Reporte mensual</h2>
        <form onSubmit={fetchReport}>
          <label>
            Mes
            <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} />
          </label>
          <label>
            Empresa usuaria
            <input value={reportCompany} onChange={e => setReportCompany(e.target.value)} placeholder="Empresa" />
          </label>
          <label>
            Responsable empresa
            <input value={reportCompanyResponsible} onChange={e => setReportCompanyResponsible(e.target.value)} placeholder="Responsable" />
          </label>
          <label>
            Nombre trabajador
            <input value={reportWorkerName} onChange={e => setReportWorkerName(e.target.value)} placeholder="Trabajador" />
          </label>
          <label>
            DNI O NIE
            <input value={reportWorkerDni} onChange={e => setReportWorkerDni(e.target.value)} placeholder="DNI" />
          </label>
          <label>
            Horario habitual
            <input value={reportSchedule} onChange={e => setReportSchedule(e.target.value)} placeholder="Ej: 08:00 - 17:00" />
          </label>
          <button className="action-btn action-primary" type="submit">Ver reporte</button>
          <button className="action-btn action-secondary" type="button" onClick={generateReportPdf}>Descargar PDF</button>
        </form>
        {report && (
          <div className="report-summary">
            <p>Mes: {report.month}</p>
            <p>Total horas (registro): {report.total_hours}</p>
            <p>Total minutos (registro): {report.total_minutes}</p>
            <p>Horas extra fin de semana: {report.overtime_weekend_hours}</p>
            <p>Horas extra festivos: {report.overtime_holiday_hours}</p>
            <p>Total con horas extra: {report.total_with_overtime_hours}</p>
          </div>
        )}
      </section>
      {/* bottom navigation (mobile) */}
      <nav className="bottom-nav" role="navigation" aria-label="Navegación inferior">
        <button className={`nav-item ${activeSection === 'notes' ? 'active' : ''}`} onClick={() => scrollToSection(notesRef, 'notes')} aria-label="Crear nota">
          <span className="bottom-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 21h4.5L20.5 8.99a2 2 0 0 0 0-2.83L17.86 4.5a2 2 0 0 0-2.83 0L3 16.5V21z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 7l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="bottom-label">Notas</span>
        </button>
        <button className={`nav-item ${activeSection === 'entries' ? 'active' : ''}`} onClick={() => scrollToSection(entriesRef, 'entries')} aria-label="Registro horario">
          <span className="bottom-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
              <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="bottom-label">Registro</span>
        </button>
        <button className={`nav-item ${activeSection === 'report' ? 'active' : ''}`} onClick={() => scrollToSection(reportRef, 'report')} aria-label="Reporte mensual">
          <span className="bottom-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="7" y="3" width="10" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M7 11h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="bottom-label">Reporte</span>
        </button>
      </nav>

      {modal.open && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className={`modal-card modal-${modal.type}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.title}</h3>
            </div>
            <div className="modal-body">
              <p>{modal.message}</p>
            </div>
            <div className="modal-actions">
              {modal.showCancel && (
                <button className="modal-button secondary" onClick={closeModal}>{modal.cancelText}</button>
              )}
              <button className="modal-button primary" onClick={() => { if (modal.onConfirm) modal.onConfirm(); closeModal() }}>{modal.confirmText}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
