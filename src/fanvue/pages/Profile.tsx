import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import RefWithdrawSheet from '../components/RefWithdrawSheet'
import ReferralList from '../components/ReferralList'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { useToast } from '../components/Toast'
import { CONFIG } from '../config'

type TierKey = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

interface Tier {
  key: TierKey
  name: string
  level: number
  min: number      // spent threshold (USD)
  next: number     // next threshold
  perk: string
}

function getTier(spent: number, lang: 'ru' | 'en'): Tier {
  const ladder: Array<Omit<Tier, 'perk' | 'name'> & { perkRu: string; perkEn: string; nameRu: string; nameEn: string }> = [
    { key: 'bronze',   level: 1, min: 0,    next: 100,   nameRu: 'Бронза',   nameEn: 'Bronze',   perkRu: '+1% кешбэк открыт',         perkEn: '+1% cashback unlocked' },
    { key: 'silver',   level: 2, min: 100,  next: 500,   nameRu: 'Серебро',  nameEn: 'Silver',   perkRu: '+3% кешбэк открыт',         perkEn: '+3% cashback unlocked' },
    { key: 'gold',     level: 3, min: 500,  next: 2000,  nameRu: 'Золото',   nameEn: 'Gold',     perkRu: '+5% кешбэк открыт',         perkEn: '+5% cashback unlocked' },
    { key: 'platinum', level: 4, min: 2000, next: 10000, nameRu: 'Платина',  nameEn: 'Platinum', perkRu: 'Приоритетная поддержка',    perkEn: 'Priority support' },
    { key: 'diamond',  level: 5, min: 10000, next: 10000, nameRu: 'Алмаз',   nameEn: 'Diamond',  perkRu: 'Личный менеджер',           perkEn: 'Personal manager' },
  ]
  let t = ladder[0]
  for (const tier of ladder) if (spent >= tier.min) t = tier
  return {
    key: t.key,
    level: t.level,
    min: t.min,
    next: t.next,
    name: lang === 'ru' ? t.nameRu : t.nameEn,
    perk: lang === 'ru' ? t.perkRu : t.perkEn,
  }
}

function nextTierName(level: number, lang: 'ru' | 'en'): string {
  const names = { ru: ['Бронза','Серебро','Золото','Платина','Алмаз','Алмаз'], en: ['Bronze','Silver','Gold','Platinum','Diamond','Diamond'] } as const
  return names[lang][Math.min(level, 5)]
}

export default function Profile() {
  const navigate = useNavigate()
  const lang = useStore((s) => s.lang) as 'ru' | 'en'
  const user = useStore((s) => s.user)
  const orders = useStore((s) => s.orders)
  const supportUnread = useStore((s) => s.supportUnread)
  const { haptic } = useTelegram()
  const toast = useToast()

  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showReferrals, setShowReferrals] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const initials = (user.full_name.split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('')) || 'V'
  const memberSince = new Date(user.created).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', year: 'numeric' })
  const memberId = String(user.uid).padStart(6, '0')
  const purchases = orders.filter((o) => o.kind === 'buy' && (o.status === 'completed' || o.status === 'paid')).length
  const tier = useMemo(() => getTier(user.spent, lang), [user.spent, lang])
  const progressPct = tier.next > tier.min ? Math.min(100, ((user.spent - tier.min) / (tier.next - tier.min)) * 100) : 100
  const nextName = nextTierName(tier.level + 1, lang)
  const refLink = `https://t.me/${CONFIG.botUsername}?start=ref${user.uid}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&bgcolor=0a0a0c&color=39FF63&data=${encodeURIComponent(refLink)}`

  const [whole, cents] = user.balance.toFixed(2).split('.')

  // Achievements (derived)
  const achievements = [
    { key: 'first',   icon: '🏆', label: lang === 'ru' ? 'Первая покупка' : 'First buy',  unlocked: purchases >= 1 },
    { key: 'whale',   icon: '🐋', label: lang === 'ru' ? 'Крупная сделка' : 'Whale',      unlocked: user.spent >= 500 },
    { key: 'ref',     icon: '👥', label: lang === 'ru' ? 'Реферал-про'    : 'Recruiter',  unlocked: user.ref_count >= 3 },
    { key: 'streak',  icon: '🔥', label: lang === 'ru' ? 'Серия'          : 'Streak',     unlocked: purchases >= 5 },
    { key: 'gold',    icon: '💎', label: lang === 'ru' ? 'Золотой ранг'   : 'Gold tier',  unlocked: tier.level >= 3 },
    { key: 'legend',  icon: '⚡', label: lang === 'ru' ? 'Легенда'        : 'Legend',     unlocked: user.spent >= 2000 },
  ]
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  const copyRef = async () => {
    try { await navigator.clipboard.writeText(refLink) }
    catch { const el = document.createElement('textarea'); el.value = refLink; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el) }
    haptic('success'); setCopied(true); toast.show(lang === 'ru' ? 'Ссылка скопирована' : 'Link copied', 'success')
    setTimeout(() => setCopied(false), 1800)
  }

  const Tile = ({ children, className = '', delay = 0, onClick }: { children: React.ReactNode; className?: string; delay?: number; onClick?: () => void }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`bg-white/[0.04] border border-white/10 rounded-3xl backdrop-blur-sm ${onClick ? 'cursor-pointer active:bg-white/[0.07]' : ''} ${className}`}
    >
      {children}
    </motion.div>
  )

  const ActionTile = ({ icon, label, accent, onClick }: { icon: React.ReactNode; label: string; accent?: boolean; onClick: () => void }) => (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={() => { haptic('light'); onClick() }}
      className="bg-white/[0.04] border border-white/10 rounded-2xl aspect-square flex flex-col items-center justify-center gap-1.5 transition-colors hover:border-white/20"
    >
      <div className={`p-2 rounded-xl ${accent ? 'bg-[#39FF63]/10' : 'bg-white/10'}`}>
        <span className={accent ? 'text-[#39FF63]' : 'text-white/70'}>{icon}</span>
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">{label}</span>
    </motion.button>
  )

  return (
    <PageTransition>
      <div
        className="min-h-full text-white pb-32 px-4 pt-3 flex flex-col gap-3"
        style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}
      >
        {/* Top Meta */}
        <div className="flex justify-between items-center px-2 text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono">
          <span>№ {memberId}</span>
          <span>{lang === 'ru' ? `с ${memberSince}` : `since ${memberSince}`}</span>
        </div>

        {/* Hero Identity */}
        <Tile delay={0.02} className="p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#39FF63] to-[#73ffb8] flex items-center justify-center text-[#0a0a0c] text-xl font-bold shadow-[0_0_22px_rgba(57,255,99,0.35)] overflow-hidden">
            {user.photo_url ? <img src={user.photo_url} alt="" className="w-full h-full object-cover rounded-full" /> : initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight truncate" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{user.full_name}</h1>
            {user.username && <p className="text-sm text-white/50 truncate">@{user.username}</p>}
          </div>
          <button
            onClick={() => { haptic('light'); navigate('/settings') }}
            className="bg-white/10 p-2 rounded-xl border border-white/5 active:scale-95 transition-transform"
            aria-label={lang === 'ru' ? 'Настройки' : 'Settings'}
          >
            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </button>
        </Tile>

        {/* Balance */}
        <Tile delay={0.06} className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#39FF63]/[0.07] blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <p className="text-[10px] font-mono text-[#39FF63] uppercase tracking-[0.2em] mb-2">
            {lang === 'ru' ? 'Баланс хранилища' : 'Vault balance'}
          </p>
          <div className="flex items-baseline gap-1" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            <span className="text-4xl font-bold">${whole}</span>
            <span className="text-2xl font-medium text-white/40">.{cents}</span>
          </div>
          {user.ref_balance > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#39FF63]/10 border border-[#39FF63]/20">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">{lang === 'ru' ? 'Реф.' : 'Ref'}</span>
              <span className="text-[11px] font-bold text-[#39FF63]">${user.ref_balance.toFixed(2)}</span>
            </div>
          )}
        </Tile>

        {/* Loyalty & Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Tile delay={0.1} className="col-span-2 p-5 relative overflow-hidden bg-gradient-to-br from-[#121214] to-[#0a0a0c]!">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">
                  {lang === 'ru' ? 'Текущий ранг' : 'Current tier'}
                </p>
                <h2 className="text-2xl font-bold text-[#39FF63] drop-shadow-[0_0_10px_rgba(57,255,99,0.35)]" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                  {tier.name}
                </h2>
              </div>
              <div className="bg-[#39FF63]/10 px-3 py-1 rounded-full text-[10px] font-bold text-[#39FF63] border border-[#39FF63]/20 font-mono">
                LVL {tier.level}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-medium">
                <span className="text-white/40">
                  {lang === 'ru' ? `До ${nextName}` : `To ${nextName}`}
                </span>
                <span className="text-[#73ffb8] font-mono">
                  ${user.spent.toFixed(0)} / ${tier.next}
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-[#39FF63] to-[#73ffb8] rounded-full shadow-[0_0_12px_rgba(57,255,99,0.5)]"
                />
              </div>
              <p className="text-[10px] text-white/40 italic">{tier.perk}</p>
            </div>
          </Tile>

          <Tile delay={0.14} className="p-4">
            <p className="text-[10px] font-mono text-white/40 uppercase mb-1 tracking-widest">{lang === 'ru' ? 'Сделок' : 'Acquisitions'}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{purchases}</p>
          </Tile>
          <Tile delay={0.16} className="p-4">
            <p className="text-[10px] font-mono text-white/40 uppercase mb-1 tracking-widest">{lang === 'ru' ? 'Потрачено' : 'Settled'}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>${user.spent.toFixed(0)}</p>
          </Tile>
        </div>

        {/* Quick Actions + QR */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-7 grid grid-cols-2 gap-2">
            <ActionTile
              accent
              onClick={() => navigate('/deposit')}
              label={lang === 'ru' ? 'Пополнить' : 'Top up'}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}
            />
            <ActionTile
              onClick={() => navigate('/orders')}
              label={lang === 'ru' ? 'Журнал' : 'History'}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
            <ActionTile
              onClick={() => setShowReferrals(true)}
              label={lang === 'ru' ? 'Рефералы' : 'Referrals'}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>}
            />
            <div className="relative">
              <ActionTile
                onClick={() => navigate('/support')}
                label={lang === 'ru' ? 'Поддержка' : 'Support'}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>}
              />
              {supportUnread > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#39FF63] shadow-[0_0_8px_#39FF63]" />
              )}
            </div>
          </div>

          {/* QR Tile */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            whileTap={{ scale: 0.96 }}
            onClick={() => { haptic('medium'); setShowQR(true) }}
            className="col-span-5 bg-[#39FF63] rounded-3xl p-3 flex flex-col items-center justify-center text-[#0a0a0c] gap-2"
          >
            <div className="w-full aspect-square bg-white rounded-xl p-1.5">
              <img src={qrUrl} alt="QR" className="w-full h-full object-contain" loading="lazy" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-tight">{lang === 'ru' ? 'Реф. QR' : 'Referral QR'}</span>
          </motion.button>
        </div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3 mt-1"
        >
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-mono uppercase text-white/40 tracking-[0.2em]">
              {lang === 'ru' ? 'Достижения' : 'Achievements'}
            </h3>
            <span className="text-[10px] text-[#39FF63] font-mono">{unlockedCount} / {achievements.length}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {achievements.map((a) => (
              <div key={a.key} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px]">
                <div className={
                  a.unlocked
                    ? 'w-[60px] h-[60px] rounded-2xl bg-white/5 border border-[#39FF63]/30 flex items-center justify-center text-2xl shadow-[0_0_14px_rgba(57,255,99,0.15)]'
                    : 'w-[60px] h-[60px] rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-2xl opacity-30 grayscale'
                }>
                  {a.unlocked ? a.icon : '🔒'}
                </div>
                <span className={`text-[9px] text-center leading-tight ${a.unlocked ? 'text-white/70' : 'text-white/30'}`}>
                  {a.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Referral Earnings */}
        <Tile delay={0.28} className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-[#39FF63]/15 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#39FF63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <h4 className="font-bold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              {lang === 'ru' ? 'Реферальная программа' : 'Referral Program'}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono">{lang === 'ru' ? 'Приглашено' : 'Invited'}</div>
              <div className="text-lg font-bold mt-0.5" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{user.ref_count}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono">{lang === 'ru' ? 'Заработано' : 'Earned'}</div>
              <div className="text-lg font-bold mt-0.5 text-[#39FF63]" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>${user.ref_earned.toFixed(0)}</div>
            </div>
          </div>

          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[10px] text-white/40 uppercase mb-1 font-mono tracking-widest">
                {lang === 'ru' ? 'Доступно к выводу' : 'Available'}
              </p>
              <p className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                ${user.ref_balance.toFixed(2)}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWithdraw(true)}
              className={`px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors ${
                user.ref_balance >= 10
                  ? 'bg-[#39FF63] text-[#0a0a0c] shadow-[0_0_18px_rgba(57,255,99,0.35)]'
                  : 'bg-white/10 border border-white/5 text-white/50'
              }`}
            >
              {lang === 'ru' ? 'Вывести' : 'Withdraw'}
            </motion.button>
          </div>

          {/* Ref link */}
          <button
            onClick={copyRef}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 active:bg-black/60 transition-colors"
          >
            <span className="text-[11px] font-mono text-white/60 truncate">{refLink}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${copied ? 'text-[#39FF63]' : 'text-white/70'}`}>
              {copied ? '✓' : (lang === 'ru' ? 'Копир.' : 'Copy')}
            </span>
          </button>
        </Tile>

        {/* Settings menu shortcut */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/settings')}
          className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex items-center justify-between active:bg-white/[0.07]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div className="text-left">
              <div className="text-sm font-bold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                {lang === 'ru' ? 'Настройки' : 'Preferences'}
              </div>
              <div className="text-[10px] text-white/40">{lang === 'ru' ? 'Язык и уведомления' : 'Language & alerts'}</div>
            </div>
          </div>
          <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        </motion.button>

        {useStore.getState().isAdmin() && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/admin')}
            className="mt-1 bg-white/[0.04] border border-[#39FF63]/30 rounded-2xl p-4 text-[11px] font-bold uppercase tracking-wider text-[#39FF63]"
          >
            {lang === 'ru' ? 'Админ-панель' : 'Admin Console'}
          </motion.button>
        )}
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowQR(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0a0c] border border-white/10 rounded-3xl p-6 max-w-[320px] w-full flex flex-col items-center gap-4"
            >
              <div className="w-full aspect-square bg-white rounded-2xl p-3">
                <img src={qrUrl.replace('size=240x240','size=480x480')} alt="QR" className="w-full h-full" />
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-[#39FF63] font-mono mb-1">
                  {lang === 'ru' ? 'Реферальная ссылка' : 'Referral link'}
                </p>
                <p className="text-[11px] text-white/60 font-mono break-all">{refLink}</p>
              </div>
              <button
                onClick={copyRef}
                className="w-full bg-[#39FF63] text-[#0a0a0c] font-bold uppercase text-xs tracking-wider py-3 rounded-xl active:scale-95 transition-transform"
              >
                {copied ? '✓ ' + (lang === 'ru' ? 'Скопировано' : 'Copied') : (lang === 'ru' ? 'Скопировать ссылку' : 'Copy link')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RefWithdrawSheet open={showWithdraw} onClose={() => setShowWithdraw(false)} />
      {showReferrals && (
        <ReferralList open={showReferrals} onClose={() => setShowReferrals(false)} />
      )}
    </PageTransition>
  )
}
