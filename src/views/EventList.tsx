import React from 'react';
import { ChevronRight, Download, Edit2, Trash2, Package } from 'lucide-react';
import type { View, AcademicEvent, Course } from '../types';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { parseJsonArray } from '../utils/index';

const EventList = ({ onEdit, onDelete }: { onEdit: (e: AcademicEvent) => void, onDelete: (id: string) => void }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { data: events } = useRealtimeCollection<AcademicEvent>('events');
  const { data: courses } = useRealtimeCollection<Course>('courses');

  const userCourseIds = parseJsonArray(user?.courseId);
  const userCourseNames = courses.filter(c => userCourseIds.includes(c.id)).map(c => c.name);
  userCourseIds.forEach(id => {
    const name = id.startsWith('auto_') ? id.replace('auto_', '') : (courses.find(c => c.id === id)?.name || id);
    if (name && !userCourseNames.includes(name)) {
      userCourseNames.push(name);
    }
  });

  const filteredEvents = user?.role === 'ADMIN' ? events : events.filter(e => {
    const isOwner = e.createdBy === user?.id || e.teacher === user?.displayName;
    const matchesCourse = userCourseNames.length > 0 && userCourseNames.includes(e.course);

    const userCategories = parseJsonArray(user?.category);
    const matchesCategory = userCategories.length === 0 || userCategories.includes(e.category);

    return isOwner || (matchesCourse && matchesCategory);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <nav className="flex items-center gap-2 text-text-secondary text-sm mb-2">
            <span>Gestão Acadêmica</span>
            <ChevronRight size={14} />
            <span className="font-bold text-text-primary">Cronograma</span>
          </nav>
          <h1 className="text-3xl font-bold font-headline text-text-primary">Gerenciamento de Eventos</h1>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-card-bg border border-outline-variant text-xs font-bold rounded-lg hover:bg-surface-container transition-all text-text-secondary">
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="bg-card-bg p-6 rounded-xl border border-outline-variant shadow-sm grid grid-cols-4 gap-4 transition-colors">
        {[
          { label: 'Mês do Evento', options: ['Todos os Meses', 'Janeiro 2024', 'Fevereiro 2024'] },
          { label: 'Disciplina', options: ['Todas as Disciplinas', 'Medicina Preventiva', 'IA Aplicada'] },
          { label: 'Curso', options: ['Todos os Cursos', 'Bacharelado em Medicina', 'Engenharia'] },
        ].map((filter) => (
          <div key={filter.label} className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{filter.label}</label>
            <select className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-secondary-container outline-none bg-card-bg text-text-primary transition-colors">
              {filter.options.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </div>
        ))}
        <div className="flex items-end">
          <button className="w-full bg-secondary-container text-white py-2 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-all">
            Aplicar Filtros
          </button>
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col h-full transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container border-b border-outline-variant">
              <tr className="h-10">
                <th className="px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Origem</th>
                <th className="px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                <th className="px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Disciplina</th>
                <th className="px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Título do Evento</th>
                <th className="px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Data / Hora</th>
                <th className="px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredEvents.map(event => (
                <tr key={event.id} className="h-14 hover:bg-surface-container transition-colors cursor-pointer group">
                  <td className="px-4">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-text-secondary uppercase tracking-tighter">
                      {event.origin || 'Portal'}
                    </span>
                  </td>
                  <td className="px-4">
                     <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border
                        ${event.status === 'Confirmed' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}`}
                      >
                      <div className={`w-1.5 h-1.5 rounded-full ${event.status === 'Confirmed' ? 'bg-green-600' : 'bg-orange-600'}`}></div>
                      {event.status === 'Confirmed' ? 'Confirmado' : event.status}
                    </span>
                  </td>
                  <td className="px-4 text-xs font-bold text-text-primary truncate max-w-[120px]">{event.course}</td>
                  <td className="px-4 text-sm font-medium text-text-secondary">
                    <div className="flex items-center gap-2">
                       {event.title}
                       {event.batchId && (
                         <span className="px-1 bg-secondary/10 text-secondary text-[8px] font-black rounded uppercase tracking-tighter flex items-center gap-1 shrink-0">
                           <Package size={8} /> Lote
                         </span>
                       )}
                    </div>
                  </td>
                  <td className="px-4">
                    <div className="flex flex-col text-[10px]">
                      <span className="font-bold text-text-primary">{event.date}</span>
                      <span className="text-text-secondary italic font-mono uppercase">{event.time}</span>
                    </div>
                  </td>
                  <td className="px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                        className="p-1.5 text-secondary hover:bg-secondary/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      {(isAdmin || user?.id === event.createdBy) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary italic text-sm">
                    Nenhum evento agendado para o seu usuário.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-auto border-t border-outline-variant p-4 flex justify-between items-center bg-surface-container/50">
          <p className="text-xs text-text-secondary">Mostrando <span className="font-bold text-text-primary">{filteredEvents.length}</span> eventos registros</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-text-primary text-card-bg rounded text-xs font-bold h-8 w-8 flex items-center justify-center">1</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventList;
