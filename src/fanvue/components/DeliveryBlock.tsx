import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from './Toast'
import { useTelegram } from '../hooks/useTelegram'
import { CONFIG } from '../config'
import FanvueLogo from './FanvueLogo'
import { Mail, ShieldCheck, ChevronDown, Copy } from 'lucide-react'

const DISPLAY = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"
const GREEN = '#39ff63'

interface ParsedCreds {
  fanvue: { login?: string; password?: string }
  mail: { email?: string; password?: string }
  instructions: string[]
  extras: { key: string; value: string }[]
}

function parseCreds(text: string): ParsedCreds {
  const fanvue: ParsedCreds['fanvue'] = {}
  const mail: ParsedCreds['mail'] = {}
  const instructions: string[] = []
  const extras: ParsedCreds['extras'] = []

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/^([^:：]+)[:：]\s*(.+)$/)
    if (!m) { instructions.push(line); continue }
    const k = m[1].trim()
    const v = m[2].trim()
    const lk = k.toLowerCase()
    if (/инструкц|instruct|примеч|^note|safety|безопасн/.test(lk)) { instructions.push(v); continue }
    if (/(почт|mail|email).*парол|парол.*(почт|mail|email)|mail[ _-]?pass|email[ _-]?pass/.test(lk)) { mail.password = v; continue }
    if (/^(почт|email|e[-_ ]?mail|mail)\b/.test(lk)) { mail.email = v; continue }
    if (/^(логин|login|username|user)\b/.test(lk)) { fanvue.login = v; continue }
    if (/^(пароль|password|pass)\b/.test(lk)) { fanvue.password = v; continue }
    extras.push({ key: k, value: v })
  }
  return { fanvue, mail, instructions, extras }
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
  const parsed = useMemo(() => parseCreds(data), [data])
  const [showInstr, setShowInstr] = useState(false)
  const tgUrl = `https://t.me/${CONFIG.supportUsername}`

  const hasAnyParsed =
    !!parsed.fanvue.login || !!parsed.fanvue.password ||
    !!parsed.mail.email || !!parsed.mail.password ||
    parsed.extras.length > 0

  const defaultInstr = lang === 'ru'
    ? 'Сразу после входа смените пароль от аккаунта и почты. Включите 2FA. Не сообщайте данные третьим лицам. При первом входе используйте чистый браузер / VPN, если требуется.'
    : 'Right after login, change the account and mail passwords. Enable 2FA. Never share credentials. Use a clean browser / VPN on first login if required.'

  const instrText = parsed.instructions.length ? parsed.instructions.join('\n') : defaultInstr

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

      {/* Branded credentials */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!hasAnyParsed ? (
          <pre style={{
            margin: 0, background: '#111', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 12,
            fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.85)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{data}</pre>
        ) : (
          <>
            {(parsed.fanvue.login || parsed.fanvue.password) && (
              <BrandCredCard
                delay={0.12}
                brand={<FanvueLogo size={26} />}
                title={lang === 'ru' ? 'Данные для входа Fanvue' : 'Fanvue login data'}
                accent="#E8365D"
                rows={[
                  parsed.fanvue.login ? { key: lang === 'ru' ? 'Логин' : 'Login', value: parsed.fanvue.login } : null,
                  parsed.fanvue.password ? { key: lang === 'ru' ? 'Пароль' : 'Password', value: parsed.fanvue.password } : null,
                ].filter(Boolean) as { key: string; value: string }[]}
                onCopy={copy}
              />
            )}

            {(parsed.mail.email || parsed.mail.password) && (
              <BrandCredCard
                delay={0.18}
                brand={<MailcomMark size={26} />}
                title={lang === 'ru' ? 'Данные для входа mail.com' : 'mail.com login data'}
                accent="#00A4E4"
                rows={[
                  parsed.mail.email ? { key: lang === 'ru' ? 'Почта' : 'Email', value: parsed.mail.email } : null,
                  parsed.mail.password ? { key: lang === 'ru' ? 'Пароль' : 'Password', value: parsed.mail.password } : null,
                ].filter(Boolean) as { key: string; value: string }[]}
                onCopy={copy}
              />
            )}

            {parsed.extras.length > 0 && (
              <BrandCredCard
                delay={0.22}
                brand={null}
                title={lang === 'ru' ? 'Дополнительно' : 'Additional'}
                accent={GREEN}
                rows={parsed.extras}
                onCopy={copy}
              />
            )}

            {/* Security instruction toggle */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              style={{
                border: `1px solid ${GREEN}33`,
                borderRadius: 12,
                background: `${GREEN}0a`,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => { setShowInstr((v) => !v); haptic('light') }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '13px 14px', background: 'transparent', color: GREEN,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <ShieldCheck size={18} />
                <span style={{
                  flex: 1, fontFamily: DISPLAY, fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN,
                }}>
                  {lang === 'ru' ? 'Инструкция по безопасности' : 'Security instructions'}
                </span>
                <motion.span animate={{ rotate: showInstr ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {showInstr && (
                  <motion.div
                    key="instr"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      padding: '0 14px 14px',
                      borderTop: `1px solid ${GREEN}22`,
                      paddingTop: 12,
                      fontFamily: DISPLAY, fontSize: 13, lineHeight: 1.6,
                      color: 'rgba(255,255,255,0.82)', whiteSpace: 'pre-wrap',
                    }}>{instrText}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
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

