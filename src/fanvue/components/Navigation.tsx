import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store'

const items = [
  { path: '/', label: { ru: 'Маркет', en: 'Market' }, icon: MarketIcon },
  { path: '/orders', label: { ru: 'Заказы', en: 'Orders' }, icon: OrdersIcon },
  { path: '/profile', label: { ru: 'Профиль', en: 'Profile' }, icon: ProfileIcon },
] as const

export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const lang = useStore((s) => s.lang)
  const supportUnread = useStore((s) => s.supportUnread)

  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <nav className="fv-nav" aria-label="Primary navigation">
      <div className="fv-nav-inner">
        {items.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <button key={item.path} className={active ? 'is-active' : ''} onClick={() => navigate(item.path)}>
              {active && <motion.span layoutId="fv-nav-pill" className="fv-nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <Icon />
              <span>{item.label[lang]}</span>
              {item.path === '/profile' && supportUnread > 0 && <i />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function MarketIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M5 10h14l-1 9H6l-1-9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M8 10a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}
function OrdersIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M6 5h12M6 12h12M6 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M3 5h.01M3 12h.01M3 19h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
}
function ProfileIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4.5 20c1.4-4 4-6 7.5-6s6.1 2 7.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}
