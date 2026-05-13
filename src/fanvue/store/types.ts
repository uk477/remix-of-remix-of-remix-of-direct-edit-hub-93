export type Lang = 'ru' | 'en'
export type DeliveryType = 'auto' | 'manual'
export type OrderStatus = 'pending' | 'paid' | 'completed' | 'failed' | 'expired'
export type OrderKind = 'buy' | 'deposit'
export type CryptoNetwork = 'trc20' | 'erc20' | 'bep20' | 'eth' | 'sol' | 'btc' | 'usdc_eth' | 'usdc_sol'

export interface User {
  uid: number
  username: string
  full_name: string
  lang: Lang
  balance: number
  spent: number
  purchases: number
  ref_earned: number
  ref_count: number
  ref_balance: number   // withdrawable referral balance
  created: string
  photo_url?: string
}

export interface RefReward {
  month: string         // 'YYYY-MM'
  count: number         // qualifying referrals this month (each must have purchased)
  claimed: boolean      // whether $100 bonus was auto-credited this month
}

export type RefWithdrawalStatus = 'pending' | 'completed' | 'rejected'

export interface RefWithdrawal {
  id: string
  amount: number
  network: CryptoNetwork
  address: string
  status: RefWithdrawalStatus
  createdAt: string
  txid?: string
}

export interface Category {
  id: number
  name: string
  name_en: string
  emoji: string
  active: boolean
}

export interface Product {
  id: number
  cat_id: number
  title: string
  title_en: string
  description: string
  desc_en: string
  price: number
  delivery: DeliveryType
  stock: number
  active: boolean
}

export interface Order {
  id: string
  kind: OrderKind
  product_title?: string
  amount: number
  status: OrderStatus
  provider?: string
  quantity?: number
  created: string
  paid_at?: string
  txid?: string
  orderNum?: number
}

export interface SupportMessage {
  id: number
  sender: 'user' | 'admin'
  text: string
  created: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface CryptoOption {
  id: CryptoNetwork
  name: string
  symbol: string
  color: string
  icon: string
  address: string
}

export interface PaymentLog {
  id: number
  ts: string
  uid: number
  username: string
  kind: OrderKind
  amount: number
  network?: CryptoNetwork
  status: 'success' | 'failed' | 'expired'
  tx_hash?: string
  product?: string
}

export interface Broadcast {
  id: number
  text: string
  sent_to: number
  ts: string
}

export interface PaymentNotification {
  orderId: string
  kind: OrderKind
  amountUsd: number
  uniqueAmount: number
  network: CryptoNetwork
  read: boolean
  createdAt: string
}

/**
 * Ключи для photos map:
 *   welcome_ru | welcome_en  — приветственное фото
 *   crypto_<network>         — переопределение лого крипты
 *   product_<id>             — фото товара
 */
export type PhotoKey = string
