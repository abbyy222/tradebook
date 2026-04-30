import { CloseDayInput, CreateSaleInput, ListSalesQuery, ProfitLossQuery, SyncSalesInput } from './sales.schema';
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
    getDayCloseSummary(traderId: string): Promise<{
        period: {
            label: string;
            from: string;
            to: string;
        };
        sales: {
            total: number;
            count: number;
            cashTotal: number;
            transferTotal: number;
            debtTotal: number;
        };
        expenses: {
            total: number;
            count: number;
        };
        collections: {
            total: number;
            count: number;
        };
        savings: {
            total: number;
            count: number;
            reconciledCount: number;
            verifiedCount: number;
        };
        net: {
            operatingBalance: number;
            eligibleSalesAfterExpenses: number;
            stillAvailableToSave: number;
        };
        closure: {
            isClosed: boolean;
            closedAt: string | null;
            note: string | null;
            closedByTraderId: string | null;
        };
    }>;
    closeBusinessDay(traderId: string, actorId: string, role: "OWNER" | "SALESPERSON", input: CloseDayInput): Promise<{
        period: {
            label: string;
            from: string;
            to: string;
        };
        sales: {
            total: number;
            count: number;
            cashTotal: number;
            transferTotal: number;
            debtTotal: number;
        };
        expenses: {
            total: number;
            count: number;
        };
        collections: {
            total: number;
            count: number;
        };
        savings: {
            total: number;
            count: number;
            reconciledCount: number;
            verifiedCount: number;
        };
        net: {
            operatingBalance: number;
            eligibleSalesAfterExpenses: number;
            stillAvailableToSave: number;
        };
        closure: {
            isClosed: boolean;
            closedAt: string | null;
            note: string | null;
            closedByTraderId: string | null;
        };
    }>;
    getSale(id: string, traderId: string): Promise<any>;
    deleteSale(id: string, traderId: string): Promise<{
        deleted: boolean;
    }>;
};
