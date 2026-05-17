import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '../i18n'
import { useStore, CRYPTO_OPTIONS } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { useToast } from './Toast'
import CryptoLogo from './CryptoLogo'
import type { Order, CryptoNetwork } from '../store/types'

interface Props { order: Order | null; onClose: () => void }

const DISPLAY = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"
const GREEN = '#39ff63'
const AMBER = '#ffb84a'
const RED = '#ff5a5a'
const INK = '#0a0a0a'

function formatFull(iso: string, lang: string) {
  return new Date(iso).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const EXPLORER: Record<CryptoNetwork, (txid: string) => string> = {
  trc20:    (t) => `https://tronscan.org/#/transaction/${t}`,
  erc20:    (t) => `https://etherscan.io/tx/${t}`,
  bep20:    (t) => `https://bscscan.com/tx/${t}`,
  usdc_eth: (t) => `https://etherscan.io/tx/${t}`,
  usdc_sol: (t) => `https://solscan.io/tx/${t}`,
  eth:      (t) => `https://etherscan.io/tx/${t}`,
  sol:      (t) => `https://solscan.io/tx/${t}`,
  btc:      (t) => `https://blockstream.info/tx/${t}`,
}

const STATUS_COLOR: Record<string, string> = {
  completed: GREEN, paid: GREEN,
  pending: AMBER,
  failed: RED, expired: RED, cancelled: RED,
}

export default function OrderDetailModal({ order, onClose }: Props) {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const { haptic } = useTelegram()
  const toast = useToast()

  if (!order) return null

  const isDeposit = order.kind === 'deposit'
  const statusKey = `status_${order.status}` as Parameters<typeof t>[0]
  const statusColor = STATUS_COLOR[order.status] ?? 'rgba(255,255,255,0.6)'
  const cryptoOpt = order.provider ? CRYPTO_OPTIONS.find((c) => c.id === order.provider) : undefined

  const copyId = async () => {
    try { await navigator.clipboard.writeText(order.id) } catch { /* ignore */ }
    haptic('success')
    toast.show(lang === 'ru' ? 'ID скопирован' : 'ID copied')
  }

  const steps = isDeposit
    ? [
        { label: lang === 'ru' ? 'СОЗДАН'   : 'CREATED',  done: true },
        { label: lang === 'ru' ? 'ОПЛАЧЕН'  : 'PAID',     done: order.status === 'paid' || order.status === 'completed' },
        { label: lang === 'ru' ? 'ЗАЧИСЛЕН' : 'CREDITED', done: order.status === 'completed' },
      ]
    : [
        { label: lang === 'ru' ? 'СОЗДАН'    : 'CREATED',   done: true },
        { label: lang === 'ru' ? 'ОПЛАЧЕН'   : 'PAID',      done: order.status === 'paid' || order.status === 'completed' },
        { label: lang === 'ru' ? 'ДОСТАВЛЕН' : 'DELIVERED', done: order.status === 'completed' },
      ]

  const shortId = order.id.length > 14 ? `${order.id.slice(0, 6)}…${order.id.slice(-6)}` : order.id

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.3 }}
          onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
          style={{
            width: '100%', maxWidth: 480, maxHeight: '92dvh', overflowY: 'auto',
            background: INK,
            border: '1px solid rgba(255,255,255,0.08)',
            borderBottom: 'none',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '10px 18px 24px',
            fontFamily: DISPLAY, color: '#fff',
          }}
        >
          {/* Drag handle */}
          <div style={{
            width: 38, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.18)',
            margin: '0 auto 18px', cursor: 'grab',
          }} />

          {/* Header strip */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: MONO, fontSize: 9, fontWeight: 700,
            color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2,
            marginBottom: 14,
          }}>
            <span>{isDeposit ? '/02 · DEPOSIT' : '/01 · ORDER'}</span>
            <span style={{ color: statusColor }}>● {String(t(statusKey)).toUpperCase()}</span>
          </div>

          {/* Title row */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isDeposit ? GREEN : '#fff', flexShrink: 0,
            }}>
              {cryptoOpt
                ? <CryptoLogo network={cryptoOpt.id} size={36} showBadge />
                : isDeposit
                  ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/></svg>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.3 }}>
                {isDeposit
                  ? (cryptoOpt ? cryptoOpt.name : t('order_deposit'))
                  : (order.product_title ?? t('order_buy'))}
              </div>
              {cryptoOpt && (
                <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: 1 }}>
                  {cryptoOpt.symbol}
                </div>
              )}
            </div>
          </div>

          {/* Amount card */}
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderLeft: `2px solid ${isDeposit ? GREEN : '#fff'}`,
            borderRadius: 14, padding: '14px 16px',
            marginBottom: 18,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2 }}>
              {lang === 'ru' ? 'СУММА' : 'AMOUNT'}
            </div>
            <div style={{
              fontSize: 32, fontWeight: 800, marginTop: 4,
              color: isDeposit ? GREEN : '#fff',
              letterSpacing: -0.8,
              display: 'flex', alignItems: 'baseline', gap: 4,
            }}>
              <span style={{ fontSize: 18, opacity: 0.55 }}>{isDeposit ? '+$' : '$'}</span>
              {order.amount.toFixed(2)}
              {order.quantity && order.quantity > 1 && (
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
                  × {order.quantity}
                </span>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
            color: 'rgba(255,255,255,0.4)', marginBottom: 10,
          }}>
            {lang === 'ru' ? '— ХРОНОЛОГИЯ' : '— TIMELINE'}
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 18,
          }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', paddingBottom: i < steps.length - 1 ? 14 : 0 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step.done ? GREEN : 'rgba(255,255,255,0.06)',
                  color: step.done ? INK : 'rgba(255,255,255,0.4)',
                  fontFamily: MONO, fontSize: 11, fontWeight: 800,
                  border: step.done ? 'none' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  {step.done ? '✓' : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    position: 'absolute', left: 10, top: 22, width: 2, height: 14,
                    background: step.done ? GREEN : 'rgba(255,255,255,0.08)',
                  }} />
                )}
                <div style={{
                  fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
                  color: step.done ? '#fff' : 'rgba(255,255,255,0.4)',
                }}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: '4px 16px', marginBottom: 18,
          }}>
            <MetaRow label="ID">
              <button
                onClick={copyId}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontFamily: MONO, fontSize: 11, fontWeight: 700, color: GREEN,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {shortId}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </MetaRow>
            <MetaRow label={lang === 'ru' ? 'СОЗДАН' : 'CREATED'}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
                {formatFull(order.created, lang)}
              </span>
            </MetaRow>
            {order.paid_at && (
              <MetaRow label={lang === 'ru' ? 'ОПЛАЧЕН' : 'PAID'}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
                  {formatFull(order.paid_at, lang)}
                </span>
              </MetaRow>
            )}
            {cryptoOpt && (
              <MetaRow label={lang === 'ru' ? 'СЕТЬ' : 'NETWORK'}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  {cryptoOpt.name}
                </span>
              </MetaRow>
            )}
          </div>

          {/* TxID */}
          {order.txid && order.provider && EXPLORER[order.provider as CryptoNetwork] && (
            <motion.a
              href={EXPLORER[order.provider as CryptoNetwork](order.txid)}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(57,255,99,0.06)',
                border: '1px solid rgba(57,255,99,0.22)',
                borderRadius: 14, padding: '12px 14px',
                textDecoration: 'none', marginBottom: 18,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(57,255,99,0.15)', color: GREEN,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: GREEN, letterSpacing: 1 }}>
                  {lang === 'ru' ? 'TX · BLOCKCHAIN' : 'TX · BLOCKCHAIN'}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.55)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2,
                }}>
                  {order.txid}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </motion.a>
          )}

          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', padding: '14px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: '#fff', fontFamily: DISPLAY, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', letterSpacing: 0.3,
            }}
          >
            {t('close')}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2 }}>
        {label}
      </span>
      {children}
    </div>
  )
}
