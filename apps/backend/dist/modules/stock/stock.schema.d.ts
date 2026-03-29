import { z } from 'zod';
export declare const createStockItemSchema: z.ZodObject<{
    id: z.ZodString;
    itemName: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
    lowStockThreshold: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const adjustStockSchema: z.ZodObject<{
    delta: z.ZodNumber;
    reason: z.ZodEnum<{
        restock: "restock";
        sale_adjustment: "sale_adjustment";
        damage: "damage";
        correction: "correction";
    }>;
}, z.core.$strip>;
export declare const updateStockItemSchema: z.ZodObject<{
    itemName: z.ZodOptional<z.ZodString>;
    unitPrice: z.ZodOptional<z.ZodNumber>;
    lowStockThreshold: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const syncStockSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        itemName: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        lowStockThreshold: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const listStockQuerySchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    pageSize: z.ZodPipe<z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>, z.ZodNumber>;
    lowStockOnly: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<boolean, string | undefined>>;
    search: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateStockItemInput = z.infer<typeof createStockItemSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type UpdateStockItemInput = z.infer<typeof updateStockItemSchema>;
export type SyncStockInput = z.infer<typeof syncStockSchema>;
export type ListStockQuery = z.infer<typeof listStockQuerySchema>;
