import { AppNotification } from '../types/notifications';
import { NotificationRuleOutput } from './notificationRules';

export class NotificationEngine {
  private deduplicationCache = new Set<string>();

  /**
   * Generates a strongly typed AppNotification model if rule condition passes and deduplication check succeeds.
   */
  public processRuleOutput(output: NotificationRuleOutput): AppNotification | null {
    if (!output.shouldNotify || !output.deduplicationKey) return null;

    // Deduplication check: prevent duplicate notifications for the exact same event key
    if (this.deduplicationCache.has(output.deduplicationKey)) {
      return null;
    }

    // Add to deduplication cache
    this.deduplicationCache.add(output.deduplicationKey);

    const nowISO = new Date().toISOString();
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return {
      id,
      incidentId: output.incidentId,
      resourceId: output.resourceId,
      reallocationEventId: output.reallocationEventId,
      type: output.type,
      severity: output.severity,
      title: output.title,
      message: output.message,
      actionUrl: output.actionUrl,
      actionLabel: output.actionLabel,
      state: 'UNREAD',
      deduplicationKey: output.deduplicationKey,
      createdAt: nowISO,
    };
  }

  /**
   * Clears deduplication cache (useful for testing or session reset).
   */
  public clearCache() {
    this.deduplicationCache.clear();
  }
}

export const notificationEngine = new NotificationEngine();
