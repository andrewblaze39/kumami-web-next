import { Alchemy, Network, TokenBalanceType, NftFilters, AssetTransfersCategory, SortingOrder } from 'alchemy-sdk';

export type Chain = 'eth' | 'base' | 'arb';

const SDK_MAP: Record<Chain, Alchemy> = {
  eth: new Alchemy({ apiKey: process.env.ALCHEMY_API_KEY_ETH!, network: Network.ETH_MAINNET }),
  base: new Alchemy({ apiKey: process.env.ALCHEMY_API_KEY_BASE!, network: Network.BASE_MAINNET }),
  arb: new Alchemy({ apiKey: process.env.ALCHEMY_API_KEY_ARB!, network: Network.ARB_MAINNET }),
};

const WEBHOOK_ID_MAP: Record<Chain, string> = {
  eth: process.env.ALCHEMY_WEBHOOK_ID_ETH!,
  base: process.env.ALCHEMY_WEBHOOK_ID_BASE!,
  arb: process.env.ALCHEMY_WEBHOOK_ID_ARB!,
};

export function sdkForChain(chain: Chain): Alchemy {
  return SDK_MAP[chain];
}

export interface WalletSummaryChain {
  chain: Chain;
  ethBalance: string;       // formatted e.g. "1.234 ETH"
  topTokens: { symbol: string; balance: string }[];
  nftCount: number;
  recentTxCount: number;
}

export async function getWalletSummary(address: string, chains: Chain[] = ['eth', 'base', 'arb']): Promise<WalletSummaryChain[]> {
  const results = await Promise.allSettled(
    chains.map(async (chain): Promise<WalletSummaryChain> => {
      const sdk = sdkForChain(chain);
      const [balanceWei, tokens, nfts, transfers] = await Promise.all([
        sdk.core.getBalance(address),
        sdk.core.getTokenBalances(address, { type: TokenBalanceType.DEFAULT_TOKENS }),
        sdk.nft.getNftsForOwner(address, { excludeFilters: [NftFilters.SPAM] }),
        sdk.core.getAssetTransfers({
          fromAddress: address,
          category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
          order: SortingOrder.DESCENDING,
          maxCount: 10,
          withMetadata: false,
        }),
      ]);

      const ethBalance = (Number(balanceWei) / 1e18).toFixed(4) + ' ETH';

      const topTokens = (tokens.tokenBalances ?? [])
        .filter(t => t.tokenBalance && t.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000')
        .slice(0, 5)
        .map(t => ({ symbol: t.contractAddress.slice(0, 6), balance: t.tokenBalance ?? '0' }));

      return {
        chain,
        ethBalance,
        topTokens,
        nftCount: nfts.totalCount,
        recentTxCount: transfers.transfers.length,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<WalletSummaryChain> => r.status === 'fulfilled')
    .map(r => r.value);
}

export async function registerAddressOnChain(address: string, chains: Chain[]): Promise<void> {
  await Promise.allSettled(
    chains.map(chain => {
      const webhookId = WEBHOOK_ID_MAP[chain];
      if (!webhookId) return Promise.resolve();
      return sdkForChain(chain).notify.updateWebhook(webhookId, { addAddresses: [address] });
    })
  );
}

export async function unregisterAddressOnChain(address: string, chains: Chain[]): Promise<void> {
  await Promise.allSettled(
    chains.map(chain => {
      const webhookId = WEBHOOK_ID_MAP[chain];
      if (!webhookId) return Promise.resolve();
      return sdkForChain(chain).notify.updateWebhook(webhookId, { removeAddresses: [address] });
    })
  );
}
