import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import RefWithdrawSheet from '../components/RefWithdrawSheet'
import ReferralList from '../components/ReferralList'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { useToast } from '../components/Toast'
import { CONFIG } from '../config'

const GREEN = '#39FF63'
const INK = '#0a0a0c'

const card: CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 20,
  padding: 18,
}

const primaryBtn: CSSProperties = {
  background: GREEN,
  color: INK,
  fontWeight: 700,
  fontSize: 14,
  padding: '12px 16px',
  borderRadius: 12,
  width: '100%',
  textAlign: 'center',
}

const ghostBtn: CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.4)',
  fontWeight: 700,
  fontSize: 12,
  padding: '8px 14px',
  borderRadius: 10,
}

const labelCss: CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.4)',
  fontWeight: 600,
}

export default function Profile() {
  const navigate = useNavigate()
  const lang = useStore((s) => s.lang) as 'ru' | 'en'
  const user = useStore((s) => s.user)
  const supportUnread = useStore((s) => s.supportUnread)
  const { haptic } = useTelegram()
  const toast = useToast()

  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showReferrals, setShowReferrals] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const initials =
    user.full_name.split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('') || 'V'
  const refLink = `https://t.me/${CONFIG.botUsername}?start=ref${user.uid}`
  const [whole, cents] = user.balance.toFixed(2).split('.')
  const canWithdraw = user.ref_balance >= 10

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(refLink)
    } catch {
      const el = document.createElement('textarea')
      el.value = refLink
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    haptic('success')
    setCopied(true)
    toast.show(lang === 'ru' ? 'Ссылка скопирована' : 'Link copied', 'success')
    setTimeout(() => setCopied(false), 1600)
  }

  const MenuRow = ({
    icon,
    label,
    hint,
    onClick,
    badge,
    last,
  }: {
    icon: React.ReactNode
    label: string
    hint?: string
    onClick: () => void
    badge?: number
    last?: boolean
  }) => (
    <button
      onClick={() => {
        haptic('light')
        onClick()
      }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
        color: '#fff',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.7)',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{label}</span>
        {hint && (
          <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{hint}</span>
        )}
      </span>
      {badge ? (
        <span
          style={{
            minWidth: 20,
            height: 20,
            padding: '0 6px',
            borderRadius: 10,
            background: GREEN,
            color: INK,
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {badge}
        </span>
      ) : null}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )

  return (
    <PageTransition>
      <div
        style={{
          minHeight: '100%',
          color: '#fff',
          padding: '16px 16px 120px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 4px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: GREEN,
              color: INK,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 20,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 0 24px rgba(57,255,99,0.25)',
            }}
          >
            {user.photo_url ? (
              <img src={user.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
              {user.full_name}
            </div>
            {user.username && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>@{user.username}</div>
            )}
          </div>
          <button
            onClick={() => navigate('/settings')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.7)',
            }}
            aria-label="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Balance */}
        <div style={{ ...card, position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              background: 'rgba(57,255,99,0.12)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative' }}>
            <div style={labelCss}>{lang === 'ru' ? 'Баланс' : 'Balance'}</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 2,
                marginTop: 6,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>${whole}</span>
              <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>.{cents}</span>
            </div>
            <button onClick={() => navigate('/deposit')} style={{ ...primaryBtn, marginTop: 16 }}>
              {lang === 'ru' ? 'Пополнить' : 'Top up'}
            </button>
          </div>
        </div>

        {/* Referral */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={labelCss}>{lang === 'ru' ? 'Реф. баланс' : 'Ref balance'}</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  marginTop: 4,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                ${user.ref_balance.toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => canWithdraw && setShowWithdraw(true)}
              disabled={!canWithdraw}
              style={canWithdraw ? { ...primaryBtn, width: 'auto', padding: '10px 18px' } : ghostBtn}
            >
              {lang === 'ru' ? 'Вывести' : 'Withdraw'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            <span>
              {lang === 'ru' ? 'Приглашено:' : 'Invited:'}{' '}
              <span style={{ color: '#fff', fontWeight: 600 }}>{user.ref_count}</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span>
              {lang === 'ru' ? 'Заработано:' : 'Earned:'}{' '}
              <span style={{ color: GREEN, fontWeight: 700 }}>${user.ref_earned.toFixed(0)}</span>
            </span>
          </div>

          <button
            onClick={copyRef}
            style={{
              width: '100%',
              marginTop: 14,
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)',
                fontFamily: 'JetBrains Mono, monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {refLink}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: copied ? GREEN : 'rgba(255,255,255,0.7)',
                flexShrink: 0,
              }}
            >
              {copied ? '✓' : lang === 'ru' ? 'Копировать' : 'Copy'}
            </span>
          </button>
        </div>

        {/* Menu */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <MenuRow
            onClick={() => navigate('/orders')}
            label={lang === 'ru' ? 'История заказов' : 'Order history'}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <MenuRow
            onClick={() => setShowReferrals(true)}
            label={lang === 'ru' ? 'Мои рефералы' : 'My referrals'}
            hint={String(user.ref_count)}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
          />
          <MenuRow
            onClick={() => navigate('/support')}
            label={lang === 'ru' ? 'Поддержка' : 'Support'}
            badge={supportUnread || undefined}
            last
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                />
              </svg>
            }
          />
        </div>

        {useStore.getState().isAdmin() && (
          <button
            onClick={() => navigate('/admin')}
            style={{
              background: 'rgba(57,255,99,0.06)',
              border: '1px solid rgba(57,255,99,0.3)',
              borderRadius: 14,
              padding: '14px 16px',
              color: GREEN,
              fontWeight: 700,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {lang === 'ru' ? 'Админ-панель' : 'Admin'}
          </button>
        )}
      </div>

      <RefWithdrawSheet open={showWithdraw} onClose={() => setShowWithdraw(false)} />
      {showReferrals && <ReferralList open={showReferrals} onClose={() => setShowReferrals(false)} />}
    </PageTransition>
  )
}
