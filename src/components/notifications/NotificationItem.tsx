import React from 'react';
import { Link } from 'react-router-dom';
import { AppNotification } from '../../types/notifications';
import { AlertTriangle, ShieldAlert, Info, ArrowRight, Check } from 'lucide-react';

interface Props {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
  onAcknowledge: (id: string) => void;
  onDismiss?: (id: string) => void;
  compact?: boolean;
}

export const NotificationItem: React.FC<Props> = ({
  notification,
  onMarkAsRead,
  onAcknowledge,
}) => {
  const isUnread = notification.state === 'UNREAD';
  const isCritical = notification.severity === 'CRITICAL';
  const isWarning = notification.severity === 'WARNING';
  const isAcknowledged = notification.state === 'ACKNOWLEDGED';

  const severityIcon = isCritical ? (
    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-pulse" />
  ) : isWarning ? (
    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
  ) : (
    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
  );

  const formatRelativeTime = (iso: string) => {
    const elapsedSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (elapsedSec < 60) return 'Just now';
    if (elapsedSec < 3600) return `${Math.floor(elapsedSec / 60)}m ago`;
    if (elapsedSec < 86400) return `${Math.floor(elapsedSec / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div
      className={`p-3 rounded-lg border transition ${
        isUnread
          ? isCritical
            ? 'bg-red-950/25 border-red-500/40 ring-1 ring-red-500/20'
            : isWarning
            ? 'bg-amber-950/20 border-amber-500/30'
            : 'bg-slate-900 border-slate-700'
          : 'bg-slate-900/60 border-slate-800 opacity-90'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {severityIcon}

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`font-bold text-xs ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-300' : 'text-slate-200'}`}>
              {notification.title}
            </span>
            <span className="font-mono text-[10px] text-slate-500 shrink-0">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>

          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{notification.message}</p>

          {/* Action buttons row */}
          <div className="pt-1.5 flex items-center justify-between gap-2 text-xs">
            {notification.actionUrl ? (
              <Link
                to={notification.actionUrl}
                onClick={() => isUnread && onMarkAsRead(notification.id)}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
              >
                {notification.actionLabel || 'VIEW'}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ) : <div />}

            <div className="flex items-center gap-2">
              {isCritical && !isAcknowledged ? (
                <button
                  onClick={() => onAcknowledge(notification.id)}
                  className="px-2 py-0.5 bg-red-900/40 hover:bg-red-900/70 border border-red-500/40 text-red-300 rounded text-[10px] font-bold transition flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Acknowledge
                </button>
              ) : isUnread ? (
                <button
                  onClick={() => onMarkAsRead(notification.id)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 font-semibold"
                >
                  Mark read
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
