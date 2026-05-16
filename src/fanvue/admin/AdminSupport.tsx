import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { useStore } from '../store'
import { useT } from '../i18n'
import { useTelegram } from '../hooks/useTelegram'
import { tgNotify } from '../utils/tgNotify'
import type { SupportMessage, SupportTicket } from '../store/types'

interface ChatGroup {
  uid: number
  username: string
  full_name: string
  photo_url?: string
  messages: SupportMessage[]
  last: SupportMessage
  unread: number
  activeTicket?: SupportTicket
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const C = {
  bg: 'var(--bg)',
  surface: '#161618',
  surfaceHi: '#1d1d20',
  line: 'rgba(255,255,255,0.06)',
  text: '#f4f4f5',
  muted: 'rgba(255,255,255,0.45)',
  brand: '#3dff66',
  red: '#ff4d4f',
  amber: '#ffb020',
}

export default function AdminSupport() {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const messages = useStore((s) => s.supportMessages)
  const tickets = useStore((s) => s.supportTickets)
  const presence = useStore((s) => s.adminPresence)
  const userTyping = useStore((s) => s.userTyping)
  const user = useStore((s) => s.user)
  const addMsg = useStore((s) => s.addSupportMessage)
  const updateMsg = useStore((s) => s.updateSupportMessage)
  const deleteMsg = useStore((s) => s.deleteSupportMessage)
  const markRead = useStore((s) => s.markUserMessagesReadByAdmin)
  const setAdminPresence = useStore((s) => s.setAdminPresence)
  const closeTicket = useStore((s) => s.closeSupportTicket)
  const updateBalance = useStore((s) => s.updateBalance)
  const orders = useStore((s) => s.orders)
  const setOrderStatus = useStore((s) => s.setOrderStatus)
  const { haptic } = useTelegram()

  const [openUid, setOpenUid] = useState<number | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [reply, setReply] = useState('')
  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null)
  const [actionMsg, setActionMsg] = useState<SupportMessage | null>(null)
  const [balanceInput, setBalanceInput] = useState('')
  const [balanceSent, setBalanceSent] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const realUid  = user?.uid  ?? 0
  const realName = user?.username ?? ''
  const realFull = user?.full_name ?? 'User'
  const realPhoto = user?.photo_url

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.kind !== 'system' || m.text.startsWith('ticket_')),
    [messages],
  )

  const lastMsg = visibleMessages[visibleMessages.length - 1]
  const unreadCount = messages.filter((m) => m.sender === 'user' && !m.read_by_admin).length
  const activeTicket = tickets.find((t) => t.status !== 'closed')

  const groups: ChatGroup[] = messages.length > 0 && lastMsg ? [{
    uid: realUid,
    username: realName,
    full_name: realFull,
    photo_url: realPhoto,
    messages,
    last: lastMsg,
    unread: unreadCount,
    activeTicket,
  }] : []

  // Mark client messages read when opening chat
  useEffect(() => {
    if (openUid && unreadCount > 0) {
      const id = setTimeout(() => markRead(), 300)
      return () => clearTimeout(id)
    }
  }, [openUid, unreadCount, markRead])

  useEffect(() => {
    if (openUid) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [openUid, messages.length])

  // Close action sheet on outside tap
  useEffect(() => {
    if (!actionMsg) return
    const close = () => setActionMsg(null)
    const id = setTimeout(() => document.addEventListener('click', close, { once: true }), 0)
    return () => { clearTimeout(id); document.removeEventListener('click', close) }
  }, [actionMsg])

  const send = () => {
    const trimmed = reply.trim()
    if (!trimmed) return
    haptic('success')
    addMsg({
      id: Date.now(),
      sender: 'admin',
      kind: 'text',
      text: trimmed,
      created: new Date().toISOString(),
      reply_to: replyTo?.id,
      ticket_id: activeTicket?.id,
    })
    setReply('')
    setReplyTo(null)
    tgNotify(`💬 Поддержка Fanvue\n\n${trimmed}\n\nОткройте приложение для ответа.`, openUid ?? undefined)
  }

  const handleDelete = (m: SupportMessage, mode: 'user' | 'all') => {
    haptic('light')
    deleteMsg(m.id, mode)
    setActionMsg(null)
  }

  const handleReply = (m: SupportMessage) => {
    setReplyTo(m)
    setActionMsg(null)
  }

  const handleCloseTicket = () => {
    if (!activeTicket) return
    haptic('success')
    closeTicket(activeTicket.id, 'admin')
    setConfirmClose(false)
    tgNotify(
      lang === 'ru'
        ? `✅ Обращение ${activeTicket.id} закрыто. Если нужна помощь — напишите снова.`
        : `✅ Ticket ${activeTicket.id} closed. Reach out anytime if you need more help.`,
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
      ? `✅ Заказ #${chatOrder.id} выдан!\n\nСпасибо за покупку в Fanvue Market 🙏`
      : `✅ Order #${chatOrder.id} delivered!\n\nThank you for shopping at Fanvue Market 🙏`
    addMsg({ id: Date.now(), sender: 'admin', kind: 'text', text: deliveryMsg, created: new Date().toISOString() })
    tgNotify(`🎉 Ваш заказ выдан!\n\n📦 ${chatOrder.product_title ?? chatOrder.id}\n💵 $${chatOrder.amount.toFixed(2)}\n🆔 #${chatOrder.id}`, openUid ?? undefined)
  }

  const Avatar = ({ size = 40, photo, name }: { size?: number; photo?: string; name: string }) => (
    photo ? (
      <img src={photo} alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    ) : (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg,#3dff66,#28a745)', color: '#0a0a0b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 800, flexShrink: 0, letterSpacing: -0.5,
      }}>{name[0]?.toUpperCase()}</div>
    )
  )

  return (
    <PageTransition>
      <div className="page" style={{ paddingBottom: 0 }}>
        <AnimatePresence mode="wait">

          {/* ── USER PROFILE ── */}
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

              <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <Avatar size={72} photo={realPhoto} name={realFull} />
                </div>
                <div className="t-lg fw-black">{realFull}</div>
                {realName && <div className="t-xs t-muted mt-1">@{realName}</div>}
                <div className="t-xs t-muted">ID: {realUid}</div>
                {user?.lang && <div className="t-xs t-muted">lang: {user.lang}</div>}
              </div>

              {user && (
                <div className="grid-2 gap-3">
                  <div className="stat-card"><div className="stat-value t-brand">${user.balance.toFixed(2)}</div><div className="stat-label">{lang === 'ru' ? 'Баланс' : 'Balance'}</div></div>
                  <div className="stat-card"><div className="stat-value t-gold">${user.spent.toFixed(2)}</div><div className="stat-label">{lang === 'ru' ? 'Потрачено' : 'Spent'}</div></div>
                  <div className="stat-card"><div className="stat-value t-cyan">{user.purchases}</div><div className="stat-label">{lang === 'ru' ? 'Покупок' : 'Purchases'}</div></div>
                  <div className="stat-card"><div className="stat-value">{user.ref_count}</div><div className="stat-label">{lang === 'ru' ? 'Рефералов' : 'Referrals'}</div></div>
                </div>
              )}

              <div className="card" style={{ padding: '16px' }}>
                <div className="t-sm fw-bold mb-2">💰 {lang === 'ru' ? 'Выдать баланс' : 'Issue Balance'}</div>
                <div className="row gap-2">
                  <input className="input" type="number" inputMode="decimal" placeholder="$0.00"
                    value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)} style={{ flex: 1 }} />
                  <motion.button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}
                    onClick={handleIssueBalance} disabled={!balanceInput || balanceSent} whileTap={{ scale: 0.95 }}>
                    {balanceSent ? '✓' : lang === 'ru' ? 'Зачислить' : 'Add'}
                  </motion.button>
                </div>
              </div>

              {tickets.length > 0 && (
                <div className="card" style={{ padding: '14px' }}>
                  <div className="t-sm fw-bold mb-2">{lang === 'ru' ? 'История обращений' : 'Tickets'}</div>
                  <div className="col gap-2">
                    {tickets.slice(0, 8).map((tk) => (
                      <div key={tk.id} className="row-between" style={{ padding: '8px 10px', background: C.surfaceHi, borderRadius: 10 }}>
                        <div className="col">
                          <div className="t-xs fw-bold">{tk.id} · {tk.category}</div>
                          <div className="t-xs t-muted">{formatDate(tk.opened)}</div>
                        </div>
                        <span className="badge" style={{
                          fontSize: 10,
                          background: tk.status === 'closed' ? 'rgba(255,255,255,0.06)' : 'rgba(61,255,102,0.15)',
                          color: tk.status === 'closed' ? C.muted : C.brand,
                        }}>{tk.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <motion.button className="btn btn-primary" onClick={() => setShowProfile(false)} whileTap={{ scale: 0.97 }}>
                {lang === 'ru' ? '← Назад в чат' : '← Back to chat'}
              </motion.button>
            </motion.div>
          )}

          {/* ── CHAT LIST ── */}
          {!showProfile && !openUid && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="row-between mb-3">
                <div className="section-title">{t('admin_chat_select')}</div>
                <button
                  onClick={() => { setAdminPresence({ online: !presence.online, lastSeen: new Date().toISOString() }); haptic('light') }}
                  className="row gap-2"
                  style={{
                    padding: '6px 10px', borderRadius: 999, background: C.surface,
                    border: `1px solid ${C.line}`, fontSize: 11, color: C.text,
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: presence.online ? C.brand : C.muted,
                    boxShadow: presence.online ? `0 0 8px ${C.brand}` : 'none',
                  }} />
                  {presence.online ? (lang === 'ru' ? 'онлайн' : 'online') : (lang === 'ru' ? 'офлайн' : 'offline')}
                </button>
              </div>

              {groups.length === 0 ? (
                <div className="text-center t-muted" style={{ padding: 60 }}>
                  {lang === 'ru' ? 'Нет активных чатов' : 'No active chats'}
                </div>
              ) : (
                <div className="col gap-2">
                  {groups.map((g, i) => (
                    <motion.button
                      key={g.uid}
                      className="card"
                      style={{
                        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                        border: g.unread > 0 ? `1px solid ${C.brand}40` : `1px solid ${C.line}`,
                      }}
                      onClick={() => setOpenUid(g.uid)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Avatar size={44} photo={g.photo_url} name={g.full_name} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row-between">
                          <div className="t-sm fw-bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {g.full_name}
                          </div>
                          <div className="t-xs t-muted" style={{ flexShrink: 0, marginLeft: 8 }}>{formatTime(g.last.created)}</div>
                        </div>
                        <div className="row-between" style={{ marginTop: 2 }}>
                          <div className="t-xs t-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {g.last.sender === 'admin' ? '✓ ' : ''}{g.last.deleted_for === 'all' ? '⌀ message deleted' : g.last.text || '📎 attachment'}
                          </div>
                          {g.unread > 0 && (
                            <span style={{
                              minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10,
                              background: C.brand, color: '#0a0a0b', fontSize: 11, fontWeight: 800,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6,
                            }}>{g.unread}</span>
                          )}
                        </div>
                        {g.activeTicket && (
                          <div className="t-xs" style={{ color: C.brand, marginTop: 4, fontWeight: 700 }}>
                            ● {g.activeTicket.id} · {g.activeTicket.category}
                          </div>
                        )}
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
              className="col" style={{ height: 'calc(100dvh - 70px - 48px - 32px)', minHeight: 0 }}
            >
              {/* Header */}
              <div className="row-between mb-3" style={{ paddingBottom: 10, borderBottom: `1px solid ${C.line}` }}>
                <div className="row gap-3" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <button className="pg-back" onClick={() => setOpenUid(null)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  </button>
                  <button onClick={() => setShowProfile(true)} className="row gap-2" style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <Avatar size={36} photo={chatUser.photo_url} name={chatUser.full_name} />
                    <div style={{ minWidth: 0 }}>
                      <div className="t-sm fw-bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chatUser.full_name}
                      </div>
                      <div className="t-xs t-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {userTyping ? (lang === 'ru' ? 'печатает…' : 'typing…') : (chatUser.username ? '@' + chatUser.username : 'ID ' + chatUser.uid)}
                      </div>
                    </div>
                  </button>
                </div>
                {activeTicket && (
                  <button
                    onClick={() => { haptic('light'); setConfirmClose(true) }}
                    style={{
                      padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: 'rgba(255,77,79,0.1)', color: C.red, border: `1px solid ${C.red}30`,
                    }}
                  >
                    {lang === 'ru' ? 'Закрыть' : 'Close'} · {activeTicket.id}
                  </button>
                )}
              </div>

              {/* Order status bar */}
              {chatOrder && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
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
                    <span className={`badge badge-${chatOrder.status}`} style={{ fontSize: 9 }}>{chatOrder.status}</span>
                  </div>
                  {chatOrder.status === 'paid' && (
                    <motion.button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', marginTop: 6, background: 'var(--g-success)', fontSize: 12 }}
                      onClick={handleMarkDelivered} whileTap={{ scale: 0.97 }}
                    >
                      ✅ {lang === 'ru' ? 'Отметить как выдан' : 'Mark delivered'}
                    </motion.button>
                  )}
                </motion.div>
              )}

              {/* Messages */}
              <div ref={listRef} className="chat-list" style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 16 }}>
                <AnimatePresence initial={false}>
                  {visibleMessages.map((m, i) => {
                    const right = m.sender === 'admin'
                    const isSystem = m.kind === 'system'
                    const deletedForUser = m.deleted_for === 'user'
                    const replyMsg = m.reply_to ? messages.find((x) => x.id === m.reply_to) : null
                    const prev = visibleMessages[i - 1]
                    const next = visibleMessages[i + 1]
                    const isLast = !next || next.sender !== m.sender
                    const isFirst = !prev || prev.sender !== m.sender

                    if (isSystem) {
                      const [type, id, reason] = m.text.split(':')
                      const tk = tickets.find((x) => x.id === id)
                      let label = ''
                      if (type === 'ticket_opened') {
                        const cat = tk?.category ?? ''
                        const sum = tk?.summary
                        label = lang === 'ru'
                          ? `Открыто ${id}${cat ? ' · ' + cat : ''}${sum ? ' · ' + sum : ''}`
                          : `Opened ${id}${cat ? ' · ' + cat : ''}${sum ? ' · ' + sum : ''}`
                      } else {
                        label = lang === 'ru'
                          ? `Закрыто ${id}${reason ? ' · ' + reason : ''}`
                          : `Closed ${id}${reason ? ' · ' + reason : ''}`
                      }
                      const accent = type === 'ticket_opened'
                      return (
                        <motion.div key={m.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="row" style={{ justifyContent: 'center', margin: '12px 0' }}
                        >
                          <div style={{
                            fontSize: 11, color: accent ? C.brand : C.muted, padding: '4px 10px',
                            background: C.surface, borderRadius: 999,
                            border: `1px solid ${accent ? C.brand + '40' : C.line}`,
                            fontWeight: accent ? 700 : 400,
                          }}>{label}</div>
                        </motion.div>
                      )
                    }

                    return (
                      <motion.div
                        key={m.id}
                        className={`col ${right ? 'items-end' : ''}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ marginTop: isFirst ? 8 : 2 }}
                      >
                        <div
                          onClick={(e) => { e.stopPropagation(); setActionMsg(m) }}
                          style={{
                            position: 'relative', maxWidth: '78%',
                            padding: '8px 12px',
                            borderRadius: right
                              ? (isLast ? '18px 18px 4px 18px' : '18px 18px 18px 18px')
                              : (isLast ? '18px 18px 18px 4px' : '18px 18px 18px 18px'),
                            background: right
                              ? 'linear-gradient(180deg,#3dff66,#28e052)'
                              : C.surfaceHi,
                            color: right ? '#0a0a0b' : C.text,
                            opacity: deletedForUser ? 0.5 : 1,
                            border: deletedForUser ? `1px dashed ${C.muted}` : 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {replyMsg && (
                            <div style={{
                              borderLeft: `2px solid ${right ? '#0a0a0b80' : C.brand}`,
                              padding: '2px 8px', marginBottom: 6,
                              fontSize: 11, opacity: 0.75,
                              background: right ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)',
                              borderRadius: 6,
                            }}>
                              <div style={{ fontWeight: 700, fontSize: 10 }}>
                                {replyMsg.sender === 'admin' ? 'Fanvue Care' : chatUser.full_name}
                              </div>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {replyMsg.deleted_for ? '⌀ deleted' : replyMsg.text || '📎'}
                              </div>
                            </div>
                          )}
                          {deletedForUser && (
                            <div style={{ fontSize: 10, fontStyle: 'italic', marginBottom: 4, color: C.muted }}>
                              {lang === 'ru' ? '⌀ удалено пользователем · видно только админу' : '⌀ deleted by user · admin-only'}
                            </div>
                          )}
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="col gap-1" style={{ marginBottom: m.text ? 6 : 0 }}>
                              {m.attachments.map((a) => (
                                a.mime.startsWith('image/') ? (
                                  <img key={a.id} src={a.dataUrl} alt={a.name}
                                    style={{ maxWidth: 220, borderRadius: 10, display: 'block' }} />
                                ) : (
                                  <a key={a.id} href={a.dataUrl} download={a.name}
                                    style={{ fontSize: 12, textDecoration: 'underline', color: 'inherit' }}>
                                    📎 {a.name}
                                  </a>
                                )
                              ))}
                            </div>
                          )}
                          {m.text && (
                            <div style={{ fontSize: 14, lineHeight: 1.35, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {m.text}
                            </div>
                          )}
                          <div className="row gap-1" style={{
                            justifyContent: 'flex-end', marginTop: 2,
                            fontSize: 10, opacity: 0.6,
                          }}>
                            <span>{formatTime(m.created)}</span>
                            {right && (
                              <span>{m.read_by_user ? '✓✓' : '✓'}</span>
                            )}
                          </div>

                          {/* Action sheet */}
                          <AnimatePresence>
                            {actionMsg?.id === m.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'absolute', top: '100%', marginTop: 6,
                                  [right ? 'right' : 'left']: 0,
                                  background: C.surface, border: `1px solid ${C.line}`,
                                  borderRadius: 12, padding: 4, zIndex: 10,
                                  display: 'flex', flexDirection: 'column', minWidth: 160,
                                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                                }}
                              >
                                <button onClick={() => handleReply(m)} style={actionBtn}>
                                  ↩ {lang === 'ru' ? 'Ответить' : 'Reply'}
                                </button>
                                {right && (
                                  <button
                                    onClick={() => { navigator.clipboard?.writeText(m.text); setActionMsg(null); haptic('light') }}
                                    style={actionBtn}
                                  >
                                    ⎘ {lang === 'ru' ? 'Копировать' : 'Copy'}
                                  </button>
                                )}
                                <button onClick={() => handleDelete(m, 'all')} style={{ ...actionBtn, color: C.red }}>
                                  🗑 {lang === 'ru' ? 'Удалить у всех' : 'Delete for all'}
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                {userTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col items-start" style={{ marginTop: 6 }}>
                    <div style={{
                      padding: '10px 14px', background: C.surfaceHi, borderRadius: '18px 18px 18px 4px',
                      display: 'flex', gap: 4,
                    }}>
                      {[0, 1, 2].map((i) => (
                        <motion.span key={i}
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                          style={{ width: 6, height: 6, borderRadius: '50%', background: C.muted, display: 'inline-block' }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply preview */}
              {replyTo && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  style={{
                    background: C.surface, borderTop: `1px solid ${C.line}`,
                    padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'center',
                  }}
                >
                  <div style={{ width: 3, height: 32, background: C.brand, borderRadius: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-xs fw-bold" style={{ color: C.brand }}>
                      ↩ {replyTo.sender === 'admin' ? 'Fanvue Care' : chatUser.full_name}
                    </div>
                    <div className="t-xs t-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {replyTo.text || '📎 attachment'}
                    </div>
                  </div>
                  <button onClick={() => setReplyTo(null)} style={{ padding: 4, color: C.muted }}>✕</button>
                </motion.div>
              )}

              {/* Reply bar */}
              <div className="chat-input-bar" style={{ position: 'sticky', marginTop: 'auto', gap: 8 }}>
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
                  style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, padding: 0 }}
                  onClick={send} disabled={!reply.trim()} whileTap={{ scale: 0.9 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Confirm close ticket modal */}
        <AnimatePresence>
          {confirmClose && activeTicket && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmClose(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: 24,
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: C.surface, border: `1px solid ${C.line}`,
                  borderRadius: 20, padding: 24, maxWidth: 320, width: '100%',
                }}
              >
                <div className="t-md fw-black mb-2">
                  {lang === 'ru' ? 'Закрыть обращение?' : 'Close ticket?'}
                </div>
                <div className="t-sm t-muted mb-4">
                  {lang === 'ru'
                    ? `${activeTicket.id} будет помечено как решённое. Пользователь увидит стартовое меню при следующем заходе. История чата сохранится.`
                    : `${activeTicket.id} will be marked resolved. User will see the welcome menu next visit. Chat history is preserved.`}
                </div>
                <div className="row gap-2">
                  <button onClick={() => setConfirmClose(false)}
                    className="btn btn-ghost" style={{ flex: 1 }}>
                    {lang === 'ru' ? 'Отмена' : 'Cancel'}
                  </button>
                  <button onClick={handleCloseTicket}
                    className="btn btn-primary" style={{ flex: 1, background: C.red, borderColor: C.red }}>
                    {lang === 'ru' ? 'Закрыть' : 'Close'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}

const actionBtn: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left',
  background: 'transparent', color: C.text,
  fontSize: 13, borderRadius: 8,
}
