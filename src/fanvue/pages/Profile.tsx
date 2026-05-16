import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import RefWithdrawSheet from '../components/RefWithdrawSheet'
import ReferralList from '../components/ReferralList'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { useToast } from '../components/Toast'
import { CONFIG } from '../config'

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

  const initials = (user.full_name.split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('')) || 'V'
  const refLink = `https://t.me/${CONFIG.botUsername}?start=ref${user.uid}`
  const [whole, cents] = user.balance.toFixed(2).split('.')

  const copyRef = async () => {
    try { await navigator.clipboard.writeText(refLink) }
    catch { const el = document.createElement('textarea'); el.value = refLink; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el) }
    haptic('success'); setCopied(true); toast.show(lang === 'ru' ? 'Ссылка скопирована' : 'Link copied', 'success')
    setTimeout(() => setCopied(false), 1600)
  }

  const MenuItem = ({ icon, label, hint, onClick, badge }: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void; badge?: number }) => (
    <button
      onClick={() => { haptic('light'); onClick() }}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition-colors"
    >
      <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/70 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[14px] font-medium text-white truncate">{label}</div>
        {hint && <div className="text-[11px] text-white/40 truncate">{hint}</div>}
      </div>
      {badge ? (
        <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#39FF63] text-[#0a0a0c] text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      ) : null}
      <svg className="w-4 h-4 text-white/25 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  )

  return (
    <PageTransition>
      <div className="min-h-full text-white pb-32 px-4 pt-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#39FF63] flex items-center justify-center text-[#0a0a0c] text-lg font-bold overflow-hidden shrink-0">
            {user.photo_url ? <img src={user.photo_url} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-semibold truncate">{user.full_name}</h1>
            {user.username && <p className="text-[13px] text-white/45 truncate">@{user.username}</p>}
          </div>
        </div>

        {/* Balance */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1.5">
            {lang === 'ru' ? 'Баланс' : 'Balance'}
          </p>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[34px] font-semibold leading-none">${whole}</span>
            <span className="text-[20px] text-white/40 leading-none">.{cents}</span>
          </div>
          <button
            onClick={() => navigate('/deposit')}
            className="mt-4 w-full bg-[#39FF63] text-[#0a0a0c] font-semibold text-[14px] py-3 rounded-xl active:scale-[0.98] transition-transform"
          >
            {lang === 'ru' ? 'Пополнить' : 'Top up'}
          </button>
        </div>

        {/* Referral */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/40">
                {lang === 'ru' ? 'Реферальный баланс' : 'Referral balance'}
              </p>
              <p className="text-[22px] font-semibold mt-0.5">${user.ref_balance.toFixed(2)}</p>
            </div>
            <button
              onClick={() => setShowWithdraw(true)}
              disabled={user.ref_balance < 10}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold disabled:bg-white/[0.06] disabled:text-white/30 bg-[#39FF63] text-[#0a0a0c]"
            >
              {lang === 'ru' ? 'Вывести' : 'Withdraw'}
            </button>
          </div>
          <div className="flex gap-2 text-[12px] text-white/50 mb-3">
            <span>{lang === 'ru' ? 'Приглашено:' : 'Invited:'} <span className="text-white">{user.ref_count}</span></span>
            <span className="text-white/20">·</span>
            <span>{lang === 'ru' ? 'Заработано:' : 'Earned:'} <span className="text-white">${user.ref_earned.toFixed(0)}</span></span>
          </div>
          <button
            onClick={copyRef}
            className="w-full flex items-center justify-between gap-2 bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 active:bg-black/50"
          >
            <span className="text-[12px] text-white/60 truncate font-mono">{refLink}</span>
            <span className={`text-[11px] font-semibold shrink-0 ${copied ? 'text-[#39FF63]' : 'text-white/70'}`}>
              {copied ? '✓' : (lang === 'ru' ? 'Копировать' : 'Copy')}
            </span>
          </button>
        </div>

        {/* Menu */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05] overflow-hidden">
          <MenuItem
            onClick={() => navigate('/orders')}
            label={lang === 'ru' ? 'История заказов' : 'Order history'}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          />
          <MenuItem
            onClick={() => setShowReferrals(true)}
            label={lang === 'ru' ? 'Мои рефералы' : 'My referrals'}
            hint={String(user.ref_count)}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          />
          <MenuItem
            onClick={() => navigate('/support')}
            label={lang === 'ru' ? 'Поддержка' : 'Support'}
            badge={supportUnread || undefined}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>}
          />
          <MenuItem
            onClick={() => navigate('/settings')}
            label={lang === 'ru' ? 'Настройки' : 'Settings'}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          />
        </div>

        {useStore.getState().isAdmin() && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/admin')}
            className="bg-white/[0.04] border border-[#39FF63]/30 rounded-2xl py-3.5 text-[12px] font-semibold uppercase tracking-wider text-[#39FF63]"
          >
            {lang === 'ru' ? 'Админ-панель' : 'Admin'}
          </motion.button>
        )}
      </div>

      <RefWithdrawSheet open={showWithdraw} onClose={() => setShowWithdraw(false)} />
      {showReferrals && (
        <ReferralList open={showReferrals} onClose={() => setShowReferrals(false)} />
      )}
    </PageTransition>
  )
}
