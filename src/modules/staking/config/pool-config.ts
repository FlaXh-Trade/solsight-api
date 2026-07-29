import { PublicKey } from "@solana/web3.js";
import type { Cluster } from "../../../common/cluster/cluster.types";
import { STAKE_POOLS_BY_PROTOCOL, StakingProtocol } from "./staking-addresses";

export interface StakePoolCoordinates {
    stakePoolProgram: PublicKey;
    stakePool: PublicKey;
    lstMint: PublicKey;
    withdrawAuthority: PublicKey;
    reserveStake: PublicKey;
    managerFeeAccount: PublicKey;
}

export function getStakePoolCoordinates(cluster: Cluster, protocol: StakingProtocol): StakePoolCoordinates {
    const pool = cluster === "mainnet" ? STAKE_POOLS_BY_PROTOCOL[protocol].mainnet : STAKE_POOLS_BY_PROTOCOL[protocol].devnet;

    return {
        stakePoolProgram: new PublicKey(pool.stakePoolProgram),
        stakePool: new PublicKey(pool.stakePool),
        lstMint: new PublicKey(pool.lstMint),
        withdrawAuthority: new PublicKey(pool.withdrawAuthority),
        reserveStake: new PublicKey(pool.reserveStake),
        managerFeeAccount: new PublicKey(pool.managerFeeAccount)
    };
}
