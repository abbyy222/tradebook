import { RegisterInput, LoginInput } from './auth.schema';
interface TraderDTO {
    id: string;
    phoneNumber: string;
    name: string;
    businessName?: string;
    language: string;
    createdAt: string;
}
interface AuthResponseDTO {
    token: string;
    trader: TraderDTO;
}
export declare const authService: {
    register(input: RegisterInput): Promise<AuthResponseDTO>;
    login(input: LoginInput): Promise<AuthResponseDTO>;
};
export {};
