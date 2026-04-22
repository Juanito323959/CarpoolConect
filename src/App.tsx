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
    // Handle redirect result from Google login (crucial for mobile)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          const firebaseUser = result.user;
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            const pendingRole = sessionStorage.getItem('pendingRole') as UserRole || 'passenger';
            const userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Usuario',
              role: pendingRole,
              photo: firebaseUser.photoURL || undefined
            } as User;
            await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            setUser(userData);
            sessionStorage.removeItem('pendingRole');
          }
        }
      })
      .catch((error) => {
        console.error("Error al procesar el redireccionamiento de auth:", error);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user document from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          // If user exists in Auth but not Firestore (e.g. first login)
          // Profile.tsx or Register.tsx should handle this, but we set a temp state
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Usuario',
            role: 'passenger', // default
            photo: firebaseUser.photoURL || undefined
          } as User);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
