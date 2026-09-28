import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { LIFECYCLE_STAGES } from '../../../utils';

const STAGE_COLORS = {
  Planned: {
    bg: 'bg-slate-600',
    ring: 'ring-slate-400',
    text: 'text-slate-700',
    border: 'border-slate-500'
  },
  Procured: {
    bg: 'bg-purple-600',
    ring: 'ring-purple-400',
    text: 'text-purple-700',
    border: 'border-purple-500'
  },
  Installed: {
    bg: 'bg-blue-600',
    ring: 'ring-blue-400',
    text: 'text-blue-700',
    border: 'border-blue-500'
  },
  'In Service': {
    bg: 'bg-emerald-600',
    ring: 'ring-emerald-400',
    text: 'text-emerald-700',
    border: 'border-emerald-500'
  },
  'Under Maintenance': {
    bg: 'bg-amber-600',
    ring: 'ring-amber-400',
    text: 'text-amber-700',
    border: 'border-amber-500'
  },
  Decommissioned: {
    bg: 'bg-rose-600',
    ring: 'ring-rose-400',
    text: 'text-rose-700',
    border: 'border-rose-500'
  }
};

export default function LifecycleStepper({ currentStage }) {
  const currentIndex = LIFECYCLE_STAGES.indexOf(currentStage);

  return (
    <div className="w-full py-4 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[620px] relative px-4">
        {/* Continuous background bar */}
        <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-slate-200 -z-0" />

        {LIFECYCLE_STAGES.map((stage, idx) => {
          const isCurrent = stage === currentStage;
          const isPassed = currentIndex !== -1 && idx < currentIndex && stage !== 'Under Maintenance';
          const colors = STAGE_COLORS[stage] || STAGE_COLORS.Planned;

          let badgeClasses = 'bg-white border-2 border-slate-300 text-slate-400';
          if (isCurrent) {
            badgeClasses = `${colors.bg} text-white shadow-md ring-4 ${colors.ring}/30 border-transparent scale-110`;
          } else if (isPassed) {
            badgeClasses = 'bg-emerald-500 border-emerald-500 text-white';
          }

          return (
            <div key={stage} className="flex flex-col items-center relative z-10">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${badgeClasses}`}
              >
                {isPassed ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={`mt-2 text-xs font-semibold whitespace-nowrap ${
                  isCurrent ? `${colors.text} font-bold` : 'text-slate-500'
                }`}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
