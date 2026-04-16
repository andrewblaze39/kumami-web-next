'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';

interface CoinData {
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

interface EditCryptoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (coin: CoinData) => void;
  coin: CoinData | null;
  marketPrices: Record<string, MarketPriceEntry>;
  onRefreshPrices: () => void;
  lastUpdated: Date | null;
  isPriceLoading: boolean;
}

export default function EditCryptoModal({
  isOpen,
  onClose,
  onEdit,
  coin,
  marketPrices,
  onRefreshPrices,
  lastUpdated,
  isPriceLoading,
}: EditCryptoModalProps) {
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [isUsdFocused, setIsUsdFocused] = useState(false);
  const [pricePerUnit, setPricePerUnit] = useState(0);

  useEffect(() => {
    if (isOpen && coin) {
      setCryptoAmount(coin.unitNum.toString());
      let currentPrice = coin.pricePerUnit;
      if (marketPrices && marketPrices[coin.name]) {
        currentPrice = marketPrices[coin.name].price;
      }
      setPricePerUnit(currentPrice || coin.value / coin.unitNum);
      const calculatedUsdValue = coin.unitNum * currentPrice;
      setUsdAmount(calculatedUsdValue.toString());
    }
  }, [isOpen, coin, marketPrices]);

  const handleCryptoAmountChange = (value: string) => {
    setCryptoAmount(value);
    if (value && pricePerUnit) {
      const usdValue = parseFloat(value) * pricePerUnit;
      setUsdAmount(usdValue.toFixed(2));
    } else {
      setUsdAmount('');
    }
  };

  const handleUsdAmountChange = (value: string) => {
    setUsdAmount(value);
    if (value && pricePerUnit) {
      const cryptoValue = parseFloat(value) / pricePerUnit;
      setCryptoAmount(cryptoValue.toFixed(8).replace(/\.?0+$/, ''));
    } else {
      setCryptoAmount('');
    }
  };

  const handleSave = () => {
    if (coin && cryptoAmount && parseFloat(cryptoAmount) > 0) {
      onEdit({
        ...coin,
        unitNum: parseFloat(cryptoAmount),
        value: parseFloat(usdAmount),
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setCryptoAmount('');
    setUsdAmount('');
    setIsUsdFocused(false);
    onClose();
  };

  const getFormattedUsdValue = () => {
    if (isUsdFocused || !usdAmount) return usdAmount;
    return `$${parseFloat(usdAmount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (!isOpen || !coin) return null;

  const marketData = marketPrices?.[coin.name];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className="relative px-6 py-4 shadow-2xl overflow-hidden w-full"
        style={{
          background: '#0a0a0f',
          backgroundImage:
            'radial-gradient(circle, rgba(150,237,214,0.06) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          border: '1px solid rgba(150,237,214,0.18)',
          backdropFilter: 'blur(12px)',
          borderRadius: 16,
          maxWidth: 'min(28rem, 90vw)',
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

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-white">Edit {coin.name}</h2>
        </div>

        <div className="flex flex-col gap-4">
          {/* Price info */}
          <div
            className="flex items-center gap-3 justify-between py-2 px-3 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(150,237,214,0.12)',
            }}
          >
            <div className="flex items-center gap-2">
              {coin.logo ? (
                <img src={coin.logo} alt={coin.name} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#96EDD6] flex items-center justify-center">
                  <span className="text-[#102425] font-bold">{coin.name.substring(0, 1)}</span>
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-xl font-bold text-white flex items-center">
                ${marketData ? marketData.price.toLocaleString() : pricePerUnit.toLocaleString()}
              </div>
              <div className="text-xs text-white/70 flex items-center">
                per unit
                {marketData && marketData.change24h !== undefined && (
                  <span
                    className={`ml-1 text-xs ${
                      marketData.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {marketData.change24h >= 0 ? '+' : ''}
                    {marketData.change24h.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="flex items-center mt-1">
                <button
                  onClick={onRefreshPrices}
                  disabled={isPriceLoading}
                  className="flex items-center text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[#96EDD6]"
                >
                  <RefreshCw
                    size={12}
                    className={`mr-1 ${isPriceLoading ? 'animate-spin' : ''}`}
                  />
                  {isPriceLoading ? 'Updating...' : 'Refresh Price'}
                </button>
                {lastUpdated && !isPriceLoading && (
                  <span className="ml-2 text-xs text-white/50">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Currency converter */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-white mb-0">Currency Converter</p>
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
                    {coin.logo ? (
                      <img src={coin.logo} alt={coin.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#96EDD6] flex items-center justify-center">
                        <span className="text-[#102425] font-bold">
                          {coin.name.substring(0, 1)}
                        </span>
                      </div>
                    )}
                    <div className="text-md font-bold text-white">{coin.name}</div>
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
                    <div className="text-xs tracking-tight text-white/70">{coin.name}</div>
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
                    <div className="text-xs tracking-tight text-white/70">United States Dollar</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleClose}
              className="flex-1 rounded-xl transition-colors py-2.5 px-4 font-semibold text-[#96EDD6] border border-[#96EDD6]/30 hover:bg-[#96EDD6]/10"
              style={{ background: 'transparent' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                !cryptoAmount ||
                !usdAmount ||
                parseFloat(cryptoAmount) <= 0 ||
                parseFloat(usdAmount) <= 0
              }
              className="flex-1 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed py-2.5 px-4 font-semibold bg-[#96EDD6] text-[#0a0a0f]"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
