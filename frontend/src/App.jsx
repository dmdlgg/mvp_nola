import { useState, useRef, useEffect } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const views = {
  CHAT: 'chat',
  ORDERS: 'orders',
  HISTORY: 'history',
  SETTINGS: 'settings',
}

const demoText = `Oi, tudo bem? Preciso de:
5 caixas de leite integral
12 refrigerantes cola 2L
10 kg de arroz tipo 1
1 dúzia de café
Entregar amanhã na Rua das Flores, 45.`

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function confidenceLabel(value) {
  if (value >= 0.85) return { text: 'Alta confiança', className: 'high' }
  if (value >= 0.6) return { text: 'Confiança média', className: 'medium' }
  return { text: 'Revisar pedido', className: 'low' }
}

function statusBadge(status) {
  if (status === 'aprovado') return { text: 'Aprovado', className: 'success' }
  return { text: status, className: 'neutral' }
}

function App() {
  const [view, setView] = useState(views.CHAT)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [orders, setOrders] = useState([])
  const [approvedIds, setApprovedIds] = useState(new Set())
  const [settings, setSettings] = useState({ default_unit: 'unidade', strict_mode: false })
  const [savingSettings, setSavingSettings] = useState(false)
  const [toast, setToast] = useState('')
  const [editing, setEditing] = useState({})
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchHistory()
    fetchOrders()
    fetchSettings()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function fetchHistory() {
    try {
      const res = await fetch(`${API_URL}/history`)
      if (res.ok) setHistory(await res.json())
    } catch {
      setHistory([])
    }
  }

  async function fetchOrders() {
    try {
      const res = await fetch(`${API_URL}/orders`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
        setApprovedIds(new Set(data.map((o) => o.interpretation_id)))
      }
    } catch {
      setOrders([])
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch(`${API_URL}/settings`)
      if (res.ok) setSettings(await res.json())
    } catch {
      setSettings({ default_unit: 'unidade', strict_mode: false })
    }
  }

  async function handleSubmit() {
    if (!text.trim() || loading) return

    const userMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setText('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMessage.content }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Algo deu errado. Tente novamente.')
      }

      setMessages((prev) => [...prev, { role: 'assistant', type: 'order', data }])
      await fetchHistory()
    } catch (err) {
      const message = err.name === 'TypeError'
        ? 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.'
        : err.message

      setMessages((prev) => [...prev, { role: 'assistant', type: 'error', content: message }])
    } finally {
      setLoading(false)
    }
  }

  async function updateItem(msgIndex, itemIndex, values) {
    const interpretationId = messages[msgIndex].data.id

    const payload = {
      interpretation_id: interpretationId,
      item: {
        index: itemIndex,
        ...values,
      },
    }

    try {
      const res = await fetch(`${API_URL}/interpret`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Não foi possível salvar a alteração.')
      }

      setMessages((prev) =>
        prev.map((msg, i) => (i === msgIndex ? { ...msg, data } : msg))
      )
      setEditing((prev) => ({ ...prev, [`${msgIndex}-${itemIndex}`]: false }))
      await fetchHistory()
      setToast('Item atualizado.')
    } catch (err) {
      setToast(err.message)
    }
  }

  async function approveInterpretation(interpretationId) {
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interpretation_id: interpretationId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Não foi possível aprovar o pedido.')
      }

      setApprovedIds((prev) => new Set(prev).add(interpretationId))
      await fetchOrders()
      setToast(`Pedido #${data.id} aprovado com sucesso.`)
    } catch (err) {
      setToast(err.message)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  async function saveSettings(e) {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultUnit: settings.default_unit,
          strictMode: settings.strict_mode,
        }),
      })
      if (res.ok) {
        setSettings(await res.json())
        setToast('Configurações salvas com sucesso.')
      } else {
        throw new Error()
      }
    } catch {
      setToast('Erro ao salvar configurações.')
    } finally {
      setSavingSettings(false)
    }
  }

  function copyAsJson(data) {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setToast('JSON copiado para a área de transferência.')
  }

  function copyAsText(data) {
    const lines = data.items.map((item) => `- ${item.produto}: ${item.quantidade} ${item.unidade}`)
    navigator.clipboard.writeText(lines.join('\n'))
    setToast('Texto copiado para a área de transferência.')
  }

  function startEdit(msgIndex, itemIndex, item) {
    setEditing((prev) => ({
      ...prev,
      [`${msgIndex}-${itemIndex}`]: {
        produto: item.produto,
        quantidade: item.quantidade,
        unidade: item.unidade,
      },
    }))
  }

  function editValue(msgIndex, itemIndex, field, value) {
    setEditing((prev) => ({
      ...prev,
      [`${msgIndex}-${itemIndex}`]: {
        ...prev[`${msgIndex}-${itemIndex}`],
        [field]: value,
      },
    }))
  }

  function renderOrderBubble(msg, msgIndex) {
    const label = confidenceLabel(msg.data.confidence)
    const isApproved = approvedIds.has(msg.data.id)

    return (
      <div className="bubble assistant">
        <div className="order-header">
          <strong>Pedido interpretado</strong>
          <span className={`confidence ${label.className}`}>{label.text}</span>
        </div>

        {msg.data.items.length === 0 ? (
          <p className="no-items">Nenhum item reconhecido.</p>
        ) : (
          <ul className="order-list">
            {msg.data.items.map((item, i) => {
              const editKey = `${msgIndex}-${i}`
              const isEditing = editing[editKey]

              return (
                <li key={i} className={item.alerta ? 'warning' : ''}>
                  {isEditing && !isApproved ? (
                    <div className="edit-form">
                      <input
                        type="text"
                        value={isEditing.produto}
                        onChange={(e) => editValue(msgIndex, i, 'produto', e.target.value)}
                      />
                      <div className="edit-row">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={isEditing.quantidade}
                          onChange={(e) => editValue(msgIndex, i, 'quantidade', e.target.value)}
                        />
                        <input
                          type="text"
                          value={isEditing.unidade}
                          onChange={(e) => editValue(msgIndex, i, 'unidade', e.target.value)}
                        />
                      </div>
                      <div className="edit-actions">
                        <button
                          className="primary"
                          onClick={() =>
                            updateItem(msgIndex, i, {
                              produto: isEditing.produto,
                              quantidade: parseFloat(isEditing.quantidade),
                              unidade: isEditing.unidade,
                            })
                          }
                        >
                          Salvar
                        </button>
                        <button onClick={() => setEditing((prev) => ({ ...prev, [editKey]: false }))}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="item-info">
                        <span className="product">{item.produto}</span>
                        {item.alerta && <span className="alert-tag">{item.alerta}</span>}
                        {!isApproved && (
                          <button
                            className="edit-link"
                            onClick={() => startEdit(msgIndex, i, item)}
                          >
                            Editar
                          </button>
                        )}
                      </div>
                      <span className="meta">
                        {item.quantidade} {item.unidade}
                      </span>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="actions">
          {!isApproved && msg.data.items.length > 0 && (
            <button className="primary" onClick={() => approveInterpretation(msg.data.id)}>
              Aprovar pedido
            </button>
          )}
          {isApproved && <span className="approved-tag">Pedido aprovado</span>}
          <button onClick={() => copyAsJson(msg.data)}>Copiar JSON</button>
          <button onClick={() => copyAsText(msg.data)}>Copiar texto</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">PD</div>
          <div>
            <h1>PedidoDigital</h1>
            <span>Interpretador inteligente</span>
          </div>
        </div>
        <nav>
          <button className={`nav-item ${view === views.CHAT ? 'active' : ''}`} onClick={() => setView(views.CHAT)}>
            Novo pedido
          </button>
          <button className={`nav-item ${view === views.ORDERS ? 'active' : ''}`} onClick={() => { setView(views.ORDERS); fetchOrders() }}>
            Pedidos
          </button>
          <button className={`nav-item ${view === views.HISTORY ? 'active' : ''}`} onClick={() => { setView(views.HISTORY); fetchHistory() }}>
            Histórico
          </button>
          <button className={`nav-item ${view === views.SETTINGS ? 'active' : ''}`} onClick={() => setView(views.SETTINGS)}>
            Configurações
          </button>
        </nav>
        <footer className="sidebar-footer">
          <span>v1.0 · MVP</span>
        </footer>
      </aside>

      <main className="content">
        {view === views.CHAT && (
          <>
            <header className="topbar">
              <h2>Novo pedido</h2>
              <span className="status">IA online</span>
            </header>

            <div className="messages">
              {messages.length === 0 && (
                <div className="empty-state">
                  <h3>Envie o pedido do cliente</h3>
                  <p>Cole ou digite a mensagem e a IA extrairá os itens automaticamente.</p>
                  <button className="demo-button" onClick={() => setText(demoText)}>
                    Usar exemplo
                  </button>
                </div>
              )}

              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.role}`}>
                  {msg.role === 'user' ? (
                    <div className="bubble user">
                      <p>{msg.content}</p>
                    </div>
                  ) : msg.type === 'error' ? (
                    <div className="bubble error">
                      <strong>Ops.</strong>
                      <p>{msg.content}</p>
                    </div>
                  ) : (
                    renderOrderBubble(msg, index)
                  )}
                </div>
              ))}

              {loading && (
                <div className="message assistant">
                  <div className="bubble assistant typing">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="composer">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite ou cole o pedido aqui..."
                rows={3}
              />
              <button onClick={handleSubmit} disabled={loading || !text.trim()}>
                {loading ? '...' : 'Enviar'}
              </button>
            </div>
          </>
        )}

        {view === views.ORDERS && (
          <>
            <header className="topbar">
              <h2>Pedidos aprovados</h2>
              <span className="subtext">{orders.length} pedido{orders.length !== 1 ? 's' : ''}</span>
            </header>
            <div className="panel">
              {orders.length === 0 ? (
                <div className="empty-panel">
                  <p>Nenhum pedido aprovado ainda.</p>
                  <button className="demo-button" onClick={() => setView(views.CHAT)}>
                    Criar primeiro pedido
                  </button>
                </div>
              ) : (
                <ul className="orders-list">
                  {orders.map((order) => {
                    const badge = statusBadge(order.status)
                    return (
                      <li key={order.id} className="order-card">
                        <div className="order-card-header">
                          <div>
                            <span className="order-id">#{order.id}</span>
                            <span className={`status-badge ${badge.className}`}>{badge.text}</span>
                          </div>
                          <span className="order-date">{formatDate(order.created_at)}</span>
                        </div>
                        <ul className="order-card-items">
                          {order.items.map((item, i) => (
                            <li key={i}>
                              <span>{item.produto}</span>
                              <span>
                                {item.quantidade} {item.unidade}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {view === views.HISTORY && (
          <>
            <header className="topbar">
              <h2>Histórico de interpretações</h2>
              <span className="subtext">
                {history.length} interpretado{history.length !== 1 ? 's' : ''}
              </span>
            </header>
            <div className="panel">
              {history.length === 0 ? (
                <div className="empty-panel">
                  <p>Nenhuma interpretação ainda.</p>
                </div>
              ) : (
                <ul className="history-list">
                  {history.map((record) => {
                    const label = confidenceLabel(record.confidence)
                    return (
                      <li key={record.id} className="history-card">
                        <div className="history-header">
                          <span className="history-id">#{record.id}</span>
                          <span className="history-date">{formatDate(record.interpreted_at)}</span>
                        </div>
                        <span className={`confidence small ${label.className}`}>{label.text}</span>
                        <p className="history-text">{record.raw_text}</p>
                        <ul className="history-items">
                          {record.items.map((item, i) => (
                            <li key={i}>
                              <span>{item.produto}</span>
                              <span>
                                {item.quantidade} {item.unidade}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {view === views.SETTINGS && (
          <>
            <header className="topbar">
              <h2>Configurações</h2>
            </header>
            <div className="panel">
              <form className="settings-form" onSubmit={saveSettings}>
                <div className="field">
                  <label htmlFor="defaultUnit">Unidade padrão</label>
                  <input
                    id="defaultUnit"
                    type="text"
                    value={settings.default_unit}
                    onChange={(e) => setSettings({ ...settings, default_unit: e.target.value })}
                    placeholder="unidade"
                  />
                  <small>Usada quando o pedido não informa a unidade explicitamente.</small>
                </div>

                <div className="field inline">
                  <input
                    id="strictMode"
                    type="checkbox"
                    checked={settings.strict_mode}
                    onChange={(e) => setSettings({ ...settings, strict_mode: e.target.checked })}
                  />
                  <label htmlFor="strictMode">Modo estrito</label>
                </div>
                <small>Quando ativo, a IA ignora itens ambíguos.</small>

                <button type="submit" className="save-button" disabled={savingSettings}>
                  {savingSettings ? 'Salvando...' : 'Salvar configurações'}
                </button>
              </form>
            </div>
          </>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
