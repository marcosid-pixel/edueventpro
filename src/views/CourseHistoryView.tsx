import { useState } from 'react';
import { ChevronRight, History, Clock, CheckCircle2, Calendar, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { isEventExpired, getCourseStyle, getEventConfirmationState } from '../utils/index';
import type { View, AcademicEvent } from '../types';

const CourseHistoryView = ({ setView, onEdit }: { setView: (v: View) => void, onEdit?: (e: AcademicEvent) => void }) => {
  const { user, effectiveRole } = useAuth();
  const { data: events } = useRealtimeCollection<AcademicEvent>('events');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = effectiveRole === 'ADMIN';

  const myEvents = events.filter(e =>
    e.teacher === user?.displayName || e.createdBy === user?.id
  );

  const expiredEvents = myEvents.filter(e => isEventExpired(e));

  const filtered = expiredEvents.filter(e =>
    !searchTerm ||
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.course.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.date.localeCompare(a.date));

  const groupedByCourse = filtered.reduce((acc, event) => {
    const course = event.course || 'Sem Departamento';
    if (!acc[course]) acc[course] = [];
    acc[course].push(event);
    return acc;
  }, {} as Record<string, AcademicEvent[]>);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 px-6">
      <div className="flex justify-between items-end">
        <div>
          <nav className="flex items-center gap-2 text-text-secondary text-sm mb-2">
            <button onClick={() => setView('courses')} className="hover:text-secondary transition-colors">
              <ArrowLeft size={14} />
            </button>
            <button onClick={() => setView('courses')} className="hover:text-secondary transition-colors">Gestão de Cursos</button>
            <ChevronRight size={14} />
            <span className="font-bold text-text-primary">Histórico</span>
          </nav>
          <h1 className="text-3xl font-black font-headline text-text-primary">Histórico de Aulas</h1>
          <p className="text-sm text-text-secondary mt-1">Aulas que passaram do prazo de confirmação. Visualização apenas para consulta.</p>
        </div>
      </div>

      <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-5 flex items-start gap-4">
        <div className="p-2 bg-amber-500/10 rounded-xl shrink-0">
          <AlertTriangle size={20} className="text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-amber-700">Aulas fora do prazo de confirmação</h3>
          <p className="text-xs text-amber-600/80 mt-1 leading-relaxed">
            Estas aulas passaram do prazo de 5 dias para confirmação. Caso tenha ocorrido algum erro ou a aula precise ser reagendada, entre em contato com o administrador.
          </p>
        </div>
      </div>

      <div className="relative">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por título ou departamento..."
          className="w-full h-11 border border-outline-variant rounded-xl bg-card-bg px-4 text-sm focus:ring-2 focus:ring-secondary-container outline-none text-text-primary transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-card-bg rounded-2xl border border-outline-variant p-5 text-center">
          <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Total de Aulas</p>
          <p className="text-3xl font-black text-text-primary">{myEvents.length}</p>
        </div>
        <div className="bg-card-bg rounded-2xl border border-outline-variant p-5 text-center">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Fora do Prazo</p>
          <p className="text-3xl font-black text-amber-600">{expiredEvents.length}</p>
        </div>
        <div className="bg-card-bg rounded-2xl border border-outline-variant p-5 text-center">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Confirmadas</p>
          <p className="text-3xl font-black text-green-600">{myEvents.filter(e => (e.status === 'Confirmed' || e.status === 'Scheduled') && !isEventExpired(e)).length}</p>
        </div>
      </div>

      {Object.entries(groupedByCourse).length === 0 ? (
        <div className="bg-card-bg rounded-3xl border border-outline-variant p-16 text-center">
          <div className="flex flex-col items-center gap-3 opacity-40">
            <History size={48} />
            <p className="text-sm font-bold text-text-secondary italic">Nenhuma aula fora do prazo encontrada.</p>
            <p className="text-[10px] text-text-secondary">Todas as suas aulas estão dentro do prazo de confirmação.</p>
          </div>
        </div>
      ) : (
        Object.entries(groupedByCourse).map(([courseName, courseEventsRaw]) => {
          const courseEvents = courseEventsRaw as AcademicEvent[];
          const style = getCourseStyle(courseName);
          return (
            <div key={courseName} className="bg-card-bg rounded-3xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant flex items-center gap-3 bg-surface-container/30">
                <div className={`w-8 h-8 rounded-lg ${style.bg} ${style.color} flex items-center justify-center`}>
                  <style.icon size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{courseName}</h3>
                  <p className="text-[10px] text-text-secondary">{courseEvents.length} aula{courseEvents.length !== 1 ? 's' : ''} fora do prazo</p>
                </div>
              </div>
              <div className="divide-y divide-outline-variant/50">
                {courseEvents.map(event => {
                  const confirmState = getEventConfirmationState(event);
                  const wasAuto = confirmState === 'AUTO_CONFIRMED';
                  return (
                    <div key={event.id} className="px-6 py-4 flex items-center gap-4 hover:bg-surface-container/30 transition-all">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${wasAuto ? 'bg-amber-500' : 'bg-orange-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary line-clamp-1">{event.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {event.teacher && (
                            <span className="text-[10px] text-text-secondary font-medium">{event.teacher}</span>
                          )}
                          {event.location && (
                            <span className="text-[10px] text-text-secondary font-medium">{event.location}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 text-text-secondary">
                            <Calendar size={12} />
                            <span className="text-xs font-bold">{new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-text-secondary mt-0.5">
                            <Clock size={12} />
                            <span className="text-[10px] font-mono">{event.timeStart || '--:--'}</span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          wasAuto
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                        }`}>
                          {wasAuto ? 'Auto-confirmada' : 'Confirmada'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default CourseHistoryView;
