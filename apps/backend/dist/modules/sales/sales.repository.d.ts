import { CreateSaleInput, ListSalesQuery } from './sales.schema';
import { Prisma } from '@prisma/client';
export declare const salesRepository: {
    createWithInventoryEffects(traderId: string, data: CreateSaleInput): Promise<{
        id: string;
        createdAt: Date;
        debtorId: string | null;
        stockItemId: string | null;
        itemName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        amount: Prisma.Decimal;
        paymentType: import(".prisma/client").$Enums.PaymentType;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        soldAt: Date;
    }>;
    create(traderId: string, data: CreateSaleInput): Promise<{
        id: string;
        createdAt: Date;
        debtorId: string | null;
        stockItemId: string | null;
        itemName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        amount: Prisma.Decimal;
        paymentType: import(".prisma/client").$Enums.PaymentType;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        soldAt: Date;
    }>;
    upsert(traderId: string, data: CreateSaleInput): Promise<{
        id: string;
        createdAt: Date;
        debtorId: string | null;
        stockItemId: string | null;
        itemName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        amount: Prisma.Decimal;
        paymentType: import(".prisma/client").$Enums.PaymentType;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        soldAt: Date;
    }>;
    bulkUpsert(traderId: string, sales: CreateSaleInput[]): Promise<{
        id: string;
        createdAt: Date;
        debtorId: string | null;
        stockItemId: string | null;
        itemName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        amount: Prisma.Decimal;
        paymentType: import(".prisma/client").$Enums.PaymentType;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        soldAt: Date;
    }[]>;
    findExistingIds(traderId: string, ids: string[]): Promise<Set<string>>;
    findMany(traderId: string, query: ListSalesQuery): Promise<{
        sales: {
            id: string;
            createdAt: Date;
            debtorId: string | null;
            stockItemId: string | null;
            itemName: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
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
    getTotalsForPeriod(traderId: string, from?: Date, to?: Date): Promise<Prisma.GetSaleAggregateType<{
        where: {
            soldAt?: {
                lte?: Date | undefined;
                gte?: Date | undefined;
            } | undefined;
            traderId: string;
        };
        _sum: {
            amount: true;
        };
        _count: {
            id: true;
        };
    }>>;
    findById(id: string, traderId: string): Promise<{
        id: string;
        createdAt: Date;
        debtorId: string | null;
        stockItemId: string | null;
        itemName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        amount: Prisma.Decimal;
        paymentType: import(".prisma/client").$Enums.PaymentType;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        soldAt: Date;
    } | null>;
    delete(id: string, traderId: string): Promise<Prisma.BatchPayload>;
};
