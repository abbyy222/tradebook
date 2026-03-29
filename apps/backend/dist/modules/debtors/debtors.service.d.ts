import { CreateDebtorInput, RecordPaymentInput, ListDebtorsQuery } from './debtors.schema';
export declare const debtorsService: {
    createDebtor(traderId: string, input: CreateDebtorInput): Promise<any>;
    recordPayment(debtorId: string, traderId: string, input: RecordPaymentInput): Promise<any>;
    listDebtors(traderId: string, query: ListDebtorsQuery): Promise<{
        data: any[];
        meta: {
            nextCursor: string | null;
            hasNextPage: boolean;
            pageSize: number;
        };
        error: null;
    }>;
    getPaymentHistory(debtorId: string, traderId: string): Promise<{
        amount: number;
        paidAt: string;
        createdAt: string;
        id: string;
        note: string | null;
    }[]>;
    getDebtor(id: string, traderId: string): Promise<any>;
    deleteDebtor(id: string, traderId: string): Promise<{
        deleted: boolean;
    }>;
};
