import { useState, useEffect } from 'react'
import { APPROX_RATES } from '../config'
import type { CryptoNetwork } from '../store/types'

export interface LiveRates {
  btc: number
  eth: number
  sol: number
  bnb: number
  updatedAt: number
}

const FALLBACK: LiveRates = {
  btc: 90000, eth: 3000, sol: 150, bnb: 600, updatedAt: 0,
}

let _cache: LiveRates | null = null
let _fetching = false

async function fetchBinance(): Promise<Partial<LiveRates> | null> {
  try {
    const symbols = encodeURIComponent('["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT"]')
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${symbols}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as Array<{ symbol: string; price: string }>
    const map: Record<string, number> = {}
    for (const item of data) map[item.symbol] = parseFloat(item.price)
    return {
      btc: map['BTCUSDT'] ?? 0,
      eth: map['ETHUSDT'] ?? 0,
      sol: map['SOLUSDT'] ?? 0,
      bnb: map['BNBUSDT'] ?? 0,
    }
  } catch { return null }
}

async function fetchCoinGecko(): Promise<Partial<LiveRates> | null> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd',
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const d = await res.json() as Record<string, { usd: number }>
    return {
      btc: d.bitcoin?.usd ?? 0,
      eth: d.ethereum?.usd ?? 0,
      sol: d.solana?.usd ?? 0,
      bnb: d.binancecoin?.usd ?? 0,
    }
  } catch { return null }
}

async function fetchRates(): Promise<LiveRates | null> {
  const data = (await fetchBinance()) ?? (await fetchCoinGecko())
  if (!data) return null
  return {
    btc: data.btc || FALLBACK.btc,
    eth: data.eth || FALLBACK.eth,
    sol: data.sol || FALLBACK.sol,
    bnb: data.bnb || FALLBACK.bnb,
    updatedAt: Date.now(),
  }
}

export function calcCryptoAmount(usd: number, network: CryptoNetwork, rates: LiveRates | null): number {
  const r = rates ?? FALLBACK
  switch (network) {
    case 'btc':   return r.btc > 0 ? usd / r.btc : usd * APPROX_RATES.btc
    case 'eth':   return r.eth > 0 ? usd / r.eth : usd * APPROX_RATES.eth
    case 'sol':   return r.sol > 0 ? usd / r.sol : usd * APPROX_RATES.sol
    default:      return usd // USDT/USDC stablecoins — 1:1 with USD
  }
}

export function formatCryptoAmount(amount: number, network: CryptoNetwork): string {
  if (network === 'btc') return amount.toFixed(8)
  if (network === 'eth') return amount.toFixed(6)
  if (network === 'sol') return amount.toFixed(4)
  return amount.toFixed(2) // USDT/USDC stablecoins
}

export function useCryptoRates(): LiveRates | null {
  const [rates, setRates] = useState<LiveRates | null>(_cache)

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      if (_cache && Date.now() - _cache.updatedAt < 60_000) {
        if (!cancelled) setRates(_cache)
        return
      }
      if (_fetching) return
      _fetching = true
      const r = await fetchRates()
      _fetching = false
      if (!cancelled) {
        _cache = r ?? { ...FALLBACK, updatedAt: Date.now() }
        setRates(_cache)
      }
    }

    refresh()
    const id = setInterval(refresh, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return rates
}
