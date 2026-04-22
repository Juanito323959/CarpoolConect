import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DriverDashboard } from './pages/DriverDashboard';
import { PassengerSearch } from './pages/PassengerSearch';
import { TripDetails } from './pages/TripDetails';
import { Profile } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';
import { Chat } from './pages/Chat';
import { ChatList } from './pages/ChatList';
import { User, Trip } from './types';
import { cn } from './lib/utils';
import { NotificationProvider } from './NotificationContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  // Simple mock login for now
  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Initial mock data if none exist
    const savedTrips = localStorage.getItem('trips');
    const savedUsers = localStorage.getItem('users');

    if (!savedUsers) {
      const mockUsers: User[] = [
        { id: 'driver1', email: 'carlos@ejemplo.com', name: 'Carlos Rodríguez', role: 'driver', photo: 'https://i.pravatar.cc/150?u=driver1', rating: 4.8, totalReviews: 12, vehicle: { model: 'Nissan Versa', color: 'Gris', plate: 'MX-123-AB' } },
        { id: 'driver2', email: 'ana@ejemplo.com', name: 'Ana García', role: 'driver', photo: 'https://i.pravatar.cc/150?u=driver2', rating: 4.9, totalReviews: 8, vehicle: { model: 'Volkswagen Jetta', color: 'Blanco', plate: 'MX-456-CD' } },
        { id: 'driver3', email: 'miguel@ejemplo.com', name: 'Miguel Herrera', role: 'driver', photo: 'https://i.pravatar.cc/150?u=driver3', rating: 4.7, totalReviews: 15, vehicle: { model: 'Toyota Corolla', color: 'Azul', plate: 'MX-789-EF' } },
        { id: 'driver4', email: 'sofia@ejemplo.com', name: 'Sofía Martínez', role: 'driver', photo: 'https://i.pravatar.cc/150?u=driver4', rating: 4.9, totalReviews: 5, vehicle: { model: 'Honda Civic', color: 'Rojo', plate: 'MX-321-GH' } },
        { id: 'driver5', email: 'roberto@ejemplo.com', name: 'Roberto Gómez', role: 'driver', photo: 'https://i.pravatar.cc/150?u=driver5', rating: 4.6, totalReviews: 20, vehicle: { model: 'Chevrolet Aveo', color: 'Negro', plate: 'MX-654-IJ' } },
        { id: 'driver6', email: 'lucia@ejemplo.com', name: 'Lucía Méndez', role: 'driver', photo: 'https://i.pravatar.cc/150?u=driver6', rating: 4.8, totalReviews: 10, vehicle: { model: 'Mazda 3', color: 'Rojo', plate: 'MX-987-KL' } },
      ];
      localStorage.setItem('users', JSON.stringify(mockUsers));
    }

    if (!savedTrips) {
      const mockTrips: Trip[] = [
        {
          id: 'mock1',
          driverId: 'driver1',
          driverName: 'Carlos Rodríguez',
          driverPhoto: 'https://i.pravatar.cc/150?u=driver1',
          vehicleInfo: { model: 'Nissan Versa', color: 'Gris', plate: 'MX-123-AB' },
          origin: 'CDMX',
          destination: 'Puebla',
          departureTime: new Date(Date.now() + 86400000).toISOString(),
          totalSeats: 4,
          availableSeats: 2,
          pricePerSeat: 250,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 19.4326, lng: -99.1332 }, destination: { lat: 19.0414, lng: -98.2063 } }
        },
        {
          id: 'mock2',
          driverId: 'driver2',
          driverName: 'Ana García',
          driverPhoto: 'https://i.pravatar.cc/150?u=driver2',
          vehicleInfo: { model: 'Volkswagen Jetta', color: 'Blanco', plate: 'MX-456-CD' },
          origin: 'Guadalajara',
          destination: 'Querétaro',
          departureTime: new Date(Date.now() + 172800000).toISOString(),
          totalSeats: 3,
          availableSeats: 3,
          pricePerSeat: 350,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 20.6597, lng: -103.3496 }, destination: { lat: 20.5888, lng: -100.3899 } }
        },
        {
          id: 'mock3',
          driverId: 'driver3',
          driverName: 'Miguel Herrera',
          driverPhoto: 'https://i.pravatar.cc/150?u=driver3',
          vehicleInfo: { model: 'Toyota Corolla', color: 'Azul', plate: 'MX-789-EF' },
          origin: 'Monterrey',
          destination: 'Saltillo',
          departureTime: new Date(Date.now() + 43200000).toISOString(),
          totalSeats: 4,
          availableSeats: 4,
          pricePerSeat: 150,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 25.6866, lng: -100.3161 }, destination: { lat: 25.4232, lng: -101.0053 } }
        },
        {
          id: 'mock4',
          driverId: 'driver4',
          driverName: 'Sofía Martínez',
          vehicleInfo: { model: 'Honda Civic', color: 'Rojo', plate: 'MX-321-GH' },
          origin: 'Toluca',
          destination: 'CDMX',
          departureTime: new Date(Date.now() + 3600000).toISOString(),
          totalSeats: 2,
          availableSeats: 1,
          pricePerSeat: 80,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 19.2827, lng: -99.6557 }, destination: { lat: 19.4326, lng: -99.1332 } }
        },
        {
          id: 'mock5',
          driverId: 'driver5',
          driverName: 'Roberto Gómez',
          vehicleInfo: { model: 'Chevrolet Aveo', color: 'Negro', plate: 'MX-654-IJ' },
          origin: 'Cuernavaca',
          destination: 'CDMX',
          departureTime: new Date(Date.now() + 7200000).toISOString(),
          totalSeats: 4,
          availableSeats: 4,
          pricePerSeat: 120,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 18.9261, lng: -99.2307 }, destination: { lat: 19.4326, lng: -99.1332 } }
        },
        {
          id: 'mock6',
          driverId: 'driver6',
          driverName: 'Lucía Méndez',
          vehicleInfo: { model: 'Mazda 3', color: 'Rojo', plate: 'MX-987-KL' },
          origin: 'Mérida',
          destination: 'Cancún',
          departureTime: new Date(Date.now() + 129600000).toISOString(),
          totalSeats: 4,
          availableSeats: 3,
          pricePerSeat: 450,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 20.9674, lng: -89.5926 }, destination: { lat: 21.1619, lng: -86.8515 } }
        },
        {
          id: 'mock7',
          driverId: 'driver7',
          driverName: 'Fernando Ruiz',
          vehicleInfo: { model: 'Ford Figo', color: 'Plata', plate: 'MX-159-MN' },
          origin: 'Tijuana',
          destination: 'Ensenada',
          departureTime: new Date(Date.now() + 259200000).toISOString(),
          totalSeats: 4,
          availableSeats: 4,
          pricePerSeat: 180,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 32.5149, lng: -117.0382 }, destination: { lat: 31.8667, lng: -116.6167 } }
        },
        {
          id: 'mock8',
          driverId: 'driver8',
          driverName: 'Elena Torres',
          vehicleInfo: { model: 'Kia Rio', color: 'Azul Marino', plate: 'MX-753-OP' },
          origin: 'León',
          destination: 'Guanajuato',
          departureTime: new Date(Date.now() + 5400000).toISOString(),
          totalSeats: 3,
          availableSeats: 2,
          pricePerSeat: 90,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 21.1222, lng: -101.6737 }, destination: { lat: 21.0190, lng: -101.2574 } }
        },
        {
          id: 'mock9',
          driverId: 'driver9',
          driverName: 'Javier Soto',
          vehicleInfo: { model: 'Hyundai Accent', color: 'Blanco', plate: 'MX-852-QR' },
          origin: 'Veracruz',
          destination: 'Xalapa',
          departureTime: new Date(Date.now() + 90000000).toISOString(),
          totalSeats: 4,
          availableSeats: 4,
          pricePerSeat: 200,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 19.1738, lng: -96.1342 }, destination: { lat: 19.5438, lng: -96.9102 } }
        },
        {
          id: 'mock10',
          driverId: 'driver10',
          driverName: 'Patricia Luna',
          vehicleInfo: { model: 'Renault Logan', color: 'Gris', plate: 'MX-456-ST' },
          origin: 'Oaxaca',
          destination: 'Puerto Escondido',
          departureTime: new Date(Date.now() + 345600000).toISOString(),
          totalSeats: 4,
          availableSeats: 4,
          pricePerSeat: 380,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 17.0732, lng: -96.7266 }, destination: { lat: 15.8694, lng: -97.0767 } }
        },
        {
          id: 'mock11',
          driverId: 'driver11',
          driverName: 'Andrés Castro',
          vehicleInfo: { model: 'Dodge Attitude', color: 'Vino', plate: 'MX-123-UV' },
          origin: 'San Luis Potosí',
          destination: 'Zacatecas',
          departureTime: new Date(Date.now() + 216000000).toISOString(),
          totalSeats: 4,
          availableSeats: 4,
          pricePerSeat: 280,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 22.1565, lng: -100.9855 }, destination: { lat: 22.7709, lng: -102.5832 } }
        },
        {
          id: 'mock12',
          driverId: 'driver12',
          driverName: 'Gabriela Ríos',
          vehicleInfo: { model: 'Suzuki Swift', color: 'Amarillo', plate: 'MX-789-WX' },
          origin: 'Morelia',
          destination: 'Uruapan',
          departureTime: new Date(Date.now() + 86400000).toISOString(),
          totalSeats: 3,
          availableSeats: 3,
          pricePerSeat: 160,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 19.7060, lng: -101.1950 }, destination: { lat: 19.4167, lng: -102.0500 } }
        },
        {
          id: 'mock13',
          driverId: 'driver13',
          driverName: 'Ricardo Silva',
          vehicleInfo: { model: 'Mitsubishi Mirage', color: 'Verde', plate: 'MX-321-YZ' },
          origin: 'Hermosillo',
          destination: 'Guaymas',
          departureTime: new Date(Date.now() + 172800000).toISOString(),
          totalSeats: 4,
          availableSeats: 4,
          pricePerSeat: 220,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 29.0730, lng: -110.9559 }, destination: { lat: 27.9179, lng: -110.8981 } }
        },
        {
          id: 'mock14',
          driverId: 'driver14',
          driverName: 'Mónica Esparza',
          vehicleInfo: { model: 'Seat Ibiza', color: 'Blanco', plate: 'MX-654-AA' },
          origin: 'Chihuahua',
          destination: 'Ciudad Juárez',
          departureTime: new Date(Date.now() + 432000000).toISOString(),
          totalSeats: 4,
          availableSeats: 4,
          pricePerSeat: 550,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 28.6330, lng: -106.0691 }, destination: { lat: 31.6904, lng: -106.4245 } }
        },
        {
          id: 'mock15',
          driverId: 'driver15',
          driverName: 'Daniel Ortega',
          vehicleInfo: { model: 'Peugeot 301', color: 'Azul', plate: 'MX-987-BB' },
          origin: 'Pachuca',
          destination: 'CDMX',
          departureTime: new Date(Date.now() + 3600000).toISOString(),
          totalSeats: 4,
          availableSeats: 4,
          pricePerSeat: 110,
          status: 'active',
          type: 'unique',
          coordinates: { origin: { lat: 20.1011, lng: -98.7591 }, destination: { lat: 19.4326, lng: -99.1332 } }
        }
      ];
      localStorage.setItem('trips', JSON.stringify(mockTrips));
    }
  }, []);

  return (
    <Router>
      <NotificationProvider userId={user?.id}>
        <AppContent 
          user={user} 
          handleLogout={handleLogout} 
          handleLogin={handleLogin} 
        />
      </NotificationProvider>
    </Router>
  );
}

function AppContent({ 
  user, 
  handleLogout, 
  handleLogin 
}: { 
  user: User | null; 
  handleLogout: () => void; 
  handleLogin: (u: User) => void;
}) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const showNavbar = user && !isHomePage && !isAuthPage;

  return (
    <div className={cn("min-h-screen bg-gray-50", showNavbar && "pt-16")}>
      {showNavbar && <Navbar user={user} onLogout={handleLogout} />}
      <main className={cn("max-w-7xl mx-auto px-4 py-8", !showNavbar && "pt-0")}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onRegister={handleLogin} />} />
          
          <Route 
            path="/driver/dashboard" 
            element={
              user ? (
                user.role === 'driver' ? <DriverDashboard user={user} /> : <Navigate to={user.role === 'admin' ? '/admin' : '/search'} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          
          <Route 
            path="/search" 
            element={
              user ? (
                user.role === 'passenger' ? <PassengerSearch /> : <Navigate to={user.role === 'admin' ? '/admin' : '/driver/dashboard'} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          
          <Route 
            path="/trip/:id" 
            element={<TripDetails user={user} />} 
          />
          
          <Route 
            path="/profile/:id?" 
            element={user ? <Profile currentUser={user} onUpdateUser={handleLogin} /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/admin" 
            element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} 
          />
          
          <Route 
            path="/chat/:tripId/:otherUserId" 
            element={<Chat user={user} />} 
          />
          
          <Route 
            path="/messages" 
            element={<ChatList user={user} />} 
          />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
