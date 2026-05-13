import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '../i18n'
import { useStore, CRYPTO_OPTIONS } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { useToast } from './Toast'
import CryptoLogo from './CryptoLogo'
import type { Order, CryptoNetwork } from '../store/types'

interface Props { order: Order | null; onClose: () => void }

function formatFull(iso: string, lang: string) {
  return new Date(iso).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
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

export default function OrderDetailModal({ order, onClose }: Props) {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const { haptic } = useTelegram()
  const toast = useToast()

  if (!order) return null

  const isDeposit = order.kind === 'deposit'
  const statusKey = `status_${order.status}` as Parameters<typeof t>[0]
  const cryptoOpt = order.provider ? CRYPTO_OPTIONS.find((c) => c.id === order.provider) : undefined

  const copyId = async () => {
    try { await navigator.clipboard.writeText(order.id) } catch { /* ignore */ }
    haptic('success')
    toast.show(lang === 'ru' ? 'ID заказа скопирован' : 'Order ID copied')
  }

  const steps = isDeposit
    ? [
        { label: lang === 'ru' ? 'Создан' : 'Created', done: true },
        { label: lang === 'ru' ? 'Оплачен' : 'Paid', done: order.status === 'paid' || order.status === 'completed' },
        { label: lang === 'ru' ? 'Зачислен' : 'Credited', done: order.status === 'completed' },
      ]
    : [
        { label: lang === 'ru' ? 'Создан' : 'Created', done: true },
        { label: lang === 'ru' ? 'Оплачен' : 'Paid', done: order.status === 'paid' || order.status === 'completed' },
        { label: lang === 'ru' ? 'Доставлен' : 'Delivered', done: order.status === 'completed' },
      ]

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          className="sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.3 }}
          onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
          style={{ maxHeight: '90dvh', overflowY: 'auto' }}
        >
          <div className="sheet-handle" style={{ cursor: 'grab' }} />

          <div className="row gap-3 mb-5">
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: isDeposit ? 'rgba(73,242,100,0.12)' : 'rgba(151,114,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isDeposit ? 'var(--brand)' : 'var(--purple)',
              position: 'relative', overflow: 'visible',
            }}>
              {cryptoOpt
                ? <CryptoLogo network={cryptoOpt.id} size={40} showBadge />
                : isDeposit
                  ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/></svg>}
            </div>
            <div style={{ flex: 1 }}>
              <div className="t-lg fw-black">
                {isDeposit
                  ? (cryptoOpt ? `${cryptoOpt.name}` : t('order_deposit'))
                  : (order.product_title ?? t('order_buy'))}
              </div>
              <div className="row gap-2 mt-1" style={{ flexWrap: 'wrap' }}>
                <span className={`badge badge-${order.status}`}>{t(statusKey)}</span>
                {cryptoOpt && (
                  <span className="t-xs t-muted" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                    {cryptoOpt.symbol}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="card mb-4" style={{ padding: '16px 18px' }}>
            <div className="t-xs t-muted">{lang === 'ru' ? 'Сумма' : 'Amount'}</div>
            <div className="t-xl mt-1" style={{
              background: isDeposit ? 'var(--g-success)' : 'var(--g-brand)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {isDeposit ? '+' : ''}${order.amount.toFixed(2)}
            </div>
            {order.quantity && order.quantity > 1 && (
              <div className="t-xs t-muted mt-2">× {order.quantity}</div>
            )}
          </div>

          {/* Timeline */}
          <div className="section-title mb-3">{lang === 'ru' ? 'Хронология' : 'Timeline'}</div>
          <div className="card mb-4" style={{ padding: '16px 18px' }}>
            <div className="timeline">
              {steps.map((step, i) => (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot${step.done ? ' done' : ''}`}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  {i < steps.length - 1 && <div className={`timeline-line${step.done ? ' done' : ''}`} />}
                  <div className="timeline-label" style={{ color: step.done ? 'var(--t-primary)' : 'var(--t-muted)' }}>
                    {step.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div className="card mb-4" style={{ padding: '4px 0' }}>
            <div className="meta-row">
              <span className="t-xs t-muted">ID</span>
              <button onClick={copyId} className="t-xs fw-bold row gap-1 items-center" style={{ fontFamily: 'monospace', color: 'var(--brand)', wordBreak: 'break-all', textAlign: 'right', maxWidth: 200 }}>
                {order.id}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
            <div className="meta-row">
              <span className="t-xs t-muted">{lang === 'ru' ? 'Создан' : 'Created'}</span>
              <span className="t-xs">{formatFull(order.created, lang)}</span>
            </div>
            {order.paid_at && (
              <div className="meta-row">
                <span className="t-xs t-muted">{lang === 'ru' ? 'Оплачен' : 'Paid'}</span>
                <span className="t-xs">{formatFull(order.paid_at, lang)}</span>
              </div>
            )}
            {cryptoOpt && (
              <div className="meta-row">
                <span className="t-xs t-muted">{lang === 'ru' ? 'Сеть' : 'Network'}</span>
                <span className="t-xs fw-bold">{cryptoOpt.name}</span>
              </div>
            )}
          </div>

          {/* TxID */}
          {order.txid && order.provider && EXPLORER[order.provider as CryptoNetwork] && (
            <motion.a
              href={EXPLORER[order.provider as CryptoNetwork](order.txid)}
              target="_blank"
              rel="noopener noreferrer"
              className="card mb-4"
              style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(73,242,100,0.06)', border: '1px solid rgba(73,242,100,0.2)',
                textDecoration: 'none',
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div style={{ fontSize: 22, flexShrink: 0 }}>🔍</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="t-xs fw-bold" style={{ color: 'var(--success)' }}>
                  {lang === 'ru' ? 'Транзакция в блокчейне' : 'Blockchain Transaction'}
                </div>
                <div className="t-xs t-muted" style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {order.txid}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </motion.a>
          )}

          <motion.button
            className="btn btn-secondary"
            onClick={onClose}
            whileTap={{ scale: 0.97 }}
          >
            {t('close')}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
