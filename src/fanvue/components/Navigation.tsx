import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'

type Lang = 'ru' | 'en'

const items = [
  { path: '/',        label: { ru: 'Маркет',  en: 'Market' },  icon: MarketIcon },
  { path: '/orders',  label: { ru: 'Заказы',  en: 'Orders' },  icon: OrdersIcon },
  { path: '/profile', label: { ru: 'Профиль', en: 'Profile' }, icon: ProfileIcon },
] as const

export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const lang = useStore((s) => s.lang) as Lang
  const supportUnread = useStore((s) => s.supportUnread)
  const { haptic } = useTelegram()

  const [peeking, setPeeking] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const innerRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const movedRef = useRef(false)
  const peekingRef = useRef(false)
  const lastIdxRef = useRef<number | null>(null)

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const idxFromPoint = (clientX: number): number | null => {
    const root = innerRef.current
    if (!root) return null
    const btns = root.querySelectorAll<HTMLElement>('[data-nav-btn]')
    let best: { i: number; d: number } | null = null
    btns.forEach((el, i) => {
      const r = el.getBoundingClientRect()
      const cx = (r.left + r.right) / 2
      const inside = clientX >= r.left - 8 && clientX <= r.right + 8
      const d = Math.abs(clientX - cx)
      if (inside) { best = { i, d: -1 }; return }
      if (!best || d < best.d) best = { i, d }
    })
    return best ? best.i : null
  }

  const updateHover = (clientX: number) => {
    const i = idxFromPoint(clientX)
    if (i !== lastIdxRef.current) {
      lastIdxRef.current = i
      setHoverIdx(i)
      if (i !== null) haptic('light')
    }
  }

  const close = () => {
    setPeeking(false)
    setHoverIdx(null)
    peekingRef.current = false
    lastIdxRef.current = null
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY }
    movedRef.current = false
    peekingRef.current = false
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      if (movedRef.current) return
      peekingRef.current = true
      setPeeking(true)
      haptic('medium')
      updateHover(e.clientX)
      try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId) } catch { /* ignore */ }
    }, 300)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (!peekingRef.current && Math.hypot(dx, dy) > 10) {
      movedRef.current = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
    if (peekingRef.current) {
      e.preventDefault()
      updateHover(e.clientX)
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (peekingRef.current) {
      e.preventDefault()
      const i = lastIdxRef.current ?? idxFromPoint(e.clientX)
      if (i !== null) {
        haptic('success')
        navigate(items[i].path)
      }
      close()
    }
    startRef.current = null
  }

  const onPointerCancel = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (peekingRef.current) close()
    startRef.current = null
  }

  useEffect(() => {
    if (!peeking) return
    const onScroll = () => close()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [peeking])

  const handleClick = (path: string) => (e: React.MouseEvent) => {
    if (peekingRef.current || movedRef.current) {
      e.preventDefault()
      return
    }
    navigate(path)
  }

  const previewIdx = hoverIdx

  return (
    <nav className="fv-nav" aria-label="Primary navigation">
      <AnimatePresence>
        {peeking && (
          <motion.div
            className="fv-peek-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        )}
      </AnimatePresence>

      <div ref={innerRef} className={`fv-nav-inner ${peeking ? 'is-peeking' : ''}`}>
        {items.map((item, i) => {
          const active = isActive(item.path)
          const Icon = item.icon
          const hovered = peeking && previewIdx === i
          return (
            <button
              key={item.path}
              data-nav-btn
              className={`${active ? 'is-active' : ''} ${hovered ? 'is-peek-hover' : ''}`}
              onClick={handleClick(item.path)}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              style={{ touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              {hovered && (
                <motion.span
                  layoutId="fv-nav-peek-pill"
                  className="fv-nav-peek-pill"
                  transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                />
              )}
              {active && !hovered && (
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
        {peeking && previewIdx !== null && (
          <motion.div
            className="fv-peek-tip"
            key={previewIdx}
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 480, damping: 32 }}
          >
            {items[previewIdx].label[lang]}
          </motion.div>
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
