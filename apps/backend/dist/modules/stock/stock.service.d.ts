import { CreateStockItemInput, AdjustStockInput, SyncStockInput, ListStockQuery } from './stock.schema';
export declare const stockService: {
    syncItem(traderId: string, actorId: string, input: CreateStockItemInput): Promise<any>;
    syncBatch(traderId: string, actorId: string, input: SyncStockInput): Promise<{
        synced: number;
        items: any[];
    }>;
    adjustStock(id: string, traderId: string, actorId: string, input: AdjustStockInput): Promise<any>;
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
        wholesalePrice: number | null;
        stockValue: number;
        retailValue: number;
        expectedGrossProfit: number;
        isLowStock: boolean;
        id: string;
        itemName: string;
        quantity: number;
        unitName: string;
        lowStockThreshold: number;
        wholesaleMinQty: number | null;
    }[]>;
    getStockItem(id: string, traderId: string): Promise<any>;
    getStockMovements(id: string, traderId: string): Promise<any>;
    deleteStockItem(id: string, traderId: string): Promise<{
        deleted: boolean;
    }>;
};
