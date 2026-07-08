'use client';

/**
 * PortfolioTab — Kumami World port of the CRA Pro Dashboard portfolio manager
 * (kumami-web/src/pages/Pro/DashboardV2.js → PortfolioTab).
 *
 * Data contract (byte-compatible with CRA so both apps interoperate):
 *   users/{uid}.cryptoPortfolio: Array<{
 *     name, coinId, value, unitNum, logo, pricePerUnit, change24h? }>
 * Prices come from CoinGecko coins/markets (keyless) with a manual refresh
 * button. Restyled with Kumami World design tokens (var(--panel), 18px radius,
 * turquoise accent) — functionality identical to CRA.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { cn } from '@/utils/cn';
import DonutChart from './DonutChart';
import AddCryptoModal from './AddCryptoModal';
import EditCryptoModal from './EditCryptoModal';
import { CirclePlus, Triangle, RefreshCw } from 'lucide-react';
import { computePortfolio24hDelta } from './portfolioDelta';

// ─── Types ──────────────────────────────────────────────────────────────────
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

// ─── Sort dropdown (port of CRA CustomDropdown, world-token styling) ─────────
interface DropdownOption {
  value: string;
  label: string;
}

function SortDropdown({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="inline-flex items-center justify-between gap-2 px-4 py-2 rounded-2xl cursor-pointer transition-colors min-w-[160px] hover:bg-[#00c2c7]/10"
        style={{ border: '2px solid var(--accent)' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-white font-black text-sm">
          {selectedOption?.label || label}
        </span>
        <Triangle
          className={`w-3 h-3 text-[#00c2c7] transition-transform duration-200 ${
            isOpen ? '' : 'rotate-180'
          }`}
          fill="currentColor"
        />
      </div>

      {isOpen && (
        <div
          className="absolute top-full mt-1 left-0 right-0 rounded-xl overflow-hidden shadow-lg z-50 min-w-[160px]"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--border-2)' }}
        >
          <div
            className="px-3 py-2 text-sm text-white"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            Sort by
          </div>
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                'px-3 py-1 cursor-pointer transition-colors text-md font-extrabold',
                option.value === value
                  ? 'bg-[#00c2c7] text-[#00272a]'
                  : 'text-white hover:bg-[#00c2c7]/20'
              )}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Portfolio Tab ──────────────────────────────────────────────────────────
export default function PortfolioTab() {
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
      // Retry up to 3 times with exponential backoff for 429s
      let response: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        response = await fetch('/api/coingecko/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1');
        if (response.status !== 429) break;
      }
      if (!response || !response.ok) throw new Error(`API request failed with status ${response?.status ?? 'unknown'}`);
      const data = await response.json();
      const pricesMap: Record<string, MarketPriceEntry> = {};
      (data as Array<{
        symbol: string;
        current_price: number;
        price_change_percentage_24h: number;
        image: string;
        id: string;
      }>).forEach((coin) => {
        pricesMap[coin.symbol.toUpperCase()] = {
          price: coin.current_price,
          change24h: coin.price_change_percentage_24h,
          image: coin.image,
          id: coin.id,
        };
      });
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

  // Real 24h P&L: sum of (value - value / (1 + change24h/100)) per holding that has price data.
  // Uses computePortfolio24hDelta which guards against pct <= -100 (dead tokens from CoinGecko)
  // and excludes null change24h values (CoinGecko returns null for some coins).
  const { hasPriceData, deltaValue } = computePortfolio24hDelta(portfolio);

  const isIncrease = deltaValue >= 0;
  const totalStr = totalValue.toFixed(2);
  const [intPart, fracPart] = totalStr.split('.');
  const formattedInt = Number(intPart).toLocaleString();
  const formattedDeltaValue = hasPriceData
    ? Math.abs(deltaValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';
  const increaseInPercent =
    hasPriceData && totalValue > 0
      ? Math.abs((deltaValue / totalValue) * 100).toFixed(2)
      : '0.00';

  return (
    <>
      <div
        className="flex flex-col lg:flex-row py-4 lg:py-6 px-4 items-start gap-4 w-full text-white"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius, 18px)',
        }}
      >
        <div className="flex w-full lg:basis-1/3 justify-center">
          {portfolio.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center w-full min-h-[260px] lg:min-h-[480px] rounded-xl"
              style={{ background: 'var(--panel-2)' }}
            >
              <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-[#00c2c7]/20 flex items-center justify-center">
                  <CirclePlus className="h-8 w-8 lg:h-10 lg:w-10 text-[#00c2c7]" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-white">
                  Your portfolio is empty
                </h3>
                <p className="text-white/70 max-w-xs text-sm lg:text-base">
                  Add coins to your portfolio to see your investments visualized here with detailed
                  analytics.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-[#00c2c7] text-[#00272a] font-bold rounded-lg hover:bg-[#00c2c7]/90 transition-colors flex items-center gap-2"
                >
                  <CirclePlus className="h-4 w-4" />
                  Add Your First Coin
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile donut */}
              <div className="flex lg:hidden">
                <DonutChart
                  width={280}
                  height={280}
                  innerRadius={108}
                  outerRadius={130}
                  data={portfolio}
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="flex text-white font-semibold leading-none items-center">
                      <span className="text-xl mr-1">$</span>
                      <span className="text-xl">{formattedInt}</span>
                      {fracPart !== '00' && (
                        <>
                          <span className="text-xl self-end">.</span>
                          <span className="text-base self-end">{fracPart}</span>
                        </>
                      )}
                    </div>
                    <div
                      className={cn(
                        'flex items-center justify-center gap-1 text-[#46e3a0] text-xs font-semibold',
                        !isIncrease && hasPriceData && 'text-[#ff6b81]'
                      )}
                    >
                      {hasPriceData ? (
                        <>{isIncrease ? <Triangle size={6} fill="#46e3a0" /> : '-'}${formattedDeltaValue} ({increaseInPercent}%)</>
                      ) : (
                        <span className="text-white/50">{formattedDeltaValue}</span>
                      )}
                    </div>
                  </div>
                </DonutChart>
              </div>
              {/* Desktop donut */}
              <div className="hidden lg:flex">
                <DonutChart width={480} height={480} data={portfolio}>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="flex text-white font-semibold leading-none items-center">
                      <span className="text-3xl mr-1">$</span>
                      <span className="text-3xl">{formattedInt}</span>
                      {fracPart !== '00' && (
                        <>
                          <span className="text-3xl self-end">.</span>
                          <span className="text-xl self-end">{fracPart}</span>
                        </>
                      )}
                    </div>
                    <div
                      className={cn(
                        'flex items-center justify-center gap-1 text-[#46e3a0] text-[15px] font-semibold',
                        !isIncrease && hasPriceData && 'text-[#ff6b81]'
                      )}
                    >
                      {hasPriceData ? (
                        <>{isIncrease ? <Triangle size={8} fill="#46e3a0" /> : '-'}${formattedDeltaValue} ({increaseInPercent}%)</>
                      ) : (
                        <span className="text-white/50">{formattedDeltaValue}</span>
                      )}
                    </div>
                  </div>
                </DonutChart>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col w-full lg:basis-2/3 h-auto lg:h-[450px]">
          <div
            className="flex items-center justify-between flex-wrap gap-3 w-full pt-2 lg:pt-12 pb-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex flex-wrap gap-2 items-center">
              <p className="text-xl lg:text-3xl font-black mb-0">Portfolio</p>
              <button
                type="button"
                aria-label="Add Asset"
                className="inline-flex items-center gap-1.5 transition-colors rounded-xl text-sm font-semibold"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  padding: '8px 16px',
                  boxShadow: '0 0 12px rgba(0,194,199,0.2)',
                }}
                onClick={() => setIsModalOpen(true)}
              >
                <span className="text-base leading-none font-bold">+</span>
                Add Asset
              </button>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, display: 'inline-flex' }}>
                <button
                  onClick={fetchMarketPrices}
                  disabled={isPriceLoading}
                  className="inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px] text-sm font-semibold text-[#00c2c7] hover:bg-[#00c2c7]/10"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(0,194,199,0.3)',
                    padding: '8px 16px',
                  }}
                >
                  <RefreshCw size={14} className={isPriceLoading ? 'animate-spin' : ''} />
                  {isPriceLoading ? 'Updating...' : 'Refresh Prices'}
                </button>
              </div>
              {priceError && <span className="text-xs text-[#ff6b81]">Price update failed</span>}
            </div>
            <div className="flex items-center">
              <SortDropdown
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

          <div className="relative max-h-[400px] lg:flex-1 lg:max-h-none overflow-y-scroll pr-2 lg:pr-4">
            {portfolio.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 px-4">
                <p className="text-white/70 text-center mb-4">
                  Your portfolio list is currently empty. Click the &quot;+&quot; button above to
                  add cryptocurrencies to your portfolio.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-[#00c2c7] text-[#00272a] font-bold rounded-lg hover:bg-[#00c2c7]/90 transition-colors flex items-center gap-2"
                >
                  <CirclePlus className="h-4 w-4" />
                  Add Cryptocurrency
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {portfolio.map((item, idx) => (
                  <div key={idx} className="rounded-xl">
                    <div className="flex items-center gap-3">
                      <DonutChart
                        width={76}
                        height={76}
                        innerRadius={28}
                        outerRadius={34}
                        data={portfolio}
                        highlightIndex={idx}
                        dimOpacity={0.2}
                        cornerRadius={1}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.logo || cryptoLogos[item.name] || ''}
                          alt={item.name}
                          loading="lazy"
                          className="w-[38px] h-[38px] rounded-full object-cover"
                        />
                      </DonutChart>
                      <div className="flex flex-col flex-1">
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-[#00c2c7]/10 rounded-md px-1 gap-2"
                          onClick={() => handleCoinClick(item)}
                        >
                          <span className="text-2xl font-extrabold text-white">{item.name}</span>
                          <span className="text-lg font-bold text-white">
                            ${item.value.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center">
                            <span className="font-semibold text-[10px] text-white mr-2">
                              {totalValue > 0
                                ? ((item.value / totalValue) * 100).toFixed(2)
                                : '0.00'}
                              %
                            </span>
                            {item.change24h !== undefined && (
                              <span
                                className={`font-semibold text-[10px] flex items-center ${
                                  item.change24h >= 0 ? 'text-[#46e3a0]' : 'text-[#ff6b81]'
                                }`}
                              >
                                {item.change24h >= 0 ? '+' : ''}
                                {item.change24h?.toFixed(2)}%
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-[10px] text-white">{`${item.unitNum
                            .toFixed(9)
                            .replace(/\.?0+$/, '')} ${item.name}`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {lastUpdated && (
              <div className="w-full text-center mt-4 pb-2">
                <span className="text-xs text-white/70">
                  Prices last updated: {lastUpdated.toLocaleTimeString()}
                  {isPriceLoading && (
                    <span className="ml-2 text-[#00c2c7]">
                      <RefreshCw size={10} className="inline animate-spin mr-1" />
                      Updating...
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

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
