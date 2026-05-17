'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDominantColors } from '@/hooks/useDominantColors';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { cn } from '@/utils/cn';
import DonutChart from '@/components/DonutChart';
import CustomDropdown from '@/components/CustomDropdown';
import AddCryptoModal from '@/components/AddCryptoModal';
import EditCryptoModal from '@/components/EditCryptoModal';
import AlphaRoom from '@/components/AlphaRoom';
import KumaInline from '@/components/portfolio/KumaInline';
import MarketAnalysis from '@/components/MarketAnalysis';
import KumaAIChatTab from '@/components/KumaAIChatTab';
import {
  CirclePlus,
  Triangle,
  RefreshCw,
  Menu,
  X,
  LayoutDashboard,
  Zap,
  TrendingUp,
  Bot,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface PortfolioCoin {
  name: string;
  coinId: string | null;
  value: number;
  unitNum: number;
  logo: string | null;
  pricePerUnit: number;
  change24h?: number;
}

interface MarketPriceEntry {
  price: number;
  change24h: number;
  image: string;
  id: string;
}

type TabId = 'portfolio' | 'alpha' | 'market' | 'kumaai';

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { id: 'portfolio', label: 'AI Portfolio', icon: LayoutDashboard },
  { id: 'alpha', label: 'Alpha Room', icon: Zap },
  { id: 'market', label: 'Market Analysis', icon: TrendingUp },
  { id: 'kumaai', label: 'Kuma AI Chat', icon: Bot },
];

const cryptoLogos: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  KAIA: 'https://assets.coingecko.com/coins/images/39901/standard/KAIA.png',
  PENGU: 'https://assets.coingecko.com/coins/images/52622/standard/PUDGY_PENGUINS_PENGU_PFP.png?1733809110',
  SUI: 'https://assets.coingecko.com/coins/images/26375/standard/sui-ocean-square.png?1727791290',
  DOGE: 'https://assets.coingecko.com/coins/images/5/standard/dogecoin.png?1696501409',
  POL: 'https://assets.coingecko.com/coins/images/32440/standard/polygon.png?1698233684',
};

// ─── Sidebar ───────���─────────────────────────────────────────────────────────
function Sidebar({
  selectedTab,
  onTabChange,
  onClose,
  isMobile,
}: {
  selectedTab: TabId;
  onTabChange: (tab: TabId) => void;
  onClose: () => void;
  isMobile: boolean;
}) {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: '#0a0a0f',
        borderRight: '1px solid rgba(150,237,214,0.12)',
        width: isMobile ? '100%' : 256,
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo192.png" alt="Kumami" className="h-9 w-9 rounded-lg object-contain" />
            <div>
              <div className="text-white font-bold text-base leading-tight tracking-wide">
                Kumami
              </div>
              <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#96EDD6]">
                Pro Dashboard
              </div>
            </div>
          </div>
          {isMobile && (
            <button onClick={onClose} className="p-1 rounded-md text-white/50">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = selectedTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                onTabChange(id);
                if (isMobile) onClose();
              }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-left w-full',
                isActive
                  ? 'text-[#0a0a0f]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
              style={
                isActive
                  ? { background: '#96EDD6', boxShadow: '0 0 16px rgba(150,237,214,0.3)' }
                  : {}
              }
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─── Portfolio Tab ───────────────────────────────────────────────────────────
function PortfolioTab() {
  const { currentUser, userData } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioCoin[]>([]);
  const [metric, setMetric] = useState('total');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<PortfolioCoin | null>(null);
  const [marketPrices, setMarketPrices] = useState<Record<string, MarketPriceEntry>>({});
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const coinColors = useDominantColors(
    portfolio.map((c) => ({ coinId: c.coinId, symbol: c.name }))
  );

  useEffect(() => {
    if (userData && Array.isArray(userData.cryptoPortfolio)) {
      setPortfolio(userData.cryptoPortfolio as PortfolioCoin[]);
    } else {
      setPortfolio([]);
    }
  }, [userData]);

  const fetchMarketPrices = useCallback(async () => {
    try {
      setIsPriceLoading(true);
      setPriceError(null);
      const response = await fetch('/api/coingecko/markets?per_page=100&page=1');
      if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
      const data = await response.json();
      const pricesMap: Record<string, MarketPriceEntry> = {};
      (data as Array<{ symbol: string; current_price: number; price_change_percentage_24h: number; image: string; id: string }>).forEach(
        (coin) => {
          pricesMap[coin.symbol.toUpperCase()] = {
            price: coin.current_price,
            change24h: coin.price_change_percentage_24h,
            image: coin.image,
            id: coin.id,
          };
        }
      );
      setMarketPrices(pricesMap);
      setLastUpdated(new Date());
      setIsPriceLoading(false);
    } catch (error) {
      console.error('Error fetching market prices:', error);
      setPriceError((error as Error).message);
      setIsPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketPrices();
  }, [fetchMarketPrices]);

  useEffect(() => {
    if (Object.keys(marketPrices).length === 0 || portfolio.length === 0) return;
    const updatedPortfolio = portfolio.map((item) => {
      const marketData = marketPrices[item.name];
      if (marketData) {
        return {
          ...item,
          pricePerUnit: marketData.price,
          value: item.unitNum * marketData.price,
          change24h: marketData.change24h,
          logo: marketData.image || item.logo,
        };
      }
      return item;
    });
    setPortfolio(updatedPortfolio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketPrices]);

  const handleAddCrypto = async (newCrypto: PortfolioCoin, existingCoin?: PortfolioCoin) => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) return;
      const uData = userDoc.data();
      const currentPortfolio = (uData.cryptoPortfolio || []) as PortfolioCoin[];
      if (existingCoin) {
        const existingIndex = currentPortfolio.findIndex((c) => c.name === existingCoin.name);
        if (existingIndex >= 0) {
          const coinToUpdate = currentPortfolio[existingIndex];
          const updatedUnitNum = coinToUpdate.unitNum + newCrypto.unitNum;
          const updatedCoin = {
            ...coinToUpdate,
            unitNum: updatedUnitNum,
            value: updatedUnitNum * newCrypto.pricePerUnit,
            pricePerUnit: newCrypto.pricePerUnit,
          };
          const updatedPortfolio = [...currentPortfolio];
          updatedPortfolio[existingIndex] = updatedCoin;
          await updateDoc(userDocRef, { cryptoPortfolio: updatedPortfolio });
          setPortfolio(updatedPortfolio);
        } else {
          const updatedPortfolio = [...currentPortfolio, newCrypto];
          await updateDoc(userDocRef, { cryptoPortfolio: updatedPortfolio });
          setPortfolio(updatedPortfolio);
        }
      } else {
        const updatedPortfolio = [...currentPortfolio, newCrypto];
        await updateDoc(userDocRef, { cryptoPortfolio: updatedPortfolio });
        setPortfolio(updatedPortfolio);
      }
    } catch (err) {
      console.error('Failed to update portfolio:', err);
    }
  };

  const handleEditCrypto = async (editedCrypto: PortfolioCoin) => {
    if (!currentUser || !selectedCoin) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) return;
      const uData = userDoc.data();
      const currentPortfolio = (uData.cryptoPortfolio || []) as PortfolioCoin[];
      const existingIndex = currentPortfolio.findIndex((c) => c.name === selectedCoin.name);
      if (existingIndex >= 0) {
        const updatedPortfolio = [...currentPortfolio];
        updatedPortfolio[existingIndex] = editedCrypto;
        await updateDoc(userDocRef, { cryptoPortfolio: updatedPortfolio });
        setPortfolio(updatedPortfolio);
      }
    } catch (err) {
      console.error('Failed to edit crypto:', err);
    }
  };

  const handleCoinClick = (coin: PortfolioCoin) => {
    setSelectedCoin(coin);
    setIsEditModalOpen(true);
  };

  const totalValue = portfolio.reduce((sum, item) => sum + (item?.value || 0), 0);
  const deltaValue = totalValue > 0 ? Math.round(totalValue * 0.023) : 0;
  const isIncrease = deltaValue >= 0;
  const totalStr = totalValue.toFixed(2);
  const [intPart, fracPart] = totalStr.split('.');
  const formattedInt = Number(intPart).toLocaleString();
  const formattedDeltaValue = Number(deltaValue.toFixed(2)).toLocaleString();
  const increaseInPercent =
    totalValue > 0 ? Math.abs((deltaValue / totalValue) * 100).toFixed(2) : '0.00';

  return (
    <>
      {/* Hero card */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(150,237,214,0.06), rgba(255,255,255,0.02))',
          border: '1px solid rgba(150,237,214,0.18)',
          borderRadius: 18,
          padding: '22px',
          marginBottom: 16,
        }}
      >
        {/* Top row: balance (left) + donut (right, always) */}
        <div className="flex items-center gap-4">
          {/* Balance block */}
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', marginBottom: 6 }}>
              Total balance
            </div>
            <div
              style={{ fontWeight: 800, color: '#fff', fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '-0.02em', lineHeight: 1 }}
              className="text-[28px] sm:text-[42px]"
            >
              ${formattedInt}
              {fracPart !== '00' && (
                <span className="text-[18px] sm:text-[24px]" style={{ opacity: 0.6 }}>.{fracPart}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap" style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
              <span className={cn('flex items-center gap-1 font-bold text-xs', isIncrease ? 'text-green-400' : 'text-red-400')}>
                <Triangle size={7} fill="currentColor" className={cn(!isIncrease && 'rotate-180')} />
                {increaseInPercent}%
              </span>
              <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700, fontSize: 12, color: isIncrease ? '#4ade80' : '#f87171' }}>
                {isIncrease ? '+' : '-'}${formattedDeltaValue}
              </span>
              <span className="hidden sm:inline" style={{ color: 'rgba(255,255,255,0.40)', fontSize: 12 }}>· last 24h</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl font-semibold"
                style={{ background: '#96EDD6', color: '#0a0a0f', padding: '8px 12px', fontSize: 13, boxShadow: '0 0 16px rgba(150,237,214,0.3)' }}
              >
                <CirclePlus size={14} />
                <span className="hidden sm:inline">Add Asset</span>
                <span className="sm:hidden">Add</span>
              </button>
              <button
                onClick={fetchMarketPrices}
                disabled={isPriceLoading}
                className="inline-flex items-center gap-1 rounded-xl font-semibold disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#96EDD6', border: '1px solid rgba(150,237,214,0.3)', padding: '8px 12px', fontSize: 13 }}
              >
                <RefreshCw size={13} className={isPriceLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isPriceLoading ? 'Updating…' : 'Refresh'}</span>
              </button>
              {priceError && <span className="text-xs text-red-400 self-center">Failed</span>}
            </div>
          </div>

          {/* Kuma — desktop only, between balance and donut */}
          {portfolio.length > 0 && (
            <div className="hidden lg:flex justify-center">
              <KumaInline phase={1} />
            </div>
          )}

          {/* Donut — mobile compact (left of balance row) + desktop full */}
          {portfolio.length > 0 && (
            <div className="shrink-0">
              <div className="lg:hidden">
                <DonutChart width={110} height={110} innerRadius={38} outerRadius={52} data={portfolio} colors={coinColors} noAnimation>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold text-white/50">Total</span>
                    <span className="text-[11px] font-black text-white">${formattedInt}</span>
                  </div>
                </DonutChart>
              </div>
              <div className="hidden lg:block">
                <DonutChart width={150} height={150} innerRadius={54} outerRadius={70} data={portfolio} colors={coinColors}>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-white/60">Total</span>
                    <span className="text-sm font-black text-white">${formattedInt}</span>
                  </div>
                </DonutChart>
              </div>
            </div>
          )}
        </div>

        {/* Kuma — mobile, below the balance row */}
        {portfolio.length > 0 && (
          <div className="lg:hidden mt-3">
            <KumaInline phase={1} />
          </div>
        )}
      </div>

      {/* Empty state */}
      {portfolio.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[240px] rounded-xl"
          style={{ background: 'rgba(150,237,214,0.03)', border: '1px solid rgba(150,237,214,0.1)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'rgba(150,237,214,0.1)' }}>
            <CirclePlus size={32} color="#96EDD6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Your portfolio is empty</h3>
          <p className="text-white/50 text-sm mb-4 text-center max-w-xs">
            Add coins to start tracking your portfolio.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: '#96EDD6', color: '#0a0a0f' }}
          >
            Add Your First Coin
          </button>
        </div>
      )}

      {/* Holdings */}
      {portfolio.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-base font-black text-white m-0">
              Holdings{' '}
              <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>
                {portfolio.length}
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <CustomDropdown
                value={metric}
                onChange={setMetric}
                label="Sort by"
                options={[
                  { value: 'total', label: 'Total Value' },
                  { value: 'name', label: 'Name' },
                  { value: 'profit', label: 'Profit' },
                  { value: 'loss', label: 'Loss' },
                ]}
              />
            </div>
          </div>

          {/* Desktop column headers */}
          <div
            className="hidden md:grid px-4 mb-1"
            style={{
              gridTemplateColumns: '40px 1.4fr 1fr 1fr 1fr 36px',
              gap: 12,
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.40)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span />
            <span>Asset</span>
            <span style={{ textAlign: 'right' }}>Price</span>
            <span style={{ textAlign: 'right' }}>24h</span>
            <span style={{ textAlign: 'right' }}>Value</span>
            <span />
          </div>

          <div className="flex flex-col gap-2">
            {portfolio.map((item, idx) => {
              const pct = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0';
              const isUp = (item.change24h ?? 0) >= 0;
              const coinColor = coinColors[idx] ?? '#96EDD6';
              const priceKnown = !priceError && !isPriceLoading && !!marketPrices[item.name];
              return (
                <div
                  key={idx}
                  onClick={() => handleCoinClick(item)}
                  className="cursor-pointer rounded-xl transition-all grid items-center grid-cols-[auto_1fr_auto] md:grid-cols-[40px_1.4fr_1fr_1fr_1fr_36px]"
                  style={{
                    gap: 12,
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(150,237,214,0.18)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  {/* Logo */}
                  <img
                    src={item.logo || cryptoLogos[item.name] || undefined}
                    alt={item.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  {/* Name + allocation */}
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black text-white text-[15px]">{item.name}</span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: `${coinColor}22`,
                          color: coinColor,
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div
                      className="text-[11px]"
                      style={{
                        color: 'rgba(255,255,255,0.65)',
                        fontFamily: 'ui-monospace, Menlo, monospace',
                      }}
                    >
                      {item.unitNum.toFixed(9).replace(/\.?0+$/, '')} {item.name}
                    </div>
                  </div>
                  {/* Price */}
                  <div
                    className="text-right hidden md:block"
                    style={{
                      fontFamily: 'ui-monospace, Menlo, monospace',
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {priceKnown ? `$${item.pricePerUnit.toLocaleString()}` : '—'}
                  </div>
                  {/* 24h */}
                  <div
                    className={cn(
                      'text-right hidden md:flex items-center justify-end gap-1 text-sm font-bold',
                      priceKnown ? (isUp ? 'text-green-400' : 'text-red-400') : 'text-white/40'
                    )}
                  >
                    {priceKnown ? (
                      <>
                        <Triangle size={6} fill="currentColor" className={cn(!isUp && 'rotate-180')} />
                        {Math.abs(item.change24h ?? 0).toFixed(2)}%
                      </>
                    ) : '—'}
                  </div>
                  {/* Value + mobile 24h */}
                  <div className="text-right">
                    <div
                      style={{
                        fontFamily: 'ui-monospace, Menlo, monospace',
                        fontWeight: 800,
                        fontSize: 15,
                        color: '#fff',
                      }}
                    >
                      {priceKnown ? `$${item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                    </div>
                    <div
                      className={cn(
                        'md:hidden flex items-center justify-end gap-0.5 text-[11px] font-bold mt-0.5',
                        priceKnown ? (isUp ? 'text-green-400' : 'text-red-400') : 'text-white/40'
                      )}
                    >
                      {priceKnown ? (
                        <>
                          <Triangle size={5} fill="currentColor" className={cn(!isUp && 'rotate-180')} />
                          {Math.abs(item.change24h ?? 0).toFixed(2)}%
                        </>
                      ) : '—'}
                    </div>
                  </div>
                  {/* Action dot */}
                  <button
                    onClick={e => { e.stopPropagation(); handleCoinClick(item); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hidden md:flex"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.40)',
                      cursor: 'pointer',
                      fontSize: 16,
                    }}
                  >
                    ⋯
                  </button>
                </div>
              );
            })}
          </div>

          {lastUpdated && (
            <div className="text-center mt-3">
              <span className="text-[11px] text-white/40">
                Prices updated {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}

      <AddCryptoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddCrypto}
        portfolio={portfolio}
      />
      <EditCryptoModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onEdit={handleEditCrypto}
        coin={selectedCoin}
        marketPrices={marketPrices}
        onRefreshPrices={fetchMarketPrices}
        lastUpdated={lastUpdated}
        isPriceLoading={isPriceLoading}
      />
    </>
  );
}

// ─── ProDashboard ───────────��────────────────────────────────────────────────
export default function ProDashboard() {
  const [selectedTab, setSelectedTab] = useState<TabId>(() => {
    if (typeof window !== 'undefined') {
      const proTab = sessionStorage.getItem('proTab');
      if (proTab) {
        sessionStorage.removeItem('proTab');
        return proTab as TabId;
      }
    }
    return 'portfolio';
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const renderContent = () => {
    switch (selectedTab) {
      case 'portfolio':
        return <PortfolioTab />;
      case 'alpha':
        return (
          <div className="w-full h-full flex-1 overflow-hidden">
            <AlphaRoom />
          </div>
        );
      case 'market':
        return (
          <div className="w-full flex flex-col min-h-[480px]">
            <MarketAnalysis />
          </div>
        );
      case 'kumaai':
        return (
          <div className="w-full flex-1 overflow-hidden" style={{ minHeight: 400 }}>
            <KumaAIChatTab />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#0a0a0f', color: '#fff' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          onClose={() => {}}
          isMobile={false}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-[1600] bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed top-[112px] left-0 bottom-0 z-[1700] w-72" style={{ background: '#0a0a0f' }}>
            <Sidebar
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
              onClose={() => setSidebarOpen(false)}
              isMobile
            />
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-auto">
        {/* Mobile top bar */}
        <div
          className="flex md:hidden items-center gap-3 px-4 py-3 sticky top-[112px] z-[1550]"
          style={{
            background: '#0a0a0f',
            borderBottom: '1px solid rgba(150,237,214,0.1)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-[#96EDD6]"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-[#96EDD6]">Kumami Pro</span>
          <span className="ml-auto text-xs text-white/40">
            {NAV_ITEMS.find((n) => n.id === selectedTab)?.label}
          </span>
        </div>

        {/* Tab content */}
        <div className="flex-1 pt-4 px-4 pb-6">{renderContent()}</div>
      </div>
    </div>
  );
}
