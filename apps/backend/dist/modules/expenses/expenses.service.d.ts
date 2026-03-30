import { CreateExpenseInput, ListExpensesQuery, SyncExpensesInput } from './expenses.schema';
export declare const expensesService: {
    syncExpense(traderId: string, input: CreateExpenseInput): Promise<any>;
    syncBatch(traderId: string, input: SyncExpensesInput): Promise<{
        synced: number;
        expenses: any[];
    }>;
    listExpenses(traderId: string, query: ListExpensesQuery): Promise<{
        data: any[];
        meta: {
            nextCursor: string | null;
            hasNextPage: boolean;
            pageSize: number;
        };
        error: null;
    }>;
    getCategoryBreakdown(traderId: string, from: Date, to: Date): Promise<{
        category: import(".prisma/client").$Enums.ExpenseCategory;
        total: number;
        count: number;
        percentage: number;
    }[]>;
    getExpense(id: string, traderId: string): Promise<any>;
    deleteExpense(id: string, traderId: string): Promise<{
        deleted: boolean;
    }>;
};
