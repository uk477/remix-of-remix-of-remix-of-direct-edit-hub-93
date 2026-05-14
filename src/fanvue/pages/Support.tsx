import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { tgNotify } from '../utils/tgNotify'

/**
 * SUPPORT CHAT — designer-grade.
 * Editorial dark vault · teal accent · mono eyebrows · Inter Black.
 * Quick replies, read-receipts, typing dots, smart input, scroll-to-bottom.
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
  const [focused, setFocused] = useState(false)
  const [typing, setTyping] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<number | null>(null)

  useEffect(() => { clearSupportUnread() }, [clearSupportUnread])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])

  // simulate typing reply when user sends a message
  useEffect(() => {
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    if (last.sender !== 'user') return
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    setTyping(true)
    typingTimer.current = window.setTimeout(() => setTyping(false), 2600)
    return () => { if (typingTimer.current) window.clearTimeout(typingTimer.current) }
  }, [messages])

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

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollDown(distFromBottom > 240)
  }

  const send = (value: string) => {
    const trimmed = value.trim()
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
  }

  const handleSend = () => {
    send(text)
    setText('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  const quickReplies = [
    t('Не пришёл заказ', "Order didn't arrive"),
    t('Вопрос по оплате', 'Payment question'),
    t('Не работает функция', 'Something broken'),
    t('Хочу вернуть деньги', 'Refund request'),
  ]

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

  const lastUserId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].sender === 'user') return messages[i].id
    return null
  }, [messages])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      paddingBottom: kbHeight > 0 ? kbHeight : undefined,
      transition: 'padding-bottom 100ms',
      overflow: 'hidden',
    }}>
      {/* ── Ambient orbs ─────────── */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', top: -160, right: -110, width: 360, height: 360,
          background: `radial-gradient(circle, rgba(94,234,212,0.18), transparent 65%)`,
          filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0,
        }}
        animate={{ y: [0, 18, 0], x: [0, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', bottom: -140, left: -100, width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(14,165,163,0.14), transparent 65%)',
          filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0,
        }}
        animate={{ y: [0, -16, 0], x: [0, 12, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* subtle grain */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        opacity: 0.035, mixBlendMode: 'overlay',
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>")',
      }} />

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 2,
        flexShrink: 0,
        padding: '14px 18px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(180deg, rgba(10,14,20,0.88), rgba(10,14,20,0.55))',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      }}>
        <motion.button
          onClick={() => { haptic('light'); navigate('/support') }}
          whileHover={{ borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.04)' }}
          whileTap={{ scale: 0.94 }}
          style={{
            width: 36, height: 36,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 10, background: 'rgba(255,255,255,0.02)',
            color: 'var(--t-primary)', cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Back"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </motion.button>

        {/* Avatar */}
        <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
          <motion.div
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `1px solid rgba(94,234,212,0.5)`,
            }}
            animate={{ scale: [1, 1.4, 1.4], opacity: [0.55, 0, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#04201f', fontWeight: 800, fontSize: 15,
            boxShadow: '0 10px 26px -10px rgba(94,234,212,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}>
            FV
          </div>
          <div style={{
            position: 'absolute', right: -1, bottom: -1, width: 12, height: 12,
            borderRadius: '50%', background: '#10b981',
            border: '2px solid #0a0e14',
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.01em',
            color: 'var(--t-primary)', lineHeight: 1.15,
          }}>
            {t('Поддержка Fanvue', 'Fanvue Support')}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 3,
            fontFamily: MONO,
            fontSize: 9.5, fontWeight: 600, letterSpacing: '0.14em',
            color: 'var(--t-muted)', textTransform: 'uppercase',
            height: 12,
          }}>
            <AnimatePresence mode="wait">
              {typing ? (
                <motion.span
                  key="typing"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={{ color: TEAL, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {t('Печатает', 'Typing')}
                  <TypingDots />
                </motion.span>
              ) : (
                <motion.span
                  key="online"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
                  {t('Онлайн · отвечает за мин', 'Online · replies in min')}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <motion.button
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
          whileTap={{ scale: 0.92 }}
          style={{
            width: 36, height: 36,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, background: 'transparent',
            color: 'var(--t-muted)', cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Info"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </motion.button>
      </div>

      {/* ── MESSAGES ───────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          position: 'relative', zIndex: 1,
          flex: 1, overflowY: 'auto', minHeight: 0,
          padding: '20px 16px 14px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            style={{
              margin: 'auto 0', maxWidth: 460, width: '100%',
              padding: '8px 4px',
            }}
          >
            {/* welcome bubble from support */}
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease, delay: 0.15 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                marginBottom: 22,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#04201f', fontWeight: 800, fontSize: 11,
                boxShadow: '0 8px 20px -8px rgba(94,234,212,0.5)',
              }}>FV</div>
              <div style={{
                maxWidth: '82%',
                padding: '12px 16px 11px',
                borderRadius: '4px 18px 18px 18px',
                background: 'linear-gradient(160deg, rgba(94,234,212,0.07) 0%, rgba(20,28,38,0.85) 70%, rgba(15,20,28,0.95) 100%)',
                border: '1px solid rgba(94,234,212,0.16)',
                color: 'var(--t-primary)',
                fontSize: 14.5, lineHeight: 1.5,
                boxShadow: '0 14px 30px -16px rgba(0,0,0,0.6)',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {t('Привет 👋', 'Hey there 👋')}
                </div>
                <div style={{ color: 'var(--t-muted)', fontSize: 13.5 }}>
                  {t(
                    'Я на связи. Опишите вопрос или выберите тему ниже — отвечу в течение пары минут.',
                    "I'm here. Describe your question or pick a topic below — I'll reply in a couple of minutes.",
                  )}
                </div>
              </div>
            </motion.div>

            {/* quick replies */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8,
              paddingLeft: 42,
            }}>
              {quickReplies.map((q, i) => (
                <motion.button
                  key={q}
                  onClick={() => { haptic('light'); send(q) }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, ease, delay: 0.35 + i * 0.06 }}
                  whileHover={{
                    backgroundColor: 'rgba(94,234,212,0.08)',
                    borderColor: 'rgba(94,234,212,0.4)',
                    color: TEAL,
                  }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.02)',
                    color: 'var(--t-primary)',
                    fontSize: 12.5, fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'color 160ms',
                  }}
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {groups.map((g) => {
            if (g.type === 'day') {
              return (
                <div key={g.key} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  margin: '6px 0 2px',
                }}>
                  <div style={{ flex: 1, height: 1, borderTop: '1px dashed rgba(255,255,255,0.08)' }} />
                  <span style={{
                    fontFamily: MONO,
                    fontSize: 9, fontWeight: 600,
                    color: 'var(--t-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.2em',
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
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
                display: 'flex',
                gap: 10,
                flexDirection: isUser ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
              }}>
                {!isUser ? (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#04201f', fontWeight: 800, fontSize: 9.5,
                    boxShadow: '0 6px 16px -6px rgba(94,234,212,0.5)',
                    marginBottom: 2,
                  }}>FV</div>
                ) : <div style={{ width: 28, flexShrink: 0 }} />}

                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  gap: 3, maxWidth: 'calc(100% - 38px)',
                }}>
                  {g.items.map((msg, idx) => {
                    const isFirst = idx === 0
                    const isLast = idx === g.items.length - 1
                    const radius = isUser
                      ? `20px ${isFirst ? '20px' : '6px'} ${isLast ? '6px' : '20px'} 20px`
                      : `${isFirst ? '20px' : '6px'} 20px 20px ${isLast ? '6px' : '20px'}`
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.24, ease }}
                        style={{
                          position: 'relative',
                          padding: '10px 14px 9px',
                          borderRadius: radius,
                          background: isUser
                            ? `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`
                            : 'linear-gradient(160deg, rgba(94,234,212,0.05) 0%, rgba(22,30,40,0.92) 70%, rgba(15,20,28,0.96) 100%)',
                          color: isUser ? '#04201f' : 'var(--t-primary)',
                          border: isUser ? 'none' : '1px solid rgba(94,234,212,0.16)',
                          boxShadow: isUser
                            ? '0 12px 28px -14px rgba(94,234,212,0.55), inset 0 1px 0 rgba(255,255,255,0.22)'
                            : '0 12px 26px -16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
                          fontSize: 14.5,
                          lineHeight: 1.45,
                          wordBreak: 'break-word',
                          fontWeight: isUser ? 600 : 500,
                        }}
                      >
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                        {isLast && (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            float: 'right', marginLeft: 10, marginTop: 4,
                            fontFamily: MONO,
                            fontSize: 9.5, fontWeight: 600,
                            color: isUser ? 'rgba(4,32,31,0.65)' : 'var(--t-muted)',
                            letterSpacing: '0.08em',
                          }}>
                            {formatTime(msg.created, lang)}
                            {isUser && msg.id === lastUserId && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 7L9.5 15.5 6 12"/>
                                <path d="M22 7l-8.5 8.5"/>
                              </svg>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {typing && (
            <motion.div
              key="typing-bubble"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#04201f', fontWeight: 800, fontSize: 9.5,
              }}>FV</div>
              <div style={{
                padding: '12px 16px',
                borderRadius: '18px 18px 18px 6px',
                background: 'linear-gradient(160deg, rgba(94,234,212,0.06) 0%, rgba(22,30,40,0.9) 100%)',
                border: '1px solid rgba(94,234,212,0.16)',
              }}>
                <TypingDots size={6} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* scroll-to-bottom */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            whileTap={{ scale: 0.92 }}
            style={{
              position: 'absolute', right: 18, bottom: 96, zIndex: 3,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(15,20,28,0.92)',
              border: '1px solid rgba(94,234,212,0.3)',
              color: TEAL, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 12px 30px -10px rgba(0,0,0,0.6)',
            }}
            aria-label="Scroll down"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── INPUT ──────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 2,
        flexShrink: 0,
        padding: '12px 14px max(12px, env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(180deg, rgba(10,14,20,0.55), rgba(10,14,20,0.95))',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        display: 'flex', alignItems: 'flex-end', gap: 10,
      }}>
        <motion.div
          animate={{
            borderColor: focused ? 'rgba(94,234,212,0.35)' : 'rgba(255,255,255,0.08)',
            boxShadow: focused
              ? '0 0 0 4px rgba(94,234,212,0.08), 0 8px 24px -12px rgba(94,234,212,0.3)'
              : '0 0 0 0 rgba(94,234,212,0)',
          }}
          transition={{ duration: 0.2 }}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 22,
            padding: '2px 6px 2px 6px',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
          <button
            type="button"
            onClick={() => haptic('light')}
            style={{
              width: 36, height: 36, flexShrink: 0,
              borderRadius: '50%', border: 'none',
              background: 'transparent', color: 'var(--t-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Attach"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <textarea
            ref={taRef}
            placeholder={t('Сообщение…', 'Message…')}
            value={text}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
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
              padding: '11px 4px',
              maxHeight: 120,
            }}
          />
        </motion.div>

        <motion.button
          onClick={handleSend}
          disabled={!text.trim()}
          whileTap={{ scale: 0.88 }}
          animate={{
            scale: text.trim() ? 1 : 0.92,
            rotate: text.trim() ? 0 : -90,
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </motion.button>
      </div>
    </div>
  )
}

function TypingDots({ size = 4 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size - 1 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            width: size, height: size, borderRadius: '50%',
            background: 'currentColor', display: 'inline-block',
          }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}
