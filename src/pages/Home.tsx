import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Shield, Clock, Users, ArrowRight, Download, X, Share } from 'lucide-react';
import { Logo } from '../components/Logo';

export const Home: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <Logo textSize="text-4xl" />
            
            <h1 className="text-7xl font-display font-black text-gray-900 leading-[0.9] tracking-tight">
              Viaja <span className="text-indigo-600">mejor</span>, <br />
              viaja acompañado.
            </h1>
            <p className="text-xl text-gray-600 max-w-lg">
              Conecta con conductores y pasajeros que van a tu mismo destino. 
              Ahorra dinero, reduce emisiones y haz nuevos amigos en el camino.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/register" 
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all flex items-center gap-2 group"
              >
                Empezar ahora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              {!isStandalone && (
                <button 
                  onClick={handleInstallClick}
                  className="bg-white text-gray-900 border-2 border-gray-100 px-8 py-4 rounded-2xl font-bold text-lg hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center gap-2 group shadow-xl shadow-gray-500/5"
                >
                  <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                  Descargar App
                </button>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-indigo-100 rounded-3xl blur-3xl opacity-30 animate-pulse" />
            <img 
              src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=1000" 
              alt="Carpooling" 
              className="relative rounded-3xl shadow-2xl object-cover aspect-video"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8">
        {[
          {
            icon: Shield,
            title: "Seguro y Confiable",
            description: "Verificamos a todos nuestros usuarios para garantizar viajes seguros en todo momento."
          },
          {
            icon: Clock,
            title: "Ahorra Tiempo",
            description: "Encuentra viajes que se ajusten a tu horario y llega a tu destino sin complicaciones."
          },
          {
            icon: Users,
            title: "Comunidad",
            description: "Únete a miles de personas que ya comparten sus trayectos diariamente."
          }
        ].map((feature, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-white rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
          >
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
              <feature.icon className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
            <p className="text-gray-600 leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </section>
      
      {/* Download Section */}
      <section className="bg-indigo-600 rounded-[40px] p-12 text-white overflow-hidden relative group">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-400 rounded-full blur-3xl opacity-50" />
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest">
              Nativa en tu celular
            </div>
            <h2 className="text-4xl font-black leading-tight">Instala la App y viaja a donde quieras</h2>
            <p className="text-indigo-100 text-lg">
              Accede más rápido, recibe notificaciones en tiempo real y gestiona tus viajes con un solo toque desde tu pantalla de inicio.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <div className="space-y-4">
                <p className="text-sm font-bold text-indigo-200">¿Cómo instalar?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-white/10 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center font-bold">1</div>
                    <span className="text-sm font-medium">Pulsa "Instalar" en el menú</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center font-bold">2</div>
                    <span className="text-sm font-medium">O usa el banner del navegador</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="w-64 h-[450px] bg-gray-900 rounded-[40px] border-[8px] border-gray-800 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 inset-x-0 h-6 bg-gray-800 rounded-b-xl" />
              <img 
                src="https://picsum.photos/seed/mobile-app/400/800" 
                alt="App Mobile" 
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 to-transparent" />
              <div className="absolute bottom-8 inset-x-4 text-center">
                <div className="w-12 h-12 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-3">
                  <Car className="text-indigo-600 w-6 h-6" />
                </div>
                <p className="text-sm font-black">CarpoolConnect</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-gray-100 text-center space-y-6">
        <Logo className="justify-center" textSize="text-xl" iconSize={20} />
        <p className="text-gray-400 text-sm font-medium">
          © {new Date().getFullYear()} CarpoolConnect. Todos los derechos reservados.
        </p>
      </footer>

      {/* PWA Install Modal */}
      <AnimatePresence>
        {showInstallModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setShowInstallModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-10 space-y-8">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
                    <Car className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">Instala la App</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Sigue estos pasos para llevar CarpoolConnect en tu pantalla de inicio:
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-3xl group">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-sm font-bold shadow-sm group-hover:scale-110 transition-transform">1</div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        Busca el icono <Share className="w-3.5 h-3.5 text-indigo-600" /> Compartir
                      </p>
                      <p className="text-[11px] text-gray-400">En la barra de herramientas de tu navegador</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-3xl group">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-sm font-bold shadow-sm group-hover:scale-110 transition-transform">2</div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-900">"Agregar a inicio"</p>
                      <p className="text-[11px] text-gray-400">Selecciona la opción para instalar como app</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowInstallModal(false)}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                >
                  ¡Entendido!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
