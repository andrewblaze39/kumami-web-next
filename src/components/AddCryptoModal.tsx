'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Triangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/utils/cn';

const CATEGORY_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'top10', label: 'Top 10' },
  { id: 'defi', label: 'DeFi' },
  { id: 'ai', label: 'AI' },
  { id: 'memes', label: 'Memes' },
  { id: 'layer1', label: 'Layer 1s' },
  { id: 'layer2', label: 'Layer 2s' },
];

interface CoinGeckoItem {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
}

interface PortfolioCoin {
  name: string;
  coinId: string | null;
  value: number;
  unitNum: number;
  logo: string | null;
  pricePerUnit: number;
  change24h?: number;
}

interface AddCryptoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newCrypto: PortfolioCoin, existingCoin?: PortfolioCoin) => void;
  portfolio?: PortfolioCoin[];
}

export default function AddCryptoModal({
  isOpen,
  onClose,
  onAdd,
  portfolio = [],
}: AddCryptoModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<CoinGeckoItem | null>(null);
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [cryptoList, setCryptoList] = useState<CoinGeckoItem[]>([]);
  const [filteredList, setFilteredList] = useState<CoinGeckoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUsdFocused, setIsUsdFocused] = useState(false);
  const [mobileStep, setMobileStep] = useState<'select' | 'amount'>('select');
  const [isMobile, setIsMobile] = useState(false);
  const [recent, setRecent] = useState<Array<{ coinId: string; symbol: string; logo: string | null }>>([]);
  const [pulse, setPulse] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [activeChip, setActiveChip] = useState<string>('all');

  // Live search state
  const [searchResults, setSearchResults] = useState<CoinGeckoItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Price fetch state: coinId -> loading
  const [fetchingPriceFor, setFetchingPriceFor] = useState<string | null>(null);
  // Batch price enrichment in progress for search results
  const [isFetchingBatchPrices, setIsFetchingBatchPrices] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearchMode = searchQuery.length >= 2;

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load top 100 on open
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/coingecko/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1')
        .then((res) => res.json())
        .then((data: CoinGeckoItem[]) => {
          setCryptoList(data);
          setFilteredList(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching crypto data:', err);
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  // Browse mode: filter pre-loaded list by chip
  useEffect(() => {
    if (isSearchMode) return; // search mode handled separately
    let list = cryptoList;
    if (activeChip !== 'all') {
      const CHIP_KEYWORDS: Record<string, RegExp> = {
        top10: /./,
        defi: /uniswap|aave|compound|maker|curve|yearn|sushi|lido|chainlink/i,
        ai: /fetch|ocean|rndr|render|akash|near|worldcoin|numerai|grt|graph/i,
        memes: /doge|shib|pepe|floki|bonk|wif|brett|mog/i,
        layer1: /bitcoin|ethereum|solana|avalanche|cardano|polkadot|cosmos|tron|near|sui/i,
        layer2: /polygon|arbitrum|optimism|base|zksync|starknet|mantle|scroll/i,
      };
      if (activeChip === 'top10') {
        list = cryptoList.slice(0, 10);
      } else {
        const rx = CHIP_KEYWORDS[activeChip];
        if (rx) list = cryptoList.filter(c => rx.test(c.name) || rx.test(c.symbol));
      }
    }
    setFilteredList(list);
  }, [cryptoList, activeChip, isSearchMode]);

  // Debounced live search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/coingecko/search?query=${encodeURIComponent(searchQuery)}`);
        const data: CoinGeckoItem[] = await res.json();
        // Set results immediately with price=0 so list appears fast
        setSearchResults(data);
        setIsSearching(false);

        // Batch-fetch prices for all returned coins
        if (data.length > 0) {
          const ids = data.map((c) => c.id).join(',');
          setIsFetchingBatchPrices(true);
          try {
            const priceRes = await fetch(
              `/api/coingecko/markets?ids=${encodeURIComponent(ids)}&per_page=${data.length}`
            );
            const priceData: CoinGeckoItem[] = await priceRes.json();
            if (Array.isArray(priceData) && priceData.length > 0) {
              const priceMap: Record<string, Pick<CoinGeckoItem, 'current_price' | 'price_change_percentage_24h'>> = {};
              priceData.forEach((p) => {
                priceMap[p.id] = {
                  current_price: p.current_price,
                  price_change_percentage_24h: p.price_change_percentage_24h,
                };
              });
              setSearchResults((prev) =>
                prev.map((coin) =>
                  priceMap[coin.id]
                    ? { ...coin, ...priceMap[coin.id] }
                    : coin
                )
              );
            }
          } catch (priceErr) {
            console.error('Batch price fetch error:', priceErr);
            // leave results as-is; handleCoinSelect will fetch on demand
          } finally {
            setIsFetchingBatchPrices(false);
          }
        }
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    if (selectedCoin) {
      setCryptoAmount('');
      setUsdAmount('');
    }
  }, [selectedCoin]);

  useEffect(() => {
    if (isMobile && selectedCoin) {
      setMobileStep('amount');
    }
  }, [selectedCoin, isMobile]);

  const handleCryptoAmountChange = (value: string) => {
    setCryptoAmount(value);
    if (selectedCoin && value) {
      const usdValue = parseFloat(value) * selectedCoin.current_price;
      setUsdAmount(usdValue.toFixed(2));
    } else {
      setUsdAmount('');
    }
  };

  const handleUsdAmountChange = (value: string) => {
    setUsdAmount(value);
    if (selectedCoin && value) {
      const cryptoValue = parseFloat(value) / selectedCoin.current_price;
      setCryptoAmount(cryptoValue.toFixed(8).replace(/\.?0+$/, ''));
    } else {
      setCryptoAmount('');
    }
  };

  // Select a coin — if it came from live search (price=0), fetch its price first
  const handleCoinSelect = async (coin: CoinGeckoItem) => {
    if (coin.current_price === 0) {
      setFetchingPriceFor(coin.id);
      try {
        const res = await fetch(`/api/coingecko/markets?ids=${coin.id}&per_page=1`);
        const data: CoinGeckoItem[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          coin = { ...coin, current_price: data[0].current_price, price_change_percentage_24h: data[0].price_change_percentage_24h };
        }
      } catch (err) {
        console.error('Price fetch error:', err);
        // proceed with price 0
      } finally {
        setFetchingPriceFor(null);
      }
    }
    setSelectedCoin(coin);
  };

  const handleAdd = () => {
    if (!selectedCoin || !cryptoAmount || parseFloat(cryptoAmount) <= 0) return;
    setIsAdding(true);
    const newCoin: PortfolioCoin = {
      name: selectedCoin.symbol.toUpperCase(),
      coinId: selectedCoin.id,
      value: parseFloat(cryptoAmount) * selectedCoin.current_price,
      unitNum: parseFloat(cryptoAmount),
      logo: selectedCoin.image,
      pricePerUnit: selectedCoin.current_price,
    };
    const existingCoin = portfolio.find((c) => c.name === newCoin.name);
    onAdd(newCoin, existingCoin);
    // Variant B: stay open, reset amounts, ripple, append recent
    setRecent(prev => [
      { coinId: selectedCoin!.id, symbol: selectedCoin!.symbol.toUpperCase(), logo: selectedCoin!.image },
      ...prev,
    ].slice(0, 5));
    setCryptoAmount('');
    setUsdAmount('');
    setPulse(true);
    setTimeout(() => { setPulse(false); setIsAdding(false); }, 400);
    // DO NOT call handleClose()
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedCoin(null);
    setCryptoAmount('');
    setUsdAmount('');
    setIsUsdFocused(false);
    setMobileStep('select');
    setRecent([]);
    setActiveChip('all');
    setIsAdding(false);
    setSearchResults([]);
    setIsSearching(false);
    setFetchingPriceFor(null);
    setIsFetchingBatchPrices(false);
    onClose();
  };

  const getFormattedUsdValue = () => {
    if (isUsdFocused || !usdAmount) return usdAmount;
    return `$${parseFloat(usdAmount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (!isOpen) return null;

  // Displayed list — search mode vs browse mode
  const displayList = isSearchMode ? searchResults : filteredList;

  // Shared coin list renderer
  const renderCoinList = () => (
    <div>
      {isSearching && (
        <div className="text-center py-4 text-sm" style={{ color: 'rgba(150,237,214,0.7)' }}>
          Searching...
        </div>
      )}
      {!isSearching && isSearchMode && searchResults.length === 0 && (
        <div className="text-center py-8 text-white/40 text-sm">No results found</div>
      )}
      {displayList.map((coin, i) => {
        const isFetchingPrice = fetchingPriceFor === coin.id;
        return (
          <div key={coin.id}>
            <div
              onClick={() => !isFetchingPrice && handleCoinSelect(coin)}
              className={cn(
                'flex items-center gap-4 px-7 py-1.5 cursor-pointer transition-colors text-white',
                selectedCoin?.id === coin.id
                  ? 'bg-[rgba(150,237,214,0.15)]'
                  : 'hover:bg-[rgba(150,237,214,0.08)]',
                isFetchingPrice && 'opacity-60 cursor-wait'
              )}
              style={
                selectedCoin?.id === coin.id ? { color: '#96EDD6' } : {}
              }
            >
              <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <div className="font-bold">{coin.symbol.toUpperCase()}</div>
              </div>
              <div className="text-right">
                {isFetchingPrice ? (
                  <div className="text-xs" style={{ color: 'rgba(150,237,214,0.7)' }}>Getting price...</div>
                ) : coin.current_price > 0 ? (
                  <>
                    <div className="font-semibold">${coin.current_price.toLocaleString()}</div>
                    <div
                      className={`flex items-center justify-end gap-1 text-xs ${
                        coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      <Triangle
                        className={`w-3 h-3 ${
                          coin.price_change_percentage_24h >= 0 ? '' : 'rotate-180'
                        }`}
                        fill="currentColor"
                      />
                      {Math.abs(coin.price_change_percentage_24h)?.toFixed(2)}%
                    </div>
                  </>
                ) : isFetchingBatchPrices ? (
                  <div className="text-xs" style={{ color: 'rgba(150,237,214,0.5)' }}>...</div>
                ) : (
                  <div className="text-xs text-white/40">—</div>
                )}
              </div>
            </div>
            {i < displayList.length - 1 && <div className="mx-4 border-b border-white/10" />}
          </div>
        );
      })}
    </div>
  );

  // Standard coin amount form
  const renderCoinAmountForm = () => (
    <>
      {recent.length > 0 && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-[10px]"
          style={{ background: 'rgba(150,237,214,0.08)', border: '1px solid rgba(150,237,214,0.18)' }}>
          <span className="text-[10px] font-black tracking-[0.04em]" style={{ color: '#96EDD6', flexShrink: 0 }}>
            ✓ JUST ADDED
          </span>
          <div className="flex gap-1.5 flex-1 overflow-hidden">
            {recent.slice(0, 4).map((r, i) => (
              <div key={i} className="flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
                {r.logo && <img src={r.logo} alt={r.symbol} className="w-4 h-4 rounded-full" />}
                <span className="text-[10px] font-bold text-white">{r.symbol}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col">
        <p className="text-sm font-semibold text-white mb-1">Asset selected</p>
        <div
          className="rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(150,237,214,0.12)',
            transition: 'box-shadow 0.4s ease',
            boxShadow: pulse ? '0 0 0 2px #96EDD6, 0 0 40px rgba(150,237,214,0.4)' : 'none',
          }}
        >
          {selectedCoin ? (
            <div className="flex items-center gap-3 justify-between py-2 px-3">
              <div className="flex items-center gap-2">
                <img
                  src={selectedCoin.image}
                  alt={selectedCoin.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="text-md font-bold text-white">
                  {selectedCoin.symbol.toUpperCase()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">
                  ${selectedCoin.current_price.toLocaleString()}
                </div>
                <div
                  className={`flex items-center justify-end gap-1 text-xs font-bold ${
                    selectedCoin.price_change_percentage_24h >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  <Triangle
                    className={`w-3 h-3 ${
                      selectedCoin.price_change_percentage_24h >= 0 ? '' : 'rotate-180'
                    }`}
                    fill="currentColor"
                  />
                  {Math.abs(selectedCoin.price_change_percentage_24h)?.toFixed(2)}%
                </div>
              </div>
            </div>
          ) : (
            <div className="text-white/50 text-center py-4">No asset selected</div>
          )}
        </div>
      </div>

      {selectedCoin && (
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-white mb-1">Currency Converter</p>
          <div className="flex flex-col gap-2">
            <div
              className="rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(150,237,214,0.2)',
              }}
            >
              <div className="flex items-center gap-3 justify-between py-2 px-3">
                <div className="flex items-center gap-2">
                  <img
                    src={selectedCoin.image}
                    alt={selectedCoin.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="text-md font-bold text-white">
                    {selectedCoin.symbol.toUpperCase()}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <input
                    type="number"
                    value={cryptoAmount}
                    onChange={(e) => handleCryptoAmountChange(e.target.value)}
                    placeholder="0"
                    className="text-xl font-bold bg-transparent text-white text-right outline-none w-32 placeholder-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                  />
                  <div className="text-xs tracking-tight text-white/70">
                    {selectedCoin.name}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(150,237,214,0.2)',
              }}
            >
              <div className="flex items-center gap-3 justify-between py-2 px-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#96EDD6]">
                    <p className="text-black font-black text-xl mb-0">$</p>
                  </div>
                  <div className="text-md font-bold text-white">USD</div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <input
                    type={isUsdFocused ? 'number' : 'text'}
                    value={getFormattedUsdValue()}
                    onChange={(e) => handleUsdAmountChange(e.target.value)}
                    onFocus={() => setIsUsdFocused(true)}
                    onBlur={() => setIsUsdFocused(false)}
                    placeholder="0.00"
                    className="text-xl font-bold bg-transparent text-white text-right outline-none w-32 placeholder-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                  />
                  <div className="text-xs tracking-tight text-white/70">
                    United States Dollar
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick deposit */}
          <div className="flex gap-1.5 flex-wrap mt-1">
            {[100, 500, 1000, 5000].map(amt => (
              <button
                key={amt}
                onClick={() => handleUsdAmountChange(String(amt))}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all hover:opacity-90"
                style={{
                  background: 'rgba(150,237,214,0.10)',
                  border: '1px solid rgba(150,237,214,0.25)',
                  color: '#96EDD6',
                  cursor: 'pointer',
                }}
              >
                ${amt >= 1000 ? `${amt / 1000}k` : amt}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // Action buttons
  const renderActionButtons = () => (
    <div className="mt-1">
      <p className="text-[11px] mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {recent.length > 0
          ? <><span style={{ color: '#96EDD6', fontWeight: 800 }}>{recent.length}</span> added this session</>
          : 'Add will not close the modal — keep going.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleClose}
          className="flex-1 rounded-xl transition-colors py-2 px-5 font-semibold text-[#96EDD6] border border-[#96EDD6]/30 hover:bg-[#96EDD6]/10"
          style={{ background: 'transparent' }}
        >
          {recent.length > 0 ? 'Done' : 'Cancel'}
        </button>
        <button
          onClick={handleAdd}
          disabled={
            !selectedCoin ||
            !cryptoAmount ||
            !usdAmount ||
            parseFloat(cryptoAmount) <= 0 ||
            parseFloat(usdAmount) <= 0 ||
            isAdding
          }
          className="flex-1 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed py-2 px-5 font-semibold bg-[#96EDD6] text-[#0a0a0f]"
        >
          Add Asset
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className="relative px-6 py-5 rounded-2xl shadow-2xl w-full overflow-hidden"
        style={{
          background: '#0a0a0f',
          backgroundImage:
            'radial-gradient(circle, rgba(150,237,214,0.06) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          border: '1px solid rgba(150,237,214,0.18)',
          backdropFilter: 'blur(12px)',
          maxWidth: 'min(52rem, 90vw)',
          ...(isMobile
            ? { maxHeight: '85vh', overflowY: 'auto' as const }
            : { maxHeight: '90vh', minHeight: '55vh' }),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[#96EDD6]/20"
          style={{ color: '#96EDD6', background: 'rgba(150,237,214,0.08)' }}
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white tracking-tight">Add Asset</h2>
        </div>

        {/* Mobile layout */}
        {isMobile ? (
          <div className="flex flex-col gap-3 pt-2.5">
            {mobileStep === 'select' ? (
              <div className="flex flex-col gap-3">
                {/* Category chips — hidden in search mode */}
                {!isSearchMode && (
                  <div className="flex gap-1.5 flex-wrap">
                    {CATEGORY_CHIPS.map(chip => {
                      const isActive = activeChip === chip.id;
                      return (
                        <button
                          key={chip.id}
                          onClick={() => setActiveChip(chip.id)}
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all"
                          style={{
                            background: isActive ? 'rgba(150,237,214,0.14)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isActive ? '#96EDD6' : 'rgba(255,255,255,0.12)'}`,
                            color: isActive ? '#96EDD6' : 'rgba(255,255,255,0.55)',
                            cursor: 'pointer',
                          }}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#96EDD6]" />
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl text-white placeholder-white/40 placeholder:font-light placeholder:italic placeholder:tracking-tight focus:outline-none transition-colors h-11"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(150,237,214,0.2)',
                      caretColor: '#96EDD6',
                    }}
                  />
                </div>

                <div
                  className="overflow-y-auto rounded-xl"
                  style={{
                    border: '1px solid rgba(150,237,214,0.15)',
                    maxHeight: '55vh',
                  }}
                >
                  {isLoading && !isSearchMode ? (
                    <div className="text-white text-center py-8">
                      Loading cryptocurrencies...
                    </div>
                  ) : (
                    renderCoinList()
                  )}
                </div>

                <button
                  onClick={() => setMobileStep('amount')}
                  disabled={!selectedCoin}
                  className="w-full flex items-center justify-center gap-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: '#96EDD6',
                    color: '#0a0a0f',
                    fontWeight: 700,
                    padding: '10px 20px',
                    fontSize: '0.9375rem',
                  }}
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setMobileStep('select')}
                  className="self-start flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-70 text-[#96EDD6] bg-transparent border-none p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="flex flex-col gap-3">
                  {renderCoinAmountForm()}
                </div>

                {renderActionButtons()}
              </div>
            )}
          </div>
        ) : (
          /* Desktop layout */
          <div
            className="flex flex-col sm:flex-row gap-3 pt-2.5"
            style={{ height: 'clamp(320px, calc(55vh - 80px), 480px)' }}
          >
            <div className="flex-1 flex flex-col gap-3 basis-1/2">
              {/* Category chips — hidden in search mode */}
              {!isSearchMode && (
                <div className="flex gap-1.5 flex-wrap">
                  {CATEGORY_CHIPS.map(chip => {
                    const isActive = activeChip === chip.id;
                    return (
                      <button
                        key={chip.id}
                        onClick={() => setActiveChip(chip.id)}
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all"
                        style={{
                          background: isActive ? 'rgba(150,237,214,0.14)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isActive ? '#96EDD6' : 'rgba(255,255,255,0.12)'}`,
                          color: isActive ? '#96EDD6' : 'rgba(255,255,255,0.55)',
                          cursor: 'pointer',
                        }}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#96EDD6]" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-white placeholder-white/40 placeholder:font-light placeholder:italic placeholder:tracking-tight focus:outline-none transition-colors h-11"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(150,237,214,0.2)',
                    caretColor: '#96EDD6',
                  }}
                />
              </div>

              <div
                className="flex-1 overflow-y-auto rounded-xl"
                style={{ border: '1px solid rgba(150,237,214,0.15)' }}
              >
                {isLoading && !isSearchMode ? (
                  <div className="text-white text-center py-8">
                    Loading cryptocurrencies...
                  </div>
                ) : (
                  renderCoinList()
                )}
              </div>
            </div>

            <div className="w-full flex flex-col basis-1/2 justify-between max-w-full">
              {renderCoinAmountForm()}
              {renderActionButtons()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
