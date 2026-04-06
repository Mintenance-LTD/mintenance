export interface Appointment {
  id: string;
  title: string;
  client: string;
  date: string;
  time: string;
  duration: string;
  location?: string;
  type: 'onsite' | 'remote' | 'phone';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  jobTitle?: string;
}

export interface AppointmentApiResponse {
  id: string;
  title: string;
  client: string;
  date: string;
  time?: string;
  duration?: string;
  location?: string;
  type?: 'onsite' | 'remote' | 'phone';
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  jobTitle?: string;
}

export interface Stats {
  upcomingAppointments: number;
  completedThisWeek: number;
  totalHours: number;
  availableSlots: number;
  weekOverWeekChange?: number;
}

export interface AvailabilitySlot {
  id?: string;
  day: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface NewAppointmentForm {
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  locationType: 'onsite' | 'remote' | 'phone';
  locationAddress: string;
  notes: string;
}

export function getCSRFToken(): string {
  const match = document.cookie.match(/(?:__Host-csrf-token|csrf-token)=([^;]+)/);
  return match?.[1] || '';
}
