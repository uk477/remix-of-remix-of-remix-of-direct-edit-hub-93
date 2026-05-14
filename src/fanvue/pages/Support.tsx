import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { tgNotify } from '../utils/tgNotify'

/**
 * FANVUE SUPPORT CHAT
 * Black creator-commerce console · Fanvue green · focused mobile support desk.
 */

const ease = [0.22, 1, 0.36, 1] as const
const GREEN = 'var(--fv-green, #39ff63)'
const GREEN_2 = 'var(--fv-green-2, #22e84f)'
const BLACK = 'var(--fv-black, #030303)'
const PANEL = 'var(--fv-panel, #101111)'
const PANEL_2 = 'var(--fv-panel-2, #171918)'
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
  const [showScrollDown, setShowScrollDown] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
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

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollDown(distFromBottom > 220)
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
    t('Статус заказа', 'Order status'),
    t('Проблема с оплатой', 'Payment issue'),
    t('Срок выдачи', 'Delivery ETA'),
    t('Нужен оператор', 'Need an operator'),
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

  const lastMessageTime = messages.length > 0 ? formatTime(messages[messages.length - 1].created, lang) : '—'

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
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(70% 42% at 94% -8%, rgba(57,255,99,0.24), transparent 64%)',
          'linear-gradient(115deg, rgba(57,255,99,0.08) 0%, transparent 28%, transparent 100%)',
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(57,255,99,0.035) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: 'auto, auto, 64px 64px, 64px 64px',
        maskImage: 'linear-gradient(to bottom, #000 0%, #000 74%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 74%, transparent 100%)',
      }} />

      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease }}
        style={{
          position: 'relative', zIndex: 3,
          flexShrink: 0,
          padding: '16px 18px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, rgba(3,3,3,0.96), rgba(3,3,3,0.76))',
          backdropFilter: 'blur(22px) saturate(150%)',
          WebkitBackdropFilter: 'blur(22px) saturate(150%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.button
            onClick={() => { haptic('light'); navigate('/support') }}
            whileTap={{ scale: 0.94 }}
            style={{
              width: 42, height: 42,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.035)',
              color: TEXT,
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label={t('Назад', 'Back')}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </motion.button>

          <SupportAvatar large active={typing} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: MONO,
              fontSize: 9,
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: '0.18em',
              color: GREEN,
              textTransform: 'uppercase',
              marginBottom: 7,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN, boxShadow: '0 0 16px rgba(57,255,99,0.8)' }} />
              {typing ? t('Печатает', 'Typing') : t('Онлайн · 24/7', 'Online · 24/7')}
              {typing && <TypingDots />}
            </div>
            <div style={{
              color: TEXT,
              fontSize: 18,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              Fanvue Support Desk
            </div>
          </div>

          <div style={{
            flexShrink: 0,
            minWidth: 74,
            padding: '8px 10px',
            borderRadius: 14,
            background: 'rgba(57,255,99,0.07)',
            border: '1px solid rgba(57,255,99,0.18)',
            textAlign: 'right',
          }}>
            <div style={{ fontFamily: MONO, color: GREEN, fontSize: 9, fontWeight: 900, letterSpacing: '0.12em' }}>
              SLA
            </div>
            <div style={{ color: SOFT, fontSize: 11.5, fontWeight: 700, marginTop: 2 }}>
              {t('до 30м', '< 30m')}
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          marginTop: 14,
        }}>
          <StatusChip label={t('Кейс', 'Case')} value="#FV-0214" />
          <StatusChip label={t('Сообщений', 'Messages')} value={String(messages.length)} />
          <StatusChip label={t('Апдейт', 'Update')} value={lastMessageTime} />
        </div>
      </motion.header>

      <main
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          position: 'relative', zIndex: 1,
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          padding: '18px 16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {messages.length === 0 && (
          <EmptyChat
            t={t}
            quickReplies={quickReplies}
            onPick={(q) => { haptic('light'); send(q) }}
          />
        )}

        {messages.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              borderRadius: 18,
              border: '1px solid rgba(57,255,99,0.14)',
              background: 'linear-gradient(135deg, rgba(57,255,99,0.08), rgba(255,255,255,0.025))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(57,255,99,0.12)',
              color: GREEN,
              flexShrink: 0,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: TEXT, fontWeight: 850, fontSize: 13.5, lineHeight: 1.2 }}>
                {t('Диалог закреплён за live-командой', 'Live team is handling this thread')}
              </div>
              <div style={{ color: MUTED, fontSize: 11.5, lineHeight: 1.35, marginTop: 2 }}>
                {t('Платежи, выдача и доступ — в одном тикете.', 'Payments, delivery and access — one ticket.')}
              </div>
            </div>
          </motion.section>
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
                gap: 10,
                flexDirection: isUser ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
              }}>
                {!isUser ? <SupportAvatar /> : <div style={{ width: 30, flexShrink: 0 }} />}

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  gap: 5,
                  maxWidth: 'min(78%, 560px)',
                }}>
                  {g.items.map((msg, idx) => {
                    const isFirst = idx === 0
                    const isLast = idx === g.items.length - 1
                    const radius = isUser
                      ? `22px ${isFirst ? '22px' : '10px'} ${isLast ? '8px' : '22px'} 22px`
                      : `${isFirst ? '22px' : '10px'} 22px 22px ${isLast ? '8px' : '22px'}`
                    return (
                      <motion.article
                        key={msg.id}
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.25, ease }}
                        style={{
                          position: 'relative',
                          padding: isUser ? '12px 14px 10px 15px' : '12px 15px 10px 14px',
                          borderRadius: radius,
                          background: isUser
                            ? 'linear-gradient(135deg, var(--fv-green, #39ff63), var(--fv-green-2, #22e84f))'
                            : 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.028))',
                          color: isUser ? '#021407' : TEXT,
                          border: isUser ? '1px solid rgba(57,255,99,0.5)' : '1px solid rgba(255,255,255,0.10)',
                          boxShadow: isUser
                            ? '0 14px 34px -18px rgba(57,255,99,0.7), inset 0 1px 0 rgba(255,255,255,0.36)'
                            : '0 16px 34px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
                          fontSize: 14.5,
                          lineHeight: 1.48,
                          wordBreak: 'break-word',
                          fontWeight: isUser ? 800 : 650,
                          letterSpacing: 0,
                        }}
                      >
                        {!isUser && (
                          <div aria-hidden style={{
                            position: 'absolute',
                            left: 0,
                            top: 12,
                            bottom: 12,
                            width: 2,
                            borderRadius: 99,
                            background: GREEN,
                            opacity: 0.8,
                          }} />
                        )}
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                        {isLast && (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            float: 'right', marginLeft: 12, marginTop: 5,
                            fontFamily: MONO,
                            fontSize: 9.5,
                            fontWeight: 800,
                            color: isUser ? 'rgba(2,20,7,0.58)' : MUTED,
                            letterSpacing: '0.08em',
                          }}>
                            {formatTime(msg.created, lang)}
                            {isUser && msg.id === lastUserId && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}
            >
              <SupportAvatar active />
              <div style={{
                padding: '13px 17px',
                borderRadius: '20px 20px 20px 8px',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.028))',
                border: '1px solid rgba(255,255,255,0.10)',
                color: GREEN,
                boxShadow: '0 16px 34px -20px rgba(0,0,0,0.8)',
              }}>
                <TypingDots size={6} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </main>

      <AnimatePresence>
        {showScrollDown && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            whileTap={{ scale: 0.92 }}
            style={{
              position: 'absolute', right: 18, bottom: 116, zIndex: 4,
              width: 42, height: 42, borderRadius: 15,
              background: 'rgba(10,12,11,0.94)',
              border: '1px solid rgba(57,255,99,0.32)',
              color: GREEN,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 16px 34px -14px rgba(0,0,0,0.75)',
            }}
            aria-label="Scroll down"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <footer style={{
        position: 'relative', zIndex: 3,
        flexShrink: 0,
        padding: '10px 14px max(12px, env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(180deg, rgba(3,3,3,0.72), rgba(3,3,3,0.98))',
        backdropFilter: 'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
      }}>
        {messages.length > 0 && (
          <div style={{
            display: 'flex', gap: 8,
            overflowX: 'auto',
            padding: '0 0 9px',
            scrollbarWidth: 'none',
          }}>
            {quickReplies.map((q) => (
              <motion.button
                key={q}
                type="button"
                onClick={() => { haptic('light'); send(q) }}
                whileTap={{ scale: 0.96 }}
                style={{
                  flex: '0 0 auto',
                  padding: '8px 11px',
                  borderRadius: 999,
                  border: '1px solid rgba(57,255,99,0.18)',
                  background: 'rgba(57,255,99,0.055)',
                  color: SOFT,
                  fontSize: 11.5,
                  fontWeight: 760,
                  cursor: 'pointer',
                  letterSpacing: 0,
                }}
              >
                {q}
              </motion.button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9 }}>
          <motion.div
            animate={{
              borderColor: focused ? 'rgba(57,255,99,0.42)' : 'rgba(255,255,255,0.12)',
              boxShadow: focused
                ? '0 0 0 4px rgba(57,255,99,0.08), 0 12px 30px -18px rgba(57,255,99,0.65)'
                : '0 0 0 0 rgba(57,255,99,0)',
            }}
            transition={{ duration: 0.18 }}
            style={{
              flex: 1,
              minHeight: 50,
              background: 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 18,
              padding: '3px 5px',
              display: 'flex', alignItems: 'center', gap: 3,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <button
              type="button"
              onClick={() => haptic('light')}
              style={{
                width: 40, height: 40, flexShrink: 0,
                borderRadius: 14,
                border: 'none',
                background: 'transparent',
                color: MUTED,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Attach"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <textarea
              ref={taRef}
              placeholder={t('Напишите в support desk…', 'Message support desk…')}
              value={text}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(e) => {
                setText(e.target.value)
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 118) + 'px'
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
                fontFamily: 'var(--font, inherit)',
                fontSize: 14.5,
                lineHeight: 1.45,
                padding: '12px 4px',
                maxHeight: 118,
                letterSpacing: 0,
              }}
            />
          </motion.div>

          <motion.button
            onClick={handleSend}
            disabled={!text.trim()}
            whileTap={{ scale: 0.88 }}
            animate={{ scale: text.trim() ? 1 : 0.94 }}
            transition={{ type: 'spring', stiffness: 330, damping: 24 }}
            style={{
              width: 50, height: 50, borderRadius: 17,
              flexShrink: 0,
              background: text.trim()
                ? 'linear-gradient(135deg, var(--fv-green, #39ff63), var(--fv-green-2, #22e84f))'
                : 'rgba(255,255,255,0.055)',
              border: text.trim() ? '1px solid rgba(57,255,99,0.55)' : '1px solid rgba(255,255,255,0.12)',
              color: text.trim() ? '#021407' : MUTED,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: text.trim() ? 'pointer' : 'default',
              boxShadow: text.trim()
                ? '0 14px 32px -12px rgba(57,255,99,0.72), inset 0 1px 0 rgba(255,255,255,0.34)'
                : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              transition: 'background 200ms, box-shadow 200ms, border-color 200ms',
            }}
            aria-label="Send"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.45" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4 20-7Z" />
            </svg>
          </motion.button>
        </div>
      </footer>
    </div>
  )
}

function StatusChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      minWidth: 0,
      padding: '8px 9px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.035)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <div style={{
        fontFamily: MONO,
        color: MUTED,
        fontSize: 8,
        fontWeight: 850,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{label}</div>
      <div style={{
        color: TEXT,
        fontSize: 11.5,
        fontWeight: 850,
        lineHeight: 1.1,
        marginTop: 4,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{value}</div>
    </div>
  )
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '2px 0 0' }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.11))' }} />
      <span style={{
        fontFamily: MONO,
        fontSize: 9,
        fontWeight: 850,
        color: MUTED,
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        padding: '5px 9px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.11), transparent)' }} />
    </div>
  )
}

function SupportAvatar({ large = false, active = false }: { large?: boolean; active?: boolean }) {
  const size = large ? 46 : 30
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, marginBottom: large ? 0 : 2 }}>
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', inset: -2,
          borderRadius: large ? 18 : 12,
          border: '1px solid rgba(57,255,99,0.36)',
        }}
        animate={active ? { opacity: [0.55, 0.1, 0.55], scale: [1, 1.08, 1] } : { opacity: 0.35, scale: 1 }}
        transition={{ duration: 1.8, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: large ? 16 : 11,
        background: 'linear-gradient(135deg, var(--fv-green, #39ff63), var(--fv-green-2, #22e84f))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#021407',
        fontWeight: 950,
        fontSize: large ? 12 : 9,
        letterSpacing: '-0.02em',
        boxShadow: '0 10px 28px -12px rgba(57,255,99,0.82), inset 0 1px 0 rgba(255,255,255,0.34)',
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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.44, ease }}
      style={{
        margin: 'auto 0',
        display: 'grid',
        gap: 14,
      }}
    >
      <div style={{
        padding: '18px',
        borderRadius: 24,
        border: '1px solid rgba(57,255,99,0.16)',
        background: 'linear-gradient(145deg, rgba(57,255,99,0.10), rgba(255,255,255,0.035))',
        boxShadow: '0 22px 44px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SupportAvatar large />
          <div>
            <div style={{ color: TEXT, fontSize: 18, fontWeight: 950, lineHeight: 1.05 }}>
              {t('Привет, на связи.', 'Hey, we are live.')}
            </div>
            <div style={{ color: SOFT, fontSize: 13, lineHeight: 1.45, marginTop: 7 }}>
              {t(
                'Опишите задачу коротко: заказ, оплата, доступ или выдача. Команда видит контекст и ответит без лишних вопросов.',
                'Drop the issue: order, payment, access or delivery. The team sees the context and replies fast.',
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {quickReplies.map((q, i) => (
          <motion.button
            key={q}
            onClick={() => onPick(q)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease, delay: 0.12 + i * 0.04 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '12px 11px',
              minHeight: 46,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.09)',
              background: 'rgba(255,255,255,0.04)',
              color: TEXT,
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              textAlign: 'left',
              letterSpacing: 0,
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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.max(2, size - 1) }}>
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
