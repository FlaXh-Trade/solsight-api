// Multi-pool deployment (jito + blaze configs both live under this program id,
// each in its own StakePoolConfig PDA keyed by [authority, pool_mint]).
// The pre-Blaze single-pool deployment (BHaXES9ZvPVozojv3Z7ETV16vjBpWNQL59mDiwoPtNPG)
// is left running untouched at its old address, just no longer referenced here.
export const STAKING_PROGRAM_ID = "7MZ82ezxXs1qZi2k7K234Ma6UNE4RhdPCzyoux6L2TQE";

export const STAKING_AUTHORITY = "HJnpCRqahd2Zunhx1VyY9d9Hj7UyLSNWQEavybJC3MSa";

export type StakingProtocol = "jito" | "blaze";

export const STAKING_PROTOCOLS: StakingProtocol[] = ["jito", "blaze"];

export interface StakePoolAddresses {
    stakePool: string;
    lstMint: string;
    withdrawAuthority: string;
    reserveStake: string;
    managerFeeAccount: string;
    stakePoolProgram: string;
}

// jitoSOL — SPL Stake Pool program, mainnet deployment.
export const JITO_MAINNET_POOL: StakePoolAddresses = {
    stakePool: "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb",
    lstMint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    withdrawAuthority: "6iQKfEyhr3bZMotVkW6beNZz5CPAkiwvgV2CTje9pVSS",
    reserveStake: "BgKUXdS29YcHCFrPm5M8oLHiTzZaMDjsebggjoaQ6KFL",
    managerFeeAccount: "8yoigZfzZ1nNaadumY9uPVD118225UYHTDpmjpr2nrSa",
    stakePoolProgram: "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy"
};

// jitoSOL — SPL Stake Pool program mirror, devnet deployment (the original
// SPoo1... devnet deployment is stuck on an outdated, unusable version).
export const JITO_DEVNET_POOL: StakePoolAddresses = {
    stakePool: "JitoY5pcAxWX6iyP2QdFwTznGb8A99PRCUCVVxB46WZ",
    lstMint: "J1tos8mqbhdGcF3pgj4PCKyVjzWSURcpLZU7pPGHxSYi",
    withdrawAuthority: "8HPpFV5PFqGmDumjRTFw9BhsjrZYjJBDuHX2p6H5nBmd",
    reserveStake: "Dsd1zgN4XtxC6239vNznTNb6akTLNQeSBKoJqYjNps5e",
    managerFeeAccount: "77MybzFEM9WbZLsGtoiX2WACJ4K5JbxU9HBKUVapb5KN",
    stakePoolProgram: "DPoo15wWDqpPJJtS2MUZ49aRxqz5ZaaJCJP4z8bLuib"
};

// bSOL (BlazeStake) — SPL Stake Pool program, mainnet deployment.
// Addresses cross-checked directly against on-chain account data (pool_mint /
// manager_fee_account decoded from the stake pool account bytes) and PDA
// derivation for withdrawAuthority (findProgramAddress([stakePool, "withdraw"], program)),
// not copied from docs verbatim.
export const BLAZE_MAINNET_POOL: StakePoolAddresses = {
    stakePool: "stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi",
    lstMint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    withdrawAuthority: "6WecYymEARvjG5ZyqkrVQ6YkhPfujNzWpSPwNKXHCbV2",
    reserveStake: "rsrxDvYUXjH1RQj2Ke36LNZEVqGztATxFkqNukERqFT",
    managerFeeAccount: "Dpo148tVGewDPyh2FkGV18gouWctbdX2fHJopJGe9xv1",
    stakePoolProgram: "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy"
};

// bSOL (BlazeStake) — SPL Stake Pool program, devnet deployment. Blaze reuses
// the same program id and bSOL mint address on devnet as on mainnet; only the
// pool/reserve/validator-list accounts differ per cluster.
export const BLAZE_DEVNET_POOL: StakePoolAddresses = {
    stakePool: "azFVdHtAJN8BX3sbGAYkXvtdjdrT5U6rj9rovvUFos9",
    lstMint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    withdrawAuthority: "4vJJQTSApqig3DEZbLRNuWscQfE6GVisSgRPraiPn1Fz",
    reserveStake: "aRkys1kVHeysrcn9bJFat9FkvoyyYD8M1kK286X3Aro",
    managerFeeAccount: "Dpo148tVGewDPyh2FkGV18gouWctbdX2fHJopJGe9xv1",
    stakePoolProgram: "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy"
};

export const STAKE_POOLS_BY_PROTOCOL: Record<StakingProtocol, { mainnet: StakePoolAddresses; devnet: StakePoolAddresses }> = {
    jito: { mainnet: JITO_MAINNET_POOL, devnet: JITO_DEVNET_POOL },
    blaze: { mainnet: BLAZE_MAINNET_POOL, devnet: BLAZE_DEVNET_POOL }
};
