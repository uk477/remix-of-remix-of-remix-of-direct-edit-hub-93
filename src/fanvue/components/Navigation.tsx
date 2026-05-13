import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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

  const activeIdx = items.findIndex((it) =>
    it.path === '/' ? location.pathname === '/' : location.pathname.startsWith(it.path),
  )

  const [peeking, setPeeking] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number>(activeIdx === -1 ? 0 : activeIdx)

  const innerRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const startRef = useRef<{ x: number; y: number; idx: number } | null>(null)
  const movedRef = useRef(false)
  const peekingRef = useRef(false)
  const lastIdxRef = useRef<number>(-1)

  const idxFromX = (clientX: number): number => {
    const root = innerRef.current
    if (!root) return 0
    const btns = root.querySelectorAll<HTMLElement>('[data-nav-btn]')
    let bestI = 0
    let bestD = Infinity
    btns.forEach((el, i) => {
      const r = el.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right) { bestI = i; bestD = -1 }
      else if (bestD !== -1) {
        const cx = (r.left + r.right) / 2
        const d = Math.abs(clientX - cx)
        if (d < bestD) { bestI = i; bestD = d }
      }
    })
    return bestI
  }

  const setHover = (i: number) => {
    if (i !== lastIdxRef.current) {
      lastIdxRef.current = i
      setHoverIdx(i)
      haptic('light')
    }
  }

  const close = () => {
    setPeeking(false)
    peekingRef.current = false
  }

  const onPointerDown = (idx: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY, idx }
    movedRef.current = false
    peekingRef.current = false
    lastIdxRef.current = idx
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      if (movedRef.current) return
      peekingRef.current = true
      setPeeking(true)
      setHoverIdx(idx)
      haptic('medium')
      try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId) } catch { /* ignore */ }
    }, 220)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (!peekingRef.current) {
      // Horizontal movement before timer → start peek immediately
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) {
        if (timerRef.current) window.clearTimeout(timerRef.current)
        peekingRef.current = true
        setPeeking(true)
        haptic('medium')
        try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId) } catch { /* ignore */ }
      } else if (Math.hypot(dx, dy) > 10) {
        movedRef.current = true
        if (timerRef.current) window.clearTimeout(timerRef.current)
        return
      }
    }
    if (peekingRef.current) {
      e.preventDefault()
      setHover(idxFromX(e.clientX))
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (peekingRef.current) {
      e.preventDefault()
      const i = idxFromX(e.clientX)
      const target = items[i]
      if (target && i !== activeIdx) {
        haptic('success')
        navigate(target.path)
      } else {
        haptic('light')
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

  // When route changes, sync hover to new active
  useEffect(() => {
    if (!peeking) setHoverIdx(activeIdx === -1 ? 0 : activeIdx)
  }, [activeIdx, peeking])

  // Close on scroll / route change
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

  const pillIdx = peeking ? hoverIdx : (activeIdx === -1 ? -1 : activeIdx)

  return (
    <nav className="fv-nav" aria-label="Primary navigation">
      <div ref={innerRef} className={`fv-nav-inner ${peeking ? 'is-peeking' : ''}`}>
        {pillIdx >= 0 && (
          <span
            className={`fv-nav-pill2 ${peeking ? 'is-peek' : ''}`}
            style={{
              width: `calc((100% - 12px) / ${items.length})`,
              transform: `translateX(calc(${pillIdx} * (100% + 6px)))`,
            }}
            aria-hidden
          />
        )}
        {items.map((item, i) => {
          const Icon = item.icon
          const lit = pillIdx === i
          return (
            <button
              key={item.path}
              data-nav-btn
              className={lit ? 'is-active' : ''}
              onClick={handleClick(item.path)}
              onPointerDown={onPointerDown(i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              style={{ touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none' }}
            >
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
