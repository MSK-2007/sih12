import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationBadge } from './NotificationBadge';
import { NotificationPanel } from './NotificationPanel';
import { Bell } from 'lucide-react';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, acknowledge, dismiss } = useNotifications();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition relative"
        title="Notifications & Alerts"
      >
        <Bell className="w-4 h-4 text-amber-400" />
        <NotificationBadge count={unreadCount} />
      </button>

      {isOpen && (
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onAcknowledge={acknowledge}
          onDismiss={dismiss}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
