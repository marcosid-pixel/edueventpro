import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Zap, AlertTriangle, Video, MapPin, Lock, Edit2, Trash2, Package, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { View, AcademicEvent, Course } from '../types';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { EVENT_CATEGORIES } from '../constants';
import { parseJsonArray, getCourseStyle } from '../utils/index';

const UnifiedCalendar = ({ onEdit, onDelete }: { onEdit: (e: AcademicEvent) => void, onDelete: (id: string) => void }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { data: events } = useRealtimeCollection<AcademicEvent>('events');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const conflicts = new Set<string>();
  events.forEach(e1 => {
    const hasOverlap = events.some(e2 => {
      if (e1.id === e2.id) return false;
      const e1Date = e1.date;
      const e2Date = e2.date;
      if (e1Date !== e2Date) return false;
      if (e1.location !== e2.location) return false;

      const [s1, f1] = e1.time.split(' - ');
      const [s2, f2] = e2.time.split(' - ');
      return (s1 < f2 && s2 < f1);
    });
    if (hasOverlap) conflicts.add(e1.id);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);

  const nextSevenDaysEvents = events.filter(e => {
    const eDate = new Date(e.date + 'T00:00:00');
    return eDate >= today && eDate <= sevenDaysLater;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const { data: courses } = useRealtimeCollection<Course>('courses');
  const userCourseIds = parseJsonArray(user?.courseId);
  const userCourseNames = courses.filter(c => userCourseIds.includes(c.id)).map(c => c.name);
  userCourseIds.forEach(id => {
    const name = id.startsWith('auto_') ? id.replace('auto_', '') : (courses.find(c => c.id === id)?.name || id);
    if (name && !userCourseNames.includes(name)) {
      userCourseNames.push(name);
    }
  });

  const filteredMonthEvents = events.filter(e => {
    const matchesMonth = e.date.startsWith(selectedMonth);
    const matchesType = typeFilter === 'Todos' || e.type === typeFilter;
    const currentStatus = conflicts.has(e.id) ? 'Conflito' : (e.status === 'Confirmed' ? 'Confirmado' : e.status);
    const matchesStatus = statusFilter === 'Todos' || currentStatus === statusFilter;

    const searchStr = `${e.title} ${e.teacher} ${e.location} ${e.course}`.toLowerCase();
    const matchesSearch = searchTerm === '' || searchStr.includes(searchTerm.toLowerCase());

    const isOwner = e.createdBy === user?.id || e.teacher === user?.displayName;
    const matchesCourse = userCourseNames.length > 0 && userCourseNames.includes(e.course);

    const userCategories = parseJsonArray(user?.category);
    const matchesCategory = userCategories.length === 0 || userCategories.includes(e.category);

    const isVisible = isAdmin || isOwner || (matchesCourse && matchesCategory);

    return matchesMonth && matchesType && matchesStatus && isVisible && matchesSearch;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const groupedEvents = filteredMonthEvents.reduce((acc, event) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, AcademicEvent[]>);

  const sortedDates = Object.keys(groupedEvents).sort();

  const monthStats = {
    total: filteredMonthEvents.length,
    conflicts: filteredMonthEvents.filter(e => conflicts.has(e.id)).length,
    confirmed: filteredMonthEvents.filter(e => e.status === 'Confirmed').length,
    cancelled: filteredMonthEvents.filter(e => e.status === 'Cancelled').length
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const getMonthOptions = () => {
    const options = [];
    const baseDate = new Date();
    for (let i = -6; i <= 6; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const val = d.toISOString().substring(0, 7);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      options.push({ val, label });
    }
    return options;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-card-bg p-8 rounded-2xl border border-outline-variant shadow-sm flex justify-between items-center transition-colors">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-text-primary tracking-tight">Cronograma Acadêmico</h2>
          <p className="text-sm text-text-secondary mt-1">Visualize e organize os próximos compromissos da instituição</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest block">Mês de Referência</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-card-bg border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-bold text-text-primary focus:ring-2 focus:ring-secondary-container outline-none min-w-[200px]"
            >
              {getMonthOptions().map(opt => (
                <option key={opt.val} value={opt.val}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-card-bg border border-outline-variant rounded-xl text-xs font-bold text-text-primary hover:bg-surface-container transition-all group mt-4">
            <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
            <span className="uppercase tracking-widest">Exportar</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 mt-8">
        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Zap size={20} className="text-secondary" />
          Quadro de Planejamento Semanal
        </h3>
        <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-widest">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-secondary" /> Próximas Lives</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 pb-6 overflow-x-auto">
        {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + dayOffset);
          const dateStr = targetDate.toISOString().split('T')[0];
          const dayEvents = nextSevenDaysEvents.filter(e => e.date === dateStr);
          const isToday = dayOffset === 0;

          return (
            <div key={dayOffset} className={`flex flex-col min-w-[180px] bg-surface-container/20 rounded-xl border ${isToday ? 'border-secondary/30 bg-secondary/5' : 'border-outline-variant'} p-2 min-h-[400px]`}>
              <div className="mb-3 px-1">
                <p className={`text-[10px] font-black uppercase tracking-tighter ${isToday ? 'text-secondary' : 'text-text-secondary'}`}>
                  {targetDate.toLocaleDateString('pt-BR', { weekday: 'short' })}
                </p>
                <p className="text-sm font-black text-text-primary">
                  {targetDate.getDate()} {monthNames[targetDate.getMonth()].substring(0, 3)}
                </p>
                <div className="h-0.5 w-full bg-outline-variant mt-2 opacity-50" />
              </div>

              <div className="space-y-2">
                {dayEvents.map(event => {
                  const isConflict = conflicts.has(event.id);
                  return (
                    <motion.div
                      key={event.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => onEdit(event)}
                      className={`p-2.5 rounded-lg border shadow-sm cursor-pointer transition-all relative overflow-hidden group
                        ${isConflict ? 'bg-red-500/5 border-red-500/20' :
                          event.status === 'Cancelled' ? 'bg-stone-500/5 border-stone-500/10 opacity-60' : 'bg-card-bg border-outline-variant hover:border-secondary'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-mono font-bold text-secondary">{event.time.split(' - ')[0]}</span>
                        {isConflict && <AlertTriangle size={10} className="text-red-500 animate-pulse" />}
                      </div>

                      <h4 className="text-[11px] font-bold text-text-primary line-clamp-2 leading-tight mb-1.5 group-hover:text-secondary transition-colors">
                        {event.title}
                      </h4>

                      <div className="flex items-center gap-1 opacity-70">
                        {React.createElement(getCourseStyle(event.course).icon, { size: 8, className: getCourseStyle(event.course).color })}
                        <p className="text-[8px] font-bold uppercase tracking-tighter text-text-secondary truncate">{event.course}</p>
                      </div>

                      {(() => {
                        const start = new Date(event.createdAt).getTime();
                        const end = new Date(event.date + 'T' + (event.time?.split(' - ')[0] || '00:00')).getTime();
                        const now = Date.now();
                        let progress = 0;
                        if (now >= end) progress = 100;
                        else if (now > start) {
                          const total = end - start;
                          progress = total > 0 ? ((now - start) / total) * 100 : 100;
                        }
                        return (
                          <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-outline-variant/20">
                            <div
                              className={`h-full ${progress > 90 ? 'bg-red-500' : progress > 50 ? 'bg-secondary' : 'bg-green-500'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        );
                      })()}
                    </motion.div>
                  );
                })}
                {dayEvents.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed border-outline-variant/10 rounded-lg">
                    <p className="text-[9px] text-text-secondary italic">Livre</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {nextSevenDaysEvents.length === 0 && (
        <div className="py-8 text-center bg-surface-container rounded-2xl border border-dashed border-outline-variant text-text-secondary italic text-sm">
          Nenhum evento para os próximos 7 dias.
        </div>
      )}

      <div className="bg-card-bg rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-outline-variant bg-surface-container/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-text-primary">Eventos de {monthNames[parseInt(selectedMonth.split('-')[1]) - 1]}</h3>
              <div className="flex gap-4 mt-1">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-tighter">Total: {monthStats.total}</span>
                {monthStats.conflicts > 0 && <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">Conflitos: {monthStats.conflicts}</span>}
                <span className="text-[10px] font-black text-green-600 uppercase tracking-tighter">Confirmados: {monthStats.confirmed}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Pesquisar no mês..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-card-bg border border-outline-variant rounded-lg text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase">Tipo:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-card-bg border border-outline-variant rounded-lg px-3 py-1 text-xs font-bold text-text-primary outline-none"
                >
                  <option>Todos</option>
                  {EVENT_CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-card-bg border border-outline-variant rounded-lg px-3 py-1 text-xs font-bold text-text-primary outline-none"
                >
                  <option>Todos</option>
                  <option>Confirmado</option>
                  <option>Conflito</option>
                  <option>Cancelado</option>
                  <option>Em Revisão</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead className="bg-surface-container/50 border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Data & Horário</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Evento</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Curso / Departamento</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Local</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Responsável</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {sortedDates.map(date => (
                <React.Fragment key={date}>
                  <tr className="bg-surface-container/20">
                    <td colSpan={7} className="px-6 py-2 border-y border-outline-variant">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-secondary" />
                        <span className="text-xs font-black text-text-primary uppercase tracking-widest">
                          {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                        </span>
                        <span className="ml-auto text-[9px] font-bold text-text-secondary opacity-60">
                          {groupedEvents[date].length} {groupedEvents[date].length === 1 ? 'evento' : 'eventos'}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {groupedEvents[date].map(event => {
                    const isConflict = conflicts.has(event.id);
                    const status = isConflict ? 'Conflito' : (event.status === 'Confirmed' ? 'Confirmado' : (event.status === 'Cancelled' ? 'Cancelado' : event.status));
                    return (
                      <tr
                        key={event.id}
                        onClick={() => onEdit(event)}
                        className={`hover:bg-surface-container transition-all group cursor-pointer ${event.status === 'Cancelled' ? 'opacity-50 grayscale-[0.5]' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-transparent shadow-sm whitespace-nowrap
                            ${status === 'Confirmado' ? 'bg-green-500/10 text-green-600' :
                              status === 'Conflito' ? 'bg-red-500/10 text-red-600' :
                              status === 'Cancelado' ? 'bg-stone-500/10 text-stone-600' : 'bg-orange-500/10 text-orange-600'}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${status === 'Confirmado' ? 'bg-green-600' : status === 'Conflito' ? 'bg-red-600 animate-pulse' : (status === 'Cancelado' ? 'bg-stone-600' : 'bg-orange-600')}`}></div>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-[11px] font-bold text-text-primary uppercase">{new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                          <p className="text-[10px] font-mono text-text-secondary italic">{event.time}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <p className={`text-sm font-bold text-text-primary group-hover:text-secondary transition-colors truncate max-w-[200px] ${event.status === 'Cancelled' ? 'line-through decoration-stone-400' : ''}`}>{event.title}</p>
                            {event.batchId && (
                              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary/10 text-secondary text-[8px] font-black rounded uppercase tracking-tighter border border-secondary/20 shrink-0">
                                <Package size={10} /> {event.batchId.split('-')[1]}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-secondary opacity-60 font-medium">Ref: #{event.id.substring(0, 6).toUpperCase()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-text-primary">{event.course}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              {event.location === 'Meet' ? <Video size={14} className="text-text-secondary" /> : <MapPin size={14} className="text-text-secondary" />}
                              <span className={`text-[11px] font-bold ${isConflict ? 'text-red-500' : 'text-text-primary'}`}>
                                {event.location} {isConflict && '(Duplicado)'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(isAdmin || (user?.role === 'PROFESSOR' && event.teacher === user.displayName && userCourseNames.includes(event.course))) ? (
                                <>
                                  {Boolean(event.plataforma_meet) && (
                                    <span className="text-[7px] bg-blue-500/10 text-blue-600 px-1 py-0.5 rounded uppercase font-black tracking-tighter border border-blue-500/20">Meet</span>
                                  )}
                                  {Boolean(event.plataforma_comapos) && (
                                    <span className="text-[7px] bg-purple-500/10 text-purple-600 px-1 py-0.5 rounded uppercase font-black tracking-tighter border border-purple-500/20">Comapos</span>
                                  )}
                                </>
                              ) : (
                                (Boolean(event.plataforma_meet) || Boolean(event.plataforma_comapos)) && (
                                   <span className="text-[7px] bg-text-secondary/10 text-text-secondary px-1 py-0.5 rounded uppercase font-black tracking-tighter border border-outline-variant flex items-center gap-1" title="Transmissão disponível apenas para o docente designado">
                                     <Lock size={8} /> Transmissão
                                   </span>
                                )
                              )}
                              {Boolean(event.convidado_externo) && (
                                <span className="text-[7px] bg-orange-500/10 text-orange-600 px-1 py-0.5 rounded uppercase font-black tracking-tighter border border-orange-500/20">Externo</span>
                              )}
                               {Boolean(event.precisa_cabine) && (
                                <span className="text-[7px] bg-stone-500/10 text-stone-600 px-1 py-0.5 rounded uppercase font-black tracking-tighter border border-stone-500/20">Cabine</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-secondary-container text-white flex items-center justify-center text-[10px] font-bold">
                              {event.teacher?.substring(0, 1) || 'U'}
                            </div>
                            <p className="text-xs font-bold text-text-primary">{event.teacher || 'Administrador'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onEdit(event)}
                              className="p-1.5 text-secondary hover:bg-secondary/10 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  if (confirm('Deseja excluir este agendamento?')) {
                                    onDelete(event.id);
                                  }
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              {filteredMonthEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-secondary italic text-sm">
                    Nenhum registro encontrado para este mês ou filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-surface-container/30 border-t border-outline-variant flex justify-between items-center">
            <p className="text-xs text-text-secondary">Mostrando <span className="font-bold text-text-primary">{filteredMonthEvents.length}</span> de <span className="font-bold text-text-primary">{events.length}</span> eventos registrados</p>
            <div className="flex items-center gap-2">
              <button className="px-4 py-1.5 border border-outline-variant rounded-lg text-xs font-bold text-text-secondary hover:bg-card-bg transition-colors">Anterior</button>
              <button className="px-4 py-1.5 bg-secondary-container text-white rounded-lg text-xs font-bold shadow-sm">1</button>
              <button className="px-4 py-1.5 border border-outline-variant rounded-lg text-xs font-bold text-text-secondary hover:bg-card-bg transition-colors">Próximo</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCalendar;
