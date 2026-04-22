import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Shield, Clock, Users, ArrowRight, Plus, MapPin, DollarSign, Trash2, ChevronRight, X, MessageSquare, Navigation, Locate, Star, XCircle, Check } from 'lucide-react';
import { User, Trip, Reservation, Review } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, getCoords, getRecurrenceDescription, calculateDistance } from '../lib/utils';
import { GoogleMap, useJsApiLoader, Marker, DirectionsService, DirectionsRenderer, Autocomplete } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '300px'
};

const defaultCenter = {
  lat: 22.7709,
  lng: -102.5832 // Zacatecas center
};

interface DriverDashboardProps {
  user: User;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTrip, setNewTrip] = useState({
    origin: '',
    destination: '',
    departureTime: '',
    totalSeats: 4,
    pricePerSeat: 0,
    type: 'unique' as 'unique' | 'recurring',
    recurringDays: [] as number[],
    coordinates: {
      origin: null as { lat: number; lng: number } | null,
      destination: null as { lat: number; lng: number } | null
    },
    pickupDescription: ''
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectingPoint, setSelectingPoint] = useState<'origin' | 'destination' | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [sharingLocation, setSharingLocation] = useState<Record<string, number>>({}); // tripId -> watchId
  const [viewingPassengers, setViewingPassengers] = useState<{ tripId: string, day?: number } | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "", // Empty for demo
    libraries: ['places']
  });

  const daysOfWeek = [
    { id: 0, name: 'Dom' },
    { id: 1, name: 'Lun' },
    { id: 2, name: 'Mar' },
    { id: 3, name: 'Mié' },
    { id: 4, name: 'Jue' },
    { id: 5, name: 'Vie' },
    { id: 6, name: 'Sáb' },
  ];

  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // Escuchar ubicación permanentemente para conductores en cuanto inician
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error("Error geolocalización driver:", error),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    const savedTrips = localStorage.getItem('trips');
    if (savedTrips) {
      const allTrips = JSON.parse(savedTrips) as Trip[];
      setTrips(allTrips.filter(t => t.driverId === user.id));
    }

    const savedReservations = localStorage.getItem('reservations');
    if (savedReservations) {
      const allRes = JSON.parse(savedReservations) as Reservation[];
      // Filter reservations for this driver's trips
      const myTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
      const myTripIds = myTrips.filter(t => t.driverId === user.id).map(t => t.id);
      setReservations(allRes.filter(r => myTripIds.includes(r.tripId)));
    }
  }, [user.id]);

  useEffect(() => {
    if (isAdding) {
      const fetchCoords = currentLocation || (navigator.geolocation ? undefined : null);
      
      const processCoords = (coords: {lat: number, lng: number}) => {
        setNewTrip(prev => ({
          ...prev,
          coordinates: { ...prev.coordinates, origin: coords }
        }));

        if (window.google && window.google.maps) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: coords }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const placeName = extractPlaceName(results);
              setNewTrip(prev => ({
                ...prev,
                origin: placeName || results[0].formatted_address
              }));
            }
          });
        }
      };

      if (fetchCoords) {
        processCoords(fetchCoords);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => processCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
          (error) => console.error("Error getting current location:", error),
          { enableHighAccuracy: true }
        );
      }
    }
  }, [isAdding, currentLocation]);

  const handleAddTrip = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trip: Trip = {
      id: Math.random().toString(36).substr(2, 9),
      driverId: user.id,
      driverName: user.name,
      vehicleInfo: user.vehicle,
      ...newTrip,
      availableSeats: newTrip.totalSeats,
      status: 'active',
      recurringDayStatus: newTrip.type === 'recurring' 
        ? newTrip.recurringDays.reduce((acc, day) => ({ ...acc, [day]: 'pending' }), {})
        : undefined,
      coordinates: {
        origin: newTrip.coordinates.origin || getCoords(newTrip.origin),
        destination: newTrip.coordinates.destination || getCoords(newTrip.destination)
      }
    };

    const allTrips = JSON.parse(localStorage.getItem('trips') || '[]');
    const updatedAllTrips = [...allTrips, trip];
    localStorage.setItem('trips', JSON.stringify(updatedAllTrips));
    
    setTrips([...trips, trip]);
    setIsAdding(false);
    setNewTrip({
      origin: '',
      destination: '',
      departureTime: '',
      totalSeats: 4,
      pricePerSeat: 0,
      type: 'unique',
      recurringDays: [],
      coordinates: { origin: null, destination: null },
      pickupDescription: ''
    });
    setDirections(null);
  };

  const [originAutocomplete, setOriginAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [destAutocomplete, setDestAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const extractPlaceNameFromAutocomplete = (place: google.maps.places.PlaceResult) => {
    let street = '';
    let locality = '';
    let sublocality = '';
    let neighborhood = '';

    place.address_components?.forEach(c => {
      if (c.types.includes('route')) street = c.long_name;
      if (c.types.includes('locality')) locality = c.long_name;
      if (c.types.includes('sublocality')) sublocality = c.long_name;
      if (c.types.includes('neighborhood')) neighborhood = c.long_name;
      if (c.types.includes('administrative_area_level_2')) {
        if (!locality) locality = c.long_name;
      }
    });

    const cityOrTown = neighborhood || sublocality || locality || '';

    if (street && cityOrTown) {
      return `${street}, ${cityOrTown}`;
    } else if (cityOrTown) {
      return cityOrTown;
    } else if (street) {
      return street;
    }

    return place.name || place.formatted_address || '';
  };

  const onOriginPlaceChanged = () => {
    if (originAutocomplete) {
      const place = originAutocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const coords = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        
        const name = extractPlaceNameFromAutocomplete(place);

        setNewTrip(prev => ({
          ...prev,
          origin: name,
          coordinates: { ...prev.coordinates, origin: coords }
        }));
      }
    }
  };

  const onDestPlaceChanged = () => {
    if (destAutocomplete) {
      const place = destAutocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const coords = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        
        const name = extractPlaceNameFromAutocomplete(place);

        setNewTrip(prev => ({
          ...prev,
          destination: name,
          coordinates: { ...prev.coordinates, destination: coords }
        }));
      }
    }
  };

  const extractPlaceName = (results: google.maps.GeocoderResult[]) => {
    if (!results || results.length === 0) return null;

    const firstResult = results[0];
    let street = '';
    let locality = '';
    let sublocality = '';
    let neighborhood = '';

    // Find street and locality in components
    for (const component of firstResult.address_components) {
      if (component.types.includes('route')) {
        street = component.long_name;
      }
      if (component.types.includes('locality')) {
        locality = component.long_name;
      }
      if (component.types.includes('sublocality')) {
        sublocality = component.long_name;
      }
      if (component.types.includes('neighborhood')) {
        neighborhood = component.long_name;
      }
      if (component.types.includes('administrative_area_level_2')) {
        if (!locality) locality = component.long_name;
      }
    }

    const cityOrTown = neighborhood || sublocality || locality || '';

    if (street && cityOrTown) {
      return `${street}, ${cityOrTown}`;
    } else if (cityOrTown) {
      return cityOrTown;
    } else if (street) {
      return street;
    }

    // Fallback: Use the first part of the formatted address
    const parts = firstResult.formatted_address.split(',');
    return parts.length > 1 ? `${parts[0].trim()}, ${parts[1].trim()}` : firstResult.formatted_address;
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!selectingPoint || !e.latLng) return;

    const currentPoint = selectingPoint;
    const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    
    setNewTrip(prev => ({
      ...prev,
      [currentPoint]: 'Obteniendo dirección...',
      coordinates: {
        ...prev.coordinates,
        [currentPoint]: coords
      }
    }));

    // Try to reverse geocode
    if (window.google && window.google.maps) {
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ location: coords }, (results, status) => {
        if (status === 'OK' && results) {
          const placeName = extractPlaceName(results);
          setNewTrip(prev => ({
            ...prev,
            [currentPoint]: placeName || 'Ubicación seleccionada'
          }));
        } else {
          // Fallback to generic text if geocoding fails
          setNewTrip(prev => ({
            ...prev,
            [currentPoint]: 'Ubicación seleccionada'
          }));
        }
      });
    }

    setSelectingPoint(null);
  };

  useEffect(() => {
    if (isLoaded && newTrip.coordinates.origin && newTrip.coordinates.destination) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: newTrip.coordinates.origin,
          destination: newTrip.coordinates.destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDirections(result);
          }
        }
      );
    } else {
      setDirections(null);
    }
  }, [isLoaded, newTrip.coordinates.origin, newTrip.coordinates.destination]);

  const handleCancelTrip = (id: string) => {
    const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
    const updatedAllTrips = allTrips.map(t => t.id === id ? { ...t, status: 'cancelled' as const } : t);
    localStorage.setItem('trips', JSON.stringify(updatedAllTrips));
    
    const cancelledTrip = allTrips.find(t => t.id === id);
    if (cancelledTrip) {
      // Notify all passengers of this trip
      const allReservations = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
      const tripReservations = allReservations.filter(r => r.tripId === id);
      
      tripReservations.forEach(res => {
        const passengerNotifications = JSON.parse(localStorage.getItem(`notifications_${res.passengerId}`) || '[]');
        const newNotif = {
          id: Math.random().toString(36).substr(2, 9),
          userId: res.passengerId,
          title: 'Viaje Cancelado',
          message: `El viaje de ${cancelledTrip.origin} a ${cancelledTrip.destination} ha sido cancelado por el conductor.`,
          type: 'cancellation',
          tripId: id,
          timestamp: new Date().toISOString(),
          isRead: false
        };
        localStorage.setItem(`notifications_${res.passengerId}`, JSON.stringify([newNotif, ...passengerNotifications]));
      });
    }

    setTrips(updatedAllTrips.filter(t => t.driverId === user.id));
  };

  const [isSimulating, setIsSimulating] = useState<Record<string, boolean>>({});

  const toggleSimulation = (tripId: string) => {
    if (isSimulating[tripId]) {
      setIsSimulating(prev => ({ ...prev, [tripId]: false }));
      return;
    }

    setIsSimulating(prev => ({ ...prev, [tripId]: true }));
    
    // Start the simulation loop
    const simulate = () => {
      setTrips(prevTrips => {
        const tripIndex = prevTrips.findIndex(t => t.id === tripId);
        if (tripIndex === -1) return prevTrips;
        
        const trip = prevTrips[tripIndex];
        if (!trip.coordinates?.origin || !trip.coordinates?.destination || !trip.currentLocation) return prevTrips;
        
        // Move towards destination by 0.5% each second
        const step = 0.005;
        const latDiff = trip.coordinates.destination.lat - trip.currentLocation.lat;
        const lngDiff = trip.coordinates.destination.lng - trip.currentLocation.lng;
        
        const newLocation = {
          lat: trip.currentLocation.lat + (latDiff * step),
          lng: trip.currentLocation.lng + (lngDiff * step)
        };

        const updatedTrips = [...prevTrips];
        updatedTrips[tripIndex] = { ...trip, currentLocation: newLocation };

        // Save to localStorage
        const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
        const updatedAll = allTrips.map(t => t.id === tripId ? { ...t, currentLocation: newLocation } : t);
        localStorage.setItem('trips', JSON.stringify(updatedAll));

        // Check for arrival
        const dist = calculateDistance(newLocation.lat, newLocation.lng, trip.coordinates.destination.lat, trip.coordinates.destination.lng);
        if (dist < 0.2) {
          setIsSimulating(prev => ({ ...prev, [tripId]: false }));
          if (trip.type === 'unique') {
            handleArriveTrip(tripId, true);
          } else {
            // Find active day
            Object.entries(trip.recurringDayStatus || {}).forEach(([day, status]) => {
              if (status === 'in_progress') handleArriveDayTrip(tripId, parseInt(day), true);
            });
          }
          return updatedTrips;
        }

        return updatedTrips;
      });
    };

    const interval = setInterval(() => {
      // Use ref-like state to check if we should stop
      const trips_data = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
      const active_trip = trips_data.find(t => t.id === tripId);
      
      // Stop condition: manually stopped or trip reached terminal state
      if (!active_trip || (active_trip.status === 'arrived' || active_trip.status === 'completed')) {
        clearInterval(interval);
        setIsSimulating(prev => ({ ...prev, [tripId]: false }));
        return;
      }

      simulate();
    }, 1000);
  };
  const toggleLocationSharing = (tripId: string) => {
    if (sharingLocation[tripId]) {
      navigator.geolocation.clearWatch(sharingLocation[tripId]);
      setSharingLocation(prev => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
    } else {
      if (!navigator.geolocation) {
        alert('La geolocalización no está soportada por tu navegador.');
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Update trip in localStorage
          const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
          const updatedAllTrips = allTrips.map(t => {
            // Only update if not simulating this trip
            if (t.id === tripId && !isSimulating[tripId]) {
              return { ...t, currentLocation: coords };
            }
            return t;
          });
          localStorage.setItem('trips', JSON.stringify(updatedAllTrips));
          
          // Update local state
          const currentTrips = updatedAllTrips.filter(t => t.driverId === user.id);
          setTrips(currentTrips);

          // AUTO-ARRIVAL LOGIC
          const currentTrip = currentTrips.find(t => t.id === tripId);
          if (currentTrip && currentTrip.coordinates?.destination) {
            const dest = currentTrip.coordinates.destination;
            const dist = calculateDistance(coords.lat, coords.lng, dest.lat, dest.lng);
            
            // If less than 200 meters from destination
            if (dist < 0.2) {
              if (currentTrip.type === 'unique' && currentTrip.status === 'in_progress') {
                handleArriveTrip(tripId, true);
              } else if (currentTrip.type === 'recurring' && currentTrip.recurringDayStatus) {
                // Find which day is currently in_progress
                Object.entries(currentTrip.recurringDayStatus).forEach(([dayStr, status]) => {
                  if (status === 'in_progress') {
                    handleArriveDayTrip(tripId, parseInt(dayStr), true);
                  }
                });
              }
            }
          }
        },
        (error) => {
          console.error('Error sharing location:', error);
          alert('Error al obtener la ubicación. Asegúrate de dar permisos.');
          toggleLocationSharing(tripId); // Stop sharing on error
        },
        { enableHighAccuracy: true }
      );

      setSharingLocation(prev => ({ ...prev, [tripId]: watchId }));
    }
  };

  // Cleanup watches on unmount
  useEffect(() => {
    return () => {
      Object.values(sharingLocation).forEach(id => navigator.geolocation.clearWatch(id));
    };
  }, [sharingLocation]);

  const handleCompleteTrip = (id: string) => {
    const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
    const completedTrip = allTrips.find(t => t.id === id);
    
    if (completedTrip) {
      // Calculate commission based on distance
      let distance = 0;
      if (completedTrip.coordinates?.origin && completedTrip.coordinates?.destination) {
        distance = calculateDistance(
          completedTrip.coordinates.origin.lat,
          completedTrip.coordinates.origin.lng,
          completedTrip.coordinates.destination.lat,
          completedTrip.coordinates.destination.lng
        );
      }
      
      // Minimal commission: $2 base + $0.10 per km (approx)
      const commissionPerSeat = Math.max(2, Math.round(distance * 0.1));

      const updatedAllTrips = allTrips.map(t => t.id === id ? { ...t, status: 'completed' as const } : t);
      localStorage.setItem('trips', JSON.stringify(updatedAllTrips));
      
      // Update all reservations for this trip to completed
      const allReservations = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
      const updatedReservations = allReservations.map(r => 
        r.tripId === id ? { 
          ...r, 
          status: 'completed' as const, 
          paymentStatus: 'completed' as const,
          commissionFee: commissionPerSeat * r.seatsReserved
        } : r
      );
      localStorage.setItem('reservations', JSON.stringify(updatedReservations));

      // Update local reservations state
      const myTripIds = updatedAllTrips.filter(t => t.driverId === user.id).map(t => t.id);
      setReservations(updatedReservations.filter(r => myTripIds.includes(r.tripId)));
      setTrips(updatedAllTrips.filter(t => t.driverId === user.id));

      // Notify all passengers of this trip
      const tripReservations = allReservations.filter(r => r.tripId === id);
      tripReservations.forEach(res => {
        const passengerNotifications = JSON.parse(localStorage.getItem(`notifications_${res.passengerId}`) || '[]');
        const newNotif = {
          id: Math.random().toString(36).substr(2, 9),
          userId: res.passengerId,
          title: 'Viaje Finalizado',
          message: `El conductor ha finalizado el viaje de ${completedTrip.origin} a ${completedTrip.destination}. ¡Esperamos que hayas tenido un excelente viaje! No olvides calificar a tu conductor.`,
          type: 'booking', 
          tripId: id,
          timestamp: new Date().toISOString(),
          isRead: false
        };
        localStorage.setItem(`notifications_${res.passengerId}`, JSON.stringify([newNotif, ...passengerNotifications]));
      });
    }
  };

  const handleStartTrip = (id: string) => {
    const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
    const trip = allTrips.find(t => t.id === id);
    if (!trip) return;

    // Initialize currentLocation with origin
    const updatedAllTrips = allTrips.map(t => 
      t.id === id ? { ...t, status: 'in_progress' as const, currentLocation: t.coordinates?.origin } : t
    );
    localStorage.setItem('trips', JSON.stringify(updatedAllTrips));
    
    // Start location sharing if not already started
    if (!sharingLocation[id]) {
      toggleLocationSharing(id);
    }

    // Notify all passengers of this trip
    const allReservations = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
    const tripReservations = allReservations.filter(r => r.tripId === id && r.status === 'active');
    
    tripReservations.forEach(res => {
      const passengerNotifications = JSON.parse(localStorage.getItem(`notifications_${res.passengerId}`) || '[]');
      const newNotif = {
        id: Math.random().toString(36).substr(2, 9),
        userId: res.passengerId,
        title: 'Viaje Iniciado',
        message: `¡Tu viaje de ${trip.origin} a ${trip.destination} ha comenzado! Sigue la ubicación del conductor en tiempo real.`,
        type: 'trip_started',
        tripId: id,
        timestamp: new Date().toISOString(),
        isRead: false
      };
      localStorage.setItem(`notifications_${res.passengerId}`, JSON.stringify([newNotif, ...passengerNotifications]));
    });
    
    setTrips(updatedAllTrips.filter(t => t.driverId === user.id));
  };

  const handleArriveTrip = (id: string, auto: boolean = false) => {
    const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
    const trip = allTrips.find(t => t.id === id);
    if (!trip || trip.status === 'arrived') return;

    const updatedAllTrips = allTrips.map(t => t.id === id ? { ...t, status: 'arrived' as const } : t);
    localStorage.setItem('trips', JSON.stringify(updatedAllTrips));
    
    // Notify driver
    const driverNotifications = JSON.parse(localStorage.getItem(`notifications_${user.id}`) || '[]');
    const driverNotif = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      title: 'Llegada al Destino',
      message: `${auto ? 'Hemos detectado que has llegado' : 'Has marcado llegada'} al destino de tu viaje (${trip.destination}). No olvides finalizar el viaje para procesar el pago.`,
      type: 'arrived',
      tripId: id,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    localStorage.setItem(`notifications_${user.id}`, JSON.stringify([driverNotif, ...driverNotifications]));

    // Notify all passengers
    const allReservations = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
    const tripReservations = allReservations.filter(r => r.tripId === id && r.status === 'active');
    
    tripReservations.forEach(res => {
      const passengerNotifications = JSON.parse(localStorage.getItem(`notifications_${res.passengerId}`) || '[]');
      const newNotif = {
        id: Math.random().toString(36).substr(2, 9),
        userId: res.passengerId,
        title: 'Llegada al Destino',
        message: `¡Has llegado a tu destino (${trip.destination})! Gracias por viajar con ${trip.driverName}.`,
        type: 'arrived',
        tripId: id,
        timestamp: new Date().toISOString(),
        isRead: false
      };
      localStorage.setItem(`notifications_${res.passengerId}`, JSON.stringify([newNotif, ...passengerNotifications]));
    });

    setTrips(updatedAllTrips.filter(t => t.driverId === user.id));
  };

  const handleArriveDayTrip = (tripId: string, day: number, auto: boolean = false) => {
    const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
    const trip = allTrips.find(t => t.id === tripId);
    if (!trip || (trip.recurringDayStatus && trip.recurringDayStatus[day] === 'arrived')) return;

    const updatedAllTrips = allTrips.map(t => {
      if (t.id === tripId) {
        return {
          ...t,
          recurringDayStatus: {
            ...(t.recurringDayStatus || {}),
            [day]: 'arrived' as const
          }
        };
      }
      return t;
    });
    localStorage.setItem('trips', JSON.stringify(updatedAllTrips));

    // Notify driver
    const driverNotifications = JSON.parse(localStorage.getItem(`notifications_${user.id}`) || '[]');
    const driverNotif = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      title: 'Llegada al Destino (Día)',
      message: `${auto ? 'Hemos detectado que has llegado' : 'Has marcado llegada'} al destino (${trip.destination}) para tu viaje de hoy.`,
      type: 'arrived',
      tripId: tripId,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    localStorage.setItem(`notifications_${user.id}`, JSON.stringify([driverNotif, ...driverNotifications]));

    // Notify passengers of this day
    const allReservations = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
    const tripReservations = allReservations.filter(r => 
      r.tripId === tripId && 
      r.status === 'active' && 
      (r.selectedDays?.includes(day) || new Date(r.date + 'T00:00:00').getDay() === day)
    );
    
    tripReservations.forEach(res => {
      const passengerNotifications = JSON.parse(localStorage.getItem(`notifications_${res.passengerId}`) || '[]');
      const newNotif = {
        id: Math.random().toString(36).substr(2, 9),
        userId: res.passengerId,
        title: 'Llegada al Destino',
        message: `¡Has llegado a tu destino (${trip.destination})!`,
        type: 'arrived',
        tripId: tripId,
        timestamp: new Date().toISOString(),
        isRead: false
      };
      localStorage.setItem(`notifications_${res.passengerId}`, JSON.stringify([newNotif, ...passengerNotifications]));
    });

    setTrips(updatedAllTrips.filter(t => t.driverId === user.id));
  };

  const handleStartDayTrip = (tripId: string, day: number) => {
    const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
    const trip = allTrips.find(t => t.id === tripId);
    if (!trip) return;

    // Initialize currentLocation with origin for the recurring instance
    const updatedAllTrips = allTrips.map(t => {
      if (t.id === tripId) {
        return {
          ...t,
          currentLocation: t.coordinates?.origin,
          recurringDayStatus: {
            ...(t.recurringDayStatus || {}),
            [day]: 'in_progress' as const
          }
        };
      }
      return t;
    });
    localStorage.setItem('trips', JSON.stringify(updatedAllTrips));
    
    // Start location sharing if not already started
    if (!sharingLocation[tripId]) {
      toggleLocationSharing(tripId);
    }

    // Notify all passengers of this trip on this day
    const allReservations = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
    const tripReservations = allReservations.filter(r => 
      r.tripId === tripId && 
      r.status === 'active' && 
      (r.selectedDays?.includes(day) || new Date(r.date + 'T00:00:00').getDay() === day)
    );
    
    tripReservations.forEach(res => {
      const passengerNotifications = JSON.parse(localStorage.getItem(`notifications_${res.passengerId}`) || '[]');
      const newNotif = {
        id: Math.random().toString(36).substr(2, 9),
        userId: res.passengerId,
        title: 'Viaje Iniciado',
        message: `¡Tu viaje recurrente de ${trip.origin} a ${trip.destination} ha comenzado hoy! Sigue al conductor en tiempo real.`,
        type: 'trip_started',
        tripId: tripId,
        timestamp: new Date().toISOString(),
        isRead: false
      };
      localStorage.setItem(`notifications_${res.passengerId}`, JSON.stringify([newNotif, ...passengerNotifications]));
    });

    setTrips(updatedAllTrips.filter(t => t.driverId === user.id));
  };

  const handleFinishDayTrip = (tripId: string, day: number) => {
    const allTrips = JSON.parse(localStorage.getItem('trips') || '[]') as Trip[];
    const completedTrip = allTrips.find(t => t.id === tripId);
    
    if (completedTrip) {
      // Calculate commission based on distance
      let distance = 0;
      if (completedTrip.coordinates?.origin && completedTrip.coordinates?.destination) {
        distance = calculateDistance(
          completedTrip.coordinates.origin.lat,
          completedTrip.coordinates.origin.lng,
          completedTrip.coordinates.destination.lat,
          completedTrip.coordinates.destination.lng
        );
      }
      
      const commissionPerSeat = Math.max(2, Math.round(distance * 0.1));

      const updatedAllTrips = allTrips.map(t => {
        if (t.id === tripId) {
          return {
            ...t,
            recurringDayStatus: {
              ...(t.recurringDayStatus || {}),
              [day]: 'completed' as const
            }
          };
        }
        return t;
      });
      localStorage.setItem('trips', JSON.stringify(updatedAllTrips));
      setTrips(updatedAllTrips.filter(t => t.driverId === user.id));

      // Update reservations for this specific day
      const allReservations = JSON.parse(localStorage.getItem('reservations') || '[]') as Reservation[];
      const updatedReservations = allReservations.map(r => {
        if (r.tripId === tripId && r.status === 'active') {
          // Check if it's the right day
          const resDate = new Date(r.date + 'T00:00:00');
          if (resDate.getDay() === day || (r.selectedDays && r.selectedDays.includes(day))) {
            return { 
              ...r, 
              status: 'completed' as const, 
              paymentStatus: 'completed' as const,
              commissionFee: commissionPerSeat * r.seatsReserved
            };
          }
        }
        return r;
      });
      localStorage.setItem('reservations', JSON.stringify(updatedReservations));
      
      // Update local state
      const myTripIds = updatedAllTrips.filter(t => t.driverId === user.id).map(t => t.id);
      setReservations(updatedReservations.filter(r => myTripIds.includes(r.tripId)));

      // Notify passengers of this specific day
      const tripReservations = updatedReservations.filter(r => 
        r.tripId === tripId && 
        r.status === 'completed' && 
        (r.selectedDays?.includes(day) || new Date(r.date + 'T00:00:00').getDay() === day)
      );

      tripReservations.forEach(res => {
        const passengerNotifications = JSON.parse(localStorage.getItem(`notifications_${res.passengerId}`) || '[]');
        const newNotif = {
          id: Math.random().toString(36).substr(2, 9),
          userId: res.passengerId,
          title: 'Viaje Finalizado (Día)',
          message: `El conductor ha finalizado el viaje de hoy (${completedTrip.origin} a ${completedTrip.destination}). ¡Esperamos que hayas tenido un buen trayecto!`,
          type: 'booking',
          tripId: tripId,
          timestamp: new Date().toISOString(),
          isRead: false
        };
        localStorage.setItem(`notifications_${res.passengerId}`, JSON.stringify([newNotif, ...passengerNotifications]));
      });
    }
  };

  const getPassengerCountForDay = (tripId: string, day: number) => {
    // For recurring trips, we look at active reservations for the upcoming instance of that day
    return reservations.filter(r => {
      if (r.tripId !== tripId || r.status !== 'active') return false;
      
      // Check if it's a multi-day reservation
      if (r.selectedDays && r.selectedDays.includes(day)) return true;
      
      // Fallback to specific date check
      const resDate = new Date(r.date + 'T00:00:00');
      return resDate.getDay() === day;
    }).length;
  };

  const submitReview = () => {
    if (!selectedReservation) return;

    const targetId = selectedReservation.passengerId;
    const targetName = selectedReservation.passengerName;

    const newReview: Review = {
      id: Math.random().toString(36).substr(2, 9),
      tripId: selectedReservation.tripId,
      fromId: user.id,
      fromName: user.name,
      toId: targetId,
      rating,
      comment,
      timestamp: new Date().toISOString(),
      type: 'driver_to_passenger'
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

    setShowReviewModal(false);
    setRating(5);
    setComment('');
    setSelectedReservation(null);
    
    alert('¡Reseña enviada con éxito!');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900">Panel de Conductor</h1>
          <p className="text-gray-500">Gestiona tus viajes y pasajeros</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          Nuevo Viaje
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center gap-3 text-indigo-600">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Ganancias Totales</span>
          </div>
          <p className="text-3xl font-black text-gray-900">
            ${reservations.filter(r => r.status === 'completed').reduce((acc, r) => {
              const trip = trips.find(t => t.id === r.tripId);
              return acc + (trip?.pricePerSeat || 0) * r.seatsReserved;
            }, 0).toFixed(2)} <span className="text-sm font-bold text-gray-400">MXN</span>
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center gap-3 text-red-500">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Comisiones Pagadas</span>
          </div>
          <p className="text-3xl font-black text-gray-900">
            ${reservations.reduce((acc, r) => acc + (r.commissionFee || 0), 0).toFixed(2)} <span className="text-sm font-bold text-gray-400">MXN</span>
          </p>
        </div>
        <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg shadow-indigo-500/20 space-y-2">
          <div className="flex items-center gap-3 text-white/80">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Ganancia Neta</span>
          </div>
          <p className="text-3xl font-black text-white">
            ${(
              reservations.filter(r => r.status === 'completed').reduce((acc, r) => {
                const trip = trips.find(t => t.id === r.tripId);
                return acc + (trip?.pricePerSeat || 0) * r.seatsReserved;
              }, 0) - 
              reservations.reduce((acc, r) => acc + (r.commissionFee || 0), 0)
            ).toFixed(2)} <span className="text-sm font-bold text-white/60">MXN</span>
          </p>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xl rounded-3xl p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAdding(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-bold text-gray-900 mb-6">Publicar nuevo viaje</h2>
              
              <form onSubmit={handleAddTrip} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex p-1 bg-gray-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setNewTrip({ ...newTrip, type: 'unique' })}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                      newTrip.type === 'unique' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                    )}
                  >
                    Viaje Único
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTrip({ ...newTrip, type: 'recurring' })}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                      newTrip.type === 'recurring' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                    )}
                  >
                    Viaje Recurrente
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 relative">
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={newTrip.coordinates.origin || defaultCenter}
                        zoom={12}
                        onClick={onMapClick}
                        options={{
                          disableDefaultUI: true,
                          zoomControl: true,
                          styles: [
                            {
                              featureType: "poi",
                              elementType: "labels",
                              stylers: [{ visibility: "off" }]
                            }
                          ]
                        }}
                      >
                        {newTrip.coordinates.origin && (
                          <Marker 
                            position={newTrip.coordinates.origin} 
                            label="A"
                          />
                        )}
                        {newTrip.coordinates.destination && (
                          <Marker 
                            position={newTrip.coordinates.destination} 
                            label="B"
                          />
                        )}
                        {directions && (
                          <DirectionsRenderer 
                            directions={directions}
                            options={{
                              suppressMarkers: true,
                              polylineOptions: {
                                strokeColor: "#4f46e5",
                                strokeWeight: 5,
                                strokeOpacity: 0.8
                              }
                            }}
                          />
                        )}
                      </GoogleMap>
                    ) : (
                      <div className="h-[300px] bg-gray-100 animate-pulse flex items-center justify-center">
                        <p className="text-gray-400 font-medium">Cargando mapa...</p>
                      </div>
                    )}
                    
                    <div className="absolute top-4 left-4 right-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectingPoint('origin')}
                        className={cn(
                          "flex-1 py-2 px-4 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                          selectingPoint === 'origin' 
                            ? "bg-indigo-600 text-white" 
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <MapPin className="w-4 h-4" />
                        {selectingPoint === 'origin' ? 'Toca el mapa...' : 'Punto A'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectingPoint('destination')}
                        className={cn(
                          "flex-1 py-2 px-4 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                          selectingPoint === 'destination' 
                            ? "bg-indigo-600 text-white" 
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <MapPin className="w-4 h-4" />
                        {selectingPoint === 'destination' ? 'Toca el mapa...' : 'Punto B'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const useCoords = (coords: {lat: number, lng: number}) => {
                            setNewTrip(prev => ({
                              ...prev,
                              coordinates: { ...prev.coordinates, origin: coords }
                            }));
                            // Reverse geocode
                            if (window.google && window.google.maps) {
                              const geocoder = new google.maps.Geocoder();
                              geocoder.geocode({ location: coords }, (results, status) => {
                                if (status === 'OK' && results) {
                                  const placeName = extractPlaceName(results);
                                  setNewTrip(prev => ({ ...prev, origin: placeName || results[0].formatted_address }));
                                }
                              });
                            }
                          };

                          if (currentLocation) {
                            useCoords(currentLocation);
                          } else if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition((position) => {
                              useCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
                            });
                          }
                        }}
                        className="bg-white p-2 rounded-xl shadow-lg text-gray-600 hover:text-indigo-600 transition-colors"
                        title="Mi ubicación actual"
                      >
                        <Locate className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {(newTrip.origin || newTrip.destination) && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-6 py-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-2"
                    >
                      {newTrip.origin && (
                        <p className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                          <span className="text-indigo-600">Origen:</span> {newTrip.origin}
                        </p>
                      )}
                      {newTrip.destination && (
                        <p className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                          <span className="text-indigo-600">Destino:</span> {newTrip.destination}
                        </p>
                      )}
                    </motion.div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 ml-1">Origen (Punto A)</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                        {isLoaded ? (
                          <Autocomplete
                            onLoad={setOriginAutocomplete}
                            onPlaceChanged={onOriginPlaceChanged}
                            options={{ componentRestrictions: { country: 'mx' } }}
                          >
                            <input 
                              type="text" required
                              value={newTrip.origin}
                              onChange={e => setNewTrip({...newTrip, origin: e.target.value})}
                              placeholder="¿De dónde sales?"
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            />
                          </Autocomplete>
                        ) : (
                          <input 
                            type="text" required
                            value={newTrip.origin}
                            onChange={e => setNewTrip({...newTrip, origin: e.target.value})}
                            placeholder="¿De dónde sales?"
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 ml-1">Destino (Punto B)</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                        {isLoaded ? (
                          <Autocomplete
                            onLoad={setDestAutocomplete}
                            onPlaceChanged={onDestPlaceChanged}
                            options={{ componentRestrictions: { country: 'mx' } }}
                          >
                            <input 
                              type="text" required
                              value={newTrip.destination}
                              onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                              placeholder="¿A dónde vas?"
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            />
                          </Autocomplete>
                        ) : (
                          <input 
                            type="text" required
                            value={newTrip.destination}
                            onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                            placeholder="¿A dónde vas?"
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Descripción del punto de encuentro</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                      <textarea 
                        value={newTrip.pickupDescription}
                        onChange={e => setNewTrip({...newTrip, pickupDescription: e.target.value})}
                        placeholder="Ej: Estaré esperando frente a la entrada principal del centro comercial..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none min-h-[100px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                {newTrip.type === 'recurring' && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Días de la semana</label>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map((day) => (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => {
                            const days = newTrip.recurringDays.includes(day.id)
                              ? newTrip.recurringDays.filter(d => d !== day.id)
                              : [...newTrip.recurringDays, day.id];
                            setNewTrip({ ...newTrip, recurringDays: days });
                          }}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                            newTrip.recurringDays.includes(day.id)
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

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">
                    {newTrip.type === 'unique' ? 'Fecha y Hora de Salida' : 'Hora de Salida'}
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type={newTrip.type === 'unique' ? "datetime-local" : "time"} 
                      required
                      value={newTrip.departureTime}
                      onChange={e => setNewTrip({...newTrip, departureTime: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Asientos Disponibles</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="number" min="1" max="8" required
                        value={newTrip.totalSeats}
                        onChange={e => setNewTrip({...newTrip, totalSeats: parseInt(e.target.value)})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Precio por Asiento</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="number" min="0" step="0.01" required
                        value={newTrip.pricePerSeat}
                        onChange={e => setNewTrip({...newTrip, pricePerSeat: parseFloat(e.target.value)})}
                        placeholder="0.00"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                >
                  Publicar Viaje
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Tus Viajes Publicados</h2>
          <div className="grid gap-6">
            {trips.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                  <Car className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No has publicado ningún viaje todavía.</p>
              </div>
            ) : (
              trips.map((trip) => (
                <motion.div 
                  key={trip.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6",
                    trip.status === 'cancelled' && "opacity-60 grayscale"
                  )}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                      <Car className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <span>{trip.origin}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <span>{trip.destination}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {trip.type === 'recurring' ? (
                            <span className="flex items-center gap-1">
                              {getRecurrenceDescription(trip.recurringDays)} a las {trip.departureTime}
                            </span>
                          ) : (
                            format(new Date(trip.departureTime), "d 'de' MMMM, HH:mm", { locale: es })
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {trip.availableSeats} / {trip.totalSeats} asientos
                        </span>
                        <span className="flex items-center gap-1 font-bold text-indigo-600">
                          <DollarSign className="w-4 h-4" />
                          {trip.pricePerSeat} MXN
                        </span>
                      </div>

                      {trip.type === 'recurring' && trip.recurringDays && (
                        <div className="pt-4 border-t border-gray-50 space-y-4">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gestión por día</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {daysOfWeek.filter(d => trip.recurringDays?.includes(d.id)).map(day => {
                              const passengerCount = getPassengerCountForDay(trip.id, day.id);
                              const status = trip.recurringDayStatus?.[day.id] || 'pending';
                              const isFull = passengerCount >= trip.totalSeats;

                              return (
                                <div 
                                  key={day.id} 
                                  className={cn(
                                    "p-4 rounded-2xl border-2 transition-all flex flex-col gap-3",
                                    status === 'completed' ? "border-green-100 bg-green-50/30" :
                                    status === 'in_progress' ? "border-green-500 bg-green-50" :
                                    isFull ? "border-red-100 bg-red-50/30" :
                                    "border-blue-100 bg-blue-50/30"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                                        status === 'completed' || status === 'in_progress' ? "bg-green-500 text-white" :
                                        isFull ? "bg-red-500 text-white" :
                                        "bg-blue-500 text-white"
                                      )}>
                                        {day.name.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-gray-900">{day.name}</p>
                                        <p className={cn(
                                          "text-[10px] font-bold uppercase tracking-wider",
                                          status === 'completed' ? "text-green-600" :
                                          status === 'in_progress' ? "text-green-600 animate-pulse" :
                                          isFull ? "text-red-600" : "text-blue-600"
                                        )}>
                                          {status === 'completed' ? 'Finalizado' :
                                           status === 'in_progress' ? 'Viaje en curso' :
                                           isFull ? 'Lleno' : 'Disponible'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase">Pasajeros</p>
                                      <p className={cn(
                                        "text-sm font-black",
                                        isFull ? "text-red-600" : "text-gray-900"
                                      )}>
                                        {passengerCount} / {trip.totalSeats}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setViewingPassengers({ tripId: trip.id, day: day.id })}
                                      className="flex-1 py-2 bg-white text-gray-600 border border-gray-100 rounded-xl text-[10px] font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-1"
                                    >
                                      <Users className="w-3 h-3" />
                                      Pasajeros
                                    </button>

                                    {status === 'pending' && !isFull && (
                                      <button
                                        onClick={() => handleStartDayTrip(trip.id, day.id)}
                                        className="flex-[2] py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-1"
                                      >
                                        <Navigation className="w-3 h-3" />
                                        Iniciar
                                      </button>
                                    )}
                                    
                                    {status === 'in_progress' && (
                                      <div className="flex-[2] flex gap-1">
                                        <button
                                          onClick={() => handleArriveDayTrip(trip.id, day.id)}
                                          className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-[10px] font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-1"
                                        >
                                          <MapPin className="w-3 h-3" />
                                          Llegué
                                        </button>
                                        <button
                                          onClick={() => toggleSimulation(trip.id)}
                                          className={cn(
                                            "flex-1 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1",
                                            isSimulating[trip.id]
                                              ? "bg-red-500 text-white hover:bg-red-600"
                                              : "bg-indigo-500 text-white hover:bg-indigo-600"
                                          )}
                                          title="Simular movimiento hasta el destino"
                                        >
                                          <Navigation className="w-3 h-3" />
                                          {isSimulating[trip.id] ? "Parar" : "Simular"}
                                        </button>
                                      </div>
                                    )}

                                    {status === 'arrived' && (
                                      <button
                                        onClick={() => handleFinishDayTrip(trip.id, day.id)}
                                        className="flex-[2] py-2 bg-green-600 text-white rounded-xl text-[10px] font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-1"
                                      >
                                        <Check className="w-3 h-3" />
                                        Finalizar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {trip.type === 'unique' && trip.status === 'active' && (
                      <button 
                        onClick={() => setViewingPassengers({ tripId: trip.id })}
                        className="px-4 py-2 bg-white text-gray-600 border border-gray-100 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        Pasajeros
                      </button>
                    )}
                    {trip.status === 'active' && (
                      <button 
                        onClick={() => handleStartTrip(trip.id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        Iniciar
                      </button>
                    )}
                    {trip.status === 'in_progress' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleArriveTrip(trip.id)}
                          className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 flex items-center gap-2"
                        >
                          <MapPin className="w-4 h-4" />
                          Llegué
                        </button>
                        <button 
                          onClick={() => toggleSimulation(trip.id)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-md",
                            isSimulating[trip.id]
                              ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20"
                              : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20"
                          )}
                        >
                          {isSimulating[trip.id] ? "Pausar Simulación" : "Simular Recorrido"}
                        </button>
                      </div>
                    )}
                    {trip.status === 'arrived' && (
                      <button 
                        onClick={() => handleCompleteTrip(trip.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-all shadow-md shadow-green-500/20"
                      >
                        Finalizar
                      </button>
                    )}
                    {(trip.status === 'active' || trip.status === 'in_progress' || trip.status === 'arrived') && (
                      <button 
                        onClick={() => toggleLocationSharing(trip.id)}
                        className={cn(
                          "p-3 rounded-2xl transition-all flex items-center gap-2 font-bold text-xs",
                          sharingLocation[trip.id]
                            ? "bg-green-100 text-green-600 border-2 border-green-200"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100 border-2 border-transparent"
                        )}
                        title={sharingLocation[trip.id] ? "Dejar de compartir ubicación" : "Compartir mi ubicación en tiempo real"}
                      >
                        <Locate className={cn("w-5 h-5", sharingLocation[trip.id] && "animate-pulse")} />
                        {sharingLocation[trip.id] ? "Compartiendo" : "Activar Ubicación"}
                      </button>
                    )}
                    {(trip.status === 'active' || trip.status === 'in_progress' || trip.status === 'arrived') ? (
                      <button 
                        onClick={() => handleCancelTrip(trip.id)}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        title="Cancelar viaje"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    ) : trip.status === 'cancelled' ? (
                      <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-full text-sm font-bold">
                        Cancelado
                      </span>
                    ) : trip.status === 'completed' ? (
                      <span className="px-4 py-2 bg-green-100 text-green-600 rounded-full text-sm font-bold">
                        Completado
                      </span>
                    ) : null}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Reservas Recientes</h2>
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
            <div className="p-6 space-y-4">
              {reservations.length === 0 ? (
                <div className="text-center py-12 space-y-4 opacity-40">
                  <Users className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-500 font-medium">Aún no tienes reservas.</p>
                </div>
              ) : (
                reservations.map((res) => {
                  const trip = trips.find(t => t.id === res.tripId);
                  return (
                    <div key={res.id} className="p-4 bg-gray-50 rounded-3xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Link 
                            to={`/profile/${res.passengerId}`}
                            className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center hover:bg-indigo-200 transition-colors"
                          >
                            <Users className="w-5 h-5 text-indigo-600" />
                          </Link>
                          <div>
                            <Link to={`/profile/${res.passengerId}`} className="font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                              {res.passengerName}
                            </Link>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                              {res.seatsReserved} {res.seatsReserved === 1 ? 'asiento' : 'asientos'}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate(`/chat/${res.tripId}/${res.passengerId}`)}
                          className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                      </div>
                      {trip && (
                        <div className="pt-2 border-t border-gray-200/50 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <div className="flex items-center gap-2">
                            <span>{trip.origin}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{trip.destination}</span>
                          </div>
                          <div className="flex items-center gap-1 text-indigo-500">
                            <Clock className="w-3 h-3" />
                            <span>{format(new Date(res.date + 'T00:00:00'), 'd MMM', { locale: es })}</span>
                          </div>
                        </div>
                      )}
                      {res.status === 'completed' && (
                        <div className="flex flex-col gap-3">
                          {res.commissionFee && (
                            <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Comisión por distancia</span>
                              <span className="text-sm font-black text-indigo-600">-${res.commissionFee} MXN</span>
                            </div>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedReservation(res);
                              setShowReviewModal(true);
                            }}
                            className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                          >
                            <Star className="w-3 h-3 fill-white" />
                            Calificar Pasajero
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {viewingPassengers && (
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
                onClick={() => setViewingPassengers(null)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>

              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
                    <Users className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">Pasajeros del Viaje</h2>
                  {viewingPassengers.day !== undefined && (
                    <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs">
                      {daysOfWeek.find(d => d.id === viewingPassengers.day)?.name}
                    </p>
                  )}
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {reservations.filter(r => {
                    if (r.tripId !== viewingPassengers.tripId || r.status !== 'active') return false;
                    if (viewingPassengers.day !== undefined) {
                      if (r.selectedDays && r.selectedDays.includes(viewingPassengers.day)) return true;
                      const resDate = new Date(r.date + 'T00:00:00');
                      return resDate.getDay() === viewingPassengers.day;
                    }
                    return true;
                  }).length === 0 ? (
                    <div className="text-center py-12 space-y-2 opacity-40">
                      <Users className="w-12 h-12 text-gray-300 mx-auto" />
                      <p className="text-sm text-gray-500 font-medium">No hay pasajeros para este día.</p>
                    </div>
                  ) : (
                    reservations.filter(r => {
                      if (r.tripId !== viewingPassengers.tripId || r.status !== 'active') return false;
                      if (viewingPassengers.day !== undefined) {
                        if (r.selectedDays && r.selectedDays.includes(viewingPassengers.day)) return true;
                        const resDate = new Date(r.date + 'T00:00:00');
                        return resDate.getDay() === viewingPassengers.day;
                      }
                      return true;
                    }).map((res) => (
                      <div key={res.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sm font-bold text-indigo-600 shadow-sm">
                            {res.passengerName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{res.passengerName}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                              {res.seatsReserved} {res.seatsReserved === 1 ? 'asiento' : 'asientos'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/profile/${res.passengerId}`}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            <Users className="w-5 h-5" />
                          </Link>
                          <button 
                            onClick={() => {
                              setViewingPassengers(null);
                              navigate(`/chat/${res.tripId}/${res.passengerId}`);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button 
                  onClick={() => setViewingPassengers(null)}
                  className="w-full bg-gray-900 text-white py-4 rounded-3xl font-bold hover:bg-gray-800 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
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
                  <h2 className="text-2xl font-black text-gray-900">Califica al pasajero</h2>
                  <p className="text-gray-500">¿Cómo fue tu experiencia con {selectedReservation?.passengerName}?</p>
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
                    placeholder="Escribe algo sobre el pasajero..."
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
