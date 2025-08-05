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
  about: string;
  trainee: boolean;
  theme_color: string; // Added theme_color field
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  qualifications?: string;
  date_of_birth?: string;
  address?: string;
  gender?: number;
  learning_difficulties?: boolean;
  off_the_job_training?: number;
  entitlement_date?: string;
  start_date?: string;
  expected_end_date?: string;
  employer?: string;
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
