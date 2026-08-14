import { Incident } from '../types/incident';
import { Resource } from '../types/resource';
import { ReallocationRecommendation } from './reallocationEngine';
import { NotificationType, NotificationSeverity } from '../types/notifications';

export interface NotificationRuleOutput {
  shouldNotify: boolean;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  incidentId?: string;
  resourceId?: string;
  reallocationEventId?: string;
  actionUrl: string;
  actionLabel: string;
  deduplicationKey: string;
}

export class NotificationRules {
  /**
   * Evaluates notification requirement when a new incident is logged.
   */
  public evaluateIncidentCreated(incident: Incident): NotificationRuleOutput {
    if (incident.priorityLevel === 'CRITICAL') {
      return {
        shouldNotify: true,
        type: 'CRITICAL_INCIDENT',
        severity: 'CRITICAL',
        title: 'NEW CRITICAL INCIDENT',
        message: `${incident.incidentNumber} (${incident.emergencyType.replace('_', ' ')}) reported with ${incident.peopleAffected} affected. Immediate operator review required.`,
        incidentId: incident.id,
        actionUrl: `/incidents/${incident.id}`,
        actionLabel: 'OPEN INCIDENT',
        deduplicationKey: `CRITICAL_INCIDENT:${incident.id}`,
      };
    }

    if (incident.priorityLevel === 'HIGH') {
      return {
        shouldNotify: true,
        type: 'HIGH_PRIORITY_INCIDENT',
        severity: 'WARNING',
        title: 'HIGH PRIORITY EMERGENCY',
        message: `${incident.incidentNumber} reported at ${incident.address}. Priority Score: ${incident.priorityScore}/100.`,
        incidentId: incident.id,
        actionUrl: `/incidents/${incident.id}`,
        actionLabel: 'REVIEW',
        deduplicationKey: `HIGH_PRIORITY_INCIDENT:${incident.id}`,
      };
    }

    return {
      shouldNotify: true,
      type: 'NEW_INCIDENT',
      severity: 'INFO',
      title: 'NEW EMERGENCY REPORTED',
      message: `${incident.incidentNumber} logged at ${incident.address}.`,
      incidentId: incident.id,
      actionUrl: `/incidents/${incident.id}`,
      actionLabel: 'VIEW',
      deduplicationKey: `NEW_INCIDENT:${incident.id}`,
    };
  }

  /**
   * Evaluates notification when priority score escalates.
   */
  public evaluatePriorityEscalated(
    incident: Incident,
    oldPriority: string,
    newPriority: string
  ): NotificationRuleOutput {
    const isCritical = newPriority === 'CRITICAL';
    return {
      shouldNotify: true,
      type: 'INCIDENT_ESCALATED',
      severity: isCritical ? 'CRITICAL' : 'WARNING',
      title: 'INCIDENT PRIORITY ESCALATED',
      message: `${incident.incidentNumber} priority escalated from ${oldPriority} to ${newPriority} (Score: ${incident.priorityScore}/100).`,
      incidentId: incident.id,
      actionUrl: `/incidents/${incident.id}`,
      actionLabel: 'INSPECT',
      deduplicationKey: `INCIDENT_ESCALATED:${incident.id}:${newPriority}`,
    };
  }

  /**
   * Evaluates notification when Phase 8 allocation finds no available units.
   */
  public evaluateNoResourceAvailable(incident: Incident): NotificationRuleOutput {
    return {
      shouldNotify: true,
      type: 'NO_RESOURCE_AVAILABLE',
      severity: incident.priorityLevel === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      title: 'NO SUITABLE RESOURCE AVAILABLE',
      message: `No available response unit can fulfill ${incident.incidentNumber} (${incident.priorityLevel} Priority). Operator action required.`,
      incidentId: incident.id,
      actionUrl: `/incidents/${incident.id}`,
      actionLabel: 'REVIEW ALLOCATION',
      deduplicationKey: `NO_RESOURCE_AVAILABLE:${incident.id}`,
    };
  }

  /**
   * Evaluates notification when Phase 9 engine recommends dynamic reallocation.
   */
  public evaluateReallocationRecommended(rec: ReallocationRecommendation): NotificationRuleOutput {
    return {
      shouldNotify: true,
      type: 'REALLOCATION_REQUIRED',
      severity: rec.triggerPriorityLevel === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      title: 'REALLOCATION RECOMMENDED',
      message: `Dynamic reallocation recommended for ${rec.triggerIncidentNumber} (+${rec.improvement} pts system quality gain).`,
      incidentId: rec.triggerIncidentId,
      reallocationEventId: rec.id,
      actionUrl: `/reallocation`,
      actionLabel: 'REVIEW REALLOCATION',
      deduplicationKey: `REALLOCATION_REQUIRED:${rec.id}`,
    };
  }

  /**
   * Evaluates notification when resource status changes (e.g. going OFFLINE while assigned).
   */
  public evaluateResourceStatusChanged(
    resource: Resource,
    oldStatus: string,
    newStatus: string,
    currentAssignmentIncidentId?: string
  ): NotificationRuleOutput {
    if (newStatus === 'OFFLINE') {
      const isAssigned = oldStatus === 'ASSIGNED' || Boolean(currentAssignmentIncidentId);
      return {
        shouldNotify: true,
        type: 'RESOURCE_OFFLINE',
        severity: isAssigned ? 'CRITICAL' : 'WARNING',
        title: isAssigned ? 'ASSIGNED UNIT OFFLINE' : 'RESOURCE OFFLINE',
        message: isAssigned
          ? `${resource.resourceCode} went OFFLINE while assigned to an active emergency.`
          : `${resource.resourceCode} is now OFFLINE. Fleet capacity reduced.`,
        resourceId: resource.id,
        incidentId: currentAssignmentIncidentId,
        actionUrl: `/resources/${resource.id}`,
        actionLabel: 'INSPECT UNIT',
        deduplicationKey: `RESOURCE_OFFLINE:${resource.id}:${oldStatus}`,
      };
    }

    if (newStatus === 'AVAILABLE' && oldStatus === 'OFFLINE') {
      return {
        shouldNotify: true,
        type: 'RESOURCE_AVAILABLE',
        severity: 'INFO',
        title: 'RESOURCE RETURNED TO SERVICE',
        message: `${resource.resourceCode} is now AVAILABLE in the response pool.`,
        resourceId: resource.id,
        actionUrl: `/resources/${resource.id}`,
        actionLabel: 'VIEW UNIT',
        deduplicationKey: `RESOURCE_AVAILABLE:${resource.id}`,
      };
    }

    return {
      shouldNotify: false,
      type: 'ASSIGNMENT_CHANGED',
      severity: 'INFO',
      title: '',
      message: '',
      actionUrl: '',
      actionLabel: '',
      deduplicationKey: '',
    };
  }

  /**
   * Evaluates notification when incident has been waiting > 10 min without dispatch.
   */
  public evaluateIncidentWaitingTooLong(incident: Incident, waitingMinutes: number): NotificationRuleOutput {
    const isCritical = waitingMinutes >= 15 || incident.priorityLevel === 'CRITICAL';
    return {
      shouldNotify: true,
      type: 'INCIDENT_WAITING',
      severity: isCritical ? 'CRITICAL' : 'WARNING',
      title: 'RESPONSE DELAY WARNING',
      message: `${incident.incidentNumber} has been waiting ${waitingMinutes} minutes without unit dispatch.`,
      incidentId: incident.id,
      actionUrl: `/incidents/${incident.id}`,
      actionLabel: 'DISPATCH UNIT',
      deduplicationKey: `INCIDENT_WAITING:${incident.id}:${Math.floor(waitingMinutes / 5) * 5}`,
    };
  }
}

export const notificationRules = new NotificationRules();
