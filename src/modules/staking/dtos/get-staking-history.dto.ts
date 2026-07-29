import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { IsSolanaAddress } from "../../../common/validators/is-solana-address.validator";
import { ClusterQueryDto } from "../../../common/cluster/cluster-query.dto";
import { STAKING_PROTOCOLS, StakingProtocol } from "../config/staking-addresses";
import { DEFAULT_HISTORY_PAGE_SIZE, MAX_HISTORY_PAGE_SIZE } from "../types/staking.types";

export class GetStakingHistoryDto extends ClusterQueryDto {
    @IsString()
    @IsSolanaAddress()
    wallet!: string;

    /** Which LST pool's liquid-staking history to sync. Defaults to jito. */
    @IsOptional()
    @IsIn(STAKING_PROTOCOLS)
    protocol?: StakingProtocol;

    @IsOptional()
    @IsString()
    before?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_HISTORY_PAGE_SIZE)
    pageSize?: number = DEFAULT_HISTORY_PAGE_SIZE;
}
