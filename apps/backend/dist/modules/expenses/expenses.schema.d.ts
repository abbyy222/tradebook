import { z } from 'zod';
export declare const EXPENSE_CATEGORIES: readonly ["RESTOCK", "TRANSPORT", "MARKET_FEES", "PACKAGING", "EQUIPMENT", "FOOD", "RENT", "ELECTRICITY", "WATER", "SALARY", "LEVY", "REPAIRS", "UTILITIES", "OTHER"];
export declare const EXPENSE_TYPES: readonly ["ONE_TIME", "RECURRING"];
export declare const EXPENSE_FREQUENCIES: readonly ["DAILY", "MONTHLY", "YEARLY"];
export declare const createExpenseSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    amount: z.ZodNumber;
    category: z.ZodPipe<z.ZodTransform<"RESTOCK" | "TRANSPORT" | "MARKET_FEES" | "PACKAGING" | "EQUIPMENT" | "FOOD" | "RENT" | "ELECTRICITY" | "WATER" | "SALARY" | "LEVY" | "REPAIRS" | "UTILITIES" | "OTHER", unknown>, z.ZodEnum<{
        RESTOCK: "RESTOCK";
        TRANSPORT: "TRANSPORT";
        MARKET_FEES: "MARKET_FEES";
        PACKAGING: "PACKAGING";
        EQUIPMENT: "EQUIPMENT";
        FOOD: "FOOD";
        RENT: "RENT";
        ELECTRICITY: "ELECTRICITY";
        WATER: "WATER";
        SALARY: "SALARY";
        LEVY: "LEVY";
        REPAIRS: "REPAIRS";
        UTILITIES: "UTILITIES";
        OTHER: "OTHER";
    }>>;
    expenseType: z.ZodDefault<z.ZodPipe<z.ZodTransform<"ONE_TIME" | "RECURRING", unknown>, z.ZodEnum<{
        ONE_TIME: "ONE_TIME";
        RECURRING: "RECURRING";
    }>>>;
    frequency: z.ZodPipe<z.ZodTransform<string | undefined, unknown>, z.ZodOptional<z.ZodEnum<{
        DAILY: "DAILY";
        MONTHLY: "MONTHLY";
        YEARLY: "YEARLY";
    }>>>;
    note: z.ZodOptional<z.ZodString>;
    spentAt: z.ZodPipe<z.ZodTransform<string | undefined, unknown>, z.ZodString>;
    startDate: z.ZodPipe<z.ZodTransform<string | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    endDate: z.ZodPipe<z.ZodTransform<string | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    nextDueDate: z.ZodPipe<z.ZodTransform<string | undefined, unknown>, z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const syncExpensesSchema: z.ZodObject<{
    expenses: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        amount: z.ZodNumber;
        category: z.ZodPipe<z.ZodTransform<"RESTOCK" | "TRANSPORT" | "MARKET_FEES" | "PACKAGING" | "EQUIPMENT" | "FOOD" | "RENT" | "ELECTRICITY" | "WATER" | "SALARY" | "LEVY" | "REPAIRS" | "UTILITIES" | "OTHER", unknown>, z.ZodEnum<{
            RESTOCK: "RESTOCK";
            TRANSPORT: "TRANSPORT";
            MARKET_FEES: "MARKET_FEES";
            PACKAGING: "PACKAGING";
            EQUIPMENT: "EQUIPMENT";
            FOOD: "FOOD";
            RENT: "RENT";
            ELECTRICITY: "ELECTRICITY";
            WATER: "WATER";
            SALARY: "SALARY";
            LEVY: "LEVY";
            REPAIRS: "REPAIRS";
            UTILITIES: "UTILITIES";
            OTHER: "OTHER";
        }>>;
        expenseType: z.ZodDefault<z.ZodPipe<z.ZodTransform<"ONE_TIME" | "RECURRING", unknown>, z.ZodEnum<{
            ONE_TIME: "ONE_TIME";
            RECURRING: "RECURRING";
        }>>>;
        frequency: z.ZodPipe<z.ZodTransform<string | undefined, unknown>, z.ZodOptional<z.ZodEnum<{
            DAILY: "DAILY";
            MONTHLY: "MONTHLY";
            YEARLY: "YEARLY";
        }>>>;
        note: z.ZodOptional<z.ZodString>;
        spentAt: z.ZodPipe<z.ZodTransform<string | undefined, unknown>, z.ZodString>;
        startDate: z.ZodPipe<z.ZodTransform<string | undefined, unknown>, z.ZodOptional<z.ZodString>>;
        endDate: z.ZodPipe<z.ZodTransform<string | undefined, unknown>, z.ZodOptional<z.ZodString>>;
        nextDueDate: z.ZodPipe<z.ZodTransform<string | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const listExpensesQuerySchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    pageSize: z.ZodPipe<z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>, z.ZodNumber>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    category: z.ZodPipe<z.ZodTransform<"RESTOCK" | "TRANSPORT" | "MARKET_FEES" | "PACKAGING" | "EQUIPMENT" | "FOOD" | "RENT" | "ELECTRICITY" | "WATER" | "SALARY" | "LEVY" | "REPAIRS" | "UTILITIES" | "OTHER" | undefined, unknown>, z.ZodOptional<z.ZodEnum<{
        RESTOCK: "RESTOCK";
        TRANSPORT: "TRANSPORT";
        MARKET_FEES: "MARKET_FEES";
        PACKAGING: "PACKAGING";
        EQUIPMENT: "EQUIPMENT";
        FOOD: "FOOD";
        RENT: "RENT";
        ELECTRICITY: "ELECTRICITY";
        WATER: "WATER";
        SALARY: "SALARY";
        LEVY: "LEVY";
        REPAIRS: "REPAIRS";
        UTILITIES: "UTILITIES";
        OTHER: "OTHER";
    }>>>;
    expenseType: z.ZodPipe<z.ZodTransform<"ONE_TIME" | "RECURRING" | undefined, unknown>, z.ZodOptional<z.ZodEnum<{
        ONE_TIME: "ONE_TIME";
        RECURRING: "RECURRING";
    }>>>;
    frequency: z.ZodPipe<z.ZodTransform<string | undefined, unknown>, z.ZodOptional<z.ZodEnum<{
        DAILY: "DAILY";
        MONTHLY: "MONTHLY";
        YEARLY: "YEARLY";
    }>>>;
}, z.core.$strip>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type SyncExpensesInput = z.infer<typeof syncExpensesSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
