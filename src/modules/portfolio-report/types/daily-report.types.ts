import { DailyReportChannel } from "../entities/daily-report-setting.entity";
import { Cluster } from "../../../common/cluster/cluster.types";

export interface UpdateDailyReportSettingsParams {
    enabled: boolean;
    channels?: DailyReportChannel[];
    hourUtc?: number;
    minuteUtc?: number;
    network?: Cluster;
}

export interface ApplyLocalScheduleParams {
    enabled: boolean;
    channels?: DailyReportChannel[];
    hour?: number;
    minute?: number;
    network?: Cluster;
}

export interface PortfolioOverview {
    total_balance_usd: number;
    pnl: { total: number; roi_percent: number };
    top_tokens: { name: string; symbol: string; amount: number; value_usd: number; price?: { priceUsd: number } }[];
    allocation: { name: string; symbol: string; percentage: number }[];
}
