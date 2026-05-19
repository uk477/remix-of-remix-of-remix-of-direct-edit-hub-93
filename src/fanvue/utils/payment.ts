import { CONFIG, APPROX_RATES } from '../config'
import type { CryptoNetwork, OrderStatus } from '../store/types'

/**
 * Уникальный ID на каждое действие.
 * Формат: {PREFIX}-{base36(ts)}-{4 случайных символа}
 * Пример: DEP-LX9K2A-9F7B, ORD-LX9K2A-K3M2
 */
export function generateOrderId(kind: 'buy' | 'deposit' = 'buy'): string {
  const prefix = kind === 'deposit' ? 'DEP' : 'ORD'
  const ts = Date.now().toString(36).toUpperCase()
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let rand = ''
  const arr = new Uint8Array(4)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < 4; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  for (let i = 0; i < 4; i++) rand += alphabet[arr[i] % alphabet.length]
  return `${prefix}-${ts}-${rand}`
}

/**
 * Уникальная сумма с микро-офсетом (как в Python-боте main.py).
 * Добавляет 0.001–0.099 чтобы предотвратить совпадение платежей —
 * бэкенд по точной сумме определяет какому заказу пришла оплата.
 */
const offsetCounter = { v: Math.floor(Math.random() * 99) }

export function generateUniqueAmount(base: number): number {
  offsetCounter.v = (offsetCounter.v + 1) % 99
  const offset = (offsetCounter.v + 1) / 1000
  return Math.round((base + offset) * 1000) / 1000
}

export function usdToCrypto(usd: number, network: CryptoNetwork): number {
  return usd * (APPROX_RATES[network] ?? 1)
}

/** QR-код через бесплатный API (без зависимостей) */
export function qrCodeUrl(data: string, size = 220): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data,
    bgcolor: 'ffffff',
    color: '050510',
    margin: '8',
    qzone: '1',
  })
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`
}

/** Платёжный URI для глубоких ссылок (BIP21 для BTC, EIP-681 для ETH) */
export function paymentUri(network: CryptoNetwork, address: string, amount: number): string {
  if (network === 'btc') return `bitcoin:${address}?amount=${amount}`
  if (network === 'eth') return `ethereum:${address}?value=${amount}`
  if (network === 'ton') return `ton://transfer/${address}?amount=${Math.round(amount * 1e9)}`
  return address // USDT/SOL — раздельным полем
}

/**
 * Опрос статуса заказа на бэкенде.
 * Если CONFIG.apiUrl пустой — режим демо: имитирует успех через 25 сек.
 */
function tgInitData(): string {
  try {
    const tg = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp
    return tg?.initData ?? ''
  } catch {
    return ''
  }
}

function authHeaders(): HeadersInit {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': tgInitData(),
  }
}

export async function fetchOrderStatus(orderId: string): Promise<OrderStatus> {
  if (!CONFIG.apiUrl) return 'pending'
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(`${CONFIG.apiUrl}/api/order/${encodeURIComponent(orderId)}`, {
      signal: ctrl.signal,
      headers: authHeaders(),
    })
    clearTimeout(t)
    if (!res.ok) return 'pending'
    const data = (await res.json()) as { status?: OrderStatus }
    return data.status ?? 'pending'
  } catch {
    return 'pending'
  }
}

/**
 * Создание заказа на бэкенде.
 * Возвращает реальный адрес и точную сумму для перевода.
 */
export async function createOrder(payload: {
  uid: number
  kind: 'buy' | 'deposit'
  product_id?: number
  quantity?: number
  amount_usd: number
  network: CryptoNetwork
}): Promise<{ id: string; address: string; amount_crypto: number; expires_at: string } | null> {
  if (!CONFIG.apiUrl) return null
  try {
    const res = await fetch(`${CONFIG.apiUrl}/api/order`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
