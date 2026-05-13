import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { tgNotify } from '../utils/tgNotify'
import NotificationBell from '../components/NotificationBell'
import { SettingsIcon } from '../components/NavIcons'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function Support() {
  const t = useT()
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const messages = useStore((s) => s.supportMessages)
  const addSupportMessage = useStore((s) => s.addSupportMessage)
  const clearSupportUnread = useStore((s) => s.clearSupportUnread)
  const orders = useStore((s) => s.orders)
  const lang = useStore((s) => s.lang)
  const user = useStore((s) => s.user)

  // detect active order from forwarded messages
  const chatOrderId = (() => {
    for (const m of messages) {
      const match = m.text.match(/#([\w_]+)/)
      if (match) return match[1]
    }
    return null
  })()
  const chatOrder = chatOrderId ? orders.find((o) => o.id === chatOrderId) : null
  const [text, setText] = useState('')
  const [kbHeight, setKbHeight] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { clearSupportUnread() }, [clearSupportUnread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleViewportResize = useCallback(() => {
    const vv = window.visualViewport
    if (!vv) return
    const diff = window.innerHeight - vv.height
    setKbHeight(diff > 50 ? diff : 0)
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    vv.addEventListener('resize', handleViewportResize)
    return () => vv.removeEventListener('resize', handleViewportResize)
  }, [handleViewportResize])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    haptic('light')
    addSupportMessage({
      id: Date.now(),
      sender: 'user',
      text: trimmed,
      created: new Date().toISOString(),
    })
    tgNotify(
      `💬 Сообщение в поддержку\n👤 ${user?.username ? '@' + user.username : user?.full_name ?? '—'} (ID: ${user?.uid})\n\n${trimmed}`
    )
    setText('')
  }

  return (
    <div ref={containerRef} style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      paddingBottom: kbHeight > 0 ? kbHeight : undefined,
      transition: 'padding-bottom 100ms',
    }}>
        {/* Header */}
        <div className="pg-header" style={{ flexShrink: 0, padding: '12px 16px' }}>
          <div className="row gap-3 items-center">
            <div style={{ color: 'var(--brand)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div>
              <div className="pg-title">{t('support_title')}</div>
              <div className="t-xs t-muted">{t('support_hint')}</div>
            </div>
          </div>
          <div className="row gap-2">
            <NotificationBell />
            <motion.button
              className="card"
              style={{ padding: 10, color: 'var(--t-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => navigate('/settings')}
              whileTap={{ scale: 0.9 }}
            >
              <SettingsIcon size={20} />
            </motion.button>
          </div>
        </div>

        {/* Order status bar */}
        {chatOrder && (
          <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <div style={{
              background: chatOrder.status === 'completed' ? 'rgba(0,201,141,0.08)' : 'rgba(255,165,0,0.08)',
              border: `1px solid ${chatOrder.status === 'completed' ? 'rgba(0,201,141,0.25)' : 'rgba(255,165,0,0.25)'}`,
              borderRadius: 12, padding: '10px 14px',
            }}>
              <div className="t-xs fw-bold" style={{ color: chatOrder.status === 'completed' ? 'var(--success)' : 'var(--orange)', marginBottom: 8 }}>
                {chatOrder.product_title ?? chatOrder.id} · ${chatOrder.amount.toFixed(2)}
              </div>
              <div className="row gap-2">
                {(['paid', 'processing', 'completed'] as const).map((s, i) => {
                  const labels = lang === 'ru'
                    ? { paid: '✅ Оплачен', processing: '📦 Выдаётся', completed: '🎉 Выдан' }
                    : { paid: '✅ Paid', processing: '📦 Processing', completed: '🎉 Delivered' }
                  const active = (chatOrder.status === 'paid' && i === 0) ||
                    (chatOrder.status === 'completed' && i <= 2)
                  return (
                    <div key={s} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: 3, borderRadius: 9999, marginBottom: 4, background: active ? (chatOrder.status === 'completed' ? 'var(--success)' : 'var(--orange)') : 'var(--b-default)' }} />
                      <div style={{ fontSize: 10, color: active ? 'var(--t-primary)' : 'var(--t-muted)', fontWeight: active ? 700 : 400 }}>
                        {labels[s]}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Messages — own scroll */}
        <div
          className="chat-list"
          style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px', minHeight: 0 }}
        >
          {messages.length === 0 && (
            <div className="text-center" style={{ padding: '60px 20px', color: 'var(--t-muted)' }}>
              <div style={{ color: 'var(--brand)', opacity: 0.5, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div className="t-md fw-bold" style={{ color: 'var(--t-primary)' }}>{t('support_empty')}</div>
              <div className="t-xs t-muted mt-2">{t('support_hint')}</div>
            </div>
          )}
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                className={`col ${msg.sender === 'user' ? 'items-end' : ''}`}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i < 3 ? i * 0.05 : 0, duration: 0.25 }}
              >
                {msg.sender !== 'user' && (
                  <div className="t-xs t-muted mb-1" style={{ paddingLeft: 4 }}>
                    {t('support_admin')}
                  </div>
                )}
                <div className={`bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-admin'}`}>
                  {msg.text}
                </div>
                <div className={`bubble-time ${msg.sender === 'user' ? 't-secondary' : 't-muted'}`}>
                  {formatTime(msg.created)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input — fixed to bottom */}
        <div className="chat-input-bar" style={{ flexShrink: 0 }}>
          <textarea
            className="input"
            style={{ flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 14 }}
            placeholder={t('support_placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={1}
          />
          <motion.button
            className="btn btn-primary btn-icon"
            onClick={handleSend}
            disabled={!text.trim()}
            whileTap={{ scale: 0.9 }}
            style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, padding: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </motion.button>
        </div>
    </div>
  )
}
