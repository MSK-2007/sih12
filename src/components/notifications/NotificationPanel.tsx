import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppNotification } from '../../types/notifications';
import { NotificationItem } from './NotificationItem';
import { Bell, CheckCheck, ExternalLink, X } from 'lucide-react';

interface Props {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

export const NotificationPanel: React.FC<Props> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onAcknowledge,
  onDismiss,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'CRITICAL' | 'WARNING'>('ALL');

  const filtered = notifications.filter((n) => {
    if (activeTab === 'UNREAD') return n.state === 'UNREAD';
    if (activeTab === 'CRITICAL') return n.severity === 'CRITICAL';
    if (activeTab === 'WARNING') return n.severity === 'WARNING';
    return true;
  });

  return (
    <div className="absolute right-0 top-12 z-[2100] w-80 sm:w-96 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">NOTIFICATIONS & ALERTS</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white">
              {unreadCount} UNREAD
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs & Mark All as Read */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[11px] font-semibold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-2.5 py-1 rounded transition ${activeTab === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('UNREAD')}
            className={`px-2.5 py-1 rounded transition ${activeTab === 'UNREAD' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setActiveTab('CRITICAL')}
            className={`px-2.5 py-1 rounded transition ${activeTab === 'CRITICAL' ? 'bg-red-950/60 text-red-400 font-bold border border-red-500/30' : 'text-slate-400 hover:text-red-400'}`}
          >
            Critical
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-[10px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 shrink-0"
            title="Mark all as read"
          >
            <CheckCheck className="w-3 h-3" /> Mark Read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-96">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-400">No notifications found</p>
            <p className="text-[11px]">Important operational alerts will appear here in real time.</p>
          </div>
        ) : (
          filtered.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onMarkAsRead={onMarkAsRead}
              onAcknowledge={onAcknowledge}
              onDismiss={onDismiss}
              compact
            />
          ))
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 text-center">
        <Link
          to="/alerts"
          onClick={onClose}
          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1 transition"
        >
          View Full Alerts History
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
