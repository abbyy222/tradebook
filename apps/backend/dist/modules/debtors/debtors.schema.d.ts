import { z } from 'zod';
export declare const createDebtorSchema: z.ZodObject<{
    id: z.ZodString;
    customerName: z.ZodString;
    phoneNumber: z.ZodOptional<z.ZodString>;
    totalOwed: z.ZodNumber;
    dueDate: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const recordPaymentSchema: z.ZodObject<{
    amount: z.ZodNumber;
    paidAt: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const listDebtorsQuerySchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    pageSize: z.ZodPipe<z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>, z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        PARTIAL: "PARTIAL";
        CLEARED: "CLEARED";
    }>>;
}, z.core.$strip>;
export type CreateDebtorInput = z.infer<typeof createDebtorSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type ListDebtorsQuery = z.infer<typeof listDebtorsQuerySchema>;
