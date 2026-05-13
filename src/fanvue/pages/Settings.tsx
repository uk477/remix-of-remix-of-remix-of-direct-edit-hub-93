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
          <div style={{ overflowY: 'auto', maxHeight: '60dvh' }}>
            {displayText.split('\n').map((line, i) => {
              if (line.startsWith('### ')) {
                return (
                  <div key={i} className="t-sm fw-bold" style={{ color: 'var(--t-primary)', marginTop: 16, marginBottom: 6 }}>
                    {line.slice(4)}
                  </div>
                )
              }
              if (line.startsWith('## ')) {
                return (
                  <div key={i} className="t-sm fw-black" style={{ color: 'var(--t-primary)', marginTop: i === 0 ? 0 : 20, marginBottom: 8 }}>
                    {line.slice(3)}
                  </div>
                )
              }
              if (line.trim() === '') return <div key={i} style={{ height: 6 }} />
              const parts = line.split(/(\*\*[^*]+\*\*)/)
              return (
                <div key={i} className="t-sm t-secondary" style={{ lineHeight: 1.7, marginBottom: 2 }}>
                  {parts.map((p, j) =>
                    p.startsWith('**') && p.endsWith('**')
                      ? <strong key={j} className="fw-bold" style={{ color: 'var(--t-primary)' }}>{p.slice(2, -2)}</strong>
                      : p
                  )}
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const t        = useT()
  const lang     = useStore((s) => s.lang)
  const [openSheet, setOpenSheet] = useState<keyof SiteContent | null>(null)

  type Link = { key: keyof SiteContent; Icon: () => JSX.Element; label: string }
  const links: Link[] = [
    { key: (lang === 'ru' ? 'offer_ru'          : 'offer_en')          as keyof SiteContent, Icon: DocIcon,      label: t('settings_offer')    },
    { key: (lang === 'ru' ? 'rules_ru'          : 'rules_en')          as keyof SiteContent, Icon: RulesIcon,    label: t('settings_rules')    },
    { key: (lang === 'ru' ? 'referral_rules_ru' : 'referral_rules_en') as keyof SiteContent, Icon: ReferralIcon, label: t('settings_referral') },
    { key: (lang === 'ru' ? 'contacts_ru'       : 'contacts_en')       as keyof SiteContent, Icon: ContactIcon,  label: t('settings_contact')  },
  ]

  return (
    <PageTransition>
      <motion.div className="page" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="pg-header">
          <motion.button className="pg-back" onClick={() => navigate(-1)} whileTap={{ scale: 0.9 }}>
            <BackIcon />
          </motion.button>
          <div className="pg-title">{t('settings_title')}</div>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-5">
          <div className="section-title mb-3">{t('settings_language')}</div>
          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="t-sm fw-bold">Русский / English</div>
              <div className="t-xs t-muted mt-1">
                {lang === 'ru' ? 'Язык интерфейса' : 'Interface language'}
              </div>
            </div>
            <LangToggle />
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-5">
          <div className="section-title mb-3">{t('settings_about')}</div>
          <div
            className="card card-gradient"
            style={{
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
              border: '1.5px solid transparent',
              backgroundClip: 'padding-box',
            }}
          >
            <div
              style={{
                position: 'absolute', inset: -2, borderRadius: 'inherit', zIndex: 0, pointerEvents: 'none',
                background: 'conic-gradient(from var(--gradient-angle, 0deg), var(--brand), #a855f7, #ec4899, var(--brand))',
                opacity: 0.35,
                animation: 'spin-gradient 4s linear infinite',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                padding: 2,
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="row gap-3 mb-4 items-center">
                <FanvueLogo size={44} />
                <div>
                  <div className="t-md fw-black" style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    Fanvue Market
                    <span style={{ fontSize: 11, fontWeight: 900, background: 'var(--g-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>2.0</span>
                  </div>
                  <div className="t-xs t-muted mt-1">
                    {lang === 'ru' ? 'Официальный маркет · Mini App' : 'Official Market · Mini App'}
                  </div>
                </div>
              </div>
              <div className="row-between">
                <div className="t-xs t-muted">{t('settings_version')}</div>
                <div className="t-xs fw-bold t-brand">2.0.0</div>
              </div>
              <div className="divider" />
              <div className="t-xs t-secondary" style={{ lineHeight: 1.65 }}>
                {lang === 'ru'
                  ? 'Аккаунты Fanvue и услуги верификации. Безопасно, быстро, гарантированно.'
                  : 'Fanvue accounts & verification services. Secure, fast, guaranteed.'}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-5">
          <div className="section-title mb-3">
            {lang === 'ru' ? 'Сообщество' : 'Community'}
          </div>
          <motion.button
            className="card"
            style={{
              padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
              width: '100%', textAlign: 'left',
              border: '1px solid rgba(232,201,140,0.28)',
              background: 'linear-gradient(135deg, rgba(232,201,140,0.10), rgba(232,201,140,0.02))',
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { window.open(`https://t.me/${CONFIG.channelUsername}`, '_blank') }}
          >
            <span style={{ color: 'var(--brand)' }}><StarIcon /></span>
            <div style={{ flex: 1 }}>
              <div className="t-sm fw-bold">{lang === 'ru' ? 'Наши отзывы' : 'Our reviews'}</div>
              <div className="t-xs t-muted mt-1">
                {lang === 'ru' ? 'Канал с отзывами реальных клиентов' : 'Real customer reviews channel'}
              </div>
            </div>
            <span className="t-muted"><ChevronIcon /></span>
          </motion.button>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div className="section-title mb-3">
            {lang === 'ru' ? 'Документы' : 'Legal'}
          </div>
          <motion.div
            className="card col"
            style={{ padding: 0, overflow: 'hidden' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } } }}
            initial="hidden"
            animate="show"
          >
            {links.map((item, i) => (
              <motion.button
                key={item.key}
                style={{
                  padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
                  borderBottom: i < links.length - 1 ? '1px solid var(--b-default)' : 'none',
                  textAlign: 'left', width: '100%',
                }}
                whileTap={{ background: 'var(--surface-hover)' }}
                variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } }}
                onClick={() => setOpenSheet(item.key)}
              >
                <span style={{ color: 'var(--brand)' }}><item.Icon /></span>
                <span className="t-sm fw-bold" style={{ flex: 1 }}>{item.label}</span>
                <span className="t-muted"><ChevronIcon /></span>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
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
