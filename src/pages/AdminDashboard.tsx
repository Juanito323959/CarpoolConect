import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Car, 
  Trash2, 
  Shield, 
  Search, 
  Filter, 
  ChevronRight, 
  AlertCircle,
  TrendingUp,
  MapPin,
  Calendar,
  Star,
  User as UserIcon,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { User, Trip, Reservation } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, getRecurrenceDescription } from '../lib/utils';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'trips' | 'stats'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'driver' | 'passenger' | 'admin'>('all');

  useEffect(() => {
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
    const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
    setUsers(allUsers);
    setTrips(allTrips);
  }, []);

  const deleteUser = (userId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      const updatedUsers = users.filter(u => u.id !== userId);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      
      // Also delete their trips if they are a driver
      const updatedTrips = trips.filter(t => t.driverId !== userId);
      localStorage.setItem('trips', JSON.stringify(updatedTrips));
      setTrips(updatedTrips);
    }
  };

  const deleteTrip = (tripId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este viaje?')) {
      const updatedTrips = trips.filter(t => t.id !== tripId);
      localStorage.setItem('trips', JSON.stringify(updatedTrips));
      setTrips(updatedTrips);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredTrips = trips.filter(t => {
    return t.origin.toLowerCase().includes(searchTerm.toLowerCase()) || 
           t.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
           t.driverName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Panel de Control</h1>
          <p className="text-gray-500 font-medium">Administración general del sistema CarpoolConnect</p>
        </div>

        <div className="flex bg-white p-1.5 rounded-[24px] shadow-sm border border-gray-100">
          {(['users', 'trips', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchTerm('');
              }}
              className={cn(
                "px-8 py-3 rounded-[18px] text-xs font-bold uppercase tracking-widest transition-all",
                activeTab === tab 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              {tab === 'users' ? 'Usuarios' : tab === 'trips' ? 'Viajes' : 'Estadísticas'}
            </button>
          ))}
        </div>
      </div>

      {activeTab !== 'stats' && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder={activeTab === 'users' ? "Buscar por nombre o email..." : "Buscar por origen, destino o conductor..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-3xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-medium"
            />
          </div>
          {activeTab === 'users' && (
            <div className="flex bg-white p-1.5 rounded-3xl shadow-sm border border-gray-100 shrink-0">
              {(['all', 'driver', 'passenger', 'admin'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={cn(
                    "px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all",
                    filterRole === role 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {role === 'all' ? 'Todos' : role === 'driver' ? 'Conductores' : role === 'passenger' ? 'Pasajeros' : 'Admins'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'users' && (
          <motion.div 
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white p-6 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => deleteUser(user.id)}
                    className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
                    title="Eliminar usuario"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden">
                    {user.photo ? (
                      <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{user.name}</h3>
                    <p className="text-xs text-gray-500 font-medium">{user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Rol</p>
                    <span className={cn(
                      "text-xs font-bold uppercase",
                      user.role === 'admin' ? "text-purple-600" :
                      user.role === 'driver' ? "text-indigo-600" : "text-violet-600"
                    )}>
                      {user.role}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-gray-900">{user.rating || '5.0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'trips' && (
          <motion.div 
            key="trips"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {filteredTrips.map((trip) => (
              <div key={trip.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                    <Car className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                      <span>{trip.origin}</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                      <span>{trip.destination}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {trip.type === 'recurring' ? (
                          <span className="text-indigo-600 font-bold">
                            {getRecurrenceDescription(trip.recurringDays)} • {trip.departureTime}
                          </span>
                        ) : (
                          format(new Date(trip.departureTime), "d 'de' MMM, HH:mm", { locale: es })
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5" />
                        Conductor: {trip.driverName}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        trip.status === 'active' ? "bg-green-100 text-green-600" :
                        trip.status === 'completed' ? "bg-indigo-100 text-indigo-600" :
                        "bg-red-100 text-red-600"
                      )}>
                        {trip.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className="text-lg font-black text-gray-900">{trip.pricePerSeat} MXN</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Por asiento</p>
                  </div>
                  <button 
                    onClick={() => deleteTrip(trip.id)}
                    className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div 
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-4xl font-black text-gray-900">{users.length}</p>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Usuarios Totales</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <p className="text-4xl font-black text-gray-900">{trips.length}</p>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Viajes Publicados</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-4xl font-black text-gray-900">
                  {trips.filter(t => t.status === 'completed').length}
                </p>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Viajes Exitosos</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-4xl font-black text-gray-900">
                  {trips.filter(t => t.status === 'cancelled').length}
                </p>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Cancelaciones</p>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-4 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Actividad Reciente</h3>
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="space-y-4">
                {trips.slice(0, 5).map(trip => (
                  <div key={trip.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                        <Car className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Nuevo viaje publicado</p>
                        <p className="text-xs text-gray-500">{trip.origin} → {trip.destination}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                      {trip.type === 'recurring' ? getRecurrenceDescription(trip.recurringDays) : format(new Date(trip.departureTime), "d MMM", { locale: es })}
                    </p>
                  </div>
                ))}
                {users.slice(0, 3).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Nuevo usuario registrado</p>
                        <p className="text-xs text-gray-500">{user.name} ({user.role})</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Reciente</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
