import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface Props {
  index: string;
  title: string;
  tags: string[];
  description?: string;
  onClick?: () => void;
}

export const BrutalistServiceCard: React.FC<Props> = ({
  index,
  title,
  tags,
  description,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="group relative w-full border-t border-white/20 py-8 md:py-12 px-4 md:px-8 cursor-pointer transition-colors duration-300 hover:bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden"
    >
      <div className="flex items-start md:items-center gap-6 md:gap-12 flex-1">
        {/* Leading index number in #FF4D00 Space Mono */}
        <span className="font-space font-bold text-[#FF4D00] text-xl md:text-2xl tracking-tighter shrink-0 pt-2 md:pt-0">
          {index}
        </span>

        {/* Title + Tags */}
        <div className="space-y-3 transition-transform duration-300 ease-out group-hover:translate-x-4">
          <h3 className="font-archivo uppercase text-white text-3xl sm:text-4xl md:text-6xl lg:text-[7vw] leading-[0.88] tracking-[-0.04em]">
            {title}
          </h3>

          {description && (
            <p className="font-inter text-slate-400 text-sm md:text-base max-w-2xl">
              {description}
            </p>
          )}

          {/* Pill-shaped tags */}
          <div className="flex flex-wrap gap-2 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="font-space text-[11px] uppercase tracking-tight px-3 py-1 rounded-full border border-white/20 text-slate-300 bg-white/5 group-hover:border-[#FF4D00]/40 transition"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Large #FF4D00 Arrow icon (Hidden by default, reveals on hover & rotates 45deg) */}
      <div className="shrink-0 self-end md:self-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-hover:rotate-45 transition-all duration-300 ease-out">
        <ArrowUpRight className="w-12 h-12 md:w-16 md:h-16 text-[#FF4D00] stroke-[2.5]" />
      </div>
    </div>
  );
};
