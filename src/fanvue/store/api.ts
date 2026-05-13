import { CONFIG } from '../config'

const base = CONFIG.apiUrl

function initData(): string {
  try {
    return (window as Window & { Telegram?: { WebApp?: { initData?: string } } })
      .Telegram?.WebApp?.initData ?? ''
  } catch { return '' }
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': initData(),
  }
}

async function req<T>(method: string, path: string, body?: object): Promise<T | null> {
  if (!base) return null
  try {
    const r = await fetch(`${base}${path}`, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!r.ok) return null
    return r.json() as Promise<T>
  } catch {
    return null
  }
}

const get  = <T>(path: string)              => req<T>('GET',    path)
const post = <T>(path: string, b: object)   => req<T>('POST',   path, b)
const patch = <T>(path: string, b: object)  => req<T>('PATCH',  path, b)
const del  = <T>(path: string)              => req<T>('DELETE', path)

export const api = {
  isEnabled: () => !!base,

  auth:           (b: object)        => post('/api/auth', b),
  getUser:        (uid: number)      => get(`/api/user/${uid}`),
  getProducts:    ()                 => get<{ products: unknown[]; categories: unknown[]; pinned: number[] }>('/api/products'),
  getMyOrders:    ()                 => get('/api/orders'),
  getOrder:       (id: string)       => get(`/api/order/${id}`),
  createOrder:    (b: object)        => post('/api/order', b),

  getMessages:    ()                 => get('/api/support/messages'),
  sendMessage:    (text: string)     => post('/api/support/message', { text }),

  refWithdraw:    (b: object)        => post('/api/ref/withdraw', b),

  // Admin
  adminOrders:           ()                        => get('/api/admin/orders'),
  adminPatchOrder:       (id: string, b: object)   => patch(`/api/admin/order/${id}`, b),
  adminDeleteOrder:      (id: string)              => del(`/api/admin/order/${id}`),
  adminUsers:            ()                        => get('/api/admin/users'),
  adminIssueBalance:     (uid: number, amt: number) => post(`/api/admin/user/${uid}/balance`, { amount: amt }),
  adminSupport:          ()                        => get('/api/admin/support'),
  adminReply:            (uid: number, text: string) => post(`/api/admin/support/${uid}`, { text }),
  adminGetSettings:      ()                        => get('/api/admin/settings'),
  adminSetSettings:      (b: object)               => post('/api/admin/settings', b),
  adminUpsertProduct:    (b: object)               => post('/api/admin/product', b),
  adminPinProduct:       (id: number)              => post(`/api/admin/product/${id}/pin`, {}),
  adminUnpinProduct:     (id: number)              => del(`/api/admin/product/${id}/pin`),
  adminRefWithdrawals:   ()                        => get('/api/admin/ref-withdrawals'),
  adminSetRefStatus:     (id: string, b: object)   => patch(`/api/admin/ref-withdrawal/${id}`, b),
  adminLogs:             ()                        => get('/api/admin/logs'),
}
