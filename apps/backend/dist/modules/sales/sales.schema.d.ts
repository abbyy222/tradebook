import { z } from 'zod';
export declare const createSaleSchema: z.ZodObject<{
    id: z.ZodString;
    itemName: z.ZodString;
    stockItemId: z.ZodOptional<z.ZodString>;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
    amount: z.ZodNumber;
    paymentType: z.ZodEnum<{
        CASH: "CASH";
        TRANSFER: "TRANSFER";
        DEBT: "DEBT";
    }>;
    debtorId: z.ZodOptional<z.ZodString>;
    soldAt: z.ZodString;
}, z.core.$strip>;
export declare const syncSalesSchema: z.ZodObject<{
    sales: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        itemName: z.ZodString;
        stockItemId: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        amount: z.ZodNumber;
        paymentType: z.ZodEnum<{
            CASH: "CASH";
            TRANSFER: "TRANSFER";
            DEBT: "DEBT";
        }>;
        debtorId: z.ZodOptional<z.ZodString>;
        soldAt: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const listSalesQuerySchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    pageSize: z.ZodPipe<z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>, z.ZodNumber>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    paymentType: z.ZodOptional<z.ZodEnum<{
        CASH: "CASH";
        TRANSFER: "TRANSFER";
        DEBT: "DEBT";
    }>>;
}, z.core.$strip>;
export declare const profitLossQuerySchema: z.ZodObject<{
    period: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        TODAY: "TODAY";
        THIS_WEEK: "THIS_WEEK";
        THIS_MONTH: "THIS_MONTH";
        THIS_YEAR: "THIS_YEAR";
        ALL_TIME: "ALL_TIME";
    }>>>;
}, z.core.$strip>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SyncSalesInput = z.infer<typeof syncSalesSchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
export type ProfitLossQuery = z.infer<typeof profitLossQuerySchema>;
