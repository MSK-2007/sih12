import React, { useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAnalyticsFilters } from '../hooks/useAnalyticsFilters';
import { AnalyticsFilters } from '../components/analytics/AnalyticsFilters';
import { OverviewCards } from '../components/analytics/OverviewCards';
import { ResponseMetrics } from '../components/analytics/ResponseMetrics';
import { ResponseTrendChart } from '../components/analytics/ResponseTrendChart';
import { ResourceMetrics } from '../components/analytics/ResourceMetrics';
import { ResourceUtilizationChart } from '../components/analytics/ResourceUtilizationChart';
import { AllocationMetrics } from '../components/analytics/AllocationMetrics';
import { ReallocationMetrics } from '../components/analytics/ReallocationMetrics';
import { IncidentAnalytics } from '../components/analytics/IncidentAnalytics';
import { BaselineComparison } from '../components/analytics/BaselineComparison';
import { ImpactSummary } from '../components/analytics/ImpactSummary';
import { SimulationAnalytics } from '../components/analytics/SimulationAnalytics';
import { exportAnalyticsCSV } from '../services/analyticsExport';
import { KineticPageHeader } from '../components/kinetic/KineticPageHeader';

type Tab =
  | 'overview'
  | 'response'
  | 'resources'
  | 'allocation'
  | 'reallocation'
  | 'incidents'
  | 'baseline'
  | 'simulation';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'response', label: 'Response' },
  { id: 'resources', label: 'Resources' },
  { id: 'allocation', label: 'Allocation' },
  { id: 'reallocation', label: 'Reallocation' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'baseline', label: 'Baseline vs ResQAI' },
  { id: 'simulation', label: 'Simulation' },
];

export const AnalyticsDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { filter, setDateRange } = useAnalyticsFilters();
  const {
    overview,
    response,
    resources,
    allocation,
    reallocation,
    incidents,
    baselineComparison,
    simulationAnalytics,
    loading,
    error,
    refresh,
  } = useAnalytics(filter);

  const handleExport = () => {
    exportAnalyticsCSV({
      filter,
      overview,
      response,
      resources,
      allocation,
      reallocation,
      incidents,
      baseline: baselineComparison,
    });
  };

  return (
    <div className="space-y-5 px-4 md:px-8 py-6 pb-12 animate-fade-in">
      {/* Kinetic Orange Brutalist Header */}
      <KineticPageHeader
        title="ANALYTICS & IMPACT"
        subtitle="EMPIRICAL METRICS DERIVED DIRECTLY FROM OPERATIONAL DATABASE RECORDS"
        marqueeText="ANALYTICS DASHBOARD"
        icon={<BarChart3 className="w-6 h-6" />}
        actions={
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF4D00] text-black hover:scale-105 text-xs font-space font-bold uppercase transition border-2 border-black disabled:opacity-50"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            EXPORT CSV
          </button>
        }
      />

      {/* Filters */}
      <AnalyticsFilters
        filter={filter}
        onSetDateRange={setDateRange}
        onRefresh={refresh}
        loading={loading}
      />

      {/* Error state */}
      {error && (
        <div className="px-4 py-3 rounded-none bg-red-950/40 border border-red-500/50 text-red-300 text-xs font-space">
          {error}
        </div>
      )}

      {/* Overview KPI Cards always visible */}
      <OverviewCards metrics={overview} loading={loading} />

      {/* Impact Summary always visible */}
      <ImpactSummary overview={overview} comparison={baselineComparison} loading={loading} />

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full font-space text-xs font-bold uppercase whitespace-nowrap transition border ${
              activeTab === tab.id
                ? 'bg-[#FF4D00] text-black border-black shadow-lg'
                : 'bg-black text-slate-400 border-white/20 hover:text-white hover:border-white/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="font-space text-xs font-bold uppercase tracking-wider text-[#FF4D00]">OVERVIEW METRICS</div>
            <ResponseTrendChart metrics={response} loading={loading} />
          </div>
        )}

        {activeTab === 'response' && (
          <div className="space-y-4">
            <div className="font-space text-xs font-bold uppercase tracking-wider text-[#FF4D00]">RESPONSE TIME PERFORMANCE</div>
            <ResponseMetrics metrics={response} loading={loading} />
            <ResponseTrendChart metrics={response} loading={loading} />
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="font-space text-xs font-bold uppercase tracking-wider text-[#FF4D00]">RESOURCE FLEET UTILIZATION</div>
            <ResourceMetrics metrics={resources} loading={loading} />
            <ResourceUtilizationChart metrics={resources} loading={loading} />
          </div>
        )}

        {activeTab === 'allocation' && (
          <div className="space-y-4">
            <div className="font-space text-xs font-bold uppercase tracking-wider text-[#FF4D00]">ALLOCATION SUITABILITY QUALITY</div>
            <AllocationMetrics metrics={allocation} loading={loading} />
          </div>
        )}

        {activeTab === 'reallocation' && (
          <div className="space-y-4">
            <div className="font-space text-xs font-bold uppercase tracking-wider text-[#FF4D00]">DYNAMIC REALLOCATION EFFICIENCY</div>
            <ReallocationMetrics metrics={reallocation} loading={loading} />
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="space-y-4">
            <div className="font-space text-xs font-bold uppercase tracking-wider text-[#FF4D00]">INCIDENT CATEGORY ANALYTICS</div>
            <IncidentAnalytics metrics={incidents} loading={loading} />
          </div>
        )}

        {activeTab === 'baseline' && (
          <div className="space-y-4">
            <div className="font-space text-xs font-bold uppercase tracking-wider text-[#FF4D00]">BASELINE STRATEGY VS RESQAI OPTIMIZATION</div>
            <BaselineComparison comparison={baselineComparison} loading={loading} />
          </div>
        )}

        {activeTab === 'simulation' && (
          <div className="space-y-4">
            <div className="font-space text-xs font-bold uppercase tracking-wider text-[#FF4D00]">SIMULATION SCENARIO ANALYTICS</div>
            <SimulationAnalytics analytics={simulationAnalytics} loading={loading} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboardPage;
