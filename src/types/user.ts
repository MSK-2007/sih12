export type UserRole = 'ADMIN' | 'CONTROL_ROOM_OPERATOR' | 'RESOURCE_OFFICER' | 'VIEWER';

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
