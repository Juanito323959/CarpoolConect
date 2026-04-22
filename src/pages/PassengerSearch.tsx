import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Calendar, Users, ChevronRight, Car, DollarSign, Clock, Navigation, X, Star, Check, ArrowRight } from 'lucide-react';
import { Trip } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn, calculateDistance, MEXICO_CITIES, getRecurrenceDescription } from '../lib/utils';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '32px'
};

const defaultCenter = {
  lat: 19.4326,
  lng: -99.1332
};

export const PassengerSearch: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [nearbyTrips, setNearbyTrips] = useState<Trip[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [driverToUserDirections, setDriverToUserDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [driverLocations, setDriverLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const [showOnlyNearby, setShowOnlyNearby] = useState(false);
  const [tripStatus, setTripStatus] = useState<'idle' | 'searching' | 'on_the_way' | 'in_trip' | 'finished'>('idle');
  const [closestTripId, setClosestTripId] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (userCoords && trips.length > 0) {
      let minDistance = Infinity;
      let closestId = null;

      trips.forEach(trip => {
        if (trip.coordinates && driverLocations[trip.id]) {
          const dist = calculateDistance(
            userCoords.lat,
            userCoords.lng,
            driverLocations[trip.id].lat,
            driverLocations[trip.id].lng
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestId = trip.id;
          }
        }
      });
      setClosestTripId(closestId);
    }
  }, [userCoords, trips, driverLocations]);

  // Handle trip simulation removed
  const handleBookTrip = (trip: Trip) => {
    setActiveTrip(trip);
    setTripStatus('on_the_way');
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "" // El sistema manejará la clave si está configurada
  });

  useEffect(() => {
    if (isLoaded && selectedTrip?.coordinates) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: selectedTrip.coordinates.origin,
          destination: selectedTrip.coordinates.destination,
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
  }, [isLoaded, selectedTrip]);

  useEffect(() => {
    if (isLoaded && tripStatus === 'on_the_way' && activeTrip && userCoords && driverLocations[activeTrip.id]) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: driverLocations[activeTrip.id],
          destination: userCoords,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDriverToUserDirections(result);
          }
        }
      );
    } else {
      setDriverToUserDirections(null);
    }
  }, [isLoaded, tripStatus, activeTrip, userCoords, driverLocations]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      return;
    }

    // Use watchPosition for real-time tracking
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserCoords(coords);
        setLocationPermission('granted');
        
        // Auto-center map on user location
        if (map) {
          map.panTo(coords);
        }
        
        // Find nearby trips based on coordinates
        const nearby = trips.filter(t => {
          if (!t.coordinates) return false;
          const dist = calculateDistance(
            t.coordinates.origin.lat, 
            t.coordinates.origin.lng, 
            coords.lat, 
            coords.lng
          );
          return dist < 50; // Radio de 50km
        });
        setNearbyTrips(nearby);
      },
      () => {
        setLocationPermission('denied');
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  };

  useEffect(() => {
    const loadTrips = () => {
      const savedTrips = localStorage.getItem('trips');
      const savedReservations = localStorage.getItem('reservations');
      const reservations = savedReservations ? JSON.parse(savedReservations) : [];

      if (savedTrips) {
        const allTrips = JSON.parse(savedTrips) as Trip[];
        const activeTrips = allTrips.filter(t => t.status === 'active');
        
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Calculate availability and filter by date (only today or future)
        const tripsWithAvailability = activeTrips.filter(trip => {
          if (trip.type === 'recurring') return true; // Recurring trips are always potentially in the future
          const tripDate = format(new Date(trip.departureTime), 'yyyy-MM-dd');
          return tripDate >= today;
        }).map(trip => {
          // For unique trips, use their departure date. For recurring, use searchDate as reference for availability.
          const targetDate = trip.type === 'recurring' ? searchDate : format(new Date(trip.departureTime), 'yyyy-MM-dd');
          
          const occupiedSeats = reservations.filter((r: any) => 
            r.tripId === trip.id && r.date === targetDate && r.status === 'active'
          ).length;
          
          return {
            ...trip,
            availableSeats: trip.totalSeats - occupiedSeats
          };
        }).filter(trip => trip.availableSeats > 0);

        setTrips(tripsWithAvailability);
        
        // If no search term, show all or nearby if coords available
        if (!searchTerm) {
          setFilteredTrips(tripsWithAvailability);
        }

        // Initialize driver locations for new trips
        setDriverLocations(prev => {
          const next = { ...prev };
          tripsWithAvailability.forEach(t => {
            if (t.coordinates && !next[t.id]) {
              next[t.id] = t.currentLocation || t.coordinates.origin;
            }
          });
          // Remove locations for trips that are no longer active
          const activeIds = new Set(tripsWithAvailability.map(t => t.id));
          Object.keys(next).forEach(id => {
            if (!activeIds.has(id)) delete next[id];
          });
          return next;
        });

        // Extract unique available locations
        const locations = new Set<string>();
        tripsWithAvailability.forEach(t => {
          locations.add(t.origin);
          locations.add(t.destination);
        });
        setAvailableLocations(Array.from(locations).sort());
      }
    };

    loadTrips();
    const interval = setInterval(loadTrips, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [searchDate, searchTerm]);

  useEffect(() => {
    // Auto-request location if permission already granted
    if (trips.length > 0 && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(result => {
        if (result.state === 'granted') {
          requestLocation();
        }
      });
    }
  }, [trips.length]);

  useEffect(() => {
    if (trips.length === 0) return;

    const interval = setInterval(() => {
      setDriverLocations(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          // Simulate small movement (jitter)
          next[id] = {
            lat: next[id].lat + (Math.random() - 0.5) * 0.001,
            lng: next[id].lng + (Math.random() - 0.5) * 0.001
          };
        });
        return next;
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [trips]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (!term) {
      setFilteredTrips(trips);
      setNearbyTrips([]);
      return;
    }

    const lowerTerm = term.toLowerCase();
    
    // Proximity search: Filter trips that are close to the search term (if it's a city)
    // or trips that contain the search term in origin/destination
    const filtered = trips.filter(t => {
      const matchesText = t.origin.toLowerCase().includes(lowerTerm) || 
                         t.destination.toLowerCase().includes(lowerTerm);
      
      // If we have user coords or city coords, we could also check distance
      // But for now, text match is primary. 
      // We'll also check if the term matches a known city to show nearby
      return matchesText;
    });

    setFilteredTrips(filtered);

    // Check if it's a known city for nearby recommendations
    const cityMatch = Object.keys(MEXICO_CITIES).find(city => city.toLowerCase().includes(lowerTerm));
    if (cityMatch) {
      const coords = MEXICO_CITIES[cityMatch];
      const nearby = trips.filter(t => {
        if (!t.coordinates) return false;
        const dist = calculateDistance(
          t.coordinates.origin.lat, 
          t.coordinates.origin.lng, 
          coords.lat, 
          coords.lng
        );
        return dist < 50; // 50km radius
      });
      setNearbyTrips(nearby);
    } else {
      setNearbyTrips([]);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Persistent Status Panel */}
      <AnimatePresence>
        {tripStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-4 right-4 z-50 bg-white rounded-3xl shadow-2xl border border-indigo-100 p-4 flex items-center justify-between gap-4 max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-green-600">{activeTrip?.origin}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="text-red-600">{activeTrip?.destination}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-right">
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest leading-none mb-1">Estado</p>
                <p className="text-lg font-black text-gray-900 leading-none">Reserva confirmada</p>
              </div>
            </div>
            {/* Progress Bar Removed */}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <h1 className="text-4xl font-extrabold text-gray-900">¿A dónde quieres ir?</h1>
        
        {locationPermission === 'prompt' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-50 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <MapPin className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-indigo-900">Activa tu ubicación</p>
                <p className="text-xs text-indigo-600">Para mostrarte viajes cerca de ti y recomendaciones personalizadas.</p>
              </div>
            </div>
            <button 
              onClick={requestLocation}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 shrink-0"
            >
              Permitir ubicación
            </button>
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 max-w-4xl">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Busca por origen o destino..."
              className="w-full pl-16 pr-6 py-5 bg-white border-none rounded-3xl shadow-xl shadow-indigo-500/5 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-lg"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input 
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full pl-16 pr-6 py-5 bg-white border-none rounded-3xl shadow-xl shadow-indigo-500/5 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-lg"
            />
          </div>
        </div>

        {availableLocations.length > 0 && !searchTerm && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest w-full mb-2">Lugares con viajes disponibles:</span>
            {availableLocations.slice(0, 10).map(loc => (
              <button
                key={loc}
                onClick={() => {
                  setSearchTerm(loc);
                  const lowerTerm = loc.toLowerCase();
                  const filtered = trips.filter(t => 
                    t.origin.toLowerCase().includes(lowerTerm) || 
                    t.destination.toLowerCase().includes(lowerTerm)
                  );
                  setFilteredTrips(filtered);
                  
                  // Center map on first result if available
                  if (filtered.length > 0 && filtered[0].coordinates) {
                    setUserCoords(filtered[0].coordinates.origin);
                  }
                }}
                className="px-4 py-2 bg-white border border-gray-100 rounded-full text-sm font-medium text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
              >
                {loc}
              </button>
            ))}
          </div>
        )}
      </div>

        {isLoaded && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Navigation className="w-6 h-6 text-indigo-600" />
                Mapa de conductores
              </h2>
              <div className="flex items-center gap-4">
                {userCoords && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={showOnlyNearby}
                        onChange={(e) => setShowOnlyNearby(e.target.checked)}
                      />
                      <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </div>
                    <span className="text-xs font-bold text-gray-500 group-hover:text-indigo-600 transition-colors">Solo cercanos</span>
                  </label>
                )}
                {userCoords && (
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Ubicación detectada
                  </span>
                )}
                {locationPermission !== 'granted' && (
                  <button 
                    onClick={requestLocation}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline"
                  >
                    Usar mi ubicación
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white p-2 rounded-[40px] shadow-2xl shadow-indigo-500/10 border border-gray-100 overflow-hidden relative">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={userCoords || defaultCenter}
                zoom={userCoords ? 15 : 5}
                onLoad={(map) => setMap(map)}
                options={{
                  styles: [
                    {
                      "featureType": "all",
                      "elementType": "geometry.fill",
                      "stylers": [{ "weight": "2.00" }]
                    },
                    {
                      "featureType": "all",
                      "elementType": "geometry.stroke",
                      "stylers": [{ "color": "#9c9c9c" }]
                    },
                    {
                      "featureType": "all",
                      "elementType": "labels.text",
                      "stylers": [{ "visibility": "on" }]
                    },
                    {
                      "featureType": "landscape",
                      "elementType": "all",
                      "stylers": [{ "color": "#f2f2f2" }]
                    },
                    {
                      "featureType": "landscape",
                      "elementType": "geometry.fill",
                      "stylers": [{ "color": "#ffffff" }]
                    },
                    {
                      "featureType": "landscape.man_made",
                      "elementType": "geometry.fill",
                      "stylers": [{ "color": "#ffffff" }]
                    },
                    {
                      "featureType": "poi",
                      "elementType": "all",
                      "stylers": [{ "visibility": "off" }]
                    },
                    {
                      "featureType": "road",
                      "elementType": "all",
                      "stylers": [{ "saturation": -100 }, { "lightness": 45 }]
                    },
                    {
                      "featureType": "road",
                      "elementType": "geometry.fill",
                      "stylers": [{ "color": "#eeeeee" }]
                    },
                    {
                      "featureType": "road",
                      "elementType": "labels.text.fill",
                      "stylers": [{ "color": "#7b7b7b" }]
                    },
                    {
                      "featureType": "road",
                      "elementType": "labels.text.stroke",
                      "stylers": [{ "color": "#ffffff" }]
                    },
                    {
                      "featureType": "road.highway",
                      "elementType": "all",
                      "stylers": [{ "visibility": "simplified" }]
                    },
                    {
                      "featureType": "road.arterial",
                      "elementType": "labels.icon",
                      "stylers": [{ "visibility": "off" }]
                    },
                    {
                      "featureType": "transit",
                      "elementType": "all",
                      "stylers": [{ "visibility": "off" }]
                    },
                    {
                      "featureType": "water",
                      "elementType": "all",
                      "stylers": [{ "color": "#46bcec" }, { "visibility": "on" }]
                    },
                    {
                      "featureType": "water",
                      "elementType": "geometry.fill",
                      "stylers": [{ "color": "#c8d7d4" }]
                    },
                    {
                      "featureType": "water",
                      "elementType": "labels.text.fill",
                      "stylers": [{ "color": "#070707" }]
                    },
                    {
                      "featureType": "water",
                      "elementType": "labels.text.stroke",
                      "stylers": [{ "color": "#ffffff" }]
                    }
                  ],
                  disableDefaultUI: true,
                  zoomControl: true,
                }}
              >
                {userCoords && (
                  <Marker
                    position={userCoords}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      fillColor: '#10B981', // Green-500 for Origin
                      fillOpacity: 1,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 2,
                      scale: 8,
                    }}
                    title="Tu ubicación (Origen)"
                  />
                )}
                {directions && (
                  <DirectionsRenderer
                    directions={directions}
                    options={{
                      suppressMarkers: true,
                      polylineOptions: {
                        strokeColor: '#4F46E5',
                        strokeWeight: 5,
                        strokeOpacity: 0.6
                      }
                    }}
                  />
                )}
                {driverToUserDirections && (
                  <DirectionsRenderer
                    directions={driverToUserDirections}
                    options={{
                      suppressMarkers: true,
                      polylineOptions: {
                        strokeColor: '#F59E0B',
                        strokeWeight: 4,
                        strokeOpacity: 0.8
                      }
                    }}
                  />
                )}
                {filteredTrips
                  .filter(trip => {
                    if (!showOnlyNearby || !userCoords || !trip.coordinates) return true;
                    const dist = calculateDistance(
                      trip.coordinates.origin.lat,
                      trip.coordinates.origin.lng,
                      userCoords.lat,
                      userCoords.lng
                    );
                    return dist < 50; // 50km radius
                  })
                  .map(trip => (
                  trip.coordinates && driverLocations[trip.id] && (
                    <Marker
                      key={`driver-${trip.id}`}
                      position={driverLocations[trip.id]}
                      onClick={() => setSelectedTrip(trip)}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: trip.id === closestTripId ? '#F59E0B' : '#3B82F6', // Amber for closest, Blue for others
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2,
                        scale: trip.id === closestTripId ? 10 : 7,
                      }}
                      title={trip.id === closestTripId ? `MÁS CERCANO: ${trip.driverName}` : `Conductor: ${trip.driverName}`}
                    />
                  )
                ))}
                {selectedTrip && selectedTrip.coordinates && (
                  <Marker
                    position={selectedTrip.coordinates.destination}
                    icon={{
                      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                      fillColor: '#EF4444', // Red-500 for Destination
                      fillOpacity: 1,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 2,
                      scale: 6,
                    }}
                    title="Destino"
                  />
                )}
              </GoogleMap>

              {/* Custom Driver Profile Card */}
              <AnimatePresence>
                {selectedTrip && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white rounded-[32px] shadow-2xl border border-gray-100 p-6 z-10 overflow-hidden"
                  >
                    <button 
                      onClick={() => setSelectedTrip(null)}
                      className="absolute top-4 right-4 p-2 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-4 mb-6">
                      <Link to={`/profile/${selectedTrip.driverId}`} className="relative group shrink-0">
                        <img 
                          src={selectedTrip.driverPhoto || `https://ui-avatars.com/api/?name=${selectedTrip.driverName}&background=4F46E5&color=fff`} 
                          alt={selectedTrip.driverName}
                          className="w-16 h-16 rounded-2xl object-cover shadow-md group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link to={`/profile/${selectedTrip.driverId}`} className="font-display font-bold text-xl text-gray-900 truncate hover:text-indigo-600 transition-colors">
                            {selectedTrip.driverName}
                          </Link>
                          {selectedTrip.id === closestTripId && (
                            <span className="bg-amber-100 text-amber-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Más cercano
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5 text-amber-400">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="text-xs font-bold text-gray-600">4.9</span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs font-medium text-gray-500">
                            {selectedTrip.vehicleInfo?.model || 'Auto Económico'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resumen del Viaje</p>
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <span className="text-green-600">{selectedTrip.origin}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="text-red-600">{selectedTrip.destination}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-gray-600">
                        <span>Distancia: {selectedTrip.coordinates ? calculateDistance(selectedTrip.coordinates.origin.lat, selectedTrip.coordinates.origin.lng, selectedTrip.coordinates.destination.lat, selectedTrip.coordinates.destination.lng).toFixed(1) : '0'} km</span>
                        <span>Tiempo: {selectedTrip.coordinates ? Math.round(calculateDistance(selectedTrip.coordinates.origin.lat, selectedTrip.coordinates.origin.lng, selectedTrip.coordinates.destination.lat, selectedTrip.coordinates.destination.lng) * 1.5) : '0'} min</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 mb-6">
                      <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
                        <div className="flex items-center gap-2 text-indigo-600 mb-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Precio Est.</span>
                        </div>
                        <p className="text-sm font-black text-indigo-900">
                          ${selectedTrip.pricePerSeat} MXN
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button 
                        onClick={() => handleBookTrip(selectedTrip)}
                        disabled={tripStatus !== 'idle'}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {tripStatus === 'idle' ? 'Confirmar y Reservar' : 'Procesando...'}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

      {nearbyTrips.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-indigo-600" />
              {searchTerm ? `Viajes cerca de "${searchTerm}"` : 'Conductores cerca de ti'}
            </h2>
            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {searchTerm ? 'Búsqueda por zona' : 'Basado en tu ubicación'}
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {nearbyTrips.map((trip) => (
              <Link 
                key={`nearby-${trip.id}`}
                to={`/trip/${trip.id}?date=${trip.type === 'recurring' ? searchDate : format(new Date(trip.departureTime), 'yyyy-MM-dd')}`}
                className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Car className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{trip.origin} → {trip.destination}</p>
                    <p className="text-xs text-gray-500">{trip.driverName} • {trip.vehicleInfo?.model || 'Auto Económico'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-indigo-600">${trip.pricePerSeat} MXN</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Por asiento</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {searchTerm ? `Resultados para "${searchTerm}"` : 'Todos los viajes disponibles'}
        </h2>
        <div className="grid gap-6">
          {filteredTrips.length === 0 ? (
            <div className="bg-white p-20 rounded-[40px] border border-dashed border-gray-200 text-center space-y-6">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-bold text-gray-900">No encontramos viajes</p>
                <p className="text-gray-500">Intenta buscar con otros términos o vuelve más tarde.</p>
              </div>
            </div>
          ) : (
            filteredTrips.map((trip) => (
              <motion.div 
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className="group"
              >
                <div className="relative bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all">
                  <Link 
                    to={`/trip/${trip.id}?date=${trip.type === 'recurring' ? searchDate : format(new Date(trip.departureTime), 'yyyy-MM-dd')}`}
                    className="absolute inset-0 z-0 rounded-[32px]"
                  />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 pointer-events-none">
                    <div className="flex items-start gap-8">
                      <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Car className="w-10 h-10 text-indigo-600" />
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                          <span>{trip.origin}</span>
                          <ChevronRight className="w-6 h-6 text-gray-300" />
                          <span>{trip.destination}</span>
                        </div>
                        <div className="flex flex-wrap gap-6 text-gray-500">
                          <span className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-400" />
                            {trip.type === 'recurring' ? (
                              <span className="flex flex-col">
                                <span className="text-xs font-bold text-indigo-600 uppercase">
                                  {getRecurrenceDescription(trip.recurringDays)}
                                </span>
                                <span>{format(new Date(searchDate + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })}</span>
                              </span>
                            ) : (
                              format(new Date(trip.departureTime), "EEEE d 'de' MMMM", { locale: es })
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-400" />
                            {trip.type === 'recurring' ? trip.departureTime : format(new Date(trip.departureTime), "HH:mm")}
                          </span>
                          <span className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-400" />
                            {trip.availableSeats} asientos libres
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:flex-col md:items-end gap-4 border-t md:border-t-0 pt-6 md:pt-0">
                      <div className="text-right">
                        <p className="text-sm text-gray-400 font-medium">Precio por persona</p>
                        <p className="text-3xl font-black text-indigo-600 flex items-center gap-1">
                          <DollarSign className="w-6 h-6" />
                          {trip.pricePerSeat} <span className="text-sm font-bold">MXN</span>
                        </p>
                      </div>
                      <Link 
                        to={`/profile/${trip.driverId}`}
                        className="flex items-center gap-3 pointer-events-auto hover:opacity-80 transition-opacity"
                      >
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Conductor</p>
                          <p className="font-bold text-gray-900">{trip.driverName}</p>
                          {trip.vehicleInfo && (
                            <div className="flex flex-col items-end">
                              <p className="text-[10px] text-indigo-500 font-bold">{trip.vehicleInfo.model} • {trip.vehicleInfo.color}</p>
                              <p className="text-[8px] text-gray-400 font-bold tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{trip.vehicleInfo.plate}</p>
                            </div>
                          )}
                        </div>
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                          {trip.driverPhoto ? (
                            <img src={trip.driverPhoto} alt={trip.driverName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-sm font-bold text-gray-500">
                              {trip.driverName.charAt(0)}
                            </span>
                          )}
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
