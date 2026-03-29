import { z } from 'zod';
export declare const EXPENSE_CATEGORIES: readonly ["restock", "transport", "market_fees", "packaging", "equipment", "food", "other"];
export declare const createExpenseSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    amount: z.ZodNumber;
    category: z.ZodEnum<{
        other: "other";
        restock: "restock";
        transport: "transport";
        market_fees: "market_fees";
        packaging: "packaging";
        equipment: "equipment";
        food: "food";
    }>;
    spentAt: z.ZodString;
}, z.core.$strip>;
export declare const syncExpensesSchema: z.ZodObject<{
    expenses: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        amount: z.ZodNumber;
        category: z.ZodEnum<{
            other: "other";
            restock: "restock";
            transport: "transport";
            market_fees: "market_fees";
            packaging: "packaging";
            equipment: "equipment";
            food: "food";
        }>;
        spentAt: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const listExpensesQuerySchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    pageSize: z.ZodPipe<z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>, z.ZodNumber>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<{
        other: "other";
        restock: "restock";
        transport: "transport";
        market_fees: "market_fees";
        packaging: "packaging";
        equipment: "equipment";
        food: "food";
    }>>;
}, z.core.$strip>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type SyncExpensesInput = z.infer<typeof syncExpensesSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
