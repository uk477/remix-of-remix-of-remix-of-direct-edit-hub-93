import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { useT } from '../i18n'

function DashIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function OrdersIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
}
function ProductsIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
}
function SupportIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function MoreIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
}
function BackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
}

const TABS = [
  { path: '/admin',          Icon: DashIcon,     key: 'admin_dashboard' as const },
  { path: '/admin/orders',   Icon: OrdersIcon,   key: 'admin_orders'    as const },
  { path: '/admin/products', Icon: ProductsIcon, key: 'admin_products'  as const },
  { path: '/admin/support',  Icon: SupportIcon,  key: 'admin_support'   as const },
  { path: '/admin/more',     Icon: MoreIcon,     key: 'admin_more'      as const },
]

export default function AdminLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const isAdmin   = useStore((s) => s.isAdmin)
  const t         = useT()

  if (!isAdmin()) return <Navigate to="/" replace />

  const active = (path: string) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path)

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <button className="pg-back" style={{ width: 32, height: 32 }} onClick={() => navigate('/')}>
          <BackIcon />
        </button>
        <div className="admin-title">
          <div className="admin-badge">ADMIN</div>
          <div className="t-md fw-black">{t('admin_panel')}</div>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            height: 32, padding: '0 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', fontSize: 12, fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          {t('admin_panel') ? 'Выйти' : 'Exit'}
        </button>
      </div>

      <div className="scroll-area" style={{ height: 'calc(100dvh - 70px - 48px)' }}>
        <Outlet />
      </div>

      <nav className="nav admin-nav">
        {TABS.map((tab) => {
          const isActive = active(tab.path)
          return (
            <button key={tab.path} className="nav-item" onClick={() => navigate(tab.path)}>
              {isActive && (
                <motion.div
                  className="nav-pip"
                  layoutId="admin-pip"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`nav-icon${isActive ? ' active' : ''}`}>
                <tab.Icon />
              </span>
              <span className={`nav-label${isActive ? ' active' : ''}`}>{t(tab.key)}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
