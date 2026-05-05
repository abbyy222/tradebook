import { Prisma } from '@prisma/client';
import { CreateStockItemInput, ListStockQuery, AdjustStockInput } from './stock.schema';
export declare const stockRepository: {
    upsert(traderId: string, data: CreateStockItemInput, actor: {
        actorTraderId: string;
        actorTraderName: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        unitName: string;
        costPrice: Prisma.Decimal;
        wholesalePrice: Prisma.Decimal | null;
        wholesaleMinQty: number | null;
        lowStockThreshold: number;
    }>;
    bulkUpsert(traderId: string, items: CreateStockItemInput[], _actor: {
        actorTraderId: string;
        actorTraderName: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        unitName: string;
        costPrice: Prisma.Decimal;
        wholesalePrice: Prisma.Decimal | null;
        wholesaleMinQty: number | null;
        lowStockThreshold: number;
    }[]>;
    adjustQuantity(id: string, traderId: string, input: AdjustStockInput, actor: {
        actorTraderId: string;
        actorTraderName: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        unitName: string;
        costPrice: Prisma.Decimal;
        wholesalePrice: Prisma.Decimal | null;
        wholesaleMinQty: number | null;
        lowStockThreshold: number;
    } | null>;
    findMany(traderId: string, query: ListStockQuery): Promise<{
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            itemName: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
            syncStatus: import(".prisma/client").$Enums.SyncStatus;
            unitName: string;
            costPrice: Prisma.Decimal;
            wholesalePrice: Prisma.Decimal | null;
            wholesaleMinQty: number | null;
            lowStockThreshold: number;
        }[];
        nextCursor: string | null;
        hasNextPage: boolean;
    }>;
    getLowStockItems(traderId: string): Promise<{
        id: string;
        itemName: string;
        quantity: number;
        unitName: string;
        lowStockThreshold: number;
        unitPrice: Prisma.Decimal;
        costPrice: Prisma.Decimal;
        wholesalePrice: Prisma.Decimal | null;
        wholesaleMinQty: number | null;
    }[]>;
    getInventorySummary(traderId: string): Promise<{
        inventoryValue: number;
        retailValue: number;
        expectedMarginOnHand: number;
        unitsOnHand: number;
    }>;
    findById(id: string, traderId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        unitName: string;
        costPrice: Prisma.Decimal;
        wholesalePrice: Prisma.Decimal | null;
        wholesaleMinQty: number | null;
        lowStockThreshold: number;
    } | null>;
    delete(id: string, traderId: string): Promise<Prisma.BatchPayload>;
    findMovements(stockItemId: string, traderId: string, limit?: number): Promise<any>;
};
