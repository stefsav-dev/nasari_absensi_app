export interface User {
    id: number;
    email: string;
    nama_lengkap: string;
    role: "ADMIN"|"USER";
    photo?: string | null;
}

export interface LoginInput {
    email: string,
    password: string,
}

export interface RegisterInput {
    email: string;
    password: string;
    nama_lengkap: string;
    photo?: string;
}

export interface Tokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    user: User;
    tokens: Tokens;
}