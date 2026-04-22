import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Car, Shield, Clock, Users, ArrowRight } from 'lucide-react';
import { Logo } from '../components/Logo';

export const Home: React.FC = () => {
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
      
      {/* Footer */}
      <footer className="py-16 border-t border-gray-100 text-center space-y-6">
        <Logo className="justify-center" textSize="text-xl" iconSize={20} />
        <p className="text-gray-400 text-sm font-medium">
          © {new Date().getFullYear()} CarpoolConnect. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
};
