/**
 * Analytics CSV Export Service
 * Exports all calculated analytics metrics to a downloadable CSV file.
 */

import {
  OverviewMetrics,
  ResponseMetrics,
  ResourceMetrics,
  AllocationMetrics,
  ReallocationMetrics,
  IncidentMetrics,
  BaselineComparison,
  AnalyticsFilter,
} from '../types/analytics';

interface ExportData {
  filter: AnalyticsFilter;
  overview: OverviewMetrics | null;
  response: ResponseMetrics | null;
  resources: ResourceMetrics | null;
  allocation: AllocationMetrics | null;
  reallocation: ReallocationMetrics | null;
  incidents: IncidentMetrics | null;
  baseline: BaselineComparison | null;
}

function formatValue(v: number | null | undefined, unit = ''): string {
  if (v == null) return 'N/A';
  return `${v}${unit}`;
}

function escapeCSV(val: string | number | null): string {
  if (val == null) return 'N/A';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(...cols: (string | number | null)[]): string {
  return cols.map(escapeCSV).join(',');
}

export function exportAnalyticsCSV(data: ExportData): void {
  const lines: string[] = [];
  const period = data.filter.preset.replace(/_/g, ' ');
  const now = new Date().toISOString();

  lines.push(row('ResQAI Analytics Export'));
  lines.push(row('Generated', now));
  lines.push(row('Period', period));
  if (data.filter.simulationRunId) {
    lines.push(row('Simulation Run ID', data.filter.simulationRunId));
  }
  lines.push('');

  // Overview
  lines.push(row('SECTION', 'OVERVIEW METRICS'));
  lines.push(row('Metric', 'Value'));
  if (data.overview) {
    const o = data.overview;
    lines.push(row('Total Incidents', o.totalIncidents));
    lines.push(row('Critical Incidents', o.criticalIncidents));
    lines.push(row('High Incidents', o.highIncidents));
    lines.push(row('Avg Response Time (min)', formatValue(o.avgResponseMinutes)));
    lines.push(row('Resource Utilization (%)', formatValue(o.resourceUtilizationPercent, '%')));
    lines.push(row('Reallocation Success Rate (%)', formatValue(o.reallocationSuccessRate, '%')));
    lines.push(row('Unassigned Incidents', o.unassignedIncidents));
    lines.push(row('Resolved Incidents', o.resolvedIncidents));
    lines.push(row('Total Resources', o.totalResources));
  }
  lines.push('');

  // Response
  lines.push(row('SECTION', 'RESPONSE METRICS'));
  lines.push(row('Metric', 'Value'));
  if (data.response) {
    const r = data.response;
    lines.push(row('Avg Response Time (min)', formatValue(r.avgResponseMinutes)));
    lines.push(row('Median Response Time (min)', formatValue(r.medianResponseMinutes)));
    lines.push(row('Fastest Response (min)', formatValue(r.fastestResponseMinutes)));
    lines.push(row('Slowest Response (min)', formatValue(r.slowestResponseMinutes)));
    lines.push(row('Insufficient Data', r.insufficientData ? 'YES' : 'NO'));
    lines.push('');
    lines.push(row('Priority', 'Avg Response (min)', 'Count', 'Target (min)', 'Compliance (%)'));
    for (const bp of r.byPriority) {
      lines.push(row(bp.priority, formatValue(bp.avgMinutes), bp.count, bp.targetMinutes, formatValue(bp.compliancePercent)));
    }
  }
  lines.push('');

  // Resources
  lines.push(row('SECTION', 'RESOURCE METRICS'));
  if (data.resources) {
    const res = data.resources;
    lines.push(row('Metric', 'Value'));
    lines.push(row('Total Resources', res.total));
    lines.push(row('Available', res.available));
    lines.push(row('Assigned', res.assigned));
    lines.push(row('Busy', res.busy));
    lines.push(row('Offline', res.offline));
    lines.push(row('Overall Utilization (%)', formatValue(res.overallUtilizationPercent, '%')));
    lines.push('');
    lines.push(row('Resource Type', 'Total', 'Available', 'Assigned', 'Busy', 'Offline', 'Utilization (%)'));
    for (const bt of res.byType) {
      lines.push(row(bt.label, bt.total, bt.available, bt.assigned, bt.busy, bt.offline, formatValue(bt.utilizationPercent, '%')));
    }
  }
  lines.push('');

  // Allocation
  lines.push(row('SECTION', 'ALLOCATION METRICS'));
  if (data.allocation) {
    const al = data.allocation;
    lines.push(row('Success Rate (%)', formatValue(al.successRatePercent, '%')));
    lines.push(row('Avg Allocation Score', formatValue(al.avgAllocationScore)));
    lines.push(row('Highest Score', formatValue(al.highestAllocationScore)));
    lines.push(row('Lowest Score', formatValue(al.lowestAllocationScore)));
    lines.push(row('Avg ETA (min)', formatValue(al.avgEtaMinutes)));
    lines.push(row('Capability Match Rate (%)', formatValue(al.capabilityMatchRatePercent, '%')));
    lines.push(row('Unassigned Count', al.unassignedCount));
  }
  lines.push('');

  // Reallocation
  lines.push(row('SECTION', 'REALLOCATION METRICS'));
  if (data.reallocation) {
    const re = data.reallocation;
    lines.push(row('Total Recommendations', re.totalRecommendations));
    lines.push(row('Approved', re.approved));
    lines.push(row('Rejected', re.rejected));
    lines.push(row('Successful', re.successful));
    lines.push(row('Success Rate (%)', formatValue(re.successRatePercent, '%')));
    lines.push(row('Avg ETA Before (min)', formatValue(re.avgEtaBefore)));
    lines.push(row('Avg ETA After (min)', formatValue(re.avgEtaAfter)));
    lines.push(row('ETA Improvement (%)', formatValue(re.etaImprovementPercent, '%')));
  }
  lines.push('');

  // Baseline vs ResQAI
  lines.push(row('SECTION', 'BASELINE vs RESQAI COMPARISON'));
  lines.push(row('NOTE', 'Prototype approximation — see docs/analytics-definitions.md'));
  if (data.baseline) {
    lines.push(row('Metric', 'Unit', 'Baseline', 'ResQAI', 'Improvement (%)'));
    for (const brow of data.baseline.rows) {
      lines.push(row(
        brow.metric,
        brow.unit,
        formatValue(brow.baseline),
        formatValue(brow.resqai),
        formatValue(brow.improvementPercent, '%')
      ));
    }
    lines.push('');
    lines.push(row('Impact Summary', data.baseline.impactSummary));
  }

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `resqai-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
