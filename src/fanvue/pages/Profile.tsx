import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import ReferralCard from '../components/ReferralCard'
import { useStore } from '../store'

/**
 * VAULT — Identity / Profile
 * Editorial passport: identity → balance → stats → referral → menu.
 */
export default function Profile() {
  const navigate = useNavigate()
  const lang = useStore((s) => s.lang)
  const user = useStore((s) => s.user)
  const orders = useStore((s) => s.orders)
  const supportUnread = useStore((s) => s.supportUnread)

  if (!user) return null

  const initials = user.full_name
    .split(' ')
    .map((p) => p[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('') || 'V'

  const memberSince = new Date(user.created).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', year: 'numeric' })
  const memberId = String(user.uid).padStart(6, '0')
  const purchases = orders.filter((o) => o.kind === 'buy' && (o.status === 'completed' || o.status === 'paid')).length

  const menu = [
    {
      key: 'deposit',
      label: lang === 'ru' ? 'Пополнить' : 'Top up',
      sub:   lang === 'ru' ? 'Внести в хранилище' : 'Add to the vault',
      onClick: () => navigate('/deposit'),
      glyph: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      ),
    },
    {
      key: 'support',
      label: lang === 'ru' ? 'Поддержка' : 'Concierge',
      sub:   lang === 'ru' ? 'Связаться с командой' : 'Speak to the team',
      badge: supportUnread,
      onClick: () => navigate('/support'),
      glyph: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      ),
    },
    {
      key: 'settings',
      label: lang === 'ru' ? 'Настройки' : 'Preferences',
      sub:   lang === 'ru' ? 'Язык и уведомления' : 'Language & alerts',
      onClick: () => navigate('/settings'),
      glyph: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      ),
    },
  ]

  // Whole dollars + cents split for cinematic balance
  const [whole, cents] = user.balance.toFixed(2).split('.')

  return (
    <PageTransition>
      <div className="vault-page">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="vault-eyebrow">
            <span className="ix">№</span>{memberId} · {lang === 'ru' ? 'участник с' : 'member since'} {memberSince}
          </div>

          <div className="vault-identity" style={{ marginTop: 14 }}>
            <div className="avatar">
              {user.photo_url ? <img src={user.photo_url} alt="" /> : initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="name">{user.full_name}</div>
              {user.username && (
                <div className="mono">@{user.username}</div>
              )}
            </div>
          </div>
        </motion.div>

        {/* BALANCE */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="vault-balance"
          style={{ marginTop: 22 }}
        >
          <div className="lbl">{lang === 'ru' ? 'Баланс хранилища' : 'Vault balance'}</div>
          <div className="amt">
            <span style={{ color: 'var(--brass)' }}>$</span>{whole}<span className="cents">.{cents}</span>
          </div>
          {user.ref_balance > 0 && (
            <div style={{
              marginTop: 14, paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)', fontSize: 10.5,
              letterSpacing: '0.22em', textTransform: 'uppercase',
            }}>
              <span style={{ color: 'var(--t-muted)' }}>
                {lang === 'ru' ? 'Реферальный' : 'Referral'}
              </span>
              <span style={{ color: 'var(--brass)' }}>${user.ref_balance.toFixed(2)}</span>
            </div>
          )}

          <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
            <motion.button
              className="vault-cta"
              style={{ flex: 1, height: 48, fontSize: 11 }}
              onClick={() => navigate('/deposit')}
              whileTap={{ scale: 0.98 }}
            >
              + {lang === 'ru' ? 'Пополнить' : 'Top up'}
            </motion.button>
            <motion.button
              className="vault-cta-ghost"
              style={{ flex: 1, height: 48, fontSize: 11 }}
              onClick={() => navigate('/orders')}
              whileTap={{ scale: 0.98 }}
            >
              {lang === 'ru' ? 'Журнал' : 'Ledger'}
            </motion.button>
          </div>
        </motion.div>

        <div className="vault-stats">
          <div className="vault-stat">
            <div className="k">{lang === 'ru' ? 'Сделок' : 'Acquisitions'}</div>
            <div className="v">{purchases}</div>
          </div>
          <div className="vault-stat">
            <div className="k">{lang === 'ru' ? 'Потрачено' : 'Settled'}</div>
            <div className="v">${user.spent.toFixed(0)}</div>
          </div>
        </div>

        {/* REFERRAL */}
        <div className="vault-section">
          <div className="vault-section-h">{lang === 'ru' ? 'Приглашения' : 'Invitations'}</div>
          <ReferralCard />
        </div>

        {/* MENU */}
        <div className="vault-section">
          <div className="vault-section-h">{lang === 'ru' ? 'Меню' : 'Menu'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {menu.map((m) => (
              <motion.button
                key={m.key}
                className="vault-row"
                onClick={m.onClick}
                whileTap={{ scale: 0.99 }}
                style={{ width: '100%', textAlign: 'left' }}
              >
                <div className="glyph">{m.glyph}</div>
                <div className="body">
                  <div className="ttl">{m.label}</div>
                  <div className="meta">{m.sub}</div>
                </div>
                <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {m.badge && m.badge > 0 && (
                    <span style={{
                      width: 8, height: 8, borderRadius: 999,
                      background: 'var(--brass-hot)',
                      boxShadow: '0 0 10px var(--brass)',
                    }} />
                  )}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3.5 8.5 7 5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t-muted)' }}/>
                  </svg>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {useStore.getState().isAdmin() && (
          <div className="vault-section">
            <motion.button
              className="vault-cta-ghost"
              onClick={() => navigate('/admin')}
              whileTap={{ scale: 0.98 }}
            >
              {lang === 'ru' ? 'Админ-панель' : 'Admin Console'}
            </motion.button>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
