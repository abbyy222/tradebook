import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    phoneNumber: z.ZodString;
    name: z.ZodString;
    pin: z.ZodString;
    language: z.ZodDefault<z.ZodEnum<{
        EN: "EN";
        PIDGIN: "PIDGIN";
        IGBO: "IGBO";
        YORUBA: "YORUBA";
        HAUSA: "HAUSA";
    }>>;
    businessName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    phoneNumber: z.ZodString;
    pin: z.ZodString;
}, z.core.$strip>;
export declare const createSalespersonSchema: z.ZodObject<{
    phoneNumber: z.ZodString;
    name: z.ZodString;
    pin: z.ZodString;
    language: z.ZodDefault<z.ZodEnum<{
        EN: "EN";
        PIDGIN: "PIDGIN";
        IGBO: "IGBO";
        YORUBA: "YORUBA";
        HAUSA: "HAUSA";
    }>>;
}, z.core.$strip>;
export declare const updateSalespersonSchema: z.ZodObject<{
    phoneNumber: z.ZodString;
    name: z.ZodString;
    pin: z.ZodOptional<z.ZodString>;
    language: z.ZodDefault<z.ZodEnum<{
        EN: "EN";
        PIDGIN: "PIDGIN";
        IGBO: "IGBO";
        YORUBA: "YORUBA";
        HAUSA: "HAUSA";
    }>>;
}, z.core.$strip>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateSalespersonInput = z.infer<typeof createSalespersonSchema>;
export type UpdateSalespersonInput = z.infer<typeof updateSalespersonSchema>;
