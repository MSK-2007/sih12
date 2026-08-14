import React from 'react';
import { ArrowDown } from 'lucide-react';

export const RotatingScrollIndicator: React.FC = () => {
  return (
    <div className="relative w-[144px] h-[144px] flex items-center justify-center select-none">
      {/* Rotating SVG text container */}
      <svg
        className="w-full h-full animate-spin-slow"
        viewBox="0 0 144 144"
      >
        <path
          id="circlePath"
          d="M 72, 72 m -54, 0 a 54,54 0 1,1 108,0 a 54,54 0 1,1 -108,0"
          fill="none"
        />
        <text className="font-space font-bold uppercase fill-black text-[9px] tracking-[0.18em]">
          <textPath href="#circlePath" startOffset="0%">
            SCROLL DOWN • SCROLL DOWN • SCROLL DOWN • 
          </textPath>
        </text>
      </svg>

      {/* Static center arrow icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <ArrowDown className="w-6 h-6 text-black stroke-[2.5]" />
      </div>
    </div>
  );
};
