export interface AuthResponse {
  status: number;
  message: string;
  data?: any;
  total_count?: number;
}

export interface UserInterface {
  id: number;
  name: string;
  surname: string;
  login_token?: string;
  phone_number?: string;
  phone_code?: string;
  email: string;
  role: number;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface userAuthenticationData {
  id?: number;
  name?: string;
  surname?: string;
  email?: string;
  role?: number;
  phone_number?: string;
  phone_code?: string;
  data?: string;
}