import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'

/* ───────── constants ───────── */
const STICK_GROW = 220       // px per second
const STICK_FALL = 720       // deg per second
const HERO_WALK  = 320       // px per second
const PLAT_Y_FROM_BOTTOM = 140
const PLAT_H = 220
const HERO_W = 36
const HERO_H = 44
const MIN_GAP = 60
const MAX_GAP = 220
const MIN_PW = 30
const MAX_PW = 110
const PERFECT_R = 8          // perfect-tap radius

type Phase = 'waiting' | 'growing' | 'falling' | 'walking' | 'falling_off' | 'gameover'

interface Plat { x: number; w: number }

/* ───────── component ───────── */
export default function StickHeroGame({ onExit }: { onExit: () => void }) {
  const lang = useStore((s) => s.lang)
  const scores = useStore((s) => s.stickHeroScores)
  const addScore = useStore((s) => s.addStickHeroScore)
  const { haptic } = useTelegram()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [score, setScore] = useState(0)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [over, setOver] = useState(false)

  // Mutable game state (avoid React rerenders on every frame)
  const stRef = useRef({
    phase: 'waiting' as Phase,
    cur: { x: 40, w: 70 } as Plat,
    next: { x: 200, w: 60 } as Plat,
    upcoming: null as Plat | null,
    stickLen: 0,
    stickAngle: 0,           // degrees, 0 = straight up
    heroX: 40 + 70 - HERO_W, // hero stands on right edge of cur platform
    heroY: 0,                // negative = falling
    cameraX: 0,
    score: 0,
    last: 0,
    perfect: false,
    perfectFlash: 0,
  })

  // Resize / DPR
  useEffect(() => {
    const cvs = canvasRef.current!
    const wrap = wrapRef.current!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      cvs.width = Math.floor(w * dpr)
      cvs.height = Math.floor(h * dpr)
      cvs.style.width = w + 'px'
      cvs.style.height = h + 'px'
      const ctx = cvs.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Init first platforms
  useEffect(() => {
    const cvs = canvasRef.current!
    const W = cvs.clientWidth
    const st = stRef.current
    const firstW = 90
    st.cur = { x: 30, w: firstW }
    st.heroX = st.cur.x + st.cur.w - HERO_W
    st.heroY = 0
    const gap = 80 + Math.random() * 60
    const nextW = 70
    st.next = { x: st.cur.x + st.cur.w + gap, y: 0, w: nextW } as Plat
    st.upcoming = null
    st.cameraX = 0
    st.phase = 'waiting'
    st.stickLen = 0
    st.stickAngle = 0
    st.score = 0
    st.last = performance.now()
    setScore(0)
    setOver(false)
    // ensure W var used
    void W
  }, [])

  // Game loop
  useEffect(() => {
    const cvs = canvasRef.current!
    const ctx = cvs.getContext('2d')!
    let raf = 0
    let alive = true

    const spawnNext = () => {
      const st = stRef.current
      const cvsW = cvs.clientWidth
      const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP)
      const w = MIN_PW + Math.random() * (MAX_PW - MIN_PW)
      const x = st.cur.x + st.cur.w + gap
      // make sure new next is mostly visible after camera shifts
      st.next = { x, w }
      void cvsW
    }

    const draw = () => {
      const W = cvs.clientWidth
      const H = cvs.clientHeight
      const st = stRef.current

      // BG gradient
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#0b0e14')
      g.addColorStop(0.55, '#101822')
      g.addColorStop(1, '#0a1410')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      // Subtle grid
      ctx.strokeStyle = 'rgba(57,255,99,0.04)'
      ctx.lineWidth = 1
      for (let y = 0; y < H; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      const seed = Math.floor(st.cameraX / 4)
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 73 + seed) % W)
        const sy = (i * 131) % (H - PLAT_Y_FROM_BOTTOM - 60)
        ctx.fillRect(sx, sy, 1.2, 1.2)
      }

      ctx.save()
      ctx.translate(-st.cameraX, 0)

      // Platforms
      const groundY = H - PLAT_Y_FROM_BOTTOM
      drawPlatform(ctx, st.cur, groundY)
      drawPlatform(ctx, st.next, groundY)

      // Stick
      const stickBaseX = st.cur.x + st.cur.w
      const stickBaseY = groundY
      ctx.save()
      ctx.translate(stickBaseX, stickBaseY)
      ctx.rotate((-90 + st.stickAngle) * Math.PI / 180) // start pointing up
      ctx.strokeStyle = '#39ff63'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.shadowColor = 'rgba(57,255,99,0.55)'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(st.stickLen, 0)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()

      // Hero (F glyph)
      drawHero(ctx, st.heroX, groundY + st.heroY)

      ctx.restore()

      // Perfect flash
      if (st.perfectFlash > 0) {
        ctx.fillStyle = `rgba(57,255,99,${st.perfectFlash * 0.18})`
        ctx.fillRect(0, 0, W, H)
      }

      // Foreground glow
      const fg = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H, H * 0.7)
      fg.addColorStop(0, 'rgba(57,255,99,0.06)')
      fg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, W, H)
    }

    const tick = (t: number) => {
      if (!alive) return
      const st = stRef.current
      const dt = Math.min(0.05, (t - st.last) / 1000)
      st.last = t

      if (st.perfectFlash > 0) st.perfectFlash = Math.max(0, st.perfectFlash - dt * 2.2)

      if (st.phase === 'growing') {
        st.stickLen += STICK_GROW * dt
      } else if (st.phase === 'falling') {
        st.stickAngle += STICK_FALL * dt
        if (st.stickAngle >= 90) {
          st.stickAngle = 90
          // determine outcome
          const stickTip = st.cur.x + st.cur.w + st.stickLen
          const nextL = st.next.x
          const nextR = st.next.x + st.next.w
          if (stickTip >= nextL && stickTip <= nextR) {
            // success
            const center = nextL + st.next.w / 2
            st.perfect = Math.abs(stickTip - center) <= PERFECT_R
            if (st.perfect) {
              st.score += 2
              st.perfectFlash = 1
              haptic('success')
            } else {
              st.score += 1
              haptic('light')
            }
            setScore(st.score)
            st.phase = 'walking'
          } else {
            haptic('error')
            st.phase = 'falling_off'
          }
        }
      } else if (st.phase === 'walking') {
        const target = st.next.x + st.next.w - HERO_W
        const dir = target > st.heroX ? 1 : -1
        st.heroX += dir * HERO_WALK * dt
        if ((dir > 0 && st.heroX >= target) || (dir < 0 && st.heroX <= target)) {
          st.heroX = target
          // shift world: cur becomes next
          const shift = st.next.x - st.cur.x
          // smooth camera
          animateCamera(st, shift, () => {
            st.cur = { ...st.next }
            st.heroX = st.cur.x + st.cur.w - HERO_W
            st.cameraX = st.cur.x - 30
            spawnNext()
            st.stickLen = 0
            st.stickAngle = 0
            st.phase = 'waiting'
          })
        }
      } else if (st.phase === 'camera') {
        // camera animation handled inline below via cameraTween
        cameraTween(st, dt)
      } else if (st.phase === 'falling_off') {
        // hero walks to end of stick then falls
        const stickTip = st.cur.x + st.cur.w + st.stickLen
        const target = stickTip - HERO_W / 2
        if (st.heroX < target) {
          st.heroX += HERO_WALK * dt
          if (st.heroX > target) st.heroX = target
        } else {
          st.heroY += 900 * dt * dt + 60 * dt
          if (st.heroY > 600) {
            st.phase = 'gameover'
            setOver(true)
            addScore(st.score)
          }
        }
      }

      draw()
      raf = requestAnimationFrame(tick)
    }

    stRef.current.last = performance.now()
    raf = requestAnimationFrame(tick)
    return () => { alive = false; cancelAnimationFrame(raf) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Touch/mouse handlers
  useEffect(() => {
    const wrap = wrapRef.current!
    const onDown = (e: PointerEvent) => {
      const st = stRef.current
      if (st.phase !== 'waiting') return
      st.phase = 'growing'
      st.stickLen = 0
      st.stickAngle = 0
      haptic('selection')
      e.preventDefault()
    }
    const onUp = (e: PointerEvent) => {
      const st = stRef.current
      if (st.phase !== 'growing') return
      st.phase = 'falling'
      haptic('light')
      e.preventDefault()
    }
    wrap.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      wrap.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const restart = () => {
    const st = stRef.current
    st.cur = { x: 30, w: 90 }
    st.heroX = st.cur.x + st.cur.w - HERO_W
    st.heroY = 0
    const gap = 80 + Math.random() * 60
    st.next = { x: st.cur.x + st.cur.w + gap, w: 70 }
    st.cameraX = 0
    st.phase = 'waiting'
    st.stickLen = 0
    st.stickAngle = 0
    st.score = 0
    st.perfectFlash = 0
    setScore(0)
    setOver(false)
  }

  const top10 = [...scores].sort((a, b) => b.score - a.score).slice(0, 10)
  const best = top10[0]?.score ?? 0
  const T = (ru: string, en: string) => (lang === 'ru' ? ru : en)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        touchAction: 'none', userSelect: 'none', overflow: 'hidden',
      }}
    >
      {/* HUD */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        <button
          onClick={onExit}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(20,24,30,0.7)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '8px 12px',
            color: '#fff', fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          {T('Меню', 'Menu')}
        </button>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'rgba(20,24,30,0.7)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(57,255,99,0.18)',
          borderRadius: 14, padding: '6px 16px',
        }}>
          <div style={{ fontSize: 10, color: '#7a8693', letterSpacing: '0.12em', fontWeight: 700 }}>SCORE</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#39ff63', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{score}</div>
        </div>
        <button
          onClick={() => setShowLeaderboard(true)}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(20,24,30,0.7)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '8px 10px',
            color: '#fff', display: 'flex', alignItems: 'center', gap: 4,
          }}
          aria-label="Top players"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffcb3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M17 4h3v3a4 4 0 0 1-4 4M7 4H4v3a4 4 0 0 0 4 4M17 4H7v6a5 5 0 0 0 10 0V4Z"/></svg>
        </button>
      </div>

      {/* Best banner */}
      {best > 0 && !over && (
        <div style={{
          position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)',
          fontSize: 11, color: '#7a8693', fontWeight: 600, zIndex: 4,
          background: 'rgba(20,24,30,0.55)', borderRadius: 8, padding: '3px 10px',
        }}>
          {T('Рекорд', 'Best')}: <b style={{ color: '#fff' }}>{best}</b>
        </div>
      )}

      {/* Hint */}
      <AnimatePresence>
        {score === 0 && !over && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              position: 'absolute', bottom: 80, left: 0, right: 0,
              textAlign: 'center', color: 'rgba(255,255,255,0.7)',
              fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
              pointerEvents: 'none', zIndex: 3,
            }}
          >
            {T('Удерживай экран — растягивай палку', 'Hold the screen — stretch the stick')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas */}
      <div ref={wrapRef} style={{ flex: 1, position: 'relative' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {/* Game over */}
      <AnimatePresence>
        {over && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 20,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              style={{
                background: 'linear-gradient(180deg,#10161e,#0a0e14)',
                border: '1px solid rgba(57,255,99,0.22)',
                borderRadius: 24, padding: 28, width: '100%', maxWidth: 340,
                textAlign: 'center', color: '#fff',
                boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(57,255,99,0.15)',
              }}
            >
              <div style={{ fontSize: 12, color: '#7a8693', letterSpacing: '0.18em', fontWeight: 700 }}>
                GAME OVER
              </div>
              <div style={{ fontSize: 64, fontWeight: 900, color: '#39ff63', margin: '8px 0', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {score}
              </div>
              <div style={{ fontSize: 13, color: '#a8b2bf', marginBottom: 18 }}>
                {score > best - 1 && score === scores.sort((a,b)=>b.score-a.score)[0]?.score
                  ? T('Новый рекорд!', 'New record!')
                  : T(`Рекорд: ${best}`, `Best: ${best}`)}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowLeaderboard(true)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#fff', fontWeight: 700, fontSize: 13,
                  }}
                >
                  {T('Топ', 'Top')}
                </button>
                <button
                  onClick={restart}
                  style={{
                    flex: 1.4, padding: '12px', borderRadius: 12,
                    background: 'linear-gradient(180deg,#39ff63,#1fe07a)',
                    color: '#062612', fontWeight: 900, fontSize: 14,
                    boxShadow: '0 8px 22px rgba(57,255,99,0.35)',
                  }}
                >
                  {T('Ещё раз', 'Replay')}
                </button>
              </div>
              <button
                onClick={onExit}
                style={{
                  marginTop: 10, width: '100%', padding: '10px',
                  background: 'transparent', color: '#7a8693',
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                }}
              >
                {T('ВЫЙТИ В МЕНЮ', 'EXIT TO MENU')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLeaderboard(false)}
            style={{
              position: 'absolute', inset: 0, zIndex: 30,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(180deg,#11181f,#0a0e14)',
                border: '1px solid rgba(57,255,99,0.2)',
                borderRadius: 22, padding: 22, width: '100%', maxWidth: 360,
                color: '#fff',
                boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffcb3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M17 4h3v3a4 4 0 0 1-4 4M7 4H4v3a4 4 0 0 0 4 4M17 4H7v6a5 5 0 0 0 10 0V4Z"/></svg>
                  <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.01em' }}>
                    {T('Топ игроков', 'Top players')}
                  </div>
                </div>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  style={{ color: '#7a8693', fontSize: 20, padding: 4 }}
                >×</button>
              </div>
              {top10.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: '#7a8693', fontSize: 13 }}>
                  {T('Пока нет результатов. Сыграй первым!', 'No scores yet. Be the first!')}
                </div>
              ) : (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {top10.map((s, i) => (
                    <li
                      key={s.ts}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10,
                        background: i < 3 ? 'rgba(57,255,99,0.06)' : 'rgba(255,255,255,0.025)',
                        border: i === 0 ? '1px solid rgba(255,203,58,0.3)' : '1px solid transparent',
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 8,
                        display: 'grid', placeItems: 'center',
                        background: i === 0 ? '#ffcb3a' : i === 1 ? '#cfd6df' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.06)',
                        color: i < 3 ? '#0a0e14' : '#7a8693',
                        fontWeight: 900, fontSize: 12,
                      }}>{i + 1}</div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        @{s.name}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#39ff63', fontVariantNumeric: 'tabular-nums' }}>
                        {s.score}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ───────── helpers ───────── */
function drawPlatform(ctx: CanvasRenderingContext2D, p: Plat, groundY: number) {
  // Body
  const grad = ctx.createLinearGradient(0, groundY, 0, groundY + PLAT_H)
  grad.addColorStop(0, '#1d2630')
  grad.addColorStop(1, '#0a0e14')
  ctx.fillStyle = grad
  ctx.fillRect(p.x, groundY, p.w, PLAT_H)
  // Top edge highlight
  ctx.fillStyle = '#39ff63'
  ctx.fillRect(p.x, groundY - 2, p.w, 2)
  // Soft side line
  ctx.fillStyle = 'rgba(57,255,99,0.15)'
  ctx.fillRect(p.x, groundY, 1, PLAT_H)
  ctx.fillRect(p.x + p.w - 1, groundY, 1, PLAT_H)
  // Center perfect dot
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.beginPath()
  ctx.arc(p.x + p.w / 2, groundY + 6, 1.6, 0, Math.PI * 2)
  ctx.fill()
}

function drawHero(ctx: CanvasRenderingContext2D, x: number, baseY: number) {
  // baseY is the platform top; hero stands on it
  const y = baseY - HERO_H
  // Body (rounded square)
  const r = 8
  ctx.fillStyle = '#39ff63'
  roundRect(ctx, x, y, HERO_W, HERO_H, r)
  ctx.fill()
  // Glow outline
  ctx.strokeStyle = 'rgba(57,255,99,0.6)'
  ctx.lineWidth = 1.5
  ctx.shadowColor = 'rgba(57,255,99,0.7)'
  ctx.shadowBlur = 10
  ctx.stroke()
  ctx.shadowBlur = 0
  // F letter
  ctx.fillStyle = '#062612'
  ctx.font = '900 26px ui-sans-serif, system-ui, -apple-system'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('F', x + HERO_W / 2, y + HERO_H / 2 + 1)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/* Smooth camera shift used during walking */
type CameraSt = { cameraX: number; cameraTargetX?: number; cameraStartX?: number; cameraT?: number; cameraDur?: number; phase: Phase }
function animateCamera(st: any, _shift: number, done: () => void) {
  // immediately do the swap; camera will catch up in cameraTween
  const targetCameraX = st.next.x - 30
  st.cameraStartX = st.cameraX
  st.cameraTargetX = targetCameraX
  st.cameraT = 0
  st.cameraDur = 0.35
  st.cameraDone = done
  st.phase = 'camera'
}
function cameraTween(st: any, dt: number) {
  st.cameraT += dt
  const k = Math.min(1, st.cameraT / st.cameraDur)
  const e = 1 - Math.pow(1 - k, 3) // easeOutCubic
  st.cameraX = st.cameraStartX + (st.cameraTargetX - st.cameraStartX) * e
  if (k >= 1) {
    st.cameraDone?.()
  }
}
void {} as CameraSt
