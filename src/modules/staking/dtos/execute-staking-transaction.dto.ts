import { IsBase64, IsNumber, IsString } from "class-validator";

export class ExecuteStakingTransactionDto {
    @IsBase64()
    @IsString()
    signedTransaction!: string;

    @IsNumber()
    lastValidBlockHeight!: number;
}
