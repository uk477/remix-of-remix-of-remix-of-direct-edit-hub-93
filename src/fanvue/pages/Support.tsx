import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { tgNotify } from '../utils/tgNotify'

function formatTime(iso: string, lang: string) {
  return new Date(iso).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    hour: '2-digit', minute: '2-digit', hour12: lang !== 'ru',
  })
}

function formatDay(iso: string, lang: string) {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date(); yest.setDate(today.getDate() - 1)
  const isSame = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (isSame(d, today)) return lang === 'ru' ? 'Сегодня' : 'Today'
  if (isSame(d, yest))  return lang === 'ru' ? 'Вчера'   : 'Yesterday'
  return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' })
}

export default function Support() {
  const t = useT()
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const messages = useStore((s) => s.supportMessages)
  const addSupportMessage = useStore((s) => s.addSupportMessage)
  const clearSupportUnread = useStore((s) => s.clearSupportUnread)
  const lang = useStore((s) => s.lang)
  const user = useStore((s) => s.user)

  const [text, setText] = useState('')
  const [kbHeight, setKbHeight] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { clearSupportUnread() }, [clearSupportUnread])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  // Group consecutive messages from same sender + insert day separators
  const groups = useMemo(() => {
    const out: Array<
      | { type: 'day'; key: string; label: string }
      | { type: 'group'; key: string; sender: 'user' | 'admin'; items: typeof messages }
    > = []
    let lastDay = ''
    let currentGroup: { type: 'group'; key: string; sender: 'user' | 'admin'; items: typeof messages } | null = null
    messages.forEach((m) => {
      const day = new Date(m.created).toDateString()
      if (day !== lastDay) {
        out.push({ type: 'day', key: 'd-' + day, label: formatDay(m.created, lang) })
        lastDay = day
        currentGroup = null
      }
      if (!currentGroup || currentGroup.sender !== m.sender) {
        currentGroup = { type: 'group', key: 'g-' + m.id, sender: m.sender, items: [] }
        out.push(currentGroup)
      }
      currentGroup.items.push(m)
    })
    return out
  }, [messages, lang])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      paddingBottom: kbHeight > 0 ? kbHeight : undefined,
      transition: 'padding-bottom 100ms',
      background:
        'radial-gradient(1200px 600px at 100% -10%, rgba(232,201,140,0.06), transparent 60%),' +
        'radial-gradient(900px 500px at -10% 110%, rgba(232,201,140,0.04), transparent 60%),' +
        'var(--ink)',
    }}>
      {/* ─── HEADER ─────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--b-default)',
        background: 'linear-gradient(180deg, rgba(20,18,16,0.85), rgba(20,18,16,0.4))',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}>
        <motion.button
          onClick={() => navigate('/support')}
          whileTap={{ scale: 0.92 }}
          style={{
            width: 38, height: 38, borderRadius: 12,
            border: '1px solid var(--b-default)',
            background: 'var(--surface)',
            color: 'var(--t-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </motion.button>

        {/* Avatar with online dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--g-gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1a1410',
            fontFamily: 'var(--font-display)',
            fontSize: 22, fontStyle: 'italic',
            boxShadow: '0 6px 20px -8px rgba(232,201,140,0.6), 0 0 0 1px rgba(232,201,140,0.4) inset',
          }}>
            F
          </div>
          <span style={{
            position: 'absolute', right: -1, bottom: -1,
            width: 12, height: 12, borderRadius: '50%',
            background: 'var(--success)',
            border: '2px solid var(--ink)',
            boxShadow: '0 0 10px rgba(118,163,116,0.7)',
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 19, lineHeight: 1.1,
            color: 'var(--t-primary)',
            letterSpacing: '0.005em',
          }}>
            {lang === 'ru' ? 'Поддержка Fanvue' : 'Fanvue Support'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: 'var(--t-muted)',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginTop: 2,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 8px var(--success)',
            }} />
            {lang === 'ru' ? 'Онлайн · отвечаем ~30 мин' : 'Online · ~30 min reply'}
          </div>
        </div>
      </div>

      {/* ─── MESSAGES ───────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', minHeight: 0,
        padding: '20px 16px 12px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {messages.length === 0 && (
          <div style={{
            margin: 'auto', textAlign: 'center', padding: '40px 24px',
            maxWidth: 320,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--g-card-warm)',
              border: '1px solid var(--b-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
              color: 'var(--gold)',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24, color: 'var(--t-primary)', marginBottom: 8,
            }}>
              {lang === 'ru' ? 'Начните диалог' : 'Start the conversation'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--t-muted)', lineHeight: 1.5 }}>
              {lang === 'ru'
                ? 'Опишите вопрос — наш менеджер ответит в течение 30 минут.'
                : 'Send your question — our manager will respond within 30 minutes.'}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {groups.map((g) => {
            if (g.type === 'day') {
              return (
                <div key={g.key} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  margin: '6px 0',
                }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--b-default)' }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10, color: 'var(--t-faint)',
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                  }}>
                    {g.label}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--b-default)' }} />
                </div>
              )
            }
            const isUser = g.sender === 'user'
            return (
              <div key={g.key} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: 3,
              }}>
                {!isUser && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10, color: 'var(--t-faint)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    marginLeft: 14, marginBottom: 4,
                  }}>
                    {lang === 'ru' ? 'Поддержка' : 'Support'}
                  </div>
                )}
                {g.items.map((msg, idx) => {
                  const isFirst = idx === 0
                  const isLast = idx === g.items.length - 1
                  const radius = isUser
                    ? `18px ${isFirst ? '18px' : '6px'} ${isLast ? '6px' : '18px'} 18px`
                    : `${isFirst ? '18px' : '6px'} 18px 18px ${isLast ? '6px' : '18px'}`
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        maxWidth: '78%',
                        padding: '10px 14px 8px',
                        borderRadius: radius,
                        background: isUser
                          ? 'linear-gradient(135deg, #f0dfb5 0%, #e8c98c 50%, #c9a96a 100%)'
                          : 'var(--surface-2)',
                        color: isUser ? '#1a1410' : 'var(--t-primary)',
                        border: isUser ? 'none' : '1px solid var(--b-default)',
                        boxShadow: isUser
                          ? '0 8px 24px -10px rgba(232,201,140,0.4), 0 1px 0 rgba(255,255,255,0.25) inset'
                          : '0 1px 0 rgba(244,237,224,0.03) inset, 0 4px 14px -8px rgba(0,0,0,0.5)',
                        fontSize: 14.5,
                        lineHeight: 1.45,
                        wordBreak: 'break-word',
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                      <div style={{
                        fontSize: 10,
                        marginTop: 4,
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        color: isUser ? 'rgba(26,20,16,0.55)' : 'var(--t-faint)',
                        letterSpacing: '0.04em',
                      }}>
                        {formatTime(msg.created, lang)}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* ─── INPUT ──────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '12px 14px max(12px, env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--b-default)',
        background: 'linear-gradient(180deg, rgba(20,18,16,0.6), rgba(10,9,8,0.95))',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'flex-end', gap: 10,
      }}>
        <div style={{
          flex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--b-default)',
          borderRadius: 22,
          padding: '4px 6px 4px 16px',
          display: 'flex', alignItems: 'center',
          transition: 'border-color 160ms',
        }}>
          <textarea
            ref={taRef}
            placeholder={lang === 'ru' ? 'Сообщение...' : 'Message...'}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              const el = e.target as HTMLTextAreaElement
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--t-primary)',
              fontFamily: 'var(--font)',
              fontSize: 14.5,
              lineHeight: 1.45,
              padding: '10px 0',
              maxHeight: 120,
            }}
          />
        </div>

        <motion.button
          onClick={handleSend}
          disabled={!text.trim()}
          whileTap={{ scale: 0.88 }}
          animate={{
            scale: text.trim() ? 1 : 0.92,
            opacity: text.trim() ? 1 : 0.5,
          }}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            flexShrink: 0,
            background: text.trim() ? 'var(--g-gold)' : 'var(--surface-2)',
            border: text.trim() ? 'none' : '1px solid var(--b-default)',
            color: text.trim() ? '#1a1410' : 'var(--t-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'default',
            boxShadow: text.trim()
              ? '0 8px 22px -8px rgba(232,201,140,0.55), 0 1px 0 rgba(255,255,255,0.3) inset'
              : 'none',
            transition: 'background 200ms, box-shadow 200ms',
          }}
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </motion.button>
      </div>
    </div>
  )
}
