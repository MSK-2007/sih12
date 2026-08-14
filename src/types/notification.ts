export type NotificationType = 
  | 'CRITICAL_INCIDENT'
  | 'RESOURCE_ASSIGNED'
  | 'RESOURCE_REASSIGNED'
  | 'ALLOCATION_RECOMMENDATION'
  | 'ALLOCATION_REJECTED'
  | 'INCIDENT_RESOLVED'
  | 'RESOURCE_OFFLINE';

export interface AppNotification {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  incidentId?: string;
  resourceId?: string;
  isRead: boolean;
  createdAt: string;
}
