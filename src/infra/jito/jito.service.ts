import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { JitoJsonRpcResponse, JitoTipFloorSample } from "./jito.types";
import type { Cluster } from "../../common/cluster/cluster.types";

/** Hard minimum tip for anti-MEV bundles; the 95th percentile can dip near zero when idle. */
const ANTI_MEV_MIN_TIP_LAMPORTS = 10_000;

/**
 * Thin client over the public Jito APIs.
 *
 * - Tip-floor feed: seeds the auto-tip suggestion in `GET /swap/info`.
 * - Block engine: submits anti-MEV swaps (`antiMevRpc="sec"`) via `sendTransaction` with
 *   `bundleOnly=true` (revert protection), protecting them from front-running/sandwich
 *   attacks. Returns the signature immediately; the client tracks confirmation.
 *
 * Both endpoints are mainnet-only; devnet callers get a `ServiceUnavailableException`.
 */
@Injectable()
export class JitoService {
    private readonly logger = new Logger(JitoService.name);
    private readonly apiClient: AxiosInstance;
    private readonly blockEngineClient: AxiosInstance;

    constructor(private readonly configService: ConfigService) {
        const tipFloorUrl = this.configService.getOrThrow<string>("jito.tipFloorUrl");
        const blockEngineUrl = this.configService.getOrThrow<string>("jito.blockEngineUrl");

        this.apiClient = axios.create({
            baseURL: tipFloorUrl,
            timeout: 5000,
            headers: {
                Accept: "application/json"
            }
        });

        this.blockEngineClient = axios.create({
            baseURL: blockEngineUrl,
            timeout: 10000,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            }
        });

        this.logger.log(`Jito clients initialized: tipFloor=${tipFloorUrl} blockEngine=${blockEngineUrl}`);
    }

    /**
     * Returns the latest 75th-percentile landed-tip estimate in lamports.
     *
     * Used to seed the auto-tip *display* suggestion in `GET /swap/info`. The Jito
     * feed reports values in SOL (e.g. `0.000007`); this converts to integer lamports.
     * Throws on network or shape errors; callers wrap with their own fallback.
     */
    async getLandedTip75thPercentileLamports(cluster: Cluster): Promise<number> {
        return this.fetchLandedTipLamports(cluster, "landed_tips_75th_percentile");
    }

    /**
     * Tip to embed in an anti-MEV bundle so it wins Jito's inclusion auction.
     *
     * Unlike the 75th-percentile *display* estimate, a bundle must actually out-bid
     * competitors to land, so we use the 95th percentile and clamp to a hard minimum
     * floor (the 95th can still dip to near-zero in quiet periods).
     */
    async getAntiMevTipLamports(cluster: Cluster): Promise<number> {
        const tip = await this.fetchLandedTipLamports(cluster, "landed_tips_95th_percentile");
        return Math.max(tip, ANTI_MEV_MIN_TIP_LAMPORTS);
    }

    private async fetchLandedTipLamports(cluster: Cluster, percentileKey: keyof JitoTipFloorSample): Promise<number> {
        if (cluster !== "mainnet") {
            throw new ServiceUnavailableException("Jito tip data is unavailable on devnet.");
        }

        const { data } = await this.apiClient.get<JitoTipFloorSample[]>("");

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Jito tip-floor response was empty");
        }

        const latest = data[data.length - 1];
        const tipSol = latest?.[percentileKey];

        if (typeof tipSol !== "number" || !Number.isFinite(tipSol) || tipSol < 0) {
            throw new Error(`Jito tip-floor response missing ${percentileKey}`);
        }

        return Math.round(tipSol * 1_000_000_000);
    }

    /**
     * Submits a single signed transaction to the Jito block engine via `sendTransaction`
     * with `bundleOnly=true` (revert protection) and returns the on-chain signature
     * immediately — confirmation is tracked by the client, not here.
     *
     * The transaction must already contain a tip to a Jito tip account (embedded by the
     * executor at build time) large enough to win the auction, or it won't be included.
     * The bundle id is returned when the block engine reports one via the `x-bundle-id`
     * response header. Mainnet-only; throws on devnet.
     */
    public async sendTransaction(cluster: Cluster, signedTransactionBase64: string): Promise<{ signature: string; bundleId?: string }> {
        if (cluster !== "mainnet") {
            throw new ServiceUnavailableException("Jito transaction submission is unavailable on devnet.");
        }
        // TODO: has to remove the bundleOnly param for the transaction to be confirmed
        // Tried to raise the tip fee but still got bundle rejected
        const response = await this.blockEngineClient.post<JitoJsonRpcResponse<string>>("/api/v1/transactions", {
            jsonrpc: "2.0",
            id: 1,
            method: "sendTransaction",
            params: [signedTransactionBase64, { encoding: "base64" }]
        });

        const { data } = response;
        if (data.error) {
            throw new Error(`Jito sendTransaction failed: ${data.error.message ?? JSON.stringify(data.error)}`);
        }

        const signature = data.result;
        if (!signature) {
            throw new Error("Jito sendTransaction response missing signature");
        }

        // axios lowercases response header keys; present when the tx was accepted as a bundle.
        const bundleId = response.headers["x-bundle-id"] as string | undefined;

        this.logger.log(`Jito transaction submitted: signature=${signature} bundleId=${bundleId ?? "n/a"}`);
        return { signature, bundleId };
    }
}
