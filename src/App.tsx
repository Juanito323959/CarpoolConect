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
import { User, Trip, UserRole } from './types';
import { cn } from './lib/utils';
import { NotificationProvider } from './NotificationContext';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Unified login handler for Firebase
  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    // Safety timeout: ensure loading screen disappears after 8 seconds 
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 8000);

    // Handle redirect result from Google login (crucial for mobile)
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && isMounted) {
          const firebaseUser = result.user;
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            const pendingRole = localStorage.getItem('pendingRole') as UserRole || 'passenger';
            const userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Usuario',
              role: pendingRole,
              photo: firebaseUser.photoURL || undefined
            } as User;
            await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            setUser(userData);
            localStorage.removeItem('pendingRole');
          }
        }
      } catch (error) {
        console.error("Auth redirect error:", error);
      }
    };

    handleRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Usuario',
              role: 'passenger',
              photo: firebaseUser.photoURL || undefined
            } as User);
          }
        } catch (e) {
          console.error("Firestore fetch error:", e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Cargando CarpoolConnect...</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 text-xs text-indigo-600 underline"
        >
          ¿Tarda demasiado? Reintentar
        </button>
      </div>
    );
  }

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
          <Route path="/" element={<Home user={user} />} />
          <Route 
            path="/login" 
            element={
              user ? (
                <Navigate to={user.role === 'driver' ? '/driver/dashboard' : user.role === 'admin' ? '/admin' : '/search'} />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />
          <Route 
            path="/register" 
            element={
              user ? (
                <Navigate to={user.role === 'driver' ? '/driver/dashboard' : user.role === 'admin' ? '/admin' : '/search'} />
              ) : (
                <Register onRegister={handleLogin} />
              )
            } 
          />
          
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
