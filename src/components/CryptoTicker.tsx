'use client';

import { useEffect, useState, useRef } from "react";

// Cryptocurrency logo URLs - using more reliable CDN sources
const cryptoLogos = {
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  BNB: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  XRP: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  KAIA: "https://assets.coingecko.com/coins/images/39901/standard/KAIA.png",
  PENGU: "https://assets.coingecko.com/coins/images/52622/standard/PUDGY_PENGUINS_PENGU_PFP.png?1733809110",
  SUI: "https://assets.coingecko.com/coins/images/26375/standard/sui-ocean-square.png?1727791290",
  DOGE: "https://assets.coingecko.com/coins/images/5/standard/dogecoin.png?1696501409",
  POL: "https://assets.coingecko.com/coins/images/32440/standard/polygon.png?1698233684",
};

const CRYPTO_DATA = {
  BTC: {
    fsym: "BTC",
    tsym: "USD",
    name: "BTC",
    price: null,
    change: null,
    lastUpdated: null,
  },
  ETH: {
    fsym: "ETH",
    tsym: "USD",
    name: "ETH",
    price: null,
    change: null,
    lastUpdated: null,
  },
  BNB: {
    fsym: "BNB",
    tsym: "USD",
    name: "BNB",
    price: null,
    change: null,
    lastUpdated: null,
  },
  SOL: {
    fsym: "SOL",
    tsym: "USD",
    name: "SOL",
    price: null,
    change: null,
    lastUpdated: null,
  },
  XRP: {
    fsym: "XRP",
    tsym: "USD",
    name: "XRP",
    price: null,
    change: null,
    lastUpdated: null,
  },
  KAIA: {
    fsym: "KAIA",
    tsym: "USD",
    name: "KAIA",
    price: null,
    change: null,
    lastUpdated: null,
  },
  PENGU: {
    fsym: "PENGU",
    tsym: "USD",
    name: "PENGU",
    price: null,
    change: null,
    lastUpdated: null,
  },
  SUI: {
    fsym: "SUI",
    tsym: "USD",
    name: "SUI",
    price: null,
    change: null,
    lastUpdated: null,
  },
  DOGE: {
    fsym: "DOGE",
    tsym: "USD",
    name: "DOGE",
    price: null,
    change: null,
    lastUpdated: null,
  },
  POL: {
    fsym: "POL",
    tsym: "USD",
    name: "POL",
    price: null,
    change: null,
    lastUpdated: null,
  },
};

type CryptoEntry = { fsym: string; tsym: string; name: string; price: number | null; change: number | null; lastUpdated: number | null };
type CryptoDataState = { [K in keyof typeof CRYPTO_DATA]: CryptoEntry };

const CryptoTicker = () => {
  const [cryptoData, setCryptoData] = useState<CryptoDataState>(CRYPTO_DATA as CryptoDataState);
  const [flashStates, setFlashStates] = useState<{[key: string]: string | null}>({});
  const socketRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickerRef = useRef<HTMLDivElement | null>(null);
  const cryptoDataLoaded = Object.keys(cryptoData).length;

  // Measure actual rendered height and update --ticker-h so downstream
  // consumers (layout padding, sticky bars) always align perfectly.
  useEffect(() => {
    if (!tickerRef.current) return;
    const update = () => {
      const h = tickerRef.current!.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--ticker-h', `${h}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(tickerRef.current);
    return () => ro.disconnect();
  }, []);

  const streams = [
    "btcusdt@ticker",
    "ethusdt@ticker",
    "bnbusdt@ticker",
    "solusdt@ticker",
    "xrpusdt@ticker",
    "kaiausdt@ticker",
    "penguusdt@ticker",
    "suiusdt@ticker",
    "dogeusdt@ticker",
    "polusdt@ticker",
  ];

  useEffect(() => {
    const connectWebSocket = () => {
      if (socketRef.current) {
        socketRef.current.close();
      }

      const socket = new WebSocket(
        `wss://tickerworker.kumamiworldapp.workers.dev/`
      );
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected to Binance");

        const subscribeMsg = {
          method: "SUBSCRIBE",
          params: streams,
          id: 1,
        };

        socket.send(JSON.stringify(subscribeMsg));
      };

      socket.onmessage = (event) => {
        try {
          const { data } = JSON.parse(event.data);

          if (!!data) {
            const fullSymbol = data.s || ""; // e.g., BTCUSDT
            const symbol = fullSymbol.replace("USDT", ""); // e.g., BTC
            if (symbol && data.c && data.P) {
              const price = parseFloat(data.c); // Current price
              const priceChange = parseFloat(data.P); // 24h price change percentage

              setCryptoData((prevData) => {
                const key = symbol as keyof typeof CRYPTO_DATA;
                const newCryptoData = {
                  ...prevData[key],
                  price,
                  change: priceChange,
                  lastUpdated: Date.now(),
                };

                const newData = { ...prevData, [key]: newCryptoData };
                const oldPrice = prevData[key]?.price;
                if (oldPrice && oldPrice !== 0 && price !== oldPrice) {
                  const direction = price > oldPrice ? "up" : "down";

                  setFlashStates((prev) => ({
                    ...prev,
                    [symbol]: direction,
                  }));

                  setTimeout(() => {
                    setFlashStates((prev) => ({
                      ...prev,
                      [symbol]: null,
                    }));
                  }, 1000);
                }

                return newData;
              });
            }
          }
        } catch (err) {
          // Some messages might not be JSON or ticker data
          // No need to log every error
        }
      };

      socket.onerror = () => {
        // WebSocket error — connection will retry automatically on close
      };

      socket.onclose = () => {
        console.log("WebSocket connection closed");
        setTimeout(() => {
          if (socketRef.current === socket) {
            connectWebSocket();
          }
        }, 1000); // Faster reconnection
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const formatPrice = (price: number | null) => {
    if (price === 0) return "-";
    if (price && price > 1000)
      return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (price && price > 1)
      return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return price ? price.toLocaleString("en-US", { maximumFractionDigits: 6 }) : "-";
  };

  if (cryptoDataLoaded !== streams.length) {
    return (
      <div ref={tickerRef} className="crypto-ticker">
        <div className="crypto-ticker-loading">Loading price data...</div>
      </div>
    );
  }

  return (
    <div ref={tickerRef} className="crypto-ticker">
      <div className="ticker-container">
        <div className="ticker-scroll">
          {/* First copy of the ticker content */}
          <div className="ticker-content">
            {Object.entries(cryptoData).map(([symbol, crypto]) => (
              <div key={`first-${symbol}`} className="ticker-item">
                <img
                  src={cryptoLogos[symbol as keyof typeof cryptoLogos]}
                  alt={`${symbol} logo`}
                  className="crypto-logo"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://cryptologos.cc/logos/placeholder-logo.png";
                  }}
                />
                <span className="crypto-name">{crypto.name}</span>
                <span
                  className={`crypto-price ${
                    flashStates[symbol] === "up"
                      ? "price-flash-up"
                      : flashStates[symbol] === "down"
                        ? "price-flash-down"
                        : ""
                  }`}
                >
                  {crypto.price ? `$${formatPrice(crypto.price)}` : "-"}
                </span>
                <span
                  className={`crypto-change ${
                    crypto.change && crypto.change >= 0 ? "positive" : "negative"
                  }`}
                >
                  {crypto.change && crypto.change >= 0 ? "+" : ""}
                  {crypto.change ? `${crypto.change.toFixed(2)}%` : "-"}
                </span>
                <span className="divider">|</span>
              </div>
            ))}
          </div>

          {/* Second copy for seamless looping */}
          <div className="ticker-content">
            {Object.entries(cryptoData).map(([symbol, crypto]) => (
              <div key={`second-${symbol}`} className="ticker-item">
                <img
                  src={cryptoLogos[symbol as keyof typeof cryptoLogos]}
                  alt={`${symbol} logo`}
                  className="crypto-logo"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://cryptologos.cc/logos/placeholder-logo.png";
                  }}
                />
                <span className="crypto-name">{crypto.name}</span>
                <span
                  className={`crypto-price ${
                    flashStates[symbol] === "up"
                      ? "price-flash-up"
                      : flashStates[symbol] === "down"
                        ? "price-flash-down"
                        : ""
                  }`}
                >
                  {crypto.price ? `$${formatPrice(crypto.price)}` : "-"}
                </span>
                <span
                  className={`crypto-change ${
                    crypto.change && crypto.change >= 0 ? "positive" : "negative"
                  }`}
                >
                  {crypto.change && crypto.change >= 0 ? "+" : ""}
                  {crypto.change ? `${crypto.change.toFixed(2)}%` : "-"}
                </span>
                <span className="divider">|</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoTicker;
