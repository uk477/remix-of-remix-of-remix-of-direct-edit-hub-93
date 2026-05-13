import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { useT } from '../i18n'
import { useStore } from '../store'
import { useTelegram } from '../hooks/useTelegram'
import { useToast } from '../components/Toast'
import { CONFIG } from '../config'
import type { Lang } from '../store/types'
import type { SiteContent } from '../store'

const NEON = '#00FF88'
const FONT_LINK_ID = 'fv-settings-fonts'
const inter = "'Inter', system-ui, sans-serif"
const mono  = "'Space Mono', ui-monospace, monospace"

const DocIcon     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
const RulesIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
const ContactIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
const ReferralIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const StarIcon     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const EditIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
const BackIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
const ChevronIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }
const fadeUp = { hidden: { opacity: 0, y: 18, filter: 'blur(6px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }

function LangToggle() {
  const lang    = useStore((s) => s.lang)
  const setLang = useStore((s) => s.setLang)
  const { haptic } = useTelegram()
  const toast   = useToast()

  const toggle = (l: Lang) => {
    if (l === lang) return
    haptic('light')
    setLang(l)
    toast.show(l === 'ru' ? 'Русский язык включён' : 'English enabled', 'success')
  }

  return (
    <div className="lang-toggle">
      <motion.div
        className="lang-track"
        animate={{ x: lang === 'en' ? '100%' : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
      <button className={`lang-btn${lang === 'ru' ? ' active' : ''}`} onClick={() => toggle('ru')}>RU</button>
      <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => toggle('en')}>EN</button>
    </div>
  )
}

function ContentSheet({
  title, contentKey, onClose,
}: {
  title: string; contentKey: keyof SiteContent; onClose: () => void
}) {
  const lang        = useStore((s) => s.lang)
  const isAdmin     = useStore((s) => s.isAdmin)
  const siteContent = useStore((s) => s.siteContent)
  const setSiteContent = useStore((s) => s.setSiteContent)
  const { haptic }  = useTelegram()
  const toast       = useToast()
  const [editing, setEditing] = useState(false)
  const langKey = (contentKey.endsWith('_ru') || contentKey.endsWith('_en')
    ? contentKey
    : `${contentKey}_${lang}`) as keyof SiteContent
  const [draft, setDraft]     = useState(siteContent[langKey] ?? '')
  const admin = isAdmin()

  const defaultTexts: Partial<Record<keyof SiteContent, string>> = {
    offer_ru: `## Публичная оферта

Настоящий документ является официальным предложением **Fanvue Market** на оказание услуг по продаже цифровых товаров и аккаунтов платформы Fanvue.

## Предмет договора

Продавец передаёт покупателю цифровой товар в соответствии с описанием на странице. Покупатель оплачивает товар в **полном объёме** до его получения.

## Условия оплаты

Оплата производится криптовалютой через встроенную систему. Сумма фиксируется в **USD** на момент создания заказа. Оплата должна поступить в течение **30 минут**.

## Доставка

**Автоматическая доставка** — товар передаётся сразу после подтверждения оплаты.

**Ручная доставка** — администратор передаёт товар в течение **1–24 часов**. После оплаты напишите в поддержку с ID заказа.

## Возврат и гарантии

Возврат возможен в течение **24 часов**, если товар не был использован.`,
    offer_en: `## Public Offer

This document is the official offer of **Fanvue Market** for the sale of digital goods and Fanvue platform accounts.

## Payment Terms

Payment is made in cryptocurrency. The amount is fixed in **USD** at order creation. Payment must arrive within **30 minutes**.

## Delivery

**Automatic** — product transferred immediately after payment. **Manual** — within 1–24 hours, contact support with your order ID.

## Returns

Returns accepted within **24 hours** if the product has not been used.`,
    rules_ru: `## Правила использования

Используя **Fanvue Market**, вы принимаете настоящие правила.

## Реферальная программа

За каждую покупку приглашённого вами друга вы получаете **$5** на реферальный баланс.

## Бонусное вознаграждение

Пригласите **10 пользователей** за месяц, каждый из которых совершит покупку — получите **бонус $50** автоматически.

• Счётчик обнуляется в начале каждого месяца
• Минимальная сумма вывода: **$10**`,
    rules_en: `## Terms of Use

By using **Fanvue Market** you accept these rules.

## Referral Program

Earn **$5** for every purchase made by a user you invited.

## Bonus Reward

Invite **10 users** who each make a purchase in a month — earn an automatic **$50 bonus**.

• Counter resets monthly
• Minimum withdrawal: **$10**`,
    referral_rules_ru: `## Реферальная программа Fanvue Market

### Как это работает
Приглашайте друзей в Fanvue Market и зарабатывайте с каждой их покупки!

### Условия
• **$5** за каждого приглашённого друга, совершившего покупку
• Бонус начисляется после первого оплаченного заказа реферала
• Реферальные средства отображаются на отдельном балансе

### Ежемесячный бонус
• Пригласите **10 активных клиентов** за месяц
• Каждый из них должен совершить хотя бы 1 заказ
• Получите дополнительно **$100** к реферальному балансу
• Счётчик обновляется 1-го числа каждого месяца

### Вывод средств
• Минимальная сумма вывода: **$10**
• Доступные валюты: USDT (TRC20/ERC20), ETH, BTC, SOL, USDC
• Срок обработки: до **24 часов**
• Комиссия сети оплачивается из суммы вывода

### Правила
• Запрещены самоприглашения и мультиаккаунты
• Администрация оставляет за собой право отклонить подозрительные заявки
• Программа может быть изменена с уведомлением участников`,
    referral_rules_en: `## Fanvue Market Referral Program

### How It Works
Invite friends to Fanvue Market and earn from every purchase they make!

### Terms
• **$5** for each invited friend who makes a purchase
• Bonus is credited after the referral's first paid order
• Referral funds appear on a separate balance

### Monthly Bonus
• Invite **10 active clients** within a calendar month
• Each must complete at least 1 order
• Receive an additional **$100** to your referral balance
• Counter resets on the 1st of each month

### Withdrawal
• Minimum withdrawal: **$10**
• Available currencies: USDT (TRC20/ERC20), ETH, BTC, SOL, USDC
• Processing time: up to **24 hours**
• Network fees are deducted from the withdrawal amount

### Rules
• Self-referrals and multi-accounts are prohibited
• Administration reserves the right to decline suspicious requests
• Program terms may change with prior notice to participants`,
    contacts_ru: `## Контакты

**Поддержка** — вкладка в нижнем меню, ответ до 30 минут.

Бот: **@${CONFIG.botUsername}**
Канал: **@${CONFIG.channelUsername}**
Сообщество: **@${CONFIG.communityUsername}**

При обращении всегда указывайте **ID заказа**.`,
    contacts_en: `## Contacts

**Support** — bottom menu tab, response within 30 minutes.

Bot: **@${CONFIG.botUsername}**
Channel: **@${CONFIG.channelUsername}**
Community: **@${CONFIG.communityUsername}**

Always provide your **Order ID** when contacting support.`,
  }

  const displayText = siteContent[langKey] || defaultTexts[langKey] || ''

  const handleSave = () => {
    setSiteContent(langKey, draft)
    setEditing(false)
    haptic('success')
    toast.show(lang === 'ru' ? 'Сохранено' : 'Saved', 'success')
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget && !editing) onClose() }}
    >
      <motion.div
        className="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        style={{ maxHeight: '85dvh' }}
        drag={!editing ? 'y' : false}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={(_, info) => { if (!editing && info.offset.y > 80) onClose() }}
      >
        <div className="sheet-handle" style={{ cursor: 'grab' }} />
        <div className="row-between mb-4">
          <div className="t-md fw-black">{title}</div>
          <div className="row gap-2">
            {admin && !editing && (
              <motion.button
                className="card"
                style={{ padding: '6px 12px', color: 'var(--brand)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => { setDraft(siteContent[contentKey]); setEditing(true) }}
                whileTap={{ scale: 0.95 }}
              >
                <EditIcon /> {lang === 'ru' ? 'Изменить' : 'Edit'}
              </motion.button>
            )}
            <motion.button
              className="card"
              style={{ padding: '6px 12px', color: 'var(--t-muted)', fontSize: 12 }}
              onClick={onClose}
              whileTap={{ scale: 0.95 }}
            >
              {lang === 'ru' ? 'Закрыть' : 'Close'}
            </motion.button>
          </div>
        </div>

        {editing ? (
          <>
            <textarea
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={lang === 'ru' ? 'Введите текст...' : 'Enter text...'}
              style={{ width: '100%', minHeight: 200, borderRadius: 12, padding: '12px 14px', resize: 'vertical', lineHeight: 1.6 }}
            />
            <div className="row gap-2 mt-3">
              <motion.button className="btn btn-primary" onClick={handleSave} whileTap={{ scale: 0.97 }} style={{ flex: 1 }}>
                {lang === 'ru' ? 'Сохранить' : 'Save'}
              </motion.button>
              <motion.button className="btn btn-secondary" onClick={() => setEditing(false)} whileTap={{ scale: 0.97 }}>
                {lang === 'ru' ? 'Отмена' : 'Cancel'}
              </motion.button>
            </div>
          </>
        ) : (
          <motion.div
            style={{ overflowY: 'auto', maxHeight: '60dvh', paddingRight: 4 }}
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } } }}
          >
            {(() => {
              const lines = displayText.split('\n')
              const renderInline = (text: string) => {
                // Tokenize: **bold**, *italic*, `code`, [text](url)
                const tokens: Array<JSX.Element | string> = []
                const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
                let lastIdx = 0
                let m: RegExpExecArray | null
                let key = 0
                while ((m = regex.exec(text)) !== null) {
                  if (m.index > lastIdx) tokens.push(text.slice(lastIdx, m.index))
                  const tok = m[0]
                  if (tok.startsWith('**')) {
                    tokens.push(<strong key={key++} style={{ color: '#fff', fontWeight: 800 }}>{tok.slice(2, -2)}</strong>)
                  } else if (tok.startsWith('`')) {
                    tokens.push(
                      <code key={key++} style={{
                        fontFamily: mono, fontSize: 12, padding: '2px 6px',
                        background: `${NEON}1A`, color: NEON, borderRadius: 6,
                        border: `1px solid ${NEON}33`,
                      }}>{tok.slice(1, -1)}</code>
                    )
                  } else if (tok.startsWith('[')) {
                    const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!
                    tokens.push(
                      <a key={key++} href={mm[2]} target="_blank" rel="noreferrer" style={{ color: NEON, borderBottom: `1px dashed ${NEON}66`, textDecoration: 'none' }}>
                        {mm[1]}
                      </a>
                    )
                  } else if (tok.startsWith('*')) {
                    tokens.push(<em key={key++} style={{ color: 'rgba(255,255,255,0.85)' }}>{tok.slice(1, -1)}</em>)
                  }
                  lastIdx = m.index + tok.length
                }
                if (lastIdx < text.length) tokens.push(text.slice(lastIdx))
                return tokens
              }

              const itemVariant = {
                hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
                show:   { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
              }

              return lines.map((line, i) => {
                if (line.startsWith('### ')) {
                  return (
                    <motion.div key={i} variants={itemVariant} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginTop: 18, marginBottom: 8,
                    }}>
                      <div style={{ width: 3, height: 14, background: NEON, borderRadius: 2 }} />
                      <span style={{
                        fontSize: 13, fontWeight: 800, color: '#fff',
                        letterSpacing: '-0.01em',
                      }}>{line.slice(4)}</span>
                    </motion.div>
                  )
                }
                if (line.startsWith('## ')) {
                  return (
                    <motion.div key={i} variants={itemVariant} style={{ marginTop: i === 0 ? 4 : 24, marginBottom: 10 }}>
                      <div style={{ fontFamily: mono, fontSize: 9, color: NEON, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
                        § {String(i + 1).padStart(2, '0')}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        {line.slice(3)}
                      </div>
                      <div style={{ marginTop: 8, height: 1, background: `linear-gradient(90deg, ${NEON}55, transparent)` }} />
                    </motion.div>
                  )
                }
                if (/^\s*[•\-]\s+/.test(line)) {
                  return (
                    <motion.div key={i} variants={itemVariant} style={{
                      display: 'flex', gap: 10, marginBottom: 6, paddingLeft: 4,
                    }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: NEON, marginTop: 9, flexShrink: 0,
                        boxShadow: `0 0 8px ${NEON}66`,
                      }} />
                      <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.78)' }}>
                        {renderInline(line.replace(/^\s*[•\-]\s+/, ''))}
                      </div>
                    </motion.div>
                  )
                }
                if (line.trim() === '') return <div key={i} style={{ height: 8 }} />
                return (
                  <motion.div key={i} variants={itemVariant} style={{
                    fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)',
                    marginBottom: 4,
                  }}>
                    {renderInline(line)}
                  </motion.div>
                )
              })
            })()}

            {/* End ornament */}
            <motion.div
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 0.3 } } }}
              style={{
                marginTop: 24, marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
              }}
            >
              <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em' }}>END · v2.0.0</span>
              <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const t        = useT()
  const lang     = useStore((s) => s.lang)
  const setLang  = useStore((s) => s.setLang)
  const { haptic } = useTelegram()
  const toast    = useToast()
  const [openSheet, setOpenSheet] = useState<keyof SiteContent | null>(null)

  // Inject Inter + Space Mono once (scoped via CSS classes below)
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return
    const link = document.createElement('link')
    link.id = FONT_LINK_ID
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,500;0,900;1,900&family=Space+Mono:wght@400;700&display=swap'
    document.head.appendChild(link)
  }, [])

  const switchLang = (l: Lang) => {
    if (l === lang) return
    haptic('light')
    setLang(l)
    toast.show(l === 'ru' ? 'Русский язык включён' : 'English enabled', 'success')
  }

  type Link = { key: keyof SiteContent; label: string }
  const links: Link[] = [
    { key: (lang === 'ru' ? 'offer_ru'          : 'offer_en')          as keyof SiteContent, label: t('settings_offer')    },
    { key: (lang === 'ru' ? 'rules_ru'          : 'rules_en')          as keyof SiteContent, label: t('settings_rules')    },
    { key: (lang === 'ru' ? 'referral_rules_ru' : 'referral_rules_en') as keyof SiteContent, label: t('settings_referral') },
    { key: (lang === 'ru' ? 'contacts_ru'       : 'contacts_en')       as keyof SiteContent, label: t('settings_contact')  },
  ]


  return (
    <PageTransition>
      <motion.div
        className="page"
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{ position: 'relative', overflow: 'hidden', fontFamily: inter }}
      >
        {/* Background mesh blurs */}
        <div style={{ position: 'absolute', top: '-10%', right: '-25%', width: 320, height: 320, background: `${NEON}1A`, filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '8%', left: '-25%', width: 260, height: 260, background: `${NEON}0D`, filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

        {/* Decorative hairlines */}
        <div style={{ position: 'absolute', top: 0, left: 48, width: 1, height: '100%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, right: 48, width: 1, height: '100%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header — back only */}
          <motion.div variants={fadeUp} style={{ marginBottom: 18 }}>
            <motion.button
              onClick={() => navigate(-1)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ x: -2 }}
              style={{
                width: 42, height: 42, borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer',
              }}
            >
              <BackIcon />
            </motion.button>
          </motion.div>

          {/* HERO TYPOGRAPHY */}
          <motion.div variants={fadeUp} style={{ position: 'relative', marginBottom: 28 }}>
            <div style={{
              position: 'absolute', top: -14, left: -6,
              fontSize: 76, fontWeight: 900, fontStyle: 'italic',
              color: 'rgba(255,255,255,0.04)', lineHeight: 1, letterSpacing: '-0.04em',
              userSelect: 'none', pointerEvents: 'none', fontFamily: inter,
            }}>
              FANVUE
            </div>
            <h1 style={{
              fontSize: 46, fontWeight: 900, fontStyle: 'italic',
              letterSpacing: '-0.045em', lineHeight: 0.92, margin: 0,
              fontFamily: inter, color: '#fff',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <motion.span
                  initial={{ opacity: 0, scale: 0.6, rotate: -18 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                  whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.6 } }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 46, height: 46, marginRight: 2,
                    position: 'relative',
                  }}
                >
                  {/* Neon halo behind logo */}
                  <motion.span
                    aria-hidden
                    animate={{ opacity: [0.5, 0.95, 0.5], scale: [0.95, 1.08, 0.95] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute', inset: -6, borderRadius: '50%',
                      background: `radial-gradient(circle, ${NEON}55, transparent 65%)`,
                      filter: 'blur(8px)', pointerEvents: 'none',
                    }}
                  />
                  <FanvueLogo size={42} />
                </motion.span>
                <span style={{ transform: 'translateY(1px)' }}>anvue</span>
              </span>
              <span style={{ color: NEON }}>MARKET</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                Internal Build · v2.0.0
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>
          </motion.div>

          {/* ASYMMETRIC BENTO — compact */}
          <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            {/* LANGUAGE — compact tile with segmented toggle */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              style={{
                height: 140, background: NEON, borderRadius: 22, padding: 14,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                position: 'relative', overflow: 'hidden',
                boxShadow: `0 12px 40px -12px ${NEON}55, inset 0 0 0 1px rgba(255,255,255,0.15)`,
              }}>
              {/* Scan-line shimmer */}
              <motion.div
                aria-hidden
                initial={{ y: '-120%' }}
                animate={{ y: '220%' }}
                transition={{ duration: 3.6, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', left: 0, right: 0, height: 60,
                  background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.25), transparent)',
                  pointerEvents: 'none',
                }}
              />
              <div style={{
                position: 'absolute', right: -10, bottom: -22,
                fontSize: 78, fontWeight: 900, fontStyle: 'italic',
                color: 'rgba(0,0,0,0.08)', lineHeight: 1, fontFamily: inter,
                userSelect: 'none', pointerEvents: 'none',
              }}>
                {lang === 'ru' ? 'RU' : 'EN'}
              </div>
              <div style={{ color: '#000', position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.55 }}>
                    Language
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, marginTop: 2 }}>
                    {lang === 'ru' ? 'РУССКИЙ' : 'ENGLISH'}
                  </div>
                </div>
              </div>

              {/* Segmented toggle */}
              <div style={{
                position: 'relative', zIndex: 1,
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                background: 'rgba(0,0,0,0.12)', borderRadius: 12, padding: 3,
                height: 36,
              }}>
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  style={{
                    position: 'absolute', top: 3, bottom: 3,
                    width: 'calc(50% - 3px)',
                    left: lang === 'ru' ? 3 : 'calc(50% + 0px)',
                    background: '#000', borderRadius: 9,
                  }}
                />
                {(['ru', 'en'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => switchLang(l)}
                    style={{
                      position: 'relative', zIndex: 1,
                      background: 'transparent', border: 0, cursor: 'pointer',
                      color: lang === l ? NEON : 'rgba(0,0,0,0.55)',
                      fontFamily: inter, fontWeight: 800, fontSize: 12,
                      letterSpacing: '0.08em', transition: 'color 200ms',
                    }}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Right column: stacked actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* OUR CHANNEL — compact */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -2, borderColor: `${NEON}55` }}
                onClick={() => { haptic('light'); window.open(`https://t.me/${CONFIG.channelUsername}`, '_blank') }}
                style={{
                  height: 64, background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18,
                  padding: '0 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 300ms, transform 300ms',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* sweep shine */}
                <motion.div
                  aria-hidden
                  initial={{ x: '-120%' }}
                  animate={{ x: '220%' }}
                  transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute', top: 0, bottom: 0, width: 60,
                    background: `linear-gradient(90deg, transparent, ${NEON}22, transparent)`,
                    transform: 'skewX(-20deg)', pointerEvents: 'none',
                  }}
                />
                <div style={{ minWidth: 0, flex: 1, position: 'relative' }}>
                  <div style={{ fontFamily: mono, fontSize: 8.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
                    Telegram
                  </div>
                  <div style={{
                    fontSize: 15, fontWeight: 900, fontStyle: 'italic',
                    color: '#fff', marginTop: 2, letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {lang === 'ru' ? 'НАШ КАНАЛ' : 'CHANNEL'}
                  </div>
                </div>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  border: `1px solid ${NEON}33`, background: `${NEON}10`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', flexShrink: 0,
                }}>
                  <motion.div
                    style={{ position: 'absolute', inset: -3, background: `${NEON}33`, filter: 'blur(8px)', borderRadius: 14 }}
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.svg
                    width="18" height="18" viewBox="0 0 24 24" fill={NEON}
                    style={{ position: 'relative' }}
                    animate={{ x: [0, 2, 0], y: [0, -1, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
                  </motion.svg>
                </div>
              </motion.button>

              {/* REVIEWS */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -2, borderColor: `${NEON}55` }}
                onClick={() => { haptic('light'); window.open(`https://t.me/${CONFIG.communityUsername || CONFIG.channelUsername}`, '_blank') }}
                style={{
                  height: 64, background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18,
                  padding: '0 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 300ms, transform 300ms',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: mono, fontSize: 8.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
                    {lang === 'ru' ? 'Сообщество' : 'Community'}
                  </div>
                  <div style={{
                    fontSize: 15, fontWeight: 900, fontStyle: 'italic',
                    color: '#fff', marginTop: 2, letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {lang === 'ru' ? 'ОТЗЫВЫ' : 'REVIEWS'}
                  </div>
                </div>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  border: `1px solid ${NEON}33`, background: `${NEON}10`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', flexShrink: 0,
                }}>
                  <div style={{ position: 'absolute', inset: -3, background: `${NEON}22`, filter: 'blur(8px)', borderRadius: 14 }} />
                  <motion.svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="1.8" strokeLinejoin="round"
                    style={{ position: 'relative' }}
                    animate={{ rotate: [0, -8, 8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </motion.svg>
                </div>
              </motion.button>
            </div>
          </motion.div>

          {/* DOCS — blueprint list */}
          <motion.div variants={fadeUp}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <h2 style={{
                fontFamily: mono, fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.3em',
                color: 'rgba(255,255,255,0.4)', margin: 0,
              }}>
                {lang === 'ru' ? 'Документация' : 'Legal Docs'}
              </h2>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
            </div>

            <motion.div
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
              initial="hidden"
              animate="show"
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {links.map((item, i) => (
                <motion.button
                  key={item.key}
                  variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } }}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ borderColor: `${NEON}80` }}
                  onClick={() => { haptic('light'); setOpenSheet(item.key) }}
                  style={{
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'transparent', textAlign: 'left', cursor: 'pointer',
                    transition: 'border-color 400ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                    <span style={{ fontFamily: mono, fontSize: 10, color: NEON, opacity: 0.6 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{
                      fontSize: 19, fontWeight: 300, letterSpacing: '-0.01em',
                      color: '#fff', fontFamily: inter,
                    }}>
                      {item.label}
                    </span>
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.2)', marginBottom: 8,
                    transition: 'all 300ms',
                  }} />
                </motion.button>
              ))}
            </motion.div>

            {/* Footer metadata */}
            <div style={{
              marginTop: 32, marginBottom: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: mono, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.2)' }}>
                  {lang === 'ru' ? 'Защита маркета' : 'Market Security'}
                </span>
                <span style={{ fontFamily: mono, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.18em', color: `${NEON}99` }}>
                  {lang === 'ru' ? 'Шифрование активно' : 'Encryption active'}
                </span>
              </div>
              <div style={{
                fontSize: 30, fontWeight: 900, fontStyle: 'italic',
                color: 'rgba(255,255,255,0.05)', letterSpacing: '-0.04em',
                userSelect: 'none', fontFamily: inter,
              }}>
                2.0.0
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {openSheet && (
          <ContentSheet
            title={links.find((l) => l.key === openSheet)!.label}
            contentKey={openSheet}
            onClose={() => setOpenSheet(null)}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}

