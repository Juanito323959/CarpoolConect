export type UserRole = 'driver' | 'passenger' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photo?: string;
  rating?: number;
  totalReviews?: number;
  vehicle?: {
    model: string;
    color: string;
    plate: string;
  };
}

export type TripStatus = 'active' | 'cancelled' | 'completed' | 'in_progress' | 'arrived';
export type TripType = 'unique' | 'recurring';

export type RecurringDayStatus = 'pending' | 'in_progress' | 'completed' | 'arrived';

export interface Trip {
  id: string;
  driverId: string;
  driverName: string;
  driverPhoto?: string;
  type: TripType;
  recurringDays?: number[]; // 0-6 (Sunday-Saturday)
  recurringDayStatus?: Record<number, RecurringDayStatus>;
  vehicleInfo?: {
    model: string;
    color: string;
    plate: string;
  };
  origin: string;
  destination: string;
  departureTime: string; // For unique: ISO date-time. For recurring: ISO time (or just time part)
  totalSeats: number;
  availableSeats: number; // For unique trips. For recurring, this is the base capacity.
  pricePerSeat: number;
  status: TripStatus;
  coordinates?: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  };
  currentLocation?: { lat: number; lng: number };
  pickupDescription?: string;
}

export type PaymentMethod = 'cash' | 'card';
export type PaymentStatus = 'pending' | 'completed';

export interface Reservation {
  id: string;
  tripId: string;
  passengerId: string;
  passengerName: string;
  seatsReserved: number;
  date: string; // The specific date of the trip instance (YYYY-MM-DD)
  selectedDays?: number[]; // For recurring trips: days of the week selected (0-6)
  timestamp: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  status: 'active' | 'cancelled' | 'completed';
  commissionFee?: number;
}

export interface Review {
  id: string;
  tripId: string;
  fromId: string;
  fromName: string;
  toId: string;
  rating: number;
  comment: string;
  timestamp: string;
  type: 'driver_to_passenger' | 'passenger_to_driver';
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  tripId: string;
  driverId: string;
  passengerId: string;
  messages: Message[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'cancellation' | 'reminder' | 'trip_started' | 'arrived';
  tripId?: string;
  timestamp: string;
  isRead: boolean;
}
