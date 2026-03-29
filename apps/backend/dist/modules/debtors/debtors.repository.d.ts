import { Prisma } from '@prisma/client';
import { CreateDebtorInput, RecordPaymentInput, ListDebtorsQuery } from './debtors.schema';
export declare const debtorsRepository: {
    upsert(traderId: string, data: CreateDebtorInput): Promise<{
        status: import(".prisma/client").$Enums.DebtStatus;
        phoneNumber: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerName: string;
        totalOwed: Prisma.Decimal;
        totalPaid: Prisma.Decimal;
        dueDate: Date | null;
    }>;
    incrementOwed(debtorId: string, amount: number): Promise<{
        status: import(".prisma/client").$Enums.DebtStatus;
        phoneNumber: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        traderId: string;
        customerName: string;
        totalOwed: Prisma.Decimal;
        totalPaid: Prisma.Decimal;
        dueDate: Date | null;
    }>;
    recordPayment(debtorId: string, traderId: string, input: RecordPaymentInput): Promise<{
        status: import(".prisma/client").$Enums.DebtStatus;
        phoneNumber: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerName: string;
        totalOwed: Prisma.Decimal;
        totalPaid: Prisma.Decimal;
        dueDate: Date | null;
    }>;
    findMany(traderId: string, query: ListDebtorsQuery): Promise<{
        debtors: {
            status: import(".prisma/client").$Enums.DebtStatus;
            phoneNumber: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            customerName: string;
            totalOwed: Prisma.Decimal;
            totalPaid: Prisma.Decimal;
            dueDate: Date | null;
        }[];
        nextCursor: string | null;
        hasNextPage: boolean;
    }>;
    getPaymentHistory(debtorId: string, traderId: string): Promise<{
        id: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        paidAt: Date;
        note: string | null;
    }[] | null>;
    findById(id: string, traderId: string): Promise<{
        status: import(".prisma/client").$Enums.DebtStatus;
        phoneNumber: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerName: string;
        totalOwed: Prisma.Decimal;
        totalPaid: Prisma.Decimal;
        dueDate: Date | null;
    } | null>;
    delete(id: string, traderId: string): Promise<Prisma.BatchPayload>;
};
