import React from 'react';
import { Link } from 'react-router-dom';
import { AllocationRecommendation } from '../../engines/allocationEngine';
import { ResourceTypeBadge } from '../resources/ResourceTypeBadge';
import { Clock, MapPin, CheckCircle2, Navigation, ArrowRight } from 'lucide-react';

interface Props {
  recommendation: AllocationRecommendation;
  isSelected: boolean;
  onToggleSelect: (resourceId: string) => void;
}

export const RecommendationCard: React.FC<Props> = ({
  recommendation,
  isSelected,
  onToggleSelect,
}) => {
  const isTopRank = recommendation.rank === 1;

  return (
    <div
      className={`glass-panel p-5 rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500'
          : isTopRank
          ? 'border-amber-500/50 bg-amber-950/10'
          : 'border-slate-800 bg-slate-900/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-xs font-bold px-2.5 py-1 rounded border ${
              isTopRank
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            #{recommendation.rank} RECOMMENDATION
          </span>
          <ResourceTypeBadge type={recommendation.resourceType} size="sm" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleSelect(recommendation.resourceId)}
            className={`px-3 py-1 rounded text-xs font-semibold border transition ${
              isSelected
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            {isSelected ? '✓ Selected for Dispatch' : 'Select Unit'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span className="font-mono text-emerald-400">{recommendation.resourceCode}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{recommendation.explanation}</p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Suitability Score</span>
          <span className="font-mono text-2xl font-extrabold text-amber-400">{recommendation.allocationScore}</span>
          <span className="text-xs text-slate-500 font-normal">/100</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 py-3 text-xs">
        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" /> Response ETA
          </span>
          <span className="font-mono font-bold text-cyan-400 text-sm mt-0.5 block">{recommendation.etaMinutes} min</span>
        </div>

        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-red-400" /> Driving Distance
          </span>
          <span className="font-mono font-bold text-slate-200 text-sm mt-0.5 block">{recommendation.distanceKm} km</span>
        </div>

        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Capability Match
          </span>
          <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block truncate">
            {recommendation.capabilityMatch.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Action Links */}
      <div className="pt-2 flex items-center justify-between text-xs">
        <Link
          to={`/map?resourceId=${recommendation.resourceId}`}
          className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition"
        >
          <Navigation className="w-3.5 h-3.5" />
          View Driving Route on Map
        </Link>
        <Link
          to={`/resources/${recommendation.resourceId}`}
          className="text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1 transition"
        >
          View Resource Details
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
