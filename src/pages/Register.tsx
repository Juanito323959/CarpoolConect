import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Mail, Lock, UserPlus, Car, Users, Camera, Image as ImageIcon, XCircle } from 'lucide-react';
import { User, UserRole } from '../types';
import { cn } from '../lib/utils';
import { Logo } from '../components/Logo';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface RegisterProps {
  onRegister: (user: User) => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegister }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('passenger');
  const [vehicle, setVehicle] = useState({ model: '', color: '', plate: '' });
  const [photo, setPhoto] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      alert("No se pudo acceder a la cámara.");
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

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const size = Math.min(videoRef.current.videoWidth, videoRef.current.videoHeight);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const startX = (videoRef.current.videoWidth - size) / 2;
        const startY = (videoRef.current.videoHeight - size) / 2;
        ctx.drawImage(videoRef.current, startX, startY, size, size, 0, 0, size, size);
        setPhoto(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userData: User = {
        id: firebaseUser.uid,
        name,
        email,
        role,
        photo,
        vehicle: role === 'driver' ? vehicle : undefined,
        rating: 5.0,
        totalReviews: 0
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      
      onRegister(userData);
      navigate(role === 'driver' ? '/driver/dashboard' : '/search');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya está en uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Error al registrarse. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="text-center mb-8 space-y-4">
        <Logo className="justify-center" textSize="text-3xl" />
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-3xl shadow-xl shadow-indigo-500/5 border border-gray-100 space-y-8"
      >
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Crea tu cuenta</h2>
          <p className="text-gray-500">Únete a la comunidad de CarpoolConnect</p>
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
          {/* Photo Selection */}
          <div className="flex flex-col items-center gap-4 py-2 relative">
            <div className="relative group">
              <div className="w-24 h-24 bg-gray-100 rounded-[24px] overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-200 group-hover:border-indigo-300 transition-all">
                {photo ? (
                  <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-8 h-8 text-gray-300" />
                )}
                <button 
                  type="button"
                  onClick={() => setShowPhotoOptions(true)}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              {photo && (
                <button 
                  type="button"
                  onClick={() => setPhoto('')}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Foto de Perfil (Opcional)</p>

            <AnimatePresence>
              {showPhotoOptions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute top-24 z-50 bg-white p-4 rounded-3xl shadow-2xl border border-gray-100 space-y-2 min-w-[200px]"
                >
                  <div className="flex items-center justify-between mb-2 px-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Opciones de Foto</span>
                    <button type="button" onClick={() => setShowPhotoOptions(false)} className="text-gray-400 hover:text-gray-600">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <label className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group">
                    <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-gray-700">Subir de Galería</span>
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
                    type="button"
                    onClick={startCamera}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all group"
                  >
                    <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-gray-700 text-left">Tomar con Cámara</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
            <label className="text-sm font-semibold text-gray-700 ml-1">Nombre Completo</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
          </div>

          {role === 'driver' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-4 border-t border-gray-100"
            >
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Detalles del Vehículo</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Modelo</label>
                  <input 
                    type="text" required
                    value={vehicle.model}
                    onChange={(e) => setVehicle({...vehicle, model: e.target.value})}
                    placeholder="Ej. Nissan Versa"
                    className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Color</label>
                  <input 
                    type="text" required
                    value={vehicle.color}
                    onChange={(e) => setVehicle({...vehicle, color: e.target.value})}
                    placeholder="Ej. Gris"
                    className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Placas</label>
                <input 
                  type="text" required
                  value={vehicle.plate}
                  onChange={(e) => setVehicle({...vehicle, plate: e.target.value})}
                  placeholder="Ej. ABC-123-D"
                  className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
                />
              </div>
            </motion.div>
          )}

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
            Registrarse
            <UserPlus className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <AnimatePresence>
          {showCamera && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black backdrop-blur-xl flex items-center justify-center p-4"
            >
              <div className="w-full max-w-sm aspect-square bg-gray-900 rounded-[48px] overflow-hidden relative shadow-2xl border-4 border-white/10">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover mirror"
                />
                
                <div className="absolute inset-0 border-[40px] border-black/40 rounded-[48px] pointer-events-none" />
                
                <div className="absolute bottom-8 left-0 right-0 px-8 flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={stopCamera}
                    className="w-12 h-12 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                  
                  <button 
                    type="button"
                    onClick={takePhoto}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/20"
                  >
                    <div className="w-12 h-12 border-4 border-gray-900 rounded-full" />
                  </button>

                  <div className="w-12 h-12" />
                </div>
              </div>
              
              <style>{`.mirror { transform: scaleX(-1); }`}</style>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center">
          <p className="text-gray-500">
            ¿Ya tienes cuenta? {' '}
            <Link to="/login" className="text-indigo-600 font-bold hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
