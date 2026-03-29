import { RegisterInput } from './auth.schema';
export declare const authRepository: {
    findByPhone(phoneNumber: string): Promise<{
        phoneNumber: string;
        name: string;
        language: import(".prisma/client").$Enums.Language;
        businessName: string | null;
        id: string;
        pinHash: string;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    create(data: RegisterInput & {
        pinHash: string;
    }): Promise<{
        phoneNumber: string;
        name: string;
        language: import(".prisma/client").$Enums.Language;
        businessName: string | null;
        id: string;
        pinHash: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
};
