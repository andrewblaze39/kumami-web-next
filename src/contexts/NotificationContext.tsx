'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Notification {
  id: string;
  title?: string;
  message: string;
  read: boolean;
  timestamp: Date | any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (message: string, title?: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (message: string, title?: string) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      title,
      message,
      read: false,
      timestamp: new Date(),
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = async () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
