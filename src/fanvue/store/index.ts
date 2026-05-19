import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CONFIG } from '../config'
import { api } from './api'
import type {
  Lang, User, Category, Product, Order, SupportMessage, CartItem, CryptoOption,
  CryptoNetwork, PaymentLog, Broadcast, PaymentNotification, RefReward, RefWithdrawal,
  SupportTicket, SupportTicketCategory, AdminPresence,
} from './types'

export const CRYPTO_OPTIONS: CryptoOption[] = [
  { id: 'trc20',    name: 'USDT TRC20',  symbol: 'USDT', color: '#26A17B', icon: '₮', address: CONFIG.addresses.trc20 },
  { id: 'erc20',    name: 'USDT ERC20',  symbol: 'USDT', color: '#627EEA', icon: '₮', address: CONFIG.addresses.erc20 },
  { id: 'bep20',    name: 'USDT BEP20',  symbol: 'USDT', color: '#F0B90B', icon: '₮', address: CONFIG.addresses.bep20 },
  { id: 'usdc_eth', name: 'USDC ERC20',  symbol: 'USDC', color: '#2775CA', icon: '$', address: CONFIG.addresses.usdc_eth },
  { id: 'usdc_sol', name: 'USDC SPL',    symbol: 'USDC', color: '#9945FF', icon: '$', address: CONFIG.addresses.usdc_sol },
  { id: 'eth',      name: 'Ethereum',    symbol: 'ETH',  color: '#627EEA', icon: 'Ξ', address: CONFIG.addresses.eth },
  { id: 'sol',      name: 'Solana',      symbol: 'SOL',  color: '#9945FF', icon: '◎', address: CONFIG.addresses.sol },
  { id: 'btc',      name: 'Bitcoin',     symbol: 'BTC',  color: '#F7931A', icon: '₿', address: CONFIG.addresses.btc },
]

const MOCK_USER: User = {
  uid: 123456789,
  username: 'ivan_user',
  full_name: 'Ivan',
  lang: 'ru',
  balance: 124.50,
  spent: 287.30,
  purchases: 12,
  ref_earned: 15.20,
  ref_count: 3,
  ref_balance: 0,
  created: '2024-01-15',
}

const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: 'Аккаунты', name_en: 'Accounts', emoji: '👑', active: true },
  { id: 2, name: 'Верификация', name_en: 'Verification', emoji: '✅', active: true },
]

const MOCK_PRODUCTS: Product[] = [
  {
    id: 1, cat_id: 1,
    title: 'Готовый верифицированный аккаунт',
    title_en: 'Ready verified account',
    description: 'Полностью готовый аккаунт Fanvue с пройденной верификацией. Чистая история, подтверждён 18+, разблокированы все способы монетизации (Subscriptions, PPV, Tips). Передача — смена e-mail и пароля под вашим контролем, средняя выдача 5–15 минут после оплаты. Никаких ожиданий, никаких рисков отказа.',
    desc_en: 'A fully ready Fanvue account with verification already passed. Clean history, age-confirmed (18+), all monetisation features unlocked (Subscriptions, PPV, Tips). Hand-off is e-mail & password change under your control, average delivery 5–15 minutes after payment. No waiting, no rejection risk.',
    price: 35.00, delivery: 'auto', stock: 14, active: true,
  },
  {
    id: 2, cat_id: 2,
    title: 'Верификация вашего аккаунта',
    title_en: 'Verify your account',
    description: 'Проводим верификацию уже существующего аккаунта Fanvue. Подбираем чистые документы, проходим face-match, разблокируем монетизацию. Гарантия результата — если верификация не прошла, возвращаем 100% оплаты. Среднее время выполнения — 2–6 часов.',
    desc_en: 'We verify your existing Fanvue account. We supply clean documents, pass the face-match and unlock monetisation. Result guaranteed — full refund if verification fails. Average turnaround 2–6 hours.',
    price: 50.00, delivery: 'manual', stock: 99, active: true,
  },
]

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-LSXG4A-K3M2', kind: 'buy', orderNum: 1,
    product_title: 'Fanvue Creator — Старт',
    amount: 18.00, status: 'completed',
    quantity: 1, created: '2024-03-10T14:22:00Z', paid_at: '2024-03-10T14:23:00Z',
  },
  {
    id: 'DEP-LSUVK2-9F7B', kind: 'deposit', orderNum: 1,
    amount: 50.00, status: 'completed',
    provider: 'trc20', created: '2024-03-08T10:05:00Z', paid_at: '2024-03-08T10:07:00Z',
    txid: '3EK9a8f2c1b4d9e8f1a2b3c4d5e6f7g8h9i0j1k2l3mQ72',
  },
  {
    id: 'ORD-LT2N8P-X7QA', kind: 'buy', orderNum: 2,
    product_title: 'Верификация Создателя',
    amount: 45.00, status: 'completed',
    quantity: 1, created: '2024-03-12T18:00:00Z', paid_at: '2024-03-12T18:02:00Z',
  },
]

// Empty by default — bot triage greeting will be shown
const MOCK_SUPPORT: SupportMessage[] = []

const MOCK_LOGS: PaymentLog[] = [
  { id: 1, ts: '2024-04-22T14:22:00Z', uid: 7891011, username: 'alex_m', kind: 'buy', amount: 25.99, network: 'trc20', status: 'success', tx_hash: '0xa1b2c3...', product: 'Fanvue Pro Account' },
  { id: 2, ts: '2024-04-22T13:18:00Z', uid: 5556677, username: 'maria_k', kind: 'deposit', amount: 50.00, network: 'erc20', status: 'success', tx_hash: '0xd4e5f6...' },
  { id: 3, ts: '2024-04-22T12:01:00Z', uid: 9988776, username: 'bob_x', kind: 'buy', amount: 15.99, network: 'bep20', status: 'expired', product: 'Fanvue Premium' },
  { id: 4, ts: '2024-04-22T10:45:00Z', uid: 1122334, username: 'jane_d', kind: 'buy', amount: 45.00, network: 'sol', status: 'success', tx_hash: '5xK...nP9', product: 'Creator Verification' },
  { id: 5, ts: '2024-04-21T22:33:00Z', uid: 4455667, username: 'mike_r', kind: 'deposit', amount: 100, network: 'btc', status: 'failed' },
]

export interface SiteContent {
  offer_ru: string
  offer_en: string
  rules_ru: string
  rules_en: string
  contacts_ru: string
  contacts_en: string
  referral_rules_ru: string
  referral_rules_en: string
}

interface AppStore {
  lang: Lang
  langUserSet: boolean
  user: User | null
  categories: Category[]
  products: Product[]
  orders: Order[]
  supportMessages: SupportMessage[]
  supportTickets: SupportTicket[]
  adminPresence: AdminPresence
  userTyping: boolean
  adminTyping: boolean
  cart: CartItem | null
  isLoading: boolean

  // Admin-editable state
  cryptoAddresses: Record<CryptoNetwork, string>
  maintenance: boolean
  logs: PaymentLog[]
  broadcasts: Broadcast[]
  qrOverrides: Partial<Record<CryptoNetwork, string>>
  photos: Record<string, string>
  siteContent: SiteContent

  notifications: PaymentNotification[]
  refReward: RefReward
  refWithdrawals: RefWithdrawal[]
  refDailyLog: Record<string, number>
  supportForwardedOrders: string[]
  pinnedProductIds: number[]
  supportUnread: number
  stickHeroScores: { name: string; score: number; ts: number }[]
  stickHeroName: string | null

  // User actions
  setLang: (lang: Lang) => void
  initUser: () => void
  setCart: (cart: CartItem | null) => void
  addOrder: (order: Order) => void
  addSupportMessage: (msg: SupportMessage) => void
  updateSupportMessage: (id: number, updates: Partial<SupportMessage>) => void
  deleteSupportMessage: (id: number, mode: 'user' | 'all') => void
  markUserMessagesReadByAdmin: () => void
  markAdminMessagesReadByUser: () => void
  setUserTyping: (v: boolean) => void
  setAdminTyping: (v: boolean) => void
  setAdminPresence: (p: Partial<AdminPresence>) => void
  openSupportTicket: (category: SupportTicketCategory, summary?: string) => SupportTicket
  closeSupportTicket: (id: string, reason?: string) => void
  resetSupportSession: () => void
  clearSupportUnread: () => void
  updateBalance: (delta: number) => void
  addNotification: (n: Omit<PaymentNotification, 'read' | 'createdAt'>) => void
  markNotificationsRead: () => void
  removeNotification: (orderId: string) => void
  creditDeposit: (orderId: string, amount: number, txid?: string) => void
  creditRefBalance: (amount: number) => void
  spendRefBalance: (amount: number) => void
  addRefWithdrawal: (w: Omit<RefWithdrawal, 'id' | 'createdAt'>) => void
  updateRefWithdrawal: (id: string, updates: Partial<RefWithdrawal>) => void
  completeRefWithdrawal: (id: string, txid: string) => void
  checkAndResetMonthlyReward: () => void
  logDailyRef: (date: string, count?: number) => void
  cancelPendingDeposits: (exceptNetwork?: string) => void

  // Admin actions
  setCryptoAddress: (network: CryptoNetwork, address: string) => void
  setQrOverride: (network: CryptoNetwork, dataUri: string | null) => void
  setPhoto: (key: string, dataUri: string | null) => void
  toggleMaintenance: () => void
  setOrderStatus: (id: string, status: Order['status']) => void
  setOrderDelivery: (id: string, deliveryData: string) => void
  deleteOrder: (id: string) => void
  upsertProduct: (p: Product) => void
  deleteProduct: (id: number) => void
  upsertCategory: (c: Category) => void
  deleteCategory: (id: number) => void
  addLog: (log: Omit<PaymentLog, 'id'>) => void
  addBroadcast: (text: string, sent_to: number) => void
  setSiteContent: (key: keyof SiteContent, value: string) => void
  markOrderForwarded: (orderId: string) => void
  pinProduct: (id: number) => void
  unpinProduct: (id: number) => void
  isAdmin: () => boolean
  addStickHeroScore: (score: number) => void
  setStickHeroName: (name: string) => void
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      lang: 'ru',
      langUserSet: false,
      user: null,
      categories: MOCK_CATEGORIES,
      products: MOCK_PRODUCTS,
      orders: MOCK_ORDERS,
      supportMessages: MOCK_SUPPORT,
      supportTickets: [],
      adminPresence: { online: false, lastSeen: new Date().toISOString() },
      userTyping: false,
      adminTyping: false,
      cart: null,
      isLoading: true,

      cryptoAddresses: { ...CONFIG.addresses },
      maintenance: false,
      logs: MOCK_LOGS,
      broadcasts: [],
      qrOverrides: {},
      photos: {},
      notifications: [],
      refReward: { month: '', count: 0, claimed: false },
      refWithdrawals: [],
      refDailyLog: {},
      supportForwardedOrders: [],
      pinnedProductIds: [],
      supportUnread: 0,
      siteContent: {
        offer_ru: '', offer_en: '',
        rules_ru: '', rules_en: '',
        contacts_ru: '', contacts_en: '',
        referral_rules_ru: '', referral_rules_en: '',
      },

      setLang: (lang) => set({ lang, langUserSet: true }),

      initUser: () => {
        // one-time dedupe of any legacy duplicate stickHero scores
        const cur = get().stickHeroScores
        if (Array.isArray(cur) && cur.length > 0) {
          const best = new Map<string, { name: string; score: number; ts: number }>()
          for (const r of cur) {
            if (!r || typeof r.name !== 'string') continue
            const nm = r.name.trim(); if (!nm) continue
            const sc = Math.max(0, Math.min(99999, Math.floor(Number(r.score) || 0)))
            const k = nm.toLowerCase()
            const prev = best.get(k)
            if (!prev || prev.score < sc) best.set(k, { name: nm, score: sc, ts: Number(r.ts) || Date.now() })
          }
          const deduped = [...best.values()].sort((a, b) => b.score - a.score).slice(0, 100)
          if (deduped.length !== cur.length) set({ stickHeroScores: deduped })
        }
        try {
          type TGUser = { id?: number; username?: string; first_name?: string; language_code?: string; photo_url?: string }
          const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: TGUser } } } }).Telegram?.WebApp
          const tgUser = tg?.initDataUnsafe?.user
          const state = get()
          if (tgUser) {
            const detectedLang: Lang = tgUser.language_code?.startsWith('ru') ? 'ru' : 'en'
            const localUser: User = {
              ...MOCK_USER,
              uid: tgUser.id ?? MOCK_USER.uid,
              username: tgUser.username ?? MOCK_USER.username,
              full_name: tgUser.first_name ?? MOCK_USER.full_name,
              photo_url: tgUser.photo_url,
            }
            set({
              user: localUser,
              lang: state.langUserSet ? state.lang : detectedLang,
              langUserSet: state.langUserSet || true,
              isLoading: false,
            })
            // sync with server when API is enabled
            if (api.isEnabled()) {
              api.auth({}).then((serverUser) => {
                if (serverUser && typeof serverUser === 'object') {
                  const u = serverUser as Record<string, unknown>
                  set((s) => ({
                    user: s.user ? {
                      ...s.user,
                      balance:     Number(u.balance     ?? s.user.balance),
                      spent:       Number(u.spent       ?? s.user.spent),
                      purchases:   Number(u.purchases   ?? s.user.purchases),
                      ref_earned:  Number(u.ref_earned  ?? s.user.ref_earned),
                      ref_count:   Number(u.ref_count   ?? s.user.ref_count),
                      ref_balance: Number(u.ref_balance ?? s.user.ref_balance),
                    } : s.user,
                  }))
                  api.getMyOrders().then((res) => {
                    if (res && typeof res === 'object' && 'orders' in res) {
                      set({ orders: (res as { orders: Order[] }).orders })
                    }
                  })
                  api.getMessages().then((res) => {
                    if (res && typeof res === 'object' && 'messages' in res) {
                      set({ supportMessages: (res as { messages: SupportMessage[] }).messages })
                    }
                  })
                  api.getProducts().then((res) => {
                    if (res && typeof res === 'object') {
                      const update: Partial<AppStore> = {}
                      if ('products' in res && Array.isArray(res.products) && res.products.length > 0) {
                        update.products = res.products as Product[]
                      }
                      if ('categories' in res && Array.isArray(res.categories) && res.categories.length > 0) {
                        update.categories = res.categories as Category[]
                      }
                      if ('pinned' in res && Array.isArray(res.pinned)) {
                        update.pinnedProductIds = res.pinned as number[]
                      }
                      if (Object.keys(update).length > 0) set(update)
                    }
                  })
                }
              })
            }
          } else {
            set({ user: MOCK_USER, isLoading: false })
          }
        } catch {
          set({ user: MOCK_USER, isLoading: false })
        }
      },

      setCart: (cart) => set({ cart }),

      addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),

      addSupportMessage: (msg) => {
        set((s) => ({
          supportMessages: [...s.supportMessages, msg],
          supportUnread: msg.sender === 'admin' ? s.supportUnread + 1 : s.supportUnread,
        }))
        if (api.isEnabled() && msg.sender === 'user') {
          api.sendMessage(msg.text)
        }
      },

      clearSupportUnread: () => set({ supportUnread: 0 }),

      updateSupportMessage: (id, updates) =>
        set((s) => ({
          supportMessages: s.supportMessages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      deleteSupportMessage: (id, mode) =>
        set((s) => ({
          supportMessages:
            mode === 'all'
              ? s.supportMessages.filter((m) => m.id !== id)
              : s.supportMessages.map((m) => (m.id === id ? { ...m, deleted_for: 'user' } : m)),
        })),

      markUserMessagesReadByAdmin: () =>
        set((s) => ({
          supportMessages: s.supportMessages.map((m) =>
            m.sender === 'user' && !m.read_by_admin ? { ...m, read_by_admin: true } : m,
          ),
        })),

      markAdminMessagesReadByUser: () =>
        set((s) => ({
          supportMessages: s.supportMessages.map((m) =>
            (m.sender === 'admin' || m.sender === 'bot') && !m.read_by_user ? { ...m, read_by_user: true } : m,
          ),
          supportUnread: 0,
        })),

      setUserTyping: (v) => set({ userTyping: v }),
      setAdminTyping: (v) => set({ adminTyping: v }),
      setAdminPresence: (p) => set((s) => ({ adminPresence: { ...s.adminPresence, ...p } })),

      openSupportTicket: (category, summary) => {
        const id = 'FV-' + Math.floor(1000 + Math.random() * 9000)
        const ticket: SupportTicket = {
          id, category, status: 'open',
          opened: new Date().toISOString(),
          summary,
        }
        set((s) => ({
          supportTickets: [ticket, ...s.supportTickets],
          supportMessages: [
            ...s.supportMessages,
            {
              id: Date.now(),
              sender: 'bot',
              kind: 'system',
              text: `ticket_opened:${id}`,
              created: new Date().toISOString(),
              ticket_id: id,
            },
          ],
        }))
        return ticket
      },

      closeSupportTicket: (id, reason) =>
        set((s) => ({
          supportTickets: s.supportTickets.map((t) =>
            t.id === id ? { ...t, status: 'closed', closed: new Date().toISOString() } : t,
          ),
          supportMessages: [
            ...s.supportMessages,
            {
              id: Date.now(),
              sender: 'bot',
              kind: 'system',
              text: `ticket_closed:${id}${reason ? ':' + reason : ''}`,
              created: new Date().toISOString(),
              ticket_id: id,
            },
          ],
        })),

      resetSupportSession: () =>
        set((s) => ({
          supportTickets: s.supportTickets.map((t) =>
            t.status !== 'closed' ? { ...t, status: 'closed', closed: new Date().toISOString() } : t,
          ),
        })),

      updateBalance: (delta) =>
        set((s) => ({
          user: s.user ? { ...s.user, balance: Math.max(0, s.user.balance + delta) } : null,
        })),

      addNotification: (n) =>
        set((s) => ({
          notifications: [
            { ...n, read: false, createdAt: new Date().toISOString() },
            ...s.notifications.filter((x) => x.orderId !== n.orderId),
          ].slice(0, 30),
        })),

      markNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      removeNotification: (orderId) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.orderId !== orderId) })),

      creditDeposit: (orderId, amount, txid?) =>
        set((s) => {
          const order = s.orders.find((o) => o.id === orderId)
          if (order?.paid_at) return {}
          return {
            user: s.user ? { ...s.user, balance: Math.max(0, s.user.balance + amount) } : null,
            orders: s.orders.map((o) =>
              o.id === orderId
                ? { ...o, status: 'completed' as const, paid_at: new Date().toISOString(), ...(txid ? { txid } : {}) }
                : o
            ),
          }
        }),

      creditRefBalance: (amount) =>
        set((s) => ({
          user: s.user ? { ...s.user, ref_balance: (s.user.ref_balance) + amount } : null,
        })),

      spendRefBalance: (amount) =>
        set((s) => ({
          user: s.user ? { ...s.user, ref_balance: Math.max(0, s.user.ref_balance - amount) } : null,
        })),

      addRefWithdrawal: (w) =>
        set((s) => ({
          refWithdrawals: [
            { ...w, id: (w as { id?: string }).id ?? `RW-${Date.now()}`, createdAt: new Date().toISOString() },
            ...s.refWithdrawals,
          ],
        })),

      updateRefWithdrawal: (id, updates) =>
        set((s) => ({
          refWithdrawals: s.refWithdrawals.map((w) => w.id === id ? { ...w, ...updates } : w),
        })),

      completeRefWithdrawal: (id, txid) =>
        set((s) => ({
          refWithdrawals: s.refWithdrawals.map((w) =>
            w.id === id ? { ...w, status: 'completed' as const, txid, completedAt: new Date().toISOString() } : w
          ),
        })),

      logDailyRef: (date, count = 1) =>
        set((s) => ({
          refDailyLog: { ...s.refDailyLog, [date]: (s.refDailyLog[date] ?? 0) + count },
          refReward: { ...s.refReward, count: s.refReward.count + count },
          user: s.user ? {
            ...s.user,
            ref_balance: s.user.ref_balance + 5 * count,
            ref_earned: s.user.ref_earned + 5 * count,
            ref_count: s.user.ref_count + count,
          } : null,
        })),

      checkAndResetMonthlyReward: () =>
        set((s) => {
          const currentMonth = new Date().toISOString().slice(0, 7)
          const { refReward } = s
          if (!refReward.month || refReward.month < currentMonth) {
            return { refReward: { month: currentMonth, count: 0, claimed: false } }
          }
          if (refReward.count >= 10 && !refReward.claimed) {
            return {
              refReward: { ...refReward, claimed: true },
              user: s.user ? {
                ...s.user,
                ref_balance: s.user.ref_balance + 100,
                ref_earned: s.user.ref_earned + 100,
              } : null,
            }
          }
          return {}
        }),

      cancelPendingDeposits: (exceptNetwork?: string) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.kind === 'deposit' && o.status === 'pending' && o.provider !== exceptNetwork
              ? { ...o, status: 'failed' as const }
              : o
          ),
        })),

      // ─── ADMIN ─────────────────────────────────────────
      setCryptoAddress: (network, address) =>
        set((s) => ({ cryptoAddresses: { ...s.cryptoAddresses, [network]: address } })),

      setQrOverride: (network, dataUri) =>
        set((s) => {
          const next = { ...s.qrOverrides }
          if (dataUri === null) delete next[network]; else next[network] = dataUri
          return { qrOverrides: next }
        }),

      setPhoto: (key, dataUri) =>
        set((s) => {
          const next = { ...s.photos }
          if (dataUri === null) delete next[key]; else next[key] = dataUri
          return { photos: next }
        }),

      toggleMaintenance: () => set((s) => ({ maintenance: !s.maintenance })),

      setOrderStatus: (id, status) => {
        set((s) => ({
          orders: s.orders.map((o) => o.id === id
            ? { ...o, status, paid_at: status === 'completed' || status === 'paid' ? new Date().toISOString() : o.paid_at }
            : o),
        }))
        if (api.isEnabled()) api.adminPatchOrder(id, { status })
      },

      deleteOrder: (id) => {
        set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }))
        if (api.isEnabled()) api.adminDeleteOrder(id)
      },

      upsertProduct: (p) =>
        set((s) => {
          const exists = s.products.some((x) => x.id === p.id)
          return { products: exists ? s.products.map((x) => x.id === p.id ? p : x) : [...s.products, p] }
        }),

      deleteProduct: (id) =>
        set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

      upsertCategory: (c) =>
        set((s) => {
          const exists = s.categories.some((x) => x.id === c.id)
          return { categories: exists ? s.categories.map((x) => x.id === c.id ? c : x) : [...s.categories, c] }
        }),

      deleteCategory: (id) =>
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      addLog: (log) =>
        set((s) => ({ logs: [{ id: Date.now(), ...log }, ...s.logs].slice(0, 500) })),

      addBroadcast: (text, sent_to) =>
        set((s) => ({
          broadcasts: [{ id: Date.now(), text, sent_to, ts: new Date().toISOString() }, ...s.broadcasts],
        })),

      setSiteContent: (key, value) =>
        set((s) => ({ siteContent: { ...s.siteContent, [key]: value } })),

      markOrderForwarded: (orderId) =>
        set((s) => ({ supportForwardedOrders: s.supportForwardedOrders.includes(orderId) ? s.supportForwardedOrders : [...s.supportForwardedOrders, orderId] })),

      pinProduct: (id) =>
        set((s) => ({ pinnedProductIds: s.pinnedProductIds.includes(id) ? s.pinnedProductIds : [...s.pinnedProductIds, id] })),

      unpinProduct: (id) =>
        set((s) => ({ pinnedProductIds: s.pinnedProductIds.filter((x) => x !== id) })),

      isAdmin: (): boolean => {
        const u = get().user
        return !!u && CONFIG.adminIds.includes(u.uid)
      },

      stickHeroScores: [],
      stickHeroName: null,
      setStickHeroName: (name) => {
        const clean = name.replace(/[^\p{L}\p{N}_\- .]/gu, '').trim().slice(0, 16)
        if (clean.length < 2) return
        set({ stickHeroName: clean })
      },
      addStickHeroScore: (score) => set((s) => {
        const name = (s.stickHeroName || '').trim()
        if (!name) return {}
        const safeScore = Math.max(0, Math.min(99999, Math.floor(Number(score) || 0)))
        const key = name.toLowerCase()
        const existing = s.stickHeroScores.find((x) => x.name.toLowerCase() === key)
        // 1 player = 1 slot; only beat your own best
        if (existing && existing.score >= safeScore) return {}
        const filtered = s.stickHeroScores.filter((x) => x.name.toLowerCase() !== key)
        const next = [...filtered, { name, score: safeScore, ts: Date.now() }]
          .sort((a, b) => b.score - a.score)
          .slice(0, 100)
        return { stickHeroScores: next }
      }),
    }),
    {
      name: 'fanvue-app-v7',
      migrate: (state: unknown) => {
        // clear old mock paid orders so home banner doesn't persist
        const s = state as Partial<AppStore>
        if (s.orders) {
          s.orders = s.orders.map((o) =>
            o.kind === 'buy' && o.status === 'paid' && o.id.startsWith('2_')
              ? { ...o, status: 'completed' as const }
              : o
          )
        }
        // dedupe stickHeroScores: keep best per player (case-insensitive)
        if (Array.isArray(s.stickHeroScores)) {
          const best = new Map<string, { name: string; score: number; ts: number }>()
          for (const r of s.stickHeroScores) {
            if (!r || typeof r.name !== 'string') continue
            const name = r.name.trim()
            if (!name) continue
            const score = Math.max(0, Math.min(99999, Math.floor(Number(r.score) || 0)))
            const key = name.toLowerCase()
            const prev = best.get(key)
            if (!prev || prev.score < score) {
              best.set(key, { name, score, ts: Number(r.ts) || Date.now() })
            }
          }
          s.stickHeroScores = [...best.values()].sort((a, b) => b.score - a.score).slice(0, 100)
        }
        return s
      },
      partialize: (s) => ({
        lang: s.lang,
        langUserSet: s.langUserSet,
        cryptoAddresses: s.cryptoAddresses,
        qrOverrides: s.qrOverrides,
        photos: s.photos,
        maintenance: s.maintenance,
        notifications: s.notifications,
        siteContent: s.siteContent,
        refReward: s.refReward,
        refWithdrawals: s.refWithdrawals,
        refDailyLog: s.refDailyLog,
        supportMessages: s.supportMessages,
        supportTickets: s.supportTickets,
        orders: s.orders,
        supportForwardedOrders: s.supportForwardedOrders,
        pinnedProductIds: s.pinnedProductIds,
        supportUnread: s.supportUnread,
        stickHeroScores: s.stickHeroScores,
        stickHeroName: s.stickHeroName,
      }),
    }
  )
)

// Helper для CRYPTO_OPTIONS с актуальными адресами из store
export function getCryptoOptions(addresses: Record<CryptoNetwork, string>): CryptoOption[] {
  return CRYPTO_OPTIONS.map((opt) => ({ ...opt, address: addresses[opt.id] || opt.address }))
}
