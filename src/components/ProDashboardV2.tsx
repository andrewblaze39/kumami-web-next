'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { cn } from '@/utils/cn';
import DonutChart from '@/components/DonutChart';
import CustomDropdown from '@/components/CustomDropdown';
import AddCryptoModal from '@/components/AddCryptoModal';
import EditCryptoModal from '@/components/EditCryptoModal';
import AlphaRoom from '@/components/AlphaRoom';
import MarketAnalysis from '@/components/MarketAnalysis';
import KumaAIChatTab from '@/components/KumaAIChatTab';
import MarketCapTool from '@/components/MarketCapTool';
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
  Calculator,
} from 'lucide-react';

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

type TabId = 'portfolio' | 'alpha' | 'market' | 'kumaai' | 'marketcap';

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { id: 'portfolio', label: 'AI Portfolio', icon: LayoutDashboard },
  { id: 'alpha', label: 'Alpha Room', icon: Zap },
  { id: 'market', label: 'Market Analysis', icon: TrendingUp },
  { id: 'kumaai', label: 'Kuma AI Chat', icon: Bot },
  { id: 'marketcap', label: 'Market Cap Tool', icon: Calculator },
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

// ─── Sidebar ────────────────────────────────────────────────────────────────
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
  const router = useRouter();

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

      {/* Bottom: Switch to Classic */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(150,237,214,0.1)' }}>
        <button
          onClick={() => router.push('/')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-[#96EDD6]/5 hover:border-[#96EDD6]/50 hover:text-[#96EDD6]"
          style={{
            borderColor: 'rgba(150,237,214,0.25)',
            color: 'rgba(150,237,214,0.6)',
            background: 'transparent',
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

// ─── Portfolio Tab ──────────────────────────────────────────────────────────
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
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
      );
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
      <div className="flex flex-col lg:flex-row py-4 lg:py-6 px-4 items-start gap-4 w-full bg-black/20 rounded-xl">
        <div className="flex w-full lg:basis-1/3 justify-center">
          {portfolio.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full min-h-[260px] lg:min-h-[480px] bg-[#102425]/50 rounded-xl">
              <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-[#96EDD6]/20 flex items-center justify-center">
                  <CirclePlus className="h-8 w-8 lg:h-10 lg:w-10 text-[#96EDD6]" />
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
                  className="px-4 py-2 bg-[#96EDD6] text-[#102425] font-bold rounded-lg hover:bg-[#96EDD6]/90 transition-colors flex items-center gap-2"
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
                        'flex items-center justify-center gap-1 text-[#22FFB5] text-xs font-semibold',
                        !isIncrease && 'text-red-500'
                      )}
                    >
                      {isIncrease ? <Triangle size={6} fill="#22FFB5" /> : '-'}$
                      {formattedDeltaValue} ({increaseInPercent}%)
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
                        'flex items-center justify-center gap-1 text-[#22FFB5] text-[15px] font-semibold',
                        !isIncrease && 'text-red-500'
                      )}
                    >
                      {isIncrease ? <Triangle size={8} fill="#22FFB5" /> : '-'}$
                      {formattedDeltaValue} ({increaseInPercent}%)
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
            style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}
          >
            <div className="flex flex-wrap gap-2 items-center">
              <p className="text-xl lg:text-3xl font-black mb-0">Portfolio</p>
              <button
                type="button"
                aria-label="Add Asset"
                className="inline-flex items-center gap-1.5 transition-colors rounded-xl text-sm font-semibold"
                style={{
                  background: '#96EDD6',
                  color: '#0a0a0f',
                  padding: '8px 16px',
                  boxShadow: '0 0 12px rgba(150,237,214,0.2)',
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
                  className="inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px] text-sm font-semibold text-[#96EDD6] hover:bg-[#96EDD6]/10"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(150,237,214,0.3)',
                    padding: '8px 16px',
                  }}
                >
                  <RefreshCw size={14} className={isPriceLoading ? 'animate-spin' : ''} />
                  {isPriceLoading ? 'Updating...' : 'Refresh Prices'}
                </button>
              </div>
              {priceError && <span className="text-xs text-red-400">Price update failed</span>}
            </div>
            <div className="flex items-center">
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

          <div className="relative max-h-[400px] lg:flex-1 lg:max-h-none overflow-y-scroll pr-2 lg:pr-4">
            {portfolio.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 px-4">
                <p className="text-white/70 text-center mb-4">
                  Your portfolio list is currently empty. Click the &quot;+&quot; button above to
                  add cryptocurrencies to your portfolio.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-[#96EDD6] text-[#102425] font-bold rounded-lg hover:bg-[#96EDD6]/90 transition-colors flex items-center gap-2"
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
                        <img
                          src={item.logo || cryptoLogos[item.name] || ''}
                          alt={item.name}
                          loading="lazy"
                          className="w-[38px] h-[38px] rounded-full object-cover"
                        />
                      </DonutChart>
                      <div className="flex flex-col flex-1">
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-[#96EDD6]/10 rounded-md px-1 gap-2"
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
                                  item.change24h >= 0 ? 'text-green-400' : 'text-red-400'
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
                    <span className="ml-2 text-[#96EDD6]">
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

// ─── ProDashboardV2 ─────────────────────────────────────────────────────────
export default function ProDashboardV2() {
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
      case 'marketcap':
        return (
          <div className="w-full overflow-auto">
            <MarketCapTool />
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
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 z-50 w-72" style={{ background: '#0a0a0f' }}>
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
          className="flex md:hidden items-center gap-3 px-4 py-3 sticky top-0 z-30"
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
