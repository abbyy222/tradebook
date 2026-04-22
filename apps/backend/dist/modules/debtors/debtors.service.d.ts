import { CreateDebtorInput, RecordPaymentInput, ListDebtorsQuery, UpdateDebtorScheduleInput } from './debtors.schema';
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
    getStatement(debtorId: string, traderId: string): Promise<{
        debtor: any;
        generatedAt: string;
        entries: ({
            balanceAfter: number;
            id: string;
            type: "SALE";
            amount: number;
            date: string;
            reference: string;
            note: string;
        } | {
            balanceAfter: number;
            id: string;
            type: "PAYMENT";
            amount: number;
            date: string;
            note: string | undefined;
        })[];
        totals: {
            totalSalesOnCredit: number;
            totalPayments: number;
            balance: number;
        };
    }>;
    getDebtor(id: string, traderId: string): Promise<any>;
    updateDebtorSchedule(debtorId: string, traderId: string, input: UpdateDebtorScheduleInput): Promise<any>;
    deleteDebtor(id: string, traderId: string): Promise<{
        deleted: boolean;
    }>;
};
