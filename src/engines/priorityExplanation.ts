import { PriorityFactorContribution } from './priorityEngine';

/**
 * Generates natural human-readable explanation based on dominant factor contributions.
 */
export function generatePriorityExplanation(
  factors: PriorityFactorContribution[],
  peopleAffected: number,
  waitingMinutes: number
): string {
  // Sort factors by contribution descending
  const sorted = [...factors].sort((a, b) => b.contribution - a.contribution);
  const topFactors = sorted.filter((f) => f.normalizedScore >= 50);

  const highlights: string[] = [];

  for (const factor of topFactors.slice(0, 3)) {
    if (factor.name === 'Injury Level' && factor.normalizedScore >= 75) {
      highlights.push('severe injuries reported');
    } else if (factor.name === 'People Affected' && peopleAffected >= 3) {
      highlights.push(`multiple people affected (${peopleAffected} casualties)`);
    } else if (factor.name === 'Severity' && factor.normalizedScore >= 75) {
      highlights.push('high reported severity');
    } else if (factor.name === 'Emergency Type' && factor.normalizedScore >= 85) {
      highlights.push(`high-risk emergency category (${factor.rawValue})`);
    } else if (factor.name === 'Location Risk' && factor.normalizedScore >= 80) {
      highlights.push('high-risk location zone');
    } else if (factor.name === 'Waiting Time' && waitingMinutes >= 10) {
      highlights.push(`prolonged response delay (${Math.round(waitingMinutes)} minutes pending)`);
    }
  }

  if (highlights.length === 0) {
    return 'Priority evaluated based on standard routine response parameters.';
  }

  if (highlights.length === 1) {
    return `Priority evaluated primarily due to ${highlights[0]}.`;
  }

  if (highlights.length === 2) {
    return `Priority elevated due to ${highlights[0]} and ${highlights[1]}.`;
  }

  return `Priority elevated due to ${highlights[0]}, ${highlights[1]}, and ${highlights[2]}.`;
}
