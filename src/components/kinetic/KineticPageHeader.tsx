import React from 'react';

interface Props {
  /** Page title — shown in Archivo Black, fullwidth */
  title: string;
  /** Short subtitle in Space Mono */
  subtitle?: string;
  /** Marquee text repeated in orange. Defaults to the title. */
  marqueeText?: string;
  /** Optional leading icon (lucide element) */
  icon?: React.ReactNode;
  /** Optional right-side action buttons/content */
  actions?: React.ReactNode;
}

/**
 * KineticPageHeader — Brutalist Kinetic Orange page header.
 *
 * Structure:
 *  1. Skewed black marquee banner (full-width, scrolling orange text)
 *  2. Page identity row: left title block + right actions
 *  3. 2px black bottom border separator
 */
export const KineticPageHeader: React.FC<Props> = ({
  title,
  subtitle,
  marqueeText,
  icon,
  actions,
}) => {
  const mText = marqueeText ?? title;
  // Duplicate for seamless infinite scroll
  const ticker = `${mText.toUpperCase()} • ${mText.toUpperCase()} • ${mText.toUpperCase()} • ${mText.toUpperCase()} • `;

  return (
    <div className="mb-6">
      {/* ── Skewed marquee strip ──────────────────────────────────────── */}
      <div className="w-full bg-black overflow-hidden py-3 transform -skew-y-1 border-y-2 border-black mb-1">
        <div className="transform skew-y-1">
          <div className="overflow-hidden whitespace-nowrap">
            <div className="animate-marquee-left">
              <span className="font-archivo text-[#FF4D00] text-[3vw] md:text-[2.2vw] uppercase leading-none tracking-[-0.04em] mr-10">
                {ticker}
              </span>
              <span className="font-archivo text-[#FF4D00] text-[3vw] md:text-[2.2vw] uppercase leading-none tracking-[-0.04em] mr-10">
                {ticker}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Page identity row ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 pb-5 border-b-2 border-black px-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="text-[#FF4D00] shrink-0">{icon}</span>
            )}
            <h1 className="font-archivo text-2xl md:text-4xl text-white tracking-[-0.04em] uppercase leading-[0.9] truncate">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="font-space text-[11px] text-slate-400 mt-1.5 uppercase tracking-[-0.02em]">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default KineticPageHeader;
