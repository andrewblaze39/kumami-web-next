'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, ArrowLeftRight, TrendingUp, TrendingDown, RefreshCw, ChevronDown, BarChart3 } from 'lucide-react'

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = {
  price(p: number | null | undefined): string {
    if (p == null) return 'N/A'
    if (p >= 10000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 })
    if (p >= 100)   return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 2 })
    if (p >= 1)     return '$' + p.toFixed(4)
    if (p >= 0.001) return '$' + p.toFixed(5)
    return '$' + p.toFixed(8)
  },
  cap(n: number | null | undefined): string {
    if (n == null) return 'N/A'
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(3) + 'T'
    if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M'
    return '$' + n.toLocaleString()
  },
  supply(n: number | null | undefined): string {
    if (n == null) return 'N/A'
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
    if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M'
    if (n >= 1e3)  return (n / 1e3).toFixed(2) + 'K'
    return n.toFixed(0)
  },
  mult(x: number | null | undefined): string {
    if (x == null) return 'N/A'
    if (x >= 1000) return x.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '×'
    if (x >= 10)   return x.toFixed(1) + '×'
    return x.toFixed(2) + '×'
  },
  pct(x: number | null | undefined): string {
    if (x == null) return 'N/A'
    const sign = x >= 0 ? '+' : ''
    return sign + x.toFixed(2) + '%'
  },
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Coin {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  circulating_supply: number
  fully_diluted_valuation: number | null
  ath: number
  price_change_percentage_24h: number
}

interface CalcResult {
  targetPrice: number
  multiplier: number
  pctChange: number
  isGain: boolean
}

// ── Coin Selector Dropdown ────────────────────────────────────────────────────
function CoinSelector({
  label, selected, onSelect, coins,
}: {
  label: string
  selected: Coin | null
  onSelect: (c: Coin) => void
  coins: Coin[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return coins.slice(0, 100)
    const q = query.toLowerCase()
    return coins
      .filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
      .slice(0, 80)
  }, [coins, query])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'rgba(150,237,214,0.6)', marginBottom: 8,
      }}>{label}</div>

      <button
        onClick={() => { setOpen(o => !o); setQuery('') }}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 14,
          background: open ? 'rgba(150,237,214,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1.5px solid ${open ? '#96EDD6' : 'rgba(150,237,214,0.15)'}`,
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', transition: 'all .2s ease', textAlign: 'left',
        }}
      >
        {selected ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.image} alt={selected.name}
              style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em',
                lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{selected.name}</div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>{selected.symbol}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                {fmt.price(selected.current_price)}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: selected.price_change_percentage_24h >= 0 ? '#22FFB5' : '#f87171',
              }}>
                {fmt.pct(selected.price_change_percentage_24h)}
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, fontSize: 15, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
            Select a coin…
          </div>
        )}
        <ChevronDown size={16} style={{
          color: 'rgba(255,255,255,0.4)', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform .2s ease',
        }}/>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
          borderRadius: 14, overflow: 'hidden',
          background: '#0f1a1c',
          border: '1.5px solid rgba(150,237,214,0.2)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search coins…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  width: '100%', padding: '8px 36px 8px 12px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 13, outline: 'none',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
              <Search size={14} style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
              }}/>
            </div>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                No coins found
              </div>
            ) : filtered.map(coin => (
              <button
                key={coin.id}
                onClick={() => { onSelect(coin); setOpen(false); setQuery('') }}
                style={{
                  width: '100%', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: selected?.id === coin.id ? 'rgba(150,237,214,0.1)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background .15s ease',
                }}
                onMouseEnter={e => { if (selected?.id !== coin.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (selected?.id !== coin.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coin.image} alt={coin.name}
                  style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: '#fff',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{coin.name}</div>
                  <div style={{
                    fontSize: 10, color: 'rgba(255,255,255,0.4)',
                    fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>{coin.symbol}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                    {fmt.price(coin.current_price)}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 600,
                    color: coin.price_change_percentage_24h >= 0 ? '#22FFB5' : '#f87171',
                  }}>
                    {fmt.pct(coin.price_change_percentage_24h)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stat row ──────────────────────────────────────────────────────────────────
function StatRow({
  label, valueA, valueB, highlightB,
}: {
  label: string
  valueA: React.ReactNode
  valueB: React.ReactNode
  highlightB?: boolean
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 120px 1fr',
      alignItems: 'center', gap: 8,
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{valueA ?? '—'}</div>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.3)', textAlign: 'center',
      }}>{label}</div>
      <div style={{
        fontSize: 13, fontWeight: 700, textAlign: 'right',
        color: highlightB ? '#96EDD6' : 'rgba(255,255,255,0.7)',
      }}>{valueB ?? '—'}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MarketCapTool() {
  const [coins, setCoins] = useState<Coin[]>([])
  const [coinA, setCoinA] = useState<Coin | null>(null)
  const [coinB, setCoinB] = useState<Coin | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchCoins = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      // Retry up to 3 times with exponential backoff for 429s
      let res: Response | null = null
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
        res = await fetch('/api/coingecko/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1')
        if (res.status !== 429) break
      }
      if (!res || !res.ok) throw new Error(`API error: ${res?.status ?? 'unknown'}`)
      const data: Coin[] = await res.json()

      setCoins(data)
      setLastUpdated(new Date())

      if (!isRefresh) {
        setCoinA(data.find(c => c.symbol === 'xrp') ?? data[5])
        setCoinB(data.find(c => c.symbol === 'btc') ?? data[0])
      } else {
        setCoinA(prev => prev ? (data.find(c => c.id === prev.id) ?? prev) : prev)
        setCoinB(prev => prev ? (data.find(c => c.id === prev.id) ?? prev) : prev)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchCoins() }, [])

  const swap = () => { setCoinA(coinB); setCoinB(coinA) }

  const calc = useMemo((): CalcResult | null => {
    if (!coinA || !coinB || !coinA.circulating_supply || !coinB.market_cap) return null
    const targetPrice = coinB.market_cap / coinA.circulating_supply
    const multiplier = targetPrice / coinA.current_price
    const pctChange = ((targetPrice - coinA.current_price) / coinA.current_price) * 100
    return { targetPrice, multiplier, pctChange, isGain: targetPrice > coinA.current_price }
  }, [coinA, coinB])

  const gainColor = '#22FFB5'
  const lossColor = '#f87171'

  if (loading) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
        {[240, 80, 180, 240].map((h, i) => (
          <div key={i} style={{
            height: h, borderRadius: 16,
            background: 'rgba(255,255,255,0.05)',
            marginBottom: 20,
            animation: 'mcPulse 1.5s ease-in-out infinite',
          }}/>
        ))}
        <style>{`@keyframes mcPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Failed to load coin data</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>{error}</div>
        <button onClick={() => fetchCoins()} style={{
          padding: '10px 24px', borderRadius: 10,
          background: '#96EDD6', color: '#0a0a0f',
          fontWeight: 800, fontSize: 14, cursor: 'pointer', border: 'none',
        }}>Try again</button>
      </div>
    )
  }

  return (
    <div style={{
      padding: '28px 20px 48px',
      maxWidth: 900, margin: '0 auto',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, marginBottom: 28, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <BarChart3 size={18} style={{ color: '#96EDD6' }}/>
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: '#96EDD6',
            }}>Market Cap Calculator</span>
          </div>
          <h2 style={{
            margin: 0, fontSize: 24, fontWeight: 900, color: '#fff',
            letterSpacing: '-0.025em', lineHeight: 1.1,
          }}>
            What if <span style={{ color: '#96EDD6' }}>{coinA?.name ?? '…'}</span> had{' '}
            <span style={{ color: '#A78BFA' }}>{coinB?.name ?? '…'}</span>&apos;s market cap?
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => fetchCoins(true)}
            disabled={refreshing}
            style={{
              padding: '8px 14px', borderRadius: 9,
              background: 'rgba(150,237,214,0.08)',
              border: '1px solid rgba(150,237,214,0.2)',
              color: '#96EDD6', cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700,
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'mcSpin 1s linear infinite' : 'none' }}/>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Coin selectors ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 24, flexWrap: 'wrap',
      }}>
        <CoinSelector label="Analyze this coin" selected={coinA} onSelect={setCoinA} coins={coins}/>

        <button
          onClick={swap}
          style={{
            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(150,237,214,0.1)',
            border: '1.5px solid rgba(150,237,214,0.25)',
            color: '#96EDD6', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .2s ease', alignSelf: 'flex-end',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(150,237,214,0.2)'
            e.currentTarget.style.transform = 'rotate(180deg)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(150,237,214,0.1)'
            e.currentTarget.style.transform = 'rotate(0deg)'
          }}
          title="Swap coins"
        >
          <ArrowLeftRight size={17}/>
        </button>

        <CoinSelector label="Target market cap of" selected={coinB} onSelect={setCoinB} coins={coins}/>
      </div>

      {/* ── Result hero card ── */}
      {calc && coinA && coinB ? (
        <div style={{
          borderRadius: 20, overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(150,237,214,0.07) 0%, rgba(167,139,250,0.05) 100%)',
          border: '1.5px solid rgba(150,237,214,0.18)',
          marginBottom: 20,
        }}>
          {/* Top bar */}
          <div style={{
            padding: '14px 24px',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coinA.image} alt={coinA.name} style={{ width: 22, height: 22, borderRadius: '50%' }}/>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
              If <strong style={{ color: '#fff' }}>{coinA.name} ({coinA.symbol.toUpperCase()})</strong> had{' '}
              <strong style={{ color: '#A78BFA' }}>{coinB.name}</strong>&apos;s market cap of{' '}
              <strong style={{ color: '#A78BFA' }}>{fmt.cap(coinB.market_cap)}</strong>
            </span>
          </div>

          {/* Main result */}
          <div style={{
            padding: '28px 24px 24px',
            display: 'grid', gridTemplateColumns: 'auto 1px auto',
            alignItems: 'center', gap: 24,
          }}>
            {/* Target price */}
            <div>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'rgba(150,237,214,0.6)', marginBottom: 6,
              }}>Target price</div>
              <div style={{
                fontSize: 52, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1,
                background: 'linear-gradient(90deg, #96EDD6, #A78BFA)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{fmt.price(calc.targetPrice)}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                vs current {fmt.price(coinA.current_price)}
              </div>
            </div>

            <div style={{ height: 80, background: 'rgba(255,255,255,0.08)' }}/>

            {/* Multiplier */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6,
              }}>{calc.isGain ? 'Potential gain' : 'Potential loss'}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 12,
                background: calc.isGain ? 'rgba(34,255,181,0.12)' : 'rgba(248,113,113,0.12)',
                border: `1.5px solid ${calc.isGain ? 'rgba(34,255,181,0.3)' : 'rgba(248,113,113,0.3)'}`,
                marginBottom: 10,
              }}>
                {calc.isGain
                  ? <TrendingUp size={18} style={{ color: gainColor }}/>
                  : <TrendingDown size={18} style={{ color: lossColor }}/>
                }
                <span style={{
                  fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em',
                  color: calc.isGain ? gainColor : lossColor,
                }}>{fmt.mult(calc.multiplier)}</span>
              </div>
              <div style={{
                fontSize: 14, fontWeight: 800,
                color: calc.isGain ? gainColor : lossColor,
              }}>
                {calc.isGain ? '▲' : '▼'} {Math.abs(calc.pctChange).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          borderRadius: 20, padding: '40px 24px', textAlign: 'center',
          background: 'rgba(255,255,255,0.03)',
          border: '1.5px solid rgba(150,237,214,0.1)',
          marginBottom: 20,
          color: 'rgba(255,255,255,0.35)', fontSize: 15,
        }}>
          Select two coins above to see the comparison
        </div>
      )}

      {/* ── Stats comparison table ── */}
      {coinA && coinB && (
        <div style={{
          borderRadius: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 1fr',
            padding: '14px 20px',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coinA.image} alt={coinA.name} style={{ width: 22, height: 22, borderRadius: '50%' }}/>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#96EDD6' }}>{coinA.symbol.toUpperCase()}</span>
            </div>
            <div style={{
              textAlign: 'center', fontSize: 10, fontWeight: 800,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>vs</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#A78BFA' }}>{coinB.symbol.toUpperCase()}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coinB.image} alt={coinB.name} style={{ width: 22, height: 22, borderRadius: '50%' }}/>
            </div>
          </div>

          <div style={{ padding: '4px 20px 8px' }}>
            <StatRow label="Price"
              valueA={fmt.price(coinA.current_price)}
              valueB={fmt.price(coinB.current_price)}/>
            <StatRow label="Market Cap"
              valueA={fmt.cap(coinA.market_cap)}
              valueB={fmt.cap(coinB.market_cap)}
              highlightB/>
            <StatRow label="Circ. Supply"
              valueA={fmt.supply(coinA.circulating_supply)}
              valueB={fmt.supply(coinB.circulating_supply)}/>
            <StatRow label="24h Change"
              valueA={<span style={{ color: coinA.price_change_percentage_24h >= 0 ? gainColor : lossColor }}>{fmt.pct(coinA.price_change_percentage_24h)}</span>}
              valueB={<span style={{ color: coinB.price_change_percentage_24h >= 0 ? gainColor : lossColor }}>{fmt.pct(coinB.price_change_percentage_24h)}</span>}/>
            <StatRow label="CMC Rank"
              valueA={coinA.market_cap_rank ? `#${coinA.market_cap_rank}` : '—'}
              valueB={coinB.market_cap_rank ? `#${coinB.market_cap_rank}` : '—'}/>
            <StatRow label="All-Time High"
              valueA={fmt.price(coinA.ath)}
              valueB={fmt.price(coinB.ath)}/>
            <StatRow label="FDV"
              valueA={fmt.cap(coinA.fully_diluted_valuation)}
              valueB={fmt.cap(coinB.fully_diluted_valuation)}/>
          </div>
        </div>
      )}

      {/* ── Insight blurb ── */}
      {calc && coinA && coinB && (
        <div style={{
          marginTop: 16, padding: '14px 18px', borderRadius: 12,
          background: 'rgba(167,139,250,0.06)',
          border: '1px solid rgba(167,139,250,0.15)',
          fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6,
        }}>
          💡 <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{coinA.name}</strong> has a market cap
          of <strong style={{ color: '#96EDD6' }}>{fmt.cap(coinA.market_cap)}</strong>.{' '}
          To match <strong style={{ color: '#A78BFA' }}>{coinB.name}</strong>&apos;s{' '}
          <strong style={{ color: '#A78BFA' }}>{fmt.cap(coinB.market_cap)}</strong>, it would need to{' '}
          {calc.isGain
            ? <><strong style={{ color: '#22FFB5' }}>grow {fmt.mult(calc.multiplier)}</strong> from here.</>
            : <><strong style={{ color: '#f87171' }}>shrink by {Math.abs(100 - (calc.multiplier * 100)).toFixed(1)}%</strong>.</>
          }
        </div>
      )}

      <style>{`
        @keyframes mcSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes mcPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
