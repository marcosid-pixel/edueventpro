import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  BarChart2,
  Calendar,
  AlertTriangle,
  Clock,
  TrendingUp,
  PieChart,
  Plus,
  CheckCircle2,
  MoreVertical,
  Edit2,
  Trash2,
  History,
  Zap,
  ArrowRight,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { parseJsonArray, calculateTotalHours, getCourseStyle } from '../utils/index';
import { SkeletonCard } from '../components/Skeleton';
import type { View, AcademicEvent, Notification, User, Course } from '../types';

const Dashboard = ({ setView, onEdit, onDelete }: { setView: (v: View) => void, onEdit?: (e: AcademicEvent) => void, onDelete?: (id: string) => void }) => {
  const { user } = useAuth();
  const { data: events, loading: eventsLoading } = useRealtimeCollection<AcademicEvent>('events');
  const { data: notifications } = useRealtimeCollection<Notification>('notifications');
  const { data: users, loading: usersLoading } = useRealtimeCollection<User>('users');
  const { data: courses } = useRealtimeCollection<Course>('courses');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const activeNotifications = notifications.filter(n => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return new Date(n.updatedAt || n.createdAt).getTime() > twentyFourHoursAgo;
  });

  const userCourseIds = parseJsonArray(user?.courseId);
  const userCourseNames = courses.filter(c => userCourseIds.includes(c.id)).map(c => c.name);
  userCourseIds.forEach(id => {
    const name = id.startsWith('auto_') ? id.replace('auto_', '') : (courses.find(c => c.id === id)?.name || id);
    if (name && !userCourseNames.includes(name)) {
      userCourseNames.push(name);
    }
  });

  const filteredEvents = isAdmin
    ? events
    : events.filter(e => {
        const isOwner = e.createdBy === user?.id || e.teacher === user?.displayName;
        const matchesCourse = userCourseNames.length > 0 && userCourseNames.includes(e.course);
        const userCategories = parseJsonArray(user?.category);
        const matchesCategory = userCategories.length === 0 || userCategories.includes(e.category);
        return isOwner || (matchesCourse && matchesCategory);
      });

  const teachingHours = calculateTotalHours(filteredEvents);
  const pendingReviews = events.filter(e => e.notificar_admin === true);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const liveEvent = events.find(e => {
    if (e.date !== todayStr) return false;
    if (!e.timeStart || !e.timeEnd) return false;
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [hS, mS] = e.timeStart.split(':').map(Number);
    const [hE, mE] = e.timeEnd.split(':').map(Number);
    const start = hS * 60 + mS;
    const end = hE * 60 + mE;
    return currentTime >= start && currentTime <= end;
  });

  if (eventsLoading || usersLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-8 w-48 bg-surface-container rounded-lg animate-pulse" />
          <div className="h-8 w-32 bg-surface-container rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const todayEvents = filteredEvents.filter(e => e.date === todayStr).sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
  const courseDistribution = Object.entries(
    events.reduce((acc: Record<string, number>, e) => {
      if (e.course) acc[e.course] = (acc[e.course] || 0) + 1;
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
  const uniqueCourses = [...new Set(filteredEvents.map(e => e.course))].filter(Boolean) as string[];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <span className="font-medium">Painel Geral</span>
            <ChevronRight size={12} />
            <span className="text-text-primary font-semibold">{isAdmin ? 'Administração Central' : 'Visão Geral'}</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-light text-text-primary tracking-wide mb-1 flex items-center gap-2">
            Olá, <span className="capitalize font-medium bg-clip-text text-transparent bg-gradient-to-r from-secondary to-blue-500">{user?.displayName.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-text-secondary font-normal tracking-wide">Bem-vindo ao centro de comando acadêmico.</p>
        </div>
        {liveEvent && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl animate-pulse">
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
            <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider">Aula Ao Vivo: {liveEvent.title}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="col-span-1 md:col-span-2 relative overflow-hidden group rounded-2xl border border-outline-variant/50 bg-card-bg shadow-xs hover:shadow-md transition-shadow duration-300">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-secondary/60 via-secondary/30 to-transparent rounded-t-2xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/[0.03] to-transparent pointer-events-none" />
          <div className="relative p-6 flex flex-col h-full gap-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-secondary">
                  {isAdmin ? 'Carga Horária · Sistema' : 'Minha Carga Horária'}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-headline text-text-primary leading-none tracking-tight">
                    {teachingHours}
                  </span>
                  <span className="text-sm font-medium text-text-secondary">hrs</span>
                </div>
              </div>
              <div className="p-2.5 bg-secondary/8 rounded-xl text-secondary shrink-0 group-hover:bg-secondary/12 transition-colors">
                <BarChart2 size={18} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary font-medium">
                  {isAdmin ? 'Volume de agendamentos' : 'Progressão semestral'}
                </span>
                <span className="text-xs font-semibold text-secondary">
                  {Math.round(Math.min((teachingHours / (isAdmin ? 500 : 16)) * 100, 100))}%
                </span>
              </div>
              <div className="w-full bg-surface-container/70 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((teachingHours / (isAdmin ? 500 : 16)) * 100, 100)}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-secondary to-secondary/70"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden group rounded-2xl border border-outline-variant/50 bg-card-bg shadow-xs hover:shadow-md transition-shadow duration-300 flex flex-col">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/50 via-blue-400/25 to-transparent rounded-t-2xl" />
          <div className="p-6 flex flex-col h-full gap-5">
            <div className="flex justify-between items-start">
              <p className="text-xs font-medium text-text-secondary">
                {isAdmin ? 'Total de Agendamentos' : 'Aulas Ativas'}
              </p>
              <div className="p-2.5 bg-blue-500/8 rounded-xl text-blue-500 group-hover:bg-blue-500/12 transition-colors">
                <Calendar size={17} />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-4xl font-bold font-headline text-text-primary leading-none tracking-tight">
                {filteredEvents.length}
              </span>
              <div className="flex -space-x-2">
                {uniqueCourses.slice(0, 4).map((dept, i) => {
                  const style = getCourseStyle(dept);
                  return (
                    <div
                      key={i}
                      title={dept}
                      className={`w-6 h-6 rounded-full flex items-center justify-center border-2 border-card-bg ${style.bg} ${style.color} shadow-xs shrink-0`}
                    >
                      <style.icon size={10} />
                    </div>
                  );
                })}
                {filteredEvents.length > 4 && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-card-bg bg-surface-container text-[8px] font-bold text-text-secondary shrink-0">
                    +{filteredEvents.length - 4}
                  </div>
                )}
                {filteredEvents.length === 0 && (
                  <span className="text-xs text-text-secondary italic">Nenhum evento</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`relative overflow-hidden group rounded-2xl border shadow-xs hover:shadow-md transition-shadow duration-300 flex flex-col ${
          isAdmin && pendingReviews.length > 0
            ? 'bg-red-50/50 dark:bg-red-500/[0.04] border-red-200/60 dark:border-red-500/20'
            : 'bg-card-bg border-outline-variant/50'
        }`}>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500/60 via-red-400/25 to-transparent rounded-t-2xl" />
          <div className="p-6 flex flex-col h-full gap-5">
            <div className="flex justify-between items-start">
              <p className="text-xs font-medium text-text-secondary">
                {isAdmin ? 'Pendências · Diretoria' : 'Próxima Sessão'}
              </p>
              <div className={`p-2.5 rounded-xl transition-colors ${
                isAdmin && pendingReviews.length > 0
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-orange-400/10 text-orange-500 group-hover:bg-orange-400/15'
              }`}>
                {isAdmin ? <AlertTriangle size={17} /> : <Clock size={17} />}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {isAdmin ? (
                <>
                  <span className={`text-4xl font-bold font-headline leading-none tracking-tight ${
                    pendingReviews.length > 0 ? 'text-red-500' : 'text-text-primary'
                  }`}>
                    {pendingReviews.length}
                  </span>
                  <span className="text-xs font-medium text-text-secondary">
                    {pendingReviews.length === 1 ? 'pendente de revisão' : 'pendentes de revisão'}
                  </span>
                </>
              ) : filteredEvents[0] ? (
                <>
                  <span className="text-3xl font-bold font-headline text-secondary leading-tight tracking-tight">
                    {filteredEvents[0].timeStart || '--:--'}
                  </span>
                  <span className="text-xs font-medium text-text-primary line-clamp-1 mt-0.5">{filteredEvents[0].title}</span>
                  {filteredEvents[0].location && (
                    <span className="text-xs text-text-secondary line-clamp-1">{filteredEvents[0].location}</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-text-secondary italic">Nenhuma aula agendada</span>
              )}
            </div>

            {!isAdmin && (
              <div className="relative overflow-hidden group rounded-2xl border border-outline-variant/50 bg-card-bg shadow-xs hover:shadow-md transition-shadow duration-300 flex flex-col mt-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500/50 via-green-400/25 to-transparent rounded-t-2xl" />
                <div className="p-6 flex flex-col h-full gap-4">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-medium text-text-secondary">Aulas de Hoje</p>
                    <div className="p-2.5 bg-green-500/8 rounded-xl text-green-500 group-hover:bg-green-500/12 transition-colors">
                      <Calendar size={17} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {todayEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-1 py-3">
                        <p className="text-xs text-text-secondary italic">Nenhuma aula hoje</p>
                        <p className="text-[9px] text-text-secondary opacity-50 mt-0.5">Descanse ou planeje a semana</p>
                      </div>
                    ) : (
                      <div className="space-y-2 flex-1">
                        {todayEvents.map(ev => {
                          const cs = getCourseStyle(ev.course);
                          return (
                            <div key={ev.id} className="flex items-center gap-2.5 p-2 bg-surface-container/60 rounded-lg border border-outline-variant/60">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.status === 'Cancelled' ? 'bg-red-500' : 'bg-green-500'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-text-primary truncate">{ev.title}</span>
                                  <span className={`text-[8px] font-black ${cs.color} shrink-0`}>{ev.course}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[9px] text-text-secondary">
                                  <span className="font-mono">{ev.timeStart || '--:--'} — {ev.timeEnd || '--:--'}</span>
                                  {ev.location && <><span className="w-px h-2 bg-outline-variant" /><span>{ev.location}</span></>}
                                </div>
                              </div>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${ev.status === 'Cancelled' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
                                {ev.status === 'Cancelled' ? 'Cancelada' : 'Confirmada'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="lg:col-span-2 bg-card-bg p-6 rounded-3xl border border-outline-variant/60 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Distribuição por Departamento</h3>
                <p className="text-[10px] text-text-secondary font-medium">Aulas ativas por área de ensino no semestre</p>
              </div>
              <TrendingUp size={16} className="text-secondary opacity-85" />
            </div>
            <div className="space-y-3.5">
              {courseDistribution.map(([name, count], i) => {
                const c = count as number;
                return (
                <div key={name} className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold">
                    <span className="text-text-primary uppercase tracking-tight">{name}</span>
                    <span className="text-secondary">{c} Aulas</span>
                  </div>
                  <div className="h-1.5 bg-surface-container/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(c / maxCourseVal) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.05 * i }}
                      className="h-full bg-gradient-to-r from-secondary to-secondary/70 rounded-full"
                    />
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          <div className="bg-card-bg p-6 rounded-3xl border border-outline-variant/60 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Mix de Categorias</h3>
                <p className="text-[10px] text-text-secondary font-medium">Percentual de alocação acadêmica</p>
              </div>
              <PieChart size={16} className="text-orange-400 opacity-85" />
            </div>
            <div className="flex-1 flex flex-col justify-center space-y-3.5">
              {catStats.map(([cat, count], i) => {
                const c = count as number;
                return (
                <div key={cat} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-[9px] font-bold uppercase mb-1">
                      <span className="text-text-secondary">{cat}</span>
                      <span className="text-text-primary">{Math.round((c / totalCat) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-container/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(c / totalCat) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className={`h-full rounded-full ${i === 0 ? 'bg-orange-400' : i === 1 ? 'bg-blue-400' : 'bg-green-400'}`}
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            <div className="mt-6 pt-3.5 border-t border-outline-variant/60 text-center">
              <p className="text-[9px] font-semibold text-text-secondary italic">Consolidando dados de {events.length} agendamentos</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card-bg rounded-3xl border border-outline-variant shadow-sm overflow-hidden transition-all">
            <div className="px-8 py-6 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container/30">
              <div>
                <h2 className="text-xl font-black font-headline text-text-primary uppercase tracking-tight">
                  {isAdmin ? 'Auditória Global de Aulas' : 'Minha Agenda Acadêmica'}
                </h2>
                <p className="text-xs text-text-secondary font-medium">
                  {isAdmin ? 'Monitoramento em tempo real de toda a grade' : 'Seus agendamentos e compromissos confirmados'}
                </p>
              </div>
              {isAdmin && (
                <button onClick={() => setView('new-event')} className="p-2 bg-secondary text-white rounded-xl hover:opacity-90 shadow-lg active:scale-95 transition-all">
                  <Plus size={20} />
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container/50">
                    <th className="px-8 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">Disciplina / Evento</th>
                    <th className="px-8 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">Docente Responsável</th>
                    <th className="px-8 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">Cronograma</th>
                    <th className="px-8 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {filteredEvents.slice(0, 10).map(event => {
                    const professor = users.find(u => u.displayName === event.teacher);
                    const courseStyle = getCourseStyle(event.course);
                    return (
                      <tr key={event.id} className="hover:bg-surface-container/30 transition-all group">
                        <td className="px-8 py-5">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-2xl ${courseStyle.bg} ${courseStyle.color} flex items-center justify-center shrink-0 border ${courseStyle.border}`}>
                              <courseStyle.icon size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-text-primary group-hover:text-secondary transition-colors line-clamp-1">{event.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${courseStyle.color}`}>{event.course}</span>
                                <span className="w-1 h-1 bg-outline-variant rounded-full" />
                                <span className="text-[9px] font-bold text-text-secondary">{event.location}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={professor?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.teacher || 'NA')}&background=random&color=fff&bold=true`}
                                className="w-9 h-9 rounded-full object-cover border-2 border-outline-variant shadow-sm bg-surface-container"
                                alt={event.teacher}
                              />
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-card-bg rounded-full flex items-center justify-center shadow-sm border border-outline-variant">
                                <CheckCircle2 size={10} className="text-green-500" />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-black text-text-primary">{event.teacher || 'Não Atribuído'}</p>
                              <p className="text-[9px] text-text-secondary uppercase font-bold tracking-tighter">Professor(a) Titular</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-text-primary font-bold text-xs">
                              <Calendar size={12} className="text-secondary" />
                              {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </div>
                            <div className="flex items-center gap-1.5 text-text-secondary text-[10px] font-medium mt-1">
                              <Clock size={12} />
                              {event.timeStart} - {event.timeEnd}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm
                              ${event.status === 'Confirmed' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                event.status === 'Needs Review' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                'bg-orange-500/10 text-orange-600 border-orange-500/20'}`}>
                              {event.status === 'Confirmed' ? 'Confirmado' : event.status}
                            </span>
                            {event.notificar_admin && isAdmin && (
                              <span className="text-[8px] font-black text-red-600 animate-pulse uppercase tracking-tighter">Revisão Direção</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right relative">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === event.id ? null : event.id)}
                            className={`p-2 rounded-xl transition-all ${activeMenuId === event.id ? 'bg-surface-container text-secondary' : 'text-text-secondary hover:bg-surface-container hover:text-secondary'}`}
                          >
                            <MoreVertical size={18} />
                          </button>
                          <AnimatePresence>
                            {activeMenuId === event.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-8 top-12 w-44 bg-card-bg border border-outline-variant shadow-2xl rounded-2xl p-2 z-20 overflow-hidden"
                                >
                                  <button onClick={() => { setActiveMenuId(null); onEdit?.(event); }}
                                    className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-text-primary hover:bg-secondary/10 hover:text-secondary rounded-xl transition-all flex items-center gap-2"
                                  >
                                    <Edit2 size={14} /> Editar Aula
                                  </button>
                                  <button onClick={() => { setActiveMenuId(null); onDelete?.(event.id); }}
                                    className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-2"
                                  >
                                    <Trash2 size={14} /> Excluir Registro
                                  </button>
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
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-40">
                          <History size={48} />
                          <p className="text-sm font-bold text-text-secondary italic">Nenhum registro encontrado para este período.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-outline-variant p-4 flex justify-between items-center bg-surface-container/50">
              <p className="text-xs text-text-secondary">Mostrando <span className="font-bold text-text-primary">{Math.min(filteredEvents.length, 10)}</span> de <span className="font-bold text-text-primary">{filteredEvents.length}</span> eventos</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-850 text-white p-7 rounded-3xl relative overflow-hidden shadow-xl border border-white/[0.04] group h-fit">
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-5 backdrop-blur-md border">
                <Zap size={20} className="text-secondary" />
              </div>
              <h2 className="text-xl font-extrabold font-headline mb-2.5 leading-tight tracking-tight">
                {isAdmin ? 'Gestão de Polo Integrada' : 'Avisos da Coordenação'}
              </h2>
              <p className="text-xs opacity-70 leading-relaxed font-medium">
                {isAdmin
                  ? 'Acesse os relatórios consolidados para auditoria do MEC e exporte dados de produtividade docente em tempo real.'
                  : 'O prazo para lançamento de notas do primeiro bimestre encerra-se no próximo dia 20. Verifique sua agenda.'}
              </p>
              <button onClick={() => setView('reports')}
                className="mt-6 w-full py-3.5 bg-secondary text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5"
              >
                {isAdmin ? 'Gerar Relatórios' : 'Central de Avisos'}
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="absolute -right-12 -bottom-12 opacity-5 pointer-events-none group-hover:scale-105 transition-transform duration-700">
              <TrendingUp size={200} />
            </div>
          </div>
          <div className="bg-card-bg p-7 rounded-3xl border border-outline-variant/60 shadow-sm transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">
                {isAdmin ? 'AUDITORIA DE SISTEMA' : 'NOTIFICAÇÕES'}
              </h3>
              <button className="text-[9px] font-bold text-secondary uppercase hover:underline">Ver tudo</button>
            </div>
            <div className="space-y-5">
              {activeNotifications.slice(0, 4).map(notif => (
                <div key={notif.id} className="flex gap-3 group cursor-pointer border-b border-outline-variant/30 pb-3 last:border-b-0 last:pb-0">
                  <div className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 shadow-sm ${
                    notif.type === 'warning' ? 'bg-red-400' :
                    notif.type === 'error' ? 'bg-red-600' :
                    notif.type === 'success' ? 'bg-green-400' : 'bg-secondary'
                  }`} />
                  <div>
                    <p className="text-xs font-bold text-text-primary leading-tight group-hover:text-secondary transition-colors">{notif.title}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5 font-medium leading-relaxed line-clamp-2 italic">{notif.message}</p>
                    <p className="text-[8px] text-text-secondary/60 mt-1 font-bold uppercase tracking-tight">
                      {new Date(notif.updatedAt || notif.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {activeNotifications.length === 0 && (
                <div className="py-8 text-center opacity-30">
                  <Bell size={28} className="mx-auto mb-2 text-text-secondary" />
                  <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Sem novidades</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
