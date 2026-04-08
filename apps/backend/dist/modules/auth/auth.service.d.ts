import { RegisterInput, LoginInput, CreateSalespersonInput } from './auth.schema';
interface TraderDTO {
    id: string;
    phoneNumber: string;
    name: string;
    businessName?: string;
    role: 'OWNER' | 'SALESPERSON';
    language: string;
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
    login(input: LoginInput): Promise<AuthResponseDTO>;
};
export {};
