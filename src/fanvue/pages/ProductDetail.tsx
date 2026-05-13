import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { NetworkPicker, PayPanel } from './Deposit'
import Confetti from '../components/Confetti'
import { useToast } from '../components/Toast'
import { useStore, CRYPTO_OPTIONS } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { createOrder, generateOrderId, generateUniqueAmount } from '../utils/payment'
import { tgNotify } from '../utils/tgNotify'
import { track } from '../utils/analytics'
import type { CryptoNetwork } from '../store/types'


const EASE = [0.22, 1, 0.36, 1] as const

type PayStep = 'select' | 'crypto_net' | 'crypto_pay' | 'success'

const TIERS = [
  { min: 3, pct: 5 },
  { min: 5, pct: 10 },
  { min: 10, pct: 15 },
]

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const toast = useToast()

  const lang = useStore((s) => s.lang)
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const user = useStore((s) => s.user)
  const orders = useStore((s) => s.orders)
  const addOrder = useStore((s) => s.addOrder)
  const updateBalance = useStore((s) => s.updateBalance)
  const addNotification = useStore((s) => s.addNotification)
  const setOrderStatus = useStore((s) => s.setOrderStatus)

  const product = products.find((p) => p.id === Number(id))
  const [qty, setQty] = useState(1)
  const [showPayment, setShowPayment] = useState(false)
  const [payStep, setPayStep] = useState<PayStep>('select')
  const [selectedNet, setSelectedNet] = useState<CryptoNetwork | null>(null)
  const [pendingOrder, setPendingOrder] = useState<{ id: string; uniqueAmount: number } | null>(null)

  useEffect(() => {
    if (product) track('product_view', { id: product.id, title: product.title })
  }, [product])

  useEffect(() => {
    if (!showPayment) {
      setPayStep('select')
      setSelectedNet(null)
      setPendingOrder(null)
    }
  }, [showPayment])

  if (!product) {
    return (
      <div className="fv-detail-shell fv-detail-missing">
        <button className="fv-back" onClick={() => navigate(-1)}>←</button>
        <strong>{lang === 'ru' ? 'Товар не найден' : 'Product not found'}</strong>
      </div>
    )
  }

  const title = lang === 'ru' ? product.title : product.title_en
  const desc = lang === 'ru' ? product.description : product.desc_en
  const cat = categories.find((c) => c.id === product.cat_id)
  const isOut = product.stock === 0
  const activeTier = [...TIERS].reverse().find((tier) => qty >= tier.min)
  const discountPct = activeTier?.pct ?? 0
  const total = product.price * qty * (1 - discountPct / 100)
  const balance = user?.balance ?? 0
  const hasEnoughBalance = balance >= total
  const cryptoOption = CRYPTO_OPTIONS.find((c) => c.id === selectedNet)

  const similar = products
    .filter((p) => p.active && p.id !== product.id && p.cat_id === product.cat_id)
    .slice(0, 3)

  const originalUnit = product.price
  const originalTotal = originalUnit * qty
  const lowStock = product.stock > 0 && product.stock <= 5
  const categoryName = cat ? (lang === 'ru' ? cat.name : cat.name_en) : 'Fanvue'
  const deliveryLabel = product.delivery === 'auto'
    ? (lang === 'ru' ? 'Мгновенно' : 'Instant')
    : (lang === 'ru' ? '1–24 часа' : '1–24h')


  const handleBuyWithBalance = () => {
    haptic('success')
    const buyCount = orders.filter((o) => o.kind === 'buy').length + 1
    addOrder({
      id: generateOrderId(buyCount),
      orderNum: buyCount,
      kind: 'buy',
      product_title: title,
      amount: total,
      status: 'completed',
      quantity: qty,
      created: new Date().toISOString(),
      paid_at: new Date().toISOString(),
    })
    updateBalance(-total)
    toast.show(lang === 'ru' ? 'Покупка готова.' : 'Purchase ready.', 'success')
    tgNotify(
      `🛍 Новый заказ (баланс)\n👤 ${user?.username ? '@' + user.username : user?.full_name ?? '—'} (ID: ${user?.uid})\n📦 ${title} × ${qty}\n💵 $${total.toFixed(2)}`,
    )
    setPayStep('success')
  }

  const handlePayCrypto = async () => {
    if (!selectedNet || !user) return
    haptic('medium')
    const remote = await createOrder({
      uid: user.uid,
      kind: 'buy',
      product_id: product.id,
      quantity: qty,
      amount_usd: total,
      network: selectedNet,
    })
    const buyCount = orders.filter((o) => o.kind === 'buy').length + 1
    const orderId = remote?.id ?? generateOrderId(buyCount)
    const uniqueAmount = remote ? total : generateUniqueAmount(total)
    addOrder({
      id: orderId,
      orderNum: buyCount,
      kind: 'buy',
      product_title: title,
      amount: uniqueAmount,
      status: 'pending',
      quantity: qty,
      provider: selectedNet,
      created: new Date().toISOString(),
    })
    setPendingOrder({ id: orderId, uniqueAmount })
    tgNotify(
      `🛍 Новый заказ (крипто)\n👤 ${user?.username ? '@' + user.username : user?.full_name ?? '—'} (ID: ${user?.uid})\n📦 ${title} × ${qty}\n💵 $${uniqueAmount.toFixed(2)} · ${selectedNet.toUpperCase()}\n🆔 ${orderId}`,
    )
    setPayStep('crypto_pay')
  }

  return (
    <PageTransition>
      <main className="pd-shell">
        <header className="pd-topbar">
          <motion.button
            className="pd-back"
            onClick={() => navigate(-1)}
            aria-label="Back"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            whileTap={{ scale: 0.92 }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M11.5 4.5 7 9l4.5 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{lang === 'ru' ? 'Назад' : 'Back'}</span>
          </motion.button>
          <div className="pd-crumb">
            <i />
            <span>{categoryName}</span>
          </div>
        </header>

        <section className="pd-hero">
          <div className="pd-hero-glow" aria-hidden />
          <motion.div
            className="pd-tags"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.08 }}
          >
            <span className="pd-tag pd-tag--hot">
              <i /> {lang === 'ru' ? 'В наличии' : 'In stock'}
            </span>
            <span className="pd-tag">{deliveryLabel}</span>
            {lowStock && (
              <span className="pd-tag pd-tag--warn">
                {lang === 'ru' ? `Осталось ${product.stock}` : `Only ${product.stock} left`}
              </span>
            )}
          </motion.div>

          <motion.h1
            className="pd-title"
            initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.16 }}
          >
            {title}
          </motion.h1>

          <motion.p
            className="pd-desc"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.28 }}
          >
            {desc}
          </motion.p>

          <motion.div
            className="pd-price-row"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.36 }}
          >
            <div className="pd-price">
              <span className="pd-price-cur">$</span>
              <motion.strong
                key={total.toFixed(2)}
                initial={{ y: 6, opacity: 0, filter: 'blur(6px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                {total.toFixed(2)}
              </motion.strong>
            </div>
            <div className="pd-price-meta">
              <AnimatePresence mode="wait">
                {discountPct > 0 ? (
                  <motion.div
                    key="disc"
                    className="pd-price-disc"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    <s>${originalTotal.toFixed(2)}</s>
                    <em>−{discountPct}%</em>
                  </motion.div>
                ) : (
                  <motion.span
                    key="hint"
                    className="pd-price-hint"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    {lang === 'ru' ? 'от 3 шт — скидка' : 'discount from 3'}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </section>

        <section className="pd-card">
          <div className="pd-card-head">
            <div>
              <span className="pd-kicker">{lang === 'ru' ? 'Количество' : 'Quantity'}</span>
              <strong className="pd-card-title">
                {qty} × ${product.price.toFixed(0)}
              </strong>
            </div>
            <div className="pd-stepper">
              <button onClick={() => { haptic('light'); setQty((q) => Math.max(1, q - 1)) }} disabled={qty <= 1} aria-label="−">−</button>
              <b>{qty}</b>
              <button onClick={() => { haptic('light'); setQty((q) => Math.min(product.stock, q + 1)) }} disabled={qty >= product.stock} aria-label="+">+</button>
            </div>
          </div>

          <div className="pd-tiers">
            {TIERS.map((tier) => {
              const active = qty >= tier.min
              return (
                <button
                  key={tier.min}
                  className={`pd-tier${active ? ' is-on' : ''}`}
                  onClick={() => { haptic('light'); setQty(Math.min(product.stock, tier.min)) }}
                >
                  <span>{tier.min}+</span>
                  <strong>−{tier.pct}%</strong>
                </button>
              )
            })}
          </div>
        </section>

        {similar.length > 0 && (
          <section className="pd-similar">
            <span className="pd-kicker">{lang === 'ru' ? 'Похожие' : 'Similar'}</span>
            <div className="pd-similar-list">
              {similar.map((item) => (
                <button key={item.id} className="pd-similar-item" onClick={() => navigate(`/product/${item.id}`)}>
                  <span>{lang === 'ru' ? item.title : item.title_en}</span>
                  <strong>${item.price.toFixed(0)}</strong>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="pd-cta-spacer" aria-hidden />

        <motion.div
          className="pd-cta-dock"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
        >
          <motion.button
            className="pd-cta"
            disabled={isOut}
            whileTap={{ scale: 0.985 }}
            onClick={() => {
              if (isOut) return
              haptic('medium')
              setShowPayment(true)
            }}
          >
            <span className="pd-cta-shimmer" aria-hidden />
            <span className="pd-cta-label">
              {isOut ? (lang === 'ru' ? 'Нет в наличии' : 'Sold out') : (lang === 'ru' ? 'Купить' : 'Buy')}
            </span>
            {!isOut && <span className="pd-cta-amount">${total.toFixed(2)}</span>}
            {!isOut && (
              <svg className="pd-cta-arrow" viewBox="0 0 24 24" fill="none" width="18" height="18">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </motion.button>
        </motion.div>
      </main>

      <AnimatePresence>
        {showPayment && (
          <motion.div
            className="fv-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(event) => {
              if (event.target === event.currentTarget && payStep !== 'crypto_pay') setShowPayment(false)
            }}
          >
            <motion.div
              className="fv-pay-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.28 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 && payStep !== 'crypto_pay') setShowPayment(false)
              }}
            >
              <div className="fv-sheet-handle" />

              {payStep === 'select' && (
                <motion.div
                  className="fv-pay-select"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, ease: EASE }}
                >
                  <span className="fv-section-kicker">{lang === 'ru' ? 'Оплата' : 'Checkout'}</span>
                  <h2>{lang === 'ru' ? 'Как оплачиваем?' : 'How do you want to pay?'}</h2>
                  <p className="fv-pay-sub">
                    {lang === 'ru'
                      ? 'Мгновенное зачисление, без скрытых комиссий.'
                      : 'Instant credit, no hidden fees.'}
                  </p>

                  <motion.button
                    className={`fv-pay-card fv-pay-card--balance${!hasEnoughBalance ? ' is-low' : ''}`}
                    onClick={hasEnoughBalance ? handleBuyWithBalance : undefined}
                    disabled={!hasEnoughBalance}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06, duration: 0.4, ease: EASE }}
                    whileTap={hasEnoughBalance ? { scale: 0.985 } : undefined}
                  >
                    <span className="fv-pay-card-glow" aria-hidden />
                    <span className="fv-pay-card-icon" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
                        <circle cx="17" cy="14.5" r="1.4" fill="currentColor" />
                      </svg>
                    </span>
                    <span className="fv-pay-card-meta">
                      <span className="fv-pay-card-eye">{lang === 'ru' ? 'Баланс магазина' : 'Shop balance'}</span>
                      <strong>${balance.toFixed(2)}</strong>
                      <em>
                        {hasEnoughBalance
                          ? (lang === 'ru' ? `Спишется $${total.toFixed(2)} · мгновенно` : `Charges $${total.toFixed(2)} · instant`)
                          : (lang === 'ru' ? `Не хватает $${(total - balance).toFixed(2)}` : `Need $${(total - balance).toFixed(2)} more`)}
                      </em>
                    </span>
                    <span className="fv-pay-card-cta">
                      {hasEnoughBalance
                        ? (lang === 'ru' ? 'Оплатить' : 'Pay')
                        : (lang === 'ru' ? 'Пополнить' : 'Top up')}
                      <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </motion.button>

                  <motion.button
                    className="fv-pay-card fv-pay-card--crypto"
                    onClick={() => { haptic('light'); setPayStep('crypto_net') }}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12, duration: 0.4, ease: EASE }}
                    whileTap={{ scale: 0.985 }}
                  >
                    <span className="fv-pay-card-glow" aria-hidden />
                    <span className="fv-pay-card-icon fv-pay-card-icon--c" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 3v18M7 7h7a3 3 0 0 1 0 6H7m0 0h8a3 3 0 0 1 0 6H7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="fv-pay-card-meta">
                      <span className="fv-pay-card-eye">{lang === 'ru' ? 'Криптовалюта' : 'Crypto'}</span>
                      <strong>USDT · USDC · BTC</strong>
                      <em className="fv-pay-card-chips">
                        <i>TRC20</i><i>ERC20</i><i>SOL</i>
                        <i className="fv-live"><b />{lang === 'ru' ? 'live курсы' : 'live rates'}</i>
                      </em>
                    </span>
                    <span className="fv-pay-card-cta">
                      {lang === 'ru' ? 'Выбрать' : 'Choose'}
                      <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </motion.button>

                  <div className="fv-pay-trust">
                    <span><svg viewBox="0 0 24 24" fill="none"><path d="M12 3 4 6v6c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V6l-8-3Z" stroke="currentColor" strokeWidth="1.7"/></svg>{lang === 'ru' ? 'Защищено' : 'Secure'}</span>
                    <span><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>{lang === 'ru' ? 'Зачисление сразу' : 'Instant credit'}</span>
                    <span><svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M5 6h14M5 18h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>{lang === 'ru' ? 'Чек в Telegram' : 'Telegram receipt'}</span>
                  </div>
                </motion.div>
              )}

              {payStep === 'crypto_net' && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, ease: EASE }}
                >
                  <div className="fv-sheet-title-row">
                    <button onClick={() => setPayStep('select')} aria-label="Back">
                      <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <h2>{lang === 'ru' ? 'Чем платим?' : 'How will you pay?'}</h2>
                  </div>
                  <div className="fv-pay-amount-pill">
                    <span>{lang === 'ru' ? 'К оплате' : 'Total'}</span>
                    <strong>${total.toFixed(2)}</strong>
                  </div>
                  <NetworkPicker selected={selectedNet} onSelect={(n) => { haptic('light'); setSelectedNet(n) }} lang={lang} />
                  <motion.button
                    className="dpz-cta fv-full"
                    disabled={!selectedNet}
                    onClick={handlePayCrypto}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="dpz-cta-bg" aria-hidden />
                    <span className="dpz-cta-t">{lang === 'ru' ? 'Создать оплату' : 'Create payment'}</span>
                    <svg className="dpz-cta-ic" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </motion.button>
                </motion.div>
              )}

              {payStep === 'crypto_pay' && cryptoOption && pendingOrder && (
                <motion.div
                  className="dpz dpz--inline"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <PayPanel
                    orderId={pendingOrder.id}
                    amountUsd={total}
                    uniqueAmount={pendingOrder.uniqueAmount}
                    network={cryptoOption.id}
                    cryptoName={cryptoOption.name}
                    cryptoSymbol={cryptoOption.symbol}
                    cryptoColor={cryptoOption.color}
                    cryptoAddressFallback={cryptoOption.address}
                    lang={lang}
                    onCancel={() => setShowPayment(false)}
                    onSuccess={() => {
                      if (pendingOrder && selectedNet) {
                        setOrderStatus(pendingOrder.id, 'paid')
                        addNotification({
                          orderId: pendingOrder.id,
                          kind: 'buy',
                          amountUsd: total,
                          uniqueAmount: pendingOrder.uniqueAmount,
                          network: selectedNet,
                        })
                      }
                      setPayStep('success')
                    }}
                  />
                </motion.div>
              )}

              {payStep === 'success' && (
                <div className="fv-success">
                  <Confetti trigger={true} />
                  <div className="fv-success-mark">✓</div>
                  <span className="fv-section-kicker">{lang === 'ru' ? 'Готово' : 'Done'}</span>
                  <h2>{lang === 'ru' ? 'Заказ создан' : 'Order created'}</h2>
                  <p>{lang === 'ru' ? 'Откройте заказы, чтобы отслеживать выдачу.' : 'Open orders to track delivery.'}</p>
                  <button className="fv-primary fv-full" onClick={() => { setShowPayment(false); navigate('/orders') }}>
                    {lang === 'ru' ? 'Открыть заказы' : 'Open orders'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
