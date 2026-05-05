import { RegisterInput, LoginInput, CreateSalespersonInput, UpdateSalespersonInput } from './auth.schema';
interface TraderDTO {
    id: string;
    phoneNumber: string;
    name: string;
    businessName?: string;
    role: 'OWNER' | 'SALESPERSON';
    language: string;
    isActive: boolean;
    createdAt: string;
}
interface AuthResponseDTO {
    token: string;
    trader: TraderDTO;
}
export declare const authService: {
    register(input: RegisterInput): Promise<AuthResponseDTO>;
    createSalesperson(ownerTraderId: string, input: CreateSalespersonInput): Promise<TraderDTO>;
    listSalespeople(ownerTraderId: string): Promise<TraderDTO[]>;
    updateSalesperson(ownerTraderId: string, salespersonId: string, input: UpdateSalespersonInput): Promise<TraderDTO>;
    deactivateSalesperson(ownerTraderId: string, salespersonId: string): Promise<{
        removed: boolean;
    }>;
    login(input: LoginInput): Promise<AuthResponseDTO>;
};
export {};
