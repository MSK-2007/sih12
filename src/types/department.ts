export type DepartmentType = 'POLICE' | 'FIRE' | 'MEDICAL' | 'DISASTER_MANAGEMENT' | 'MUNICIPAL' | 'OTHER';

export interface Department {
  id: string;
  name: string;
  departmentType: DepartmentType;
  contactNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
