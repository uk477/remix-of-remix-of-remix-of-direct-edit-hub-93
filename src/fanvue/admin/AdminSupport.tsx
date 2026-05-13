import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { useStore } from '../store'
import { useT } from '../i18n'
import { useTelegram } from '../hooks/useTelegram'
import { tgNotify } from '../utils/tgNotify'
import type { SupportMessage } from '../store/types'

interface ChatGroup {
  uid: number
  username: string
  full_name: string
  messages: SupportMessage[]
  last: SupportMessage
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminSupport() {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const messages = useStore((s) => s.supportMessages)
  const user = useStore((s) => s.user)
  const addMsg = useStore((s) => s.addSupportMessage)
  const updateBalance = useStore((s) => s.updateBalance)
  const orders = useStore((s) => s.orders)
  const setOrderStatus = useStore((s) => s.setOrderStatus)
  const { haptic } = useTelegram()

  const [openUid, setOpenUid] = useState<number | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [reply, setReply] = useState('')
  const [balanceInput, setBalanceInput] = useState('')
  const [balanceSent, setBalanceSent] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const realUid  = user?.uid  ?? 0
  const realName = user?.username ?? ''
  const realFull = user?.full_name ?? 'User'

  const groups: ChatGroup[] = messages.length > 0 ? [{
    uid: realUid,
    username: realName,
    full_name: realFull,
    messages,
    last: messages[messages.length - 1],
  }] : []

  useEffect(() => {
    if (openUid) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [openUid, messages])

  const send = () => {
    const trimmed = reply.trim()
    if (!trimmed) return
    haptic('success')
    addMsg({ id: Date.now(), sender: 'admin', text: trimmed, created: new Date().toISOString() })
    setReply('')
    tgNotify(
      `💬 Новое сообщение от поддержки\n\n${trimmed}\n\nОткройте приложение для ответа.`,
      openUid ?? undefined,
    )
  }

  const handleIssueBalance = () => {
    const amt = parseFloat(balanceInput)
    if (!amt || amt <= 0) return
    updateBalance(amt)
    haptic('success')
    setBalanceSent(true)
    setBalanceInput('')
    setTimeout(() => setBalanceSent(false), 2500)
  }

  const chatUser = groups.find((g) => g.uid === openUid)

  // Detect order ID from forwarded support messages
  const chatOrderId = (() => {
    for (const m of messages) {
      const match = m.text.match(/#([\w_]+)/)
      if (match) return match[1]
    }
    return null
  })()
  const chatOrder = chatOrderId ? orders.find((o) => o.id === chatOrderId) : null

  const handleMarkDelivered = () => {
    if (!chatOrder) return
    haptic('success')
    setOrderStatus(chatOrder.id, 'completed')
    const deliveryMsg = lang === 'ru'
      ? `✅ Заказ #${chatOrder.id} выдан!\n\nСпасибо за покупку в Fanvue Market 🙏\nЕсли возникнут вопросы — мы всегда на связи.`
      : `✅ Order #${chatOrder.id} delivered!\n\nThank you for shopping at Fanvue Market 🙏\nReach out anytime if you need help.`
    addMsg({ id: Date.now(), sender: 'admin', text: deliveryMsg, created: new Date().toISOString() })
    // notify the user in their Telegram
    const userUid = groups.find((g) => g.uid === openUid)?.uid
    const notifyText = `🎉 Ваш заказ выдан!\n\n📦 ${chatOrder.product_title ?? chatOrder.id}\n💵 $${chatOrder.amount.toFixed(2)}\n🆔 #${chatOrder.id}\n\nСпасибо за покупку в Fanvue Market! 🙏`
    tgNotify(notifyText, userUid)
  }

  return (
    <PageTransition>
      <div className="page" style={{ paddingBottom: 0 }}>
        <AnimatePresence mode="wait">

          {/* ── USER PROFILE VIEW ── */}
          {showProfile && openUid && (
            <motion.div key="profile"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="col gap-4"
            >
              <div className="row gap-3 mb-2">
                <button className="pg-back" onClick={() => setShowProfile(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                </button>
                <div className="t-md fw-black">{lang === 'ru' ? 'Профиль клиента' : 'Client Profile'}</div>
              </div>

              {/* Avatar + info */}
              <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'var(--g-brand)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, fontWeight: 900, margin: '0 auto 12px',
                }}>
                  {realFull[0]}
                </div>
                <div className="t-lg fw-black">{realFull}</div>
                <div className="t-xs t-muted mt-1">@{realName}</div>
                <div className="t-xs t-muted">ID: {realUid}</div>
              </div>

              {/* Stats */}
              {user && (
                <div className="grid-2 gap-3">
                  <div className="stat-card">
                    <div className="stat-value t-brand">${user.balance.toFixed(2)}</div>
                    <div className="stat-label">{lang === 'ru' ? 'Баланс' : 'Balance'}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value t-gold">${user.spent.toFixed(2)}</div>
                    <div className="stat-label">{lang === 'ru' ? 'Потрачено' : 'Spent'}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value t-cyan">{user.purchases}</div>
                    <div className="stat-label">{lang === 'ru' ? 'Покупок' : 'Purchases'}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{user.ref_count}</div>
                    <div className="stat-label">{lang === 'ru' ? 'Рефералов' : 'Referrals'}</div>
                  </div>
                </div>
              )}

              {/* Issue balance */}
              <div className="card" style={{ padding: '16px' }}>
                <div className="t-sm fw-bold mb-2">
                  💰 {lang === 'ru' ? 'Выдать баланс' : 'Issue Balance'}
                </div>
                <div className="row gap-2">
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    placeholder="$0.00"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <motion.button
                    className="btn btn-primary btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={handleIssueBalance}
                    disabled={!balanceInput || balanceSent}
                    whileTap={{ scale: 0.95 }}
                  >
                    {balanceSent ? '✓' : lang === 'ru' ? 'Зачислить' : 'Add'}
                  </motion.button>
                </div>
                <div className="t-xs t-muted mt-1">
                  {lang === 'ru' ? 'Зачисляется на основной баланс' : 'Added to main balance'}
                </div>
              </div>

              <motion.button className="btn btn-primary" onClick={() => { setShowProfile(false) }} whileTap={{ scale: 0.97 }}>
                {lang === 'ru' ? '← Назад в чат' : '← Back to chat'}
              </motion.button>
            </motion.div>
          )}

          {/* ── CHAT LIST ── */}
          {!showProfile && !openUid && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="section-title mb-3">{t('admin_chat_select')}</div>
              {groups.length === 0 ? (
                <div className="text-center t-muted" style={{ padding: 60 }}>
                  {lang === 'ru' ? 'Нет активных чатов' : 'No active chats'}
                </div>
              ) : (
                <div className="col gap-3">
                  {groups.map((g, i) => (
                    <motion.button
                      key={g.uid}
                      className="card"
                      style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
                      onClick={() => setOpenUid(g.uid)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--g-brand)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, flexShrink: 0,
                      }}>
                        {g.full_name[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="t-sm fw-bold">{g.full_name} <span className="t-muted">@{g.username}</span></div>
                        <div className="t-xs t-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {g.last.text}
                        </div>
                      </div>
                      <div className="t-xs t-muted">
                        {new Date(g.last.created).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── CHAT VIEW ── */}
          {!showProfile && openUid && chatUser && (
            <motion.div key="chat"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="col" style={{ minHeight: 'calc(100dvh - 70px - 48px - 32px)' }}
            >
              {/* Header */}
              <div className="row-between mb-3">
                <div className="row gap-3">
                  <button className="pg-back" onClick={() => setOpenUid(null)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  </button>
                  <div>
                    <div className="t-sm fw-bold">{chatUser.full_name}</div>
                    <div className="t-xs t-muted">@{chatUser.username} · ID: {chatUser.uid}</div>
                  </div>
                </div>
                <motion.button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, padding: '5px 10px' }}
                  onClick={() => setShowProfile(true)}
                  whileTap={{ scale: 0.95 }}
                >
                  👤 {lang === 'ru' ? 'Профиль' : 'Profile'}
                </motion.button>
              </div>

              {/* Order status bar */}
              {chatOrder && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: chatOrder.status === 'completed' ? 'rgba(0,201,141,0.1)' : 'rgba(255,165,0,0.1)',
                    border: `1px solid ${chatOrder.status === 'completed' ? 'rgba(0,201,141,0.3)' : 'rgba(255,165,0,0.3)'}`,
                    borderRadius: 12, padding: '10px 14px', marginBottom: 12,
                  }}
                >
                  <div className="row-between mb-2">
                    <div className="t-xs fw-bold" style={{ color: chatOrder.status === 'completed' ? 'var(--green)' : 'var(--orange)' }}>
                      📦 {chatOrder.product_title ?? 'Order'} · ${chatOrder.amount.toFixed(2)}
                    </div>
                    <span className={`badge badge-${chatOrder.status}`} style={{ fontSize: 9 }}>
                      {chatOrder.status}
                    </span>
                  </div>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    {(['paid', 'delivering', 'completed'] as const).map((s, i) => {
                      const labels: Record<string, string> = { paid: '✅ Оплачен', delivering: '📦 Выдаётся', completed: '🎉 Выдан' }
                      const active = (chatOrder.status === 'paid' && i <= 0) || (chatOrder.status === 'completed' && i <= 2)
                      return (
                        <div key={s} className="row gap-1" style={{ alignItems: 'center', flex: 1 }}>
                          {i > 0 && <div style={{ flex: 1, height: 2, background: active ? 'var(--green)' : 'var(--b-default)', borderRadius: 1 }} />}
                          <div className="t-xs" style={{ color: active ? 'var(--green)' : 'var(--t-muted)', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap', fontSize: 10 }}>
                            {labels[s]}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {chatOrder.status === 'paid' && (
                    <motion.button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', marginTop: 10, background: 'var(--g-success)', fontSize: 12 }}
                      onClick={handleMarkDelivered}
                      whileTap={{ scale: 0.97 }}
                    >
                      ✅ {lang === 'ru' ? 'Отметить как выдан + уведомить' : 'Mark as delivered + notify'}
                    </motion.button>
                  )}
                </motion.div>
              )}

              {/* Messages */}
              <div className="chat-list" style={{ flex: 1, paddingBottom: 16 }}>
                <AnimatePresence>
                  {messages.map((m, i) => {
                    const right = m.sender === 'admin'
                    return (
                      <motion.div
                        key={m.id}
                        className={`col ${right ? 'items-end' : ''}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i < 3 ? i * 0.04 : 0 }}
                      >
                        {!right && (
                          <div className="t-xs t-muted mb-1" style={{ paddingLeft: 4 }}>@{chatUser.username}</div>
                        )}
                        <div className={`bubble ${right ? 'bubble-user' : 'bubble-admin'}`}>{m.text}</div>
                        <div className={`bubble-time ${right ? 't-secondary' : 't-muted'}`}>
                          {formatDate(m.created)}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>

              {/* Reply */}
              <div className="chat-input-bar" style={{ position: 'sticky', marginTop: 'auto' }}>
                <textarea
                  className="input"
                  style={{ flex: 1, minHeight: 44, maxHeight: 100 }}
                  placeholder={t('admin_chat_reply') + '...'}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  rows={1}
                />
                <motion.button
                  className="btn btn-primary btn-icon"
                  style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, padding: 0 }}
                  onClick={send}
                  disabled={!reply.trim()}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
