import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { tgNotify } from '../utils/tgNotify'

/**
 * FANVUE SUPPORT CHAT — minimal, mobile-first.
 * Cleaned up: only essentials. No SLA chips, no status grid, no banners,
 * no attach button, no scroll-down FAB. Just: header → messages → input.
 */

const ease = [0.22, 1, 0.36, 1] as const
const GREEN = 'var(--fv-green, #39ff63)'
const BLACK = 'var(--fv-black, #030303)'
const TEXT = 'var(--t-primary, #fff)'
const SOFT = 'var(--t-secondary, rgba(255,255,255,0.72))'
const MUTED = 'var(--t-muted, rgba(255,255,255,0.48))'
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
  if (same(d, yest)) return lang === 'ru' ? 'Вчера' : 'Yesterday'
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<number | null>(null)

  useEffect(() => { clearSupportUnread() }, [clearSupportUnread])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])

  useEffect(() => {
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    if (last.sender !== 'user') return
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    setTyping(true)
    typingTimer.current = window.setTimeout(() => setTyping(false), 2200)
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
    t('Статус заказа', 'Order status'),
    t('Проблема с оплатой', 'Payment issue'),
    t('Срок выдачи', 'Delivery ETA'),
  ]

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
        lastDay = day
        cur = null
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
      background: BLACK,
      color: TEXT,
    }}>
      {/* ambient glow */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(60% 36% at 92% -6%, rgba(57,255,99,0.18), transparent 65%)',
      }} />

      {/* HEADER — compact */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease }}
        style={{
          position: 'relative', zIndex: 3,
          flexShrink: 0,
          padding: '10px 12px',
          paddingTop: 'max(10px, env(safe-area-inset-top))',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(3,3,3,0.86)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          display: 'flex', alignItems: 'center', gap: 11,
        }}
      >
        <motion.button
          onClick={() => { haptic('light'); navigate('/support') }}
          whileTap={{ scale: 0.92 }}
          style={{
            width: 38, height: 38,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            color: TEXT,
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label={t('Назад', 'Back')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </motion.button>

        <SupportAvatar active={typing} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: TEXT,
            fontSize: 15.5,
            fontWeight: 900,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            Fanvue Support
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 3,
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: typing ? GREEN : SOFT,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 999,
              background: GREEN,
              boxShadow: '0 0 10px rgba(57,255,99,0.7)',
            }} />
            {typing ? t('печатает…', 'typing…') : t('онлайн', 'online')}
          </div>
        </div>
      </motion.header>

      {/* MESSAGES */}
      <main
        style={{
          position: 'relative', zIndex: 1,
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          padding: '14px 12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages.length === 0 && (
          <EmptyChat
            t={t}
            quickReplies={quickReplies}
            onPick={(q) => { haptic('light'); send(q) }}
          />
        )}

        <AnimatePresence initial={false}>
          {groups.map((g) => {
            if (g.type === 'day') {
              return <DaySeparator key={g.key} label={g.label} />
            }
            const isUser = g.sender === 'user'
            return (
              <div key={g.key} style={{
                display: 'flex',
                gap: 8,
                flexDirection: isUser ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
              }}>
                {!isUser ? <SupportAvatar small /> : <div style={{ width: 4, flexShrink: 0 }} />}

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  gap: 3,
                  maxWidth: '82%',
                }}>
                  {g.items.map((msg, idx) => {
                    const isFirst = idx === 0
                    const isLast = idx === g.items.length - 1
                    const radius = isUser
                      ? `20px ${isFirst ? '20px' : '8px'} ${isLast ? '6px' : '20px'} 20px`
                      : `${isFirst ? '20px' : '8px'} 20px 20px ${isLast ? '6px' : '20px'}`
                    return (
                      <motion.article
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.22, ease }}
                        style={{
                          padding: '9px 13px 8px',
                          borderRadius: radius,
                          background: isUser
                            ? 'linear-gradient(135deg, var(--fv-green, #39ff63), var(--fv-green-2, #22e84f))'
                            : 'rgba(255,255,255,0.06)',
                          color: isUser ? '#021407' : TEXT,
                          border: isUser ? '1px solid rgba(57,255,99,0.45)' : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isUser
                            ? '0 8px 22px -14px rgba(57,255,99,0.6)'
                            : 'none',
                          fontSize: 14.5,
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                          fontWeight: isUser ? 700 : 500,
                        }}
                      >
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                        {isLast && (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            float: 'right', marginLeft: 10, marginTop: 3,
                            fontFamily: MONO,
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: isUser ? 'rgba(2,20,7,0.55)' : MUTED,
                            letterSpacing: '0.04em',
                          }}>
                            {formatTime(msg.created, lang)}
                            {isUser && msg.id === lastUserId && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 7L9.5 15.5 6 12" />
                                <path d="M22 7l-8.5 8.5" />
                              </svg>
                            )}
                          </div>
                        )}
                      </motion.article>
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
              style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}
            >
              <SupportAvatar small active />
              <div style={{
                padding: '11px 14px',
                borderRadius: '18px 18px 18px 6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: GREEN,
              }}>
                <TypingDots size={5} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </main>

      {/* INPUT */}
      <footer style={{
        position: 'relative', zIndex: 3,
        flexShrink: 0,
        padding: '8px 10px max(8px, env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(3,3,3,0.92)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        display: 'flex', alignItems: 'flex-end', gap: 8,
      }}>
        <motion.div
          animate={{
            borderColor: focused ? 'rgba(57,255,99,0.42)' : 'rgba(255,255,255,0.10)',
          }}
          transition={{ duration: 0.16 }}
          style={{
            flex: 1,
            minHeight: 44,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 22,
            padding: '0 14px',
            display: 'flex', alignItems: 'center',
          }}
        >
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
              el.style.height = Math.min(el.scrollHeight, 110) + 'px'
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: TEXT,
              fontFamily: 'inherit',
              fontSize: 15,
              lineHeight: 1.4,
              padding: '11px 0',
              maxHeight: 110,
            }}
          />
        </motion.div>

        <motion.button
          onClick={handleSend}
          disabled={!text.trim()}
          whileTap={{ scale: 0.88 }}
          animate={{ scale: text.trim() ? 1 : 0.92, opacity: text.trim() ? 1 : 0.55 }}
          transition={{ type: 'spring', stiffness: 340, damping: 24 }}
          style={{
            width: 44, height: 44, borderRadius: 22,
            flexShrink: 0,
            background: text.trim()
              ? 'linear-gradient(135deg, var(--fv-green, #39ff63), var(--fv-green-2, #22e84f))'
              : 'rgba(255,255,255,0.05)',
            border: text.trim() ? '1px solid rgba(57,255,99,0.5)' : '1px solid rgba(255,255,255,0.10)',
            color: text.trim() ? '#021407' : MUTED,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'default',
            boxShadow: text.trim() ? '0 8px 22px -10px rgba(57,255,99,0.7)' : 'none',
            transition: 'background 180ms, box-shadow 180ms',
          }}
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="m22 2-7 20-4-9-9-4 20-7Z" />
          </svg>
        </motion.button>
      </footer>
    </div>
  )
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10))' }} />
      <span style={{
        fontFamily: MONO,
        fontSize: 9,
        fontWeight: 800,
        color: MUTED,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.10), transparent)' }} />
    </div>
  )
}

function SupportAvatar({ small = false, active = false }: { small?: boolean; active?: boolean }) {
  const size = small ? 28 : 36
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', inset: -2,
          borderRadius: small ? 11 : 14,
          border: '1px solid rgba(57,255,99,0.32)',
        }}
        animate={active ? { opacity: [0.55, 0.1, 0.55], scale: [1, 1.08, 1] } : { opacity: 0.3, scale: 1 }}
        transition={{ duration: 1.8, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: small ? 10 : 13,
        background: 'linear-gradient(135deg, var(--fv-green, #39ff63), var(--fv-green-2, #22e84f))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#021407',
        fontWeight: 950,
        fontSize: small ? 9 : 11,
        letterSpacing: '-0.02em',
      }}>
        FV
      </div>
    </div>
  )
}

function EmptyChat({
  t,
  quickReplies,
  onPick,
}: {
  t: (ru: string, en: string) => string
  quickReplies: string[]
  onPick: (reply: string) => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      style={{
        margin: 'auto 0',
        display: 'grid',
        gap: 14,
        textAlign: 'center',
        padding: '0 4px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <SupportAvatar />
      </div>
      <div>
        <div style={{ color: TEXT, fontSize: 17, fontWeight: 900, lineHeight: 1.15 }}>
          {t('Чем помочь?', 'How can we help?')}
        </div>
        <div style={{ color: SOFT, fontSize: 13, lineHeight: 1.45, marginTop: 6 }}>
          {t('Опишите задачу — ответим в течение 30 минут.', 'Describe the issue — we reply within 30 min.')}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 7, marginTop: 4 }}>
        {quickReplies.map((q, i) => (
          <motion.button
            key={q}
            onClick={() => onPick(q)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease, delay: 0.1 + i * 0.04 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '11px 14px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.035)',
              color: TEXT,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {q}
          </motion.button>
        ))}
      </div>
    </motion.section>
  )
}

function TypingDots({ size = 4 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.max(2, size - 2) }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            width: size, height: size, borderRadius: '50%',
            background: 'currentColor', display: 'inline-block',
          }}
          animate={{ opacity: [0.32, 1, 0.32], y: [0, -2, 0] }}
          transition={{ duration: 1.05, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}
