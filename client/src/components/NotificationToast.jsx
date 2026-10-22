import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, Camera, Award, X } from 'lucide-react';
import { api, getAuthToken } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const NotificationToast = ({ onRefresh }) => {
  const { user, refreshUser } = useAuth();
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token || !user) return;

    let eventSource = null;

    try {
      const streamUrl = api.getNotificationStreamUrl();
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener('NEW_PAYMENT', (e) => {
        try {
          const data = JSON.parse(e.data);
          addToast('payment', 'New Payment Submitted', data.message);
          if (onRefresh) onRefresh();
        } catch (err) {}
      });

      eventSource.addEventListener('PAYMENT_APPROVED', (e) => {
        try {
          const data = JSON.parse(e.data);
          addToast('success', 'E-Ticket Issued!', data.message);
          refreshUser();
          if (onRefresh) onRefresh();
        } catch (err) {}
      });

      eventSource.addEventListener('PAYMENT_REJECTED', (e) => {
        try {
          const data = JSON.parse(e.data);
          addToast('warning', 'Payment Update', data.message);
          refreshUser();
          if (onRefresh) onRefresh();
        } catch (err) {}
      });

      eventSource.addEventListener('NEW_SUBMISSION', (e) => {
        try {
          const data = JSON.parse(e.data);
          addToast('photo', 'New Photo Submission', data.message);
          if (onRefresh) onRefresh();
        } catch (err) {}
      });

      eventSource.addEventListener('SUBMISSION_SCORED', (e) => {
        try {
          const data = JSON.parse(e.data);
          addToast('award', 'Judging Scores Released!', data.message);
          if (onRefresh) onRefresh();
        } catch (err) {}
      });

      eventSource.onerror = () => {
        // EventSource will automatically retry connection
      };
    } catch (err) {
      console.warn('Could not establish SSE connection:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [user]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Bell className="w-5 h-5 text-pixel-yellow" />;
        let borderColor = 'border-pixel-yellow/40';
        let bgColor = 'bg-dark-900/95';

        if (toast.type === 'success') {
          icon = <CheckCircle className="w-5 h-5 text-emerald-400" />;
          borderColor = 'border-emerald-500/40';
        } else if (toast.type === 'warning') {
          icon = <AlertCircle className="w-5 h-5 text-rose-400" />;
          borderColor = 'border-rose-500/40';
        } else if (toast.type === 'photo') {
          icon = <Camera className="w-5 h-5 text-sky-400" />;
          borderColor = 'border-sky-500/40';
        } else if (toast.type === 'award') {
          icon = <Award className="w-5 h-5 text-amber-400" />;
          borderColor = 'border-amber-500/40';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border ${borderColor} ${bgColor} backdrop-blur-md shadow-2xl transition-all duration-300 animate-slide-in flex items-start space-x-3`}
          >
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
                {toast.title}
              </h4>
              <p className="text-sm text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
