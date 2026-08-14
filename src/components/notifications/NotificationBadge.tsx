import React from 'react';

interface Props {
  count: number;
}

export const NotificationBadge: React.FC<Props> = ({ count }) => {
  if (count <= 0) return null;

  return (
    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white leading-none border border-slate-900 animate-pulse shadow-lg">
      {count > 99 ? '99+' : count}
    </span>
  );
};
