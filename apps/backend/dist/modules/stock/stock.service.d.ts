import { CreateStockItemInput, AdjustStockInput, SyncStockInput, ListStockQuery } from './stock.schema';
export declare const stockService: {
    syncItem(traderId: string, input: CreateStockItemInput): Promise<any>;
    syncBatch(traderId: string, input: SyncStockInput): Promise<{
        synced: number;
        items: any[];
    }>;
    adjustStock(id: string, traderId: string, input: AdjustStockInput): Promise<any>;
    listStock(traderId: string, query: ListStockQuery): Promise<{
        data: any[];
        meta: {
            nextCursor: string | null;
            hasNextPage: boolean;
            pageSize: number;
        };
        error: null;
    }>;
    getLowStockAlerts(traderId: string): Promise<{
        unitPrice: number;
        costPrice: number;
        stockValue: number;
        retailValue: number;
        expectedGrossProfit: number;
        isLowStock: boolean;
        id: string;
        itemName: string;
        quantity: number;
        lowStockThreshold: number;
    }[]>;
    getStockItem(id: string, traderId: string): Promise<any>;
    deleteStockItem(id: string, traderId: string): Promise<{
        deleted: boolean;
    }>;
};
