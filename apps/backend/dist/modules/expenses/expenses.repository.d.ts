import { Prisma } from '@prisma/client';
import { CreateExpenseInput, ListExpensesQuery } from './expenses.schema';
export declare const expensesRepository: {
    upsert(traderId: string, data: CreateExpenseInput): Promise<{
        id: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        description: string;
        category: string;
        spentAt: Date;
    }>;
    bulkUpsert(traderId: string, expenses: CreateExpenseInput[]): Promise<{
        id: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        description: string;
        category: string;
        spentAt: Date;
    }[]>;
    findMany(traderId: string, query: ListExpensesQuery): Promise<{
        expenses: {
            id: string;
            createdAt: Date;
            amount: Prisma.Decimal;
            syncStatus: import(".prisma/client").$Enums.SyncStatus;
            description: string;
            category: string;
            spentAt: Date;
        }[];
        nextCursor: string | null;
        hasNextPage: boolean;
    }>;
    getCategoryBreakdown(traderId: string, from: Date, to: Date): Promise<(Prisma.PickEnumerable<Prisma.ExpenseGroupByOutputType, "category"[]> & {
        _count: {
            id: number;
        };
        _sum: {
            amount: Prisma.Decimal | null;
        };
    })[]>;
    getTotalForPeriod(traderId: string, from: Date, to: Date): Promise<Prisma.GetExpenseAggregateType<{
        where: {
            traderId: string;
            spentAt: {
                gte: Date;
                lte: Date;
            };
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
        amount: Prisma.Decimal;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        description: string;
        category: string;
        spentAt: Date;
    } | null>;
    delete(id: string, traderId: string): Promise<Prisma.BatchPayload>;
};
