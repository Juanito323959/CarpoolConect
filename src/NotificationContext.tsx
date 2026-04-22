import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Notification, Trip, Reservation } from './types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode; userId: string | undefined }> = ({ children, userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage and listen for changes
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const loadNotifications = () => {
      const saved = localStorage.getItem(`notifications_${userId}`);
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        setNotifications([]);
      }
    };

    loadNotifications();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `notifications_${userId}`) {
        loadNotifications();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userId]);

  // Save notifications to localStorage
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));
    }
  }, [notifications, userId]);

  const addNotification = useCallback((notif: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Check for upcoming trip reminders
  useEffect(() => {
    if (!userId) return;

    const checkReminders = () => {
      const trips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
      const reservations = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
      
      const myReservations = reservations.filter(r => r.passengerId === userId);
      const now = new Date();

      myReservations.forEach(res => {
        const trip = trips.find(t => t.id === res.tripId);
        if (trip && trip.status === 'active') {
          const departure = new Date(trip.departureTime);
          const diffMs = departure.getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / (1000 * 60));

          // Reminder 1 hour before
          if (diffMins > 55 && diffMins < 65) {
            const reminderId = `reminder_1h_${trip.id}_${userId}`;
            const alreadyNotified = notifications.some(n => n.id.startsWith(`reminder_1h_${trip.id}`));
            
            if (!alreadyNotified) {
              addNotification({
                userId,
                title: 'Recordatorio de Viaje',
                message: `Tu viaje de ${trip.origin} a ${trip.destination} sale en 1 hora.`,
                type: 'reminder',
                tripId: trip.id
              });
            }
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Initial check

    return () => clearInterval(interval);
  }, [userId, notifications, addNotification]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
