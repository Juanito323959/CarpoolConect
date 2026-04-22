import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, Car, Users, Chrome } from 'lucide-react';
import { User, UserRole } from '../types';
import { cn } from '../lib/utils';
import { Logo } from '../components/Logo';
import { auth, googleProvider, db, handleFirestoreError } from '../lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('passenger');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const currentOrigin = window.location.origin.replace('https://', '').replace('http://', '');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    console.log("Debug Auth - Origin:", currentOrigin);
    console.log("Debug Auth - Full URL:", window.location.href);
    
    try {
      if (isMobile) {
        setLoading(true);
        setError('Procesando autenticación con Google... por favor espera.');
        // Use localStorage for better persistence in PWA redirects
        localStorage.setItem('pendingRole', role);
        await signInWithRedirect(auth, googleProvider);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;
        
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        let userData: User;
        if (!userDoc.exists()) {
          userData = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuario',
            email: firebaseUser.email || '',
            role: role,
            photo: firebaseUser.photoURL || undefined
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        } else {
          userData = userDoc.data() as User;
        }
        
        onLogin(userData);
        navigate(userData.role === 'admin' ? '/admin' : userData.role === 'driver' ? '/driver/dashboard' : '/search');
      }
    } catch (err: any) {
      console.error("Error completo de Auth:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('La ventana de Google se cerró antes de completar el inicio de sesión. Por favor, mantén la ventana abierta hasta finalizar.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('El navegador bloqueó la ventana emergente. Por favor, permite las ventanas emergentes para este sitio.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Error de red. Verifica tu conexión a internet.');
      } else {
        setError(`Error (${err.code || '404'}): El servicio de Google no respondió correctamente en este dispositivo.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        onLogin(userData);
        navigate(userData.role === 'admin' ? '/admin' : userData.role === 'driver' ? '/driver/dashboard' : '/search');
      } else {
        setError('Perfil no encontrado. Por favor, regístrate.');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Credenciales incorrectas.');
      } else {
        setError('Error al iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-20">
      <div className="text-center mb-8 space-y-4">
        <Logo className="justify-center" textSize="text-3xl" />
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-3xl shadow-xl shadow-indigo-500/5 border border-gray-100 space-y-8"
      >
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Bienvenido de nuevo</h2>
          <p className="text-gray-500">Ingresa tus credenciales para continuar</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => setRole('passenger')}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                role === 'passenger' 
                  ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                  : "border-gray-100 text-gray-500 hover:border-indigo-200",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <Users className="w-6 h-6" />
              <span className="font-bold text-sm">Pasajero</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setRole('driver')}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                role === 'driver' 
                  ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                  : "border-gray-100 text-gray-500 hover:border-indigo-200",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <Car className="w-6 h-6" />
              <span className="font-bold text-sm">Conductor</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="email" 
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="password" 
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
            {!loading && <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">O continúa con</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border-2 border-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Chrome className="w-5 h-5 text-indigo-600" />
          Continuar con Google
        </button>

        <div className="text-center">
          <p className="text-gray-500">
            ¿No tienes cuenta? {' '}
            <Link to="/register" className="text-indigo-600 font-bold hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
