import { LucideIcon } from 'lucide-react';

export type View = 'dashboard' | 'dashboard-admin' | 'events' | 'unified-calendar' | 'courses' | 'new-event' | 'speakers' | 'reports' | 'settings' | 'login' | 'signup' | 'users-admin' | 'logs';

export interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  categories: string[];
  createdBy: string;
  createdAt: string;
}

export interface Speaker {
  id: string;
  name: string;
  email: string;
  title: string;
  phone: string;
  events: string[];
  avatar: string;
}

export interface AcademicEvent {
  id: string;
  title: string;
  type: string;
  course: string;
  description: string;
  date: string;
  time: string;
  status: 'Published' | 'Draft' | 'Conflict' | 'Cancelled' | 'Confirmed' | 'Tentative' | 'Needs Review';
  speaker?: string;
  location: string;
  createdBy: string;
  teacher?: string;
  notificar_admin?: boolean;
  precisa_arte?: boolean;
  cabinInfo?: string;
  plataforma_meet?: boolean;
  plataforma_comapos?: boolean;
  convidado_externo?: boolean;
  precisa_cabine?: boolean;
  category?: string;
  batchId?: string;
  timeStart?: string;
  timeEnd?: string;
  operationalStatus?: 'scheduled' | 'preparing' | 'live' | 'finished' | 'issue';
  createdAt: string;
  cancelReason?: string;
}

export type UserRole = 'ADMIN' | 'PROFESSOR';

export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  courseId?: string;
  category?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  isRead?: number;
}

export interface ActivityLog {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  action: string;
  userId: string;
  userName: string;
  userRole?: string;
  userPhotoURL?: string;
  courseName?: string;
  eventId?: string;
  eventTitle?: string;
  createdAt: string;
}
