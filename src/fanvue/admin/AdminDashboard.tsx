import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { useT } from '../i18n'
import PageTransition from '../components/PageTransition'

const UsersIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const BoxIcon     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
const RevenueIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
const ClockIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const CheckIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const BroadIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8z"/><rect x="2" y="9" width="14" height="6" rx="1"/></svg>
const WalletIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V22H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16v4"/><path d="M20 12a2 2 0 0 0-2 2 2 2 0 0 0 2 2h4v-4h-4Z"/></svg>
const LogsIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
const UserIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const ShopIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
const RefIcon     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>

function StatCard({ Icon, value, label, color, delay = 0 }: {
  Icon: () => JSX.Element; value: string; label: string; color: string; delay?: number
}) {
  return (
    <motion.div
      className="card"
      style={{ padding: '16px', position: 'relative', overflow: 'hidden' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ color, marginBottom: 8 }}><Icon /></div>
      <div className="t-xl" style={{ color, fontSize: 24 }}>{value}</div>
      <div className="t-xs t-muted mt-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </motion.div>
  )
}

function QuickAction({ Icon, label, onClick, color = 'var(--brand)' }: {
  Icon: () => JSX.Element; label: string; onClick: () => void; color?: string
}) {
  return (
    <motion.button
      className="card"
      style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
    >
      <span style={{ color }}><Icon /></span>
      <span className="t-xs fw-bold" style={{ color }}>{label}</span>
    </motion.button>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const t        = useT()
  const orders   = useStore((s) => s.orders)
  const logs     = useStore((s) => s.logs)

  const totalRevenue = orders.filter((o) => o.status === 'completed' && o.kind === 'buy').reduce((s, o) => s + o.amount, 0)
  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const totalOrders  = orders.length
  const uniqueUsers  = new Set(logs.map((l) => l.uid)).size + 12
  const recent       = logs.slice(0, 5)

  return (
    <PageTransition>
      <div className="page">
        <div className="grid-2 mb-4">
          <StatCard Icon={UsersIcon}   value={String(uniqueUsers)}           label={t('admin_total_users')}  color="var(--brand)"  delay={0}    />
          <StatCard Icon={BoxIcon}     value={String(totalOrders)}           label={t('admin_total_orders')} color="var(--purple)" delay={0.05} />
          <StatCard Icon={RevenueIcon} value={`$${totalRevenue.toFixed(0)}`} label={t('admin_revenue')}      color="var(--gold)"   delay={0.1}  />
          <StatCard Icon={ClockIcon}   value={String(pendingCount)}          label={t('admin_pending')}      color="var(--orange)" delay={0.15} />
        </div>

        <div className="section-title mb-3">{t('admin_quick')}</div>
        <div className="grid-3 mb-5">
          <QuickAction Icon={CheckIcon}  label={t('admin_verify_payment')} onClick={() => navigate('/admin/orders')}    color="var(--green)"  />
          <QuickAction Icon={BroadIcon}  label={t('admin_broadcast')}      onClick={() => navigate('/admin/broadcast')} color="var(--pink)"   />
          <QuickAction Icon={WalletIcon} label={t('admin_addresses')}      onClick={() => navigate('/admin/settings')}  color="var(--brand)"  />
          <QuickAction Icon={LogsIcon}   label={t('admin_logs')}           onClick={() => navigate('/admin/logs')}      color="var(--purple)" />
          <QuickAction Icon={UserIcon}   label={t('admin_users')}          onClick={() => navigate('/admin/users')}     color="var(--gold)"   />
          <QuickAction Icon={ShopIcon}   label={t('admin_products')}       onClick={() => navigate('/admin/products')}  color="var(--orange)" />
          <QuickAction Icon={RefIcon}    label="Реф. выводы"               onClick={() => navigate('/admin/referrals')} color="var(--cyan)"   />
        </div>

        <div className="section-title mb-3">{t('admin_recent_activity')}</div>
        <div className="col gap-2">
          {recent.length === 0 && (
            <div className="t-xs t-muted text-center" style={{ padding: 20 }}>{t('admin_no_logs')}</div>
          )}
          {recent.map((log, i) => (
            <motion.div key={log.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: log.status === 'success' ? 'rgba(0,201,141,0.14)' : 'rgba(240,64,96,0.14)', color: log.status === 'success' ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {log.status === 'success'
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="t-sm fw-bold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  @{log.username} · {log.kind === 'buy' ? log.product ?? 'Purchase' : 'Deposit'}
                </div>
                <div className="t-xs t-muted">{new Date(log.ts).toLocaleString()}</div>
              </div>
              <div className="t-sm fw-black" style={{ color: log.kind === 'deposit' ? 'var(--green)' : 'var(--t-primary)' }}>
                {log.kind === 'deposit' ? '+' : ''}${log.amount.toFixed(2)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageTransition>
  )
}
