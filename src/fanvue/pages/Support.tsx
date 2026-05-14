import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { tgNotify } from '../utils/tgNotify'

/**
 * SUPPORT CHAT — same visual language as SupportHub.
 * Editorial dark vault · teal accent · mono eyebrows · Inter Black.
 */

const ease = [0.22, 1, 0.36, 1] as const
const TEAL = '#5eead4'
const TEAL_DEEP = '#0ea5a3'
const MONO = 'var(--font-mono, ui-monospace, monospace)'

function formatTime(iso: string, lang: string) {
  return new Date(iso).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    hour: '2-digit', minute: '2-digit', hour12: lang !== 'ru',
  })
}

function formatDay(iso: string, lang: string) {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date(); yest.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (same(d, today)) return lang === 'ru' ? 'Сегодня' : 'Today'
  if (same(d, yest))  return lang === 'ru' ? 'Вчера'   : 'Yesterday'
  return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' })
}

export default function Support() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const messages = useStore((s) => s.supportMessages)
  const addSupportMessage = useStore((s) => s.addSupportMessage)
  const clearSupportUnread = useStore((s) => s.clearSupportUnread)
  const lang = useStore((s) => s.lang)
  const user = useStore((s) => s.user)

  const t = (ru: string, en: string) => (lang === 'ru' ? ru : en)

  const [text, setText] = useState('')
  const [kbHeight, setKbHeight] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { clearSupportUnread() }, [clearSupportUnread])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const onResize = useCallback(() => {
    const vv = window.visualViewport
    if (!vv) return
    const diff = window.innerHeight - vv.height
    setKbHeight(diff > 50 ? diff : 0)
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [onResize])

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
    let cur: { type: 'group'; key: string; sender: 'user' | 'admin'; items: typeof messages } | null = null
    messages.forEach((m) => {
      const day = new Date(m.created).toDateString()
      if (day !== lastDay) {
        out.push({ type: 'day', key: 'd-' + day, label: formatDay(m.created, lang) })
        lastDay = day; cur = null
      }
      if (!cur || cur.sender !== m.sender) {
        cur = { type: 'group', key: 'g-' + m.id, sender: m.sender, items: [] }
        out.push(cur)
      }
      cur.items.push(m)
    })
    return out
  }, [messages, lang])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      paddingBottom: kbHeight > 0 ? kbHeight : undefined,
      transition: 'padding-bottom 100ms',
      overflow: 'hidden',
    }}>
      {/* ── Ambient orbs (matching SupportHub) ─────────── */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', top: -140, right: -90, width: 320, height: 320,
          background: `radial-gradient(circle, rgba(94,234,212,0.16), transparent 65%)`,
          filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0,
        }}
        animate={{ y: [0, 18, 0], x: [0, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', bottom: -120, left: -80, width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(14,165,163,0.12), transparent 65%)',
          filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0,
        }}
        animate={{ y: [0, -16, 0], x: [0, 12, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 2,
        flexShrink: 0,
        padding: '18px 20px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(15,20,28,0.85), rgba(15,20,28,0.45))',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}>
        <motion.button
          onClick={() => { haptic('light'); navigate('/support') }}
          whileHover={{ borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.04)' }}
          whileTap={{ scale: 0.96 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 36, padding: '0 12px',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: 4, background: 'transparent',
            color: 'var(--t-primary)', cursor: 'pointer',
            fontFamily: MONO,
            fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
          aria-label="Back"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          {t('Назад', 'Back')}
        </motion.button>

        {/* Avatar */}
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
          <motion.div
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `1px solid rgba(94,234,212,0.5)`,
            }}
            animate={{ scale: [1, 1.35, 1.35], opacity: [0.6, 0, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#04201f',
            boxShadow: '0 10px 26px -10px rgba(94,234,212,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: MONO,
            fontSize: 9, fontWeight: 600, letterSpacing: '0.2em',
            color: TEAL, textTransform: 'uppercase',
            marginBottom: 4, opacity: 0.85,
          }}>
            № 02 · {t('Живой чат', 'Live chat')}
          </div>
          <div style={{
            fontWeight: 800, fontSize: 17, letterSpacing: '-0.01em',
            color: 'var(--t-primary)', lineHeight: 1.1,
          }}>
            {t('Поддержка Fanvue', 'Fanvue Support')}
          </div>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          fontFamily: MONO,
          fontSize: 9, fontWeight: 600, letterSpacing: '0.16em',
          color: 'var(--t-muted)', textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          <motion.span
            style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}
            animate={{ boxShadow: ['0 0 0 0 rgba(16,185,129,0.55)', '0 0 0 8px rgba(16,185,129,0)'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
          {t('Онлайн', 'Online')}
        </div>
      </div>

      {/* ── MESSAGES ───────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, overflowY: 'auto', minHeight: 0,
        padding: '22px 18px 14px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            style={{
              margin: 'auto', textAlign: 'center', maxWidth: 320,
              padding: '32px 20px',
            }}
          >
            <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 22px' }}>
              <motion.div
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: `1px solid rgba(94,234,212,0.4)`,
                }}
                animate={{ scale: [1, 1.4, 1.4], opacity: [0.7, 0, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              />
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#04201f',
                boxShadow: '0 14px 40px -14px rgba(94,234,212,0.55)',
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              </div>
            </div>
            <div style={{
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em',
              color: TEAL, textTransform: 'uppercase', marginBottom: 12, opacity: 0.85,
            }}>
              {t('Начните диалог', 'Start the chat')}
            </div>
            <h2 style={{
              fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em',
              color: 'var(--t-primary)', lineHeight: 1.15, margin: 0,
            }}>
              {t('Опишите вопрос —', 'Tell us what')}
              <br />
              <span style={{
                background: `linear-gradient(110deg, #fff 0%, ${TEAL} 50%, #fff 100%)`,
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontStyle: 'italic',
              }}>
                {t('ответим за минуты', 'you need help with')}
              </span>
            </h2>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {groups.map((g) => {
            if (g.type === 'day') {
              return (
                <div key={g.key} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  margin: '4px 0',
                }}>
                  <div style={{ flex: 1, height: 1, borderTop: '1px dashed rgba(255,255,255,0.08)' }} />
                  <span style={{
                    fontFamily: MONO,
                    fontSize: 9, fontWeight: 600,
                    color: 'var(--t-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.2em',
                  }}>
                    {g.label}
                  </span>
                  <div style={{ flex: 1, height: 1, borderTop: '1px dashed rgba(255,255,255,0.08)' }} />
                </div>
              )
            }
            const isUser = g.sender === 'user'
            return (
              <div key={g.key} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: 4,
              }}>
                {!isUser && (
                  <div style={{
                    fontFamily: MONO,
                    fontSize: 9, fontWeight: 600,
                    color: TEAL, opacity: 0.7,
                    textTransform: 'uppercase', letterSpacing: '0.2em',
                    marginLeft: 16, marginBottom: 4,
                  }}>
                    {t('Поддержка', 'Support')}
                  </div>
                )}
                {g.items.map((msg, idx) => {
                  const isFirst = idx === 0
                  const isLast = idx === g.items.length - 1
                  const radius = isUser
                    ? `22px ${isFirst ? '22px' : '8px'} ${isLast ? '8px' : '22px'} 22px`
                    : `${isFirst ? '22px' : '8px'} 22px 22px ${isLast ? '8px' : '22px'}`
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.22, ease }}
                      style={{
                        maxWidth: '78%',
                        padding: '12px 16px 10px',
                        borderRadius: radius,
                        background: isUser
                          ? `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`
                          : 'linear-gradient(160deg, rgba(94,234,212,0.06) 0%, rgba(20,28,38,0.85) 70%, rgba(15,20,28,0.95) 100%)',
                        color: isUser ? '#04201f' : 'var(--t-primary)',
                        border: isUser ? 'none' : '1px solid rgba(94,234,212,0.18)',
                        boxShadow: isUser
                          ? '0 14px 32px -14px rgba(94,234,212,0.55), inset 0 1px 0 rgba(255,255,255,0.2)'
                          : '0 14px 30px -16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
                        fontSize: 14.5,
                        lineHeight: 1.45,
                        wordBreak: 'break-word',
                        fontWeight: isUser ? 600 : 500,
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                      <div style={{
                        fontFamily: MONO,
                        fontSize: 9, fontWeight: 600,
                        marginTop: 6,
                        textAlign: 'right',
                        color: isUser ? 'rgba(4,32,31,0.6)' : 'var(--t-muted)',
                        letterSpacing: '0.1em',
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

      {/* ── INPUT ──────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 2,
        flexShrink: 0,
        padding: '14px 16px max(14px, env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(15,20,28,0.6), rgba(10,14,20,0.95))',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'flex-end', gap: 10,
      }}>
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 22,
          padding: '2px 6px 2px 18px',
          display: 'flex', alignItems: 'center',
          transition: 'border-color 160ms',
        }}>
          <textarea
            ref={taRef}
            placeholder={t('Сообщение...', 'Message...')}
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
              fontFamily: 'var(--font, inherit)',
              fontSize: 14.5,
              lineHeight: 1.45,
              padding: '11px 0',
              maxHeight: 120,
            }}
          />
        </div>

        <motion.button
          onClick={handleSend}
          disabled={!text.trim()}
          whileTap={{ scale: 0.9 }}
          animate={{
            scale: text.trim() ? 1 : 0.92,
            opacity: text.trim() ? 1 : 0.5,
          }}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            flexShrink: 0,
            background: text.trim()
              ? `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`
              : 'rgba(255,255,255,0.04)',
            border: text.trim() ? 'none' : '1px solid rgba(255,255,255,0.08)',
            color: text.trim() ? '#04201f' : 'var(--t-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'default',
            boxShadow: text.trim()
              ? '0 12px 28px -10px rgba(94,234,212,0.55), inset 0 1px 0 rgba(255,255,255,0.25)'
              : 'none',
            transition: 'background 200ms, box-shadow 200ms',
          }}
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </motion.button>
      </div>
    </div>
  )
}
