import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, Car, Users } from 'lucide-react';
import { User, UserRole } from '../types';
import { cn } from '../lib/utils';
import { Logo } from '../components/Logo';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('passenger');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Check registered users in localStorage
    const registeredUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const foundUser = registeredUsers.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
    
    if (foundUser) {
      if (foundUser.role !== role && foundUser.role !== 'admin') {
        setError(`Este correo está registrado como ${foundUser.role === 'driver' ? 'conductor' : 'usuario'}.`);
        return;
      }
      
      onLogin(foundUser);
      if (foundUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate(foundUser.role === 'driver' ? '/driver/dashboard' : '/search');
      }
    } else {
      // Fallback for demo/admin if not registered
      if (email.includes('admin') || (email.includes('driver') && role === 'driver')) {
        const userRole = email.includes('admin') ? 'admin' : 'driver';
        const mockUser: User = {
          id: '1',
          name: email.split('@')[0],
          email,
          role: userRole
        };
        
        onLogin(mockUser);
        if (userRole === 'admin') {
          navigate('/admin');
        } else {
          navigate('/driver/dashboard');
        }
      } else {
        setError('Este correo no está registrado. Por favor, regístrate primero.');
      }
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
              onClick={() => setRole('passenger')}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                role === 'passenger' 
                  ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                  : "border-gray-100 text-gray-500 hover:border-indigo-200"
              )}
            >
              <Users className="w-6 h-6" />
              <span className="font-bold text-sm">Pasajero</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('driver')}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                role === 'driver' 
                  ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                  : "border-gray-100 text-gray-500 hover:border-indigo-200"
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group"
          >
            Iniciar Sesión
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

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
