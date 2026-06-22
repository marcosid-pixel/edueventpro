import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, Calendar as CalendarIcon, Clock, MapPin, Video, User as UserIcon, Plus, AlertTriangle, Package, Lock, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import type { AcademicEvent, Course, User, View } from '../types';
import { EVENT_CATEGORIES } from '../constants';
import { parseJsonArray, getCourseStyle } from '../utils/index';

const PERIODS = [
  { id: 'morning', label: 'MANHÃ', start: '00:00', end: '12:00' },
  { id: 'afternoon', label: 'TARDE', start: '12:00', end: '18:00' },
  { id: 'night', label: 'NOITE', start: '18:00', end: '23:59' },
];

export default function ScheduleHub({ onEdit, onNewEvent, onDelete }: { onEdit: (e: AcademicEvent) => void, onNewEvent: () => void, onDelete?: (id: string) => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { data: events } = useRealtimeCollection<AcademicEvent>('events');
  const { data: courses } = useRealtimeCollection<Course>('courses');
  const { data: users } = useRealtimeCollection<User>('users');

  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedCategory, setSelectedCategory] = useState('Todas Categorias');
  const [selectedStatus, setSelectedStatus] = useState('Todos Status');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Base date for current week view (Monday of current week)
  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  });

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 6; i++) { // Mon to Sat
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const startOfWeekStr = weekDays[0].toISOString().split('T')[0];
  const endOfWeekStr = weekDays[5].toISOString().split('T')[0];

  // User visibility rules (same as unified calendar)
  const userCourseIds = parseJsonArray(user?.courseId);
  const userCourseNames = courses.filter(c => userCourseIds.includes(c.id)).map(c => c.name);
  userCourseIds.forEach(id => {
    const name = id.startsWith('auto_') ? id.replace('auto_', '') : (courses.find(c => c.id === id)?.name || id);
    if (name && !userCourseNames.includes(name)) {
      userCourseNames.push(name);
    }
  });

  const filteredEvents = events.filter(e => {
    // 1. Search filter
    const searchStr = `${e.title} ${e.teacher} ${e.location} ${e.course}`.toLowerCase();
    if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;

    // 2. Category filter
    if (selectedCategory !== 'Todas Categorias' && e.type !== selectedCategory) return false;

    // 3. Status filter
    if (selectedStatus !== 'Todos Status') {
       if (selectedStatus === 'Confirmado' && e.status !== 'Confirmed') return false;
       if (selectedStatus === 'Pendente' && e.status !== 'Needs Review' && e.status !== 'Scheduled' && e.status !== 'Tentative') return false;
       if (selectedStatus === 'Cancelado' && e.status !== 'Cancelled') return false;
    }

    // 4. Role visibility
    if (!isAdmin && e.teacher !== user?.displayName && e.createdBy !== user?.id) return false;

    // 5. Date filter (only for week view)
    if (viewMode === 'week') {
      return e.date >= startOfWeekStr && e.date <= endOfWeekStr;
    }

    return e.date.startsWith(baseDate.toISOString().substring(0, 7));
  });

  const conflicts = new Set<string>();
  if (viewMode === 'month') {
    events.forEach(e1 => {
      const hasOverlap = events.some(e2 => {
        if (e1.id === e2.id) return false;
        if (e1.date !== e2.date) return false;
        if (e1.location !== e2.location) return false;
        const [s1, f1] = (e1.time || '').split(' - ');
        const [s2, f2] = (e2.time || '').split(' - ');
        return (s1 < f2 && s2 < f1);
      });
      if (hasOverlap) conflicts.add(e1.id);
    });
  }

  const groupedMonthEvents = filteredEvents.reduce((acc, event) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, AcademicEvent[]>);

  const sortedMonthDates = Object.keys(groupedMonthEvents).sort();

  // Calculate week number
  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  const getStatusDisplay = (status: string) => {
    if (status === 'Confirmed') return { label: 'Confirmado', color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' };
    if (status === 'Cancelled') return { label: 'Cancelado', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' };
    return { label: 'Pendente', color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-2">
         <div>
            <nav className="flex items-center gap-2 text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2">
              <span>Gestão Operacional</span>
              <ChevronDown size={12} className="-rotate-90" />
              <span className="text-secondary">Cronograma Hub</span>
            </nav>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-black font-headline text-text-primary">Hub de Cronograma</h1>
              <span className="px-3 py-1 bg-surface-container text-text-secondary text-xs font-bold rounded-lg border border-outline-variant">
                {viewMode === 'week' ? `Semana ${getWeekNumber(baseDate)}` : baseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
              </span>
            </div>
         </div>
         <button onClick={onNewEvent} className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-md active:scale-95">
           <Plus size={16} /> Novo Agendamento
         </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-card-bg border border-outline-variant rounded-2xl shadow-sm">
         <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Category Filter */}
            <div className="relative">
               <select 
                 value={selectedCategory}
                 onChange={(e) => setSelectedCategory(e.target.value)}
                 className="appearance-none bg-surface-container/50 border border-outline-variant rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/30 transition-all cursor-pointer"
               >
                 <option>Todas Categorias</option>
                 {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
               <select 
                 value={selectedStatus}
                 onChange={(e) => setSelectedStatus(e.target.value)}
                 className="appearance-none bg-surface-container/50 border border-outline-variant rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/30 transition-all cursor-pointer"
               >
                 <option>Todos Status</option>
                 <option>Confirmado</option>
                 <option>Pendente</option>
                 <option>Cancelado</option>
               </select>
               <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
         </div>

         <div className="flex items-center gap-6 w-full md:w-auto">
            {/* View Toggle */}
            <div className="flex p-1 bg-surface-container rounded-xl border border-outline-variant shrink-0">
               <button 
                 onClick={() => setViewMode('week')}
                 className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'week' ? 'bg-card-bg text-secondary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
               >
                 <CalendarIcon size={14} /> Semana
               </button>
               <button 
                 onClick={() => setViewMode('month')}
                 className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'month' ? 'bg-card-bg text-secondary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
               >
                 <CalendarIcon size={14} /> Mês
               </button>
            </div>

            <div className="w-px h-6 bg-outline-variant hidden md:block" />

            {/* Week Navigation */}
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => {
                   const d = new Date(baseDate);
                   if (viewMode === 'week') d.setDate(d.getDate() - 7);
                   else d.setMonth(d.getMonth() - 1);
                   setBaseDate(d);
                 }}
                 className="p-2 bg-surface-container text-text-secondary hover:text-text-primary rounded-lg border border-outline-variant transition-colors"
               >
                  <ChevronDown size={16} className="rotate-90" />
               </button>
               <span className="text-xs font-bold text-text-primary whitespace-nowrap">
                  {viewMode === 'week' ? (
                     `${weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${weekDays[5].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
                  ) : (
                     baseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                  )}
               </span>
               <button 
                 onClick={() => {
                   const d = new Date(baseDate);
                   if (viewMode === 'week') d.setDate(d.getDate() + 7);
                   else d.setMonth(d.getMonth() + 1);
                   setBaseDate(d);
                 }}
                 className="p-2 bg-surface-container text-text-secondary hover:text-text-primary rounded-lg border border-outline-variant transition-colors"
               >
                  <ChevronDown size={16} className="-rotate-90" />
               </button>
            </div>
         </div>
      </div>

      {/* Kanban Board Area */}
      <div className="flex gap-4 overflow-x-auto pb-6 snap-x">
         {(viewMode === 'week' ? weekDays.map(d => d.toISOString().split('T')[0]) : sortedMonthDates).length === 0 ? (
            <div className="w-full py-20 text-center text-text-secondary italic text-sm">
               Nenhum evento agendado para este período.
            </div>
         ) : (
         (viewMode === 'week' ? weekDays.map(d => d.toISOString().split('T')[0]) : sortedMonthDates).map((dateStr) => {
            const date = new Date(dateStr + 'T12:00:00');
            const dayEvents = filteredEvents.filter(e => e.date === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            const weekDayName = date.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];

            return (
               <div key={dateStr} className="min-w-[320px] w-[320px] shrink-0 snap-start flex flex-col gap-4">
                  {/* Day Header */}
                  <div className="flex justify-between items-end border-b-2 border-outline-variant pb-2">
                     <div>
                        <h2 className="text-[13px] font-black uppercase tracking-widest text-text-secondary mb-1">
                           {weekDayName}
                        </h2>
                        <h3 className={`text-xl font-bold font-headline ${isToday ? 'text-secondary' : 'text-text-primary'}`}>
                           {date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                        </h3>
                     </div>
                     <div className="px-2.5 py-1 bg-surface-container rounded-md border border-outline-variant">
                        <span className="text-[10px] font-bold text-text-primary">{dayEvents.length} Aulas</span>
                     </div>
                  </div>

                  {/* Periods (Morning, Afternoon, Night) */}
                  <div className="flex flex-col gap-6">
                     {PERIODS.map(period => {
                        const periodEvents = dayEvents.filter(e => {
                           const start = e.timeStart || e.time?.split(' - ')[0] || '00:00';
                           return start >= period.start && start < period.end;
                        }).sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));

                        return (
                           <div key={period.id} className="flex flex-col gap-3">
                              <h4 className="text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.2em]">{period.label}</h4>
                              
                              <div className="flex flex-col gap-3">
                                 {periodEvents.length > 0 ? (
                                    periodEvents.map(event => {
                                       const status = getStatusDisplay(event.status);
                                       const courseStyle = getCourseStyle(event.course);
                                       const teacherUser = users.find(u => u.displayName === event.teacher);

                                       return (
                                          <motion.div 
                                             key={event.id}
                                             whileHover={{ y: -2 }}
                                             onClick={() => onEdit(event)}
                                             className={`bg-card-bg p-4 rounded-xl border border-outline-variant shadow-sm hover:shadow-md hover:border-secondary/50 transition-all cursor-pointer ${event.status === 'Cancelled' ? 'opacity-50 grayscale' : ''}`}
                                          >
                                             {/* Type and Status */}
                                             <div className="flex justify-between items-center mb-3">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${courseStyle.bg} ${courseStyle.color}`}>
                                                   {event.type}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                   <div className={`w-2 h-2 rounded-full ${status.color}`} />
                                                   <span className="text-[10px] font-bold text-text-secondary">{status.label}</span>
                                                </div>
                                             </div>

                                             {/* Title */}
                                             <h5 className="text-[13px] font-bold text-text-primary leading-snug mb-3 line-clamp-2">
                                                {event.title}
                                             </h5>

                                             {/* Time & Location */}
                                             <div className="flex flex-col gap-2 mb-4">
                                                <div className="flex items-center gap-2 text-text-secondary">
                                                   <Clock size={12} className="shrink-0" />
                                                   <span className="text-[11px] font-mono font-bold tracking-tight">
                                                      {event.timeStart || event.time.split(' - ')[0]} — {event.timeEnd || event.time.split(' - ')[1]}
                                                   </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-text-secondary">
                                                   {event.location === 'Meet' ? <Video size={12} className="shrink-0 text-blue-500" /> : <MapPin size={12} className="shrink-0 text-orange-500" />}
                                                   <span className="text-[11px] font-medium truncate">
                                                      {event.location}
                                                   </span>
                                                </div>
                                             </div>

                                             {/* Teacher */}
                                             <div className="flex items-center gap-2 pt-3 border-t border-outline-variant">
                                                {teacherUser?.photoURL ? (
                                                   <img src={teacherUser.photoURL} alt={teacherUser.displayName} className="w-6 h-6 rounded-full object-cover border border-outline-variant" />
                                                ) : (
                                                   <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant shrink-0">
                                                      <UserIcon size={10} className="text-text-secondary" />
                                                   </div>
                                                )}
                                                <span className="text-[11px] font-bold text-text-primary truncate">
                                                   {event.teacher || 'Docente Pendente'}
                                                </span>
                                             </div>
                                          </motion.div>
                                       )
                                    })
                                 ) : (
                                    <div className="p-4 border border-dashed border-outline-variant/60 rounded-xl bg-surface-container/20 text-center">
                                       <p className="text-[10px] font-medium text-text-secondary/60 italic">Sem eventos</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            )
         })
         )}
      </div>
    </div>
  );
}
