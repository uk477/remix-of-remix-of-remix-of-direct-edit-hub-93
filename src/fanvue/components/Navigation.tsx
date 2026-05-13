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
  const pillRef = useRef<HTMLSpanElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<{ x: number; y: number; idx: number } | null>(null)
  const movedRef = useRef(false)
  const peekingRef = useRef(false)
  const lastIdxRef = useRef<number>(-1)
  const pendingXRef = useRef<number | null>(null)
  // Cached layout
  const layoutRef = useRef<{ left: number; pillW: number; gap: number; centers: number[] } | null>(null)

  const measure = () => {
    const root = innerRef.current
    if (!root) return null
    const rect = root.getBoundingClientRect()
    const btns = root.querySelectorAll<HTMLElement>('[data-nav-btn]')
    const centers: number[] = []
    let pillW = 0
    btns.forEach((el) => {
      const r = el.getBoundingClientRect()
      centers.push((r.left + r.right) / 2 - rect.left)
      if (!pillW) pillW = r.width
    })
    layoutRef.current = { left: rect.left, pillW, gap: 0, centers }
    return layoutRef.current
  }

  const idxFromClientX = (clientX: number): number => {
    const L = layoutRef.current ?? measure()
    if (!L) return 0
    const localX = clientX - L.left
    let best = 0
    let bestD = Infinity
    L.centers.forEach((c, i) => {
      const d = Math.abs(localX - c)
      if (d < bestD) { best = i; bestD = d }
    })
    return best
  }

  const positionPill = (clientX: number) => {
    const L = layoutRef.current ?? measure()
    if (!L || !pillRef.current) return
    const localX = clientX - L.left
    const half = L.pillW / 2
    // Clamp pill center to first/last button center
    const min = L.centers[0]
    const max = L.centers[L.centers.length - 1]
    const cx = Math.max(min, Math.min(max, localX))
    pillRef.current.style.transform = `translate3d(${cx - half}px, 0, 0)`
  }

  const snapPillToIdx = (i: number) => {
    const L = layoutRef.current ?? measure()
    if (!L || !pillRef.current) return
    const half = L.pillW / 2
    pillRef.current.style.transform = `translate3d(${L.centers[i] - half}px, 0, 0)`
  }

  const setHover = (i: number) => {
    if (i !== lastIdxRef.current) {
      lastIdxRef.current = i
      setHoverIdx(i)
      haptic('light')
    }
  }

  const close = () => {
    peekingRef.current = false
    setPeeking(false)
    // Pill returns to active idx via CSS transition
    if (pillRef.current) pillRef.current.style.transform = ''
  }

  const beginPeek = (e: React.PointerEvent<HTMLButtonElement>) => {
    measure()
    peekingRef.current = true
    setPeeking(true)
    haptic('medium')
    positionPill(e.clientX)
    setHover(idxFromClientX(e.clientX))
    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId) } catch { /* ignore */ }
  }

  const onPointerDown = (idx: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY, idx }
    movedRef.current = false
    peekingRef.current = false
    lastIdxRef.current = idx
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      if (movedRef.current) return
      beginPeek(e)
    }, 200)
  }

  const flushPosition = () => {
    rafRef.current = null
    const x = pendingXRef.current
    if (x == null) return
    pendingXRef.current = null
    positionPill(x)
    setHover(idxFromClientX(x))
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (!peekingRef.current) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        if (timerRef.current) window.clearTimeout(timerRef.current)
        beginPeek(e)
      } else if (Math.hypot(dx, dy) > 10) {
        movedRef.current = true
        if (timerRef.current) window.clearTimeout(timerRef.current)
        return
      }
    }
    if (peekingRef.current) {
      e.preventDefault()
      pendingXRef.current = e.clientX
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(flushPosition)
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (peekingRef.current) {
      e.preventDefault()
      const i = idxFromClientX(e.clientX)
      // Snap pill to chosen tab before navigating for visual continuity
      snapPillToIdx(i)
      const target = items[i]
      if (target && i !== activeIdx) {
        haptic('success')
        navigate(target.path)
      } else {
        haptic('light')
      }
      // Small delay so the snap is visible, then return to default state
      window.setTimeout(() => close(), 60)
    }
    startRef.current = null
  }

  const onPointerCancel = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (peekingRef.current) close()
    startRef.current = null
  }

  // Sync hover to active when route changes & not peeking
  useEffect(() => {
    if (!peeking) setHoverIdx(activeIdx === -1 ? 0 : activeIdx)
  }, [activeIdx, peeking])

  // Re-measure on resize
  useEffect(() => {
    const onResize = () => { layoutRef.current = null }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Close on scroll
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
            ref={pillRef}
            className={`fv-nav-pill2 ${peeking ? 'is-peek' : ''}`}
            style={{ width: `calc((100% - 12px - 12px) / ${items.length})` }}
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
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M6 5h12M6 12h12M6 19h8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M3 5h.01M3 12h.01M3 19h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
}
function ProfileIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4.5 20c1.4-4 4-6 7.5-6s6.1 2 7.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}
