import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ReferralList({ open, onClose }: Props) {
  const lang = useStore((s) => s.lang)
  const user = useStore((s) => s.user)
  const refDailyLog = useStore((s) => s.refDailyLog)
  const refReward = useStore((s) => s.refReward)

  if (!user) return null

  const entries = Object.entries(refDailyLog)
    .sort(([a], [b]) => b.localeCompare(a))

  const totalEarned = user.ref_earned
  const GOAL = 10
  const progress = Math.min(refReward.count, GOAL)
  const bonusEarned = refReward.claimed
  const pct = (progress / GOAL) * 100

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(
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
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 100,
            }}
          />
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 101,
              maxHeight: '85vh',
              overflowY: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--b-default)' }} />
            </div>

            <div className="row-between" style={{ padding: '8px 20px 12px', flexShrink: 0 }}>
              <div className="t-lg fw-black">
                {lang === 'ru' ? 'Мои рефералы' : 'My Referrals'}
              </div>
              <motion.button onClick={onClose} whileTap={{ scale: 0.9 }} style={{ color: 'var(--t-muted)', fontSize: 20, lineHeight: 1 }}>×</motion.button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 28px' }}>
              {/* Total earned */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(232,54,93,0.1), rgba(151,114,255,0.08))',
                border: '1px solid rgba(232,54,93,0.2)',
                borderRadius: 14,
                padding: '16px',
                marginBottom: 16,
              }}>
                <div className="t-xs t-muted">
                  {lang === 'ru' ? 'Всего заработано' : 'Total earned'}
                </div>
                <div className="t-xl fw-black" style={{ color: 'var(--brand)' }}>
                  ${totalEarned.toFixed(2)}
                </div>
                <div className="t-xs t-muted" style={{ marginTop: 4 }}>
                  {user.ref_count} {lang === 'ru' ? 'рефералов' : 'referrals'}
                </div>
              </div>

              {/* Monthly bonus progress */}
              <div style={{
                background: 'var(--surface-2)',
                borderRadius: 12,
                padding: '14px',
                marginBottom: 20,
              }}>
                <div className="row-between mb-1">
                  <div className="t-sm fw-bold">
                    {lang === 'ru' ? '🎯 Бонус месяца' : '🎯 Monthly Bonus'}
                  </div>
                  <div className="t-xs fw-bold" style={{ color: bonusEarned ? 'var(--success)' : 'var(--brand)' }}>
                    {bonusEarned ? '✓ +$50' : `${progress}/${GOAL}`}
                  </div>
                </div>
                <div style={{ background: 'var(--b-default)', borderRadius: 6, height: 6, overflow: 'hidden', marginBottom: 8 }}>
                  <motion.div
                    style={{
                      height: '100%',
                      background: bonusEarned ? 'var(--success)' : 'var(--brand)',
                      borderRadius: 6,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <div className="t-xs t-muted">
                  {bonusEarned
                    ? (lang === 'ru' ? 'Бонус $50 получен!' : '$50 bonus claimed!')
                    : (lang === 'ru'
                      ? `Ещё ${GOAL - progress} до бонуса $50`
                      : `${GOAL - progress} more for $50 bonus`)}
                </div>
              </div>

              {/* Daily log */}
              <div className="t-sm fw-bold mb-3">
                {lang === 'ru' ? 'История' : 'History'}
              </div>

              {entries.length === 0 ? (
                <div className="t-sm t-muted" style={{ textAlign: 'center', padding: '32px 0' }}>
                  {lang === 'ru' ? 'Пока нет рефералов' : 'No referrals yet'}
                </div>
              ) : (
                <div className="col gap-2">
                  {entries.map(([date, count], i) => (
                    <motion.div
                      key={date}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
                      style={{
                        background: 'var(--surface-2)',
                        borderRadius: 10,
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div className="t-sm fw-bold">{formatDate(date)}</div>
                        <div className="t-xs t-muted">
                          +${(count * 5).toFixed(0)} {lang === 'ru' ? 'заработано' : 'earned'}
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(73,242,100,0.1)',
                        color: 'var(--success)',
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 13,
                        fontWeight: 800,
                      }}>
                        +{count}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
