import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, User, LogOut, Search, PlusCircle, MessageSquare, Bell, X, Check, Shield, Navigation, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotifications } from '../NotificationContext';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType } from '../types';
import { Logo } from './Logo';

interface NavbarProps {
  user: UserType | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/">
          <Logo textSize="text-lg" iconSize={20} />
        </Link>

        <div className="flex items-center gap-6">
          {user && (
            <>
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-600 hover:text-indigo-600 transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                        <h3 className="font-bold text-gray-900">Notificaciones</h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={markAllAsRead}
                            className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:text-indigo-700"
                          >
                            Leer todo
                          </button>
                          <button 
                            onClick={clearNotifications}
                            className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:text-red-600"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center space-y-2">
                            <Bell className="w-8 h-8 text-gray-200 mx-auto" />
                            <p className="text-sm text-gray-400 font-medium">No tienes notificaciones</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div 
                              key={n.id} 
                              className={cn(
                                "p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors relative group",
                                !n.isRead && "bg-indigo-50/30"
                              )}
                            >
                              <div className="flex gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                                  n.type === 'booking' ? "bg-green-100 text-green-600" :
                                  n.type === 'cancellation' ? "bg-red-100 text-red-600" :
                                  n.type === 'trip_started' ? "bg-blue-100 text-blue-600" :
                                  n.type === 'arrived' ? "bg-orange-100 text-orange-600" :
                                  "bg-indigo-100 text-indigo-600"
                                )}>
                                  {n.type === 'booking' ? <Check className="w-4 h-4" /> :
                                   n.type === 'cancellation' ? <X className="w-4 h-4" /> :
                                   n.type === 'trip_started' ? <Navigation className="w-4 h-4" /> :
                                   n.type === 'arrived' ? <MapPin className="w-4 h-4" /> :
                                   <Bell className="w-4 h-4" />}
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-gray-900">{n.title}</p>
                                  <p className="text-xs text-gray-500 leading-relaxed">{n.message}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2 ml-11">
                                <p className="text-[10px] text-gray-400 font-medium">
                                  {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {n.tripId && (
                                  <Link 
                                    to={`/trip/${n.tripId}`}
                                    onClick={() => {
                                      setShowNotifications(false);
                                      markAsRead(n.id);
                                    }}
                                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                                  >
                                    Ver Viaje
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link to="/messages" className="text-gray-600 hover:text-indigo-600 flex items-center gap-1 relative">
                <MessageSquare className="w-5 h-5" />
                <span className="hidden sm:inline">Mensajes</span>
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-gray-600 hover:text-indigo-600 flex items-center gap-1">
                  <Shield className="w-5 h-5" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              {user.role === 'driver' && (
                <Link to="/driver/dashboard" className="text-gray-600 hover:text-indigo-600 flex items-center gap-1">
                  <PlusCircle className="w-5 h-5" />
                  <span className="hidden sm:inline">Publicar Viaje</span>
                </Link>
              )}
              {user.role === 'passenger' && (
                <Link to="/search" className="text-gray-600 hover:text-indigo-600 flex items-center gap-1">
                  <Search className="w-5 h-5" />
                  <span className="hidden sm:inline">Buscar Viajes</span>
                </Link>
              )}
              <Link to="/profile" className="text-gray-600 hover:text-indigo-600 flex items-center gap-1">
                <User className="w-5 h-5" />
                <span className="hidden sm:inline">Mi Perfil</span>
              </Link>
              <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">{user.name}</span>
                  <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
