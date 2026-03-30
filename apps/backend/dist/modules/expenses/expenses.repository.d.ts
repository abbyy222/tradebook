import { Prisma } from '@prisma/client';
import { CreateExpenseInput, ListExpensesQuery } from './expenses.schema';
export declare const expensesRepository: {
    upsert(traderId: string, data: CreateExpenseInput): Promise<{
        id: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        description: string;
        category: import(".prisma/client").$Enums.ExpenseCategory;
        expenseType: import(".prisma/client").$Enums.ExpenseType;
        frequency: import(".prisma/client").$Enums.ExpenseFrequency | null;
        note: string | null;
        spentAt: Date;
        startDate: Date | null;
        endDate: Date | null;
        nextDueDate: Date | null;
    }>;
    bulkUpsert(traderId: string, expenses: CreateExpenseInput[]): Promise<{
        id: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        description: string;
        category: import(".prisma/client").$Enums.ExpenseCategory;
        expenseType: import(".prisma/client").$Enums.ExpenseType;
        frequency: import(".prisma/client").$Enums.ExpenseFrequency | null;
        note: string | null;
        spentAt: Date;
        startDate: Date | null;
        endDate: Date | null;
        nextDueDate: Date | null;
    }[]>;
    findMany(traderId: string, query: ListExpensesQuery): Promise<{
        expenses: {
            id: string;
            createdAt: Date;
            amount: Prisma.Decimal;
            syncStatus: import(".prisma/client").$Enums.SyncStatus;
            description: string;
            category: import(".prisma/client").$Enums.ExpenseCategory;
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            frequency: import(".prisma/client").$Enums.ExpenseFrequency | null;
            note: string | null;
            spentAt: Date;
            startDate: Date | null;
            endDate: Date | null;
            nextDueDate: Date | null;
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
    getTotalForPeriod(traderId: string, from?: Date, to?: Date): Promise<Prisma.GetExpenseAggregateType<{
        where: {
            spentAt?: {
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
        amount: Prisma.Decimal;
        syncStatus: import(".prisma/client").$Enums.SyncStatus;
        description: string;
        category: import(".prisma/client").$Enums.ExpenseCategory;
        expenseType: import(".prisma/client").$Enums.ExpenseType;
        frequency: import(".prisma/client").$Enums.ExpenseFrequency | null;
        note: string | null;
        spentAt: Date;
        startDate: Date | null;
        endDate: Date | null;
        nextDueDate: Date | null;
    } | null>;
    delete(id: string, traderId: string): Promise<Prisma.BatchPayload>;
};
