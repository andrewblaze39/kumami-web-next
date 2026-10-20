# v1.15  

**Kind:**

  - **Your spec:** v1.14 drifted from your rules.
  - **Your decision:** your answer in the gap report or our Q\&A.
  - **Bug:** shows the wrong signal or can never fire.
  - **My proposal:** a number or rule I chose.
  - **Unblocked:** marked “blocked”, but buildable on STARTUP.
  - **STARTUP fit:** designed around our plan’s limits.
  - **Consistency:** makes two pages agree.
  - **Missing:** not in v1.14 at all.
  - **Doc fix:** wrong text, not wrong product.
  - **Backlog:** acknowledged, built later.

#### **Answers to Gap Report**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14 / Gap Report\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Flow Radar Plus delay | 15 min, awaiting your OK | 15 min for all; Pro real-time | Clear Plus/Pro difference | Your decision |
| Spot Pulse Plus tab | Tile only, awaiting OK | No tab; tile + Spot Pulse Pro | The tile is enough for Plus | Your decision |
| Intelligence | Off the nav, still in Tools Info | Dropped from Plus | Calendar took its slot | Your decision |
| Console previews | Mockup 4 vs written 3 | Mockup’s 4 | The mockup is the later decision | Your decision |
| Watchlist columns | Signal + Status | Keep | Easier to read | Your decision |
| Removed Pro tabs | Cancelled or postponed? | Smart Money Tracker postponed (first), Coin / Token Tracker postponed (second), Pro Fear & Greed cancelled | Smart Money data already exists; Pro Fear & Greed would duplicate Plus | Your decision |
| Calendar | One calendar; feeds OFF | Confirmed; manual-first | The feeds made days too packed | Your decision |
| Build order | 10 recommended steps | Reordered: rules → Console → Flow Radar → On-Chain → collector → Dry Powder → AI → significance → Watchlist Pro → Address Tracker | Fix wrong signals first, then the foundation, then new features | Your decision |

  
  

#### **Plus §1 Console**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Fear & Greed score | ±1 for every band | Extremes ±1.5 | Extremes are the strongest contrarian signal | Your spec |
| ETF flow | Any non-zero flow counts | Only beyond ±$100M | Small flows are noise | Your spec |
| Funding vote | Any negative = +1 | \\\< −0.05% = +1; \\\> +0.10% = −1 | Normal funding is about +0.01%; −0.05% means crowded shorts. Positive funding is normal in uptrends. | Your spec |
| Funding vote vs On-Chain label | — | Vote stays at +0.10% while the label starts at +0.05% | The label describes; the vote needs strong evidence | Your decision |
| OI vs price | Middle cases swapped | up + flat = 0, up + down = −1 | Rising OI while price falls is bearish | Bug |
| Confidence | ÷ all 4 signals | ÷ active signals only | Neutral signals were counted as disagreement | Bug |
| HYPE chip | No cap | Capped at 0.70 | No ETF, futures concentrated on Hyperliquid | Your spec |
| Flow Radar preview | “30-min delay” | 15 min | Wrong text | Doc fix |
| Console badge | Popup only | Badge for team-added HIGH events within 6h | Your Calendar §7.4 item | Your spec, timing mine |

#### **Plus §2 On-Chain Insights**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Asset switcher | Includes AVAX | HYPE replaces AVAX | Matches the 5 core assets | Your spec |
| Section title | “(adjusted)” with no changes | Changes actually listed | The title was misleading | Doc fix |
| Funding bands | ±0.06%, Mild Short Bias, holes at +0.05–0.06% and 0 to −0.01% | Continuous bands from ±0.05% | No gaps; one funding scale across pages | Your spec + Bug |
| Exchange Netflow default | Opens on 24H | Opens on 7D | The data updates once a day | Your decision |
| Flat-OI rows | All “Stable OI” | Trend Without Leverage / Decline Without Panic | A move without new leverage is a distinct state | Your spec |

#### **Plus §2.9 Spot Pulse (shared with Pro §5)**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| “Flat” threshold | ±2% of std-dev | z-score ±0.5 | FLAT almost never happened, so 3 verdicts couldn’t appear | Bug fix, threshold mine |
| Normal swing | Loosely defined | Past same-length windows (42 / 30 / 11) | Compare like with like; fits 180-day history | My proposal |
| New listings | Not handled | Under 8 past windows: “Not enough history”, BALANCED, excluded | New listings shouldn’t skew the market verdict | Missing |
| Data calls | Endpoints only | 1H bars, 84 days, fixed exchange lists, flow summed per bar | One request per coin covers all timeframes | STARTUP fit |
| Timestamps, HYPE price | Not handled | Normalise timestamps; HYPE price falls back to Hyperliquid | Avoids silent data errors | Missing |
| Price band | ±1% everywhere | 4H ±0.75%, 24H ±1.5%, 7D ±4% | The band must scale with time | My proposal |
| Verdict table | 8 rows with gaps | All 27 combinations | Spot-led and futures-led rallies fell to BALANCED | Bug |
| QUIET DISTRIBUTION | — | Price flat + spot selling | Mirror of ACCUMULATION | My proposal |
| Market verdict | Speculation first; fixed counts | Bearish first; shares (60% / 40%); under 4 tiles = “Not enough data” | Stops risk being hidden; one rule for 5 and 10 tiles | Bug + My proposal |
| Divergence cards | — | QUIET DISTRIBUTION +4 | Covers the new verdict | My proposal |
| Footer volume | “Needs coins-markets” | netflow-list taker buy + sell | On STARTUP | Unblocked |
| Refresh | Per request; 7D failed on rate limits | Shared job every 2 min, “Updated n min ago” | Fixes 7D; 30-min bars make faster pointless | STARTUP fit |

#### **Plus §3 Flow Radar (shared with Pro §18)**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Delay text | “30-minute, default 30” | 15 min | Wrong text | Doc fix |
| Whale direction | Any large transfer | Only deposits and withdrawals count | Internal moves say nothing about direction | Bug |
| Whale coverage | Not stated | No BNB Chain or Hyperliquid | Sets expectations for BNB/HYPE | Missing |
| Exchange Flow | Generic net direction | Dry Powder In/Out on USDT/USDC; HIGH/MED/LOW tiers; hourly; market-wide | The endpoint only covers Ethereum tokens; stablecoins = buying power | STARTUP fit |
| Liquidation direction | Always “Sell Pressure” | Long Flush / Short Squeeze / Two-sided | A squeeze pushes price up | Bug |
| Liquidation coverage | One exchange | 5 exchanges summed (or aggregated-history) | coin-list takes one exchange per call | STARTUP fit |
| Smart Money direction | Opened short = bullish | Long bullish, Short bearish, closed neutral | Shorts were shown as buying | Bug |
| Smart Money severity | Confidence \\\> 0.8 (field doesn’t exist) | Size tiers that differ by coin | HIGH never fired | Bug fix, tiers mine |
| LOW tiers (Pro) | Not defined | Exchange Flow $25–100M, liquidations $10–50M/h, Smart Money ≥ $1M | Pro shows LOW, so LOW needs thresholds | My proposal |
| Duplicates | Not defined | Unique key per event; one event per hour per coin or exchange | Stops repeat rows | Missing |
| Verdict band | Distribution first, no comparison | Cascade first; 1.5× dominance; scales with window | $600M sell vs $900M buy read “Distribution” | Bug + My proposal |
| Cross-signal | Pro only, bearish rules | Plus too; bullish mirrors | Your spec; symmetric confirmation | Your spec + My proposal |

#### **Plus §4 Fear & Greed**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| News Tone, sources, history chart | Keyword estimate; CoinGlass sources; raw index chart | AI News Tone later; sources accepted; chart unchanged | No logic error | Backlog |

#### **Plus §5 Calendar**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Source | Feeds OFF | Manual-first, team enters everything | Controllable for now | Your decision |
| Categories | 6 categories | \\+ Listing, Token sale / TGE (with required fields; Airdrops auto-link) | Needed for the event types you want | Your request |
| Importance | Admin picks freely | Guide table | Consistent entries | My proposal |
| Display | All impacts | HIGH + MED, max 3 per day | About 5 events a day | My proposal |
| Popups + badge | Popups only | Run on team-added HIGH events | Works without feeds | Consistency |
| View toggle, timeframe filter, “Add to my events” | Not built | Later | No logic impact | Backlog |

#### **Plus §6 Watchlist Plus (also Pro §19 Section A)**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Signal column | Old directions | Corrected directions | Shorts were shown as buying | Bug |
| “Short Heavy” | \\\< 0% | \\\< −0.05% | One funding scale | Consistency |
| Regime tag | OI estimated from price | Real OI (already cached) | “Coiling” could never fire | Bug |
| Near Liq Zone | Blocked | Still blocked | Heatmap not on STARTUP | — |
| Sparkline | Missing | Later | Cheap, not urgent | Backlog |

  

#### **Pro §1 Daily Digest**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Disclaimer | Says smart money and Fear & Greed join “once market data is live” | Disclaimer removed | Market data is live now, so the message is out of date. | Doc fix |
| Digest lines | Research, news, airdrops, calendar, Alpha Room | Adds the top 3 Hyperliquid whale positions opened in 24h, today’s “Also Worth Watching” coins and the Fear & Greed read | Your spec asked for these, and the data already exists in Flow Radar, Watchlist Pro and Fear & Greed. | Missing |

#### **Pro §2 Following & Alerts**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Price-alert coin list | Includes MATIC and RNDR; no HYPE | Use POL and RENDER, add HYPE, check every coin has a live stream | Binance renamed those two coins, so alerts on the old names may never trigger, and HYPE is one of our core assets. | Missing |
| Volume and sentiment alerts | Buttons show “live monitoring soon” | Built right after the background collector | Both need a check running all the time, which the collector provides. | Backlog |

#### **Pro §5 Spot Pulse Pro**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Row 2 coins | Described as both live and off in different paragraphs | The 5 Watchlist Pro Section C coins; empty slots filled with “Top volume” coins | Fixes the contradiction and keeps the 10-tile grid full. | Bug + Doc fix |
| Market verdict rules | Separate 10-tile thresholds | The same share-based rules as Plus | One rule set for both, nothing extra to maintain. | Claude’s suggestion |

#### **Pro §6 Security Scanner**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Status | “Coming Soon” placeholder | Built later, with GoPlus | Needs a new security-data integration; no logic to fix now. | Backlog |

#### **Pro §8 AI Portfolio**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Wallets | One wallet import | Multiple wallets built later | Nice to have; the current version works. | Backlog |

#### **Pro §17 Kuma AI Chat**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Knowledge refresh | Planned from the current spec | Build it from v1.15 | Kuma’s answers about Kumami should match the revised logic. | Consistency |

#### **Pro §18 Flow Radar Pro**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Delay text | Says “Plus already ships without delay” | Corrected | Plus is delayed 15 minutes; only Pro is real-time. | Doc fix |
| Illiquid filter | Blocked | Hide coins with under $1M daily spot volume, using netflow-list | A spike on a coin that barely trades is noise users can’t act on, and the volume data is on our plan. | Unblocked |
| Flow Balance panel | Built from the old buckets | Built from the corrected buckets | Short squeezes and opened longs now count as bullish, opened shorts as bearish. | Bug |
| “+ Custom” picker and chip counts | Not built | Built later | They make the feed easier to use but don’t change any signal. | Backlog |

#### **Pro §19 Watchlist Pro**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Structure | Core assets + pins + extra coins | A = 5 core · B = your pins (up to 15) · C = up to 5 “Also Worth Watching” | A clear three-section layout. | Confirmed |
| Add-coin limits | Only checks the symbol exists | Max 15; needs a spot market with at least $10M volume and a futures market; no stablecoins, wrapped tokens or core assets | The engines need futures data and enough volume for a real read; the $10M rule is from your spec. | Rachelle’s spec + Unblocked |
| Section C rule | Coins seen in Flow Radar on the most of the last 7 days, any direction | 3-day net accumulation, confirmed by spot buyers | The old rule ignored direction, so a coin being sold every day could rank first and get a ◆. | Rachelle’s request (thresholds are Claude’s suggestion) |
| Section C candidates | Not stated | Excludes core assets, your pins, stablecoins, wrapped tokens and stablecoin flow events | Only genuinely new coins should be suggested. | Missing |
| Ranking and padding | Always fills 5 slots | Ranked by net buying ÷ volume; shows fewer if fewer qualify | Small coins with real buying aren’t drowned out by big ones, and a ◆ always means the coin really qualified. | Claude’s suggestion |
| Price refresh | Same refresh as Plus | Live prices from Binance’s free stream; other coins keep the normal refresh | Our CoinGlass plan can’t refresh every second, but Binance’s free stream can, and Following & Alerts already uses it. | Rachelle’s decision |
| Saved lists, wallet rows, history, alert rules, ◆ tags | Not built | Built later | Extra Pro features; none affect the current signals. | Backlog |

#### **Pro §20 Crypto Address Tracker**

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*What\*\* | \*\*v1.14\*\* | \*\*v1.15\*\* | \*\*Why\*\* | \*\*Kind\*\* |
| Missing parts of your brief | PnL and win rate show “—”; Ethereum only; “Whale” is the only tag | Built later: PnL, win rate, Trader/Farmer tags, more chains, AI summary, behaviour flags, labelled activity, linked wallets | Each needs trade-history reconstruction, explorer APIs or a verified list of exchange wallets, which are bigger builds. | Backlog |

  
  

