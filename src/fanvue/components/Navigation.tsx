import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'

type Lang = 'ru' | 'en'
type Action = {
  key: string
  label: { ru: string; en: string }
  icon: () => JSX.Element
  to: string
  danger?: boolean
}

type NavItem = {
  path: string
  label: { ru: string; en: string }
  icon: () => JSX.Element
  actions: Action[]
}

const items: NavItem[] = [
  {
    path: '/',
    label: { ru: 'Маркет', en: 'Market' },
    icon: MarketIcon,
    actions: [
      { key: 'home',    label: { ru: 'Главная',    en: 'Home' },     icon: HomeGlyph,   to: '/' },
      { key: 'catalog', label: { ru: 'Каталог',    en: 'Catalog' },  icon: GridGlyph,   to: '/market' },
      { key: 'deposit', label: { ru: 'Пополнить',  en: 'Top up' },   icon: PlusGlyph,   to: '/deposit' },
    ],
  },
  {
    path: '/orders',
    label: { ru: 'Заказы', en: 'Orders' },
    icon: OrdersIcon,
    actions: [
      { key: 'orders',  label: { ru: 'Мои заказы', en: 'My orders' }, icon: ListGlyph, to: '/orders' },
      { key: 'support', label: { ru: 'Поддержка',  en: 'Support' },   icon: ChatGlyph, to: '/support' },
    ],
  },
  {
    path: '/profile',
    label: { ru: 'Профиль', en: 'Profile' },
    icon: ProfileIcon,
    actions: [
      { key: 'deposit',  label: { ru: 'Пополнить',  en: 'Top up' },     icon: PlusGlyph,    to: '/deposit' },
      { key: 'support',  label: { ru: 'Поддержка',  en: 'Support' },    icon: ChatGlyph,    to: '/support' },
      { key: 'settings', label: { ru: 'Настройки',  en: 'Settings' },   icon: GearGlyph,    to: '/settings' },
    ],
  },
]

export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const lang = useStore((s) => s.lang) as Lang
  const supportUnread = useStore((s) => s.supportUnread)
  const isAdmin = useStore((s) => s.isAdmin)
  const { haptic } = useTelegram()

  const [peekIndex, setPeekIndex] = useState<number | null>(null)
  const [hoverKey, setHoverKey] = useState<string | null>(null)

  const timerRef = useRef<number | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const movedRef = useRef(false)
  const peekedRef = useRef(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const getActions = (i: number): Action[] => {
    const base = items[i].actions
    if (i === 2 && isAdmin?.()) {
      return [
        ...base,
        { key: 'admin', label: { ru: 'Админ-панель', en: 'Admin' }, icon: ShieldGlyph, to: '/admin' },
      ]
    }
    return base
  }

  const closePeek = () => {
    setPeekIndex(null)
    setHoverKey(null)
    peekedRef.current = false
  }

  const updateHoverFromPoint = (clientX: number, clientY: number) => {
    const root = menuRef.current
    if (!root) return
    const rows = root.querySelectorAll<HTMLElement>('[data-peek-row]')
    let found: string | null = null
    rows.forEach((el) => {
      const r = el.getBoundingClientRect()
      if (clientY >= r.top && clientY <= r.bottom && clientX >= r.left - 12 && clientX <= r.right + 12) {
        found = el.dataset.peekKey ?? null
      }
    })
    if (found !== hoverKey) {
      setHoverKey(found)
      if (found) haptic('light')
    }
  }

  const onPointerDown = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY }
    movedRef.current = false
    peekedRef.current = false
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      if (movedRef.current) return
      peekedRef.current = true
      setPeekIndex(i)
      setHoverKey(null)
      haptic('medium')
    }, 320)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (!peekedRef.current && Math.hypot(dx, dy) > 8) {
      movedRef.current = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
    if (peekedRef.current) {
      e.preventDefault()
      updateHoverFromPoint(e.clientX, e.clientY)
    }
  }

  const onPointerUp = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (peekedRef.current) {
      e.preventDefault()
      const acts = getActions(i)
      const target = hoverKey ? acts.find((a) => a.key === hoverKey) : null
      if (target) {
        haptic('success')
        navigate(target.to)
      }
      closePeek()
    }
    startRef.current = null
  }

  const onPointerCancel = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (peekedRef.current) closePeek()
    startRef.current = null
  }

  // Close on outside click while peek open
  useEffect(() => {
    if (peekIndex === null) return
    const handler = () => closePeek()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [peekIndex])

  const handleClick = (path: string) => (e: React.MouseEvent) => {
    if (peekedRef.current || movedRef.current) {
      e.preventDefault()
      return
    }
    navigate(path)
  }

  return (
    <nav className="fv-nav" aria-label="Primary navigation">
      <div className="fv-nav-inner">
        {items.map((item, i) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.path}
              className={active ? 'is-active' : ''}
              onClick={handleClick(item.path)}
              onPointerDown={onPointerDown(i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp(i)}
              onPointerCancel={onPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              style={{ touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              {active && (
                <motion.span
                  layoutId="fv-nav-pill"
                  className="fv-nav-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon />
              <span>{item.label[lang]}</span>
              {item.path === '/profile' && supportUnread > 0 && <i />}
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {peekIndex !== null && (
          <>
            <motion.div
              className="fv-peek-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
            <motion.div
              ref={menuRef}
              className="fv-peek"
              data-peek-index={peekIndex}
              initial={{ opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              style={{
                ['--peek-col' as string]: peekIndex,
              }}
            >
              {getActions(peekIndex).map((a) => {
                const G = a.icon
                const isHover = hoverKey === a.key
                return (
                  <div
                    key={a.key}
                    data-peek-row
                    data-peek-key={a.key}
                    className={`fv-peek-row ${isHover ? 'is-hover' : ''}`}
                  >
                    <span className="fv-peek-ico"><G /></span>
                    <span className="fv-peek-lbl">{a.label[lang]}</span>
                  </div>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
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

/* Peek glyphs */
function HomeGlyph() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg> }
function GridGlyph() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg> }
function PlusGlyph() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg> }
function ListGlyph() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1.2" fill="currentColor"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/><circle cx="4" cy="18" r="1.2" fill="currentColor"/></svg> }
function ChatGlyph() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/></svg> }
function GearGlyph() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2L10 21h4l.6-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"/></svg> }
function ShieldGlyph() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"/></svg> }
