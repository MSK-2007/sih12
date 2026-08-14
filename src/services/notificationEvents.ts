import { Incident } from '../types/incident';
import { Resource } from '../types/resource';
import { ReallocationRecommendation } from '../engines/reallocationEngine';
import { notificationRules } from '../engines/notificationRules';
import { notificationEngine } from '../engines/notificationEngine';
import { createNotification } from './notifications';
import { AppNotification } from '../types/notifications';

/**
 * Central event processing logic evaluating operational events against notification rules.
 */

export async function handleIncidentCreated(incident: Incident): Promise<AppNotification | null> {
  const ruleOutput = notificationRules.evaluateIncidentCreated(incident);
  const notif = notificationEngine.processRuleOutput(ruleOutput);
  if (notif) {
    return await createNotification(notif);
  }
  return null;
}

export async function handleIncidentPriorityEscalated(
  incident: Incident,
  oldPriority: string,
  newPriority: string
): Promise<AppNotification | null> {
  const ruleOutput = notificationRules.evaluatePriorityEscalated(incident, oldPriority, newPriority);
  const notif = notificationEngine.processRuleOutput(ruleOutput);
  if (notif) {
    return await createNotification(notif);
  }
  return null;
}

export async function handleNoResourceAvailable(incident: Incident): Promise<AppNotification | null> {
  const ruleOutput = notificationRules.evaluateNoResourceAvailable(incident);
  const notif = notificationEngine.processRuleOutput(ruleOutput);
  if (notif) {
    return await createNotification(notif);
  }
  return null;
}

export async function handleReallocationRecommended(
  recommendation: ReallocationRecommendation
): Promise<AppNotification | null> {
  const ruleOutput = notificationRules.evaluateReallocationRecommended(recommendation);
  const notif = notificationEngine.processRuleOutput(ruleOutput);
  if (notif) {
    return await createNotification(notif);
  }
  return null;
}

export async function handleResourceStatusChanged(
  resource: Resource,
  oldStatus: string,
  newStatus: string,
  assignedIncidentId?: string
): Promise<AppNotification | null> {
  const ruleOutput = notificationRules.evaluateResourceStatusChanged(resource, oldStatus, newStatus, assignedIncidentId);
  const notif = notificationEngine.processRuleOutput(ruleOutput);
  if (notif) {
    return await createNotification(notif);
  }
  return null;
}

export async function handleIncidentWaitingDelay(
  incident: Incident,
  waitingMinutes: number
): Promise<AppNotification | null> {
  const ruleOutput = notificationRules.evaluateIncidentWaitingTooLong(incident, waitingMinutes);
  const notif = notificationEngine.processRuleOutput(ruleOutput);
  if (notif) {
    return await createNotification(notif);
  }
  return null;
}
