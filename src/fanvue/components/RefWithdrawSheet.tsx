import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useT } from '../i18n'
import { useStore, CRYPTO_OPTIONS } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { tgNotify } from '../utils/tgNotify'
import CryptoLogo from './CryptoLogo'
import type { CryptoNetwork, RefWithdrawal } from '../store/types'

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'amount' | 'network' | 'address' | 'confirm' | 'done'

const STATUS_COLOR: Record<RefWithdrawal['status'], string> = {
  pending:   'var(--t-muted)',
  completed: 'var(--success)',
  rejected:  '#ff5050',
}

const STATUS_ICON: Record<RefWithdrawal['status'], string> = {
  pending:   '⏳',
  completed: '✅',
  rejected:  '❌',
}

function StatusLabel({ status }: { status: RefWithdrawal['status'] }) {
  const t = useT()
  const map = { pending: t('withdraw_submitted'), completed: t('withdraw_paid'), rejected: t('withdraw_rejected') }
  return <span style={{ color: STATUS_COLOR[status], fontWeight: 700 }}>{STATUS_ICON[status]} {map[status]}</span>
}

export default function RefWithdrawSheet({ open, onClose }: Props) {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const user = useStore((s) => s.user)
  const refWithdrawals = useStore((s) => s.refWithdrawals)
  const addRefWithdrawal = useStore((s) => s.addRefWithdrawal)
  const spendRefBalance = useStore((s) => s.spendRefBalance)
  const { haptic } = useTelegram()

  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState<CryptoNetwork | null>(null)
  const [address, setAddress] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  // Swipe-to-confirm track
  const trackRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const trackW = useRef(260)
  const thumbW = 56
  const maxX = trackW.current - thumbW - 4
  const bgOpacity = useTransform(x, [0, maxX], [0.2, 1])

  useEffect(() => {
    if (open) { setStep('amount'); setAmount(''); setNetwork(null); setAddress(''); setConfirmed(false); x.set(0) }
  }, [open, x])

  useEffect(() => {
    if (trackRef.current) trackW.current = trackRef.current.offsetWidth
  })

  if (!user) return null
  const balance = user.ref_balance

  const MIN_WITHDRAW = 10
  const amountNum = parseFloat(amount) || 0
  const amountValid = amountNum >= MIN_WITHDRAW && amountNum <= balance

  function handleSubmit() {
    if (!network) return
    spendRefBalance(amountNum)
    addRefWithdrawal({ amount: amountNum, network, address, status: 'pending' })
    haptic('success')
    tgNotify(
      `💸 Реферальный вывод\n👤 ${user?.username ? '@' + user.username : user?.full_name ?? '—'} (ID: ${user?.uid})\n💵 $${amountNum.toFixed(2)} · ${network.toUpperCase()}\n📬 ${address}`
    )
    setStep('done')
    setConfirmed(true)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const netOpt = CRYPTO_OPTIONS.find((o) => o.id === network)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
            style={{ maxHeight: '90vh', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--b-default)' }} />
            </div>

            {/* Header */}
            <div className="row-between" style={{ padding: '8px 20px 12px', flexShrink: 0 }}>
              <div className="t-lg fw-black">{t('withdraw_title')}</div>
              <motion.button onClick={onClose} whileTap={{ scale: 0.9 }} style={{ color: 'var(--t-muted)', fontSize: 20, lineHeight: 1 }}>×</motion.button>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 28px' }}>
              <AnimatePresence mode="wait">

                {/* ── STEP: AMOUNT ── */}
                {step === 'amount' && (
                  <motion.div key="amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="t-xs t-muted mb-1">{t('ref_balance_label')}</div>
                    <div className="t-xl fw-black t-brand mb-3">${balance.toFixed(2)}</div>

                    {/* Min withdraw notice */}
                    <div style={{
                      background: balance >= MIN_WITHDRAW
                        ? 'rgba(73,242,100,0.08)'
                        : 'rgba(255,165,0,0.08)',
                      border: `1px solid ${balance >= MIN_WITHDRAW ? 'rgba(73,242,100,0.2)' : 'rgba(255,165,0,0.25)'}`,
                      borderRadius: 10, padding: '10px 14px', marginBottom: 20,
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>
                        {balance >= MIN_WITHDRAW ? '✅' : '⏳'}
                      </span>
                      <div>
                        <div className="t-xs fw-bold" style={{ color: balance >= MIN_WITHDRAW ? 'var(--success)' : 'var(--orange)', marginBottom: 2 }}>
                          {lang === 'ru'
                            ? `Минимальная сумма вывода — $${MIN_WITHDRAW}`
                            : `Minimum withdrawal — $${MIN_WITHDRAW}`}
                        </div>
                        <div className="t-xs t-muted">
                          {balance >= MIN_WITHDRAW
                            ? (lang === 'ru' ? 'Баланс достаточен — можно выводить!' : 'Balance is sufficient — you can withdraw!')
                            : (lang === 'ru'
                                ? `Нужно ещё $${(MIN_WITHDRAW - balance).toFixed(2)} — пригласи ещё ${Math.ceil((MIN_WITHDRAW - balance) / 5)} ${Math.ceil((MIN_WITHDRAW - balance) / 5) === 1 ? 'покупателя' : 'покупателей'}`
                                : `Need $${(MIN_WITHDRAW - balance).toFixed(2)} more — invite ${Math.ceil((MIN_WITHDRAW - balance) / 5)} more ${Math.ceil((MIN_WITHDRAW - balance) / 5) === 1 ? 'buyer' : 'buyers'}`)}
                        </div>
                      </div>
                    </div>

                    <div className="t-sm fw-bold mb-2">{t('withdraw_amount_label')}</div>
                    <div style={{ position: 'relative', marginBottom: 6 }}>
                      <input
                        className="input"
                        type="number"
                        inputMode="decimal"
                        placeholder="100.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{ paddingRight: 64 }}
                      />
                      <motion.button
                        style={{
                          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 12, fontWeight: 700, color: 'var(--brand)',
                          padding: '6px 10px', borderRadius: 8,
                          background: 'rgba(232,54,93,0.1)',
                          minWidth: 44, minHeight: 36,
                        }}
                        onClick={() => setAmount(balance.toFixed(2))}
                        whileTap={{ scale: 0.9 }}
                      >
                        {t('withdraw_max')}
                      </motion.button>
                    </div>
                    <div className="t-xs t-muted mb-5">{t('withdraw_amount_hint')}</div>

                    <motion.button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      disabled={!amountValid}
                      onClick={() => setStep('network')}
                      whileTap={{ scale: 0.97 }}
                    >
                      {lang === 'ru' ? 'Продолжить' : 'Continue'}
                    </motion.button>

                    {/* History */}
                    {refWithdrawals.length > 0 && (
                      <div style={{ marginTop: 28 }}>
                        <div className="t-sm fw-bold mb-3">{t('withdraw_history')}</div>
                        <div className="col gap-2">
                          {refWithdrawals.map((w) => (
                            <div key={w.id} style={{
                              background: 'var(--surface-2)',
                              borderRadius: 10,
                              padding: '10px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                            }}>
                              <CryptoLogo network={w.network} size={28} showBadge />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="t-sm fw-bold">${w.amount.toFixed(2)}</div>
                                <div className="t-xs t-muted">{formatDate(w.createdAt)}</div>
                                {w.txid && <div className="t-xs t-muted" style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.txid}</div>}
                              </div>
                              <StatusLabel status={w.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── STEP: NETWORK ── */}
                {step === 'network' && (
                  <motion.div key="network" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="t-sm fw-bold mb-3">{t('withdraw_network_label')}</div>
                    <div className="col gap-2 mb-5">
                      {CRYPTO_OPTIONS.map((opt) => (
                        <motion.button
                          key={opt.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px',
                            background: network === opt.id ? 'rgba(var(--brand-rgb),0.12)' : 'var(--surface-2)',
                            border: network === opt.id ? '1.5px solid var(--brand)' : '1.5px solid transparent',
                            borderRadius: 12, textAlign: 'left',
                          }}
                          onClick={() => setNetwork(opt.id)}
                          whileTap={{ scale: 0.98 }}
                        >
                          <CryptoLogo network={opt.id} size={32} showBadge />
                          <div style={{ flex: 1 }}>
                            <div className="t-sm fw-bold">{opt.name}</div>
                            <div className="t-xs t-muted">{opt.symbol}</div>
                          </div>
                          {network === opt.id && <span style={{ color: 'var(--brand)', fontSize: 18 }}>✓</span>}
                        </motion.button>
                      ))}
                    </div>
                    <div className="row gap-3">
                      <motion.button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep('amount')} whileTap={{ scale: 0.97 }}>
                        ← {lang === 'ru' ? 'Назад' : 'Back'}
                      </motion.button>
                      <motion.button className="btn btn-primary" style={{ flex: 2 }} disabled={!network} onClick={() => setStep('address')} whileTap={{ scale: 0.97 }}>
                        {lang === 'ru' ? 'Продолжить' : 'Continue'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP: ADDRESS ── */}
                {step === 'address' && (
                  <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    {netOpt && (
                      <div className="row gap-2 mb-4">
                        <CryptoLogo network={netOpt.id} size={28} showBadge />
                        <span className="t-sm fw-bold">{netOpt.name}</span>
                      </div>
                    )}
                    <div className="t-sm fw-bold mb-2">{t('withdraw_address_label')}</div>
                    <input
                      className="input mb-1"
                      type="text"
                      placeholder={t('withdraw_address_hint')}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                    <div className="t-xs t-muted mb-5" style={{ wordBreak: 'break-all' }}>
                      {lang === 'ru' ? 'Убедитесь, что адрес соответствует выбранной сети' : 'Make sure the address matches the selected network'}
                    </div>
                    <div className="row gap-3">
                      <motion.button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep('network')} whileTap={{ scale: 0.97 }}>
                        ← {lang === 'ru' ? 'Назад' : 'Back'}
                      </motion.button>
                      <motion.button className="btn btn-primary" style={{ flex: 2 }} disabled={address.trim().length < 10} onClick={() => setStep('confirm')} whileTap={{ scale: 0.97 }}>
                        {lang === 'ru' ? 'Продолжить' : 'Continue'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP: CONFIRM (swipe) ── */}
                {step === 'confirm' && (
                  <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="t-sm fw-bold mb-3">{t('withdraw_summary')}</div>
                    <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '14px', marginBottom: 20 }} className="col gap-3">
                      <div className="row-between">
                        <span className="t-xs t-muted">{t('withdraw_amount_label')}</span>
                        <span className="t-sm fw-bold">${amountNum.toFixed(2)}</span>
                      </div>
                      <div className="row-between">
                        <span className="t-xs t-muted">{t('withdraw_network_label')}</span>
                        <span className="t-sm fw-bold">{netOpt?.name}</span>
                      </div>
                      <div className="row-between" style={{ alignItems: 'flex-start' }}>
                        <span className="t-xs t-muted">{t('withdraw_address_label')}</span>
                        <span className="t-xs fw-bold" style={{ maxWidth: 180, textAlign: 'right', wordBreak: 'break-all' }}>{address}</span>
                      </div>
                    </div>

                    {/* Swipe track */}
                    <div
                      ref={trackRef}
                      style={{
                        position: 'relative',
                        height: 60,
                        borderRadius: 30,
                        background: 'var(--surface-2)',
                        border: '1.5px solid var(--b-default)',
                        overflow: 'hidden',
                        marginBottom: 16,
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        WebkitTouchCallout: 'none',
                      }}
                    >
                      <motion.div style={{ position: 'absolute', inset: 0, background: 'var(--g-brand)', opacity: bgOpacity, borderRadius: 30 }} />
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                        pointerEvents: 'none',
                      }}>
                        {t('withdraw_swipe')}
                      </div>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 2, right: maxX }}
                        dragElastic={0}
                        dragMomentum={false}
                        style={{
                          position: 'absolute', left: 2, top: 2,
                          width: thumbW, height: thumbW,
                          borderRadius: '50%',
                          background: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22, cursor: 'grab', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none',
                          x,
                        }}
                        onDragEnd={(_, info) => {
                          if (info.point.x - (trackRef.current?.getBoundingClientRect().left ?? 0) > (trackW.current * 0.75)) {
                            handleSubmit()
                          } else {
                            x.set(0)
                          }
                        }}
                      >
                        →
                      </motion.div>
                    </div>

                    <motion.button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setStep('address')} whileTap={{ scale: 0.97 }}>
                      ← {lang === 'ru' ? 'Назад' : 'Back'}
                    </motion.button>
                  </motion.div>
                )}

                {/* ── STEP: DONE ── */}
                {step === 'done' && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ paddingTop: 16, paddingBottom: 10 }}>
                    <div className="t-lg fw-black" style={{ textAlign: 'center', marginBottom: 20 }}>
                      {lang === 'ru' ? 'Заявка создана' : 'Request Created'}
                    </div>

                    {/* Timeline tracker */}
                    <div style={{ padding: '0 4px', marginBottom: 24 }}>
                      {[
                        {
                          icon: '✅',
                          title: lang === 'ru' ? 'Заявка отправлена' : 'Request Submitted',
                          subtitle: lang === 'ru' ? 'Ожидайте рассмотрения' : 'Awaiting review',
                          state: 'completed' as const,
                        },
                        {
                          icon: '🔍',
                          title: lang === 'ru' ? 'На рассмотрении' : 'Under Review',
                          subtitle: lang === 'ru' ? 'Обычно до 24 часов' : 'Usually within 24 hours',
                          state: 'active' as const,
                        },
                        {
                          icon: '💸',
                          title: lang === 'ru' ? 'Выплата произведена' : 'Payout Complete',
                          subtitle: lang === 'ru' ? 'Средства поступят на ваш кошелёк' : 'Funds will arrive to your wallet',
                          state: 'pending' as const,
                        },
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 260, damping: 22 }}
                          style={{ display: 'flex', gap: 14, position: 'relative' }}
                        >
                          {/* Vertical line connector */}
                          {i < 2 && (
                            <div style={{
                              position: 'absolute',
                              left: 17,
                              top: 36,
                              width: 2,
                              height: 'calc(100% - 20px)',
                              background: item.state === 'completed' ? 'var(--success)' : 'var(--b-default)',
                              borderRadius: 1,
                            }} />
                          )}

                          {/* Dot / icon */}
                          <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, width: 36, display: 'flex', justifyContent: 'center' }}>
                            {item.state === 'completed' ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 400, damping: 15 }}
                                style={{
                                  width: 36, height: 36, borderRadius: '50%',
                                  background: 'rgba(73,242,100,0.15)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 18,
                                }}
                              >
                                {item.icon}
                              </motion.div>
                            ) : item.state === 'active' ? (
                              <motion.div
                                animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                style={{
                                  width: 36, height: 36, borderRadius: '50%',
                                  background: 'rgba(232,54,93,0.12)',
                                  border: '1.5px solid var(--brand)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 18,
                                }}
                              >
                                {item.icon}
                              </motion.div>
                            ) : (
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'var(--surface-2)',
                                border: '1.5px solid var(--b-default)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, opacity: 0.4,
                              }}>
                                {item.icon}
                              </div>
                            )}
                          </div>

                          {/* Text */}
                          <div style={{ paddingTop: 6, paddingBottom: i < 2 ? 20 : 0, opacity: item.state === 'pending' ? 0.45 : 1 }}>
                            <div className="t-sm fw-bold">{item.title}</div>
                            <div className="t-xs t-muted" style={{ marginTop: 2 }}>{item.subtitle}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Withdrawal details */}
                    <div style={{
                      background: 'var(--surface-2)', borderRadius: 12, padding: '14px', width: '100%',
                    }} className="col gap-3">
                      <div className="row-between">
                        <span className="t-xs t-muted">{t('withdraw_amount_label')}</span>
                        <span className="t-sm fw-bold">${amountNum.toFixed(2)}</span>
                      </div>
                      <div className="row-between">
                        <span className="t-xs t-muted">{t('withdraw_network_label')}</span>
                        <span className="t-sm fw-bold">{netOpt?.name}</span>
                      </div>
                      <div className="row-between" style={{ alignItems: 'flex-start' }}>
                        <span className="t-xs t-muted">{t('withdraw_address_label')}</span>
                        <span className="t-xs fw-bold" style={{ maxWidth: 160, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {address.length > 16 ? `${address.slice(0, 8)}...${address.slice(-8)}` : address}
                        </span>
                      </div>
                    </div>

                    <motion.button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={onClose} whileTap={{ scale: 0.97 }}>
                      {lang === 'ru' ? 'Закрыть' : 'Close'}
                    </motion.button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
