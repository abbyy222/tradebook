import { CreateSalespersonInput, RegisterInput } from './auth.schema';
export declare const authRepository: {
    findByPhone(phoneNumber: string): Promise<{
        phoneNumber: string;
        name: string;
        language: import(".prisma/client").$Enums.Language;
        businessName: string | null;
        id: string;
        pinHash: string;
        role: import(".prisma/client").$Enums.TraderRole;
        ownerTraderId: string | null;
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
        role: import(".prisma/client").$Enums.TraderRole;
        ownerTraderId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findById(id: string): Promise<{
        phoneNumber: string;
        name: string;
        language: import(".prisma/client").$Enums.Language;
        businessName: string | null;
        id: string;
        pinHash: string;
        role: import(".prisma/client").$Enums.TraderRole;
        ownerTraderId: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    createSalesperson(ownerTraderId: string, data: CreateSalespersonInput & {
        pinHash: string;
    }): Promise<{
        phoneNumber: string;
        name: string;
        language: import(".prisma/client").$Enums.Language;
        businessName: string | null;
        id: string;
        pinHash: string;
        role: import(".prisma/client").$Enums.TraderRole;
        ownerTraderId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listSalespeople(ownerTraderId: string): Promise<{
        phoneNumber: string;
        name: string;
        language: import(".prisma/client").$Enums.Language;
        businessName: string | null;
        id: string;
        pinHash: string;
        role: import(".prisma/client").$Enums.TraderRole;
        ownerTraderId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
};
