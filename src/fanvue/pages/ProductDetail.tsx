import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { NetworkPicker, PayPanel } from './Deposit'
import Confetti from '../components/Confetti'
import DeliveryBlock, { ManualDeliveryBlock } from '../components/DeliveryBlock'
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
      id: generateOrderId('buy'),
      orderNum: buyCount,
      kind: 'buy',
      product_title: title,
      amount: total,
      status: 'paid',
      quantity: qty,
      created: new Date().toISOString(),
      paid_at: new Date().toISOString(),
    })
    updateBalance(-total)
    toast.show(lang === 'ru' ? 'Заказ оплачен.' : 'Order paid.', 'success')
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
    const orderId = remote?.id ?? generateOrderId('buy')
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

  const titleWords = title.split(/\s+/).filter(Boolean)
  const tickerItems = [
    deliveryLabel,
    lang === 'ru' ? 'ГОТОВ К ВЫДАЧЕ' : 'READY TO SHIP',
    lang === 'ru' ? 'ОПЛАТА КРИПТО / БАЛАНС' : 'CRYPTO / BALANCE',
    lang === 'ru' ? 'TELEGRAM ЧЕК' : 'TELEGRAM RECEIPT',
    lang === 'ru' ? 'ANTI-FRAUD' : 'ANTI-FRAUD',
  ]

  return (
    <PageTransition>
      <main className="pdb-shell">
        <div className="pdb-grid" aria-hidden />
        <div className="pdb-grain" aria-hidden />

        <header className="pdb-bar">
          <motion.button
            className="pdb-back"
            type="button"
            onClick={() => {
              haptic('light')
              navigate('/')
            }}
            aria-label="Back"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            whileTap={{ scale: 0.94 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter" />
            </svg>
            <span>{lang === 'ru' ? 'НАЗАД' : 'BACK'}</span>
          </motion.button>
          <div className="pdb-bar-meta">
            <span className="pdb-bar-idx">№ {String(product.id).padStart(3, '0')}</span>
            <span className={`pdb-bar-dot${lowStock ? ' is-low' : ''}`}>
              <i /> {product.stock} {lang === 'ru' ? 'ШТ' : 'PCS'}
            </span>
          </div>
        </header>

        <div className="pdb-ticker" aria-hidden>
          <div className="pdb-ticker-track">
            {[...tickerItems, ...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i}>
                {t}
                <em>◆</em>
              </span>
            ))}
          </div>
        </div>

        <section className="pdb-hero">
          <motion.div
            className="pdb-cat"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
          >
            <span className="pdb-cat-line" />
            <span className="pdb-cat-name">{categoryName}</span>
            <span className="pdb-cat-meta">/ {deliveryLabel}</span>
          </motion.div>

          <h1 className="pdb-title">
            {titleWords.map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                className={`pdb-title-w${i === 0 ? ' is-fill' : ' is-stroke'}`}
                initial={{ opacity: 0, y: 36, skewY: 4 }}
                animate={{ opacity: 1, y: 0, skewY: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.09 }}
              >
                {word}
              </motion.span>
            ))}
            <motion.span
              className="pdb-title-cursor"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: 0.6 }}
            />
          </h1>

          <motion.p
            className="pdb-desc"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.45 }}
          >
            <span className="pdb-desc-rule" aria-hidden />
            {desc}
          </motion.p>

          <motion.div
            className="pdb-price"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.55 }}
          >
            <div className="pdb-price-label">
              <span>{lang === 'ru' ? 'К ОПЛАТЕ' : 'TOTAL'}</span>
              <em>USD</em>
            </div>
            <div className="pdb-price-figure">
              <motion.span
                key={total.toFixed(2)}
                initial={{ y: 14, opacity: 0, filter: 'blur(8px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.42, ease: EASE }}
              >
                ${total.toFixed(2)}
              </motion.span>
              <AnimatePresence>
                {discountPct > 0 && (
                  <motion.div
                    key={discountPct}
                    className="pdb-price-save"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                  >
                    <s>${originalTotal.toFixed(2)}</s>
                    <em>−{discountPct}%</em>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </section>

        <section className="pdb-section">
          <div className="pdb-section-head">
            <span className="pdb-section-num">02</span>
            <span className="pdb-section-bar" />
            <span className="pdb-section-name">{lang === 'ru' ? 'КОЛИЧЕСТВО' : 'QUANTITY'}</span>
            <span className="pdb-section-tail">{qty} × ${product.price.toFixed(0)}</span>
          </div>

          <div className="pdb-stepper">
            <button
              onClick={() => { haptic('light'); setQty((q) => Math.max(1, q - 1)) }}
              disabled={qty <= 1}
              aria-label="Decrease"
              className="pdb-step pdb-step--minus"
            >
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" /></svg>
            </button>
            <div className="pdb-step-value">
              <AnimatePresence mode="popLayout">
                <motion.b
                  key={qty}
                  initial={{ y: 18, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -18, opacity: 0 }}
                  transition={{ duration: 0.22, ease: EASE }}
                >
                  {qty}
                </motion.b>
              </AnimatePresence>
              <span>{lang === 'ru' ? 'ШТ.' : 'PCS'}</span>
            </div>
            <button
              onClick={() => { haptic('light'); setQty((q) => Math.min(product.stock, q + 1)) }}
              disabled={qty >= product.stock}
              aria-label="Increase"
              className="pdb-step pdb-step--plus"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" />
              </svg>
            </button>
          </div>

          <div className="pdb-tiers">
            {TIERS.map((tier, idx) => {
              const active = qty >= tier.min
              return (
                <motion.button
                  key={tier.min}
                  className={`pdb-tier${active ? ' is-on' : ''}`}
                  onClick={() => { haptic('light'); setQty(Math.min(product.stock, tier.min)) }}
                  whileTap={{ scale: 0.96 }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.1 + idx * 0.06 }}
                >
                  <span className="pdb-tier-min">{tier.min}+ {lang === 'ru' ? 'ШТ' : 'PCS'}</span>
                  <strong className="pdb-tier-pct">−{tier.pct}<i>%</i></strong>
                  <span className="pdb-tier-mark" aria-hidden>{active ? '●' : '○'}</span>
                </motion.button>
              )
            })}
          </div>
        </section>

        {similar.length > 0 && (
          <section className="pdb-section pdb-section--similar">
            <div className="pdb-section-head">
              <span className="pdb-section-num">03</span>
              <span className="pdb-section-bar" />
              <span className="pdb-section-name">{lang === 'ru' ? 'РЯДОМ' : 'NEARBY'}</span>
            </div>
            <div className="pdb-sim">
              {similar.map((item, i) => (
                <motion.button
                  key={item.id}
                  className="pdb-sim-row"
                  onClick={() => navigate(`/product/${item.id}`)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.05 + i * 0.05 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="pdb-sim-idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="pdb-sim-name">{lang === 'ru' ? item.title : item.title_en}</span>
                  <strong className="pdb-sim-price">${item.price.toFixed(0)}</strong>
                  <svg className="pdb-sim-arr" width="14" height="14" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter" /></svg>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        <div className="pdb-cta-spacer" aria-hidden />

        <motion.div
          className="pdb-dock"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.25 }}
        >
          <motion.button
            className="pdb-cta"
            disabled={isOut}
            whileTap={{ scale: 0.985 }}
            onClick={() => {
              if (isOut) return
              haptic('medium')
              setShowPayment(true)
            }}
          >
            <span className="pdb-cta-bg" aria-hidden />
            <span className="pdb-cta-edge" aria-hidden />
            <span className="pdb-cta-l">
              <span className="pdb-cta-label">
                {isOut ? (lang === 'ru' ? 'НЕТ В НАЛИЧИИ' : 'SOLD OUT') : (lang === 'ru' ? 'ОФОРМИТЬ' : 'CHECKOUT')}
              </span>
              {!isOut && <span className="pdb-cta-sub">{lang === 'ru' ? 'мгновенная выдача' : 'instant delivery'}</span>}
            </span>
            {!isOut && (
              <span className="pdb-cta-r">
                <span className="pdb-cta-amount">${total.toFixed(2)}</span>
                <span className="pdb-cta-arrow" aria-hidden>
                  <svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="square" strokeLinejoin="miter" /></svg>
                </span>
              </span>
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

              {payStep === 'success' && (() => {
                const lastOrder = orders[0]
                const delivered = lastOrder?.kind === 'buy' && lastOrder?.deliveryData
                return (
                  <div className="fv-success" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {!delivered && <Confetti trigger={true} />}
                    <div className="fv-success-mark">✓</div>
                    <span className="fv-section-kicker">{lang === 'ru' ? 'Готово' : 'Done'}</span>
                    <h2 style={{ margin: 0 }}>
                      {delivered
                        ? (lang === 'ru' ? 'Заказ выдан' : 'Order delivered')
                        : (lang === 'ru' ? 'Заказ создан' : 'Order created')}
                    </h2>

                    {delivered && lastOrder?.deliveryData ? (
                      <DeliveryBlock data={lastOrder.deliveryData} />
                    ) : (
                      <ManualDeliveryBlock orderId={lastOrder?.id ?? pendingOrder?.id ?? '—'} />
                    )}

                    <button className="fv-primary fv-full" onClick={() => { setShowPayment(false); navigate('/orders') }}>
                      {lang === 'ru' ? 'Открыть заказы' : 'Open orders'}
                    </button>
                  </div>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
