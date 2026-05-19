import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { useToast } from './Toast'
import { useTelegram } from '../hooks/useTelegram'
import { CONFIG } from '../config'

const DISPLAY = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"
const GREEN = '#39ff63'
const INK = '#0a0a0a'

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
    if (!line.trim()) {
      continue
    }
    const isHeading = /[/:：]\s*$/.test(line) && !/^[^:]+:\s+\S/.test(line)
    if (isHeading) {
      pushCurrent()
      current = { title: line.replace(/[/:：]\s*$/, '').trim(), rows: [], notes: [] }
      continue
    }
    if (!current) current = { title: '', rows: [], notes: [] }
    const m = line.match(/^([^:：]+)[:：]\s*(.+)$/)
    if (m) {
      current.rows.push({ key: m[1].trim(), value: m[2].trim() })
    } else {
      current.notes.push(line.trim())
    }
  }
  pushCurrent()
  return out
}

export default function DeliveryBlock({ data }: { data: string }) {
  const lang = useStore((s) => s.lang)
  const toast = useToast()
  const { haptic } = useTelegram()
  const sections = useMemo(() => parseDelivery(data), [data])

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: DISPLAY }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 10, background: 'rgba(57,255,99,0.14)',
            border: '1px solid rgba(57,255,99,0.35)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: GREEN,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em' }}>
              {lang === 'ru' ? 'Данные вашего заказа' : 'Your order credentials'}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>
              {lang === 'ru' ? 'выдано · сохраните' : 'issued · save'}
            </div>
          </div>
        </div>
        <button
          onClick={copyAll}
          style={{
            background: 'rgba(57,255,99,0.1)', color: GREEN,
            border: '1px solid rgba(57,255,99,0.3)',
            borderRadius: 999, padding: '7px 12px',
            fontFamily: MONO, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          {lang === 'ru' ? 'Копировать всё' : 'Copy all'}
        </button>
      </div>

      {sections.length === 0 ? (
        <div style={{
          background: INK, border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, padding: 14,
          fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.85)',
          whiteSpace: 'pre-wrap',
        }}>{data}</div>
      ) : (
        sections.map((sec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: 'linear-gradient(180deg, rgba(57,255,99,0.04), rgba(57,255,99,0.01))',
              border: '1px solid rgba(57,255,99,0.18)',
              borderRadius: 16, overflow: 'hidden',
            }}
          >
            {sec.title && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(57,255,99,0.06)',
                borderBottom: '1px solid rgba(57,255,99,0.14)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: GREEN,
                  boxShadow: `0 0 8px ${GREEN}`,
                }} />
                <span style={{
                  fontFamily: MONO, fontSize: 10, fontWeight: 800,
                  color: GREEN, letterSpacing: '0.18em', textTransform: 'uppercase',
                }}>
                  {sec.title}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sec.rows.map((row, ri) => (
                <button
                  key={ri}
                  onClick={() => copy(row.value, row.key)}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    background: 'transparent', color: '#fff',
                    border: 'none',
                    borderTop: ri === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: MONO, fontSize: 9, fontWeight: 700,
                      color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em',
                      textTransform: 'uppercase', marginBottom: 4,
                    }}>{row.key}</div>
                    <div style={{
                      fontFamily: MONO, fontSize: 13, fontWeight: 700,
                      color: '#fff', wordBreak: 'break-all',
                    }}>{row.value}</div>
                  </div>
                  <span style={{
                    color: GREEN, opacity: 0.7,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(57,255,99,0.08)',
                    border: '1px solid rgba(57,255,99,0.2)',
                    flexShrink: 0,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </span>
                </button>
              ))}
              {sec.notes.length > 0 && (
                <div style={{
                  padding: '12px 14px',
                  borderTop: sec.rows.length ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  fontFamily: DISPLAY, fontSize: 13, lineHeight: 1.55,
                  color: 'rgba(255,255,255,0.78)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {sec.notes.join('\n')}
                </div>
              )}
            </div>
          </motion.div>
        ))
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px',
        background: 'rgba(255,210,74,0.06)',
        border: '1px solid rgba(255,210,74,0.18)',
        borderRadius: 12,
        fontFamily: MONO, fontSize: 10, fontWeight: 600,
        color: 'rgba(255,210,74,0.95)', letterSpacing: '0.04em',
        lineHeight: 1.45,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        </svg>
        <span>
          {lang === 'ru'
            ? 'Сразу смените пароль на свой. Сохраните данные в надёжном месте.'
            : 'Change the password to your own immediately. Save these in a safe place.'}
        </span>
      </div>
    </div>
  )
}

export function ManualDeliveryBlock({ orderId }: { orderId: string }) {
  const lang = useStore((s) => s.lang)
  const toast = useToast()
  const { haptic } = useTelegram()
  const tgUrl = `https://t.me/${CONFIG.supportUsername}`

  const copyId = async () => {
    try { await navigator.clipboard.writeText(orderId) } catch { }
    haptic('success')
    toast.show(lang === 'ru' ? 'ID скопирован' : 'ID copied', 'success')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 14,
      padding: 18,
      background: 'linear-gradient(180deg, rgba(255,210,74,0.05), rgba(255,210,74,0.01))',
      border: '1px solid rgba(255,210,74,0.22)',
      borderRadius: 18,
      fontFamily: DISPLAY,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'rgba(255,210,74,0.14)',
          border: '1px solid rgba(255,210,74,0.35)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#ffd24a',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 2"/>
          </svg>
        </span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' }}>
            {lang === 'ru' ? 'Ваш заказ обрабатывается' : 'Your order is being processed'}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,210,74,0.85)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>
            {lang === 'ru' ? 'требуется связь с поддержкой' : 'support contact required'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.85)' }}>
        {lang === 'ru'
          ? 'Напишите нам в поддержку или Telegram, чтобы получить данные вашего заказа. Укажите номер заказа ниже.'
          : 'Message support or Telegram to receive your order. Please mention your order ID below.'}
      </div>

      <button
        onClick={copyId}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, padding: '12px 14px',
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, cursor: 'pointer', color: '#fff', textAlign: 'left',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
            {lang === 'ru' ? 'Номер заказа' : 'Order ID'}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: GREEN, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {orderId}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>

      <div style={{ display: 'flex', gap: 8 }}>
        <a
          href={tgUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 14px',
            background: GREEN, color: INK,
            border: 'none', borderRadius: 12, textDecoration: 'none',
            fontFamily: DISPLAY, fontSize: 12, fontWeight: 800,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
          Telegram
        </a>
      </div>
    </div>
  )
}
