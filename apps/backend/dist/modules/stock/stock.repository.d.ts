import { Prisma } from '@prisma/client';
import { CreateStockItemInput, ListStockQuery } from './stock.schema';
export declare const stockRepository: {
    upsert(traderId: string, data: CreateStockItemInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemName: string;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        quantity: number;
        unitPrice: Prisma.Decimal;
        lowStockThreshold: number;
    }>;
    bulkUpsert(traderId: string, items: CreateStockItemInput[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemName: string;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        quantity: number;
        unitPrice: Prisma.Decimal;
        lowStockThreshold: number;
    }[]>;
    adjustQuantity(id: string, traderId: string, delta: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemName: string;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        quantity: number;
        unitPrice: Prisma.Decimal;
        lowStockThreshold: number;
    } | null>;
    findMany(traderId: string, query: ListStockQuery): Promise<{
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            itemName: string;
            syncStatus: import(".prisma/client").$Enums.SyncStatus;
            quantity: number;
            unitPrice: Prisma.Decimal;
            lowStockThreshold: number;
        }[];
        nextCursor: string | null;
        hasNextPage: boolean;
    }>;
    getLowStockItems(traderId: string): Promise<{
        id: string;
        itemName: string;
        quantity: number;
        lowStockThreshold: number;
    }[]>;
    findById(id: string, traderId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemName: string;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        quantity: number;
        unitPrice: Prisma.Decimal;
        lowStockThreshold: number;
    } | null>;
    delete(id: string, traderId: string): Promise<Prisma.BatchPayload>;
};
