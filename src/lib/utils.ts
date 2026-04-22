import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MEXICO_CITIES: Record<string, { lat: number, lng: number }> = {
  'CDMX': { lat: 19.4326, lng: -99.1332 },
  'Ciudad de México': { lat: 19.4326, lng: -99.1332 },
  'Guadalajara': { lat: 20.6597, lng: -103.3496 },
  'Monterrey': { lat: 25.6866, lng: -100.3161 },
  'Puebla': { lat: 19.0414, lng: -98.2063 },
  'Querétaro': { lat: 20.5888, lng: -100.3899 },
  'Toluca': { lat: 19.2827, lng: -99.6557 },
  'Cuernavaca': { lat: 18.9261, lng: -99.2307 },
  'Mérida': { lat: 20.9674, lng: -89.5926 },
  'Cancún': { lat: 21.1619, lng: -86.8515 },
  'Tijuana': { lat: 32.5149, lng: -117.0382 },
  'Ensenada': { lat: 31.8667, lng: -116.6167 },
  'León': { lat: 21.1222, lng: -101.6737 },
  'Guanajuato': { lat: 21.0190, lng: -101.2574 },
  'Veracruz': { lat: 19.1738, lng: -96.1342 },
  'Xalapa': { lat: 19.5438, lng: -96.9102 },
  'Oaxaca': { lat: 17.0732, lng: -96.7266 },
  'Puerto Escondido': { lat: 15.8694, lng: -97.0767 },
  'San Luis Potosí': { lat: 22.1565, lng: -100.9855 },
  'Zacatecas': { lat: 22.7709, lng: -102.5832 },
  'Morelia': { lat: 19.7060, lng: -101.1950 },
  'Uruapan': { lat: 19.4167, lng: -102.0500 },
  'Hermosillo': { lat: 29.0730, lng: -110.9559 },
  'Guaymas': { lat: 27.9179, lng: -110.8981 },
  'Chihuahua': { lat: 28.6330, lng: -106.0691 },
  'Ciudad Juárez': { lat: 31.6904, lng: -106.4245 },
  'Pachuca': { lat: 20.1011, lng: -98.7591 },
};

export function getCoords(city: string) {
  const normalized = city.trim();
  return MEXICO_CITIES[normalized] || { lat: 19.4326 + (Math.random() - 0.5), lng: -99.1332 + (Math.random() - 0.5) };
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getRecurrenceDescription(days: number[] | undefined) {
  if (!days || days.length === 0) return 'Viaje único';
  if (days.length === 7) return 'Diario';
  
  const sortedDays = [...days].sort((a, b) => a - b);
  
  // Check for work days (Mon-Fri)
  const isWorkDays = sortedDays.length === 5 && 
                    sortedDays.includes(1) && 
                    sortedDays.includes(2) && 
                    sortedDays.includes(3) && 
                    sortedDays.includes(4) && 
                    sortedDays.includes(5);
  
  if (isWorkDays) return 'Días laborables (Lun-Vie)';

  // Check for consecutive days
  const isConsecutive = sortedDays.length > 1 && sortedDays.every((day, i) => i === 0 || day === sortedDays[i - 1] + 1);
  if (isConsecutive && sortedDays.length > 2) {
    const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `Consecutivo (${dayNamesShort[sortedDays[0]]}-${dayNamesShort[sortedDays[sortedDays.length - 1]]})`;
  }

  // Check for "Every other day" (Cada tercer día) patterns
  // Pattern 1: Mon, Wed, Fri (1, 3, 5)
  const isMonWedFri = sortedDays.length === 3 && 
                     sortedDays.includes(1) && 
                     sortedDays.includes(3) && 
                     sortedDays.includes(5);
  // Pattern 2: Tue, Thu, Sat (2, 4, 6)
  const isTueThuSat = sortedDays.length === 3 && 
                     sortedDays.includes(2) && 
                     sortedDays.includes(4) && 
                     sortedDays.includes(6);
  
  if (isMonWedFri || isTueThuSat) return 'Cada tercer día';

  // Check for "Once a week"
  if (days.length === 1) {
    const dayNames = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'];
    return `Una vez por semana (${dayNames[days[0]]})`;
  }
  
  const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${days.length} días por semana (${days.map(d => dayNamesShort[d]).join(', ')})`;
}
