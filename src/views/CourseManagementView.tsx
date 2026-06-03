import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  Package,
  MoreVertical,
  Users,
  Calendar,
  Bookmark,
  Trash2,
  Plus,
  ChevronDown,
  GraduationCap,
  Edit2
} from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { SkeletonCard } from '../components/Skeleton';
import { ModernSelectionModal } from '../components/ModernSelectionModal';
import { parseCategories, parseJsonArray, getCourseStyle, getCategoryStyle, calculateTotalHours, getEventHours } from '../utils/index';
import { EVENT_CATEGORIES } from '../constants';
import type { View, AcademicEvent, Course, User, Notification } from '../types';

const EventGroupItem: React.FC<{ title: string; evs: AcademicEvent[]; onEditEvent?: (e: AcademicEvent) => void }> = ({ title, evs, onEditEvent }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sortedEvs = [...evs].sort((a, b) => a.date.localeCompare(b.date));
  
  return (
    <div className="space-y-1">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3 bg-surface-container rounded-xl border border-outline-variant hover:border-secondary/40 transition-all cursor-pointer group/group"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
             <ChevronRight size={16} />
          </div>
          <div>
            <p className="text-xs font-black text-text-primary uppercase tracking-tight">{title}</p>
            <p className="text-[10px] text-text-secondary font-bold">{evs.length} aulas agendadas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-secondary bg-secondary/5 px-2 py-0.5 rounded-full border border-secondary/10">
             {new Date(sortedEvs[0].date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} → {new Date(sortedEvs[sortedEvs.length-1].date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
           </span>
           <button 
             onClick={(e) => {
               e.stopPropagation();
               onEditEvent?.(sortedEvs[0]);
             }}
             title="Editar informações do evento"
             className="opacity-0 group-hover/group:opacity-100 p-1.5 text-text-secondary hover:text-secondary bg-surface-container rounded-lg border border-outline-variant transition-all"
           >
             <Edit2 size={12} />
           </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-4 space-y-1"
          >
            {sortedEvs.map(event => (
              <div 
                key={event.id} 
                onClick={(e) => {
                  e.stopPropagation();
                  onEditEvent?.(event);
                }}
                className="flex items-center justify-between text-[11px] p-2.5 bg-surface-container/50 rounded-xl border border-outline-variant hover:border-secondary/30 hover:bg-secondary/5 transition-all group/event cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${event.status === 'Confirmed' ? 'bg-green-500' : 'bg-secondary'}`} />
                  <span className="font-bold text-text-primary line-clamp-1 group-hover/event:text-secondary transition-colors">
                    {event.title.includes('(') ? `Aula ${event.title.split('(')[1].replace(')', '')}` : event.title}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-bold text-text-primary">{event.date.split('-').reverse().slice(0, 2).join('/')}</p>
                  <p className="text-[8px] font-medium text-text-secondary">{event.timeStart}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CourseManagementView = ({ onEditEvent, setView }: { onEditEvent?: (e: AcademicEvent) => void; setView: (v: View) => void }) => {
  const { user } = useAuth();
  const { data: courses, loading: coursesLoading } = useRealtimeCollection<Course>('courses');
  const { data: allEvents, loading: eventsLoading } = useRealtimeCollection<AcademicEvent>('events');
  const { data: users, loading: usersLoading } = useRealtimeCollection<User>('users');
  
  const isAdmin = user?.role === 'ADMIN';

  // Professores só veem eventos onde são o teacher ou o criador
  const events = isAdmin
    ? allEvents
    : allEvents.filter(e => e.teacher === user?.displayName || e.createdBy === user?.id);

  const [loading, setLoading] = useState(false);
  const [activeCourseMenu, setActiveCourseMenu] = useState<string | null>(null);
  const [activeBatchMenu, setActiveBatchMenu] = useState<string | null>(null);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [globalBatchTeacher, setGlobalBatchTeacher] = useState<string>('Todos');
  const [expandedGlobalBatch, setExpandedGlobalBatch] = useState<string | null>(null);
  const [selectionModal, setSelectionModal] = useState<{ type: 'teacher' | 'category' | 'batch-teacher' | 'batch-category'; courseName?: string; courseId?: string; batchId?: string; batchTitle?: string } | null>(null);

  const handleUpdateUserField = async (userId: string, field: string, value: any) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (!response.ok) throw new Error('Falha ao atualizar usuário');
    } catch (err) {
      console.error(err);
      toast('Erro ao atualizar dados do usuário');
    }
  };

  const eventCourseNames = Array.from(new Set(events.map(e => e.course).filter(Boolean)));
  
  const displayCourses = courses.filter(c => eventCourseNames.includes(c.name));
  
  eventCourseNames.forEach(name => {
    if (name && !displayCourses.find(c => c.name === name)) {
      displayCourses.push({
        id: `auto_${name}`,
        name,
        description: 'Departamento com eventos ativos',
        categories: [],
        createdBy: 'system',
        createdAt: new Date().toISOString()
      } as Course);
    }
  });

  const handleUpdateCourseData = async (courseId: string, data: any) => {
    if (courseId.startsWith('auto_')) return;
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Falha ao atualizar curso');
    } catch (err) {
      console.error(err);
      toast('Erro ao atualizar curso');
    }
  };

  const handleBulkUpdateEvents = async (courseName: string, field: string, value: any, force = false) => {
    const courseEvents = events.filter(e => e.course === courseName);
    
    let targets = [];
    if (force) {
      if (!confirm(`Deseja aplicar "${value}" a TODOS os ${courseEvents.length} eventos do curso "${courseName}"?`)) return;
      targets = courseEvents;
    } else {
      const emptyTargets = courseEvents.filter(e => !e[field as keyof AcademicEvent] || e[field as keyof AcademicEvent] === '');
      targets = emptyTargets;
      let message = `Deseja aplicar "${value}" a todos os ${emptyTargets.length} eventos sem ${field === 'teacher' ? 'professor' : 'categoria'} neste curso?`;

      if (emptyTargets.length === 0 && courseEvents.length > 0) {
        if (confirm(`Todos os eventos de "${courseName}" já possuem ${field === 'teacher' ? 'professor' : 'categoria'}. Deseja SOBRESCREVER todos os ${courseEvents.length} eventos com "${value}"?`)) {
          targets = courseEvents;
        } else {
          return;
        }
      } else if (courseEvents.length > emptyTargets.length) {
        const choice = confirm(`${message}\n\nClique em OK para atualizar apenas os vazios (${emptyTargets.length}).\nClique em CANCELAR para atualizar ABSOLUTAMENTE TODOS (${courseEvents.length}) deste curso.`);
        if (!choice) {
          targets = courseEvents;
        }
      } else {
        if (!confirm(message)) return;
      }
    }

    if (targets.length === 0) return;

    try {
      setLoading(true);
      const ids = targets.map(ev => ev.id);
      await fetch('/api/events_bulk_update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, data: { [field]: value } })
      });
      toast('Eventos atualizados com sucesso!');
    } catch (err) {
      console.error(err);
      toast('Erro ao atualizar eventos em lote');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBatchField = async (batchId: string, field: string, value: any) => {
    const batchEvents = events.filter(e => e.batchId === batchId);
    if (batchEvents.length === 0) return;

    if (!confirm(`Deseja aplicar "${value}" a todos os ${batchEvents.length} eventos deste lote?`)) return;

    try {
      setLoading(true);
      const ids = batchEvents.map(ev => ev.id);
      await fetch('/api/events_bulk_update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, data: { [field]: value } })
      });
      toast('Lote atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      toast('Erro ao atualizar campo do lote');
    } finally {
      setLoading(false);
    }
  };

  const getCourseMembers = (courseName: string, courseId: string) => {
    const directMembers = users.filter(u => u.courseId === courseId);
    const courseEvents = events.filter(e => e.course === courseName);
    const eventTeachers = new Set(courseEvents.map(e => e.teacher).filter(Boolean));
    
    const allDocentes = [...directMembers];
    users.forEach(u => {
      if (eventTeachers.has(u.displayName) && !allDocentes.find(m => m.id === u.id)) {
        allDocentes.push(u);
      }
    });
    
    return allDocentes;
  };

  const getCourseEventsCount = (courseName: string) => {
    return events.filter(e => e.course === courseName).length;
  };

  const getCourseBatches = (courseName: string) => {
    const courseEvents = events.filter(e => e.course === courseName && e.batchId);
    const batches: Record<string, AcademicEvent[]> = {};
    courseEvents.forEach(e => {
      if (e.batchId) {
        if (!batches[e.batchId]) batches[e.batchId] = [];
        batches[e.batchId].push(e);
      }
    });
    return Object.entries(batches).map(([id, evs]) => ({
      id,
      title: evs[0].title.split(' (')[0],
      count: evs.length,
      events: evs.sort((a, b) => a.date.localeCompare(b.date))
    }));
  };

  const getAllBatches = (teacherName?: string) => {
    const filtered = teacherName && teacherName !== 'Todos'
      ? events.filter(e => e.batchId && (e.teacher === teacherName || e.createdBy === teacherName))
      : events.filter(e => e.batchId);
    const batches: Record<string, AcademicEvent[]> = {};
    filtered.forEach(e => {
      if (e.batchId) {
        if (!batches[e.batchId]) batches[e.batchId] = [];
        batches[e.batchId].push(e);
      }
    });
    return Object.entries(batches).map(([id, evs]) => ({
      id,
      title: evs[0].title.split(' (')[0],
      courseName: evs[0].course,
      count: evs.length,
      events: evs.sort((a, b) => a.date.localeCompare(b.date))
    }));
  };

  const teachers = users.filter(u => u.role === 'PROFESSOR' || u.role === 'ADMIN');

  const handleUpdateBatch = async (batchId: string, currentTitle: string) => {
    const newTitle = prompt('Novo título para todos os eventos do lote:', currentTitle);
    if (!newTitle) return;

    try {
      const batchEvents = events.filter(e => e.batchId === batchId);
      setLoading(true);
      const ids = batchEvents.map(ev => ev.id);
      
      await fetch('/api/events_bulk_update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, data: { title: newTitle } })
      });
      toast('Lote atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      toast('Erro ao atualizar lote');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId: string, batchTitle: string) => {
    if (!isAdmin) {
      // Professor solicita aprovação ao admin
      if (!confirm(`Solicitar exclusão do lote "${batchTitle}" ao Administrador?\n\nSua solicitação será registrada e o Admin será notificado.`)) return;
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '⚠️ Solicitação de Exclusão de Lote',
            message: `Prof. ${user?.displayName} solicitou a exclusão do lote "${batchTitle}". ID do lote: ${batchId}. Acesse Gestão de Cursos para aprovar ou rejeitar.`,
            type: 'warning',
            userId: user?.id,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          })
        });
        await fetch('/api/activity_logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Solicitação de Exclusão de Lote',
            message: `Prof. ${user?.displayName} solicitou a exclusão do lote "${batchTitle}" (ID: ${batchId}).`,
            type: 'warning',
            action: 'REQUEST_DELETE_BATCH',
            userId: user?.id,
            userName: user?.displayName,
            userRole: user?.role,
            userPhotoURL: user?.photoURL,
            createdAt: new Date().toISOString()
          })
        });
        toast('Solicitação enviada! O administrador foi notificado.');
      } catch (err) {
        toast('Erro ao enviar solicitação');
      }
      return;
    }

    if (!confirm('Tem certeza que deseja excluir TODO o lote de agendamentos?')) return;

    try {
      const batchEvents = allEvents.filter(e => e.batchId === batchId);
      setLoading(true);
      for (const ev of batchEvents) {
        await fetch(`/api/events_delete/${ev.id}`, { method: 'POST' });
      }
      toast('Lote excluído com sucesso!');
    } catch (err) {
      console.error(err);
      toast('Erro ao excluir lote');
    } finally {
      setLoading(false);
    }
  };

  if (coursesLoading || eventsLoading || usersLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="h-8 w-64 bg-surface-container rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <nav className="flex items-center gap-2 text-text-secondary text-sm mb-2">
            <span>EduEvent Pro</span>
            <ChevronRight size={14} />
            <span className="font-bold text-text-primary">Monitoramento Logístico</span>
          </nav>
          <h1 className="text-3xl font-black font-headline text-text-primary">Gestão de Cursos & Aulas</h1>
          <p className="text-sm text-text-secondary mt-1">Acompanhamento centralizado de lotes e distribuição docente por departamento.</p>
        </div>
      </div>

      {events.some(e => e.batchId) && (
        <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 mb-8 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary shadow-inner">
               <Package size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Status Logístico de Lotes</h2>
              <p className="text-sm text-text-secondary">Atualmente existem <span className="text-secondary font-black">{Object.keys(events.reduce((acc, e) => { if (e.batchId) acc[e.batchId] = true; return acc; }, {} as any)).length} lotes de aulas</span> ativos no sistema.</p>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="bg-card-bg px-5 py-3 rounded-xl border border-outline-variant text-center min-w-[100px]">
               <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Total Lotes</p>
               <p className="text-2xl font-black text-secondary">{Object.keys(events.reduce((acc, e) => { if (e.batchId) acc[e.batchId] = true; return acc; }, {} as any)).length}</p>
             </div>
             <div className="bg-card-bg px-5 py-3 rounded-xl border border-outline-variant text-center min-w-[100px]">
               <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Aulas em Lote</p>
               <p className="text-2xl font-black text-secondary">{events.filter(e => e.batchId).length}</p>
             </div>
          </div>
        </div>
      )}

      <div className="bg-card-bg border border-outline-variant rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-outline-variant flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-black uppercase text-text-primary tracking-wider">
              {isAdmin ? 'Todos os Lotes de Aula' : 'Meus Lotes de Aula'}
            </h2>
            <p className="text-[10px] text-text-secondary mt-0.5">
              {isAdmin ? 'Todos os lotes agrupados por professor.' : 'Seus lotes de aulas agendados.'}
            </p>
          </div>
          {isAdmin && (
          <select
            value={globalBatchTeacher}
            onChange={(e) => { setGlobalBatchTeacher(e.target.value); setExpandedGlobalBatch(null); }}
            className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/50"
          >
            <option value="Todos">Todos os Professores</option>
            {teachers.map(t => (
              <option key={t.id} value={t.displayName}>{t.displayName}</option>
            ))}
          </select>
          )}
        </div>
        <div className="p-5 space-y-3 max-h-[500px] overflow-y-auto">
          {(() => {
            // Professores veem automaticamente apenas os seus lotes
            const batchFilter = isAdmin ? globalBatchTeacher : user?.displayName;
            const batches = getAllBatches(batchFilter);
            if (batches.length === 0) return <p className="text-center text-text-secondary italic py-8">Nenhum lote encontrado.</p>;
            return batches.map(batch => {
              const sorted = [...batch.events].sort((a, b) => a.date.localeCompare(b.date));
              const firstDate = new Date(sorted[0].date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
              const lastDate = new Date(sorted[sorted.length - 1].date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
              const teacherSet = [...new Set(sorted.map(e => e.teacher).filter(Boolean))];
              const commonTeacher = teacherSet.length === 1 ? teacherSet[0] : null;
              const categories = [...new Set(sorted.map(e => e.category).filter(Boolean))];
              const commonCategory = categories.length === 1 ? categories[0] : null;
              const confirmedCount = sorted.filter(e => e.status === 'Confirmed').length;
              const progressPct = Math.round((confirmedCount / sorted.length) * 100);
              const isOpen = expandedGlobalBatch === batch.id;
              return (
                <div key={batch.id} className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
                  <button
                    onClick={() => setExpandedGlobalBatch(isOpen ? null : batch.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-surface-container/80 transition-all text-left"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Package size={14} className="text-secondary shrink-0" />
                      <span className="text-xs font-bold text-text-primary truncate">{batch.title}</span>
                      <span className="text-[9px] font-bold text-secondary bg-secondary/5 px-1.5 py-0.5 rounded border border-secondary/20 shrink-0">{batch.courseName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-black text-text-secondary font-mono tabular-nums">{confirmedCount}/{batch.count}</span>
                      <div className="w-14 h-1.5 bg-card-bg rounded-full overflow-hidden">
                        <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                      </div>
                      <ChevronDown size={14} className={`text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  <div className="px-3 pb-1">
                    <div className="flex items-center gap-2 text-[9px] text-text-secondary flex-wrap">
                      <span>{firstDate} — {lastDate}</span>
                      {commonTeacher && <><span className="w-px h-2.5 bg-outline-variant" /><span>{commonTeacher}</span></>}
                      {commonCategory && <><span className="w-px h-2.5 bg-outline-variant" /><span>{commonCategory}</span></>}
                    </div>
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-outline-variant/60 mx-3" />
                        <div className="p-3 space-y-1.5 max-h-[300px] overflow-y-auto">
                          {sorted.map(ev => (
                            <div
                              key={ev.id}
                              onClick={(e) => { e.stopPropagation(); onEditEvent?.(ev); }}
                              className="flex items-center gap-2.5 p-2 bg-card-bg rounded-lg border border-outline-variant hover:border-secondary/30 hover:bg-secondary/5 transition-all cursor-pointer group/event"
                            >
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.status === 'Confirmed' ? 'bg-green-500' : ev.status === 'Cancelled' ? 'bg-red-500' : 'bg-slate-400'}`} />
                              <span className="text-[10px] font-mono text-text-secondary shrink-0 tabular-nums">
                                {new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                              <span className="text-[10px] font-bold text-text-primary truncate group-hover/event:text-secondary transition-colors">
                                {ev.title}
                              </span>
                              {ev.timeStart && <span className="text-[9px] text-text-secondary font-mono shrink-0 ml-auto">{ev.timeStart}</span>}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            });
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCourses.map(course => {
          const style = getCourseStyle(course.name);
          const CourseIcon = style.icon;
          
          return (
            <div key={course.id} className={`bg-card-bg rounded-2xl border ${style.border} shadow-sm overflow-hidden flex flex-col group transition-all hover:border-secondary/20 hover:shadow-lg`}>
              <div className="p-6 border-b border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${style.bg} rounded-xl flex items-center justify-center ${style.color} border ${style.border}`}>
                     <CourseIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-text-primary line-clamp-1">{course.name}</h3>
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Informativo Acadêmico</p>
                  </div>
                </div>
                {isAdmin && !course.id.startsWith('auto_') && (
                  <div className="relative">
                    <button 
                      onClick={() => setActiveCourseMenu(activeCourseMenu === course.id ? null : course.id)}
                      className={`text-text-secondary hover:text-secondary p-2 rounded-full transition-colors ${activeCourseMenu === course.id ? 'bg-surface-container text-secondary' : 'hover:bg-surface-container'}`}
                    >
                      <MoreVertical size={20} />
                    </button>
                    {activeCourseMenu === course.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveCourseMenu(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-card-bg border border-outline-variant shadow-2xl rounded-xl p-2 z-20 w-48 animate-in fade-in zoom-in-95 duration-200">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCourseMenu(null);
                                setSelectionModal({ type: 'category', courseName: course.name, courseId: course.id });
                              }}
                              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-secondary hover:bg-secondary/10 rounded-lg flex items-center gap-2"
                            >
                               <Bookmark size={12} /> Vincular Categoria
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCourseMenu(null);
                                setSelectionModal({ type: 'teacher', courseName: course.name, courseId: course.id });
                              }}
                              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-secondary hover:bg-secondary/10 rounded-lg flex items-center gap-2"
                            >
                               <UserIcon size={12} /> Atribuir Docente
                            </button>
                            <div className="h-[1px] bg-outline-variant my-1" />
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                setActiveCourseMenu(null);
                                if (confirm(`Deseja excluir o curso "${course.name}"?\n\nIsso removerá o card de monitoramento. As aulas existentes continuarão no Painel Geral.`)) {
                                  try {
                                    await fetch(`/api/courses/${course.id}`, { method: 'DELETE' });
                                    if (confirm("Deseja também EXCLUIR TODAS AS AULAS vinculadas a este curso?")) {
                                      const courseEvents = events.filter(ev => ev.course === course.name);
                                      for (const ev of courseEvents) {
                                        await fetch(`/api/events_delete/${ev.id}`, { method: 'POST' });
                                      }
                                      toast("Curso e aulas removidos com sucesso.");
                                    } else {
                                      toast("Curso removido. As aulas foram mantidas.");
                                    }
                                  } catch (err) { console.error(err); }
                                }
                              }}
                              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                            >
                               <Trash2 size={12} /> Excluir Curso
                            </button>
                         </div>
                       </>
                     )}
                   </div>
                 )}
               </div>

            <div className="p-6 grid grid-cols-2 gap-6">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Categorias</h4>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectionModal({ type: 'category', courseName: course.name, courseId: course.id });
                      }}
                      className="text-secondary hover:text-secondary/80 transition-colors p-1"
                      title="Vincular Categoria"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                {(() => {
                  const courseEvents = events.filter(e => e.course === course.name);
                  const allCats = [...new Set([...parseCategories(course.categories), ...courseEvents.map(e => e.category).filter(Boolean)])];
                  const catCounts = Object.fromEntries(allCats.map(cat => [cat, courseEvents.filter(e => e.category === cat).length]));
                  const uncategorized = courseEvents.filter(e => !e.category).length;
                  const total = courseEvents.length;
                  return (
                    <div className="space-y-1.5">
                      {allCats.map(cat => {
                        const count = catCounts[cat];
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const cs = getCategoryStyle(cat);
                        return (
                          <div key={cat} className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 ${cs.bg} rounded-lg text-[9px] font-bold ${cs.color} border ${cs.border} whitespace-nowrap leading-tight`}>
                              {cat}
                            </span>
                            <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${cs.color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-[9px] font-black font-mono min-w-[2.5ch] text-right tabular-nums ${cs.color}`}>{count}</span>
                          </div>
                        );
                      })}
                      {uncategorized > 0 && (
                        <div 
                          className={`flex items-center gap-2 text-text-secondary ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                          onClick={(e) => {
                            if (!isAdmin) return;
                            e.stopPropagation();
                            setSelectionModal({ type: 'category', courseName: course.name, courseId: course.id });
                          }}
                          title={isAdmin ? "Clique para atribuir uma categoria" : ""}
                        >
                          <span className={`text-[9px] italic ${isAdmin ? 'hover:underline' : ''}`}>Sem categoria</span>
                          <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-slate-400/40 rounded-full transition-all duration-500" style={{ width: `${Math.round((uncategorized / total) * 100)}%` }} />
                          </div>
                          <span className="text-[9px] font-black font-mono min-w-[2.5ch] text-right tabular-nums">{uncategorized}</span>
                        </div>
                      )}
                      {allCats.length === 0 && uncategorized === 0 && (
                        <span className="text-[9px] text-text-secondary italic">Nenhuma aula neste curso</span>
                      )}
                      {allCats.length === 0 && uncategorized > 0 && (
                        <span className="text-[9px] text-text-secondary italic">{uncategorized} aula{uncategorized !== 1 ? 's' : ''} sem categoria</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Docentes</h4>
                <div className="space-y-2">
                  {getCourseMembers(course.name, course.id).map(member => (
                    <div key={member.id} className="flex items-center gap-2 p-1.5 bg-surface-container rounded-lg border border-outline-variant">
                      <img
                        src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || 'NA')}&background=random&color=fff&bold=true`}
                        alt={member.displayName}
                        className="w-6 h-6 shrink-0 rounded-full object-cover border border-outline-variant shadow-sm"
                      />
                      <p className="text-[10px] font-bold text-text-primary truncate">{member.displayName}</p>
                    </div>
                  ))}
                  {getCourseMembers(course.name, course.id).length === 0 && (
                    <p className="text-[9px] text-text-secondary italic">Sem docentes vinculados</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Cronograma de Aulas</h4>
                <div className="h-[1px] flex-1 bg-outline-variant mx-4" />
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                {(() => {
                  const courseEvents = events.filter(e => e.course === course.name);
                  const groups: Record<string, AcademicEvent[]> = {};
                  
                  courseEvents.forEach(e => {
                    const baseTitle = e.title.split(' (')[0];
                    if (!groups[baseTitle]) groups[baseTitle] = [];
                    groups[baseTitle].push(e);
                  });

                  return Object.entries(groups).map(([title, evs]) => (
                    <EventGroupItem 
                      key={title} 
                      title={title} 
                      evs={evs} 
                      onEditEvent={onEditEvent} 
                    />
                  ));
                })()}
                {getCourseEventsCount(course.name) === 0 && (
                   <p className="text-[10px] text-text-secondary italic text-center py-4">Nenhuma aula cadastrada.</p>
                )}
              </div>
            </div>

            <div className="bg-surface-container px-6 py-3 flex items-center justify-between border-t border-outline-variant">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-text-secondary opacity-50 uppercase">ID: {course.id.substring(0, 8)}</span>
                {(() => {
                  const courseEvs = events.filter(e => e.course === course.name);
                  const totalHrs = calculateTotalHours(courseEvs);
                  const avgHrs = courseEvs.length > 0 ? (totalHrs / courseEvs.length) : 0;
                  return (
                    <span className="text-[9px] text-text-secondary opacity-50 font-mono">⌀ {avgHrs.toFixed(1)}h</span>
                  );
                })()}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Calendar size={12} />
                  <span className="text-[10px] font-black">{getCourseEventsCount(course.name)} Aulas</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Package size={12} />
                  <span className="text-[10px] font-black">{getCourseBatches(course.name).length} Lotes</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Users size={12} />
                  <span className="text-[10px] font-black">{getCourseMembers(course.name, course.id).length} Docentes</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>

       <AnimatePresence>
        {selectionModal && (
          <ModernSelectionModal 
            isOpen={!!selectionModal}
            onClose={() => setSelectionModal(null)}
            title={
              selectionModal.type === 'teacher' ? 'Atribuir Docente ao Curso' : 
              selectionModal.type === 'category' ? 'Vincular Categoria' : 
              selectionModal.type === 'batch-teacher' ? 'Atribuir Docente ao Lote' : 'Atribuir Categoria ao Lote'
            }
            placeholder={selectionModal.type.includes('teacher') ? 'Pesquisar professor...' : 'Pesquisar categoria...'}
            icon={selectionModal.type.includes('teacher') ? UserIcon : Bookmark}
            items={
              selectionModal.type.includes('teacher') 
                ? (() => {
                    const course = courses.find(c => c.id === selectionModal.courseId);
                    const courseCats = parseCategories(course?.categories);
                    const allTeachers = users.filter(u => u.role !== 'USER');
                    
                    return allTeachers.sort((a, b) => {
                      const aMatches = courseCats.includes(a.category || '');
                      const bMatches = courseCats.includes(b.category || '');
                      if (aMatches && !bMatches) return -1;
                      if (!aMatches && bMatches) return 1;
                      return a.displayName.localeCompare(b.displayName);
                    }).map(u => ({ 
                      id: u.id, 
                      label: u.displayName, 
                      sublabel: u.category ? `Área: ${u.category}` : u.email 
                    }));
                  })()
                : EVENT_CATEGORIES.map(cat => ({ id: cat, label: cat }))
            }
            onSelect={async (id, label) => {
              if (selectionModal.type === 'teacher') {
                await handleUpdateUserField(id, 'courseId', selectionModal.courseId!);
                if (confirm(`Deseja vincular o docente "${label}" a todas as aulas pendentes de "${selectionModal.courseName}"?`)) {
                  handleBulkUpdateEvents(selectionModal.courseName!, 'teacher', label);
                }
              } else if (selectionModal.type === 'category') {
                const currentCourse = courses.find(c => c.id === selectionModal.courseId);
                const currentCats = parseCategories(currentCourse?.categories);
                if (selectionModal.courseId && !selectionModal.courseId.startsWith('auto_') && !currentCats.includes(label)) {
                  const newCats = [...currentCats, label];
                  await handleUpdateCourseData(selectionModal.courseId, { categories: JSON.stringify(newCats) });
                }
                if (confirm(`Deseja aplicar a categoria "${label}" às aulas sem categoria de "${selectionModal.courseName}"?`)) {
                  handleBulkUpdateEvents(selectionModal.courseName!, 'category', label);
                }
              } else if (selectionModal.type === 'batch-teacher') {
                handleUpdateBatchField(selectionModal.batchId!, 'teacher', label);
              } else if (selectionModal.type === 'batch-category') {
                handleUpdateBatchField(selectionModal.batchId!, 'category', label);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourseManagementView;
export { EventGroupItem };
