import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
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

const GREEN = '#39FF63'
const INK = '#050505'
const DISPLAY = "'Space Grotesk', system-ui, sans-serif"
const BODY = "'DM Sans', system-ui, sans-serif"
const MONO = "'JetBrains Mono', 'Space Mono', ui-monospace, monospace"

const eyebrow: CSSProperties = {
  fontFamily: DISPLAY,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.32em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.4)',
  fontStyle: 'italic',
}

const sectionLabel: CSSProperties = {
  fontFamily: DISPLAY,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: '#fff',
}

const inputStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4,
  padding: '14px 16px',
  color: '#fff',
  fontFamily: MONO,
  fontSize: 15,
  outline: 'none',
}

const primaryBtn = (disabled = false): CSSProperties => ({
  width: '100%',
  background: disabled ? 'rgba(57,255,99,0.18)' : GREEN,
  color: INK,
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: 13,
  padding: '16px 16px',
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  border: 'none',
  borderRadius: '0 0 28px 0',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
})

const ghostBtn: CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.18)',
  color: 'rgba(255,255,255,0.8)',
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: 11,
  padding: '14px 16px',
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  borderRadius: 4,
  cursor: 'pointer',
}

const STATUS_COLOR: Record<RefWithdrawal['status'], string> = {
  pending: 'rgba(255,255,255,0.55)',
  completed: GREEN,
  rejected: '#ff5050',
}

function StatusLabel({ status, lang }: { status: RefWithdrawal['status']; lang: 'ru' | 'en' }) {
  const label =
    status === 'pending'
      ? lang === 'ru'
        ? 'В обработке'
        : 'Pending'
      : status === 'completed'
        ? lang === 'ru'
          ? 'Выплачено'
          : 'Paid'
        : lang === 'ru'
          ? 'Отклонено'
          : 'Rejected'
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: 700,
        color: STATUS_COLOR[status],
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
      }}
    >
      {label}
    </span>
  )
}

export default function RefWithdrawSheet({ open, onClose }: Props) {
  const lang = useStore((s) => s.lang) as 'ru' | 'en'
  const user = useStore((s) => s.user)
  const refWithdrawals = useStore((s) => s.refWithdrawals)
  const addRefWithdrawal = useStore((s) => s.addRefWithdrawal)
  const spendRefBalance = useStore((s) => s.spendRefBalance)
  const { haptic } = useTelegram()

  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState<CryptoNetwork | null>(null)
  const [address, setAddress] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const trackRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const trackW = useRef(260)
  const thumbW = 56
  const maxX = trackW.current - thumbW - 4
  const bgOpacity = useTransform(x, [0, maxX], [0.15, 1])

  useEffect(() => {
    if (open) {
      setStep('amount')
      setAmount('')
      setNetwork(null)
      setAddress('')
      x.set(0)
    }
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
      `💸 Реферальный вывод\n👤 ${user?.username ? '@' + user.username : user?.full_name ?? '—'} (ID: ${user?.uid})\n💵 $${amountNum.toFixed(2)} · ${network.toUpperCase()}\n📬 ${address}`,
    )
    setStep('done')
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const netOpt = CRYPTO_OPTIONS.find((o) => o.id === network)
  const stepNum =
    step === 'amount' ? '01' : step === 'network' ? '02' : step === 'address' ? '03' : step === 'confirm' ? '04' : '05'
  const stepTitle =
    step === 'amount'
      ? lang === 'ru' ? 'Сумма' : 'Amount'
      : step === 'network'
        ? lang === 'ru' ? 'Сеть' : 'Network'
        : step === 'address'
          ? lang === 'ru' ? 'Адрес' : 'Address'
          : step === 'confirm'
            ? lang === 'ru' ? 'Подтверждение' : 'Confirm'
            : lang === 'ru' ? 'Готово' : 'Done'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 100,
            }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose()
            }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 101,
              background: INK,
              borderTop: `1px solid rgba(57,255,99,0.25)`,
              borderRadius: '24px 24px 0 0',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: BODY,
              color: '#fff',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: GREEN, fontWeight: 700 }}>/{stepNum}</span>
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 18,
                    fontWeight: 700,
                    fontStyle: 'italic',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {stepTitle}
                </span>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 18,
                  lineHeight: 1,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '22px 20px 28px' }}>
              <AnimatePresence mode="wait">
                {/* STEP: AMOUNT */}
                {step === 'amount' && (
                  <motion.div
                    key="amount"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                  >
                    <div style={eyebrow}>{lang === 'ru' ? 'Доступно' : 'Available'}</div>
                    <div
                      style={{
                        fontFamily: DISPLAY,
                        fontWeight: 700,
                        fontSize: 48,
                        lineHeight: 1,
                        letterSpacing: '-0.04em',
                        marginTop: 8,
                        marginBottom: 18,
                        display: 'flex',
                        alignItems: 'baseline',
                      }}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 30, marginRight: 4 }}>$</span>
                      <span>{balance.toFixed(2).split('.')[0]}</span>
                      <span style={{ color: GREEN, opacity: 0.85 }}>.{balance.toFixed(2).split('.')[1]}</span>
                    </div>

                    {/* Min notice */}
                    <div
                      style={{
                        background:
                          balance >= MIN_WITHDRAW ? 'rgba(57,255,99,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${balance >= MIN_WITHDRAW ? 'rgba(57,255,99,0.25)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 4,
                        padding: '12px 14px',
                        marginBottom: 24,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: BODY,
                          fontSize: 13,
                          fontWeight: 600,
                          color: balance >= MIN_WITHDRAW ? GREEN : '#fff',
                          marginBottom: 4,
                        }}
                      >
                        {lang === 'ru' ? `Минимум — $${MIN_WITHDRAW}` : `Minimum — $${MIN_WITHDRAW}`}
                      </div>
                      <div style={{ fontFamily: BODY, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                        {balance >= MIN_WITHDRAW
                          ? lang === 'ru'
                            ? 'Баланс достаточен для вывода'
                            : 'Balance is sufficient'
                          : lang === 'ru'
                            ? `Нужно ещё $${(MIN_WITHDRAW - balance).toFixed(2)}`
                            : `Need $${(MIN_WITHDRAW - balance).toFixed(2)} more`}
                      </div>
                    </div>

                    <div style={{ ...sectionLabel, marginBottom: 10 }}>
                      {lang === 'ru' ? 'Сумма вывода' : 'Withdrawal amount'}
                    </div>
                    <div style={{ position: 'relative', marginBottom: 24 }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="100.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{ ...inputStyle, paddingRight: 70 }}
                      />
                      <button
                        onClick={() => setAmount(balance.toFixed(2))}
                        style={{
                          position: 'absolute',
                          right: 6,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontFamily: DISPLAY,
                          fontSize: 10,
                          fontWeight: 700,
                          color: GREEN,
                          background: 'rgba(57,255,99,0.1)',
                          border: '1px solid rgba(57,255,99,0.3)',
                          padding: '8px 12px',
                          borderRadius: 999,
                          textTransform: 'uppercase',
                          letterSpacing: '0.18em',
                          cursor: 'pointer',
                        }}
                      >
                        Max
                      </button>
                    </div>

                    <button
                      style={primaryBtn(!amountValid)}
                      disabled={!amountValid}
                      onClick={() => {
                        haptic('light')
                        setStep('network')
                      }}
                    >
                      {lang === 'ru' ? 'Продолжить →' : 'Continue →'}
                    </button>

                    {/* History */}
                    {refWithdrawals.length > 0 && (
                      <div style={{ marginTop: 32 }}>
                        <div style={{ ...eyebrow, marginBottom: 12 }}>
                          {lang === 'ru' ? 'История' : 'History'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {refWithdrawals.map((w) => (
                            <div
                              key={w.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '12px 0',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                              }}
                            >
                              <CryptoLogo network={w.network} size={28} showBadge />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontFamily: DISPLAY,
                                    fontSize: 15,
                                    fontWeight: 700,
                                    letterSpacing: '-0.01em',
                                  }}
                                >
                                  ${w.amount.toFixed(2)}
                                </div>
                                <div
                                  style={{
                                    fontFamily: MONO,
                                    fontSize: 10,
                                    color: 'rgba(255,255,255,0.4)',
                                    marginTop: 2,
                                  }}
                                >
                                  {formatDate(w.createdAt)}
                                </div>
                              </div>
                              <StatusLabel status={w.status} lang={lang} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP: NETWORK */}
                {step === 'network' && (
                  <motion.div
                    key="network"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                  >
                    <div style={{ ...sectionLabel, marginBottom: 14 }}>
                      {lang === 'ru' ? 'Выберите сеть' : 'Select network'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                      {CRYPTO_OPTIONS.map((opt) => {
                        const active = network === opt.id
                        return (
                          <button
                            key={opt.id}
                            onClick={() => {
                              haptic('light')
                              setNetwork(opt.id)
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                              padding: '14px 16px',
                              background: active ? 'rgba(57,255,99,0.08)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${active ? 'rgba(57,255,99,0.5)' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: 4,
                              textAlign: 'left',
                              cursor: 'pointer',
                              color: '#fff',
                            }}
                          >
                            <CryptoLogo network={opt.id} size={32} showBadge />
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontFamily: DISPLAY,
                                  fontSize: 14,
                                  fontWeight: 700,
                                  letterSpacing: '-0.01em',
                                }}
                              >
                                {opt.name}
                              </div>
                              <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                                {opt.symbol}
                              </div>
                            </div>
                            {active && (
                              <span style={{ color: GREEN, fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>✓</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={{ ...ghostBtn, flex: 1 }} onClick={() => setStep('amount')}>
                        ← {lang === 'ru' ? 'Назад' : 'Back'}
                      </button>
                      <div style={{ flex: 2 }}>
                        <button
                          style={primaryBtn(!network)}
                          disabled={!network}
                          onClick={() => {
                            haptic('light')
                            setStep('address')
                          }}
                        >
                          {lang === 'ru' ? 'Далее →' : 'Next →'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP: ADDRESS */}
                {step === 'address' && (
                  <motion.div
                    key="address"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                  >
                    {netOpt && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                        <CryptoLogo network={netOpt.id} size={28} showBadge />
                        <div>
                          <div style={{ ...eyebrow, marginBottom: 2 }}>{lang === 'ru' ? 'Сеть' : 'Network'}</div>
                          <div style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
                            {netOpt.name}
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ ...sectionLabel, marginBottom: 10 }}>
                      {lang === 'ru' ? 'Адрес кошелька' : 'Wallet address'}
                    </div>
                    <input
                      type="text"
                      placeholder={lang === 'ru' ? 'Вставьте адрес' : 'Paste address'}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      style={{ ...inputStyle, marginBottom: 8 }}
                    />
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.4)',
                        marginBottom: 24,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {lang === 'ru'
                        ? 'Адрес должен соответствовать сети'
                        : 'Address must match the network'}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={{ ...ghostBtn, flex: 1 }} onClick={() => setStep('network')}>
                        ← {lang === 'ru' ? 'Назад' : 'Back'}
                      </button>
                      <div style={{ flex: 2 }}>
                        <button
                          style={primaryBtn(address.trim().length < 10)}
                          disabled={address.trim().length < 10}
                          onClick={() => {
                            haptic('light')
                            setStep('confirm')
                          }}
                        >
                          {lang === 'ru' ? 'Далее →' : 'Next →'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP: CONFIRM */}
                {step === 'confirm' && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                  >
                    <div style={{ ...sectionLabel, marginBottom: 14 }}>
                      {lang === 'ru' ? 'Проверьте детали' : 'Review details'}
                    </div>
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 4,
                        padding: 4,
                        marginBottom: 22,
                      }}
                    >
                      {[
                        { label: lang === 'ru' ? 'Сумма' : 'Amount', value: `$${amountNum.toFixed(2)}`, accent: true },
                        { label: lang === 'ru' ? 'Сеть' : 'Network', value: netOpt?.name ?? '' },
                        { label: lang === 'ru' ? 'Адрес' : 'Address', value: address, mono: true },
                      ].map((row, i, arr) => (
                        <div
                          key={row.label}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 14,
                            padding: '14px 12px',
                            borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: MONO,
                              fontSize: 10,
                              color: 'rgba(255,255,255,0.45)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.12em',
                              flexShrink: 0,
                              paddingTop: 2,
                            }}
                          >
                            {row.label}
                          </span>
                          <span
                            style={{
                              fontFamily: row.mono ? MONO : DISPLAY,
                              fontSize: row.mono ? 11 : 14,
                              fontWeight: 700,
                              color: row.accent ? GREEN : '#fff',
                              maxWidth: 200,
                              textAlign: 'right',
                              wordBreak: 'break-all',
                            }}
                          >
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Swipe to confirm */}
                    <div
                      ref={trackRef}
                      style={{
                        position: 'relative',
                        height: 60,
                        borderRadius: 30,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(57,255,99,0.3)',
                        overflow: 'hidden',
                        marginBottom: 14,
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        WebkitTouchCallout: 'none',
                      }}
                    >
                      <motion.div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: GREEN,
                          opacity: bgOpacity,
                          borderRadius: 30,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: DISPLAY,
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.6)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.28em',
                          pointerEvents: 'none',
                        }}
                      >
                        {lang === 'ru' ? 'Свайп для подтверждения' : 'Swipe to confirm'}
                      </div>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 2, right: maxX }}
                        dragElastic={0}
                        dragMomentum={false}
                        style={{
                          position: 'absolute',
                          left: 2,
                          top: 2,
                          width: thumbW,
                          height: thumbW,
                          borderRadius: '50%',
                          background: '#fff',
                          color: INK,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          fontWeight: 700,
                          cursor: 'grab',
                          boxShadow: '0 4px 16px rgba(57,255,99,0.4)',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none',
                          x,
                        }}
                        onDragEnd={(_, info) => {
                          if (
                            info.point.x - (trackRef.current?.getBoundingClientRect().left ?? 0) >
                            trackW.current * 0.75
                          ) {
                            handleSubmit()
                          } else {
                            x.set(0)
                          }
                        }}
                      >
                        →
                      </motion.div>
                    </div>

                    <button style={ghostBtn} onClick={() => setStep('address')}>
                      ← {lang === 'ru' ? 'Назад' : 'Back'}
                    </button>
                  </motion.div>
                )}

                {/* STEP: DONE */}
                {step === 'done' && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          background: GREEN,
                          color: INK,
                          margin: '0 auto 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 32,
                          fontWeight: 800,
                          boxShadow: '0 0 40px rgba(57,255,99,0.5)',
                        }}
                      >
                        ✓
                      </motion.div>
                      <div
                        style={{
                          fontFamily: DISPLAY,
                          fontWeight: 700,
                          fontStyle: 'italic',
                          fontSize: 24,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {lang === 'ru' ? 'Заявка создана' : 'Request created'}
                      </div>
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.4)',
                          marginTop: 8,
                          textTransform: 'uppercase',
                          letterSpacing: '0.2em',
                        }}
                      >
                        {lang === 'ru' ? 'Обычно до 24 часов' : 'Usually within 24h'}
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 4,
                        marginBottom: 22,
                      }}
                    >
                      {[
                        { label: lang === 'ru' ? 'Сумма' : 'Amount', value: `$${amountNum.toFixed(2)}`, accent: true },
                        { label: lang === 'ru' ? 'Сеть' : 'Network', value: netOpt?.name ?? '' },
                        {
                          label: lang === 'ru' ? 'Адрес' : 'Address',
                          value: address.length > 18 ? `${address.slice(0, 8)}…${address.slice(-8)}` : address,
                          mono: true,
                        },
                      ].map((row, i, arr) => (
                        <div
                          key={row.label}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 14,
                            padding: '14px 14px',
                            borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: MONO,
                              fontSize: 10,
                              color: 'rgba(255,255,255,0.45)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.12em',
                            }}
                          >
                            {row.label}
                          </span>
                          <span
                            style={{
                              fontFamily: row.mono ? MONO : DISPLAY,
                              fontSize: row.mono ? 11 : 14,
                              fontWeight: 700,
                              color: row.accent ? GREEN : '#fff',
                            }}
                          >
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button style={primaryBtn(false)} onClick={onClose}>
                      {lang === 'ru' ? 'Закрыть' : 'Close'}
                    </button>
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
