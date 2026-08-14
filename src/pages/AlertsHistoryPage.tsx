import React, { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from '../components/notifications/NotificationItem';
import { NotificationSeverity } from '../types/notifications';
import { Bell, Search, CheckCheck, RefreshCw, ShieldAlert } from 'lucide-react';
import { KineticPageHeader } from '../components/kinetic/KineticPageHeader';

export const AlertsHistoryPage: React.FC = () => {
  const { notifications, unreadCount, filters, setFilters, refresh, markAsRead, markAllAsRead, acknowledge, dismiss } =
    useNotifications();

  const [search, setSearch] = useState('');

  const handleSeverityFilter = (severity: NotificationSeverity | 'ALL') => {
    setFilters({ ...filters, severity });
  };

  return (
    <div className="space-y-6 px-4 md:px-8 py-6 pb-12 animate-fade-in">
      {/* Kinetic Orange Brutalist Header */}
      <KineticPageHeader
        title="SYSTEM ALERTS"
        subtitle="AUDIT LOG OF ALL EMERGENCY RESPONSE OPERATIONAL ALERTS AND SYSTEM NOTIFICATIONS"
        marqueeText="ALERTS & AUDIT TRAIL"
        icon={<Bell className="w-6 h-6" />}
        actions={
          <div className="flex items-center gap-2 font-space text-xs">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-[#FF4D00] text-black font-bold uppercase rounded-full hover:scale-105 transition flex items-center gap-1.5 border-2 border-black shadow"
              >
                <CheckCheck className="w-4 h-4 stroke-[3]" />
                MARK ALL READ
              </button>
            )}
            <button
              onClick={refresh}
              className="p-2.5 bg-black border-2 border-black rounded-full text-white hover:bg-[#FF4D00] hover:text-black transition"
              title="Refresh notifications"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {unreadCount > 0 && (
              <span className="px-3 py-0.5 rounded-full text-xs font-space font-bold bg-red-600 text-white">
                {unreadCount} UNREAD
              </span>
            )}
          </div>
        }
      />

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setFilters({ ...filters, searchQuery: e.target.value });
            }}
            placeholder="Filter alerts by incident ID, resource code, title..."
            className="w-full bg-black border border-white/20 rounded-full pl-9 pr-4 py-1.5 text-xs text-white font-space placeholder:text-slate-600 focus:outline-none focus:border-[#FF4D00]"
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-space font-bold uppercase">
          <button
            onClick={() => handleSeverityFilter('ALL')}
            className={`px-3 py-1 rounded-full transition ${(!filters.severity || filters.severity === 'ALL') ? 'bg-[#FF4D00] text-black font-bold' : 'bg-black text-slate-400 border border-white/20 hover:text-white'}`}
          >
            ALL SEVERITIES
          </button>
          <button
            onClick={() => handleSeverityFilter('CRITICAL')}
            className={`px-3 py-1 rounded-full transition flex items-center gap-1.5 ${filters.severity === 'CRITICAL' ? 'bg-red-600 text-white font-bold' : 'bg-black text-slate-400 border border-white/20 hover:text-red-400'}`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> CRITICAL
          </button>
          <button
            onClick={() => handleSeverityFilter('WARNING')}
            className={`px-3 py-1 rounded-full transition ${filters.severity === 'WARNING' ? 'bg-amber-500 text-black font-bold' : 'bg-black text-slate-400 border border-white/20 hover:text-amber-300'}`}
          >
            WARNING
          </button>
          <button
            onClick={() => handleSeverityFilter('INFO')}
            className={`px-3 py-1 rounded-full transition ${filters.severity === 'INFO' ? 'bg-cyan-500 text-black font-bold' : 'bg-black text-slate-400 border border-white/20 hover:text-cyan-400'}`}
          >
            INFO
          </button>
        </div>
      </div>

      {/* Notifications List Grid */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="glass-panel p-12 text-center border border-white/20 space-y-2">
            <Bell className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-archivo text-base text-white uppercase">NO OPERATIONAL ALERTS FOUND</p>
            <p className="font-space text-xs text-slate-500">ALERTS POPULATE AUTOMATICALLY AS EMERGENCY EVENTS OCCUR.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onMarkAsRead={markAsRead}
              onAcknowledge={acknowledge}
              onDismiss={dismiss}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsHistoryPage;
