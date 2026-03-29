import { CreateSaleInput, SyncSalesInput, ListSalesQuery } from './sales.schema';
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
    getSale(id: string, traderId: string): Promise<any>;
    deleteSale(id: string, traderId: string): Promise<{
        deleted: boolean;
    }>;
};
