import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { useStore } from '../store'

interface Props {
  open: boolean
  onClose: () => void
}

const DISPLAY = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"
const GREEN = '#39ff63'
const INK = '#0a0a0a'

// Mock referral pool — used to render entries based on user.ref_count
const REFERRAL_POOL: { username: string; nickname: string; daysAgo: number; hue: number }[] = [
  { username: 'crypto_max',     nickname: 'Max',       daysAgo: 1,  hue: 142 },
  { username: 'lena_diamond',   nickname: 'Lena',      daysAgo: 3,  hue: 320 },
  { username: '',               nickname: 'Anonymous', daysAgo: 6,  hue: 24  },
  { username: 'nova_trader',    nickname: 'Nova',      daysAgo: 9,  hue: 200 },
  { username: 'shadow_99',      nickname: 'Shadow',    daysAgo: 14, hue: 270 },
  { username: 'rin_satoshi',    nickname: 'Rin',       daysAgo: 18, hue: 50  },
  { username: '',               nickname: 'Guest',     daysAgo: 24, hue: 12  },
  { username: 'leo_btc',        nickname: 'Leo',       daysAgo: 30, hue: 180 },
  { username: 'mira_x',         nickname: 'Mira',      daysAgo: 41, hue: 340 },
  { username: 'kai_eth',        nickname: 'Kai',       daysAgo: 55, hue: 100 },
]

export default function ReferralList({ open, onClose }: Props) {
  const lang = useStore((s) => s.lang)
  const user = useStore((s) => s.user)

  const referrals = useMemo(() => {
    if (!user) return []
    const now = Date.now()
    return REFERRAL_POOL.slice(0, Math.max(0, user.ref_count)).map((r, i) => ({
      ...r,
      id: `ref-${i}`,
      joinedAt: new Date(now - r.daysAgo * 86400000).toISOString(),
    }))
  }, [user])

  if (!user) return null

  const totalEarned = user.ref_earned

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(
      lang === 'ru' ? 'ru-RU' : 'en-US',
      { day: 'numeric', month: 'short', year: 'numeric' }
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.78)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              zIndex: 100,
            }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose() }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 101,
              background: INK,
              borderTop: `1px solid rgba(57,255,99,0.2)`,
              borderRadius: '24px 24px 0 0',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: DISPLAY,
              color: '#fff',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0, cursor: 'grab', touchAction: 'none' }}>
              <div style={{ width: 42, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
            </div>

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 22px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontFamily: MONO }}>
                  /referrals
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 2 }}>
                  {lang === 'ru' ? 'Мои рефералы' : 'My Referrals'}
                </div>
              </div>
              <motion.button
                onClick={onClose}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff', fontSize: 18, lineHeight: 1, cursor: 'pointer',
                }}
              >×</motion.button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 22px 32px' }}>
              {/* Earnings hero */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: 18,
                  padding: '22px 22px 24px',
                  background: `radial-gradient(circle at 100% 0%, rgba(57,255,99,0.18), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))`,
                  border: '1px solid rgba(57,255,99,0.22)',
                  overflow: 'hidden',
                  marginBottom: 22,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontFamily: MONO }}>
                  {lang === 'ru' ? 'Всего заработано' : 'Total earned'}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>$</span>
                  <span style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-0.03em', color: GREEN, lineHeight: 1 }}>
                    {totalEarned.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                  <div style={{
                    background: 'rgba(57,255,99,0.12)',
                    border: '1px solid rgba(57,255,99,0.25)',
                    color: GREEN,
                    fontFamily: MONO,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 999,
                    letterSpacing: '0.05em',
                  }}>
                    {user.ref_count} {lang === 'ru' ? 'РЕФЕРАЛОВ' : 'REFERRALS'}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>
                    × $5
                  </div>
                </div>
              </div>

              {/* History header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontFamily: MONO }}>
                  {lang === 'ru' ? '/История' : '/History'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: MONO }}>
                  {referrals.length}
                </div>
              </div>

              {referrals.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 13,
                }}>
                  {lang === 'ru' ? 'Пока нет рефералов' : 'No referrals yet'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {referrals.map((r, i) => {
                    const displayName = r.username ? `@${r.username}` : r.nickname
                    const initial = (r.username || r.nickname).charAt(0).toUpperCase()
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.035, type: 'spring', stiffness: 320, damping: 26 }}
                        style={{
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 14,
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, hsl(${r.hue} 70% 55%), hsl(${(r.hue + 40) % 360} 65% 35%))`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: DISPLAY,
                            fontSize: 16,
                            fontWeight: 800,
                            color: '#fff',
                            flexShrink: 0,
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                          }}
                        >
                          {initial}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {displayName}
                          </div>
                          <div style={{
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.4)',
                            fontFamily: MONO,
                            marginTop: 2,
                          }}>
                            {formatDate(r.joinedAt)}
                          </div>
                        </div>

                        <div style={{
                          fontFamily: MONO,
                          fontSize: 13,
                          fontWeight: 700,
                          color: GREEN,
                          background: 'rgba(57,255,99,0.08)',
                          border: '1px solid rgba(57,255,99,0.18)',
                          padding: '5px 10px',
                          borderRadius: 8,
                          flexShrink: 0,
                        }}>
                          +$5
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
