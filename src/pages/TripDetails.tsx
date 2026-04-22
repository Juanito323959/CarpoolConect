import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Calendar, Clock, Users, DollarSign, ChevronRight, ArrowLeft, CheckCircle2, AlertCircle, Car as CarIcon, Info, MessageSquare, XCircle, Trash2, Navigation } from 'lucide-react';
import { Trip, User, Reservation } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, getRecurrenceDescription } from '../lib/utils';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useNotifications } from '../NotificationContext';

interface TripDetailsProps {
  user: User | null;
}

const containerStyle = {
  width: '100%',
  height: '300px'
};

export const TripDetails: React.FC<TripDetailsProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const selectedDate = queryParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [hasReservation, setHasReservation] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [isPaying, setIsPaying] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [existingReservation, setExistingReservation] = useState<Reservation | null>(null);
  const { addNotification } = useNotifications();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "" // Empty for demo, will show basic map or fallback
  });

  useEffect(() => {
    const fetchTrip = () => {
      const savedTrips = localStorage.getItem('trips');
      const savedReservations = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];

      if (savedTrips) {
        const allTrips = JSON.parse(savedTrips) as Trip[];
        const foundTrip = allTrips.find(t => t.id === id);
        if (foundTrip) {
          // Calculate available seats for the specific date
          const occupiedSeats = savedReservations.filter(r => 
            r.tripId === id && r.date === selectedDate && r.status === 'active'
          ).length;
          
          setTrip({
            ...foundTrip,
            availableSeats: foundTrip.totalSeats - occupiedSeats
          });
        }
      }
    };

    fetchTrip();
    const interval = setInterval(fetchTrip, 3000); // Poll every 3 seconds for location updates

    if (user && id) {
      const savedReservations = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
      const existingRes = savedReservations.find(r => 
        r.tripId === id && r.passengerId === user.id && (r.date === selectedDate || (r.selectedDays && r.selectedDays.length > 0))
      );
      if (existingRes) {
        setHasReservation(true);
        setExistingReservation(existingRes);
      }
    }

    return () => clearInterval(interval);
  }, [id, user, selectedDate]);

  useEffect(() => {
    if (isLoaded && trip?.coordinates) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: trip.coordinates.origin,
          destination: trip.coordinates.destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDirections(result);
          }
        }
      );
    }
  }, [isLoaded, trip]);

  const handleBooking = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'passenger') {
      setError('Solo los pasajeros pueden reservar asientos.');
      return;
    }

    if (!trip || trip.availableSeats <= 0) {
      setError('No hay asientos disponibles en este viaje.');
      return;
    }

    if (trip.type === 'recurring' && selectedDays.length === 0) {
      setError('Por favor selecciona al menos un día.');
      return;
    }

    setIsBooking(true);
    
    // Simulate payment if card
    const paymentDelay = paymentMethod === 'card' ? 2500 : 1000;
    
    setTimeout(() => {
      const reservation: Reservation = {
        id: Math.random().toString(36).substr(2, 9),
        tripId: trip.id,
        passengerId: user.id,
        passengerName: user.name,
        seatsReserved: 1,
        date: selectedDate,
        selectedDays: trip.type === 'recurring' ? selectedDays : undefined,
        timestamp: new Date().toISOString(),
        paymentMethod,
        paymentStatus: paymentMethod === 'card' ? 'completed' : 'pending',
        status: 'active'
      };
      
      const allReservations = JSON.parse(localStorage.getItem('reservations') || '[]');
      localStorage.setItem('reservations', JSON.stringify([...allReservations, reservation]));
      
      // Notify driver
      const driverNotifications = JSON.parse(localStorage.getItem(`notifications_${trip.driverId}`) || '[]');
      const dateInfo = trip.type === 'recurring' 
        ? `Días: ${selectedDays.map(d => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d]).join(', ')}`
        : `Fecha: ${format(new Date(selectedDate + 'T00:00:00'), 'PPP', { locale: es })}`;

      const newNotif = {
        id: Math.random().toString(36).substr(2, 9),
        userId: trip.driverId,
        title: 'Nueva Reserva',
        message: `${user.name} ha reservado un asiento para tu viaje de ${trip.origin} a ${trip.destination}. ${dateInfo}. Pago: ${paymentMethod === 'card' ? 'Tarjeta (Pagado)' : 'Efectivo (Pendiente)'}`,
        type: 'booking',
        tripId: trip.id,
        timestamp: new Date().toISOString(),
        isRead: false
      };
      localStorage.setItem(`notifications_${trip.driverId}`, JSON.stringify([newNotif, ...driverNotifications]));

      setTrip({ ...trip, availableSeats: trip.availableSeats - 1 });
      setIsBooking(false);
      setBookingSuccess(true);
      setHasReservation(true);
      setExistingReservation(reservation);
    }, paymentDelay);
  };

  const handleCancelReservation = () => {
    if (!user || !trip) return;
    
    setIsCancelling(true);
    
    setTimeout(() => {
      const savedReservations = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
      const updatedReservations = savedReservations.filter(r => 
        !(r.tripId === id && r.passengerId === user.id && r.date === selectedDate)
      );
      
      localStorage.setItem('reservations', JSON.stringify(updatedReservations));
      
      // Notify driver about cancellation
      const driverNotifications = JSON.parse(localStorage.getItem(`notifications_${trip.driverId}`) || '[]');
      const cancelNotif = {
        id: Math.random().toString(36).substr(2, 9),
        userId: trip.driverId,
        title: 'Reserva Cancelada',
        message: `${user.name} ha cancelado su reserva para tu viaje de ${trip.origin} a ${trip.destination} el ${format(new Date(selectedDate + 'T00:00:00'), 'PPP', { locale: es })}.`,
        type: 'cancellation',
        tripId: trip.id,
        timestamp: new Date().toISOString(),
        isRead: false
      };
      localStorage.setItem(`notifications_${trip.driverId}`, JSON.stringify([cancelNotif, ...driverNotifications]));

      setTrip({ ...trip, availableSeats: trip.availableSeats + 1 });
      setHasReservation(false);
      setBookingSuccess(false);
      setIsCancelling(false);
      setShowCancelConfirm(false);
      
      addNotification({
        userId: user.id,
        title: 'Reserva cancelada',
        message: 'Tu reserva ha sido cancelada con éxito.',
        type: 'cancellation'
      });
    }, 1500);
  };

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center animate-pulse" />
        <p className="text-gray-500 font-medium">Cargando detalles del viaje...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-medium group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Volver a la búsqueda
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-10 overflow-hidden"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-indigo-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Ruta en México</p>
                  <div className="flex items-center gap-3 text-3xl font-black text-gray-900">
                    <span>{trip.origin}</span>
                    <ChevronRight className="w-8 h-8 text-gray-200" />
                    <span>{trip.destination}</span>
                  </div>
                </div>
              </div>

              {/* Map Section */}
              <div className="rounded-3xl overflow-hidden border border-gray-100 h-[300px] bg-gray-50 relative">
                {trip.status === 'in_progress' && (
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full" />
                    En Vivo
                  </div>
                )}
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={trip.coordinates?.origin || { lat: 19.4326, lng: -99.1332 }}
                    zoom={10}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                    }}
                  >
                    {directions && <DirectionsRenderer directions={directions} />}
                    {!directions && trip.coordinates && (
                      <>
                        <Marker position={trip.coordinates.origin} label="A" />
                        <Marker position={trip.coordinates.destination} label="B" />
                      </>
                    )}
                    {trip.currentLocation && (
                      <Marker 
                        position={trip.currentLocation} 
                        icon={{
                          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                          scale: 6,
                          fillColor: "#4f46e5",
                          fillOpacity: 1,
                          strokeWeight: 2,
                          strokeColor: "#ffffff",
                          rotation: 0 // Could be improved with heading
                        }}
                        label={{
                          text: "Conductor",
                          className: "bg-white px-2 py-1 rounded shadow-sm text-[10px] font-bold text-indigo-600 -mt-12"
                        }}
                      />
                    )}
                  </GoogleMap>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium">
                    Cargando mapa...
                  </div>
                )}
              </div>

              {trip.pickupDescription && (
                <div className="p-6 bg-yellow-50 rounded-3xl border border-yellow-100 flex items-start gap-4">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                    <Info className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-700 font-bold uppercase tracking-wider">Punto de encuentro</p>
                    <p className="text-gray-700 leading-relaxed">{trip.pickupDescription}</p>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-8 pt-8 border-t border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Fecha</p>
                    <p className="font-bold text-gray-900">
                      {trip.type === 'recurring' 
                        ? format(new Date(selectedDate + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })
                        : format(new Date(trip.departureTime), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    {trip.type === 'recurring' && (
                      <p className="text-xs text-indigo-600 font-bold uppercase mt-1">
                        {getRecurrenceDescription(trip.recurringDays)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Hora de salida</p>
                    <p className="font-bold text-gray-900">
                      {trip.type === 'recurring' ? trip.departureTime : format(new Date(trip.departureTime), "HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 pt-10 border-t border-gray-50">
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Conductor
                </h3>
                <Link 
                  to={`/profile/${trip.driverId}`}
                  className="flex items-center gap-4 p-6 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-all group"
                >
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <span className="text-xl font-bold text-indigo-600">{trip.driverName.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">{trip.driverName}</p>
                    <p className="text-sm text-gray-500">Conductor verificado • 4.8 ★</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                </Link>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <CarIcon className="w-5 h-5 text-indigo-600" />
                  Vehículo
                </h3>
                <div className="p-6 bg-indigo-50/50 rounded-3xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase">Modelo</span>
                    <span className="font-bold text-gray-900">{trip.vehicleInfo?.model || 'Auto Económico'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase">Color</span>
                    <span className="font-bold text-gray-900">{trip.vehicleInfo?.color || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase">Placas</span>
                    <span className="px-2 py-1 bg-white rounded-lg font-mono font-bold text-indigo-600 text-sm shadow-sm">
                      {trip.vehicleInfo?.plate || '--- ---'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-indigo-500/5 sticky top-24"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 font-medium">Precio por asiento</p>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-3xl font-black text-indigo-600">
                    <DollarSign className="w-6 h-6" />
                    {trip.pricePerSeat}
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Pesos Mexicanos (MXN)</span>
                </div>
              </div>

              <div className="p-6 bg-indigo-50 rounded-3xl space-y-2">
                <div className="flex items-center justify-between text-indigo-900">
                  <span className="font-medium">Estado del viaje</span>
                  <span className={cn(
                    "font-bold uppercase text-[10px] px-2 py-1 rounded-md",
                    trip.status === 'active' ? "bg-indigo-100 text-indigo-600" :
                    trip.status === 'in_progress' ? "bg-blue-100 text-blue-600 animate-pulse" :
                    trip.status === 'arrived' ? "bg-orange-100 text-orange-600" :
                    trip.status === 'completed' ? "bg-green-100 text-green-600" :
                    "bg-red-100 text-red-600"
                  )}>
                    {trip.status === 'active' ? 'Publicado' :
                     trip.status === 'in_progress' ? 'En Curso' :
                     trip.status === 'arrived' ? 'Llegó a Destino' :
                     trip.status === 'completed' ? 'Finalizado' : 'Cancelado'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-indigo-900 mt-4">
                  <span className="font-medium">Asientos disponibles</span>
                  <span className="font-bold">{trip.availableSeats} / {trip.totalSeats}</span>
                </div>
                <div className="w-full h-2 bg-indigo-200 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${(trip.availableSeats / trip.totalSeats) * 100}%` }}
                  />
                </div>
              </div>

              {!bookingSuccess && !hasReservation && trip.type === 'recurring' && trip.recurringDays && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-900 ml-1">Selecciona los días</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 0, name: 'Dom' },
                      { id: 1, name: 'Lun' },
                      { id: 2, name: 'Mar' },
                      { id: 3, name: 'Mié' },
                      { id: 4, name: 'Jue' },
                      { id: 5, name: 'Vie' },
                      { id: 6, name: 'Sáb' },
                    ].filter(d => trip.recurringDays?.includes(d.id)).map(day => (
                      <button
                        key={day.id}
                        onClick={() => {
                          setSelectedDays(prev => 
                            prev.includes(day.id) 
                              ? prev.filter(d => d !== day.id) 
                              : [...prev, day.id]
                          );
                        }}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                          selectedDays.includes(day.id)
                            ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                            : "border-gray-100 text-gray-400 hover:border-indigo-100"
                        )}
                      >
                        {day.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!bookingSuccess && !hasReservation && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-900 ml-1">Método de Pago</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        paymentMethod === 'cash' 
                          ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                          : "border-gray-100 hover:border-gray-200 text-gray-500"
                      )}
                    >
                      <DollarSign className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase">Efectivo</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        paymentMethod === 'card' 
                          ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                          : "border-gray-100 hover:border-gray-200 text-gray-500"
                      )}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase">Tarjeta</span>
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {bookingSuccess || hasReservation ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-green-50 p-6 rounded-3xl flex flex-col items-center text-center gap-3">
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                      <p className="text-green-800 font-bold">
                        {bookingSuccess ? '¡Reserva confirmada!' : 'Ya tienes una reserva'}
                      </p>
                      {existingReservation?.selectedDays && (
                        <p className="text-green-700 text-xs font-medium">
                          Has reservado los días: {existingReservation.selectedDays.map(d => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d]).join(', ')} con este conductor
                        </p>
                      )}
                      <p className="text-green-600 text-sm">
                        {bookingSuccess 
                          ? 'Tu asiento ha sido reservado con éxito.' 
                          : 'Puedes contactar al conductor para coordinar los detalles.'}
                      </p>
                    </div>
                    <button 
                      onClick={() => navigate(`/chat/${trip.id}/${trip.driverId}`)}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                      <MessageSquare className="w-5 h-5" />
                      Contactar al conductor
                    </button>
                    
                    <button 
                      onClick={() => setShowCancelConfirm(true)}
                      className="w-full py-4 bg-white text-red-600 border-2 border-red-100 rounded-2xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Cancelar reserva
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {error && (
                      <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                    <button 
                      onClick={handleBooking}
                      disabled={isBooking || trip.availableSeats === 0 || trip.status !== 'active'}
                      className={cn(
                        "w-full py-5 rounded-3xl font-bold text-lg transition-all flex items-center justify-center gap-3",
                        (trip.availableSeats === 0 || trip.status !== 'active')
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                      )}
                    >
                      {isBooking ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        trip.status !== 'active' ? 'Viaje ya iniciado/finalizado' :
                        trip.availableSeats === 0 ? 'Sin asientos' : (trip.type === 'recurring' ? 'Reservar estos días' : 'Reservar asiento')
                      )}
                    </button>
                    <div className="flex items-start gap-2 p-4 bg-gray-50 rounded-2xl">
                      <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        Al reservar, aceptas nuestras políticas de cancelación y términos de servicio en México.
                      </p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCancelling && setShowCancelConfirm(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-gray-900">¿Cancelar reserva?</h3>
                <p className="text-gray-500 leading-relaxed">
                  Esta acción liberará tu asiento y notificará al conductor. ¿Estás seguro de que deseas continuar?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={isCancelling}
                  onClick={() => setShowCancelConfirm(false)}
                  className="py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  No, volver
                </button>
                <button
                  disabled={isCancelling}
                  onClick={handleCancelReservation}
                  className="py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    'Sí, cancelar'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
