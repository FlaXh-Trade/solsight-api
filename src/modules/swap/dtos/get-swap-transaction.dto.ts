import { IsBoolean, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import type { QuoteResponse } from "../../../infra/executor/interfaces/executor-service.interface";
import type { JupiterRoutePlanStep, JupiterSwapMode } from "../../../infra/jupiter/types";
import { IsSolanaAddress } from "../../../common/validators/is-solana-address.validator";
import { ANTI_MEV_RPC_VALUES, type AntiMevRpc } from "../types/anti-mev.types";

class QuoteResponseDto implements QuoteResponse {
    @IsString()
    @IsNotEmpty()
    inputMint: string;

    @IsString()
    @IsNotEmpty()
    inAmount: string;

    @IsString()
    @IsNotEmpty()
    outputMint: string;

    @IsString()
    @IsNotEmpty()
    outAmount: string;

    @IsString()
    @IsNotEmpty()
    otherAmountThreshold: string;

    @IsEnum(["ExactIn", "ExactOut"])
    swapMode: JupiterSwapMode;

    @IsNotEmpty()
    slippageBps: number;

    @IsString()
    @IsNotEmpty()
    priceImpactPct: string;

    @IsNotEmpty()
    routePlan: JupiterRoutePlanStep[];

    @IsNumber()
    @IsNotEmpty()
    contextSlot: number;

    @IsNumber()
    @IsNotEmpty()
    timeTaken: number;
}

export class GetSwapTransactionDto {
    @ValidateNested()
    @Type(() => QuoteResponseDto)
    quoteResponse: QuoteResponse;

    @IsSolanaAddress()
    userPublicKey: string;

    @IsBoolean()
    @IsOptional()
    wrapAndUnwrapSol?: boolean;

    @IsOptional()
    @IsSolanaAddress()
    gaslessFeeToken?: string;

    @IsOptional()
    @IsIn(ANTI_MEV_RPC_VALUES)
    antiMevRpc?: AntiMevRpc;

    /**
     * User-selected priority fee in TOTAL lamports. `undefined` = auto (backend
     * derives a `priorityLevelWithMaxLamports` request, capped by `maxAutoFeeLamports`).
     * Ignored when `antiMevRpc === "sec"` — Jupiter's `/swap` cannot carry both a
     * priority fee and a Jito tip in one transaction.
     */
    @IsOptional()
    @IsNumber()
    @Min(0)
    priorityFeeLamports?: number;

    /**
     * User-selected Jito tip in lamports. Only applied on the anti-MEV path; `undefined`
     * falls back to the auto 95th-percentile tip.
     */
    @IsOptional()
    @IsNumber()
    @Min(0)
    tipLamports?: number;

    /**
     * Upper bound for the auto priority-fee estimate (used as `maxLamports` in the
     * `priorityLevelWithMaxLamports` request when priority is on auto).
     */
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxAutoFeeLamports?: number;
}
