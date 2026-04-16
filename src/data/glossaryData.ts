// Comprehensive Web3/Glossary Terms Data
// Organized alphabetically for easy navigation

export interface GlossaryTerm {
  id: string
  term: string
  category: string
  definition: string
}

export const glossaryTerms: GlossaryTerm[] = [
  // A
  {
    id: "airdrop",
    term: "Airdrop",
    category: "Crypto",
    definition: "Free distribution of tokens to users as a marketing strategy or reward for early adopters."
  },
  {
    id: "alpha",
    term: "Alpha",
    category: "Trading",
    definition: "Valuable insider or early information that gives traders an edge in the market."
  },
  {
    id: "altcoin",
    term: "Altcoin",
    category: "Crypto",
    definition: "Any cryptocurrency other than Bitcoin."
  },
  {
    id: "ape",
    term: "Ape (Ape In)",
    category: "Crypto Slang",
    definition: "Investing in a project quickly without deep research."
  },
  {
    id: "apy",
    term: "APY (Annual Percentage Yield)",
    category: "DeFi",
    definition: "The yearly return rate including compound interest."
  },
  {
    id: "apr",
    term: "APR (Annual Percentage Rate)",
    category: "DeFi",
    definition: "The yearly return rate excluding compounding."
  },
  {
    id: "ath",
    term: "ATH (All-Time High)",
    category: "Trading",
    definition: "The highest price an asset has ever reached."
  },
  {
    id: "atl",
    term: "ATL (All-Time Low)",
    category: "Trading",
    definition: "The lowest price an asset has ever reached."
  },
  {
    id: "audit",
    term: "Smart Contract Audit",
    category: "Security",
    definition: "A security review of a smart contract's code to identify vulnerabilities."
  },
  // B
  {
    id: "bag-holder",
    term: "Bag Holder",
    category: "Crypto Slang",
    definition: "Someone left holding a token after its price crashes."
  },
  {
    id: "bear-market",
    term: "Bear Market",
    category: "Trading",
    definition: "A market period characterized by falling prices and negative sentiment."
  },
  {
    id: "bitcoin",
    term: "Bitcoin",
    category: "Crypto",
    definition: "The first and most widely recognized cryptocurrency, created by Satoshi Nakamoto."
  },
  {
    id: "block",
    term: "Block",
    category: "Blockchain",
    definition: "A group of transactions added to the blockchain."
  },
  {
    id: "block-explorer",
    term: "Block Explorer",
    category: "Blockchain",
    definition: "A tool used to view blockchain transactions and data."
  },
  {
    id: "blockchain",
    term: "Blockchain",
    category: "Blockchain",
    definition: "A decentralized digital ledger that records transactions across many computers."
  },
  {
    id: "bridging",
    term: "Bridging",
    category: "Interoperability",
    definition: "Transferring digital assets between different blockchains."
  },
  {
    id: "brute-force",
    term: "Brute Force Attack",
    category: "Security",
    definition: "Attempting to gain access by systematically trying multiple keys or passwords."
  },
  {
    id: "bug-bounty",
    term: "Bug Bounty",
    category: "Security",
    definition: "A reward program for finding and reporting security vulnerabilities."
  },
  {
    id: "bull-market",
    term: "Bull Market",
    category: "Trading",
    definition: "A market period characterized by rising prices and positive sentiment."
  },
  {
    id: "burning",
    term: "Burning",
    category: "Tokenomics",
    definition: "Permanently removing tokens from circulation to reduce supply."
  },
  {
    id: "buy-dip",
    term: "Buy the Dip",
    category: "Trading",
    definition: "Purchasing an asset after its price declines."
  },
  // C
  {
    id: "cefi",
    term: "CeFi (Centralized Finance)",
    category: "Finance",
    definition: "Traditional financial services provided by centralized institutions."
  },
  {
    id: "cex",
    term: "CEX (Centralized Exchange)",
    category: "Trading",
    definition: "A cryptocurrency exchange operated by a company."
  },
  {
    id: "centralization",
    term: "Centralization",
    category: "Governance",
    definition: "A system controlled by one organization or authority."
  },
  {
    id: "circulating-supply",
    term: "Circulating Supply",
    category: "Tokenomics",
    definition: "The number of tokens currently available in the market."
  },
  {
    id: "cliff",
    term: "Cliff",
    category: "Tokenomics",
    definition: "A waiting period before vested tokens begin to unlock."
  },
  {
    id: "cold-storage",
    term: "Cold Storage",
    category: "Security",
    definition: "Keeping crypto assets offline for enhanced security."
  },
  {
    id: "cold-wallet",
    term: "Cold Wallet",
    category: "Security",
    definition: "An offline wallet used for secure storage."
  },
  {
    id: "collateral",
    term: "Collateral",
    category: "DeFi",
    definition: "Assets pledged to secure a loan."
  },
  {
    id: "composable",
    term: "Composable",
    category: "DeFi",
    definition: "The ability of DeFi protocols to integrate and build on top of one another like 'money legos.'"
  },
  {
    id: "consensus",
    term: "Consensus",
    category: "Blockchain",
    definition: "Agreement among network participants on transaction validity."
  },
  {
    id: "cross-chain",
    term: "Cross-Chain",
    category: "Interoperability",
    definition: "Transactions or communication between different blockchain networks."
  },
  {
    id: "cryptocurrency",
    term: "Cryptocurrency",
    category: "Crypto",
    definition: "A digital currency secured by cryptography that operates on a blockchain."
  },
  {
    id: "custodial",
    term: "Custodial Wallet",
    category: "Security",
    definition: "A wallet managed by a third party."
  },
  // D
  {
    id: "dao",
    term: "DAO (Decentralized Autonomous Organization)",
    category: "Governance",
    definition: "A blockchain-based organization governed by smart contracts and community voting."
  },
  {
    id: "dapp",
    term: "DApp (Decentralized Application)",
    category: "Development",
    definition: "An application built on a blockchain network."
  },
  {
    id: "decentralization",
    term: "Decentralization",
    category: "Governance",
    definition: "A system not controlled by a single authority."
  },
  {
    id: "decentralized-storage",
    term: "Decentralized Storage",
    category: "Infrastructure",
    definition: "Storing data across distributed networks instead of centralized servers."
  },
  {
    id: "defi",
    term: "DeFi (Decentralized Finance)",
    category: "DeFi",
    definition: "Blockchain-based financial services that operate without traditional banks."
  },
  {
    id: "delegation",
    term: "Delegation",
    category: "Staking",
    definition: "Assigning your staked tokens to a validator to earn rewards."
  },
  {
    id: "dex",
    term: "DEX (Decentralized Exchange)",
    category: "Trading",
    definition: "A peer-to-peer cryptocurrency exchange without intermediaries."
  },
  {
    id: "diamond-hands",
    term: "Diamond Hands",
    category: "Crypto Slang",
    definition: "Holding assets despite high volatility or refusing to sell despite price drops."
  },
  {
    id: "did",
    term: "Web3 Identity (DID)",
    category: "Identity",
    definition: "A decentralized digital identity controlled by the user."
  },
  {
    id: "dip",
    term: "Dip",
    category: "Trading",
    definition: "A temporary drop in price."
  },
  {
    id: "distributed-ledger",
    term: "Distributed Ledger",
    category: "Blockchain",
    definition: "A shared database maintained across multiple nodes."
  },
  {
    id: "dyor",
    term: "DYOR (Do Your Own Research)",
    category: "Crypto Slang",
    definition: "Encouragement to research before investing."
  },
  // E
  {
    id: "ethereum",
    term: "Ethereum",
    category: "Crypto",
    definition: "A blockchain platform that enables smart contracts and decentralized applications."
  },
  {
    id: "fdv",
    term: "Fully Diluted Valuation (FDV)",
    category: "Tokenomics",
    definition: "The total value of a token if its maximum supply were in circulation."
  },
  {
    id: "flash-loan",
    term: "Flash Loan",
    category: "DeFi",
    definition: "An uncollateralized loan in DeFi that must be repaid within one transaction."
  },
  {
    id: "floor-price",
    term: "Floor Price",
    category: "NFT",
    definition: "The lowest listed price of an NFT collection."
  },
  {
    id: "fomo",
    term: "FOMO (Fear of Missing Out)",
    category: "Crypto Slang",
    definition: "Buying an asset due to fear of missing potential gains."
  },
  {
    id: "fork",
    term: "Fork",
    category: "Blockchain",
    definition: "A change or split in a blockchain protocol."
  },
  {
    id: "fud",
    term: "FUD (Fear, Uncertainty, Doubt)",
    category: "Crypto Slang",
    definition: "Negative information intended to create panic."
  },
  // G
  {
    id: "gas-fee",
    term: "Gas Fee",
    category: "Blockchain",
    definition: "A transaction fee paid to execute operations on a blockchain."
  },
  {
    id: "gas-limit",
    term: "Gas Limit",
    category: "Blockchain",
    definition: "The maximum amount of gas a user is willing to spend on a transaction."
  },
  {
    id: "gas-price",
    term: "Gas Price",
    category: "Blockchain",
    definition: "The amount paid per unit of gas to process a transaction."
  },
  {
    id: "genesis-block",
    term: "Genesis Block",
    category: "Blockchain",
    definition: "The first block ever created on a blockchain."
  },
  {
    id: "generative-ai",
    term: "Generative AI",
    category: "AI",
    definition: "AI that can create text, images, audio, or other content."
  },
  {
    id: "gm",
    term: "GM",
    category: "Crypto Slang",
    definition: "\"Good Morning,\" a common greeting in crypto communities."
  },
  {
    id: "governance-token",
    term: "Governance Token",
    category: "Governance",
    definition: "A token that grants voting rights in a protocol."
  },
  {
    id: "gwei",
    term: "Gwei",
    category: "Blockchain",
    definition: "A small denomination of Ethereum used to measure gas fees."
  },
  // H
  {
    id: "hard-fork",
    term: "Hard Fork",
    category: "Blockchain",
    definition: "A major protocol change that creates a separate blockchain."
  },
  {
    id: "hash",
    term: "Hash",
    category: "Blockchain",
    definition: "A unique string generated from transaction data."
  },
  {
    id: "hodl",
    term: "HODL",
    category: "Crypto Slang",
    definition: "Slang for holding cryptocurrency long-term instead of selling during market volatility."
  },
  {
    id: "hot-storage",
    term: "Hot Storage",
    category: "Security",
    definition: "Keeping crypto assets online for easier access."
  },
  {
    id: "hot-wallet",
    term: "Hot Wallet",
    category: "Security",
    definition: "A wallet connected to the internet."
  },
  // I
  {
    id: "ico",
    term: "ICO (Initial Coin Offering)",
    category: "Fundraising",
    definition: "A fundraising method where new tokens are sold to investors."
  },
  {
    id: "ido",
    term: "IDO (Initial DEX Offering)",
    category: "Fundraising",
    definition: "A token sale conducted on a decentralized exchange."
  },
  {
    id: "ieo",
    term: "IEO (Initial Exchange Offering)",
    category: "Fundraising",
    definition: "A token sale conducted through a centralized exchange."
  },
  {
    id: "impermanent-loss",
    term: "Impermanent Loss",
    category: "DeFi",
    definition: "Temporary loss experienced by liquidity providers due to price changes."
  },
  {
    id: "interoperability",
    term: "Interoperability",
    category: "Infrastructure",
    definition: "The ability of different blockchains to communicate and interact."
  },
  // L
  {
    id: "layer-1",
    term: "Layer 1",
    category: "Infrastructure",
    definition: "The base blockchain network (e.g., Ethereum)."
  },
  {
    id: "layer-2",
    term: "Layer 2",
    category: "Infrastructure",
    definition: "A secondary solution built on top of a Layer 1 blockchain to improve scalability and reduce fees."
  },
  {
    id: "launchpad",
    term: "Launchpad",
    category: "Fundraising",
    definition: "A platform that helps new crypto projects raise funds and launch tokens."
  },
  {
    id: "liquidity",
    term: "Liquidity",
    category: "Trading",
    definition: "The ease of buying or selling an asset without affecting its price."
  },
  {
    id: "liquidity-pool",
    term: "Liquidity Pool",
    category: "DeFi",
    definition: "A pool of tokens locked in a smart contract to facilitate trading."
  },
  // M
  {
    id: "mainnet",
    term: "Mainnet",
    category: "Infrastructure",
    definition: "The live and fully operational version of a blockchain network."
  },
  {
    id: "market-cap",
    term: "Market Cap (Market Capitalization)",
    category: "Finance",
    definition: "The total value of a cryptocurrency, calculated by price \u00d7 circulating supply."
  },
  {
    id: "max-supply",
    term: "Max Supply",
    category: "Tokenomics",
    definition: "The maximum number of tokens that will ever exist."
  },
  {
    id: "mev",
    term: "MEV (Maximal Extractable Value)",
    category: "Blockchain",
    definition: "Extra profit that validators can earn by reordering transactions within a block."
  },
  {
    id: "metaverse",
    term: "Metaverse",
    category: "Web3",
    definition: "A virtual digital environment where users interact through avatars."
  },
  {
    id: "minting",
    term: "Minting",
    category: "NFT",
    definition: "The creation of a new token or NFT on a blockchain."
  },
  {
    id: "mint-price",
    term: "Mint Price",
    category: "NFT",
    definition: "The original price to create or purchase an NFT during minting."
  },
  {
    id: "mining",
    term: "Mining",
    category: "Blockchain",
    definition: "The process of validating blockchain transactions using computational power."
  },
  {
    id: "ml",
    term: "Machine Learning",
    category: "AI",
    definition: "A subset of AI that improves performance through data."
  },
  {
    id: "multi-sig",
    term: "Multi-Signature (Multi-Sig)",
    category: "Security",
    definition: "A wallet requiring multiple approvals to authorize transactions."
  },
  // N
  {
    id: "nft",
    term: "NFT (Non-Fungible Token)",
    category: "NFT",
    definition: "A unique digital asset representing ownership of a specific item or content."
  },
  {
    id: "ngmi",
    term: "NGMI",
    category: "Crypto Slang",
    definition: "\"Not Gonna Make It,\" meaning poor decisions may lead to failure."
  },
  {
    id: "node",
    term: "Node",
    category: "Infrastructure",
    definition: "A computer that participates in validating and maintaining a blockchain."
  },
  {
    id: "non-custodial",
    term: "Non-Custodial Wallet",
    category: "Security",
    definition: "A wallet fully controlled by the user."
  },
  // O
  {
    id: "off-chain",
    term: "Off-Chain Data",
    category: "Data",
    definition: "Data stored outside the blockchain."
  },
  {
    id: "on-chain",
    term: "On-Chain Data",
    category: "Data",
    definition: "Data recorded directly on the blockchain."
  },
  {
    id: "optimistic-rollup",
    term: "Optimistic Rollup",
    category: "Layer 2",
    definition: "A rollup that assumes transactions are valid unless challenged."
  },
  {
    id: "oracle",
    term: "Oracle",
    category: "Infrastructure",
    definition: "A service that provides real-world data to smart contracts."
  },
  // P
  {
    id: "paper-hands",
    term: "Paper Hands",
    category: "Crypto Slang",
    definition: "Selling assets quickly due to fear or panic."
  },
  {
    id: "phishing",
    term: "Phishing",
    category: "Security",
    definition: "A scam attempt to steal sensitive information."
  },
  {
    id: "ponzi",
    term: "Ponzi Scheme",
    category: "Security",
    definition: "A fraudulent investment scheme paying returns using new investors' money."
  },
  {
    id: "pos",
    term: "Proof of Stake (PoS)",
    category: "Consensus",
    definition: "A consensus mechanism that relies on staking tokens."
  },
  {
    id: "pow",
    term: "Proof of Work (PoW)",
    category: "Consensus",
    definition: "A consensus mechanism that relies on mining."
  },
  {
    id: "privacy-coin",
    term: "Privacy Coin",
    category: "Crypto",
    definition: "A cryptocurrency focused on enhancing transaction privacy."
  },
  {
    id: "private-key",
    term: "Private Key",
    category: "Security",
    definition: "A secret code that provides access to your cryptocurrency."
  },
  {
    id: "public-key",
    term: "Public Key",
    category: "Security",
    definition: "A cryptographic address used to receive cryptocurrency."
  },
  {
    id: "pump-dump",
    term: "Pump and Dump",
    category: "Trading",
    definition: "Artificially inflating a token's price before selling for profit."
  },
  // R
  {
    id: "rekt",
    term: "Rekt",
    category: "Crypto Slang",
    definition: "Slang for experiencing significant financial loss."
  },
  {
    id: "roadmap",
    term: "Roadmap",
    category: "Project",
    definition: "A project's public development plan and future milestones."
  },
  {
    id: "rollup",
    term: "Rollup",
    category: "Layer 2",
    definition: "A Layer 2 solution that bundles multiple transactions into one to reduce fees."
  },
  {
    id: "royalties",
    term: "Royalties",
    category: "NFT",
    definition: "Percentage fees paid to creators on secondary NFT sales."
  },
  {
    id: "ruga",
    term: "Rug Pull",
    category: "Security",
    definition: "A scam where developers abandon a project after collecting funds."
  },
  {
    id: "rwa",
    term: "Real-World Assets (RWA)",
    category: "Tokenization",
    definition: "Physical or traditional assets represented on a blockchain."
  },
  // S
  {
    id: "sat",
    term: "Satoshi",
    category: "Crypto",
    definition: "The smallest unit of Bitcoin (0.00000001 BTC)."
  },
  {
    id: "scam-token",
    term: "Scam Token",
    category: "Security",
    definition: "A fraudulent cryptocurrency project designed to deceive investors."
  },
  {
    id: "seed-phrase",
    term: "Seed Phrase",
    category: "Security",
    definition: "A series of words used to recover a crypto wallet."
  },
  {
    id: "shill",
    term: "Shill",
    category: "Crypto Slang",
    definition: "Aggressively promoting a cryptocurrency project."
  },
  {
    id: "sidechain",
    term: "Sidechain",
    category: "Infrastructure",
    definition: "A separate blockchain connected to a main blockchain for scalability or experimentation."
  },
  {
    id: "slashing",
    term: "Slashing",
    category: "Staking",
    definition: "A penalty mechanism that reduces staked tokens for malicious behavior."
  },
  {
    id: "slippage",
    term: "Slippage",
    category: "Trading",
    definition: "The difference between expected trade price and executed price."
  },
  {
    id: "smart-contract",
    term: "Smart Contract",
    category: "Development",
    definition: "Self-executing code on a blockchain that runs automatically when conditions are met."
  },
  {
    id: "snapshot",
    term: "Snapshot",
    category: "Airdrops",
    definition: "A record of wallet balances at a specific time, often used for airdrops."
  },
  {
    id: "stablecoin",
    term: "Stablecoin",
    category: "Crypto",
    definition: "A cryptocurrency designed to maintain a stable value, often pegged to fiat currency."
  },
  {
    id: "staking",
    term: "Staking",
    category: "DeFi",
    definition: "Locking cryptocurrency to support a network and earn rewards."
  },
  {
    id: "sybil",
    term: "Sybil Attack",
    category: "Security",
    definition: "An attack where multiple fake identities manipulate a network."
  },
  // T
  {
    id: "testnet",
    term: "Testnet",
    category: "Development",
    definition: "A testing environment for experimenting before launching on mainnet."
  },
  {
    id: "tge",
    term: "Token Generation Event (TGE)",
    category: "Tokenomics",
    definition: "The official launch event when a token is first issued."
  },
  {
    id: "token",
    term: "Token",
    category: "Crypto",
    definition: "A digital asset created on an existing blockchain."
  },
  {
    id: "token-burn",
    term: "Token Burn Event",
    category: "Tokenomics",
    definition: "A scheduled event where tokens are permanently removed from circulation."
  },
  {
    id: "tokenomics",
    term: "Tokenomics",
    category: "Tokenomics",
    definition: "The economic structure and design of a token."
  },
  {
    id: "tokenization",
    term: "Tokenization",
    category: "Tokenization",
    definition: "Converting real-world assets into blockchain-based tokens."
  },
  {
    id: "tvl",
    term: "TVL (Total Value Locked)",
    category: "DeFi",
    definition: "The total value of assets locked in a DeFi protocol."
  },
  // V
  {
    id: "validator",
    term: "Validator",
    category: "Staking",
    definition: "A participant that verifies transactions in Proof-of-Stake networks."
  },
  {
    id: "validator-node",
    term: "Validator Node",
    category: "Infrastructure",
    definition: "A node responsible for confirming transactions in Proof-of-Stake networks."
  },
  {
    id: "vesting",
    term: "Vesting",
    category: "Tokenomics",
    definition: "A schedule that gradually releases tokens to investors or team members."
  },
  {
    id: "volatility",
    term: "Volatility",
    category: "Trading",
    definition: "Rapid and unpredictable price fluctuations."
  },
  // W
  {
    id: "wagmi",
    term: "WAGMI",
    category: "Crypto Slang",
    definition: "\"We're All Gonna Make It,\" an optimistic crypto expression."
  },
  {
    id: "wallet",
    term: "Wallet",
    category: "Security",
    definition: "A digital tool used to store and manage cryptocurrency."
  },
  {
    id: "web3",
    term: "Web3",
    category: "Web3",
    definition: "The next generation of the internet built on blockchain technology, where users own their data and digital assets."
  },
  {
    id: "whitelist",
    term: "Whitelist",
    category: "Crypto",
    definition: "An approved list of participants granted early access."
  },
  {
    id: "white-label",
    term: "White Label",
    category: "Business",
    definition: "A product or service rebranded and sold by another company."
  },
  {
    id: "whitepaper",
    term: "Whitepaper",
    category: "Project",
    definition: "A document explaining a crypto project's purpose, technology, and tokenomics."
  },
  {
    id: "wrapped",
    term: "Wrapped Token",
    category: "Interoperability",
    definition: "A tokenized version of a cryptocurrency that exists on another blockchain."
  },
  // Y
  {
    id: "yield-farming",
    term: "Yield Farming",
    category: "DeFi",
    definition: "Earning rewards by providing liquidity to DeFi platforms."
  },
  // Z
  {
    id: "zk-proof",
    term: "Zero-Knowledge Proof (ZK Proof)",
    category: "Privacy",
    definition: "A method of verifying information without revealing the data itself."
  },
  {
    id: "zk-rollup",
    term: "zk-Rollup",
    category: "Layer 2",
    definition: "A rollup that uses zero-knowledge proofs to validate transactions."
  },
  // Numbers
  {
    id: "51-attack",
    term: "51% Attack",
    category: "Security",
    definition: "When a group controls the majority of a blockchain's mining power."
  },
  {
    id: "ai",
    term: "AI (Artificial Intelligence)",
    category: "AI",
    definition: "Technology that enables machines to simulate human intelligence."
  },
  {
    id: "coin",
    term: "Coin",
    category: "Crypto",
    definition: "A cryptocurrency that runs on its own blockchain."
  }
]

// Helper function to get unique letters from all terms
export const getAlphabetLetters = (): string[] => {
  const letters = new Set<string>()
  glossaryTerms.forEach(term => {
    const firstLetter = term.term.charAt(0).toUpperCase()
    if (/[A-Z]/.test(firstLetter)) {
      letters.add(firstLetter)
    } else {
      letters.add('#') // For numbers/symbols
    }
  })
  return Array.from(letters).sort()
}

// Helper function to group terms by first letter
export const getTermsByLetter = (): Record<string, GlossaryTerm[]> => {
  const grouped: Record<string, GlossaryTerm[]> = {}
  glossaryTerms.forEach(term => {
    const firstLetter = term.term.charAt(0).toUpperCase()
    const key = /[A-Z]/.test(firstLetter) ? firstLetter : '#'
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(term)
  })
  // Sort each group alphabetically
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => a.term.localeCompare(b.term))
  })
  return grouped
}

// Helper function to get term by ID
export const getTermById = (id: string): GlossaryTerm | undefined => {
  return glossaryTerms.find(term => term.id === id)
}

// Helper function to get related terms (same category)
export const getRelatedTerms = (currentId: string, limit: number = 5): GlossaryTerm[] => {
  const currentTerm = getTermById(currentId)
  if (!currentTerm) return []

  return glossaryTerms
    .filter(term => term.id !== currentId && term.category === currentTerm.category)
    .slice(0, limit)
}
