import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { IsSolanaAddress } from "../../../common/validators/is-solana-address.validator";
import { ClusterQueryDto } from "../../../common/cluster/cluster-query.dto";
import { STAKING_PROTOCOLS, StakingProtocol } from "../config/staking-addresses";
import { DEFAULT_NATIVE_PAGE_SIZE, MAX_NATIVE_PAGE_SIZE } from "../types/staking.types";

export class GetStakingPositionDto extends ClusterQueryDto {
    @IsString()
    @IsSolanaAddress()
    wallet!: string;

    /** Which LST pool to read the liquid position for. Defaults to jito. */
    @IsOptional()
    @IsIn(STAKING_PROTOCOLS)
    protocol?: StakingProtocol;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_NATIVE_PAGE_SIZE)
    pageSize?: number = DEFAULT_NATIVE_PAGE_SIZE;
}
