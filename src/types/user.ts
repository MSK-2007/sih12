import type { UserRole } from '../security/rbac';

export type { UserRole };

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}
