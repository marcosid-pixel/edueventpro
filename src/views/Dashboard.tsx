import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  Bell,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  MoreVertical,
  Edit2,
  Trash2,
  History,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { parseJsonArray, calculateTotalHours, getCourseStyle, getEventConfirmationState, parseCourses } from '../utils/index';
import { SkeletonCard } from '../components/Skeleton';
import ScheduleCards from '../components/dashboard/ScheduleCards';
import NextEventCard from '../components/dashboard/NextEventCard';
import TodayTimeline from '../components/dashboard/TodayTimeline';
import ProfileSidebar from '../components/dashboard/ProfileSidebar';
import type { View, AcademicEvent, Notification, User, Course } from '../types';

const Dashboard = ({ setView, onNewEvent, onEdit, onDelete }: { setView: (v: View) => void; onNewEvent?: () => void; onEdit?: (e: AcademicEvent) => void; onDelete?: (id: string) => void }) => {
  const { user, effectiveRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: events, loading: eventsLoading } = useRealtimeCollection<AcademicEvent>('events');
  const { data: notifications, refresh: refreshNotifications } = useRealtimeCollection<Notification>('notifications');
  const { data: users, loading: usersLoading } = useRealtimeCollection<User>('users');
  const { data: courses } = useRealtimeCollection<Course>('courses');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'COORDENADOR';

  const activeNotifications = [...notifications.filter((n) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return new Date(n.updatedAt || n.createdAt).getTime() > dayAgo;
  })];

  if (!isAdmin) {
    const teacherEvents = events.filter((e) => e.teacher === user?.displayName);
    const pendingEvents = teacherEvents.filter((e) => getEventConfirmationState(e) === 'PENDING_CONFIRMATION');
    pendingEvents.forEach((e) => {
      const eventDateTime = new Date(`${e.date}T${e.timeEnd || e.timeStart || '23:59'}:00`);
      const diffDays = Math.ceil(Math.abs(Date.now() - eventDateTime.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 4 && diffDays < 5) {
        activeNotifications.unshift({
          id: `proactive-${e.id}`,
          title: '⚠️ Confirmação Pendente Urgente!',
          message: `Sua aula "${e.title}" será confirmada automaticamente amanhã.`,
          type: 'warning',
          read: false,
          createdAt: new Date().toISOString(),
        } as Notification);
      } else {
        activeNotifications.unshift({
          id: `pending-${e.id}`,
          title: '📋 Aula aguardando confirmação',
          message: `A aula "${e.title}" (${new Date(e.date).toLocaleDateString('pt-BR')}) está pendente. Confirme para registrar sua presença.`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
        } as Notification);
      }
    });
  }

  const userCourseIds = parseJsonArray(user?.courseId);
  const userCourseNames = courses.filter((c) => userCourseIds.includes(c.id)).map((c) => c.name);
  userCourseIds.forEach((id) => {
    const name = id.startsWith('auto_') ? id.replace('auto_', '') : (courses.find((c) => c.id === id)?.name || id);
    if (name && !userCourseNames.includes(name)) userCourseNames.push(name);
  });

  const filteredEvents = isAdmin
    ? events
    : events.filter((e) => {
        return e.createdBy === user?.id || e.teacher === user?.displayName;
      });

  const teachingHours = calculateTotalHours(filteredEvents);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const liveEvent = events.find((e) => {
    if (e.date !== todayStr) return false;
    if (!e.timeStart || !e.timeEnd) return false;
    const current = now.getHours() * 60 + now.getMinutes();
    const [hS, mS] = e.timeStart.split(':').map(Number);
    const [hE, mE] = e.timeEnd.split(':').map(Number);
    const start = hS * 60 + mS;
    const end = hE * 60 + mE;
    return current >= start && current <= end;
  });

  if (eventsLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div className="col-span-4">
              <SkeletonCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const courseDistribution = Object.entries(
    events.reduce((acc: Record<string, number>, e) => {
      if (e.course) {
        parseCourses(e.course).forEach(c => {
          acc[c] = (acc[c] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5);

  const catStats = Object.entries(
    events.reduce((acc: Record<string, number>, e) => {
      if (e.category) acc[e.category] = (acc[e.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).slice(0, 4);

  const totalCat = events.length || 1;
  const maxCourseVal = Math.max(...courseDistribution.map(([, c]) => c as number), 1);
  const teacherEventsForStats = events.filter((e) => e.teacher === user?.displayName);
  const confirmedCount = teacherEventsForStats.filter((e) => e.status === 'Confirmed' || e.status === 'Scheduled').length;
  const confirmationRate = teacherEventsForStats.length > 0 ? Math.round((confirmedCount / teacherEventsForStats.length) * 100) : 100;

  const capitalizedName = user?.displayName
    ? user.displayName.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : '';

  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Olá, {capitalizedName.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{dateStr}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64 text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="Buscar eventos, cursos..."
              type="text"
            />
          </div>

          {/* Bell Notification */}
          <div className="relative">
            <button
              onClick={() => {
                const opening = !showNotifications;
                setShowNotifications(opening);
                if (opening && unreadCount > 0) {
                  fetch('/api/notifications_read_all', { method: 'POST' }).then(() => refreshNotifications());
                }
              }}
              className="relative p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 rounded-full border-2 border-white dark:border-slate-900 text-[9px] font-black text-white flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-4 z-50"
                  >
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">Notificações</h4>
                      <button onClick={() => setShowNotifications(false)} className="text-xs font-bold text-slate-400 hover:text-red-500">✕</button>
                    </div>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {activeNotifications.slice(0, 10).map(n => (
                        <div key={n.id} className={`p-3 rounded-xl border transition-all ${!n.isRead ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800' : 'border-slate-100 dark:border-slate-700'}`}>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">{n.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">{n.message}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">{new Date(n.updatedAt || n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))}
                      {activeNotifications.length === 0 && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">Sem notificações</p>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
            title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Novo Agendamento Button */}
          {onNewEvent && (
            <button
              onClick={onNewEvent}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 active:scale-95"
            >
              <Plus size={16} />
              Novo Agendamento
            </button>
          )}
        </div>
      </div>

      {/* Live Event Banner */}
      {liveEvent && (
        <div className="mx-6 mt-4 flex items-center gap-2.5 px-4 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl animate-pulse">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
          <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Aula Ao Vivo: {liveEvent.title}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6 p-6">
        {/* Left Column - 8 cols */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Metric Cards + Next Events */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <div className="flex-1 min-w-0">
              <ScheduleCards filteredEvents={filteredEvents} />
            </div>
            <div className="flex-1 min-w-0">
              <NextEventCard filteredEvents={filteredEvents} />
            </div>
          </div>

          {/* Timeline - Full width */}
          <TodayTimeline filteredEvents={filteredEvents} />
        </div>

        {/* Right Column - 4 cols */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <ProfileSidebar
            user={user}
            effectiveRole={effectiveRole}
            filteredEvents={filteredEvents}
            allEvents={events}
            courses={courses}
            setView={setView}
          />
        </div>
      </div>

      {/* Admin Sections */}
      {isAdmin && (
        <section className="px-6 pb-6 space-y-6">
          {/* Audit Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Auditoria Global de Aulas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Monitoramento em tempo real de toda a grade</p>
              </div>
              {onNewEvent && (
                <button onClick={onNewEvent} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md active:scale-95 transition-all mt-2 sm:mt-0">
                  <Plus size={18} />
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Disciplina / Evento</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Docente Responsável</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cronograma</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredEvents.slice(0, 10).map((event) => {
                    const professor = users.find((u) => u.displayName === event.teacher);
                    const cs = getCourseStyle(event.course);
                    return (
                      <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl ${cs.bg} ${cs.color} flex items-center justify-center shrink-0 border ${cs.border}`}>
                              <cs.icon size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-1">{event.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${cs.color}`}>{event.course}</span>
                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                <span className="text-[9px] text-slate-500 dark:text-slate-400">{event.location}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={professor?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.teacher || 'NA')}&background=random&color=fff&bold=true`}
                                className="w-8 h-8 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800"
                                alt={event.teacher}
                              />
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
                                <CheckCircle2 size={9} className="text-green-500" />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-white">{event.teacher || 'Não Atribuído'}</p>
                              <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-tight">Professor(a)</p>
                              {professor?.createdBy && (() => {
                                const coord = users.find(u => u.id === professor.createdBy);
                                return coord ? (
                                  <span className="text-[7px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                    Resp: {coord.displayName}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-slate-800 dark:text-white font-bold text-xs">
                              <Calendar size={12} className="text-indigo-500" />
                              {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-medium mt-0.5">
                              <Clock size={11} />
                              {event.timeStart} - {event.timeEnd}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border
                              ${(event.status === 'Confirmed' || event.status === 'Scheduled') ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' :
                              event.status === 'Needs Review' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' :
                              'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800'}`}
                            >
                              {(event.status === 'Confirmed' || event.status === 'Scheduled') ? 'Confirmado' : event.status}
                            </span>
                            {event.notificar_admin && isAdmin && (
                              <span className="text-[8px] font-bold text-red-500 animate-pulse uppercase tracking-tight">Revisão Direção</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === event.id ? null : event.id)}
                            className={`p-1.5 rounded-lg transition-all ${activeMenuId === event.id ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600'}`}
                          >
                            <MoreVertical size={16} />
                          </button>
                          <AnimatePresence>
                            {activeMenuId === event.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-6 top-10 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-1.5 z-20"
                                >
                                  <button onClick={() => { setActiveMenuId(null); onEdit?.(event); }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all flex items-center gap-2"
                                  >
                                    <Edit2 size={13} /> Editar
                                  </button>
                                  {onDelete && (
                                    <button onClick={() => { setActiveMenuId(null); onDelete?.(event.id); }}
                                      className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all flex items-center gap-2"
                                    >
                                      <Trash2 size={13} /> Excluir
                                    </button>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEvents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-40">
                          <History size={40} className="text-slate-400 dark:text-slate-500" />
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 italic">Nenhum registro encontrado.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-700 px-6 py-3 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Mostrando <span className="font-bold text-slate-700 dark:text-white">{Math.min(filteredEvents.length, 10)}</span> de <span className="font-bold text-slate-700 dark:text-white">{filteredEvents.length}</span> eventos</p>
            </div>
          </div>

          {/* Distribution & Category Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Distribuição por Departamento</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Aulas ativas por área de ensino</p>
                </div>
                <TrendingUp size={16} className="text-indigo-500" />
              </div>
              <div className="space-y-3">
                {courseDistribution.map(([name, count], i) => {
                  const c = count as number;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-slate-700 dark:text-slate-200 uppercase tracking-tight">{name}</span>
                        <span className="text-indigo-500">{c} Aulas</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(c / maxCourseVal) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.05 * i }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Mix de Categorias</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Percentual de alocação</p>
              </div>
              <div className="space-y-3">
                {catStats.map(([cat, count], i) => {
                  const c = count as number;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-[9px] font-bold uppercase mb-1">
                        <span className="text-slate-500 dark:text-slate-400">{cat}</span>
                        <span className="text-slate-700 dark:text-slate-200">{Math.round((c / totalCat) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(c / totalCat) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                          className={`h-full rounded-full ${i === 0 ? 'bg-orange-400' : i === 1 ? 'bg-blue-400' : 'bg-green-400'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-700 text-center">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 italic">{events.length} agendamentos</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
