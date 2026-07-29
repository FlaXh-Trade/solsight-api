import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import type { Cache } from "cache-manager";
import { StakingProtocol } from "../config/staking-addresses";

export interface StakingApyResponse {
    protocol: StakingProtocol;
    apyPercent: number;
    asOf: string | null;
}

const APY_CACHE_KEY = "staking:apy:v1";
// Mainnet APY only moves epoch-to-epoch (~2-3 days), so a short TTL is purely
// about not hammering third-party APIs, not about freshness.
const APY_CACHE_TTL_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

const JITO_STATS_URL = "https://kobe.mainnet.jito.network/api/v1/stake_pool_stats";
const BLAZE_APY_URL = "https://stake.solblaze.org/api/v1/apy";

interface JitoStakePoolStats {
    apy: Array<{ data: number; date: string }>;
}

interface BlazeApyResponse {
    success: boolean;
    apy: number;
}

@Injectable()
export class StakingApyService {
    private readonly logger = new Logger(StakingApyService.name);

    constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

    /**
     * Always sourced from mainnet regardless of which cluster the caller is
     * configured for. Devnet pools carry negligible/undelegated stake and no
     * real MEV auctions, so their own exchange-rate growth isn't a meaningful
     * yield signal — see staking-program devnet notes.
     */
    async getApy(): Promise<StakingApyResponse[]> {
        const cached = await this.cacheManager.get<StakingApyResponse[]>(APY_CACHE_KEY);
        if (cached) return cached;

        const [jito, blaze] = await Promise.all([this.fetchJitoApy(), this.fetchBlazeApy()]);
        const results = [jito, blaze].filter((entry): entry is StakingApyResponse => entry !== null);

        if (results.length > 0) {
            await this.cacheManager.set(APY_CACHE_KEY, results, APY_CACHE_TTL_MS);
        }
        return results;
    }

    private async fetchJitoApy(): Promise<StakingApyResponse | null> {
        try {
            const { data } = await axios.get<JitoStakePoolStats>(JITO_STATS_URL, { timeout: REQUEST_TIMEOUT_MS });
            const latest = data.apy?.[data.apy.length - 1];
            if (!latest) return null;
            return { protocol: "jito", apyPercent: latest.data * 100, asOf: latest.date };
        } catch (error) {
            this.logger.warn(`Failed to fetch Jito APY from mainnet: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    private async fetchBlazeApy(): Promise<StakingApyResponse | null> {
        try {
            const { data } = await axios.get<BlazeApyResponse>(BLAZE_APY_URL, { timeout: REQUEST_TIMEOUT_MS });
            if (!data.success) return null;
            return { protocol: "blaze", apyPercent: data.apy, asOf: null };
        } catch (error) {
            this.logger.warn(`Failed to fetch Blaze APY from mainnet: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
}
