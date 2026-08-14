import React from 'react';
import { Link } from 'react-router-dom';
import { AppNotification } from '../../types/notifications';
import { ShieldAlert, AlertTriangle, X, ArrowRight } from 'lucide-react';

interface Props {
  notification: AppNotification | null;
  onDismiss: () => void;
}

export const NotificationToast: React.FC<Props> = ({ notification, onDismiss }) => {
  if (!notification) return null;

  const isCritical = notification.severity === 'CRITICAL';
  const isWarning = notification.severity === 'WARNING';

  // Only surface toasts for CRITICAL and WARNING events
  if (!isCritical && !isWarning) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[2200] max-w-sm w-full animate-bounce-in">
      <div
        className={`p-4 rounded-xl border shadow-2xl space-y-2 backdrop-blur-md ${
          isCritical
            ? 'bg-[#18090b] border-red-500/50 text-red-100 shadow-red-950/50'
            : 'bg-[#161208] border-amber-500/40 text-amber-100 shadow-amber-950/40'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {isCritical ? (
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <h4 className={`font-bold text-xs ${isCritical ? 'text-red-400' : 'text-amber-300'}`}>
              {notification.title}
            </h4>
          </div>

          <button onClick={onDismiss} className="text-slate-400 hover:text-white p-0.5 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed font-medium">{notification.message}</p>

        {notification.actionUrl && (
          <div className="pt-1 flex items-center justify-end">
            <Link
              to={notification.actionUrl}
              onClick={onDismiss}
              className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition flex items-center gap-1"
            >
              {notification.actionLabel || 'OPEN'}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
