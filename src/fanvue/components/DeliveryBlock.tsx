import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from './Toast'
import { useTelegram } from '../hooks/useTelegram'
import { CONFIG } from '../config'

const DISPLAY = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"
const GREEN = '#39ff63'

interface Section {
  title: string
  rows: { key: string; value: string }[]
  notes: string[]
}

function parseDelivery(text: string): Section[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const out: Section[] = []
  let current: Section | null = null

  const pushCurrent = () => {
    if (current && (current.rows.length || current.notes.length || current.title)) out.push(current)
    current = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) continue
    const isHeading = /[/:：]\s*$/.test(line) && !/^[^:]+:\s+\S/.test(line)
    if (isHeading) {
      pushCurrent()
      current = { title: line.replace(/[/:：]\s*$/, '').trim(), rows: [], notes: [] }
      continue
    }
    if (!current) current = { title: '', rows: [], notes: [] }
    const m = line.match(/^([^:：]+)[:：]\s*(.+)$/)
    if (m) current.rows.push({ key: m[1].trim(), value: m[2].trim() })
    else current.notes.push(line.trim())
  }
  pushCurrent()
  return out
}

// ============================================================
// Shared terminal shell — scanning gauge, header, footer CTA
// ============================================================

function ScanGauge() {
  return (
    <div style={{ position: 'relative', height: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', borderRadius: 2 }}>
      <motion.div
        animate={{ x: ['-100%', '300%'] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', top: 0, left: 0, height: '100%', width: '40%',
          background: `linear-gradient(90deg, transparent, ${GREEN}, transparent)`,
          filter: `drop-shadow(0 0 6px ${GREEN})`,
        }}
      />
    </div>
  )
}

function TerminalHeader({ title, subtitle, statusLabel }: { title: string; subtitle: string; statusLabel: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '3px 8px', borderRadius: 4,
            border: `1px solid ${GREEN}55`, background: `${GREEN}1a`,
            color: GREEN, fontFamily: MONO, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
          }}
        >
          {statusLabel}
        </motion.span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[1, 0.45, 0.18].map((op, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [op, op * 0.4, op] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
              style={{ width: 3, height: 12, background: GREEN, opacity: op }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            margin: 0, fontFamily: DISPLAY, fontSize: 26, fontWeight: 700,
            letterSpacing: '-0.02em', color: '#fff',
            fontStyle: 'italic', textTransform: 'uppercase', lineHeight: 1,
          }}
        >
          {title}
        </motion.h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: GREEN,
            boxShadow: `0 0 8px ${GREEN}`, animation: 'fvPulse 1.6s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.16em', textTransform: 'uppercase',
          }}>
            {subtitle}
          </span>
        </div>
      </div>
      <style>{`@keyframes fvPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:.6} }`}</style>
    </div>
  )
}

function OrderRefBlock({ orderId, onCopy, labelKey }: { orderId: string; onCopy: () => void; labelKey: string }) {
  return (
    <motion.button
      onClick={onCopy}
      whileTap={{ scale: 0.985 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{
        width: '100%', textAlign: 'left',
        background: '#111', border: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 14px', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', color: '#fff',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
        <span style={{
          fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.32)',
          letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>
          {labelKey}
        </span>
        <code style={{
          fontFamily: MONO, color: GREEN, fontSize: 13, fontWeight: 700,
          letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{orderId}</code>
      </div>
      <span style={{
        padding: 8, borderRadius: 6, color: GREEN, flexShrink: 0,
        background: 'rgba(57,255,99,0.08)', display: 'inline-flex',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="8" width="14" height="14" rx="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      </span>
    </motion.button>
  )
}

function ActionButtons({ onChat, tgUrl, chatLabel, tgLabel }: {
  onChat: () => void; tgUrl: string; chatLabel: string; tgLabel: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <motion.button
        onClick={onChat}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 12,
          background: GREEN, color: '#000', border: 'none',
          fontFamily: DISPLAY, fontSize: 12, fontWeight: 700,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          cursor: 'pointer', boxShadow: `0 8px 28px -8px ${GREEN}66`,
        }}
      >
        {chatLabel}
      </motion.button>
      <motion.a
        href={tgUrl} target="_blank" rel="noopener noreferrer"
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        style={{
          width: '100%', padding: '13px 16px', borderRadius: 12,
          background: 'rgba(255,255,255,0.04)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          fontFamily: DISPLAY, fontSize: 12, fontWeight: 700,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          textAlign: 'center', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
        </svg>
        {tgLabel}
      </motion.a>
    </div>
  )
}

function TerminalShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative',
      background: '#0a0a0a',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      <ScanGauge />
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', bottom: 8, right: 8, width: 36, height: 36,
        borderRight: `1px solid ${GREEN}33`, borderBottom: `1px solid ${GREEN}33`,
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ============================================================
// DeliveryBlock — autofulfilled credentials
// ============================================================

export default function DeliveryBlock({ data, orderId }: { data: string; orderId?: string }) {
  const lang = useStore((s) => s.lang)
  const toast = useToast()
  const { haptic } = useTelegram()
  const navigate = useNavigate()
  const sections = useMemo(() => parseDelivery(data), [data])
  const tgUrl = `https://t.me/${CONFIG.supportUsername}`

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text) } catch { }
    haptic('success')
    toast.show(`${label} ${lang === 'ru' ? 'скопирован' : 'copied'}`, 'success')
  }

  const copyAll = async () => {
    try { await navigator.clipboard.writeText(data) } catch { }
    haptic('success')
    toast.show(lang === 'ru' ? 'Все данные скопированы' : 'All data copied', 'success')
  }

  return (
    <TerminalShell>
      <TerminalHeader
        statusLabel={lang === 'ru' ? 'Доставлено' : 'Delivered'}
        title={lang === 'ru' ? 'Доступ выдан' : 'Access granted'}
        subtitle={lang === 'ru' ? 'Сохраните данные в надёжном месте' : 'Save credentials securely'}
      />

      {orderId && (
        <OrderRefBlock
          orderId={orderId}
          onCopy={() => copy(orderId, lang === 'ru' ? 'ID' : 'ID')}
          labelKey={lang === 'ru' ? 'Order Reference' : 'Order Reference'}
        />
      )}

      {/* Credentials */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sections.length === 0 ? (
          <pre style={{
            margin: 0, background: '#111', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 12,
            fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.85)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{data}</pre>
        ) : sections.map((sec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + 0.05 * i }}
          >
            {sec.title && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
                <span style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 700,
                  color: GREEN, letterSpacing: '0.22em', textTransform: 'uppercase',
                }}>{sec.title}</span>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GREEN}55, transparent)` }} />
              </div>
            )}
            <div style={{
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden',
              background: '#111',
            }}>
              {sec.rows.map((row, ri) => (
                <button
                  key={ri}
                  onClick={() => copy(row.value, row.key)}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 10, padding: '11px 12px',
                    background: 'transparent', color: '#fff', border: 'none',
                    borderTop: ri === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{
                      fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                    }}>{row.key}</span>
                    <span style={{
                      fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#fff',
                      wordBreak: 'break-all',
                    }}>{row.value}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                    <rect x="8" y="8" width="14" height="14" rx="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </button>
              ))}
              {sec.notes.length > 0 && (
                <div style={{
                  padding: '11px 12px',
                  borderTop: sec.rows.length ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  fontFamily: DISPLAY, fontSize: 13, lineHeight: 1.55,
                  color: 'rgba(255,255,255,0.78)', whiteSpace: 'pre-wrap',
                }}>{sec.notes.join('\n')}</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <button
        onClick={copyAll}
        style={{
          alignSelf: 'flex-start',
          background: 'transparent', color: GREEN,
          border: `1px solid ${GREEN}44`,
          borderRadius: 8, padding: '7px 12px',
          fontFamily: MONO, fontSize: 10, fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {lang === 'ru' ? 'Копировать всё' : 'Copy all'}
      </button>

      <ActionButtons
        onChat={() => navigate('/support/chat')}
        tgUrl={tgUrl}
        chatLabel={lang === 'ru' ? 'Чат поддержки' : 'Support chat'}
        tgLabel="Telegram"
      />
    </TerminalShell>
  )
}

// ============================================================
// ManualDeliveryBlock — pending manual fulfillment
// ============================================================

export function ManualDeliveryBlock({
  orderId,
  productTitle,
  amount,
  createdAt,
}: {
  orderId: string
  productTitle?: string
  amount?: number
  createdAt?: string
}) {
  const lang = useStore((s) => s.lang)
  const toast = useToast()
  const { haptic } = useTelegram()
  const navigate = useNavigate()
  const sendOrderReceipt = useStore((s) => s.sendOrderReceipt)
  const tgUrl = `https://t.me/${CONFIG.supportUsername}`

  const copyId = async () => {
    try { await navigator.clipboard.writeText(orderId) } catch { }
    haptic('success')
    toast.show(lang === 'ru' ? 'ID скопирован' : 'ID copied', 'success')
  }

  const time = new Date().toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })

  const handleOpenChat = () => {
    if (orderId && orderId !== '—' && productTitle && typeof amount === 'number') {
      sendOrderReceipt({
        orderId,
        productTitle,
        amount,
        currency: 'USD',
        createdAt: createdAt ?? new Date().toISOString(),
        stage: 'processing',
      })
    }
    navigate('/support/chat')
  }

  return (
    <TerminalShell>
      <TerminalHeader
        statusLabel={lang === 'ru' ? 'В обработке' : 'Processing'}
        title={lang === 'ru' ? 'Заказ создан' : 'Order created'}
        subtitle={lang === 'ru' ? 'Ожидаем подтверждение оператора' : 'Awaiting operator confirmation'}
      />

      <OrderRefBlock
        orderId={orderId}
        onCopy={copyId}
        labelKey="Order Reference"
      />

      {/* Tech specs grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.14 }}
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {[
          { k: 'Status', v: '0x24_QUEUED', accent: true },
          { k: 'Timestamp', v: time },
          { k: 'Channel', v: lang === 'ru' ? 'Оператор / TG' : 'Operator / TG' },
        ].map((row, i) => (
          <div
            key={row.k}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '11px 0',
              borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <span style={{
              fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>{row.k}</span>
            <span style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 700,
              color: row.accent ? GREEN : '#fff',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>{row.v}</span>
          </div>
        ))}
      </motion.div>

      <p style={{
        margin: 0, fontFamily: DISPLAY, fontSize: 13, lineHeight: 1.55,
        color: 'rgba(255,255,255,0.6)',
      }}>
        {lang === 'ru'
          ? 'Напишите нам в чат поддержки или в Telegram — мы выдадим данные заказа вручную в течение нескольких минут.'
          : 'Message support chat or Telegram — we will deliver the credentials manually within a few minutes.'}
      </p>

      <ActionButtons
        onChat={handleOpenChat}
        tgUrl={tgUrl}
        chatLabel={lang === 'ru' ? 'Написать в чат поддержки' : 'Open support chat'}
        tgLabel="Telegram"
      />
    </TerminalShell>
  )
}

