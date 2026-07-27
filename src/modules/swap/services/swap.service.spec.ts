import { BadRequestException } from "@nestjs/common";
import { CircuitBreaker } from "../../../infra/executor/circuit-breaker/circuit-breaker";
import { GaslessNotSupportedException } from "../../../infra/executor/exceptions/gasless-not-supported.exception";
import { ExecutorCapability, type ExecutorCapabilities } from "../../../infra/executor/interfaces/executor-capabilities.interface";
import type { ExecutorService } from "../../../infra/executor/interfaces/executor-service.interface";
import type { JitoService } from "../../../infra/jito/jito.service";
import type { KoraService } from "../../../infra/kora/kora.service";
import type { SolanaService } from "../../../infra/solana/solana.service";
import type { RedisService } from "../../../redis/services/redis.service";
import type { TokenPriceService } from "../../tokens/services/token-price.service";
import { SwapService } from "./swap.service";

const mainnetCapabilities: ExecutorCapabilities = {
    executorKey: "jupiter",
    capabilities: [ExecutorCapability.MevProtection],
    gaslessSupportedTokens: [],
    payerPubkey: null
};

const devnetCapabilities: ExecutorCapabilities = {
    executorKey: "solsight",
    capabilities: [ExecutorCapability.Gasless],
    gaslessSupportedTokens: ["FeeMint"],
    payerPubkey: "PayerPubkey"
};

function createExecutor(capabilities: ExecutorCapabilities): jest.Mocked<ExecutorService> {
    return {
        getCapabilities: jest.fn().mockResolvedValue(capabilities),
        getQuote: jest.fn().mockResolvedValue({ routePlan: [] }),
        getSwapTransaction: jest.fn().mockResolvedValue({ swapTransaction: "tx" })
    } as unknown as jest.Mocked<ExecutorService>;
}

function createService(executor: jest.Mocked<ExecutorService>) {
    const circuitBreaker = {
        forCluster: jest.fn().mockReturnValue(executor)
    } as unknown as jest.Mocked<CircuitBreaker>;
    const solanaService = {
        getRecentPrioritizationFees: jest.fn().mockResolvedValue([{ prioritizationFee: 120_000 }]),
        submit: jest.fn().mockResolvedValue({ signature: "signature" }),
        submitAndConfirm: jest.fn().mockResolvedValue({ signature: "signature" }),
        confirmSignature: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<SolanaService>;
    const koraService = {
        signAndSendTransaction: jest.fn().mockResolvedValue({ signature: "kora-signature" })
    } as unknown as jest.Mocked<KoraService>;
    const jitoService = {
        getLandedTip75thPercentileLamports: jest.fn().mockResolvedValue(60_000),
        getAntiMevTipLamports: jest.fn().mockResolvedValue(80_000),
        sendTransaction: jest.fn().mockResolvedValue({ signature: "jito-signature", bundleId: "bundle-1" })
    } as unknown as jest.Mocked<JitoService>;
    const redisService = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<RedisService>;
    const service = new SwapService(circuitBreaker, solanaService, koraService, jitoService, redisService, {} as TokenPriceService);

    return { service, circuitBreaker, solanaService, koraService, jitoService, redisService };
}

describe("SwapService", () => {
    it("routes quotes using the explicit request cluster", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service, circuitBreaker } = createService(executor);

        await service.getQuote("mainnet", {
            inputMint: "InputMint",
            outputMint: "OutputMint",
            amount: "100",
            swapMode: "ExactIn",
            slippageBps: 50,
            cluster: "mainnet"
        });

        expect(circuitBreaker.forCluster.mock.calls).toContainEqual(["mainnet"]);
        expect(executor.getQuote.mock.calls[0]?.[0]).toBe("mainnet");
    });

    it("forwards forJitoBundle to the executor only when requested", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service } = createService(executor);

        await service.getQuote("mainnet", {
            inputMint: "InputMint",
            outputMint: "OutputMint",
            amount: "100",
            swapMode: "ExactIn",
            slippageBps: 50,
            cluster: "mainnet",
            forJitoBundle: true
        });
        expect(executor.getQuote.mock.calls[0]?.[1]).toMatchObject({ forJitoBundle: true });

        executor.getQuote.mockClear();
        await service.getQuote("mainnet", {
            inputMint: "InputMint",
            outputMint: "OutputMint",
            amount: "100",
            swapMode: "ExactIn",
            slippageBps: 50,
            cluster: "mainnet"
        });
        expect(executor.getQuote.mock.calls[0]?.[1]).not.toHaveProperty("forJitoBundle");
    });

    it("projects executor capabilities into the additive swap-info response", async () => {
        const executor = createExecutor(devnetCapabilities);
        const { service, redisService } = createService(executor);

        await expect(
            service.getSwapInfo("devnet", {
                cluster: "devnet",
                inputMint: "InputMint",
                outputMint: "OutputMint"
            })
        ).resolves.toEqual({
            autoPriorityFeeLamports: 120_000,
            autoTipLamports: 0,
            autoSlippageBps: null,
            maxAutoFeeLamports: 360_000,
            executorKey: "solsight",
            capabilities: [ExecutorCapability.Gasless],
            gaslessEnabled: true,
            gaslessSupportedTokens: ["FeeMint"],
            payerPubkey: "PayerPubkey"
        });

        expect(redisService.set.mock.calls).toContainEqual([
            "swap:info:devnet:fees:v1",
            {
                autoPriorityFeeLamports: 120_000,
                autoTipLamports: 0,
                maxAutoFeeLamports: 360_000
            },
            5
        ]);
    });

    it("rejects gasless transaction builds on Jupiter", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service } = createService(executor);

        await expect(
            service.getSwapTransaction("mainnet", {
                quoteResponse: {} as never,
                userPublicKey: "UserPublicKey",
                gaslessFeeToken: "FeeMint"
            })
        ).rejects.toBeInstanceOf(GaslessNotSupportedException);

        expect(executor.getSwapTransaction.mock.calls).toHaveLength(0);
    });

    it("passes supported gasless fee tokens to Solsight Executor", async () => {
        const executor = createExecutor(devnetCapabilities);
        const { service } = createService(executor);

        await expect(
            service.getSwapTransaction("devnet", {
                quoteResponse: {} as never,
                userPublicKey: "UserPublicKey",
                gaslessFeeToken: "FeeMint"
            })
        ).resolves.toEqual({ swapTransaction: "tx" });

        expect(executor.getSwapTransaction.mock.calls).toContainEqual([
            "devnet",
            {
                quoteResponse: {},
                userPublicKey: "UserPublicKey",
                wrapAndUnwrapSol: true,
                feeToken: "FeeMint"
            }
        ]);
    });

    it("rejects unsupported gasless fee tokens before calling the executor", async () => {
        const executor = createExecutor(devnetCapabilities);
        const { service } = createService(executor);

        await expect(
            service.getSwapTransaction("devnet", {
                quoteResponse: {} as never,
                userPublicKey: "UserPublicKey",
                gaslessFeeToken: "OtherMint"
            })
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(executor.getSwapTransaction.mock.calls).toHaveLength(0);
    });

    it("guards gasless execution with the selected executor capabilities", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service, koraService, solanaService } = createService(executor);

        await expect(
            service.executeSwap("mainnet", { signedTransaction: "base64tx", lastValidBlockHeight: 123, gaslessFeeToken: "FeeMint" })
        ).rejects.toBeInstanceOf(GaslessNotSupportedException);

        expect(koraService.signAndSendTransaction.mock.calls).toHaveLength(0);
        expect(solanaService.confirmSignature.mock.calls).toHaveLength(0);
    });

    it("sends signed gasless transactions via Kora without blocking on confirmation", async () => {
        const executor = createExecutor(devnetCapabilities);
        const { service, koraService, solanaService } = createService(executor);

        await expect(service.executeSwap("devnet", { signedTransaction: "base64tx", lastValidBlockHeight: 123, gaslessFeeToken: "FeeMint" })).resolves.toEqual({
            signature: "kora-signature",
            lastValidBlockHeight: 123
        });

        expect(koraService.signAndSendTransaction.mock.calls).toContainEqual([{ transaction: "base64tx" }]);
        // Send-then-confirm: the server no longer waits on confirmation; the client does.
        expect(solanaService.confirmSignature.mock.calls).toHaveLength(0);
        expect(executor.getSwapTransaction.mock.calls).toHaveLength(0);
    });

    it("embeds a Jito tip when building an anti-MEV transaction", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service } = createService(executor);

        await service.getSwapTransaction("mainnet", {
            quoteResponse: {} as never,
            userPublicKey: "UserPublicKey",
            antiMevRpc: "sec"
        });

        expect(executor.getSwapTransaction.mock.calls).toContainEqual([
            "mainnet",
            {
                quoteResponse: {},
                userPublicKey: "UserPublicKey",
                wrapAndUnwrapSol: true,
                prioritizationFeeLamports: { jitoTipLamports: 80_000 }
            }
        ]);
    });

    it("uses the user-selected Jito tip on the anti-MEV path when provided", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service } = createService(executor);

        await service.getSwapTransaction("mainnet", {
            quoteResponse: {} as never,
            userPublicKey: "UserPublicKey",
            antiMevRpc: "sec",
            tipLamports: 55_000
        });

        expect(executor.getSwapTransaction.mock.calls).toContainEqual([
            "mainnet",
            {
                quoteResponse: {},
                userPublicKey: "UserPublicKey",
                wrapAndUnwrapSol: true,
                prioritizationFeeLamports: { jitoTipLamports: 55_000 }
            }
        ]);
    });

    it("forwards a custom priority fee as a raw lamports amount when anti-MEV is off", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service } = createService(executor);

        await service.getSwapTransaction("mainnet", {
            quoteResponse: {} as never,
            userPublicKey: "UserPublicKey",
            antiMevRpc: "off",
            priorityFeeLamports: 200_000
        });

        expect(executor.getSwapTransaction.mock.calls).toContainEqual([
            "mainnet",
            {
                quoteResponse: {},
                userPublicKey: "UserPublicKey",
                wrapAndUnwrapSol: true,
                prioritizationFeeLamports: 200_000
            }
        ]);
    });

    it("uses priorityLevelWithMaxLamports capped by maxAutoFeeLamports when priority is on auto", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service } = createService(executor);

        await service.getSwapTransaction("mainnet", {
            quoteResponse: {} as never,
            userPublicKey: "UserPublicKey",
            antiMevRpc: "off",
            maxAutoFeeLamports: 500_000
        });

        expect(executor.getSwapTransaction.mock.calls).toContainEqual([
            "mainnet",
            {
                quoteResponse: {},
                userPublicKey: "UserPublicKey",
                wrapAndUnwrapSol: true,
                prioritizationFeeLamports: { priorityLevelWithMaxLamports: { priorityLevel: "high", maxLamports: 500_000 } }
            }
        ]);
    });

    it("rejects a request that sets both a priority fee and a Jito tip on mainnet", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service } = createService(executor);

        await expect(
            service.getSwapTransaction("mainnet", {
                quoteResponse: {} as never,
                userPublicKey: "UserPublicKey",
                priorityFeeLamports: 200_000,
                tipLamports: 55_000
            })
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(executor.getSwapTransaction.mock.calls).toHaveLength(0);
    });

    it("forwards a raw priority fee to the devnet (solsight) executor", async () => {
        const executor = createExecutor(devnetCapabilities);
        const { service } = createService(executor);

        await service.getSwapTransaction("devnet", {
            quoteResponse: {} as never,
            userPublicKey: "UserPublicKey",
            priorityFeeLamports: 150_000
        });

        expect(executor.getSwapTransaction.mock.calls).toContainEqual([
            "devnet",
            {
                quoteResponse: {},
                userPublicKey: "UserPublicKey",
                wrapAndUnwrapSol: true,
                priorityFeeLamports: 150_000
            }
        ]);
    });

    it("routes anti-MEV execution through Jito sendTransaction and returns immediately", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service, jitoService, solanaService } = createService(executor);

        await expect(service.executeSwap("mainnet", { signedTransaction: "base64tx", lastValidBlockHeight: 123, antiMevRpc: "sec" })).resolves.toEqual({
            signature: "jito-signature",
            lastValidBlockHeight: 123
        });

        expect(jitoService.sendTransaction.mock.calls).toContainEqual(["mainnet", "base64tx"]);
        expect(solanaService.submit.mock.calls).toHaveLength(0);
    });

    it("wraps a Jito sendTransaction failure as a server error", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service, jitoService } = createService(executor);
        jitoService.sendTransaction.mockRejectedValueOnce(new Error("block engine unavailable"));

        await expect(service.executeSwap("mainnet", { signedTransaction: "base64tx", lastValidBlockHeight: 123, antiMevRpc: "sec" })).rejects.toMatchObject({
            status: 500
        });
    });

    it("submits through the default RPC path (send only) when no protection is requested", async () => {
        const executor = createExecutor(mainnetCapabilities);
        const { service, jitoService, koraService, solanaService } = createService(executor);

        await expect(service.executeSwap("mainnet", { signedTransaction: "base64tx", lastValidBlockHeight: 123 })).resolves.toEqual({
            signature: "signature",
            lastValidBlockHeight: 123
        });

        expect(solanaService.submit.mock.calls).toContainEqual(["mainnet", "base64tx"]);
        expect(solanaService.submitAndConfirm.mock.calls).toHaveLength(0);
        expect(jitoService.sendTransaction.mock.calls).toHaveLength(0);
        expect(koraService.signAndSendTransaction.mock.calls).toHaveLength(0);
    });
});
