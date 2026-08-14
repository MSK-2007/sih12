export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';

export type NotificationType =
  | 'NEW_INCIDENT'
  | 'CRITICAL_INCIDENT'
  | 'HIGH_PRIORITY_INCIDENT'
  | 'NO_RESOURCE_AVAILABLE'
  | 'PARTIAL_RESOURCE_AVAILABILITY'
  | 'REALLOCATION_REQUIRED'
  | 'RESOURCE_OFFLINE'
  | 'RESOURCE_FAILURE'
  | 'INCIDENT_ESCALATED'
  | 'INCIDENT_WAITING'
  | 'RESOURCE_AVAILABLE'
  | 'ASSIGNMENT_CHANGED'
  | 'DISPATCH_CONFIRMED'
  | 'INCIDENT_RESOLVED'
  | 'SYSTEM_WARNING'
  | 'SYSTEM_ERROR';

export type NotificationState = 'UNREAD' | 'READ' | 'ACKNOWLEDGED' | 'DISMISSED';

export interface AppNotification {
  id: string;
  userId?: string;
  incidentId?: string;
  resourceId?: string;
  reallocationEventId?: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  state: NotificationState;
  deduplicationKey: string;
  createdAt: string;
  expiresAt?: string;
  acknowledgedAt?: string;
}

export interface NotificationFilters {
  searchQuery?: string;
  severity?: NotificationSeverity | 'ALL';
  type?: NotificationType | 'ALL';
  state?: NotificationState | 'ALL' | 'UNREAD_ONLY';
  incidentId?: string;
  resourceId?: string;
}

export interface OperatorNotificationPreferences {
  criticalAlerts: boolean;
  warningAlerts: boolean;
  infoAlerts: boolean;
  toastEnabled: boolean;
  soundEnabled: boolean; // default false
}

export const DEFAULT_NOTIFICATION_PREFERENCES: OperatorNotificationPreferences = {
  criticalAlerts: true,
  warningAlerts: true,
  infoAlerts: true,
  toastEnabled: true,
  soundEnabled: false,
};
