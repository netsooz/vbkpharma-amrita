export type ModulePermission =
  | 'master_data'
  | 'transactions'
  | 'boms'
  | 'manufacturing'
  | 'ebpr'
  | 'reports'
  | 'user_management';

export interface AppUser {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: string;
  permissions: ModulePermission[];
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AppUser;
}

export interface AccessControlMetadata {
  permissions: ModulePermission[];
  role_templates: Record<string, ModulePermission[]>;
}