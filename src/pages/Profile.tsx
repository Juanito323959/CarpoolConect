import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Mail, Shield, Car, Star, Clock, CheckCircle, XCircle, ChevronRight, Camera, MapPin, DollarSign, Calendar, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { User, Trip, Reservation, Review } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

interface ProfileProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

export const Profile: React.FC<ProfileProps> = ({ currentUser, onUpdateUser }) => {
  const { id } = useParams<{ id?: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'cancelled'>('pending');
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [userReservations, setUserReservations] = useState<Reservation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [pendingRatingTrip, setPendingRatingTrip] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [editForm, setEditForm] = useState({
    name: '',
    photo: '',
    vehicle: {
      model: '',
      color: '',
      plate: ''
    }
  });

  const isOwnProfile = !id || id === currentUser.id;

  useEffect(() => {
    // Load user data
    if (isOwnProfile) {
      setUser(currentUser);
      setEditForm({
        name: currentUser.name,
        photo: currentUser.photo || '',
        vehicle: currentUser.vehicle || { model: '', color: '', plate: '' }
      });
    } else {
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
      const foundUser = allUsers.find(u => u.id === id);
      setUser(foundUser || null);
    }
  }, [id, currentUser, isOwnProfile]);

  const startCamera = async () => {
    setShowCamera(true);
    setShowPhotoOptions(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1024 }, height: { ideal: 1024 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const updatePhoto = (photoDataUrl: string) => {
    setEditForm(prev => ({ ...prev, photo: photoDataUrl }));
    
    const updatedUser: User = {
      ...currentUser,
      photo: photoDataUrl
    };

    // Update users list in localStorage
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
    const updatedUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Update trips if driver changed photo
    if (currentUser.role === 'driver') {
      const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
      const updatedTrips = allTrips.map(t => {
        if (t.driverId === updatedUser.id) {
          return {
            ...t,
            driverPhoto: updatedUser.photo
          };
        }
        return t;
      });
      localStorage.setItem('trips', JSON.stringify(updatedTrips));
    }

    onUpdateUser(updatedUser);
    setUser(updatedUser);
    alert('Foto de perfil actualizada automáticamente');
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const size = Math.min(videoRef.current.videoWidth, videoRef.current.videoHeight);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Center crop the square from the video
        const startX = (videoRef.current.videoWidth - size) / 2;
        const startY = (videoRef.current.videoHeight - size) / 2;
        ctx.drawImage(videoRef.current, startX, startY, size, size, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        updatePhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = () => {
    if (!editForm.name.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      name: editForm.name,
      photo: editForm.photo,
      vehicle: currentUser.role === 'driver' ? editForm.vehicle : undefined
    };

    // Update users list in localStorage
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
    const updatedUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Update trips if driver changed name or photo
    if (currentUser.role === 'driver') {
      const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
      const updatedTrips = allTrips.map(t => {
        if (t.driverId === updatedUser.id) {
          return {
            ...t,
            driverName: updatedUser.name,
            driverPhoto: updatedUser.photo,
            vehicleInfo: updatedUser.vehicle
          };
        }
        return t;
      });
      localStorage.setItem('trips', JSON.stringify(updatedTrips));
    }

    onUpdateUser(updatedUser);
    setIsEditing(false);
    setUser(updatedUser);
    alert('Perfil actualizado con éxito');
  };

  useEffect(() => {
    if (!user) return;

    // Load trips
    const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
    if (user.role === 'driver') {
      setUserTrips(allTrips.filter(t => t.driverId === user.id));
    } else {
      const allRes = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
      const myRes = allRes.filter(r => r.passengerId === user.id);
      setUserReservations(myRes);
      const myTripIds = myRes.map(r => r.tripId);
      setUserTrips(allTrips.filter(t => myTripIds.includes(t.id)));
    }

    // Load reviews
    const allReviews = JSON.parse(localStorage.getItem('reviews') || '[]') as Review[];
    setReviews(allReviews.filter(r => r.toId === user.id));
    setAllTrips(allTrips);

    // Check for pending rating if viewing someone else's profile
    if (!isOwnProfile) {
      const allRes = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
      const myReviews = allReviews.filter(rev => rev.fromId === currentUser.id && rev.toId === user.id);
      
      // Find a completed trip between us
      const completedTripBetweenUs = allTrips.find(t => {
        const isDriverUs = t.driverId === currentUser.id && allRes.some(r => r.tripId === t.id && r.passengerId === user.id && r.status === 'completed');
        const isPassengerUs = t.driverId === user.id && allRes.some(r => r.tripId === t.id && r.passengerId === currentUser.id && r.status === 'completed');
        return isDriverUs || isPassengerUs;
      });

      if (completedTripBetweenUs) {
        const alreadyRated = myReviews.some(rev => rev.tripId === completedTripBetweenUs.id);
        if (!alreadyRated) {
          setPendingRatingTrip(completedTripBetweenUs);
        } else {
          setPendingRatingTrip(null);
        }
      } else {
        setPendingRatingTrip(null);
      }
    }
  }, [user, currentUser.id, isOwnProfile]);

  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">Usuario no encontrado</h2>
      </div>
    );
  }

  const getFilteredTrips = () => {
    if (user.role === 'driver') {
      return userTrips.filter(t => {
        if (activeTab === 'pending') return ['active', 'in_progress', 'arrived'].includes(t.status);
        if (activeTab === 'completed') return t.status === 'completed';
        return t.status === 'cancelled';
      });
    } else {
      return userReservations.filter(r => {
        if (activeTab === 'pending') return ['active', 'in_progress', 'arrived'].includes(r.status);
        if (activeTab === 'completed') return r.status === 'completed';
        return r.status === 'cancelled';
      }).map(r => {
        const trip = userTrips.find(t => t.id === r.tripId);
        return { ...trip, reservationStatus: r.status, reservationId: r.id, reservationDate: r.date } as any;
      }).filter(t => t.id); // Ensure trip exists
    }
  };

  const filteredItems = getFilteredTrips();

  const submitReview = () => {
    if (!selectedTrip && !pendingRatingTrip) return;
    const tripToRate = selectedTrip || pendingRatingTrip;

    const targetId = user.id === currentUser.id 
      ? (user.role === 'driver' ? tripToRate.passengerId : tripToRate.driverId)
      : user.id;
    
    const targetName = user.id === currentUser.id
      ? (user.role === 'driver' ? tripToRate.passengerName : tripToRate.driverName)
      : user.name;

    const newReview: Review = {
      id: Math.random().toString(36).substr(2, 9),
      tripId: tripToRate.id,
      fromId: currentUser.id,
      fromName: currentUser.name,
      toId: targetId,
      rating,
      comment,
      timestamp: new Date().toISOString(),
      type: currentUser.role === 'driver' ? 'driver_to_passenger' : 'passenger_to_driver'
    };

    // Save review
    const allReviews = JSON.parse(localStorage.getItem('reviews') || '[]') as Review[];
    localStorage.setItem('reviews', JSON.stringify([newReview, ...allReviews]));

    // Update target user rating
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
    const updatedUsers = allUsers.map(u => {
      if (u.id === targetId) {
        const currentRating = u.rating || 0;
        const currentTotal = u.totalReviews || 0;
        const newTotal = currentTotal + 1;
        const newRating = ((currentRating * currentTotal) + rating) / newTotal;
        return { ...u, rating: Number(newRating.toFixed(1)), totalReviews: newTotal };
      }
      return u;
    });
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    
    // Update local state if viewing the target's profile
    if (!isOwnProfile && targetId === user.id) {
      setReviews(prev => [newReview, ...prev]);
      setPendingRatingTrip(null);
    }
    
    setShowReviewModal(false);
    setRating(5);
    setComment('');
    setSelectedTrip(null);
    
    alert('¡Reseña enviada con éxito!');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      {/* Header / Hero Section */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[40px] shadow-lg overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        </div>
        
        <div className="px-8 -mt-20 flex flex-col md:flex-row items-end gap-8">
          <div className="relative group">
            <div className="w-40 h-40 bg-white rounded-[40px] p-2 shadow-2xl">
              <div className="w-full h-full bg-gray-100 rounded-[32px] flex items-center justify-center overflow-hidden relative">
                {(isEditing ? editForm.photo : user.photo) ? (
                  <img src={isEditing ? editForm.photo : user.photo} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-16 h-16 text-gray-300" />
                )}
                {isOwnProfile && (
                  <button 
                    onClick={() => setShowPhotoOptions(true)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 border-4 border-white rounded-full" />
          </div>

          <AnimatePresence>
            {showPhotoOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-0 left-48 z-50 bg-white p-4 rounded-3xl shadow-2xl border border-gray-100 space-y-2 min-w-[200px]"
              >
                <div className="flex items-center justify-between mb-2 px-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Cambiar Foto</span>
                  <button onClick={() => setShowPhotoOptions(false)} className="text-gray-400 hover:text-gray-600">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                <label className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group">
                  <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">Subir Imagen</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      handlePhotoUpload(e);
                      setShowPhotoOptions(false);
                    }}
                  />
                </label>
                <button 
                  onClick={startCamera}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all group"
                >
                  <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all">
                    <Camera className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-gray-700 text-left">Tomar Foto</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 pb-4 space-y-2">
            <div className="flex items-center gap-3">
              {isEditing ? (
                <input 
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="text-4xl font-black text-gray-900 bg-black/5 rounded-xl px-4 py-1 outline-none focus:ring-2 focus:ring-indigo-500 w-full max-w-md"
                  placeholder="Tu nombre"
                />
              ) : (
                <h1 className="text-4xl font-black text-gray-900">{user.name}</h1>
              )}
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shrink-0",
                user.role === 'admin' ? "bg-purple-100 text-purple-600" :
                user.role === 'driver' ? "bg-indigo-100 text-indigo-600" : "bg-violet-100 text-violet-600"
              )}>
                {user.role === 'admin' ? 'Administrador' : user.role === 'driver' ? 'Conductor' : 'Pasajero'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user.email}
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                {user.rating || '5.0'} ({user.totalReviews || 0} reseñas)
              </div>
              {user.role === 'driver' && user.vehicle && !isEditing && (
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  {user.vehicle.model} • {user.vehicle.plate}
                </div>
              )}
            </div>

            {isEditing && user.role === 'driver' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Modelo del Vehículo</label>
                  <input 
                    type="text"
                    value={editForm.vehicle.model}
                    onChange={(e) => setEditForm(prev => ({ ...prev, vehicle: { ...prev.vehicle, model: e.target.value } }))}
                    className="w-full p-2 bg-black/5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej. Nissan Versa"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Color</label>
                  <input 
                    type="text"
                    value={editForm.vehicle.color}
                    onChange={(e) => setEditForm(prev => ({ ...prev, vehicle: { ...prev.vehicle, color: e.target.value } }))}
                    className="w-full p-2 bg-black/5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej. Gris"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Placas</label>
                  <input 
                    type="text"
                    value={editForm.vehicle.plate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, vehicle: { ...prev.vehicle, plate: e.target.value } }))}
                    className="w-full p-2 bg-black/5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                    placeholder="MX-123-AB"
                  />
                </div>
              </div>
            )}
          </div>

          {isOwnProfile ? (
            <div className="pb-4 flex gap-3">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={saveProfile}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    Guardar
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-8 py-3 bg-white text-gray-900 rounded-2xl font-bold shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95"
                >
                  Editar Perfil
                </button>
              )}
            </div>
          ) : pendingRatingTrip ? (
            <div className="pb-4">
              <button 
                onClick={() => setShowReviewModal(true)}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
              >
                <Star className="w-5 h-5 fill-white" />
                Calificar
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Left Column: History */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Historial de Viajes</h2>
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              {(['pending', 'completed', 'cancelled'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                    activeTab === tab 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {tab === 'pending' ? 'Pendientes' : tab === 'completed' ? 'Realizados' : 'Cancelados'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {filteredItems.length === 0 ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white p-20 rounded-[40px] border border-dashed border-gray-200 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No hay viajes en esta categoría.</p>
                </motion.div>
              ) : (
                filteredItems.map((item: any) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
                          activeTab === 'pending' ? "bg-indigo-50 text-indigo-600" :
                          activeTab === 'completed' ? "bg-green-50 text-green-600" :
                          "bg-red-50 text-red-600"
                        )}>
                          {activeTab === 'pending' ? <Clock className="w-8 h-8" /> :
                           activeTab === 'completed' ? <CheckCircle className="w-8 h-8" /> :
                           <XCircle className="w-8 h-8" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <span>{item.origin}</span>
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                            <span>{item.destination}</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {item.reservationDate ? (
                                format(new Date(item.reservationDate + 'T00:00:00'), "d 'de' MMM, yyyy", { locale: es })
                              ) : (
                                item.type === 'recurring' ? (
                                  <span>Recurrente</span>
                                ) : (
                                  item.departureTime ? format(new Date(item.departureTime), "d 'de' MMM, HH:mm", { locale: es }) : 'N/A'
                                )
                              )}
                              {item.type === 'recurring' && ` • ${item.departureTime}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5" />
                              {item.pricePerSeat} MXN
                            </span>
                            {user.role === 'passenger' && (
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-3.5 h-3.5" />
                                Conductor: {item.driverName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Link 
                          to={`/trip/${item.id}${item.reservationDate ? `?date=${item.reservationDate}` : ''}`}
                          className="px-6 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
                        >
                          Ver Detalles
                        </Link>
                        {activeTab === 'completed' && isOwnProfile && currentUser.role === 'passenger' && (
                          <button 
                            onClick={() => {
                              setSelectedTrip(item);
                              setShowReviewModal(true);
                            }}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                          >
                            Calificar
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Stats & Reviews */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
            <h3 className="text-xl font-bold text-gray-900">Estadísticas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-indigo-50 rounded-3xl space-y-1">
                <p className="text-2xl font-black text-indigo-600">{userTrips.length}</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Viajes Totales</p>
              </div>
              <div className="p-6 bg-green-50 rounded-3xl space-y-1">
                <p className="text-2xl font-black text-green-600">
                  {userTrips.filter(t => t.status === 'completed').length}
                </p>
                <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Completados</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Reseñas Recientes</h3>
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <div className="text-center py-8 space-y-2 opacity-40">
                  <Star className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-500 font-medium">No hay reseñas todavía.</p>
                </div>
              ) : (
                reviews.map((review) => {
                  const trip = allTrips.find(t => t.id === review.tripId);
                  return (
                    <div key={review.id} className="p-5 bg-gray-50/50 rounded-3xl space-y-4 border border-gray-100/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sm font-bold text-indigo-600 shadow-sm">
                            {review.fromName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{review.fromName}</p>
                            <p className="text-[10px] text-gray-400 font-medium">
                              {review.timestamp ? format(new Date(review.timestamp), "d 'de' MMMM, yyyy", { locale: es }) : 'Reciente'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={cn(
                                  "w-3 h-3",
                                  i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                                )} 
                              />
                            ))}
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-tighter text-gray-400">
                            {review.type === 'driver_to_passenger' ? 'Como pasajero' : 'Como conductor'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 leading-relaxed italic">"{review.comment}"</p>
                        
                        {trip && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-lg border border-gray-100 w-fit">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-500">
                              {trip.origin} <ChevronRight className="inline w-2 h-2" /> {trip.destination}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
          >
            <div className="w-full max-w-lg aspect-square bg-gray-900 rounded-[60px] overflow-hidden relative shadow-2xl border-4 border-white/10">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover mirror"
              />
              
              {/* Camera Overlays */}
              <div className="absolute inset-0 border-[60px] border-black/40 rounded-[60px] pointer-events-none" />
              
              <div className="absolute top-8 left-0 right-0 flex justify-center">
                <div className="px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                  <p className="text-white text-xs font-bold uppercase tracking-widest">Alinea tu rostro</p>
                </div>
              </div>

              <div className="absolute bottom-8 left-0 right-0 px-8 flex items-center justify-between">
                <button 
                  onClick={stopCamera}
                  className="w-14 h-14 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                >
                  <XCircle className="w-6 h-6" />
                </button>
                
                <button 
                  onClick={takePhoto}
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/20"
                >
                  <div className="w-16 h-16 border-4 border-gray-900 rounded-full" />
                </button>

                <div className="w-14 h-14" /> {/* Spacer */}
              </div>
            </div>
            
            <style>{`
              .mirror {
                transform: scaleX(-1);
              }
            `}</style>
          </motion.div>
        )}

        {showReviewModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowReviewModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>

              <div className="text-center space-y-4 mb-8">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto">
                  <Star className="w-10 h-10 text-indigo-600 fill-indigo-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Califica tu viaje</h2>
                  <p className="text-gray-500">¿Cómo fue tu experiencia con {user.id === currentUser.id ? (user.role === 'driver' ? selectedTrip?.passengerName : selectedTrip?.driverName) : user.name}?</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform active:scale-90"
                    >
                      <Star 
                        className={cn(
                          "w-10 h-10 transition-colors",
                          star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                        )} 
                      />
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Tu comentario</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escribe algo sobre el viaje..."
                    className="w-full p-4 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none min-h-[120px] resize-none"
                  />
                </div>

                <button 
                  onClick={submitReview}
                  className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                >
                  Enviar Reseña
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
