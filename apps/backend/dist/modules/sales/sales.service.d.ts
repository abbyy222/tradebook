import { CreateSaleInput, ListSalesQuery, ProfitLossQuery, SyncSalesInput } from './sales.schema';
export declare const salesService: {
    syncSale(traderId: string, input: CreateSaleInput): Promise<any>;
    syncBatch(traderId: string, input: SyncSalesInput): Promise<{
        synced: number;
        sales: any[];
    }>;
    listSales(traderId: string, query: ListSalesQuery): Promise<{
        data: any[];
        meta: {
            nextCursor: string | null;
            hasNextPage: boolean;
            pageSize: number;
        };
        error: null;
    }>;
    getDashboardStats(traderId: string): Promise<{
        today: {
            total: number;
            count: number;
        };
        thisWeek: {
            total: number;
            count: number;
        };
        allTime: {
            total: number;
            count: number;
        };
    }>;
    getProfitLossSummary(traderId: string, query: ProfitLossQuery): Promise<{
        period: "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_YEAR" | "ALL_TIME";
        revenue: number;
        expenseTotal: number;
        operatingProfit: number;
        inventoryValue: number;
        retailValue: number;
        expectedMarginOnHand: number;
        receivablesTotal: number;
        salesCount: number;
        expenseCount: number;
        unitsOnHand: number;
        activeDebtorsCount: number;
    }>;
    getSale(id: string, traderId: string): Promise<any>;
    deleteSale(id: string, traderId: string): Promise<{
        deleted: boolean;
    }>;
};
