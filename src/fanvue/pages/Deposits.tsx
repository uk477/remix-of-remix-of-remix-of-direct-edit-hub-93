import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import OrderDetailModal from '../components/OrderDetailModal'

import { useStore, CRYPTO_OPTIONS } from '../store'
import type { Order, CryptoNetwork } from '../store/types'
import CryptoLogo from '../components/CryptoLogo'

const DISPLAY = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"
const GREEN = '#39ff63'
const INK = '#0a0a0a'

type DepositFilter = 'all' | 'success' | 'pending' | 'failed'

const STATUS_META: Record<string, { ru: string; en: string; color: string; bg: string; border: string; dot: string }> = {
  completed: { ru: 'Успешно',  en: 'Success',   color: GREEN,     bg: 'rgba(57,255,99,0.10)',   border: 'rgba(57,255,99,0.28)',  dot: GREEN },
  paid:      { ru: 'Успешно',  en: 'Success',   color: GREEN,     bg: 'rgba(57,255,99,0.10)',   border: 'rgba(57,255,99,0.28)',  dot: GREEN },
  pending:   { ru: 'В процессе', en: 'Pending',  color: '#ffd24a', bg: 'rgba(255,210,74,0.10)',  border: 'rgba(255,210,74,0.28)', dot: '#ffd24a' },
  failed:    { ru: 'Отменён',  en: 'Cancelled', color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)', border: 'rgba(255,107,107,0.28)', dot: '#ff6b6b' },
  expired:   { ru: 'Истёк',    en: 'Expired',   color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', dot: 'rgba(255,255,255,0.5)' },
}

function formatDateTime(iso: string, lang: string) {
  return new Date(iso).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function statusBucket(s: Order['status']): DepositFilter {
  if (s === 'completed' || s === 'paid') return 'success'
  if (s === 'pending') return 'pending'
  return 'failed'
}

export default function Deposits() {
  const navigate = useNavigate()
  const lang = useStore((s) => s.lang)
  const allOrders = useStore((s) => s.orders)
  const [filter, setFilter] = useState<DepositFilter>('all')
  const [openOrder, setOpenOrder] = useState<Order | null>(null)

  const deposits = useMemo(
    () => allOrders.filter((o) => o.kind === 'deposit'),
    [allOrders],
  )

  const filtered = useMemo(() => {
    const arr = filter === 'all' ? deposits : deposits.filter((o) => statusBucket(o.status) === filter)
    return arr.slice().sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
  }, [deposits, filter])

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

  const FILTERS: { key: DepositFilter; label: string }[] = lang === 'ru'
    ? [
        { key: 'all',     label: 'Все' },
        { key: 'success', label: 'Успешные' },
        { key: 'pending', label: 'В процессе' },
        { key: 'failed',  label: 'Отменён' },
      ]
    : [
        { key: 'all',     label: 'All' },
        { key: 'success', label: 'Success' },
        { key: 'pending', label: 'Pending' },
        { key: 'failed',  label: 'Cancelled' },
      ]

  const totalIn = deposits
    .filter((o) => statusBucket(o.status) === 'success')
    .reduce((s, o) => s + o.amount, 0)
  const successCount = deposits.filter((o) => statusBucket(o.status) === 'success').length
  const pendingCount = deposits.filter((o) => statusBucket(o.status) === 'pending').length

  return (
    <PageTransition>
      <div
        style={{
          minHeight: '100vh',
          background: INK,
          color: '#fff',
          fontFamily: DISPLAY,
          padding: 'max(18px, env(safe-area-inset-top, 18px) + 8px) 18px calc(var(--dock-h, 80px) + 64px)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label={lang === 'ru' ? 'Назад' : 'Back'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div
              style={{
                fontFamily: MONO, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.22em', color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
              }}
            >
              /deposits
            </div>
          </div>

          <div
            style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.22em', color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', marginTop: 18,
            }}
          >
            /02 · {lang === 'ru' ? 'Журнал пополнений' : 'Deposits log'}
          </div>
          <h1
            style={{
              fontSize: 30, fontWeight: 900, letterSpacing: '-0.02em',
              margin: '6px 0 16px', lineHeight: 1.05,
            }}
          >
            {lang === 'ru' ? 'История пополнений' : 'Deposit History'}
          </h1>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 22 }}>
            <StatCard label={lang === 'ru' ? 'Зачислено' : 'Credited'} value={`$${totalIn.toFixed(2)}`} accent={GREEN} symbol="+" />
            <StatCard label={lang === 'ru' ? 'Успешно' : 'Success'}   value={String(successCount)}    accent="#fff" symbol="✓" />
            <StatCard label={lang === 'ru' ? 'В процессе' : 'Pending'} value={String(pendingCount)}    accent="#ffd24a" symbol="◷" />
          </div>
        </motion.div>

        {/* Filter pills */}
        <div
          style={{
            display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none',
            marginBottom: 22, padding: '4px 0',
          }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  position: 'relative',
                  padding: '8px 14px',
                  borderRadius: 999,
                  fontFamily: DISPLAY,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  background: active ? GREEN : 'rgba(255,255,255,0.04)',
                  color: active ? INK : 'rgba(255,255,255,0.7)',
                  border: `1px solid ${active ? GREEN : 'rgba(255,255,255,0.08)'}`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'background 160ms, color 160ms',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '64px 16px',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  borderRadius: 16,
                }}
              >
                <div
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'rgba(57,255,99,0.06)',
                    border: '1px solid rgba(57,255,99,0.2)',
                    color: GREEN,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 14px',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  {lang === 'ru' ? 'Пополнений пока нет' : 'No deposits yet'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 18 }}>
                  {lang === 'ru' ? 'Здесь будут все ваши пополнения' : 'All your deposits will appear here'}
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  style={{
                    background: GREEN,
                    color: INK,
                    border: 'none',
                    padding: '12px 22px',
                    borderRadius: 999,
                    fontFamily: DISPLAY,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'ru' ? 'Пополнить' : 'Top up'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {groups.map(([day, items]) => (
                  <div key={day}>
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        marginBottom: 10, paddingLeft: 2,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: MONO, fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {day}
                      </div>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                      <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                        {items.length}
                      </div>
                    </div>

                    <motion.div
                      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                      initial="hidden"
                      animate="show"
                      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}
                    >
                      {items.map((o) => {
                        const cryptoOpt = o.provider
                          ? CRYPTO_OPTIONS.find((c) => c.id === (o.provider as CryptoNetwork))
                          : undefined
                        const meta = STATUS_META[o.status] ?? STATUS_META.expired
                        const label = meta[lang as 'ru' | 'en']
                        const isSuccess = statusBucket(o.status) === 'success'

                        return (
                          <motion.button
                            key={o.id}
                            onClick={() => setOpenOrder(o)}
                            variants={{
                              hidden: { opacity: 0, y: 8 },
                              show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
                            }}
                            whileTap={{ scale: 0.985 }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'stretch',
                              gap: 12,
                              padding: '14px 14px',
                              background: 'rgba(255,255,255,0.025)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: 14,
                              cursor: 'pointer',
                              color: '#fff',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            {/* status strip */}
                            <div
                              style={{
                                position: 'absolute',
                                left: 0, top: 0, bottom: 0,
                                width: 3,
                                background: meta.dot,
                                opacity: 0.75,
                              }}
                            />

                            {/* Icon */}
                            <div
                              style={{
                                width: 44, height: 44, borderRadius: 12,
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff',
                                flexShrink: 0,
                                marginLeft: 4,
                              }}
                            >
                              {cryptoOpt ? (
                                <CryptoLogo network={cryptoOpt.id} size={26} />
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 19V5M5 12l7-7 7 7"/>
                                </svg>
                              )}
                            </div>

                            {/* Body */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <div
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  marginBottom: 4,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 14, fontWeight: 700, color: '#fff',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                  }}
                                >
                                  {cryptoOpt
                                    ? `${cryptoOpt.name} · ${cryptoOpt.id.toUpperCase()}`
                                    : (lang === 'ru' ? 'Пополнение' : 'Deposit')}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                                  fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.5)',
                                }}
                              >
                                <span>{formatDateTime(o.created, lang)}</span>
                                <span style={{ opacity: 0.4 }}>·</span>
                                <span style={{ color: 'rgba(255,255,255,0.7)' }}>#{o.id.slice(0, 10)}</span>
                              </div>
                            </div>

                            {/* Right */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 6, flexShrink: 0 }}>
                              <div
                                style={{
                                  fontFamily: DISPLAY,
                                  fontSize: 15, fontWeight: 800,
                                  letterSpacing: '-0.01em',
                                  color: isSuccess ? GREEN : '#fff',
                                  opacity: meta === STATUS_META.failed || meta === STATUS_META.expired ? 0.55 : 1,
                                  textDecoration: (meta === STATUS_META.failed || meta === STATUS_META.expired) ? 'line-through' : 'none',
                                }}
                              >
                                {isSuccess ? '+' : ''}${o.amount.toFixed(2)}
                              </div>
                              <div
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  fontFamily: MONO,
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: '0.12em',
                                  textTransform: 'uppercase',
                                  color: meta.color,
                                  background: meta.bg,
                                  border: `1px solid ${meta.border}`,
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                }}
                              >
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot }} />
                                {label}
                              </div>
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

      <OrderDetailModal order={openOrder} onClose={() => setOpenOrder(null)} />
    </PageTransition>
  )
}

function StatCard({
  label, value, accent, symbol,
}: { label: string; value: string; accent: string; symbol: string }) {
  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: '12px 12px 14px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: MONO, fontSize: 9, fontWeight: 700,
          letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
        <span style={{ color: accent, fontSize: 12, fontWeight: 700, opacity: 0.85 }}>{symbol}</span>
        <span
          style={{
            fontFamily: DISPLAY, fontSize: 17, fontWeight: 800,
            letterSpacing: '-0.02em', color: accent,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}
