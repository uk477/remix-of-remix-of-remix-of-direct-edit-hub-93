import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import OrderDetailModal from '../components/OrderDetailModal'

import { useStore, CRYPTO_OPTIONS } from '../store'
import type { Order, OrderStatus, CryptoNetwork } from '../store/types'
import CryptoLogo from '../components/CryptoLogo'

type Filter = 'all' | OrderStatus

const STATUS_LABEL: Record<string, { ru: string; en: string }> = {
  completed: { ru: 'Закрыт', en: 'Closed' },
  paid:      { ru: 'Оплачен', en: 'Paid' },
  pending:   { ru: 'Ожидание', en: 'Pending' },
  failed:    { ru: 'Отменён', en: 'Cancelled' },
  expired:   { ru: 'Истёк', en: 'Expired' },
}

function statusClass(s: OrderStatus): string {
  if (s === 'completed' || s === 'paid') return 's-done'
  if (s === 'pending') return 's-pending'
  return 's-failed'
}

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/**
 * VAULT — Ledger
 * Editorial transaction log. Filter rail + grouped rows.
 */
export default function Orders() {
  const navigate = useNavigate()
  const lang = useStore((s) => s.lang)
  const allOrders = useStore((s) => s.orders)
  const isAdmin = useStore((s) => s.isAdmin)
  const [filter, setFilter] = useState<Filter>('all')
  const [openOrder, setOpenOrder] = useState<Order | null>(null)

  const orders = isAdmin()
    ? allOrders
    : allOrders.filter((o) => o.status === 'completed' || o.status === 'paid' || o.status === 'pending')

  const filtered = useMemo(() => {
    const arr = filter === 'all' ? orders : orders.filter((o) => o.status === filter)
    return arr.slice().sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
  }, [orders, filter])

  const groups = useMemo(() => {
    const map = new Map<string, Order[]>()
    filtered.forEach((o) => {
      const d = new Date(o.created)
      const key = d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
      const arr = map.get(key) ?? []
      arr.push(o)
      map.set(key, arr)
    })
    return Array.from(map.entries())
  }, [filtered, lang])

  const FILTERS: { key: Filter; label: string }[] = lang === 'ru'
    ? [
        { key: 'all',       label: 'Все' },
        { key: 'completed', label: 'Закрытые' },
        { key: 'pending',   label: 'В работе' },
        { key: 'failed',    label: 'Отменён' },
      ]
    : [
        { key: 'all',       label: 'All' },
        { key: 'completed', label: 'Closed' },
        { key: 'pending',   label: 'Pending' },
        { key: 'failed',    label: 'Cancelled' },
      ]

  const totalIn = orders.filter((o) => o.kind === 'deposit' && o.status === 'completed').reduce((s, o) => s + o.amount, 0)
  const totalOut = orders.filter((o) => o.kind === 'buy' && (o.status === 'completed' || o.status === 'paid')).reduce((s, o) => s + o.amount, 0)

  return (
    <PageTransition>
      <div className="vault-page">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="vault-eyebrow">{lang === 'ru' ? 'Журнал' : 'The Ledger'}</div>
          <h1 className="vault-h">
            {lang === 'ru' ? <>Каждое <em>движение</em></> : <>Every <em>movement</em></>}
          </h1>
          <p className="vault-sub">
            {lang === 'ru'
              ? 'Полная хронология ваших сделок и пополнений хранилища.'
              : 'A complete chronology of your settlements and inflows.'}
          </p>

          <div className="vault-stats">
            <div className="vault-stat">
              <div className="k">{lang === 'ru' ? 'Поступления' : 'Inflow'}</div>
              <div className="v">${totalIn.toFixed(2)}</div>
            </div>
            <div className="vault-stat">
              <div className="k">{lang === 'ru' ? 'Расход' : 'Outflow'}</div>
              <div className="v">${totalOut.toFixed(2)}</div>
            </div>
          </div>
        </motion.div>

        <div className="vault-section">
          <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
            <div className="vault-seg" style={{ marginBottom: 6 }}>
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={filter === f.key ? 'is-active' : ''}
                  onClick={() => setFilter(f.key)}
                >
                  {filter === f.key && <motion.span layoutId="seg-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                  <span style={{ position: 'relative', zIndex: 1 }}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ marginTop: 24 }}
            >
              {filtered.length === 0 ? (
                <div className="vault-empty">
                  <div className="glyph">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7h18M3 12h18M3 17h12"/>
                    </svg>
                  </div>
                  <div className="ttl">
                    {lang === 'ru' ? 'Журнал пуст' : 'The ledger is silent'}
                  </div>
                  <div className="sub">
                    {lang === 'ru' ? 'Откройте хранилище' : 'Open the vault'}
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <button className="vault-cta-ghost" style={{ maxWidth: 240, margin: '0 auto' }} onClick={() => navigate('/')}>
                      {lang === 'ru' ? 'В хранилище' : 'Enter the Vault'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                  {groups.map(([day, items]) => (
                    <div key={day}>
                      <div className="vault-section-h" style={{ marginBottom: 10 }}>{day}</div>
                      <motion.div
                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                        initial="hidden"
                        animate="show"
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                      >
                        {items.map((o) => {
                          const cryptoOpt = o.provider ? CRYPTO_OPTIONS.find((c) => c.id === (o.provider as CryptoNetwork)) : undefined
                          const label = STATUS_LABEL[o.status]?.[lang as 'ru' | 'en'] ?? o.status
                          const isDeposit = o.kind === 'deposit'
                          return (
                            <motion.button
                              key={o.id}
                              className="vault-row"
                              onClick={() => setOpenOrder(o)}
                              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}
                              whileTap={{ scale: 0.99 }}
                              style={{ width: '100%', textAlign: 'left' }}
                            >
                              <div className="glyph">
                                {cryptoOpt ? (
                                  <CryptoLogo network={cryptoOpt.id} size={26} />
                                ) : isDeposit ? (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18M5 7v13h14V7M9 11h6"/></svg>
                                )}
                              </div>
                              <div className="body">
                                <div className="ttl">
                                  {isDeposit
                                    ? (cryptoOpt ? `${lang === 'ru' ? 'Пополнение' : 'Inflow'} · ${cryptoOpt.name}` : (lang === 'ru' ? 'Пополнение' : 'Inflow'))
                                    : (o.product_title ?? (lang === 'ru' ? 'Лот' : 'Lot'))}
                                </div>
                                <div className="meta">
                                  {formatDate(o.created, lang)} · #{o.id.slice(0, 8)}
                                </div>
                              </div>
                              <div className="right">
                                <div className="price">
                                  {isDeposit ? '+' : '−'}${o.amount.toFixed(2)}
                                </div>
                                <div className={`stat ${statusClass(o.status)}`}>{label}</div>
                              </div>
                            </motion.button>
                          )
                        })}
                      </motion.div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <OrderDetailModal order={openOrder} onClose={() => setOpenOrder(null)} />
    </PageTransition>
  )
}
