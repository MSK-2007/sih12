export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface LocationZone {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  zone: string;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
}
