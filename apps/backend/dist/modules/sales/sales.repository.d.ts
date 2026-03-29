import { CreateSaleInput, ListSalesQuery } from './sales.schema';
import { Prisma } from '@prisma/client';
export declare const salesRepository: {
    upsert(traderId: string, data: CreateSaleInput): Promise<{
        id: string;
        createdAt: Date;
        debtorId: string | null;
        itemName: string;
        amount: Prisma.Decimal;
        paymentType: import(".prisma/client").$Enums.PaymentType;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        soldAt: Date;
    }>;
    bulkUpsert(traderId: string, sales: CreateSaleInput[]): Promise<{
        id: string;
        createdAt: Date;
        debtorId: string | null;
        itemName: string;
        amount: Prisma.Decimal;
        paymentType: import(".prisma/client").$Enums.PaymentType;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        soldAt: Date;
    }[]>;
    findMany(traderId: string, query: ListSalesQuery): Promise<{
        sales: {
            id: string;
            createdAt: Date;
            debtorId: string | null;
            itemName: string;
            amount: Prisma.Decimal;
            paymentType: import(".prisma/client").$Enums.PaymentType;
            syncStatus: import(".prisma/client").$Enums.SyncStatus;
            soldAt: Date;
        }[];
        nextCursor: string | null;
        hasNextPage: boolean;
    }>;
    getDashboardStats(traderId: string): Promise<{
        today: {
            total: Prisma.Decimal;
            count: number;
        };
        thisWeek: {
            total: Prisma.Decimal;
            count: number;
        };
        allTime: {
            total: Prisma.Decimal;
            count: number;
        };
    }>;
    findById(id: string, traderId: string): Promise<{
        id: string;
        createdAt: Date;
        debtorId: string | null;
        itemName: string;
        amount: Prisma.Decimal;
        paymentType: import(".prisma/client").$Enums.PaymentType;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        soldAt: Date;
    } | null>;
    delete(id: string, traderId: string): Promise<Prisma.BatchPayload>;
};
