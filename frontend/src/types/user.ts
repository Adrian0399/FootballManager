export type UserRole =
  | 'ADMIN'
  | 'REFEREE'
  | 'TECHNICAL_DIRECTOR'
  | 'ASSISTANT'
  | 'PLAYER';

export const USER_ROLES: UserRole[] = [
  'PLAYER',
  'ASSISTANT',
  'TECHNICAL_DIRECTOR',
  'REFEREE',
  'ADMIN',
];

export interface User {
  id: string;
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  birthDate: string;
  age: number;
  role: UserRole;
  nickname: string | null;
  phoneNumber: string;
  email: string;
  curp: string;
  isActive: boolean;
  profilePhotoUrl: string | null;
  coverPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ----- Standard API envelope (must match backend) -----

export interface SuccessEnvelope<T> {
  success: true;
  statusCode: number;
  data: T;
}

export interface ErrorEnvelope {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    issues?: Array<{ path: string; message: string }>;
  };
}

export type ApiResponse<T> = SuccessEnvelope<T> | ErrorEnvelope;

// ----- Domain response aliases -----

export type AuthPayload = {
  user: User;
  accessToken: string;
};

export type AuthResponse = ApiResponse<AuthPayload>;

export type UserResponse = ApiResponse<User>;

export type LogoutResponse = ApiResponse<{ loggedOut: boolean }>;