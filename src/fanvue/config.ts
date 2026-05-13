const e = import.meta.env

export const CONFIG = {
  brandName:    e.VITE_BRAND_NAME    ?? 'FANVUE MARKET',
  brandSubtitle: e.VITE_BRAND_SUBTITLE ?? 'MARKET · 2.0',
  botUsername:     e.VITE_BOT_USERNAME     ?? 'FanvueMarketBot',
  adminUsername:   e.VITE_ADMIN_USERNAME   ?? 'FanvueAdmin',
  supportUsername: e.VITE_SUPPORT_USERNAME ?? 'FanvueSupport',
  channelUsername: e.VITE_CHANNEL_USERNAME ?? 'FanvueStore',
  communityUsername: e.VITE_COMMUNITY_USERNAME ?? 'FanvueCommunity',
  adminIds:        (e.VITE_ADMIN_IDS ?? '123456789').split(',').map(Number) as number[],

  siteUrl:  e.VITE_SITE_URL ?? '',
  apiUrl:   e.VITE_API_URL  ?? '',

  addresses: {
    trc20:    e.VITE_ADDR_TRC20    ?? '',
    erc20:    e.VITE_ADDR_ERC20    ?? '',
    bep20:    e.VITE_ADDR_BEP20    ?? '',
    eth:      e.VITE_ADDR_ETH      ?? '',
    sol:      e.VITE_ADDR_SOL      ?? '',
    btc:      e.VITE_ADDR_BTC      ?? '',
    usdc_eth: e.VITE_ADDR_USDC_ETH ?? '',
    usdc_sol: e.VITE_ADDR_USDC_SOL ?? '',
  },

  paymentTimeoutMinutes: Number(e.VITE_PAYMENT_TIMEOUT_MINUTES ?? 30),
  refBonusPct:           Number(e.VITE_REF_BONUS_PCT           ?? 5),
  bulkDiscountPct:       Number(e.VITE_BULK_DISCOUNT_PCT       ?? 5),
  bulkDiscountMinQty:    Number(e.VITE_BULK_DISCOUNT_MIN_QTY   ?? 3),
  pollIntervalMs:        Number(e.VITE_POLL_INTERVAL_MS        ?? 6000),
} as const

// Курсы USD → крипто (ориентировочные, бэкенд должен вернуть точную сумму)
export const APPROX_RATES: Record<string, number> = {
  trc20: 1.0,
  erc20: 1.0,
  bep20: 1.0,
  usdc_eth: 1.0,
  usdc_sol: 1.0,
  eth: 0.00031,
  sol: 0.0058,
  btc: 0.0000098,
}
