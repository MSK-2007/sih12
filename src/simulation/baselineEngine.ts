import { Incident } from '../types/incident';
import { Resource } from '../types/resource';
import { determineRequiredResources } from '../engines/resourceRequirementEngine';

export interface BaselineResult {
  algorithm: 'BASELINE';
  avgResponseTime: number;
  criticalResponseTime: number;
  avgAllocationTime: number;
  resourceUtilization: number;
  allocationConflicts: number;
  unservedCriticalIncidents: number;
  successfullyServedIncidents: number;
  reallocationCount: number;
  assignments: Array<{
    incidentId: string;
    resourceId: string | null;
    responseTimeMinutes: number;
    served: boolean;
  }>;
}

// Calculate Haversine distance in kilometers
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Baseline Allocation Algorithm:
 * 1. Find available resources.
 * 2. Filter by basic resource type.
 * 3. Select nearest available resource.
 * 4. Assign it (no priority queueing, no capability matching, no dynamic reallocation).
 */
export function runBaselineAlgorithm(
  incidents: Incident[],
  resources: Resource[],
  trafficMultiplier: number = 1.0
): BaselineResult {
  // Clone resource availability state
  const resourceState = resources.map((r) => ({
    ...r,
    isAvailable: r.status === 'AVAILABLE',
  }));

  const assignments: Array<{
    incidentId: string;
    resourceId: string | null;
    responseTimeMinutes: number;
    served: boolean;
  }> = [];

  let allocationConflicts = 0;
  let unservedCritical = 0;
  let servedCount = 0;
  const responseTimes: number[] = [];
  const criticalResponseTimes: number[] = [];

  const averageSpeedKmh = 30 / trafficMultiplier; // Speed in km/h based on traffic

  for (const inc of incidents) {
    const reqs = determineRequiredResources(
      inc.emergencyType,
      inc.priorityLevel || 'MEDIUM',
      inc.injuryLevel || 'MODERATE',
      inc.peopleAffected || 1
    );

    const primaryType = reqs.primaryType;

    // Filter available resources of basic primary type
    const availableMatching = resourceState.filter(
      (r) => r.isAvailable && r.resourceType === primaryType
    );

    if (availableMatching.length === 0) {
      // Conflict: No available matching unit in baseline
      allocationConflicts++;
      if (inc.priorityLevel === 'CRITICAL') {
        unservedCritical++;
      }
      assignments.push({
        incidentId: inc.id,
        resourceId: null,
        responseTimeMinutes: 0,
        served: false,
      });
      continue;
    }

    // Pick NEAREST available resource by distance
    let nearestRes = availableMatching[0];
    let minDistance = haversineKm(
      inc.latitude,
      inc.longitude,
      nearestRes.latitude,
      nearestRes.longitude
    );

    for (let i = 1; i < availableMatching.length; i++) {
      const dist = haversineKm(
        inc.latitude,
        inc.longitude,
        availableMatching[i].latitude,
        availableMatching[i].longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestRes = availableMatching[i];
      }
    }

    // Baseline response time calculation: (distance / speed) * 60 + dispatch delay (2.5 mins)
    const travelTimeMins = (minDistance / averageSpeedKmh) * 60;
    const totalResponseTime = Math.round((travelTimeMins + 2.5) * 10) / 10;

    // Mark resource as busy
    nearestRes.isAvailable = false;
    servedCount++;

    responseTimes.push(totalResponseTime);
    if (inc.priorityLevel === 'CRITICAL') {
      criticalResponseTimes.push(totalResponseTime);
    }

    assignments.push({
      incidentId: inc.id,
      resourceId: nearestRes.id,
      responseTimeMinutes: totalResponseTime,
      served: true,
    });
  }

  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
      : 0;

  const criticalResponseTime =
    criticalResponseTimes.length > 0
      ? Math.round(
          (criticalResponseTimes.reduce((a, b) => a + b, 0) / criticalResponseTimes.length) * 10
        ) / 10
      : avgResponseTime * 1.2;

  const utilization =
    resources.length > 0 ? Math.round(((resources.length - resourceState.filter((r) => r.isAvailable).length) / resources.length) * 100) : 0;

  return {
    algorithm: 'BASELINE',
    avgResponseTime,
    criticalResponseTime,
    avgAllocationTime: 1.2, // Simple lookup delay
    resourceUtilization: utilization,
    allocationConflicts,
    unservedCriticalIncidents: unservedCritical,
    successfullyServedIncidents: servedCount,
    reallocationCount: 0, // Baseline does not support dynamic reallocation
    assignments,
  };
}
